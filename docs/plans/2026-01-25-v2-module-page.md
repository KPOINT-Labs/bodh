# V2 Module Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the module page from 1277 lines to ~150 lines using official LiveKit SDK and clean architecture.

**Architecture:** Server component fetches data + generates token, client component wraps with providers (ModuleProvider → ActionsProvider → LiveKitRoom → MessagesProvider), child components read from context.

**Tech Stack:** Next.js 16, React 19, LiveKit SDK (@livekit/components-react), nuqs (URL state), Framer Motion (animations), Prisma 7.

---

## Phase 1 — Foundation

### Task 1: Install nuqs dependency

**Files:**
- Modify: `package.json`

**Step 1: Install nuqs**

Run: `bun add nuqs`

**Step 2: Verify installation**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add nuqs for URL state management"
```

---

### Task 2: Update LearningPanelContext with nuqs

**Files:**
- Modify: `contexts/LearningPanelContext.tsx`

**Step 1: Update context to use nuqs**

Replace the context implementation with nuqs-based URL state:

```typescript
"use client";

import { useQueryState, parseAsBoolean, parseAsString } from "nuqs";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface LearningPanelContextType {
  // Sidebar (local state - not in URL)
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;

  // Right Panel (nuqs URL state)
  isRightPanelOpen: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  toggleRightPanel: () => void;

  // Lesson Selection (nuqs URL state)
  selectedLessonId: string | null;
  setSelectedLessonId: (id: string | null) => void;

  // Highlight Animation
  highlightRightPanel: boolean;
  triggerRightPanelHighlight: () => void;

  // Deprecated (backward compat)
  /** @deprecated Use isSidebarCollapsed */
  isCollapsed: boolean;
  /** @deprecated Use toggleSidebar */
  toggleCollapse: () => void;
  /** @deprecated Use collapseSidebar */
  collapsePanel: () => void;
  /** @deprecated Use expandSidebar */
  expandPanel: () => void;
}

const LearningPanelContext = createContext<LearningPanelContextType | null>(null);

