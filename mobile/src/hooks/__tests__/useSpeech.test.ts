/**
 * Unit tests for useSpeech hook
 * Tests Text-to-Speech functionality using expo-speech
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSpeech } from '../useSpeech';
import * as Speech from 'expo-speech';

// Get access to the mock module
const mockSpeech = Speech as jest.Mocked<typeof Speech>;

describe('useSpeech', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentText).toBeNull();
    });

    it('should provide all expected methods', () => {
      const { result } = renderHook(() => useSpeech());

      expect(typeof result.current.speak).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
      expect(typeof result.current.getAvailableVoices).toBe('function');
      expect(typeof result.current.checkIsSpeaking).toBe('function');
    });

    it('should expose maxSpeechInputLength', () => {
      const { result } = renderHook(() => useSpeech());

      expect(result.current.maxSpeechInputLength).toBe(4000);
    });
  });

  describe('speak', () => {
    it('should call Speech.speak with text and default options', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Hello world');
      });

      expect(mockSpeech.stop).toHaveBeenCalled();
      expect(mockSpeech.speak).toHaveBeenCalledWith(
        'Hello world',
        expect.objectContaining({
          language: 'en-US',
          pitch: 1.0,
          rate: 1.0,
          volume: 1.0,
        }),
      );
    });

    it('should call Speech.speak with custom options', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Hola mundo', {
          language: 'es-ES',
          pitch: 1.5,
          rate: 0.8,
          volume: 0.5,
        });
      });

      expect(mockSpeech.speak).toHaveBeenCalledWith(
        'Hola mundo',
        expect.objectContaining({
          language: 'es-ES',
          pitch: 1.5,
          rate: 0.8,
          volume: 0.5,
        }),
      );
    });

    it('should clamp pitch to valid range', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Test', { pitch: 5.0 }); // Above max
      });

      expect(mockSpeech.speak).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          pitch: 2.0, // Clamped to max
        }),
      );
    });

    it('should clamp rate to valid range', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Test', { rate: 0.01 }); // Below min
      });

      expect(mockSpeech.speak).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          rate: 0.1, // Clamped to min
        }),
      );
    });

    it('should clamp volume to valid range', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Test', { volume: 2.0 }); // Above max
      });

      expect(mockSpeech.speak).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          volume: 1.0, // Clamped to max
        }),
      );
    });

    it('should update state to speaking when called', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Hello');
      });

      expect(result.current.isSpeaking).toBe(true);
      expect(result.current.currentText).toBe('Hello');
    });

    it('should stop current speech before starting new', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('First');
      });

      await act(async () => {
        await result.current.speak('Second');
      });

      expect(mockSpeech.stop).toHaveBeenCalledTimes(2);
    });

    it('should set error for empty text', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('');
      });

      expect(result.current.error).toContain('No text provided');
      expect(mockSpeech.speak).not.toHaveBeenCalled();
    });

    it('should set error for whitespace-only text', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('   ');
      });

      expect(result.current.error).toContain('No text provided');
      expect(mockSpeech.speak).not.toHaveBeenCalled();
    });

    it('should call onStart callback when speech starts', async () => {
      const onStart = jest.fn();
      const { result } = renderHook(() => useSpeech());

      // Capture the onStart callback passed to Speech.speak
      (mockSpeech.speak as jest.Mock).mockImplementationOnce((_text, options) => {
        options?.onStart?.();
      });

      await act(async () => {
        await result.current.speak('Hello', { onStart });
      });

      expect(onStart).toHaveBeenCalled();
    });

    it('should call onDone callback when speech completes', async () => {
      const onDone = jest.fn();
      const { result } = renderHook(() => useSpeech());

      // Capture the onDone callback passed to Speech.speak
      (mockSpeech.speak as jest.Mock).mockImplementationOnce((_text, options) => {
        options?.onDone?.();
      });

      await act(async () => {
        await result.current.speak('Hello', { onDone });
      });

      expect(onDone).toHaveBeenCalled();
    });

    it('should call onStopped callback when speech is stopped', async () => {
      const onStopped = jest.fn();
      const { result } = renderHook(() => useSpeech());

      // Capture the onStopped callback passed to Speech.speak
      (mockSpeech.speak as jest.Mock).mockImplementationOnce((_text, options) => {
        options?.onStopped?.();
      });

      await act(async () => {
        await result.current.speak('Hello', { onStopped });
      });

      expect(onStopped).toHaveBeenCalled();
    });

    it('should call onError callback and set error state on error', async () => {
      const onError = jest.fn();
      const testError = new Error('Speech error');
      const { result } = renderHook(() => useSpeech());

      // Capture the onError callback passed to Speech.speak
      (mockSpeech.speak as jest.Mock).mockImplementationOnce((_text, options) => {
        options?.onError?.(testError);
      });

      await act(async () => {
        await result.current.speak('Hello', { onError });
      });

      expect(onError).toHaveBeenCalledWith(testError);
      expect(result.current.error).toBe('Speech error');
      expect(result.current.isSpeaking).toBe(false);
    });

    it('should handle Speech.stop throwing an error', async () => {
      (mockSpeech.stop as jest.Mock).mockRejectedValueOnce(new Error('Stop failed'));

      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.speak('Hello');
      });

      expect(result.current.error).toBe('Stop failed');
    });
  });

  describe('stop', () => {
    it('should call Speech.stop', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.stop();
      });

      expect(mockSpeech.stop).toHaveBeenCalled();
    });

    it('should update state after stopping', async () => {
      const { result } = renderHook(() => useSpeech());

      // First start speaking
      await act(async () => {
        await result.current.speak('Hello');
      });

      expect(result.current.isSpeaking).toBe(true);

      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.currentText).toBeNull();
    });

    it('should handle stop errors gracefully', async () => {
      (mockSpeech.stop as jest.Mock).mockRejectedValueOnce(new Error('Stop failed'));

      const { result } = renderHook(() => useSpeech());

      // This should not throw
      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('pause', () => {
    it('should call Speech.pause', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.pause();
      });

      expect(mockSpeech.pause).toHaveBeenCalled();
    });

    it('should update isPaused state', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should handle pause errors gracefully (Android not supported)', async () => {
      (mockSpeech.pause as jest.Mock).mockRejectedValueOnce(new Error('Not supported'));

      const { result } = renderHook(() => useSpeech());

      // Should not throw
      await act(async () => {
        await result.current.pause();
      });

      // State should remain unchanged
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resume', () => {
    it('should call Speech.resume', async () => {
      const { result } = renderHook(() => useSpeech());

      await act(async () => {
        await result.current.resume();
      });

      expect(mockSpeech.resume).toHaveBeenCalled();
    });

    it('should update isPaused state', async () => {
      const { result } = renderHook(() => useSpeech());

      // First pause
      await act(async () => {
        await result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);

      // Then resume
      await act(async () => {
        await result.current.resume();
      });

      expect(result.current.isPaused).toBe(false);
    });

    it('should handle resume errors gracefully (Android not supported)', async () => {
      (mockSpeech.resume as jest.Mock).mockRejectedValueOnce(new Error('Not supported'));

      const { result } = renderHook(() => useSpeech());

      // Should not throw
      await act(async () => {
        await result.current.resume();
      });
    });
  });

  describe('getAvailableVoices', () => {
    it('should return available voices', async () => {
      const mockVoices = [
        { identifier: 'en-US-voice', language: 'en-US', name: 'English US', quality: 'Enhanced' as const },
        { identifier: 'es-ES-voice', language: 'es-ES', name: 'Spanish', quality: 'Default' as const },
      ];
      (mockSpeech.getAvailableVoicesAsync as jest.Mock).mockResolvedValueOnce(mockVoices);

      const { result } = renderHook(() => useSpeech());

      let voices: Speech.Voice[] = [];
      await act(async () => {
        voices = await result.current.getAvailableVoices();
      });

      expect(voices).toEqual(mockVoices);
      expect(mockSpeech.getAvailableVoicesAsync).toHaveBeenCalled();
    });

    it('should return empty array on error', async () => {
      (mockSpeech.getAvailableVoicesAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to get voices'),
      );

      const { result } = renderHook(() => useSpeech());

      let voices: Speech.Voice[] = [{ identifier: 'test', language: 'en', name: 'Test', quality: 'Default' as const }];
      await act(async () => {
        voices = await result.current.getAvailableVoices();
      });

      expect(voices).toEqual([]);
    });
  });

  describe('checkIsSpeaking', () => {
    it('should return true when speaking', async () => {
      (mockSpeech.isSpeakingAsync as jest.Mock).mockResolvedValueOnce(true);

      const { result } = renderHook(() => useSpeech());

      let isSpeaking = false;
      await act(async () => {
        isSpeaking = await result.current.checkIsSpeaking();
      });

      expect(isSpeaking).toBe(true);
      expect(mockSpeech.isSpeakingAsync).toHaveBeenCalled();
    });

    it('should return false when not speaking', async () => {
      (mockSpeech.isSpeakingAsync as jest.Mock).mockResolvedValueOnce(false);

      const { result } = renderHook(() => useSpeech());

      let isSpeaking = true;
      await act(async () => {
        isSpeaking = await result.current.checkIsSpeaking();
      });

      expect(isSpeaking).toBe(false);
    });

    it('should return false on error', async () => {
      (mockSpeech.isSpeakingAsync as jest.Mock).mockRejectedValueOnce(new Error('Check failed'));

      const { result } = renderHook(() => useSpeech());

      let isSpeaking = true;
      await act(async () => {
        isSpeaking = await result.current.checkIsSpeaking();
      });

      expect(isSpeaking).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should stop speech on unmount', async () => {
      const { unmount } = renderHook(() => useSpeech());

      unmount();

      // The stop should be called during cleanup
      await waitFor(() => {
        expect(mockSpeech.stop).toHaveBeenCalled();
      });
    });
  });

  describe('State updates after unmount', () => {
    it('should not update state after unmount', async () => {
      const { result, unmount } = renderHook(() => useSpeech());

      // Unmount the component
      unmount();

      // Try to speak after unmount - this should not throw
      // The safeSetState should prevent state updates
      await act(async () => {
        // This would normally update state, but shouldn't after unmount
        await result.current.speak('Hello');
      });

      // The test passes if no error is thrown
    });
  });
});
