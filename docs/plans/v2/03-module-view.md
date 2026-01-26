# V2 ModuleView - Main Client Component

## Overview

The `ModuleView` is the main client component that:
1. Receives server-fetched data from `page.tsx` 
2. Wraps the app with `LiveKitRoom` from official SDK
3. Uses `useLearningPanel()` for panel/lesson state (nuqs URL sync)
4. Updates room metadata when lesson changes
5. Orchestrates child components (~150 lines vs v1's 1277 lines)

## File: `app/(learning)/v2/course/[courseId]/module/[moduleId]/ModuleView.tsx`

```typescript
"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useDataChannel,
  useRoomContext,
} from "@livekit/components-react";
import type { Room } from "livekit-client";

import { ResizableContent } from "@/components/layout/resizable-content";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { updateRoomMetadata } from "@/actions/livekit";
import type { SessionTypeResult } from "@/actions/session-type";
import { ChatPanel } from "./components/ChatPanel";
import { ChatInput } from "./components/ChatInput";
import { VideoPanel } from "./components/VideoPanel";
import { ModuleHeader } from "./components/ModuleHeader";
import { ModuleProvider } from "./providers/ModuleProvider";
import { MessagesProvider } from "./providers/MessagesProvider";

// Note: KPoint script + AnimatedBackground loaded in app/(learning)/layout.tsx - see 02.1-kpoint-script-layout.md

// Types
interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
  duration?: number;
  quiz?: unknown;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

interface ModuleViewProps {
  course: Course;
  module: Module;
  userId: string;
  userName: string;
  roomName: string;
  liveKitToken: string; // Always present - page.tsx redirects if token generation fails
  sessionType: SessionTypeResult;
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

export function ModuleView({
  course,
  module,
  userId,
  userName,
  roomName,
  liveKitToken,
  sessionType,
}: ModuleViewProps) {
  // Panel state from context (URL-synced via nuqs)
  const {
    isRightPanelOpen,
    openRightPanel,
    closeRightPanel,
    selectedLessonId,
    setSelectedLessonId,
    highlightRightPanel,
    collapseSidebar,
    expandSidebar,
  } = useLearningPanel();

  // Derive active lesson from URL state
  const sortedLessons = useMemo(
    () => [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex),
    [module.lessons]
  );

  const activeLesson = useMemo(() => {
    if (selectedLessonId) {
      return sortedLessons.find((l) => l.id === selectedLessonId) || sortedLessons[0];
    }
    return sortedLessons[0];
  }, [selectedLessonId, sortedLessons]);

  // Auto-collapse sidebar when video panel opens
  useEffect(() => {
    if (isRightPanelOpen && activeLesson?.kpointVideoId) {
      collapseSidebar();
    } else if (!isRightPanelOpen) {
      expandSidebar();
    }
  }, [isRightPanelOpen, activeLesson?.kpointVideoId, collapseSidebar, expandSidebar]);

  // Handle lesson selection
  const handleLessonSelect = useCallback(
    (lesson: Lesson) => {
      setSelectedLessonId(lesson.id);
      openRightPanel();
    },
    [setSelectedLessonId, openRightPanel]
  );

  // Handle panel close
  const handleClosePanel = useCallback(() => {
    closeRightPanel();
  }, [closeRightPanel]);

  return (
    <ModuleProvider
      course={course}
      module={module}
      userId={userId}
      activeLesson={activeLesson}
      sessionType={sessionType}
    >
      <LiveKitRoom
        serverUrl={LIVEKIT_URL}
        token={liveKitToken}
        connect={true}
        audio={false} // Start with mic off
        video={false}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        <RoomAudioRenderer />
        <MessagesProvider>
          <RoomMetadataUpdater
            roomName={roomName}
            course={course}
            module={module}
            activeLesson={activeLesson}
            sessionType={sessionType}
          />
          <ModuleLayout
            course={course}
            module={module}
            activeLesson={activeLesson}
            isRightPanelOpen={isRightPanelOpen}
            highlightRightPanel={highlightRightPanel}
            onClosePanel={handleClosePanel}
            onLessonSelect={handleLessonSelect}
          />
        </MessagesProvider>
      </LiveKitRoom>
    </ModuleProvider>
  );
}

// Separate component to update room metadata when lesson changes
function RoomMetadataUpdater({
  roomName,
  course,
  module,
  activeLesson,
  sessionType,
}: {
  roomName: string;
  course: Course;
  module: Module;
  activeLesson: Lesson | undefined;
  sessionType: SessionTypeResult;
}) {
  const room = useRoomContext();
  const prevLessonIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Only update if lesson actually changed (not on first render)
    if (prevLessonIdRef.current && prevLessonIdRef.current !== activeLesson?.id) {
      const newMetadata = {
        courseId: course.id,
        courseTitle: course.title,
        moduleId: module.id,
        moduleTitle: module.title,
        lessonId: activeLesson?.id,
        lessonTitle: activeLesson?.title,
        videoIds: activeLesson?.kpointVideoId ? [activeLesson.kpointVideoId] : [],
        learningObjectives: course.learningObjectives,
        sessionType: sessionType.sessionType,
        // Note: lessonNumber would need to be recalculated for the new lesson
        // For now, we keep the original sessionType data
      };

      // Update room metadata via server action
      updateRoomMetadata(roomName, newMetadata).catch(console.error);
    }

    prevLessonIdRef.current = activeLesson?.id;
  }, [activeLesson?.id, activeLesson?.title, activeLesson?.kpointVideoId, roomName, course, module, sessionType]);

  return null;
}

// Layout orchestration component
function ModuleLayout({
  course,
  module,
  activeLesson,
  isRightPanelOpen,
  highlightRightPanel,
  onClosePanel,
  onLessonSelect,
}: {
  course: Course;
  module: Module;
  activeLesson: Lesson | undefined;
  isRightPanelOpen: boolean;
  highlightRightPanel: boolean;
  onClosePanel: () => void;
  onLessonSelect: (lesson: Lesson) => void;
}) {
  const header = (
    <ModuleHeader courseTitle={course.title} moduleTitle={module.title} />
  );

  const content = (
    <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded-lg" />}>
      <ChatPanel onLessonSelect={onLessonSelect} />
    </Suspense>
  );

  const footer = <ChatInput />;

  const rightPanel =
    isRightPanelOpen && activeLesson?.kpointVideoId ? (
      <VideoPanel
        lesson={activeLesson}
        highlightPanel={highlightRightPanel}
        onClose={onClosePanel}
      />
    ) : null;

  return (
    <ResizableContent
      header={header}
      content={content}
      footer={footer}
      rightPanel={rightPanel}
    />
  );
}
```

## Key Differences from V1

| Aspect | V1 (ModuleContent.tsx) | V2 (ModuleView.tsx) |
|--------|------------------------|---------------------|
| Lines | 1277 | ~150 |
| Refs | 24 refs for state sharing | 1 ref (prevLessonId) |
| LiveKit | Custom 1260-line hook | Official `LiveKitRoom` wrapper |
| Panel state | Local state + manual URL sync | `useLearningPanel()` from context |
| Lesson state | Local `selectedLesson` state | `selectedLessonId` from nuqs URL |
| Metadata update | In useLiveKit hook | Server action via `RoomMetadataUpdater` |
| Token fetch | `useEffect` + fetch | Server component passes token |

## Props from page.tsx

| Prop | Type | Description |
|------|------|-------------|
| `course` | `Course` | Course data from Prisma |
| `module` | `Module` | Module with lessons from Prisma |
| `userId` | `string` | Authenticated user ID |
| `userName` | `string` | User display name |
| `roomName` | `string` | LiveKit room name (`${courseId}-${moduleId}`) |
| `liveKitToken` | `string \| null` | Pre-generated token (null if failed) |
| `sessionType` | `SessionTypeResult` | Session context from server action |

## State from Context (useLearningPanel)

| State | Source | Description |
|-------|--------|-------------|
| `selectedLessonId` | nuqs `?lesson=xxx` | Current lesson ID (URL-synced) |
| `isRightPanelOpen` | nuqs `?panel=true` | Video panel visibility (URL-synced) |
| `highlightRightPanel` | local state | Animation trigger |
| Sidebar state | local state | Collapse/expand (not URL-synced) |

## Component Hierarchy

```
ModuleView
├── ModuleProvider (course, module, userId, activeLesson, sessionType)
│   └── LiveKitRoom (token, serverUrl, connect)
│       ├── RoomAudioRenderer (plays agent audio)
│       └── MessagesProvider (chat + quiz state)
│           ├── RoomMetadataUpdater (updates metadata on lesson change)
│           └── ModuleLayout
│               ├── ModuleHeader
│               ├── ChatPanel (reads from useMessages, renders messages)
│               ├── ChatInput (calls useMessages.addUserMessage)
│               └── VideoPanel (calls useMessages.triggerInlesson)
```

## RoomMetadataUpdater Pattern

When user changes lesson (via sidebar or auto-advance):
1. `selectedLessonId` updates in URL via nuqs
2. `activeLesson` derived from `selectedLessonId`
3. `RoomMetadataUpdater` detects lesson change
4. Calls `updateRoomMetadata` server action
5. Agent receives new metadata via LiveKit room

```typescript
// Server action call (non-blocking)
updateRoomMetadata(roomName, {
  lessonId: activeLesson?.id,
  lessonTitle: activeLesson?.title,
  videoIds: activeLesson?.kpointVideoId ? [activeLesson.kpointVideoId] : [],
  // ... other metadata
}).catch(console.error);
```

## LiveKitRoom Configuration

```typescript
<LiveKitRoom
  serverUrl={LIVEKIT_URL}
  token={liveKitToken}     // Pre-generated by server
  connect={true}           // Connect immediately
  audio={false}            // Mic off by default (voice mode enables)
  video={false}            // No video needed
  options={{
    adaptiveStream: true,  // Optimize for network
    dynacast: true,        // Dynamic simulcast
  }}
>
```

## Graceful Degradation

If `liveKitToken` is `null` (server action failed):
- Still render the UI without LiveKit
- Chat becomes text-only (no voice)
- Video panel still works (KPoint player)
- User can refresh to retry connection

## What Moves to Child Components

| Feature | V1 Location | V2 Location |
|---------|-------------|-------------|
| Message state | ModuleContent + useChatSession | `useChat` hook in ChatPanel |
| Agent transcript | 24 refs + callbacks | `useVoiceAssistant` in ChatPanel |
| Quiz questions | 3 separate hooks | `useQuiz` unified hook |
| Action buttons | useActionButtons + refs | Context + ChatPanel |
| Video player | useKPointPlayer | VideoPanel internal |

## Next Steps

After `03-module-view.md`:
- `04-use-chat.md` - Simplified chat hook (~150 lines)
- `05-use-quiz.md` - Unified quiz hook
- `06-chat-panel.md` - Chat UI component
- `07-livekit-integration.md` - Official SDK patterns

## Migration Path

1. Create v2 route at `/v2/course/[courseId]/module/[moduleId]`
2. Implement incrementally without breaking v1
3. Test v2 route with real data
4. Switch routes when v2 is stable
5. Remove v1 code
