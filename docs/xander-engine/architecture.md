# Xander Engine Architecture

This document provides detailed technical architecture documentation for the Xander Conversation Engine, including module descriptions, design patterns, and implementation details.

## System Overview

The Xander Conversation Engine is a Node.js/Express HTTP server that provides the AI backend for the Xander voice app. It is designed to run in Termux on Android, enabling local AI processing on the device.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MOBILE DEVICE                                   │
│                                                                          │
│  ┌─────────────────────────────┐    ┌─────────────────────────────────┐ │
│  │    Xander Voice App         │    │    Xander Conversation Engine   │ │
│  │    (React Native/Expo)      │◀──▶│    (Node.js/Express)            │ │
│  │                             │    │                                 │ │
│  │  • Voice UI                 │    │  • Session Management           │ │
│  │  • Speech-to-Text           │    │  • LLM Integration              │ │
│  │  • Text-to-Speech           │    │  • Dispatch Detection           │ │
│  │  • Audio Focus              │    │  • Task Queue                   │ │
│  └─────────────────────────────┘    └───────────────┬─────────────────┘ │
│                                                      │                   │
└──────────────────────────────────────────────────────│───────────────────┘
                                                       │
                                                       ▼
                                         ┌─────────────────────────────┐
                                         │   Anthropic Claude API      │
                                         │   (claude-sonnet-4-20250514)          │
                                         └─────────────────────────────┘
                                                       │
                                                       │ Future: MCP
                                                       ▼
                                         ┌─────────────────────────────┐
                                         │   Silas Workstation Agent   │
                                         │   (Receives dispatched work)│
                                         └─────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js 18+ | JavaScript execution |
| Framework | Express 5 | HTTP server |
| Language | TypeScript 5 | Type safety |
| LLM | @anthropic-ai/sdk | Claude integration |
| Testing | Vitest | Unit testing |
| Module System | ESM | Native ES modules |

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
    ├── routes/                     # HTTP route handlers
    │   ├── chat.ts                 # POST /chat endpoint
    │   ├── session.ts              # Session management routes
    │   └── dispatch.ts             # Dispatch task routes
    ├── services/                   # Business logic
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

## Module Documentation

### Entry Point: server.ts

The main Express application setup and configuration.

**Responsibilities:**
- Initialize Express app with middleware
- Mount route handlers
- Configure CORS for cross-origin requests
- Request logging
- Error handling (404 and 500)
- Graceful shutdown
- Session cleanup interval

**Key Features:**
```typescript
// Middleware stack
app.use(cors());
app.use(express.json());

// Routes
app.use('/session', sessionRouter);
app.use('/chat', chatRouter);
app.use('/dispatch', dispatchRouter);

// Health endpoints
app.get('/health', ...);
app.get('/status', ...);
```

**Lifecycle:**
1. Initialize middleware
2. Mount routes
3. Start cleanup interval (5 minutes)
4. Listen on PORT (default 3000)
5. Handle SIGINT/SIGTERM for graceful shutdown

---

### Types: types.ts

Shared TypeScript interfaces and constants.

**Core Interfaces:**

```typescript
// Message in a conversation
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Conversation session
interface Session {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  metadata: SessionMetadata;
}

// Session tracking data
interface SessionMetadata {
  dispatchCount: number;
  topicsDiscussed: string[];
}

// LLM response with dispatch parsing
interface LLMResult {
  content: string;
  suggestDispatch: boolean;
  dispatchSummary?: string;
  dispatchDetails?: string;
}
```

**Constants:**

```typescript
const SESSION_TIMEOUT = {
  INACTIVITY_MS: 30 * 60 * 1000,      // 30 minutes
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
};
```

---

### Routes

#### routes/session.ts

