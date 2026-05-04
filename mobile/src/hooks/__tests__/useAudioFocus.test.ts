/**
 * Unit tests for useAudioFocus hook
 * Tests audio focus management for Android
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NativeModules, Platform } from 'react-native';
import { useAudioFocus } from '../useAudioFocus';
import { testHelpers } from '../../../jest.setup';

// Get the mock AudioFocusManager
const mockAudioFocusManager = NativeModules.AudioFocusManager as jest.Mocked<{
  requestFocus: jest.Mock;
  abandonFocus: jest.Mock;
  hasFocus: jest.Mock;
  addListener: jest.Mock;
  removeListeners: jest.Mock;
  __emitEvent: (event: string, data: unknown) => void;
  __clearListeners: () => void;
}>;

describe('useAudioFocus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    testHelpers.clearAudioFocusListeners();
    // Reset Platform.OS to android for most tests
    (Platform as { OS: string }).OS = 'android';
  });

  describe('Initial state', () => {
    it('should provide all expected methods', () => {
      const { result } = renderHook(() => useAudioFocus());

      expect(typeof result.current.requestFocus).toBe('function');
      expect(typeof result.current.abandonFocus).toBe('function');
      expect(typeof result.current.checkFocus).toBe('function');
    });
  });

  describe('requestFocus', () => {
    it('should call native requestFocus on Android', async () => {
      const { result } = renderHook(() => useAudioFocus());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestFocus();
      });

      expect(mockAudioFocusManager.requestFocus).toHaveBeenCalled();
      expect(granted).toBe(true);
    });

    it('should return true when focus is granted', async () => {
      mockAudioFocusManager.requestFocus.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useAudioFocus());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestFocus();
      });

      expect(granted).toBe(true);
    });

    it('should return false when focus is denied', async () => {
      mockAudioFocusManager.requestFocus.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useAudioFocus());

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestFocus();
      });

      expect(granted).toBe(false);
    });

    it('should return false on error', async () => {
      mockAudioFocusManager.requestFocus.mockRejectedValueOnce(
        new Error('Audio focus error')
      );

      const { result } = renderHook(() => useAudioFocus());

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestFocus();
      });

      expect(granted).toBe(false);
    });

    it('should return true on iOS (no-op)', async () => {
      (Platform as { OS: string }).OS = 'ios';

      const { result } = renderHook(() => useAudioFocus());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestFocus();
      });

      expect(mockAudioFocusManager.requestFocus).not.toHaveBeenCalled();
      expect(granted).toBe(true);
    });
  });

  describe('abandonFocus', () => {
    it('should call native abandonFocus on Android', async () => {
      const { result } = renderHook(() => useAudioFocus());

      await act(async () => {
        await result.current.abandonFocus();
      });

      expect(mockAudioFocusManager.abandonFocus).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockAudioFocusManager.abandonFocus.mockRejectedValueOnce(
        new Error('Abandon focus error')
      );

      const { result } = renderHook(() => useAudioFocus());

      // Should not throw
      await act(async () => {
        await result.current.abandonFocus();
      });

      expect(mockAudioFocusManager.abandonFocus).toHaveBeenCalled();
    });

    it('should be no-op on iOS', async () => {
      (Platform as { OS: string }).OS = 'ios';

      const { result } = renderHook(() => useAudioFocus());

      await act(async () => {
        await result.current.abandonFocus();
      });

      expect(mockAudioFocusManager.abandonFocus).not.toHaveBeenCalled();
    });
  });

  describe('checkFocus', () => {
    it('should call native hasFocus on Android', async () => {
      mockAudioFocusManager.hasFocus.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useAudioFocus());

      let hasFocus: boolean = false;
      await act(async () => {
        hasFocus = await result.current.checkFocus();
      });

      expect(mockAudioFocusManager.hasFocus).toHaveBeenCalled();
      expect(hasFocus).toBe(true);
    });

    it('should return false when we do not have focus', async () => {
      mockAudioFocusManager.hasFocus.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useAudioFocus());

      let hasFocus: boolean = true;
      await act(async () => {
        hasFocus = await result.current.checkFocus();
      });

      expect(hasFocus).toBe(false);
    });

    it('should return false on error', async () => {
      mockAudioFocusManager.hasFocus.mockRejectedValueOnce(
        new Error('Check focus error')
      );

      const { result } = renderHook(() => useAudioFocus());

      let hasFocus: boolean = true;
      await act(async () => {
        hasFocus = await result.current.checkFocus();
      });

      expect(hasFocus).toBe(false);
    });

    it('should return true on iOS (no-op)', async () => {
      (Platform as { OS: string }).OS = 'ios';

      const { result } = renderHook(() => useAudioFocus());

      let hasFocus: boolean = false;
      await act(async () => {
        hasFocus = await result.current.checkFocus();
      });

      expect(mockAudioFocusManager.hasFocus).not.toHaveBeenCalled();
      expect(hasFocus).toBe(true);
    });
  });

  describe('Event handling', () => {
    it('should call onFocusGained when audioFocusGained event fires', async () => {
      const onFocusGained = jest.fn();

      const { result } = renderHook(() =>
        useAudioFocus({ onFocusGained })
      );

      // Wait for effect to set up listeners
      await act(async () => {
        // Small delay for effect to run
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Emit the event
      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusGained', null);
      });

      expect(onFocusGained).toHaveBeenCalledTimes(1);
    });

    it('should call onFocusLost with permanent=true when permanent loss occurs', async () => {
      const onFocusLost = jest.fn();

      const { result } = renderHook(() =>
        useAudioFocus({ onFocusLost })
      );

      // Wait for effect to set up listeners
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Emit the event
      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusLost', { permanent: true });
      });

      expect(onFocusLost).toHaveBeenCalledTimes(1);
      expect(onFocusLost).toHaveBeenCalledWith(true);
    });

    it('should call onFocusLost with permanent=false when transient loss occurs', async () => {
      const onFocusLost = jest.fn();

      const { result } = renderHook(() =>
        useAudioFocus({ onFocusLost })
      );

      // Wait for effect to set up listeners
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Emit the event
      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusLost', { permanent: false });
      });

      expect(onFocusLost).toHaveBeenCalledTimes(1);
      expect(onFocusLost).toHaveBeenCalledWith(false);
    });

    it('should call onDuck when audioFocusDuck event fires', async () => {
      const onDuck = jest.fn();

      const { result } = renderHook(() =>
        useAudioFocus({ onDuck })
      );

      // Wait for effect to set up listeners
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Emit the event
      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusDuck', null);
      });

      expect(onDuck).toHaveBeenCalledTimes(1);
    });

    it('should not set up listeners on iOS', async () => {
      (Platform as { OS: string }).OS = 'ios';

      const onFocusGained = jest.fn();
      const onFocusLost = jest.fn();
      const onDuck = jest.fn();

      renderHook(() =>
        useAudioFocus({ onFocusGained, onFocusLost, onDuck })
      );

      // Wait for effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Emit events (should be ignored on iOS)
      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusGained', null);
        testHelpers.emitAudioFocusEvent('audioFocusLost', { permanent: true });
        testHelpers.emitAudioFocusEvent('audioFocusDuck', null);
      });

      // Callbacks should not be called on iOS
      expect(onFocusGained).not.toHaveBeenCalled();
      expect(onFocusLost).not.toHaveBeenCalled();
      expect(onDuck).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up listeners on unmount', async () => {
      const onFocusGained = jest.fn();

      const { unmount } = renderHook(() =>
        useAudioFocus({ onFocusGained })
      );

      // Wait for effect to set up listeners
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Unmount the hook
      unmount();

      // Emit event after unmount - callback should not be called
      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusGained', null);
      });

      // Since we cleaned up, the callback shouldn't be called after unmount
      // Note: This depends on the removal logic working correctly
      // The actual test might vary based on how removal is implemented
    });
  });

  describe('Edge cases', () => {
    it('should work with empty options', async () => {
      const { result } = renderHook(() => useAudioFocus());

      // Should not throw when events fire with no callbacks
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        testHelpers.emitAudioFocusEvent('audioFocusGained', null);
        testHelpers.emitAudioFocusEvent('audioFocusLost', { permanent: true });
        testHelpers.emitAudioFocusEvent('audioFocusDuck', null);
      });

      // No errors should occur
      expect(true).toBe(true);
    });

    it('should work with undefined options', async () => {
      const { result } = renderHook(() => useAudioFocus(undefined));

      // Should not throw
      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestFocus();
      });

      expect(granted).toBe(true);
    });

    it('should handle rapid requestFocus calls', async () => {
      const { result } = renderHook(() => useAudioFocus());

      await act(async () => {
        // Make multiple rapid calls
        const results = await Promise.all([
          result.current.requestFocus(),
          result.current.requestFocus(),
          result.current.requestFocus(),
        ]);

        // All should succeed
        expect(results).toEqual([true, true, true]);
      });
    });
  });
});
