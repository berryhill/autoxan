# End-to-End Testing Guide

## Purpose

This guide documents the comprehensive End-to-End (E2E) testing suite for the Xander Voice App. The E2E tests validate complete user flows including conversation, dispatch, gesture controls, audio focus management, and error handling.

## Test Architecture

The E2E testing strategy employs a dual-mode approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                      E2E Test Suite                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Unit Test Mode (Default)                      ││
│  │  - Mocked axios responses                                    ││
│  │  - Runs in CI/CD (no network required)                       ││
│  │  - 189 tests covering all scenarios                          ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Integration Test Mode                           ││
│  │  - Real Hermes instance                                      ││
│  │  - Requires HERMES_INTEGRATION_TEST=true                     ││
│  │  - Full end-to-end validation with LLM                       ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Test File Structure

```
mobile/tests/e2e/
├── setup.ts              # Test environment setup and mock fixtures
├── conversation.test.ts  # Basic conversation and research flow tests (21 tests)
├── dispatch.test.ts      # Dispatch to silas-workstation tests (19 tests)
├── gestures.test.ts      # All 5 gesture control tests (40 tests)
├── audioFocus.test.ts    # Audio focus management tests (28 tests)
├── errors.test.ts        # Error scenario tests (47 tests)
├── mcpDispatch.test.ts   # MCP dispatch integration tests (20 tests)
└── run-e2e.sh            # Automated test runner script
```

### Test Results Summary

| Test Suite | Tests | Skipped | Total |
|------------|-------|---------|-------|
| Conversation Flow | 21 | 3 | 24 |
| Dispatch Flow | 19 | 2 | 21 |
| Gesture Controls | 40 | 0 | 40 |
| Audio Focus | 28 | 6 | 34 |
| Error Scenarios | 47 | 0 | 47 |
| MCP Dispatch | 20 | 3 | 23 |
| **Total** | **175** | **14** | **189** |

## Running E2E Tests

### Quick Start

```bash
# Navigate to mobile directory
cd mobile

# Run all E2E tests (mocked mode - default)
pnpm test tests/e2e

# Run specific test file
pnpm test tests/e2e/conversation.test.ts

# Run with coverage
pnpm test tests/e2e --coverage
```

### Using the Test Runner Script

The project includes an automated test runner script:

```bash
# Make it executable (if needed)
chmod +x mobile/tests/e2e/run-e2e.sh

# Run all E2E tests (mocked)
./run-e2e.sh

# Run with real Hermes (integration mode)
./run-e2e.sh --integration

# Run with coverage
./run-e2e.sh --coverage

# Run in watch mode
./run-e2e.sh --watch

# Run specific test file
./run-e2e.sh conversation
./run-e2e.sh dispatch
./run-e2e.sh gestures
./run-e2e.sh audioFocus
./run-e2e.sh errors
./run-e2e.sh mcpDispatch

# Combined options
./run-e2e.sh -i dispatch    # Integration test dispatch only
./run-e2e.sh -c -v          # Coverage with verbose output
```

### Integration Test Mode

To run tests against a real Hermes instance:

```bash
# 1. Start Hermes Agent in Termux
hermes gateway start

# 2. Verify Hermes is running
curl http://localhost:8080/health

# 3. Run integration tests
HERMES_INTEGRATION_TEST=true pnpm test tests/e2e

# Or use the test runner script
./run-e2e.sh --integration
```

**Note:** Integration tests have a 60-second timeout to accommodate LLM response times.

## Test Categories

### 1. Conversation Flow Tests (21 tests)

Located in `conversation.test.ts`, these tests cover:

#### Session Lifecycle

| Test | Description |
|------|-------------|
| Start session | Creates session and returns valid session ID |
| End session | Properly ends session and clears state |
| Multiple sessions | Handles sequential sessions correctly |
| Local session fallback | Creates local session when server unavailable |

#### Message Exchange

| Test | Description |
|------|-------------|
| Send and receive | Sends message and receives response |
| Multi-turn conversation | Completes multiple conversation turns |
| Auto-start session | Creates session automatically when needed |
| Empty message rejection | Rejects empty or whitespace-only messages |
| Whitespace trimming | Trims whitespace from messages |

#### Voice-Friendly Responses

| Test | Description |
|------|-------------|
| Response length | Responses are < 500 characters for voice |
| Concise responses | < 50 words suitable for TTS |
| No AI disclaimers | Responses don't contain "As an AI..." phrases |

#### Conversation History

| Test | Description |
|------|-------------|
| Accumulate history | Builds conversation history correctly |
| Send full history | Includes all messages in requests |
| Clear on new session | Resets history when starting new session |
| Manual clear | Clears history without ending session |

### 2. Dispatch Flow Tests (19 tests)

