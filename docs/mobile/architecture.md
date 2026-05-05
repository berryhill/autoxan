# Xander Voice App - Architecture

This document describes the technical architecture of the Xander Voice App, including module structure, dependencies, and design patterns.

## Overview

The Xander Voice App is built with React Native (Expo) and follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│                    (Main Entry Point)                           │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Components    │  │    Hooks    │  │  Store (Zustand)    │  │
│  │                 │  │             │  │                     │  │
│  │ VoiceButton     │  │ useVoice    │  │ sessionStore        │  │
│  │ GestureButton   │  │ useSpeech   │  │ • sessionState      │  │
│  │ ControlsPanel   │  │ useAudioFocus│ │ • messages          │  │
│  │                 │  │ useGestures │  │ • dispatchedWork    │  │
│  └─────────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐    │
│  │         API Layer           │  │    Native Modules        │    │
│  │                             │  │                         │    │
│  │ xanderApi                   │  │ AudioFocusManager       │    │
│  │ • sendMessage()            │  │ • requestFocus()        │    │
│  │ • startSession()           │  │ • abandonFocus()        │    │
│  │ • dispatch()               │  │ • hasFocus()            │    │
│  │ • healthCheck()            │  │                         │    │
│  └─────────────────────────────┘  └─────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      Types                               │    │
│  │                                                          │    │
│  │ gestures.ts                                              │    │
│  │ • GestureAction, GestureConfig, GESTURE_CONFIGS          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
mobile/
├── App.tsx                          # Main application entry (conversation flow)
├── index.ts                         # Expo entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
├── babel.config.js                  # Babel configuration (for Jest)
├── jest.setup.ts                    # Jest setup file
├── assets/                          # Static assets (icons, images)
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash-icon.png
│   └── favicon.png
├── native-modules/                  # Native platform modules
│   └── android/                     # Android native modules
│       ├── README.md                # Integration instructions
│       └── com/xandervoice/         # Kotlin source files
│           ├── AudioFocusModule.kt  # Audio focus native module
│           └── AudioFocusPackage.kt # React package registration
└── src/
    ├── api/                         # API clients
    │   ├── index.ts                 # Barrel export
    │   ├── xanderApi.ts             # Xander HTTP client
    │   └── __tests__/               # API unit tests
    │       └── xanderApi.test.ts    # XanderApi tests
    ├── components/                  # React components
    │   ├── index.ts                 # Barrel export
    │   ├── GestureButton.tsx        # Animated gesture button component
    │   ├── ControlsPanel.tsx        # Gesture controls container (5 buttons)
    │   └── ui/                      # UI components
    │       ├── index.ts             # Barrel export
    │       └── VoiceButton.tsx      # Voice button component
    ├── hooks/                       # Custom React hooks
    │   ├── index.ts                 # Barrel export
    │   ├── useVoice.ts              # Speech-to-Text hook
    │   ├── useSpeech.ts             # Text-to-Speech hook
    │   ├── useAudioFocus.ts         # Audio focus management hook
    │   ├── useGestures.ts           # Gesture control handler hook
    │   └── __tests__/               # Hook unit tests
    │       ├── useVoice.test.ts     # STT hook tests
    │       ├── useSpeech.test.ts    # TTS hook tests
    │       └── useAudioFocus.test.ts # Audio focus hook tests (21 tests)
    ├── store/                       # State management
    │   ├── index.ts                 # Barrel export
    │   ├── types.ts                 # Type definitions & state machine
    │   ├── sessionStore.ts          # Zustand session store
    │   └── __tests__/               # Store unit tests
    │       └── sessionStore.test.ts # Session store tests (158 tests)
    ├── types/                       # Type definitions
    │   ├── index.ts                 # Barrel export
    │   └── gestures.ts              # Gesture types & GESTURE_CONFIGS
    └── utils/                       # Utility functions
        ├── index.ts                 # Barrel export
        └── audioFocus.ts            # Audio focus utilities (legacy)
```

## Module Documentation

### App.tsx - Main Entry Point

The main application component that orchestrates the voice conversation flow with Xander.

**Purpose:**
- Renders the main UI layout
- Implements the complete conversation loop (listen → process → speak → listen)
- Manages 30-second inactivity timeout
- Handles goodbye keyword detection
- Coordinates voice button interactions
- Displays conversation context and session info
- Error handling and recovery

**State Machine (Phase 4):**
```
┌─────────────────────────────────────────────────────────────┐
│                     STATE MACHINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  IDLE ──────▶ CONNECTING ──────▶ LISTENING                  │
│    ▲              │                  │                       │
│    │              ▼                  ▼                       │
│    │          ERROR              PROCESSING                  │
│    │              │                  │                       │
│    │              ▼                  ▼                       │
│    └────────── ENDED ◀────────── SPEAKING                   │
│                                      │                       │
│                                      └──▶ LISTENING (loop)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Conversation Flow:**
1. **idle** → User taps button → **connecting**
2. **connecting** → Health check + session start → **listening**
3. **listening** → Voice recognition active → User speaks → **processing**
4. **processing** → Send to Xander → Receive response → **speaking**
5. **speaking** → TTS plays response → **listening** (loop continues)
6. **listening/processing/speaking** → Goodbye keyword or timeout → **ended**

**Key Functions:**
| Function | Description |
|----------|-------------|
| `handleVoiceButtonPress()` | Start/stop listening, handle button interaction |
| `handleGoodbye()` | End conversation session gracefully with farewell |
| `handleInactivityTimeout()` | Handle 30-second inactivity, auto-end session |
| `processTranscript(text)` | Process user speech, check goodbye keywords, send to Xander |
| `startVoiceListening()` | Initialize speech recognition |
| `getVoiceButtonState()` | Map session state to VoiceButton state |
| `getStatusText()` | Get user-facing status text |

**Effects:**
| Effect | Trigger | Action |
|--------|---------|--------|
| State Change Handler | `sessionState` changes | Handle connecting, listening, ended states |
| Partial Transcript | `partialTranscript` updates | Update currentTranscript display |
| Final Transcript | `transcript` finalized | Process speech, send to Xander |
| Voice Error | `voiceError` occurs | Set error state |
| Cleanup | Component unmount | Clear inactivity timer |

**Inactivity Timeout:**
- Checks every 5 seconds if user has been inactive
- After 30 seconds of inactivity, automatically says goodbye
- Uses `SESSION_TIMEOUT.INACTIVITY_MS` constant (30,000ms)

**Goodbye Detection:**
- Checks user transcript for goodbye keywords
- Keywords: 'goodbye', 'bye', 'see you', 'talk to you later', 'end session', 'stop', 'quit', 'exit'
- Uses `containsGoodbye()` utility function

---

### Components

#### VoiceButton (`src/components/ui/VoiceButton.tsx`)

