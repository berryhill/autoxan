# Silas Workstation Architecture

## Overview

This document details the technical architecture of the Silas Workstation task queue system, including component interactions, data flow, and internal design patterns.

## System Context

Silas Workstation operates as a workstation-based execution engine within the Autoxan ecosystem:

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ANDROID PHONE                              │
│  ┌─────────────────────┐     ┌──────────────────────────────────┐   │
│  │ React Native App    │────▶│ Hermes Agent (Termux)            │   │
│  │ (Voice Interface)   │     │ • Xander AI personality          │   │
│  └─────────────────────┘     │ • Conversation handling          │   │
│                               │ • Task identification            │   │
│                               └────────────────┬─────────────────┘   │
└────────────────────────────────────────────────│─────────────────────┘
                                                 │ MCP Protocol
                                                 │ (stdio/network)
                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        WORKSTATION (silas-workstation)               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                         MCP Server                              │  │
│  │  • @modelcontextprotocol/sdk                                    │  │
│  │  • Tool registration (dispatch_task, task_status, list_tasks)   │  │
│  │  • Request/response handling                                    │  │
│  │  • Zod schema validation                                        │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                        Task Queue                               │  │
│  │  • Priority-based ordering (high > normal > low)                │  │
│  │  • EventEmitter for lifecycle events                            │  │
│  │  • Task storage (Map<string, Task>)                             │  │
│  │  • Concurrent execution control                                 │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                       Task Executor                             │  │
│  │  • Type-specific handlers (code, research, file, general)      │  │
│  │  • Async execution                                              │  │
│  │  • Result capture and storage                                   │  │
│  │  • Error handling and retry logic                               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### MCP Server (`src/mcp/server.ts`)

The MCP Server is the entry point for all external communication:

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Server                            │
│                                                              │
│  ┌────────────────────┐    ┌────────────────────────────┐   │
│  │  Tool Registry     │    │  Request Handler           │   │
│  │  • dispatch_task   │───▶│  • ListToolsRequestSchema  │   │
│  │  • task_status     │    │  • CallToolRequestSchema   │   │
│  │  • list_tasks      │    └────────────┬───────────────┘   │
│  │  • cancel_task     │                 │                   │
│  │  • queue_stats     │                 ▼                   │
│  └────────────────────┘    ┌────────────────────────────┐   │
│                            │  Zod Schema Validation     │   │
│  ┌────────────────────┐    │  • DispatchTaskSchema      │   │
│  │  Server Info       │    │  • TaskStatusSchema        │   │
│  │  name: silas-      │    │  • ListTasksSchema         │   │
│  │    workstation     │    │  • CancelTaskSchema        │   │
│  │  version: 1.0.0    │    └────────────────────────────┘   │
│  └────────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Key Responsibilities

1. **Tool Registration**: Exposes MCP tools for task dispatch and monitoring
2. **Schema Validation**: Uses Zod schemas for input validation
3. **Request Routing**: Routes tool calls to the appropriate handler
4. **Response Formatting**: Returns JSON-formatted results

### Task Queue (`src/services/taskQueue.ts`)

The Task Queue manages the complete task lifecycle:

```
┌───────────────────────────────────────────────────────────────────────┐
│                            Task Queue                                  │
│                                                                        │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────┐  │
│  │   Task Storage  │   │  Pending Queue  │   │   Running Tasks     │  │
│  │  Map<id, Task>  │   │  string[] (IDs) │   │   Set<string>       │  │
│  │                 │   │  sorted by      │   │   (concurrent       │  │
│  │  All tasks by   │   │  priority       │   │    tracking)        │  │
│  │  ID for lookup  │   │                 │   │                     │  │
│  └─────────────────┘   └─────────────────┘   └─────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Event Emitter                               │  │
│  │  Events:                                                         │  │
│  │  • task:added      - New task in queue                          │  │
│  │  • task:started    - Task execution began                       │  │
│  │  • task:completed  - Task finished successfully                 │  │
│  │  • task:failed     - Task encountered error                     │  │
│  │  • task:cancelled  - Task was cancelled                         │  │
│  │  • cleanup:completed - Old tasks removed                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                      Configuration                               │  │
│  │  • maxConcurrent: 1          (parallel task limit)              │  │
│  │  • taskRetentionMs: 3600000  (1 hour retention)                 │  │
│  │  • cleanupIntervalMs: 300000 (5 minute cleanup)                 │  │
│  │  • autoStart: true           (auto-start executor)              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

#### Priority Queue Algorithm

Tasks are inserted in priority order:

```typescript
// Priority weights
const PRIORITY_WEIGHTS = {
  high: 3,    // Processed first
  normal: 2,  // Standard priority
  low: 1,     // Processed last
};

