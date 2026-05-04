# Xander Voice App - Architecture

This document describes the technical architecture of the Xander Voice App, including module structure, dependencies, and design patterns.

## Overview

The Xander Voice App is built with React Native (Expo) and follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│                    (Main Entry Point)                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Components  │  │   Hooks     │  │    Store (Zustand)      │  │
│  │             │  │             │  │                         │  │
│  │ VoiceButton │  │ useVoice    │  │ sessionStore            │  │
│  │             │  │ useSpeech   │  │ • sessionState          │  │
│  │             │  │             │  │ • messages              │  │
│  └─────────────┘  └─────────────┘  │ • dispatchedWork        │  │
│                                     └─────────────────────────┘  │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐    │
│  │         API Layer           │  │       Utilities          │    │
│  │                             │  │                         │    │
│  │ xanderApi                   │  │ audioFocus              │    │
│  │ • sendMessage()            │  │ • requestAudioFocus()   │    │
│  │ • startSession()           │  │ • abandonAudioFocus()   │    │
│  │ • dispatchToSilas()        │  │                         │    │
│  └─────────────────────────────┘  └─────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
mobile/
├── App.tsx                          # Main application entry
├── index.ts                         # Expo entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
├── assets/                          # Static assets (icons, images)
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash-icon.png
│   └── favicon.png
└── src/
    ├── api/                         # API clients
    │   ├── index.ts                 # Barrel export
    │   └── xanderApi.ts             # Xander HTTP client
    ├── components/                  # React components
    │   ├── index.ts                 # Barrel export
    │   └── ui/                      # UI components
    │       ├── index.ts             # Barrel export
    │       └── VoiceButton.tsx      # Voice button component
    ├── hooks/                       # Custom React hooks
    │   ├── index.ts                 # Barrel export
    │   ├── useVoice.ts              # Speech-to-Text hook
    │   └── useSpeech.ts             # Text-to-Speech hook
    ├── store/                       # State management
    │   ├── index.ts                 # Barrel export
    │   └── sessionStore.ts          # Zustand session store
    └── utils/                       # Utility functions
        ├── index.ts                 # Barrel export
        └── audioFocus.ts            # Audio focus utilities
```

## Module Documentation

### App.tsx - Main Entry Point

The main application component that orchestrates the voice interface.

**Purpose:**
- Renders the main UI layout
- Manages app-level state (idle, listening, processing, speaking)
- Coordinates voice button interactions
- Displays conversation context and session info

**State Machine:**
```
idle → listening → processing → speaking → idle
         ↓                         ↓
       (tap)                    (timeout)
         ↓                         ↓
       idle                      idle
```

**Key Functions:**
- `handleVoiceButtonPress()` - Start/stop listening
- `handleGoodbye()` - End conversation session
- `getVoiceButtonState()` - Map app state to button state

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

### Hooks

#### useVoice (`src/hooks/useVoice.ts`)

Custom hook for Speech-to-Text (STT) functionality.

**Purpose:**
- Wrap expo-speech-recognition for voice recognition
- Manage listening state and transcripts
- Handle permissions and errors

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `isListening` | `boolean` | Currently listening |
| `transcript` | `string` | Final recognized text |
| `partialTranscript` | `string` | Partial recognition results |
| `error` | `string \| null` | Error message |
| `startListening` | `() => Promise<void>` | Start recognition |
| `stopListening` | `() => Promise<void>` | Stop recognition |
| `resetTranscript` | `() => void` | Clear transcript |

**Status:** Placeholder - full implementation in Phase 2

**Usage:**
```tsx
import { useVoice } from '@/hooks';

const { isListening, transcript, startListening, stopListening } = useVoice();
```

---

#### useSpeech (`src/hooks/useSpeech.ts`)

Custom hook for Text-to-Speech (TTS) functionality.

**Purpose:**
- Wrap expo-speech for text synthesis
- Manage speaking state
- Support voice selection and options

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `isSpeaking` | `boolean` | Currently speaking |
| `isPaused` | `boolean` | Speech paused (iOS only) |
| `error` | `string \| null` | Error message |
| `speak` | `(text: string, options?) => Promise<void>` | Speak text |
| `stop` | `() => Promise<void>` | Stop speaking |
| `pause` | `() => Promise<void>` | Pause (iOS only) |
| `resume` | `() => Promise<void>` | Resume (iOS only) |
| `getAvailableVoices` | `() => Promise<Voice[]>` | List voices |

**Speech Options:**
```typescript
interface SpeechOptions {
  language?: string;   // e.g., 'en-US'
  pitch?: number;      // 0.5 to 2.0
  rate?: number;       // 0.5 to 2.0
  volume?: number;     // 0.0 to 1.0
  voice?: string;      // Voice identifier
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}
```

**Usage:**
```tsx
import { useSpeech } from '@/hooks';

