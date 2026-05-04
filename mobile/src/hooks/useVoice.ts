/**
 * useVoice - Speech-to-Text (STT) hook
 *
 * This hook wraps expo-speech-recognition to provide a simple interface
 * for voice recognition in the Xander Voice App.
 *
 * Features (to be implemented in Phase 2):
 * - Start/stop voice recognition
 * - Handle recognition results
 * - Error handling for microphone/permission issues
 * - State management for listening/processing states
 *
 * Usage:
 * const { isListening, transcript, startListening, stopListening, error } = useVoice();
 */

import { useState, useCallback } from 'react';

// Types for voice recognition state
export interface VoiceState {
  isListening: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
}

export interface UseVoiceResult extends VoiceState {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  resetTranscript: () => void;
}

/**
 * Custom hook for speech-to-text functionality
 * Placeholder implementation - will be completed in Phase 2
 */
export function useVoice(): UseVoiceResult {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    transcript: '',
    partialTranscript: '',
    error: null,
  });

  const startListening = useCallback(async () => {
    // TODO: Implement with expo-speech-recognition in Phase 2
    // - Request permissions
    // - Start speech recognition
    // - Handle events (onStart, onResult, onError, onEnd)
    console.log('[useVoice] startListening - placeholder');
    setState((prev) => ({ ...prev, isListening: true, error: null }));
  }, []);

  const stopListening = useCallback(async () => {
    // TODO: Implement with expo-speech-recognition in Phase 2
    // - Stop speech recognition
    // - Process final results
    console.log('[useVoice] stopListening - placeholder');
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      partialTranscript: '',
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useVoice;
