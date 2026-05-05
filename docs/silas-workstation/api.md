# Silas Workstation API Reference

## Overview

Silas Workstation exposes MCP (Model Context Protocol) tools for task dispatch and monitoring. This document provides complete documentation for all available tools.

## MCP Server Information

| Property | Value |
|----------|-------|
| **Server Name** | silas-workstation |
| **Version** | 1.0.0 |
| **Transport** | stdio (default) |
| **Protocol** | MCP (Model Context Protocol) |

## Tools

### dispatch_task

Dispatch a new task to the task queue for execution.

#### Description

Creates a new task with the specified parameters and adds it to the priority queue. Tasks are executed asynchronously based on priority ordering.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string",
      "enum": ["code", "research", "file", "general"],
      "description": "Type of task to execute"
    },
    "description": {
      "type": "string",
      "description": "Description of what needs to be done"
    },
    "priority": {
      "type": "string",
      "enum": ["high", "normal", "low"],
      "description": "Task priority (default: normal)"
    },
    "context": {
      "type": "object",
      "description": "Additional context for the task"
    },
    "metadata": {
      "type": "object",
      "description": "Optional metadata for tracking"
    }
  },
  "required": ["type", "description"]
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `type` | string | Yes | - | Task type: `code`, `research`, `file`, or `general` |
| `description` | string | Yes | - | Clear description of the task (min 1 character) |
| `priority` | string | No | `normal` | Priority level: `high`, `normal`, or `low` |
| `context` | object | No | - | Additional context data for task execution |
| `metadata` | object | No | - | Metadata for tracking purposes |

#### Response

```json
{
  "success": true,
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Task dispatched successfully with ID: 550e8400-e29b-41d4-a716-446655440000",
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "research",
    "description": "Research best coffee grinders under $200",
    "priority": "normal",
    "status": "pending",
    "createdAt": "2026-05-05T04:00:00.000Z"
  }
}
```

#### Example Usage

```json
{
  "name": "dispatch_task",
  "arguments": {
    "type": "research",
    "description": "Research the best coffee grinders under $200. Compare features, reviews, and value.",
    "priority": "normal",
    "context": {
      "budget": 200,
      "preferredBrands": ["Baratza", "Fellow"]
    },
    "metadata": {
      "source": "xander-conversation",
      "userId": "user-123"
    }
  }
}
```

---

### task_status

Get the status and details of a specific task.

#### Description

Retrieves complete information about a task including its current status, timestamps, and result (if completed).

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "description": "The unique task ID to get status for"
    }
  },
  "required": ["taskId"]
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | UUID of the task to retrieve |

#### Response (Success)

```json
{
  "success": true,
  "task": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "research",
    "description": "Research best coffee grinders under $200",
    "priority": "normal",
    "status": "completed",
    "context": {
      "budget": 200
    },
    "metadata": {
      "source": "xander-conversation"
    },
    "result": {
      "success": true,
      "output": {
        "taskType": "research",
        "processedAt": "2026-05-05T04:01:00.000Z",
        "description": "Research best coffee grinders under $200"
      }
    },
    "createdAt": "2026-05-05T04:00:00.000Z",
    "startedAt": "2026-05-05T04:00:05.000Z",
    "completedAt": "2026-05-05T04:01:00.000Z"
  }
}
```

#### Response (Not Found)

```json
{
  "success": false,
  "error": "Task not found: 550e8400-e29b-41d4-a716-446655440000"
}
```

#### Example Usage

```json
{
  "name": "task_status",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### list_tasks

List tasks in the queue with optional filtering.

#### Description

Returns a list of tasks matching the specified filters. Tasks are sorted by priority (descending) then by creation time (ascending).

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "enum": ["pending", "running", "completed", "failed", "cancelled"],
      "description": "Filter by status"
    },
    "type": {
      "type": "string",
      "enum": ["code", "research", "file", "general"],
      "description": "Filter by task type"
    },
    "priority": {
      "type": "string",
      "enum": ["high", "normal", "low"],
      "description": "Filter by priority"
    },
    "limit": {
      "type": "number",
      "description": "Maximum tasks to return (default: 20, max: 100)"
    },
    "offset": {
      "type": "number",
      "description": "Offset for pagination (default: 0)"
    }
  },
  "required": []
}
```

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by task status |
| `type` | string | No | - | Filter by task type |
| `priority` | string | No | - | Filter by priority level |
| `limit` | number | No | 20 | Maximum results (1-100) |
| `offset` | number | No | 0 | Pagination offset |

#### Response

```json
{
  "success": true,
  "count": 2,
  "stats": {
    "total": 5,
    "pending": 2,
    "running": 1,
    "completed": 2,
    "failed": 0,
    "cancelled": 0
  },
  "tasks": [
    {
      "id": "task-1",
      "type": "code",
      "description": "Create Python script",
      "priority": "high",
      "status": "pending",
      "createdAt": "2026-05-05T04:00:00.000Z"
    },
    {
      "id": "task-2",
      "type": "research",
      "description": "Research coffee grinders",
      "priority": "normal",
      "status": "pending",
      "createdAt": "2026-05-05T04:01:00.000Z"
    }
  ]
}
```

