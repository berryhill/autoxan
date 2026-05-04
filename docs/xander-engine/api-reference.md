# Xander Engine API Reference

Complete API documentation for the Xander Conversation Engine HTTP endpoints.

## Base URL

```
http://localhost:3000
```

When deployed to Termux, replace `localhost` with the device's IP address.

## Content Type

All endpoints accept and return JSON:

```
Content-Type: application/json
```

---

## Health & Status Endpoints

### GET /health

Health check endpoint for monitoring and load balancers.

#### Request

```bash
curl http://localhost:3000/health
```

#### Response

```json
{
  "status": "healthy",
  "agent": "xander",
  "version": "1.0.0"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"healthy" \| "unhealthy"` | Server health status |
| `agent` | `string` | Agent name (always "xander") |
| `version` | `string` | Server version |

---

### GET /status

Extended status endpoint with operational metrics.

#### Request

```bash
curl http://localhost:3000/status
```

#### Response

```json
{
  "status": "healthy",
  "agent": "xander",
  "version": "1.0.0",
  "activeSessions": 3,
  "uptime": 1234.567,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Server health status |
| `agent` | `string` | Agent name |
| `version` | `string` | Server version |
| `activeSessions` | `number` | Number of active sessions |
| `uptime` | `number` | Server uptime in seconds |
| `timestamp` | `string` | Current timestamp (ISO 8601) |

---

## Session Endpoints

### POST /session/start

Create a new conversation session.

#### Request

```bash
curl -X POST http://localhost:3000/session/start
```

No request body required.

#### Response

**Status: 201 Created**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID session identifier |
| `messages` | `Message[]` | Array of messages (empty for new session) |
| `createdAt` | `string` | Creation timestamp (ISO 8601) |

#### Error Response

**Status: 500 Internal Server Error**

```json
{
  "error": "Failed to create session",
  "message": "Error details..."
}
```

---

### POST /session/end

End an existing session.

#### Request

```bash
curl -X POST http://localhost:3000/session/end \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "550e8400-e29b-41d4-a716-446655440000"}'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session ID to end |

#### Response

**Status: 200 OK**

```json
{
  "success": true,
  "message": "Session ended successfully"
}
```

#### Error Responses

**Status: 400 Bad Request** - Missing sessionId

```json
{
  "error": "Missing sessionId",
  "message": "sessionId is required in the request body"
}
```

**Status: 404 Not Found** - Session not found

```json
{
  "error": "Session not found",
  "message": "No session found with ID: 550e8400-..."
}
```

---

### GET /session/:sessionId

Retrieve session data including conversation history.

#### Request

```bash
curl http://localhost:3000/session/550e8400-e29b-41d4-a716-446655440000
```

#### Response

**Status: 200 OK**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "role": "user",
      "content": "Hello Xander",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Hey! Good to hear from you. What's on your mind?",
      "timestamp": "2024-01-15T10:30:01.000Z"
    }
  ],
  "createdAt": "2024-01-15T10:29:55.000Z",
  "updatedAt": "2024-01-15T10:30:01.000Z",
  "metadata": {
    "dispatchCount": 0,
    "topicsDiscussed": []
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Session identifier |
| `messages` | `Message[]` | Conversation history |
| `createdAt` | `string` | Creation timestamp |
| `updatedAt` | `string` | Last activity timestamp |
| `metadata.dispatchCount` | `number` | Number of tasks dispatched |
| `metadata.topicsDiscussed` | `string[]` | Topics from dispatch summaries |

#### Error Responses

**Status: 404 Not Found**

```json
{
  "error": "Session not found",
  "message": "No session found with ID: 550e8400-..."
}
```

---

## Chat Endpoint

### POST /chat

Send a message to Xander and receive a response.

#### Request

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "I have an idea for a new feature..."
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | No | Existing session ID (auto-creates if missing) |
| `message` | `string` | Yes | User's message |

#### Response

**Status: 200 OK** - Standard response

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "response": "That sounds interesting! Tell me more about what you're thinking..."
}
```

**Status: 200 OK** - Response with dispatch suggestion

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "response": "That sounds like a solid plan. Want me to dispatch this to Silas for implementation?",
  "suggestDispatch": true,
  "dispatchSummary": "Implement user authentication system",
  "dispatchDetails": "Create a JWT-based authentication system with:\n1. Login endpoint\n2. Registration endpoint\n3. Password reset flow\n4. Session management"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `string` | Session ID (may be new if auto-created) |
| `response` | `string` | Xander's response text |
| `suggestDispatch` | `boolean?` | Present and `true` if dispatch suggested |
| `dispatchSummary` | `string?` | One-line task summary |
| `dispatchDetails` | `string?` | Detailed task description |

#### Error Responses

**Status: 400 Bad Request** - Invalid message

```json
{
  "error": "Invalid message",
  "message": "Message is required and cannot be empty"
}
```

**Status: 503 Service Unavailable** - LLM error

```json
{
  "error": "LLM service unavailable",
  "message": "LLM request failed: API key invalid"
}
```

---

## Dispatch Endpoints

### POST /dispatch

Dispatch a task to Silas workstation.

#### Request

```bash
curl -X POST http://localhost:3000/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "summary": "Implement user authentication",
    "details": "Create JWT-based auth with login, registration, and password reset"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session ID |
