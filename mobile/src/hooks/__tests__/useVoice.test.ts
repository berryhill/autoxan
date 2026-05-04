/**
 * Unit tests for useVoice hook
 * Tests Speech-to-Text functionality using expo-speech-recognition
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVoice } from '../useVoice';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

// Get access to the mock module
const mockExpoSpeechRecognition = ExpoSpeechRecognitionModule as jest.Mocked<typeof ExpoSpeechRecognitionModule> & {
  __emitEvent: (event: string, data: unknown) => void;
  __clearListeners: () => void;
};

describe('useVoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpoSpeechRecognition.__clearListeners?.();
  });

  describe('Initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useVoice());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.partialTranscript).toBe('');
      expect(result.current.error).toBeNull();
    });

    it('should provide all expected methods', () => {
      const { result } = renderHook(() => useVoice());

      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
      expect(typeof result.current.abortListening).toBe('function');
      expect(typeof result.current.resetTranscript).toBe('function');
      expect(typeof result.current.isAvailable).toBe('function');
      expect(typeof result.current.requestPermissions).toBe('function');
    });
  });

  describe('startListening', () => {
    it('should request permissions before starting', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(mockExpoSpeechRecognition.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should check availability before starting', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(mockExpoSpeechRecognition.isRecognitionAvailable).toHaveBeenCalled();
    });

    it('should start speech recognition with default options', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(mockExpoSpeechRecognition.start).toHaveBeenCalledWith({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: false,
        requiresOnDeviceRecognition: false,
        maxAlternatives: 1,
      });
    });

    it('should start speech recognition with custom options', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening({
          lang: 'es-ES',
          interimResults: false,
          continuous: true,
          addsPunctuation: true,
        });
      });

      expect(mockExpoSpeechRecognition.start).toHaveBeenCalledWith({
        lang: 'es-ES',
        interimResults: false,
        continuous: true,
        addsPunctuation: true,
        requiresOnDeviceRecognition: false,
        maxAlternatives: 1,
      });
    });

    it('should set error when permissions are denied', async () => {
      (mockExpoSpeechRecognition.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        status: 'denied',
        canAskAgain: true,
      });

      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.error).toContain('permission denied');
      expect(mockExpoSpeechRecognition.start).not.toHaveBeenCalled();
    });

    it('should set error when speech recognition is not available', async () => {
      (mockExpoSpeechRecognition.isRecognitionAvailable as jest.Mock).mockResolvedValueOnce(false);

      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.error).toContain('not available');
      expect(mockExpoSpeechRecognition.start).not.toHaveBeenCalled();
    });

    it('should not start if already listening', async () => {
      (mockExpoSpeechRecognition.getStateAsync as jest.Mock).mockResolvedValueOnce('recognizing');

      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(mockExpoSpeechRecognition.start).not.toHaveBeenCalled();
    });
  });

  describe('stopListening', () => {
    it('should call stop on the module', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.stopListening();
      });

      expect(mockExpoSpeechRecognition.stop).toHaveBeenCalled();
    });

    it('should handle stop errors gracefully', async () => {
      (mockExpoSpeechRecognition.stop as jest.Mock).mockRejectedValueOnce(new Error('Stop failed'));

      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.stopListening();
      });

      // Should not throw, and should update state
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('abortListening', () => {
    it('should call abort on the module', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.abortListening();
      });

      expect(mockExpoSpeechRecognition.abort).toHaveBeenCalled();
    });

    it('should handle abort errors gracefully', async () => {
      (mockExpoSpeechRecognition.abort as jest.Mock).mockRejectedValueOnce(new Error('Abort failed'));

      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.abortListening();
      });

      // Should not throw
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('resetTranscript', () => {
    it('should clear transcript and partialTranscript', async () => {
      const { result } = renderHook(() => useVoice());

      // Manually set some transcript values first by simulating events
      // For this test, we'll just test the reset functionality
      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.partialTranscript).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return true when recognition is available', async () => {
      const { result } = renderHook(() => useVoice());

      let available: boolean = false;
      await act(async () => {
        available = await result.current.isAvailable();
      });

      expect(available).toBe(true);
      expect(mockExpoSpeechRecognition.isRecognitionAvailable).toHaveBeenCalled();
    });

    it('should return false when recognition is not available', async () => {
      (mockExpoSpeechRecognition.isRecognitionAvailable as jest.Mock).mockResolvedValueOnce(false);

      const { result } = renderHook(() => useVoice());

      let available: boolean = true;
      await act(async () => {
        available = await result.current.isAvailable();
      });

      expect(available).toBe(false);
    });

    it('should return false when check throws an error', async () => {
      (mockExpoSpeechRecognition.isRecognitionAvailable as jest.Mock).mockRejectedValueOnce(
        new Error('Check failed'),
      );

      const { result } = renderHook(() => useVoice());

      let available: boolean = true;
      await act(async () => {
        available = await result.current.isAvailable();
      });

      expect(available).toBe(false);
    });
  });

  describe('requestPermissions', () => {
    it('should return true when permissions are granted', async () => {
      const { result } = renderHook(() => useVoice());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(true);
      expect(mockExpoSpeechRecognition.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permissions are denied', async () => {
      (mockExpoSpeechRecognition.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        granted: false,
        status: 'denied',
      });

      const { result } = renderHook(() => useVoice());

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(false);
    });

    it('should return false when request throws an error', async () => {
      (mockExpoSpeechRecognition.requestPermissionsAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Permission request failed'),
      );

      const { result } = renderHook(() => useVoice());

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle start errors gracefully', async () => {
      (mockExpoSpeechRecognition.start as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Start failed');
      });

      const { result } = renderHook(() => useVoice());

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.error).toBe('Start failed');
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should abort recognition on unmount', async () => {
      const { unmount } = renderHook(() => useVoice());

      unmount();

      // The abort should be called during cleanup
      await waitFor(() => {
        expect(mockExpoSpeechRecognition.abort).toHaveBeenCalled();
      });
    });
  });
});
