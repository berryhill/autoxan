/**
 * types.ts - Type definitions for the session store
 *
 * This file contains all type definitions used by the session store
 * and state machine for the voice conversation flow.
 */

/**
 * ConversationState - All possible states in the voice app state machine
 *
 * State Flow:
 * IDLE -> CONNECTING -> LISTENING -> PROCESSING -> SPEAKING -> LISTENING (loop)
 *                |           |            |           |
 *                v           v            v           v
 *             ERROR -----------------------------------------> ENDED
 *
 * States:
 * - idle: App just opened, no active session
 * - connecting: Connecting to Xander (health check, session start)
 * - listening: Actively listening for user speech
 * - processing: Processing user speech, sending to Xander
 * - speaking: TTS playing Xander's response
 * - error: An error occurred
 * - ended: Session has ended (final state)
 */
export type ConversationState =
  | 'idle' // App just opened, not started
  | 'connecting' // Connecting to Xander
  | 'listening' // Waiting for user speech
  | 'processing' // Sending to Xander, waiting for response
  | 'speaking' // TTS playing Xander's response
  | 'error' // Error occurred
  | 'ended'; // Session ended

/**
 * Valid state transitions map
 * Defines which states can transition to which other states
 */
export const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  idle: ['connecting'],
  connecting: ['listening', 'error'],
  listening: ['processing', 'error', 'ended'],
  processing: ['speaking', 'error', 'ended'],
  speaking: ['listening', 'error', 'ended'],
  error: ['idle', 'connecting', 'ended'],
  ended: ['idle'], // Can restart after ended
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: ConversationState,
  to: ConversationState
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Message in the conversation
 */
export interface Message {
  /** Unique identifier */
  id: string;
  /** Role of the speaker */
  role: 'user' | 'assistant';
  /** Message content */
  content: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

/**
 * Dispatched work item - tasks sent to Silas
 */
export interface DispatchedWork {
  /** Unique identifier */
  id: string;
  /** Description of the work */
  description: string;
  /** Unix timestamp when dispatched */
  dispatchedAt: number;
  /** Current status */
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Session timeout configuration
 */
export const SESSION_TIMEOUT = {
  /** Inactivity timeout in milliseconds (30 seconds) */
  INACTIVITY_MS: 30000,
  /** Warning before timeout in milliseconds (25 seconds) */
  WARNING_MS: 25000,
} as const;

/**
 * Keywords that trigger session end
 */
export const GOODBYE_KEYWORDS = [
  'goodbye',
  'bye',
  'see you',
  'talk to you later',
  'end session',
  'stop',
  'quit',
  'exit',
] as const;

/**
 * Check if text contains a goodbye keyword
 */
export function containsGoodbye(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  return GOODBYE_KEYWORDS.some(
    (keyword) =>
      lowerText === keyword ||
      lowerText.startsWith(keyword + ' ') ||
      lowerText.endsWith(' ' + keyword) ||
      lowerText.includes(' ' + keyword + ' ')
  );
}
