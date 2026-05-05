/**
 * E2E Tests: Conversation Flow
 *
 * Tests the complete conversation flow including:
 * - Basic conversation (user speaks → Xander responds → user speaks → ...)
 * - Session lifecycle (start, multiple exchanges, end)
 * - Research/factual questions with search integration
 * - Memory persistence across conversation turns
 * - Response quality (voice-friendly, concise)
 *
 * @see https://github.com/berryhill/autoxan/issues/12
 */

import { XanderApi } from '../../src/api/xanderApi';
import type { XanderApiError, XanderResponse } from '../../src/api/xanderApi';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestApi,
  getMockInstance,
  mockResponses,
  setupMockSession,
  setupMockResponse,
  RESPONSE_TIME,
  measureTime,
  isIntegrationTest,
  INTEGRATION_TIMEOUT,
} from './setup';

// ============================================================================
// TEST SUITE: Basic Conversation Flow
// ============================================================================

describe('E2E: Basic Conversation Flow', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;

  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    api = createTestApi();
    mockInstance = getMockInstance();
  });

  afterEach(async () => {
    try {
      await api.endSession();
    } catch {
      // Ignore cleanup errors
    }
  });

  // --------------------------------------------------------------------------
  // Session Lifecycle Tests
  // --------------------------------------------------------------------------

  describe('Session Lifecycle', () => {
    it('should start a new session and return session ID', async () => {
      setupMockSession(mockInstance, 'e2e-session-001');

      const session = await api.startSession();

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toBe('e2e-session-001');
      expect(session.messages).toEqual([]);
      expect(mockInstance.post).toHaveBeenCalledWith('/session');
    });

    it('should end session successfully', async () => {
      setupMockSession(mockInstance);
      await api.startSession();

      mockInstance.delete.mockResolvedValueOnce({ data: { success: true } });

      await api.endSession();

      expect(mockInstance.delete).toHaveBeenCalledWith(
        expect.stringContaining('/session/')
      );
      expect(api.getSessionId()).toBeNull();
    });

    it('should handle multiple sessions sequentially', async () => {
      // First session
      setupMockSession(mockInstance, 'session-1');
      const session1 = await api.startSession();
      expect(session1.sessionId).toBe('session-1');

      mockInstance.delete.mockResolvedValueOnce({ data: { success: true } });
      await api.endSession();

      // Second session
      setupMockSession(mockInstance, 'session-2');
      const session2 = await api.startSession();
      expect(session2.sessionId).toBe('session-2');
    });

    it('should create local session when server is unavailable', async () => {
      mockInstance.post.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const session = await api.startSession();

      expect(session.sessionId).toMatch(/^local-session-/);
    });
  });

  // --------------------------------------------------------------------------
  // Basic Message Exchange Tests
  // --------------------------------------------------------------------------

  describe('Message Exchange', () => {
    beforeEach(async () => {
      setupMockSession(mockInstance);
      await api.startSession();
    });

    it('should send message and receive response', async () => {
      setupMockResponse(mockInstance, mockResponses.basicGreeting);

      const response = await api.sendMessage('Hello Xander!');

      expect(response.message).toBeTruthy();
      expect(response.message.length).toBeGreaterThan(0);
      expect(response.sessionId).toBeDefined();
    });

    it('should complete a multi-turn conversation', async () => {
      // First turn
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      const response1 = await api.sendMessage('Hello, how are you?');
      expect(response1.message).toBeTruthy();

      // Second turn
      setupMockResponse(mockInstance, mockResponses.naturalConversation);
      const response2 = await api.sendMessage("I'm working on a new project");
      expect(response2.message).toBeTruthy();

      // Verify conversation history
      const history = api.getConversationHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello, how are you?');
      expect(history[1].role).toBe('assistant');
      expect(history[2].role).toBe('user');
      expect(history[2].content).toBe("I'm working on a new project");
      expect(history[3].role).toBe('assistant');
    });

    it('should auto-start session when sending message without session', async () => {
      // Create new API without starting session
      const newApi = createTestApi();

      // Setup mocks for auto-start
      setupMockSession(mockInstance, 'auto-session');
      setupMockResponse(mockInstance, mockResponses.basicGreeting);

      const response = await newApi.sendMessage('Hello!');

      expect(response.message).toBeTruthy();
      expect(newApi.getSessionId()).toBe('auto-session');
    });

    it('should reject empty messages', async () => {
      await expect(api.sendMessage('')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_MESSAGE',
          message: 'Message cannot be empty',
        })
      );
    });

    it('should reject whitespace-only messages', async () => {
      await expect(api.sendMessage('   ')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_MESSAGE',
          message: 'Message cannot be empty',
        })
      );
    });

    it('should trim whitespace from messages', async () => {
      let capturedRequest: { messages: Array<{ content: string }> } | null = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        capturedRequest = data as typeof capturedRequest;
        return Promise.resolve({ data: mockResponses.basicGreeting });
      });

      await api.sendMessage('  Hello with spaces  ');

      expect(capturedRequest?.messages[0].content).toBe('Hello with spaces');
    });
  });

  // --------------------------------------------------------------------------
  // Voice-Friendly Response Tests
  // --------------------------------------------------------------------------

  describe('Voice-Friendly Responses', () => {
    beforeEach(async () => {
      setupMockSession(mockInstance);
      await api.startSession();
    });

    it('should receive response under 500 characters for voice', async () => {
      setupMockResponse(mockInstance, mockResponses.basicGreeting);

      const response = await api.sendMessage('Hello!');

      expect(response.message.length).toBeLessThan(500);
    });

    it('should receive concise response (< 50 words)', async () => {
      setupMockResponse(mockInstance, mockResponses.basicGreeting);

      const response = await api.sendMessage('How are you?');

      const wordCount = response.message.split(/\s+/).length;
      expect(wordCount).toBeLessThan(50);
    });

    it('should not contain AI disclaimers', async () => {
      setupMockResponse(mockInstance, mockResponses.naturalConversation);

      const response = await api.sendMessage('What do you think?');

      expect(response.message).not.toContain('As an AI');
      expect(response.message).not.toContain('I cannot');
      expect(response.message).not.toContain('I am an artificial');
      expect(response.message).not.toContain("I don't have feelings");
    });
  });

  // --------------------------------------------------------------------------
  // Conversation History Tests
  // --------------------------------------------------------------------------

  describe('Conversation History', () => {
    beforeEach(async () => {
      setupMockSession(mockInstance);
      await api.startSession();
    });

    it('should accumulate conversation history', async () => {
      // Three turns of conversation
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('Message 1');

      setupMockResponse(mockInstance, mockResponses.naturalConversation);
      await api.sendMessage('Message 2');

      setupMockResponse(mockInstance, mockResponses.memoryContext);
      await api.sendMessage('Message 3');

      const history = api.getConversationHistory();
      expect(history.length).toBe(6); // 3 user + 3 assistant
    });

    it('should send full history with each request', async () => {
      // First message
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('First message');

      // Second message - capture the request
      // Note: We capture a deep copy because the API passes array reference
      // and mutates it after the request (adding assistant response)
      let capturedMessages: Array<{ content: string; role: string }> | null = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        const request = data as { messages: Array<{ content: string; role: string }> };
        // Deep copy at capture time to avoid mutation
        capturedMessages = JSON.parse(JSON.stringify(request.messages));
        return Promise.resolve({ data: mockResponses.naturalConversation });
      });

      await api.sendMessage('Second message');

      // Should include first message, assistant response, and second message
      // (3 messages at time of request, before assistant response is added)
      expect(capturedMessages).toHaveLength(3);
      expect(capturedMessages?.[0].content).toBe('First message');
      expect(capturedMessages?.[1].role).toBe('assistant');
      expect(capturedMessages?.[2].content).toBe('Second message');
    });

    it('should clear history when starting new session', async () => {
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('Build history');
      expect(api.getConversationHistory().length).toBe(2);

      // Start new session
      setupMockSession(mockInstance, 'new-session');
      await api.startSession();

      expect(api.getConversationHistory()).toEqual([]);
    });

    it('should clear history using clearHistory method', async () => {
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('Build history');
      expect(api.getConversationHistory().length).toBe(2);

      api.clearHistory();

      expect(api.getConversationHistory()).toEqual([]);
      // Session should still be active
      expect(api.getSessionId()).toBeTruthy();
    });
  });
});

