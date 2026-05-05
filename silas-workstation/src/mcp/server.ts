/**
 * MCP Server for silas-workstation
 * 
 * Provides MCP tools for receiving tasks from Xander,
 * querying task status, and listing tasks.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { TaskQueue, taskQueue } from '../services/taskQueue.js';
import type { TaskType, TaskPriority, TaskStatus } from '../types/task.js';

/**
 * Zod schemas for MCP tool inputs
 */
const DispatchTaskSchema = z.object({
  type: z.enum(['code', 'research', 'file', 'general']).describe('Type of task to execute'),
  description: z.string().min(1).describe('Description of what needs to be done'),
  priority: z.enum(['high', 'normal', 'low']).optional().default('normal').describe('Task priority'),
  context: z.record(z.unknown()).optional().describe('Additional context for the task'),
  metadata: z.record(z.unknown()).optional().describe('Optional metadata for tracking'),
});

const TaskStatusSchema = z.object({
  taskId: z.string().uuid().describe('The unique task ID to get status for'),
});

const ListTasksSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional().describe('Filter by status'),
  type: z.enum(['code', 'research', 'file', 'general']).optional().describe('Filter by task type'),
  priority: z.enum(['high', 'normal', 'low']).optional().describe('Filter by priority'),
  limit: z.number().int().positive().max(100).optional().default(20).describe('Maximum tasks to return'),
  offset: z.number().int().nonnegative().optional().default(0).describe('Offset for pagination'),
});

const CancelTaskSchema = z.object({
  taskId: z.string().uuid().describe('The unique task ID to cancel'),
});

/**
 * MCP Server configuration
 */
const SERVER_INFO = {
  name: 'silas-workstation',
  version: '1.0.0',
} as const;

/**
 * Tool definitions for MCP
 */
const TOOLS = [
  {
    name: 'dispatch_task',
    description: 'Dispatch a new task to the silas-workstation task queue for execution. Tasks are executed asynchronously based on priority.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['code', 'research', 'file', 'general'],
          description: 'Type of task to execute',
        },
        description: {
          type: 'string',
          description: 'Description of what needs to be done',
        },
        priority: {
          type: 'string',
          enum: ['high', 'normal', 'low'],
          description: 'Task priority (default: normal)',
        },
        context: {
          type: 'object',
          description: 'Additional context for the task',
        },
        metadata: {
          type: 'object',
          description: 'Optional metadata for tracking',
        },
      },
      required: ['type', 'description'],
    },
  },
  {
    name: 'task_status',
    description: 'Get the status and details of a specific task by its ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'The unique task ID to get status for',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List tasks in the queue with optional filtering by status, type, and priority.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
          description: 'Filter by status',
        },
        type: {
          type: 'string',
          enum: ['code', 'research', 'file', 'general'],
          description: 'Filter by task type',
        },
        priority: {
          type: 'string',
          enum: ['high', 'normal', 'low'],
          description: 'Filter by priority',
        },
        limit: {
          type: 'number',
          description: 'Maximum tasks to return (default: 20, max: 100)',
        },
        offset: {
          type: 'number',
          description: 'Offset for pagination (default: 0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'cancel_task',
    description: 'Cancel a pending task. Only tasks with status "pending" can be cancelled.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: {
          type: 'string',
          description: 'The unique task ID to cancel',
        },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'queue_stats',
    description: 'Get overall statistics about the task queue.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

/**
 * Creates and configures the MCP server with all tools.
 * 
 * @param queue - The task queue instance to use (defaults to singleton)
 * @returns Configured Server instance
 */
export function createMcpServer(queue: TaskQueue = taskQueue): Server {
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'dispatch_task': {
        const validated = DispatchTaskSchema.parse(args);
        
        const taskId = queue.addTask({
          type: validated.type as TaskType,
          description: validated.description,
          priority: validated.priority as TaskPriority,
          context: validated.context,
          metadata: validated.metadata,
        });

        const task = queue.getTask(taskId);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                taskId,
                message: `Task dispatched successfully with ID: ${taskId}`,
                task: task ? {
                  id: task.id,
                  type: task.type,
                  description: task.description,
                  priority: task.priority,
                  status: task.status,
                  createdAt: task.createdAt.toISOString(),
                } : null,
              }, null, 2),
            },
          ],
        };
      }

      case 'task_status': {
        const validated = TaskStatusSchema.parse(args);
        const task = queue.getTask(validated.taskId);
        
        if (!task) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: `Task not found: ${validated.taskId}`,
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                task: {
                  id: task.id,
                  type: task.type,
                  description: task.description,
                  priority: task.priority,
                  status: task.status,
                  context: task.context,
                  metadata: task.metadata,
                  result: task.result,
                  createdAt: task.createdAt.toISOString(),
                  startedAt: task.startedAt?.toISOString(),
                  completedAt: task.completedAt?.toISOString(),
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'list_tasks': {
        const validated = ListTasksSchema.parse(args);
        
        const tasks = queue.listTasks({
          status: validated.status as TaskStatus | undefined,
          type: validated.type as TaskType | undefined,
          priority: validated.priority as TaskPriority | undefined,
          limit: validated.limit,
          offset: validated.offset,
        });

        const stats = queue.getStats();

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                count: tasks.length,
                stats,
                tasks: tasks.map((t) => ({
                  id: t.id,
                  type: t.type,
                  description: t.description,
                  priority: t.priority,
                  status: t.status,
                  createdAt: t.createdAt.toISOString(),
                  startedAt: t.startedAt?.toISOString(),
                  completedAt: t.completedAt?.toISOString(),
                })),
              }, null, 2),
            },
          ],
        };
      }

      case 'cancel_task': {
        const validated = CancelTaskSchema.parse(args);
        const success = queue.cancelTask(validated.taskId);
        
        if (!success) {
          const task = queue.getTask(validated.taskId);
          const reason = task 
            ? `Task is not pending (current status: ${task.status})`
            : 'Task not found';
          
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  success: false,
                  error: `Cannot cancel task: ${reason}`,
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: `Task ${validated.taskId} cancelled successfully`,
              }, null, 2),
            },
          ],
        };
      }

      case 'queue_stats': {
        const stats = queue.getStats();
        const config = queue.getConfig();
        
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                stats,
                config: {
                  maxConcurrent: config.maxConcurrent,
                  taskRetentionMs: config.taskRetentionMs,
                  cleanupIntervalMs: config.cleanupIntervalMs,
                },
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

/**
 * Starts the MCP server with stdio transport.
 * 
 * @param queue - Optional task queue instance to use
 */
export async function startMcpServer(queue?: TaskQueue): Promise<void> {
  const server = createMcpServer(queue);
  const transport = new StdioServerTransport();
  
  console.error('[silas-workstation] Starting MCP server...');
  
  await server.connect(transport);
  
  console.error('[silas-workstation] MCP server connected and ready');
}

/**
 * Export schemas for testing
 */
export const schemas = {
  DispatchTaskSchema,
  TaskStatusSchema,
  ListTasksSchema,
  CancelTaskSchema,
};
