import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import { sessionRouter } from '../../routes/session.js';
import { clearAllSessions, createSession } from '../../services/sessionManager.js';

/**
 * Helper function to make requests to Express app
 */
async function makeRequest(
  app: Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown }> {
  // Create a simple request/response mock
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

    // Extract params from path like /session/:sessionId
    const pathMatch = path.match(/^\/([^/]+)$/);
    if (pathMatch) {
      req.params = { sessionId: pathMatch[1] };
    }

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
      send(data: unknown) {
        this._body = data;
        resolve({ status: this.statusCode, body: this._body });
        return this;
      },
    } as unknown as express.Response;

    // Find matching route handler
    const router = sessionRouter as unknown as {
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

        // Check if path matches
        let matches = false;
        if (routePath.includes(':')) {
          // Handle parameterized routes
          const regex = new RegExp(
            '^' + routePath.replace(/:([^/]+)/g, '([^/]+)') + '$'
          );
          const match = path.match(regex);
          if (match && layer.route.methods[routeMethod]) {
            matches = true;
            // Extract param values
            const paramNames = routePath.match(/:([^/]+)/g);
            if (paramNames) {
              paramNames.forEach((param, index) => {
                const paramName = param.substring(1);
                req.params[paramName] = match[index + 1];
              });
            }
          }
        } else if (routePath === path && layer.route.methods[routeMethod]) {
          matches = true;
        }

        if (matches) {
          const handler = layer.route.stack[0]?.handle;
          if (handler) {
            handler(req, res, () => {});
            return;
          }
        }
      }
    }

    // No matching route
    resolve({ status: 404, body: { error: 'Not found' } });
  });
}

describe('session routes', () => {
  let app: Express;

  beforeEach(() => {
    clearAllSessions();
    app = express();
    app.use(express.json());
    app.use('/', sessionRouter);
  });

  describe('POST /start', () => {
    it('creates a new session', async () => {
      const response = await makeRequest(app, 'POST', '/start');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        ),
        messages: [],
        createdAt: expect.any(String),
      });
    });

    it('creates multiple unique sessions', async () => {
      const response1 = await makeRequest(app, 'POST', '/start');
      const response2 = await makeRequest(app, 'POST', '/start');

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      const body1 = response1.body as { id: string };
      const body2 = response2.body as { id: string };

      expect(body1.id).not.toBe(body2.id);
    });
  });

  describe('POST /end', () => {
    it('ends an existing session', async () => {
      // Create a session first
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/end', {
        sessionId: session.id,
      });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Session ended successfully',
      });
    });

    it('returns 400 when sessionId is missing', async () => {
      const response = await makeRequest(app, 'POST', '/end', {});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Missing sessionId',
      });
    });

    it('returns 404 for non-existent session', async () => {
      const response = await makeRequest(app, 'POST', '/end', {
        sessionId: 'non-existent-id',
      });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Session not found',
      });
    });
  });

  describe('GET /:sessionId', () => {
    it('retrieves an existing session', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'GET', `/${session.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: session.id,
        messages: [],
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        metadata: {
          dispatchCount: 0,
          topicsDiscussed: [],
        },
      });
    });

    it('returns 404 for non-existent session', async () => {
      const response = await makeRequest(app, 'GET', '/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Session not found',
      });
    });
  });
});
