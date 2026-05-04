/**
 * sessionStore - Session state management using Zustand
 *
 * This store manages the state of the voice conversation session
 * with Xander, implementing a state machine for the conversation flow:
 *
 * IDLE -> CONNECTING -> LISTENING -> PROCESSING -> SPEAKING -> LISTENING (loop)
 *
 * Features:
 * - State machine with validated transitions
 * - Inactivity tracking (30-second timeout)
 * - Message history management
 * - Dispatch tracking for Silas tasks
 * - Error handling
 *
 * Phase 4: State Machine - Voice App Flow Control (Issue #5)
 */

import { create } from 'zustand';
import {
  ConversationState,
  Message,
  DispatchedWork,
  isValidTransition,
  SESSION_TIMEOUT,
} from './types';

// Re-export types for backward compatibility
export type { ConversationState, Message, DispatchedWork };

// Legacy type alias for backward compatibility
export type SessionState = ConversationState;

// Session store state interface
export interface SessionStoreState {
  // Session info
  sessionId: string | null;
  sessionState: ConversationState;
  sessionStartedAt: number | null;

  // Activity tracking for inactivity timeout
  lastActivity: number;

  // Conversation
  messages: Message[];
  currentTranscript: string;
  lastXanderResponse: string;

  // Dispatch tracking
  dispatchedWork: DispatchedWork[];

  // Error handling
  error: string | null;

  // Actions
  startSession: () => void;
  endSession: () => void;
  setSessionState: (state: ConversationState) => void;
  transitionTo: (state: ConversationState) => boolean;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setCurrentTranscript: (transcript: string) => void;
  setLastXanderResponse: (response: string) => void;
  addDispatchedWork: (description: string) => void;
  updateDispatchedWork: (
    id: string,
    status: 'pending' | 'completed' | 'failed'
  ) => void;
  setError: (error: string | null) => void;
  updateActivity: () => void;
  getTimeSinceLastActivity: () => number;
  isInactive: () => boolean;
  reset: () => void;
}

// Generate unique ID
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Initial state
const initialState = {
  sessionId: null,
  sessionState: 'idle' as ConversationState,
  sessionStartedAt: null,
  lastActivity: Date.now(),
  messages: [],
  currentTranscript: '',
  lastXanderResponse: '',
  dispatchedWork: [],
  error: null,
};

/**
 * Session store for managing voice conversation state
 *
 * Implements a state machine for the conversation flow with:
 * - Validated state transitions
 * - Inactivity tracking
 * - Message and dispatch management
 */
export const useSessionStore = create<SessionStoreState>((set, get) => ({
  ...initialState,

  /**
   * Start a new conversation session
   * Transitions: idle -> connecting
   */
  startSession: () => {
    const currentState = get().sessionState;

    // Can only start from idle or ended state
    if (currentState !== 'idle' && currentState !== 'ended') {
      console.warn(
        `[SessionStore] Cannot start session from state: ${currentState}`
      );
      return;
    }

    const now = Date.now();
    set({
      sessionId: generateId(),
      sessionState: 'connecting',
      sessionStartedAt: now,
      lastActivity: now,
      messages: [],
      currentTranscript: '',
      lastXanderResponse: '',
      dispatchedWork: [],
      error: null,
    });

    console.log('[SessionStore] Session started, connecting...');
  },

  /**
   * End the current session
   * Transitions: any -> ended
   */
  endSession: () => {
    const currentState = get().sessionState;

    // Already ended or idle, nothing to do
    if (currentState === 'ended' || currentState === 'idle') {
      console.log('[SessionStore] Session already ended or idle');
      return;
    }

    set({
      sessionState: 'ended',
      lastActivity: Date.now(),
    });

    console.log('[SessionStore] Session ended');
  },

  /**
   * Set session state directly (use transitionTo for validation)
   * @deprecated Use transitionTo() instead for validated transitions
   */
  setSessionState: (state: ConversationState) => {
    set({
      sessionState: state,
      lastActivity: Date.now(),
    });
  },

  /**
   * Transition to a new state with validation
   * Returns true if transition was successful, false otherwise
   */
  transitionTo: (newState: ConversationState): boolean => {
    const currentState = get().sessionState;

    // Check if transition is valid
    if (!isValidTransition(currentState, newState)) {
      console.warn(
        `[SessionStore] Invalid transition: ${currentState} -> ${newState}`
      );
      return false;
    }

    set({
      sessionState: newState,
      lastActivity: Date.now(),
      // Clear error when transitioning away from error state
      ...(currentState === 'error' && newState !== 'error' ? { error: null } : {}),
    });

    console.log(`[SessionStore] Transitioned: ${currentState} -> ${newState}`);
    return true;
  },

  /**
   * Add a message to the conversation
   */
  addMessage: (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, message],
      lastActivity: Date.now(),
      ...(role === 'assistant' ? { lastXanderResponse: content } : {}),
    }));

    console.log(`[SessionStore] Message added: ${role}`);
  },

  /**
   * Set the current transcript (partial speech recognition)
   */
  setCurrentTranscript: (transcript: string) => {
    set({
      currentTranscript: transcript,
      lastActivity: Date.now(),
    });
  },

  /**
   * Set the last Xander response
   */
  setLastXanderResponse: (response: string) => {
    set({
      lastXanderResponse: response,
      lastActivity: Date.now(),
    });
  },

  /**
   * Add dispatched work item (task sent to Silas)
   */
  addDispatchedWork: (description: string) => {
    const work: DispatchedWork = {
      id: generateId(),
      description,
      dispatchedAt: Date.now(),
      status: 'pending',
    };

    set((state) => ({
      dispatchedWork: [...state.dispatchedWork, work],
      lastActivity: Date.now(),
    }));

    console.log(`[SessionStore] Work dispatched: ${description}`);
  },

  /**
   * Update status of dispatched work
   */
  updateDispatchedWork: (
    id: string,
    status: 'pending' | 'completed' | 'failed'
  ) => {
    set((state) => ({
      dispatchedWork: state.dispatchedWork.map((work) =>
        work.id === id ? { ...work, status } : work
      ),
      lastActivity: Date.now(),
    }));
  },

  /**
   * Set error state
   */
  setError: (error: string | null) => {
    if (error) {
      set({
        error,
        sessionState: 'error',
        lastActivity: Date.now(),
      });
      console.error(`[SessionStore] Error: ${error}`);
    } else {
      set({
        error: null,
        lastActivity: Date.now(),
      });
    }
  },

  /**
   * Update last activity timestamp
   * Call this whenever user interacts with the app
   */
  updateActivity: () => {
    set({ lastActivity: Date.now() });
  },

  /**
   * Get time since last activity in milliseconds
   */
  getTimeSinceLastActivity: (): number => {
    return Date.now() - get().lastActivity;
  },

  /**
   * Check if session is inactive (exceeded timeout)
   */
  isInactive: (): boolean => {
    const timeSinceActivity = get().getTimeSinceLastActivity();
    return timeSinceActivity >= SESSION_TIMEOUT.INACTIVITY_MS;
  },

  /**
   * Reset store to initial state
   */
  reset: () => {
    set(initialState);
    console.log('[SessionStore] Store reset');
  },
}));

export default useSessionStore;
