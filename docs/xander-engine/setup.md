# Xander Engine Setup Guide

This guide covers setting up the Xander Conversation Engine for both development and production deployment on Termux.

## Prerequisites

### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| Node.js | 18.0.0+ | JavaScript runtime |
| pnpm (or npm) | 8.0.0+ | Package manager |
| TypeScript | 5.0.0+ | Type checking (dev only) |

### Required Credentials

| Credential | Description | How to Get |
|------------|-------------|------------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API access | [console.anthropic.com](https://console.anthropic.com) |

## Development Setup

### 1. Clone and Install

```bash
# Clone the repository (if not already done)
git clone https://github.com/berryhill/autoxan.git
cd autoxan/xander-engine

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Create a `.env` file or export environment variables:

```bash
# Required: Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# Optional: Custom port (default: 3000)
export PORT=3000
```

### 3. Start Development Server

```bash
# Start with hot reload
pnpm dev
```

You should see:

```
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🤖 Xander Conversation Engine           ║
  ║   Version: 1.0.0                          ║
  ║   Port: 3000                              ║
  ║                                           ║
  ║   Endpoints:                              ║
  ║   • GET  /health                          ║
  ║   • GET  /status                          ║
  ║   • POST /session/start                   ║
  ║   • POST /session/end                     ║
  ║   • GET  /session/:sessionId              ║
  ║   • POST /chat                            ║
  ║   • POST /dispatch                        ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
```

### 4. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","agent":"xander","version":"1.0.0"}
```

## Production Build

### 1. Compile TypeScript

```bash
# Build to dist/ directory
pnpm build
```

### 2. Run Production Server

```bash
# Start compiled server
pnpm start
```

## Termux Deployment

Termux is the target environment for running Xander on Android.

### 1. Install Termux

Download Termux from [F-Droid](https://f-droid.org/en/packages/com.termux/) (recommended) or Google Play Store.

### 2. Install Node.js in Termux

```bash
# Update packages
pkg update && pkg upgrade

# Install Node.js
pkg install nodejs-lts

# Verify installation
node --version  # Should show 18+
npm --version
```

### 3. Install pnpm (Optional but Recommended)

```bash
npm install -g pnpm
```

### 4. Clone and Install

```bash
# Install git if not present
pkg install git

# Clone repository
git clone https://github.com/berryhill/autoxan.git
cd autoxan/xander-engine

# Install dependencies
pnpm install
```

### 5. Configure Environment

```bash
# Set API key (add to ~/.bashrc for persistence)
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx' >> ~/.bashrc
source ~/.bashrc
```

### 6. Build and Run

```bash
# Build for production
pnpm build

# Start server
pnpm start
```

### 7. Running in Background

For persistent operation, use one of these methods:

#### Option A: Using `nohup`

```bash
nohup node dist/server.js > xander.log 2>&1 &
```

#### Option B: Using Termux:Boot (Recommended)

1. Install Termux:Boot from F-Droid
2. Create startup script:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-xander.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
cd /data/data/com.termux/files/home/autoxan/xander-engine
node dist/server.js >> ~/xander.log 2>&1
EOF
chmod +x ~/.termux/boot/start-xander.sh
```

3. Grant Termux:Boot autostart permission

#### Option C: Using PM2

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name xander

# Save process list
pm2 save

# View logs
pm2 logs xander
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic Claude API key |
| `PORT` | No | `3000` | HTTP server port |
| `NODE_ENV` | No | - | Set to `test` to prevent server auto-start |

## Testing

### Run All Tests

```bash
pnpm test
```

### Run Tests with Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

### Expected Output

```
 ✓ src/__tests__/sessionManager.test.ts (25 tests)
 ✓ src/__tests__/llmClient.test.ts (18 tests)
 ✓ src/__tests__/routes/session.test.ts (22 tests)
 ✓ src/__tests__/routes/chat.test.ts (24 tests)
 ✓ src/__tests__/routes/dispatch.test.ts (21 tests)

 Test Files  5 passed (5)
      Tests  110 passed (110)
```

## Troubleshooting

### Common Issues

#### 1. "ANTHROPIC_API_KEY environment variable is required"

```bash
# Ensure the API key is exported
export ANTHROPIC_API_KEY=your-key-here

# Verify it's set
echo $ANTHROPIC_API_KEY
```

#### 2. Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or use different port
export PORT=3001
pnpm dev
```

#### 3. Node Version Too Old

```bash
# Check version
node --version

# In Termux, update Node.js
pkg update
pkg install nodejs-lts
```

#### 4. Permission Denied in Termux

```bash
# Fix file permissions
chmod +x dist/server.js
```

### Verifying Server Health

```bash
# Basic health check
curl -s http://localhost:3000/health | jq .

# Extended status
curl -s http://localhost:3000/status | jq .
```

### Viewing Logs

When running in foreground, logs appear in the terminal. For background processes:

```bash
# nohup logs
tail -f xander.log

# PM2 logs
pm2 logs xander
```

## Network Configuration

### Local Network Access

To allow the mobile app to connect to Xander on the same device or local network:

```bash
# Find your local IP (in Termux)
ifconfig | grep inet

# The mobile app should connect to:
# http://<your-local-ip>:3000
```

### Firewall Configuration

If running on a server with a firewall:

```bash
# Allow port 3000 (example for ufw)
sudo ufw allow 3000/tcp
```

## Next Steps

After setup is complete:

1. **Test the API** - See [API Reference](./api-reference.md)
2. **Configure mobile app** - Set the Xander engine URL in the mobile app
3. **Monitor sessions** - Use `/status` endpoint to check active sessions

---

*Last updated: Phase 6 - Conversation Engine Implementation*
