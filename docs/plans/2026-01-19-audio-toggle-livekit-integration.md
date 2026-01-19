# AudioToggleButton + LiveKit Audio Control Integration

**Date:** 2026-01-19
**Status:** Approved

## Purpose

Unify audio mute control so AudioToggleButton controls both client-side TTS and LiveKit agent audio output.

## User Experience

- User clicks mute button in LessonHeader
- Agent immediately stops producing audio (no more TTS)
- Text transcription continues to appear in chat
- Unmuting resumes agent audio output

## Architecture

```
┌─────────────────────────┐
│   AudioToggleButton     │
│   (components/audio/)   │
└───────────┬─────────────┘
            │ onClick
            ▼
┌─────────────────────────┐
│   AudioContext          │  ← Controls client-side TTS mute (existing)
│   (contexts/)           │
└───────────┬─────────────┘
            │ onMuteChange callback
            ▼
┌─────────────────────────┐
│   useLiveKit            │  ← New: setAudioOutputEnabled()
│   (hooks/)              │
└───────────┬─────────────┘
            │ RPC call
            ▼
┌─────────────────────────┐
│   Prism Agent (Python)  │  ← New: set_audio_output RPC method
│   session.output        │
│   .set_audio_enabled()  │
└─────────────────────────┘
```

## Changes Required

### 1. Prism Agent (`prism2/app/agents/livekit/bodh/agent.py`)

Add RPC method after existing voice mode methods (~line 1057):

```python
@ctx.room.local_participant.register_rpc_method("set_audio_output")
async def set_audio_output(data: rtc.RpcInvocationData) -> str:
    """Enable or disable TTS audio output"""
    payload = json.loads(data.payload)
    enabled = payload.get("enabled", True)

    session.output.set_audio_enabled(enabled)
    logger.info(f"[AUDIO OUTPUT] Set to: {enabled}")

    return json.dumps({"success": True, "audio_output_enabled": enabled})
```

### 2. useLiveKit Hook (`hooks/useLiveKit.ts`)

- Add `isOutputMuted` state
- Add `setAudioOutputEnabled(enabled: boolean)` function with RPC call
- Export in return object

### 3. AudioContext (`contexts/AudioContext.tsx`)

- Add `registerMuteCallback` / `unregisterMuteCallback` functions
- Call registered callbacks when mute state changes via `toggleMute` or `setMuted`

### 4. ModuleContent (`app/(learning)/course/[courseId]/module/[moduleId]/ModuleContent.tsx`)

- Register LiveKit's `setAudioOutputEnabled` with AudioContext's callback mechanism
- Unregister on cleanup

### 5. AudioToggleButton (`components/audio/AudioToggleButton.tsx`)

- No changes needed (uses AudioContext which triggers callbacks)

## Data Flow

1. User clicks AudioToggleButton
2. `toggleMute()` called in AudioContext
3. AudioContext updates `isMuted` state + calls registered callbacks
4. ModuleContent's callback calls `liveKit.setAudioOutputEnabled(!muted)`
5. useLiveKit makes RPC call to agent: `set_audio_output`
6. Agent calls `session.output.set_audio_enabled(enabled)`
7. Agent stops/resumes TTS audio output

## Error Handling

- If RPC fails (agent disconnected), log warning but don't break UI
- Mute state in AudioContext remains source of truth for UI
- Agent reconnection doesn't auto-sync mute state (acceptable for MVP)

## Scope Exclusions

- Mode switching UI (text_to_text, voice_to_voice, etc.)
- Changes to voice input mode (STT)
- Persistence of mute state on agent side
