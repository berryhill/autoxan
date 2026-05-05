/**
 * silas-workstation Entry Point
 * 
 * Main entry point for the silas-workstation task queue and execution engine.
 * Receives dispatched tasks from Xander via MCP protocol, queues them for
 * execution, and provides status updates.
 * 
 * @module silas-workstation
 */

import { taskQueue, TaskQueue } from './services/taskQueue.js';
import { startMcpServer } from './mcp/server.js';
import type { Task } from './types/task.js';

/**
 * Configuration for the silas-workstation application.
 */
interface AppConfig {
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** Custom task queue instance (uses singleton if not provided) */
  taskQueue?: TaskQueue;
}

/**
 * Sets up event logging for the task queue.
 * 
 * @param queue - The task queue to log events from
 * @param verbose - Whether to enable verbose logging
 */
function setupEventLogging(queue: TaskQueue, verbose: boolean): void {
  queue.on('task:added', (task: Task) => {
    console.log(`[silas] Task added: ${task.id} (${task.type}) - ${task.description.slice(0, 50)}...`);
    if (verbose) {
      console.log(`[silas]   Priority: ${task.priority}`);
      console.log(`[silas]   Context: ${JSON.stringify(task.context)}`);
    }
  });

  queue.on('task:started', (task: Task) => {
    console.log(`[silas] Task started: ${task.id}`);
  });

  queue.on('task:completed', (task: Task) => {
    const duration = task.completedAt && task.startedAt
      ? (task.completedAt.getTime() - task.startedAt.getTime()) / 1000
      : 0;
    console.log(`[silas] Task completed: ${task.id} (${duration.toFixed(2)}s)`);
    if (verbose && task.result) {
      console.log(`[silas]   Output: ${JSON.stringify(task.result.output)}`);
    }
  });

  queue.on('task:failed', (task: Task, error: Error) => {
    console.error(`[silas] Task failed: ${task.id} - ${error.message}`);
    if (verbose && error.stack) {
      console.error(`[silas]   Stack: ${error.stack}`);
    }
  });

  queue.on('task:cancelled', (task: Task) => {
    console.log(`[silas] Task cancelled: ${task.id}`);
  });

  queue.on('cleanup:completed', (count: number) => {
    if (verbose && count > 0) {
      console.log(`[silas] Cleanup: Removed ${count} old tasks`);
    }
  });
}

/**
 * Graceful shutdown handler.
 * 
 * @param queue - The task queue to shut down
 */
function setupShutdownHandler(queue: TaskQueue): void {
  const shutdown = (): void => {
    console.log('\n[silas] Shutting down...');
    
    queue.stop();
    
    const stats = queue.getStats();
    console.log(`[silas] Final stats: ${stats.completed} completed, ${stats.failed} failed, ${stats.pending} pending`);
    
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Main application entry point.
 * 
 * @param config - Application configuration
 */
async function main(config: AppConfig = {}): Promise<void> {
  const verbose = config.verbose ?? process.env.VERBOSE === 'true';
  const queue = config.taskQueue ?? taskQueue;
  
  console.log('[silas] silas-workstation v1.0.0');
  console.log('[silas] Task queue and execution engine for Xander dispatched work');
  console.log('');
  
  // Set up event logging
  setupEventLogging(queue, verbose);
  
  // Set up shutdown handler
  setupShutdownHandler(queue);
  
  // Start the task queue
  queue.start();
  console.log('[silas] Task queue started');
  
  // Start the MCP server
  try {
    await startMcpServer(queue);
  } catch (error) {
    console.error('[silas] Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error('[silas] Fatal error:', error);
  process.exit(1);
});

// Export for programmatic use
export { main, taskQueue, TaskQueue };
export * from './types/index.js';
export * from './mcp/index.js';
