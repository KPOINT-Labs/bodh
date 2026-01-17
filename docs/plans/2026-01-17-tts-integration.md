# TTS Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a reusable Text-to-Speech system with OpenAI TTS API, database caching, and global audio controls for the learning platform.

**Architecture:** Global AudioContext manages mute state across app. useTTS hook provides playback controls. Server action handles cache-first TTS generation with PostgreSQL storage. Auto-plays welcome message on /courses page.

**Tech Stack:** Next.js 16, React 19, TypeScript, OpenAI TTS API, Prisma 7, PostgreSQL, shadcn/ui

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `bun.lockb`

**Step 1: Install OpenAI SDK**

Run:
```bash
bun add openai
```

Expected: Package added to dependencies, lockfile updated

**Step 2: Verify installation**

Run:
```bash
bun pm ls | grep openai
```

Expected: Shows `openai@<version>`

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "deps: add openai SDK for TTS generation"
```

---

## Task 2: Configure Environment Variables

**Files:**
- Modify: `.env`

**Step 1: Add OPENAI_API_KEY to .env**

Open `.env` and add:

```env
OPENAI_API_KEY=sk_your_key_here
```

**Note:** User should replace `sk_your_key_here` with their actual OpenAI API key.

**Step 2: Verify environment variable**

Run:
```bash
grep OPENAI_API_KEY .env
```

Expected: Shows `OPENAI_API_KEY=sk_...`

**Step 3: Skip commit**

`.env` is gitignored - no commit needed.

---

## Task 3: Update Database Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add TTSCache model to schema**

Open `prisma/schema.prisma` and add this model at the end of the file:

```prisma
model TTSCache {
  id         String   @id @default(cuid())
  textHash   String   @unique
  text       String   @db.Text
  audioData  String   @db.Text
  voice      String
  speed      Float
  model      String
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @default(now()) @updatedAt

  @@index([textHash])
  @@index([lastUsedAt])
}
```

**Step 2: Format schema**

Run:
```bash
./node_modules/.bin/prisma format
```

Expected: Schema formatted successfully

**Step 3: Push schema to database**

Run:
```bash
./node_modules/.bin/prisma db push
```

Expected:
```
✔ Generated Prisma Client
Database synchronized with schema
```

**Step 4: Verify table created**

Run:
```bash
./node_modules/.bin/prisma studio
```

Then check for `TTSCache` table in the browser UI. Close Prisma Studio after verification.

**Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add TTSCache model for audio caching"
```

---

## Task 4: Create Type Definitions

**Files:**
- Create: `lib/tts.ts`

**Step 1: Create lib/tts.ts with type definitions**

Create `lib/tts.ts`:

```typescript
/**
 * TTS Configuration Types and Constants
 */

export interface TTSOptions {
  voice?: string;
  speed?: number;
  model?: string;
}

export interface TTSConfig {
  voice: string;
  speed: number;
  model: string;
}

export interface TTSResult {
  success: boolean;
  audioData?: string; // Base64-encoded MP3
  error?: string;
}

/**
 * Default TTS configuration matching BODH agent
 */
export const DEFAULT_TTS_CONFIG: TTSConfig = {
  voice: "marin",
  speed: 1.2,
  model: "gpt-4o-mini-tts",
};

/**
 * Available OpenAI TTS voices
 */
export const TTS_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
  "marin", // Default for BODH agent
] as const;

export type TTSVoice = (typeof TTS_VOICES)[number];
```

**Step 2: Verify file created**

Run:
```bash
cat lib/tts.ts | head -20
```

Expected: Shows type definitions

**Step 3: Commit**

```bash
git add lib/tts.ts
git commit -m "feat: add TTS type definitions and constants"
```

---

## Task 5: Create AudioContext Provider

**Files:**
- Create: `contexts/AudioContext.tsx`

**Step 1: Create contexts directory**

Run:
```bash
mkdir -p contexts
```

**Step 2: Create AudioContext.tsx**

Create `contexts/AudioContext.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AudioContextType {
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  setIsPlaying: (playing: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load muted state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("audio-muted");
    if (saved !== null) {
      setIsMuted(saved === "true");
    }
  }, []);

  // Save muted state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("audio-muted", String(isMuted));
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <AudioContext.Provider
      value={{
        isMuted,
        isPlaying,
        toggleMute,
        setIsPlaying,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudioContext must be used within AudioContextProvider");
  }
  return context;
}
```

**Step 3: Verify file created**

Run:
```bash
cat contexts/AudioContext.tsx | grep "export function"
```

Expected: Shows `AudioContextProvider` and `useAudioContext`

