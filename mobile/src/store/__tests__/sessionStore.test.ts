/**
 * sessionStore.test.ts - Unit tests for session store
 *
 * Tests the state machine implementation including:
 * - State transitions (valid and invalid)
 * - Inactivity timeout logic
 * - Message handling
 * - Error states
 * - Edge cases
 *
 * Phase 4: State Machine - Voice App Flow Control (Issue #5)
 */

import { useSessionStore } from '../sessionStore';
import {
  ConversationState,
  isValidTransition,
  containsGoodbye,
  VALID_TRANSITIONS,
  SESSION_TIMEOUT,
  GOODBYE_KEYWORDS,
} from '../types';

describe('sessionStore', () => {
  // Reset store before each test
  beforeEach(() => {
    useSessionStore.getState().reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSessionStore.getState();

      expect(state.sessionId).toBeNull();
      expect(state.sessionState).toBe('idle');
      expect(state.sessionStartedAt).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.currentTranscript).toBe('');
      expect(state.lastXanderResponse).toBe('');
      expect(state.dispatchedWork).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('should have lastActivity set to current time', () => {
      const state = useSessionStore.getState();
      const now = Date.now();

      // lastActivity should be close to now (within 1 second)
      expect(state.lastActivity).toBeGreaterThan(now - 1000);
      expect(state.lastActivity).toBeLessThanOrEqual(now);
    });
  });

  describe('startSession', () => {
    it('should start session from idle state', () => {
      const { startSession } = useSessionStore.getState();

      startSession();

      const state = useSessionStore.getState();
      expect(state.sessionId).not.toBeNull();
      expect(state.sessionState).toBe('connecting');
      expect(state.sessionStartedAt).not.toBeNull();
    });

    it('should start session from ended state', () => {
      const { transitionTo, startSession } = useSessionStore.getState();

      // First start and end a session
      startSession();
      useSessionStore.getState().transitionTo('listening');
      useSessionStore.getState().endSession();

      // Now start a new session
      useSessionStore.getState().startSession();

      const state = useSessionStore.getState();
      expect(state.sessionState).toBe('connecting');
      expect(state.messages).toEqual([]);
    });

    it('should not start session from non-idle states', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      // Start session first
      startSession();

      // Try to start again while connecting
      const sessionId = useSessionStore.getState().sessionId;
      useSessionStore.getState().startSession();

      // Should still be in connecting state with same session
      const state = useSessionStore.getState();
      expect(state.sessionState).toBe('connecting');
      expect(state.sessionId).toBe(sessionId);
    });

    it('should clear previous messages and errors on start', () => {
      const { startSession, addMessage, setError } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      addMessage('user', 'Hello');
      setError('Test error');

      // Start new session
      useSessionStore.getState().endSession();
      useSessionStore.getState().startSession();

      const state = useSessionStore.getState();
      expect(state.messages).toEqual([]);
      expect(state.error).toBeNull();
    });
  });

  describe('endSession', () => {
    it('should end an active session', () => {
      const { startSession, endSession, transitionTo } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      useSessionStore.getState().endSession();

      const state = useSessionStore.getState();
      expect(state.sessionState).toBe('ended');
    });

    it('should do nothing when already ended', () => {
      const { startSession } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      useSessionStore.getState().endSession();
      useSessionStore.getState().endSession(); // Call again

      const state = useSessionStore.getState();
      expect(state.sessionState).toBe('ended');
    });

    it('should do nothing when idle', () => {
      const { endSession } = useSessionStore.getState();

      endSession();

      const state = useSessionStore.getState();
      expect(state.sessionState).toBe('idle');
    });
  });

  describe('transitionTo', () => {
    it('should allow valid transitions', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      startSession(); // idle -> connecting

      expect(useSessionStore.getState().transitionTo('listening')).toBe(true);
      expect(useSessionStore.getState().sessionState).toBe('listening');

      expect(useSessionStore.getState().transitionTo('processing')).toBe(true);
      expect(useSessionStore.getState().sessionState).toBe('processing');

      expect(useSessionStore.getState().transitionTo('speaking')).toBe(true);
      expect(useSessionStore.getState().sessionState).toBe('speaking');

      expect(useSessionStore.getState().transitionTo('listening')).toBe(true);
      expect(useSessionStore.getState().sessionState).toBe('listening');
    });

    it('should reject invalid transitions', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      startSession(); // idle -> connecting

      // Cannot go from connecting to processing directly
      expect(useSessionStore.getState().transitionTo('processing')).toBe(false);
      expect(useSessionStore.getState().sessionState).toBe('connecting');

      // Cannot go from connecting to speaking directly
      expect(useSessionStore.getState().transitionTo('speaking')).toBe(false);
      expect(useSessionStore.getState().sessionState).toBe('connecting');
    });

    it('should allow error transition from any active state', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');

      expect(useSessionStore.getState().transitionTo('error')).toBe(true);
      expect(useSessionStore.getState().sessionState).toBe('error');
    });

    it('should clear error when transitioning away from error state', () => {
      const { startSession, setError, transitionTo } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      setError('Test error');

      // Transition back to idle
      useSessionStore.getState().transitionTo('error');
      useSessionStore.getState().transitionTo('idle');

      const state = useSessionStore.getState();
      expect(state.error).toBeNull();
    });

    it('should update lastActivity on transition', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      startSession();
      const initialActivity = useSessionStore.getState().lastActivity;

      jest.advanceTimersByTime(1000);
      useSessionStore.getState().transitionTo('listening');

      const newActivity = useSessionStore.getState().lastActivity;
      expect(newActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Message Management', () => {
    it('should add user message', () => {
      const { startSession, addMessage } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      addMessage('user', 'Hello Xander');

      const state = useSessionStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('user');
      expect(state.messages[0].content).toBe('Hello Xander');
      expect(state.messages[0].id).toBeDefined();
      expect(state.messages[0].timestamp).toBeDefined();
    });

    it('should add assistant message and update lastXanderResponse', () => {
      const { startSession, addMessage } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      addMessage('assistant', 'Hello! How can I help?');

      const state = useSessionStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].role).toBe('assistant');
      expect(state.lastXanderResponse).toBe('Hello! How can I help?');
    });

    it('should maintain message order', () => {
      const { startSession, addMessage } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');
      addMessage('user', 'First');
      addMessage('assistant', 'Second');
      addMessage('user', 'Third');

      const state = useSessionStore.getState();
      expect(state.messages).toHaveLength(3);
      expect(state.messages[0].content).toBe('First');
      expect(state.messages[1].content).toBe('Second');
      expect(state.messages[2].content).toBe('Third');
    });

    it('should update lastActivity when adding messages', () => {
      const { startSession, addMessage } = useSessionStore.getState();

      startSession();
      const initialActivity = useSessionStore.getState().lastActivity;

      jest.advanceTimersByTime(1000);
      addMessage('user', 'Test');

      const newActivity = useSessionStore.getState().lastActivity;
      expect(newActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Transcript Management', () => {
    it('should set current transcript', () => {
      const { setCurrentTranscript } = useSessionStore.getState();

      setCurrentTranscript('Hello');

      expect(useSessionStore.getState().currentTranscript).toBe('Hello');
    });

    it('should update lastActivity when setting transcript', () => {
      const { setCurrentTranscript } = useSessionStore.getState();

      const initialActivity = useSessionStore.getState().lastActivity;

      jest.advanceTimersByTime(1000);
      setCurrentTranscript('Test');

      const newActivity = useSessionStore.getState().lastActivity;
      expect(newActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Dispatched Work', () => {
    it('should add dispatched work', () => {
      const { addDispatchedWork } = useSessionStore.getState();

      addDispatchedWork('Create a new feature');

      const state = useSessionStore.getState();
      expect(state.dispatchedWork).toHaveLength(1);
      expect(state.dispatchedWork[0].description).toBe('Create a new feature');
      expect(state.dispatchedWork[0].status).toBe('pending');
      expect(state.dispatchedWork[0].id).toBeDefined();
      expect(state.dispatchedWork[0].dispatchedAt).toBeDefined();
    });

    it('should update dispatched work status', () => {
      const { addDispatchedWork, updateDispatchedWork } = useSessionStore.getState();

      addDispatchedWork('Task 1');
      const workId = useSessionStore.getState().dispatchedWork[0].id;

      updateDispatchedWork(workId, 'completed');

      const state = useSessionStore.getState();
      expect(state.dispatchedWork[0].status).toBe('completed');
    });

    it('should not affect other work items when updating', () => {
      const { addDispatchedWork, updateDispatchedWork } = useSessionStore.getState();

      addDispatchedWork('Task 1');
      addDispatchedWork('Task 2');

      const firstWorkId = useSessionStore.getState().dispatchedWork[0].id;
      updateDispatchedWork(firstWorkId, 'failed');

      const state = useSessionStore.getState();
      expect(state.dispatchedWork[0].status).toBe('failed');
      expect(state.dispatchedWork[1].status).toBe('pending');
    });
  });

  describe('Error Handling', () => {
    it('should set error and transition to error state', () => {
      const { setError } = useSessionStore.getState();

      setError('Something went wrong');

      const state = useSessionStore.getState();
      expect(state.error).toBe('Something went wrong');
      expect(state.sessionState).toBe('error');
    });

    it('should clear error when set to null', () => {
      const { setError } = useSessionStore.getState();

      setError('Error');
      setError(null);

      const state = useSessionStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Activity Tracking', () => {
    it('should update activity timestamp', () => {
      const { updateActivity } = useSessionStore.getState();

      const initialActivity = useSessionStore.getState().lastActivity;

      jest.advanceTimersByTime(5000);
      updateActivity();

      const newActivity = useSessionStore.getState().lastActivity;
      expect(newActivity).toBeGreaterThan(initialActivity);
    });

    it('should calculate time since last activity', () => {
      const { getTimeSinceLastActivity, updateActivity } = useSessionStore.getState();

      updateActivity();
      jest.advanceTimersByTime(10000);

      const timeSince = getTimeSinceLastActivity();
      expect(timeSince).toBeGreaterThanOrEqual(10000);
    });

    it('should detect inactivity correctly', () => {
      const { isInactive, updateActivity } = useSessionStore.getState();

      updateActivity();
      expect(isInactive()).toBe(false);

      jest.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS + 1000);

      expect(isInactive()).toBe(true);
    });

    it('should not be inactive immediately after activity update', () => {
      const { isInactive, updateActivity } = useSessionStore.getState();

      jest.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS + 1000);
      expect(isInactive()).toBe(true);

      updateActivity();
      expect(isInactive()).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      const {
        startSession,
        addMessage,
        addDispatchedWork,
        setError,
        reset,
      } = useSessionStore.getState();

      // Make some changes
      startSession();
      useSessionStore.getState().transitionTo('listening');
      addMessage('user', 'Hello');
      addDispatchedWork('Task');
      setError('Error');

      // Reset
      reset();

      const state = useSessionStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.sessionState).toBe('idle');
      expect(state.messages).toEqual([]);
      expect(state.dispatchedWork).toEqual([]);
      expect(state.error).toBeNull();
    });
  });
});

describe('types', () => {
  describe('isValidTransition', () => {
    it('should validate idle -> connecting', () => {
      expect(isValidTransition('idle', 'connecting')).toBe(true);
    });

    it('should validate connecting -> listening', () => {
      expect(isValidTransition('connecting', 'listening')).toBe(true);
    });

    it('should validate connecting -> error', () => {
      expect(isValidTransition('connecting', 'error')).toBe(true);
    });

    it('should validate listening -> processing', () => {
      expect(isValidTransition('listening', 'processing')).toBe(true);
    });

    it('should validate listening -> error', () => {
      expect(isValidTransition('listening', 'error')).toBe(true);
    });

    it('should validate listening -> ended', () => {
      expect(isValidTransition('listening', 'ended')).toBe(true);
    });

    it('should validate processing -> speaking', () => {
      expect(isValidTransition('processing', 'speaking')).toBe(true);
    });

    it('should validate processing -> error', () => {
      expect(isValidTransition('processing', 'error')).toBe(true);
    });

    it('should validate speaking -> listening', () => {
      expect(isValidTransition('speaking', 'listening')).toBe(true);
    });

    it('should validate speaking -> ended', () => {
      expect(isValidTransition('speaking', 'ended')).toBe(true);
    });

    it('should validate error -> idle', () => {
      expect(isValidTransition('error', 'idle')).toBe(true);
    });

    it('should validate error -> connecting', () => {
      expect(isValidTransition('error', 'connecting')).toBe(true);
    });

    it('should validate ended -> idle', () => {
      expect(isValidTransition('ended', 'idle')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidTransition('idle', 'listening')).toBe(false);
      expect(isValidTransition('idle', 'processing')).toBe(false);
      expect(isValidTransition('idle', 'speaking')).toBe(false);
      expect(isValidTransition('connecting', 'speaking')).toBe(false);
      expect(isValidTransition('listening', 'speaking')).toBe(false);
      expect(isValidTransition('speaking', 'processing')).toBe(false);
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('should have transitions defined for all states', () => {
      const allStates: ConversationState[] = [
        'idle',
        'connecting',
        'listening',
        'processing',
        'speaking',
        'error',
        'ended',
      ];

      allStates.forEach((state) => {
        expect(VALID_TRANSITIONS[state]).toBeDefined();
        expect(Array.isArray(VALID_TRANSITIONS[state])).toBe(true);
      });
    });
  });

  describe('containsGoodbye', () => {
    it('should detect exact goodbye keywords', () => {
      expect(containsGoodbye('goodbye')).toBe(true);
      expect(containsGoodbye('bye')).toBe(true);
      expect(containsGoodbye('see you')).toBe(true);
      expect(containsGoodbye('talk to you later')).toBe(true);
      expect(containsGoodbye('end session')).toBe(true);
      expect(containsGoodbye('stop')).toBe(true);
      expect(containsGoodbye('quit')).toBe(true);
      expect(containsGoodbye('exit')).toBe(true);
    });

    it('should detect goodbye at start of sentence', () => {
      expect(containsGoodbye('goodbye for now')).toBe(true);
      expect(containsGoodbye('bye everyone')).toBe(true);
    });

    it('should detect goodbye at end of sentence', () => {
      expect(containsGoodbye('I need to say goodbye')).toBe(true);
      expect(containsGoodbye('okay bye')).toBe(true);
    });

    it('should detect goodbye in middle of sentence', () => {
      expect(containsGoodbye('I think bye is appropriate')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(containsGoodbye('GOODBYE')).toBe(true);
      expect(containsGoodbye('Goodbye')).toBe(true);
      expect(containsGoodbye('BYE')).toBe(true);
    });

    it('should not match partial words', () => {
      expect(containsGoodbye('bygone')).toBe(false);
      expect(containsGoodbye('bypass')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(containsGoodbye('')).toBe(false);
      expect(containsGoodbye('   ')).toBe(false);
    });

    it('should not match unrelated text', () => {
      expect(containsGoodbye('hello there')).toBe(false);
      expect(containsGoodbye('how are you')).toBe(false);
      expect(containsGoodbye('what time is it')).toBe(false);
    });
  });

  describe('SESSION_TIMEOUT', () => {
    it('should have INACTIVITY_MS of 30 seconds', () => {
      expect(SESSION_TIMEOUT.INACTIVITY_MS).toBe(30000);
    });

    it('should have WARNING_MS of 25 seconds', () => {
      expect(SESSION_TIMEOUT.WARNING_MS).toBe(25000);
    });

    it('should have warning before inactivity timeout', () => {
      expect(SESSION_TIMEOUT.WARNING_MS).toBeLessThan(SESSION_TIMEOUT.INACTIVITY_MS);
    });
  });

  describe('GOODBYE_KEYWORDS', () => {
    it('should contain expected keywords', () => {
      expect(GOODBYE_KEYWORDS).toContain('goodbye');
      expect(GOODBYE_KEYWORDS).toContain('bye');
      expect(GOODBYE_KEYWORDS).toContain('see you');
      expect(GOODBYE_KEYWORDS).toContain('stop');
      expect(GOODBYE_KEYWORDS).toContain('exit');
    });
  });
});

describe('State Machine Edge Cases', () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rapid State Changes', () => {
    it('should handle rapid valid transitions', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      startSession();
      expect(useSessionStore.getState().sessionState).toBe('connecting');

      useSessionStore.getState().transitionTo('listening');
      expect(useSessionStore.getState().sessionState).toBe('listening');

      useSessionStore.getState().transitionTo('processing');
      expect(useSessionStore.getState().sessionState).toBe('processing');

      useSessionStore.getState().transitionTo('speaking');
      expect(useSessionStore.getState().sessionState).toBe('speaking');

      useSessionStore.getState().transitionTo('listening');
      expect(useSessionStore.getState().sessionState).toBe('listening');
    });

    it('should maintain state after invalid transition attempts', () => {
      const { startSession, transitionTo } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');

      // Try invalid transition
      const result = useSessionStore.getState().transitionTo('idle');

      expect(result).toBe(false);
      expect(useSessionStore.getState().sessionState).toBe('listening');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple message additions', () => {
      const { startSession, addMessage } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');

      // Add multiple messages rapidly
      for (let i = 0; i < 10; i++) {
        addMessage('user', `Message ${i}`);
      }

      const state = useSessionStore.getState();
      expect(state.messages).toHaveLength(10);
      expect(state.messages[9].content).toBe('Message 9');
    });

    it('should generate unique IDs for messages', () => {
      const { startSession, addMessage } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');

      addMessage('user', 'First');
      addMessage('user', 'Second');

      const state = useSessionStore.getState();
      expect(state.messages[0].id).not.toBe(state.messages[1].id);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from error state to idle', () => {
      const { setError, transitionTo } = useSessionStore.getState();

      setError('Connection failed');
      expect(useSessionStore.getState().sessionState).toBe('error');

      useSessionStore.getState().transitionTo('idle');
      expect(useSessionStore.getState().sessionState).toBe('idle');
      expect(useSessionStore.getState().error).toBeNull();
    });

    it('should recover from error state to connecting', () => {
      const { setError, transitionTo } = useSessionStore.getState();

      setError('Temporary error');
      expect(useSessionStore.getState().sessionState).toBe('error');

      useSessionStore.getState().transitionTo('connecting');
      expect(useSessionStore.getState().sessionState).toBe('connecting');
      expect(useSessionStore.getState().error).toBeNull();
    });

    it('should allow ending from error state', () => {
      const { setError, transitionTo } = useSessionStore.getState();

      setError('Fatal error');
      useSessionStore.getState().transitionTo('ended');

      expect(useSessionStore.getState().sessionState).toBe('ended');
    });
  });

  describe('Session Restart', () => {
    it('should allow restarting after session ends', () => {
      const { startSession, addMessage, transitionTo, endSession } = useSessionStore.getState();

      // First session
      startSession();
      useSessionStore.getState().transitionTo('listening');
      addMessage('user', 'Hello');
      useSessionStore.getState().endSession();

      expect(useSessionStore.getState().sessionState).toBe('ended');

      // Restart
      useSessionStore.getState().startSession();

      const state = useSessionStore.getState();
      expect(state.sessionState).toBe('connecting');
      expect(state.messages).toEqual([]);
    });
  });

  describe('Inactivity Edge Cases', () => {
    it('should track inactivity across state transitions', () => {
      const { startSession, transitionTo, getTimeSinceLastActivity } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');

      jest.advanceTimersByTime(15000);
      const timeAfter15s = getTimeSinceLastActivity();

      // Time should be around 15 seconds
      expect(timeAfter15s).toBeGreaterThanOrEqual(15000);
      expect(timeAfter15s).toBeLessThan(20000);
    });

    it('should reset inactivity on message add', () => {
      const {
        startSession,
        addMessage,
        getTimeSinceLastActivity,
        isInactive,
      } = useSessionStore.getState();

      startSession();
      useSessionStore.getState().transitionTo('listening');

      jest.advanceTimersByTime(25000);
      expect(isInactive()).toBe(false); // Not yet at 30s

      addMessage('user', 'Still here');

      jest.advanceTimersByTime(10000);
      expect(isInactive()).toBe(false); // Reset by message
    });
  });
});
