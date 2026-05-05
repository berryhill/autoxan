/**
 * useGestures - Gesture control handler hook
 *
 * This hook provides gesture handlers for the 5-button control system
 * that allows users to manage the conversation without speaking.
 *
 * Features:
 * - Handle all 5 gesture actions (interrupt, steer, queue, stop, repeat)
 * - Haptic feedback on gesture activation
 * - Integration with state machine, TTS, STT, and API
 * - State-aware gesture availability
 *
 * Gesture Actions:
 * - Interrupt: Stop TTS and return to listening
 * - Steer: Prompt for clarification
 * - Queue: Dispatch current context to silas-workstation
 * - Stop: End session gracefully
 * - Repeat: Replay last assistant message
 *
 * Usage:
 * const { handleGesture, isGestureEnabled } = useGestures();
 *
 * Phase 10: Gesture Controls (Issue #11)
 */

import { useCallback, useRef } from 'react';
import { Vibration } from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import { useSpeech } from './useSpeech';
import { useVoice } from './useVoice';
import { xanderApi } from '../api/xanderApi';
import { GestureAction } from '../types/gestures';
import { ConversationState } from '../store/types';

/**
 * Result interface for useGestures hook
 */
export interface UseGesturesResult {
  /** Handle a gesture action */
  handleGesture: (action: GestureAction) => Promise<void>;
  /** Check if a gesture is enabled for the current state */
  isGestureEnabled: (action: GestureAction) => boolean;
}

/**
 * Haptic feedback duration in milliseconds
 */
const HAPTIC_DURATION_MS = 50;

/**
 * Custom hook for gesture control handling
 * Provides handlers for all 5 gesture buttons with proper state management
 */
