# Welcome Flow TTS Design

**Date:** 2026-01-19
**Status:** Approved

## Problem

The welcome flow in `/app/(learning)/courses/WelcomeContent.tsx` has inconsistent TTS behavior:
- Initial "नमस्ते!" welcome message plays TTS
- "Great! Here are all the available courses..." message is silent
- Manual `speak()` calls required for each AI message

## Solution

Centralize TTS triggering in the `addAIMessage` helper function so all AI messages automatically speak, with support for interrupting previous audio.

## Requirements

1. All AI messages in welcome flow should trigger TTS automatically
2. TTS should play immediately when message is added (not after animation)
3. TTS must respect global mute state from AudioToggleButton
4. New AI messages should interrupt previous TTS if still playing
5. Existing animation behavior must remain unchanged

## Design

### 1. Add Interrupt Parameter to TTS Hook

**File:** `/lib/tts.ts`

Add `interrupt` option to `TTSOptions` interface:

```typescript
export interface TTSOptions {
  voice?: "nova" | "marin" | "alloy" | "echo" | "fable" | "onyx" | "shimmer";
  speed?: number;
  model?: string;
  interrupt?: boolean; // Allow interrupting current playback
}
```

### 2. Update useTTS Hook

**File:** `/hooks/useTTS.ts`

Modify the `speak()` function to handle interrupt parameter:

```typescript
const speak = async (text: string, options?: TTSOptions) => {
  // If interrupt is true, stop current playback and proceed
  if (options?.interrupt) {
    stop();
  }

  // Safety check: prevent duplicate playback unless interrupting
  if (isLoading || isPlaying) {
    console.log("[useTTS] Already loading or playing, skipping duplicate request");
    return;
  }

  // Early return if muted
  if (isMuted) {
    console.log("[useTTS] Audio is muted, skipping playback");
    return;
  }

  // Stop any currently playing audio
  stop();

  // ... rest of the function remains unchanged
```

### 3. Update WelcomeContent Component

**File:** `/app/(learning)/courses/WelcomeContent.tsx`

#### Change 1: Modify `addAIMessage` to trigger TTS

```typescript
const addAIMessage = (content: string, onComplete?: () => void) => {
  const newMessage: Message = {
    id: Date.now().toString() + Math.random(),
    type: 'ai',
    content,
    enableAnimation: true,
    onAnimationComplete: () => {
      if (onComplete) {
        onComplete();
      }
    }
  };
  setMessages(prev => [...prev, newMessage]);

  // Trigger TTS immediately with interrupt enabled
  if (content) {
    speak(content, { interrupt: true });
  }
};
```

#### Change 2: Refactor initial welcome message

**Before (lines 83-103):**
```typescript
setTimeout(() => {
  const welcomeMessage: Message = {
    id: Date.now().toString() + Math.random(),
    type: 'ai',
    content: "नमस्ते! I'm your personal AI learning companion...",
    enableAnimation: true,
    onAnimationComplete: () => {
      setTimeout(() => {
        setShowButtons(true);
      }, 2000);
    }
  };
  setMessages([welcomeMessage]);

  if (welcomeMessage.content) {
    speak(welcomeMessage.content);
  }
}, 500);
```

**After:**
```typescript
setTimeout(() => {
  addAIMessage(
    "नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together.",
    () => {
      setTimeout(() => {
        setShowButtons(true);
      }, 2000);
    }
  );
}, 500);
```

## Edge Cases Handled

1. **Empty/null content:** Check `if (content)` before calling `speak()`
2. **Rapid message succession:** `interrupt: true` ensures new message stops old one
3. **Component unmount during TTS:** Handled by existing `useTTS` cleanup
4. **Global mute state:** Respected by `useTTS` hook's `isMuted` check

## Files Modified

- `/lib/tts.ts` - Add `interrupt` field to `TTSOptions`
- `/hooks/useTTS.ts` - Handle `interrupt` parameter in `speak()`
- `/app/(learning)/courses/WelcomeContent.tsx` - Update `addAIMessage` and refactor welcome message

## Testing Checklist

- [ ] Initial welcome message plays TTS
- [ ] Course browser message plays TTS after clicking "Browse All Courses"
- [ ] TTS respects global mute state (no audio when muted)
- [ ] New AI message interrupts previous TTS if still playing
- [ ] Message animations still work correctly
- [ ] Button timing remains unchanged (shows after 2s delay)
- [ ] No TTS plays when component unmounts mid-speech

## Benefits

- **Consistency:** All AI messages automatically get TTS
- **Maintainability:** Single code path for AI message TTS
- **Flexibility:** `interrupt` parameter allows control per message
- **Backward Compatible:** Existing `speak()` calls unchanged
- **No Breaking Changes:** Preserves all existing behavior