**Step 4: Commit**

```bash
git add contexts/AudioContext.tsx
git commit -m "feat: add AudioContext for global audio state management"
```

---

## Task 6: Create TTS Server Action

**Files:**
- Create: `actions/tts.ts`

**Step 1: Create actions/tts.ts**

Create `actions/tts.ts`:

```typescript
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";
import { createHash } from "crypto";
import { DEFAULT_TTS_CONFIG, TTSResult } from "@/lib/tts";

const ttsSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.string().default(DEFAULT_TTS_CONFIG.voice),
  speed: z.number().min(0.5).max(2.0).default(DEFAULT_TTS_CONFIG.speed),
  model: z.string().default(DEFAULT_TTS_CONFIG.model),
});

export async function generateTTS(
  text: string,
  options?: {
    voice?: string;
    speed?: number;
    model?: string;
  }
): Promise<TTSResult> {
  try {
    // Validate input
    const validated = ttsSchema.parse({
      text,
      voice: options?.voice,
      speed: options?.speed,
      model: options?.model,
    });

    const { text: validatedText, voice, speed, model } = validated;

    // Generate cache hash
    const textHash = createHash("sha256")
      .update(`${validatedText}:${voice}:${speed}:${model}`)
      .digest("hex");

    // Check cache first
    const cached = await prisma.tTSCache.findUnique({
      where: { textHash },
    });

    if (cached) {
      console.log("[TTS] Cache hit for textHash:", textHash.substring(0, 16));

      // Update lastUsedAt
      await prisma.tTSCache.update({
        where: { textHash },
        data: { lastUsedAt: new Date() },
      });

      return {
        success: true,
        audioData: cached.audioData,
      };
    }

    console.log("[TTS] Cache miss, calling OpenAI API");

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Call OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: model,
      voice: voice as any,
      speed: speed,
      input: validatedText,
      response_format: "mp3",
    });

    // Convert to base64
    const buffer = Buffer.from(await response.arrayBuffer());
    const audioData = buffer.toString("base64");

    console.log("[TTS] Generated audio, size:", audioData.length, "bytes (base64)");

    // Save to cache
    await prisma.tTSCache.create({
      data: {
        textHash,
        text: validatedText,
        audioData,
        voice,
        speed,
        model,
        lastUsedAt: new Date(),
      },
    });

    console.log("[TTS] Saved to cache");

    return {
      success: true,
      audioData,
    };
  } catch (error: any) {
    console.error("[TTS] Error:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid input parameters",
      };
    }

    if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
      return {
        success: false,
        error: "Network error - please check your connection",
      };
    }

    return {
      success: false,
      error: error?.message || "Failed to generate audio",
    };
  }
}
```

**Step 2: Verify file created**

Run:
```bash
cat actions/tts.ts | grep "export async function"
```

Expected: Shows `generateTTS`

**Step 3: Commit**

```bash
git add actions/tts.ts
git commit -m "feat: add TTS server action with cache-first strategy"
```

---

## Task 7: Create useTTS Hook

**Files:**
- Create: `hooks/useTTS.ts`

**Step 1: Create hooks directory**

Run:
```bash
mkdir -p hooks
```

**Step 2: Create useTTS.ts**

