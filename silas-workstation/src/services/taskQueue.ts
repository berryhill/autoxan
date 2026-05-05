/**
 * Task Queue Service for silas-workstation
 * 
 * Manages task queuing, execution, and status tracking.
 * Tasks are ordered by priority and executed sequentially or concurrently
 * based on configuration.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  Task,
  TaskInput,
  TaskResult,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskSummary,
  TaskFilterOptions,
  TaskQueueConfig,
  TaskQueueEvents,
} from '../types/task.js';
import { PRIORITY_WEIGHTS } from '../types/task.js';

/**
 * Type-safe event emitter interface for TaskQueue events.
 */
interface TypedEventEmitter {
  on<K extends keyof TaskQueueEvents>(
    event: K,
    listener: (...args: TaskQueueEvents[K]) => void
  ): this;
  off<K extends keyof TaskQueueEvents>(
    event: K,
    listener: (...args: TaskQueueEvents[K]) => void
  ): this;
  emit<K extends keyof TaskQueueEvents>(event: K, ...args: TaskQueueEvents[K]): boolean;
}

/**
 * Default configuration values for the task queue.
 */
const DEFAULT_CONFIG: Required<TaskQueueConfig> = {
  maxConcurrent: 1,
  taskRetentionMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  autoStart: true,
};

/**
 * TaskQueue manages the lifecycle of tasks from creation to completion.
 * 
 * Features:
 * - Priority-based task ordering (high > normal > low)
 * - Status tracking (pending, running, completed, failed, cancelled)
 * - Event emission for task lifecycle events
 * - Automatic cleanup of old completed tasks
 * - Concurrent task execution support
 * 
 * @example
 * ```typescript
 * const queue = new TaskQueue();
 * 
 * queue.on('task:completed', (task) => {
 *   console.log(`Task ${task.id} completed`);
 * });
 * 
 * const taskId = await queue.addTask({
 *   type: 'code',
 *   description: 'Implement feature X',
 *   priority: 'high',
 * });
 * ```
 */
export class TaskQueue implements TypedEventEmitter {
  /** Internal event emitter for type-safe events */
  private emitter = new EventEmitter();
  
  /** Map of all tasks by ID */
  private tasks = new Map<string, Task>();
  
  /** Queue of pending task IDs ordered by priority */
  private pendingQueue: string[] = [];
  
  /** Set of currently running task IDs */
  private runningTasks = new Set<string>();
  
  /** Configuration for the queue */
  private config: Required<TaskQueueConfig>;
  
  /** Cleanup interval timer */
  private cleanupTimer?: ReturnType<typeof setInterval>;
  
  /** Whether the executor is running */
  private isExecutorRunning = false;

  /**
   * Creates a new TaskQueue instance.
   * 
   * @param config - Configuration options for the queue
   */
  constructor(config: TaskQueueConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Starts the task queue executor and cleanup timer.
   * Called automatically if autoStart is true (default).
   */
  start(): void {
    if (this.isExecutorRunning) {
      return;
    }
    
    this.isExecutorRunning = true;
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldTasks();
    }, this.config.cleanupIntervalMs);
    
