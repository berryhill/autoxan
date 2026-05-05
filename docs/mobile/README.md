# Xander Voice App

The Xander Voice App is a React Native application built with Expo that provides a natural voice interface for conversations with the **Hermes Agent** (Xander personality).

## Overview

**Trigger:** "Hey Google, talk to Xander"

The app provides a hands-free, eyes-free conversational experience - perfect for driving, walking, or multitasking. Xander listens, thinks with you, does quick research, and helps you work through ideas organically.

### Backend: Hermes Agent

The voice app communicates with **Hermes Agent** running in Termux on the Android device. Hermes provides:

- **SOUL.md Personality** - Xander's conversational behavior and tone
- **Memory Persistence** - Remembers user preferences across sessions
- **OpenRouter Integration** - Access to 200+ LLM models via cloud API
- **MCP Protocol** - Dispatch tasks to Silas workstation

See the [Hermes Documentation](../hermes/README.md) for complete backend details.

## Features

### Current (Phase 11)

- ✅ Basic voice interface UI with VoiceButton component
- ✅ **Speech-to-Text (STT)** - Full implementation using `expo-speech-recognition`
  - Microphone permission handling
  - Partial (interim) and final transcript results
  - Configurable options: language, continuous mode, punctuation
  - Error handling with user-friendly messages
- ✅ **Text-to-Speech (TTS)** - Enhanced implementation using `expo-speech`
  - Speak text with configurable pitch, rate, volume, language
  - Pause/resume support (iOS)
  - Voice selection and listing
  - Input validation and max length handling
- ✅ Session state management with Zustand
- ✅ **Hermes API integration** (Phase 3)
  - Full HTTP client for Hermes Agent communication via OpenRouter-compatible endpoint
  - Session management (start, end, retrieve)
  - Dispatch block parsing for Silas tasks
  - Health check and graceful error handling
- ✅ **State machine for voice flow** (Phase 4)
  - Complete conversation loop with state validation
  - 30-second inactivity timeout
  - Goodbye keyword detection
  - Validated state transitions
- ✅ **Audio Focus Management** (Phase 5)
  - Native Android `AudioFocusModule` in Kotlin
  - `useAudioFocus` hook with React lifecycle integration
  - Pauses music/podcasts when Xander speaks
  - Resumes other audio when conversation ends
  - Platform-aware (Android-only, no-op on iOS)
  - Event callbacks: onFocusGained, onFocusLost, onDuck
- ✅ **Gesture Controls** (Phase 10)
  - 5-button control system for hands-free conversation management
  - **Interrupt** (🤚): Stop Xander mid-speech, return to listening
  - **Steer** (🎯): Let me clarify - guide the conversation
  - **Queue** (📋): Save this for later - dispatch to silas-workstation
  - **Stop** (⏹️): End session gracefully
  - **Repeat** (🔄): Say that again - replay last response
  - Haptic feedback on button press (50ms vibration)
  - Visual feedback with animated scale effects
  - Full accessibility support (labels and hints)
  - State-aware button enabling/disabling
- ✅ **End-to-End Testing Suite** (Phase 11)
  - 164+ E2E tests covering complete user flows
  - Dual-mode testing: mocked (CI/CD) and integration (real Hermes)
  - Test categories: Conversation, Dispatch, Gestures, Audio Focus, Errors
  - Automated test runner script (`run-e2e.sh`)
  - Manual testing checklists for device validation
- ✅ Android permissions configured (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS)
- ✅ **Unit testing infrastructure** with Jest and React Native Testing Library
  - 234+ unit tests covering all hooks, API, and store

### Planned

