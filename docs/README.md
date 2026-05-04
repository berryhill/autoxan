# Autoxan Documentation

Welcome to the Autoxan project documentation. This repository contains the agent ecosystem for natural voice conversations and task automation.

## Project Overview

Autoxan is an agent-based system designed for natural voice conversations while driving or multitasking. The primary focus is on **great conversational experience** - like talking to a smart friend who can help you think through ideas, do quick research, and optionally dispatch work to be executed later.

## Agent Topology

| Agent | Location | Role |
|-------|----------|------|
| **Xander** | Phone (Termux + React Native voice UI) | Phone agent - conversational companion |
| **Silas** | Workstation | Main/admin agent - receives dispatched work |

## Repository Structure

```
autoxan/
├── docs/                      # Documentation (you are here)
│   ├── README.md              # This file - documentation overview
│   ├── mobile/                # Mobile app documentation
│   │   ├── README.md          # Mobile app overview
│   │   ├── setup.md           # Setup instructions
│   │   └── architecture.md    # Architecture documentation
│   └── xander-engine/         # Conversation engine documentation
│       ├── README.md          # Engine overview
│       ├── setup.md           # Installation & Termux deployment
│       ├── api-reference.md   # Complete API documentation
│       └── architecture.md    # Technical architecture
├── mobile/                    # Xander Voice App (React Native/Expo)
├── xander-engine/             # Xander Conversation Engine (Node.js)
└── plans/                     # Project plans and specifications
    ├── xander-voice-app-plan.md    # Detailed project plan
    └── gesture-ring-plan.md        # Future gesture control plans
```

## Documentation Index

### Mobile App (Xander Voice App)

- **[Mobile Overview](./mobile/README.md)** - Introduction to the Xander Voice App
- **[Setup Guide](./mobile/setup.md)** - How to set up and run the mobile app
- **[Architecture](./mobile/architecture.md)** - Technical architecture and module documentation

### Xander Conversation Engine

- **[Engine Overview](./xander-engine/README.md)** - Introduction to the Xander Conversation Engine
- **[Setup Guide](./xander-engine/setup.md)** - Installation and Termux deployment
- **[API Reference](./xander-engine/api-reference.md)** - Complete HTTP API documentation
- **[Architecture](./xander-engine/architecture.md)** - Technical architecture and module documentation

### Project Plans

- **[Xander Voice App Plan](../plans/xander-voice-app-plan.md)** - Complete project specification with phases, architecture diagrams, and success criteria

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID PHONE                             │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────────────────────────┐  │
│  │ Google Assistant │────▶│ Xander Voice App (React Native)  │  │
│  │ "Talk to Xander" │     │  • Voice interface (STT/TTS)     │  │
│  └──────────────────┘     │  • Audio focus management         │  │
│                           └────────────────┬─────────────────┘  │
│                                            │ HTTP                │
│                                            ▼                     │
│                           ┌──────────────────────────────────┐  │
│                           │ XANDER ENGINE (Termux/Node.js)   │  │
│                           │                                  │  │
│                           │ • Session management (30-min)    │  │
│                           │ • LLM integration (Claude)       │  │
│                           │ • Dispatch detection             │  │
│                           │ • Task queue                     │  │
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
                           └──────────────────────────────────────┘
```

## Key Concepts

### Conversation First

Most conversations don't require dispatching work. Xander is useful even if you never send anything to Silas - like having a smart friend to think out loud with.

### Dispatch When Ready

When an idea crystallizes into real work, Xander can stamp a robust plan to Silas for execution. Silas continues working asynchronously while you go about your day.

### Voice-Native UX

The entire experience is optimized for hands-free, eyes-free interaction - perfect for driving, walking, or multitasking.

## Current Status

- ✅ **Phase 1: Project Setup** - Expo project initialized with dependencies
- ✅ **Phase 2: Voice Hooks** - STT/TTS hooks implemented
- ✅ **Phase 3: Xander API Client** - HTTP client for engine communication
- ✅ **Phase 4: State Machine** - Voice flow state management
- ✅ **Phase 5: Audio Focus** - Native Android audio focus module
- ✅ **Phase 6: Conversation Engine** - Node.js backend with Claude integration
- ⏳ **Phase 7-10** - See [project plan](../plans/xander-voice-app-plan.md)

## Contributing

When contributing to documentation:

1. Keep documentation concise and actionable
2. Update relevant docs when code changes
3. Follow the established format in existing documentation
4. Place all documentation in the `docs/` directory

---

*Last updated: Phase 6 - Conversation Engine Implementation*
