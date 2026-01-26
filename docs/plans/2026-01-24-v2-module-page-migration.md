# V2 Module Page Migration Plan

**Date:** 2026-01-24
**Status:** Planning
**Author:** Sisyphus

---

## Executive Summary

Rewrite the learning module page from scratch at a new `/v2/` route to:
1. Replace 24-ref architecture with React Context
2. Use official `@livekit/components-react` SDK
3. Unify 3 quiz hooks into 1
4. Make panel visibility globally accessible via URL + Context

**Target:** Reduce ~5000 lines of hooks to ~1500 lines with cleaner architecture.

---

## Table of Contents

1. [Current Problems](#1-current-problems)
2. [Architecture Comparison](#2-architecture-comparison)
3. [Panel Context Enhancement](#3-panel-context-enhancement)
4. [V2 Route Structure](#4-v2-route-structure)
5. [Hook Consolidation](#5-hook-consolidation)
6. [LiveKit SDK Migration](#6-livekit-sdk-migration)
7. [Implementation Phases](#7-implementation-phases)
8. [Migration Checklist](#8-migration-checklist)
9. [Rollback Strategy](#9-rollback-strategy)

---

## 1. Current Problems

### 1.1 Architecture Issues

| Problem | Impact |
|---------|--------|
| 24 refs to share functions between hooks | Hard to debug, maintain |
| 10+ useEffects to sync ref values | Race conditions, stale closures |
| Circular dependencies between hooks | Can't extract/test individually |
| 1260-line custom LiveKit hook | Reinventing the wheel |
| 3 separate quiz hooks (941 lines total) | Duplicate logic |
| Panel state is local, not accessible globally | Child components can't control panels |

### 1.2 Line Count Analysis

| File | Lines | Action |
|------|-------|--------|
| `useLiveKit.ts` | 1260 | **REPLACE** with official SDK |
| `useKPointPlayer.ts` | 677 | Keep (video player integration) |
| `useChatSession.ts` | 544 | Simplify (~200 lines) |
| `useAssessmentQuiz.ts` | 437 | **DELETE** (unused) |
| `useWarmupFlow.ts` | 310 | **MERGE** into unified quiz |
| `useTranscriptSync.ts` | 227 | **DELETE** (never integrated) |
| `useTTS.ts` | 213 | Keep |
| `useInlessonFlow.ts` | 194 | **MERGE** into unified quiz |
| `usePeerLearning.ts` | 187 | Keep |
| `useAutoScroll.ts` | 175 | Keep |
| `useTour.ts` | 225 | Keep |
| `useSessionType.ts` | 159 | Keep |
| `useActionButtons.ts` | 141 | Simplify |
| `useLiveKitSync.ts` | 105 | **DELETE** (SDK handles) |
| **Total** | **4970** | **Target: ~1500** |

### 1.3 The Ref Hell Problem

Current `ModuleContent.tsx` uses refs to break circular dependencies:

```typescript
// Current pattern (BAD)
const sendMessageRef = useRef<SendMessageFn | null>(null);
const showActionRef = useRef<ShowActionFn | null>(null);
const addAssistantMessageRef = useRef<AddMessageFn | null>(null);
// ... 21 more refs

// Sync refs in useEffects
useEffect(() => {
  sendMessageRef.current = sendMessage;
}, [sendMessage]);

// Pass refs to hooks
const warmupFlow = useWarmupFlow({
  sendMessageRef,      // ref
  showActionRef,       // ref
  addAssistantMessageRef,  // ref
});
```

**Why this is bad:**
- Refs don't trigger re-renders → stale closures
- Hard to trace data flow
- Can't use React DevTools effectively
- Testing requires mocking refs

---

## 2. Architecture Comparison

### 2.1 Current (v1) Architecture

```
ModuleContent.tsx (1277 lines)
├── useLiveKit (1260 lines) ←──────────────────┐
│   └── manages: connection, audio, transcript │
├── useChatSession (544 lines) ←───────────────┤ circular
│   └── manages: messages, sending             │ dependencies
├── useWarmupFlow (310 lines) ←────────────────┤ via refs
│   └── manages: warmup quiz                   │
├── useInlessonFlow (194 lines) ←──────────────┤
│   └── manages: in-lesson quiz                │
├── useAssessmentQuiz (437 lines) ←────────────┘
│   └── manages: modal quiz (UNUSED)
├── useKPointPlayer (677 lines)
│   └── manages: video player
└── useActionButtons, useSessionType, etc.
```

### 2.2 Target (v2) Architecture

```
app/(learning)/v2/course/[courseId]/module/[moduleId]/
├── page.tsx                      # Server component (data fetching)
├── ModuleView.tsx                # Main client component (~200 lines)
├── providers/
│   └── ModuleProvider.tsx        # Single context for ALL shared state
├── hooks/
│   ├── useQuiz.ts                # Unified quiz logic (~150 lines)
│   └── useChat.ts                # Simplified chat (~150 lines)
└── components/
    ├── VideoPanel.tsx            # Video player
    ├── ChatPanel.tsx             # Chat UI
    ├── QuizQuestion.tsx          # Inline quiz in chat
    └── VoiceIndicator.tsx        # LiveKit voice status

contexts/
└── LearningPanelContext.tsx      # ENHANCED: sidebar + right panel state
```

---

## 3. Panel Context Enhancement

### 3.1 Current Context

```typescript
// contexts/LearningPanelContext.tsx (current)
interface LearningPanelContextType {
  isCollapsed: boolean;           // sidebar state
  toggleCollapse: () => void;
  collapsePanel: () => void;
  expandPanel: () => void;
  highlightRightPanel: boolean;   // animation state
  triggerRightPanelHighlight: () => void;
}
```

**Missing:** Right panel open/close state!

### 3.2 Enhanced Context (v2)

```typescript
// contexts/LearningPanelContext.tsx (enhanced)
interface LearningPanelContextType {
  // === SIDEBAR (LEFT) ===
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  
  // === RIGHT PANEL ===
  isRightPanelOpen: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  toggleRightPanel: () => void;
  
  // === HIGHLIGHT ANIMATION ===
  highlightRightPanel: boolean;
  triggerRightPanelHighlight: () => void;
}
```

### 3.3 URL Sync with nuqs

Use [nuqs](https://nuqs.47ng.com/) for type-safe URL state management. nuqs provides:
- Type-safe URL search params
- Automatic serialization/parsing
- Shallow routing (no full page reload)
- Server-side support in Next.js App Router

**Installation:**
```bash
bun add nuqs
```

**Setup in layout:**
```typescript
// app/(learning)/layout.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <LearningPanelProvider>
        {children}
      </LearningPanelProvider>
    </NuqsAdapter>
  );
}
```

**URL State Definitions:**
```typescript
// lib/url-state.ts
import { parseAsBoolean, parseAsString, createSearchParamsCache } from 'nuqs/server';

export const learningSearchParams = {
  panel: parseAsBoolean.withDefault(false),
  lesson: parseAsString,
};

export const learningParamsCache = createSearchParamsCache(learningSearchParams);
```

**Implementation in LearningPanelContext.tsx:**
```typescript
import { useQueryState, parseAsBoolean } from 'nuqs';

export function LearningPanelProvider({ children }: { children: ReactNode }) {
  // Panel state synced to URL via nuqs
  const [isRightPanelOpen, setIsRightPanelOpen] = useQueryState(
    'panel',
    parseAsBoolean.withDefault(false).withOptions({ shallow: true })
  );

  // Lesson selection synced to URL
  const [selectedLessonId, setSelectedLessonId] = useQueryState(
    'lesson',
    parseAsString.withOptions({ shallow: true })
  );

  const openRightPanel = useCallback(() => {
    setIsRightPanelOpen(true);
  }, [setIsRightPanelOpen]);

  const closeRightPanel = useCallback(() => {
    setIsRightPanelOpen(false);
    setSelectedLessonId(null); // Clear lesson when closing panel
  }, [setIsRightPanelOpen, setSelectedLessonId]);

  const toggleRightPanel = useCallback(() => {
    setIsRightPanelOpen(prev => !prev);
  }, [setIsRightPanelOpen]);

  // ... rest of provider
}
```

**Benefits of nuqs over manual URL sync:**
| Manual Approach | nuqs |
|-----------------|------|
| Verbose URLSearchParams manipulation | One-liner with `useQueryState` |
| Easy to forget `scroll: false` | Built-in shallow routing |
| Manual type coercion | Type-safe parsers |
| State/URL can get out of sync | Single source of truth |
| No server-side support | Works with RSC via `createSearchParamsCache` |

### 3.4 Usage Examples

Any child component can now control panels:

```typescript
// In ChatAgent.tsx
function ChatAgent() {
  const { openRightPanel, closeRightPanel } = useLearningPanel();
  
  const handleVideoMention = () => {
    openRightPanel(); // Opens video panel from chat!
  };
}

// In ActionButtons.tsx
function ActionButtons() {
  const { collapseSidebar, toggleRightPanel } = useLearningPanel();
  
  return (
    <>
      <button onClick={collapseSidebar}>Focus Mode</button>
      <button onClick={toggleRightPanel}>Toggle Video</button>
    </>
  );
}

// In VideoPanel.tsx
function VideoPanel() {
  const { closeRightPanel } = useLearningPanel();
  
  return (
    <div>
      <button onClick={closeRightPanel}>Close</button>
      <video ... />
    </div>
  );
}
```

### 3.5 Migration: Context Changes

| Old Name | New Name | Notes |
|----------|----------|-------|
| `isCollapsed` | `isSidebarCollapsed` | Renamed for clarity |
| `toggleCollapse` | `toggleSidebar` | Renamed |
| `collapsePanel` | `collapseSidebar` | Renamed |
| `expandPanel` | `expandSidebar` | Renamed |
| - | `isRightPanelOpen` | **NEW** |
| - | `openRightPanel` | **NEW** |
| - | `closeRightPanel` | **NEW** |
| - | `toggleRightPanel` | **NEW** |
| `highlightRightPanel` | `highlightRightPanel` | Unchanged |
| `triggerRightPanelHighlight` | `triggerRightPanelHighlight` | Unchanged |

**Backward Compatibility:** Keep old names as aliases during migration:

```typescript
// Deprecated aliases (remove after v2 is stable)
const isCollapsed = isSidebarCollapsed;
const toggleCollapse = toggleSidebar;
const collapsePanel = collapseSidebar;
const expandPanel = expandSidebar;
```

---

## 4. V2 Route Structure

### 4.1 File Structure

```
app/(learning)/v2/course/[courseId]/module/[moduleId]/
├── page.tsx                    # Server component
├── ModuleView.tsx              # Client component (~200 lines)
├── providers/
│   └── ModuleProvider.tsx      # Module-specific context
├── hooks/
│   ├── useQuiz.ts              # Unified quiz
│   └── useChat.ts              # Simplified chat
└── components/
    ├── VideoPanel.tsx          # Reuse from v1
    ├── ChatPanel.tsx           # Chat messages + input
    ├── QuizQuestion.tsx        # Inline quiz UI
    ├── VoiceIndicator.tsx      # Mic status
    └── ModuleHeader.tsx        # Lesson title + nav
```

### 4.2 page.tsx (Server Component)

```typescript
// app/(learning)/v2/course/[courseId]/module/[moduleId]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ModuleView } from "./ModuleView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ courseId: string; moduleId: string }>;
}

async function getModuleData(courseId: string, moduleId: string) {
  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { course_id: courseId },
        { id: courseId },
        { slug: courseId },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
    },
  });

  if (!course) return null;

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          kpointVideoId: true,
          duration: true,
          quiz: true,
        },
      },
    },
  });

  if (!module || module.courseId !== course.id) return null;

  return { course, module };
}

export default async function ModulePage({ params }: Props) {
  const { courseId, moduleId } = await params;
  // Note: searchParams (lesson, panel) are handled client-side via nuqs
  // No need to pass them as props - nuqs reads directly from URL

  const session = await auth();
  if (!session?.user?.id) notFound();

  const data = await getModuleData(courseId, moduleId);
  if (!data) notFound();

  return (
    <ModuleView
      course={data.course}
      module={data.module}
      userId={session.user.id}
    />
  );
}
```

### 4.3 ModuleView.tsx (Client Component)

```typescript
// app/(learning)/v2/course/[courseId]/module/[moduleId]/ModuleView.tsx
"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import { useQueryState, parseAsString } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { ResizableContent } from "@/components/layout/resizable-content";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { ModuleProvider } from "./providers/ModuleProvider";
import { ChatPanel } from "./components/ChatPanel";
import { VideoPanel } from "./components/VideoPanel";
import { ModuleHeader } from "./components/ModuleHeader";

interface Props {
  course: { id: string; title: string };
  module: { id: string; title: string; lessons: Lesson[] };
  userId: string;
  liveKitToken: string | null;
}

export function ModuleView({ course, module, userId, liveKitToken }: Props) {
  const { isRightPanelOpen, highlightRightPanel, openRightPanel } = useLearningPanel();
  
  // Lesson selection synced to URL via nuqs
  const [selectedLessonId, setSelectedLessonId] = useQueryState(
    'lesson',
    parseAsString.withOptions({ shallow: true })
  );
  
  // Lessons already sorted by orderIndex at database level (Prisma orderBy)
  const selectedLesson = useMemo(
    () => module.lessons.find(l => l.id === selectedLessonId) || module.lessons[0],
    [module.lessons, selectedLessonId]
  );
  
  // Auto-open panel when lesson is selected via URL
  useEffect(() => {
    if (selectedLessonId && !isRightPanelOpen) {
      openRightPanel();
    }
  }, [selectedLessonId, isRightPanelOpen, openRightPanel]);

  const handleLessonSelect = (lesson: Lesson) => {
    setSelectedLessonId(lesson.id);
    openRightPanel();
  };

  const header = (
    <ModuleHeader lesson={selectedLesson} courseTitle={course.title} />
  );

  const content = (
    <ModuleProvider
      course={course}
      module={module}
      lesson={selectedLesson}
      userId={userId}
    >
      <ChatPanel />
    </ModuleProvider>
  );

  const footer = <ChatInput />;

  const rightPanel = isRightPanelOpen && selectedLesson?.kpointVideoId ? (
    <VideoPanel lesson={selectedLesson} highlightPanel={highlightRightPanel} />
  ) : null;

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={!!token}
      audio={true}
      video={false}
    >
      <RoomAudioRenderer />
      <ResizableContent
        header={header}
        content={content}
        footer={footer}
        rightPanel={rightPanel}
      />
    </LiveKitRoom>
  );
}
```

### 4.4 ModuleProvider.tsx

```typescript
// app/(learning)/v2/course/[courseId]/module/[moduleId]/providers/ModuleProvider.tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useChat } from "../hooks/useChat";
import { useQuiz } from "../hooks/useQuiz";

interface ModuleContextType {
  // Course/Module info
  course: { id: string; title: string };
  module: { id: string; title: string };
  lesson: Lesson;
  userId: string;
  
  // Chat
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  
  // Quiz
  quiz: QuizState;
  startWarmup: () => void;
  answerQuestion: (answer: string) => void;
  skipQuestion: () => void;
}

const ModuleContext = createContext<ModuleContextType | null>(null);

export function ModuleProvider({
  children,
  course,
  module,
  lesson,
  userId,
}: {
  children: ReactNode;
  course: { id: string; title: string };
  module: { id: string; title: string };
  lesson: Lesson;
  userId: string;
}) {
  const chat = useChat({ courseId: course.id, lessonId: lesson.id, userId });
  const quiz = useQuiz({ lessonId: lesson.id, userId, addMessage: chat.addMessage });

  return (
    <ModuleContext.Provider
      value={{
        course,
        module,
        lesson,
        userId,
        messages: chat.messages,
        sendMessage: chat.sendMessage,
        isLoading: chat.isLoading,
        quiz: quiz.state,
        startWarmup: quiz.startWarmup,
        answerQuestion: quiz.answerQuestion,
        skipQuestion: quiz.skipQuestion,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error("useModule must be used within ModuleProvider");
  }
  return context;
}
```

---

## 5. Hook Consolidation

### 5.1 Unified useQuiz Hook

Replaces: `useWarmupFlow` (310) + `useInlessonFlow` (194) + `useAssessmentQuiz` (437) = **941 lines**
Target: **~150 lines**

```typescript
// app/(learning)/v2/course/[courseId]/module/[moduleId]/hooks/useQuiz.ts
"use client";

import { useCallback, useState } from "react";
import { recordAttempt, getAnsweredQuestionIds } from "@/lib/actions/assessment";

interface QuizState {
  isActive: boolean;
  type: "warmup" | "inlesson" | null;
  questions: Question[];
  currentIndex: number;
  answeredIds: Set<string>;
  stats: { correct: number; incorrect: number; skipped: number };
}

interface UseQuizOptions {
  lessonId: string;
  userId: string;
  quiz: LessonQuiz | null;
  addMessage: (msg: Message) => void;
}

export function useQuiz({ lessonId, userId, quiz, addMessage }: UseQuizOptions) {
  const [state, setState] = useState<QuizState>({
    isActive: false,
    type: null,
    questions: [],
    currentIndex: 0,
    answeredIds: new Set(),
    stats: { correct: 0, incorrect: 0, skipped: 0 },
  });

  const startWarmup = useCallback(async () => {
    if (!quiz?.warmup?.length) return;
    
    // Get already answered questions
    const answered = await getAnsweredQuestionIds(userId, lessonId, "warmup");
    const unanswered = quiz.warmup.filter(q => !answered.includes(q.id));
    
    if (unanswered.length === 0) {
      addMessage({ role: "assistant", content: "You've completed all warmup questions!" });
      return;
    }
    
    setState(prev => ({
      ...prev,
      isActive: true,
      type: "warmup",
      questions: unanswered,
      currentIndex: 0,
      answeredIds: new Set(answered),
    }));
    
    // Show first question
    showQuestion(unanswered[0]);
  }, [quiz, userId, lessonId, addMessage]);

  const showQuestion = useCallback((question: Question) => {
    addMessage({
      role: "assistant",
      content: question.question,
      metadata: {
        questionId: question.id,
        questionType: question.options ? "mcq" : "text",
        options: question.options,
      },
    });
  }, [addMessage]);

  const answerQuestion = useCallback(async (answer: string) => {
    const current = state.questions[state.currentIndex];
    if (!current) return;
    
    const isCorrect = current.correctOption === answer;
    
    // Record attempt
    await recordAttempt({
      lessonId,
      questionId: current.id,
      quizType: state.type!,
      userId,
      selectedOption: answer,
      isCorrect,
    });
    
    // Show feedback
    addMessage({
      role: "assistant",
      content: isCorrect ? "Correct!" : `Not quite. The answer is ${current.correctOption}.`,
    });
    
    // Update state
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      answeredIds: new Set([...prev.answeredIds, current.id]),
      stats: {
        ...prev.stats,
        correct: prev.stats.correct + (isCorrect ? 1 : 0),
        incorrect: prev.stats.incorrect + (isCorrect ? 0 : 1),
      },
    }));
    
    // Show next or complete
    const next = state.questions[state.currentIndex + 1];
    if (next) {
      showQuestion(next);
    } else {
      completeQuiz();
    }
  }, [state, lessonId, userId, addMessage, showQuestion]);

  const skipQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      stats: { ...prev.stats, skipped: prev.stats.skipped + 1 },
    }));
    
    const next = state.questions[state.currentIndex + 1];
    if (next) {
      showQuestion(next);
    } else {
      completeQuiz();
    }
  }, [state, showQuestion]);

  const completeQuiz = useCallback(() => {
    const { correct, incorrect, skipped } = state.stats;
    addMessage({
      role: "assistant",
      content: `Quiz complete! ${correct} correct, ${incorrect} incorrect, ${skipped} skipped.`,
    });
    setState(prev => ({ ...prev, isActive: false, type: null }));
  }, [state.stats, addMessage]);

  return {
    state,
    startWarmup,
    answerQuestion,
    skipQuestion,
  };
}
```

### 5.2 Simplified useChat Hook

Current `useChatSession`: **544 lines**
Target: **~150 lines**

```typescript
// app/(learning)/v2/course/[courseId]/module/[moduleId]/hooks/useChat.ts
"use client";

import { useCallback, useState } from "react";
import { storeMessage } from "@/lib/chat/message-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface UseChatOptions {
  courseId: string;
  lessonId: string;
  userId: string;
}

export function useChat({ courseId, lessonId, userId }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const addMessage = useCallback((msg: Omit<Message, "id" | "createdAt">) => {
    const message: Message = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, message]);
    return message.id;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    // Add user message optimistically
    addMessage({ role: "user", content: text });
    setIsLoading(true);

    try {
      // Store and get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          conversationId,
          courseId,
          lessonId,
          userId,
        }),
      });

      const data = await response.json();
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      addMessage({ role: "assistant", content: data.reply });
    } catch (error) {
      addMessage({ role: "assistant", content: "Sorry, something went wrong." });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, courseId, lessonId, userId, addMessage]);

  return {
    messages,
    sendMessage,
    addMessage,
    isLoading,
    conversationId,
  };
}
```

---

## 6. LiveKit SDK Migration

### 6.1 Installation

```bash
bun add @livekit/components-react
```

### 6.2 LiveKit Token Server Action

Instead of API routes, use a server action for type-safety and cleaner code:

```typescript
// actions/livekit.ts
"use server";

import { AccessToken } from "livekit-server-sdk";
import { auth } from "@/auth";

interface GetLiveKitTokenParams {
  courseId: string;
  moduleId: string;
  lessonId?: string;
}

export async function getLiveKitToken(params: GetLiveKitTokenParams): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { courseId, moduleId, lessonId } = params;
  
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: session.user.id,
      name: session.user.name || "User",
      metadata: JSON.stringify({ courseId, moduleId, lessonId }),
    }
  );

  token.addGrant({
    room: `${courseId}-${moduleId}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
```

### 6.3 Handling Dynamic Room Metadata

The agent reads `room.metadata` to get context like `video_ids`, `session_type`, `learning_objectives`. This metadata can change during a session (e.g., switching lessons, QnA→FA mode).

**Challenge:** If we fetch token server-side with initial metadata, how do we update it?

**Solution: Server-side token + official SDK for metadata updates**

LiveKit SDK provides `room.localParticipant.setMetadata()` and the server-side `roomService.updateRoomMetadata()`. Use the official hooks from `@livekit/components-react`:

```typescript
// page.tsx (Server Component)
export default async function ModulePage({ params }: Props) {
  const { courseId, moduleId } = await params;
  
  const session = await auth();
  if (!session?.user?.id) notFound();

  const data = await getModuleData(courseId, moduleId);
  if (!data) notFound();

  const firstLesson = data.module.lessons[0];
  const roomName = `${courseId}-${moduleId}`;
  
  const token = await getLiveKitToken({
    roomName,
    userId: session.user.id,
    metadata: {
      courseId,
      moduleId,
      lessonId: firstLesson?.id,
      videoIds: firstLesson?.kpointVideoId ? [firstLesson.kpointVideoId] : [],
      courseTitle: data.course.title,
      learningObjectives: data.course.learningObjectives,
      sessionType: "general",
    },
  });

  return (
    <ModuleView
      course={data.course}
      module={data.module}
      userId={session.user.id}
      roomName={roomName}
      liveKitToken={token}
    />
  );
}
```

```typescript
// ModuleView.tsx - Use official SDK hooks for metadata updates
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";

export function ModuleView({ course, module, userId, roomName, liveKitToken }: Props) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  
  const prevLessonRef = useRef(selectedLesson?.id);

  // Update participant metadata when lesson changes (agent reads this)
  useEffect(() => {
    if (selectedLesson && selectedLesson.id !== prevLessonRef.current && localParticipant) {
      prevLessonRef.current = selectedLesson.id;
      
      const metadata = JSON.stringify({
        lessonId: selectedLesson.id,
        lessonTitle: selectedLesson.title,
        videoIds: selectedLesson.kpointVideoId ? [selectedLesson.kpointVideoId] : [],
      });
      
      localParticipant.setMetadata(metadata);
    }
  }, [selectedLesson, localParticipant]);

  // For room-level metadata updates (affects all participants), use data channel
  const updateRoomContext = useCallback((data: Record<string, unknown>) => {
    room?.localParticipant?.publishData(
      new TextEncoder().encode(JSON.stringify({ type: "context_update", ...data })),
      { reliable: true }
    );
  }, [room]);

  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={liveKitToken}
      connect={!!liveKitToken}
      ...
    />
  );
}
```

**Benefits:**
- Fast initial load (token ready on first render)
- Official SDK methods for metadata updates
- No custom server actions needed for runtime updates
- Agent reads participant metadata via `participant.metadata`

### 6.4 Current vs New Approach

**Current (1260 lines):**
```typescript
// hooks/useLiveKit.ts - manual everything
const room = useRef<Room | null>(null);
const audioContext = useRef<AudioContext | null>(null);
const audioElement = useRef<HTMLAudioElement | null>(null);
// ... 50+ more refs and state variables
// ... manual connection handling
// ... manual track subscription
// ... manual audio playback
// ... manual reconnection logic
```

**New (SDK handles everything):**
```typescript
// In ModuleView.tsx
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useVoiceAssistant,
  useConnectionState,
} from "@livekit/components-react";

function ModuleView() {
  return (
    <LiveKitRoom
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      token={token}
      connect={!!token}
      audio={true}
      video={false}
    >
      <RoomAudioRenderer />  {/* Handles all audio automatically */}
      <VoiceAssistantUI />
    </LiveKitRoom>
  );
}

function VoiceAssistantUI() {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const connectionState = useConnectionState();
  
  // That's it! SDK handles:
  // - Connection/reconnection
  // - Track subscription
  // - Audio playback
  // - Transcriptions
}
```

### 6.5 What We Keep from useLiveKit

Only these custom features need porting:
1. **Metadata parsing** - FA markers, question extraction
2. **Data channel messages** - Custom events from agent
3. **Session type switching** - QnA/FA mode changes

```typescript
// hooks/useLiveKitEvents.ts (~100 lines)
import { useDataChannel, useRoomContext } from "@livekit/components-react";

export function useLiveKitEvents({
  onFAResponse,
  onQuizEvaluation,
}: {
  onFAResponse?: (data: FAResponseData) => void;
  onQuizEvaluation?: (data: QuizEvaluationData) => void;
}) {
  const room = useRoomContext();
  
  // Handle data channel messages
  useDataChannel((message) => {
    const data = JSON.parse(message.payload);
    
    if (data.type === "fa_response") {
      onFAResponse?.(data);
    } else if (data.type === "quiz_evaluation") {
      onQuizEvaluation?.(data);
    }
  });
  
  // Send message to agent
  const sendToAgent = useCallback((type: string, payload: unknown) => {
    room?.localParticipant?.publishData(
      JSON.stringify({ type, payload }),
      { reliable: true }
    );
  }, [room]);
  
  return { sendToAgent };
}
```

---

## 7. Implementation Phases

### Phase 1: Panel Context Enhancement (Day 1)
**Goal:** Global panel control accessible from any component

- [ ] Install nuqs: `bun add nuqs`
- [ ] Add NuqsAdapter to learning layout
- [ ] Create URL state definitions in `lib/url-state.ts`
- [ ] Rename existing context properties for clarity
- [ ] Add `isRightPanelOpen`, `openRightPanel`, `closeRightPanel`, `toggleRightPanel`
- [ ] Use nuqs `useQueryState` for URL sync (`?panel=true`, `?lesson=xxx`)
- [ ] Add backward compatibility aliases
- [ ] Update existing consumers:
  - [ ] `app/(learning)/layout.tsx` (add NuqsAdapter)
  - [ ] `components/learning/PeerLearningPanel.tsx`
  - [ ] `components/agent/ActionButtons.tsx`
  - [ ] `app/(learning)/course/[courseId]/module/[moduleId]/ModuleContent.tsx`

### Phase 2: V2 Route Shell (Day 1-2)
**Goal:** Basic page that loads and displays content

- [ ] Create directory structure
- [ ] Create `page.tsx` (server component, copy data fetching from v1)
- [ ] Create `ModuleView.tsx` (basic layout with ResizableContent)
- [ ] Create `ModuleProvider.tsx` (empty context for now)
- [ ] Verify route works: `/v2/course/[courseId]/module/[moduleId]`

### Phase 3: LiveKit SDK Integration (Day 2-3)
**Goal:** Voice connection using official SDK

- [ ] Install `@livekit/components-react`
- [ ] Add `LiveKitRoom` provider to ModuleView
- [ ] Add `RoomAudioRenderer` for audio playback
- [ ] Create `VoiceIndicator.tsx` using `useVoiceAssistant`
- [ ] Create `useLiveKitEvents.ts` for custom data channel handling
- [ ] Verify voice connection works

### Phase 4: Chat Integration (Day 3-4)
**Goal:** Working chat with message persistence

- [ ] Create simplified `useChat.ts` hook
- [ ] Create `ChatPanel.tsx` component
- [ ] Create `ChatInput.tsx` component (or reuse from v1)
- [ ] Wire up to ModuleProvider
- [ ] Verify messages display and persist

### Phase 5: Unified Quiz (Day 4-5)
**Goal:** Single hook handles warmup + in-lesson quizzes

- [ ] Create `useQuiz.ts` hook
- [ ] Create `QuizQuestion.tsx` component (inline in chat)
- [ ] Wire up warmup flow
- [ ] Wire up in-lesson flow (triggered by video timestamps)
- [ ] Verify quiz functionality

### Phase 6: Video Player Integration (Day 5)
**Goal:** KPoint player with panel visibility control

- [ ] Reuse `VideoPanel.tsx` from v1
- [ ] Wire up to panel context (open/close)
- [ ] Wire up to quiz (timestamp triggers)
- [ ] Verify video playback and quiz triggers

### Phase 7: Polish & Parity (Day 6-7)
**Goal:** Feature parity with v1

- [ ] Action buttons (session type switching)
- [ ] Tour mode support
- [ ] Error/success toasts
- [ ] Onboarding modal
- [ ] TTS integration
- [ ] Final testing

### Phase 8: Cleanup (Day 8+)
**Goal:** Remove old code after v2 is stable

- [ ] Redirect v1 route to v2 (or feature flag)
- [ ] Delete unused hooks:
  - [ ] `useAssessmentQuiz.ts`
  - [ ] `useTranscriptSync.ts`
  - [ ] `useLiveKitSync.ts`
- [ ] Delete old `useLiveKit.ts` after confirming SDK works
- [ ] Remove backward compatibility aliases from context
- [ ] Update documentation

---

## 8. Migration Checklist

### Files to Create

| File | Lines (est.) | Phase |
|------|--------------|-------|
| `lib/url-state.ts` | ~15 | 1 |
| `contexts/LearningPanelContext.tsx` | ~100 | 1 |
| `app/(learning)/v2/.../page.tsx` | ~50 | 2 |
| `app/(learning)/v2/.../ModuleView.tsx` | ~120 | 2 |
| `app/(learning)/v2/.../providers/ModuleProvider.tsx` | ~80 | 2 |
| `app/(learning)/v2/.../hooks/useChat.ts` | ~100 | 4 |
| `app/(learning)/v2/.../hooks/useQuiz.ts` | ~150 | 5 |
| `app/(learning)/v2/.../hooks/useLiveKitEvents.ts` | ~80 | 3 |
| `app/(learning)/v2/.../components/ChatPanel.tsx` | ~80 | 4 |
| `app/(learning)/v2/.../components/QuizQuestion.tsx` | ~100 | 5 |
| `app/(learning)/v2/.../components/VoiceIndicator.tsx` | ~50 | 3 |
| `app/(learning)/v2/.../components/ModuleHeader.tsx` | ~50 | 2 |
| **Total New** | **~975** | |

### Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `package.json` | Add nuqs | 1 |
| `contexts/LearningPanelContext.tsx` | Add right panel state + nuqs URL sync | 1 |
| `app/(learning)/layout.tsx` | Add NuqsAdapter + update context API | 1 |
| `components/learning/PeerLearningPanel.tsx` | Update to new context API | 1 |
| `components/agent/ActionButtons.tsx` | Update to new context API | 1 |
| `components/layout/resizable-content.tsx` | Read panel state from context | 1 |
| `package.json` | Add @livekit/components-react | 3 |

### Files to Delete (After v2 Stable)

| File | Lines | Reason |
|------|-------|--------|
| `hooks/useAssessmentQuiz.ts` | 437 | Unused |
| `hooks/useTranscriptSync.ts` | 227 | Never integrated |
| `hooks/useLiveKitSync.ts` | 105 | SDK handles |
| `hooks/useLiveKit.ts` | 1260 | Replaced by SDK |
| `hooks/useWarmupFlow.ts` | 310 | Merged into useQuiz |
| `hooks/useInlessonFlow.ts` | 194 | Merged into useQuiz |
| **Total Deleted** | **2533** | |

### Net Change

| Metric | Before | After | Diff |
|--------|--------|-------|------|
| Hook lines | 4970 | ~1500 | -3470 |
| Main component | 1277 | ~200 | -1077 |
| Total | ~6250 | ~1700 | **-4550** |

---

## 9. Rollback Strategy

### During Development
- V1 route remains untouched at `/course/[courseId]/module/[moduleId]`
- V2 route is independent at `/v2/course/[courseId]/module/[moduleId]`
- No shared state changes until Phase 8

### After Launch
- Feature flag to switch between v1 and v2
- Monitor error rates for 1 week before removing v1
- Keep v1 code in git history (don't delete files, just remove from build)

### If V2 Has Issues
1. Revert feature flag to v1
2. Fix issues in v2
3. Re-enable v2 after fixes verified

---

## Appendix A: Type Definitions

```typescript
// types/module.ts
export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  duration?: number;
  quiz?: LessonQuiz | null;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

export interface LessonQuiz {
  warmup?: Question[];
  inlesson?: InLessonQuestion[];
}

export interface Question {
  id: string;
  question: string;
  options?: { id: string; text: string }[];
  correctOption?: string;
}

export interface InLessonQuestion extends Question {
  triggerTime: number; // Video timestamp in seconds
}
```

---

## Appendix B: Context API Reference

```typescript
// Full LearningPanelContext API (v2)
interface LearningPanelContextType {
  // Sidebar (local state)
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  
  // Right Panel (nuqs URL state: ?panel=true)
  isRightPanelOpen: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  toggleRightPanel: () => void;
  
  // Lesson Selection (nuqs URL state: ?lesson=xxx)
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;
  
  // Animation
  highlightRightPanel: boolean;
  triggerRightPanelHighlight: () => void;
  
  // Deprecated (remove after v2 stable)
  /** @deprecated Use isSidebarCollapsed */
  isCollapsed: boolean;
  /** @deprecated Use toggleSidebar */
  toggleCollapse: () => void;
  /** @deprecated Use collapseSidebar */
  collapsePanel: () => void;
  /** @deprecated Use expandSidebar */
  expandPanel: () => void;
}
```

### nuqs URL State Definitions

```typescript
// lib/url-state.ts
import { parseAsBoolean, parseAsString } from 'nuqs/server';

export const learningSearchParams = {
  panel: parseAsBoolean.withDefault(false),
  lesson: parseAsString,
};

// Usage in components:
// const [panel, setPanel] = useQueryState('panel', parseAsBoolean.withDefault(false));
// const [lesson, setLesson] = useQueryState('lesson', parseAsString);
```

---

## Appendix C: Testing Strategy

### Unit Tests
- `useQuiz.ts` - Mock DB calls, verify state transitions
- `useChat.ts` - Mock API, verify optimistic updates
- `LearningPanelContext` - Verify URL sync

### Integration Tests
- Panel toggle from different components
- Quiz flow from start to completion
- LiveKit connection and audio playback

### E2E Tests (Playwright)
- Full learning session flow
- Video + quiz integration
- Voice mode interaction

---

## Appendix D: Performance Considerations

### Bundle Size
- `@livekit/components-react`: ~50KB gzipped (vs our 1260-line hook)
- Net reduction in custom code should offset this

### Runtime Performance
- Fewer refs = fewer stale closures
- Context updates are batched by React
- URL updates use `router.replace` with `scroll: false`

### Monitoring
- Track Time to Interactive (TTI) before/after
- Monitor LiveKit connection success rate
- Track quiz completion rates