Located in `dispatch.test.ts`, these tests cover:

#### Dispatch Detection

| Test | Description |
|------|-------------|
| Detect dispatch | Identifies `[DISPATCH_SUGGESTED]` blocks |
| Extract summary | Parses the Summary field correctly |
| Extract details | Parses multi-line Details field |
| Remove from display | Strips dispatch blocks from UI message |
| No false positives | Doesn't flag simple questions |

#### Dispatch Block Parsing

| Test | Description |
|------|-------------|
| Standard format | Parses standard dispatch block format |
| Complex details | Handles multi-line and complex details |
| No block present | Returns `suggested=false` when no block |
| Case insensitivity | Handles lowercase block markers |
| Multiple blocks | Handles multiple dispatch blocks |

#### Dispatch Execution

| Test | Description |
|------|-------------|
| Dispatch success | Dispatches task successfully |
| Session ID included | Includes session ID in dispatch request |
| Summary and details | Includes summary and details in dispatch message |
| Unique task IDs | Generates unique task IDs |
| Full dispatch flow | Request → suggestion → confirm → queued |

### 3. Gesture Control Tests (40 tests)

Located in `gestures.test.ts`, these tests cover all 5 gestures:

#### Gesture Configuration

| Gesture | Icon | Description |
|---------|------|-------------|
| Interrupt | 🤚 | Stop TTS, return to listening |
| Steer | 🎯 | Let me clarify - guide the conversation |
| Queue | 📋 | Save this for later - dispatch to silas-workstation |
| Stop | ⏹️ | End session gracefully |
| Repeat | 🔄 | Say that again - replay last response |

#### State-Based Availability

| State | Interrupt | Steer | Queue | Stop | Repeat |
|-------|-----------|-------|-------|------|--------|
| `idle` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `connecting` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `listening` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `processing` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `speaking` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `error` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `ended` | ❌ | ❌ | ❌ | ❌ | ❌ |

#### Gesture Handler Tests

**Interrupt (🤚)**
- Stops TTS when speaking
- Transitions to listening after interrupt
- Starts listening after interrupt
- Triggers haptic feedback (50ms)

**Steer (🎯)**
- Stops speaking if currently speaking
- Adds steering message to conversation
- Prompts for clarification
- Transitions to listening

**Queue (📋)**
- Dispatches current context to silas
- Includes user and assistant messages in dispatch
- Tracks dispatched work in store
- Speaks confirmation on success
- Handles empty conversation
- Handles dispatch failure

**Stop (⏹️)**
- Stops TTS
- Stops listening
- Says goodbye
- Ends API session
- Ends local session

**Repeat (🔄)**
- Replays last assistant message
- Stops current speech before replaying
- Transitions to speaking then back to listening
- Handles no previous message
- Finds last assistant message in history

#### Haptic Feedback Tests

- Vibrates for all gesture actions (50ms duration)
- Uses correct haptic duration

#### Rapid Gesture Prevention

- Ignores rapid consecutive gestures

### 4. Audio Focus Tests (28 tests)

Located in `audioFocus.test.ts`, these tests cover:

#### Hook Functionality

| Test | Description |
|------|-------------|
| Return methods | Returns `requestFocus`, `abandonFocus`, `checkFocus` |
| Accept callbacks | Accepts `onFocusGained`, `onFocusLost`, `onDuck` |

#### Request Focus

| Test | Description |
|------|-------------|
| Request success | Requests audio focus successfully |
| Request failure | Handles focus request failure |
| Request error | Handles focus request error gracefully |

#### Abandon Focus

| Test | Description |
|------|-------------|
| Abandon success | Abandons audio focus successfully |
| Abandon error | Handles abandon error gracefully |

#### Check Focus

| Test | Description |
|------|-------------|
| Has focus | Returns `true` when has focus |
| No focus | Returns `false` when no focus |
| Check error | Handles check error gracefully |

#### Audio Focus Events

| Event | Test |
|-------|------|
| `audioFocusGained` | Calls `onFocusGained` callback |
| `audioFocusLost` (permanent) | Calls `onFocusLost(true)` |
| `audioFocusLost` (temporary) | Calls `onFocusLost(false)` |
| `audioFocusDuck` | Calls `onDuck` callback |

#### Music App Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Music playing → App opens | Music pauses (request focus) |
| Session ends | Music resumes (abandon focus) |
| Temporary focus loss | Handle gracefully, regain focus |
| Permanent focus loss | Handle gracefully |

### 5. Error Scenario Tests (47 tests)

Located in `errors.test.ts`, these tests cover:

#### Connection Errors