// Insertion: Find position where new task's weight > existing task's weight
// Result: Queue is always sorted [high, high, normal, normal, low]
```

### Type System (`src/types/task.ts`)

The type system provides strong typing for all task operations:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Type Definitions                             │
│                                                                      │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐    │
│  │  TaskPriority   │   │   TaskType      │   │   TaskStatus    │    │
│  │  • high         │   │  • code         │   │  • pending      │    │
│  │  • normal       │   │  • research     │   │  • running      │    │
│  │  • low          │   │  • file         │   │  • completed    │    │
│  └─────────────────┘   │  • general      │   │  • failed       │    │
│                        └─────────────────┘   │  • cancelled    │    │
│                                              └─────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                        Task Interface                        │    │
│  │  id: string             - UUID v4                           │    │
│  │  type: TaskType         - code | research | file | general  │    │
│  │  description: string    - What needs to be done             │    │
│  │  priority: TaskPriority - high | normal | low               │    │
│  │  status: TaskStatus     - Current lifecycle state           │    │
│  │  context?: Record       - Additional execution context      │    │
│  │  metadata?: Record      - Tracking information              │    │
│  │  result?: TaskResult    - Execution result                  │    │
│  │  createdAt: Date        - When task was created             │    │
│  │  startedAt?: Date       - When execution started            │    │
│  │  completedAt?: Date     - When task finished                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      TaskResult Interface                    │    │
│  │  success: boolean      - True if task succeeded             │    │
│  │  output?: unknown      - Result data                        │    │
│  │  error?: string        - Error message on failure           │    │
│  │  stack?: string        - Stack trace on failure             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Task Dispatch Flow

```
 Xander (Hermes)                    Silas Workstation
      │                                    │
      │  MCP: dispatch_task                │
      │  {type, description, priority}     │
      │ ──────────────────────────────────▶│
      │                                    │
      │                         ┌──────────┴──────────┐
      │                         │ 1. Validate input   │
      │                         │    (Zod schema)     │
      │                         └──────────┬──────────┘
      │                                    │
      │                         ┌──────────┴──────────┐
      │                         │ 2. Create Task      │
      │                         │    • Generate UUID  │
      │                         │    • Set pending    │
      │                         │    • Set createdAt  │
      │                         └──────────┬──────────┘
      │                                    │
      │                         ┌──────────┴──────────┐
      │                         │ 3. Insert in queue  │
      │                         │    by priority      │
      │                         └──────────┬──────────┘
      │                                    │
      │                         ┌──────────┴──────────┐
      │                         │ 4. Emit task:added  │
      │                         └──────────┬──────────┘
      │                                    │
      │                         ┌──────────┴──────────┐
      │                         │ 5. Trigger executor │
      │                         │    (if capacity)    │
      │                         └──────────┬──────────┘
      │                                    │
      │  Response: {success, taskId, task} │
      │ ◀──────────────────────────────────│
      │                                    │
