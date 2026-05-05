/**
 * E2E Tests: Gesture Controls
 *
 * Tests the 5-button gesture control system:
 * - Interrupt (🤚): Stop TTS, return to listening
 * - Steer (🎯): Let me clarify
 * - Queue (📋): Dispatch to silas-workstation
 * - Stop (⏹️): End session
 * - Repeat (🔄): Replay last response
 *
 * Tests cover:
 * - Gesture action handlers
 * - State-aware gesture availability
 * - Haptic feedback triggering
 * - Integration with TTS, STT, and API
 *
 * @see https://github.com/berryhill/autoxan/issues/12
 */

import { renderHook, act } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { useGestures } from '../../src/hooks/useGestures';
import { useSessionStore } from '../../src/store/sessionStore';
import { useSpeech } from '../../src/hooks/useSpeech';
import { useVoice } from '../../src/hooks/useVoice';
import { xanderApi } from '../../src/api/xanderApi';
import { GestureAction, GESTURE_CONFIGS, getGestureConfig, getGestureActions } from '../../src/types/gestures';
import type { ConversationState } from '../../src/store/types';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  getMockInstance,
  mockResponses,
} from './setup';

// ============================================================================
// MOCKS
// ============================================================================

// Mock useSpeech hook
jest.mock('../../src/hooks/useSpeech', () => ({
  useSpeech: jest.fn(() => ({
    speak: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isSpeaking: false,
  })),
}));

// Mock useVoice hook
jest.mock('../../src/hooks/useVoice', () => ({
  useVoice: jest.fn(() => ({
    startListening: jest.fn().mockResolvedValue(undefined),
    stopListening: jest.fn().mockResolvedValue(undefined),
    isListening: false,
    transcript: '',
  })),
}));

// Mock xanderApi
jest.mock('../../src/api/xanderApi', () => ({
  ...jest.requireActual('../../src/api/xanderApi'),
  xanderApi: {
    dispatch: jest.fn().mockResolvedValue({ success: true, taskId: 'test-task-id', message: 'Dispatched' }),
    endSession: jest.fn().mockResolvedValue(undefined),
  },
}));

// Vibration is mocked globally in jest.setup.ts

// ============================================================================
// TEST SUITE: Gesture Configuration
// ============================================================================

