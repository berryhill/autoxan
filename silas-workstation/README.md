# silas-workstation

Workstation task queue and execution engine for the Autoxan project. Receives dispatched tasks from Xander via MCP protocol, queues them for execution, and provides status updates.

## Overview

silas-workstation is the workstation-side component of the dispatch system. When Xander (the phone agent) determines that a conversation has crystallized into real work, it dispatches tasks to Silas for asynchronous execution.

```
┌─────────────────────────────────────────────────────────────┐
│                 silas-workstation TASK QUEUE                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ MCP Server  │───▶│ Task Queue   │───▶│  Executor     │  │
│  │ (Receiver)  │    │ (Priority)   │    │   Engine      │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         ▲                  │                    │           │
│         │                  ▼                    ▼           │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Status    │◀───│  Task Store  │◀───│   Workers     │  │
│  │  Reporter   │    │              │    │ (Code/Research)│  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **MCP Server**: Receives tasks from Xander via Model Context Protocol
- **Priority Queue**: Tasks ordered by priority (high > normal > low)
- **Task Types**: Support for code, research, file, and general tasks
- **Status Tracking**: Pending, running, completed, failed, cancelled
- **Event System**: Subscribe to task lifecycle events
- **Auto-Cleanup**: Old completed tasks automatically removed

## Installation

```bash
cd silas-workstation
npm install
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## MCP Tools

The server exposes the following MCP tools:

### `dispatch_task`

Dispatch a new task to the queue.

**Parameters:**
- `type`: Task type (`code`, `research`, `file`, `general`)
- `description`: What needs to be done
- `priority`: Optional priority (`high`, `normal`, `low`)
- `context`: Optional additional context
- `metadata`: Optional metadata for tracking

**Example:**
```json
{
  "type": "code",
  "description": "Implement push notification feature",
  "priority": "high",
  "context": {
    "repository": "autoxan",
    "files": ["src/notifications.ts"]
  }
}
```

### `task_status`

Get the status and details of a specific task.

**Parameters:**
- `taskId`: UUID of the task

### `list_tasks`

List tasks with optional filtering.

**Parameters:**
- `status`: Filter by status (optional)
- `type`: Filter by type (optional)
- `priority`: Filter by priority (optional)
- `limit`: Max tasks to return (default: 20)
- `offset`: Pagination offset (default: 0)

### `cancel_task`

Cancel a pending task.

**Parameters:**
- `taskId`: UUID of the task to cancel

### `queue_stats`

Get overall queue statistics.

**Returns:**
```json
{
  "stats": {
    "total": 10,
    "pending": 3,
    "running": 1,
    "completed": 5,
    "failed": 1,
    "cancelled": 0
  },
  "config": {
    "maxConcurrent": 1,
    "taskRetentionMs": 3600000,
    "cleanupIntervalMs": 300000
  }
}
```

## Task Lifecycle

```
    ┌──────────┐
    │  Added   │
    └────┬─────┘
         │
         ▼
    ┌──────────┐     ┌───────────┐
    │ Pending  │────▶│ Cancelled │
    └────┬─────┘     └───────────┘
         │
         ▼
    ┌──────────┐
    │ Running  │
    └────┬─────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────────┐  ┌──────────┐
│Completed │  │  Failed  │
└──────────┘  └──────────┘
```

## Events

The task queue emits the following events:

| Event | Description | Payload |
|-------|-------------|---------|
| `task:added` | New task added to queue | `(task: Task)` |
| `task:started` | Task execution started | `(task: Task)` |
| `task:completed` | Task completed successfully | `(task: Task)` |
| `task:failed` | Task failed | `(task: Task, error: Error)` |
| `task:cancelled` | Task cancelled | `(task: Task)` |
| `cleanup:completed` | Old tasks cleaned up | `(removedCount: number)` |

## Configuration

The task queue can be configured with:

```typescript
const queue = new TaskQueue({
  maxConcurrent: 1,          // Max concurrent tasks (default: 1)
  taskRetentionMs: 3600000,  // Keep completed tasks for 1 hour
  cleanupIntervalMs: 300000, // Cleanup every 5 minutes
  autoStart: true,           // Start automatically
});
```

## Project Structure

```
silas-workstation/
├── src/
│   ├── mcp/
│   │   ├── index.ts        # MCP module exports
│   │   └── server.ts       # MCP server implementation
│   ├── services/
│   │   ├── index.ts        # Services module exports
│   │   └── taskQueue.ts    # Task queue service
│   ├── types/
│   │   ├── index.ts        # Types module exports
│   │   └── task.ts         # Task type definitions
│   └── index.ts            # Entry point
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Integration with Xander

Xander dispatches tasks when a conversation crystallizes into work:

```
Xander: "Got it. Stamping to silas-workstation - he'll create
        a detailed implementation plan with tasks."
        [Dispatch to workstation]
```

The dispatch flow:
1. Xander calls `dispatch_task` via MCP
2. silas-workstation queues the task
3. Task executes asynchronously
4. Xander can query `task_status` for updates

## License

MIT