| `summary` | `string` | Yes | One-line task summary |
| `details` | `string` | Yes | Detailed task description |

#### Response

**Status: 201 Created**

```json
{
  "success": true,
  "taskId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "message": "Task dispatched to Silas workstation"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Always `true` on success |
| `taskId` | `string` | UUID task identifier |
| `message` | `string` | Confirmation message |

#### Error Responses

**Status: 400 Bad Request** - Missing fields

```json
{
  "error": "Missing sessionId",
  "message": "sessionId is required"
}
```

```json
{
  "error": "Invalid summary",
  "message": "summary is required and cannot be empty"
}
```

```json
{
  "error": "Invalid details",
  "message": "details is required and cannot be empty"
}
```

**Status: 404 Not Found** - Session not found

```json
{
  "error": "Session not found",
  "message": "No session found with ID: 550e8400-..."
}
```

---

### GET /dispatch/:taskId

Get the status of a dispatched task.

#### Request

```bash
curl http://localhost:3000/dispatch/7c9e6679-7425-40de-944b-e07fc1f90ae7
```

#### Response

**Status: 200 OK**

```json
{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "summary": "Implement user authentication",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Task identifier |
| `sessionId` | `string` | Associated session ID |
| `summary` | `string` | Task summary |
| `status` | `string` | One of: `pending`, `processing`, `completed`, `failed` |
| `createdAt` | `string` | Creation timestamp |

#### Error Response

**Status: 404 Not Found**

```json
{
  "error": "Task not found",
  "message": "No task found with ID: 7c9e6679-..."
}
```

---

### GET /dispatch/session/:sessionId

Get all tasks dispatched from a session.

#### Request

```bash
curl http://localhost:3000/dispatch/session/550e8400-e29b-41d4-a716-446655440000
```

#### Response

**Status: 200 OK**

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "tasks": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "summary": "Implement user authentication",
      "details": "Create JWT-based auth...",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | `string` | Session identifier |
| `tasks` | `Task[]` | Array of dispatched tasks |
| `count` | `number` | Number of tasks |

---

## Error Handling

### Error Response Format

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET or POST operation |
| 201 | Created | Resource created (session, task) |
| 400 | Bad Request | Invalid or missing request parameters |
| 404 | Not Found | Requested resource doesn't exist |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | LLM service error |

### 404 Handler

Requests to undefined endpoints return:

```json
{
  "error": "Not found",
  "message": "The requested endpoint does not exist"
}
```

---

## Data Types

### Message

```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;  // ISO 8601
}
```

### Session

```typescript
interface Session {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  metadata: {
    dispatchCount: number;
    topicsDiscussed: string[];
  };
}
```

### Task

```typescript
interface Task {
  id: string;
  sessionId: string;
  summary: string;
  details: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
}
```

---

## Session Lifecycle

### Auto-Creation

The `/chat` endpoint automatically creates a session if `sessionId` is missing or invalid:

```bash
# No sessionId - new session created
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Response includes new sessionId
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "response": "Hey! What's up?"
}
```

### Inactivity Timeout

Sessions automatically expire after 30 minutes of inactivity. The cleanup runs every 5 minutes.

### Manual End

Explicitly end sessions using `/session/end`:

```bash
curl -X POST http://localhost:3000/session/end \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "550e8400-..."}'
```

---

## Example Flows

### Basic Conversation

```bash
# 1. Start session
SESSION=$(curl -s -X POST http://localhost:3000/session/start | jq -r '.id')

# 2. Send messages
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION\", \"message\": \"What's the capital of France?\"}"

# 3. End session
curl -X POST http://localhost:3000/session/end \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\": \"$SESSION\"}"
```

### Conversation with Dispatch

```bash
# 1. Chat about an idea
RESPONSE=$(curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to build a todo app with React"}')

# 2. Check if dispatch suggested
echo $RESPONSE | jq '.suggestDispatch'

# 3. If suggested, dispatch the task
SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
SUMMARY=$(echo $RESPONSE | jq -r '.dispatchSummary')
DETAILS=$(echo $RESPONSE | jq -r '.dispatchDetails')

curl -X POST http://localhost:3000/dispatch \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"summary\": \"$SUMMARY\",
    \"details\": \"$DETAILS\"
  }"
```

---

*Last updated: Phase 6 - Conversation Engine Implementation*
