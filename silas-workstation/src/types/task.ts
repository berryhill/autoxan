/**
 * Task Types for silas-workstation Task Queue
 * 
 * These types define the structure of tasks that can be dispatched
 * from Xander to Silas for execution.
 */

/**
 * Priority levels for task execution ordering.
 * Higher priority tasks are executed before lower priority ones.
 */
export type TaskPriority = 'high' | 'normal' | 'low';

/**
 * Types of tasks that can be executed.
 * - code: Code generation or modification tasks
 * - research: Research and analysis tasks
 * - file: File system operations
 * - general: General purpose tasks
 */
export type TaskType = 'code' | 'research' | 'file' | 'general';

/**
 * Status of a task in the queue.
 * - pending: Task is waiting to be executed
 * - running: Task is currently being executed
 * - completed: Task finished successfully
 * - failed: Task failed during execution
 * - cancelled: Task was cancelled before completion
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Input for creating a new task.
 */
export interface TaskInput {
  /** Type of task to execute */
  type: TaskType;
  /** Description of what needs to be done */
  description: string;
  /** Priority level for execution ordering */
  priority?: TaskPriority;
  /** Additional context or parameters for the task */
  context?: Record<string, unknown>;
  /** Optional metadata for tracking */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a completed task.
 */
export interface TaskResult {
  /** Whether the task completed successfully */
  success: boolean;
  /** Output data from the task */
  output?: unknown;
  /** Error message if the task failed */
  error?: string;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Full task object with all properties.
 */
export interface Task {
  /** Unique identifier for the task */
  id: string;
  /** Type of task */
  type: TaskType;
  /** Description of what needs to be done */
  description: string;
  /** Priority level */
  priority: TaskPriority;
  /** Current status */
  status: TaskStatus;
  /** Additional context for execution */
  context?: Record<string, unknown>;
  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
  /** Result after completion or failure */
  result?: TaskResult;
  /** Timestamp when the task was created */
  createdAt: Date;
  /** Timestamp when the task started execution */
  startedAt?: Date;
  /** Timestamp when the task completed */
  completedAt?: Date;
}

/**
 * Summary of task for listing purposes.
 */
export interface TaskSummary {
  id: string;
  type: TaskType;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Options for filtering tasks in queries.
 */
export interface TaskFilterOptions {
  /** Filter by status */
  status?: TaskStatus;
  /** Filter by type */
  type?: TaskType;
  /** Filter by priority */
  priority?: TaskPriority;
  /** Maximum number of tasks to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Event types emitted by the task queue.
 */
export interface TaskQueueEvents {
  /** Emitted when a new task is added */
  'task:added': [task: Task];
  /** Emitted when a task starts execution */
  'task:started': [task: Task];
  /** Emitted when a task completes successfully */
  'task:completed': [task: Task];
  /** Emitted when a task fails */
  'task:failed': [task: Task, error: Error];
  /** Emitted when a task is cancelled */
  'task:cancelled': [task: Task];
  /** Emitted when old tasks are cleaned up */
  'cleanup:completed': [removedCount: number];
}

/**
 * Configuration options for the task queue.
 */
export interface TaskQueueConfig {
  /** Maximum concurrent tasks (default: 1) */
  maxConcurrent?: number;
  /** Time in milliseconds to keep completed tasks (default: 1 hour) */
  taskRetentionMs?: number;
  /** Interval in milliseconds for cleanup (default: 5 minutes) */
  cleanupIntervalMs?: number;
  /** Whether to auto-start the executor (default: true) */
  autoStart?: boolean;
}

/**
 * Priority weights for sorting tasks.
 */
export const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};
