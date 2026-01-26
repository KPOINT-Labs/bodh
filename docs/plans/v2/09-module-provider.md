# V2 ModuleProvider - Minimal Read-Only Context

## Overview

ModuleProvider is a minimal read-only context that provides static server-fetched data to all child components.

**Design Decision:** Keep it minimal. Active lesson state is derived from URL via `useLearningPanel()`, not owned by this provider.

## What It Provides

```typescript
interface ModuleContextType {
  course: Course;      // { id, title, description, learningObjectives }
  module: Module;      // { id, title, lessons[] }
  userId: string;
  sessionType: SessionTypeResult;
}
```

## What It Does NOT Own

| Responsibility | Where It Lives |
|----------------|----------------|
| Active lesson state | Derived from URL (`selectedLessonId` via nuqs) |
| Navigation methods | ModuleView (has access to `useLearningPanel`) |
| Progress tracking | Separate concern (existing progress hooks) |
| Lesson selection | `useLearningPanel().setSelectedLessonId()` |

## File: `providers/ModuleProvider.tsx`

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

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModuleContext() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error("useModuleContext must be used within ModuleProvider");
  }
  return context;
}
```

## Usage

```typescript
// In ModuleView.tsx
<ModuleProvider
  course={course}
  module={module}
  userId={userId}
  sessionType={sessionType}
>
  <LiveKitRoom ...>
    <MessagesProvider>
      {/* Children can access via useModuleContext() */}
    </MessagesProvider>
  </LiveKitRoom>
</ModuleProvider>

// In any child component
function ChatPanel() {
  const { course, module, userId } = useModuleContext();
  // Use static data...
}
```

## Why Minimal?

1. **URL is source of truth** — `selectedLessonId` lives in URL via nuqs
2. **Derived state** — `activeLesson` is computed from `selectedLessonId + module.lessons`
3. **Single responsibility** — Provider just passes data, doesn't manage state
4. **Simpler testing** — No state mutations to test

## Lines of Code

~50 lines — Simple pass-through context with type safety.
