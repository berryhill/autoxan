/**
 * E2E Test Setup - Test Environment Configuration and Utilities
 *
 * This module provides setup and cleanup utilities for E2E tests,
 * along with mock fixtures and helper functions.
 *
 * Test Modes:
 * - Unit Test Mode (default): Uses mocked responses for CI/CD
 * - Integration Test Mode: Set HERMES_INTEGRATION_TEST=true for real Hermes
 *
 * @see https://github.com/berryhill/autoxan/issues/12
 */

import axios from 'axios';
import { XanderApi } from '../../src/api/xanderApi';
import type {
  XanderApiError,
  XanderResponse,
  XanderSession,
  HermesChatCompletionResponse,
} from '../../src/api/xanderApi';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Check if running in integration test mode */
export const isIntegrationTest = process.env.HERMES_INTEGRATION_TEST === 'true';

/** Timeout for real network calls (60s for LLM responses) */
export const INTEGRATION_TIMEOUT = 60000;

/** Default timeout for mocked tests */
export const DEFAULT_TIMEOUT = 5000;

/** Response time assertions */
export const RESPONSE_TIME = {
  /** Simple response should complete in 3 seconds */
  SIMPLE_MS: 3000,
  /** Search/research response should complete in 5 seconds */
  SEARCH_MS: 5000,
  /** Dispatch should complete in 2 seconds */
  DISPATCH_MS: 2000,
};

/** Hermes endpoint configuration */
export const HERMES_CONFIG = {
  baseUrl: 'http://localhost:8080',
  timeout: isIntegrationTest ? INTEGRATION_TIMEOUT : DEFAULT_TIMEOUT,
};

// ============================================================================
// MOCK AXIOS HELPERS
// ============================================================================

const mockAxios = axios as jest.Mocked<typeof axios>;

/**
 * Get the mock axios instance created by axios.create
 */
export function getMockInstance() {
  const createMock = mockAxios.create as jest.Mock;
  if (createMock.mock.results.length > 0) {
    return createMock.mock.results[createMock.mock.results.length - 1].value;
  }
  return (axios as unknown as { __mockInstance: unknown }).__mockInstance;
}

// ============================================================================
// MOCK RESPONSE FIXTURES
// ============================================================================

export const mockResponses = {
  /** Health check response */
  healthCheck: {
    status: 'healthy',
    agent: 'hermes',
    version: '0.12.0',
    uptime: 3600,
    model: 'anthropic/claude-3-sonnet',
  },

  /** Basic session response */
  session: {
    sessionId: 'hermes-session-e2e-12345',
    messages: [],
  },

  /** Basic greeting response */
  basicGreeting: {
    id: 'chat-completion-greeting',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
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

  /** Natural conversation response */
  naturalConversation: {
    id: 'chat-completion-natural',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: "That sounds like an interesting project! Tell me more about what you're building.",
        },
        finish_reason: 'stop',
      },
    ],
  },

  /** Research/search response */
  researchResponse: {
    id: 'chat-completion-research',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content:
            "Based on my research, TypeScript is a strongly typed superset of JavaScript that compiles to plain JavaScript. It was developed by Microsoft and adds optional static typing and class-based object-oriented programming to the language. It's widely used for large-scale applications.",
        },
        finish_reason: 'stop',
      },
    ],
  },

  /** Dispatch suggestion response */
  dispatchSuggestion: {
    id: 'chat-completion-dispatch',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
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

  /** Dispatch confirmation response */
  dispatchConfirmation: {
    id: 'chat-completion-dispatch-confirm',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: "Got it! I've dispatched that task to silas-workstation. You'll get a notification when it's complete.",
        },
        finish_reason: 'stop',
      },
    ],
  },

  /** Memory context response */
  memoryContext: {
    id: 'chat-completion-memory',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: "You're working on a React app, right? That's the project you mentioned.",
        },
        finish_reason: 'stop',
      },
    ],
  },

  /** Steer/clarification prompt response */
  steerPrompt: {
    id: 'chat-completion-steer',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: 'Go ahead, what would you like to clarify?',
        },
        finish_reason: 'stop',
      },
    ],
  },

  /** Goodbye response */
  goodbye: {
    id: 'chat-completion-goodbye',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content: 'Goodbye! Have a great day!',
        },
        finish_reason: 'stop',
      },
    ],
  },
};

// ============================================================================
// SILAS WORKSTATION MOCK RESPONSES
// ============================================================================

