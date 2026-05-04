import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import { dispatchRouter, clearAllTasks, _testOnlyTaskQueue } from '../../routes/dispatch.js';
import { clearAllSessions, createSession, getSession } from '../../services/sessionManager.js';

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
    const router = dispatchRouter as unknown as {
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

    resolve({ status: 404, body: { error: 'Not found' } });
  });
}

describe('dispatch routes', () => {
  let app: Express;

  beforeEach(() => {
    clearAllSessions();
    clearAllTasks();
    app = express();
    app.use(express.json());
    app.use('/', dispatchRouter);
  });

  describe('POST /', () => {
    it('dispatches a task successfully', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Create notification system',
        details: 'Build push notifications with Firebase Cloud Messaging',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        taskId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        ),
        message: 'Task dispatched to Silas workstation',
      });
    });

    it('returns 400 when sessionId is missing', async () => {
      const response = await makeRequest(app, 'POST', '/', {
        summary: 'Test',
        details: 'Test details',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Missing sessionId',
      });
    });

    it('returns 400 when summary is missing', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        details: 'Test details',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid summary',
      });
    });

    it('returns 400 when summary is empty', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: '',
        details: 'Test details',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid summary',
      });
    });

    it('returns 400 when details is missing', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Test summary',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid details',
      });
    });

    it('returns 400 when details is empty', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Test summary',
        details: '',
      });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Invalid details',
      });
    });

    it('returns 404 when session does not exist', async () => {
      const response = await makeRequest(app, 'POST', '/', {
        sessionId: 'non-existent-session',
        summary: 'Test summary',
        details: 'Test details',
      });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Session not found',
      });
    });

    it('increments dispatch count in session', async () => {
      const session = createSession();

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'First task',
        details: 'First task details',
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Second task',
        details: 'Second task details',
      });

      const updatedSession = getSession(session.id);
      expect(updatedSession?.metadata.dispatchCount).toBe(2);
    });

    it('adds topic to session metadata', async () => {
      const session = createSession();

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Create notification system',
        details: 'Build push notifications',
      });

      const updatedSession = getSession(session.id);
      expect(updatedSession?.metadata.topicsDiscussed).toContain(
        'Create notification system'
      );
    });

    it('truncates long summaries for topics', async () => {
      const session = createSession();

      const longSummary = 'A'.repeat(100);

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: longSummary,
        details: 'Details',
      });

      const updatedSession = getSession(session.id);
      const topic = updatedSession?.metadata.topicsDiscussed[0];
      expect(topic?.length).toBeLessThanOrEqual(50);
    });

    it('stores task in queue', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Test task',
        details: 'Test details',
      });

      const body = response.body as { taskId: string };
      const task = _testOnlyTaskQueue.get(body.taskId);

      expect(task).toBeDefined();
      expect(task?.summary).toBe('Test task');
      expect(task?.details).toBe('Test details');
      expect(task?.status).toBe('pending');
    });
  });

  describe('GET /:taskId', () => {
    it('retrieves task by ID', async () => {
      const session = createSession();

      // Create a task first
      const createResponse = await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Test task',
        details: 'Test details',
      });

      const { taskId } = createResponse.body as { taskId: string };

      // Retrieve the task
      const response = await makeRequest(app, 'GET', `/${taskId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: taskId,
        sessionId: session.id,
        summary: 'Test task',
        status: 'pending',
        createdAt: expect.any(String),
      });
    });

    it('returns 404 for non-existent task', async () => {
      const response = await makeRequest(app, 'GET', '/non-existent-task');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Task not found',
      });
    });
  });

  describe('GET /session/:sessionId', () => {
    it('retrieves all tasks for a session', async () => {
      const session = createSession();

      // Create multiple tasks
      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Task 1',
        details: 'Details 1',
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session.id,
        summary: 'Task 2',
        details: 'Details 2',
      });

      const response = await makeRequest(app, 'GET', `/session/${session.id}`);

      expect(response.status).toBe(200);
      const body = response.body as { sessionId: string; tasks: unknown[]; count: number };
      expect(body.sessionId).toBe(session.id);
      expect(body.tasks).toHaveLength(2);
      expect(body.count).toBe(2);
    });

    it('returns empty array for session with no tasks', async () => {
      const session = createSession();

      const response = await makeRequest(app, 'GET', `/session/${session.id}`);

      expect(response.status).toBe(200);
      const body = response.body as { tasks: unknown[]; count: number };
      expect(body.tasks).toHaveLength(0);
      expect(body.count).toBe(0);
    });

    it('returns empty array for non-existent session', async () => {
      const response = await makeRequest(app, 'GET', '/session/non-existent');

      expect(response.status).toBe(200);
      const body = response.body as { tasks: unknown[]; count: number };
      expect(body.tasks).toHaveLength(0);
      expect(body.count).toBe(0);
    });

    it('only returns tasks for the specified session', async () => {
      const session1 = createSession();
      const session2 = createSession();

      // Create tasks for both sessions
      await makeRequest(app, 'POST', '/', {
        sessionId: session1.id,
        summary: 'Session 1 Task',
        details: 'Details',
      });

      await makeRequest(app, 'POST', '/', {
        sessionId: session2.id,
        summary: 'Session 2 Task',
        details: 'Details',
      });

      const response = await makeRequest(app, 'GET', `/session/${session1.id}`);

      const body = response.body as { tasks: Array<{ summary: string }> };
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0]?.summary).toBe('Session 1 Task');
    });
  });
});
