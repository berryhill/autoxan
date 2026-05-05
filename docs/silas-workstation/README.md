# Silas Workstation in Autoxan

## Purpose

Silas Workstation serves as the task execution engine in the Autoxan project. It receives dispatched work from Xander (the mobile voice assistant) via the Model Context Protocol (MCP) and executes tasks asynchronously based on priority.

Silas is designed to handle the "heavy lifting" that Xander identifies during conversations - research tasks, code generation, file operations, and general work that benefits from dedicated execution time on a workstation.

## Design

The architecture positions Silas as the workstation-based execution engine that processes tasks dispatched from Xander:

```
┌─────────────────────────────────────┐
│     Xander (Phone via Hermes)       │
│  ┌───────────────────────────────┐  │
│  │ Conversational AI             │  │
│  │ Task identification           │  │
│  │ MCP dispatch when ready       │  │
│  └───────────────────────────────┘  │
└──────────────────┬──────────────────┘
                   │ MCP Protocol
                   ▼
┌─────────────────────────────────────┐
│     Silas Workstation               │
│  ┌───────────────────────────────┐  │
│  │ MCP Server (receives tasks)   │  │
│  │ Task Queue (priority-based)   │  │
│  │ Task Executor (by type)       │  │
│  │ Status tracking & results     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **MCP Protocol Integration**: Uses `@modelcontextprotocol/sdk` for standardized communication with Xander, enabling seamless task dispatch.

2. **Priority-Based Queue**: Tasks are ordered by priority (high > normal > low) ensuring important work is processed first.

3. **Event-Driven Architecture**: Uses Node.js EventEmitter for task lifecycle events, allowing for monitoring and integration.

4. **Type-Specific Execution**: Different task types (code, research, file, general) can have specialized execution logic.

5. **Automatic Cleanup**: Completed tasks are automatically cleaned up after a configurable retention period to prevent memory bloat.

## Task Types

| Type | Description | Use Case |
|------|-------------|----------|
| `code` | Code generation or modification | "Create a Python script to...", "Refactor this function..." |
| `research` | Research and analysis | "Find the best coffee grinders under $200" |
| `file` | File system operations | "Organize my downloads folder" |
| `general` | General purpose tasks | Any task that doesn't fit the above categories |

## Task Priority

| Priority | Weight | Description |
|----------|--------|-------------|
| `high` | 3 | Urgent tasks, processed first |
| `normal` | 2 | Standard priority (default) |
| `low` | 1 | Background tasks, processed last |

## Task Status Lifecycle

```
pending → running → completed
                  ↘ failed
         ↘ cancelled
```

| Status | Description |
|--------|-------------|
| `pending` | Task is waiting in the queue |
| `running` | Task is currently being executed |
| `completed` | Task finished successfully |
| `failed` | Task encountered an error |
| `cancelled` | Task was cancelled before execution |

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **@modelcontextprotocol/sdk** | ^1.29.0 | MCP server and protocol handling |
| **uuid** | ^11.1.0 | Unique task ID generation |
| **zod** | ^3.25.67 | Input validation for MCP tools |

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxConcurrent` | 1 | Maximum concurrent tasks |
| `taskRetentionMs` | 3600000 (1 hour) | How long to keep completed tasks |
| `cleanupIntervalMs` | 300000 (5 minutes) | Cleanup check interval |
| `autoStart` | true | Auto-start the executor |

## Key Features

### 1. MCP Server

The MCP server exposes tools for Xander to dispatch and monitor tasks:
- `dispatch_task` - Send a new task to the queue
- `task_status` - Check status of a specific task
- `list_tasks` - List tasks with filtering options
- `cancel_task` - Cancel a pending task
- `queue_stats` - Get queue statistics

### 2. Priority Queue

Tasks are automatically sorted by priority and processed in order. High priority tasks jump ahead of normal and low priority tasks.

### 3. Event System

Subscribe to task lifecycle events for monitoring and integration:

```typescript
queue.on('task:added', (task) => { /* new task */ });
queue.on('task:started', (task) => { /* execution started */ });
queue.on('task:completed', (task) => { /* success */ });
queue.on('task:failed', (task, error) => { /* error occurred */ });
queue.on('task:cancelled', (task) => { /* task cancelled */ });
queue.on('cleanup:completed', (count) => { /* old tasks removed */ });
```

### 4. Result Storage

Task results are stored with the task and include:
- Success/failure status
- Output data (type-specific)
- Error messages and stack traces (on failure)

## Usage Example

### Dispatching a Task from Xander

When Xander identifies work during conversation:

```
User: "Can you research the best coffee grinders under $200?"

Xander: "That sounds like a good research task for Silas - he can dig deep 
into reviews and comparisons. I'll dispatch it now."

[Task dispatched to Silas via MCP]
```

### Task Flow

1. **Xander dispatches** via `dispatch_task` MCP tool
2. **Silas adds to queue** with generated UUID
3. **Queue processes** based on priority
4. **Executor runs** the appropriate handler
5. **Result stored** with task
6. **Xander can query** status via `task_status`

## Testing

The implementation includes comprehensive tests:

| Test Suite | Tests | Description |
|------------|-------|-------------|
| `task.test.ts` | 18 | Type validation and guards |
| `taskQueue.test.ts` | 60 | Queue operations and execution |
| `server.test.ts` | 36 | MCP server and tools |

Run tests:
```bash
cd silas-workstation
npm test
```

## Related Documentation

- **[Architecture](./architecture.md)** - Technical architecture and data flow diagrams
- **[Setup Guide](./setup.md)** - Installation and running instructions
- **[API Reference](./api.md)** - Complete MCP API documentation
- **[Hermes/Xander](../hermes/README.md)** - The dispatcher (Xander via Hermes)

## Quick Links

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - MCP SDK

---

*Part of the [Autoxan Documentation](../README.md)*
