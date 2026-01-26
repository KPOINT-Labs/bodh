# V2 VideoPanel - KPoint Player Wrapper

## Overview

VideoPanel wraps the existing V1 KPoint player logic. For the initial V2 migration, it's a thin integration layer — no optimization, just proper V2 architecture integration.

**Design Decision:** Mirror V1 functionality. Focus on architecture, not player optimization.

## Responsibilities

| What It Does | How |
|--------------|-----|
| Render KPoint player | V1 pattern with `window.kPointPlayer.init()` |
| Register action handlers | `useRegisterActionHandlers()` for play/pause/seek |
| Trigger in-lesson quizzes | `useMessages().triggerInlesson(questionId)` on timestamp |
| Report progress | Existing progress tracking on timeupdate |
| Close panel | Calls `onClose` prop (from `useLearningPanel`) |

## What It Does NOT Do (For Now)

- Transcript sync highlighting
- Custom playback controls
- Chapter markers
- Playback speed controls
- Any V1 optimization

## Integration Points

| Need | Source |
|------|--------|
| Lesson video ID | Props from ModuleView (derived from URL) |
| Trigger in-lesson quiz | `useMessages().triggerInlesson()` |
| Register video handlers | `useRegisterActionHandlers()` |
| Close panel | `onClose` prop |

## File: `components/VideoPanel.tsx`

```typescript
"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRegisterActionHandlers } from "../providers/ActionsProvider";
import { useMessages } from "../providers/MessagesProvider";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  kpointVideoId?: string | null;
  quiz?: unknown;
}

interface VideoPanelProps {
  lesson: Lesson;
  highlightPanel?: boolean;
  onClose: () => void;
}

export function VideoPanel({ lesson, highlightPanel, onClose }: VideoPanelProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const kpointPlayerRef = useRef<any>(null);
  const triggeredQuestionsRef = useRef<Set<string>>(new Set());
  const { triggerInlesson } = useMessages();

  // ---------------------------------------------------------------------------
  // Player Controls
  // ---------------------------------------------------------------------------

  const playVideo = useCallback(() => {
    kpointPlayerRef.current?.play?.();
  }, []);

  const pauseVideo = useCallback(() => {
    kpointPlayerRef.current?.pause?.();
  }, []);

  const seekTo = useCallback((time: number) => {
    kpointPlayerRef.current?.seek?.(time);
  }, []);

  // ---------------------------------------------------------------------------
  // Action Handler Registration
  // ---------------------------------------------------------------------------

  useRegisterActionHandlers([
    { actionType: "inlesson_complete", buttonId: "continue_video", handler: playVideo },
    { actionType: "lesson_welcome", buttonId: "skip", handler: playVideo },
    { actionType: "warmup_complete", buttonId: "watch_lesson", handler: playVideo },
    { actionType: "lesson_welcome_back", buttonId: "continue", handler: (meta) => {
      const lastPosition = (meta as any)?.lastPosition || 0;
      seekTo(lastPosition);
      playVideo();
    }},
    { actionType: "lesson_welcome_back", buttonId: "restart", handler: () => {
      seekTo(0);
      playVideo();
    }},
  ]);

  // ---------------------------------------------------------------------------
  // KPoint Player Initialization (V1 Pattern)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!lesson.kpointVideoId || !playerRef.current) return;

    // Wait for KPoint script to load (loaded in layout.tsx)
    const initPlayer = () => {
      if (!window.kPointPlayer) {
        setTimeout(initPlayer, 100);
        return;
      }

      const player = window.kPointPlayer.init({
        container: playerRef.current,
        videoId: lesson.kpointVideoId,
        autoplay: false,
        // ... other V1 config options
      });

      kpointPlayerRef.current = player;
    };

    initPlayer();

    return () => {
      kpointPlayerRef.current?.destroy?.();
      kpointPlayerRef.current = null;
    };
  }, [lesson.kpointVideoId]);

  // ---------------------------------------------------------------------------
  // In-Lesson Quiz Trigger
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const player = kpointPlayerRef.current;
    if (!player || !lesson.quiz) return;

    const inlessonQuestions = (lesson.quiz as any)?.inlesson || [];
    if (inlessonQuestions.length === 0) return;

    const handleTimeUpdate = (event: { currentTime: number }) => {
      const time = event.currentTime;

      for (const question of inlessonQuestions) {
        // Skip if already triggered
        if (triggeredQuestionsRef.current.has(question.id)) continue;

        // Check if we're at the question timestamp (within 0.5s tolerance)
        if (Math.abs(time - question.timestamp) < 0.5) {
          pauseVideo();
          triggerInlesson(question.id);
          triggeredQuestionsRef.current.add(question.id);
        }
      }
    };

    player.on?.("timeupdate", handleTimeUpdate);
    return () => player.off?.("timeupdate", handleTimeUpdate);
  }, [lesson.quiz, pauseVideo, triggerInlesson]);

  // Reset triggered questions when lesson changes
  useEffect(() => {
    triggeredQuestionsRef.current.clear();
  }, [lesson.id]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={cn(
      "relative h-full bg-black rounded-lg overflow-hidden",
      highlightPanel && "ring-2 ring-blue-500 ring-offset-2 transition-all duration-300"
    )}>
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Lesson title overlay */}
      <div className="absolute top-2 left-2 z-10 bg-black/50 px-2 py-1 rounded text-white text-sm">
        {lesson.title}
      </div>

      {/* KPoint player container */}
      <div ref={playerRef} className="w-full h-full" />
    </div>
  );
}

// TypeScript: Declare KPoint on window
declare global {
  interface Window {
    kPointPlayer?: {
      init: (config: any) => any;
    };
  }
}
```

## Action Handlers Registered

| Action Type | Button ID | Handler |
|-------------|-----------|---------|
| `inlesson_complete` | `continue_video` | `playVideo()` |
| `lesson_welcome` | `skip` | `playVideo()` |
| `warmup_complete` | `watch_lesson` | `playVideo()` |
| `lesson_welcome_back` | `continue` | `seekTo(lastPosition)` + `playVideo()` |
| `lesson_welcome_back` | `restart` | `seekTo(0)` + `playVideo()` |

## Props

```typescript
interface VideoPanelProps {
  lesson: Lesson;           // Current lesson with kpointVideoId
  highlightPanel?: boolean; // Ring highlight animation
  onClose: () => void;      // Close handler (calls closeRightPanel)
}
```

## Usage in ModuleView

```typescript
const rightPanel =
  isRightPanelOpen && activeLesson?.kpointVideoId ? (
    <VideoPanel
      lesson={activeLesson}
      highlightPanel={highlightRightPanel}
      onClose={handleClosePanel}
    />
  ) : null;
```

## Lines of Code

~100 lines — Thin wrapper around V1 KPoint logic with V2 integration hooks.

## Future Optimization (Not Now)

When ready to optimize VideoPanel:
- Custom controls UI
- Transcript sync highlighting
- Chapter markers from video metadata
- Playback speed controls
- Picture-in-picture support
- Keyboard shortcuts
