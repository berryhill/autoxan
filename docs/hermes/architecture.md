# Hermes Architecture

## Purpose

This document provides a comprehensive technical overview of the Hermes Agent architecture within the Autoxan project. Hermes serves as the AI backend for Xander, the conversational voice assistant, running locally in Termux on Android devices.

## Design

### System Overview

The Autoxan architecture uses a three-tier system:

1. **React Native App** (`mobile/`) - Voice UI entry point
2. **Hermes Agent** (`hermes/`) - AI backend running in Termux
3. **Silas** (external) - Workstation admin for heavy work

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID PHONE                             │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │ Google Assistant │────▶│ Xander Voice App (React Native)  │  │
│  │ "Talk to Xander" │     │  • Voice interface (STT/TTS)     │  │
│  └──────────────────┘     │  • Audio focus management         │  │
│                           └────────────────┬─────────────────┘  │
│                                            │ HTTP                │
│                                            ▼                     │
│                           ┌──────────────────────────────────┐  │
│                           │ HERMES AGENT (Termux)            │  │
│                           │                                  │  │
│                           │ • SOUL.md - Xander personality   │  │
│                           │ • config.yaml - Settings         │  │
│                           │ • Memory persistence             │  │
│                           │ • OpenRouter LLM integration     │  │
│                           │ • MCP dispatch to Silas          │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
└────────────────────────────────────────────│─────────────────────┘
                                             │ MCP Protocol
                                             ▼
                            ┌──────────────────────────────────────┐
                            │ SILAS (Workstation Admin)            │
                            │                                      │
                            │ Execution Engine:                    │
                            │ • Receives dispatched work           │
                            │ • Creates detailed plans             │
                            │ • Queues tasks for execution         │
                            │ • Heavy research & analysis          │
                            └──────────────────────────────────────┘
```

### Communication Flow

#### React Native ↔ Hermes Communication

The mobile app communicates with Hermes via HTTP REST API:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                      VOICE CONVERSATION FLOW                                │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User speaks                                                                │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ React Native    │  expo-speech-recognition                               │
│  │ STT Hook        │  ──────────────────────► Text transcript               │
│  └─────────────────┘                                                        │
│       │                                                                     │
│       │ HTTP POST /v1/chat/completions                                      │
│       │ {messages: [...], stream: false}                                    │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ Hermes Agent    │                                                        │
│  │ localhost:8080  │  ──► LLM via OpenRouter ──► Response generation        │
│  └─────────────────┘                                                        │
│       │                                                                     │
│       │ Response with optional [DISPATCH_SUGGESTED] block                   │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ Response        │  Parse dispatch blocks                                 │
│  │ Processing      │  Extract clean response text                           │
│  └─────────────────┘                                                        │
│       │                                                                     │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────┐                                                        │
│  │ React Native    │  expo-speech                                           │
│  │ TTS Hook        │  ──────────────────────► User hears response           │
│  └─────────────────┘                                                        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

#### MCP Dispatch Flow to Silas

When a task requires workstation processing, Hermes dispatches to Silas:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        MCP DISPATCH FLOW                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Xander identifies task requiring dispatch                                  │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                            │
│  │ Response includes:                          │                            │
│  │                                             │                            │
│  │ "I'll send this to Silas for you.           │                            │
│  │                                             │                            │
│  │ [DISPATCH_SUGGESTED]                        │                            │
│  │ Summary: Research best coffee grinders      │                            │
│  │ Details: Find and compare grinders under    │                            │
│  │          $200 with reviews and ratings...   │                            │
│  │ [/DISPATCH_SUGGESTED]"                      │                            │
│  └─────────────────────────────────────────────┘                            │
│       │                                                                     │
│       │ Mobile app parses dispatch block                                    │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                            │
│  │ User confirms dispatch                      │                            │
│  │ (optional - can be automatic)               │                            │
│  └─────────────────────────────────────────────┘                            │
│       │                                                                     │
│       │ MCP Protocol                                                        │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                            │
│  │ SILAS (Workstation)                         │                            │
│  │                                             │                            │
│  │ • Receives work package                     │                            │
│  │ • Creates detailed implementation plan      │                            │
│  │ • Queues tasks for execution                │                            │
│  │ • Executes asynchronously                   │                            │
│  │ • Reports completion when done              │                            │
│  └─────────────────────────────────────────────┘                            │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

## Dependencies

### Runtime Dependencies

| Dependency | Purpose | Location |
|------------|---------|----------|
| **Hermes Agent** | Core AI agent framework | Termux (phone) |
| **Python 3.11+** | Hermes runtime environment | Termux |
| **OpenRouter** | LLM provider (200+ models) | Cloud API |
| **MCP Protocol** | Communication with Silas | Network |

### Mobile App Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| **React Native** | Mobile framework | via Expo 54.x |
| **expo-speech-recognition** | Speech-to-text | 3.x |
| **expo-speech** | Text-to-speech | 14.x |
| **Axios** | HTTP client | 1.x |
| **Zustand** | State management | 5.x |

### Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `config.yaml` | `~/.hermes/config.yaml` | Hermes settings |
| `SOUL.md` | `~/.hermes/SOUL.md` | Xander personality |
| Source files | `/hermes/` | Repository templates |

## API

### Hermes HTTP Endpoints

Hermes exposes an OpenRouter-compatible HTTP API.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | OpenRouter-compatible chat completion |
| `/health` | GET | Health check endpoint |
| `/session` | POST | Create new session |
| `/session/:id` | GET | Get session by ID |
| `/session/:id` | DELETE | End/delete session |

### Chat Completion Request

```typescript
interface HermesChatRequest {
  model?: string;           // Optional model override
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  max_tokens?: number;      // Maximum response tokens
  temperature?: number;     // Sampling temperature
  stream?: boolean;         // Streaming (set to false for voice)
}
```

### Chat Completion Response

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

When Xander suggests a task for Silas, the response includes:

```
[DISPATCH_SUGGESTED]
Summary: Brief task description
Details: Detailed instructions for the task
[/DISPATCH_SUGGESTED]
```

The mobile app parses these blocks using regex and displays them separately from the main response.

### Mobile API Client

The `xanderApi.ts` client provides:

```typescript
class XanderApi {
  // Health check
  async healthCheck(): Promise<boolean>;
  
