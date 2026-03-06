# A2A UI - Agent-to-Agent Platform Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Key Components](#key-components)
5. [A2A Protocol Implementation](#a2a-protocol-implementation)
6. [State Management](#state-management)
7. [Phoenix Tracing Integration](#phoenix-tracing-integration)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)

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

#### `ChatContainer.tsx`

Main chat interface component that integrates:

- Message input/output
- Streaming mode toggle
- Agent details sidebar
- Context ID management
- Phoenix trace sidebar

#### `useChat` Hook

Custom hook managing chat functionality:

- Message sending (sync and streaming)
- Typing animation simulation
- Message history management
- A2A protocol message conversion

Key methods:

```typescript
const { messages, isLoading, sendMessage } = useChat({
  agentUrl: 'http://localhost:41241',
  isStreamingEnabled: false,
  contextId: 'optional-context-id',
});
```

### Tracing Components

#### `TraceSidebar.tsx`

Side panel displaying Phoenix traces with:

- Project selection
- Trace list with filtering
- Timeline and graph views

#### `JaegerTraceView.tsx`

Jaeger-style visualization showing:

- Span timeline
- Duration bars
- Status indicators
- Event markers

#### `TraceGraph.tsx`

Graph-based trace visualization with:

- Node relationships
- Parent-child span hierarchy
- Interactive navigation

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

### App State (`AppState.ts`)

Global application state including:

```typescript
interface AppState {
  sidenav_open: boolean;
  theme_mode: 'system' | 'light' | 'dark';
  current_conversation_id: string;
  conversations: StateConversation[];
  messages: StateMessage[];
  task_list: SessionTask[];
  background_tasks: Record<string, string>;
  message_aliases: Record<string, string>;
  completed_forms: Record<string, any>;
  form_responses: Record<string, string>;
  polling_interval: number;

  // Phoenix settings
  arize_phoenix_url: string;
  arize_phoenix_enabled: boolean;
}
```

### State Contexts

- **AppStateContext**: Global UI and conversation state
- **AgentStateContext**: Agent list and selection
- **HostStateContext**: Host configuration
- **SettingsStateContext**: User preferences

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

## Configuration

### Environment Variables

Create `.env.local`:

```env
# App Configuration
NEXT_PUBLIC_APP_NAME=A2A UI
NEXT_PUBLIC_APP_VERSION=1.0.0

# Phoenix Configuration (optional)
NEXT_PUBLIC_ARIZE_PHOENIX_URL=http://localhost:6006
```

### Agent Server CORS

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

| Method                             | Description         | Parameters                   |
| ---------------------------------- | ------------------- | ---------------------------- |
| `agent/card`                       | Get agent card      | none                         |
| `message/send`                     | Send message        | `MessageSendParams`          |
| `message/stream`                   | Stream message/task | `TaskSendParams`             |
| `tasks/get`                        | Get task status     | `TaskQueryParams`            |
| `tasks/cancel`                     | Cancel task         | `TaskIdParams`               |
| `tasks/pushNotificationConfig/set` | Set push config     | `TaskPushNotificationConfig` |
| `tasks/pushNotificationConfig/get` | Get push config     | `TaskIdParams`               |
| `tasks/resubscribe`                | Resubscribe to task | `TaskQueryParams`            |

### Phoenix API Endpoints

| Endpoint                  | Method | Description            |
| ------------------------- | ------ | ---------------------- |
| `/v1/projects`            | GET    | List projects          |
| `/v1/projects/{id}/spans` | GET    | Get spans with filters |

---

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run type-check  # Run TypeScript check
npm run format      # Format code with Prettier
npm run clean       # Clean build artifacts
```

### Docker Support

```bash
# Build image
docker build -t a2a-ui .

# Run container
docker run -p 3000:3000 a2a-ui

# Using docker-compose
docker-compose up
```

---

## License

MIT License - See [LICENSE](LICENSE) for details.
