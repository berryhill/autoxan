/**
 * xanderApi - HTTP client for Xander agent
 *
 * This module provides the HTTP client for communicating with the
 * Xander agent running in Termux on the phone.
 *
 * Features:
 * - Send user messages to Xander
 * - Receive Xander's responses
 * - Session management (start, end, get session)
 * - Handle connection errors gracefully
 * - Dispatch functionality to silas-workstation
 * - Health check for Xander availability
 *
 * The Xander agent runs locally in Termux at http://localhost:3000
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Types
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  id: string;
  messages: Message[];
  createdAt: string;
}

export interface SendMessageResponse {
  sessionId: string;
  response: string;
  suggestDispatch?: boolean;
  dispatchSummary?: string;
}

export interface DispatchRequest {
  sessionId: string;
  summary: string;
  details: string;
}

export interface DispatchResponse {
  success: boolean;
  taskId: string;
  message: string;
}

// Legacy types for backward compatibility
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
    suggestDispatch?: boolean;
    dispatchSummary?: string;
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
 * Convert AxiosError to user-friendly XanderApiError
 */
function convertAxiosError(error: AxiosError): XanderApiError {
  // Network errors (no response)
  if (!error.response) {
    if (error.code === 'ECONNREFUSED') {
      return {
        code: 'CONNECTION_REFUSED',
        message: 'Cannot connect to Xander. Make sure Xander is running in Termux.',
        details: error.message,
      };
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message: 'Request to Xander timed out. Please try again.',
        details: error.message,
      };
    }
    if (error.code === 'ENETUNREACH' || error.code === 'ENOTFOUND') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Check your connection and make sure Xander is running.',
        details: error.message,
      };
    }
    return {
      code: error.code ?? 'NETWORK_ERROR',
      message: 'Unable to reach Xander. Check your connection.',
      details: error.message,
    };
  }

  // Server errors (has response)
  const status = error.response.status;
  const data = error.response.data as Record<string, unknown> | undefined;

  if (status === 400) {
    return {
      code: 'BAD_REQUEST',
      message: (data?.message as string) ?? 'Invalid request. Please check your input.',
      details: data,
    };
  }
  if (status === 401) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
      details: data,
    };
  }
  if (status === 404) {
    return {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      details: data,
    };
  }
  if (status === 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'Xander encountered an internal error. Please try again.',
      details: data,
    };
  }
  if (status === 503) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Xander is temporarily unavailable. Please try again later.',
      details: data,
    };
  }

  return {
    code: `HTTP_${status}`,
    message: (data?.message as string) ?? `Request failed with status ${status}`,
    details: data,
  };
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
      const apiError = convertAxiosError(error);
      console.error('[XanderApi] Response error:', apiError);
      return Promise.reject(apiError);
    }
  );

  return client;
}

/**
 * XanderApi class for interacting with the Xander agent
 *
 * Provides full HTTP client functionality for:
 * - Session management
 * - Message sending/receiving
 * - Dispatch to silas-workstation
 * - Health checking
 */
export class XanderApi {
  private client: AxiosInstance;
  private currentSessionId: string | null = null;

