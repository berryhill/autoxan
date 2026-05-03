# Hermes Voice App - Project Plan

## Project Overview

A React Native app for natural voice conversations with **Hermes** (phone agent). The primary focus is **great conversational experience** - like talking to a smart friend while driving. Hermes listens, thinks with you, does quick research, and helps you work through ideas organically.

**Dispatch is optional.** Not every conversation needs action. Many are just exploring, thinking out loud, or staying connected. When something does crystallize into real work, Hermes can stamp a robust plan to **Xander** (workstation) for execution.

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

### Example 1: Just Thinking Out Loud (No Dispatch)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PURE CONVERSATION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  You: "I've been thinking about that meeting tomorrow"          │
│  Hermes: "The one with the investors?"                          │
│                                                                  │
│  You: "Yeah, I'm not sure how to position the roadmap"          │
│  Hermes: "What's your concern - timeline or priorities?"        │
│                                                                  │
│  You: "Both I guess. We promised features we might not hit"     │
│  Hermes: "That's a common spot. You could frame it as           │
│           learning-driven pivots rather than missed targets.    │
│           What did you learn that changed direction?"           │
│                                                                  │
│  You: "Good point. User feedback showed they wanted X not Y"    │
│  Hermes: "There you go - that's a positive story. You listened" │
│                                                                  │
│  You: "Thanks, that helps. Goodbye"                             │
│  Hermes: "Good luck tomorrow. You've got this."                 │
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
│  Hermes: "What's driving that? Performance, cost, features?"    │
│                                                                  │
│  You: "Mostly cost, we're paying too much for Postgres"         │
│  Hermes: "Let me check some alternatives..."                    │
│         [Quick lookup on managed DB pricing]                    │
│  Hermes: "PlanetScale and Neon both have generous free tiers.   │
│           CockroachDB has good scaling. What's your priority?"  │
│                                                                  │
│  You: "Hmm, I need to think about this more"                    │
│  Hermes: "Makes sense. It's a big decision. Want me to          │
│           remember these options for next time?"                │
│                                                                  │
│  You: "Yeah, save that. I'll revisit it this week"              │
│  Hermes: "Noted. Talk to you later."                            │
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
│  Hermes: "What does she like?"                                  │
│                                                                  │
│  You: "Cozy stuff - candles, blankets"                          │
│  Hermes: "Let me look... Found some nice options at Anthropic   │
│           Home around $50-75. There's a lavender candle set     │
│           or a weighted blanket that's popular."                │
│                                                                  │
│  You: "Oh the candle set sounds good. I'll order that later"    │
│  Hermes: "Nice choice. Want me to save that link for you?"      │
│                                                                  │
│  You: "Yeah, save it. Thanks!"                                  │
│  Hermes: "Saved. Have a good drive."                            │
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
│  Hermes: "That's frustrating. Any recent changes?"              │
│                                                                  │
│  You: "We deployed yesterday"                                   │
│  Hermes: "Let me check... looks like there were 3 commits.      │
│           One touched the dashboard query. Could be that."      │
│                                                                  │
│  You: "Can you see what changed?"                               │
│  Hermes: "It added a new join without an index. Classic N+1.    │
│           Probably needs a compound index on user_id + date."   │
│                                                                  │
│  You: "Okay I know what to do. I'll fix it when I get in"       │
│  Hermes: "Sounds good. Want me to remind you?"                  │
│                                                                  │
│  You: "No I've got it. Goodbye"                                 │
│  Hermes: "Good luck with the fix."                              │
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
│  Hermes: "What's the main use case?"                            │
│                                                                  │
│  You: "Reminding users when tasks are due"                      │
│  Hermes: "Makes sense. You'd need a notification service,       │
│           scheduling, user preferences... It's a decent chunk   │
│           of work. Want me to think through the details?"       │
│                                                                  │
│  You: "Yeah, what would it involve?"                            │
│  Hermes: "Probably Firebase or OneSignal for delivery,          │
│           a scheduler for timing, preferences in the DB,        │
│           and UI for users to configure. Maybe 3-4 days work."  │
│                                                                  │
│  You: "That sounds right. I want Xander to build a full plan"   │
│  Hermes: "Got it. I'll stamp this to Xander - he'll create      │
│           a detailed implementation plan with tasks."           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Dispatch
┌─────────────────────────────────────────────────────────────────┐
│                    RIGID WORK (Xander)                          │
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
| **Hermes (Phone)** | Conversational Companion | Natural, helpful conversation first |
| **Xander (Workstation)** | Execution Engine | Rigid work when dispatched |

### Hermes: Conversation First

**Primary job: Be great to talk to.**

- Natural, flowing conversation
- Listens and asks good questions
- Thinks with you, not for you
- Does light research when helpful
- Remembers context within session
- Suggests dispatch only when work crystallizes

**Dispatch is secondary.** Most conversations don't dispatch. Hermes is useful even if you never send anything to Xander - like having a smart friend to think out loud with.

### Xander: Execution When Needed

**Only activates when Hermes dispatches work.**

- Receives work packages from Hermes
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
│   NATURAL CONVERSATION               │
│                                      │
│   You ←→ Hermes                      │
│   • Talk through ideas               │
│   • Hermes does light research       │
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
│   DISPATCH TO XANDER (optional)      │
│   "Have Xander build a plan for X"   │
│                                      │
│   Xander receives the work:          │
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

### Core (Conversational Quality)

- [ ] App opens via "Hey Google, talk to Hermes"
- [ ] Music pauses when app opens
- [ ] **Conversation feels natural and helpful** ← Primary goal
- [ ] Hermes asks good follow-up questions
- [ ] Hermes remembers context within session
- [ ] Light research enhances (doesn't interrupt) conversation
- [ ] "Goodbye" exits cleanly, music resumes
- [ ] 30-second timeout auto-exits

### Secondary (Dispatch When Needed)

- [ ] Dispatch to Xander works when requested
- [ ] Xander queues and executes tasks
- [ ] Xander keeps working after session ends

### Quality Indicators

- [ ] Most sessions are useful without dispatching
- [ ] User feels heard, not processed
- [ ] Hermes helps think, doesn't just execute
