/**
 * useVoice - Speech-to-Text (STT) hook
 *
 * This hook wraps expo-speech-recognition to provide a simple interface
 * for voice recognition in the Xander Voice App.
 *
 * Features:
 * - Start/stop voice recognition
 * - Handle recognition results (final and partial)
 * - Microphone permission handling
 * - Error handling for microphone/permission issues
 * - State management for listening/processing states
 *
 * Usage:
 * const { isListening, transcript, startListening, stopListening, error } = useVoice();
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

// Types for voice recognition state
export interface VoiceState {
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
}

// Configuration options for voice recognition
export interface VoiceOptions {
  /** Language code for recognition (default: 'en-US') */
  lang?: string;
  /** Whether to return partial results (default: true) */
  interimResults?: boolean;
  /** Continuous recognition mode (default: false) */
  continuous?: boolean;
  /** Add punctuation to results (default: false) */
  addsPunctuation?: boolean;
  /** Require on-device recognition (default: false) */
  requiresOnDeviceRecognition?: boolean;
}

export interface UseVoiceResult extends VoiceState {
  /** Start listening for speech */
  startListening: (options?: VoiceOptions) => Promise<void>;
  /** Stop listening and get final result */
  stopListening: () => Promise<void>;
  /** Abort listening without final result */
  abortListening: () => Promise<void>;
  /** Clear the transcript */
  resetTranscript: () => void;
  /** Check if speech recognition is available */
  isAvailable: () => Promise<boolean>;
  /** Request microphone and speech recognition permissions */
  requestPermissions: () => Promise<boolean>;
}

// Map error codes to user-friendly messages
const ERROR_MESSAGES: Record<ExpoSpeechRecognitionErrorCode, string> = {
  'aborted': 'Speech recognition was cancelled',
  'audio-capture': 'Failed to capture audio. Please check your microphone.',
  'bad-grammar': 'Grammar error in speech recognition configuration',
  'language-not-supported': 'The selected language is not supported',
  'network': 'Network error. Please check your internet connection.',
  'no-speech': 'No speech detected. Please try again.',
  'not-allowed': 'Microphone permission denied. Please enable microphone access.',
  'service-not-allowed': 'Speech recognition service is not available',
  'busy': 'Speech recognition is busy. Please wait and try again.',
  'client': 'Client error occurred during speech recognition',
  'speech-timeout': 'Speech input timed out. Please try speaking again.',
  'interrupted': 'Speech recognition was interrupted',
  'unknown': 'An unknown error occurred',
};

/**
 * Custom hook for speech-to-text functionality
 * Uses expo-speech-recognition for cross-platform speech recognition
 */
export function useVoice(): UseVoiceResult {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    partialTranscript: '',
    error: null,
  });

  // Track if the hook is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Set up cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Cleanup: stop any ongoing recognition when unmounting
      ExpoSpeechRecognitionModule.abort().catch(() => {
        // Ignore errors during cleanup
      });
    };
  }, []);

  // Handle speech recognition start event
  useSpeechRecognitionEvent('start', () => {
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
      }));
    }
  });

  // Handle speech recognition end event
  useSpeechRecognitionEvent('end', () => {
    if (isMountedRef.current) {
      setState((prev) => ({
        ...prev,
        isListening: false,
        // Clear partial transcript when recognition ends
        partialTranscript: '',
      }));
    }
  });

  // Handle speech recognition results
  useSpeechRecognitionEvent('result', (event) => {
    if (!isMountedRef.current) return;

    // Get the best transcript from results
    const result = event.results[0];
    if (!result) return;

    const transcriptText = result.transcript || '';

    if (event.isFinal) {
      // Final result - update the main transcript
      setState((prev) => ({
        ...prev,
        transcript: prev.transcript
          ? `${prev.transcript} ${transcriptText}`.trim()
          : transcriptText,
        partialTranscript: '',
      }));
    } else {
      // Interim result - update partial transcript only
      setState((prev) => ({
        ...prev,
        partialTranscript: transcriptText,
      }));
    }
  });

  // Handle speech recognition errors
  useSpeechRecognitionEvent('error', (event) => {
    if (!isMountedRef.current) return;

    const errorCode = event.error as ExpoSpeechRecognitionErrorCode;
    const errorMessage = ERROR_MESSAGES[errorCode] || event.message || 'Speech recognition error';

    // Don't treat 'aborted' as an error if user intentionally stopped
    if (errorCode === 'aborted') {
      setState((prev) => ({
        ...prev,
        isListening: false,
        partialTranscript: '',
      }));
      return;
    }

    console.error('[useVoice] Error:', errorCode, event.message);

    setState((prev) => ({
      ...prev,
      isListening: false,
      error: errorMessage,
      partialTranscript: '',
    }));
  });

  /**
   * Request necessary permissions for speech recognition
   * @returns true if all permissions were granted
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      console.error('[useVoice] Permission request error:', error);
      return false;
    }
  }, []);

  /**
   * Check if speech recognition is available on this device
   */
  const isAvailable = useCallback(async (): Promise<boolean> => {
    try {
      return await ExpoSpeechRecognitionModule.isRecognitionAvailable();
    } catch (error) {
      console.error('[useVoice] Availability check error:', error);
      return false;
    }
  }, []);

  /**
   * Start listening for speech
   * @param options - Configuration options for speech recognition
   */
  const startListening = useCallback(async (options?: VoiceOptions) => {
    try {
      // Clear previous error
      setState((prev) => ({ ...prev, error: null }));

      // Check if already listening
      const currentState = await ExpoSpeechRecognitionModule.getStateAsync();
      if (currentState === 'recognizing' || currentState === 'starting') {
        console.log('[useVoice] Already listening, skipping start');
        return;
      }

      // Request permissions
      const permissionResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permissionResult.granted) {
        setState((prev) => ({
          ...prev,
          error: 'Microphone permission denied. Please enable microphone access in settings.',
        }));
        return;
      }

      // Check if recognition is available
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available) {
        setState((prev) => ({
          ...prev,
          error: 'Speech recognition is not available on this device.',
        }));
        return;
      }

      // Start speech recognition with options
      ExpoSpeechRecognitionModule.start({
        lang: options?.lang ?? 'en-US',
        interimResults: options?.interimResults ?? true,
        continuous: options?.continuous ?? false,
        addsPunctuation: options?.addsPunctuation ?? false,
        requiresOnDeviceRecognition: options?.requiresOnDeviceRecognition ?? false,
        maxAlternatives: 1,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start speech recognition';
      console.error('[useVoice] Start error:', error);
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Stop listening and process final result
   */
  const stopListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('[useVoice] Stop error:', error);
      // Still update state even if stop fails
      setState((prev) => ({
        ...prev,
        isListening: false,
      }));
    }
  }, []);

  /**
   * Abort listening without processing final result
   */
  const abortListening = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.abort();
    } catch (error) {
      console.error('[useVoice] Abort error:', error);
      // Still update state even if abort fails
      setState((prev) => ({
        ...prev,
        isListening: false,
        partialTranscript: '',
      }));
    }
  }, []);

  /**
   * Reset the transcript to empty
   */
  const resetTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      partialTranscript: '',
      error: null,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    isAvailable,
    requestPermissions,
  };
}

export default useVoice;