export function LearningPanelProvider({ children }: { children: ReactNode }) {
  // Sidebar - local state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Right Panel - nuqs URL state
  const [isRightPanelOpen, setIsRightPanelOpen] = useQueryState(
    "panel",
    parseAsBoolean.withDefault(false).withOptions({ shallow: true })
  );

  // Lesson Selection - nuqs URL state
  const [selectedLessonId, setSelectedLessonId] = useQueryState(
    "lesson",
    parseAsString.withOptions({ shallow: true })
  );

  // Highlight animation - local state
  const [highlightRightPanel, setHighlightRightPanel] = useState(false);

  // Auto-open panel when lesson is selected
  useEffect(() => {
    if (selectedLessonId && !isRightPanelOpen) {
      setIsRightPanelOpen(true);
    }
  }, [selectedLessonId, isRightPanelOpen, setIsRightPanelOpen]);

  // Sidebar actions
  const toggleSidebar = useCallback(() => setIsSidebarCollapsed((prev) => !prev), []);
  const collapseSidebar = useCallback(() => setIsSidebarCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsSidebarCollapsed(false), []);

  // Right Panel actions
  const openRightPanel = useCallback(() => setIsRightPanelOpen(true), [setIsRightPanelOpen]);
  const closeRightPanel = useCallback(() => {
    setIsRightPanelOpen(false);
    setSelectedLessonId(null);
  }, [setIsRightPanelOpen, setSelectedLessonId]);
  const toggleRightPanel = useCallback(() => setIsRightPanelOpen((prev) => !prev), [setIsRightPanelOpen]);

  // Highlight actions
  const triggerRightPanelHighlight = useCallback(() => setHighlightRightPanel(true), []);
  useEffect(() => {
    if (highlightRightPanel) {
      const timer = setTimeout(() => setHighlightRightPanel(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightRightPanel]);

  const value = useMemo<LearningPanelContextType>(
    () => ({
      isSidebarCollapsed,
      toggleSidebar,
      collapseSidebar,
      expandSidebar,
      isRightPanelOpen: isRightPanelOpen ?? false,
      openRightPanel,
      closeRightPanel,
      toggleRightPanel,
      selectedLessonId,
      setSelectedLessonId,
      highlightRightPanel,
      triggerRightPanelHighlight,
      // Deprecated aliases
      isCollapsed: isSidebarCollapsed,
      toggleCollapse: toggleSidebar,
      collapsePanel: collapseSidebar,
      expandPanel: expandSidebar,
    }),
    [
      isSidebarCollapsed, toggleSidebar, collapseSidebar, expandSidebar,
      isRightPanelOpen, openRightPanel, closeRightPanel, toggleRightPanel,
      selectedLessonId, setSelectedLessonId, highlightRightPanel, triggerRightPanelHighlight,
    ]
  );

  return <LearningPanelContext.Provider value={value}>{children}</LearningPanelContext.Provider>;
}

export function useLearningPanel() {
  const context = useContext(LearningPanelContext);
  if (!context) {
    throw new Error("useLearningPanel must be used within a LearningPanelProvider");
  }
  return context;
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (or errors about missing NuqsAdapter - will fix in next task)

**Step 3: Commit**

```bash
git add contexts/LearningPanelContext.tsx
git commit -m "feat: migrate LearningPanelContext to nuqs URL state"
```

---

### Task 3: Add NuqsAdapter to learning layout

**Files:**
- Modify: `app/(learning)/layout.tsx`

**Step 1: Wrap with NuqsAdapter**

Add NuqsAdapter as the outermost wrapper:

```typescript
import { NuqsAdapter } from "nuqs/adapters/next/app";

// In the layout return:
return (
  <NuqsAdapter>
    <LearningPanelProvider>
      {/* ... existing content */}
    </LearningPanelProvider>
  </NuqsAdapter>
);
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/(learning)/layout.tsx
git commit -m "feat: add NuqsAdapter to learning layout"
```

---

### Task 4: Move KPoint script and AnimatedBackground to layout

**Files:**
- Modify: `app/(learning)/layout.tsx`

**Step 1: Add Script and AnimatedBackground imports**

```typescript
import Script from "next/script";
import { AnimatedBackground } from "@/components/ui/animated-background";
```

**Step 2: Add to layout**

```typescript
return (
  <>
    <Script
      src="https://assets.zencite.in/orca/media/embed/videofront-vega.js"
      strategy="afterInteractive"
      id="kpoint-player-sdk"
    />
    <AnimatedBackground intensity="medium" theme="learning" variant="full" />
    <NuqsAdapter>
      {/* ... rest */}
    </NuqsAdapter>
  </>
);
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/(learning)/layout.tsx
git commit -m "feat: move KPoint script and AnimatedBackground to layout"
```

---

### Task 5: Create V2 folder structure

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/` directory structure

**Step 1: Create directories**

```bash
mkdir -p app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/providers
mkdir -p app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/hooks
mkdir -p app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components
```

**Step 2: Create placeholder files**

Create `app/(learning)/v2/course/[courseId]/module/[moduleId]/providers/.gitkeep`:
```
```

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/
git commit -m "chore: create v2 folder structure"
```

---

### Task 6: Create ModuleProvider

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/providers/ModuleProvider.tsx`

**Step 1: Create ModuleProvider**

```typescript
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SessionTypeResult } from "@/actions/session-type";

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

interface ModuleContextType {
  course: Course;
  module: Module;
  userId: string;
  sessionType: SessionTypeResult;
}

const ModuleContext = createContext<ModuleContextType | null>(null);

interface ModuleProviderProps {
  children: ReactNode;
  course: Course;
  module: Module;
  userId: string;
  sessionType: SessionTypeResult;
}

export function ModuleProvider({
  children,
  course,
  module,
  userId,
  sessionType,
}: ModuleProviderProps) {
  const value = useMemo(
    () => ({ course, module, userId, sessionType }),
    [course, module, userId, sessionType]
  );

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
}

export function useModuleContext() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error("useModuleContext must be used within ModuleProvider");
  }
  return context;
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/providers/ModuleProvider.tsx
git commit -m "feat: create ModuleProvider context"
```

---

### Task 7: Create useChat hook

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/hooks/useChat.ts`

**Step 1: Create useChat hook**

Copy implementation from `docs/plans/v2/04a-use-chat.md` (the full hook implementation).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/hooks/useChat.ts
git commit -m "feat: create useChat hook for chat message state"
```

---

### Task 8: Create useQuiz hook

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/hooks/useQuiz.ts`

**Step 1: Create useQuiz hook**

Copy implementation from `docs/plans/v2/04b-use-quiz.md` (the full hook implementation).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/hooks/useQuiz.ts
git commit -m "feat: create useQuiz hook for unified quiz state"
```

---

## Phase 2 — Integration

### Task 9: Create ActionsProvider

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/providers/ActionsProvider.tsx`

**Step 1: Create ActionsProvider**

Copy implementation from `docs/plans/v2/07-actions-system.md` (ActionsProvider section).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/providers/ActionsProvider.tsx
git commit -m "feat: create ActionsProvider for distributed action handlers"
```

---

### Task 10: Create MessagesProvider

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/providers/MessagesProvider.tsx`

**Step 1: Create MessagesProvider**

Copy implementation from `docs/plans/v2/04c-messages-context.md` (full MessagesProvider).

Add toast state as decided in brainstorming:

```typescript
// Add to state
const [showSuccessToast, setShowSuccessToast] = useState(false);
const [showErrorToast, setShowErrorToast] = useState(false);

// Add to context value
showSuccessToast,
showErrorToast,
setShowSuccessToast,
setShowErrorToast,
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/providers/MessagesProvider.tsx
git commit -m "feat: create MessagesProvider composition layer"
```

---

### Task 11: Create session-type server action

**Files:**
- Create: `actions/session-type.ts` (if not exists)

**Step 1: Create or verify session-type action**

Copy implementation from `docs/plans/v2/02-page-server-component.md` (getSessionType section).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add actions/session-type.ts
git commit -m "feat: create getSessionType server action"
```

---

### Task 12: Create/update LiveKit server actions

**Files:**
- Modify: `actions/livekit.ts`

**Step 1: Add getLiveKitToken and updateRoomMetadata**

Copy implementation from `docs/plans/v2/02-page-server-component.md` (getLiveKitToken section).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add actions/livekit.ts
git commit -m "feat: add getLiveKitToken and updateRoomMetadata actions"
```

---

### Task 13: Create V2 page.tsx server component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/page.tsx`

**Step 1: Create page.tsx**

Copy implementation from `docs/plans/v2/02-page-server-component.md` (full page.tsx).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/page.tsx
git commit -m "feat: create v2 page.tsx server component"
```

---

## Phase 3 — UI Components

### Task 14: Create ModuleView client component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/ModuleView.tsx`

**Step 1: Create ModuleView**

Copy implementation from `docs/plans/v2/03-module-view.md` (full ModuleView).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/ModuleView.tsx
git commit -m "feat: create ModuleView client component (~150 lines)"
```

---

### Task 15: Create ChatMessage component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/ChatMessage.tsx`

**Step 1: Create simplified ChatMessage**

Copy implementation from `docs/plans/v2/06-chat-message.md` (V2 ChatMessage section).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components/ChatMessage.tsx
git commit -m "feat: create simplified ChatMessage component"
```

---

### Task 16: Create QuizQuestion component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/QuizQuestion.tsx`

**Step 1: Create QuizQuestion with Framer Motion**

Copy implementation from `docs/plans/v2/06a-quiz-question.md` (full implementation with animations).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components/QuizQuestion.tsx
git commit -m "feat: create QuizQuestion component with Framer Motion"
```

---

### Task 17: Create ChatPanel component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/ChatPanel.tsx`

**Step 1: Create ChatPanel**

Copy implementation from `docs/plans/v2/05-chat-panel.md` (full ChatPanel).

Add toast rendering as decided in brainstorming:

```typescript
import { SuccessMessage } from "@/components/feedback/SuccessMessage";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";

// Get from context
const { showSuccessToast, showErrorToast, setShowSuccessToast, setShowErrorToast } = useMessages();

// At end of return
<>
  {/* existing content */}
  <SuccessMessage show={showSuccessToast} message="Great job!" onClose={() => setShowSuccessToast(false)} />
  <ErrorMessage show={showErrorToast} message="Not quite correct!" onClose={() => setShowErrorToast(false)} />
</>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components/ChatPanel.tsx
git commit -m "feat: create ChatPanel component"
```

---

### Task 18: Create ChatInput component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/ChatInput.tsx`

**Step 1: Create ChatInput with FA routing**

```typescript
"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { useRoomContext } from "@livekit/components-react";

import { Button } from "@/components/ui/button";
import { useMessages } from "../providers/MessagesProvider";

export function ChatInput() {
  const [input, setInput] = useState("");
  const {
    addUserMessage,
    isSending,
    isInFASession,
    activeQuizQuestion,
    submitQuizAnswer
  } = useMessages();
  const room = useRoomContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");

    // Route based on FA session state
    if (isInFASession && activeQuizQuestion?.type === "fa" && activeQuizQuestion.questionType === "text") {
      await submitQuizAnswer(activeQuizQuestion.questionId, text);
    } else {
      // Regular chat
      if (room?.localParticipant) {
        await room.localParticipant.sendText(text, { topic: "lk.chat" });
      }
      await addUserMessage(text);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={isInFASession ? "Type your answer..." : "Type a message..."}
        className="flex-1 px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isSending}
      />
      <Button type="submit" size="icon" disabled={!input.trim() || isSending}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components/ChatInput.tsx
git commit -m "feat: create ChatInput component with FA routing"
```

---

### Task 19: Create VideoPanel component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/VideoPanel.tsx`

**Step 1: Create VideoPanel**

Copy implementation from `docs/plans/v2/10-video-panel.md` (full VideoPanel).

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components/VideoPanel.tsx
git commit -m "feat: create VideoPanel component (V1 wrapper)"
```

---

### Task 20: Create ModuleHeader component

**Files:**
- Create: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/ModuleHeader.tsx`

**Step 1: Create ModuleHeader**

```typescript
"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface ModuleHeaderProps {
  courseTitle: string;
  moduleTitle: string;
}

export function ModuleHeader({ courseTitle, moduleTitle }: ModuleHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </Link>
      <span className="text-gray-300">|</span>
      <h1 className="text-lg font-semibold text-gray-900">{courseTitle}</h1>
      <span className="text-gray-300">-</span>
      <span className="text-gray-600">{moduleTitle}</span>
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(learning\)/v2/course/\[courseId\]/module/\[moduleId\]/components/ModuleHeader.tsx
git commit -m "feat: create ModuleHeader component"
```

---

## Phase 4 — Integration Testing

### Task 21: Run full typecheck

**Step 1: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 2: Fix any errors**

If errors, fix them in the relevant files.

**Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve typecheck errors"
```

---

### Task 22: Run lint

**Step 1: Run lint**

Run: `bun run lint`
Expected: No errors (warnings OK)

**Step 2: Fix lint issues**

Run: `bun run lint:fix`

**Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve lint issues"
```

---

### Task 23: Manual smoke test

**Step 1: Start dev server**

Run: `bun run dev`

**Step 2: Navigate to V2 route**

Open: `http://localhost:3000/v2/course/[existing-course-id]/module/[existing-module-id]`

**Step 3: Verify**

- [ ] Page loads without errors
- [ ] LiveKit connects (check console)
- [ ] Chat panel renders
- [ ] Agent speaks (if agent is running)
- [ ] Video panel opens when lesson selected
- [ ] URL updates when panel opens (?panel=true)
- [ ] URL updates when lesson selected (?lesson=xxx)

**Step 4: Document issues**

Create issue list if any problems found.

---

### Task 24: Final commit and push

**Step 1: Review changes**

Run: `git status` and `git diff`

**Step 2: Create final commit if needed**

```bash
git add -A
git commit -m "feat: complete V2 module page implementation"
```

**Step 3: Push branch**

Run: `git push -u origin feature/v2-module-page`

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-8 | Foundation (nuqs, contexts, folder structure, hooks) |
| 2 | 9-13 | Integration (providers, server actions, page.tsx) |
| 3 | 14-20 | UI Components (ModuleView, ChatPanel, QuizQuestion, VideoPanel) |
| 4 | 21-24 | Testing and finalization |

**Total: 24 tasks**

**Key files created:**
- `app/(learning)/v2/course/[courseId]/module/[moduleId]/page.tsx` (~100 lines)
- `app/(learning)/v2/course/[courseId]/module/[moduleId]/ModuleView.tsx` (~150 lines)
- `providers/ModuleProvider.tsx` (~50 lines)
- `providers/ActionsProvider.tsx` (~100 lines)
- `providers/MessagesProvider.tsx` (~150 lines)
- `hooks/useChat.ts` (~100 lines)
- `hooks/useQuiz.ts` (~200 lines)
- `components/ChatPanel.tsx` (~150 lines)
- `components/QuizQuestion.tsx` (~200 lines)
- `components/VideoPanel.tsx` (~100 lines)
- `components/ChatInput.tsx` (~50 lines)
- `components/ChatMessage.tsx` (~50 lines)
- `components/ModuleHeader.tsx` (~30 lines)

**V1 ModuleContent.tsx: 1277 lines → V2 total: ~1280 lines across 13 files (~100 lines avg)**