export const silasResponses = {
  /** Task dispatch success */
  dispatchSuccess: {
    success: true,
    taskId: 'task-silas-12345',
    status: 'pending',
    message: 'Task successfully queued',
    estimatedCompletion: '5 minutes',
  },

  /** Task status - pending */
  taskStatusPending: {
    taskId: 'task-silas-12345',
    status: 'pending',
    type: 'code',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  /** Task status - running */
  taskStatusRunning: {
    taskId: 'task-silas-12345',
    status: 'running',
    type: 'code',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  },

  /** Task status - completed */
  taskStatusCompleted: {
    taskId: 'task-silas-12345',
    status: 'completed',
    type: 'code',
    priority: 'normal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    result: 'Task completed successfully',
  },

  /** Task list */
  taskList: {
    tasks: [
      {
        taskId: 'task-silas-12345',
        status: 'pending',
        type: 'code',
        priority: 'normal',
        summary: 'Create Python script',
      },
    ],
    total: 1,
    pending: 1,
    running: 0,
    completed: 0,
  },

  /** Queue stats */
  queueStats: {
    pending: 1,
    running: 0,
    completed: 5,
    failed: 0,
    avgProcessingTime: '3.5 minutes',
  },
};

// ============================================================================
// TEST ENVIRONMENT SETUP/CLEANUP
// ============================================================================

/**
 * Set up the test environment
 * Verifies that Hermes is available (health check)
 */
export async function setupTestEnvironment(): Promise<boolean> {
  console.log('[E2E Setup] Initializing test environment...');

  if (isIntegrationTest) {
    // For integration tests, verify real Hermes is running
    const api = new XanderApi(HERMES_CONFIG);
    const healthy = await api.healthCheck();

    if (!healthy) {
      throw new Error(
        'Hermes is not running. Start it in Termux first: `hermes`'
      );
    }

    console.log('✓ Hermes health check passed');
    return true;
  }

  // For unit tests, setup mocks
  const mockInstance = getMockInstance();
  mockInstance.get.mockResolvedValue({
    data: mockResponses.healthCheck,
  });

  console.log('✓ Mock environment ready');
  return true;
}

/**
 * Clean up the test environment
 * Ends any active sessions
 */
export async function cleanupTestEnvironment(): Promise<void> {
  console.log('[E2E Cleanup] Cleaning up test environment...');

  if (isIntegrationTest) {
    // For integration tests, try to end any active sessions
    const api = new XanderApi(HERMES_CONFIG);
    try {
      await api.endSession();
    } catch {
      // Ignore if no session
    }
  }

  console.log('✓ Cleanup complete');
}

// ============================================================================
// TEST HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new XanderApi instance for testing
 */
export function createTestApi(): XanderApi {
  return new XanderApi(HERMES_CONFIG);
}

/**
 * Setup mock for a successful session start
 */
export function setupMockSession(
  mockInstance: ReturnType<typeof getMockInstance>,
  sessionId?: string
): void {
  mockInstance.post.mockResolvedValueOnce({
    data: {
      ...mockResponses.session,
      ...(sessionId ? { sessionId } : {}),
    },
  });
}

/**
 * Setup mock for a chat completion response
 */
export function setupMockResponse(
  mockInstance: ReturnType<typeof getMockInstance>,
  response: HermesChatCompletionResponse
): void {
  mockInstance.post.mockResolvedValueOnce({
    data: response,
  });
}

/**
 * Setup mock for an error response
 */
export function setupMockError(
  mockInstance: ReturnType<typeof getMockInstance>,
  error: XanderApiError
): void {
  mockInstance.post.mockRejectedValueOnce(error);
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measure the execution time of an async function
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// ============================================================================
// MANUAL TESTING CHECKLIST
// ============================================================================
/*
 * MANUAL E2E TESTING CHECKLIST
 * ============================
 *
 * Before running integration tests against a real Hermes instance:
 *
 * □ 1. Start Hermes Agent in Termux:
 *      $ hermes
 *      OR
 *      $ hermes gateway start
 *
 * □ 2. Verify Hermes is running:
 *      $ curl http://localhost:8080/health
 *      Expected: {"status": "healthy", "agent": "hermes", ...}
 *
 * □ 3. Ensure SOUL.md personality is configured:
 *      $ cat ~/.hermes/SOUL.md
 *
 * □ 4. Run E2E tests with environment variable:
 *      $ HERMES_INTEGRATION_TEST=true pnpm test tests/e2e
 *
 * □ 5. Verify test scenarios manually:
 *      □ Health check returns healthy status
 *      □ Basic conversation returns natural responses
 *      □ Responses are concise (< 50 words for voice)
 *      □ Dispatch suggestions work with coding tasks
 *      □ Memory persists across conversation turns
 *      □ Error handling works when Hermes is stopped
 *
 * □ 6. Test gesture controls manually:
 *      □ Interrupt (🤚): Stop TTS, return to listening
 *      □ Steer (🎯): Let me clarify
 *      □ Queue (📋): Dispatch to silas-workstation
 *      □ Stop (⏹️): End session
 *      □ Repeat (🔄): Replay last response
 *
 * □ 7. Test audio focus manually:
 *      □ Music playing → App opens → Music pauses
 *      □ Session ends → Music resumes
 *      □ Focus lost temporarily → App handles gracefully
 *
 * □ 8. Test error scenarios manually:
 *      □ Network disconnection → Graceful error message
 *      □ Hermes unavailable → Retry option
 *      □ silas-workstation unavailable → Degrade gracefully
 */

export default {
  isIntegrationTest,
  INTEGRATION_TIMEOUT,
  DEFAULT_TIMEOUT,
  RESPONSE_TIME,
  HERMES_CONFIG,
  getMockInstance,
  mockResponses,
  silasResponses,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createTestApi,
  setupMockSession,
  setupMockResponse,
  setupMockError,
  wait,
  measureTime,
};
