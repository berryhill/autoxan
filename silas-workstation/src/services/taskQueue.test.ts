/**
 * Unit Tests for TaskQueue Service
 * 
 * Tests cover:
 * - Task addition and priority ordering
 * - Status transitions
 * - Concurrent task handling
 * - Error scenarios
 * - Cleanup functionality
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskQueue } from './taskQueue.js';
import type { Task, TaskInput, TaskPriority, TaskType } from '../types/task.js';

describe('TaskQueue', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    // Create a fresh queue for each test with autoStart disabled
    queue = new TaskQueue({ autoStart: false });
  });

  afterEach(() => {
    // Clean up the queue
    queue.clear();
    vi.restoreAllMocks();
  });

  describe('Task Addition', () => {
    it('should add a task and return a valid UUID', () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'Test task',
      });

      expect(taskId).toBeDefined();
      expect(taskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should create a task with default priority of "normal"', () => {
      const taskId = queue.addTask({
        type: 'research',
        description: 'Research task',
      });

      const task = queue.getTask(taskId);
      expect(task?.priority).toBe('normal');
    });

    it('should create a task with specified priority', () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'High priority task',
        priority: 'high',
      });

      const task = queue.getTask(taskId);
      expect(task?.priority).toBe('high');
    });

    it('should set initial status to "pending"', () => {
      const taskId = queue.addTask({
        type: 'general',
        description: 'General task',
      });

      const task = queue.getTask(taskId);
      expect(task?.status).toBe('pending');
    });

    it('should preserve context and metadata', () => {
      const context = { repository: 'autoxan', branch: 'main' };
      const metadata = { source: 'xander', sessionId: '123' };

      const taskId = queue.addTask({
        type: 'file',
        description: 'File task',
        context,
        metadata,
      });

      const task = queue.getTask(taskId);
      expect(task?.context).toEqual(context);
      expect(task?.metadata).toEqual(metadata);
    });

    it('should set createdAt timestamp', () => {
      const before = new Date();
      const taskId = queue.addTask({
        type: 'code',
        description: 'Test task',
      });
      const after = new Date();

      const task = queue.getTask(taskId);
      expect(task?.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(task?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should emit "task:added" event', () => {
      const handler = vi.fn();
      queue.on('task:added', handler);

      const taskId = queue.addTask({
        type: 'code',
        description: 'Test task',
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: taskId }));
    });
  });

  describe('Priority Ordering', () => {
    it('should order tasks by priority (high > normal > low)', () => {
      // Add tasks in reverse priority order
      const lowId = queue.addTask({ type: 'general', description: 'Low priority', priority: 'low' });
      const normalId = queue.addTask({ type: 'general', description: 'Normal priority', priority: 'normal' });
      const highId = queue.addTask({ type: 'general', description: 'High priority', priority: 'high' });

      const tasks = queue.listTasks({ status: 'pending' });

      // Should be sorted high, normal, low
      expect(tasks[0].id).toBe(highId);
      expect(tasks[1].id).toBe(normalId);
      expect(tasks[2].id).toBe(lowId);
    });

    it('should maintain FIFO order within same priority', () => {
      const first = queue.addTask({ type: 'code', description: 'First', priority: 'normal' });
      const second = queue.addTask({ type: 'code', description: 'Second', priority: 'normal' });
      const third = queue.addTask({ type: 'code', description: 'Third', priority: 'normal' });

      const tasks = queue.listTasks({ status: 'pending' });

      expect(tasks[0].id).toBe(first);
      expect(tasks[1].id).toBe(second);
      expect(tasks[2].id).toBe(third);
    });

    it('should insert high priority task before existing normal tasks', () => {
      const normal1 = queue.addTask({ type: 'code', description: 'Normal 1', priority: 'normal' });
      const normal2 = queue.addTask({ type: 'code', description: 'Normal 2', priority: 'normal' });
      const high = queue.addTask({ type: 'code', description: 'High', priority: 'high' });

      const tasks = queue.listTasks({ status: 'pending' });

      expect(tasks[0].id).toBe(high);
      expect(tasks[1].id).toBe(normal1);
      expect(tasks[2].id).toBe(normal2);
    });
  });

  describe('Task Retrieval', () => {
    it('should return undefined for non-existent task', () => {
      const task = queue.getTask('non-existent-id');
      expect(task).toBeUndefined();
    });

    it('should return the correct task by ID', () => {
      const taskId = queue.addTask({
        type: 'research',
        description: 'Find information',
      });

      const task = queue.getTask(taskId);
      expect(task).toBeDefined();
      expect(task?.id).toBe(taskId);
      expect(task?.description).toBe('Find information');
    });

    it('should return undefined status for non-existent task', () => {
      const status = queue.getTaskStatus('non-existent-id');
      expect(status).toBeUndefined();
    });

    it('should return correct status for existing task', () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'Test task',
      });

      const status = queue.getTaskStatus(taskId);
      expect(status).toBe('pending');
    });
  });

  describe('Task Listing', () => {
    beforeEach(() => {
      // Add various tasks for filtering tests
      queue.addTask({ type: 'code', description: 'Code 1', priority: 'high' });
      queue.addTask({ type: 'research', description: 'Research 1', priority: 'normal' });
      queue.addTask({ type: 'file', description: 'File 1', priority: 'low' });
      queue.addTask({ type: 'general', description: 'General 1', priority: 'normal' });
    });

    it('should list all tasks', () => {
      const tasks = queue.listTasks();
      expect(tasks).toHaveLength(4);
    });

    it('should filter by type', () => {
      const codeTasks = queue.listTasks({ type: 'code' });
      expect(codeTasks).toHaveLength(1);
      expect(codeTasks[0].type).toBe('code');
    });

    it('should filter by priority', () => {
      const normalTasks = queue.listTasks({ priority: 'normal' });
      expect(normalTasks).toHaveLength(2);
      normalTasks.forEach((t) => expect(t.priority).toBe('normal'));
    });

    it('should filter by status', () => {
      const pendingTasks = queue.listTasks({ status: 'pending' });
      expect(pendingTasks).toHaveLength(4);
    });

    it('should apply limit', () => {
      const tasks = queue.listTasks({ limit: 2 });
      expect(tasks).toHaveLength(2);
    });

    it('should apply offset', () => {
      const allTasks = queue.listTasks();
      const offsetTasks = queue.listTasks({ offset: 2 });
      
      expect(offsetTasks).toHaveLength(2);
      expect(offsetTasks[0].id).toBe(allTasks[2].id);
    });

    it('should combine filters', () => {
      const tasks = queue.listTasks({
        priority: 'normal',
        limit: 1,
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe('normal');
    });

    it('should return summaries without full task data', () => {
      const tasks = queue.listTasks();
      const summary = tasks[0];

      // Summaries should have these fields
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('type');
      expect(summary).toHaveProperty('description');
      expect(summary).toHaveProperty('priority');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('createdAt');

      // But not these (which are in full Task)
      expect(summary).not.toHaveProperty('context');
      expect(summary).not.toHaveProperty('metadata');
      expect(summary).not.toHaveProperty('result');
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel a pending task', () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'Task to cancel',
      });

      const success = queue.cancelTask(taskId);
      
      expect(success).toBe(true);
      expect(queue.getTaskStatus(taskId)).toBe('cancelled');
    });

    it('should return false for non-existent task', () => {
      const success = queue.cancelTask('non-existent-id');
      expect(success).toBe(false);
    });

    it('should emit "task:cancelled" event', () => {
      const handler = vi.fn();
      queue.on('task:cancelled', handler);

      const taskId = queue.addTask({
        type: 'code',
        description: 'Task to cancel',
      });

      queue.cancelTask(taskId);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ 
        id: taskId, 
        status: 'cancelled' 
      }));
    });

    it('should set completedAt when cancelled', () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'Task to cancel',
      });

      queue.cancelTask(taskId);
      const task = queue.getTask(taskId);

      expect(task?.completedAt).toBeDefined();
    });

    it('should remove task from pending queue', () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'Task to cancel',
      });

      queue.cancelTask(taskId);
      const pendingTasks = queue.listTasks({ status: 'pending' });

      expect(pendingTasks.find((t) => t.id === taskId)).toBeUndefined();
    });
  });

  describe('Task Execution', () => {
    it('should execute tasks when started', async () => {
      const completedHandler = vi.fn();
      queue.on('task:completed', completedHandler);

      const taskId = queue.addTask({
        type: 'general',
        description: 'Quick task',
      });

      queue.start();

      // Wait for task to complete (general tasks take ~750ms simulated)
      await vi.waitFor(() => {
        expect(completedHandler).toHaveBeenCalled();
      }, { timeout: 2000 });

      const task = queue.getTask(taskId);
      expect(task?.status).toBe('completed');
    });

    it('should emit "task:started" event', async () => {
      const startedHandler = vi.fn();
      queue.on('task:started', startedHandler);

      queue.addTask({
        type: 'general',
        description: 'Test task',
      });

      queue.start();

      await vi.waitFor(() => {
        expect(startedHandler).toHaveBeenCalledTimes(1);
      }, { timeout: 2000 });
    });

    it('should set startedAt timestamp', async () => {
      const taskId = queue.addTask({
        type: 'general',
        description: 'Test task',
      });

      queue.start();

      await vi.waitFor(() => {
        const task = queue.getTask(taskId);
        expect(task?.startedAt).toBeDefined();
      }, { timeout: 2000 });
    });

    it('should set result on completion', async () => {
      const taskId = queue.addTask({
        type: 'code',
        description: 'Code task',
      });

      queue.start();

      await vi.waitFor(() => {
        const task = queue.getTask(taskId);
        expect(task?.result).toBeDefined();
      }, { timeout: 3000 });

      const task = queue.getTask(taskId);
      expect(task?.result?.success).toBe(true);
      expect(task?.result?.output).toBeDefined();
    });

    it('should process tasks in priority order', async () => {
      const completionOrder: string[] = [];
      
      queue.on('task:completed', (task) => {
        completionOrder.push(task.id);
      });

      const lowId = queue.addTask({ type: 'general', description: 'Low', priority: 'low' });
      const highId = queue.addTask({ type: 'general', description: 'High', priority: 'high' });
      const normalId = queue.addTask({ type: 'general', description: 'Normal', priority: 'normal' });

      queue.start();

      await vi.waitFor(() => {
        expect(completionOrder.length).toBe(3);
      }, { timeout: 5000 });

      // Should complete in priority order: high, normal, low
      expect(completionOrder[0]).toBe(highId);
      expect(completionOrder[1]).toBe(normalId);
      expect(completionOrder[2]).toBe(lowId);
    });
  });

  describe('Concurrent Task Handling', () => {
    it('should respect maxConcurrent setting', async () => {
      const concurrentQueue = new TaskQueue({ 
        autoStart: false,
        maxConcurrent: 2,
      });

      let runningCount = 0;
      let maxRunning = 0;

      concurrentQueue.on('task:started', () => {
        runningCount++;
        maxRunning = Math.max(maxRunning, runningCount);
      });

      concurrentQueue.on('task:completed', () => {
        runningCount--;
      });

      // Add 4 tasks
      for (let i = 0; i < 4; i++) {
        concurrentQueue.addTask({ type: 'general', description: `Task ${i}` });
      }

      concurrentQueue.start();

      await vi.waitFor(() => {
        const stats = concurrentQueue.getStats();
        return stats.completed === 4;
      }, { timeout: 10000 });

      expect(maxRunning).toBeLessThanOrEqual(2);

      concurrentQueue.clear();
    });

    it('should not exceed single task when maxConcurrent is 1', async () => {
      let runningCount = 0;
      let maxRunning = 0;

      queue.on('task:started', () => {
        runningCount++;
        maxRunning = Math.max(maxRunning, runningCount);
      });

      queue.on('task:completed', () => {
        runningCount--;
      });

      // Add 3 tasks
      for (let i = 0; i < 3; i++) {
        queue.addTask({ type: 'general', description: `Task ${i}` });
      }

      queue.start();

      await vi.waitFor(() => {
        const stats = queue.getStats();
        return stats.completed === 3;
      }, { timeout: 10000 });

      expect(maxRunning).toBe(1);
    });
  });

  describe('Queue Statistics', () => {
    it('should return correct initial stats', () => {
      const stats = queue.getStats();

      expect(stats).toEqual({
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      });
    });

    it('should track pending tasks', () => {
      queue.addTask({ type: 'code', description: 'Task 1' });
      queue.addTask({ type: 'code', description: 'Task 2' });

      const stats = queue.getStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(2);
    });

    it('should track cancelled tasks', () => {
      const taskId = queue.addTask({ type: 'code', description: 'Task' });
      queue.cancelTask(taskId);

      const stats = queue.getStats();

      expect(stats.cancelled).toBe(1);
      expect(stats.pending).toBe(0);
    });

    it('should track completed tasks', async () => {
      const testQueue = new TaskQueue({ autoStart: false });
      
      const completedPromise = new Promise<void>((resolve) => {
        testQueue.on('task:completed', () => resolve());
      });
      
      testQueue.addTask({ type: 'general', description: 'Task' });
      testQueue.start();

      await completedPromise;

      const stats = testQueue.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.pending).toBe(0);
      testQueue.clear();
    });
  });

  describe('Cleanup', () => {
    it('should clean up old completed tasks', async () => {
      // Create queue with very short retention (10ms)
      const cleanupQueue = new TaskQueue({
        autoStart: false,
        taskRetentionMs: 10,
        cleanupIntervalMs: 50,
      });

      const completedPromise = new Promise<void>((resolve) => {
        cleanupQueue.on('task:completed', () => resolve());
      });

      const taskId = cleanupQueue.addTask({ type: 'general', description: 'Task' });
      
      // Start and wait for completion
      cleanupQueue.start();

      await completedPromise;

      // Verify task is completed
      expect(cleanupQueue.getTaskStatus(taskId)).toBe('completed');

      // Wait for retention period to definitely expire (10ms retention + buffer)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Manually trigger cleanup
      const removedCount = cleanupQueue.cleanupOldTasks();

      expect(removedCount).toBe(1);
      expect(cleanupQueue.getTask(taskId)).toBeUndefined();

      cleanupQueue.clear();
    });

    it('should not clean up pending tasks', () => {
      const taskId = queue.addTask({ type: 'code', description: 'Pending task' });

      const removedCount = queue.cleanupOldTasks();

      expect(removedCount).toBe(0);
      expect(queue.getTask(taskId)).toBeDefined();
    });

    it('should emit "cleanup:completed" event', async () => {
      const cleanupQueue = new TaskQueue({
        autoStart: false,
        taskRetentionMs: 50,
      });

      const handler = vi.fn();
      cleanupQueue.on('cleanup:completed', handler);

      const completedPromise = new Promise<void>((resolve) => {
        cleanupQueue.on('task:completed', () => resolve());
      });

      cleanupQueue.addTask({ type: 'general', description: 'Task' });
      cleanupQueue.start();

      await completedPromise;

      // Wait for retention period to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      cleanupQueue.cleanupOldTasks();

      expect(handler).toHaveBeenCalledWith(1);

      cleanupQueue.clear();
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const config = queue.getConfig();

      expect(config).toHaveProperty('maxConcurrent');
      expect(config).toHaveProperty('taskRetentionMs');
      expect(config).toHaveProperty('cleanupIntervalMs');
      expect(config).toHaveProperty('autoStart');
    });

    it('should allow configuration updates', () => {
      const originalConfig = queue.getConfig();
      
      queue.updateConfig({ maxConcurrent: 5 });
      
      const newConfig = queue.getConfig();
      expect(newConfig.maxConcurrent).toBe(5);
      expect(newConfig.taskRetentionMs).toBe(originalConfig.taskRetentionMs);
    });
  });

  describe('Start/Stop', () => {
    it('should not process tasks when stopped', async () => {
      const handler = vi.fn();
      queue.on('task:started', handler);

      queue.addTask({ type: 'code', description: 'Task' });

      // Don't start the queue - tasks should not be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should process tasks after start', async () => {
      const handler = vi.fn();
      queue.on('task:started', handler);

      queue.addTask({ type: 'code', description: 'Task' });
      queue.start();

      await vi.waitFor(() => {
        expect(handler).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should stop processing new tasks after stop', async () => {
      queue.addTask({ type: 'general', description: 'Task 1' });
      queue.start();

      // Wait for first task to start
      await vi.waitFor(() => {
        return queue.getStats().running > 0 || queue.getStats().completed > 0;
      }, { timeout: 2000 });

      queue.stop();

      // Add another task
      queue.addTask({ type: 'general', description: 'Task 2' });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Second task should still be pending
      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });
  });

  describe('Clear', () => {
    it('should remove all tasks', () => {
      queue.addTask({ type: 'code', description: 'Task 1' });
      queue.addTask({ type: 'code', description: 'Task 2' });

      queue.clear();

      expect(queue.getStats().total).toBe(0);
    });

    it('should stop the queue', () => {
      queue.start();
      queue.clear();

      const handler = vi.fn();
      queue.on('task:started', handler);
      
      queue.addTask({ type: 'code', description: 'Task' });

      // Task should not start because queue is stopped
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Event Removal', () => {
    it('should allow removing event listeners', () => {
      const handler = vi.fn();
      queue.on('task:added', handler);
      
      queue.addTask({ type: 'code', description: 'First' });
      expect(handler).toHaveBeenCalledTimes(1);

      queue.off('task:added', handler);

      queue.addTask({ type: 'code', description: 'Second' });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description gracefully', () => {
      // This tests that the queue doesn't crash with edge case input
      // In production, you might want validation
      const taskId = queue.addTask({
        type: 'general',
        description: '',
      });

      expect(taskId).toBeDefined();
      const task = queue.getTask(taskId);
      expect(task?.description).toBe('');
    });

    it('should handle multiple starts without issues', () => {
      queue.start();
      queue.start();
      queue.start();

      // Should not throw or create multiple cleanup timers
      expect(true).toBe(true);
    });

    it('should handle multiple stops without issues', () => {
      queue.start();
      queue.stop();
      queue.stop();
      queue.stop();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should handle cancelling already cancelled task', () => {
      const taskId = queue.addTask({ type: 'code', description: 'Task' });
      
      queue.cancelTask(taskId);
      const secondCancel = queue.cancelTask(taskId);

      expect(secondCancel).toBe(false); // Can't cancel a cancelled task
    });
  });

  describe('All Task Types', () => {
    const taskTypes: TaskType[] = ['code', 'research', 'file', 'general'];

    taskTypes.forEach((type) => {
      it(`should handle "${type}" task type`, async () => {
        const testQueue = new TaskQueue({ autoStart: false });
        
        const completedPromise = new Promise<void>((resolve) => {
          testQueue.on('task:completed', () => resolve());
        });
        
        const taskId = testQueue.addTask({
          type,
          description: `${type} task`,
        });

        testQueue.start();

        await completedPromise;

        const task = testQueue.getTask(taskId);
        expect(task?.type).toBe(type);
        expect(task?.result?.success).toBe(true);
        
        testQueue.clear();
      });
    });
  });

  describe('All Priority Levels', () => {
    const priorities: TaskPriority[] = ['high', 'normal', 'low'];

    priorities.forEach((priority) => {
      it(`should handle "${priority}" priority`, () => {
        const taskId = queue.addTask({
          type: 'general',
          description: `${priority} priority task`,
          priority,
        });

        const task = queue.getTask(taskId);
        expect(task?.priority).toBe(priority);
      });
    });
  });
});
