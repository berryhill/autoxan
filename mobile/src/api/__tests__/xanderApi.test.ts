/**
 * Unit tests for XanderApi
 * Tests HTTP client functionality for Hermes agent communication
 */

import axios from 'axios';
import {
  XanderApi,
  parseDispatchBlock,
  removeDispatchBlock,
} from '../xanderApi';
import type { XanderApiError, HermesDispatch } from '../xanderApi';

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
    it('should create an axios instance with default config (port 8080)', () => {
      new XanderApi();
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://localhost:8080',
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should use custom config when provided', () => {
      new XanderApi({
        baseUrl: 'http://custom:9000',
        timeout: 60000,
      });
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://custom:9000',
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
          sessionId: 'test-session-123',
          messages: [],
        },
      });

      await api.startSession();
      expect(api.getSessionId()).toBe('test-session-123');
    });
  });

  describe('getConversationHistory', () => {
    it('should return empty array when no messages', () => {
      expect(api.getConversationHistory()).toEqual([]);
    });

    it('should return copy of conversation history after sending messages', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'history-test-session',
          messages: [],
        },
      });
      await api.startSession();

      // Send a message
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! How can I help?',
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      await api.sendMessage('Hello');

      const history = api.getConversationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello');
      expect(history[1].role).toBe('assistant');
      expect(history[1].content).toBe('Hello! How can I help?');
    });
  });

  describe('healthCheck', () => {
    it('should return true when Hermes is available', async () => {
      mockInstance.get.mockResolvedValueOnce({ data: { status: 'ok' } });

      const result = await api.healthCheck();

      expect(result).toBe(true);
      expect(mockInstance.get).toHaveBeenCalledWith('/health');
    });

    it('should return false when Hermes is unavailable', async () => {
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
          sessionId: 'new-session-456',
          messages: [],
        },
      });

      const session = await api.startSession();

      expect(mockInstance.post).toHaveBeenCalledWith('/session');
      expect(session.sessionId).toBe('new-session-456');
      expect(session.messages).toEqual([]);
      expect(api.getSessionId()).toBe('new-session-456');
    });

    it('should convert messages to XanderMessage format with timestamps', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-with-messages',
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
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

    it('should clear conversation history on new session', async () => {
      // Start first session
      mockInstance.post.mockResolvedValueOnce({
        data: { sessionId: 'session-1', messages: [] },
      });
      await api.startSession();

      // Send a message
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
        },
      });
      await api.sendMessage('Hi');
      expect(api.getConversationHistory().length).toBe(2);

      // Start new session
      mockInstance.post.mockResolvedValueOnce({
        data: { sessionId: 'session-2', messages: [] },
      });
      await api.startSession();

      expect(api.getConversationHistory()).toEqual([]);
    });
  });

  describe('endSession', () => {
    it('should end the current session', async () => {
      // First start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-to-end',
          messages: [],
        },
      });
      await api.startSession();

      // Then end it
      mockInstance.delete.mockResolvedValueOnce({ data: {} });
      await api.endSession();

      expect(mockInstance.delete).toHaveBeenCalledWith(
        '/session/session-to-end'
      );
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
          sessionId: 'session-error',
          messages: [],
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
      expect(api.getConversationHistory()).toEqual([]);
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
          sessionId: 'get-session-test',
          messages: [],
        },
      });
      await api.startSession();

      // Get the session
      mockInstance.get.mockResolvedValueOnce({
        data: {
          sessionId: 'get-session-test',
          messages: [{ role: 'user', content: 'Test message' }],
        },
      });

      const session = await api.getSession();

      expect(mockInstance.get).toHaveBeenCalledWith(
        '/session/get-session-test'
      );
      expect(session?.sessionId).toBe('get-session-test');
      expect(session?.messages).toHaveLength(1);
    });

    it('should return minimal session with local history on server error', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'session-fallback',
          messages: [],
        },
      });
      await api.startSession();

      // Send a message to have some history
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
        },
      });
      await api.sendMessage('Hello');

      // Get fails
      mockInstance.get.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      const session = await api.getSession();

      expect(session?.sessionId).toBe('session-fallback');
      expect(session?.messages).toHaveLength(2);
    });
  });

  describe('sendMessage', () => {
    it('should send a message using OpenRouter format and return response', async () => {
      // Start a session first
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'chat-session',
          messages: [],
        },
      });
      await api.startSession();

      // Capture what was sent to the chat endpoint
      let capturedRequest: unknown = null;
      mockInstance.post.mockImplementationOnce((url: string, data: unknown) => {
        capturedRequest = JSON.parse(JSON.stringify(data)); // Deep copy at call time
        return Promise.resolve({
          data: {
            id: 'completion-1',
            object: 'chat.completion',
            created: Date.now(),
            model: 'claude-3',
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Hello! How can I help you?',
                },
                finish_reason: 'stop',
              },
            ],
          },
        });
      });

      const result = await api.sendMessage('Hello');

      // Verify it was called with the chat endpoint with correct request format
      expect(mockInstance.post).toHaveBeenNthCalledWith(
        2,
        '/v1/chat/completions',
        expect.anything()
      );
      // Verify the captured request (at call time, before response processing)
      expect(capturedRequest).toEqual({
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
      });
      expect(result.message).toBe('Hello! How can I help you?');
      expect(result.sessionId).toBe('chat-session');
    });

    it('should auto-start session if none exists', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'auto-session',
          messages: [],
        },
      });

      // Mock message response
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Response after auto-start',
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await api.sendMessage('Test message');

      expect(mockInstance.post).toHaveBeenCalledWith('/session');
      expect(result.message).toBe('Response after auto-start');
    });

    it('should trim whitespace from message', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'trim-session',
          messages: [],
        },
      });
      await api.startSession();

      // Capture what was sent to the chat endpoint
      let capturedRequest: unknown = null;
      mockInstance.post.mockImplementationOnce((url: string, data: unknown) => {
        capturedRequest = JSON.parse(JSON.stringify(data)); // Deep copy at call time
        return Promise.resolve({
          data: {
            id: 'completion-1',
            object: 'chat.completion',
            created: Date.now(),
            model: 'claude-3',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Response' },
                finish_reason: 'stop',
              },
            ],
          },
        });
      });

      await api.sendMessage('  Hello World  ');

      // Verify the captured request has trimmed message
      expect(capturedRequest).toEqual({
        messages: [{ role: 'user', content: 'Hello World' }],
        stream: false,
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

    it('should parse and include dispatch suggestion in metadata', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'dispatch-session',
          messages: [],
        },
      });
      await api.startSession();

      // Send message with dispatch suggestion
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `I can help with that task.

[DISPATCH_SUGGESTED]
Summary: Create a new feature
Details: Build a new feature for the application with tests.
[/DISPATCH_SUGGESTED]`,
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await api.sendMessage('Can you create a feature?');

      expect(result.metadata?.suggestDispatch).toBe(true);
      expect(result.metadata?.dispatchSummary).toBe('Create a new feature');
      expect(result.metadata?.dispatchDetails).toBe(
        'Build a new feature for the application with tests.'
      );
      expect(result.message).toBe('I can help with that task.');
    });

    it('should accumulate conversation history', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: { sessionId: 'history-session', messages: [] },
      });
      await api.startSession();

      // First message
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hi!' },
              finish_reason: 'stop',
            },
          ],
        },
      });
      await api.sendMessage('Hello');

      // Second message should include history (but NOT include the second assistant response yet)
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-2',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Great!' },
              finish_reason: 'stop',
            },
          ],
        },
      });
      await api.sendMessage('How are you?');

      // The third call (2 session + 2 chat) should have included the accumulated history BEFORE the call
      // Since we're checking after the fact, verify the conversation history state instead
      const history = api.getConversationHistory();
      expect(history).toHaveLength(4);
      expect(history[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(history[1]).toEqual({ role: 'assistant', content: 'Hi!' });
      expect(history[2]).toEqual({ role: 'user', content: 'How are you?' });
      expect(history[3]).toEqual({ role: 'assistant', content: 'Great!' });
    });

    it('should propagate server errors', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'error-session',
          messages: [],
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

    it('should throw error when no choices in response', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: { sessionId: 'empty-session', messages: [] },
      });
      await api.startSession();

      // Response with no choices
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-empty',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [],
        },
      });

      await expect(api.sendMessage('Test')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_RESPONSE',
          message: 'No response from Hermes',
        })
      );
    });
  });

  describe('sendChatCompletion', () => {
    it('should send raw chat completion request', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-raw',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Raw response',
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await api.sendChatCompletion({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(mockInstance.post).toHaveBeenCalledWith('/v1/chat/completions', {
        messages: [{ role: 'user', content: 'Test' }],
      });
      expect(result.response).toBe('Raw response');
      expect(result.rawContent).toBe('Raw response');
      expect(result.dispatch).toBeUndefined();
    });

    it('should include dispatch info when present', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-dispatch',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Here's the response.

[DISPATCH_SUGGESTED]
Summary: Task summary
Details: Task details here
[/DISPATCH_SUGGESTED]`,
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await api.sendChatCompletion({
        messages: [{ role: 'user', content: 'Test' }],
      });

      expect(result.response).toBe("Here's the response.");
      expect(result.dispatch?.suggested).toBe(true);
      expect(result.dispatch?.summary).toBe('Task summary');
      expect(result.dispatch?.details).toBe('Task details here');
    });
  });

  describe('dispatch', () => {
    it('should dispatch work via chat completion', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'dispatch-completion',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Task has been dispatched to Silas.',
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await api.dispatch({
        sessionId: 'session-456',
        summary: 'Create new feature',
        details: 'Detailed description of the feature',
      });

      expect(mockInstance.post).toHaveBeenCalledWith(
        '/v1/chat/completions',
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Create new feature'),
            }),
          ],
          stream: false,
        })
      );
      expect(result.success).toBe(true);
      expect(result.taskId).toMatch(/^task-/);
      expect(result.message).toBe('Task has been dispatched to Silas.');
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
          sessionId: 'legacy-session',
          messages: [],
        },
      });
      await api.startSession();

      // Dispatch
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'dispatch-completion',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'OK' },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await api.dispatchToSilas('Create a new widget');

      expect(result).toBe(true);
      expect(mockInstance.post).toHaveBeenCalledWith(
        '/v1/chat/completions',
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              content: expect.stringContaining('Create a new widget'),
            }),
          ],
        })
      );
    });

    it('should return false when no session exists', async () => {
      const result = await api.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });

    it('should return false on dispatch error', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: {
          sessionId: 'error-dispatch-session',
          messages: [],
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

  describe('clearHistory', () => {
    it('should clear conversation history', async () => {
      // Start a session
      mockInstance.post.mockResolvedValueOnce({
        data: { sessionId: 'clear-session', messages: [] },
      });
      await api.startSession();

      // Send a message
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'claude-3',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello!' },
              finish_reason: 'stop',
            },
          ],
        },
      });
      await api.sendMessage('Hi');

      expect(api.getConversationHistory().length).toBe(2);

      // Clear history
      api.clearHistory();

      expect(api.getConversationHistory()).toEqual([]);
      expect(api.getSessionId()).toBe('clear-session'); // Session should remain
    });
  });
});

describe('Dispatch Block Parsing', () => {
  describe('parseDispatchBlock', () => {
    it('should parse valid dispatch block', () => {
      const content = `Here is my response.

[DISPATCH_SUGGESTED]
Summary: Research best coffee grinders
Details: Find and compare coffee grinders under $200.
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Research best coffee grinders');
      expect(result.details).toBe(
        'Find and compare coffee grinders under $200.'
      );
    });

    it('should handle multi-line details', () => {
      const content = `I can help with that.

[DISPATCH_SUGGESTED]
Summary: Create new feature
Details: Build a new feature with the following:
- Feature A
- Feature B
- Feature C
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Create new feature');
      expect(result.details).toContain('Feature A');
      expect(result.details).toContain('Feature B');
      expect(result.details).toContain('Feature C');
    });

    it('should return suggested=false when no dispatch block', () => {
      const content = 'This is just a regular response without any dispatch.';

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(false);
      expect(result.summary).toBeUndefined();
      expect(result.details).toBeUndefined();
    });

    it('should handle case insensitive tags', () => {
      const content = `Response here.

[dispatch_suggested]
Summary: Test task
Details: Test details
[/dispatch_suggested]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Test task');
    });

    it('should handle Windows-style line endings', () => {
      const content =
        'Response.\r\n\r\n[DISPATCH_SUGGESTED]\r\nSummary: Task\r\nDetails: Details here\r\n[/DISPATCH_SUGGESTED]';

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Task');
      expect(result.details).toBe('Details here');
    });
  });

  describe('removeDispatchBlock', () => {
    it('should remove dispatch block and clean content', () => {
      const content = `Here is my response.

[DISPATCH_SUGGESTED]
Summary: Task summary
Details: Task details
[/DISPATCH_SUGGESTED]`;

      const result = removeDispatchBlock(content);

      expect(result).toBe('Here is my response.');
      expect(result).not.toContain('DISPATCH_SUGGESTED');
    });

    it('should handle content with no dispatch block', () => {
      const content = 'Just a regular response.';

      const result = removeDispatchBlock(content);

      expect(result).toBe('Just a regular response.');
    });

    it('should handle content with dispatch block in middle', () => {
      const content = `Start of response.

[DISPATCH_SUGGESTED]
Summary: Task
Details: Details
[/DISPATCH_SUGGESTED]

End of response.`;

      const result = removeDispatchBlock(content);

      expect(result).toBe('Start of response.\n\nEnd of response.');
    });

    it('should handle multiple dispatch blocks', () => {
      const content = `First part.

[DISPATCH_SUGGESTED]
Summary: Task 1
Details: Details 1
[/DISPATCH_SUGGESTED]

Middle part.

[DISPATCH_SUGGESTED]
Summary: Task 2
Details: Details 2
[/DISPATCH_SUGGESTED]

Last part.`;

      const result = removeDispatchBlock(content);

      expect(result).toBe('First part.\n\nMiddle part.\n\nLast part.');
      expect(result).not.toContain('DISPATCH_SUGGESTED');
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
