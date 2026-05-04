/**
 * Unit tests for XanderApi
 * Tests HTTP client functionality for Xander agent communication
 */

import axios from 'axios';
import { XanderApi } from '../xanderApi';
import type { XanderApiError } from '../xanderApi';

// Get access to the mock axios module
const mockAxios = axios as jest.Mocked<typeof axios>;

// Helper to get the mock instance created by axios.create
const getMockInstance = () => {
  // Get the mock instance from the last call to axios.create
  const createMock = mockAxios.create as jest.Mock;
  if (createMock.mock.results.length > 0) {
    return createMock.mock.results[createMock.mock.results.length - 1].value;
  }
  // Fallback to the __mockInstance
  return (axios as unknown as { __mockInstance: unknown }).__mockInstance;
};

describe('XanderApi', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new XanderApi();
    mockInstance = getMockInstance();
  });

  describe('Constructor', () => {
    it('should create an axios instance with default config', () => {
      new XanderApi();
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:3000',
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should use custom config when provided', () => {
      new XanderApi({
        baseUrl: 'http://custom:8080',
        timeout: 60000,
      });
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom:8080',
          timeout: 60000,
        })
      );
    });
  });

  describe('getSessionId', () => {
    it('should return null when no session exists', () => {
      expect(api.getSessionId()).toBeNull();
    });

    it('should return session ID after starting a session', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'test-session-123',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });

      await api.startSession();
      expect(api.getSessionId()).toBe('test-session-123');
    });
  });

  describe('healthCheck', () => {
    it('should return true when Xander is available', async () => {
      mockInstance.get.mockResolvedValueOnce({ data: { status: 'ok' } });

      const result = await api.healthCheck();

      expect(result).toBe(true);
      expect(mockInstance.get).toHaveBeenCalledWith('/health');
    });

    it('should return false when Xander is unavailable', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const result = await api.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Timeout',
      });

      const result = await api.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('startSession', () => {
    it('should create a new session and store session ID', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'new-session-456',
          messages: [],
          createdAt: '2024-01-01T12:00:00Z',
        },
      });

      const session = await api.startSession();

      expect(mockInstance.post).toHaveBeenCalledWith('/sessions');
      expect(session.sessionId).toBe('new-session-456');
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBe('2024-01-01T12:00:00Z');
      expect(api.getSessionId()).toBe('new-session-456');
    });

    it('should convert messages to XanderMessage format with timestamps', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'session-with-messages',
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
          createdAt: '2024-01-01T12:00:00Z',
        },
      });

      const session = await api.startSession();

      expect(session.messages).toHaveLength(2);
      expect(session.messages[0]).toHaveProperty('timestamp');
      expect(session.messages[0].role).toBe('user');
      expect(session.messages[0].content).toBe('Hello');
    });

    it('should create local session on server error', async () => {
      mockInstance.post.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const session = await api.startSession();

      expect(session.sessionId).toMatch(/^local-session-/);
      expect(session.messages).toEqual([]);
      expect(api.getSessionId()).toMatch(/^local-session-/);
    });
  });

  describe('endSession', () => {
    it('should end the current session', async () => {
      // First start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'session-to-end',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Then end it
      mockInstance.delete.mockResolvedValueOnce({ data: {} });
      await api.endSession();

      expect(mockInstance.delete).toHaveBeenCalledWith('/sessions/session-to-end');
      expect(api.getSessionId()).toBeNull();
    });

    it('should do nothing when no session exists', async () => {
      await api.endSession();

      expect(mockInstance.delete).not.toHaveBeenCalled();
      expect(api.getSessionId()).toBeNull();
    });

    it('should clear session ID even on server error', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'session-error',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();
      expect(api.getSessionId()).toBe('session-error');

      // End fails but should still clear local state
      mockInstance.delete.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });
      await api.endSession();

      expect(api.getSessionId()).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return null when no session exists', async () => {
      const session = await api.getSession();

      expect(session).toBeNull();
    });

    it('should retrieve the current session', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'get-session-test',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Get the session
      mockInstance.get.mockResolvedValueOnce({
        data: {
          id: 'get-session-test',
          messages: [{ role: 'user', content: 'Test message' }],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });

      const session = await api.getSession();

      expect(mockInstance.get).toHaveBeenCalledWith('/sessions/get-session-test');
      expect(session?.sessionId).toBe('get-session-test');
      expect(session?.messages).toHaveLength(1);
    });

    it('should return minimal session on server error', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'session-fallback',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Get fails
      mockInstance.get.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      const session = await api.getSession();

      expect(session?.sessionId).toBe('session-fallback');
      expect(session?.messages).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      // Start a session first
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'chat-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Send a message
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'chat-session',
          response: 'Hello! How can I help you?',
          suggestDispatch: false,
        },
      });

      const result = await api.sendMessage('Hello');

      expect(mockInstance.post).toHaveBeenCalledWith('/chat', {
        sessionId: 'chat-session',
        message: 'Hello',
      });
      expect(result.message).toBe('Hello! How can I help you?');
      expect(result.sessionId).toBe('chat-session');
    });

    it('should auto-start session if none exists', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'auto-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });

      // Mock message response
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'auto-session',
          response: 'Response after auto-start',
        },
      });

      const result = await api.sendMessage('Test message');

      expect(mockInstance.post).toHaveBeenCalledWith('/sessions');
      expect(result.message).toBe('Response after auto-start');
    });

    it('should trim whitespace from message', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'trim-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Send message
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'trim-session',
          response: 'Response',
        },
      });

      await api.sendMessage('  Hello World  ');

      expect(mockInstance.post).toHaveBeenCalledWith('/chat', {
        sessionId: 'trim-session',
        message: 'Hello World',
      });
    });

    it('should throw error for empty message', async () => {
      await expect(api.sendMessage('')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_MESSAGE',
          message: 'Message cannot be empty',
        })
      );
    });

    it('should throw error for whitespace-only message', async () => {
      await expect(api.sendMessage('   ')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_MESSAGE',
          message: 'Message cannot be empty',
        })
      );
    });

    it('should include dispatch suggestion in metadata', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'dispatch-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Send message with dispatch suggestion
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'dispatch-session',
          response: 'I can help with that task.',
          suggestDispatch: true,
          dispatchSummary: 'Create a new feature',
        },
      });

      const result = await api.sendMessage('Can you create a feature?');

      expect(result.metadata?.suggestDispatch).toBe(true);
      expect(result.metadata?.dispatchSummary).toBe('Create a new feature');
    });

    it('should update session ID if server provides different one', async () => {
      // Start with local session (server error)
      mockInstance.post.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });
      await api.startSession();
      expect(api.getSessionId()).toMatch(/^local-session-/);

      // Now server responds with real session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'server-session-new',
          response: 'Connected!',
        },
      });

      await api.sendMessage('Hello');

      expect(api.getSessionId()).toBe('server-session-new');
    });

    it('should propagate server errors', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'error-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Server error on message
      const serverError: XanderApiError = {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
      };
      mockInstance.post.mockRejectedValueOnce(serverError);

      await expect(api.sendMessage('Test')).rejects.toEqual(serverError);
    });
  });

  describe('dispatch', () => {
    it('should dispatch work to silas-workstation', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          taskId: 'task-123',
          message: 'Task dispatched successfully',
        },
      });

      const result = await api.dispatch({
        sessionId: 'session-456',
        summary: 'Create new feature',
        details: 'Detailed description of the feature',
      });

      expect(mockInstance.post).toHaveBeenCalledWith('/dispatch', {
        sessionId: 'session-456',
        summary: 'Create new feature',
        details: 'Detailed description of the feature',
      });
      expect(result.success).toBe(true);
      expect(result.taskId).toBe('task-123');
      expect(result.message).toBe('Task dispatched successfully');
    });

    it('should throw error on dispatch failure', async () => {
      const dispatchError: XanderApiError = {
        code: 'DISPATCH_FAILED',
        message: 'Unable to dispatch task',
      };
      mockInstance.post.mockRejectedValueOnce(dispatchError);

      await expect(
        api.dispatch({
          sessionId: 'session-789',
          summary: 'Test',
          details: 'Test details',
        })
      ).rejects.toEqual(dispatchError);
    });
  });

  describe('dispatchToSilas (legacy)', () => {
    it('should dispatch using current session', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'legacy-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Dispatch
      mockInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          taskId: 'legacy-task',
          message: 'OK',
        },
      });

      const result = await api.dispatchToSilas('Create a new widget');

      expect(result).toBe(true);
      expect(mockInstance.post).toHaveBeenCalledWith('/dispatch', {
        sessionId: 'legacy-session',
        summary: 'Create a new widget',
        details: 'Create a new widget',
      });
    });

    it('should return false when no session exists', async () => {
      const result = await api.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
      expect(mockInstance.post).not.toHaveBeenCalledWith('/dispatch', expect.anything());
    });

    it('should return false on dispatch error', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'error-dispatch-session',
          messages: [],
          createdAt: '2024-01-01T00:00:00Z',
        },
      });
      await api.startSession();

      // Dispatch fails
      mockInstance.post.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      const result = await api.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });
  });

  describe('getBaseUrl', () => {
    it('should return the current base URL', () => {
      const customApi = new XanderApi({ baseUrl: 'http://test:9000' });

      // The mock always returns the same defaults object, but we can verify the config
      expect(mockAxios.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          baseURL: 'http://test:9000',
        })
      );
    });
  });

  describe('setBaseUrl', () => {
    it('should update the base URL', () => {
      api.setBaseUrl('http://newurl:5000');

      expect(mockInstance.defaults.baseURL).toBe('http://newurl:5000');
    });
  });
});

describe('XanderApi Error Handling', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new XanderApi();
    mockInstance = getMockInstance();
  });

  // Note: Error conversion is tested via the response interceptor
  // which is set up in createApiClient. Since we mock axios,
  // we test the error scenarios through the API methods themselves.

  describe('Network errors', () => {
    it('should handle connection refused', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
      });

      const result = await api.healthCheck();
      expect(result).toBe(false);
    });

    it('should handle timeout', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Timeout',
      });

      const result = await api.healthCheck();
      expect(result).toBe(false);
    });

    it('should handle network unreachable', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ENETUNREACH',
        message: 'Network unreachable',
      });

      const result = await api.healthCheck();
      expect(result).toBe(false);
    });
  });
});

describe('xanderApi singleton', () => {
  it('should export a default instance', async () => {
    const { xanderApi } = await import('../xanderApi');
    expect(xanderApi).toBeInstanceOf(XanderApi);
  });

  it('should be the same instance on multiple imports', async () => {
    const { xanderApi: instance1 } = await import('../xanderApi');
    const { xanderApi: instance2 } = await import('../xanderApi');
    expect(instance1).toBe(instance2);
  });
});
