import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getSession,
  incrementDispatchCount,
  addTopic,
} from '../services/sessionManager.js';
import type { DispatchRequest, DispatchResponse } from '../types.js';

/**
 * Dispatch routes
 * - POST /dispatch - Dispatch work to Silas workstation
 */
export const dispatchRouter: RouterType = Router();

/**
 * In-memory task queue (in real implementation, this would dispatch to Silas via MCP)
 */
interface Task {
  id: string;
  sessionId: string;
  summary: string;
  details: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

const taskQueue = new Map<string, Task>();

/**
 * POST /dispatch
 * Dispatches work to Silas workstation
 */
dispatchRouter.post('/', (req: Request, res: Response) => {
  try {
    const { sessionId, summary, details } = req.body as DispatchRequest;

    // Validate required fields
    if (!sessionId) {
      res.status(400).json({
        error: 'Missing sessionId',
        message: 'sessionId is required',
      });
      return;
    }

    if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid summary',
        message: 'summary is required and cannot be empty',
      });
      return;
    }

    if (!details || typeof details !== 'string' || details.trim().length === 0) {
      res.status(400).json({
        error: 'Invalid details',
        message: 'details is required and cannot be empty',
      });
      return;
    }

    // Verify session exists
    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({
        error: 'Session not found',
        message: `No session found with ID: ${sessionId}`,
      });
      return;
    }

    // Create task
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      sessionId,
      summary: summary.trim(),
      details: details.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Add to queue
    taskQueue.set(taskId, task);

    // Update session metadata
    incrementDispatchCount(sessionId);

    // Extract topic from summary for tracking
    const topic = summary.trim().slice(0, 50);
    addTopic(sessionId, topic);

    // In real implementation, this would dispatch to Silas via MCP
    console.log(`[DISPATCH] Task ${taskId} created for session ${sessionId}`);
    console.log(`[DISPATCH] Summary: ${summary}`);
    console.log(`[DISPATCH] Details: ${details}`);

    const response: DispatchResponse = {
      success: true,
      taskId,
      message: 'Task dispatched to Silas workstation',
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error dispatching task:', error);
    res.status(500).json({
      error: 'Dispatch failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /dispatch/:taskId
 * Gets the status of a dispatched task
 */
dispatchRouter.get('/:taskId', (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string | undefined;

    if (!taskId) {
      res.status(400).json({
        error: 'Missing taskId',
        message: 'taskId is required in the URL path',
      });
      return;
    }

    const task = taskQueue.get(taskId);

    if (!task) {
      res.status(404).json({
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`,
      });
      return;
    }

    res.status(200).json({
      id: task.id,
      sessionId: task.sessionId,
      summary: task.summary,
      status: task.status,
      createdAt: task.createdAt,
    });
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({
      error: 'Failed to get task',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Gets all tasks for a session (useful for session summary)
 */
dispatchRouter.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string | undefined;

    if (!sessionId) {
      res.status(400).json({
        error: 'Missing sessionId',
        message: 'sessionId is required in the URL path',
      });
      return;
    }

    const tasks: Task[] = [];
    for (const task of taskQueue.values()) {
      if (task.sessionId === sessionId) {
        tasks.push(task);
      }
    }

    res.status(200).json({
      sessionId,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error('Error getting session tasks:', error);
    res.status(500).json({
      error: 'Failed to get session tasks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Export for testing
export const _testOnlyTaskQueue = taskQueue;

/**
 * Clears all tasks (useful for testing)
 */
export function clearAllTasks(): void {
  taskQueue.clear();
}