  // Session management
  async startSession(): Promise<XanderSession>;
  async endSession(): Promise<void>;
  async getSession(): Promise<XanderSession | null>;
  
  // Messaging
  async sendMessage(message: string): Promise<XanderResponse>;
  async sendChatCompletion(request: HermesChatRequest): Promise<HermesChatResponse>;
  
  // Dispatch
  async dispatch(request: DispatchRequest): Promise<DispatchResponse>;
}
```

## Component Responsibilities

### React Native App (`mobile/`)

| Component | File | Responsibility |
|-----------|------|----------------|
| **VoiceButton** | `components/ui/VoiceButton.tsx` | Visual voice interface |
| **useVoice** | `hooks/useVoice.ts` | Speech-to-text handling |
| **useSpeech** | `hooks/useSpeech.ts` | Text-to-speech handling |
| **useAudioFocus** | `hooks/useAudioFocus.ts` | Audio focus management |
| **XanderApi** | `api/xanderApi.ts` | HTTP client for Hermes |
| **SessionStore** | `store/sessionStore.ts` | State management |
| **AudioFocusModule** | `native-modules/android/` | Native audio focus |

### Hermes Agent (`hermes/`)

| Component | File | Responsibility |
|-----------|------|----------------|
| **Configuration** | `config.yaml` | Model, memory, MCP settings |
| **Personality** | `SOUL.md` | Xander's behavior and tone |
| **Memory** | Built-in | User preferences, context |
| **LLM Integration** | Built-in | OpenRouter API calls |
| **MCP Server** | Built-in | Protocol for Silas dispatch |

### Silas (External)

| Component | Responsibility |
|-----------|----------------|
| **MCP Endpoint** | Receives dispatched work via MCP |
| **Planner** | Creates detailed implementation plans |
| **Task Queue** | Queues and prioritizes work |
| **Executor** | Runs tasks asynchronously |
| **Reporter** | Notifies when complete |

## API Integration Points

### 1. Mobile → Hermes (HTTP)

**Connection Details:**
- Base URL: `http://localhost:8080` (same device)
- Timeout: 30 seconds
- Protocol: HTTP/REST

**Authentication:** None (localhost only)

### 2. Hermes → OpenRouter (HTTPS)

**Connection Details:**
- Base URL: `https://openrouter.ai/api/v1`
- Authentication: Bearer token (`OPENROUTER_API_KEY`)
- Model: Configurable (default: `anthropic/claude-sonnet-4-20250514`)

### 3. Hermes → Silas (MCP)

