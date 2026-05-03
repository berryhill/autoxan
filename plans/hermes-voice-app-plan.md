# Hermes Voice App - Project Plan

## Project Overview

A React Native app for conversational planning with **Hermes** (phone agent). Hermes orchestrates meaningful sessions - you discuss ideas, do light research together, and shape plans. When ready, Hermes dispatches the real work to **Xander** (workstation) which plans in detail and queues execution. Like having a smart assistant to brainstorm with in the car.

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
│  │ "Talk to Hermes" │     │  • Voice interface (STT/TTS)     │  │
│  └──────────────────┘     │  • Audio focus management         │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
│                                            ▼                     │
│                           ┌──────────────────────────────────┐  │
│                           │ HERMES (Phone Agent)             │  │
│                           │                                  │  │
│                           │ Session Orchestrator:            │  │
│                           │ • Conversational planning        │  │
│                           │ • Light research (quick lookups) │  │
│                           │ • Shapes ideas with you          │  │
│                           │ • Dispatches work to Xander      │  │
│                           │                                  │  │
│                           │ Like brainstorming with a smart  │  │
│                           │ assistant in the car             │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
└────────────────────────────────────────────│─────────────────────┘
                                             │ Dispatch (MCP)
                                             ▼
                           ┌──────────────────────────────────────┐
                           │ XANDER (Workstation)                 │
                           │                                      │
                           │ Execution Engine:                    │
                           │ • Receives dispatched work           │
                           │ • Creates detailed plans             │
                           │ • Queues tasks for execution         │
                           │ • Heavy research & analysis          │
                           │ • Full MCP tool access               │
                           │ • Async execution while you drive    │
                           └──────────────────────────────────────┘
```

---

## How It Works

### Session Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATIONAL SESSION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I need to plan a new feature for the app"                │
│  Hermes: "Sure, what kind of feature are you thinking?"         │
│                                                                  │
│  You: "Something for user notifications"                        │
│  Hermes: "Let me look up current best practices..."             │
│         [Light research - quick web lookup]                     │
│  Hermes: "I see push notifications and in-app alerts are        │
│           common. What's the main use case?"                    │
│                                                                  │
│  You: "Alerting users when their tasks are due"                 │
│  Hermes: "Got it. So we'd need a notification service,          │
│           scheduling, and user preferences. Should I            │
│           dispatch this to Xander for detailed planning?"       │
│                                                                  │
│  You: "Yes, have Xander create a full plan"                     │
│  Hermes: "Dispatching to Xander. He'll create a detailed        │
│           implementation plan and queue the tasks."             │
│         [Dispatch to workstation]                               │
│                                                                  │
│  You: "Thanks, goodbye"                                         │
│  Hermes: "Xander's working on it. I'll notify you when          │
│           the plan is ready. Safe travels!"                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example Sessions

### Example 1: Planning a Feature (from above)
**Organic:** Brainstorm what the feature should do
**Rigid:** Xander creates implementation plan, writes tickets, queues PRs

---

### Example 2: Research & Decision Making

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIC CONVERSATION (Hermes)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I'm thinking about switching our database"               │
│  Hermes: "What's driving that? Performance, cost, features?"    │
│                                                                  │
│  You: "Mostly cost, we're paying too much for Postgres"         │
│  Hermes: "Let me check some alternatives..."                    │
│         [Quick lookup on managed DB pricing]                    │
│  Hermes: "PlanetScale and Neon both have generous free tiers.   │
│           CockroachDB has good scaling. What's your priority?"  │
│                                                                  │
│  You: "We need something that works with Prisma"                │
│  Hermes: "All three work with Prisma. Want me to have Xander    │
│           do a deep comparison with migration complexity?"      │
│                                                                  │
│  You: "Yeah, include cost projections for our usage"            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Dispatch
┌─────────────────────────────────────────────────────────────────┐
│                    RIGID WORK (Xander)                          │
├─────────────────────────────────────────────────────────────────┤
│  • Deep research: pricing tiers, feature comparison             │
│  • Analyze current usage patterns                               │
│  • Calculate cost projections (30/60/90 day)                    │
│  • Evaluate migration complexity with Prisma                    │
│  • Create comparison document                                   │
│  • Queue: recommendation report                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 3: Quick Errand While Driving

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIC CONVERSATION (Hermes)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I need to send a gift to mom for her birthday"           │
│  Hermes: "When's her birthday?"                                 │
│                                                                  │
│  You: "Next Tuesday"                                            │
│  Hermes: "What kind of gift? I can look up options"             │
│                                                                  │
│  You: "Something cozy, she likes candles and blankets"          │
│  Hermes: "Found some nice gift sets... price range?"            │
│                                                                  │
│  You: "Around $50-75"                                           │
│  Hermes: "Got a few good options. Want Xander to order          │
│           the best one and handle shipping?"                    │
│                                                                  │
│  You: "Yes, use my default payment and ship to her address"     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Dispatch
┌─────────────────────────────────────────────────────────────────┐
│                    RIGID WORK (Xander)                          │
├─────────────────────────────────────────────────────────────────┤
│  • Select best gift option within criteria                      │
│  • Look up mom's shipping address                               │
│  • Process order with saved payment                             │
│  • Confirm delivery by Tuesday                                  │
│  • Queue: order confirmation notification                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 4: Debugging a Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIC CONVERSATION (Hermes)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "The API is slow today, users are complaining"            │
│  Hermes: "Let me check... which endpoints?"                     │
│                                                                  │
│  You: "The main dashboard endpoint"                             │
│  Hermes: "I see some recent commits to that area. Also          │
│           looks like there's a new database index missing.      │
│           Want me to have Xander investigate deeper?"           │
│                                                                  │
│  You: "Yes, and fix it if it's straightforward"                 │
│  Hermes: "On it. Should he create a PR or commit directly?"     │
│                                                                  │
│  You: "PR, I want to review it first"                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Dispatch
┌─────────────────────────────────────────────────────────────────┐
│                    RIGID WORK (Xander)                          │
├─────────────────────────────────────────────────────────────────┤
│  • Profile the slow endpoint                                    │
│  • Identify missing indexes or N+1 queries                      │
│  • Create migration for index if needed                         │
│  • Test fix locally                                             │
│  • Create PR with before/after benchmarks                       │
│  • Queue: PR ready for review notification                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Responsibilities

| Agent | Role | Capabilities |
|-------|------|--------------|
| **Hermes (Phone)** | Session Orchestrator | Conversational planning, light research, dispatch |
| **Xander (Workstation)** | Execution Engine | Detailed planning, task queuing, heavy lifting |

### Hermes Does

- Meaningful conversation and brainstorming
- Light research (quick lookups to inform discussion)
- Shapes ideas collaboratively with you
- Summarizes and confirms understanding
- Dispatches work packages to Xander
- Tracks what's been dispatched

### Xander Does

- Receives dispatched work from Hermes
- Creates detailed implementation plans
- Queues tasks for execution
- Heavy research and analysis
- Executes tasks asynchronously
- Reports back when complete

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Voice App | React Native (Expo) |
| Speech-to-Text | `@react-native-voice/voice` |
| Text-to-Speech | `expo-speech` |
| Hermes (Phone) | Node.js in Termux |
| Xander (Workstation) | MCP server with task queue |
| Communication | HTTP (local), MCP (dispatch) |

---

## User Flow

```
"Hey Google, talk to Hermes"
        ↓