const { isSpeaking, speak, stop } = useSpeech();

await speak("Hello, I'm Xander!", { rate: 1.1 });
```

---

### API Layer

#### XanderApi (`src/api/xanderApi.ts`)

HTTP client for communicating with the Xander agent.

**Purpose:**
- Send user messages to Xander
- Receive responses
- Manage sessions
- Dispatch work to Silas

**Configuration:**
| Setting | Default | Description |
|---------|---------|-------------|
| `baseUrl` | `http://localhost:3000` | Xander agent URL |
| `timeout` | `30000` | Request timeout (ms) |

**Methods:**
| Method | Returns | Description |
|--------|---------|-------------|
| `sendMessage(message)` | `XanderResponse` | Send message, get response |
| `startSession()` | `XanderSession` | Start new conversation |
| `endSession()` | `void` | End current conversation |
| `getSession()` | `XanderSession \| null` | Get current session |
| `healthCheck()` | `boolean` | Check agent availability |
| `dispatchToSilas(work)` | `boolean` | Dispatch work to Silas |

**Types:**
```typescript
interface XanderResponse {
  message: string;
  sessionId: string;
  metadata?: {
    dispatchedToSilas?: boolean;
    researchPerformed?: boolean;
  };
}

interface XanderSession {
  sessionId: string;
  messages: XanderMessage[];
  createdAt: string;
  updatedAt: string;
}
```

**Status:** Placeholder - full implementation in Phase 3

**Usage:**
```tsx
import { xanderApi } from '@/api';

const response = await xanderApi.sendMessage("Hello Xander");
```

---

### State Management

#### sessionStore (`src/store/sessionStore.ts`)

Zustand store for managing conversation session state.

**Purpose:**
- Track session state machine
- Store conversation messages
- Track dispatched work
- Centralize state management

**State:**
| Property | Type | Description |
|----------|------|-------------|
| `sessionId` | `string \| null` | Current session ID |
| `sessionState` | `SessionState` | Current state |
| `sessionStartedAt` | `number \| null` | Session start timestamp |
| `messages` | `Message[]` | Conversation history |
| `currentTranscript` | `string` | In-progress transcript |
| `lastXanderResponse` | `string` | Last Xander message |
| `dispatchedWork` | `DispatchedWork[]` | Dispatched items |
| `error` | `string \| null` | Error message |

**Session States:**
```typescript
type SessionState =
  | 'idle'       // No active session
  | 'starting'   // Initializing
  | 'listening'  // Listening for speech
  | 'processing' // Processing speech
  | 'thinking'   // Waiting for Xander
  | 'speaking'   // Xander speaking
  | 'ending'     // Session ending
  | 'error';     // Error state
```

**Actions:**
| Action | Description |
|--------|-------------|
| `startSession()` | Initialize new session |
| `endSession()` | End current session |
| `setSessionState(state)` | Update session state |
| `addMessage(role, content)` | Add message to history |
| `setCurrentTranscript(text)` | Update in-progress transcript |
| `addDispatchedWork(desc)` | Track dispatched work |
| `setError(error)` | Set error state |
| `reset()` | Reset to initial state |

**Usage:**
```tsx
import { useSessionStore } from '@/store';

// In component
const { sessionState, startSession, addMessage } = useSessionStore();

// Start session
startSession();

// Add message
addMessage('user', 'Hello Xander');
```

---

### Utilities

#### audioFocus (`src/utils/audioFocus.ts`)

Utilities for Android audio focus management.

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

**Status:** Placeholder - requires native module in Phase 5

**Usage:**
```tsx
import { takeAudioFocusForConversation, releaseAudioFocusAfterConversation } from '@/utils';

// When starting conversation
await takeAudioFocusForConversation();

// When ending conversation
await releaseAudioFocusAfterConversation();
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

---

## Design Patterns

### Barrel Exports

Each directory has an `index.ts` that re-exports its contents:

```typescript
// src/hooks/index.ts
export { useVoice } from './useVoice';
export { useSpeech } from './useSpeech';
```

This enables clean imports:
```typescript
import { useVoice, useSpeech } from '@/hooks';
```

### Custom Hooks

Encapsulate complex logic in custom hooks:
- `useVoice` - Voice recognition logic
- `useSpeech` - Speech synthesis logic

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

*Last updated: Phase 1 - Expo Project Setup*