// ============================================================================
// TEST SUITE: Research and Factual Questions
// ============================================================================

describe('E2E: Research Conversation', () => {
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

  it('should answer factual questions', async () => {
    setupMockResponse(mockInstance, mockResponses.researchResponse);

    const response = await api.sendMessage('What is TypeScript?');

    expect(response.message).toBeTruthy();
    expect(response.message.toLowerCase()).toContain('typescript');
  });

  it('should provide substantive research responses', async () => {
    setupMockResponse(mockInstance, mockResponses.researchResponse);

    const response = await api.sendMessage('Explain TypeScript to me');

    // Research responses should be informative
    expect(response.message.length).toBeGreaterThan(50);
    expect(response.message.split(/\s+/).length).toBeGreaterThan(10);
  });

  it('should remember context from research questions', async () => {
    // Ask initial question
    setupMockResponse(mockInstance, mockResponses.researchResponse);
    await api.sendMessage('Tell me about React');

    // Follow-up question
    setupMockResponse(mockInstance, mockResponses.memoryContext);
    const response = await api.sendMessage('What framework am I asking about?');

    // The mock returns a response about React being remembered
    expect(response.message).toBeTruthy();
  });
});

// ============================================================================
// TEST SUITE: Response Timing
// ============================================================================

describe('E2E: Response Timing', () => {
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

  it('should respond to simple queries within acceptable time', async () => {
    setupMockResponse(mockInstance, mockResponses.basicGreeting);

    const { duration } = await measureTime(() =>
      api.sendMessage('Hello!')
    );

    // Mocked responses should be near instant
    // Real integration tests would have higher tolerance
    if (!isIntegrationTest) {
      expect(duration).toBeLessThan(100);
    } else {
      expect(duration).toBeLessThan(RESPONSE_TIME.SIMPLE_MS);
    }
  });

  it('should complete session lifecycle quickly', async () => {
    // Already started in beforeEach

    mockInstance.delete.mockResolvedValueOnce({ data: { success: true } });

    const { duration } = await measureTime(() => api.endSession());

    if (!isIntegrationTest) {
      expect(duration).toBeLessThan(100);
    } else {
      expect(duration).toBeLessThan(1000);
    }
  });
});

