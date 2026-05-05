# Hermes Agent in Autoxan

## Purpose

Hermes Agent serves as the AI backend for Xander, the conversational voice assistant in the Autoxan project. It provides a feature-rich, production-ready AI agent framework with built-in memory, MCP protocol support, and access to 200+ LLM models via OpenRouter.

## Design

The architecture positions Hermes as the central AI processing unit running in Termux on Android:

```
┌─────────────────────────────────────┐
│     React Native App (mobile/)      │
│  ┌───────────────────────────────┐  │
│  │ Speech Recognition (STT)      │  │
│  │ Text to Speech (TTS)          │  │
│  │ xanderApi.ts → HTTP           │  │
│  └───────────────────────────────┘  │
└──────────────────┬──────────────────┘
                   │ HTTP (localhost)
                   ▼
┌─────────────────────────────────────┐
│     Hermes Agent (Termux)           │
│  ┌───────────────────────────────┐  │
│  │ SOUL.md (Xander personality)  │  │
│  │ config.yaml (settings)        │  │
│  │ Memory persistence            │  │
│  │ MCP dispatch to Silas         │  │
│  └───────────────────────────────┘  │
└──────────────────┬──────────────────┘
                   │ MCP Protocol
                   ▼
┌─────────────────────────────────────┐
│     Silas (Workstation Admin)       │
│     Receives dispatched work        │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Hermes over Custom Backend**: Using Hermes provides built-in memory, MCP support, and model flexibility without maintaining custom code.

2. **SOUL.md Personality System**: Xander's personality is defined in a separate `SOUL.md` file, making it easy to tune the assistant's behavior.

3. **Voice-Optimized Configuration**: Settings are tuned for short, conversational responses suitable for text-to-speech output.

4. **Dispatch Integration**: Uses Hermes's built-in MCP protocol to dispatch tasks to the Silas workstation agent.

## API Endpoints

Hermes exposes an OpenRouter-compatible HTTP API for the React Native mobile app to communicate with.

### Default Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| **Base URL** | `http://localhost:8080` | Default Hermes port |
| **Timeout** | 30 seconds | Request timeout |

### Endpoint Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | OpenRouter-compatible chat completion endpoint |
| `/health` | GET | Health check endpoint |
| `/session` | POST | Create new session |
| `/session/:id` | GET | Get session by ID |
| `/session/:id` | DELETE | End/delete session |

### Chat Completion Request Format

The chat endpoint accepts OpenRouter-compatible requests:

```typescript
interface HermesChatRequest {
  model?: string;           // Optional model override
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  max_tokens?: number;      // Maximum response tokens
  temperature?: number;     // Sampling temperature
  stream?: boolean;         // Streaming (set to false)
}
```

### Chat Completion Response Format

```typescript
interface HermesChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: [{
    index: number;
    message: {
      role: 'assistant';
      content: string;      // May contain dispatch blocks
    };
    finish_reason: string | null;
  }];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Dispatch Block Format

When Xander suggests a task for Silas, the response content includes a dispatch block:

```
[DISPATCH_SUGGESTED]
Summary: Brief task description
Details: Detailed instructions for the task
[/DISPATCH_SUGGESTED]
```

The mobile app parses these blocks and displays them separately from the main response.

## Dependencies

| Dependency | Purpose |
|------------|---------|
| **Hermes Agent** | Core AI agent framework |
| **OpenRouter** | LLM provider (Claude, GPT-4, etc.) |
| **Python 3.11+** | Hermes runtime (Termux) |
| **MCP Protocol** | Communication with Silas |

## Configuration Files

The Hermes configuration lives in `/hermes/` at the repository root:

| File | Purpose |
|------|---------|
| `/hermes/config.yaml` | Main Hermes settings |
| `/hermes/SOUL.md` | Xander's personality definition |
| `/hermes/README.md` | Quick start with test cases |

These are copied to `~/.hermes/` on the device during setup.

## Key Features

### 1. Xander Personality (SOUL.md)

Defines how Xander behaves in conversation:
- Natural, conversational tone
- Concise responses (1-3 sentences)
- Active listening with follow-up questions
- Knows when to suggest dispatch to Silas

### 2. Memory Persistence

Hermes remembers user preferences across sessions:
- User profile (name, preferences, work context)
- Conversation skills and patterns
- Custom memory limits for voice context

### 3. Voice Optimization

Configuration is tuned for voice interactions:
- Short `max_turns` for faster resolution
- Context compression to keep conversations manageable
- Protected recent messages for conversation flow

### 4. MCP Dispatch

When a task needs execution, Xander uses MCP to dispatch to Silas:

```
User: "Can you research the best coffee grinders under $200?"

Xander: "That sounds like a good research task for Silas - he can dig deep into reviews and comparisons.

[DISPATCH_SUGGESTED]
Summary: Research best coffee grinders under $200
Details: Find and compare coffee grinders under $200. Look at user reviews, grind consistency, durability, and value. Provide top 3-5 recommendations with pros/cons.
[/DISPATCH_SUGGESTED]"
```

### 5. Integration Testing

Comprehensive integration tests verify the mobile app's communication with Hermes:

- **35+ automated tests** covering health checks, conversations, dispatch detection, memory, and error handling
- **Dual-mode testing** - unit tests with mocks for CI/CD, integration tests for real Hermes
- **Manual testing checklist** for full end-to-end verification

Test file: `mobile/src/api/__tests__/hermesIntegration.test.ts`

See the **[Testing Guide](./testing.md)** for complete documentation.

## Usage Examples

### Basic Conversation

```bash
hermes chat "Hey Xander, how are you?"
# Response: "Hey! I'm doing great, thanks for asking. What's on your mind?"
```

### Thinking Partner

```bash
hermes chat "I'm considering switching from React to Vue"
# Response: "Interesting! What's driving the consideration - is it the API design, ecosystem, or something specific about your project?"
```

### Dispatch Task

```bash
hermes chat "Create a Python script to analyze my git commit history"
# Response includes [DISPATCH_SUGGESTED] block with task details
```

## Related Components

- **[Configuration Reference](./configuration.md)** - Detailed config.yaml documentation
- **[Setup Guide](./setup.md)** - Termux installation instructions
- **[Testing Guide](./testing.md)** - Integration testing documentation
- **[Mobile App](../mobile/README.md)** - React Native voice UI
- **[Architecture Overhaul Plan](../../plans/hermes-architecture-overhaul.md)** - Migration context

## Quick Links

- [Hermes Agent Official Docs](https://hermes-agent.nousresearch.com/)
- [OpenRouter](https://openrouter.ai/) - LLM provider
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol

---

*Part of the [Autoxan Documentation](../README.md)*
