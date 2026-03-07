/**
 * JaegerTraceView.tsx
 * 
 * A Jaeger-style timeline visualization component for displaying distributed traces.
 * This component provides a comprehensive view of trace spans with:
 * - Hierarchical span tree with expand/collapse
 * - Visual timeline bars showing relative execution timing
 * - Color-coded services and status indicators
 * - Filtering by search, status, service, and duration
 * - Detailed span attribute inspection
 * 
 * Used in conjunction with TraceSidebar to provide Phoenix tracing integration.
 */

import React, { useState, useMemo } from 'react';
import { TraceNode } from '@/hooks/useTrace';
import { 
    ChevronDown, 
    ChevronRight, 
    ChevronLeft, 
    ChevronRight as ChevronRightNav,
    Clock, 
    Zap, 
    AlertCircle, 
    Expand, 
    Minimize2,
    Search,
    Filter,
    Eye,
    EyeOff,
    Activity,
    Database,
    Cpu,
    Globe,
    Settings,
    BarChart3,
    Timer,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ExternalLink,
    Hash,
    ToggleLeft,
    Braces,
    Type
} from 'lucide-react';

/**
 * Props interface for JaegerTraceView component
 */
interface JaegerTraceViewProps {
    /** Array of trace spans from Phoenix */
    trace: TraceNode[];
    /** Session ID for filtering session-related spans */
    contextId?: string;
}

/**
 * ProcessedSpan - A transformed span with additional UI-related fields
 * Extends the raw TraceNode with computed values for visualization
 */
interface ProcessedSpan {
    id: string;                      // Unique span identifier
    name: string;                   // Full span name (e.g., "llm.anthropic.generate")
    operationName: string;          // Short operation name (last part of name)
    serviceName: string;            // Service name extracted from span name
    startTime: number;              // Start time in milliseconds (Unix timestamp)
    endTime: number;                // End time in milliseconds (Unix timestamp)
    duration: number;                // Duration in milliseconds
    depth: number;                  // Tree depth (0 = root, 1 = child, etc.)
    hasChildren: boolean;           // Whether this span has child spans
    children: ProcessedSpan[];       // Child spans
    parent?: ProcessedSpan;          // Parent span reference
    span: TraceNode;                // Original raw trace node
    isSessionSpan: boolean;         // Whether this span belongs to the current session
    relativeStart: number;         // Start position as percentage (0-100)
    relativeEnd: number;            // End position as percentage (0-100)
    color: string;                  // Service color for visualization
}

/**
 * TraceTimeline - Complete timeline data for a single trace
 */
interface TraceTimeline {
    spans: ProcessedSpan[];         // Flat array of processed spans
    totalDuration: number;          // Total trace duration in ms
    startTime: number;              // Trace start timestamp
    endTime: number;                // Trace end timestamp
    maxDepth: number;              // Maximum tree depth
    traceId: string;                // Trace identifier
}

/**
 * TraceGroup - Grouped trace data for multi-trace handling
 */
interface TraceGroup {
    traceId: string;
    spans: TraceNode[];
    sessionSpansCount: number;
    startTime: number;
    endTime: number;
    duration: number;
}

/**
 * JaegerTraceView Component
 * 
 * Provides a Jaeger-style timeline visualization for distributed traces.
 * Supports:
 * - Multiple trace grouping and navigation
 * - Hierarchical span tree with expand/collapse
 * - Visual timeline bars
 * - Comprehensive filtering
 * - Detailed span inspection
 * 
 * @param trace - Array of TraceNode spans from Phoenix
 * @param contextId - Optional session ID for filtering
 */