export function useGestures(): UseGesturesResult {
  // Store state and actions
  const sessionState = useSessionStore((s) => s.sessionState);
  const messages = useSessionStore((s) => s.messages);
  const sessionId = useSessionStore((s) => s.sessionId);
  const endSession = useSessionStore((s) => s.endSession);
  const addMessage = useSessionStore((s) => s.addMessage);
  const transitionTo = useSessionStore((s) => s.transitionTo);
  const addDispatchedWork = useSessionStore((s) => s.addDispatchedWork);

  // Speech hooks
  const { stop: stopSpeaking, speak } = useSpeech();
  const { startListening, stopListening } = useVoice();

  // Prevent multiple rapid gesture activations
  const isProcessingRef = useRef(false);

  /**
   * Handle interrupt gesture - stop TTS and return to listening
   */
  const handleInterrupt = useCallback(async (): Promise<void> => {
    console.log('[useGestures] Handling interrupt gesture');

    if (sessionState === 'speaking') {
      await stopSpeaking();
      transitionTo('listening');
      await startListening();
    }
  }, [sessionState, stopSpeaking, transitionTo, startListening]);

  /**
   * Handle steer gesture - prompt for clarification
   */
  const handleSteer = useCallback(async (): Promise<void> => {
    console.log('[useGestures] Handling steer gesture');

    // Stop speaking if currently speaking
    if (sessionState === 'speaking') {
      await stopSpeaking();
    }

    // Add a steering message that indicates the user wants to clarify
    addMessage('user', '[User wants to clarify or redirect]');

    // Transition to listening and start STT
    transitionTo('listening');
    await startListening();

    // Optionally, have Xander prompt for clarification
    // We speak first, then the callback will handle the transition
    await speak('Go ahead, what would you like to clarify?');
  }, [sessionState, stopSpeaking, addMessage, transitionTo, startListening, speak]);

  /**
   * Handle queue gesture - dispatch current context to silas-workstation
   */
  const handleQueue = useCallback(async (): Promise<void> => {
    console.log('[useGestures] Handling queue gesture');

    // Get the last assistant message for context
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (lastAssistantMessage && lastUserMessage) {
      try {
        const result = await xanderApi.dispatch({
          sessionId: sessionId || 'unknown-session',
          summary: `Queued: ${lastUserMessage.content.slice(0, 50)}...`,
          details: `User message: ${lastUserMessage.content}\n\nXander response: ${lastAssistantMessage.content}`,
        });

        if (result.success) {
          // Track dispatched work in store
          addDispatchedWork(lastUserMessage.content.slice(0, 100));
          await speak("Got it, I've queued that for silas-workstation.");
        } else {
          await speak("I couldn't queue that right now.");
        }
      } catch (error) {
        console.error('[useGestures] Queue dispatch error:', error);
        await speak('There was an error queuing the task.');
      }
    } else {
      await speak('Nothing to queue yet.');
    }
  }, [messages, sessionId, addDispatchedWork, speak]);

  /**
   * Handle stop gesture - end session gracefully
   */
  const handleStop = useCallback(async (): Promise<void> => {
    console.log('[useGestures] Handling stop gesture');

    // Stop any ongoing speech
    await stopSpeaking();

    // Stop listening if active
    await stopListening();

    // Say goodbye
    await speak('Goodbye!');

    // End the session on the API
    try {
      await xanderApi.endSession();
    } catch (error) {
      console.warn('[useGestures] Error ending API session:', error);
    }

    // End the local session
    endSession();
  }, [stopSpeaking, stopListening, speak, endSession]);

  /**
   * Handle repeat gesture - replay last assistant message
   */
  const handleRepeat = useCallback(async (): Promise<void> => {
    console.log('[useGestures] Handling repeat gesture');

    // Find the last assistant message
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistantMessage) {
      // Stop current speech if speaking
      if (sessionState === 'speaking') {
        await stopSpeaking();
      }

      // Transition to speaking and play the last message
      transitionTo('speaking');
      await speak(lastAssistantMessage.content);

      // After speaking, return to listening
      transitionTo('listening');
      await startListening();
    } else {
      await speak("I haven't said anything yet.");
    }
  }, [messages, sessionState, stopSpeaking, transitionTo, speak, startListening]);

  /**
   * Main gesture handler - dispatches to appropriate handler based on action
   */
  const handleGesture = useCallback(
    async (action: GestureAction): Promise<void> => {
      // Prevent multiple rapid activations
      if (isProcessingRef.current) {
        console.log('[useGestures] Ignoring gesture - already processing');
        return;
      }

      isProcessingRef.current = true;

      try {
        // Haptic feedback
        Vibration.vibrate(HAPTIC_DURATION_MS);

        console.log(`[useGestures] Gesture activated: ${action}`);

        switch (action) {
          case 'interrupt':
            await handleInterrupt();
            break;
          case 'steer':
            await handleSteer();
            break;
          case 'queue':
            await handleQueue();
            break;
          case 'stop':
            await handleStop();
            break;
          case 'repeat':
            await handleRepeat();
            break;
          default:
            console.warn(`[useGestures] Unknown gesture action: ${action}`);
        }
      } catch (error) {
        console.error(`[useGestures] Error handling gesture ${action}:`, error);
      } finally {
        isProcessingRef.current = false;
      }
    },
    [handleInterrupt, handleSteer, handleQueue, handleStop, handleRepeat]
  );

  /**
   * Check if a gesture is enabled for the current state
   */
  const isGestureEnabled = useCallback(
    (action: GestureAction): boolean => {
      // Define which states allow each gesture
      const activeStates: ConversationState[] = [
        'listening',
        'processing',
        'speaking',
      ];

      const isSessionActive = activeStates.includes(sessionState);

      switch (action) {
        case 'interrupt':
          // Interrupt only makes sense when Xander is speaking
          return sessionState === 'speaking';

        case 'steer':
          // Steer is available when session is active
          return isSessionActive;

        case 'queue':
          // Queue is available when session is active
          return isSessionActive;

        case 'stop':
          // Stop is available when session is active
          return isSessionActive;

        case 'repeat':
          // Repeat is available when session is active
          return isSessionActive;

        default:
          return false;
      }
    },
    [sessionState]
  );

  return {
    handleGesture,
    isGestureEnabled,
  };
}

export default useGestures;
