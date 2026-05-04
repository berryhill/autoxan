import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createSession,
  getSession,
  addMessage,
  getConversationHistory,
  updateMetadata,
  incrementDispatchCount,
  addTopic,
  endSession,
  isSessionInactive,
  getActiveSessionCount,
  cleanupInactiveSessions,
  clearAllSessions,
  updateActivity,
  _testOnlySessions,
  _testOnlyLastActivityMap,
} from '../services/sessionManager.js';
import { SESSION_TIMEOUT } from '../types.js';

describe('sessionManager', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    clearAllSessions();
  });

  afterEach(() => {
    // Reset any mocked timers
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('creates a new session with valid UUID', () => {
      const session = createSession();

      expect(session).toBeDefined();
      expect(session.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('creates session with empty messages array', () => {
      const session = createSession();

      expect(session.messages).toEqual([]);
    });

    it('creates session with valid timestamps', () => {
      const before = new Date().toISOString();
      const session = createSession();
      const after = new Date().toISOString();

      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
      expect(session.createdAt >= before).toBe(true);
      expect(session.createdAt <= after).toBe(true);
    });

    it('creates session with default metadata', () => {
      const session = createSession();

      expect(session.metadata).toEqual({
        dispatchCount: 0,
        topicsDiscussed: [],
      });
    });

    it('creates multiple unique sessions', () => {
      const session1 = createSession();
      const session2 = createSession();
      const session3 = createSession();

      expect(session1.id).not.toBe(session2.id);
      expect(session2.id).not.toBe(session3.id);
      expect(session1.id).not.toBe(session3.id);
    });

    it('increments active session count', () => {
      expect(getActiveSessionCount()).toBe(0);

      createSession();
      expect(getActiveSessionCount()).toBe(1);

      createSession();
      expect(getActiveSessionCount()).toBe(2);
    });
  });

  describe('getSession', () => {
    it('retrieves an existing session', () => {
      const created = createSession();
      const retrieved = getSession(created.id);

      expect(retrieved).toEqual(created);
    });

    it('returns null for non-existent session', () => {
      const result = getSession('non-existent-id');

      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = getSession('');

      expect(result).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('adds a user message to session', () => {
      const session = createSession();
      const result = addMessage(session.id, 'user', 'Hello Xander');

      expect(result).not.toBeNull();
      expect(result?.messages).toHaveLength(1);
      expect(result?.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello Xander',
      });
    });

    it('adds an assistant message to session', () => {
      const session = createSession();
      const result = addMessage(session.id, 'assistant', 'Hello! How can I help?');

      expect(result).not.toBeNull();
      expect(result?.messages).toHaveLength(1);
      expect(result?.messages[0]).toMatchObject({
        role: 'assistant',
        content: 'Hello! How can I help?',
      });
    });

    it('adds timestamp to message', () => {
      const session = createSession();
      const before = new Date().toISOString();
      const result = addMessage(session.id, 'user', 'Test message');
      const after = new Date().toISOString();

      const timestamp = result?.messages[0]?.timestamp;
      expect(timestamp).toBeDefined();
      expect(timestamp && timestamp >= before).toBe(true);
      expect(timestamp && timestamp <= after).toBe(true);
    });

    it('preserves message order', () => {
      const session = createSession();

      addMessage(session.id, 'user', 'First');
      addMessage(session.id, 'assistant', 'Second');
      addMessage(session.id, 'user', 'Third');

      const result = getSession(session.id);

      expect(result?.messages).toHaveLength(3);
      expect(result?.messages[0]?.content).toBe('First');
      expect(result?.messages[1]?.content).toBe('Second');
      expect(result?.messages[2]?.content).toBe('Third');
    });

    it('updates session updatedAt timestamp', () => {
      const session = createSession();
      const originalUpdatedAt = session.updatedAt;

      // Small delay to ensure timestamp differs
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      addMessage(session.id, 'user', 'Test');
      vi.useRealTimers();

      const updated = getSession(session.id);
      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });

    it('returns null for non-existent session', () => {
      const result = addMessage('non-existent', 'user', 'Test');

      expect(result).toBeNull();
    });
  });

  describe('getConversationHistory', () => {
    it('returns empty array for new session', () => {
      const session = createSession();
      const history = getConversationHistory(session.id);

      expect(history).toEqual([]);
    });

    it('returns all messages in order', () => {
      const session = createSession();
      addMessage(session.id, 'user', 'Hello');
      addMessage(session.id, 'assistant', 'Hi there!');
      addMessage(session.id, 'user', 'How are you?');

      const history = getConversationHistory(session.id);

      expect(history).toHaveLength(3);
      expect(history[0]?.content).toBe('Hello');
      expect(history[1]?.content).toBe('Hi there!');
      expect(history[2]?.content).toBe('How are you?');
    });

    it('returns empty array for non-existent session', () => {
      const history = getConversationHistory('non-existent');

      expect(history).toEqual([]);
    });
  });

  describe('updateMetadata', () => {
    it('updates metadata fields', () => {
      const session = createSession();
      const result = updateMetadata(session.id, {
        dispatchCount: 5,
        topicsDiscussed: ['topic1', 'topic2'],
      });

      expect(result?.metadata).toEqual({
        dispatchCount: 5,
        topicsDiscussed: ['topic1', 'topic2'],
      });
    });

    it('partially updates metadata', () => {
      const session = createSession();
      updateMetadata(session.id, { dispatchCount: 3 });

      const result = getSession(session.id);
      expect(result?.metadata.dispatchCount).toBe(3);
      expect(result?.metadata.topicsDiscussed).toEqual([]);
    });

    it('returns null for non-existent session', () => {
      const result = updateMetadata('non-existent', { dispatchCount: 1 });

      expect(result).toBeNull();
    });
  });

  describe('incrementDispatchCount', () => {
    it('increments from 0 to 1', () => {
      const session = createSession();
      const result = incrementDispatchCount(session.id);

      expect(result?.metadata.dispatchCount).toBe(1);
    });

    it('increments multiple times', () => {
      const session = createSession();

      incrementDispatchCount(session.id);
      incrementDispatchCount(session.id);
      const result = incrementDispatchCount(session.id);

      expect(result?.metadata.dispatchCount).toBe(3);
    });

    it('returns null for non-existent session', () => {
      const result = incrementDispatchCount('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('addTopic', () => {
    it('adds a new topic', () => {
      const session = createSession();
      const result = addTopic(session.id, 'notifications');

      expect(result?.metadata.topicsDiscussed).toContain('notifications');
    });

    it('does not add duplicate topics', () => {
      const session = createSession();

      addTopic(session.id, 'notifications');
      addTopic(session.id, 'notifications');

      const result = getSession(session.id);
      expect(result?.metadata.topicsDiscussed).toHaveLength(1);
    });

    it('adds multiple unique topics', () => {
      const session = createSession();

      addTopic(session.id, 'topic1');
      addTopic(session.id, 'topic2');
      addTopic(session.id, 'topic3');

      const result = getSession(session.id);
      expect(result?.metadata.topicsDiscussed).toEqual(['topic1', 'topic2', 'topic3']);
    });

    it('returns null for non-existent session', () => {
      const result = addTopic('non-existent', 'topic');

      expect(result).toBeNull();
    });
  });

  describe('endSession', () => {
    it('removes session from storage', () => {
      const session = createSession();
      expect(getSession(session.id)).not.toBeNull();

      const result = endSession(session.id);

      expect(result).toBe(true);
      expect(getSession(session.id)).toBeNull();
    });

    it('returns false for non-existent session', () => {
      const result = endSession('non-existent');

      expect(result).toBe(false);
    });

    it('decrements active session count', () => {
      const session1 = createSession();
      const session2 = createSession();
      expect(getActiveSessionCount()).toBe(2);

      endSession(session1.id);
      expect(getActiveSessionCount()).toBe(1);

      endSession(session2.id);
      expect(getActiveSessionCount()).toBe(0);
    });
  });

  describe('updateActivity', () => {
    it('updates last activity timestamp', () => {
      vi.useFakeTimers();
      const session = createSession();

      const initialActivity = _testOnlyLastActivityMap.get(session.id);

      vi.advanceTimersByTime(1000);
      updateActivity(session.id);

      const updatedActivity = _testOnlyLastActivityMap.get(session.id);

      expect(updatedActivity).toBeGreaterThan(initialActivity!);
      vi.useRealTimers();
    });

    it('does nothing for non-existent session', () => {
      const initialSize = _testOnlyLastActivityMap.size;
      updateActivity('non-existent');
      expect(_testOnlyLastActivityMap.size).toBe(initialSize);
    });
  });

  describe('isSessionInactive', () => {
    it('returns false for recently active session', () => {
      const session = createSession();

      expect(isSessionInactive(session.id)).toBe(false);
    });

    it('returns true for session past timeout', () => {
      vi.useFakeTimers();
      const session = createSession();

      // Advance time past the inactivity timeout
      vi.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS + 1000);

      expect(isSessionInactive(session.id)).toBe(true);
      vi.useRealTimers();
    });

    it('returns true for non-existent session', () => {
      expect(isSessionInactive('non-existent')).toBe(true);
    });

    it('returns false after activity update', () => {
      vi.useFakeTimers();
      const session = createSession();

      // Advance time, but not past timeout
      vi.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS - 5000);

      // Update activity
      updateActivity(session.id);

      // Advance a bit more
      vi.advanceTimersByTime(1000);

      expect(isSessionInactive(session.id)).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('cleanupInactiveSessions', () => {
    it('removes inactive sessions', () => {
      vi.useFakeTimers();

      createSession();
      createSession();

      expect(getActiveSessionCount()).toBe(2);

      // Advance time past timeout
      vi.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS + 1000);

      const cleaned = cleanupInactiveSessions();

      expect(cleaned).toBe(2);
      expect(getActiveSessionCount()).toBe(0);
      vi.useRealTimers();
    });

    it('keeps active sessions', () => {
      vi.useFakeTimers();

      const activeSession = createSession();
      createSession(); // This will become inactive

      // Advance time, but keep one session active
      vi.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS / 2);
      updateActivity(activeSession.id);

      vi.advanceTimersByTime(SESSION_TIMEOUT.INACTIVITY_MS / 2 + 1000);

      const cleaned = cleanupInactiveSessions();

      expect(cleaned).toBe(1);
      expect(getActiveSessionCount()).toBe(1);
      expect(getSession(activeSession.id)).not.toBeNull();
      vi.useRealTimers();
    });

    it('returns 0 when no sessions to clean', () => {
      const cleaned = cleanupInactiveSessions();

      expect(cleaned).toBe(0);
    });
  });

  describe('getActiveSessionCount', () => {
    it('returns 0 when no sessions', () => {
      expect(getActiveSessionCount()).toBe(0);
    });

    it('returns correct count after creating sessions', () => {
      createSession();
      createSession();
      createSession();

      expect(getActiveSessionCount()).toBe(3);
    });

    it('returns correct count after ending sessions', () => {
      const s1 = createSession();
      const s2 = createSession();
      createSession();

      endSession(s1.id);
      endSession(s2.id);

      expect(getActiveSessionCount()).toBe(1);
    });
  });

  describe('clearAllSessions', () => {
    it('removes all sessions', () => {
      createSession();
      createSession();
      createSession();

      expect(getActiveSessionCount()).toBe(3);

      clearAllSessions();

      expect(getActiveSessionCount()).toBe(0);
    });

    it('clears both sessions and activity maps', () => {
      createSession();
      createSession();

      clearAllSessions();

      expect(_testOnlySessions.size).toBe(0);
      expect(_testOnlyLastActivityMap.size).toBe(0);
    });
  });
});