Create `hooks/useTTS.ts`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useAudioContext } from "@/contexts/AudioContext";
import { generateTTS } from "@/actions/tts";
import { TTSOptions } from "@/lib/tts";

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMuted, setIsPlaying: setGlobalPlaying } = useAudioContext();

  // Auto-stop when muted
  useEffect(() => {
    if (isMuted && isPlaying) {
      stop();
    }
  }, [isMuted, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setGlobalPlaying(false);
  };

  const speak = async (text: string, options?: TTSOptions) => {
    // Early return if muted
    if (isMuted) {
      console.log("[useTTS] Audio is muted, skipping playback");
      return;
    }

    // Stop any currently playing audio
    stop();

    setIsLoading(true);
    setError(null);

    try {
      // Call server action
      const result = await generateTTS(text, options);

      if (!result.success || !result.audioData) {
        setError(result.error || "Failed to generate audio");
        console.error("[useTTS] Generation failed:", result.error);
        return;
      }

      // Create audio element
      const audio = new Audio(`data:audio/mp3;base64,${result.audioData}`);
      audioRef.current = audio;

      // Set up event listeners
      audio.onplay = () => {
        console.log("[useTTS] Audio started playing");
        setIsPlaying(true);
        setGlobalPlaying(true);
      };

      audio.onended = () => {
        console.log("[useTTS] Audio finished playing");
        setIsPlaying(false);
        setGlobalPlaying(false);
      };

      audio.onerror = (e) => {
        console.error("[useTTS] Audio playback error:", e);
        setError("Audio playback failed");
        setIsPlaying(false);
        setGlobalPlaying(false);
      };

      // Play audio
      await audio.play();
    } catch (err: any) {
      console.error("[useTTS] Error:", err);
      setError(err?.message || "Failed to generate audio");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    error,
  };
}
```

**Step 3: Verify file created**

Run:
```bash
cat hooks/useTTS.ts | grep "export function"
```

Expected: Shows `useTTS`

**Step 4: Commit**

```bash
git add hooks/useTTS.ts
git commit -m "feat: add useTTS hook for TTS playback control"
```

---

## Task 8: Create AudioToggleButton Component

**Files:**
- Create: `components/audio/AudioToggleButton.tsx`

**Step 1: Create components/audio directory**

Run:
```bash
mkdir -p components/audio
```

**Step 2: Create AudioToggleButton.tsx**

Create `components/audio/AudioToggleButton.tsx`:

```typescript
"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useAudioContext } from "@/contexts/AudioContext";

export function AudioToggleButton() {
  const { isMuted, toggleMute } = useAudioContext();

  return (
    <button
      onClick={toggleMute}
      className={`p-2 rounded-lg transition-all hover:scale-110 ${
        isMuted
          ? "bg-gray-300 text-gray-600 hover:bg-gray-400"
          : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      title={isMuted ? "Unmute voice" : "Mute voice"}
      aria-label={isMuted ? "Unmute voice" : "Mute voice"}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
    </button>
  );
}
```

**Step 3: Verify file created**

Run:
```bash
cat components/audio/AudioToggleButton.tsx | grep "export function"
```

Expected: Shows `AudioToggleButton`

**Step 4: Commit**

```bash
git add components/audio/AudioToggleButton.tsx
git commit -m "feat: add AudioToggleButton component for global audio control"
```

---

## Task 9: Wrap App with AudioContextProvider

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Read current layout**

Run:
```bash
cat app/layout.tsx | head -50
```

Check the current structure to find where to add the provider.

**Step 2: Add import and wrap children**

Open `app/layout.tsx` and:

1. Add import at the top:
```typescript
import { AudioContextProvider } from "@/contexts/AudioContext";
```

2. Find the `<body>` tag and wrap its children with `<AudioContextProvider>`:

Before:
```typescript
<body className={font.className}>
  {children}
</body>
```

After:
```typescript
<body className={font.className}>
  <AudioContextProvider>
    {children}
  </AudioContextProvider>
</body>
```

**Step 3: Verify changes**

Run:
```bash
grep -A 3 "AudioContextProvider" app/layout.tsx
```

Expected: Shows the import and wrapping

**Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wrap app with AudioContextProvider for global audio state"
```

---

## Task 10: Integrate TTS into WelcomeContent

**Files:**
- Modify: `app/(learning)/courses/WelcomeContent.tsx`

**Step 1: Read current WelcomeContent**

Run:
```bash
cat app/(learning)/courses/WelcomeContent.tsx | head -100
```

Check the current structure.

**Step 2: Add imports**

At the top of `WelcomeContent.tsx`, add:

```typescript
"use client";

import { useEffect } from "react";
import { useTTS } from "@/hooks/useTTS";
import { AudioToggleButton } from "@/components/audio/AudioToggleButton";
```

**Note:** If `"use client"` already exists, don't duplicate it.

**Step 3: Add useTTS hook**

Inside the `WelcomeContent` component function (after the existing hooks), add:

```typescript
const { speak } = useTTS();
```

**Step 4: Add auto-play effect**

After the hook, add:

```typescript
useEffect(() => {
  // Auto-play welcome message on mount
  speak(
    "नमस्ते! I'm your personal AI learning companion. I'm here whenever you need help—clarifying a concept, checking your understanding, or even just exploring new ideas. Let's learn together."
  );
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 5: Add AudioToggleButton to header**

Find the header section (around line 33-40) with the AI Assistant avatar and title. Modify the structure:

Before:
```typescript
<div className="flex items-center gap-3">
  {/* Avatar and title */}
</div>
```

After:
```typescript
<div className="flex items-center justify-between w-full">
  <div className="flex items-center gap-3">
    {/* Avatar and title */}
  </div>
  <div className="flex items-center gap-2">
    <AudioToggleButton />
  </div>
</div>
```

**Step 6: Verify changes**

Run:
```bash
grep -n "AudioToggleButton\|useTTS" app/(learning)/courses/WelcomeContent.tsx
```

Expected: Shows imports and usage

**Step 7: Commit**

```bash
git add app/(learning)/courses/WelcomeContent.tsx
git commit -m "feat: integrate TTS auto-play and audio toggle in WelcomeContent"
```

---

## Task 11: Manual Verification

**Files:**
- None (verification only)

**Step 1: Start development server**

Run:
```bash
bun run dev
```

Expected: Server starts on http://localhost:3000

**Step 2: Navigate to /courses page**

1. Open browser to http://localhost:3000/courses
2. Check browser console for logs

Expected:
- `[TTS] Cache miss, calling OpenAI API` (first time)
- `[TTS] Generated audio, size: XXXXX bytes`
- `[TTS] Saved to cache`
- `[useTTS] Audio started playing`
- Audio should play automatically

**Step 3: Verify cache hit**

1. Refresh the page
2. Check browser console

Expected:
- `[TTS] Cache hit for textHash: ...`
- Audio plays instantly (no API call)

**Step 4: Test mute button**

1. Click the audio toggle button (Volume2 icon)
2. Verify icon changes to VolumeX
3. Verify audio stops if playing
4. Refresh page
5. Verify no audio plays (muted state persisted)

**Step 5: Test unmute**

1. Click the audio toggle button again
2. Verify icon changes to Volume2
3. Audio should NOT auto-play (already played on this visit)
4. Refresh page
5. Verify audio auto-plays again

**Step 6: Check database**

Run:
```bash
./node_modules/.bin/prisma studio
```

1. Open TTSCache table
2. Verify one entry exists with:
   - textHash (unique)
   - text (the welcome message)
   - audioData (large base64 string)
   - voice = "marin"
   - speed = 1.2
   - model = "gpt-4o-mini-tts"
   - createdAt and lastUsedAt timestamps

**Step 7: Stop dev server**

Press Ctrl+C to stop the server.

**Step 8: No commit**

Verification only - no files changed.

---

## Task 12: Final Documentation Update

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add TTS section to CLAUDE.md**

Open `CLAUDE.md` and add this section after the "Database Schema Workflow" section:

```markdown
## Text-to-Speech (TTS) System

### Architecture
- **Global State**: `AudioContext` provider manages mute state and playback status
- **Hook**: `useTTS()` provides `speak()` function for playback
- **Server Action**: `generateTTS()` handles cache-first audio generation
- **Caching**: PostgreSQL `TTSCache` table stores base64-encoded MP3 audio

### Usage in Components

**Basic usage:**
```typescript
"use client";

import { useTTS } from "@/hooks/useTTS";

export function MyComponent() {
  const { speak, isLoading, isPlaying } = useTTS();

  const handleSpeak = () => {
    speak("Hello! This is a text-to-speech example.");
  };

  return <button onClick={handleSpeak}>Speak</button>;
}
```

**With custom voice/speed:**
```typescript
speak("Custom voice example", {
  voice: "nova",
  speed: 1.0,
});
```

### Global Audio Control

The `AudioToggleButton` component provides global mute/unmute control:
- Located in WelcomeContent header
- State persisted in localStorage
- When muted, ALL TTS playback is prevented

### Configuration

Default TTS settings (matching BODH agent):
- **Voice**: marin
- **Speed**: 1.2 (20% faster)
- **Model**: gpt-4o-mini-tts
- **Format**: MP3

See `lib/tts.ts` for type definitions and constants.

### Cache Management

TTS audio is cached in PostgreSQL:
- **Key**: SHA-256 hash of `text:voice:speed:model`
- **Storage**: Base64-encoded MP3 in `audioData` column
- **Tracking**: `lastUsedAt` updated on cache hits
- **Future**: Can implement cleanup of unused entries

### Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key for TTS generation

```

**Step 2: Verify changes**

Run:
```bash
grep -A 5 "Text-to-Speech" CLAUDE.md
```

Expected: Shows the new TTS section

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add TTS system documentation to CLAUDE.md"
```

---

## Implementation Complete

All tasks finished! The TTS system is now fully integrated.

**Features implemented:**
✅ OpenAI TTS API integration with marin voice at 1.2x speed
✅ PostgreSQL caching for instant replay and cost savings
✅ Global audio toggle button with localStorage persistence
✅ Auto-play welcome message on /courses page
✅ Reusable `useTTS` hook for future TTS features

**Next steps:**
1. Verify all features work as expected
2. Consider merging to main branch using @superpowers:finishing-a-development-branch
3. Future enhancements: Multiple voices, speed control, cache management UI