- ⏳ Advanced conversation features (Phase 12+)

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm
- Expo CLI (`npm install -g expo-cli`)
- Android Studio with emulator OR physical Android device
- Expo Go app (for development on physical device)

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android
npm run android
```

For detailed setup instructions, see [Setup Guide](./setup.md).

## Project Structure

```
mobile/
├── App.tsx                          # Main app entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── jest.setup.ts                    # Test environment setup
├── native-modules/                  # Native platform modules
│   └── android/                     # Android native modules
│       ├── README.md                # Integration instructions
│       └── com/xandervoice/         # Kotlin source files
│           ├── AudioFocusModule.kt  # Audio focus native module
│           └── AudioFocusPackage.kt # React package registration
├── src/
│   ├── components/
│   │   ├── GestureButton.tsx        # Animated gesture button component
│   │   ├── ControlsPanel.tsx        # Gesture controls container (5 buttons)
│   │   ├── index.ts                 # Barrel export
│   │   └── ui/
│   │       └── VoiceButton.tsx      # Voice button component
│   ├── hooks/
│   │   ├── useVoice.ts              # Speech-to-Text hook
│   │   ├── useSpeech.ts             # Text-to-Speech hook
│   │   ├── useAudioFocus.ts         # Audio focus management hook
│   │   ├── useGestures.ts           # Gesture handler hook
│   │   └── index.ts                 # Barrel export
│   ├── types/
│   │   ├── gestures.ts              # Gesture type definitions & GESTURE_CONFIGS
│   │   └── index.ts                 # Barrel export
│   ├── api/
│   │   └── xanderApi.ts             # Hermes HTTP client (OpenRouter-compatible)
│   ├── store/
│   │   └── sessionStore.ts          # Zustand state management
│   └── utils/
│       └── audioFocus.ts            # Audio focus utilities (legacy)
└── tests/
    └── e2e/                         # End-to-End test suite
        ├── setup.ts                 # Test environment and mock fixtures
        ├── conversation.test.ts     # Conversation flow tests (21 tests)
        ├── dispatch.test.ts         # Dispatch flow tests (19 tests)
        ├── gestures.test.ts         # Gesture control tests (40 tests)
        ├── audioFocus.test.ts       # Audio focus tests (28 tests)
        ├── errors.test.ts           # Error scenario tests (47 tests)
        └── run-e2e.sh               # Automated test runner script
```

For detailed architecture information, see [Architecture Guide](./architecture.md).

## Documentation

- **[Setup Guide](./setup.md)** - Complete setup instructions
- **[Architecture](./architecture.md)** - Technical architecture and modules
- **[E2E Testing Guide](./e2e-testing.md)** - End-to-end testing documentation
- **[Hermes Backend](../hermes/README.md)** - AI backend overview and API reference
- **[Hermes Architecture](../hermes/architecture.md)** - Backend architecture and data flow
- **[Hermes Testing](../hermes/testing.md)** - API integration testing guide
- **[Project Plan](../../plans/xander-voice-app-plan.md)** - Full project specification

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | React Native (Expo) | 54.x |
| Language | TypeScript | 5.9.x |
| React | React | 19.1.x |
| Navigation | React Navigation | 7.x |
| State Management | Zustand | 5.x |
| HTTP Client | Axios | 1.x |
| Text-to-Speech | expo-speech | 14.x |
| Speech-to-Text | expo-speech-recognition | 3.x |

## App Configuration

The app is configured with:

- **Package:** `com.berryhill.xander`
- **Name:** Xander
- **Orientation:** Portrait
- **New Architecture:** Enabled

### Android Permissions

- `RECORD_AUDIO` - Required for speech recognition
- `MODIFY_AUDIO_SETTINGS` - Required for audio focus management

## Development

### Running in Development

```bash
# Start Metro bundler
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios
```

### Building for Production

```bash
# Build APK (requires Expo account)
npx expo build:android

# Build with EAS Build
npx eas build --platform android
```

## Related Documentation

- [Parent Documentation](../README.md) - Autoxan project overview
- [E2E Testing Guide](./e2e-testing.md) - End-to-end testing documentation
- [Hermes Agent](../hermes/README.md) - AI backend documentation
- [Hermes Architecture](../hermes/architecture.md) - Technical architecture details
- [Hermes Setup](../hermes/setup.md) - Termux installation guide
- [Hermes Testing](../hermes/testing.md) - Integration testing guide
- [silas-workstation](../silas-workstation/README.md) - Task dispatch workstation
- [Project Plan](../../plans/xander-voice-app-plan.md) - Detailed implementation plan

---

*Last updated: Phase 11 End-to-End Testing - Issue #12*
