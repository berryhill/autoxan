# Silas Workstation Setup Guide

## Prerequisites

Before setting up Silas Workstation, ensure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | ≥20.0.0 | JavaScript runtime |
| **npm** | ≥10.0.0 | Package manager (comes with Node.js) |
| **TypeScript** | ~5.9.2 | Type checking (installed as dev dependency) |

### Checking Prerequisites

```bash
# Check Node.js version
node --version
# Expected output: v20.x.x or higher

# Check npm version
npm --version
# Expected output: 10.x.x or higher
```

## Installation

### Step 1: Navigate to silas-workstation

```bash
cd silas-workstation
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- **Production dependencies**: @modelcontextprotocol/sdk, uuid, zod
- **Development dependencies**: TypeScript, Vitest, ESLint

### Step 3: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Running the Server

### Production Mode

```bash
npm start
```

This runs the compiled JavaScript from `dist/index.js`.

### Development Mode

```bash
npm run dev
```

This runs with `tsx` in watch mode, automatically recompiling on changes.

## Verifying the Installation

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Expected output:
```
 ✓ src/types/task.test.ts (18 tests)
 ✓ src/services/taskQueue.test.ts (60 tests)
 ✓ src/mcp/server.test.ts (36 tests)

 Test Files  3 passed (3)
      Tests  114 passed (114)
```

### Type Checking

```bash
npm run type-check
```

This runs TypeScript in `--noEmit` mode to verify types without building.

### Linting

```bash
npm run lint
```

## Configuration

### Task Queue Configuration

The task queue can be configured programmatically:

```typescript
import { TaskQueue } from './services/taskQueue.js';

const queue = new TaskQueue({
  // Maximum concurrent tasks (default: 1)
  maxConcurrent: 1,
  
  // How long to keep completed tasks (default: 1 hour)
  taskRetentionMs: 60 * 60 * 1000,
  
  // Cleanup check interval (default: 5 minutes)
  cleanupIntervalMs: 5 * 60 * 1000,
  
  // Auto-start executor (default: true)
  autoStart: true,
});
```

### Environment Variables

Currently, Silas Workstation does not require environment variables. All configuration is done programmatically.

Future versions may support:
- `SILAS_PORT` - Custom port for network-based MCP
- `SILAS_LOG_LEVEL` - Logging verbosity
- `SILAS_MAX_CONCURRENT` - Maximum concurrent tasks

## MCP Integration

### Connecting to Xander (Hermes)

Silas Workstation provides an HTTP-based MCP server. To connect from Hermes:

1. **Configure Hermes MCP** in `~/.hermes/config.yaml` (already enabled by default):

```yaml
mcp_servers:
  silas:
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

2. **Set the SILAS_MCP_URL** in `~/.hermes/.env`:

```bash
SILAS_MCP_URL=http://192.168.1.100:3000
```

3. **Test the connection** by sending a task from Xander.

### Testing MCP Tools Manually

You can test the MCP server manually using the MCP CLI or by sending JSON-RPC messages.

Example dispatch_task request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "dispatch_task",
    "arguments": {
      "type": "research",
      "description": "Research the best coffee grinders under $200",
      "priority": "normal"
    }
  }
}
```

## Network Configuration

To enable Hermes (running on your phone) to communicate with Silas Workstation, you need to configure network connectivity.

### Finding Your Workstation IP Address

**Linux:**
```bash
# Using ip command
ip addr show | grep "inet "

# Or using hostname
hostname -I
```

**macOS:**
```bash
# Show network interfaces
ifconfig | grep "inet "

# Or use system preferences
networksetup -getinfo Wi-Fi
```

**Windows:**
```powershell
# Using PowerShell
Get-NetIPAddress -AddressFamily IPv4 | Select IPAddress
```

Look for an IP address like `192.168.1.x` or `10.0.0.x` for local network.

### Local Network Setup

For phone and workstation on the **same network** (home WiFi):

1. **Find workstation IP** using commands above
2. **Configure firewall** to allow port 3000:

   **Linux (ufw):**
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw reload
   ```

   **Linux (firewalld):**
   ```bash
   sudo firewall-cmd --add-port=3000/tcp --permanent
   sudo firewall-cmd --reload
   ```

   **macOS:**
   ```bash
   # Open System Preferences > Security & Privacy > Firewall
   # Add exception for port 3000 or disable during development
   ```

3. **Set SILAS_MCP_URL** in `~/.hermes/.env`:
   ```bash
   SILAS_MCP_URL=http://192.168.1.100:3000
   ```

4. **Verify connectivity** from phone terminal (Termux):
   ```bash
   curl http://192.168.1.100:3000/health
   ```

### Tailscale Setup (Recommended for Remote Access)

