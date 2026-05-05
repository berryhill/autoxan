/**
 * E2E Tests: Dispatch Flow
 *
 * Tests the dispatch flow to silas-workstation including:
 * - Dispatch suggestion detection in responses
 * - Dispatch block parsing and extraction
 * - Task queuing and confirmation
 * - Task status tracking
 * - Integration with session and conversation flow
 *
 * @see https://github.com/berryhill/autoxan/issues/12
 */

import { XanderApi, parseDispatchBlock, removeDispatchBlock } from '../../src/api/xanderApi';
import type { XanderApiError, DispatchRequest, DispatchResponse } from '../../src/api/xanderApi';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestApi,
  getMockInstance,
  mockResponses,
  silasResponses,
  setupMockSession,
  setupMockResponse,
  setupMockError,
  RESPONSE_TIME,
  measureTime,
  isIntegrationTest,
  INTEGRATION_TIMEOUT,
} from './setup';

// ============================================================================
// TEST SUITE: Dispatch Detection and Parsing
// ============================================================================

describe('E2E: Dispatch Detection', () => {
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
  // Dispatch Suggestion Tests
  // --------------------------------------------------------------------------

  describe('Dispatch Suggestion Detection', () => {
    it('should detect dispatch suggestion in response', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchSuggestion);

      const response = await api.sendMessage(
        'Can you create a Python script to process CSV files?'
      );

      expect(response.metadata?.suggestDispatch).toBe(true);
    });

    it('should extract dispatch summary correctly', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchSuggestion);

      const response = await api.sendMessage(
        'Create a script to process CSV files'
      );

      expect(response.metadata?.dispatchSummary).toBeTruthy();
      expect(response.metadata?.dispatchSummary).toContain('Python');
      expect(response.metadata?.dispatchSummary).toContain('CSV');
    });

    it('should extract dispatch details correctly', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchSuggestion);

      const response = await api.sendMessage(
        'Build a CSV processor'
      );

      expect(response.metadata?.dispatchDetails).toBeTruthy();
      expect(response.metadata?.dispatchDetails!.length).toBeGreaterThan(50);
    });

    it('should remove dispatch block from displayed message', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchSuggestion);

      const response = await api.sendMessage('Create a script for me');

      expect(response.message).not.toContain('[DISPATCH_SUGGESTED]');
      expect(response.message).not.toContain('[/DISPATCH_SUGGESTED]');
    });

    it('should not suggest dispatch for simple questions', async () => {
      setupMockResponse(mockInstance, mockResponses.basicGreeting);

      const response = await api.sendMessage('How are you today?');

      expect(response.metadata?.suggestDispatch).toBeFalsy();
    });

    it('should not suggest dispatch for research questions', async () => {
      setupMockResponse(mockInstance, mockResponses.researchResponse);

      const response = await api.sendMessage('What is TypeScript?');

      expect(response.metadata?.suggestDispatch).toBeFalsy();
    });
  });
});

// ============================================================================
// TEST SUITE: Dispatch Block Parsing
// ============================================================================

