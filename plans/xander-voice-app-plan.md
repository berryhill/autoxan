# Xander Voice App - Project Plan

## Project Overview

A React Native app for natural voice conversations with **Xander** (phone agent). The primary focus is **great conversational experience** - like talking to a smart friend while driving. Xander listens, thinks with you, does quick research, and helps you work through ideas organically.

**Trigger:** "Hey Google, talk to Xander"

**Dispatch is optional.** Not every conversation needs action. Many are just exploring, thinking out loud, or staying connected. When something does crystallize into real work, Xander can stamp a robust plan to **Silas** (workstation admin) for execution.

---

## Agent Topology

| Agent | Location | Role |
|-------|----------|------|
| **Xander** | Phone (Termux + React Native voice UI) | Phone agent - conversational companion |
| **Silas** | Workstation | Main/admin agent - receives dispatched work |

---

## Repository Structure

```
autoxan/
├── mobile/                    # Xander Voice App (React Native)
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
│  │ Google Assistant │────▶│ Xander Voice App (React Native)  │  │
│  │ "Talk to Xander" │     │  • Voice interface (STT/TTS)     │  │
│  └──────────────────┘     │  • Audio focus management         │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
│                                            ▼                     │
│                           ┌──────────────────────────────────┐  │
│                           │ XANDER (Phone Agent - Termux)    │  │
│                           │                                  │  │
│                           │ Conversational AI:                │  │
│                           │ • Natural, flowing conversation  │  │
│                           │ • Light research (quick lookups) │  │
│                           │ • Shapes ideas with you          │  │
│                           │ • Dispatches work to Silas       │  │
│                           │                                  │  │
│                           │ Like brainstorming with a smart  │  │
│                           │ assistant in the car             │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
└────────────────────────────────────────────│─────────────────────┘
                                             │ Dispatch (MCP)
                                             ▼
                           ┌──────────────────────────────────────┐
                           │ SILAS (Workstation Admin)            │
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
│  Xander: "Sure, what kind of feature are you thinking?"         │
│                                                                  │
│  You: "Something for user notifications"                        │
│  Xander: "Let me look up current best practices..."             │
│          [Light research - quick web lookup]                    │
│  Xander: "I see push notifications and in-app alerts are        │
│           common. What's the main use case?"                    │
│                                                                  │
│  You: "Alerting users when their tasks are due"                 │
│  Xander: "Got it. So we'd need a notification service,          │
│           scheduling, and user preferences. Should I            │
│           dispatch this to Silas for detailed planning?"        │
│                                                                  │
│  You: "Yes, have Silas create a full plan"                      │
│  Xander: "Dispatching to Silas. He'll create a detailed         │
│           implementation plan and queue the tasks."             │
│          [Dispatch to workstation]                              │
│                                                                  │
│  You: "Thanks, goodbye"                                         │
│  Xander: "Silas is working on it. I'll notify you when          │
│           the plan is ready. Safe travels!"                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example Sessions

### Example 1: Just Thinking Out Loud (No Dispatch)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PURE CONVERSATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I've been thinking about that meeting tomorrow"          │
│  Xander: "The one with the investors?"                          │
│                                                                  │
│  You: "Yeah, I'm not sure how to position the roadmap"          │
│  Xander: "What's your concern - timeline or priorities?"        │
│                                                                  │
│  You: "Both I guess. We promised features we might not hit"     │
│  Xander: "That's a common spot. You could frame it as           │
│           learning-driven pivots rather than missed targets.    │
│           What did you learn that changed direction?"           │
│                                                                  │
│  You: "Good point. User feedback showed they wanted X not Y"    │
│  Xander: "There you go - that's a positive story. You listened" │
│                                                                  │
│  You: "Thanks, that helps. Goodbye"                             │
│  Xander: "Good luck tomorrow. You've got this."                 │
│                                                                  │
│  [No dispatch - just a good conversation]                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 2: Exploring an Idea (Research, No Decision Yet)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPLORATORY CONVERSATION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I'm thinking about switching our database"               │
│  Xander: "What's driving that? Performance, cost, features?"    │
│                                                                  │
│  You: "Mostly cost, we're paying too much for Postgres"         │
│  Xander: "Let me check some alternatives..."                    │
│          [Quick lookup on managed DB pricing]                   │
│  Xander: "PlanetScale and Neon both have generous free tiers.   │
│           CockroachDB has good scaling. What's your priority?"  │
│                                                                  │
│  You: "Hmm, I need to think about this more"                    │
│  Xander: "Makes sense. It's a big decision. Want me to          │
│           remember these options for next time?"                │
│                                                                  │
│  You: "Yeah, save that. I'll revisit it this week"              │
│  Xander: "Noted. Talk to you later."                            │
│                                                                  │
│  [No dispatch yet - just exploration, saved for later]          │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 3: Quick Help While Driving (No Dispatch)

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUICK CONVERSATION                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "What's a good gift for mom? Her birthday is Tuesday"     │
│  Xander: "What does she like?"                                  │
│                                                                  │
│  You: "Cozy stuff - candles, blankets"                          │
│  Xander: "Let me look... Found some nice options around $50-75. │
│           There's a lavender candle set or a weighted blanket   │
│           that's popular."                                      │
│                                                                  │
│  You: "Oh the candle set sounds good. I'll order that later"    │
│  Xander: "Nice choice. Want me to save that link for you?"      │
│                                                                  │
│  You: "Yeah, save it. Thanks!"                                  │
│  Xander: "Saved. Have a good drive."                            │
│                                                                  │
│  [No dispatch - you'll handle it yourself later]                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 4: Talking Through a Problem (No Dispatch)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TROUBLESHOOTING CONVERSATION                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "The API is slow today, users are complaining"            │
│  Xander: "That's frustrating. Any recent changes?"              │
│                                                                  │
│  You: "We deployed yesterday"                                   │
│  Xander: "Let me check... looks like there were 3 commits.      │
│           One touched the dashboard query. Could be that."      │
│                                                                  │
│  You: "Can you see what changed?"                               │
│  Xander: "It added a new join without an index. Classic N+1.    │
│           Probably needs a compound index on user_id + date."   │
│                                                                  │
│  You: "Okay I know what to do. I'll fix it when I get in"       │
│  Xander: "Sounds good. Want me to remind you?"                  │
│                                                                  │
│  You: "No I've got it. Goodbye"                                 │
│  Xander: "Good luck with the fix."                              │
│                                                                  │
│  [No dispatch - you're handling it yourself]                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Example 5: When Dispatch DOES Make Sense

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION → DISPATCH                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I want to add push notifications to the app"             │
│  Xander: "What's the main use case?"                            │
│                                                                  │
│  You: "Reminding users when tasks are due"                      │
│  Xander: "Makes sense. You'd need a notification service,       │
│           scheduling, user preferences... It's a decent chunk   │
│           of work. Want me to think through the details?"       │
│                                                                  │
│  You: "Yeah, what would it involve?"                            │
│  Xander: "Probably Firebase or OneSignal for delivery,          │
│           a scheduler for timing, preferences in the DB,        │
│           and UI for users to configure. Maybe 3-4 days work."  │
│                                                                  │
│  You: "That sounds right. Dispatch this to silas-workstation"   │
│  Xander: "Got it. Stamping to silas-workstation - he'll create  │
│           a detailed implementation plan with tasks."           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Dispatch (MCP)
┌─────────────────────────────────────────────────────────────────┐
│                    silas-workstation                            │
├─────────────────────────────────────────────────────────────────┤
│  • Research notification providers (compare options)            │
│  • Design database schema for preferences                       │
│  • Create detailed implementation plan                          │
│  • Break into tasks with estimates                              │
│  • Queue: Plan ready for review                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Responsibilities

| Agent | Role | Primary Focus |
|-------|------|---------------|
| **Xander (Phone)** | Conversational Companion | Natural, helpful conversation first |
| **silas-workstation** | Execution Engine | Rigid work when dispatched |

### Xander: Conversation First

**Primary job: Be great to talk to.**

- Natural, flowing conversation
- Listens and asks good questions
- Thinks with you, not for you
- Does light research when helpful
- Remembers context within session
- Suggests dispatch only when work crystallizes

**Dispatch is secondary.** Most conversations don't dispatch. Xander is useful even if you never send anything to silas-workstation - like having a smart friend to think out loud with.

### silas-workstation: Execution When Needed

**Only activates when Xander dispatches work.**

- Receives work packages from Xander via MCP
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
| Xander (Phone) | Agent in Termux |
| silas-workstation | MCP server with task queue |
| Communication | HTTP (local), MCP (dispatch) |

---

## User Flow

```
"Hey Google, talk to Xander"
        ↓
