import { v4 as uuidv4 } from 'uuid';
import type { Session, Message, MessageRole, SessionMetadata } from '../types.js';
import { SESSION_TIMEOUT } from '../types.js';

/**
 * In-memory session storage
 */
const sessions = new Map<string, Session>();

/**
 * Tracks last activity time for each session
 */
const lastActivityMap = new Map<string, number>();

/**
 * Creates a new session
 * @returns The newly created session
 */
export function createSession(): Session {
  const sessionId = uuidv4();
  const now = new Date().toISOString();

  const session: Session = {
    id: sessionId,
    messages: [],
    createdAt: now,
    updatedAt: now,
    metadata: {
      dispatchCount: 0,
      topicsDiscussed: [],
    },
  };

  sessions.set(sessionId, session);
  lastActivityMap.set(sessionId, Date.now());

  return session;
}

/**
 * Retrieves a session by ID
 * @param sessionId - The session ID to retrieve
 * @returns The session or null if not found
 */
export function getSession(sessionId: string): Session | null {
  return sessions.get(sessionId) ?? null;
}

/**
 * Updates the last activity timestamp for a session
 * @param sessionId - The session ID to update
 */
export function updateActivity(sessionId: string): void {
  if (sessions.has(sessionId)) {
    lastActivityMap.set(sessionId, Date.now());
  }
}

/**
 * Adds a message to a session
 * @param sessionId - The session ID
 * @param role - The message role ('user' or 'assistant')
 * @param content - The message content
 * @returns The updated session or null if session not found
 */
export function addMessage(
  sessionId: string,
  role: MessageRole,
  content: string
): Session | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const message: Message = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  updateActivity(sessionId);

  return session;
}

/**
 * Gets conversation history for LLM context
 * Returns a shallow copy to prevent mutation of the original array
 * @param sessionId - The session ID
 * @returns Array of messages or empty array if session not found
 */
export function getConversationHistory(sessionId: string): Message[] {
  const session = sessions.get(sessionId);
  // Return a copy to prevent mutation when messages are added later
  return session?.messages ? [...session.messages] : [];
}

/**
 * Updates session metadata
 * @param sessionId - The session ID
 * @param metadata - Partial metadata to update
 * @returns The updated session or null if session not found
 */
export function updateMetadata(
  sessionId: string,
  metadata: Partial<SessionMetadata>
): Session | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  session.metadata = {
    ...session.metadata,
    ...metadata,
  };
  session.updatedAt = new Date().toISOString();
  updateActivity(sessionId);

  return session;
}

/**
 * Increments the dispatch count for a session
 * @param sessionId - The session ID
 * @returns The updated session or null if session not found
 */
export function incrementDispatchCount(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  session.metadata.dispatchCount += 1;
  session.updatedAt = new Date().toISOString();
  updateActivity(sessionId);

  return session;
}

/**
 * Adds a topic to the session's discussed topics
 * @param sessionId - The session ID
 * @param topic - The topic to add
 * @returns The updated session or null if session not found
 */
export function addTopic(sessionId: string, topic: string): Session | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  if (!session.metadata.topicsDiscussed.includes(topic)) {
    session.metadata.topicsDiscussed.push(topic);
    session.updatedAt = new Date().toISOString();
    updateActivity(sessionId);
  }

  return session;
}

/**
 * Ends a session and removes it from storage
 * @param sessionId - The session ID to end
 * @returns True if session was ended, false if not found
 */
export function endSession(sessionId: string): boolean {
  const existed = sessions.delete(sessionId);
  lastActivityMap.delete(sessionId);
  return existed;
}

/**
 * Checks if a session has timed out due to inactivity
 * @param sessionId - The session ID to check
 * @returns True if session is inactive/timed out
 */
export function isSessionInactive(sessionId: string): boolean {
  const lastActivity = lastActivityMap.get(sessionId);
  if (lastActivity === undefined) {
    return true;
  }

  const timeSinceActivity = Date.now() - lastActivity;
  return timeSinceActivity > SESSION_TIMEOUT.INACTIVITY_MS;
}

/**
 * Gets the number of active sessions
 * @returns The count of active sessions
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}

/**
 * Cleans up sessions that have timed out
 * @returns The number of sessions cleaned up
 */
export function cleanupInactiveSessions(): number {
  let cleanedCount = 0;

  for (const [sessionId] of sessions) {
    if (isSessionInactive(sessionId)) {
      endSession(sessionId);
      cleanedCount++;
    }
  }

  return cleanedCount;
}

/**
 * Clears all sessions (useful for testing)
 */
export function clearAllSessions(): void {
  sessions.clear();
  lastActivityMap.clear();
}

/**
 * Starts the automatic cleanup interval
 * @returns The interval ID for cleanup
 */
export function startCleanupInterval(): NodeJS.Timeout {
  return setInterval(() => {
    const cleaned = cleanupInactiveSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} inactive session(s)`);
    }
  }, SESSION_TIMEOUT.CLEANUP_INTERVAL_MS);
}

// Export the sessions map for testing purposes only
export const _testOnlySessions = sessions;
export const _testOnlyLastActivityMap = lastActivityMap;