| Test | Description |
|------|-------------|
| Connection refused | Returns `false` for health check |
| Local session fallback | Creates local session when server unavailable |
| Meaningful error message | Provides user-friendly error message |
| Timeout handling | Handles timeout gracefully |
| Network unreachable | Handles network unreachable |
| DNS resolution failure | Handles DNS lookup failure |

#### Server Errors

| Test | Description |
|------|-------------|
| 400 Bad Request | Handles bad request response |
| 500 Server Error | Handles server error response |
| 503 Service Unavailable | Handles service unavailable response |
| Empty choices array | Handles invalid response format |
| Missing message | Handles missing message in choice |
| Null response data | Handles null response |

#### Message Validation

| Test | Description |
|------|-------------|
| Empty message | Rejects empty message |
| Whitespace only | Rejects whitespace-only message |
| Newlines only | Rejects newline-only message |
| Tabs only | Rejects tab-only message |

#### Session Management Errors

| Test | Description |
|------|-------------|
| End non-existent session | Handles ending non-existent session |
| Clear on server error | Clears local state on server error |
| Get null session | Returns null when no session exists |
| Local session fallback | Returns local session when server fails |

#### Dispatch Errors

| Test | Description |
|------|-------------|
| Dispatch failure | Handles dispatch failure |
| Server error during dispatch | Handles server error during dispatch |
| Timeout during dispatch | Handles timeout during dispatch |
| No session dispatch | Returns false when no session exists |
| Network error dispatch | Returns false on network error |

#### Error Recovery

| Test | Description |
|------|-------------|
| Retry after transient failure | Succeeds on retry |
| Recover session | Recovers session after connection failure |
| Preserve conversation | Preserves conversation after transient error |
| Local session fallback | Continues with local session |
| silas-workstation unavailable | Allows conversation to continue |

### 6. MCP Dispatch Tests (20 tests)

Located in `mcpDispatch.test.ts`, these tests cover MCP (Model Context Protocol) tool integration with the silas-workstation:

#### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| `dispatch_task` | 4 | Test dispatching tasks via MCP tool |
| `task_status` | 4 | Test retrieving task status by ID |
| `list_tasks` | 6 | Test listing tasks with filters |
| Error Handling | 6 | Test graceful error handling |

#### dispatch_task MCP Tool (4 tests)

| Test | Description |
|------|-------------|
| Successfully dispatches task | Calls MCP tool and returns task ID |
| Validates required parameters | Ensures description and priority are provided |
| Handles optional parameters | Tests session_id and metadata fields |
| Returns structured response | Validates response contains task_id and status |

#### task_status MCP Tool (4 tests)

| Test | Description |
|------|-------------|
| Retrieves task status | Gets status by task ID |
| Returns complete task info | Includes status, result, created_at, etc. |
| Handles non-existent task | Returns appropriate error for unknown ID |
| Tracks status transitions | Verifies pending → running → completed flow |

#### list_tasks MCP Tool (6 tests)

| Test | Description |
|------|-------------|
| Lists all tasks | Returns all tasks without filters |
| Filters by status | Filters tasks by pending, running, completed, failed |
| Filters by session | Returns tasks for specific session_id |
| Supports pagination | Handles limit and offset parameters |
| Combines filters | Applies multiple filter criteria |
| Returns empty list | Handles case with no matching tasks |

#### MCP Error Handling (6 tests)

| Test | Description |
|------|-------------|
| Invalid tool name | Returns error for unknown MCP tool |
| Missing required params | Returns error when required fields missing |
| Connection failure | Handles silas-workstation unavailable |
| Timeout handling | Handles request timeout gracefully |
| Malformed response | Handles invalid JSON response |
| Server error | Handles 5xx server errors |

#### Real Integration Tests (3 skipped)

These tests require `HERMES_INTEGRATION_TEST=true` and a running silas-workstation:

| Test | Description |
|------|-------------|
| Full dispatch flow | Creates task, checks status, verifies completion |
| Task lifecycle | Tests complete pending → running → completed flow |
| Error recovery | Tests retry behavior on transient failures |

To run MCP integration tests:

```bash
HERMES_INTEGRATION_TEST=true ./run-e2e.sh mcpDispatch
```

## Mock Response Fixtures

The unit tests use predefined mock responses in `setup.ts`:

```typescript
const mockResponses = {
  healthCheck: {
    status: 'healthy',
    agent: 'hermes',
    version: '0.12.0',
    model: 'anthropic/claude-3-sonnet',
  },
  
  basicGreeting: {
    choices: [{
      message: {
        role: 'assistant',
        content: "Hey! I'm doing great, thanks for asking.",
      },
    }],
  },
  
  dispatchSuggestion: {
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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HERMES_INTEGRATION_TEST` | `false` | Set to `true` for real Hermes tests |

## Test Timeouts

