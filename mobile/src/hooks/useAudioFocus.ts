/**
 * useAudioFocus - Audio Focus Management Hook
 *
 * This hook manages Android audio focus to:
 * - Pause music/podcasts when Xander starts speaking
 * - Resume music when the conversation ends
 * - Handle audio focus changes from other apps
 *
 * The hook wraps the native AudioFocusManager module and provides
 * a clean React interface with event handling.
 *
 * Usage:
 * const { requestFocus, abandonFocus, checkFocus } = useAudioFocus({
 *   onFocusGained: () => console.log('Got focus'),
 *   onFocusLost: (permanent) => console.log('Lost focus', permanent),
 *   onDuck: () => console.log('Should duck'),
 * });
 *
 * Note: This hook is Android-only. On iOS it returns no-op functions.
 */

import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Get the native module - may be undefined if not properly linked
const { AudioFocusManager } = NativeModules;

/**
 * Options for the useAudioFocus hook
 */
export interface UseAudioFocusOptions {
  /** Called when audio focus is gained */
  onFocusGained?: () => void;
  /** Called when audio focus is lost */
  onFocusLost?: (permanent: boolean) => void;
  /** Called when audio should be ducked (lowered) */
  onDuck?: () => void;
}

/**
 * Return type for useAudioFocus hook
 */
export interface UseAudioFocusResult {
  /** Request audio focus (pauses other audio apps) */
  requestFocus: () => Promise<boolean>;
  /** Abandon audio focus (allows other audio to resume) */
  abandonFocus: () => Promise<void>;
  /** Check if we currently have audio focus */
  checkFocus: () => Promise<boolean>;
}

/**
 * Event payload for audioFocusLost event
 */
interface AudioFocusLostEvent {
  permanent: boolean;
}

/**
 * Custom hook for managing Android audio focus
 *
 * @param options - Callbacks for audio focus events
 * @returns Object with methods to request, abandon, and check audio focus
 */
export function useAudioFocus(options: UseAudioFocusOptions = {}): UseAudioFocusResult {
  // Track if we have focus
  const hasFocusRef = useRef(false);
  
  // Store callbacks in refs to avoid effect dependencies
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Set up event listeners for audio focus changes
  useEffect(() => {
    // Only set up listeners on Android
    if (Platform.OS !== 'android' || !AudioFocusManager) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(AudioFocusManager);

    // Listen for focus gained
    const gainedSubscription = eventEmitter.addListener('audioFocusGained', () => {
      hasFocusRef.current = true;
      optionsRef.current.onFocusGained?.();
    });

    // Listen for focus lost
    const lostSubscription = eventEmitter.addListener(
      'audioFocusLost',
      (event: AudioFocusLostEvent) => {
        hasFocusRef.current = false;
        optionsRef.current.onFocusLost?.(event.permanent);
      }
    );

    // Listen for duck request
    const duckSubscription = eventEmitter.addListener('audioFocusDuck', () => {
      optionsRef.current.onDuck?.();
    });

    // Cleanup listeners on unmount
    return () => {
      gainedSubscription.remove();
      lostSubscription.remove();
      duckSubscription.remove();
    };
  }, []); // Empty deps - we use refs for callbacks

  /**
   * Request audio focus from the system
   * This will pause other audio apps (like Spotify, YouTube Music)
   *
   * @returns true if focus was granted, false otherwise
   */
  const requestFocus = useCallback(async (): Promise<boolean> => {
    // No-op on iOS
    if (Platform.OS !== 'android') {
      return true;
    }

    // Check if native module is available
    if (!AudioFocusManager) {
      console.warn('[useAudioFocus] AudioFocusManager native module not available');
      return false;
    }

    try {
      const result = await AudioFocusManager.requestFocus();
      hasFocusRef.current = result;
      return result;
    } catch (error) {
      console.error('[useAudioFocus] Failed to request audio focus:', error);
      return false;
    }
  }, []);

  /**
   * Abandon audio focus
   * This allows other audio apps to resume playback
   */
  const abandonFocus = useCallback(async (): Promise<void> => {
    // No-op on iOS
    if (Platform.OS !== 'android') {
      return;
    }

    // Check if native module is available
    if (!AudioFocusManager) {
      console.warn('[useAudioFocus] AudioFocusManager native module not available');
      return;
    }

    try {
      await AudioFocusManager.abandonFocus();
      hasFocusRef.current = false;
    } catch (error) {
      console.error('[useAudioFocus] Failed to abandon audio focus:', error);
    }
  }, []);

  /**
   * Check if we currently have audio focus
   *
   * @returns true if we have focus, false otherwise
   */
  const checkFocus = useCallback(async (): Promise<boolean> => {
    // On iOS, always return true (no audio focus concept)
    if (Platform.OS !== 'android') {
      return true;
    }

    // Check if native module is available
    if (!AudioFocusManager) {
      console.warn('[useAudioFocus] AudioFocusManager native module not available');
      return false;
    }

    try {
      const result = await AudioFocusManager.hasFocus();
      hasFocusRef.current = result;
      return result;
    } catch (error) {
      console.error('[useAudioFocus] Failed to check audio focus:', error);
      return false;
    }
  }, []);

  return {
    requestFocus,
    abandonFocus,
    checkFocus,
  };
}

export default useAudioFocus;
