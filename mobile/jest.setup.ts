/**
 * Jest Setup File
 * Configure global mocks and test utilities
 */

// Store event listeners for expo-speech-recognition
const speechRecognitionListeners: Record<string, ((event: unknown) => void)[]> = {};

// Mock expo-speech module
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  resume: jest.fn().mockResolvedValue(undefined),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
  getAvailableVoicesAsync: jest.fn().mockResolvedValue([]),
  maxSpeechInputLength: 4000,
}));

// Mock expo-speech-recognition module
jest.mock('expo-speech-recognition', () => {
  return {
    ExpoSpeechRecognitionModule: {
      start: jest.fn(),
      stop: jest.fn().mockResolvedValue(undefined),
      abort: jest.fn().mockResolvedValue(undefined),
      requestPermissionsAsync: jest.fn().mockResolvedValue({
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }),
      getPermissionsAsync: jest.fn().mockResolvedValue({
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }),
      isRecognitionAvailable: jest.fn().mockResolvedValue(true),
      getStateAsync: jest.fn().mockResolvedValue('inactive'),
      getSupportedLocales: jest.fn().mockResolvedValue(['en-US', 'es-ES']),
      addListener: jest.fn((event: string, callback: (event: unknown) => void) => {
        if (!speechRecognitionListeners[event]) {
          speechRecognitionListeners[event] = [];
        }
        speechRecognitionListeners[event].push(callback);
        return {
          remove: jest.fn(() => {
            const index = speechRecognitionListeners[event]?.indexOf(callback);
            if (index !== undefined && index > -1) {
              speechRecognitionListeners[event].splice(index, 1);
            }
          }),
        };
      }),
      // Helper to emit events in tests
      __emitEvent: (event: string, data: unknown) => {
        speechRecognitionListeners[event]?.forEach((cb) => cb(data));
      },
      // Helper to clear listeners between tests
      __clearListeners: () => {
        Object.keys(speechRecognitionListeners).forEach((key) => {
          speechRecognitionListeners[key] = [];
        });
      },
    },
    useSpeechRecognitionEvent: jest.fn((event: string, callback: (event: unknown) => void) => {
      // This mock version doesn't actually register the callback
      // The test should verify the callback is provided
    }),
  };
});

// Mock react-native
jest.mock('react-native', () => {
  return {
    Platform: {
      OS: 'android',
      select: jest.fn((obj) => obj.android || obj.default),
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
  };
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Clear listeners
  Object.keys(speechRecognitionListeners).forEach((key) => {
    speechRecognitionListeners[key] = [];
  });
});
