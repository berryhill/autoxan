# Hermes Voice App - Project Plan

## Project Overview

A React Native app that provides voice interaction with **Hermes** (local phone agent) which acts as a gateway to **Xander** (remote workstation agent) for complex tasks. Triggered by "Hey Google, talk to Hermes" via Google Assistant Routine. Music pauses during the conversation session and resumes when you exit.

---

## Repository Structure

```
autoxan/
├── mobile/                    # Hermes Voice App (React Native)
├── plans/                     # Project plans and documentation
└── (other codebases...)       # Future projects in separate directories
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
│  └──────────────────┘     │  • Takes audio focus             │  │
│                           │  • STT/TTS                        │  │
│                           │  • Voice interface layer          │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
│                                            ▼                     │
│                           ┌──────────────────────────────────┐  │
│                           │ HERMES (Local Agent in Termux)   │  │
│                           │ http://localhost:3000            │  │
│                           │                                  │  │
│                           │ • Simple conversation tasks      │  │
│                           │ • Quick local responses          │  │
│                           │ • Gateway to Xander              │  │
│                           │ • Improves phone UX on the fly   │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
└────────────────────────────────────────────│─────────────────────┘
                                             │ MCP (over network)
                                             ▼
                           ┌──────────────────────────────────────┐
                           │ XANDER (Workstation Agent)           │
                           │ Remote: https://workstation/mcp      │
                           │                                      │
                           │ • Web research                       │
                           │ • Complex multi-step tasks           │
                           │ • Heavy computation                  │
                           │ • Full MCP tool access               │
                           │ • More capabilities than Gemini      │
                           └──────────────────────────────────────┘
```

---

## Agent Responsibilities

| Agent | Location | Responsibilities |
|-------|----------|------------------|
| **Voice App** | React Native | Audio capture, STT, TTS, UI |
| **Hermes** | Phone (Termux) | Gateway agent, simple tasks, routing, UX optimization |
| **Xander** | Workstation | Complex tasks, web research, full MCP tools, heavy lifting |

### Task Routing Logic (Hermes decides)

| Task Type | Handled By | Example |
|-----------|------------|---------|
| Simple Q&A | Hermes (local) | "What time is it?", "Set a reminder" |
| Quick lookups | Hermes (local) | "What's on my calendar?" |
| Web research | Xander (remote) | "Research the latest on X topic" |
| Complex analysis | Xander (remote) | "Analyze this document and summarize" |
| Multi-step workflows | Xander (remote) | "Create a PR for this issue" |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Voice App | React Native (Expo) |
| Speech-to-Text | `@react-native-voice/voice` |
| Text-to-Speech | `expo-speech` |
| Hermes (Phone) | Node.js in Termux |
| Xander (Workstation) | MCP server exposing agents |
| Communication | HTTP (local), MCP (remote) |

---

## User Flow

```
"Hey Google, talk to Hermes"
        ↓
🔇 Spotify/media PAUSES
        ↓
📱 Voice App opens → connects to Hermes (local)
        ↓
🎤 "What's the weather like?"
        ↓
┌──────────────────────────────────────┐
│ HERMES evaluates:                    │
│   Simple task? → Handle locally      │
│   Complex task? → Route to Xander    │
└──────────────────────────────────────┘
        ↓
🔊 Response via TTS
        ↓
🎤 Listening for next input...
        ↓
"Research the best practices for X"
        ↓
┌──────────────────────────────────────┐
│ HERMES: Complex task → calling Xander│
│ XANDER: Web research, analysis...    │
│ XANDER: Returns comprehensive answer │
│ HERMES: Delivers to user             │
└──────────────────────────────────────┘
        ↓
🔊 Response via TTS
        ↓
"Goodbye"
        ↓
🎵 Spotify/media RESUMES
```

---

## App State Machine

| State | Description | Transitions To |
|-------|-------------|----------------|
| LISTENING | Mic active, waiting for speech | PROCESSING, EXITING |
| PROCESSING | Hermes processing (may call Xander) | SPEAKING |
| SPEAKING | TTS playing response | LISTENING |
| EXITING | Releasing audio focus, closing app | (app closes) |

---

## Core Components

### Voice App (React Native)
1. **App.tsx** - State machine, orchestrates flow
2. **useVoice.ts** - STT hook
3. **useSpeech.ts** - TTS hook
4. **hermesApi.ts** - HTTP client for local Hermes
5. **audioFocus.ts** - Audio focus management

### Hermes (Phone Agent - Termux)
1. **Simple task handler** - Quick local responses
2. **Xander client** - MCP connection to workstation
3. **Router** - Decides local vs remote handling
4. **Context manager** - Maintains conversation state

### Xander (Workstation Agent)
1. **MCP server** - Exposes tools and capabilities
2. **Web research tools** - Browser, search, scraping
3. **Heavy computation** - Analysis, processing
4. **Full toolchain** - GitHub, databases, APIs

---

## Setup Requirements

### Termux (Hermes - Phone)
```bash
pkg install nodejs
npm install -g hermes
hermes start
# Running at http://localhost:3000
```

### Workstation (Xander)
```bash
# Xander exposes MCP endpoint
# Hermes connects to it for complex tasks
xander serve --mcp --port 8080
```

### React Native App
```bash
cd mobile
npx create-expo-app .
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
| **1. Project Setup** | Initialize Expo in `mobile/`, install dependencies | 30 min |
| **2. Voice Hooks** | Implement STT/TTS hooks with error handling | 1.5 hours |
| **3. Hermes Integration** | API client, session management | 30 min |
| **4. State Machine** | App flow, state transitions, loop logic | 1.5 hours |
| **5. Audio Focus** | Native module for AudioManager | 1.5 hours |
| **6. Hermes Router** | Task routing logic (local vs Xander) | 1 hour |
| **7. Xander MCP Client** | Connect Hermes to Xander via MCP | 1.5 hours |
| **8. Testing** | End-to-end with full stack | 1.5 hours |
| **9. Google Routine** | Configure Assistant trigger | 15 min |
| **Total** | | **~10 hours** |

---

## Minimal UI

```
┌─────────────────────────────────────┐
│                                     │
│         ┌───────────┐               │
│         │    🎤     │               │  ← Icon: 🎤 ⏳ 🔊
│         └───────────┘               │
│                                     │
│      "Listening..."                 │  ← Status
│                                     │
│  "Research best practices for..."   │  ← Last transcript
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🏠 Hermes │ 🌐 Xander       │    │  ← Shows which agent
│  └─────────────────────────────┘    │
│                                     │
│         [ Goodbye ]                 │  ← Exit button
│                                     │
└─────────────────────────────────────┘
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
6. **Smart Caching** - Hermes caches Xander responses
7. **Fallback Mode** - Hermes works standalone when Xander unavailable

---

## Success Criteria

- [ ] App opens via "Hey Google, talk to Hermes"
- [ ] Music pauses when app opens
- [ ] STT captures user speech accurately
- [ ] Hermes responds via TTS for simple tasks
- [ ] Complex tasks route to Xander successfully
- [ ] Conversation loop works for multiple turns
- [ ] "Goodbye" exits and resumes music
- [ ] 30-second timeout auto-exits
