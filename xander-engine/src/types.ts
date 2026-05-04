/**
 * Message roles in conversation
 */
export type MessageRole = 'user' | 'assistant';

/**
 * A single message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  timestamp: string;
}

/**
 * Session metadata for tracking conversation context
 */
export interface SessionMetadata {
  dispatchCount: number;
  topicsDiscussed: string[];
}

/**
 * A conversation session
 */
export interface Session {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  metadata: SessionMetadata;
}

/**
 * Request to send a chat message
 */
export interface ChatRequest {
  sessionId: string;
  message: string;
}

/**
 * Response from the chat endpoint
 */
export interface ChatResponse {
  sessionId: string;
  response: string;
  suggestDispatch?: boolean;
  dispatchSummary?: string;
  dispatchDetails?: string;
}

/**
 * Request to dispatch work to Silas
 */
export interface DispatchRequest {
  sessionId: string;
  summary: string;
  details: string;
}

/**
 * Response from the dispatch endpoint
 */
export interface DispatchResponse {
  success: boolean;
  taskId: string;
  message: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  agent: string;
  version: string;
}

/**
 * Result from LLM including parsed dispatch info
 */
export interface LLMResult {
  content: string;
  suggestDispatch: boolean;
  dispatchSummary?: string;
  dispatchDetails?: string;
}

/**
 * Session timeout constants (in milliseconds)
 */
export const SESSION_TIMEOUT = {
  INACTIVITY_MS: 30 * 60 * 1000, // 30 minutes
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;