#### Example Usage

```json
{
  "name": "list_tasks",
  "arguments": {
    "status": "pending",
    "limit": 10,
    "offset": 0
  }
}
```

---

### cancel_task

Cancel a pending task.

#### Description

Cancels a task that is still in the `pending` status. Tasks that are already running, completed, or failed cannot be cancelled.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "taskId": {
      "type": "string",
      "description": "The unique task ID to cancel"
    }
  },
  "required": ["taskId"]
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | UUID of the task to cancel |

#### Response (Success)

```json
{
  "success": true,
  "message": "Task 550e8400-e29b-41d4-a716-446655440000 cancelled successfully"
}
```

#### Response (Cannot Cancel)

```json
{
  "success": false,
  "error": "Cannot cancel task: Task is not pending (current status: running)"
}
```

#### Response (Not Found)

```json
{
  "success": false,
  "error": "Cannot cancel task: Task not found"
}
```

#### Example Usage

```json
{
  "name": "cancel_task",
  "arguments": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### queue_stats

Get overall statistics about the task queue.

#### Description

Returns aggregate statistics about the task queue including counts by status and current configuration.

#### Input Schema

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

#### Parameters

None required.

#### Response

```json
{
  "success": true,
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

#### Example Usage

```json
{
  "name": "queue_stats",
  "arguments": {}
}
```

---

## Type Definitions

### TaskType

```typescript
type TaskType = 'code' | 'research' | 'file' | 'general';
```

| Value | Description |
|-------|-------------|
| `code` | Code generation or modification tasks |
| `research` | Research and analysis tasks |
| `file` | File system operations |
| `general` | General purpose tasks |

### TaskPriority

```typescript
type TaskPriority = 'high' | 'normal' | 'low';
```

| Value | Weight | Description |
|-------|--------|-------------|
| `high` | 3 | Processed first |
| `normal` | 2 | Default priority |
| `low` | 1 | Processed last |

### TaskStatus

```typescript
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
```

| Value | Description |
|-------|-------------|
| `pending` | Waiting in queue |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Encountered an error |
| `cancelled` | Cancelled before execution |

### Task

```typescript
interface Task {
  id: string;                    // UUID v4
  type: TaskType;                // Task type
  description: string;           // What needs to be done
  priority: TaskPriority;        // Priority level
  status: TaskStatus;            // Current status
  context?: Record<string, unknown>;    // Execution context
  metadata?: Record<string, unknown>;   // Tracking metadata
  result?: TaskResult;           // Execution result
  createdAt: Date;               // Creation timestamp
  startedAt?: Date;              // Execution start timestamp
  completedAt?: Date;            // Completion timestamp
}
```

### TaskResult

```typescript
interface TaskResult {
  success: boolean;              // Whether task succeeded
  output?: unknown;              // Result data
  error?: string;                // Error message (on failure)
  stack?: string;                // Stack trace (on failure)
}
```

---

## Error Handling

### Validation Errors

Input validation is performed using Zod schemas. Invalid inputs return detailed error messages:

```json
{
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "issues": [
        {
          "path": ["type"],
          "message": "Invalid enum value. Expected 'code' | 'research' | 'file' | 'general'"
        }
      ]
    }
  }
}
```

### Tool Not Found

```json
{
  "error": {
    "code": -32601,
    "message": "Unknown tool: invalid_tool_name"
  }
}
```

---

## Usage Examples

### Complete Task Lifecycle

```bash
# 1. Dispatch a task
{
  "name": "dispatch_task",
  "arguments": {
    "type": "research",
    "description": "Find top 5 productivity apps for developers",
    "priority": "normal"
  }
}
# Returns: { taskId: "abc-123", ... }

# 2. Check task status
{
  "name": "task_status",
  "arguments": {
    "taskId": "abc-123"
  }
}
# Returns: { status: "pending" | "running" | "completed", ... }

# 3. Get queue overview
{
  "name": "queue_stats",
  "arguments": {}
}
# Returns: { stats: { total: 5, pending: 2, ... }, ... }

# 4. List pending tasks
{
  "name": "list_tasks",
  "arguments": {
    "status": "pending"
  }
}
# Returns: { tasks: [...], ... }
```

### Filtering Tasks

```bash
# All high-priority pending tasks
{
  "name": "list_tasks",
  "arguments": {
    "status": "pending",
    "priority": "high"
  }
}

# All completed research tasks
{
  "name": "list_tasks",
  "arguments": {
    "status": "completed",
    "type": "research"
  }
}

# Paginated results
{
  "name": "list_tasks",
  "arguments": {
    "limit": 10,
    "offset": 20
  }
}
```

---

## Related Documentation

- **[README](./README.md)** - Overview and key features
- **[Architecture](./architecture.md)** - Technical architecture
- **[Setup Guide](./setup.md)** - Installation and running

---

*Part of the [Autoxan Documentation](../README.md)*
