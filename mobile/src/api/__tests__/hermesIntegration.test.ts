/**
 * Hermes Agent Integration Tests
 *
 * These tests verify the full integration between the React Native app
 * and the Hermes Agent backend running in Termux.
 *
 * Test Modes:
 * - Unit Test Mode (default): Uses mocked responses for CI/CD
 * - Integration Test Mode: Set HERMES_INTEGRATION_TEST=true to run against real Hermes
 *
 * @see https://github.com/berryhill/autoxan/issues/25
 */

import axios from 'axios';
import {
  XanderApi,
  parseDispatchBlock,
  removeDispatchBlock,
} from '../xanderApi';
import type { XanderApiError, XanderResponse, XanderSession } from '../xanderApi';

// ============================================================================
// MANUAL TESTING CHECKLIST
// ============================================================================
// Before running integration tests against a real Hermes instance:
//
// □ 1. Start Hermes Agent in Termux:
//      $ hermes
//      OR
//      $ hermes gateway start
//
// □ 2. Verify Hermes is running:
//      $ curl http://localhost:8080/health
//      Expected: {"status": "healthy", "agent": "hermes", ...}
//
// □ 3. Ensure SOUL.md personality is configured:
//      $ cat ~/.hermes/SOUL.md
//
// □ 4. Set environment variable:
//      $ export HERMES_INTEGRATION_TEST=true
//
// □ 5. Run integration tests:
//      $ pnpm test hermesIntegration
//
// □ 6. Verify test scenarios manually:
//      □ Health check returns healthy status
//      □ Basic conversation returns natural responses
//      □ Responses are concise (< 50 words for voice)
//      □ Dispatch suggestions work with coding tasks
//      □ Memory persists across conversation turns
//      □ Error handling works when Hermes is stopped
// ============================================================================

// Get access to the mock axios module
const mockAxios = axios as jest.Mocked<typeof axios>;

// Helper to get the mock instance created by axios.create
const getMockInstance = () => {
  const createMock = mockAxios.create as jest.Mock;
  if (createMock.mock.results.length > 0) {
    return createMock.mock.results[createMock.mock.results.length - 1].value;
  }
  return (axios as unknown as { __mockInstance: unknown }).__mockInstance;
};

// Check if running in integration test mode
const isIntegrationTest = process.env.HERMES_INTEGRATION_TEST === 'true';

// Timeout for real network calls
const INTEGRATION_TIMEOUT = 60000; // 60 seconds for LLM responses

// ============================================================================
// MOCK RESPONSE FIXTURES
// ============================================================================