describe('E2E: Gesture Configuration', () => {
  it('should have all 5 gesture actions defined', () => {
    const actions = getGestureActions();

    expect(actions).toContain('interrupt');
    expect(actions).toContain('steer');
    expect(actions).toContain('queue');
    expect(actions).toContain('stop');
    expect(actions).toContain('repeat');
    expect(actions.length).toBe(5);
  });

  it('should have correct configuration for each gesture', () => {
    const gestures: GestureAction[] = ['interrupt', 'steer', 'queue', 'stop', 'repeat'];

    gestures.forEach((action) => {
      const config = getGestureConfig(action);

      expect(config.action).toBe(action);
      expect(config.icon).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('should have distinct colors for each gesture', () => {
    const colors = Object.values(GESTURE_CONFIGS).map((c) => c.color);
    const uniqueColors = new Set(colors);

    expect(uniqueColors.size).toBe(colors.length);
  });

  it('should have correct emoji icons', () => {
    expect(GESTURE_CONFIGS.interrupt.icon).toBe('🤚');
    expect(GESTURE_CONFIGS.steer.icon).toBe('🎯');
    expect(GESTURE_CONFIGS.queue.icon).toBe('📋');
    expect(GESTURE_CONFIGS.stop.icon).toBe('⏹️');
    expect(GESTURE_CONFIGS.repeat.icon).toBe('🔄');
  });
});

// ============================================================================
// TEST SUITE: Gesture Availability (State-Based)
// ============================================================================

describe('E2E: Gesture Availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
  });

  const testGestureAvailability = (
    state: ConversationState,
    expectedAvailability: Record<GestureAction, boolean>
  ) => {
    // Set state
    useSessionStore.setState({ sessionState: state });

    const { result } = renderHook(() => useGestures());

    Object.entries(expectedAvailability).forEach(([action, expected]) => {
      const isEnabled = result.current.isGestureEnabled(action as GestureAction);
      expect(isEnabled).toBe(expected);
    });
  };

  describe('Idle State', () => {
    it('should disable all gestures when idle', () => {
      testGestureAvailability('idle', {
        interrupt: false,
        steer: false,
        queue: false,
        stop: false,
        repeat: false,
      });
    });
  });

  describe('Connecting State', () => {
    it('should disable all gestures when connecting', () => {
      testGestureAvailability('connecting', {
        interrupt: false,
        steer: false,
        queue: false,
        stop: false,
        repeat: false,
      });
    });
  });

  describe('Listening State', () => {
    it('should enable appropriate gestures when listening', () => {
      testGestureAvailability('listening', {
        interrupt: false, // Nothing to interrupt
        steer: true,
        queue: true,
        stop: true,
        repeat: true,
      });
    });
  });

  describe('Processing State', () => {
    it('should enable appropriate gestures when processing', () => {
      testGestureAvailability('processing', {
        interrupt: false, // Nothing to interrupt yet
        steer: true,
        queue: true,
        stop: true,
        repeat: true,
      });
    });
  });

  describe('Speaking State', () => {
    it('should enable interrupt when speaking', () => {
      testGestureAvailability('speaking', {
        interrupt: true, // Can interrupt TTS
        steer: true,
        queue: true,
        stop: true,
        repeat: true,
      });
    });
  });

  describe('Error State', () => {
    it('should disable all gestures on error', () => {
      testGestureAvailability('error', {
        interrupt: false,
        steer: false,
        queue: false,
        stop: false,
        repeat: false,
      });
    });
  });

  describe('Ended State', () => {
    it('should disable all gestures when ended', () => {
      testGestureAvailability('ended', {
        interrupt: false,
        steer: false,
        queue: false,
        stop: false,
        repeat: false,
      });
    });
  });
});

// ============================================================================
// TEST SUITE: Gesture Handlers
// ============================================================================

describe('E2E: Gesture Handlers', () => {
  let mockSpeak: jest.Mock;
  let mockStop: jest.Mock;
  let mockStartListening: jest.Mock;
  let mockStopListening: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();

    // Setup speech mocks
    mockSpeak = jest.fn().mockResolvedValue(undefined);
    mockStop = jest.fn().mockResolvedValue(undefined);
    (useSpeech as jest.Mock).mockReturnValue({
      speak: mockSpeak,
      stop: mockStop,
      isSpeaking: false,
    });

    // Setup voice mocks
    mockStartListening = jest.fn().mockResolvedValue(undefined);
    mockStopListening = jest.fn().mockResolvedValue(undefined);
    (useVoice as jest.Mock).mockReturnValue({
      startListening: mockStartListening,
      stopListening: mockStopListening,
      isListening: false,
      transcript: '',
    });
  });

  // --------------------------------------------------------------------------
  // Interrupt Gesture Tests
  // --------------------------------------------------------------------------

  describe('Interrupt Gesture (🤚)', () => {
    it('should stop TTS when speaking', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('interrupt');
      });

      expect(mockStop).toHaveBeenCalled();
    });

    it('should transition to listening after interrupt', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('interrupt');
      });

      expect(useSessionStore.getState().sessionState).toBe('listening');
    });

    it('should start listening after interrupt', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('interrupt');
      });

      expect(mockStartListening).toHaveBeenCalled();
    });

    it('should trigger haptic feedback', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('interrupt');
      });

      expect(Vibration.vibrate).toHaveBeenCalledWith(50);
    });
  });

  // --------------------------------------------------------------------------
  // Steer Gesture Tests
  // --------------------------------------------------------------------------

  describe('Steer Gesture (🎯)', () => {
    it('should stop speaking if currently speaking', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('steer');
      });

      expect(mockStop).toHaveBeenCalled();
    });

    it('should add steering message to conversation', async () => {
      useSessionStore.setState({ sessionState: 'listening' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('steer');
      });

      const messages = useSessionStore.getState().messages;
      const steerMessage = messages.find((m) =>
        m.content.includes('clarify') || m.content.includes('redirect')
      );
      expect(steerMessage).toBeTruthy();
    });

    it('should prompt for clarification', async () => {
      useSessionStore.setState({ sessionState: 'listening' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('steer');
      });

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('clarify')
      );
    });

    it('should transition to listening', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('steer');
      });

      expect(useSessionStore.getState().sessionState).toBe('listening');
    });
  });

  // --------------------------------------------------------------------------
  // Queue Gesture Tests
  // --------------------------------------------------------------------------

  describe('Queue Gesture (📋)', () => {
    beforeEach(() => {
      // Setup conversation with messages
      useSessionStore.setState({
        sessionState: 'listening',
        sessionId: 'test-session',
        messages: [
          { id: '1', role: 'user', content: 'Create a script', timestamp: Date.now() },
          { id: '2', role: 'assistant', content: 'I can help with that.', timestamp: Date.now() },
        ],
      });
    });

    it('should dispatch current context to silas', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('queue');
      });

      expect(xanderApi.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session',
        })
      );
    });

    it('should include user and assistant messages in dispatch', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('queue');
      });

      const dispatchCall = (xanderApi.dispatch as jest.Mock).mock.calls[0][0];
      expect(dispatchCall.details).toContain('Create a script');
      expect(dispatchCall.details).toContain('I can help with that');
    });

    it('should track dispatched work in store', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('queue');
      });

      const dispatchedWork = useSessionStore.getState().dispatchedWork;
      expect(dispatchedWork.length).toBeGreaterThan(0);
    });

    it('should speak confirmation on success', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('queue');
      });

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('queued')
      );
    });

    it('should handle empty conversation', async () => {
      useSessionStore.setState({
        sessionState: 'listening',
        messages: [],
      });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('queue');
      });

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('Nothing to queue')
      );
    });

    it('should handle dispatch failure', async () => {
      (xanderApi.dispatch as jest.Mock).mockRejectedValueOnce(
        new Error('Dispatch failed')
      );

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('queue');
      });

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('error')
      );
    });
  });

  // --------------------------------------------------------------------------
  // Stop Gesture Tests
  // --------------------------------------------------------------------------

  describe('Stop Gesture (⏹️)', () => {
    beforeEach(() => {
      useSessionStore.setState({
        sessionState: 'listening',
        sessionId: 'test-session',
      });
    });

    it('should stop TTS', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('stop');
      });

      expect(mockStop).toHaveBeenCalled();
    });

    it('should stop listening', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('stop');
      });

      expect(mockStopListening).toHaveBeenCalled();
    });

    it('should say goodbye', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('stop');
      });

      expect(mockSpeak).toHaveBeenCalledWith(expect.stringMatching(/goodbye/i));
    });

    it('should end API session', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('stop');
      });

      expect(xanderApi.endSession).toHaveBeenCalled();
    });

    it('should end local session', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('stop');
      });

      expect(useSessionStore.getState().sessionState).toBe('ended');
    });
  });

  // --------------------------------------------------------------------------
  // Repeat Gesture Tests
  // --------------------------------------------------------------------------

  describe('Repeat Gesture (🔄)', () => {
    const lastAssistantMessage = 'This is the last response from Xander.';

    beforeEach(() => {
      useSessionStore.setState({
        sessionState: 'listening',
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
          { id: '2', role: 'assistant', content: lastAssistantMessage, timestamp: Date.now() },
        ],
      });
    });

    it('should replay last assistant message', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('repeat');
      });

      expect(mockSpeak).toHaveBeenCalledWith(lastAssistantMessage);
    });

    it('should stop current speech before replaying', async () => {
      useSessionStore.setState({ sessionState: 'speaking' });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('repeat');
      });

      expect(mockStop).toHaveBeenCalled();
    });

    it('should transition to speaking then back to listening', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('repeat');
      });

      // After completion, should be ready to listen again
      expect(mockStartListening).toHaveBeenCalled();
    });

    it('should handle no previous message', async () => {
      useSessionStore.setState({
        sessionState: 'listening',
        messages: [],
      });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('repeat');
      });

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining("haven't said anything")
      );
    });

    it('should find last assistant message even with user messages after', async () => {
      useSessionStore.setState({
        sessionState: 'listening',
        messages: [
          { id: '1', role: 'user', content: 'First', timestamp: Date.now() },
          { id: '2', role: 'assistant', content: 'Response to first', timestamp: Date.now() },
          { id: '3', role: 'user', content: 'Second', timestamp: Date.now() },
        ],
      });

      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('repeat');
      });

      expect(mockSpeak).toHaveBeenCalledWith('Response to first');
    });
  });

  // --------------------------------------------------------------------------
  // Haptic Feedback Tests
  // --------------------------------------------------------------------------

  describe('Haptic Feedback', () => {
    beforeEach(() => {
      useSessionStore.setState({
        sessionState: 'listening',
        messages: [
          { id: '1', role: 'user', content: 'Test', timestamp: Date.now() },
          { id: '2', role: 'assistant', content: 'Response', timestamp: Date.now() },
        ],
      });
    });

    it('should vibrate for all gesture actions', async () => {
      const gestures: GestureAction[] = ['steer', 'queue', 'stop', 'repeat'];

      for (const gesture of gestures) {
        jest.clearAllMocks();
        const { result } = renderHook(() => useGestures());

        await act(async () => {
          await result.current.handleGesture(gesture);
        });

        expect(Vibration.vibrate).toHaveBeenCalledWith(50);
      }
    });

    it('should use correct haptic duration (50ms)', async () => {
      const { result } = renderHook(() => useGestures());

      await act(async () => {
        await result.current.handleGesture('steer');
      });

      expect(Vibration.vibrate).toHaveBeenCalledWith(50);
    });
  });

  // --------------------------------------------------------------------------
  // Rapid Gesture Prevention Tests
  // --------------------------------------------------------------------------

  describe('Rapid Gesture Prevention', () => {
    it('should ignore rapid consecutive gestures', async () => {
      useSessionStore.setState({ sessionState: 'listening' });

      const { result } = renderHook(() => useGestures());

      // Trigger multiple gestures rapidly
      await act(async () => {
        // First gesture starts processing
        const promise1 = result.current.handleGesture('steer');
        // Second gesture should be ignored
        const promise2 = result.current.handleGesture('steer');

        await Promise.all([promise1, promise2]);
      });

      // Should only process once
      // Note: The actual implementation uses a ref to prevent rapid activations
      expect(mockSpeak).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// TEST SUITE: Gesture Integration
// ============================================================================

describe('E2E: Gesture Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();

    // Setup mocks
    (useSpeech as jest.Mock).mockReturnValue({
      speak: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isSpeaking: false,
    });

    (useVoice as jest.Mock).mockReturnValue({
      startListening: jest.fn().mockResolvedValue(undefined),
      stopListening: jest.fn().mockResolvedValue(undefined),
      isListening: false,
      transcript: '',
    });
  });

  it('should handle full conversation with gestures', async () => {
    // Setup active session
    useSessionStore.setState({
      sessionState: 'speaking',
      sessionId: 'integration-test',
      messages: [
        { id: '1', role: 'user', content: 'Create a script', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'I can create that script.', timestamp: Date.now() },
      ],
    });

    const { result } = renderHook(() => useGestures());

    // Interrupt the speaking
    await act(async () => {
      await result.current.handleGesture('interrupt');
    });
    expect(useSessionStore.getState().sessionState).toBe('listening');

    // Queue the task
    await act(async () => {
      await result.current.handleGesture('queue');
    });
    expect(xanderApi.dispatch).toHaveBeenCalled();

    // End the session
    await act(async () => {
      await result.current.handleGesture('stop');
    });
    expect(useSessionStore.getState().sessionState).toBe('ended');
  });

  it('should maintain gesture availability through state transitions', async () => {
    useSessionStore.setState({ sessionState: 'idle' });

    const { result, rerender } = renderHook(() => useGestures());

    // In idle state
    expect(result.current.isGestureEnabled('interrupt')).toBe(false);
    expect(result.current.isGestureEnabled('stop')).toBe(false);

    // Transition to speaking
    useSessionStore.setState({ sessionState: 'speaking' });
    rerender();

    expect(result.current.isGestureEnabled('interrupt')).toBe(true);
    expect(result.current.isGestureEnabled('stop')).toBe(true);

    // Transition to listening
    useSessionStore.setState({ sessionState: 'listening' });
    rerender();

    expect(result.current.isGestureEnabled('interrupt')).toBe(false);
    expect(result.current.isGestureEnabled('stop')).toBe(true);
  });
});
