# Hermes Integration Testing

## Purpose

This guide documents the testing approach for the Hermes Agent integration with the React Native mobile app. It covers automated unit tests, integration tests against a real Hermes instance, and manual testing procedures.

> **Note:** For comprehensive End-to-End testing of the complete voice app flow (including gestures, audio focus, and error handling), see the [Mobile E2E Testing Guide](../mobile/e2e-testing.md).

## Test Architecture

The testing strategy employs a dual-mode approach:

```
┌─────────────────────────────────────┐
│         Test Suite                   │
│  ┌───────────────────────────────┐  │
│  │ Unit Test Mode (Default)      │  │
│  │ - Mocked axios responses      │  │
│  │ - Runs in CI/CD               │  │
│  │ - No network required         │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Integration Test Mode         │  │
│  │ - Real Hermes instance        │  │
│  │ - Requires HERMES_INTEGRATION │  │
│  │ - Full end-to-end validation  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Test File Location

The integration tests are located at:

```
mobile/src/api/__tests__/hermesIntegration.test.ts
```

This file contains 1033 lines of comprehensive test coverage.

## Running Tests

### Unit Tests (Default)

Run unit tests with mocked responses - suitable for CI/CD:

```bash
cd mobile

# Run all tests
pnpm test

# Run only Hermes integration tests
pnpm test hermesIntegration

# Run with coverage
pnpm test --coverage hermesIntegration
```

### Integration Tests (Real Hermes)

To run tests against a real Hermes instance:

```bash
# 1. Start Hermes Agent in Termux
hermes serve --port 8080

# 2. Verify Hermes is running
curl http://localhost:8080/health