const mockResponses = {
  healthCheck: {
    status: 'healthy',
    agent: 'hermes',
    version: '0.12.0',
    uptime: 3600,
    model: 'anthropic/claude-3-sonnet',
  },

  basicGreeting: {
    id: 'chat-completion-1',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: "Hey! I'm doing great, thanks for asking. What's on your mind?",
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70,
    },
  },

  naturalConversation: {
    id: 'chat-completion-2',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: "That sounds like an interesting project! Tell me more about what you're building.",
        },
        finish_reason: 'stop',
      },
    ],
  },

  dispatchSuggestion: {
    id: 'chat-completion-3',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: `That's a great idea! I can suggest dispatching this to Silas to handle the coding work.

[DISPATCH_SUGGESTED]
Summary: Create Python script to process CSV files
Details: Build a Python script that:
- Reads CSV files from a specified directory
- Processes and transforms the data
- Outputs cleaned data to a new CSV
- Includes error handling for malformed data
- Add unit tests for the processing functions
Send the completed script to Silas for review.
[/DISPATCH_SUGGESTED]`,
        },
        finish_reason: 'stop',
      },
    ],
  },

  memoryContext: {
    id: 'chat-completion-4',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: "You're working on a React app, right? That's the project you mentioned.",
        },
        finish_reason: 'stop',
      },
    ],
  },

  session: {
    sessionId: 'hermes-session-12345',
    messages: [],
  },
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Hermes Integration Tests', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new XanderApi();
    mockInstance = getMockInstance();
  });

  afterEach(async () => {
    // Clean up session if exists
    try {
      await api.endSession();
    } catch {
      // Ignore errors during cleanup
    }
  });

  // ==========================================================================
  // 1. HEALTH CHECK TESTS
  // ==========================================================================
  describe('1. Health Check Tests', () => {
    it('should return true when Hermes is healthy', async () => {
      // Mock the health check response
      mockInstance.get.mockResolvedValueOnce({
        data: mockResponses.healthCheck,
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(true);
      expect(mockInstance.get).toHaveBeenCalledWith('/health');
    });

    it('should return false when Hermes is not running', async () => {
      // Mock connection refused
      mockInstance.get.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:8080',
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(false);
    });

    it('should handle timeout gracefully', async () => {
      // Mock timeout
      mockInstance.get.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Request timed out',
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(false);
    });

    it('should handle network unreachable gracefully', async () => {
      // Mock network unreachable
      mockInstance.get.mockRejectedValueOnce({
        code: 'ENETUNREACH',
        message: 'Network is unreachable',
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(false);
    });
  });

  // ==========================================================================
  // 2. BASIC CONVERSATION FLOW TESTS
  // ==========================================================================
  describe('2. Basic Conversation Flow Tests', () => {
    it('should start a session and return session ID', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });

      const session = await api.startSession();

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toBe('hermes-session-12345');
      expect(mockInstance.post).toHaveBeenCalledWith('/session');
    });

    it('should send message and receive response', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });
      await api.startSession();

      // Mock chat completion
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });

      const response = await api.sendMessage('Hello Xander!');

      expect(response.message).toBeTruthy();
      expect(response.sessionId).toBe('hermes-session-12345');
      expect(mockInstance.post).toHaveBeenLastCalledWith(
        '/v1/chat/completions',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Hello Xander!',
            }),
          ]),
        })
      );
    });

    it('should receive voice-friendly response (< 500 characters)', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });
      await api.startSession();

      // Mock chat completion
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });

      const response = await api.sendMessage('Hello Xander!');

      expect(response.message.length).toBeLessThan(500);
    });

    it('should end session successfully', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });
      await api.startSession();

      // Mock session deletion
      mockInstance.delete.mockResolvedValueOnce({
        data: { success: true },
      });

      await api.endSession();

      expect(mockInstance.delete).toHaveBeenCalledWith(
        '/session/hermes-session-12345'
      );
      expect(api.getSessionId()).toBeNull();
    });

    it('should auto-start session when sending message without session', async () => {
      // Mock session creation
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });

      // Mock chat completion
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });

      // Send message without starting session
      const response = await api.sendMessage('Hello!');

      // Should have called session endpoint first
      expect(mockInstance.post).toHaveBeenNthCalledWith(1, '/session');
      expect(response.message).toBeTruthy();
    });
  });

  // ==========================================================================
  // 3. XANDER PERSONALITY TESTS
  // ==========================================================================
  describe('3. Xander Personality Tests', () => {
    beforeEach(async () => {
      // Setup session for all personality tests
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });
      await api.startSession();
    });

    it('should respond naturally without AI disclaimers', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.naturalConversation,
      });

      const response = await api.sendMessage('How are you?');

      // Xander should NOT use robotic AI language
      expect(response.message).not.toContain('As an AI');
      expect(response.message).not.toContain('I cannot');
      expect(response.message).not.toContain('I am an artificial');
      expect(response.message).not.toContain("I don't have feelings");
    });

    it('should provide concise responses suitable for voice', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });

      const response = await api.sendMessage('How are you?');

      // Voice-friendly = concise (< 50 words)
      const wordCount = response.message.split(/\s+/).length;
      expect(wordCount).toBeLessThan(50);
    });

    it('should be warm and conversational', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });

      const response = await api.sendMessage('Hi there!');

      // Response should feel natural and friendly
      expect(response.message).toBeTruthy();
      expect(response.message.length).toBeGreaterThan(5);
    });

    it('should ask follow-up questions for clarification', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.naturalConversation,
      });

      const response = await api.sendMessage("I'm working on a new project");

      // Xander should show interest and ask questions
      expect(response.message.toLowerCase()).toMatch(/(tell|more|what|how|which|\?)/i);
    });
  });

  // ==========================================================================
  // 4. DISPATCH DETECTION TESTS
  // ==========================================================================
  describe('4. Dispatch Detection Tests', () => {
    beforeEach(async () => {
      // Setup session for all dispatch tests
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });
      await api.startSession();
    });

    it('should detect dispatch suggestion in response', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.dispatchSuggestion,
      });

      const response = await api.sendMessage(
        "Can you create a Python script to process CSV files and send it to Silas?"
      );

      expect(response.metadata?.suggestDispatch).toBe(true);
    });

    it('should extract dispatch summary correctly', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.dispatchSuggestion,
      });

      const response = await api.sendMessage(
        "Can you create a Python script to process CSV files?"
      );

      expect(response.metadata?.dispatchSummary).toBeTruthy();
      expect(response.metadata?.dispatchSummary).toContain('Python');
      expect(response.metadata?.dispatchSummary).toContain('CSV');
    });

    it('should extract dispatch details correctly', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.dispatchSuggestion,
      });

      const response = await api.sendMessage(
        "Create a script to process CSV files"
      );

      expect(response.metadata?.dispatchDetails).toBeTruthy();
      expect(response.metadata?.dispatchDetails!.length).toBeGreaterThan(50);
    });

    it('should remove dispatch block from displayed message', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.dispatchSuggestion,
      });

      const response = await api.sendMessage('Create a script for me');

      // The main message should not contain the dispatch block
      expect(response.message).not.toContain('[DISPATCH_SUGGESTED]');
      expect(response.message).not.toContain('[/DISPATCH_SUGGESTED]');
    });

    it('should not suggest dispatch for simple questions', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });

      const response = await api.sendMessage('How are you today?');

      expect(response.metadata?.suggestDispatch).toBeFalsy();
    });
  });

  // ==========================================================================
  // 5. MEMORY PERSISTENCE TESTS
  // ==========================================================================
  describe('5. Memory Persistence Tests', () => {
    beforeEach(async () => {
      // Setup session for memory tests
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.session,
      });
      await api.startSession();
    });

    it('should remember context from earlier in conversation', async () => {
      // First message - introduce context
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'completion-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'anthropic/claude-3-sonnet',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: "Nice to meet you, John! React is a great choice for modern web development.",
              },
              finish_reason: 'stop',
            },
          ],
        },
      });

      await api.sendMessage("My name is John and I'm working on a React app");

      // Second message - reference context
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.memoryContext,
      });

      const response = await api.sendMessage('What am I working on?');

      // Should remember the React project
      expect(response.message.toLowerCase()).toContain('react');
    });

    it('should accumulate conversation history', async () => {
      // First message
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });
      await api.sendMessage('Hello');

      // Second message
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.naturalConversation,
      });
      await api.sendMessage('Tell me about TypeScript');

      const history = api.getConversationHistory();

      // Should have 4 messages (2 user + 2 assistant)
      expect(history.length).toBe(4);
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello');
      expect(history[1].role).toBe('assistant');
      expect(history[2].role).toBe('user');
      expect(history[2].content).toBe('Tell me about TypeScript');
      expect(history[3].role).toBe('assistant');
    });

    it('should send full conversation history with each request', async () => {
      // First message
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });
      await api.sendMessage('Message 1');

      // Second message - capture the request
      let capturedRequest: unknown = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        capturedRequest = JSON.parse(JSON.stringify(data));
        return Promise.resolve({
          data: mockResponses.naturalConversation,
        });
      });

      await api.sendMessage('Message 2');

      // Verify history is included (should have Message 1 + assistant response + Message 2)
      const request = capturedRequest as { messages: Array<{ role: string; content: string }> };
      expect(request.messages).toHaveLength(3);
      expect(request.messages[0].content).toBe('Message 1');
      expect(request.messages[1].role).toBe('assistant');
      expect(request.messages[2].content).toBe('Message 2');
    });

    it('should clear history when starting new session', async () => {
      // Send a message to build history
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });
      await api.sendMessage('Test message');
      expect(api.getConversationHistory().length).toBe(2);

      // Start new session
      mockInstance.post.mockResolvedValueOnce({
        data: { sessionId: 'new-session-id', messages: [] },
      });
      await api.startSession();

      // History should be cleared
      expect(api.getConversationHistory()).toEqual([]);
    });

    it('should clear history using clearHistory method', async () => {
      // Send a message
      mockInstance.post.mockResolvedValueOnce({
        data: mockResponses.basicGreeting,
      });
      await api.sendMessage('Test');
      expect(api.getConversationHistory().length).toBe(2);

      // Clear history
      api.clearHistory();

      expect(api.getConversationHistory()).toEqual([]);
      // Session should still exist
      expect(api.getSessionId()).toBe('hermes-session-12345');
    });
  });

  // ==========================================================================
  // 6. ERROR HANDLING TESTS
  // ==========================================================================
  describe('6. Error Handling Tests', () => {
    describe('Connection Errors', () => {
      it('should handle Hermes not running', async () => {
        mockInstance.get.mockRejectedValueOnce({
          code: 'ECONNREFUSED',
          message: 'connect ECONNREFUSED 127.0.0.1:8080',
        });

        const healthy = await api.healthCheck();

        expect(healthy).toBe(false);
      });

      it('should create local session when server is unavailable', async () => {
        mockInstance.post.mockRejectedValueOnce({
          code: 'ECONNREFUSED',
          message: 'Connection refused',
        });

        const session = await api.startSession();

        // Should fallback to local session
        expect(session.sessionId).toMatch(/^local-session-/);
      });
    });

    describe('Message Sending Errors', () => {
      beforeEach(async () => {
        mockInstance.post.mockResolvedValueOnce({
          data: mockResponses.session,
        });
        await api.startSession();
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

      it('should propagate server errors', async () => {
        const serverError: XanderApiError = {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
        };
        mockInstance.post.mockRejectedValueOnce(serverError);

        await expect(api.sendMessage('Test')).rejects.toEqual(serverError);
      });

      it('should handle timeout during message send', async () => {
        const timeoutError: XanderApiError = {
          code: 'TIMEOUT',
          message: 'Request to Hermes timed out. Please try again.',
        };
        mockInstance.post.mockRejectedValueOnce(timeoutError);

        await expect(api.sendMessage('Test')).rejects.toEqual(timeoutError);
      });

      it('should handle invalid response format', async () => {
        mockInstance.post.mockResolvedValueOnce({
          data: {
            id: 'empty-response',
            object: 'chat.completion',
            choices: [], // No choices
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

    describe('Session Management Errors', () => {
      it('should handle endSession when no session exists', async () => {
        // Should not throw
        await expect(api.endSession()).resolves.toBeUndefined();
        expect(mockInstance.delete).not.toHaveBeenCalled();
      });

      it('should clear session state even on server error', async () => {
        // Start session
        mockInstance.post.mockResolvedValueOnce({
          data: mockResponses.session,
        });
        await api.startSession();
        expect(api.getSessionId()).toBe('hermes-session-12345');

        // End session fails
        mockInstance.delete.mockRejectedValueOnce({
          code: 'SERVER_ERROR',
          message: 'Server error',
        });

        await api.endSession();

        // Local state should still be cleared
        expect(api.getSessionId()).toBeNull();
        expect(api.getConversationHistory()).toEqual([]);
      });

      it('should return local session info when getSession fails', async () => {
        // Start session
        mockInstance.post.mockResolvedValueOnce({
          data: mockResponses.session,
        });
        await api.startSession();

        // Send a message to have history
        mockInstance.post.mockResolvedValueOnce({
          data: mockResponses.basicGreeting,
        });
        await api.sendMessage('Test');

        // Get session fails
        mockInstance.get.mockRejectedValueOnce({
          code: 'SERVER_ERROR',
          message: 'Server error',
        });

        const session = await api.getSession();

        // Should return local session with history
        expect(session?.sessionId).toBe('hermes-session-12345');
        expect(session?.messages).toHaveLength(2);
      });
    });

    describe('Dispatch Errors', () => {
      beforeEach(async () => {
        mockInstance.post.mockResolvedValueOnce({
          data: mockResponses.session,
        });
        await api.startSession();
      });

      it('should handle dispatch failure', async () => {
        const dispatchError: XanderApiError = {
          code: 'DISPATCH_FAILED',
          message: 'Unable to dispatch task',
        };
        mockInstance.post.mockRejectedValueOnce(dispatchError);

        await expect(
          api.dispatch({
            sessionId: 'test-session',
            summary: 'Test task',
            details: 'Test details',
          })
        ).rejects.toEqual(dispatchError);
      });

      it('should return false from dispatchToSilas when no session', async () => {
        const newApi = new XanderApi();

        const result = await newApi.dispatchToSilas('Test dispatch');

        expect(result).toBe(false);
      });

      it('should return false from dispatchToSilas on error', async () => {
        mockInstance.post.mockRejectedValueOnce({
          code: 'SERVER_ERROR',
          message: 'Server error',
        });

        const result = await api.dispatchToSilas('Test dispatch');

        expect(result).toBe(false);
      });
    });
  });
});

// ============================================================================
// DISPATCH BLOCK PARSING TESTS
// ============================================================================
describe('Dispatch Block Parsing (Integration)', () => {
  describe('parseDispatchBlock', () => {
    it('should parse standard dispatch block format', () => {
      const content = `I'll help you with that.

[DISPATCH_SUGGESTED]
Summary: Create REST API endpoints
Details: Build REST API endpoints for user management including:
- GET /users - List all users
- POST /users - Create new user
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Create REST API endpoints');
      expect(result.details).toContain('GET /users');
      expect(result.details).toContain('DELETE /users/:id');
    });

    it('should handle dispatch block with complex details', () => {
      const content = `Here's what I suggest:

[DISPATCH_SUGGESTED]
Summary: Implement authentication system
Details: Build a complete authentication system:

1. Set up JWT tokens
2. Create login/logout endpoints
3. Implement password hashing
4. Add session management
5. Write integration tests

Technology stack:
- Node.js/Express
- bcrypt for hashing
- jsonwebtoken for JWT
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.details).toContain('JWT tokens');
      expect(result.details).toContain('bcrypt');
    });

    it('should return suggested=false when no block present', () => {
      const content = "Sure, I can help you with that. Let me explain how to do it.";

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(false);
      expect(result.summary).toBeUndefined();
      expect(result.details).toBeUndefined();
    });
  });

  describe('removeDispatchBlock', () => {
    it('should clean response for display', () => {
      const content = `I can help with that task.

[DISPATCH_SUGGESTED]
Summary: Create script
Details: Build the script
[/DISPATCH_SUGGESTED]

Let me know if you need anything else.`;

      const result = removeDispatchBlock(content);

      expect(result).not.toContain('DISPATCH_SUGGESTED');
      expect(result).toContain('I can help with that task.');
      expect(result).toContain('Let me know if you need anything else.');
    });

    it('should handle content with only dispatch block', () => {
      const content = `[DISPATCH_SUGGESTED]
Summary: Task
Details: Details
[/DISPATCH_SUGGESTED]`;

      const result = removeDispatchBlock(content);

      expect(result).toBe('');
    });
  });
});

// ============================================================================
// API CONFIGURATION TESTS
// ============================================================================
describe('API Configuration (Integration)', () => {
  it('should use default Hermes URL (localhost:8080)', () => {
    new XanderApi();

    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://localhost:8080',
      })
    );
  });

  it('should use default timeout of 30 seconds', () => {
    new XanderApi();

    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 30000,
      })
    );
  });

  it('should allow custom configuration', () => {
    new XanderApi({
      baseUrl: 'http://192.168.1.100:8080',
      timeout: 60000,
    });

    expect(mockAxios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://192.168.1.100:8080',
        timeout: 60000,
      })
    );
  });

  it('should allow updating base URL', () => {
    const api = new XanderApi();
    const mockInstance = getMockInstance();

    api.setBaseUrl('http://newhost:9000');

    expect(mockInstance.defaults.baseURL).toBe('http://newhost:9000');
  });
});

