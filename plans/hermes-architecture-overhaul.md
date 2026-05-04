# Hermes Architecture Overhaul Plan

## Executive Summary

This document outlines the architectural changes needed to transition the Xander Voice App from a custom Express/Node.js backend (xander-engine) to **Hermes Agent** as the underlying AI backend. The React Native mobile app will remain as the voice UI entry point, communicating with Hermes running in Termux on the Android device.

**Key Decision**: Keep React Native UI as entry point, replace xander-engine with Hermes Agent.

---

## Problem Statement

### What Went Wrong

The original implementation deviated from the intended architecture:

| Aspect | Intended (Hermes) | Implemented (Wrong) |
|--------|-------------------|---------------------|
| AI Backend | Hermes Agent in Termux | Custom Express/Node.js server |
| LLM Provider | OpenRouter/Local models | Direct Anthropic Cloud API |
| Voice Handling | Could leverage Hermes voice | Custom React Native voice |
| Memory | Hermes persistent memory | Session-only memory |
| MCP Dispatch | Hermes built-in MCP | Custom dispatch route |

### Root Cause

The original plan (`plans/xander-voice-app-plan.md`) was underspecified. It described:
- "Xander (Phone Agent - Termux)" without specifying Hermes
- Generic tech stack without naming the AI agent framework
- Phase 6 "Conversation Engine" without referencing Hermes

The implementer built a custom solution instead of integrating the existing Hermes Agent.

---

## New Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID PHONE                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ React Native App (mobile/)                                │   │
│  │                                                           │   │
│  │ • Voice UI (VoiceButton, status display)                  │   │
│  │ • expo-speech-recognition (STT) - speech to text          │   │
│  │ • expo-speech (TTS) - text to speech                      │   │
│  │ • Audio focus management                                  │   │
│  │ • Gesture controls (interrupt, steer, etc.)               │   │
│  │                                                           │   │
│  │ ┌─────────────────────────────────────────────────────┐   │   │
│  │ │ xanderApi.ts - HTTP client to Hermes                │   │   │
│  │ │ • POST /chat - send text, get response              │   │   │
│  │ │ • Session management                                │   │   │
│  │ └─────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────┬──┘   │
│                                                           │      │
│                                          HTTP (localhost) │      │
│                                                           ▼      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ HERMES AGENT (Termux)                                     │   │
│  │                                                           │   │
│  │ Features:                                                 │   │
│  │ • Conversational AI with personality                      │   │
│  │ • OpenRouter integration (200+ LLM models)                │   │
│  │ • OR local model support (llama.cpp, etc.)                │   │
│  │ • Persistent memory (skills, user profiles)               │   │
│  │ • MCP server mode for dispatch                            │   │
│  │ • Web search & research tools                             │   │
│  │ • Self-improving capabilities                             │   │
│  │                                                           │   │
│  │ Endpoints (MCP Server Mode):                              │   │
│  │ • Chat/conversation                                       │   │
│  │ • Memory operations                                       │   │
│  │ • Tool invocation                                         │   │
│  │ • Dispatch to Silas                                       │   │
│  └────────────────────────────────────────────────────────┬──┘   │
│                                                           │      │
└───────────────────────────────────────────────────────────│──────┘
                                                            │
                                               MCP Protocol │
                                                            ▼
                           ┌──────────────────────────────────────┐
                           │ SILAS (Workstation Admin)            │
                           │                                      │
                           │ • Receives dispatched work           │
                           │ • Creates detailed plans             │
                           │ • Queues tasks for execution         │
                           │ • Async execution                    │
                           └──────────────────────────────────────┘
```

### Data Flow

```
User speaks → React Native STT → Text
    ↓
Text → HTTP POST to Hermes (localhost:PORT)
    ↓
Hermes processes with LLM + memory + tools
    ↓
Response text ← Hermes
    ↓
