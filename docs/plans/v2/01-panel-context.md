# V2 Panel Context - LearningPanelContext with nuqs

## Overview

Global context for panel visibility (sidebar + right panel) with URL sync via nuqs.
Any child component can control panels without prop drilling.

## URL State

| Param | Type | Default | Purpose |
|-------|------|---------|---------|
| `panel` | boolean | `false` | Right panel (video) open/closed |
| `lesson` | string | `null` | Selected lesson ID |

Example URLs:
- `/v2/course/CS101/module/abc123` - Panel closed, no lesson selected
- `/v2/course/CS101/module/abc123?panel=true` - Panel open
- `/v2/course/CS101/module/abc123?lesson=xyz789` - Panel open with lesson
- `/v2/course/CS101/module/abc123?lesson=xyz789&panel=true` - Explicit

## Dependencies

```bash
bun add nuqs
```

## Files

### 1. `lib/url-state.ts` - nuqs Definitions

```typescript
import { parseAsBoolean, parseAsString } from 'nuqs/server';

export const panelParser = parseAsBoolean.withDefault(false);
export const lessonParser = parseAsString;
```

### 2. `app/(learning)/layout.tsx` - NuqsAdapter Setup

```typescript
"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { type ReactNode } from "react";
import { PeerLearningPanel } from "@/components/learning/PeerLearningPanel";
import { CourseProgressProvider } from "@/contexts/CourseProgressContext";
import { LearningPanelProvider, useLearningPanel } from "@/contexts/LearningPanelContext";

function LearningLayoutContent({ children }: { children: ReactNode }) {
  const { isSidebarCollapsed, toggleSidebar } = useLearningPanel();
  // ... rest of layout
}

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <LearningPanelProvider>
        <CourseProgressProvider>
          <LearningLayoutContent>{children}</LearningLayoutContent>
        </CourseProgressProvider>
      </LearningPanelProvider>
    </NuqsAdapter>
  );
}
```

### 3. `contexts/LearningPanelContext.tsx` - Full Implementation

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

  // Deprecated (backward compat - remove after v2 stable)
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
  // Sidebar - local state (no URL sync needed)
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
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const collapseSidebar = useCallback(() => {
    setIsSidebarCollapsed(true);
  }, []);

  const expandSidebar = useCallback(() => {
    setIsSidebarCollapsed(false);
  }, []);

  // Right Panel actions
  const openRightPanel = useCallback(() => {
    setIsRightPanelOpen(true);
  }, [setIsRightPanelOpen]);

  const closeRightPanel = useCallback(() => {
    setIsRightPanelOpen(false);
    setSelectedLessonId(null);
  }, [setIsRightPanelOpen, setSelectedLessonId]);

  const toggleRightPanel = useCallback(() => {
    setIsRightPanelOpen((prev) => !prev);
  }, [setIsRightPanelOpen]);

  // Highlight actions
  const triggerRightPanelHighlight = useCallback(() => {
    setHighlightRightPanel(true);
  }, []);

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
      isSidebarCollapsed,
      toggleSidebar,
      collapseSidebar,
      expandSidebar,
      isRightPanelOpen,
      openRightPanel,
      closeRightPanel,
      toggleRightPanel,
      selectedLessonId,
      setSelectedLessonId,
      highlightRightPanel,
      triggerRightPanelHighlight,
    ]
  );

  return (
    <LearningPanelContext.Provider value={value}>
      {children}
    </LearningPanelContext.Provider>
  );
}

export function useLearningPanel() {
  const context = useContext(LearningPanelContext);
  if (!context) {
    throw new Error("useLearningPanel must be used within a LearningPanelProvider");
  }
  return context;
}
```

## Usage Examples

### Open panel from any component

```typescript
function SomeDeepComponent() {
  const { openRightPanel, setSelectedLessonId } = useLearningPanel();

  const handleLessonClick = (lessonId: string) => {
    setSelectedLessonId(lessonId);  // URL updates to ?lesson=xxx
    openRightPanel();                // URL updates to ?panel=true
  };
}
```

### Close panel from VideoPanel

```typescript
function VideoPanel() {
  const { closeRightPanel } = useLearningPanel();

  return (
    <div>
      <button onClick={closeRightPanel}>Close</button>
      {/* video content */}
    </div>
  );
}
```

### Check panel state

```typescript
function ModuleView() {
  const { isRightPanelOpen, selectedLessonId } = useLearningPanel();

  const rightPanel = isRightPanelOpen && selectedLessonId ? (
    <VideoPanel lessonId={selectedLessonId} />
  ) : null;
}
```

### Collapse sidebar for focus mode

```typescript
function ActionButtons() {
  const { collapseSidebar } = useLearningPanel();

  const handleStartLesson = () => {
    collapseSidebar();  // Hide sidebar to focus on content
    // ... start lesson
  };
}
```

## State Summary

| State | Storage | Sync |
|-------|---------|------|
| `isSidebarCollapsed` | React state | None (UI preference) |
| `isRightPanelOpen` | nuqs | URL `?panel=true` |
| `selectedLessonId` | nuqs | URL `?lesson=xxx` |
| `highlightRightPanel` | React state | None (animation) |

## Migration Notes

1. Install nuqs: `bun add nuqs`
2. Wrap layout with `<NuqsAdapter>`
3. Update context to use `useQueryState`
4. Existing v1 code continues working via deprecated aliases
5. Remove `initialPanelOpen` prop from ModuleContent (context reads from URL)