The main voice interaction button component.

**Purpose:**
- Visual feedback for voice states (idle, listening, processing)
- Tap target for starting/stopping voice recognition

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `state` | `'idle' \| 'listening' \| 'processing'` | Current button state |
| `onPress` | `() => void` | Press handler |
| `disabled` | `boolean` | Disable interactions |

**States:**
- **idle**: Blue button with microphone icon, "Tap to speak"
- **listening**: Red button (scaled up), "Listening..."
- **processing**: Blue button with spinner, "Processing..."

**Usage:**
```tsx
import { VoiceButton } from '@/components/ui';

<VoiceButton
  state={voiceState}
  onPress={handleVoiceButtonPress}
/>
```

---

#### GestureButton (`src/components/GestureButton.tsx`)

Individual animated gesture control button component.

**Purpose:**
- Render a single gesture button with visual feedback
- Animated scale effect on press
- Configurable size and appearance from GestureConfig
- Full accessibility support (labels and hints)

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `GestureConfig` | required | Configuration for the gesture (icon, label, color, description) |
| `onPress` | `() => void` | required | Callback when button is pressed |
| `disabled` | `boolean` | `false` | Whether the button is disabled |
| `size` | `GestureButtonSize` | `'medium'` | Button size: `'small'`, `'medium'`, or `'large'` |
| `testID` | `string` | `undefined` | Optional test ID for testing |

**Button Sizes:**
| Size | Width | Height | Font Size |
|------|-------|--------|-----------|
| `small` | 60px | 60px | 24px |
| `medium` | 80px | 80px | 32px |
| `large` | 100px | 100px | 40px |

**Animation:**
- Uses `Animated.spring` for smooth scale animations
- Scales down to 0.9 on press, springs back to 1.0 on release
- Uses native driver for optimal performance

**Accessibility:**
- `accessibilityLabel`: Button label (e.g., "Interrupt")
- `accessibilityHint`: Button description (e.g., "Stop and let me speak")
- `accessibilityRole`: "button"
- `accessibilityState`: Includes disabled state

**Usage:**
```tsx
import { GestureButton } from '@/components';
import { GESTURE_CONFIGS } from '@/types/gestures';

<GestureButton
  config={GESTURE_CONFIGS.interrupt}
  onPress={() => handleGesture('interrupt')}
  disabled={!isGestureEnabled('interrupt')}
  size="medium"
/>
```

**Status:** ✅ Complete (Phase 10)

---

#### ControlsPanel (`src/components/ControlsPanel.tsx`)

Container component for all 5 gesture control buttons.

**Purpose:**
- Layout and render all 5 gesture buttons
- Automatic button state management based on session state
- Integration with useGestures hook for gesture handling

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   🤚    │  │   🎯    │  │   📋    │  │   ⏹️    │        │
│  │Interrupt│  │  Steer  │  │  Queue  │  │  Stop   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                              │
│                      ┌───────────┐                          │
│                      │    🔄     │                          │
│                      │  Repeat   │                          │
│                      └───────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `testIDPrefix` | `string` | `'gesture-controls'` | Test ID prefix for testing |

**Button Arrangement:**
- **Top row (4 buttons, medium size):** Interrupt, Steer, Queue, Stop
- **Bottom row (1 button, large size):** Repeat (centered)

**State Awareness:**
The panel automatically disables buttons based on the current session state:

| Gesture | Enabled States |
|---------|----------------|
| `interrupt` | Only when `speaking` |
| `steer` | When `listening`, `processing`, or `speaking` |
| `queue` | When `listening`, `processing`, or `speaking` |
| `stop` | When `listening`, `processing`, or `speaking` |
| `repeat` | When `listening`, `processing`, or `speaking` |

**Usage:**
```tsx
import { ControlsPanel } from '@/components';

// In your main conversation view:
function ConversationScreen() {
  return (
    <View style={styles.container}>
      {/* Other UI elements */}
      <ControlsPanel />
    </View>
  );
}
```

**Status:** ✅ Complete (Phase 10)

---

### Hooks

#### useVoice (`src/hooks/useVoice.ts`)

Custom hook for Speech-to-Text (STT) functionality using `expo-speech-recognition` (v3.1.3).

**Purpose:**
- Wrap expo-speech-recognition for cross-platform voice recognition
- Manage listening state and transcripts (final and partial)
- Handle microphone permissions and errors
- Provide configurable recognition options

**State:**
| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | Currently listening for speech |
| `transcript` | `string` | Final recognized text (accumulates in continuous mode) |
| `partialTranscript` | `string` | Interim recognition results (updated in real-time) |
| `error` | `string \| null` | User-friendly error message |

**Methods:**
| Method | Type | Description |
|--------|------|-------------|
| `startListening` | `(options?: VoiceOptions) => Promise<void>` | Start speech recognition with optional configuration |
| `stopListening` | `() => Promise<void>` | Stop listening and process final result |
| `abortListening` | `() => Promise<void>` | Abort listening without processing final result |
| `resetTranscript` | `() => void` | Clear transcript and partial transcript |
| `isAvailable` | `() => Promise<boolean>` | Check if speech recognition is available on device |
| `requestPermissions` | `() => Promise<boolean>` | Request microphone and speech recognition permissions |

**Voice Options:**
```typescript
interface VoiceOptions {
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
```

**Error Handling:**

The hook provides user-friendly error messages for common issues:

| Error Code | Message |
|------------|---------|
| `audio-capture` | Failed to capture audio. Please check your microphone. |
| `not-allowed` | Microphone permission denied. Please enable microphone access. |
| `network` | Network error. Please check your internet connection. |
| `no-speech` | No speech detected. Please try again. |
| `language-not-supported` | The selected language is not supported |
| `busy` | Speech recognition is busy. Please wait and try again. |
| `speech-timeout` | Speech input timed out. Please try speaking again. |

**Features:**
- Automatically requests permissions before starting recognition
- Prevents duplicate starts when already listening
- Cleans up recognition on component unmount
- Accumulates final transcripts (separated by spaces)
- Silently handles user-initiated abort operations