| Test Type | Timeout | Reason |
|-----------|---------|--------|
| Unit tests | 5 seconds | Fast mocked responses |
| Integration tests | 60 seconds | LLM response latency |

## Response Time Assertions

| Response Type | Target | Description |
|---------------|--------|-------------|
| Simple queries | < 3 seconds | Basic conversation responses |
| Search/research | < 5 seconds | Responses requiring research |
| Dispatch | < 2 seconds | Task dispatch operations |

## Adding New E2E Tests

### 1. Add Mock Response (if needed)

Add a new fixture to `setup.ts`:

```typescript
export const mockResponses = {
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

Create a new test or add to an existing file:

```typescript
describe('New Feature Tests', () => {
  let api: XanderApi;
  let mockInstance: ReturnType<typeof getMockInstance>;

  beforeEach(async () => {
    jest.clearAllMocks();
    api = createTestApi();
    mockInstance = getMockInstance();
    
    setupMockSession(mockInstance);
    await api.startSession();
  });

  it('should handle new feature correctly', async () => {
    setupMockResponse(mockInstance, mockResponses.newFeature);

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

## Continuous Integration

### CI/CD Pipeline Configuration

Unit tests run automatically in CI without database or network dependencies:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    cd mobile
    pnpm install
    pnpm test tests/e2e
```

**Note:** Integration tests (`HERMES_INTEGRATION_TEST=true`) should only run in environments with a real Hermes instance.

---

# Manual E2E Test Checklist

Use this checklist for comprehensive manual testing of the complete voice app flow.

## Environment Setup

- [ ] Termux is running on Android device
- [ ] Xander engine is started (`pnpm start` in xander-engine)
- [ ] silas-workstation is running (if testing dispatch)
- [ ] Music app is playing (for audio focus tests)

## Basic Conversation Tests

- [ ] Open app via "Hey Google, talk to Xander"
- [ ] Verify greeting from Xander
- [ ] Say a simple greeting and verify response
- [ ] Ask a follow-up question
- [ ] Say "goodbye" and verify session ends
- [ ] Verify music resumes after session

## Voice Recognition Tests

- [ ] Speak clearly and verify accurate transcription
- [ ] Speak quickly and verify transcription
- [ ] Speak with background noise
- [ ] Pause mid-sentence and verify handling

## TTS Tests

- [ ] Verify natural-sounding responses
- [ ] Verify appropriate pacing
- [ ] Test with long responses (> 30 seconds)
- [ ] Verify TTS stops on interrupt gesture

## Research Tests

- [ ] Ask "What's the weather today?"
- [ ] Ask "When was the Eiffel Tower built?"
- [ ] Ask a current events question
- [ ] Verify concise, voice-friendly responses

## Dispatch Tests

- [ ] Request a coding task
- [ ] Verify dispatch suggestion
- [ ] Confirm dispatch and verify queue
- [ ] Check task appears on silas-workstation
- [ ] Test dispatch when silas-workstation is offline

## Gesture Control Tests

- [ ] Tap Interrupt while Xander is speaking → stops
- [ ] Tap Steer → prompts for clarification
- [ ] Tap Queue → dispatches current context
- [ ] Tap Stop → ends session
- [ ] Tap Repeat → replays last response
- [ ] Verify haptic feedback on all buttons

## Audio Focus Tests

- [ ] Start with Spotify playing → pauses on app open
- [ ] End session → music resumes
- [ ] Receive phone call during session → handles gracefully
- [ ] Another app requests audio → handles gracefully

## Error Handling Tests

- [ ] Disable network → verify error message
- [ ] Stop Xander engine → verify connection error
- [ ] Send very long message → handles gracefully
- [ ] Rapid gestures → no crashes
- [ ] 30 second timeout → session ends gracefully

## Performance Tests

- [ ] Response time < 3 seconds for simple queries
- [ ] Search response time < 5 seconds
- [ ] No UI jank during state transitions
- [ ] Memory usage stable over 10+ minute session

## Results

| Field | Value |
|-------|-------|
| Date | ___________ |
| Tester | ___________ |
| Device | ___________ |
| Android Version | ___________ |
| Overall | [ ] PASS  [ ] FAIL |
| Notes | ___________ |

---

## Related Documentation

- **[Mobile App Overview](./README.md)** - Main mobile app documentation
- **[Mobile Architecture](./architecture.md)** - Technical architecture
- **[Mobile Setup Guide](./setup.md)** - Installation instructions
- **[Hermes Integration Testing](../hermes/testing.md)** - API integration tests
- **[Hermes Overview](../hermes/README.md)** - AI backend documentation
- **[silas-workstation API](../silas-workstation/api.md)** - Task dispatch API reference

---

*Part of the [Autoxan Documentation](../README.md) | Phase 11: End-to-End Testing*