export const JaegerTraceView: React.FC<JaegerTraceViewProps> = ({ trace, contextId }) => {
    // ===========================================================================
    // STATE MANAGEMENT
    // ===========================================================================
    
    /** Currently selected trace index (for multi-trace support) */
    const [selectedTraceIndex, setSelectedTraceIndex] = useState(0);
    
    // ===========================================================================
    // TRACE GROUPING
    // ===========================================================================
    
    /**
     * Groups traces by trace_id and calculates metadata.
     * Also filters by session ID if contextId is provided.
     * 
     * Processing steps:
     * 1. Group spans by trace_id
     * 2. Calculate time ranges for each group
     * 3. Count session spans in each group
     * 4. Filter out non-session traces if contextId is specified
     * 5. Sort by start time
     */
    const traceGroups = useMemo(() => {
        // Step 1: Group spans by trace_id
        const groups = new Map<string, TraceNode[]>();
        trace.forEach(span => {
            const traceId = span.context.trace_id;
            if (!groups.has(traceId)) {
                groups.set(traceId, []);
            }
            groups.get(traceId)!.push(span);
        });

        // Step 2-5: Process each group
        return Array.from(groups.entries())
            .map(([traceId, spans]) => {
                // Calculate time range for this trace
                const timeStamps = spans.map(span => ({
                    start: new Date(span.start_time).getTime(),
                    end: new Date(span.end_time).getTime()
                }));
                
                const startTime = Math.min(...timeStamps.map(t => t.start));
                const endTime = Math.max(...timeStamps.map(t => t.end));
                const duration = endTime - startTime;
                
                // Count spans belonging to current session
                const sessionSpansCount = spans.filter(span => 
                    contextId && (
                        span.attributes?.session_id === contextId ||
                        span.attributes?.['session.id'] === contextId ||
                        span.attributes?.sessionId === contextId ||
                        span.attributes?.['gcp.vertex.agent.session_id'] === contextId
                    )
                ).length;

                return {
                    traceId,
                    spans,
                    sessionSpansCount,
                    startTime,
                    endTime,
                    duration
                } as TraceGroup;
            })
            // Filter: Only show traces with session spans if contextId is provided
            .filter(group => {
                return !contextId || group.sessionSpansCount > 0;
            })
            // Sort by start time (chronological order)
            .sort((a, b) => a.startTime - b.startTime);
    }, [trace, contextId]);

    /**
     * Auto-select the latest trace when trace groups change
     * This ensures the most recent trace is always displayed
     */
    React.useEffect(() => {
        if (traceGroups.length > 0) {
            const latestTraceIndex = traceGroups.length - 1;
            console.log(`JaegerTraceView: Auto-selecting latest trace (index ${latestTraceIndex} of ${traceGroups.length})`);
            setSelectedTraceIndex(latestTraceIndex);
        }
    }, [traceGroups]);

    // Get current trace data
    const currentTraceGroup = traceGroups[selectedTraceIndex];
    const currentTrace = currentTraceGroup?.spans || [];

    // ===========================================================================
    // UI STATE
    // ===========================================================================
    
    /** Set of expanded span IDs (all expanded by default) */
    const [expandedSpans, setExpandedSpans] = useState<Set<string>>(() => {
        return new Set(currentTrace.map(span => span.id));
    });
    
    /** Currently selected span for detail view */
    const [selectedSpan, setSelectedSpan] = useState<ProcessedSpan | null>(null);
    
    /** Search query for filtering spans */
    const [searchQuery, setSearchQuery] = useState('');
    
    /** Toggle for filter panel visibility */
    const [showFilters, setShowFilters] = useState(false);
    
    /** Status filter: 'all', 'OK', or 'ERROR' */
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    /** Service filter: 'all' or specific service name */
    const [serviceFilter, setServiceFilter] = useState<string>('all');
    
    /** Duration filter: 'all', 'fast', 'medium', or 'slow' */
    const [durationFilter, setDurationFilter] = useState<string>('all');
    
    /** Toggle: show only error spans */
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);
    
    /** Toggle: show only session spans */
    const [showOnlySession, setShowOnlySession] = useState(false);

    /**
     * Reset UI state when current trace changes
     * This ensures clean state for each new trace
     */
    React.useEffect(() => {
        const allSpanIds = new Set(currentTrace.map(span => span.id));
        console.log(`JaegerTraceView: Setting expandedSpans with ${allSpanIds.size} span IDs`);
        setExpandedSpans(allSpanIds);
        setSelectedSpan(null);
        setSearchQuery('');
    }, [currentTrace]);

    // ===========================================================================
    // SERVICE COLORING
    // ===========================================================================
    
    /**
     * Color palette for service differentiation
     * Each unique service gets a consistent color based on name hash
     */
    const serviceColors = [
        '#3B82F6', // Blue
        '#EF4444', // Red
        '#10B981', // Green
        '#F59E0B', // Amber
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#06B6D4', // Cyan
        '#84CC16', // Lime
        '#F97316', // Orange
        '#6366F1'  // Indigo
    ];

    /**
     * Get consistent color for a service name
     * Uses simple hash to map service name to color index
     * 
     * @param serviceName - The service name to color
     * @returns Hex color string
     */
    const getServiceColor = (serviceName: string): string => {
        const hash = serviceName.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return serviceColors[Math.abs(hash) % serviceColors.length];
    };

    /**
     * Extract service name from full span name
     * Takes first two parts of dot-separated name
     * Example: "llm.anthropic.generate" -> "llm.anthropic"
     * 
     * @param spanName - Full span name
     * @returns Extracted service name
     */
    const extractServiceName = (spanName: string): string => {
        const parts = spanName.split('.');
        if (parts.length >= 2) {
            return parts.slice(0, 2).join('.');
        }
        return parts[0] || 'unknown';
    };

    /**
     * Get status icon based on status code
     * 
     * @param statusCode - Status code: 'OK', 'ERROR', or unset
     * @returns React element with appropriate icon
     */
    const getStatusIcon = (statusCode: string) => {
        switch (statusCode) {
            case 'OK':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'ERROR':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        }
    };

    /**
     * Get service icon based on service name
     * Auto-detects service type from name
     * 
     * @param serviceName - Service name to get icon for
     * @returns React element with appropriate icon
     */
    const getServiceIcon = (serviceName: string) => {
        if (serviceName.includes('llm')) return <Cpu className="h-4 w-4" />;
        if (serviceName.includes('agent')) return <Activity className="h-4 w-4" />;
        if (serviceName.includes('database')) return <Database className="h-4 w-4" />;
        if (serviceName.includes('api')) return <Globe className="h-4 w-4" />;
        return <Settings className="h-4 w-4" />;
    };

    // ===========================================================================
    // TRACE PROCESSING
    // ===========================================================================
    
    /**
     * Process raw trace spans into visualization-ready format
     * 
     * Processing pipeline:
     * 1. Find root span (DefaultRequestHandler._run_event_stream)
     * 2. Create ProcessedSpan objects with computed values
     * 3. Build parent-child hierarchy
     * 4. Calculate depths
     * 5. Flatten tree for display
     * 6. Filter internal spans (a2a.server)
     * 7. Recalculate depths after filtering
     * 
     * @returns TraceTimeline or null if no trace data
     */
    const processTrace = useMemo((): TraceTimeline | null => {
        if (!currentTrace.length) return null;

        // Step 1: Find the main root span (DefaultRequestHandler._run_event_stream)
        // This span represents the entry point of the A2A request handling
        const startSpanName = 'a2a.server.request_handlers.default_request_handler.DefaultRequestHandler._run_event_stream';
        const startSpan = currentTrace.find(span => span.name === startSpanName);
        
        if (!startSpan) {
            console.log(`JaegerTraceView: Start span "${startSpanName}" not found in trace`);
        } else {
            console.log(`JaegerTraceView: Found start span "${startSpanName}" (${startSpan.id})`);
        }

        // Step 2: Create ProcessedSpan for each trace span
        const spanMap = new Map<string, ProcessedSpan>();
        const timeStamps = currentTrace.map(span => ({
            start: new Date(span.start_time).getTime(),
            end: new Date(span.end_time).getTime()
        }));

        const traceStartTime = Math.min(...timeStamps.map(t => t.start));
        const traceEndTime = Math.max(...timeStamps.map(t => t.end));
        const totalDuration = traceEndTime - traceStartTime;

        // Create ProcessedSpan objects with computed visualization values
        currentTrace.forEach(span => {
            const startTime = new Date(span.start_time).getTime();
            const endTime = new Date(span.end_time).getTime();
            const duration = endTime - startTime;
            const serviceName = extractServiceName(span.name);

            // Check if this span belongs to current session
            const isSessionSpan = contextId && (
                span.attributes?.session_id === contextId ||
                span.attributes?.['session.id'] === contextId ||
                span.attributes?.sessionId === contextId ||
                span.attributes?.['gcp.vertex.agent.session_id'] === contextId
            );

            const processedSpan: ProcessedSpan = {
                id: span.id,
                name: span.name,
                operationName: span.name.split('.').pop() || span.name,
                serviceName,
                startTime,
                endTime,
                duration,
                depth: 0,                      // Will be calculated later
                hasChildren: false,
                children: [],
                span,
                isSessionSpan: !!isSessionSpan,
                // Calculate relative position as percentage (0-100)
                relativeStart: ((startTime - traceStartTime) / totalDuration) * 100,
                relativeEnd: ((endTime - traceStartTime) / totalDuration) * 100,
                color: getServiceColor(serviceName)
            };

            spanMap.set(span.id, processedSpan);
        });

        // Step 3: Build parent-child hierarchy
        const rootSpans: ProcessedSpan[] = [];
        
        console.log('JaegerTraceView: All span IDs and parent_ids:');
        currentTrace.forEach(span => {
            console.log(`  ${span.name}: id=${span.id}, context.span_id=${span.context.span_id}, parent_id=${span.parent_id}`);
        });
        
        // Link each span to its parent
        spanMap.forEach(span => {
            const parentId = span.span.parent_id;
            if (parentId) {
                // Try to find parent by span.id first
                let parent = spanMap.get(parentId);
                // If not found, try by context.span_id
                if (!parent) {
                    for (const [_, candidateSpan] of spanMap) {
                        if (candidateSpan.span.context.span_id === parentId) {
                            parent = candidateSpan;
                            break;
                        }
                    }
                }
                
                if (parent) {
                    parent.children.push(span);
                    parent.hasChildren = true;
                    span.parent = parent;
                    console.log(`JaegerTraceView: Linked ${span.name} to parent ${parent.name}`);
                } else {
                    // Parent not found - treat as root
                    console.log(`JaegerTraceView: Parent not found for ${span.name} (parent_id: ${parentId})`);
                    rootSpans.push(span);
                }
            } else {
                // No parent_id - this is a root span
                rootSpans.push(span);
            }
        });
        
        console.log(`JaegerTraceView: Built hierarchy - ${rootSpans.length} root spans`);
        rootSpans.forEach(root => {
            console.log(`  Root: ${root.name} (${root.children.length} children)`);
        });

        // Step 4: If start span found, use it as single root (show only its subtree)
        let finalRootSpans = rootSpans;
        if (startSpan) {
            const startProcessedSpan = spanMap.get(startSpan.id);
            if (startProcessedSpan) {
                finalRootSpans = [startProcessedSpan];
                console.log(`JaegerTraceView: Using start span as single root, showing only its subtree`);
                console.log(`JaegerTraceView: Start span has ${startProcessedSpan.children.length} direct children`);
                
                const logSpanTree = (span: ProcessedSpan, indent = '') => {
                    console.log(`${indent}${span.name} (${span.id}) - children: ${span.children.length}`);
                    span.children.forEach(child => logSpanTree(child, indent + '  '));
                };
                logSpanTree(startProcessedSpan);
            }
        }

        // Step 5: Calculate depth for all spans (tree traversal)
        const calculateDepth = (spans: ProcessedSpan[], depth = 0) => {
            spans.forEach(span => {
                span.depth = depth;
                if (span.children.length > 0) {
                    // Sort children by start time for consistent display
                    span.children.sort((a, b) => a.startTime - b.startTime);
                    calculateDepth(span.children, depth + 1);
                }
            });
        };

        finalRootSpans.sort((a, b) => a.startTime - b.startTime);
        calculateDepth(finalRootSpans);

        // Step 6: Flatten tree to array, respecting expanded state
        const flattenSpans = (spans: ProcessedSpan[]): ProcessedSpan[] => {
            const result: ProcessedSpan[] = [];
            spans.forEach(span => {
                result.push(span);
                const isExpanded = expandedSpans.has(span.id);
                const hasChildren = span.children.length > 0;
                
                if (span.name.includes('DefaultRequestHandler')) {
                    console.log(`JaegerTraceView: Processing ${span.name} - expanded: ${isExpanded}, children: ${hasChildren} (${span.children.length})`);
                }
                
                // Recursively add children if expanded
                if (isExpanded && hasChildren) {
                    const childResults = flattenSpans(span.children);
                    result.push(...childResults);
                    
                    if (span.name.includes('DefaultRequestHandler')) {
                        console.log(`JaegerTraceView: Added ${childResults.length} children for ${span.name}`);
                    }
                }
            });
            return result;
        };

        const allSpans = flattenSpans(finalRootSpans);
        const maxDepth = Math.max(...Array.from(spanMap.values()).map(s => s.depth));

        console.log(`JaegerTraceView: Final result - ${allSpans.length} spans for display`);
        console.log(`JaegerTraceView: Spans:`, allSpans.map(s => ({ name: s.name, depth: s.depth, hasChildren: s.hasChildren })));

        // Step 7: Filter out internal a2a.server spans (cleaner visualization)
        const filteredSpans = allSpans.filter(span => !span.name.includes('a2a.server'));
        console.log(`JaegerTraceView: After filtering out a2a.server spans: ${filteredSpans.length} spans (was ${allSpans.length})`);
        
        // Step 8: Recalculate depths after filtering (normalize to start from 0)
        const recalculateDepth = (spans: ProcessedSpan[]) => {
            const minDepth = Math.min(...spans.map(s => s.depth));
            spans.forEach(span => {
                span.depth = span.depth - minDepth;
            });
        };
        
        if (filteredSpans.length > 0) {
            recalculateDepth(filteredSpans);
        }

        return {
            spans: filteredSpans,
            totalDuration,
            startTime: traceStartTime,
            endTime: traceEndTime,
            maxDepth: filteredSpans.length > 0 ? Math.max(...filteredSpans.map(s => s.depth)) : 0,
            traceId: currentTraceGroup.traceId
        };
    }, [currentTrace, contextId, expandedSpans]);

    // ===========================================================================
    // FILTERING
    // ===========================================================================
    
    /**
     * Apply filters to processed spans
     * Supports: search, status, service, duration, errors, session
     */
    const filteredSpans = useMemo(() => {
        if (!processTrace) return [];
        
        let spans = processTrace.spans;
        
        // Search filter: match name, operation, or service
        if (searchQuery) {
            spans = spans.filter(span => 
                span.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                span.operationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                span.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        // Status filter: OK or ERROR
        if (statusFilter !== 'all') {
            spans = spans.filter(span => span.span.status_code === statusFilter);
        }
        
        // Service filter: specific service
        if (serviceFilter !== 'all') {
            spans = spans.filter(span => span.serviceName === serviceFilter);
        }
        
        // Duration filter: fast (<100ms), medium (100-1000ms), slow (>1000ms)
        if (durationFilter !== 'all') {
            spans = spans.filter(span => {
                const duration = span.duration;
                switch (durationFilter) {
                    case 'fast': return duration < 100;
                    case 'medium': return duration >= 100 && duration < 1000;
                    case 'slow': return duration >= 1000;
                    default: return true;
                }
            });
        }
        
        // Errors only filter
        if (showOnlyErrors) {
            spans = spans.filter(span => span.span.status_code === 'ERROR');
        }
        
        // Session spans only filter
        if (showOnlySession) {
            spans = spans.filter(span => span.isSessionSpan);
        }
        
        return spans;
    }, [processTrace, searchQuery, statusFilter, serviceFilter, durationFilter, showOnlyErrors, showOnlySession]);

    /**
     * Get unique service names for filter dropdown
     */
    const uniqueServices = useMemo(() => {
        if (!processTrace) return [];
        return Array.from(new Set(processTrace.spans.map(span => span.serviceName))).sort();
    }, [processTrace]);

    // ===========================================================================
    // EVENT HANDLERS
    // ===========================================================================
    
    /**
     * Toggle expand/collapse state for a span
     * @param spanId - ID of span to toggle
     */
    const toggleSpan = (spanId: string) => {
        setExpandedSpans(prev => {
            const newSet = new Set(prev);
            if (newSet.has(spanId)) {
                newSet.delete(spanId);
            } else {
                newSet.add(spanId);
            }
            return newSet;
        });
    };

    /**
     * Expand all spans
     */
    const expandAll = () => {
        setExpandedSpans(new Set(currentTrace.map(span => span.id)));
    };

    /**
     * Collapse all spans
     */
    const collapseAll = () => {
        setExpandedSpans(new Set());
    };

    /**
     * Navigate to previous trace in the list
     */
    const goToPreviousTrace = () => {
        if (selectedTraceIndex > 0) {
            setSelectedTraceIndex(selectedTraceIndex - 1);
        }
    };

    /**
     * Navigate to next trace in the list
     */
    const goToNextTrace = () => {
        if (selectedTraceIndex < traceGroups.length - 1) {
            setSelectedTraceIndex(selectedTraceIndex + 1);
        }
    };

    // ===========================================================================
    // FORMATTING UTILITIES
    // ===========================================================================
    
    /**
     * Format duration in human-readable form
     * @param duration - Duration in milliseconds
     * @returns Formatted string (e.g., "150.0ms", "1.25s", "2.50m")
     */
    const formatDuration = (duration: number): string => {
        if (duration < 1000) return `${duration.toFixed(1)}ms`;
        if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
        return `${(duration / 60000).toFixed(2)}m`;
    };

    /**
     * Format timestamp for display
     * @param timestamp - Unix timestamp in milliseconds
     * @returns Formatted time string (HH:MM:SS.mmm)
     */
    const formatTime = (timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString('ru-RU', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    };

    // ===========================================================================
    // RENDER
    // ===========================================================================
    
    /**
     * Render empty state when no trace data
     */
    if (!processTrace) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <div className="font-medium">No trace data available</div>
                </div>
            </div>
        );
    }

    const { spans, totalDuration, startTime, endTime } = processTrace;

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
            {/* =========================================================================== */}
            {/* HEADER SECTION - Title, Stats, Navigation */}
            {/* =========================================================================== */}
            <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
                {/* Title and Stats Row */}
                <div className="flex items-center justify-between p-2">
                    {/* Title */}
                    <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-blue-100 rounded">
                            <BarChart3 className="h-3 w-3 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900 leading-tight">Trace Timeline</h2>
                            <p className="text-xs text-gray-500 leading-tight">Jaeger visualization</p>
                        </div>
                    </div>
                    
                    {/* Stats: Span count, Duration, Session badge */}
                    <div className="flex items-center gap-1.5 text-xs">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded">
                            <Zap className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-900">{filteredSpans.length}</span>
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 rounded">
                            <Clock className="h-3 w-3 text-green-600" />
                            <span className="font-medium text-green-900">{formatDuration(totalDuration)}</span>
                        </div>
                        {contextId && (
                            <div className="px-1.5 py-0.5 bg-purple-50 text-purple-900 rounded text-xs font-medium">
                                Session
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Trace Navigation (only show if multiple traces) */}
                {traceGroups.length > 1 && (
                    <div className="flex items-center justify-center px-2 pb-1">
                        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded border text-xs">
                            <button
                                onClick={goToPreviousTrace}
                                disabled={selectedTraceIndex === 0}
                                className="p-0.5 hover:bg-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Previous trace"
                            >
                                <ChevronLeft className="h-3 w-3" />
                            </button>
                            
                            <span className="font-semibold text-gray-900 px-1">
                                {selectedTraceIndex + 1}/{traceGroups.length}
                            </span>
                            
                            <button
                                onClick={goToNextTrace}
                                disabled={selectedTraceIndex === traceGroups.length - 1}
                                className="p-0.5 hover:bg-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Next trace"
                            >
                                <ChevronRightNav className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Search and Filters Row */}
                <div className="px-2 pb-2">
                    <div className="flex items-center gap-1.5">
                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search spans..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        
                        {/* Filter Toggle Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs border transition-colors ${
                                showFilters 
                                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="h-3 w-3" />
                            Filters
                        </button>
                        
                        {/* Expand All Button */}
                        <button
                            onClick={expandAll}
                            className="flex items-center gap-1 px-1.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                            title="Expand all"
                        >
                            <Expand className="h-3 w-3" />
                            All
                        </button>
                    </div>
                    
                    {/* Filter Panel (collapsible) */}
                    {showFilters && (
                        <div className="grid grid-cols-3 gap-1.5 p-2 bg-gray-50 rounded border text-xs mt-1">
                            {/* Status Filter */}
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-1.5 py-1 border border-gray-200 rounded text-xs"
                            >
                                <option value="all">All Status</option>
                                <option value="OK">OK</option>
                                <option value="ERROR">Error</option>
                            </select>
                            
                            {/* Service Filter */}
                            <select
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                className="px-1.5 py-1 border border-gray-200 rounded text-xs"
                            >
                                <option value="all">All Services</option>
                                {uniqueServices.map(service => (
                                    <option key={service} value={service}>{service}</option>
                                ))}
                            </select>
                            
                            {/* Errors Only Toggle */}
                            <label className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={showOnlyErrors}
                                    onChange={(e) => setShowOnlyErrors(e.target.checked)}
                                    className="rounded border-gray-300"
                                />
                                <span>Errors only</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* =========================================================================== */}
            {/* TIMELINE SECTION - Span list with timeline bars */}
            {/* =========================================================================== */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Timeline Area - shrinks when span is selected */}
                <div className={`${selectedSpan ? 'h-1/3' : 'flex-1'} overflow-auto bg-white border-b border-gray-200`}>
                    <div className="min-w-full">
                        {/* Table Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
                            <div className="flex text-xs">
                                {/* Service & Operation Column */}
                                <div className="w-48 sm:w-64 md:w-80 p-2 border-r border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                                    <div className="font-semibold text-gray-900 flex items-center gap-1">
                                        <Activity className="h-3 w-3" />
                                        Service & Operation
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {formatTime(startTime)} - {formatTime(endTime)}
                                    </div>
                                </div>
                                
                                {/* Timeline Column */}
                                <div className="flex-1 p-2 bg-gradient-to-r from-white to-gray-50">
                                    <div className="font-semibold text-gray-900 flex items-center gap-1">
                                        <Timer className="h-3 w-3" />
                                        Timeline ({formatDuration(totalDuration)})
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {filteredSpans.length} of {spans.length} spans
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Span Rows */}
                        <div className="divide-y divide-gray-100">
                            {filteredSpans.map((span, index) => (
                                <div
                                    key={span.id}
                                    className={`flex hover:bg-blue-50 transition-colors ${
                                        selectedSpan?.id === span.id ? 'bg-blue-100 border-l-2 border-blue-500' : ''
                                    } ${span.isSessionSpan ? 'bg-purple-50' : ''}`}
                                >
                                    {/* Service & Operation Column */}
                                    <div className="w-48 sm:w-64 md:w-80 p-2 border-r border-gray-200">
                                        <div className="flex items-center gap-1" style={{ paddingLeft: `${Math.min(span.depth * 12, 48)}px` }}>
                                            {/* Expand/Collapse Button */}
                                            {span.hasChildren && (
                                                <button
                                                    onClick={() => toggleSpan(span.id)}
                                                    className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    {expandedSpans.has(span.id) ? (
                                                        <ChevronDown className="h-3 w-3 text-gray-600" />
                                                    ) : (
                                                        <ChevronRight className="h-3 w-3 text-gray-600" />
                                                    )}
                                                </button>
                                            )}
                                            
                                            {/* Service Icon */}
                                            <div className="p-1 rounded" style={{ backgroundColor: span.color + '20' }}>
                                                {React.cloneElement(getServiceIcon(span.serviceName), { className: "h-3 w-3" })}
                                            </div>
                                            
                                            {/* Span Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-gray-900 truncate text-sm">
                                                        {span.operationName}
                                                    </span>
                                                    {/* Session Badge */}
                                                    {span.isSessionSpan && (
                                                        <span className="px-1 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                                            S
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <span 
                                                        className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                                                        style={{ backgroundColor: span.color }}
                                                    >
                                                        {span.serviceName.split('.')[0]}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {formatDuration(span.duration)}
                                                    </span>
                                                    {/* Status Icon */}
                                                    {React.cloneElement(getStatusIcon(span.span.status_code), { className: "h-3 w-3" })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Timeline Bar Column */}
                                    <div className="flex-1 p-2 relative">
                                        <div className="relative h-6 flex items-center">
                                            {/* Timeline Bar */}
                                            <div
                                                className="absolute h-4 rounded shadow-sm border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow"
                                                style={{
                                                    left: `${span.relativeStart}%`,
                                                    width: `${Math.max(span.relativeEnd - span.relativeStart, 1)}%`,
                                                    backgroundColor: span.color,
                                                    // Higher opacity for error spans
                                                    opacity: span.span.status_code === 'ERROR' ? 0.8 : 0.7
                                                }}
                                                onClick={() => setSelectedSpan(selectedSpan?.id === span.id ? null : span)}
                                            >
                                                <span className="text-xs text-white font-medium truncate px-1">
                                                    {formatDuration(span.duration)}
                                                </span>
                                                {/* Error indicator */}
                                                {span.span.status_code === 'ERROR' && (
                                                    <XCircle className="h-2 w-2 text-white ml-1" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* =========================================================================== */}
                {/* DETAIL PANEL - Shows selected span details */}
                {/* =========================================================================== */}
                {selectedSpan && (
                    <div className="h-2/3 bg-white overflow-auto">
                        <div className="p-4 h-full">
                            {/* Detail Header */}
                            <div className="flex items-center justify-between mb-1 py-1">
                                <div className="flex items-center gap-1">
                                    <div className="p-0.5 rounded" style={{ backgroundColor: selectedSpan.color + '20' }}>
                                        {React.cloneElement(getServiceIcon(selectedSpan.serviceName), { className: "h-3 w-3" })}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                                            {selectedSpan.operationName}
                                        </h3>
                                        <p className="text-xs text-gray-600 leading-tight">{selectedSpan.serviceName}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSpan(null)}
                                    className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <XCircle className="h-3 w-3 text-gray-500" />
                                </button>
                            </div>
                            
                            <div className="flex flex-col h-full gap-2">
                                {/* =========================================================================== */}
                                {/* STATS GRID - Start time, Duration, Status, Service */}
                                {/* =========================================================================== */}
                                <div className="flex-shrink-0">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200 p-2 mb-1">
                                        <div className="grid grid-cols-4 gap-2">
                                            {/* Start Time */}
                                            <div className="text-center">
                                                <div className="flex items-center justify-center">
                                                    <Clock className="h-3 w-3 text-blue-600 mr-1" />
                                                    <div className="text-xs text-gray-600">Start</div>
                                                </div>
                                                <div className="text-xs font-mono font-semibold text-gray-900 mt-0.5">
                                                    {formatTime(selectedSpan.startTime).split(' ')[1]}
                                                </div>
                                            </div>
                                            
                                            {/* Duration */}
                                            <div className="text-center">
                                                <div className="flex items-center justify-center">
                                                    <Timer className="h-3 w-3 text-green-600 mr-1" />
                                                    <div className="text-xs text-gray-600">Duration</div>
                                                </div>
                                                <div className="text-sm font-mono font-bold text-green-700 mt-0.5">
                                                    {formatDuration(selectedSpan.duration)}
                                                </div>
                                            </div>
                                            
                                            {/* Status */}
                                            <div className="text-center">
                                                <div className="flex items-center justify-center">
                                                    {React.cloneElement(getStatusIcon(selectedSpan.span.status_code), { className: "h-3 w-3 mr-1" })}
                                                    <div className="text-xs text-gray-600">Status</div>
                                                </div>
                                                <div className={`text-xs font-semibold mt-0.5 ${
                                                    selectedSpan.span.status_code === 'OK' ? 'text-green-700' :
                                                    selectedSpan.span.status_code === 'ERROR' ? 'text-red-700' : 'text-yellow-700'
                                                }`}>
                                                    {selectedSpan.span.status_code}
                                                </div>
                                            </div>
                                            
                                            {/* Service */}
                                            <div className="text-center">
                                                <div className="flex items-center justify-center">
                                                    {React.cloneElement(getServiceIcon(selectedSpan.serviceName), { className: "h-3 w-3 mr-1" })}
                                                    <div className="text-xs text-gray-600">Service</div>
                                                </div>
                                                <div className="text-xs font-semibold truncate mt-0.5" style={{ color: selectedSpan.color }}>
                                                    {selectedSpan.serviceName.split('.')[0]}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Metadata Row */}
                                    <div className="flex gap-2 text-xs text-gray-600 bg-gray-50 rounded p-1.5">
                                        <span className="flex items-center gap-1">
                                            <Activity className="h-3 w-3" />
                                            <span className="font-medium">Op:</span>
                                            <span className="font-mono truncate max-w-20">{selectedSpan.operationName}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Settings className="h-3 w-3" />
                                            <span className="font-medium">ID:</span>
                                            <span className="font-mono truncate max-w-12">{selectedSpan.span.id}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Globe className="h-3 w-3" />
                                            <span className="font-medium">L{selectedSpan.depth}</span>
                                        </span>
                                        {selectedSpan.isSessionSpan && (
                                            <span className="px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                Session
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* =========================================================================== */}
                                {/* ATTRIBUTES PANEL - Shows span attributes with type detection */}
                                {/* =========================================================================== */}
                                <div className="flex-1 flex flex-col min-h-0">
                                    {selectedSpan.span.attributes && Object.keys(selectedSpan.span.attributes).length > 0 ? (
                                        <div className="flex-1 flex flex-col min-h-0">
                                            <div className="flex-shrink-0 mb-0.5">
                                                <label className="block text-xs font-bold text-gray-900 flex items-center gap-1">
                                                    <Settings className="h-3 w-3 text-blue-600" />
                                                    Span Attributes
                                                    <span className="px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">
                                                        {Object.keys(selectedSpan.span.attributes).length}
                                                    </span>
                                                </label>
                                            </div>
                                            
                                            {/* Attributes List with Type Detection */}
                                            <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded border border-gray-200 overflow-hidden min-h-0">
                                                <div className="h-full overflow-auto p-2">
                                                    <div className="space-y-1">
                                                        {Object.entries(selectedSpan.span.attributes).map(([key, value]) => {
                                                            // Type detection for appropriate display
                                                            const isUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
                                                            const isNumber = typeof value === 'number' || !isNaN(Number(value));
                                                            const isBoolean = typeof value === 'boolean' || value === 'true' || value === 'false';
                                                            const isJson = typeof value === 'object' || (typeof value === 'string' && (value.startsWith('{') || value.startsWith('[')));
                                                            
                                                            return (
                                                                <div key={key} className="bg-white rounded p-1.5 border border-gray-200 hover:border-gray-300 transition-all">
                                                                    <div className="flex items-start gap-1.5">
                                                                        {/* Type Icon */}
                                                                        <div className="flex-shrink-0 mt-0.5">
                                                                            {isUrl ? (
                                                                                <div className="p-0.5 bg-blue-100 rounded">
                                                                                    <Globe className="h-2.5 w-2.5 text-blue-600" />
                                                                                </div>
                                                                            ) : isNumber ? (
                                                                                <div className="p-0.5 bg-green-100 rounded">
                                                                                    <BarChart3 className="h-2.5 w-2.5 text-green-600" />
                                                                                </div>
                                                                            ) : isBoolean ? (
                                                                                <div className="p-0.5 bg-purple-100 rounded">
                                                                                    <CheckCircle className="h-2.5 w-2.5 text-purple-600" />
                                                                                </div>
                                                                            ) : isJson ? (
                                                                                <div className="p-0.5 bg-orange-100 rounded">
                                                                                    <Settings className="h-2.5 w-2.5 text-orange-600" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="p-0.5 bg-gray-100 rounded">
                                                                                    <Activity className="h-2.5 w-2.5 text-gray-600" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Attribute Content */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-sm font-bold text-gray-900 truncate">
                                                                                    {key}
                                                                                </span>
                                                                                {/* Type Badge */}
                                                                                <span className={`px-1 py-0.5 text-xs rounded font-medium ${
                                                                                    isUrl ? 'bg-blue-100 text-blue-700' :
                                                                                    isNumber ? 'bg-green-100 text-green-700' :
                                                                                    isBoolean ? 'bg-purple-100 text-purple-700' :
                                                                                    isJson ? 'bg-orange-100 text-orange-700' :
                                                                                    'bg-gray-100 text-gray-700'
                                                                                }`}>
                                                                                    {isUrl ? 'URL' : isNumber ? 'Num' : isBoolean ? 'Bool' : isJson ? 'Obj' : 'Str'}
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            {/* Value Display */}
                                                                            <div className="text-sm mt-0.5">
                                                                                {isUrl ? (
                                                                                    <a 
                                                                                        href={value as string} 
                                                                                        target="_blank" 
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-blue-600 hover:text-blue-800 underline break-all text-xs"
                                                                                    >
                                                                                        {value as string}
                                                                                    </a>
                                                                                ) : isJson && typeof value === 'object' ? (
                                                                                    <div className="bg-gray-50 rounded p-1.5 mt-0.5 border">
                                                                                        <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-24 leading-tight">
                                                                                            {JSON.stringify(value, null, 2)}
                                                                                        </pre>
                                                                                    </div>
                                                                                ) : isJson && typeof value === 'string' ? (
                                                                                    <div className="bg-gray-50 rounded p-1.5 mt-0.5 border">
                                                                                        <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-24 leading-tight">
                                                                                            {(() => {
                                                                                                try {
                                                                                                    return JSON.stringify(JSON.parse(value), null, 2);
                                                                                                } catch {
                                                                                                    return value;
                                                                                                }
                                                                                            })()}
                                                                                        </pre>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="bg-gray-50 rounded p-1.5 mt-0.5 border">
                                                                                        <span className={`font-mono break-all text-xs leading-tight ${
                                                                                            isNumber ? 'text-green-700 font-semibold' :
                                                                                            isBoolean ? 'text-purple-700 font-semibold' :
                                                                                            'text-gray-700'
                                                                                        }`}>
                                                                                            {String(value)}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center min-h-0">
                                            <div className="text-center text-gray-500">
                                                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                <p className="text-lg font-medium">No attributes available for this span</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