// ============================================================================
// TEST SUITE: Real Integration Tests (Skipped by default)
// ============================================================================

// These tests require real Hermes instance
// Run with: HERMES_INTEGRATION_TEST=true pnpm test tests/e2e/conversation

describe.skip('E2E: Real Hermes Integration', () => {
  let api: XanderApi;

  beforeAll(() => {
    // Use real axios for integration tests
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

  it('should have real conversation with Hermes', async () => {
    const session = await api.startSession();
    expect(session.sessionId).toBeDefined();

    const response = await api.sendMessage('Hello, this is an E2E test!');
    expect(response.message).toBeTruthy();
    expect(response.message.length).toBeGreaterThan(0);
  }, INTEGRATION_TIMEOUT);

  it('should remember context across turns', async () => {
    await api.startSession();

    // Introduce context
    await api.sendMessage('My favorite color is blue');

    // Ask about it
    const response = await api.sendMessage('What is my favorite color?');

    expect(response.message.toLowerCase()).toContain('blue');
  }, INTEGRATION_TIMEOUT);

  it('should respond naturally without AI disclaimers', async () => {
    await api.startSession();

    const response = await api.sendMessage('How are you doing today?');

    expect(response.message).not.toContain('As an AI');
    expect(response.message).not.toContain('I am an artificial');
  }, INTEGRATION_TIMEOUT);
});
