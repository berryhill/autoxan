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

### Server Configuration

```yaml
# Server Configuration
server:
  port: 8080
  host: "127.0.0.1"
```

| Setting | Description | Default |
|---------|-------------|---------|
| `port` | Port number for Hermes HTTP server | `8080` |
| `host` | Host address to bind to | `127.0.0.1` |

**Server Configuration Notes:**
- Default port 8080 is used by the mobile app
- Use `127.0.0.1` for local-only access (recommended for mobile integration)
- Can be overridden with `hermes serve --port <port>` command

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

The Silas MCP integration is now enabled by default with environment variable configuration:

```yaml
mcp_servers:
  # Silas dispatch server for task execution on workstation
  silas:
    # Environment variable for workstation URL (configure in .env)
    url: "${SILAS_MCP_URL}"
    tools:
      include:
        - dispatch_task
        - task_status
        - list_tasks
        - cancel_task
        - queue_stats
      prompts: false
      resources: false
```

| Setting | Description | Notes |
|---------|-------------|-------|
| `url` | MCP server endpoint | Uses `SILAS_MCP_URL` env var |
| `tools.include` | Allowed tools | Whitelist of Silas tools |
| `prompts` | Enable MCP prompts | `false` for dispatch-only usage |
| `resources` | Enable MCP resources | `false` for dispatch-only usage |

**Available Silas Tools:**

| Tool | Description |
|------|-------------|
| `dispatch_task` | Create and queue a new task |
| `task_status` | Check status of a specific task |
| `list_tasks` | List all tasks (optionally filtered by status) |
| `cancel_task` | Cancel a pending task |
| `queue_stats` | Get queue statistics |

**Configuring Silas URL:**

Set the `SILAS_MCP_URL` environment variable in `~/.hermes/.env`:

```bash
# Local network example
SILAS_MCP_URL=http://192.168.1.100:3000

# Tailscale example (recommended for remote access)
SILAS_MCP_URL=http://100.x.x.x:3000
```

See [Silas Workstation Setup](../silas-workstation/setup.md#network-configuration) for network configuration details.

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

Create `~/.hermes/.env` with API keys and configuration. You can copy the template from the repository:

```bash
cp ~/autoxan/hermes/.env.example ~/.hermes/.env
```

Then edit with your actual values:

```bash
# Required: LLM Provider (choose one)
OPENROUTER_API_KEY=sk-or-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Silas Workstation MCP Server
# Replace with your workstation's actual IP address
# Local network: http://192.168.1.100:3000
# Tailscale: http://100.x.x.x:3000
SILAS_MCP_URL=http://192.168.1.100:3000

# Optional: GitHub integration
# GITHUB_TOKEN=ghp_your-token-here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes* | OpenRouter API key |
| `ANTHROPIC_API_KEY` | Yes* | Direct Anthropic API key |
| `SILAS_MCP_URL` | Yes** | Silas workstation URL (e.g., `http://192.168.1.100:3000`) |
| `GITHUB_TOKEN` | No | For GitHub MCP integration |

*One of `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY` is required.

**Required if using Silas dispatch. See [Network Configuration](../silas-workstation/setup.md#network-configuration) for setup instructions.

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