[Tailscale](https://tailscale.com/) provides secure, zero-config networking. This is the recommended approach for:
- Remote access from outside your home network
- Avoiding firewall/port forwarding complexity
- Secure encrypted connection

**Step 1: Install Tailscale on Workstation**

**Linux:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**macOS:**
```bash
brew install --cask tailscale
# Or download from https://tailscale.com/download
```

**Step 2: Install Tailscale on Android**

1. Install Tailscale from Google Play Store
2. Sign in with same account as workstation
3. Enable VPN when prompted

**Step 3: Get Tailscale IP**

On your workstation:
```bash
tailscale ip -4
# Example output: 100.64.123.45
```

Or check the Tailscale admin console at [login.tailscale.com](https://login.tailscale.com).

**Step 4: Configure Hermes**

Update `~/.hermes/.env` with Tailscale IP:
```bash
SILAS_MCP_URL=http://100.64.123.45:3000
```

**Step 5: Verify Connection**

From phone (with Tailscale connected):
```bash
curl http://100.64.123.45:3000/health
```

### Verifying Connectivity

Test the connection from your phone (Termux):

```bash
# Test basic connectivity
ping -c 3 <WORKSTATION_IP>

# Test HTTP endpoint
curl -v http://<WORKSTATION_IP>:3000/health

# Test MCP tool (if server is running)
curl -X POST http://<WORKSTATION_IP>:3000 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Expected responses:**
- Ping: 3 successful replies
- Health check: `{"status":"ok"}` or similar
- Tools list: JSON-RPC response with available tools

### Common Network Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Firewall blocking | Open port 3000 |
| No route to host | Different networks | Use Tailscale |
| Timeout | IP address wrong | Verify workstation IP |
| Name resolution fail | Using hostname instead of IP | Use IP address directly |

## Project Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `npm run build` | Compile TypeScript to JavaScript |
| `start` | `npm start` | Run the compiled MCP server |
| `dev` | `npm run dev` | Run in watch mode with tsx |
| `test` | `npm test` | Run all tests once |
| `test:watch` | `npm run test:watch` | Run tests in watch mode |
| `test:coverage` | `npm run test:coverage` | Run tests with coverage report |
| `lint` | `npm run lint` | Run ESLint |
| `type-check` | `npm run type-check` | Check TypeScript types |

## Directory Structure After Build

```
silas-workstation/
├── dist/                     # Compiled JavaScript (after build)
│   ├── index.js
│   ├── mcp/
│   │   ├── index.js
│   │   └── server.js
│   ├── services/
│   │   ├── index.js
│   │   └── taskQueue.js
│   └── types/
│       ├── index.js
│       └── task.js
├── src/                      # TypeScript source
│   ├── index.ts
│   ├── mcp/
│   ├── services/
│   └── types/
├── node_modules/             # Dependencies
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" Errors

**Problem**: Module resolution fails after build.

**Solution**: Ensure you're using ES modules correctly:
- Check `"type": "module"` is in `package.json`
- Use `.js` extensions in imports (TypeScript compiles to JS)

```typescript
// Correct
import { TaskQueue } from './services/taskQueue.js';

// Incorrect
import { TaskQueue } from './services/taskQueue';
```

#### 2. Node.js Version Error

**Problem**: `npm install` fails with engine compatibility errors.

**Solution**: Update Node.js to version 20 or higher:
```bash
# Using nvm
nvm install 20
nvm use 20
```

#### 3. TypeScript Errors

**Problem**: Type errors during build.

**Solution**: Run type check to see specific issues:
```bash
npm run type-check
```

#### 4. Tests Failing

**Problem**: Tests fail on fresh checkout.

**Solution**: Ensure dependencies are installed:
```bash
rm -rf node_modules
npm install
npm test
```

### Debug Mode

For verbose logging during development:

```typescript
// In your code
const queue = new TaskQueue({ autoStart: false });

// Subscribe to events for debugging
queue.on('task:added', (task) => {
  console.log('Task added:', task);
});

queue.on('task:started', (task) => {
  console.log('Task started:', task);
});

queue.on('task:completed', (task) => {
  console.log('Task completed:', task);
});

queue.on('task:failed', (task, error) => {
  console.error('Task failed:', task, error);
});

queue.start();
```

## Next Steps

After setup:

1. **Read the [API Reference](./api.md)** to understand MCP tools
2. **Review the [Architecture](./architecture.md)** for technical details
3. **Configure Hermes** to connect to Silas via MCP
4. **Test end-to-end** with Xander dispatching tasks

## Related Documentation

- **[README](./README.md)** - Overview and key features
- **[Architecture](./architecture.md)** - Technical architecture
- **[API Reference](./api.md)** - MCP tool documentation
- **[Hermes Setup](../hermes/setup.md)** - Setting up Xander backend

---

*Part of the [Autoxan Documentation](../README.md)*
