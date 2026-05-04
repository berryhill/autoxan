# Hermes Agent in Autoxan

## Purpose

Hermes Agent serves as the AI backend for Xander, the conversational voice assistant in the Autoxan project. It replaces the legacy `xander-engine` custom implementation with a feature-rich, production-ready AI agent framework.

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
- **[Mobile App](../mobile/README.md)** - React Native voice UI
- **[Architecture Overhaul Plan](../../plans/hermes-architecture-overhaul.md)** - Migration context

## Quick Links

- [Hermes Agent Official Docs](https://hermes-agent.nousresearch.com/)
- [OpenRouter](https://openrouter.ai/) - LLM provider
- [MCP Protocol](https://modelcontextprotocol.io/) - Model Context Protocol

---

*Part of the [Autoxan Documentation](../README.md)*
