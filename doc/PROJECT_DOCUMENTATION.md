# A2A UI - Agent-to-Agent Platform Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Key Components](#key-components)
   - [Chat System](#chat-system)
   - [Tracing Components](#tracing-components)
5. [A2A Protocol Implementation](#a2a-protocol-implementation)
6. [State Management](#state-management)
7. [Phoenix Tracing Integration](#phoenix-tracing-integration)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Development](#development)
11. [Theme System](#theme-system)
12. [Docker Support](#docker-support)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**A2A UI** is a modern, production-ready user interface for Google's Agent-to-Agent (A2A) communication protocol. Built with Next.js, TypeScript, and shadcn/ui, it provides a comprehensive platform for managing AI agents, real-time chat interactions, and distributed tracing visualization.

### Core Features

- **Agent Management**: Full CRUD operations for AI agents with configuration and real-time status monitoring
- **Chat Interface**: Telegram-style messaging with streaming support, message history, and artifact display
- **Phoenix Tracing**: Real-time trace visualization with Jaeger-style timeline and graph views
- **Multi-theme Support**: Dark/Light/System theme modes with automatic persistence
- **Type-Safe**: Complete TypeScript implementation with strict type checking

---

## Technology Stack

### Core Technologies

| Technology   | Version | Purpose                             |
| ------------ | ------- | ----------------------------------- |
| Next.js      | 15.3.3  | React framework with App Router     |
| React        | 19.0.0  | UI library                          |
| TypeScript   | 5.x     | Type-safe JavaScript                |
| Tailwind CSS | 4       | Utility-first CSS framework         |
| shadcn/ui    | -       | Component library built on Radix UI |

### Key Dependencies

- **@radix-ui/react-\***: Low-level UI primitives (switch, scroll-area, slot)
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management
- **tailwind-merge**: Tailwind CSS class merging
- **uuid**: Unique ID generation
- **genkit**: AI development framework (optional)

### Development Tools

- **ESLint**: Code linting with Next.js recommended rules
- **Prettier**: Code formatting
- **Docker**: Containerization support

---

## Architecture

### Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── pages/               # Additional pages (TaskList, Settings, etc.)
│   ├── api/                # API routes
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
│
├── components/              # React components
│   ├── ui/                # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── switch.tsx
│   │   ├── scroll-area.tsx
│   │   └── badge.tsx
│   │
│   ├── chat/              # Chat-related components
│   │   ├── ChatContainer.tsx     # Main chat container
│   │   ├── ChatInput.tsx        # Message input component
│   │   ├── ChatMessageBubble.tsx
│   │   ├── MessagesList.tsx
│   │   ├── ArtifactDisplay.tsx  # Display AI-generated artifacts
│   │   ├── PartsDisplay.tsx      # Display message parts
│   │   ├── TypingIndicator.tsx
│   │   ├── TraceSidebar.tsx      # Phoenix trace panel
│   │   ├── TraceGraph.tsx        # Trace visualization
│   │   ├── TraceTreeBuilder.tsx
│   │   ├── TraceTestComponent.tsx
│   │   └── JaegerTraceView.tsx   # Jaeger-style timeline
│   │
│   ├── layout/            # Layout components
│   │   ├── Header.tsx
│   │   └── TabContent.tsx
│   │
│   ├── common/            # Shared components
│   │   └── ErrorBoundary.tsx
│   │
│   ├── App.tsx            # Main application component
│   └── ThemeToggle.tsx    # Theme switching
│
├── hooks/                 # Custom React hooks
│   ├── useChat.ts         # Chat functionality hook
│   ├── useTrace.ts        # Phoenix tracing hook
│   ├── useAppState.ts     # Application state hook
│   ├── useLocalStorage.ts # Local storage persistence
│   └── index.ts
│
├── lib/                   # Utility libraries
│   ├── utils.ts           # General utilities (cn function)
│   ├── logger.ts          # Logging system
│   ├── error-handler.ts   # Error handling utilities
│   └── env.ts             # Environment validation
│
├── types/                 # TypeScript type definitions
│   ├── index.ts
│   └── chat.ts            # Chat-specific types
│
├── contexts/              # React contexts
│   └── ThemeContext.tsx   # Theme context provider
│
└── a2a/                   # A2A-specific logic
    ├── client.ts          # A2A JSON-RPC client
    ├── schema.ts          # A2A protocol schemas
    ├── README.md          # A2A client documentation
    │
    └── state/            # State management
        ├── app/           # Application state
        │   ├── AppState.ts
        │   └── appStateContext.tsx
        │
        ├── agent/        # Agent state
        │   ├── AgentState.ts
        │   └── agentStateContext.tsx
        │
        ├── host/         # Host state
        │   ├── HostState.ts
        │   └── hostStateContext.tsx
        │
        └── settings/     # Settings state
            ├── SettingsState.ts
            └── settingsStateContext.tsx
```

---

## Key Components

### Chat System

#### Overview

The chat system provides a Telegram-style messaging interface with support for:
- Real-time streaming responses
- Message history with persistence
- File and artifact display
- Context-aware conversations
- Phoenix trace integration

#### `ChatContainer.tsx`

Main chat interface component that integrates all chat functionality.

**Props Interface:**

```typescript
interface ChatContainerProps {
    selectedAgent: AgentCard | null;      // Currently selected agent
    showAgentDetails: boolean;           // Whether to show agent sidebar
    conversation: StateConversation | null;  // Current conversation
    onChatTabChange?: () => void;        // Callback when tab becomes active
}
```

**State Management:**

| State | Type | Description |
|-------|------|-------------|
| `newMessage` | string | Current input message |
| `isStreamingEnabled` | boolean | Toggle for streaming mode |
| `editingContextId` | boolean | Whether editing context ID |
| `tempContextId` | string | Temporary context ID during edit |

**Key Features:**

1. **Streaming Toggle**: Switch between streaming and non-streaming modes
2. **Context ID Management**: Edit session context for trace correlation
3. **Auto-refresh**: Automatically refreshes traces 2 seconds after sending a message
4. **Message Persistence**: Saves messages to global app state
5. **Input Focus**: Auto-focuses input when chat tab becomes active

**Component Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Agent: [Agent Name]        [Streaming: OFF/ON]  [Trace Panel]    │
├─────────────────────────────────────┬───────────────────────────────┤
│                                     │                               │
│  ┌─────────────────────────────┐   │   ┌─────────────────────────┐ │
│  │ User Message               │   │   │ Phoenix Trace            │ │
│  └─────────────────────────────┘   │   │                         │ │
│                                     │   │ [Timeline] [Graph]      │ │
│  ┌─────────────────────────────┐   │   │                         │ │
│  │ AI Response                │   │   │ - Span 1                 │ │
│  │ [Streaming...]             │   │   │ - Span 2                │ │
│  └─────────────────────────────┘   │   │ - Span 3                │ │
│                                     │   │                         │ │
│  ┌─────────────────────────────┐   │   │                         │ │
│  │ Artifact Display           │   │   └─────────────────────────┘ │
│  │ [File/Code/Image]          │   │                               │
│  └─────────────────────────────┘   │                               │
│                                     │                               │
├─────────────────────────────────────┴───────────────────────────────┤
│  [Input Field]                                        [Send Button] │
└─────────────────────────────────────────────────────────────────────┘
```

#### `ChatInput.tsx`

Message input component with file attachment support.

**Features:**
- Multi-line text input with auto-resize
- Send button with loading state
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Placeholder text

#### `MessagesList.tsx`

Displays all messages in the conversation with:
- Auto-scroll to latest message
- Typing indicator for loading states
- Message grouping by role (user/assistant)
- Timestamp display

#### `ChatMessageBubble.tsx`

Individual message bubble with:
- User (right-aligned) / Assistant (left-aligned) styling
- Markdown rendering for text
- Copy button for message content
- Artifact/parts display integration

#### `ArtifactDisplay.tsx`

Displays AI-generated artifacts:
- Code blocks with syntax highlighting
- File previews
- Image display
- Data tables

#### `PartsDisplay.tsx`

Handles different message part types:
- Text parts
- File parts
- Data parts (JSON)
- Embedded content

#### `useChat` Hook

Custom hook managing all chat functionality.

**Interface:**

```typescript
interface UseChatOptions {
    agentUrl: string;               // A2A agent server URL
    isStreamingEnabled: boolean;    // Enable streaming mode
    contextId?: string;            // Session context ID
    initialMessages?: Message[];   // Initial message history
    onMessagesChange?: (messages: Message[]) => void;  // Callback on message updates
}

interface UseChatResult {
    messages: Message[];           // Current message list
    isLoading: boolean;            // Loading state
    messagesEndRef: RefObject<HTMLDivElement>;  // Auto-scroll reference
    scrollToBottom: () => void;    // Manual scroll function
    sendMessage: (message: string) => Promise<void>;  // Send function
    cancelRequest?: () => void;    // Cancel ongoing request
}
```

**Message Flow:**

```
User Input
    │
    ▼
┌─────────────────┐
│ sendMessage()  │ ──────────────────┐
└─────────────────┘                   │
    │                                  ▼
    │                   ┌─────────────────────────┐
    │                   │ A2A Protocol            │
    │                   │ - Convert to Message    │
    │                   │ - Send to agent         │
    │                   └─────────────────────────┘
    │                                  │
    ▼                                  ▼
┌─────────────────┐         ┌─────────────────────────┐
│ Update State    │ ◄───────┤ Receive Response        │
│ - Add user msg │         │ - Parse artifacts        │
│ - Add AI msg   │         │ - Update messages        │
└─────────────────┘         └─────────────────────────┘
    │
    ▼
┌─────────────────┐
│ Auto-scroll     │
│ Trigger trace   │
│ refresh         │
└─────────────────┘
```

**Streaming Mode:**

When `isStreamingEnabled` is true:
- Uses `sendTaskSubscribe` JSON-RPC method
- Processes events in real-time
- Updates UI as tokens arrive
- Shows typing indicator

**Non-Streaming Mode:**

When `isStreamingEnabled` is false:
- Uses `sendTask` JSON-RPC method
- Waits for complete response
- Displays loading spinner

### Tracing Components

#### `TraceSidebar.tsx`

The Phoenix Trace sidebar is the main container for distributed tracing visualization. Located on the right side of the chat interface, it provides a comprehensive view of agent execution traces.

**Key Features:**

| Feature | Description |
|---------|-------------|
| **Resizable Panel** | Drag the handle on the right edge to resize (200-800px range) |
| **View Mode Toggle** | Switch between Jaeger timeline and Graph views |
| **Refresh Button** | Manually reload trace data |
| **Project Display** | Shows current Phoenix project ID |
| **Session Filtering** | Automatically filters by contextId when provided |

**Component Structure:**

```typescript
interface TraceSidebarProps {
    trace: TraceNode[] | null;           // Trace data from Phoenix
    loading: boolean;                      // Loading state
    error: string | null;                 // Error message if any
    projectId?: string | null;            // Current Phoenix project ID
    availableProjects?: Array<{          // List of available projects
        id: string;
        name: string;
        description?: string;
    }>;
    refreshTrace?: () => void;           // Callback to refresh traces
    contextId?: string;                  // Session ID for filtering
}
```

**State Management:**

- **Width State**: Persisted to `localStorage` under key `phoenix-sidebar-width`
- **View Mode**: Toggle between `'jaeger'` (timeline) and `'graph'` views
- **Resize Handling**: Mouse event listeners for drag-to-resize functionality

**Error Handling:**

When a project is not found, the sidebar displays:
- Warning message with project name
- List of available projects in Phoenix
- Suggestions for resolution

#### `JaegerTraceView.tsx`

Jaeger-style visualization providing a detailed timeline view of distributed traces.

**Overview:**

The Jaeger view mimics the popular Jaeger UI for distributed tracing, showing:
- Hierarchical span tree with parent-child relationships
- Visual timeline bars showing relative execution timing
- Service-based color coding
- Comprehensive filtering and search

**Span Timeline:**

Each span is displayed as a row with two main columns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Service & Operation  │  Timeline (0% ──────────────────────────────────100%)│
├─────────────────────────────────────────────────────────────────────────────┤
│ 🔧 llm.anthropic     │ [████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│    ↳ generate        │    [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]      │
│ 🔧 agent.workflow   │       [████████████████████░░░░░░░░░░░░░░░░░░░░]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Timeline Calculation:**

```typescript
// Each span's position is calculated as percentage of total trace duration
relativeStart: ((startTime - traceStartTime) / totalDuration) * 100  // percentage
relativeEnd: ((endTime - traceStartTime) / totalDuration) * 100    // percentage
```

**Duration Bar Features:**

| Property | Value | Description |
|----------|-------|-------------|
| Height | 16px (h-4) | Compact but visible |
| Min Width | 1% | Ensures visibility for very short spans |
| Border Radius | 4px (rounded) | Smooth edges |
| Error Opacity | 0.8 | Higher opacity for errors |
| Default Opacity | 0.7 | Standard visibility |

**Duration Formatting:**

```typescript
< 1000ms     → "150.0ms"    // Milliseconds with 1 decimal
1000-60000ms → "1.25s"       // Seconds with 2 decimals  
> 60000ms    → "2.50m"       // Minutes with 2 decimals
```

**Status Indicators:**

Three status types with distinct visual representations:

| Status | Icon | Color | Bar Style |
|--------|------|-------|-----------|
| **OK** | ✓ CheckCircle | Green (#10B981) | Standard opacity (0.7) |
| **ERROR** | ✗ XCircle | Red (#EF4444) | Higher opacity (0.8) + X icon |
| **unset** | ⚠ AlertTriangle | Yellow (#F59E0B) | Standard opacity |

**Service Color Palette:**

Colors are deterministically assigned based on service name hash:

```typescript
const serviceColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];
```

**Filtering System:**

| Filter Type | Options | Implementation |
|-------------|---------|----------------|
| **Search** | Text input | Matches span name, operation, service |
| **Status** | All/OK/ERROR | Filters by `span.status_code` |
| **Service** | All + dynamic list | Filters by service name |
| **Duration** | fast/medium/slow | fast: <100ms, medium: 100-1000ms, slow: >1000ms |
| **Errors Only** | Checkbox | Shows only ERROR spans |
| **Session Only** | Checkbox | Shows only session-related spans |

**Session Span Detection:**

Session spans are identified by matching these attribute keys:
```typescript
const sessionId = span.attributes?.session_id ||
                  span.attributes?.['session.id'] ||
                  span.attributes?.sessionId ||
                  span.attributes?.['gcp.vertex.agent.session_id'];
```

**Detail Panel:**

When a span is clicked, the bottom 2/3 of the view shows detailed information:

```
┌─────────────────────────────────────────────────────────────┐
│ Operation Name                    Service Name        [X]  │
├─────────────────────────────────────────────────────────────┤
│  Start Time  │  Duration  │  Status  │  Service           │
│  14:30:15   │   1.25s    │    OK    │  llm.anthropic     │
├─────────────────────────────────────────────────────────────┤
│ Op: generate │ ID: abc123 │ L: 2     │ [Session Badge]    │
├─────────────────────────────────────────────────────────────┤
│ Span Attributes (15)                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ session_id  │ [Str] │ "sess-abc-123"                    │ │
│ │ model      │ [Str] │ "claude-3-opus"                   │ │
│ │ tokens     │ [Num] │ 2456                               │ │
│ │ temperature│ [Num] │ 0.7                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Attribute Type Detection:**

The view automatically detects and formats attribute types:

| Type | Detection Rule | Badge Color | Display |
|------|----------------|-------------|---------|
| **URL** | Starts with `http://` or `https://` | Blue | Clickable link |
| **Number** | Numeric value or parseable string | Green | Green monospace text |
| **Boolean** | `true` or `false` strings | Purple | Purple monospace text |
| **JSON** | Object or string starting with `{`/`[` | Orange | Formatted `<pre>` block |
| **String** | Default | Gray | Standard monospace text |

**Navigation:**

- **Trace Selector**: Shows current trace index when multiple traces exist (e.g., "3/5")
- **Prev/Next Buttons**: Navigate between traces chronologically
- **Auto-select**: Automatically selects the latest trace on data refresh

**Expand/Collapse:**

- Click chevron icons to expand/collapse parent spans
- "Expand All" button expands all spans at once
- Indentation shows depth level (12px per level, max 48px)

#### `TraceGraph.tsx`

Graph-based visualization showing trace relationships as an interactive node graph.

**Overview:**

The Graph view provides an alternative visualization to the Jaeger timeline, showing:
- Node-based representation of spans
- Parent-child relationships as directed edges
- Interactive node selection and hover states
- Animated flow indicators on connections

**Visual Design:**

```
                    ┌─────────────────┐
                    │  agent.workflow │
                    │     OK • 2.5s   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────┴─────────┐     │     ┌────────┴─────────┐
    │   llm.anthropic  │     │     │  tool.browser   │
    │   OK • 1.2s     │     │     │   OK • 500ms    │
    └─────────────────┘     │     └──────────────────┘
                            │
                   ┌────────┴────────┐
                   │  tool.search    │
                   │   OK • 200ms   │
                   └─────────────────┘
```

**Node Styling:**

| Node Type | Fill Color | Border Color | Border Width |
|-----------|------------|--------------|--------------|
| **Session Span** | #3B82F6 (Blue) | #1D4ED8 | 2px |
| **OK Status** | #10B981 (Green) | #047857 | 2px |
| **ERROR Status** | #EF4444 (Red) | #B91C1C | 2px |
| **Selected** | #8B5CF6 (Purple) | #6D28D9 | 2px |
| **Default** | #6B7280 (Gray) | #374151 | 2px |

**Edge/Connection Styling:**

- **Normal Connection**: Blue-to-purple gradient (#4F46E5 → #7C3AED)
- **Session Connection**: Orange-to-pink gradient (#F59E0B → #EC4899)
- **Line Width**: 2.5px normal, 3px for session connections
- **Arrow Markers**: Chevron-style arrowheads
- **Animated Flow Dots**: Moving circles along the path (4s animation cycle)

**Layout Algorithm:**

The graph uses a level-based layout:

```typescript
// Level 0: Root nodes, centered horizontally
node.x = centerX + index * (NODE_WIDTH + SPACING)
node.y = 0

// Level N+1: Children positioned below parents
node.x = parent.x  // Centered under parent
node.y = (level) * LEVEL_HEIGHT

// Collision detection: Adjusts overlapping nodes
if (node.x - prevNode.x < MIN_DISTANCE) {
    shiftNodesRight();
}
```

**Node Interactions:**

| Action | Behavior |
|--------|----------|
| **Click** | Select node, show details in bottom panel |
| **Hover** | Scale up (1.05x), show tooltip |
| **Hover Edge** | Increase opacity, add glow effect |

**Graph Data Structure:**

```typescript
interface GraphNode {
    id: string;
    name: string;
    span: TraceNode;
    x: number;
    y: number;
    level: number;
    children: string[];
    parents: string[];
    isSessionSpan: boolean;
}

interface GraphEdge {
    from: string;
    to: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}
```

**Filtering:**

The graph automatically filters:
- Removes internal `a2a.server` spans for cleaner visualization
- Shows only traces containing session-related spans (when contextId provided)

**Auto-navigation:**

- Automatically scrolls to session span when trace loads
- Auto-selects the latest trace when data updates
- Previous/Next buttons cycle through all available traces

---

## useTrace Hook

The `useTrace` hook provides a complete interface for fetching and managing Phoenix trace data.

---

## A2A Protocol Implementation

### Schema (`src/a2a/schema.ts`)

Complete TypeScript definitions for the A2A protocol including:

#### Core Types

- **TaskState**: `submitted` | `working` | `input-required` | `completed` | `canceled` | `failed` | `unknown`
- **AgentCard**: Agent metadata and capabilities
- **Message**: Chat messages with parts (text, file, data)
- **Artifact**: Generated content from agent tasks
- **Task**: Represents a task being processed

#### JSON-RPC Types

- Request types: `SendTaskRequest`, `GetTaskRequest`, `CancelTaskRequest`, etc.
- Response types: `SendTaskResponse`, `GetTaskResponse`, etc.
- Error codes: Standard JSON-RPC + A2A-specific codes

### Client (`src/a2a/client.ts`)

The `A2AClient` class provides HTTP-based communication:

#### Methods

| Method                            | Description                   |
| --------------------------------- | ----------------------------- |
| `agentCard()`                     | Fetch agent metadata (cached) |
| `sendMessage(params)`             | Send message, get response    |
| `sendTask(params)`                | Send task (non-streaming)     |
| `sendTaskSubscribe(params)`       | Stream task updates           |
| `getTask(params)`                 | Get task status               |
| `cancelTask(params)`              | Cancel running task           |
| `setTaskPushNotification(params)` | Configure push notifications  |
| `getTaskPushNotification(params)` | Get push notification config  |
| `resubscribeTask(params)`         | Reconnect to task stream      |

#### Usage Example

```typescript
import { A2AClient } from '@/a2a/client';
import { v4 as uuidv4 } from 'uuid';

const client = new A2AClient('http://localhost:41241');

// Non-streaming
const task = await client.sendTask({
  id: uuidv4(),
  message: {
    messageId: uuidv4(),
    role: 'user',
    parts: [{ kind: 'text', text: 'Hello!' }],
  },
});

// Streaming
for await (const event of client.sendTaskSubscribe(params)) {
  if ('status' in event) {
    console.log('Status:', event.status.state);
  } else if ('artifact' in event) {
    console.log('Artifact:', event.artifact);
  }
  if (event.final) break;
}
```

---

## State Management

### App State

Global application state including UI and conversation data:

```typescript
class AppState {
    // UI State
    sidenav_open: boolean = false;
    theme_mode: "system" | "light" | "dark" = "system";
    
    // Conversation State
    current_conversation_id: string = "";
    conversations: StateConversation[] = [];
    conversation_messages: { [conversation_id: string]: ChatMessage[] } = {};
    
    // Task Management
    task_list: SessionTask[] = [];
    background_tasks: { [key: string]: string } = {};
    
    // Form Handling
    completed_forms: { [form_id: string]: any } = {};
    form_responses: { [form_id: string]: string } = {};
    
    // Polling
    polling_interval: number = 1;
    
    // Phoenix (legacy - moved to SettingsState)
    arize_phoenix_url: string = "";
    arize_phoenix_enabled: boolean = false;
}
```

### State Contexts

The application uses React Context for state management:

| Context | Provider | Purpose |
|---------|----------|---------|
| `AppStateContext` | AppStateContextProvider | Global UI and conversation state |
| `AgentStateContext` | AgentStateContextProvider | Agent list and selection |
| `HostStateContext` | HostStateContextProvider | Host configuration |
| `SettingsStateContext` | SettingsStateContextProvider | User preferences |
| `ThemeContext` | ThemeProvider | Theme management |

### Settings State

The application stores user preferences and configuration:

---

## Phoenix Tracing Integration

### Overview

The UI integrates with Arize Phoenix for distributed tracing visualization:

1. **Project Discovery**: Automatically finds Phoenix projects matching agent names
2. **Span Filtering**: Filters traces by session ID (contextId)
3. **Visualization**: Multiple view modes (timeline, graph)

### Configuration

```typescript
// Settings configuration
{
    arize_phoenix_enabled: true,
    arize_phoenix_url: "http://localhost:6006"
}
```

### useTrace Hook

```typescript
const { trace, loading, error, projectId, refreshTrace } = useTrace({
  contextId: 'session-123',
  settings: settingsState,
  selectedAgent: agentCard,
  limit: 1000,
});
```

### Trace Data Structure

```typescript
interface TraceNode {
  id: string;
  name: string;
  context: { trace_id: string; span_id: string };
  span_kind: string;
  parent_id?: string;
  start_time: string;
  end_time: string;
  status_code: string;
  status_message: string;
  attributes: Record<string, any>;
  events: Array<{ name: string; timestamp: string; attributes: any }>;
}
```

---

## useTrace Hook

The `useTrace` hook provides a complete interface for fetching and managing Phoenix trace data.

### Interface

```typescript
interface UseTraceOptions {
    contextId?: string;           // Session ID for filtering
    settings: SettingsState;      // Phoenix configuration
    selectedAgent?: AgentCard | null;  // Current agent
    limit?: number;               // Max spans to fetch (default: 1000)
    startTime?: Date;             // Filter by start time
    endTime?: Date;               // Filter by end time
}

interface UseTraceResult {
    trace: TraceNode[] | null;    // Array of trace spans
    loading: boolean;            // Loading state
    error: string | null;         // Error message
    projectId: string | null;     // Phoenix project ID
    availableProjects: PhoenixProject[];  // List of available projects
    refreshTrace: () => void;     // Force refresh function
}
```

### Trace Data Structure

```typescript
interface TraceNode {
    id: string;                    // Unique span ID
    name: string;                 // Span name (e.g., "llm.anthropic.generate")
    context: {
        trace_id: string;        // Parent trace ID
        span_id: string;         // Span ID
    };
    span_kind: string;           // SPAN_KIND_CLIENT, SPAN_KIND_SERVER, etc.
    parent_id?: string | null;  // Parent span ID
    start_time: string;         // ISO timestamp
    end_time: string;           // ISO timestamp
    status_code: string;        // OK, ERROR, or unset
    status_message: string;     // Error message if ERROR
    attributes: Record<string, any>;  // Custom attributes (session_id, model, etc.)
    events: Array<{             // Span events
        name: string;
        timestamp: string;
        attributes: any;
    }>;
}
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         useTrace Workflow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Fetch Projects                                                 │
│     GET /v1/projects                                               │
│         │                                                          │
│         ▼                                                          │
│  2. Find Matching Project                                          │
│     Match agent.name === project.name                               │
│         │                                                          │
│         ▼                                                          │
│  3. Fetch Spans (with filters)                                     │
│     GET /v1/projects/{id}/spans?limit=1000&filter=...             │
│         │                                                          │
│         ▼                                                          │
│  4. Group by trace_id                                              │
│     Map<trace_id, TraceNode[]>                                     │
│         │                                                          │
│         ▼                                                          │
│  5. Filter Session Spans                                           │
│     Keep only traces with matching session_id                      │
│         │                                                          │
│         ▼                                                          │
│  6. Fetch Incomplete Traces                                        │
│     Get parent spans for orphan children                            │
│         │                                                          │
│         ▼                                                          │
│  7. Deduplicate & Sort                                             │
│     Remove duplicate spans, sort by start_time                     │
│         │                                                          │
│         ▼                                                          │
│  8. Return Results                                                 │
│     { trace, loading, error, projectId, ... }                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Session ID Filtering

The hook supports filtering traces by session ID using Phoenix Query DSL:

```typescript
// Applied filter when contextId is provided
const sessionFilter = `
    attributes['gcp.vertex.agent.session_id'] == '${contextId}' OR 
    attributes['session_id'] == '${contextId}' OR 
    attributes['session.id'] == '${contextId}' OR 
    attributes['sessionId'] == '${contextId}'
`;
```

### Error Handling

| Error Type | Message | Solution |
|------------|---------|----------|
| **403 Access Denied** | "Access denied to Phoenix projects" | Check Phoenix permissions |
| **404 Not Found** | "Spans not found for project" | Verify project exists in Phoenix |
| **No Matching Project** | "Project not found for agent X" | Create project in Phoenix or select different agent |
| **Invalid Response** | "Invalid projects response format" | Check Phoenix version compatibility |

### Usage Example

```tsx
import { useTrace } from '@/hooks/useTrace';
import { useSettingsState } from '@/a2a/state/settings';

function TracePanel({ contextId, agent }) {
    const settingsState = useSettingsState();
    
    const { 
        trace, 
        loading, 
        error, 
        projectId, 
        availableProjects,
        refreshTrace 
    } = useTrace({
        contextId,
        settings: settingsState,
        selectedAgent: agent,
        limit: 1000
    });

    if (!settingsState.arize_phoenix_enabled) {
        return <div>Phoenix integration is disabled</div>;
    }

    return (
        <TraceSidebar
            trace={trace}
            loading={loading}
            error={error}
            projectId={projectId}
            availableProjects={availableProjects}
            refreshTrace={refreshTrace}
            contextId={contextId}
        />
    );
}
```

---

## Configuration

### Environment Variables

Create `.env.local` in the project root:

```env
# App Configuration
NEXT_PUBLIC_APP_NAME=A2A UI
NEXT_PUBLIC_APP_VERSION=1.0.0

# Phoenix Configuration (optional)
NEXT_PUBLIC_ARIZE_PHOENIX_URL=http://localhost:6006
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | No | "A2A UI" | Application name |
| `NEXT_PUBLIC_APP_VERSION` | No | "1.0.0" | Application version |
| `NEXT_PUBLIC_ARIZE_PHOENIX_URL` | No | - | Phoenix server URL |

### Settings Configuration

The UI stores settings in localStorage under the key `a2a-settings`:

```typescript
interface SettingsState {
    // Phoenix Integration
    arize_phoenix_enabled: boolean;     // Enable/disable Phoenix
    arize_phoenix_url: string;         // Phoenix server URL
    
    // UI Preferences
    theme_mode: 'system' | 'light' | 'dark';
    
    // Agent Settings
    default_agent_url?: string;
    default_streaming?: boolean;
}
```

### Agent Server CORS

Configure your A2A server with CORS to allow the UI to communicate:

Configure your A2A server with CORS:

```python
from starlette.middleware.cors import CORSMiddleware

server = A2AServer(
    agent_card=agent_card,
    task_manager=AgentTaskManager(agent=QAAgent()),
    host=host,
    port=port,
)

server.app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

server.start()
```

---

## API Reference

### Next.js API Routes

| Route         | Method | Description           |
| ------------- | ------ | --------------------- |
| `/api/health` | GET    | Health check endpoint |

### A2A JSON-RPC Methods

The A2A client implements the complete JSON-RPC 2.0 protocol for agent communication:

| Method | Description | Request Type | Response Type |
| ---------------------------------- | ------------------- | ---------------------------- | ---------------------------- |
| `agent/card` | Get agent metadata | none | `AgentCard` |
| `message/send` | Send message (non-streaming) | `MessageSendParams` | `MessageSendResult` |
| `message/stream` | Stream message updates | `TaskSendParams` | `TaskStatusUpdateEvent[]` |
| `tasks/get` | Get task status | `TaskQueryParams` | `TaskGetResult` |
| `tasks/cancel` | Cancel running task | `TaskIdParams` | `TaskCancelResult` |
| `tasks/pushNotificationConfig/set` | Set push config | `TaskPushNotificationConfig` | `TaskPushNotificationConfigResult` |
| `tasks/pushNotificationConfig/get` | Get push config | `TaskIdParams` | `TaskPushNotificationConfigResult` |
| `tasks/resubscribe` | Resubscribe to task | `TaskQueryParams` | `TaskStatusUpdateEvent[]` |

#### Request/Response Examples

**Get Agent Card:**

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "agent/card",
  "params": {}
}

// Response
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "name": "My AI Agent",
    "description": "A helpful AI assistant",
    "url": "http://localhost:41241",
    "version": "1.0.0",
    "capabilities": {
      "streaming": true,
      "pushNotifications": true,
      "state": true
    }
  }
}
```

**Send Message (Non-streaming):**

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "req-002",
  "method": "message/send",
  "params": {
    "messageId": "msg-abc123",
    "sessionId": "sess-xyz789",
    "message": {
      "role": "user",
      "parts": [
        { "kind": "text", "text": "Hello, how are you?" }
      ]
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "req-002",
  "result": {
    "id": "task-123",
    "status": {
      "state": "completed",
      "message": {
        "role": "assistant",
        "parts": [
          { "kind": "text", "text": "I'm doing great!" }
        ]
      }
    }
  }
}
```

**Task Status States:**

| State | Description |
| ------ |-------------|
| `submitted` | Task received, processing not started |
| `working` | Task is being processed |
| `input-required` | Waiting for user input |
| `completed` | Task completed successfully |
| `canceled` | Task was canceled |
| `failed` | Task failed with error |

### Phoenix API Endpoints

The UI integrates with Phoenix's REST API v1:

| Endpoint | Method | Description |
| ------------------------- | ------ | ---------------------- |
| `/v1/projects` | GET | List all Phoenix projects |
| `/v1/projects/{project_id}/spans` | GET | Get spans with optional filters |

#### Project List API

```
GET /v1/projects
Headers:
  Accept: application/json

Response:
{
  "data": [
    {
      "id": "proj_abc123",
      "name": "my-agent",
      "description": "My AI Agent"
    }
  ]
}
```

#### Spans API

```
GET /v1/projects/{project_id}/spans?limit=1000&filter=...
Headers:
  Accept: application/json

Query Parameters:
  - limit: Max number of spans (default: 1000)
  - start_time: Filter by start time (ISO 8601)
  - end_time: Filter by end time (ISO 8601)
  - filter: Phoenix Query DSL filter expression

Response:
{
  "data": [
    {
      "id": "span_xyz789",
      "name": "llm.anthropic.generate",
      "context": {
        "trace_id": "trace_abc123",
        "span_id": "span_xyz789"
      },
      "span_kind": "SPAN_KIND_CLIENT",
      "parent_id": "span_parent123",
      "start_time": "2024-01-15T10:30:00.000Z",
      "end_time": "2024-01-15T10:30:01.500Z",
      "status_code": "OK",
      "status_message": "",
      "attributes": {
        "session_id": "sess_abc123",
        "model": "claude-3-opus",
        "temperature": 0.7
      },
      "events": []
    }
  ]
}
```

#### Phoenix Query DSL

The UI uses Phoenix Query DSL for filtering. Common filter patterns:

```typescript
// Filter by session ID
filter: "attributes['session_id'] == 'sess_abc123'"

// Filter by trace ID
filter: "context.trace_id == 'trace_abc123'"

// Filter by span name
filter: "name == 'llm.anthropic.generate'"

// Combine with AND/OR
filter: "attributes['session_id'] == 'sess_abc123' AND status_code == 'OK'"
```

---

## Development

### Available Scripts

```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint checks
npm run lint:fix     # Fix ESLint issues automatically
npm run type-check   # Run TypeScript type checking
npm run format       # Format code with Prettier
npm run clean        # Clean build artifacts and cache
```

### Code Quality

- **ESLint**: Configured with Next.js recommended rules and TypeScript strict mode
- **TypeScript**: Strict mode enabled for better type safety
- **Error Boundaries**: Comprehensive error handling for graceful failures
- **Logging**: Environment-aware logging system with different log levels

### Component Development

When creating new components, follow these patterns:

1. **Use TypeScript**: Define proper interfaces for props and state
2. **Use shadcn/ui**: Leverage existing components from the ui folder
3. **Use hooks**: Extract reusable logic into custom hooks
4. **Use contexts**: Share state via React Context when needed

### Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── pages/               # Page components
│   │   ├── TaskListPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── ConversationListPage.tsx
│   │   └── AgentListPage.tsx
│   ├── api/                # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
│
├── components/              # React components
│   ├── ui/                # shadcn/ui base components
│   ├── chat/              # Chat-related components
│   ├── layout/            # Layout components
│   └── common/            # Shared components
│
├── hooks/                  # Custom React hooks
│   ├── useChat.ts        # Chat functionality
│   ├── useTrace.ts       # Phoenix tracing
│   └── useAppState.ts    # Application state
│
├── lib/                   # Utility libraries
│   ├── utils.ts          # General utilities
│   ├── logger.ts         # Logging system
│   └── error-handler.ts  # Error handling
│
├── types/                 # TypeScript definitions
│   ├── index.ts
│   └── chat.ts
│
├── contexts/             # React contexts
│   └── ThemeContext.tsx  # Theme provider
│
└── a2a/                  # A2A protocol
    ├── client.ts         # JSON-RPC client
    ├── schema.ts        # Protocol schemas
    └── state/           # State management
```

---

## Theme System

### Overview

The UI features a comprehensive theme system supporting light, dark, and system-preference modes.

### Implementation

The theme system uses React Context and localStorage:

```typescript
// ThemeContext provides:
- theme: 'light' | 'dark' | 'system'
- resolvedTheme: 'light' | 'dark' (actual applied theme)
- setTheme: Function to change theme
```

### Theme Toggle

Users can switch between themes via the header:

| Option | Icon | Description |
|--------|------|-------------|
| Light | ☀️ | Light theme |
| Dark | 🌙 | Dark theme |
| System | 🖥️ | Follow OS preference |

### Persistence

Theme preference is stored in localStorage:
- Key: `a2a-theme`
- Values: `'light'`, `'dark'`, `'system'`

### CSS Variables

The theme system uses CSS custom properties:

```css
/* Light Theme */
--background: #ffffff;
--foreground: #0f172a;
--primary: #3b82f6;
--secondary: #f1f5f9;
--muted: #f8fafc;
--border: #e2e8f0;

/* Dark Theme */
--background: #0f172a;
--foreground: #f8fafc;
--primary: #60a5fa;
--secondary: #1e293b;
--muted: #1e293b;
--border: #334155;
```

---

## Docker Support

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  a2a-ui:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_APP_NAME=A2A UI
      - NEXT_PUBLIC_ARIZE_PHOENIX_URL=http://phoenix:6006
    depends_on:
      - phoenix

  phoenix:
    image: arizephoenixio/phoenix:latest
    ports:
      - "6006:6006"
    volumes:
      - phoenix-data:/app/data

volumes:
  phoenix-data:
```

### Build and Run

```bash
# Build image
docker build -t a2a-ui .

# Run container
docker run -p 3000:3000 a2a-ui

# Using docker-compose
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

#### CORS Errors

**Problem**: "Access to fetch at 'http://localhost:41241' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solution**: Add CORS middleware to your A2A agent server:
```python
server.app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Phoenix Not Showing Traces

**Problem**: Trace sidebar shows "No spans found" or "Project not found"

**Solutions**:
1. Verify Phoenix is running: `curl http://localhost:6006/v1/projects`
2. Ensure agent name matches Phoenix project name
3. Check Phoenix URL in Settings page
4. Enable Phoenix integration in Settings

#### TypeScript Errors

**Problem**: Type errors during build

**Solution**: Run type checking:
```bash
npm run type-check
```

### Debug Logging

Enable debug logging by checking browser console. The app logs:
- Phoenix API requests and responses
- Trace processing steps
- A2A client communication
- State changes

---

## License

MIT License - See [LICENSE](LICENSE) for details.