🔇 Music PAUSES
        ↓
📱 Voice App opens
        ↓
🎤 Conversational session begins
        ↓
┌──────────────────────────────────────┐
│   PLANNING CONVERSATION              │
│                                      │
│   You ←→ Hermes                      │
│   • Discuss ideas                    │
│   • Hermes does light research       │
│   • Shape the plan together          │
│   • Refine until ready               │
└──────────────────────────────────────┘
        ↓
📤 "Dispatch to Xander"
        ↓
┌──────────────────────────────────────┐
│   XANDER (Workstation)               │
│   • Receives work package            │
│   • Creates detailed plan            │
│   • Queues tasks                     │
│   • Executes asynchronously          │
└──────────────────────────────────────┘
        ↓
"Goodbye"
        ↓
🎵 Music RESUMES (Xander keeps working)
```

---

## Core Components

### Voice App (React Native)
1. **App.tsx** - State machine, voice flow
2. **useVoice.ts** - STT hook
3. **useSpeech.ts** - TTS hook
4. **hermesApi.ts** - HTTP client for Hermes
5. **audioFocus.ts** - Audio focus management

### Hermes (Phone Agent - Termux)
1. **Conversation engine** - Maintains session context
2. **Light research** - Quick web lookups
3. **Plan shaper** - Helps structure ideas
4. **Dispatcher** - Sends work to Xander
5. **Session tracker** - What's been discussed/dispatched

### Xander (Workstation)
1. **MCP endpoint** - Receives dispatched work
2. **Planner** - Creates detailed plans
3. **Task queue** - Queues work for execution
4. **Executor** - Runs tasks asynchronously
5. **Reporter** - Notifies when complete

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
| **1. Project Setup** | Initialize Expo in `mobile/`, dependencies | 30 min |
| **2. Voice Hooks** | STT/TTS with error handling | 1.5 hours |
| **3. Hermes API** | HTTP client, session management | 30 min |
| **4. State Machine** | Voice app flow | 1.5 hours |
| **5. Audio Focus** | Native module for AudioManager | 1.5 hours |
| **6. Conversation Engine** | Hermes session orchestration | 2 hours |
| **7. Light Research** | Quick lookup capability for Hermes | 1 hour |
| **8. Dispatcher** | Hermes → Xander dispatch via MCP | 1.5 hours |
| **9. Xander Queue** | Task queue and execution | 2 hours |
| **10. Testing** | End-to-end conversation → dispatch | 1.5 hours |
| **Total** | | **~14 hours** |

---

## Minimal UI

```
┌─────────────────────────────────────┐
│                                     │
│         ┌───────────┐               │
│         │    🎤     │               │  ← Listening
│         └───────────┘               │
│                                     │
│  "Planning notification feature..." │  ← Context
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Session: 3 exchanges        │    │  ← Session info
│  │ Dispatched: 1 task          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Dispatch to Xander] [Goodbye]     │
│                                     │
└─────────────────────────────────────┘
```

---

## Success Criteria

- [ ] App opens via "Hey Google, talk to Hermes"
- [ ] Music pauses when app opens
- [ ] Conversational session works naturally
- [ ] Hermes does light research during conversation
- [ ] Plans are shaped collaboratively
- [ ] Work dispatches to Xander successfully
- [ ] Xander queues and executes tasks
- [ ] "Goodbye" exits cleanly, Xander keeps working
- [ ] 30-second timeout auto-exits