React Native TTS ← Text → User hears
```

---

## Component Changes

### 1. Remove: xander-engine/

**Status**: DELETE ENTIRELY

The entire `xander-engine/` directory should be removed:
- `xander-engine/src/server.ts` - Custom Express server
- `xander-engine/src/services/llmClient.ts` - Direct Anthropic API calls
- `xander-engine/src/services/sessionManager.ts` - Custom session handling
- `xander-engine/src/routes/*` - Custom routes
- All tests, config, etc.

**Reason**: Hermes provides all this functionality natively.

### 2. Add: Hermes Agent Setup

**New Component**: Hermes installation and configuration in Termux

```bash
# Termux setup
pkg install python
pip install hermes-agent  # or from source
# OR
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
```

**Configuration needed**:
- `~/.hermes/config.yaml` - Hermes configuration
- Environment variables for OpenRouter API key
- MCP server configuration for Silas dispatch

### 3. Modify: mobile/src/api/xanderApi.ts

**Status**: UPDATE to call Hermes instead of xander-engine

Current implementation calls:
- `POST /session/start`
- `POST /chat`
- `POST /session/end`
- `POST /dispatch`

New implementation should call Hermes endpoints (MCP server mode or custom wrapper).

### 4. Keep: React Native Voice Components

**Status**: KEEP with minor updates

These components remain valuable:
- `mobile/src/hooks/useVoice.ts` - STT handling
- `mobile/src/hooks/useSpeech.ts` - TTS handling
- `mobile/src/hooks/useAudioFocus.ts` - Audio focus
- `mobile/src/components/ui/VoiceButton.tsx` - UI
- `mobile/native-modules/android/` - Audio focus native module

Minor updates may be needed for error handling and Hermes integration.

### 5. Keep: Plans and Documentation

**Status**: UPDATE

- `plans/xander-voice-app-plan.md` - Update to reference Hermes
- `docs/` - Update architecture docs

---

## Migration Tasks

### Phase A: Hermes Setup (New)

| Task | Description | Estimate |
|------|-------------|----------|
| A.1 | Install Hermes in Termux | 30 min |
| A.2 | Configure Hermes (config.yaml) | 30 min |
| A.3 | Set up OpenRouter API key | 15 min |
| A.4 | Configure Hermes personality (Xander prompt) | 30 min |
| A.5 | Test Hermes CLI conversation | 15 min |
| A.6 | Configure Hermes MCP server mode | 1 hour |
| A.7 | Test Hermes HTTP/MCP endpoints | 30 min |

**Subtotal**: ~3.5 hours

### Phase B: xander-engine Removal

| Task | Description | Estimate |
|------|-------------|----------|
| B.1 | Document current API interface | 15 min |
| B.2 | Remove xander-engine directory | 5 min |
| B.3 | Update workspace configuration | 15 min |
| B.4 | Update CI/CD to remove xander-engine tests | 15 min |

**Subtotal**: ~1 hour

### Phase C: API Integration Update

| Task | Description | Estimate |
|------|-------------|----------|
| C.1 | Update xanderApi.ts for Hermes endpoints | 1 hour |
| C.2 | Update session management for Hermes | 30 min |
| C.3 | Update dispatch logic for Hermes MCP | 30 min |
| C.4 | Add error handling for Hermes | 30 min |
| C.5 | Update API tests | 1 hour |

**Subtotal**: ~3.5 hours

### Phase D: Integration Testing

| Task | Description | Estimate |
|------|-------------|----------|
| D.1 | Test voice → Hermes → voice flow | 1 hour |
| D.2 | Test conversation memory | 30 min |
| D.3 | Test dispatch to Silas | 30 min |
| D.4 | Test audio focus with Hermes | 30 min |
| D.5 | End-to-end testing | 1 hour |

**Subtotal**: ~3.5 hours

### Phase E: Documentation Update

| Task | Description | Estimate |
|------|-------------|----------|
| E.1 | Update xander-voice-app-plan.md | 30 min |
| E.2 | Update architecture docs | 30 min |
| E.3 | Create Hermes setup guide | 30 min |
| E.4 | Update README files | 15 min |

**Subtotal**: ~2 hours

---

## Total Estimated Effort

| Phase | Hours |
|-------|-------|
| Phase A: Hermes Setup | 3.5 |
| Phase B: xander-engine Removal | 1.0 |
| Phase C: API Integration Update | 3.5 |
| Phase D: Integration Testing | 3.5 |
| Phase E: Documentation Update | 2.0 |
| **Total** | **~13.5 hours** |

---

## GitHub Issues to Update

### Issues to Close/Modify

| Issue # | Title | Action |
|---------|-------|--------|
| #7 | Phase 6: Conversation Engine | CLOSE - Replace with Hermes |
| #8 | Phase 7: Light Research | MODIFY - Hermes has built-in research |
| #9 | Phase 8: Dispatcher | MODIFY - Use Hermes MCP dispatch |
| #18 | PR: xander-engine | CLOSE - Being replaced |

### New Issues to Create

| Title | Description |
|-------|-------------|
| Hermes Setup in Termux | Install and configure Hermes Agent |
| Configure Hermes for Xander Personality | Set up Xander system prompt and behavior |
| Hermes MCP Server Configuration | Configure MCP mode for API access |
| Update xanderApi.ts for Hermes | Modify API client to call Hermes |
| Remove xander-engine | Clean removal of obsolete code |
| Integration Testing with Hermes | Test full voice → Hermes → voice flow |
| Update Documentation for Hermes | Revise all docs to reflect new architecture |

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Hermes Termux compatibility issues | High | Medium | Test on device before full migration |
| Hermes API differs from expected | Medium | Medium | Review Hermes docs thoroughly |
| Performance issues on mobile | High | Low | Use OpenRouter with fast models |
| Memory constraints in Termux | Medium | Medium | Use cloud LLM, not local |

### Resource Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OpenRouter API costs | Medium | Medium | Monitor usage, set limits |
| Learning curve for Hermes | Low | Medium | Start with simple config |

---

## Success Criteria

- [ ] Hermes running in Termux on device
- [ ] React Native app successfully calls Hermes
- [ ] Conversation flows naturally with memory
- [ ] Dispatch to Silas works via MCP
- [ ] xander-engine completely removed
- [ ] All documentation updated
- [ ] GitHub issues reflect new architecture

---

## Next Steps

1. **Approve this plan** - Confirm architecture direction
2. **Update GitHub issues** - Close obsolete, create new
3. **Install Hermes** - Set up in Termux
4. **Migrate API client** - Update xanderApi.ts
5. **Test end-to-end** - Verify full flow
6. **Document** - Update all docs

---

## Appendix: Hermes Configuration Example

```yaml
# ~/.hermes/config.yaml (example)
model_provider: openrouter
model_name: anthropic/claude-3.5-sonnet  # or other models

system_prompt: |
  You are Xander, a conversational AI companion running on a phone. 
  Your primary job is to be great to talk to - like a smart friend 
  the user can brainstorm with, especially while driving.
  
  ## Your Personality
  - Natural and conversational - not robotic or formal
  - Listen actively and ask good follow-up questions
  - Think WITH the user, not FOR them
  - Be concise since responses will be spoken aloud (TTS)
  - Warm, helpful, and engaged without being overly enthusiastic

mcp:
  enabled: true
  port: 3000
  
memory:
  enabled: true
  persist: true
```

---

*Document created: 2025-01-XX*
*Last updated: 2025-01-XX*
