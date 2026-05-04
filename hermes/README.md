# Hermes Configuration for Xander

This directory contains the Hermes Agent configuration files for the Xander voice assistant personality.

## Overview

Xander is a conversational AI companion optimized for voice interaction, especially while driving. The configuration enables:

- **Natural conversation** - Warm, concise responses suitable for TTS
- **Memory persistence** - Remembers user preferences across sessions
- **Dispatch to Silas** - Can suggest sending tasks to the workstation agent
- **Voice-optimized settings** - Short responses, compressed context

## Files

| File | Purpose |
|------|---------|
| `SOUL.md` | Xander's personality and identity (system prompt) |
| `config.yaml` | Hermes configuration (model, memory, MCP, etc.) |
| `.gitkeep` | Ensures directory is tracked in git |

## Installation in Termux

### Prerequisites

1. **Termux** installed on your Android device
2. **Python 3.11+** installed in Termux
3. **OpenRouter API key** (or other LLM provider)

### Step 1: Install Hermes Agent

```bash
# Update packages
pkg update && pkg upgrade

# Install Python and dependencies
pkg install python python-pip git

# Install Hermes Agent
pip install hermes-agent

# OR install from source for latest features
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### Step 2: Set Up Configuration

```bash
# Create Hermes home directory if it doesn't exist
mkdir -p ~/.hermes

# Copy configuration files from this repo
# (Assuming you've cloned the autoxan repo)
cp hermes/SOUL.md ~/.hermes/SOUL.md
cp hermes/config.yaml ~/.hermes/config.yaml
```

### Step 3: Configure API Keys

Create `~/.hermes/.env` with your API keys:

```bash
# Create .env file
cat > ~/.hermes/.env << 'EOF'
# OpenRouter API key (recommended for flexibility)
OPENROUTER_API_KEY=sk-or-your-key-here

# OR use Anthropic directly
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional: GitHub token for code search
# GITHUB_TOKEN=ghp_your-token-here
EOF
```

### Step 4: Verify Installation

```bash
# Check Hermes is installed
hermes --version

# Verify configuration
hermes config check

# Start a test conversation
hermes chat "Hey Xander, how are you?"
```

## Configuration Details

### Voice-Optimized Settings

The configuration is tuned for voice interactions:

| Setting | Value | Reason |
|---------|-------|--------|
| `max_turns` | 30 | Faster resolution for voice |
| `compression.protect_last_n` | 10 | Maintain recent conversation flow |
| `file_read_max_chars` | 30000 | Smaller context for voice sessions |
| `memory.memory_enabled` | true | Remember user preferences |

### Personality (SOUL.md)

The SOUL.md file defines Xander's personality:

- **Concise** - 1-3 sentence responses for simple exchanges
- **Natural** - Uses contractions, casual language
- **Thoughtful** - Asks follow-up questions, thinks with the user
- **Dispatch-aware** - Knows when to suggest sending work to Silas

### MCP Configuration for Silas Dispatch

To enable dispatch to Silas workstation agent, uncomment and configure the `mcp_servers.silas` section in `config.yaml`:

```yaml
mcp_servers:
  silas:
    url: "http://YOUR_WORKSTATION_IP:3000"
    tools:
      include: [dispatch_task, check_task_status, list_pending_tasks]
```

## Test Cases

Use these scenarios to verify the configuration is working correctly:

### Test 1: Basic Greeting

```bash
hermes chat "Hey Xander, how are you?"
```

**Expected behavior:**
- Warm, brief response (1-2 sentences)
- Natural, conversational tone
- No unnecessary elaboration

**Example response:**
> "Hey! I'm doing great, thanks for asking. What's on your mind?"

### Test 2: Thinking Partner (No Dispatch)

```bash
hermes chat "I'm thinking about refactoring my API"
```

**Expected behavior:**
- Curious follow-up question
- Does NOT jump to solutions
- Engages as a thinking partner

**Example response:**
> "Nice! What's driving the refactor - is it a performance thing, or more about the code structure?"

### Test 3: Dispatch Detection

```bash
hermes chat "Can you create a Python script to process CSV files?"
```

**Expected behavior:**
- Acknowledges the concrete task
- Includes `[DISPATCH_SUGGESTED]` block
- Provides brief conversational response

**Example response:**
> "That sounds like a good task for Silas to handle - it'll need some details about the CSV structure and what processing you need.
>
> [DISPATCH_SUGGESTED]
> Summary: Create Python CSV processing script
> Details: Build a Python script to process CSV files. Need to clarify: input file format, required transformations, and output format.
> [/DISPATCH_SUGGESTED]"

### Test 4: Session Ending

```bash
hermes chat "Thanks, I'll talk to you later"
```

**Expected behavior:**
- Warm farewell
- Brief response

**Example response:**
> "Sounds good, catch you later! 👋"

### Test 5: Memory Persistence

```bash
# First session
hermes chat "My name is Alex and I work on mobile apps"

# Later session (or after /new)
hermes chat "What kind of work do I do?"
```

**Expected behavior:**
- Hermes remembers the user's name and work
- References stored information naturally

## Troubleshooting

### "Command not found: hermes"

Ensure Hermes is in your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc
```

### "API key not found"

Check that `.env` exists and has the correct key:

```bash
cat ~/.hermes/.env
hermes config check
```

### "MCP server failed to connect"

1. Verify the Silas server is running
2. Check the IP/port in `config.yaml`
3. Test connectivity: `curl http://YOUR_IP:3000/health`

### Long responses not suitable for voice

Switch to voice personality mode:

```bash
/personality voice
```

Or update SOUL.md to be more concise.

## Architecture Reference

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

## Related Documentation

- [Hermes Architecture Overhaul Plan](../plans/hermes-architecture-overhaul.md)
- [Xander Voice App Plan](../plans/xander-voice-app-plan.md)
- [Hermes Agent Official Docs](https://hermes-agent.nousresearch.com/)
