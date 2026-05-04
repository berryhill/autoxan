/**
 * xanderApi - HTTP client for Xander agent
 *
 * This module provides the HTTP client for communicating with the
 * Xander agent running in Termux on the phone.
 *
 * Features (to be implemented in Phase 3):
 * - Send user messages to Xander
 * - Receive Xander's responses
 * - Session management
 * - Handle connection errors gracefully
 *
 * The Xander agent runs locally in Termux at http://localhost:3000
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Types
export interface XanderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface XanderSession {
  sessionId: string;
  messages: XanderMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface XanderResponse {
  message: string;
  sessionId: string;
  metadata?: {
    dispatchedToSilas?: boolean;
    researchPerformed?: boolean;
    [key: string]: unknown;
  };
}

export interface XanderApiConfig {
  baseUrl?: string;
  timeout?: number;
}

export interface XanderApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Create an axios instance configured for Xander API
 */
function createApiClient(config?: XanderApiConfig): AxiosInstance {
  const baseURL = config?.baseUrl ?? DEFAULT_BASE_URL;
  const timeout = config?.timeout ?? DEFAULT_TIMEOUT;

  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (requestConfig) => {
      console.log(
        `[XanderApi] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`
      );
      return requestConfig;
    },
    (error) => {
      console.error('[XanderApi] Request error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      const apiError: XanderApiError = {
        code: error.code ?? 'UNKNOWN_ERROR',
        message: error.message,
        details: error.response?.data,
      };
      console.error('[XanderApi] Response error:', apiError);
      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * XanderApi class for interacting with the Xander agent
 * Placeholder implementation - will be completed in Phase 3
 */
export class XanderApi {
  private client: AxiosInstance;
  private currentSessionId: string | null = null;

  constructor(config?: XanderApiConfig) {
    this.client = createApiClient(config);
  }

  /**
   * Send a message to Xander and get a response
   */
  async sendMessage(message: string): Promise<XanderResponse> {
    // TODO: Implement actual API call in Phase 3
    // Placeholder response for development
    console.log('[XanderApi] sendMessage - placeholder:', message);

    // Simulate API call
    return {
      message: `[Placeholder] Xander received: "${message}"`,
      sessionId: this.currentSessionId ?? 'placeholder-session',
      metadata: {},
    };
  }

  /**
   * Start a new conversation session
   */
  async startSession(): Promise<XanderSession> {
    // TODO: Implement actual API call in Phase 3
    console.log('[XanderApi] startSession - placeholder');

    const sessionId = `session-${Date.now()}`;
    this.currentSessionId = sessionId;

    return {
      sessionId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * End the current conversation session
   */
  async endSession(): Promise<void> {
    // TODO: Implement actual API call in Phase 3
    console.log('[XanderApi] endSession - placeholder');
    this.currentSessionId = null;
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<XanderSession | null> {
    // TODO: Implement actual API call in Phase 3
    if (!this.currentSessionId) {
      return null;
    }

    return {
      sessionId: this.currentSessionId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if Xander agent is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // TODO: Implement actual health check endpoint in Phase 3
      // await this.client.get('/health');
      console.log('[XanderApi] healthCheck - placeholder');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Dispatch work to Silas (workstation)
   */
  async dispatchToSilas(workDescription: string): Promise<boolean> {
    // TODO: Implement dispatch functionality in Phase 8
    console.log('[XanderApi] dispatchToSilas - placeholder:', workDescription);
    return true;
  }
}

// Default instance for convenience
export const xanderApi = new XanderApi();

export default XanderApi;