Session lifecycle management endpoints.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/session/start` | POST | Create new session |
| `/session/end` | POST | End existing session |
| `/session/:sessionId` | GET | Retrieve session data |

**Design Decisions:**
- Sessions are identified by UUID v4
- Session data includes conversation history and metadata
- Ending a session removes it from memory

#### routes/chat.ts

The main conversation endpoint.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Send message, receive response |

**Flow:**
1. Validate message input
2. Get or create session (auto-creates if missing)
3. Retrieve conversation history
4. Add user message to session
5. Send to LLM with history context
6. Parse response for dispatch suggestions
7. Add assistant response to session
8. Return response with optional dispatch info

**Auto-Session Creation:**
```typescript
// If sessionId not provided or session not found, create new
let session = sessionId ? getSession(sessionId) : null;
if (!session) {
  session = createSession();
  activeSessionId = session.id;
}
```

#### routes/dispatch.ts

Task dispatch and management endpoints.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dispatch` | POST | Create dispatch task |
| `/dispatch/:taskId` | GET | Get task status |
| `/dispatch/session/:sessionId` | GET | Get all tasks for session |

**Task Structure:**
```typescript
interface Task {
  id: string;
  sessionId: string;
  summary: string;
  details: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}
```

**Current Implementation:**
- Tasks are stored in-memory
- Logs dispatch info to console
- Future: Will dispatch to Silas via MCP

---

### Services

#### services/sessionManager.ts

In-memory session storage and lifecycle management.

**Data Structures:**
```typescript
// Session storage
const sessions = new Map<string, Session>();

// Activity tracking for timeout
const lastActivityMap = new Map<string, number>();
```

**Core Functions:**

| Function | Description |
|----------|-------------|
| `createSession()` | Create new session with UUID |
| `getSession(id)` | Retrieve session by ID |
| `addMessage(id, role, content)` | Add message to session |
| `getConversationHistory(id)` | Get messages for LLM context |
| `endSession(id)` | Remove session from storage |
| `updateActivity(id)` | Update last activity timestamp |
| `cleanupInactiveSessions()` | Remove timed-out sessions |
| `startCleanupInterval()` | Start automatic cleanup |

**Session Timeout Design:**
- Each session tracks last activity time
- Cleanup runs every 5 minutes
- Sessions inactive for 30+ minutes are removed
- Activity updates on: message added, metadata updated

**Metadata Tracking:**
```typescript
// Track dispatch usage per session
incrementDispatchCount(sessionId);

// Track topics for conversation context
addTopic(sessionId, topic);
```

#### services/llmClient.ts

Anthropic Claude SDK integration with dispatch detection.

**LLM Configuration:**
```typescript
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: XANDER_SYSTEM_PROMPT,
  messages: conversationHistory,
});
```

**System Prompt:**

Xander's personality and behavior are defined in the system prompt:

```
You are Xander, a conversational AI companion running on a phone.
Your primary job is to be great to talk to - like a smart friend 
the user can brainstorm with, especially while driving.

## Your Personality
- Natural and conversational - not robotic or formal
- Listen actively and ask good follow-up questions
- Think WITH the user, not FOR them
- Be concise since responses will be spoken aloud (TTS)

## When to Suggest Dispatch
Most conversations DON'T need dispatch - many are just exploring 
ideas, thinking out loud, or getting quick help.
```

**Dispatch Detection:**

The LLM can suggest dispatching work using a specific format:

```
[DISPATCH_SUGGESTED]
Summary: <one-line summary>
Details: <detailed description>
[/DISPATCH_SUGGESTED]
```

**Parsing Logic:**
```typescript
function parseDispatchSuggestion(content: string): LLMResult {
  const dispatchRegex = 
    /\[DISPATCH_SUGGESTED\]\s*Summary:\s*(.+?)\s*Details:\s*([\s\S]+?)\s*\[\/DISPATCH_SUGGESTED\]/i;
  
  const match = content.match(dispatchRegex);
  
  if (match) {
    // Extract and remove dispatch block from spoken response
    const cleanContent = content.replace(dispatchRegex, '').trim();
    return {
      content: cleanContent,
      suggestDispatch: true,
      dispatchSummary: match[1].trim(),
      dispatchDetails: match[2].trim(),
    };
  }
  
  return { content, suggestDispatch: false };
}
```

---

## Design Patterns

### 1. Router Pattern

Each route domain has its own router module:

```typescript
// routes/session.ts
export const sessionRouter: Router = Router();
sessionRouter.post('/start', ...);
sessionRouter.post('/end', ...);
sessionRouter.get('/:sessionId', ...);

// server.ts
app.use('/session', sessionRouter);
```

**Benefits:**
- Clear separation of concerns
- Easy to test individual routes
- Scalable route organization

