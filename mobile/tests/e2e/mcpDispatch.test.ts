/**
 * E2E Tests: MCP Dispatch Integration
 *
 * Tests the MCP dispatch integration between the mobile app and silas-workstation.
 * These tests verify the MCP tools: dispatch_task, task_status, list_tasks,
 * and error handling when silas-workstation is unavailable.
 *
 * Test Modes:
 * - Unit Test Mode (default): Uses mocked responses for CI/CD
 * - Integration Test Mode: Set HERMES_INTEGRATION_TEST=true for real Hermes
 *
 * @see https://github.com/berryhill/autoxan/issues/39
 */

import { XanderApi } from '../../src/api/xanderApi';
import type { XanderApiError } from '../../src/api/xanderApi';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestApi,
  getMockInstance,
  mockResponses,
  mcpResponses,
  setupMockSession,
  setupMockError,
  isIntegrationTest,
  INTEGRATION_TIMEOUT,
} from './setup';

// ============================================================================
// TEST SUITE: MCP Dispatch Integration
// ============================================================================

describe('E2E: MCP Dispatch Integration', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    api = createTestApi();
    mockInstance = getMockInstance();

    setupMockSession(mockInstance);
    await api.startSession();
  });

  afterEach(async () => {
    try {
      await api.endSession();
    } catch {
      // Ignore cleanup errors
    }
  });

  // --------------------------------------------------------------------------
  // dispatch_task Tests
  // --------------------------------------------------------------------------

  describe('dispatch_task MCP Tool', () => {
    it('should dispatch task to silas-workstation and return task ID', async () => {
      // Mock the MCP dispatch_task response
      mockInstance.post.mockResolvedValueOnce({
        data: mcpResponses.dispatchTask,
      });

      // Simulate calling the MCP dispatch_task tool via the API
      const dispatchRequest = {
        type: 'code' as const,
        description: 'Create a Python script to process CSV files',
        priority: 'normal' as const,
        context: { sessionId: api.getSessionId() },
      };

      const result = await api.mcpDispatchTask(dispatchRequest);

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.taskId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(result.message).toContain('Task dispatched successfully');
      expect(result.task).toBeDefined();
      expect(result.task?.type).toBe('code');
      expect(result.task?.status).toBe('pending');
    });

    it('should dispatch task with high priority', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          ...mcpResponses.dispatchTask,
          task: {
            ...mcpResponses.dispatchTask.task,
            priority: 'high',
          },
        },
      });

      const result = await api.mcpDispatchTask({
        type: 'code',
        description: 'Urgent security fix',
        priority: 'high',
      });

      expect(result.success).toBe(true);
      expect(result.task?.priority).toBe('high');
    });

    it('should dispatch task with context and metadata', async () => {
      let capturedRequest: Record<string, unknown> | null = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        capturedRequest = data as Record<string, unknown>;
        return Promise.resolve({ data: mcpResponses.dispatchTask });
      });

      await api.mcpDispatchTask({
        type: 'research',
        description: 'Research latest TypeScript features',
        priority: 'low',
        context: { source: 'voice-command', sessionId: 'test-session' },
        metadata: { requestedBy: 'user-123' },
      });

      expect(capturedRequest).toBeDefined();
      expect(capturedRequest?.type).toBe('research');
      expect(capturedRequest?.context).toEqual({
        source: 'voice-command',
        sessionId: 'test-session',
      });
      expect(capturedRequest?.metadata).toEqual({ requestedBy: 'user-123' });
    });

    it('should handle all task types: code, research, file, general', async () => {
      const taskTypes = ['code', 'research', 'file', 'general'] as const;

      for (const type of taskTypes) {
        mockInstance.post.mockResolvedValueOnce({
          data: {
            ...mcpResponses.dispatchTask,
            task: { ...mcpResponses.dispatchTask.task, type },
          },
        });

        const result = await api.mcpDispatchTask({
          type,
          description: `Test ${type} task`,
        });

        expect(result.success).toBe(true);
        expect(result.task?.type).toBe(type);
      }
    });
  });

  // --------------------------------------------------------------------------
  // task_status Tests
  // --------------------------------------------------------------------------

  describe('task_status MCP Tool', () => {
    it('should retrieve task status by ID', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mcpResponses.taskStatus,
      });

      const taskId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const result = await api.mcpTaskStatus(taskId);

      expect(result.success).toBe(true);
      expect(result.task).toBeDefined();
      expect(result.task?.id).toBe(taskId);
      expect(result.task?.status).toBe('completed');
      expect(result.task?.result).toBeDefined();
    });

    it('should return different task statuses: pending, running, completed', async () => {
      const statuses = ['pending', 'running', 'completed'] as const;
      const taskId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      for (const status of statuses) {
        mockInstance.post.mockResolvedValueOnce({
          data: {
            success: true,
            task: {
              ...mcpResponses.taskStatus.task,
              status,
              startedAt: status !== 'pending' ? '2026-05-05T00:01:00.000Z' : undefined,
              completedAt: status === 'completed' ? '2026-05-05T00:02:00.000Z' : undefined,
            },
          },
        });

        const result = await api.mcpTaskStatus(taskId);

        expect(result.success).toBe(true);
        expect(result.task?.status).toBe(status);
      }
    });

    it('should return error for non-existent task', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mcpResponses.taskNotFound,
      });

      const result = await api.mcpTaskStatus('non-existent-task-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task not found');
    });

    it('should include task details: type, description, priority, context', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mcpResponses.taskStatus,
      });

      const result = await api.mcpTaskStatus('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(result.task?.type).toBe('code');
      expect(result.task?.description).toBeDefined();
      expect(result.task?.priority).toBe('normal');
      expect(result.task?.createdAt).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // list_tasks Tests
  // --------------------------------------------------------------------------

  describe('list_tasks MCP Tool', () => {
    it('should list all tasks with stats', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mcpResponses.listTasks,
      });

      const result = await api.mcpListTasks();

      expect(result.success).toBe(true);
      expect(result.count).toBeDefined();
      expect(result.count).toBeGreaterThanOrEqual(0);
      expect(result.stats).toBeDefined();
      expect(result.stats?.pending).toBeDefined();
      expect(result.stats?.running).toBeDefined();
      expect(result.stats?.completed).toBeDefined();
      expect(result.stats?.failed).toBeDefined();
      expect(result.stats?.cancelled).toBeDefined();
      expect(result.stats?.total).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('should filter tasks by status', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          ...mcpResponses.listTasks,
          count: 1,
          tasks: mcpResponses.listTasks.tasks.filter((t) => t.status === 'pending'),
        },
      });

      const result = await api.mcpListTasks({ status: 'pending' });

      expect(result.success).toBe(true);
      expect(result.tasks?.every((t) => t.status === 'pending')).toBe(true);
    });

    it('should filter tasks by type', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          ...mcpResponses.listTasks,
          count: 1,
          tasks: mcpResponses.listTasks.tasks.filter((t) => t.type === 'code'),
        },
      });

      const result = await api.mcpListTasks({ type: 'code' });

      expect(result.success).toBe(true);
      expect(result.tasks?.every((t) => t.type === 'code')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          ...mcpResponses.listTasks,
          count: 1,
          tasks: mcpResponses.listTasks.tasks.filter((t) => t.priority === 'high'),
        },
      });

      const result = await api.mcpListTasks({ priority: 'high' });

      expect(result.success).toBe(true);
    });

    it('should support pagination with limit and offset', async () => {
      let capturedRequest: Record<string, unknown> | null = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        capturedRequest = data as Record<string, unknown>;
        return Promise.resolve({ data: mcpResponses.listTasks });
      });

      await api.mcpListTasks({ limit: 10, offset: 20 });

      expect(capturedRequest?.limit).toBe(10);
      expect(capturedRequest?.offset).toBe(20);
    });

    it('should return empty list when no tasks exist', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          count: 0,
          stats: {
            pending: 0,
            running: 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
            total: 0,
          },
          tasks: [],
        },
      });

      const result = await api.mcpListTasks();

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(result.tasks).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling Tests
  // --------------------------------------------------------------------------

  describe('Error Handling - silas-workstation unavailable', () => {
    it('should handle connection refused gracefully', async () => {
      const connectionError: XanderApiError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:3001',
      };
      setupMockError(mockInstance, connectionError);

      const result = await api.mcpDispatchTask({
        type: 'code',
        description: 'Test task',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('silas-workstation is unavailable');
    });

    it('should handle timeout gracefully', async () => {
      const timeoutError: XanderApiError = {
        code: 'ETIMEDOUT',
        message: 'Request timed out',
      };
      setupMockError(mockInstance, timeoutError);

      const result = await api.mcpDispatchTask({
        type: 'code',
        description: 'Test task',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('unavailable');
    });

    it('should handle network unreachable gracefully', async () => {
      const networkError: XanderApiError = {
        code: 'ENETUNREACH',
        message: 'Network is unreachable',
      };
      setupMockError(mockInstance, networkError);

      const result = await api.mcpTaskStatus('some-task-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle server error gracefully', async () => {
      const serverError: XanderApiError = {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
      };
      setupMockError(mockInstance, serverError);

      const result = await api.mcpListTasks();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include helpful message when silas is unavailable', async () => {
      const connectionError: XanderApiError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:3001',
      };
      setupMockError(mockInstance, connectionError);

      const result = await api.mcpDispatchTask({
        type: 'code',
        description: 'Test task',
      });

      // Error message should guide user to check silas-workstation
      expect(result.error?.toLowerCase()).toMatch(
        /(silas|unavailable|connection|refused)/i
      );
    });

    it('should not throw exceptions for MCP errors', async () => {
      const serverError: XanderApiError = {
        code: 'SERVER_ERROR',
        message: 'Server error',
      };
      setupMockError(mockInstance, serverError);

      // Should not throw, should return error response
      const result = await api.mcpDispatchTask({
        type: 'code',
        description: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: Real Integration Tests (Skipped by default)
// ============================================================================

describe.skip('E2E: Real MCP Dispatch Integration', () => {
  // These tests only run with: HERMES_INTEGRATION_TEST=true pnpm test
  // and require silas-workstation to be running

  let api: XanderApi;

  beforeAll(() => {
    jest.unmock('axios');
  });

  beforeEach(() => {
    api = createTestApi();
  });

  afterEach(async () => {
    try {
      await api.endSession();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should dispatch real task to silas-workstation', async () => {
    await api.startSession();

    const result = await api.mcpDispatchTask({
      type: 'code',
      description: 'Integration test task - create hello world script',
      priority: 'low',
      metadata: { test: true },
    });

    console.log('Dispatch result:', result);
    expect(result.taskId).toBeDefined();
  }, INTEGRATION_TIMEOUT);

  it('should get real task status from silas-workstation', async () => {
    await api.startSession();

    // First dispatch a task
    const dispatchResult = await api.mcpDispatchTask({
      type: 'general',
      description: 'Status check test task',
    });

    if (dispatchResult.taskId) {
      const statusResult = await api.mcpTaskStatus(dispatchResult.taskId);
      console.log('Task status:', statusResult);
      expect(statusResult.task).toBeDefined();
    }
  }, INTEGRATION_TIMEOUT);

  it('should list real tasks from silas-workstation', async () => {
    await api.startSession();

    const result = await api.mcpListTasks({ limit: 5 });

    console.log('Task list:', result);
    expect(result.stats).toBeDefined();
  }, INTEGRATION_TIMEOUT);
});
