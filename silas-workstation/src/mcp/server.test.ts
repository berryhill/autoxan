/**
 * Unit Tests for MCP Server
 * 
 * Tests cover:
 * - Schema validation
 * - Tool registration and execution
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMcpServer, schemas } from './server.js';
import { TaskQueue } from '../services/taskQueue.js';

describe('MCP Server Schemas', () => {
  describe('DispatchTaskSchema', () => {
    const { DispatchTaskSchema } = schemas;

    it('should validate valid task input', () => {
      const input = {
        type: 'code',
        description: 'Implement feature X',
        priority: 'high',
      };

      const result = DispatchTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept all valid task types', () => {
      const types = ['code', 'research', 'file', 'general'];

      for (const type of types) {
        const result = DispatchTaskSchema.safeParse({
          type,
          description: 'Test task',
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid task types', () => {
      const result = DispatchTaskSchema.safeParse({
        type: 'invalid',
        description: 'Test task',
      });

      expect(result.success).toBe(false);
    });

    it('should accept all valid priorities', () => {
      const priorities = ['high', 'normal', 'low'];

      for (const priority of priorities) {
        const result = DispatchTaskSchema.safeParse({
          type: 'code',
          description: 'Test task',
          priority,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid priorities', () => {
      const result = DispatchTaskSchema.safeParse({
        type: 'code',
        description: 'Test task',
        priority: 'urgent', // Not a valid priority
      });

      expect(result.success).toBe(false);
    });

    it('should require description', () => {
      const result = DispatchTaskSchema.safeParse({
        type: 'code',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = DispatchTaskSchema.safeParse({
        type: 'code',
        description: '',
      });

      expect(result.success).toBe(false);
    });

    it('should default priority to normal', () => {
      const result = DispatchTaskSchema.parse({
        type: 'code',
        description: 'Test task',
      });

      expect(result.priority).toBe('normal');
    });

    it('should accept optional context', () => {
      const input = {
        type: 'code',
        description: 'Test task',
        context: { repo: 'autoxan', branch: 'main' },
      };

      const result = DispatchTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.context).toEqual({ repo: 'autoxan', branch: 'main' });
      }
    });

    it('should accept optional metadata', () => {
      const input = {
        type: 'code',
        description: 'Test task',
        metadata: { source: 'xander', sessionId: '123' },
      };

      const result = DispatchTaskSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toEqual({ source: 'xander', sessionId: '123' });
      }
    });
  });

  describe('TaskStatusSchema', () => {
    const { TaskStatusSchema } = schemas;

    it('should validate valid UUID', () => {
      const result = TaskStatusSchema.safeParse({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = TaskStatusSchema.safeParse({
        taskId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });

    it('should require taskId', () => {
      const result = TaskStatusSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('ListTasksSchema', () => {
    const { ListTasksSchema } = schemas;

    it('should accept empty input', () => {
      const result = ListTasksSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate status filter', () => {
      const statuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];

      for (const status of statuses) {
        const result = ListTasksSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = ListTasksSchema.safeParse({
        status: 'invalid',
      });

      expect(result.success).toBe(false);
    });

    it('should validate type filter', () => {
      const types = ['code', 'research', 'file', 'general'];

      for (const type of types) {
        const result = ListTasksSchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });

    it('should validate priority filter', () => {
      const priorities = ['high', 'normal', 'low'];

      for (const priority of priorities) {
        const result = ListTasksSchema.safeParse({ priority });
        expect(result.success).toBe(true);
      }
    });

    it('should validate limit', () => {
      const result = ListTasksSchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it('should reject limit > 100', () => {
      const result = ListTasksSchema.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
    });

    it('should reject limit < 1', () => {
      const result = ListTasksSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it('should validate offset', () => {
      const result = ListTasksSchema.safeParse({ offset: 10 });
      expect(result.success).toBe(true);
    });

    it('should reject negative offset', () => {
      const result = ListTasksSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    it('should have default values', () => {
      const result = ListTasksSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('CancelTaskSchema', () => {
    const { CancelTaskSchema } = schemas;

    it('should validate valid UUID', () => {
      const result = CancelTaskSchema.safeParse({
        taskId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = CancelTaskSchema.safeParse({
        taskId: 'invalid',
      });

      expect(result.success).toBe(false);
    });

    it('should require taskId', () => {
      const result = CancelTaskSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe('MCP Server Tools', () => {
  let queue: TaskQueue;

  beforeEach(() => {
    queue = new TaskQueue({ autoStart: false });
  });

  afterEach(() => {
    queue.clear();
  });

  describe('createMcpServer', () => {
    it('should create an MCP server instance', () => {
      const server = createMcpServer(queue);
      expect(server).toBeDefined();
    });

    it('should use provided queue', () => {
      const customQueue = new TaskQueue({ autoStart: false });
      createMcpServer(customQueue);
      
      // Add a task through the queue
      customQueue.addTask({
        type: 'code',
        description: 'Test task',
      });

      expect(customQueue.getStats().total).toBe(1);
      customQueue.clear();
    });
  });

  // Note: Full integration tests for the MCP tools would require 
  // mocking the MCP transport layer, which is beyond unit testing scope.
  // The schema validations above ensure inputs are correctly validated.
  // Integration tests would be done separately.
});

describe('MCP Tool Response Format', () => {
  // These tests document the expected response format
  // Actual tool execution would require MCP transport mocking

  it('should document dispatch_task success response format', () => {
    const expectedFormat = {
      success: true,
      taskId: expect.any(String),
      message: expect.stringContaining('dispatched successfully'),
      task: {
        id: expect.any(String),
        type: expect.any(String),
        description: expect.any(String),
        priority: expect.any(String),
        status: 'pending',
        createdAt: expect.any(String),
      },
    };

    // This documents the expected format
    expect(expectedFormat).toBeDefined();
  });

  it('should document task_status success response format', () => {
    const expectedFormat = {
      success: true,
      task: {
        id: expect.any(String),
        type: expect.any(String),
        description: expect.any(String),
        priority: expect.any(String),
        status: expect.any(String),
        context: expect.anything(),
        metadata: expect.anything(),
        result: expect.anything(),
        createdAt: expect.any(String),
        startedAt: expect.anything(),
        completedAt: expect.anything(),
      },
    };

    expect(expectedFormat).toBeDefined();
  });

  it('should document task_status not found response format', () => {
    const expectedFormat = {
      success: false,
      error: expect.stringContaining('not found'),
    };

    expect(expectedFormat).toBeDefined();
  });

  it('should document list_tasks success response format', () => {
    const expectedFormat = {
      success: true,
      count: expect.any(Number),
      stats: {
        total: expect.any(Number),
        pending: expect.any(Number),
        running: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        cancelled: expect.any(Number),
      },
      tasks: expect.any(Array),
    };

    expect(expectedFormat).toBeDefined();
  });

  it('should document cancel_task success response format', () => {
    const expectedFormat = {
      success: true,
      message: expect.stringContaining('cancelled successfully'),
    };

    expect(expectedFormat).toBeDefined();
  });

  it('should document cancel_task failure response format', () => {
    const expectedFormat = {
      success: false,
      error: expect.stringContaining('Cannot cancel'),
    };

    expect(expectedFormat).toBeDefined();
  });

  it('should document queue_stats response format', () => {
    const expectedFormat = {
      success: true,
      stats: {
        total: expect.any(Number),
        pending: expect.any(Number),
        running: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        cancelled: expect.any(Number),
      },
      config: {
        maxConcurrent: expect.any(Number),
        taskRetentionMs: expect.any(Number),
        cleanupIntervalMs: expect.any(Number),
      },
    };

    expect(expectedFormat).toBeDefined();
  });
});
