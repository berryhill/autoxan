import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  createSession,
  getSession,
  endSession,
} from '../services/sessionManager.js';

/**
 * Session management routes
 * - POST /session/start - Create a new session
 * - POST /session/end - End an existing session
 * - GET /session/:sessionId - Get session data
 */
export const sessionRouter: RouterType = Router();

/**
 * POST /session/start
 * Creates a new conversation session
 */
sessionRouter.post('/start', (_req: Request, res: Response) => {
  try {
    const session = createSession();

    res.status(201).json({
      id: session.id,
      messages: session.messages,
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /session/end
 * Ends an existing session
 */
sessionRouter.post('/end', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };

    if (!sessionId) {
      res.status(400).json({
        error: 'Missing sessionId',
        message: 'sessionId is required in the request body',
      });
      return;
    }

    const ended = endSession(sessionId);

    if (!ended) {
      res.status(404).json({
        error: 'Session not found',
        message: `No session found with ID: ${sessionId}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Session ended successfully',
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      error: 'Failed to end session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /session/:sessionId
 * Retrieves session data
 */
sessionRouter.get('/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string | undefined;

    if (!sessionId) {
      res.status(400).json({
        error: 'Missing sessionId',
        message: 'sessionId is required in the URL path',
      });
      return;
    }

    const session = getSession(sessionId);

    if (!session) {
      res.status(404).json({
        error: 'Session not found',
        message: `No session found with ID: ${sessionId}`,
      });
      return;
    }

    res.status(200).json({
      id: session.id,
      messages: session.messages,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({
      error: 'Failed to get session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