🔇 Music PAUSES
        ↓
📱 Voice App opens
        ↓
🎤 Conversational session begins
        ↓
┌──────────────────────────────────────┐
│   NATURAL CONVERSATION               │
│                                      │
│   You ←→ Xander                      │
│   • Talk through ideas               │
│   • Xander does light research       │
│   • Think out loud together          │
│   • No pressure, just conversation   │
└──────────────────────────────────────┘
        ↓
┌──────────────────────────────────────┐
│   MOST SESSIONS END HERE             │
│   "Goodbye" → Music resumes          │
└──────────────────────────────────────┘

        OR (when there's real work)
                    ↓
┌──────────────────────────────────────┐
│   DISPATCH TO silas-workstation      │
│   "Dispatch this to silas"           │
│                                      │
│   silas-workstation receives work:   │
│   • Creates detailed plan            │
│   • Queues tasks                     │
│   • Executes asynchronously          │
└──────────────────────────────────────┘
        ↓
"Goodbye"
        ↓
🎵 Music RESUMES (silas keeps working)
```

---

## Core Components

### Voice App (React Native)
1. **App.tsx** - State machine, voice flow
2. **useVoice.ts** - STT hook
3. **useSpeech.ts** - TTS hook
4. **xanderApi.ts** - HTTP client for Xander
5. **audioFocus.ts** - Audio focus management
6. **GestureControls.tsx** - Interrupt/Steer/Queue/Stop/Repeat buttons

### Xander (Phone Agent - Termux)
1. **Conversation engine** - Maintains session context
2. **Light research** - Quick web lookups
3. **Plan shaper** - Helps structure ideas
4. **Dispatcher** - Sends work to silas-workstation via MCP
5. **Session tracker** - What's been discussed/dispatched

### silas-workstation
1. **MCP endpoint** - Receives dispatched work
2. **Planner** - Creates detailed plans
3. **Task queue** - Queues work for execution
4. **Executor** - Runs tasks asynchronously
5. **Reporter** - Notifies when complete

---

## Setup Requirements

### Termux (Xander - Phone)
```bash
pkg install nodejs
# Start Xander agent
xander start
# Running at http://localhost:3000
```

### silas-workstation
```bash
silas serve --mcp --port 8080
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
2. Starter: "Talk to Xander"
3. Action: Open app → Xander Voice App

---

## Implementation Phases

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| **1. Project Setup** | Initialize Expo in `mobile/`, dependencies | 30 min |
| **2. Voice Hooks** | STT/TTS with error handling | 1.5 hours |
| **3. Xander API** | HTTP client, session management | 30 min |
| **4. State Machine** | Voice app flow | 1.5 hours |
| **5. Audio Focus** | Native module for AudioManager | 1.5 hours |
| **6. Conversation Engine** | Xander session orchestration | 2 hours |
| **7. Light Research** | Quick lookup capability for Xander | 1 hour |
| **8. Dispatcher** | Xander → silas-workstation dispatch via MCP | 1.5 hours |
| **9. silas Queue** | Task queue and execution | 2 hours |
| **10. Testing** | End-to-end conversation → dispatch | 1.5 hours |
| **Total** | | **~14 hours** |

---

## Gesture Controls (Future)

Placeholder buttons for gesture-based conversation control. These will make voice interaction more controllable, especially while driving.

| Gesture | Button | Intent | Future Implementation |
|---------|--------|--------|----------------------|
| **Interrupt** | ✋ | Cut off Xander mid-sentence | Tap to stop TTS, signal "I want to talk now" |
| **Steer** | 🔀 | Redirect the conversation | "That's not what I meant" / change topic |
| **Queue** | 📋 | Add to task queue without dispatch | Save for later, don't send to silas yet |
| **Stop** | ⏹️ | End session immediately | Quick exit, music resumes |
| **Repeat** | 🔁 | Replay last response | "Say that again" |

### Why Gestures?

Voice alone can be frustrating:
- Can't easily interrupt a long response
- Hard to say "wait, go back" naturally
- No quick "save that" without speaking

**Buttons as gesture placeholders** let us:
1. Test the UX with simple taps first
2. Later replace with swipe/tap gestures
3. Eventually support steering wheel controls or watch taps

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
│  ┌─────────────────────────────┐    │
│  │  ✋    🔀    📋    ⏹️    🔁   │    │  ← Gesture controls
│  │ Int  Steer Queue Stop  Rep  │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Dispatch to Silas] [Goodbye]      │
│                                     │
└─────────────────────────────────────┘
```

---

## Success Criteria

### Core (Conversational Quality)

- [ ] App opens via "Hey Google, talk to Xander"
- [ ] Music pauses when app opens
- [ ] **Conversation feels natural and helpful** ← Primary goal
- [ ] Xander asks good follow-up questions
- [ ] Xander remembers context within session
- [ ] Light research enhances (doesn't interrupt) conversation
- [ ] "Goodbye" exits cleanly, music resumes
- [ ] 30-second timeout auto-exits

### Secondary (Dispatch When Needed)

- [ ] Dispatch to silas-workstation works when requested
- [ ] silas queues and executes tasks
- [ ] silas keeps working after session ends

### Gesture Controls (Placeholder Buttons)

- [ ] Interrupt button stops TTS immediately
- [ ] Steer button signals redirection intent
- [ ] Queue button saves without dispatching
- [ ] Stop button ends session cleanly
- [ ] Repeat button replays last response

### Quality Indicators

- [ ] Most sessions are useful without dispatching
- [ ] User feels heard, not processed
- [ ] Xander helps think, doesn't just execute
- [ ] Gesture controls make conversation feel controllable