### 2. Service Layer Pattern

Business logic is extracted into service modules:

```
Routes (HTTP handling)
    ↓
Services (Business logic)
    ↓
External APIs (Anthropic)
```

**Benefits:**
- Routes remain thin/focused on HTTP
- Services are testable without HTTP
- Easy to mock external dependencies

### 3. In-Memory Storage Pattern

Sessions and tasks use Map-based storage:

```typescript
const sessions = new Map<string, Session>();
const taskQueue = new Map<string, Task>();
```

**Rationale:**
- Simple and fast for local use
- No database dependency
- Sufficient for single-device operation
- Sessions are transient by design

**Trade-offs:**
- Data lost on restart
- Not suitable for distributed systems
- Memory limited by device

### 4. Graceful Shutdown Pattern

Proper cleanup on process termination:

```typescript
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
```

---

## Data Flow

### Chat Flow

```
User Message
    │
    ▼
┌───────────────────────┐
│  POST /chat           │
│  • Validate input     │
│  • Get/create session │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Session Manager      │
│  • Add user message   │
│  • Get history        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  LLM Client           │
│  • Format messages    │
│  • Call Anthropic API │
│  • Parse response     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Parse Dispatch       │
│  • Check for markers  │
│  • Extract summary    │
│  • Clean response     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Session Manager      │
│  • Add assistant msg  │
│  • Update activity    │
└───────────┬───────────┘
            │
            ▼
   Response with optional
   dispatch suggestion
```

### Dispatch Flow

```
Dispatch Request
    │
    ▼
┌───────────────────────┐
│  POST /dispatch       │
│  • Validate fields    │
│  • Verify session     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Create Task          │
│  • Generate UUID      │
│  • Set status=pending │
│  • Store in queue     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Update Session       │
│  • Increment dispatch │
│  • Add topic          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Log & Return         │
│  • Console log        │
│  • Return taskId      │
└───────────────────────┘
            │
   Future: MCP dispatch
            │
            ▼
┌───────────────────────┐
│  Silas Workstation    │
│  • Receive task       │
│  • Execute work       │
└───────────────────────┘
```

---

## Testing Architecture

### Test Organization

```
src/__tests__/
├── sessionManager.test.ts    # Session service tests
├── llmClient.test.ts         # LLM client tests
└── routes/
    ├── chat.test.ts          # Chat endpoint tests
    ├── session.test.ts       # Session endpoints tests
    └── dispatch.test.ts      # Dispatch endpoints tests
```

### Testing Approach

**Unit Tests:**
- Test individual functions in isolation
- Mock external dependencies (Anthropic SDK)
- Clear state between tests

**Route Tests:**
- Use supertest for HTTP testing
- Mock service layer
- Test request/response shapes
- Test error handling

**Mocking Pattern:**
```typescript
// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mocked response' }],
      }),
    },
  })),
}));
```

**Test Utilities:**
```typescript
// Clear sessions between tests
beforeEach(() => {
  clearAllSessions();
});

// Export internal state for testing
export const _testOnlySessions = sessions;
```

---

## Error Handling

### Error Categories

| Category | HTTP Status | Example |
|----------|-------------|---------|
| Validation | 400 | Missing required field |
| Not Found | 404 | Session doesn't exist |
| LLM Error | 503 | API key invalid |
| Server Error | 500 | Unexpected exception |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Global Error Handler

```typescript
app.use((err: Error, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});
```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Claude API access |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | - | `test` disables auto-start |

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "./dist"
  }
}
```

---

## Future Considerations

### Phase 8: MCP Integration

- Replace console logging with actual Silas dispatch
- Implement MCP client for workstation communication
- Handle dispatch acknowledgments

### Scalability

Current design is single-device focused. For multi-device:
- Consider Redis for session storage
- Add session persistence
- Implement proper task queue (Bull, etc.)

### Security

- Add rate limiting for API endpoints
- Implement authentication for dispatch
- Secure Termux networking

---

## Related Documentation

- [Setup Guide](./setup.md) - Installation instructions
- [API Reference](./api-reference.md) - Complete API documentation
- [Project Plan](../../plans/xander-voice-app-plan.md) - Full project specification

---

*Last updated: Phase 6 - Conversation Engine Implementation*