**Connection Details:**
- Protocol: MCP (Model Context Protocol)
- Connection: TCP/WebSocket
- Tools: `dispatch_task`, `check_task_status`, `list_pending_tasks`

## Data Flow Diagrams

### Complete Voice Session Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE SESSION FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. "Hey Google, talk to Xander"                                             │
│       │                                                                      │
│       ▼                                                                      │
│  2. Google Assistant launches app                                            │
│       │                                                                      │
│       ▼                                                                      │
│  3. Audio focus requested                                                    │
│     └── Music/podcasts pause                                                 │
│       │                                                                      │
│       ▼                                                                      │
│  4. Session started (xanderApi.startSession())                               │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    CONVERSATION LOOP                                 │    │
│  │                                                                      │    │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │    │
│  │  │  User speaks    │───▶│  STT converts   │───▶│  Text to Hermes │  │    │
│  │  │  (microphone)   │    │  to text        │    │  POST /chat     │  │    │
│  │  └─────────────────┘    └─────────────────┘    └────────┬────────┘  │    │
│  │                                                         │            │    │
│  │                                                         ▼            │    │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │    │
│  │  │  User hears     │◀───│  TTS converts   │◀───│  Hermes         │  │    │
│  │  │  (speaker)      │    │  to speech      │    │  responds       │  │    │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘  │    │
│  │                                                                      │    │
│  │  [Loop continues until "goodbye" or timeout]                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  5. Session ended (xanderApi.endSession())                                   │
│       │                                                                      │
│       ▼                                                                      │
│  6. Audio focus released                                                     │
│     └── Music/podcasts resume                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Machine Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VOICE STATE MACHINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌──────────┐                                    │
│                              │  IDLE    │◀───────────────────────┐           │
│                              └────┬─────┘                        │           │
│                                   │                              │           │
│                                   │ Start session                │           │
│                                   ▼                              │           │
│                              ┌──────────┐                        │           │
│                  ┌──────────▶│ LISTENING│◀─────────┐             │           │
│                  │           └────┬─────┘          │             │           │
│                  │                │                │             │           │
│                  │                │ Speech detected│             │           │
│                  │                ▼                │             │           │
│                  │           ┌──────────┐          │             │           │
│                  │           │ THINKING │          │             │           │
│                  │           └────┬─────┘          │             │           │
│                  │                │                │             │           │
│                  │                │ Response ready │             │           │
│                  │                ▼                │             │           │
│                  │           ┌──────────┐          │             │           │
│                  └───────────│ SPEAKING │──────────┘             │           │
│                  (TTS done)  └────┬─────┘                        │           │
│                                   │                              │           │
│                                   │ "Goodbye" or timeout         │           │
│                                   ▼                              │           │
│                              ┌──────────┐                        │           │
│                              │  ENDING  │────────────────────────┘           │
│                              └──────────┘  (cleanup complete)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Basic Conversation

```typescript
import { xanderApi } from '@/api/xanderApi';

// Start session
await xanderApi.startSession();

// Send message
const response = await xanderApi.sendMessage("Hey Xander, how are you?");
console.log(response.message); // "Hey! I'm doing great..."

// Check for dispatch suggestion
if (response.metadata?.suggestDispatch) {
  console.log("Dispatch suggested:", response.metadata.dispatchSummary);
}

// End session
await xanderApi.endSession();
```

### Handling Dispatch

```typescript
// After receiving a dispatch suggestion
const dispatchResult = await xanderApi.dispatch({
  sessionId: xanderApi.getSessionId()!,
  summary: "Research best coffee grinders under $200",
  details: "Find and compare coffee grinders with reviews..."
});

console.log(`Task dispatched: ${dispatchResult.taskId}`);
```

### Health Check

```typescript
const isHealthy = await xanderApi.healthCheck();
if (!isHealthy) {
  console.error("Hermes is not running. Please start it in Termux.");
}
```

## Related Components

- **[Hermes README](./README.md)** - Overview and features
- **[Configuration Reference](./configuration.md)** - Detailed config.yaml documentation
- **[Setup Guide](./setup.md)** - Termux installation instructions
- **[Testing Guide](./testing.md)** - Integration testing documentation
- **[Mobile App](../mobile/README.md)** - React Native voice UI
- **[Mobile Architecture](../mobile/architecture.md)** - Mobile app technical details
- **[Project Plan](../../plans/xander-voice-app-plan.md)** - Implementation roadmap

---

*Part of the [Autoxan Documentation](../README.md)*
