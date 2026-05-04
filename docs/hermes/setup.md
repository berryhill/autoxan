# Hermes Setup Guide

## Purpose

This guide covers installing and configuring Hermes Agent for the Xander voice assistant on Android using Termux.

## Prerequisites

Before starting, ensure you have:

1. **Android Device** with Termux installed
2. **OpenRouter API Key** (or Anthropic API key)
3. **Autoxan Repository** cloned (for config files)

### Getting an OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up or log in
3. Navigate to "Keys" in your account
4. Create a new API key
5. Save the key securely

## Installation Steps

### Step 1: Install Termux Dependencies

Open Termux and run:

```bash
# Update package lists
pkg update && pkg upgrade -y

# Install Python and essential tools
pkg install python python-pip git -y

# Verify Python version (need 3.11+)
python --version
```

### Step 2: Install Hermes Agent

**Option A: Install via pip (Recommended)**

```bash
pip install hermes-agent
```

**Option B: Install from source (Latest features)**

```bash
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

### Step 3: Create Hermes Home Directory

```bash
# Create the Hermes configuration directory
mkdir -p ~/.hermes
```

### Step 4: Clone Autoxan Repository

```bash
# Clone the repository (if not already done)
git clone https://github.com/berryhill/autoxan.git ~/autoxan

# Or pull latest if already cloned
cd ~/autoxan && git pull
```

### Step 5: Copy Configuration Files

```bash
# Copy Xander personality
cp ~/autoxan/hermes/SOUL.md ~/.hermes/SOUL.md

# Copy Hermes configuration
cp ~/autoxan/hermes/config.yaml ~/.hermes/config.yaml
```

### Step 6: Configure API Keys

Create the environment file:

```bash
cat > ~/.hermes/.env << 'EOF'
# OpenRouter API key (recommended)
OPENROUTER_API_KEY=sk-or-your-key-here

# OR use Anthropic directly
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional: GitHub token for code search
# GITHUB_TOKEN=ghp_your-token-here
EOF
```

**Important:** Replace `sk-or-your-key-here` with your actual API key.

### Step 7: Verify Installation

```bash
# Check Hermes is installed
hermes --version

# Verify configuration
hermes config check

# Start a test conversation
hermes chat "Hey Xander, how are you?"
```

**Expected Output:**
```
Hey! I'm doing great, thanks for asking. What's on your mind?
```

## Adding Hermes to PATH

If `hermes` command is not found:

```bash
# Add to PATH
export PATH="$HOME/.local/bin:$PATH"

# Make permanent
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Test Cases

Run these tests to verify everything works correctly:

### Test 1: Basic Greeting

```bash
hermes chat "Hey Xander, how are you?"
```

**Expected:** Warm, brief response (1-2 sentences)

### Test 2: Thinking Partner

```bash
hermes chat "I'm thinking about refactoring my API"
```

**Expected:** Curious follow-up question, not solutions

### Test 3: Dispatch Detection

```bash
hermes chat "Can you create a Python script to process CSV files?"
```

**Expected:** Response includes `[DISPATCH_SUGGESTED]` block

### Test 4: Memory Test

```bash
# First conversation
hermes chat "My name is Alex and I work on mobile apps"

# New session (or after /new)
hermes chat "What kind of work do I do?"
```

**Expected:** Remembers name and work context

## Troubleshooting

### "Command not found: hermes"

```bash
# Check if hermes is installed
pip show hermes-agent

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"
```

### "API key not found"

```bash
# Verify .env file exists
cat ~/.hermes/.env

# Check configuration
hermes config check
```

### "Model not available"

```bash
# Verify OpenRouter API key is valid
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Long responses (not suitable for voice)

Switch to voice personality:

```bash
/personality voice
```

Or update SOUL.md to be more concise.

### Memory not persisting

Check memory is enabled in config:

```yaml
memory:
  memory_enabled: true
  user_profile_enabled: true
```

### MCP/Silas connection failed

1. Verify Silas server is running
2. Check IP and port in config.yaml
3. Test connectivity:

```bash
curl http://YOUR_WORKSTATION_IP:3000/health
```

## Running Hermes as a Service

For persistent operation, create a Termux service:

```bash
# Create service script
cat > ~/start-hermes.sh << 'EOF'
#!/bin/bash
cd ~
hermes serve --port 3000
EOF

chmod +x ~/start-hermes.sh
```

Run with:

```bash
./start-hermes.sh
```

## Updating Hermes

### Update via pip

```bash
pip install --upgrade hermes-agent
```

### Update configuration

```bash
# Pull latest Autoxan
cd ~/autoxan && git pull

# Copy updated config files
cp ~/autoxan/hermes/SOUL.md ~/.hermes/SOUL.md
cp ~/autoxan/hermes/config.yaml ~/.hermes/config.yaml
```

## Integration with Mobile App

Once Hermes is running, the React Native mobile app communicates via HTTP:

```
Mobile App (React Native)
    │
    │ HTTP (localhost:3000)
    ▼
Hermes Agent (Termux)
```

See [Mobile App Setup](../mobile/setup.md) for configuring the voice UI.

## Directory Structure

After setup, your Hermes configuration should look like:

```
~/.hermes/
├── config.yaml     # Hermes settings
├── SOUL.md         # Xander personality
├── .env            # API keys (not in git)
└── memory/         # Persistent memory (auto-created)
```

## Related Documentation

- **[Configuration Reference](./configuration.md)** - Detailed config.yaml docs
- **[Hermes Overview](./README.md)** - Architecture and design
- **[hermes/README.md](../../hermes/README.md)** - Quick start with all test cases
- **[Mobile Setup](../mobile/setup.md)** - React Native app setup

---

*Part of the [Autoxan Documentation](../README.md)*
