/**
 * sessionStore - Session state management using Zustand
 *
 * This store manages the state of the voice conversation session
 * with Xander, including:
 * - Current session info
 * - Conversation messages
 * - App state (listening, speaking, idle, etc.)
 * - Dispatch tracking
 *
 * Will be implemented in Phase 4
 */

import { create } from 'zustand';

// Session states for the voice app state machine
export type SessionState =
  | 'idle' // No active session
  | 'starting' // Initializing session
  | 'listening' // Listening for user speech
  | 'processing' // Processing user speech
  | 'thinking' // Waiting for Xander response
  | 'speaking' // Xander is speaking
  | 'ending' // Session is ending
  | 'error'; // Error state

// Message in the conversation
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// Dispatched work item
export interface DispatchedWork {
  id: string;
  description: string;
  dispatchedAt: number;
  status: 'pending' | 'completed' | 'failed';
}

// Session store state
export interface SessionStoreState {
  // Session info
  sessionId: string | null;
  sessionState: SessionState;
  sessionStartedAt: number | null;

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
  setSessionState: (state: SessionState) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  setCurrentTranscript: (transcript: string) => void;
  setLastXanderResponse: (response: string) => void;
  addDispatchedWork: (description: string) => void;
  updateDispatchedWork: (
    id: string,
    status: 'pending' | 'completed' | 'failed'
  ) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Initial state
const initialState = {
  sessionId: null,
  sessionState: 'idle' as SessionState,
  sessionStartedAt: null,
  messages: [],
  currentTranscript: '',
  lastXanderResponse: '',
  dispatchedWork: [],
  error: null,
};

/**
 * Session store for managing voice conversation state
 */
export const useSessionStore = create<SessionStoreState>((set) => ({
  ...initialState,

  startSession: () => {
    set({
      sessionId: generateId(),
      sessionState: 'starting',
      sessionStartedAt: Date.now(),
      messages: [],
      currentTranscript: '',
      lastXanderResponse: '',
      dispatchedWork: [],
      error: null,
    });
  },

  endSession: () => {
    set({
      sessionState: 'ending',
    });
    // After cleanup, reset to idle
    setTimeout(() => {
      set({ sessionState: 'idle' });
    }, 100);
  },

  setSessionState: (state: SessionState) => {
    set({ sessionState: state });
  },

  addMessage: (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
      ...(role === 'assistant' ? { lastXanderResponse: content } : {}),
    }));
  },

  setCurrentTranscript: (transcript: string) => {
    set({ currentTranscript: transcript });
  },

  setLastXanderResponse: (response: string) => {
    set({ lastXanderResponse: response });
  },

  addDispatchedWork: (description: string) => {
    const work: DispatchedWork = {
      id: generateId(),
      description,
      dispatchedAt: Date.now(),
      status: 'pending',
    };
    set((state) => ({
      dispatchedWork: [...state.dispatchedWork, work],
    }));
  },

  updateDispatchedWork: (
    id: string,
    status: 'pending' | 'completed' | 'failed'
  ) => {
    set((state) => ({
      dispatchedWork: state.dispatchedWork.map((work) =>
        work.id === id ? { ...work, status } : work
      ),
    }));
  },

  setError: (error: string | null) => {
    set({
      error,
      sessionState: error ? 'error' : 'idle',
    });
  },

  reset: () => {
    set(initialState);
  },
}));

export default useSessionStore;
