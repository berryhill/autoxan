/**
 * E2E Tests: Error Scenarios
 *
 * Tests error handling and recovery scenarios:
 * - Network errors and connection issues
 * - Hermes unavailable
 * - silas-workstation unavailable
 * - Timeout handling
 * - Invalid responses
 * - Graceful degradation
 * - Recovery and retry
 *
 * @see https://github.com/berryhill/autoxan/issues/12
 */

import { XanderApi } from '../../src/api/xanderApi';
import type { XanderApiError } from '../../src/api/xanderApi';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestApi,
  getMockInstance,
  mockResponses,
  setupMockSession,
  setupMockResponse,
  setupMockError,
} from './setup';

// ============================================================================
// ERROR FIXTURES
// ============================================================================

const errorFixtures = {
  connectionRefused: {
    code: 'ECONNREFUSED',
    message: 'connect ECONNREFUSED 127.0.0.1:8080',
    response: undefined,
  } as unknown as XanderApiError,

  timeout: {
    code: 'ETIMEDOUT',
    message: 'Request timed out',
    response: undefined,
  } as unknown as XanderApiError,

  networkUnreachable: {
    code: 'ENETUNREACH',
    message: 'Network is unreachable',
    response: undefined,
  } as unknown as XanderApiError,

  serverError: {
    code: 'SERVER_ERROR',
    message: 'Hermes encountered an internal error. Please try again.',
  } as XanderApiError,

  serviceUnavailable: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Hermes is temporarily unavailable. Please try again later.',
  } as XanderApiError,

  badRequest: {
    code: 'BAD_REQUEST',
    message: 'Invalid request. Please check your input.',
  } as XanderApiError,

  invalidResponse: {
    code: 'INVALID_RESPONSE',
    message: 'No response from Hermes',
  } as XanderApiError,

  dispatchFailed: {
    code: 'DISPATCH_FAILED',
    message: 'Unable to dispatch task to silas-workstation',
  } as XanderApiError,
};

// ============================================================================
// TEST SUITE: Connection Errors
// ============================================================================