```

### Task Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Execution Lifecycle                            │
│                                                                      │
│   PENDING              RUNNING              COMPLETED/FAILED         │
│  ┌────────┐          ┌────────┐            ┌────────┐               │
│  │ Task   │──────────▶│ Task   │───────────▶│ Task   │               │
│  │ added  │  dequeue  │ exec   │  success   │ result │               │
│  │        │           │        │            │ stored │               │
│  └────────┘           └────────┘            └────────┘               │
│      │                    │                     │                    │
│      │                    │                     │                    │
│      ▼                    ▼                     ▼                    │
│  task:added          task:started          task:completed            │
│  event               event                 event (or task:failed)    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Status Query Flow

```
 Xander                                Silas
   │                                     │
   │  MCP: task_status {taskId}          │
   │ ───────────────────────────────────▶│
   │                                     │
   │                          ┌──────────┴──────────┐
   │                          │ Lookup task by ID   │
   │                          │ from tasks Map      │
   │                          └──────────┬──────────┘
   │                                     │
   │  Response: {task details}           │
   │ ◀───────────────────────────────────│
   │                                     │
```

## Event-Driven Architecture

The Task Queue uses Node.js EventEmitter for loose coupling and extensibility:

```typescript
// Event definitions
interface TaskQueueEvents {
  'task:added': [task: Task];
  'task:started': [task: Task];
  'task:completed': [task: Task];
  'task:failed': [task: Task, error: Error];
  'task:cancelled': [task: Task];
  'cleanup:completed': [removedCount: number];
}

// Usage example - monitoring
queue.on('task:completed', (task) => {
  logger.info(`Task ${task.id} completed`, { result: task.result });
});

queue.on('task:failed', (task, error) => {
  logger.error(`Task ${task.id} failed`, { error: error.message });
  // Could trigger retry logic, notifications, etc.
});
```

## Concurrency Model

The Task Queue supports configurable concurrency:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Concurrent Execution                         │
│                                                                  │
│  maxConcurrent = 1 (default)           maxConcurrent = 3         │
│  ┌────────────────────────┐           ┌────────────────────────┐ │
│  │ Sequential execution   │           │ Parallel execution     │ │
│  │                        │           │                        │ │
│  │ Task A ────────────▶   │           │ Task A ────────────▶   │ │
│  │         Task B ─────▶  │           │ Task B ────────────▶   │ │
│  │                Task C▶ │           │ Task C ────────────▶   │ │
│  │                        │           │                        │ │
│  │ Total time: A + B + C  │           │ Total time: max(A,B,C) │ │
│  └────────────────────────┘           └────────────────────────┘ │
│                                                                  │
│  Trade-offs:                                                     │
│  • Sequential: Simpler, predictable resource usage               │
│  • Parallel: Faster throughput, higher resource usage            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Cleanup Mechanism

Automatic cleanup prevents memory leaks:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cleanup Process                             │
│                                                                  │
│  Every cleanupIntervalMs (default: 5 minutes):                  │
│                                                                  │
│  1. Iterate all tasks                                           │
│  2. Find tasks with terminal status (completed/failed/cancelled)│
│  3. Check if completedAt + taskRetentionMs < now                │
│  4. Delete old tasks                                            │
│  5. Emit cleanup:completed event                                │
│                                                                  │
│  Timeline Example (taskRetentionMs = 1 hour):                   │
│                                                                  │
│  ─────┬─────────────────────┬─────────────────────┬─────────    │
│       │                     │                     │              │
│    Task                  1 hour               Task              │
│  completed               later               deleted            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
silas-workstation/
├── src/
│   ├── index.ts              # Entry point, starts MCP server
│   ├── mcp/
│   │   ├── index.ts          # MCP module exports
│   │   ├── server.ts         # MCP server implementation
│   │   └── server.test.ts    # Server tests (36 tests)
│   ├── services/
│   │   ├── index.ts          # Services module exports
│   │   ├── taskQueue.ts      # Task queue implementation
│   │   └── taskQueue.test.ts # Queue tests (60 tests)
│   └── types/
│       ├── index.ts          # Types module exports
│       ├── task.ts           # Type definitions
│       └── task.test.ts      # Type tests (18 tests)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Vitest test configuration
└── README.md                 # Project README
```

## Related Documentation

- **[README](./README.md)** - Overview and key features
- **[Setup Guide](./setup.md)** - Installation and running
- **[API Reference](./api.md)** - MCP tool documentation

---

*Part of the [Autoxan Documentation](../README.md)*
