import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  getSession,
  addMessage,
  getConversationHistory,
  createSession,
} from '../services/sessionManager.js';
import { chat } from '../services/llmClient.js';
import type { ChatRequest, ChatResponse } from '../types.js';

/**
 * Chat routes
 * - POST /chat - Send a message and get a response
 */
export const chatRouter: RouterType = Router();

/**
 * POST /chat
 * Sends a message to Xander and receives a response
 * Will auto-create a session if sessionId is not provided or invalid
 */
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body as ChatRequest;

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid message',
        message: 'Message is required and cannot be empty',
      });
      return;
    }

    // Get or create session
    let activeSessionId = sessionId;
    let session = sessionId ? getSession(sessionId) : null;

    if (!session) {
      // Auto-create session if not provided or not found
      session = createSession();
      activeSessionId = session.id;
    }

    // Get conversation history for context
    const history = getConversationHistory(activeSessionId);

    // Add user message to session
    addMessage(activeSessionId, 'user', message.trim());

    // Send to LLM and get response
    const llmResult = await chat(message.trim(), history);

    // Add assistant response to session
    addMessage(activeSessionId, 'assistant', llmResult.content);

    // Build response
    const response: ChatResponse = {
      sessionId: activeSessionId,
      response: llmResult.content,
    };

    // Add dispatch info if suggested
    if (llmResult.suggestDispatch) {
      response.suggestDispatch = true;
      response.dispatchSummary = llmResult.dispatchSummary;
      response.dispatchDetails = llmResult.dispatchDetails;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in chat:', error);

    // Check if it's an LLM-related error
    if (error instanceof Error && error.message.includes('LLM')) {
      res.status(503).json({
        error: 'LLM service unavailable',
        message: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Chat failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
