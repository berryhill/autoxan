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
│   ├── hermes/                # Hermes Agent documentation
│   │   ├── README.md          # Hermes overview in Autoxan
│   │   ├── architecture.md    # Technical architecture & data flow
│   │   ├── configuration.md   # Configuration reference
│   │   ├── setup.md           # Termux setup guide
│   │   └── testing.md         # Integration testing guide
│   └── silas-workstation/     # Silas Workstation documentation
│       ├── README.md          # Silas overview and features
│       ├── architecture.md    # Technical architecture & data flow
│       ├── setup.md           # Setup and running instructions
│       └── api.md             # MCP API reference
├── hermes/                    # Hermes Agent configuration for Xander
│   ├── config.yaml            # Hermes settings (model, memory, MCP)
│   ├── SOUL.md                # Xander personality & system prompt
│   └── README.md              # Quick start guide
├── mobile/                    # Xander Voice App (React Native/Expo)
├── silas-workstation/         # Silas Workstation task queue
│   ├── src/                   # TypeScript source code
│   │   ├── mcp/               # MCP server implementation
│   │   ├── services/          # Task queue service
│   │   └── types/             # Type definitions
│   ├── package.json           # Dependencies and scripts
│   └── README.md              # Quick start guide
└── plans/                     # Project plans and specifications
    ├── xander-voice-app-plan.md        # Detailed project plan
    ├── hermes-architecture-overhaul.md # Migration to Hermes (historical)
    └── gesture-ring-plan.md            # Future gesture control plans
```

## Architecture Overview

The project uses **Hermes Agent** as the AI backend for the Xander conversational companion.

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
│                           │ HERMES AGENT (Termux)            │  │
│                           │                                  │  │
│                           │ • SOUL.md - Xander personality   │  │
│                           │ • config.yaml - Settings         │  │
│                           │ • Memory persistence             │  │
│                           │ • OpenRouter LLM integration     │  │
│                           │ • MCP dispatch to Silas          │  │
│                           └────────────────┬─────────────────┘  │
│                                            │                     │
└────────────────────────────────────────────│─────────────────────┘
                                             │ MCP Protocol
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

## Documentation Index

### Hermes Agent (Xander Backend)

- **[Hermes Overview](./hermes/README.md)** - Introduction to Hermes in Autoxan
- **[Architecture](./hermes/architecture.md)** - Technical architecture and data flow diagrams
- **[Configuration Reference](./hermes/configuration.md)** - Detailed config.yaml documentation
- **[Setup Guide](./hermes/setup.md)** - Termux installation and setup
- **[Testing Guide](./hermes/testing.md)** - Integration testing documentation

### Mobile App (Xander Voice App)

- **[Mobile Overview](./mobile/README.md)** - Introduction to the Xander Voice App
- **[Setup Guide](./mobile/setup.md)** - How to set up and run the mobile app
- **[Architecture](./mobile/architecture.md)** - Technical architecture and module documentation

### Silas Workstation (Task Queue)

- **[Silas Overview](./silas-workstation/README.md)** - Introduction to Silas Workstation
- **[Architecture](./silas-workstation/architecture.md)** - Technical architecture and data flow
- **[Setup Guide](./silas-workstation/setup.md)** - Installation and running instructions
- **[API Reference](./silas-workstation/api.md)** - MCP tool documentation

### Hermes Configuration Files

The actual configuration files are in the `/hermes` directory:

- **[hermes/config.yaml](../hermes/config.yaml)** - Hermes configuration
- **[hermes/SOUL.md](../hermes/SOUL.md)** - Xander personality definition
- **[hermes/README.md](../hermes/README.md)** - Quick start and test cases

### Project Plans

- **[Hermes Architecture Overhaul](../plans/hermes-architecture-overhaul.md)** - Migration plan to Hermes
- **[Xander Voice App Plan](../plans/xander-voice-app-plan.md)** - Complete project specification

## Key Concepts

### Conversation First

Most conversations don't require dispatching work. Xander is useful even if you never send anything to Silas - like having a smart friend to think out loud with.

### Dispatch When Ready

When an idea crystallizes into real work, Xander can stamp a robust plan to Silas for execution. Silas continues working asynchronously while you go about your day.

### Voice-Native UX

The entire experience is optimized for hands-free, eyes-free interaction - perfect for driving, walking, or multitasking.

### Hermes Agent

The project uses [Hermes Agent](https://hermes-agent.nousresearch.com/) as the AI backend:
- **Personality via SOUL.md** - Define Xander's character and behavior
- **OpenRouter Integration** - Access to 200+ LLM models
- **Persistent Memory** - Remembers user preferences across sessions
- **MCP Protocol** - Standard dispatch to Silas workstation

## Current Status

- ✅ **Phase 1: Project Setup** - Expo project initialized with dependencies
- ✅ **Phase 2: Voice Hooks** - STT/TTS hooks implemented
- ✅ **Phase 3: Xander API Client** - HTTP client for Hermes communication
- ✅ **Phase 4: State Machine** - Voice flow state management
- ✅ **Phase 5: Audio Focus** - Native Android audio focus module
- ✅ **Hermes Configuration** - Xander personality and config created
- ✅ **Hermes Integration** - API client updated for Hermes backend
- ✅ **Phase 9: Silas Task Queue** - MCP server, task queue, and execution engine implemented
- ⏳ **Phase 10+** - See [project plan](../plans/xander-voice-app-plan.md)

## Contributing

When contributing to documentation:

1. Keep documentation concise and actionable
2. Update relevant docs when code changes
3. Follow the established format in existing documentation
4. Place all documentation in the `docs/` directory
5. When updating Hermes configuration, update both `/hermes/` files and `/docs/hermes/` documentation

---

*Last updated: Issue #10 - Silas Workstation task queue documentation*
