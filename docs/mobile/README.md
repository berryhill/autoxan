# Xander Voice App

The Xander Voice App is a React Native application built with Expo that provides a natural voice interface for conversations with the Xander agent.

## Overview

**Trigger:** "Hey Google, talk to Xander"

The app provides a hands-free, eyes-free conversational experience - perfect for driving, walking, or multitasking. Xander listens, thinks with you, does quick research, and helps you work through ideas organically.

## Features

### Current (Phase 1)

- ✅ Basic voice interface UI with VoiceButton component
- ✅ Text-to-Speech (TTS) via `expo-speech`
- ✅ Speech-to-Text (STT) setup via `expo-speech-recognition`
- ✅ Session state management with Zustand
- ✅ HTTP client placeholder for Xander API
- ✅ Audio focus utility placeholders
- ✅ Android permissions configured (RECORD_AUDIO, MODIFY_AUDIO_SETTINGS)

### Planned

- ⏳ Voice hooks with real STT/TTS integration (Phase 2)
- ⏳ Xander API integration (Phase 3)
- ⏳ State machine for voice flow (Phase 4)
- ⏳ Audio focus management - pause/resume music (Phase 5)
- ⏳ Gesture controls for conversation control (Phase 6+)

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
└── src/
    ├── components/
    │   └── ui/
    │       └── VoiceButton.tsx      # Voice button component
    ├── hooks/
    │   ├── useVoice.ts              # Speech-to-Text hook
    │   └── useSpeech.ts             # Text-to-Speech hook
    ├── api/
    │   └── xanderApi.ts             # Xander HTTP client
    ├── store/
    │   └── sessionStore.ts          # Zustand state management
    └── utils/
        └── audioFocus.ts            # Audio focus utilities
```

For detailed architecture information, see [Architecture Guide](./architecture.md).

## Documentation

- **[Setup Guide](./setup.md)** - Complete setup instructions
- **[Architecture](./architecture.md)** - Technical architecture and modules
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
- [Project Plan](../../plans/xander-voice-app-plan.md) - Detailed implementation plan

---

*Last updated: Phase 1 - Expo Project Setup*
