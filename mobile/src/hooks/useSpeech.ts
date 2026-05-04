/**
 * useSpeech - Text-to-Speech (TTS) hook
 *
 * This hook wraps expo-speech to provide a simple interface
 * for text-to-speech functionality in the Xander Voice App.
 *
 * Features (to be implemented in Phase 2):
 * - Speak text with configurable options
 * - Stop/pause/resume speech
 * - Track speaking state
 * - Queue management for multiple utterances
 *
 * Usage:
 * const { isSpeaking, speak, stop, pause, resume } = useSpeech();
 */

import { useState, useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';

// Types for speech options
export interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

export interface SpeechState {
  isSpeaking: boolean;
  isPaused: boolean;
  error: string | null;
}

export interface UseSpeechResult extends SpeechState {
  speak: (text: string, options?: SpeechOptions) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  getAvailableVoices: () => Promise<Speech.Voice[]>;
}

/**
 * Custom hook for text-to-speech functionality
 */
export function useSpeech(): UseSpeechResult {
  const [state, setState] = useState<SpeechState>({
    isSpeaking: false,
    isPaused: false,
    error: null,
  });

  // Track if we should be speaking (for cleanup)
  const shouldSpeakRef = useRef(false);

  const speak = useCallback(async (text: string, options?: SpeechOptions) => {
    try {
      // Stop any current speech
      await Speech.stop();

      setState((prev) => ({
        ...prev,
        isSpeaking: true,
        isPaused: false,
        error: null,
      }));
      shouldSpeakRef.current = true;

      Speech.speak(text, {
        language: options?.language ?? 'en-US',
        pitch: options?.pitch ?? 1.0,
        rate: options?.rate ?? 1.0,
        volume: options?.volume ?? 1.0,
        voice: options?.voice,
        onStart: () => {
          setState((prev) => ({ ...prev, isSpeaking: true }));
          options?.onStart?.();
        },
        onDone: () => {
          shouldSpeakRef.current = false;
          setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
          options?.onDone?.();
        },
        onStopped: () => {
          shouldSpeakRef.current = false;
          setState((prev) => ({ ...prev, isSpeaking: false, isPaused: false }));
          options?.onStopped?.();
        },
        onError: (error) => {
          shouldSpeakRef.current = false;
          setState((prev) => ({
            ...prev,
            isSpeaking: false,
            isPaused: false,
            error: error.message || 'Speech error occurred',
          }));
          options?.onError?.(error);
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown speech error';
      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        error: errorMessage,
      }));
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      shouldSpeakRef.current = false;
      await Speech.stop();
      setState((prev) => ({
        ...prev,
        isSpeaking: false,
        isPaused: false,
      }));
    } catch (error) {
      console.error('[useSpeech] Error stopping speech:', error);
    }
  }, []);

  const pause = useCallback(async () => {
    // Note: pause is only available on iOS
    try {
      await Speech.pause();
      setState((prev) => ({ ...prev, isPaused: true }));
    } catch (error) {
      console.error('[useSpeech] Error pausing speech:', error);
    }
  }, []);

  const resume = useCallback(async () => {
    // Note: resume is only available on iOS
    try {
      await Speech.resume();
      setState((prev) => ({ ...prev, isPaused: false }));
    } catch (error) {
      console.error('[useSpeech] Error resuming speech:', error);
    }
  }, []);

  const getAvailableVoices = useCallback(async (): Promise<Speech.Voice[]> => {
    try {
      return await Speech.getAvailableVoicesAsync();
    } catch (error) {
      console.error('[useSpeech] Error getting available voices:', error);
      return [];
    }
  }, []);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    getAvailableVoices,
  };
}

export default useSpeech;