# 3. Run integration tests
HERMES_INTEGRATION_TEST=true pnpm test hermesIntegration
```

**Note:** Integration tests have a 60-second timeout to accommodate LLM response times.

## Test Scenarios

The test suite covers six main categories:

### 1. Health Check Tests (4 tests)

Verifies connectivity to the Hermes `/health` endpoint:

| Test | Description |
|------|-------------|
| Healthy response | Returns `true` when Hermes is running |
| Connection refused | Returns `false` when Hermes is not running |
| Timeout handling | Gracefully handles timeout errors |
| Network unreachable | Handles network connectivity issues |

### 2. Basic Conversation Flow Tests (5 tests)

Tests the core conversation lifecycle:

| Test | Description |
|------|-------------|
| Session creation | Starts session and returns valid session ID |
| Message sending | Sends message and receives response |
| Voice-friendly responses | Responses are < 500 characters |
| Session ending | Properly ends session and clears state |
| Auto-start session | Creates session automatically when needed |

### 3. Xander Personality Tests (4 tests)

Verifies Xander's voice-optimized personality:

| Test | Description |
|------|-------------|
| No AI disclaimers | Responses don't contain "As an AI..." phrases |
| Concise responses | < 50 words suitable for TTS |
| Warm and conversational | Natural, friendly tone |
| Follow-up questions | Asks clarifying questions |

### 4. Dispatch Detection Tests (5 tests)

Tests parsing of `[DISPATCH_SUGGESTED]` blocks:

| Test | Description |
|------|-------------|
| Detect dispatch | Identifies dispatch blocks in responses |
| Extract summary | Parses the Summary field correctly |
| Extract details | Parses multi-line Details field |
| Remove from display | Strips dispatch blocks from UI message |
| No false positives | Doesn't flag simple questions |

### 5. Memory Persistence Tests (5 tests)

Validates conversation context retention:

| Test | Description |
|------|-------------|
| Remember context | Recalls earlier conversation topics |
| Accumulate history | Builds conversation history correctly |
| Send full history | Includes all messages in requests |
| Clear on new session | Resets history when starting new session |
| Manual clear | Clears history without ending session |

### 6. Error Handling Tests (12 tests)

Comprehensive error scenario coverage:

**Connection Errors:**
- Hermes not running
- Local session fallback when server unavailable

**Message Sending Errors:**
- Empty message validation
- Whitespace-only message validation
- Server error propagation
- Timeout during message send
- Invalid response format handling

**Session Management Errors:**
- End session when no session exists
- Clear state on server error
- Local session fallback for getSession

**Dispatch Errors:**
- Dispatch failure handling
- No session dispatch handling
- Error recovery for dispatchToSilas

## Mock Response Fixtures

The unit tests use predefined mock responses:

```typescript
const mockResponses = {
  healthCheck: {
    status: 'healthy',
    agent: 'hermes',
    version: '0.12.0',
    model: 'anthropic/claude-3-sonnet',
  },
  
  basicGreeting: {
    // OpenRouter-compatible chat completion format
    choices: [{
      message: {
        role: 'assistant',
        content: "Hey! I'm doing great, thanks for asking.",
      },
    }],
  },
  
  dispatchSuggestion: {
    // Response with [DISPATCH_SUGGESTED] block
    choices: [{
      message: {
        content: `That's a great idea!
        
[DISPATCH_SUGGESTED]
Summary: Create Python script to process CSV files
Details: Build a Python script that...
[/DISPATCH_SUGGESTED]`,
      },
    }],
  },
};
```

## Adding New Tests

### 1. Add Mock Response

Add a new fixture to `mockResponses`:

```typescript
const mockResponses = {
  // ... existing responses
  
  newFeature: {
    id: 'chat-completion-new',
    object: 'chat.completion',
    created: Date.now(),
    model: 'anthropic/claude-3-sonnet',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: 'Expected response content',
      },
      finish_reason: 'stop',
    }],
  },
};
```

### 2. Write Unit Test

```typescript
describe('New Feature Tests', () => {
  beforeEach(async () => {
    // Setup session
    mockInstance.post.mockResolvedValueOnce({
      data: mockResponses.session,
    });
    await api.startSession();
  });

  it('should handle new feature correctly', async () => {
    mockInstance.post.mockResolvedValueOnce({
      data: mockResponses.newFeature,
    });

    const response = await api.sendMessage('Test message');

    expect(response.message).toBe('Expected response content');
  });
});
```

### 3. Add Integration Test (Optional)

For features that need real Hermes validation:

```typescript
describe.skip('Real Hermes - New Feature', () => {
  // Only runs with HERMES_INTEGRATION_TEST=true
  
  it('should work with real Hermes', async () => {
    const response = await api.sendMessage('Real test message');
    expect(response.message).toBeTruthy();
  }, INTEGRATION_TIMEOUT);
});
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_INTEGRATION_TEST` | `false` | Set to `true` for real Hermes tests |

## Test Timeouts

| Test Type | Timeout | Reason |
|-----------|---------|--------|
| Unit tests | 5 seconds | Fast mocked responses |
| Integration tests | 60 seconds | LLM response latency |

---

# Manual Integration Test Checklist

Use this checklist for comprehensive manual testing of the Hermes integration.

## Environment Setup

- [ ] Termux running on Android device
- [ ] Hermes Agent started: `hermes serve --mcp --port 8080`
- [ ] React Native app built and running
- [ ] Network connectivity verified

## Voice Flow Tests

- [ ] Press voice button → starts listening
- [ ] Speak message → transcribed correctly
- [ ] Message sent to Hermes → response received
- [ ] Response spoken via TTS
- [ ] Return to listening state

## Conversation Quality Tests

- [ ] Responses are natural and conversational
- [ ] Responses are concise (< 30 seconds TTS)
- [ ] Follow-up questions are relevant
- [ ] Context is maintained across turns

## Dispatch Flow Tests

- [ ] Request a coding task
- [ ] Dispatch suggestion appears
- [ ] Confirm dispatch
- [ ] Task received by Silas (if running)

## Error Recovery Tests

- [ ] Stop Hermes → graceful error message
- [ ] Restart Hermes → reconnection works
- [ ] Network timeout → appropriate handling

## Performance Tests

- [ ] Response latency < 3 seconds
- [ ] No UI freezing during API calls
- [ ] Memory usage stable

## Results

| Field | Value |
|-------|-------|
| Date | ___________ |
| Tester | ___________ |
| Device | ___________ |
| Hermes Version | ___________ |
| Overall | [ ] PASS  [ ] FAIL |
| Notes | ___________ |

---

## Continuous Integration

### CI/CD Pipeline Configuration

Unit tests run automatically in CI without database or network dependencies:

```yaml
# Example GitHub Actions workflow
- name: Run Hermes Integration Unit Tests
  run: |
    cd mobile
    pnpm install
    pnpm test hermesIntegration
```

**Note:** Integration tests (`HERMES_INTEGRATION_TEST=true`) should only run in environments with a real Hermes instance.

## Related Documentation

- **[Hermes Overview](./README.md)** - Architecture and API reference
- **[Setup Guide](./setup.md)** - Installation instructions
- **[Configuration](./configuration.md)** - Hermes config.yaml reference
- **[Mobile App Overview](../mobile/README.md)** - Voice app documentation
- **[Mobile Architecture](../mobile/architecture.md)** - Mobile app structure
- **[Mobile E2E Testing](../mobile/e2e-testing.md)** - Comprehensive E2E test suite (164+ tests)

---

*Part of the [Autoxan Documentation](../README.md)*
