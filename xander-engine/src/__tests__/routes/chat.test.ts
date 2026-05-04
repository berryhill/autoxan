import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { type Express } from 'express';
import { chatRouter } from '../../routes/chat.js';
import { clearAllSessions, createSession, getSession } from '../../services/sessionManager.js';
import * as llmClient from '../../services/llmClient.js';

// Mock the LLM client
vi.mock('../../services/llmClient.js', async () => {
  const actual = await vi.importActual('../../services/llmClient.js');
  return {
    ...actual,
    chat: vi.fn(),
  };
});

/**
 * Helper function to make requests to Express app
 */
async function makeRequest(
  app: Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const req = {
      method,
      path,
      url: path,
      body: body ?? {},
      params: {},
      query: {},
      headers: {},
      get: () => null,
    } as unknown as express.Request;

    const res = {
      statusCode: 200,
      _body: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: unknown) {
        this._body = data;
        resolve({ status: this.statusCode, body: this._body });
        return this;
      },
    } as unknown as express.Response;

    // Find matching route handler
    const router = chatRouter as unknown as {
      stack: Array<{
        route?: {
          path: string;
          methods: Record<string, boolean>;
          stack: Array<{ handle: express.RequestHandler }>;
        };
      }>;
    };

    for (const layer of router.stack) {
      if (layer.route) {
        const routePath = layer.route.path;
        const routeMethod = method.toLowerCase();

        if (routePath === path && layer.route.methods[routeMethod]) {
          const handler = layer.route.stack[0]?.handle;
          if (handler) {
            // Call the async handler
            Promise.resolve(handler(req, res, () => {})).catch((err) => {
              res.status(500).json({ error: 'Internal error', message: String(err) });
            });
            return;
          }
        }
      }
    }

    resolve({ status: 404, body: { error: 'Not found' } });
  });
}

describe('chat routes', () => {
  let app: Express;
  const mockChat = llmClient.chat as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearAllSessions();
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/', chatRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /', () => {
    it('sends a message and receives a response', async () => {
      const session = createSession();

      mockChat.mockResolvedValue({
        content: 'Hello! How can I help you?',
        suggestDispatch: false,
      });

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'Hello Xander',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId: session.id,
        response: 'Hello! How can I help you?',
      });
    });

    it('auto-creates session when sessionId not provided', async () => {
      mockChat.mockResolvedValue({
        content: 'Hello!',
        suggestDispatch: false,
      });

      const response = await makeRequest(app, 'POST', '/', {
        message: 'Hello',
      });

      expect(response.status).toBe(200);
      const body = response.body as { sessionId: string };
      expect(body.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('auto-creates session when sessionId is invalid', async () => {
      mockChat.mockResolvedValue({
        content: 'Hello!',
        suggestDispatch: false,
      });

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: 'non-existent-session',
        message: 'Hello',
      });

      expect(response.status).toBe(200);
      const body = response.body as { sessionId: string };
      expect(body.sessionId).not.toBe('non-existent-session');
    });

    it('returns 400 when message is missing', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid message',
      });
    });

    it('returns 400 when message is empty string', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: '',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid message',
      });
    });

    it('returns 400 when message is whitespace only', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: '   ',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid message',
      });
    });

    it('includes dispatch info when LLM suggests dispatch', async () => {
      const session = createSession();

      mockChat.mockResolvedValue({
        content: "I'll set that up for you.",
        suggestDispatch: true,
        dispatchSummary: 'Create notification system',
        dispatchDetails: 'Build push notifications with Firebase',
      });

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'Create a notification system',
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId: session.id,
        response: "I'll set that up for you.",
        suggestDispatch: true,
        dispatchSummary: 'Create notification system',
        dispatchDetails: 'Build push notifications with Firebase',
      });
    });

    it('stores messages in session', async () => {
      const session = createSession();

      mockChat.mockResolvedValue({
        content: 'Hello there!',
        suggestDispatch: false,
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'Hello Xander',
      });

      const updatedSession = getSession(session.id);
      expect(updatedSession?.messages).toHaveLength(2);
      expect(updatedSession?.messages[0]).toMatchObject({
        role: 'user',
        content: 'Hello Xander',
      });
      expect(updatedSession?.messages[1]).toMatchObject({
        role: 'assistant',
        content: 'Hello there!',
      });
    });

    it('passes conversation history to LLM', async () => {
      const session = createSession();

      // First message - history starts empty
      mockChat.mockResolvedValue({
        content: 'Hi!',
        suggestDispatch: false,
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'Hello',
      });

      // Second message - should include history from first exchange
      mockChat.mockResolvedValue({
        content: "I'm doing well!",
        suggestDispatch: false,
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'How are you?',
      });

      // Check both calls
      expect(mockChat).toHaveBeenCalledTimes(2);

      // First call - history is empty
      const firstCallArgs = mockChat.mock.calls[0];
      expect(firstCallArgs?.[0]).toBe('Hello');
      expect(firstCallArgs?.[1]).toHaveLength(0);

      // Second call - history includes previous user and assistant messages
      const secondCallArgs = mockChat.mock.calls[1];
      expect(secondCallArgs?.[0]).toBe('How are you?');
      expect(secondCallArgs?.[1]).toHaveLength(2); // Previous user and assistant messages
    });

    it('returns 503 when LLM service fails', async () => {
      const session = createSession();

      mockChat.mockRejectedValue(new Error('LLM request failed: API error'));

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'Hello',
      });

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        error: 'LLM service unavailable',
      });
    });

    it('returns 500 for non-LLM errors', async () => {
      const session = createSession();

      mockChat.mockRejectedValue(new Error('Some other error'));

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: 'Hello',
      });

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Chat failed',
      });
    });

    it('trims message whitespace', async () => {
      const session = createSession();

      mockChat.mockResolvedValue({
        content: 'Response',
        suggestDispatch: false,
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        message: '  Hello with spaces  ',
      });

      // Check that trimmed message was passed to LLM
      expect(mockChat).toHaveBeenCalledWith('Hello with spaces', expect.any(Array));

      // Check that trimmed message was stored
      const updatedSession = getSession(session.id);
      expect(updatedSession?.messages[0]?.content).toBe('Hello with spaces');
    });
  });
});
