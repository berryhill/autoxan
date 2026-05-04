# Hermes Configuration Reference

## Purpose

This document provides a detailed reference for the Hermes Agent configuration used in the Autoxan project. The configuration file (`config.yaml`) controls all aspects of how Hermes/Xander behaves.

## Configuration File Location

- **Repository**: `/hermes/config.yaml`
- **Device**: `~/.hermes/config.yaml` (copied during setup)

## Configuration Sections

### Model Configuration

```yaml
# Model Configuration
model: anthropic/claude-sonnet-4-20250514
```

| Setting | Description | Default |
|---------|-------------|---------|
| `model` | OpenRouter model identifier | `anthropic/claude-sonnet-4-20250514` |

**Model Selection Tips:**
- Use `anthropic/claude-sonnet-4-20250514` for best quality
- Use `anthropic/claude-3-haiku-20240307` for faster, cheaper responses
- See [OpenRouter Models](https://openrouter.ai/models) for all options

### Response Settings

```yaml
tool_output:
  max_bytes: 8192
  max_lines: 100
```

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| `max_bytes` | Maximum bytes for tool output | 8192 | Keeps responses focused |
| `max_lines` | Maximum lines for tool output | 100 | Improves readability |

### Memory Configuration

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
  memory_char_limit: 2200
  user_char_limit: 1375
```

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| `memory_enabled` | Enable persistent memory | `true` | Remembers across sessions |
| `user_profile_enabled` | Enable user profile storage | `true` | Stores user preferences |
| `memory_char_limit` | Character limit for memory | 2200 | ~800 tokens |
| `user_char_limit` | Character limit for user profile | 1375 | ~500 tokens |

**Memory Usage:**
- Memory stores learned information about the user
- User profile stores explicit preferences (name, work context)
- Lower limits keep voice context manageable

### Terminal Configuration

```yaml
terminal:
  backend: local
  timeout: 60
```

| Setting | Description | Default |
|---------|-------------|---------|
| `backend` | Terminal backend type | `local` |
| `timeout` | Command timeout (seconds) | 60 |

### Context Compression

```yaml
compression:
  enabled: true
  threshold: 0.50
  target_ratio: 0.20
  protect_last_n: 10
```

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| `enabled` | Enable context compression | `true` | Essential for long conversations |
| `threshold` | Compress at X% of context limit | 0.50 | Triggers at 50% full |
| `target_ratio` | Keep X% of threshold as recent tail | 0.20 | Keeps 20% recent context |
| `protect_last_n` | Protect last N messages | 10 | Maintains conversation flow |

**Why Compression Matters for Voice:**
- Voice conversations can be lengthy
- Protects recent context for coherent responses
- Prevents context window overflow

### Agent Settings

```yaml
agent:
  max_turns: 30
  
  personalities:
    voice:
      You are in voice mode. Keep all responses under 3 sentences.
      Be direct and conversational. The user is likely driving.
      Only elaborate if explicitly asked.
```

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| `max_turns` | Maximum conversation turns | 30 | Lower for voice (faster resolution) |
| `personalities` | Custom personality presets | - | Can switch with `/personality` |

**Personality Presets:**
- `voice` - Extra concise for driving
- Switch with `/personality voice` command

### MCP Servers Configuration

```yaml
mcp_servers:
  # Silas dispatch server
  # silas:
  #   url: "http://workstation-ip:3000"
  #   tools:
  #     include: [dispatch_task, check_task_status, list_pending_tasks]
  #     prompts: false
  #     resources: false
```

| Setting | Description | Notes |
|---------|-------------|-------|
| `url` | MCP server endpoint | Replace with actual Silas IP |
| `tools.include` | Allowed tools | Whitelist specific tools |
| `prompts` | Enable MCP prompts | Usually `false` for dispatch |
| `resources` | Enable MCP resources | Usually `false` for dispatch |

**Enabling Silas Dispatch:**

1. Uncomment the `silas` section
2. Replace `workstation-ip:3000` with actual IP
3. Ensure Silas MCP server is running

```yaml
mcp_servers:
  silas:
    url: "http://192.168.1.100:3000"
    tools:
      include: [dispatch_task, check_task_status, list_pending_tasks]
```

### File Read Safety

```yaml
file_read_max_chars: 30000
```

| Setting | Description | Default | Notes |
|---------|-------------|---------|-------|
| `file_read_max_chars` | Max characters when reading files | 30000 | ~10K tokens |

### Disabled Toolsets

```yaml
# agent:
#   disabled_toolsets:
#     - browser
```

| Setting | Description | Notes |
|---------|-------------|-------|
| `disabled_toolsets` | Tools to disable | Uncomment to disable unused tools |

**When to Disable Tools:**
- `browser` - If not doing web research
- Reduces context usage and response time

## SOUL.md Personality File

The `SOUL.md` file defines Xander's personality and system prompt.

### Location

- **Repository**: `/hermes/SOUL.md`
- **Device**: `~/.hermes/SOUL.md`

### Structure

```markdown
# Xander - Conversational AI Companion

You are Xander, a conversational AI companion...

## Your Personality
- Natural and conversational
- Think WITH the user, not FOR them
- Concise for TTS output

## Your Capabilities
- Natural conversation
- Light research
- Dispatch suggestions

## When to Suggest Dispatch
[DISPATCH_SUGGESTED]
Summary: <one-line summary>
Details: <detailed description>
[/DISPATCH_SUGGESTED]

## Response Guidelines
- 1-3 sentences for simple exchanges
- Natural language with contractions

## What to Avoid
- Over-explaining
- Robotic language
- Long TTS-unfriendly responses
```

### Key Personality Elements

| Element | Purpose |
|---------|---------|
| **Conciseness** | Short responses for voice/TTS |
| **Natural Language** | Contractions, casual tone |
| **Active Listening** | Follow-up questions |
| **Dispatch Awareness** | Knows when to suggest Silas |

## Environment Variables

Create `~/.hermes/.env` with API keys:

```bash
# Required: LLM Provider
OPENROUTER_API_KEY=sk-or-your-key-here

# Alternative: Direct Anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional: GitHub integration
# GITHUB_TOKEN=ghp_your-token-here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes* | OpenRouter API key |
| `ANTHROPIC_API_KEY` | Yes* | Direct Anthropic API key |
| `GITHUB_TOKEN` | No | For GitHub MCP integration |

*One of `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` is required.

## Voice-Optimized Settings Summary

The configuration is specifically tuned for voice interactions:

| Setting | Value | Voice Benefit |
|---------|-------|---------------|
| `max_turns` | 30 | Faster resolution |
| `compression.protect_last_n` | 10 | Maintains recent context |
| `file_read_max_chars` | 30000 | Smaller context |
| `memory.memory_char_limit` | 2200 | Focused memory |
| `agent.personalities.voice` | Custom | Extra concise mode |

## Related Documentation

- **[Hermes Overview](./README.md)** - Introduction to Hermes in Autoxan
- **[Setup Guide](./setup.md)** - Installation and deployment
- **[hermes/README.md](../../hermes/README.md)** - Quick start with test cases

---

*Part of the [Autoxan Documentation](../README.md)*
