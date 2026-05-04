# Xander Conversation Engine

The Xander Conversation Engine is the AI backend that powers the Xander voice app. It runs as a Node.js/Express HTTP server in Termux on Android and provides conversational AI capabilities via the Anthropic Claude API.

## Overview

Xander is a conversational AI companion - like a smart friend you can brainstorm with, especially while driving. The engine handles:

- **Session management** - Track conversation context and history
- **LLM integration** - Natural conversations powered by Claude claude-sonnet-4-20250514
- **Dispatch detection** - Recognize when ideas crystallize into actionable tasks
- **Task dispatch** - Send work to Silas workstation for execution

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     XANDER CONVERSATION ENGINE                       │
│                        (Termux on Android)                          │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Express HTTP Server                        │  │
│  │                      Port 3000                                 │  │
│  │                                                                │  │
│  │  ┌─────────┐   ┌─────────┐   ┌──────────┐   ┌────────────┐   │  │
│  │  │ /health │   │/session │   │  /chat   │   │ /dispatch  │   │  │
│  │  │ /status │   │  routes │   │  route   │   │   routes   │   │  │
│  │  └─────────┘   └────┬────┘   └────┬─────┘   └─────┬──────┘   │  │
│  │                     │             │               │           │  │
│  └─────────────────────│─────────────│───────────────│───────────┘  │
│                        │             │               │               │
│                        ▼             ▼               ▼               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                        SERVICES                                  ││
│  │                                                                  ││
│  │  ┌─────────────────────┐      ┌────────────────────────────┐   ││
│  │  │   Session Manager   │      │       LLM Client           │   ││
│  │  │                     │      │                            │   ││
│  │  │  • In-memory store  │      │  • Anthropic Claude SDK    │   ││
│  │  │  • UUID generation  │      │  • System prompt           │   ││
│  │  │  • 30-min timeout   │      │  • Dispatch detection      │   ││
│  │  │  • Auto-cleanup     │      │  • Message conversion      │   ││
│  │  └─────────────────────┘      └────────────────────────────┘   ││
│  │                                                                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Features

### Current (Phase 6)

- ✅ Express v5 HTTP server with health check endpoint
- ✅ Session management with UUID-based session IDs
- ✅ 30-minute inactivity timeout with automatic cleanup
- ✅ Anthropic Claude SDK integration (claude-sonnet-4-20250514)
- ✅ Conversation history per session
- ✅ Dispatch detection from LLM responses
- ✅ Task queue for dispatched work
- ✅ Graceful shutdown handling
- ✅ **Comprehensive unit tests** (110+ tests)

### Planned

- ⏳ MCP integration for actual Silas dispatch (Phase 8)
- ⏳ Push notifications for task status updates (Phase 9)

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm (or npm)
- Anthropic API key

### Installation

```bash
# Navigate to xander-engine directory
cd xander-engine

# Install dependencies
pnpm install

# Set up environment
export ANTHROPIC_API_KEY=your-api-key-here

# Start development server
pnpm dev
```

For detailed setup instructions including Termux deployment, see [Setup Guide](./setup.md).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check (returns agent name, version, status) |
| `/status` | GET | Extended status with active sessions and uptime |
| `/session/start` | POST | Create a new session |
| `/session/end` | POST | End an existing session |
| `/session/:sessionId` | GET | Get session data |
| `/chat` | POST | Send message to Xander |
| `/dispatch` | POST | Dispatch task to Silas workstation |
| `/dispatch/:taskId` | GET | Get task status by ID |
| `/dispatch/session/:sessionId` | GET | Get all tasks for a session |

For complete API documentation, see [API Reference](./api-reference.md).

## Project Structure

```
xander-engine/
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── eslint.config.js                # ESLint configuration
├── vitest.config.ts                # Vitest test configuration
├── .gitignore                      # Git ignore rules
└── src/
    ├── server.ts                   # Express server entry point
    ├── types.ts                    # Shared TypeScript interfaces
    ├── routes/
    │   ├── chat.ts                 # POST /chat endpoint
    │   ├── session.ts              # Session management routes
    │   └── dispatch.ts             # Dispatch task routes
    ├── services/
    │   ├── sessionManager.ts       # Session lifecycle management
    │   └── llmClient.ts            # Anthropic LLM integration
    └── __tests__/                  # Unit tests
        ├── sessionManager.test.ts
        ├── llmClient.test.ts
        └── routes/
            ├── chat.test.ts
            ├── session.test.ts
            └── dispatch.test.ts
```

For detailed architecture information, see [Architecture Guide](./architecture.md).

## Documentation

- **[Setup Guide](./setup.md)** - Installation and Termux deployment
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Architecture](./architecture.md)** - Technical architecture and modules

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express | 5.x |
| Language | TypeScript | 5.x |
| LLM SDK | @anthropic-ai/sdk | 0.52.x |
| UUID | uuid | 11.x |
| Testing | Vitest | 3.x |
| Linting | ESLint | 9.x |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm start` | Run compiled production server |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm type-check` | TypeScript type checking |
| `pnpm lint` | Run ESLint |

## Related Documentation

- [Parent Documentation](../README.md) - Autoxan project overview
- [Mobile App](../mobile/README.md) - Xander Voice App (React Native)
- [Project Plan](../../plans/xander-voice-app-plan.md) - Complete project specification

---

*Last updated: Phase 6 - Conversation Engine Implementation*
