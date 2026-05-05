/**
 * Unit Tests for Task Types
 * 
 * Tests cover:
 * - Type exports and constants
 * - Priority weights
 */

import { describe, it, expect } from 'vitest';
import {
  PRIORITY_WEIGHTS,
  type Task,
  type TaskInput,
  type TaskResult,
  type TaskSummary,
  type TaskFilterOptions,
  type TaskQueueConfig,
  type TaskQueueEvents,
  type TaskPriority,
  type TaskType,
  type TaskStatus,
} from './task.js';

describe('Task Types', () => {
  describe('PRIORITY_WEIGHTS', () => {
    it('should have correct weight for high priority', () => {
      expect(PRIORITY_WEIGHTS.high).toBe(3);
    });

    it('should have correct weight for normal priority', () => {
      expect(PRIORITY_WEIGHTS.normal).toBe(2);
    });

    it('should have correct weight for low priority', () => {
      expect(PRIORITY_WEIGHTS.low).toBe(1);
    });

    it('should have high > normal > low', () => {
      expect(PRIORITY_WEIGHTS.high).toBeGreaterThan(PRIORITY_WEIGHTS.normal);
      expect(PRIORITY_WEIGHTS.normal).toBeGreaterThan(PRIORITY_WEIGHTS.low);
    });
  });

  describe('Type Compatibility', () => {
    it('should allow creating a valid Task object', () => {
      const task: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'code',
        description: 'Test task',
        priority: 'high',
        status: 'pending',
        createdAt: new Date(),
      };

      expect(task.id).toBeDefined();
      expect(task.type).toBe('code');
      expect(task.priority).toBe('high');
      expect(task.status).toBe('pending');
    });

    it('should allow creating a valid TaskInput object', () => {
      const input: TaskInput = {
        type: 'research',
        description: 'Research task',
        priority: 'normal',
        context: { topic: 'AI' },
        metadata: { source: 'xander' },
      };

      expect(input.type).toBe('research');
      expect(input.description).toBe('Research task');
    });

    it('should allow creating a valid TaskResult object', () => {
      const successResult: TaskResult = {
        success: true,
        output: { data: 'result' },
      };

      const failureResult: TaskResult = {
        success: false,
        error: 'Something went wrong',
        stack: 'Error stack trace',
      };

      expect(successResult.success).toBe(true);
      expect(failureResult.success).toBe(false);
      expect(failureResult.error).toBeDefined();
    });

    it('should allow creating a valid TaskSummary object', () => {
      const summary: TaskSummary = {
        id: '123',
        type: 'file',
        description: 'File task',
        priority: 'low',
        status: 'completed',
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      expect(summary.id).toBeDefined();
      expect(summary.status).toBe('completed');
    });

    it('should allow creating a valid TaskFilterOptions object', () => {
      const options: TaskFilterOptions = {
        status: 'pending',
        type: 'code',
        priority: 'high',
        limit: 10,
        offset: 0,
      };

      expect(options.status).toBe('pending');
      expect(options.limit).toBe(10);
    });

    it('should allow creating a valid TaskQueueConfig object', () => {
      const config: TaskQueueConfig = {
        maxConcurrent: 2,
        taskRetentionMs: 3600000,
        cleanupIntervalMs: 300000,
        autoStart: true,
      };

      expect(config.maxConcurrent).toBe(2);
      expect(config.autoStart).toBe(true);
    });
  });

  describe('TaskPriority Type', () => {
    it('should accept valid priority values', () => {
      const priorities: TaskPriority[] = ['high', 'normal', 'low'];
      expect(priorities).toHaveLength(3);
    });
  });

  describe('TaskType Type', () => {
    it('should accept valid type values', () => {
      const types: TaskType[] = ['code', 'research', 'file', 'general'];
      expect(types).toHaveLength(4);
    });
  });

  describe('TaskStatus Type', () => {
    it('should accept valid status values', () => {
      const statuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      expect(statuses).toHaveLength(5);
    });
  });

  describe('Task with Optional Fields', () => {
    it('should allow Task without optional fields', () => {
      const minimalTask: Task = {
        id: '123',
        type: 'general',
        description: 'Minimal task',
        priority: 'normal',
        status: 'pending',
        createdAt: new Date(),
      };

      expect(minimalTask.context).toBeUndefined();
      expect(minimalTask.metadata).toBeUndefined();
      expect(minimalTask.result).toBeUndefined();
      expect(minimalTask.startedAt).toBeUndefined();
      expect(minimalTask.completedAt).toBeUndefined();
    });

    it('should allow Task with all fields', () => {
      const fullTask: Task = {
        id: '123',
        type: 'code',
        description: 'Full task',
        priority: 'high',
        status: 'completed',
        context: { key: 'value' },
        metadata: { source: 'test' },
        result: { success: true, output: 'done' },
        createdAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
      };

      expect(fullTask.context).toBeDefined();
      expect(fullTask.metadata).toBeDefined();
      expect(fullTask.result).toBeDefined();
      expect(fullTask.startedAt).toBeDefined();
      expect(fullTask.completedAt).toBeDefined();
    });
  });

  describe('TaskFilterOptions with Optional Fields', () => {
    it('should allow empty filter options', () => {
      const emptyOptions: TaskFilterOptions = {};
      expect(Object.keys(emptyOptions)).toHaveLength(0);
    });

    it('should allow partial filter options', () => {
      const partialOptions: TaskFilterOptions = {
        status: 'running',
      };
      
      expect(partialOptions.status).toBe('running');
      expect(partialOptions.type).toBeUndefined();
      expect(partialOptions.priority).toBeUndefined();
    });
  });

  describe('TaskInput with Optional Fields', () => {
    it('should allow minimal input', () => {
      const minimalInput: TaskInput = {
        type: 'general',
        description: 'Minimal input',
      };

      expect(minimalInput.priority).toBeUndefined();
      expect(minimalInput.context).toBeUndefined();
      expect(minimalInput.metadata).toBeUndefined();
    });
  });
});