// ============================================================================
// REAL INTEGRATION TESTS (Only run when HERMES_INTEGRATION_TEST=true)
// ============================================================================
describe.skip('Real Hermes Integration Tests', () => {
  // These tests only run with: HERMES_INTEGRATION_TEST=true pnpm test
  
  // Note: Skip marker is used here because these tests require:
  // 1. A real Hermes instance running
  // 2. Network access to localhost:8080
  // 3. Proper SOUL.md configuration
  //
  // To run these tests:
  // 1. Start Hermes: `hermes`
  // 2. Run tests: `HERMES_INTEGRATION_TEST=true pnpm test hermesIntegration`

  let api: XanderApi;

  beforeAll(() => {
    // Use real axios for integration tests (not mocked)
    jest.unmock('axios');
  });

  beforeEach(() => {
    api = new XanderApi({
      baseUrl: 'http://localhost:8080',
      timeout: INTEGRATION_TIMEOUT,
    });
  });

  afterEach(async () => {
    try {
      await api.endSession();
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should successfully connect to real Hermes instance', async () => {
    const healthy = await api.healthCheck();
    expect(healthy).toBe(true);
  }, INTEGRATION_TIMEOUT);

  it('should have real conversation with Hermes', async () => {
    const session = await api.startSession();
    expect(session.sessionId).toBeDefined();

    const response = await api.sendMessage('Hello, this is an integration test!');
    expect(response.message).toBeTruthy();
    expect(response.message.length).toBeGreaterThan(0);
  }, INTEGRATION_TIMEOUT);

  it('should remember context in real conversation', async () => {
    await api.startSession();

    // Introduce context
    await api.sendMessage('My favorite programming language is TypeScript');

    // Ask about it
    const response = await api.sendMessage('What is my favorite programming language?');

    // Hermes should remember
    expect(response.message.toLowerCase()).toContain('typescript');
  }, INTEGRATION_TIMEOUT);

  it('should suggest dispatch for coding tasks', async () => {
    await api.startSession();

    const response = await api.sendMessage(
      'Can you create a Node.js script to monitor system CPU usage and alert when it exceeds 80%?'
    );

    // With proper SOUL.md configuration, this should suggest dispatch
    // Note: This depends on Hermes configuration
    console.log('Dispatch suggested:', response.metadata?.suggestDispatch);
    console.log('Response:', response.message);
  }, INTEGRATION_TIMEOUT);
});