  constructor(config?: XanderApiConfig) {
    this.client = createApiClient(config);
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Check if Xander agent is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      console.log('[XanderApi] Health check passed');
      return true;
    } catch (error) {
      console.log('[XanderApi] Health check failed:', error);
      return false;
    }
  }

  /**
   * Start a new conversation session
   */
  async startSession(): Promise<XanderSession> {
    try {
      const response = await this.client.post<Session>('/sessions');
      const session = response.data;

      this.currentSessionId = session.id;
      console.log('[XanderApi] Session started:', session.id);

      // Convert to XanderSession format
      return {
        sessionId: session.id,
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: new Date().toISOString(),
        })),
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
      };
    } catch (error) {
      // If we get an error, create a local session as fallback
      const sessionId = `local-session-${Date.now()}`;
      this.currentSessionId = sessionId;
      console.warn('[XanderApi] Failed to start remote session, using local:', error);

      return {
        sessionId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * End the current conversation session
   */
  async endSession(): Promise<void> {
    if (!this.currentSessionId) {
      console.log('[XanderApi] No active session to end');
      return;
    }

    try {
      await this.client.delete(`/sessions/${this.currentSessionId}`);
      console.log('[XanderApi] Session ended:', this.currentSessionId);
    } catch (error) {
      console.warn('[XanderApi] Failed to end session on server:', error);
    } finally {
      this.currentSessionId = null;
    }
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<XanderSession | null> {
    if (!this.currentSessionId) {
      return null;
    }

    try {
      const response = await this.client.get<Session>(
        `/sessions/${this.currentSessionId}`
      );
      const session = response.data;

      return {
        sessionId: session.id,
        messages: session.messages.map((msg) => ({
          ...msg,
          timestamp: new Date().toISOString(),
        })),
        createdAt: session.createdAt,
        updatedAt: session.createdAt,
      };
    } catch (error) {
      console.warn('[XanderApi] Failed to get session:', error);
      // Return a minimal session if server is unreachable
      return {
        sessionId: this.currentSessionId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Send a message to Xander and get a response
   * Automatically starts a session if none exists
   */
  async sendMessage(message: string): Promise<XanderResponse> {
    // Validate message
    if (!message || message.trim().length === 0) {
      throw {
        code: 'INVALID_MESSAGE',
        message: 'Message cannot be empty',
      } as XanderApiError;
    }

    // Auto-start session if needed
    if (!this.currentSessionId) {
      console.log('[XanderApi] No active session, starting new one');
      await this.startSession();
    }

    try {
      const response = await this.client.post<SendMessageResponse>('/chat', {
        sessionId: this.currentSessionId,
        message: message.trim(),
      });

      const data = response.data;

      // Update session ID if server provides a different one
      if (data.sessionId && data.sessionId !== this.currentSessionId) {
        this.currentSessionId = data.sessionId;
      }

      console.log('[XanderApi] Message sent successfully');

      return {
        message: data.response,
        sessionId: data.sessionId,
        metadata: {
          suggestDispatch: data.suggestDispatch,
          dispatchSummary: data.dispatchSummary,
        },
      };
    } catch (error) {
      const apiError = error as XanderApiError;
      console.error('[XanderApi] Failed to send message:', apiError);
      throw apiError;
    }
  }

  /**
   * Dispatch work to Silas (workstation)
   * Used to send tasks to the workstation agent for processing
   */
  async dispatch(request: DispatchRequest): Promise<DispatchResponse> {
    try {
      const response = await this.client.post<DispatchResponse>(
        '/dispatch',
        request
      );

      console.log('[XanderApi] Dispatch successful:', response.data.taskId);

      return response.data;
    } catch (error) {
      const apiError = error as XanderApiError;
      console.error('[XanderApi] Dispatch failed:', apiError);
      throw apiError;
    }
  }

  /**
   * Legacy method: Dispatch work to Silas using simple description
   * @deprecated Use dispatch() instead for more control
   */
  async dispatchToSilas(workDescription: string): Promise<boolean> {
    if (!this.currentSessionId) {
      console.warn('[XanderApi] No active session for dispatch');
      return false;
    }

    try {
      await this.dispatch({
        sessionId: this.currentSessionId,
        summary: workDescription,
        details: workDescription,
      });
      return true;
    } catch (error) {
      console.error('[XanderApi] dispatchToSilas failed:', error);
      return false;
    }
  }

  /**
   * Get the base URL being used
   */
  getBaseUrl(): string {
    return this.client.defaults.baseURL ?? DEFAULT_BASE_URL;
  }

  /**
   * Update the base URL (useful for testing or configuration changes)
   */
  setBaseUrl(url: string): void {
    this.client.defaults.baseURL = url;
    console.log('[XanderApi] Base URL updated:', url);
  }
}

// Default instance for convenience
export const xanderApi = new XanderApi();

export default XanderApi;