    // Process any pending tasks
    this.processNextTask();
  }

  /**
   * Stops the task queue executor and cleanup timer.
   * Running tasks will complete, but no new tasks will be started.
   */
  stop(): void {
    this.isExecutorRunning = false;
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Registers an event listener for task queue events.
   * 
   * @param event - The event name to listen for
   * @param listener - The callback function to invoke
   * @returns This instance for chaining
   */
  on<K extends keyof TaskQueueEvents>(
    event: K,
    listener: (...args: TaskQueueEvents[K]) => void
  ): this {
    this.emitter.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Removes an event listener for task queue events.
   * 
   * @param event - The event name to stop listening for
   * @param listener - The callback function to remove
   * @returns This instance for chaining
   */
  off<K extends keyof TaskQueueEvents>(
    event: K,
    listener: (...args: TaskQueueEvents[K]) => void
  ): this {
    this.emitter.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  /**
   * Emits a task queue event.
   * 
   * @param event - The event name to emit
   * @param args - Arguments to pass to listeners
   * @returns True if there were listeners, false otherwise
   */
  emit<K extends keyof TaskQueueEvents>(event: K, ...args: TaskQueueEvents[K]): boolean {
    return this.emitter.emit(event, ...args);
  }

  /**
   * Adds a new task to the queue.
   * 
   * @param input - Task input parameters
   * @returns The ID of the created task
   */
  addTask(input: TaskInput): string {
    const task: Task = {
      id: uuidv4(),
      type: input.type,
      description: input.description,
      priority: input.priority ?? 'normal',
      status: 'pending',
      context: input.context,
      metadata: input.metadata,
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.insertIntoQueue(task);
    
    this.emit('task:added', task);
    
    // Start processing if executor is running
    if (this.isExecutorRunning) {
      this.processNextTask();
    }
    
    return task.id;
  }

  /**
   * Gets a task by ID.
   * 
   * @param id - The task ID
   * @returns The task if found, undefined otherwise
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Gets the status of a task.
   * 
   * @param id - The task ID
   * @returns The task status if found, undefined otherwise
   */
  getTaskStatus(id: string): TaskStatus | undefined {
    const task = this.tasks.get(id);
    return task?.status;
  }

  /**
   * Lists tasks matching the given filter options.
   * 
   * @param options - Filter options for the query
   * @returns Array of task summaries matching the filter
   */
  listTasks(options: TaskFilterOptions = {}): TaskSummary[] {
    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (options.status) {
      tasks = tasks.filter((t) => t.status === options.status);
    }
    if (options.type) {
      tasks = tasks.filter((t) => t.type === options.type);
    }
    if (options.priority) {
      tasks = tasks.filter((t) => t.priority === options.priority);
    }

    // Sort by priority (descending) then by creation time (ascending)
    tasks.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Apply pagination
    const offset = options.offset ?? 0;
    const limit = options.limit ?? tasks.length;
    tasks = tasks.slice(offset, offset + limit);

    // Map to summaries
    return tasks.map((t) => ({
      id: t.id,
      type: t.type,
      description: t.description,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    }));
  }

  /**
   * Cancels a pending task.
   * 
   * @param id - The task ID to cancel
   * @returns True if cancelled, false if not found or not pending
   */
  cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    
    if (!task || task.status !== 'pending') {
      return false;
    }

    // Remove from pending queue
    const queueIndex = this.pendingQueue.indexOf(id);
    if (queueIndex !== -1) {
      this.pendingQueue.splice(queueIndex, 1);
    }

    // Update status
    task.status = 'cancelled';
    task.completedAt = new Date();
    
    this.emit('task:cancelled', task);
    
    return true;
  }

  /**
   * Gets queue statistics.
   * 
   * @returns Object with queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const stats = {
      total: this.tasks.size,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'running':
          stats.running++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
      }
    }

    return stats;
  }

  /**
   * Inserts a task into the pending queue in priority order.
   * 
   * @param task - The task to insert
   */
  private insertIntoQueue(task: Task): void {
    const weight = PRIORITY_WEIGHTS[task.priority];
    
    // Find the insertion point
    let insertIndex = this.pendingQueue.length;
    for (let i = 0; i < this.pendingQueue.length; i++) {
      const existingTask = this.tasks.get(this.pendingQueue[i]);
      if (existingTask && PRIORITY_WEIGHTS[existingTask.priority] < weight) {
        insertIndex = i;
        break;
      }
    }
    
    this.pendingQueue.splice(insertIndex, 0, task.id);
  }

  /**
   * Processes the next task in the queue if capacity allows.
   */
  private processNextTask(): void {
    if (!this.isExecutorRunning) {
      return;
    }
    
    if (this.runningTasks.size >= this.config.maxConcurrent) {
      return;
    }
    
    const nextTaskId = this.pendingQueue.shift();
    if (!nextTaskId) {
      return;
    }
    
    const task = this.tasks.get(nextTaskId);
    if (!task) {
      // Task was deleted, try next
      this.processNextTask();
      return;
    }
    
    // Start execution
    this.executeTask(task);
  }

  /**
   * Executes a task.
   * 
   * @param task - The task to execute
   */
  private async executeTask(task: Task): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date();
    this.runningTasks.add(task.id);
    
    this.emit('task:started', task);
    
    try {
      const result = await this.runTaskExecutor(task);
      this.completeTask(task, result);
    } catch (error) {
      this.failTask(task, error as Error);
    }
  }

  /**
   * Runs the actual task execution logic based on task type.
   * This is a placeholder that can be extended with real execution logic.
   * 
   * @param task - The task to run
   * @returns The task result
   */
  private async runTaskExecutor(task: Task): Promise<TaskResult> {
    // Simulate different execution times based on task type
    const executionTimes: Record<TaskType, number> = {
      code: 1000,
      research: 2000,
      file: 500,
      general: 750,
    };
    
    const delay = executionTimes[task.type] ?? 500;
    
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    // For now, return a success result with type-specific output
    return {
      success: true,
      output: {
        taskType: task.type,
        processedAt: new Date().toISOString(),
        description: task.description,
        context: task.context,
      },
    };
  }

  /**
   * Marks a task as completed with the given result.
   * 
   * @param task - The task to complete
   * @param result - The task result
   */
  private completeTask(task: Task, result: TaskResult): void {
    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;
    this.runningTasks.delete(task.id);
    
    this.emit('task:completed', task);
    
    // Process next task
    this.processNextTask();
  }

  /**
   * Marks a task as failed with the given error.
   * 
   * @param task - The task that failed
   * @param error - The error that occurred
   */
  private failTask(task: Task, error: Error): void {
    task.status = 'failed';
    task.completedAt = new Date();
    task.result = {
      success: false,
      error: error.message,
      stack: error.stack,
    };
    this.runningTasks.delete(task.id);
    
    this.emit('task:failed', task, error);
    
    // Process next task
    this.processNextTask();
  }

  /**
   * Cleans up old completed/failed/cancelled tasks based on retention config.
   */
  cleanupOldTasks(): number {
    const now = Date.now();
    const tasksToRemove: string[] = [];
    
    for (const [id, task] of this.tasks) {
      // Only clean up terminal states
      if (!['completed', 'failed', 'cancelled'].includes(task.status)) {
        continue;
      }
      
      // Check if task is old enough to remove
      const completedTime = task.completedAt?.getTime() ?? 0;
      if (now - completedTime > this.config.taskRetentionMs) {
        tasksToRemove.push(id);
      }
    }
    
    // Remove old tasks
    for (const id of tasksToRemove) {
      this.tasks.delete(id);
    }
    
    if (tasksToRemove.length > 0) {
      this.emit('cleanup:completed', tasksToRemove.length);
    }
    
    return tasksToRemove.length;
  }

  /**
   * Gets the current configuration.
   * 
   * @returns The queue configuration
   */
  getConfig(): Required<TaskQueueConfig> {
    return { ...this.config };
  }

  /**
   * Updates the queue configuration.
   * Note: Changes to maxConcurrent take effect immediately.
   * Changes to cleanupIntervalMs require a restart to take effect.
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<TaskQueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clears all tasks and resets the queue state.
   * Useful for testing or reinitializing.
   */
  clear(): void {
    this.stop();
    this.tasks.clear();
    this.pendingQueue = [];
    this.runningTasks.clear();
  }
}

// Export a singleton instance for convenience
export const taskQueue = new TaskQueue();