**Usage:**
```tsx
import { useVoice } from '@/hooks';

function VoiceInput() {
  const {
    isListening,
    transcript,
    partialTranscript,
    error,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    isAvailable,
    requestPermissions
  } = useVoice();

  const handleStart = async () => {
    // Check availability first
    const available = await isAvailable();
    if (!available) {
      console.log('Speech recognition not available');
      return;
    }

    // Start with options
    await startListening({
      lang: 'en-US',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
    });
  };

  return (
    <View>
      <Text>{partialTranscript || transcript}</Text>
      <Button onPress={isListening ? stopListening : handleStart} />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

---

#### useSpeech (`src/hooks/useSpeech.ts`)

Custom hook for Text-to-Speech (TTS) functionality using `expo-speech` (v14.0.8).

**Purpose:**
- Wrap expo-speech for cross-platform text synthesis
- Manage speaking state with pause/resume support
- Provide voice selection and configurable options
- Input validation and error handling

**State:**
| Property | Type | Description |
|----------|------|-------------|
| `isSpeaking` | `boolean` | Currently speaking |
| `isPaused` | `boolean` | Speech paused (iOS only) |
| `error` | `string \| null` | Error message |
| `currentText` | `string \| null` | Text currently being spoken |
| `maxSpeechInputLength` | `number` | Maximum allowed text length |

**Methods:**
| Method | Type | Description |
|--------|------|-------------|
| `speak` | `(text: string, options?: SpeechOptions) => Promise<void>` | Speak text with optional settings |
| `stop` | `() => Promise<void>` | Stop all speech immediately |
| `pause` | `() => Promise<void>` | Pause speech (iOS only) |
| `resume` | `() => Promise<void>` | Resume paused speech (iOS only) |
| `getAvailableVoices` | `() => Promise<Voice[]>` | Get list of available voices |
| `checkIsSpeaking` | `() => Promise<boolean>` | Async check if currently speaking |

**Speech Options:**
```typescript
interface SpeechOptions {
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
  /** Callback when a word boundary is reached (native platforms) */
  onBoundary?: () => void;
}
```

**Input Validation:**
- Empty text check: Returns error if text is empty or whitespace-only
- Max length validation: Returns error if text exceeds `maxSpeechInputLength`
- Values are clamped to valid ranges (pitch: 0.5-2.0, rate: 0.1-2.0, volume: 0.0-1.0)

**Features:**
- Automatically stops previous speech before starting new
- Platform-aware pause/resume (iOS only, gracefully no-op on Android)
- Cleans up speech on component unmount
- Tracks current text being spoken

**Usage:**
```tsx
import { useSpeech } from '@/hooks';