describe('E2E: Dispatch Block Parsing', () => {
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
      expect(result.summary).toBe('Implement authentication system');
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

    it('should handle multiline summary and details', () => {
      const content = `[DISPATCH_SUGGESTED]
Summary: Build a data pipeline
Details: Create an ETL pipeline:
- Extract from various sources
- Transform and clean data
- Load into data warehouse
[/DISPATCH_SUGGESTED]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Build a data pipeline');
      expect(result.details).toContain('ETL pipeline');
    });

    it('should handle case-insensitive block markers', () => {
      const content = `[dispatch_suggested]
Summary: Test case insensitivity
Details: Testing lowercase markers
[/dispatch_suggested]`;

      const result = parseDispatchBlock(content);

      expect(result.suggested).toBe(true);
      expect(result.summary).toBe('Test case insensitivity');
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

    it('should preserve content before and after dispatch block', () => {
      const content = `Before text.

[DISPATCH_SUGGESTED]
Summary: Task
Details: Task details
[/DISPATCH_SUGGESTED]

After text.`;

      const result = removeDispatchBlock(content);

      expect(result).toContain('Before text');
      expect(result).toContain('After text');
      expect(result).not.toContain('DISPATCH');
    });

    it('should handle multiple dispatch blocks', () => {
      const content = `First block:

[DISPATCH_SUGGESTED]
Summary: First task
Details: First details
[/DISPATCH_SUGGESTED]

Second block:

[DISPATCH_SUGGESTED]
Summary: Second task
Details: Second details
[/DISPATCH_SUGGESTED]

End.`;

      const result = removeDispatchBlock(content);

      expect(result).not.toContain('DISPATCH_SUGGESTED');
      expect(result).toContain('First block');
      expect(result).toContain('Second block');
      expect(result).toContain('End');
    });
  });
});

// ============================================================================
// TEST SUITE: Dispatch Execution
// ============================================================================

describe('E2E: Dispatch Execution', () => {
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
  // Dispatch API Tests
  // --------------------------------------------------------------------------

  describe('Dispatch API', () => {
    it('should dispatch task successfully', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);

      const dispatchRequest: DispatchRequest = {
        sessionId: api.getSessionId()!,
        summary: 'Create Python CSV processor',
        details: 'Build a script to process CSV files with error handling',
      };

      const result = await api.dispatch(dispatchRequest);

      expect(result.success).toBe(true);
      expect(result.taskId).toBeDefined();
      expect(result.taskId).toMatch(/^task-/);
    });

    it('should include session ID in dispatch request', async () => {
      let capturedRequest: { messages: Array<{ content: string }> } | null = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        capturedRequest = data as typeof capturedRequest;
        return Promise.resolve({ data: mockResponses.dispatchConfirmation });
      });

      await api.dispatch({
        sessionId: 'test-session-123',
        summary: 'Test task',
        details: 'Test details',
      });

      expect(capturedRequest?.messages[0].content).toContain('test-session-123');
    });

    it('should include summary and details in dispatch message', async () => {
      let capturedRequest: { messages: Array<{ content: string }> } | null = null;
      mockInstance.post.mockImplementationOnce((_url: string, data: unknown) => {
        capturedRequest = data as typeof capturedRequest;
        return Promise.resolve({ data: mockResponses.dispatchConfirmation });
      });

      await api.dispatch({
        sessionId: 'session-id',
        summary: 'Build authentication',
        details: 'Implement JWT authentication with bcrypt',
      });

      const messageContent = capturedRequest?.messages[0].content || '';
      expect(messageContent).toContain('Build authentication');
      expect(messageContent).toContain('JWT authentication');
      expect(messageContent).toContain('bcrypt');
    });

    it('should generate unique task IDs', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);
      const result1 = await api.dispatch({
        sessionId: 'session',
        summary: 'Task 1',
        details: 'Details 1',
      });

      setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);
      const result2 = await api.dispatch({
        sessionId: 'session',
        summary: 'Task 2',
        details: 'Details 2',
      });

      expect(result1.taskId).not.toBe(result2.taskId);
    });
  });

  // --------------------------------------------------------------------------
  // Dispatch Error Handling
  // --------------------------------------------------------------------------

  describe('Dispatch Error Handling', () => {
    it('should handle dispatch failure gracefully', async () => {
      const dispatchError: XanderApiError = {
        code: 'DISPATCH_FAILED',
        message: 'Unable to dispatch task',
      };
      setupMockError(mockInstance, dispatchError);

      await expect(
        api.dispatch({
          sessionId: 'test-session',
          summary: 'Test task',
          details: 'Test details',
        })
      ).rejects.toEqual(dispatchError);
    });

    it('should handle server errors during dispatch', async () => {
      const serverError: XanderApiError = {
        code: 'SERVER_ERROR',
        message: 'Internal server error',
      };
      setupMockError(mockInstance, serverError);

      await expect(
        api.dispatch({
          sessionId: 'test-session',
          summary: 'Test task',
          details: 'Test details',
        })
      ).rejects.toEqual(serverError);
    });

    it('should handle timeout during dispatch', async () => {
      const timeoutError: XanderApiError = {
        code: 'TIMEOUT',
        message: 'Request timed out',
      };
      setupMockError(mockInstance, timeoutError);

      await expect(
        api.dispatch({
          sessionId: 'test-session',
          summary: 'Test task',
          details: 'Test details',
        })
      ).rejects.toEqual(timeoutError);
    });
  });

  // --------------------------------------------------------------------------
  // Legacy dispatchToSilas Tests
  // --------------------------------------------------------------------------

  describe('Legacy dispatchToSilas', () => {
    it('should return false when no session exists', async () => {
      const newApi = createTestApi();
      // Don't start session

      const result = await newApi.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });

    it('should dispatch successfully with active session', async () => {
      setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);

      const result = await api.dispatchToSilas('Create a new feature');

      expect(result).toBe(true);
    });

    it('should return false on dispatch error', async () => {
      setupMockError(mockInstance, {
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      const result = await api.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: Dispatch Flow Integration
// ============================================================================

describe('E2E: Dispatch Flow Integration', () => {
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

  it('should complete full dispatch flow: request → suggestion → confirm', async () => {
    // Step 1: User requests code task
    setupMockResponse(mockInstance, mockResponses.dispatchSuggestion);
    const suggestionResponse = await api.sendMessage(
      'Can you create a Python script to analyze log files?'
    );

    expect(suggestionResponse.metadata?.suggestDispatch).toBe(true);
    expect(suggestionResponse.metadata?.dispatchSummary).toBeTruthy();

    // Step 2: User confirms dispatch
    setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);
    const dispatchResult = await api.dispatch({
      sessionId: api.getSessionId()!,
      summary: suggestionResponse.metadata!.dispatchSummary!,
      details: suggestionResponse.metadata!.dispatchDetails!,
    });

    expect(dispatchResult.success).toBe(true);
    expect(dispatchResult.taskId).toBeTruthy();
  });

  it('should preserve conversation after dispatch', async () => {
    // Build conversation
    setupMockResponse(mockInstance, mockResponses.basicGreeting);
    await api.sendMessage('Hello');

    // Get dispatch suggestion
    setupMockResponse(mockInstance, mockResponses.dispatchSuggestion);
    await api.sendMessage('Create a script');

    // Dispatch
    setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);
    await api.dispatch({
      sessionId: api.getSessionId()!,
      summary: 'Script task',
      details: 'Task details',
    });

    // Continue conversation
    setupMockResponse(mockInstance, mockResponses.naturalConversation);
    const response = await api.sendMessage('What else can you help with?');

    expect(response.message).toBeTruthy();
    // Conversation history should still be intact
    expect(api.getConversationHistory().length).toBeGreaterThan(4);
  });

  it('should dispatch within acceptable time', async () => {
    setupMockResponse(mockInstance, mockResponses.dispatchConfirmation);

    const { duration } = await measureTime(() =>
      api.dispatch({
        sessionId: api.getSessionId()!,
        summary: 'Test task',
        details: 'Test details',
      })
    );

    if (!isIntegrationTest) {
      expect(duration).toBeLessThan(100);
    } else {
      expect(duration).toBeLessThan(RESPONSE_TIME.DISPATCH_MS);
    }
  });
});

// ============================================================================
// TEST SUITE: Real Integration Tests (Skipped by default)
// ============================================================================

describe.skip('E2E: Real Dispatch Integration', () => {
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

  it('should detect dispatch suggestion for coding requests', async () => {
    await api.startSession();

    const response = await api.sendMessage(
      'Can you create a Node.js script to monitor CPU usage and send alerts?'
    );

    // With proper SOUL.md configuration, should suggest dispatch
    console.log('Dispatch suggested:', response.metadata?.suggestDispatch);
    console.log('Summary:', response.metadata?.dispatchSummary);
    console.log('Response:', response.message);
  }, INTEGRATION_TIMEOUT);

  it('should handle dispatch to real silas-workstation', async () => {
    await api.startSession();

    // Get dispatch suggestion first
    const suggestionResponse = await api.sendMessage(
      'Create a TypeScript utility for parsing JSON files'
    );

    if (suggestionResponse.metadata?.suggestDispatch) {
      const dispatchResult = await api.dispatch({
        sessionId: api.getSessionId()!,
        summary: suggestionResponse.metadata.dispatchSummary!,
        details: suggestionResponse.metadata.dispatchDetails!,
      });

      expect(dispatchResult.success).toBe(true);
      console.log('Task ID:', dispatchResult.taskId);
    }
  }, INTEGRATION_TIMEOUT);
});