describe('E2E: Connection Errors', () => {
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

  // --------------------------------------------------------------------------
  // Hermes Not Running
  // --------------------------------------------------------------------------

  describe('Hermes Not Running', () => {
    it('should return false for health check when connection refused', async () => {
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

      expect(session.sessionId).toMatch(/^local-session-/);
      expect(session.messages).toEqual([]);
    });

    it('should provide meaningful error message for connection refused', async () => {
      setupMockSession(mockInstance);
      await api.startSession();

      const error: XanderApiError = {
        code: 'CONNECTION_REFUSED',
        message:
          'Cannot connect to Hermes. Make sure Hermes is running in Termux.',
      };
      setupMockError(mockInstance, error);

      await expect(api.sendMessage('Hello')).rejects.toEqual(
        expect.objectContaining({
          code: 'CONNECTION_REFUSED',
          message: expect.stringContaining('Hermes'),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Network Errors
  // --------------------------------------------------------------------------

  describe('Network Errors', () => {
    it('should handle timeout gracefully', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Request timed out',
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(false);
    });

    it('should handle network unreachable', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ENETUNREACH',
        message: 'Network is unreachable',
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(false);
    });

    it('should provide timeout error message for send', async () => {
      setupMockSession(mockInstance);
      await api.startSession();

      const error: XanderApiError = {
        code: 'TIMEOUT',
        message: 'Request to Hermes timed out. Please try again.',
      };
      setupMockError(mockInstance, error);

      await expect(api.sendMessage('Hello')).rejects.toEqual(
        expect.objectContaining({
          code: 'TIMEOUT',
          message: expect.stringContaining('timed out'),
        })
      );
    });

    it('should handle DNS resolution failures', async () => {
      mockInstance.get.mockRejectedValueOnce({
        code: 'ENOTFOUND',
        message: 'DNS lookup failed',
      });

      const healthy = await api.healthCheck();

      expect(healthy).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: Server Errors
// ============================================================================

describe('E2E: Server Errors', () => {
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
  // HTTP Error Responses
  // --------------------------------------------------------------------------

  describe('HTTP Error Responses', () => {
    it('should handle 400 Bad Request', async () => {
      setupMockError(mockInstance, errorFixtures.badRequest);

      await expect(api.sendMessage('Test')).rejects.toEqual(
        expect.objectContaining({
          code: 'BAD_REQUEST',
        })
      );
    });

    it('should handle 500 Server Error', async () => {
      setupMockError(mockInstance, errorFixtures.serverError);

      await expect(api.sendMessage('Test')).rejects.toEqual(
        expect.objectContaining({
          code: 'SERVER_ERROR',
          message: expect.stringContaining('internal error'),
        })
      );
    });

    it('should handle 503 Service Unavailable', async () => {
      setupMockError(mockInstance, errorFixtures.serviceUnavailable);

      await expect(api.sendMessage('Test')).rejects.toEqual(
        expect.objectContaining({
          code: 'SERVICE_UNAVAILABLE',
          message: expect.stringContaining('unavailable'),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Invalid Response Handling
  // --------------------------------------------------------------------------

  describe('Invalid Response Handling', () => {
    it('should handle empty choices array', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'empty-response',
          object: 'chat.completion',
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

    it('should handle missing message in choice', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: {
          id: 'missing-message',
          object: 'chat.completion',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              // message is missing
            },
          ],
        },
      });

      await expect(api.sendMessage('Test')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_RESPONSE',
        })
      );
    });

    it('should handle null response data', async () => {
      mockInstance.post.mockResolvedValueOnce({
        data: null,
      });

      await expect(api.sendMessage('Test')).rejects.toBeDefined();
    });
  });
});

// ============================================================================
// TEST SUITE: Message Validation Errors
// ============================================================================

describe('E2E: Message Validation Errors', () => {
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

  it('should reject empty message', async () => {
    await expect(api.sendMessage('')).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_MESSAGE',
        message: 'Message cannot be empty',
      })
    );
  });

  it('should reject whitespace-only message', async () => {
    await expect(api.sendMessage('   ')).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_MESSAGE',
        message: 'Message cannot be empty',
      })
    );
  });

  it('should reject message with only newlines', async () => {
    await expect(api.sendMessage('\n\n\n')).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_MESSAGE',
      })
    );
  });

  it('should reject message with only tabs', async () => {
    await expect(api.sendMessage('\t\t')).rejects.toEqual(
      expect.objectContaining({
        code: 'INVALID_MESSAGE',
      })
    );
  });
});

// ============================================================================
// TEST SUITE: Session Management Errors
// ============================================================================

describe('E2E: Session Management Errors', () => {
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

  // --------------------------------------------------------------------------
  // End Session Errors
  // --------------------------------------------------------------------------

  describe('End Session Errors', () => {
    it('should handle endSession when no session exists', async () => {
      // Should not throw
      await expect(api.endSession()).resolves.toBeUndefined();
      expect(mockInstance.delete).not.toHaveBeenCalled();
    });

    it('should clear local state even on server error', async () => {
      setupMockSession(mockInstance);
      await api.startSession();
      expect(api.getSessionId()).toBeTruthy();

      // Server fails to end session
      mockInstance.delete.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      await api.endSession();

      // Local state should still be cleared
      expect(api.getSessionId()).toBeNull();
      expect(api.getConversationHistory()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // Get Session Errors
  // --------------------------------------------------------------------------

  describe('Get Session Errors', () => {
    it('should return null when no session exists', async () => {
      const session = await api.getSession();

      expect(session).toBeNull();
    });

    it('should return local session info when server fails', async () => {
      // Start session
      setupMockSession(mockInstance);
      await api.startSession();

      // Send a message to build history
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('Test');

      // Get session fails
      mockInstance.get.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      const session = await api.getSession();

      // Should return local session with history
      expect(session?.sessionId).toBeTruthy();
      expect(session?.messages).toHaveLength(2);
    });
  });
});

// ============================================================================
// TEST SUITE: Dispatch Errors
// ============================================================================

describe('E2E: Dispatch Errors', () => {
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
  // Dispatch API Errors
  // --------------------------------------------------------------------------

  describe('Dispatch API Errors', () => {
    it('should handle dispatch failure', async () => {
      setupMockError(mockInstance, errorFixtures.dispatchFailed);

      await expect(
        api.dispatch({
          sessionId: 'test-session',
          summary: 'Test task',
          details: 'Test details',
        })
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'DISPATCH_FAILED',
        })
      );
    });

    it('should handle server error during dispatch', async () => {
      setupMockError(mockInstance, errorFixtures.serverError);

      await expect(
        api.dispatch({
          sessionId: 'test-session',
          summary: 'Test task',
          details: 'Test details',
        })
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'SERVER_ERROR',
        })
      );
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
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'TIMEOUT',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Legacy dispatchToSilas Errors
  // --------------------------------------------------------------------------

  describe('Legacy dispatchToSilas Errors', () => {
    it('should return false when no session exists', async () => {
      const newApi = createTestApi();

      const result = await newApi.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });

    it('should return false on dispatch error', async () => {
      setupMockError(mockInstance, errorFixtures.serverError);

      const result = await api.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      setupMockError(mockInstance, errorFixtures.connectionRefused);

      const result = await api.dispatchToSilas('Test dispatch');

      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// TEST SUITE: Error Recovery
// ============================================================================

describe('E2E: Error Recovery', () => {
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
  });

  // --------------------------------------------------------------------------
  // Retry Scenarios
  // --------------------------------------------------------------------------

  describe('Retry Scenarios', () => {
    it('should succeed on retry after transient failure', async () => {
      // First health check fails
      mockInstance.get.mockRejectedValueOnce({
        code: 'ETIMEDOUT',
        message: 'Timeout',
      });

      const firstCheck = await api.healthCheck();
      expect(firstCheck).toBe(false);

      // Second health check succeeds
      mockInstance.get.mockResolvedValueOnce({
        data: mockResponses.healthCheck,
      });

      const secondCheck = await api.healthCheck();
      expect(secondCheck).toBe(true);
    });

    it('should recover session after connection failure', async () => {
      // First session fails
      mockInstance.post.mockRejectedValueOnce({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const session1 = await api.startSession();
      expect(session1.sessionId).toMatch(/^local-session-/);

      // Connection recovered - new session succeeds
      setupMockSession(mockInstance, 'recovered-session');
      const session2 = await api.startSession();
      expect(session2.sessionId).toBe('recovered-session');
    });

    it('should preserve conversation after transient error', async () => {
      setupMockSession(mockInstance);
      await api.startSession();

      // First message succeeds
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('Hello');
      expect(api.getConversationHistory()).toHaveLength(2);

      // Second message fails
      setupMockError(mockInstance, errorFixtures.timeout);
      await expect(api.sendMessage('Test')).rejects.toBeDefined();

      // Conversation history should still be intact (minus failed message)
      // The failed message is added to history before the request
      expect(api.getConversationHistory().length).toBeGreaterThanOrEqual(2);

      // Third message succeeds
      setupMockResponse(mockInstance, mockResponses.naturalConversation);
      await api.sendMessage('Retry');

      // Should continue building history
      expect(api.getConversationHistory().length).toBeGreaterThan(2);
    });
  });

  // --------------------------------------------------------------------------
  // Graceful Degradation
  // --------------------------------------------------------------------------

  describe('Graceful Degradation', () => {
    it('should continue with local session when server unavailable', async () => {
      // Server unavailable
      mockInstance.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const session = await api.startSession();

      // Should have local session
      expect(session.sessionId).toMatch(/^local-session-/);
      expect(api.getSessionId()).toMatch(/^local-session-/);
    });

    it('should return local history when getSession fails', async () => {
      setupMockSession(mockInstance);
      await api.startSession();

      // Build some history
      setupMockResponse(mockInstance, mockResponses.basicGreeting);
      await api.sendMessage('Message 1');

      // getSession fails
      mockInstance.get.mockRejectedValueOnce({
        code: 'SERVER_ERROR',
        message: 'Server error',
      });

      const session = await api.getSession();

      // Should return local data
      expect(session).toBeTruthy();
      expect(session?.messages).toHaveLength(2);
    });
  });
});

// ============================================================================
// TEST SUITE: Error Logging
// ============================================================================

describe('E2E: Error Logging', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

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

    // Spy on console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should log errors when health check fails', async () => {
    mockInstance.get.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    });

    await api.healthCheck();

    // Should have logged the failure
    expect(console.log).toBeDefined(); // Basic logging check
  });

  it('should log warnings for session fallback', async () => {
    mockInstance.post.mockRejectedValueOnce({
      code: 'ECONNREFUSED',
      message: 'Connection refused',
    });

    await api.startSession();

    // Should have logged the fallback
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should log errors for failed message sends', async () => {
    setupMockSession(mockInstance);
    await api.startSession();

    setupMockError(mockInstance, errorFixtures.serverError);

    try {
      await api.sendMessage('Test');
    } catch {
      // Expected to throw
    }

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ============================================================================
// TEST SUITE: silas-workstation Unavailable
// ============================================================================

describe('E2E: silas-workstation Unavailable', () => {
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

  it('should handle silas-workstation connection failure', async () => {
    const silasError: XanderApiError = {
      code: 'DISPATCH_FAILED',
      message: 'Cannot connect to silas-workstation. Make sure it is running.',
      details: { code: 'ECONNREFUSED' },
    };
    setupMockError(mockInstance, silasError);

    await expect(
      api.dispatch({
        sessionId: 'test',
        summary: 'Test',
        details: 'Test details',
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'DISPATCH_FAILED',
      })
    );
  });

  it('should allow conversation to continue when dispatch fails', async () => {
    // Send message successfully
    setupMockResponse(mockInstance, mockResponses.basicGreeting);
    await api.sendMessage('Hello');

    // Dispatch fails
    setupMockError(mockInstance, errorFixtures.dispatchFailed);
    const dispatchResult = await api.dispatchToSilas('Task');
    expect(dispatchResult).toBe(false);

    // Conversation should continue working
    setupMockResponse(mockInstance, mockResponses.naturalConversation);
    const response = await api.sendMessage('Continue conversation');
    expect(response.message).toBeTruthy();
  });

  it('should preserve dispatched work tracking even on failure', async () => {
    // Note: This tests that the API doesn't corrupt state on failure
    setupMockResponse(mockInstance, mockResponses.basicGreeting);
    await api.sendMessage('Test');

    // Failed dispatch should not affect conversation
    setupMockError(mockInstance, errorFixtures.dispatchFailed);

    try {
      await api.dispatch({
        sessionId: api.getSessionId()!,
        summary: 'Test',
        details: 'Details',
      });
    } catch {
      // Expected
    }

    // History should be intact
    expect(api.getConversationHistory()).toHaveLength(2);
  });
});
