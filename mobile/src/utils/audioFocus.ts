/**
 * audioFocus - Audio focus management utility
 *
 * This utility manages Android audio focus to:
 * - Pause music when the app opens ("Hey Google, talk to Xander")
 * - Resume music when the session ends
 * - Handle audio ducking for natural conversation flow
 *
 * This requires native module integration which will be implemented in Phase 5.
 *
 * Android Audio Focus Flow:
 * 1. App receives "Talk to Xander" intent
 * 2. Request audio focus (AUDIOFOCUS_GAIN_TRANSIENT)
 * 3. Music player receives AUDIOFOCUS_LOSS_TRANSIENT and pauses
 * 4. Conversation happens
 * 5. User says "Goodbye" or timeout
 * 6. Abandon audio focus
 * 7. Music player receives AUDIOFOCUS_GAIN and resumes
 */

// Audio focus types (matching Android's AudioManager constants)
export enum AudioFocusType {
  GAIN = 'AUDIOFOCUS_GAIN',
  GAIN_TRANSIENT = 'AUDIOFOCUS_GAIN_TRANSIENT',
  GAIN_TRANSIENT_MAY_DUCK = 'AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK',
  GAIN_TRANSIENT_EXCLUSIVE = 'AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE',
}

export enum AudioFocusResult {
  GRANTED = 'AUDIOFOCUS_REQUEST_GRANTED',
  FAILED = 'AUDIOFOCUS_REQUEST_FAILED',
  DELAYED = 'AUDIOFOCUS_REQUEST_DELAYED',
}

export interface AudioFocusState {
  hasAudioFocus: boolean;
  focusType: AudioFocusType | null;
  lastFocusResult: AudioFocusResult | null;
}

/**
 * Request audio focus from the system
 * Placeholder - will be implemented with native module in Phase 5
 *
 * @param focusType - Type of audio focus to request
 * @returns Promise resolving to the focus result
 */
export async function requestAudioFocus(
  focusType: AudioFocusType = AudioFocusType.GAIN_TRANSIENT
): Promise<AudioFocusResult> {
  // TODO: Implement native module call in Phase 5
  // This will call Android's AudioManager.requestAudioFocus()
  console.log(`[AudioFocus] Requesting audio focus: ${focusType}`);

  // Placeholder: simulate success
  return AudioFocusResult.GRANTED;
}

/**
 * Abandon audio focus, allowing other apps to play audio
 * Placeholder - will be implemented with native module in Phase 5
 *
 * @returns Promise resolving to success status
 */
export async function abandonAudioFocus(): Promise<boolean> {
  // TODO: Implement native module call in Phase 5
  // This will call Android's AudioManager.abandonAudioFocus()
  console.log('[AudioFocus] Abandoning audio focus');

  // Placeholder: simulate success
  return true;
}

/**
 * Get current audio focus state
 * Placeholder - will be implemented with native module in Phase 5
 *
 * @returns Current audio focus state
 */
export function getAudioFocusState(): AudioFocusState {
  // TODO: Implement native module call in Phase 5
  return {
    hasAudioFocus: false,
    focusType: null,
    lastFocusResult: null,
  };
}

/**
 * Setup audio focus listener for focus changes
 * Placeholder - will be implemented with native module in Phase 5
 *
 * @param callback - Function to call when audio focus changes
 * @returns Cleanup function to remove listener
 */
export function addAudioFocusListener(
  callback: (state: AudioFocusState) => void
): () => void {
  // TODO: Implement native module event listener in Phase 5
  console.log('[AudioFocus] Adding audio focus listener');

  // Placeholder: return no-op cleanup function
  return () => {
    console.log('[AudioFocus] Removing audio focus listener');
  };
}

/**
 * High-level function to pause other audio and take focus for Xander
 */
export async function takeAudioFocusForConversation(): Promise<boolean> {
  const result = await requestAudioFocus(AudioFocusType.GAIN_TRANSIENT);
  return result === AudioFocusResult.GRANTED;
}

/**
 * High-level function to release focus and let music resume
 */
export async function releaseAudioFocusAfterConversation(): Promise<boolean> {
  return abandonAudioFocus();
}

export default {
  requestAudioFocus,
  abandonAudioFocus,
  getAudioFocusState,
  addAudioFocusListener,
  takeAudioFocusForConversation,
  releaseAudioFocusAfterConversation,
  AudioFocusType,
  AudioFocusResult,
};
