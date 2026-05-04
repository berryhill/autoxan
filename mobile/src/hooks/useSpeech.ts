/**
 * useSpeech - Text-to-Speech (TTS) hook
 *
 * This hook wraps expo-speech to provide a simple interface
 * for text-to-speech functionality in the Xander Voice App.
 *
 * Features:
 * - Speak text with configurable options (pitch, rate, volume, language)
 * - Stop/pause/resume speech
 * - Track speaking state
 * - Queue management for multiple utterances
 * - Available voices lookup
 * - Platform-aware pause/resume (iOS only)
 *
 * Usage:
 * const { isSpeaking, speak, stop, pause, resume } = useSpeech();
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';

// Types for speech options
export interface SpeechOptions {
  /** Language code (default: 'en-US') */
  language?: string;
  /** Pitch of voice (0.5 - 2.0, default: 1.0) */
  pitch?: number;
  /** Speaking rate (0.1 - 2.0, default: 1.0) */
  rate?: number;
  /** Volume (0.0 - 1.0, default: 1.0) */
  volume?: number;
  /** Voice identifier (use getAvailableVoices to get available voices) */
  voice?: string;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech completes */
  onDone?: () => void;
  /** Callback when speech is stopped */
  onStopped?: () => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when a word boundary is reached */
  onBoundary?: () => void;
}

export interface SpeechState {
  /** Whether TTS is currently speaking */
  isSpeaking: boolean;
  /** Whether speech is paused (iOS only) */
  isPaused: boolean;
  /** Error message if any */
  error: string | null;
  /** Current text being spoken */
  currentText: string | null;
}

export interface UseSpeechResult extends SpeechState {
  /** Speak text with optional settings */
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  /** Stop all speech immediately */
  stop: () => Promise<void>;
  /** Pause speech (iOS only) */
  pause: () => Promise<void>;
  /** Resume paused speech (iOS only) */
  resume: () => Promise<void>;
  /** Get available voices */
  getAvailableVoices: () => Promise<Speech.Voice[]>;
  /** Check if TTS is currently speaking (async check) */
  checkIsSpeaking: () => Promise<boolean>;
  /** Get max speech input length */
  maxSpeechInputLength: number;
}

/**
 * Custom hook for text-to-speech functionality
 * Uses expo-speech for cross-platform TTS
 */
export function useSpeech(): UseSpeechResult {
  const [state, setState] = useState<SpeechState>({
    isSpeaking: false,
    isPaused: false,
    error: null,
    currentText: null,
  });

  // Track if we should be speaking (for cleanup)
  const shouldSpeakRef = useRef(false);
  // Track if the component is mounted
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Stop any ongoing speech when unmounting
      Speech.stop().catch(() => {
        // Ignore errors during cleanup
      });
    };
  }, []);

  /**
   * Safely update state only if mounted
   */
  const safeSetState = useCallback((updater: (prev: SpeechState) => SpeechState) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  /**
   * Speak text with the given options
   * @param text - The text to speak
   * @param options - Speech options
   */
  const speak = useCallback(async (text: string, options?: SpeechOptions) => {
    // Validate text input
    if (!text || text.trim().length === 0) {
      safeSetState((prev) => ({
        ...prev,
        error: 'No text provided to speak',
      }));
      return;
    }

    // Check text length
    if (text.length > Speech.maxSpeechInputLength) {
      safeSetState((prev) => ({
        ...prev,
        error: `Text exceeds maximum length of ${Speech.maxSpeechInputLength} characters`,
      }));
      return;
    }

    try {
      // Stop any current speech
      await Speech.stop();

      safeSetState((prev) => ({
        ...prev,
        isSpeaking: true,
        isPaused: false,
        error: null,
        currentText: text,
      }));
      shouldSpeakRef.current = true;

      Speech.speak(text, {
        language: options?.language ?? 'en-US',
        pitch: clamp(options?.pitch ?? 1.0, 0.5, 2.0),
        rate: clamp(options?.rate ?? 1.0, 0.1, 2.0),
        volume: clamp(options?.volume ?? 1.0, 0.0, 1.0),
        voice: options?.voice,
        onStart: () => {
          safeSetState((prev) => ({ ...prev, isSpeaking: true }));
          options?.onStart?.();
        },
        onDone: () => {
          shouldSpeakRef.current = false;
          safeSetState((prev) => ({
            ...prev,
            isSpeaking: false,
            isPaused: false,
            currentText: null,
          }));
          options?.onDone?.();
        },
        onStopped: () => {
          shouldSpeakRef.current = false;
          safeSetState((prev) => ({
            ...prev,
            isSpeaking: false,
            isPaused: false,
            currentText: null,
          }));
          options?.onStopped?.();
        },
        onError: (error) => {
          shouldSpeakRef.current = false;
          safeSetState((prev) => ({
            ...prev,
            isSpeaking: false,
            isPaused: false,
            currentText: null,
            error: error.message || 'Speech error occurred',
          }));
          options?.onError?.(error);
        },
        // Note: onBoundary is available on native platforms
        onBoundary: options?.onBoundary
          ? () => options.onBoundary?.()
          : undefined,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown speech error';
      safeSetState((prev) => ({
        ...prev,
        isSpeaking: false,
        currentText: null,
        error: errorMessage,
      }));
      options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [safeSetState]);

  /**
   * Stop all speech immediately
   */
  const stop = useCallback(async () => {
    try {
      shouldSpeakRef.current = false;
      await Speech.stop();
      safeSetState((prev) => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentText: null,
      }));
    } catch (error) {
      console.error('[useSpeech] Error stopping speech:', error);
      // Update state even if stop fails
      safeSetState((prev) => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
        currentText: null,
      }));
    }
  }, [safeSetState]);

  /**
   * Pause current speech (iOS only)
   * On Android this is not supported and will be a no-op
   */
  const pause = useCallback(async () => {
    try {
      await Speech.pause();
      safeSetState((prev) => ({ ...prev, isPaused: true }));
    } catch (error) {
      console.error('[useSpeech] Error pausing speech:', error);
      // Pause is not supported on Android, don't treat as error
    }
  }, [safeSetState]);

  /**
   * Resume paused speech (iOS only)
   * On Android this is not supported and will be a no-op
   */
  const resume = useCallback(async () => {
    try {
      await Speech.resume();
      safeSetState((prev) => ({ ...prev, isPaused: false }));
    } catch (error) {
      console.error('[useSpeech] Error resuming speech:', error);
      // Resume is not supported on Android, don't treat as error
    }
  }, [safeSetState]);

  /**
   * Get available voices on this device
   * @returns List of available voices
   */
  const getAvailableVoices = useCallback(async (): Promise<Speech.Voice[]> => {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.error('[useSpeech] Error getting available voices:', error);
      return [];
    }
  }, []);

  /**
   * Async check if currently speaking
   * Useful for checking state before starting new speech
   */
  const checkIsSpeaking = useCallback(async (): Promise<boolean> => {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error('[useSpeech] Error checking speaking state:', error);
      return false;
    }
  }, []);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    getAvailableVoices,
    checkIsSpeaking,
    maxSpeechInputLength: Speech.maxSpeechInputLength,
  };
}

/**
 * Utility to clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default useSpeech;