function TextReader() {
  const {
    isSpeaking,
    isPaused,
    currentText,
    error,
    speak,
    stop,
    pause,
    resume,
    getAvailableVoices,
    checkIsSpeaking,
    maxSpeechInputLength
  } = useSpeech();

  const handleSpeak = async () => {
    await speak("Hello, I'm Xander!", {
      rate: 1.1,
      pitch: 1.0,
      language: 'en-US',
      onStart: () => console.log('Started speaking'),
      onDone: () => console.log('Finished speaking'),
      onStopped: () => console.log('Speech was stopped'),
      onError: (err) => console.error('Speech error:', err),
    });
  };

  const listVoices = async () => {
    const voices = await getAvailableVoices();
    console.log('Available voices:', voices);
  };

  return (
    <View>
      <Text>Max length: {maxSpeechInputLength}</Text>
      {currentText && <Text>Speaking: {currentText}</Text>}
      <Button title={isSpeaking ? 'Stop' : 'Speak'}
              onPress={isSpeaking ? stop : handleSpeak} />
      {isSpeaking && (
        <Button title={isPaused ? 'Resume' : 'Pause'}
                onPress={isPaused ? resume : pause} />
      )}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

---

#### useAudioFocus (`src/hooks/useAudioFocus.ts`)

Custom hook for managing Android audio focus. Wraps the native `AudioFocusManager` module to pause music/podcasts when Xander speaks and resume them when the conversation ends.

**Purpose:**
- Pause music/podcasts when Xander starts speaking
- Resume music when the conversation ends
- Handle audio focus changes from other apps
- Platform-aware (Android-only, no-op on iOS)

**Options:**
```typescript
interface UseAudioFocusOptions {
  /** Called when audio focus is gained */
  onFocusGained?: () => void;
  /** Called when audio focus is lost */
  onFocusLost?: (permanent: boolean) => void;
  /** Called when audio should be ducked (lowered) */
  onDuck?: () => void;
}
```

**Return Type:**
```typescript
interface UseAudioFocusResult {
  /** Request audio focus (pauses other audio apps) */
  requestFocus: () => Promise<boolean>;
  /** Abandon audio focus (allows other audio to resume) */
  abandonFocus: () => Promise<void>;
  /** Check if we currently have audio focus */
  checkFocus: () => Promise<boolean>;
}
```

**Methods:**
| Method | Type | Description |
|--------|------|-------------|
| `requestFocus` | `() => Promise<boolean>` | Request transient audio focus. Returns true if granted. Pauses other audio apps. |
| `abandonFocus` | `() => Promise<void>` | Release audio focus. Allows other audio apps to resume. |
| `checkFocus` | `() => Promise<boolean>` | Check if we currently have audio focus. |

**Event Callbacks:**
| Callback | Signature | Description |
|----------|-----------|-------------|
| `onFocusGained` | `() => void` | Called when audio focus is granted |
| `onFocusLost` | `(permanent: boolean) => void` | Called when focus is lost. `permanent` indicates if loss is temporary (can be regained) or permanent |
| `onDuck` | `() => void` | Called when audio should be ducked (lowered volume temporarily) |

**Platform Behavior:**
| Platform | Behavior |
|----------|----------|
| Android | Full audio focus management via native module |
| iOS | No-op functions that return success (iOS handles audio automatically) |

**Audio Focus Flow:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO FOCUS FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Session Start                                                   │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐                                               │
│  │ requestFocus │ ──▶ Music/Podcasts pause                     │
│  └──────────────┘                                               │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐     ┌──────────────┐                          │
│  │  Speaking    │ ◀───│  Listening   │ ◀─┐                      │
│  └──────────────┘     └──────────────┘   │                      │
│       │                      │           │                      │
│       └──────────────────────┴───────────┘                      │
│                      │                                          │
│                      ▼                                          │
│  Session End / Goodbye                                          │
│       │                                                          │
│       ▼                                                          │
│  ┌───────────────┐                                               │
│  │ abandonFocus  │ ──▶ Music/Podcasts resume                    │
│  └───────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Usage:**
```tsx
import { useAudioFocus } from '@/hooks';

function ConversationManager() {
  const { requestFocus, abandonFocus, checkFocus } = useAudioFocus({
    onFocusGained: () => {
      console.log('Audio focus gained - can speak');
    },
    onFocusLost: (permanent) => {
      if (permanent) {
        console.log('Lost focus permanently - another app took over');
      } else {
        console.log('Lost focus temporarily - will regain soon');
      }
    },
    onDuck: () => {
      console.log('Should lower volume briefly');
    },
  });

  const startSession = async () => {
    // Request audio focus when starting conversation
    const granted = await requestFocus();
    if (granted) {
      console.log('Got audio focus - music paused');
      // Start listening...
    } else {
      console.warn('Could not get audio focus');
    }
  };

  const endSession = async () => {
    // Release audio focus when ending conversation
    await abandonFocus();
    console.log('Released audio focus - music can resume');
  };

  return (
    // ... component JSX
  );
}
```

**Integration with State Machine:**
```tsx
import { useAudioFocus } from '@/hooks';
import { useSessionStore } from '@/store';

function App() {
  const { sessionState, transitionTo } = useSessionStore();
  const { requestFocus, abandonFocus } = useAudioFocus({
    onFocusLost: (permanent) => {
      if (permanent) {
        // Another app took audio - pause our conversation
        transitionTo('ended');
      }
    },
  });

  useEffect(() => {
    if (sessionState === 'connecting') {
      // Request focus when starting
      requestFocus();
    } else if (sessionState === 'ended') {
      // Release focus when ending
      abandonFocus();
    }
  }, [sessionState]);
}
```

**Status:** ✅ Complete (Phase 5)

---

#### useGestures (`src/hooks/useGestures.ts`)

Custom hook for handling gesture control actions. Provides handlers for all 5 gesture buttons with proper state management and integration.

**Purpose:**
- Handle all 5 gesture actions (interrupt, steer, queue, stop, repeat)
- Provide haptic feedback on gesture activation
- Integration with state machine, TTS, STT, and API
- State-aware gesture availability

**Return Type:**
```typescript
interface UseGesturesResult {
  /** Handle a gesture action */
  handleGesture: (action: GestureAction) => Promise<void>;
  /** Check if a gesture is enabled for the current state */
  isGestureEnabled: (action: GestureAction) => boolean;
}
```

**Gesture Actions:**

| Gesture | Action | Description |
|---------|--------|-------------|
| `interrupt` | Stop TTS and return to listening | Stops Xander mid-speech so user can speak |
| `steer` | Prompt for clarification | Allows user to redirect the conversation |
| `queue` | Dispatch to silas-workstation | Saves current context for later processing |
| `stop` | End session gracefully | Says goodbye and ends the conversation |
| `repeat` | Replay last assistant message | Re-speaks the last Xander response |

**Gesture Availability by State:**

| Gesture | idle | connecting | listening | processing | speaking | error | ended |
|---------|------|------------|-----------|------------|----------|-------|-------|
| `interrupt` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `steer` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `queue` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `stop` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `repeat` | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

**Haptic Feedback:**
- 50ms vibration on every gesture activation
- Uses React Native `Vibration.vibrate()` API

**Debouncing:**
- Prevents multiple rapid gesture activations
- Uses a ref to track processing state

**Gesture Handler Implementations:**

| Handler | Actions Performed |
|---------|-------------------|
| `handleInterrupt` | Stop TTS → Transition to listening → Start STT |
| `handleSteer` | Stop TTS → Add steering message → Transition to listening → Speak prompt → Start STT |
| `handleQueue` | Get last messages → Dispatch to silas-workstation → Track in store → Speak confirmation |
| `handleStop` | Stop TTS → Stop STT → Speak goodbye → End API session → End local session |
| `handleRepeat` | Find last assistant message → Stop current TTS → Transition to speaking → Speak message → Return to listening |

**Usage:**
```tsx
import { useGestures } from '@/hooks';

function CustomControls() {
  const { handleGesture, isGestureEnabled } = useGestures();

  return (
    <View>
      <Button
        title="Interrupt"
        onPress={() => handleGesture('interrupt')}
        disabled={!isGestureEnabled('interrupt')}
      />
      <Button
        title="Stop"
        onPress={() => handleGesture('stop')}
        disabled={!isGestureEnabled('stop')}
      />
    </View>
  );
}
```

**Integration with ControlsPanel:**
```tsx
import { ControlsPanel } from '@/components';

// ControlsPanel automatically uses useGestures internally
function ConversationScreen() {
  return (
    <View>
      {/* Other UI */}
      <ControlsPanel />
    </View>
  );
}
```

**Dependencies:**
- `useSessionStore` - For state and transitions
- `useSpeech` - For TTS (speak, stop)
- `useVoice` - For STT (startListening, stopListening)
- `xanderApi` - For dispatch and session management

**Status:** ✅ Complete (Phase 10)

---

### API Layer

#### XanderApi (`src/api/xanderApi.ts`)

Full HTTP client for communicating with the Hermes agent running in Termux on the phone. Uses OpenRouter-compatible chat completion endpoints for AI interactions.

**Purpose:**
- Send user messages to Hermes and receive responses via OpenRouter-compatible endpoint
- Session management (start, end, retrieve sessions)
- Conversation history tracking (local)
- Dispatch block parsing for Silas task suggestions
- Dispatch functionality to silas-workstation
- Health check for Hermes availability
- Handle connection errors gracefully with user-friendly messages

**Configuration:**
| Setting | Default | Description |
|---------|---------|-------------|
| `baseUrl` | `http://localhost:8080` | Hermes agent URL (default Hermes port) |
| `timeout` | `30000` | Request timeout (ms) |

**Hermes Endpoints:**
```typescript
const HERMES_ENDPOINTS = {
  chat: '/v1/chat/completions', // OpenRouter-compatible chat endpoint
  health: '/health',            // Health check endpoint
  session: '/session',          // Session management endpoint
};
```

**Constructor:**
```typescript
const api = new XanderApi({ baseUrl?: string, timeout?: number });
```

**Session Management Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `startSession()` | `Promise<XanderSession>` | Creates a new conversation session. Falls back to local session if server unavailable |
| `endSession()` | `Promise<void>` | Ends the current session (clears session ID and conversation history even if server call fails) |
| `getSession()` | `Promise<XanderSession \| null>` | Retrieves current session data. Returns minimal session with local history if server unreachable |
| `getSessionId()` | `string \| null` | Returns current session ID synchronously |

**Message Handling Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `sendMessage(message)` | `Promise<XanderResponse>` | Sends message to Hermes via OpenRouter chat completion. Auto-creates session, maintains conversation history, parses dispatch blocks. Returns clean response with dispatch metadata |
| `sendChatCompletion(request)` | `Promise<HermesChatResponse>` | Raw OpenRouter-compatible chat completion request for advanced use cases |

**Conversation History Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `getConversationHistory()` | `HermesMessage[]` | Returns a copy of the current conversation history |
| `clearHistory()` | `void` | Clears conversation history without ending the session (useful for topic changes) |

**Dispatch Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `dispatch(request)` | `Promise<DispatchResponse>` | Full dispatch to silas-workstation with DispatchRequest |
| `dispatchToSilas(description)` | `Promise<boolean>` | Legacy method for simple dispatch (deprecated - use dispatch() instead) |

**Health & Configuration Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `healthCheck()` | `Promise<boolean>` | Detects Hermes availability via /health endpoint |
| `getBaseUrl()` | `string` | Returns the current base URL |
| `setBaseUrl(url)` | `void` | Updates the base URL (useful for testing or configuration changes) |

**Hermes-Specific Types:**
```typescript
/**
 * Message format for Hermes/OpenRouter chat API
 */
interface HermesMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Request body for Hermes chat completions (OpenRouter format)
 */
interface HermesChatRequest {
  model?: string;
  messages: HermesMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Choice from Hermes/OpenRouter response
 */
interface HermesChoice {
  index: number;
  message: HermesMessage;
  finish_reason: string | null;
}

/**
 * Raw response from Hermes/OpenRouter chat completions endpoint
 */
interface HermesChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: HermesChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Parsed dispatch information from response content
 */
interface HermesDispatch {
  suggested: boolean;
  summary?: string;
  details?: string;
}

/**
 * Processed chat response with parsed dispatch info
 */
interface HermesChatResponse {
  response: string;        // Clean response without dispatch block
  dispatch?: HermesDispatch;
  rawContent: string;      // Original response with dispatch block
}

/**
 * Session data from Hermes
 */
interface HermesSessionResponse {
  sessionId: string;
  messages: HermesMessage[];
}
```

**Dispatch Block Parsing:**

Hermes responses may contain dispatch blocks when Xander suggests a task for Silas. The API automatically parses and removes these blocks from the displayed response.

**Format:**
```
[DISPATCH_SUGGESTED]
Summary: Brief task description
Details: Detailed task instructions
[/DISPATCH_SUGGESTED]
```

**Parsing Functions:**
| Function | Signature | Description |
|----------|-----------|-------------|
| `parseDispatchBlock(content)` | `(content: string) => HermesDispatch` | Extracts dispatch info from response content. Returns `{ suggested: true, summary, details }` if found, `{ suggested: false }` otherwise |
| `removeDispatchBlock(content)` | `(content: string) => string` | Removes dispatch block from content for clean display. Normalizes whitespace |

**Example Dispatch Block:**
```
User: "Can you research the best coffee grinders under $200?"

Hermes Response:
"That sounds like a good research task for Silas - he can dig deep into reviews and comparisons.

[DISPATCH_SUGGESTED]
Summary: Research best coffee grinders under $200
Details: Find and compare coffee grinders under $200. Look at user reviews, grind consistency, durability, and value. Provide top 3-5 recommendations with pros/cons.
[/DISPATCH_SUGGESTED]"

After parsing:
- response: "That sounds like a good research task for Silas..."
- dispatch.suggested: true
- dispatch.summary: "Research best coffee grinders under $200"
- dispatch.details: "Find and compare coffee grinders..."
```

**Core Types (OpenRouter-compatible):**
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Session {
  id: string;
  messages: Message[];
  createdAt: string;
}

interface SendMessageResponse {
  sessionId: string;
  response: string;
  suggestDispatch?: boolean;
  dispatchSummary?: string;
}

interface DispatchRequest {
  sessionId: string;
  summary: string;
  details: string;
}

interface DispatchResponse {
  success: boolean;
  taskId: string;
  message: string;
}
```

**Legacy Types (backward compatibility):**
```typescript
interface XanderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface XanderSession {
  sessionId: string;
  messages: XanderMessage[];
  createdAt: string;
  updatedAt: string;
}

interface XanderResponse {
  message: string;
  sessionId: string;
  metadata?: {
    dispatchedToSilas?: boolean;
    researchPerformed?: boolean;
    suggestDispatch?: boolean;
    dispatchSummary?: string;
    dispatchDetails?: string;  // New: detailed dispatch information
    [key: string]: unknown;
  };
}

interface XanderApiConfig {
  baseUrl?: string;
  timeout?: number;
}

interface XanderApiError {
  code: string;
  message: string;
  details?: unknown;
}
```

**Error Handling:**

The API converts axios errors to user-friendly `XanderApiError` objects:

| Error Code | Condition | Message |
|------------|-----------|---------|
| `CONNECTION_REFUSED` | Cannot connect to Hermes | "Cannot connect to Hermes. Make sure Hermes is running in Termux." |
| `TIMEOUT` | Request timed out | "Request to Hermes timed out. Please try again." |
| `NETWORK_ERROR` | Network unreachable | "Network error. Check your connection and make sure Hermes is running." |
| `BAD_REQUEST` | HTTP 400 | Server-provided message or "Invalid request. Please check your input." |
| `UNAUTHORIZED` | HTTP 401 | "Authentication required." |
| `NOT_FOUND` | HTTP 404 | "The requested resource was not found." |
| `SERVER_ERROR` | HTTP 500 | "Hermes encountered an internal error. Please try again." |
| `SERVICE_UNAVAILABLE` | HTTP 503 | "Hermes is temporarily unavailable. Please try again later." |
| `INVALID_MESSAGE` | Empty message sent | "Message cannot be empty" |
| `INVALID_RESPONSE` | No response from Hermes | "No response from Hermes" |

**Graceful Fallbacks:**
- `startSession()`: Creates local session (`local-session-{timestamp}`) when server unavailable
- `getSession()`: Returns minimal session object with local conversation history when server unreachable
- `endSession()`: Clears local session ID and conversation history even if server call fails

**Status:** ✅ Complete (Updated for Hermes integration)

**Usage Examples:**

Basic conversation with Hermes:
```tsx
import { xanderApi } from '@/api';

// Send a message (auto-creates session if needed)
const response = await xanderApi.sendMessage("Hello Xander");
console.log(response.message); // Clean response without dispatch block

// Check if dispatch was suggested
if (response.metadata?.suggestDispatch) {
  console.log('Dispatch suggestion:', response.metadata.dispatchSummary);
  console.log('Details:', response.metadata.dispatchDetails);
}
```

Conversation history management:
```tsx
import { xanderApi } from '@/api';

// Send multiple messages (history is maintained)
await xanderApi.sendMessage("Hello!");
await xanderApi.sendMessage("What's the weather like?");

// Get conversation history
const history = xanderApi.getConversationHistory();
console.log('Messages in history:', history.length);

// Clear history to start a new topic without new session
xanderApi.clearHistory();
```

Session management:
```tsx
import { xanderApi } from '@/api';

// Start a session explicitly
const session = await xanderApi.startSession();
console.log('Session ID:', session.sessionId);

// Get current session
const currentSession = await xanderApi.getSession();

// End session when done (clears history)
await xanderApi.endSession();
```

Advanced: Raw chat completion:
```tsx
import { xanderApi, HermesChatRequest } from '@/api';

// Send raw OpenRouter-compatible request
const request: HermesChatRequest = {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing briefly.' }
  ],
  temperature: 0.7,
  max_tokens: 500
};

const result = await xanderApi.sendChatCompletion(request);
console.log('Response:', result.response);
console.log('Raw content:', result.rawContent);
if (result.dispatch?.suggested) {
  console.log('Dispatch suggested:', result.dispatch.summary);
}
```

Dispatching work to Silas:
```tsx
import { xanderApi } from '@/api';

// Full dispatch with details
const result = await xanderApi.dispatch({
  sessionId: xanderApi.getSessionId()!,
  summary: 'Create a new React component',
  details: 'Build a button component with hover states and accessibility support'
});

if (result.success) {
  console.log('Task created:', result.taskId);
}

// Simple dispatch (legacy)
const success = await xanderApi.dispatchToSilas('Create a new component');
```

Health check and configuration:
```tsx
import { xanderApi } from '@/api';

// Check if Hermes is available
const isAvailable = await xanderApi.healthCheck();
if (!isAvailable) {
  console.log('Hermes is not running');
}

// Update base URL for testing
xanderApi.setBaseUrl('http://192.168.1.100:8080');
console.log('Current URL:', xanderApi.getBaseUrl());
```

Custom instance:
```tsx
import XanderApi from '@/api';

// Create custom instance with different config
const customApi = new XanderApi({
  baseUrl: 'http://custom-host:8080',
  timeout: 60000 // 60 seconds
});
```

Parsing dispatch blocks manually:
```tsx
import { parseDispatchBlock, removeDispatchBlock } from '@/api';

const content = `Here's my response.

[DISPATCH_SUGGESTED]
Summary: Research task
Details: Research the topic thoroughly
[/DISPATCH_SUGGESTED]`;

const dispatch = parseDispatchBlock(content);
if (dispatch.suggested) {
  console.log('Summary:', dispatch.summary);
  console.log('Details:', dispatch.details);
}

const cleanContent = removeDispatchBlock(content);
console.log('Display:', cleanContent); // "Here's my response."
```

---

### State Management

The state management module implements a state machine for the voice conversation flow with validated transitions and inactivity tracking.

#### types.ts (`src/store/types.ts`)

Type definitions and utilities for the state machine.

**Purpose:**
- Define all conversation states
- Define valid state transitions
- Provide transition validation
- Goodbye keyword detection
- Session timeout constants

**ConversationState Type:**
```typescript
type ConversationState =
  | 'idle'       // App just opened, no active session
  | 'connecting' // Connecting to Xander (health check, session start)
  | 'listening'  // Actively listening for user speech
  | 'processing' // Processing user speech, sending to Xander
  | 'speaking'   // TTS playing Xander's response
  | 'error'      // An error occurred
  | 'ended';     // Session has ended (final state)
```

**Valid State Transitions:**

| From State | Valid To States |
|------------|-----------------|
| `idle` | `connecting` |
| `connecting` | `listening`, `error` |
| `listening` | `processing`, `error`, `ended` |
| `processing` | `speaking`, `error`, `ended` |
| `speaking` | `listening`, `error`, `ended` |
| `error` | `idle`, `connecting`, `ended` |
| `ended` | `idle` |

**Constants:**
```typescript
// Session timeout configuration
const SESSION_TIMEOUT = {
  INACTIVITY_MS: 30000,  // 30 seconds inactivity timeout
  WARNING_MS: 25000,     // 25 seconds before warning
};

// Keywords that trigger session end
const GOODBYE_KEYWORDS = [
  'goodbye', 'bye', 'see you', 'talk to you later',
  'end session', 'stop', 'quit', 'exit'
];
```

**Utility Functions:**
| Function | Signature | Description |
|----------|-----------|-------------|
| `isValidTransition` | `(from: ConversationState, to: ConversationState) => boolean` | Check if a state transition is valid |
| `containsGoodbye` | `(text: string) => boolean` | Check if text contains a goodbye keyword |

**Usage:**
```typescript
import {
  ConversationState,
  VALID_TRANSITIONS,
  isValidTransition,
  containsGoodbye,
  SESSION_TIMEOUT,
  GOODBYE_KEYWORDS,
} from '@/store';

// Validate transition
if (isValidTransition('listening', 'processing')) {
  // Valid transition
}

// Check for goodbye
if (containsGoodbye('goodbye everyone')) {
  // End session
}
```

---

#### sessionStore (`src/store/sessionStore.ts`)

Zustand store for managing conversation session state with validated state transitions.

**Purpose:**
- Implement state machine with validated transitions
- Track inactivity for 30-second timeout
- Store conversation messages
- Track dispatched work to Silas
- Centralize state management
- Error handling

**State:**
| Property | Type | Description |
|----------|------|-------------|
| `sessionId` | `string \| null` | Current session ID |
| `sessionState` | `ConversationState` | Current state machine state |
| `sessionStartedAt` | `number \| null` | Session start timestamp |
| `lastActivity` | `number` | Last activity timestamp (for inactivity tracking) |
| `messages` | `Message[]` | Conversation history |
| `currentTranscript` | `string` | In-progress transcript (partial recognition) |
| `lastXanderResponse` | `string` | Last Xander message |
| `dispatchedWork` | `DispatchedWork[]` | Dispatched items to Silas |
| `error` | `string \| null` | Error message |

**Actions:**
| Action | Signature | Description |
|--------|-----------|-------------|
| `startSession()` | `() => void` | Initialize new session (idle → connecting) |
| `endSession()` | `() => void` | End current session (any → ended) |
| `setSessionState(state)` | `(state: ConversationState) => void` | Update session state directly (**deprecated**, use `transitionTo`) |
| `transitionTo(state)` | `(state: ConversationState) => boolean` | Transition to new state with validation, returns success |
| `addMessage(role, content)` | `(role: 'user' \| 'assistant', content: string) => void` | Add message to history |
| `setCurrentTranscript(text)` | `(text: string) => void` | Update in-progress transcript |
| `setLastXanderResponse(response)` | `(response: string) => void` | Set last Xander response |
| `addDispatchedWork(desc)` | `(desc: string) => void` | Track dispatched work |
| `updateDispatchedWork(id, status)` | `(id: string, status: 'pending' \| 'completed' \| 'failed') => void` | Update dispatch status |
| `setError(error)` | `(error: string \| null) => void` | Set error state |
| `updateActivity()` | `() => void` | Update lastActivity timestamp |
| `getTimeSinceLastActivity()` | `() => number` | Get milliseconds since last activity |
| `isInactive()` | `() => boolean` | Check if session is inactive (>30s) |
| `reset()` | `() => void` | Reset to initial state |

**Inactivity Tracking:**

All state-changing actions automatically update `lastActivity`:
- `startSession()`
- `endSession()`
- `setSessionState()`
- `transitionTo()`
- `addMessage()`
- `setCurrentTranscript()`
- `setLastXanderResponse()`
- `addDispatchedWork()`
- `updateDispatchedWork()`
- `setError()`

**Usage:**
```tsx
import { useSessionStore, containsGoodbye, SESSION_TIMEOUT } from '@/store';

function ConversationManager() {
  const {
    sessionState,
    transitionTo,
    startSession,
    addMessage,
    updateActivity,
    getTimeSinceLastActivity,
    isInactive,
  } = useSessionStore();

  // Start session
  startSession(); // idle → connecting

  // Validated transition
  const success = transitionTo('listening'); // connecting → listening
  if (!success) {
    console.warn('Invalid transition');
  }

  // Check inactivity
  if (isInactive()) {
    // User inactive for 30+ seconds
    endSession();
  }

  // Add message
  addMessage('user', 'Hello Xander');
}
```

---

### Types

Type definitions for gesture controls and related functionality.

#### gestures.ts (`src/types/gestures.ts`)

Type definitions and configuration for the 5-button gesture control system.

**Purpose:**
- Define all gesture action types
- Define gesture configuration interface
- Provide gesture configuration constants (GESTURE_CONFIGS)
- Button size presets and utilities

**GestureAction Type:**
```typescript
type GestureAction =
  | 'interrupt'  // Stop Xander, return to listening
  | 'steer'      // Insert clarification
  | 'queue'      // Queue current topic for dispatch
  | 'stop'       // End session
  | 'repeat';    // Repeat last response
```

**GestureConfig Interface:**
```typescript
interface GestureConfig {
  /** The action this gesture performs */
  action: GestureAction;
  /** Emoji icon for the button */
  icon: string;
  /** Short label for the button */
  label: string;
  /** Longer description for accessibility */
  description: string;
  /** Button background color */
  color: string;
}
```

**GestureButtonSize Type:**
```typescript
type GestureButtonSize = 'small' | 'medium' | 'large';

interface GestureButtonSizeConfig {
  width: number;
  height: number;
  fontSize: number;
}
```

**GESTURE_CONFIGS Constant:**

| Action | Icon | Label | Description | Color |
|--------|------|-------|-------------|-------|
| `interrupt` | 🤚 | Interrupt | Stop and let me speak | `#FF6B6B` (Red) |
| `steer` | 🎯 | Steer | Let me clarify something | `#4ECDC4` (Teal) |
| `queue` | 📋 | Queue | Save this for silas-workstation | `#45B7D1` (Blue) |
| `stop` | ⏹️ | Stop | End conversation | `#96CEB4` (Green) |
| `repeat` | 🔄 | Repeat | Say that again | `#DDA0DD` (Purple) |

**Color Design:**
- **Red (Interrupt)**: Stop action, urgent
- **Teal (Steer)**: Guidance/direction
- **Blue (Queue)**: Task/action
- **Green (Stop)**: Calm, session end
- **Purple (Repeat)**: Playback/refresh

**Button Size Presets:**
```typescript
const GESTURE_BUTTON_SIZES: Record<GestureButtonSize, GestureButtonSizeConfig> = {
  small:  { width: 60,  height: 60,  fontSize: 24 },
  medium: { width: 80,  height: 80,  fontSize: 32 },
  large:  { width: 100, height: 100, fontSize: 40 },
};
```

**Utility Functions:**
| Function | Returns | Description |
|----------|---------|-------------|
| `getGestureConfig(action)` | `GestureConfig` | Get config for a specific action |
| `getGestureActions()` | `GestureAction[]` | Get all actions in display order |
| `getTopRowGestures()` | `GestureAction[]` | Get top row actions (4 buttons) |
| `getBottomRowGestures()` | `GestureAction[]` | Get bottom row actions (repeat only) |

**Usage:**
```typescript
import {
  GestureAction,
  GestureConfig,
  GestureButtonSize,
  GESTURE_CONFIGS,
  GESTURE_BUTTON_SIZES,
  getGestureConfig,
  getGestureActions,
  getTopRowGestures,
  getBottomRowGestures,
} from '@/types/gestures';

// Get config for a specific gesture
const interruptConfig = getGestureConfig('interrupt');
console.log(interruptConfig.icon); // '🤚'

// Get all gestures for rendering
const allGestures = getGestureActions();
// ['interrupt', 'steer', 'queue', 'stop', 'repeat']

// Get gestures by row
const topRow = getTopRowGestures();     // ['interrupt', 'steer', 'queue', 'stop']
const bottomRow = getBottomRowGestures(); // ['repeat']

// Access config directly
const config = GESTURE_CONFIGS.queue;
console.log(config.color); // '#45B7D1'
```

**Status:** ✅ Complete (Phase 10)

---

### Native Modules

Native modules provide platform-specific functionality that cannot be achieved with JavaScript alone. These modules are written in Kotlin (Android) and integrated with React Native.

#### Location

Native modules are located in `mobile/native-modules/android/` and must be copied to the generated `android/` directory after running Expo prebuild.

#### AudioFocusManager (`native-modules/android/com/xandervoice/`)

The AudioFocusManager native module handles Android audio focus management.

**Files:**
| File | Purpose |
|------|---------|
| `AudioFocusModule.kt` | Main module implementation with focus management logic |
| `AudioFocusPackage.kt` | React Native package registration |

**Purpose:**
- Request audio focus from the Android system
- Abandon audio focus to let other apps resume
- Emit events when focus state changes
- Support Android 8.0+ (API 26+) AudioFocusRequest API with fallback for older versions

**Native Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `requestFocus()` | `Promise<boolean>` | Request transient audio focus. Returns true if granted. |
| `abandonFocus()` | `Promise<boolean>` | Release audio focus. Returns true on success. |
| `hasFocus()` | `Promise<boolean>` | Check if we currently have audio focus. |

**Events:**
| Event | Payload | Description |
|-------|---------|-------------|
| `audioFocusGained` | `null` | Fired when we gain audio focus |
| `audioFocusLost` | `{ permanent: boolean }` | Fired when we lose audio focus |
| `audioFocusDuck` | `null` | Fired when we should lower volume briefly |

**Integration:**

After running `npx expo prebuild --platform android`:

1. Copy the native module files:
   ```bash
   cp -r native-modules/android/com/xandervoice/* \
     android/app/src/main/java/com/xandervoice/
   ```

2. Register the package in `MainApplication.kt`:
   ```kotlin
   override fun getPackages(): List<ReactPackage> =
     PackageList(this).packages.apply {
       add(AudioFocusPackage())
     }
   ```

See `mobile/native-modules/android/README.md` for detailed integration instructions.

**Usage from JavaScript:**
```typescript
// Using the native module directly
import { NativeModules, NativeEventEmitter } from 'react-native';

const { AudioFocusManager } = NativeModules;
const eventEmitter = new NativeEventEmitter(AudioFocusManager);

// Request audio focus (pauses other audio)
const granted = await AudioFocusManager.requestFocus();

// Check if we have focus
const hasFocus = await AudioFocusManager.hasFocus();

// Abandon focus (lets other audio resume)
await AudioFocusManager.abandonFocus();

// Listen for focus changes
eventEmitter.addListener('audioFocusGained', () => {
  console.log('Audio focus gained');
});

eventEmitter.addListener('audioFocusLost', (event) => {
  console.log('Audio focus lost, permanent:', event.permanent);
});
```

**Recommended Usage:**

Use the `useAudioFocus` hook instead of the native module directly. The hook provides:
- Automatic event listener cleanup
- Platform-aware behavior (no-op on iOS)
- React lifecycle integration
- Callback-based API

```typescript
import { useAudioFocus } from '@/hooks';

const { requestFocus, abandonFocus, checkFocus } = useAudioFocus({
  onFocusGained: () => console.log('Got focus'),
  onFocusLost: (permanent) => console.log('Lost focus', permanent),
  onDuck: () => console.log('Should duck'),
});
```

**Status:** ✅ Complete (Phase 5)

---

### Utilities

#### audioFocus (`src/utils/audioFocus.ts`)

Legacy utility functions for Android audio focus management. **Deprecated in favor of the `useAudioFocus` hook.**

**Purpose:**
- Pause other audio apps when Xander starts
- Resume other audio when session ends
- Manage audio ducking

**Audio Focus Types:**
| Type | Use Case |
|------|----------|
| `GAIN` | Permanent focus (not recommended) |
| `GAIN_TRANSIENT` | Temporary focus, pause others |
| `GAIN_TRANSIENT_MAY_DUCK` | Temporary focus, duck others |
| `GAIN_TRANSIENT_EXCLUSIVE` | Exclusive temporary focus |

**Functions:**
| Function | Description |
|----------|-------------|
| `requestAudioFocus(type)` | Request audio focus |
| `abandonAudioFocus()` | Release audio focus |
| `getAudioFocusState()` | Get current state |
| `addAudioFocusListener(callback)` | Listen for changes |
| `takeAudioFocusForConversation()` | High-level: start session |
| `releaseAudioFocusAfterConversation()` | High-level: end session |

**Status:** ⚠️ Legacy - Use `useAudioFocus` hook instead

**Migration:**

```tsx
// OLD (deprecated utility)
import { takeAudioFocusForConversation, releaseAudioFocusAfterConversation } from '@/utils';

await takeAudioFocusForConversation();
await releaseAudioFocusAfterConversation();

// NEW (recommended hook)
import { useAudioFocus } from '@/hooks';

const { requestFocus, abandonFocus } = useAudioFocus();

await requestFocus();
await abandonFocus();
```

---

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~54.0 | React Native framework |
| `react` | 19.1.x | UI library |
| `react-native` | 0.81.x | Mobile platform |
| `expo-speech` | ~14.0 | Text-to-Speech |
| `expo-speech-recognition` | ^3.1 | Speech-to-Text |
| `@react-navigation/native` | ^7.2 | Navigation |
| `@react-navigation/stack` | ^7.8 | Stack navigation |
| `react-native-screens` | ~4.16 | Native screens |
| `react-native-safe-area-context` | ~5.6 | Safe area handling |
| `react-native-gesture-handler` | ~2.28 | Gesture handling |
| `zustand` | ^5.0 | State management |
| `axios` | ^1.16 | HTTP client |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ~5.9 | Type checking |
| `@types/react` | ~19.1 | React type definitions |
| `jest` | ^30.3 | Testing framework |
| `@types/jest` | ^30.0 | Jest type definitions |
| `jest-expo` | ^55.0 | Expo Jest preset |
| `jest-environment-jsdom` | ^30.3 | DOM environment for tests |
| `@testing-library/react-native` | ^13.3 | React Native testing utilities |
| `react-test-renderer` | ^19.1 | React test renderer |
| `babel-jest` | ^30.3 | Babel transform for Jest |
| `@babel/preset-env` | ^7.28 | Babel environment preset |
| `@babel/preset-react` | ^7.27 | React Babel preset |
| `@babel/preset-typescript` | ^7.27 | TypeScript Babel preset |

---

## Design Patterns

### Barrel Exports

Each directory has an `index.ts` that re-exports its contents:

```typescript
// src/hooks/index.ts
export { useVoice } from './useVoice';
export { useSpeech } from './useSpeech';
export { useAudioFocus } from './useAudioFocus';
export { useGestures } from './useGestures';

// src/components/index.ts
export * from './ui';
export { GestureButton } from './GestureButton';
export { ControlsPanel } from './ControlsPanel';

// src/types/index.ts
export * from './gestures';
```

This enables clean imports:
```typescript
import { useVoice, useSpeech, useAudioFocus, useGestures } from '@/hooks';
import { VoiceButton, GestureButton, ControlsPanel } from '@/components';
import { GestureAction, GESTURE_CONFIGS } from '@/types';
```

### Custom Hooks

Encapsulate complex logic in custom hooks:
- `useVoice` - Voice recognition logic
- `useSpeech` - Speech synthesis logic
- `useAudioFocus` - Android audio focus management
- `useGestures` - Gesture control handler

### Zustand for State

Global state management with Zustand:
- Simple, minimal boilerplate
- TypeScript support
- No providers required
- Actions co-located with state

### Path Aliases

TypeScript path aliases for cleaner imports:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Adding New Features

### Adding a New Component

1. Create component in `src/components/ui/`:
   ```tsx
   // src/components/ui/NewComponent.tsx
   export function NewComponent() { ... }
   ```

2. Export from barrel:
   ```tsx
   // src/components/ui/index.ts
   export { NewComponent } from './NewComponent';
   ```

3. Import and use:
   ```tsx
   import { NewComponent } from '@/components/ui';
   ```

### Adding a New Hook

1. Create hook in `src/hooks/`:
   ```tsx
   // src/hooks/useNewFeature.ts
   export function useNewFeature() { ... }
   ```

2. Export from barrel:
   ```tsx
   // src/hooks/index.ts
   export { useNewFeature } from './useNewFeature';
   ```

### Adding Store Slices

Extend the existing store or create a new one:

```tsx
// src/store/newStore.ts
import { create } from 'zustand';

interface NewStoreState {
  value: string;
  setValue: (v: string) => void;
}

export const useNewStore = create<NewStoreState>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}));
```

---

## Related Documentation

- [Setup Guide](./setup.md) - Installation instructions
- [Mobile Overview](./README.md) - Quick start guide
- [Project Plan](../../plans/xander-voice-app-plan.md) - Full specification

---

*Last updated: Phase 10 Gesture Controls - Added GestureButton component, ControlsPanel container, useGestures hook, and gesture types (Issue #11)*
