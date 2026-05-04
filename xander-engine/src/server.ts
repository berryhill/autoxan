import express, { type Express } from 'express';
import cors from 'cors';
import { sessionRouter } from './routes/session.js';
import { chatRouter } from './routes/chat.js';
import { dispatchRouter } from './routes/dispatch.js';
import { startCleanupInterval, getActiveSessionCount } from './services/sessionManager.js';
import type { HealthResponse } from './types.js';

/**
 * Xander Conversation Engine
 *
 * This is the AI backend for the Xander voice app.
 * It runs in Termux on the Android phone and provides:
 * - Session management for conversations
 * - Chat endpoint for LLM-powered conversations
 * - Dispatch endpoint for sending work to Silas workstation
 */

const app: Express = express();
const PORT = process.env.PORT ?? 3000;
const VERSION = '1.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  const response: HealthResponse = {
    status: 'healthy',
    agent: 'xander',
    version: VERSION,
  };
  res.json(response);
});

/**
 * GET /status
 * Extended status endpoint with additional info
 */
app.get('/status', (_req, res) => {
  res.json({
    status: 'healthy',
    agent: 'xander',
    version: VERSION,
    activeSessions: getActiveSessionCount(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
app.use('/session', sessionRouter);
app.use('/chat', chatRouter);
app.use('/dispatch', dispatchRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
);

// Start server (only if this file is run directly)
if (process.env.NODE_ENV !== 'test') {
  // Start cleanup interval for inactive sessions
  const cleanupIntervalId = startCleanupInterval();

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════╗');
    console.log('  ║                                           ║');
    console.log('  ║   🤖 Xander Conversation Engine           ║');
    console.log(`  ║   Version: ${VERSION}                         ║`);
    console.log(`  ║   Port: ${PORT}                              ║`);
    console.log('  ║                                           ║');
    console.log('  ║   Endpoints:                              ║');
    console.log('  ║   • GET  /health                          ║');
    console.log('  ║   • GET  /status                          ║');
    console.log('  ║   • POST /session/start                   ║');
    console.log('  ║   • POST /session/end                     ║');
    console.log('  ║   • GET  /session/:sessionId              ║');
    console.log('  ║   • POST /chat                            ║');
    console.log('  ║   • POST /dispatch                        ║');
    console.log('  ║                                           ║');
    console.log('  ╚═══════════════════════════════════════════╝');
    console.log('');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down Xander...');
    clearInterval(cleanupIntervalId);
    server.close(() => {
      console.log('Xander has stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Export for testing
export { app };
