# Hermes Voice App - Project Plan

## Project Overview

A React Native app that provides voice interaction with a Hermes agent running locally in Termux. Triggered by "Hey Google, talk to Hermes" via Google Assistant Routine. Music pauses during the conversation session and resumes when you exit.

---

## Repository Structure

```
autoxan/
├── mobile/                    # React Native mobile app
│   └── hermes-voice-app/
├── plans/                     # Project plans and documentation
└── (future codebases...)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID PHONE                             │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │ Google Assistant │────▶│ Hermes Voice App (React Native)  │  │
│  │ "Talk to Hermes" │     │                                  │  │
│  └──────────────────┘     │  • Takes audio focus (pauses     │  │
│                           │    Spotify/other media)          │  │
│                           │  • STT via @react-native-voice   │  │
│                           │  • TTS via expo-speech           │  │
│                           │  • HTTP calls to localhost:3000  │  │
│                           └────────────────┬─────────────────┘  │
│                                            │ HTTP                │
│                                            ▼                     │
│                           ┌──────────────────────────────────┐  │
│                           │ Hermes Agent in Termux           │  │
│                           │ http://localhost:3000/api/chat   │  │
│                           └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| App Framework | React Native (Expo managed workflow) |
| Speech-to-Text | `@react-native-voice/voice` |
| Text-to-Speech | `expo-speech` |
| HTTP Client | `fetch` |
| Audio Focus | Native module (AudioManager) |
| Backend | Hermes in Termux (`localhost:3000`) |

---

## User Flow

```
"Hey Google, talk to Hermes"
        ↓
🔇 Spotify/media PAUSES
        ↓
📱 Hermes Voice App opens
        ↓
🎤 App starts listening immediately
        ↓
┌──────────────────────────────────┐
│   CONVERSATION LOOP              │
│                                  │
│   You speak → Hermes processes   │
│         → Hermes responds        │
│         → App listens again      │
│                                  │
│   (repeat until exit)            │
└──────────────────────────────────┘
        ↓
"Goodbye" / timeout / back button
        ↓
🎵 Spotify/media RESUMES
```

---

## App State Machine

| State | Description | Transitions To |
|-------|-------------|----------------|
| LISTENING | Mic active, waiting for speech | PROCESSING, EXITING |
| PROCESSING | Sending to Hermes, awaiting response | SPEAKING |
| SPEAKING | TTS playing Hermes response | LISTENING |
| EXITING | Releasing audio focus, closing app | (app closes) |

---

## Core Components

### 1. Main App (App.tsx)
- State machine logic
- Orchestrates STT → API → TTS loop
- Handles exit conditions

### 2. Voice Hook (useVoice.ts)
- Wraps `@react-native-voice/voice`
- Provides `startListening()`, `stopListening()`, `transcript`

### 3. Speech Hook (useSpeech.ts)
- Wraps `expo-speech`
- Provides `speak(text)`, `isSpeaking`

### 4. Hermes API (hermesApi.ts)
- HTTP client for local Hermes
- `sendMessage(text, sessionId)` → response

### 5. Audio Focus (audioFocus.ts)
- Native module bridge
- `requestAudioFocus()` - pauses other media
- `releaseAudioFocus()` - allows media to resume

---

## Exit Triggers

| Trigger | Action |
|---------|--------|
| "Goodbye" / "Exit" / "Bye Hermes" | Clean exit, release focus |
| 30 second silence timeout | Auto-exit |
| Android back button | Clean exit |
| "Hey Google" | System takes focus back |

---

## Setup Requirements

### Termux (Backend)
```bash
pkg install nodejs
npm install -g hermes
hermes start
# Running at http://localhost:3000
```

### React Native App
```bash
cd mobile
npx create-expo-app hermes-voice-app
cd hermes-voice-app
npx expo install expo-speech
npm install @react-native-voice/voice
npx expo run:android
```

### Google Assistant Routine
1. Google Home app → Settings → Assistant → Routines
2. Starter: "Talk to Hermes"
3. Action: Open app → Hermes Voice App

---

## Implementation Phases

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| **1. Project Setup** | Create Expo project in `mobile/`, install dependencies | 30 min |
| **2. Voice Hooks** | Implement STT/TTS hooks with error handling | 1.5 hours |
| **3. Hermes Integration** | API client, session management | 30 min |
| **4. State Machine** | App flow, state transitions, loop logic | 1.5 hours |
| **5. Audio Focus** | Native module for AudioManager | 1.5 hours |
| **6. Testing** | End-to-end with Termux Hermes | 1 hour |
| **7. Google Routine** | Configure Assistant trigger | 15 min |
| **Total** | | **~7 hours** |

---

## Minimal UI

```
┌─────────────────────────────────┐
│                                 │
│         ┌───────────┐           │
│         │    🎤     │           │  ← Icon changes: 🎤 ⏳ 🔊
│         └───────────┘           │
│                                 │
│      "Listening..."             │  ← Status text
│                                 │
│  "What's on my calendar?"       │  ← Last transcript
│                                 │
│         [ Goodbye ]             │  ← Exit button
│                                 │
└─────────────────────────────────┘
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-speech": "~13.0.0",
    "@react-native-voice/voice": "^3.2.4",
    "react-native": "0.76.x"
  }
}
```

---

## Future Enhancements

1. **Android Auto Support** - Car screen integration
2. **Wake Word** - "Hey Hermes" without Google trigger
3. **Quick Command Mode** - Duck audio instead of pause
4. **Visual Feedback** - Waveform during listening
5. **Offline STT** - Local speech recognition

---

## Success Criteria

- [ ] App opens via "Hey Google, talk to Hermes"
- [ ] Music pauses when app opens
- [ ] STT captures user speech accurately
- [ ] Hermes responds via TTS
- [ ] Conversation loop works for multiple turns
- [ ] "Goodbye" exits and resumes music
- [ ] 30-second timeout auto-exits
