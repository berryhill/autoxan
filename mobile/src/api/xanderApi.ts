/**
 * xanderApi - HTTP client for Xander agent via Hermes
 *
 * This module provides the HTTP client for communicating with the
 * Hermes agent running in Termux on the phone.
 *
 * Features:
 * - Send user messages to Hermes (OpenRouter-compatible chat endpoint)
 * - Receive responses with dispatch block parsing
 * - Session management (start, end, get session)
 * - Handle connection errors gracefully
 * - Dispatch functionality to silas-workstation
 * - Health check for Hermes availability
 *
 * The Hermes agent runs locally in Termux at http://localhost:8080
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:8080';
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Hermes/OpenRouter endpoint paths
const HERMES_ENDPOINTS = {
  chat: '/v1/chat/completions', // OpenRouter compatible
  health: '/health',
  session: '/session',
};

// ====================
// Hermes-specific Types
// ====================

/**
 * Message format for Hermes/OpenRouter chat API
 */
export interface HermesMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Request body for Hermes chat completions (OpenRouter format)
 */
export interface HermesChatRequest {
  model?: string;
  messages: HermesMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Choice from Hermes/OpenRouter response
 */
export interface HermesChoice {
  index: number;
  message: HermesMessage;
  finish_reason: string | null;
}

/**
 * Raw response from Hermes/OpenRouter chat completions endpoint
 */
export interface HermesChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: HermesChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Parsed dispatch information from response content
 */
export interface HermesDispatch {
  suggested: boolean;
  summary?: string;
  details?: string;
}

/**
 * Processed chat response with parsed dispatch info
 */
export interface HermesChatResponse {
  response: string;
  dispatch?: HermesDispatch;
  rawContent: string;
}

/**
 * Session data from Hermes
 */
export interface HermesSessionResponse {
  sessionId: string;
  messages: HermesMessage[];
}

// ====================
// Legacy Types (backward compatibility)
// ====================

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
    dispatchDetails?: string;
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

// ====================
// Dispatch Block Parsing
// ====================

/**
 * Parse [DISPATCH_SUGGESTED] blocks from response content
 *
 * Format:
 * [DISPATCH_SUGGESTED]
 * Summary: ...
 * Details: ...
 * [/DISPATCH_SUGGESTED]
 */
export function parseDispatchBlock(content: string): HermesDispatch {
  const dispatchRegex =
    /\[DISPATCH_SUGGESTED\]\s*(?:\n|\r\n)?Summary:\s*(.+?)(?:\n|\r\n)Details:\s*([\s\S]*?)\[\/DISPATCH_SUGGESTED\]/i;

  const match = content.match(dispatchRegex);

  if (match) {
    return {
      suggested: true,
      summary: match[1].trim(),
      details: match[2].trim(),
    };
  }

  return { suggested: false };
}

/**
 * Remove dispatch block from response content for clean display
 */
export function removeDispatchBlock(content: string): string {
  const dispatchRegex =
    /\s*\[DISPATCH_SUGGESTED\][\s\S]*?\[\/DISPATCH_SUGGESTED\]\s*/gi;
  // Replace dispatch blocks and then normalize multiple newlines
  const result = content.replace(dispatchRegex, '\n\n');
  // Clean up excessive newlines and trim
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ====================
// Error Handling
// ====================

/**
 * Convert AxiosError to user-friendly XanderApiError
 */
function convertAxiosError(error: AxiosError): XanderApiError {
  // Network errors (no response)
  if (!error.response) {
    if (error.code === 'ECONNREFUSED') {
      return {
        code: 'CONNECTION_REFUSED',
        message:
          'Cannot connect to Hermes. Make sure Hermes is running in Termux.',
        details: error.message,
      };
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return {
        code: 'TIMEOUT',
        message: 'Request to Hermes timed out. Please try again.',
        details: error.message,
      };
    }
    if (error.code === 'ENETUNREACH' || error.code === 'ENOTFOUND') {
      return {
        code: 'NETWORK_ERROR',
        message:
          'Network error. Check your connection and make sure Hermes is running.',
        details: error.message,
      };
    }
    return {
      code: error.code ?? 'NETWORK_ERROR',
      message: 'Unable to reach Hermes. Check your connection.',
      details: error.message,
    };
  }

  // Server errors (has response)
  const status = error.response.status;
  const data = error.response.data as Record<string, unknown> | undefined;

  if (status === 400) {
    return {
      code: 'BAD_REQUEST',
      message:
        (data?.message as string) ?? 'Invalid request. Please check your input.',
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
      message: 'Hermes encountered an internal error. Please try again.',
      details: data,
    };
  }
  if (status === 503) {
    return {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Hermes is temporarily unavailable. Please try again later.',
      details: data,
    };
  }

  return {
    code: `HTTP_${status}`,
    message: (data?.message as string) ?? `Request failed with status ${status}`,
    details: data,
  };
}

// ====================
// API Client Factory
// ====================

/**
 * Create an axios instance configured for Hermes API
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

// ====================
// XanderApi Class
// ====================

/**
 * XanderApi class for interacting with the Hermes agent
 *
 * Provides full HTTP client functionality for:
 * - Session management
 * - Message sending/receiving via OpenRouter-compatible endpoint
 * - Dispatch block parsing for Silas tasks
 * - Health checking
 */
export class XanderApi {
  private client: AxiosInstance;
  private currentSessionId: string | null = null;
  private conversationHistory: HermesMessage[] = [];

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
   * Get the conversation history
   */
  getConversationHistory(): HermesMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Check if Hermes agent is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get(HERMES_ENDPOINTS.health);
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
      const response = await this.client.post<HermesSessionResponse>(
        HERMES_ENDPOINTS.session
      );
      const session = response.data;

      this.currentSessionId = session.sessionId;
      this.conversationHistory = [];
      console.log('[XanderApi] Session started:', session.sessionId);

      // Convert to XanderSession format
      return {
        sessionId: session.sessionId,
        messages: session.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      // If we get an error, create a local session as fallback
      const sessionId = `local-session-${Date.now()}`;
      this.currentSessionId = sessionId;
      this.conversationHistory = [];
      console.warn(
        '[XanderApi] Failed to start remote session, using local:',
        error
      );

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
      await this.client.delete(
        `${HERMES_ENDPOINTS.session}/${this.currentSessionId}`
      );
      console.log('[XanderApi] Session ended:', this.currentSessionId);
    } catch (error) {
      console.warn('[XanderApi] Failed to end session on server:', error);
    } finally {
      this.currentSessionId = null;
      this.conversationHistory = [];
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
      const response = await this.client.get<HermesSessionResponse>(
        `${HERMES_ENDPOINTS.session}/${this.currentSessionId}`
      );
      const session = response.data;

      return {
        sessionId: session.sessionId,
        messages: session.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('[XanderApi] Failed to get session:', error);
      // Return a minimal session if server is unreachable
      return {
        sessionId: this.currentSessionId,
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Send a message to Hermes and get a response
   * Uses OpenRouter-compatible chat completions endpoint
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
      // Add user message to conversation history
      const userMessage: HermesMessage = {
        role: 'user',
        content: message.trim(),
      };
      this.conversationHistory.push(userMessage);

      // Build chat request in OpenRouter format
      const chatRequest: HermesChatRequest = {
        messages: this.conversationHistory,
        stream: false,
      };

      const response = await this.client.post<HermesChatCompletionResponse>(
        HERMES_ENDPOINTS.chat,
        chatRequest
      );

      const data = response.data;
      const assistantMessage = data.choices[0]?.message;

      if (!assistantMessage) {
        throw {
          code: 'INVALID_RESPONSE',
          message: 'No response from Hermes',
        } as XanderApiError;
      }

      // Add assistant message to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage.content,
      });

      // Parse dispatch block from response
      const dispatch = parseDispatchBlock(assistantMessage.content);
      const cleanResponse = removeDispatchBlock(assistantMessage.content);

      console.log('[XanderApi] Message sent successfully');

      return {
        message: cleanResponse,
        sessionId: this.currentSessionId!,
        metadata: {
          suggestDispatch: dispatch.suggested,
          dispatchSummary: dispatch.summary,
          dispatchDetails: dispatch.details,
        },
      };
    } catch (error) {
      const apiError = error as XanderApiError;
      console.error('[XanderApi] Failed to send message:', apiError);
      throw apiError;
    }
  }

  /**
   * Send a raw chat completion request (for advanced use)
   */
  async sendChatCompletion(
    request: HermesChatRequest
  ): Promise<HermesChatResponse> {
    try {
      const response = await this.client.post<HermesChatCompletionResponse>(
        HERMES_ENDPOINTS.chat,
        request
      );

      const data = response.data;
      const assistantMessage = data.choices[0]?.message;

      if (!assistantMessage) {
        throw {
          code: 'INVALID_RESPONSE',
          message: 'No response from Hermes',
        } as XanderApiError;
      }

      const dispatch = parseDispatchBlock(assistantMessage.content);
      const cleanResponse = removeDispatchBlock(assistantMessage.content);

      return {
        response: cleanResponse,
        dispatch: dispatch.suggested ? dispatch : undefined,
        rawContent: assistantMessage.content,
      };
    } catch (error) {
      const apiError = error as XanderApiError;
      console.error('[XanderApi] Chat completion failed:', apiError);
      throw apiError;
    }
  }

  /**
   * Dispatch work to Silas (workstation)
   * Used to send tasks to the workstation agent for processing
   */
  async dispatch(request: DispatchRequest): Promise<DispatchResponse> {
    try {
      // For Hermes, dispatch is done via MCP protocol
      // We construct a message that triggers the dispatch
      const dispatchMessage = `Please dispatch this task to Silas:

Summary: ${request.summary}
Details: ${request.details}

Session: ${request.sessionId}`;

      const chatRequest: HermesChatRequest = {
        messages: [
          {
            role: 'user',
            content: dispatchMessage,
          },
        ],
        stream: false,
      };

      const response = await this.client.post<HermesChatCompletionResponse>(
        HERMES_ENDPOINTS.chat,
        chatRequest
      );

      // Generate a task ID for tracking
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('[XanderApi] Dispatch successful:', taskId);

      return {
        success: true,
        taskId,
        message:
          response.data.choices[0]?.message?.content ||
          'Task dispatched successfully',
      };
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

  /**
   * Clear conversation history (for new topic without new session)
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log('[XanderApi] Conversation history cleared');
  }
}

// Default instance for convenience
export const xanderApi = new XanderApi();

export default XanderApi;
