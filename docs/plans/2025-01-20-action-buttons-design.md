# Action Buttons Registry Pattern Design

**Date:** 2025-01-20
**Status:** Approved
**Author:** Claude + Aditya

## Problem

Currently, each button scenario (FA intro, lesson welcome back, etc.) requires:
- 2-3 state variables (`pendingFAIntro`, `isWaitingForFAIntro`, `faIntroActioned`)
- Handler functions in ModuleContent
- Props passed down to ChatAgent
- Conditional rendering in ChatAgent

With 8+ scenarios, this results in 24+ state variables, lots of prop drilling, and complex conditionals.

## Solution

**Action Registry Pattern** - Centralize all action configurations in ONE registry file. A single `pendingAction` state replaces all scattered state variables.

## Key Insight

At any given moment, there's only ONE set of action buttons visible. You never show "lesson_welcome_back" buttons AND "fa_intro" buttons simultaneously.

---

## Data Structures

### File: `lib/actions/actionRegistry.ts`

```typescript
// Action button configuration
export interface ActionButton {
  id: string;           // Unique ID for handler lookup (e.g., "continue", "skip")
  label: string;        // Display text (e.g., "Continue where you left")
  variant?: "primary" | "secondary";  // Styling - primary = filled, secondary = outline
}

// Registry entry for each action type
export interface ActionDefinition {
  buttons: ActionButton[];
}

// All possible action types
export type ActionType =
  | "course_welcome"        // After intro welcome → "See the intro", "Continue to Lesson 1", "Take a tour"
  | "course_welcome_back"   // Returning to course → "Continue learning", "Take a tour"
  | "lesson_welcome"        // First time lesson 2+ → "Start warm-up", "Skip"
  | "lesson_welcome_back"   // Returning to lesson → "Continue where left", "Start from beginning"
  | "fa_intro"              // Mid-lesson FA trigger → "Start quick check", "Skip for now"
  | "concept_check"         // Concept completion → "Submit", "Skip"
  | "lesson_complete"       // After lesson ends → "Take assessment", "Warm-up", "Next lesson"
  | "assessment_complete"   // After FA done → "View feedback"
  | "feedback_complete";    // After feedback → "Review now", "Continue to next"

// What gets stored in state
export interface PendingAction {
  type: ActionType;
  metadata?: Record<string, any>;  // e.g., { lastPosition: 326, topic: "Iteration" }
}
```

---

## Action Registry

```typescript
export const ACTION_REGISTRY: Record<ActionType, ActionDefinition> = {
  // Session type actions
  course_welcome: {
    buttons: [
      { id: "see_intro", label: "See the intro", variant: "primary" },
      { id: "skip_to_lesson", label: "Continue to Lesson 1", variant: "secondary" },
      { id: "take_tour", label: "Take a tour", variant: "secondary" },
    ],
  },
  course_welcome_back: {
    buttons: [
      { id: "continue", label: "Continue learning", variant: "primary" },
      { id: "take_tour", label: "Take a tour", variant: "secondary" },
    ],
  },
  lesson_welcome: {
    buttons: [
      { id: "start_warmup", label: "Start warm-up", variant: "primary" },
      { id: "skip", label: "Skip", variant: "secondary" },
    ],
  },
  lesson_welcome_back: {
    buttons: [
      { id: "continue", label: "Continue where you left", variant: "primary" },
      { id: "restart", label: "Start from beginning", variant: "secondary" },
    ],
  },

  // Mid-lesson actions
  fa_intro: {
    buttons: [
      { id: "start", label: "Start quick check", variant: "primary" },
      { id: "skip", label: "Skip for now", variant: "secondary" },
    ],
  },
  concept_check: {
    buttons: [
      { id: "submit", label: "Submit", variant: "primary" },
      { id: "skip", label: "Skip", variant: "secondary" },
    ],
  },

  // Post-lesson actions
  lesson_complete: {
    buttons: [
      { id: "assessment", label: "Take assessment", variant: "primary" },
      { id: "warmup_next", label: "Warm-up for next lesson", variant: "secondary" },
      { id: "next_lesson", label: "Jump to next lesson", variant: "secondary" },
    ],
  },
  assessment_complete: {
    buttons: [
      { id: "view_feedback", label: "View feedback", variant: "primary" },
    ],
  },
  feedback_complete: {
    buttons: [
      { id: "review", label: "Review now", variant: "primary" },
      { id: "next_lesson", label: "Continue to next lesson", variant: "secondary" },
    ],
  },
};
```

---

## Action Handlers

### File: `lib/actions/actionHandlers.ts`

```typescript
// Dependencies injected from ModuleContent
export interface ActionDependencies {
  seekTo: (seconds: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  selectLesson: (lesson: Lesson) => void;
  sendTextToAgent: (message: string) => Promise<void>;
  addUserMessage: (message: string, messageType?: string, inputType?: string) => Promise<void>;
  startTour: () => void;
}

type ActionHandler = (
  buttonId: string,
  metadata: Record<string, any>,
  deps: ActionDependencies
) => void | Promise<void>;

export const ACTION_HANDLERS: Record<ActionType, ActionHandler> = {
  course_welcome: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "see_intro":
        deps.selectLesson(metadata.introLesson);
        break;
      case "skip_to_lesson":
        deps.selectLesson(metadata.firstLesson);
        break;
      case "take_tour":
        deps.startTour();
        break;
    }
  },

  course_welcome_back: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "continue":
        deps.selectLesson(metadata.lastLesson);
        if (metadata.lastPosition) deps.seekTo(metadata.lastPosition);
        break;
      case "take_tour":
        deps.startTour();
        break;
    }
  },

  lesson_welcome: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "start_warmup":
        deps.sendTextToAgent(`Start warm-up quiz on "${metadata.prevLessonTitle}"`);
        break;
      case "skip":
        deps.playVideo();
        break;
    }
  },

  lesson_welcome_back: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "continue":
        deps.seekTo(metadata.lastPosition);
        deps.playVideo();
        break;
      case "restart":
        deps.seekTo(0);
        deps.playVideo();
        break;
    }
  },

  fa_intro: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "start":
        deps.sendTextToAgent(`Start FA on "${metadata.topic}"`);
        break;
      case "skip":
        deps.playVideo();
        break;
    }
  },

  concept_check: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "submit":
        // Submit answers
        break;
      case "skip":
        deps.playVideo();
        break;
    }
  },

  lesson_complete: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "assessment":
        deps.sendTextToAgent("Start lesson assessment");
        break;
      case "warmup_next":
        deps.sendTextToAgent(`Start warm-up for next lesson`);
        break;
      case "next_lesson":
        deps.selectLesson(metadata.nextLesson);
        break;
    }
  },

  assessment_complete: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "view_feedback":
        // Show feedback UI
        break;
    }
  },

  feedback_complete: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "review":
        // Show review content
        break;
      case "next_lesson":
        deps.selectLesson(metadata.nextLesson);
        break;
    }
  },
};
```

---

## Hook: useActionButtons

### File: `hooks/useActionButtons.ts`

```typescript
import { useState, useCallback } from "react";
import { ActionType, PendingAction } from "@/lib/actions/actionRegistry";
import { ACTION_HANDLERS, ActionDependencies } from "@/lib/actions/actionHandlers";

interface UseActionButtonsReturn {
  pendingAction: PendingAction | null;
  showAction: (type: ActionType, metadata?: Record<string, any>) => void;
  dismissAction: () => void;
  handleButtonClick: (buttonId: string) => void;
  isActioned: boolean;
}

export function useActionButtons(deps: ActionDependencies): UseActionButtonsReturn {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActioned, setIsActioned] = useState(false);

  const showAction = useCallback((type: ActionType, metadata?: Record<string, any>) => {
    setPendingAction({ type, metadata });
    setIsActioned(false);
  }, []);

  const dismissAction = useCallback(() => {
    setPendingAction(null);
    setIsActioned(false);
  }, []);

  const handleButtonClick = useCallback((buttonId: string) => {
    if (!pendingAction || isActioned) return;

    setIsActioned(true);

    const handler = ACTION_HANDLERS[pendingAction.type];
    handler?.(buttonId, pendingAction.metadata || {}, deps);

    setPendingAction(null);
  }, [pendingAction, isActioned, deps]);

  return {
    pendingAction,
    showAction,
    dismissAction,
    handleButtonClick,
    isActioned,
  };
}
```

---

## UI Component: ActionButtons

### File: `components/agent/ActionButtons.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { ACTION_REGISTRY, PendingAction } from "@/lib/actions/actionRegistry";

interface ActionButtonsProps {
  pendingAction: PendingAction;
  onButtonClick: (buttonId: string) => void;
  disabled?: boolean;
}

export function ActionButtons({ pendingAction, onButtonClick, disabled }: ActionButtonsProps) {
  const definition = ACTION_REGISTRY[pendingAction.type];

  if (!definition) return null;

  return (
    <div className="flex items-center gap-3 ml-11">
      {definition.buttons.map((button) => (
        <Button
          key={button.id}
          onClick={() => onButtonClick(button.id)}
          disabled={disabled}
          variant={button.variant === "primary" ? "default" : "outline"}
          className={
            button.variant === "primary"
              ? "gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
              : "gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-5"
          }
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
```

---

## Integration

### ModuleContent.tsx Changes

**Before:**
```typescript
const [pendingFAIntro, setPendingFAIntro] = useState<FAIntroData | null>(null);
const [isWaitingForFAIntro, setIsWaitingForFAIntro] = useState(false);
const [faIntroActioned, setFaIntroActioned] = useState(false);
// ... more states for each action type
```

**After:**
```typescript
const actionDeps: ActionDependencies = {
  seekTo,
  playVideo: () => playerRef.current?.playVideo(),
  pauseVideo: () => playerRef.current?.pauseVideo(),
  selectLesson: (lesson) => {
    if (selectedLesson?.id === lesson.id) {
      playerRef.current?.playVideo();
    } else {
      setSelectedLesson(lesson);
    }
  },
  sendTextToAgent: liveKit.sendTextToAgent,
  startTour,
  router,
};

const { pendingAction, showAction, dismissAction, handleButtonClick, isActioned } =
  useActionButtons(actionDeps);
```

### ChatAgent.tsx Changes

**Before:**
```typescript
interface ChatAgentProps {
  pendingFAIntro?: { topic: string; introMessage: string } | null;
  isWaitingForFAIntro?: boolean;
  faIntroActioned?: boolean;
  onStartQuickCheck?: () => void;
  onSkipQuickCheck?: () => void;
}
```

**After:**
```typescript
interface ChatAgentProps {
  pendingAction: PendingAction | null;
  onActionButtonClick: (buttonId: string) => void;
  isActionDisabled?: boolean;
}
```

---

## File Structure

```
lib/
└── actions/
    ├── actionRegistry.ts     # ActionType, ActionButton, ACTION_REGISTRY
    └── actionHandlers.ts     # ActionDependencies, ACTION_HANDLERS

hooks/
└── useActionButtons.ts       # Hook managing pendingAction state

components/
└── chat/
    └── ActionButtons.tsx     # Generic button renderer (new file)
```

**Files to modify:**
- `ModuleContent.tsx` — Replace scattered state with `useActionButtons` hook
- `ChatAgent.tsx` — Replace specific props with generic `pendingAction` props

---

## Comparison

| Before | After |
|--------|-------|
| 3+ state variables per action type | 1 hook for all actions |
| Props per action type | 3 generic props |
| Switch/conditionals in ChatAgent | One `<ActionButtons />` component |
| Adding new action = touch 3+ files | Add entry to registry + handler |

---

## Adding New Action Types

To add a new action type:

1. Add type to `ActionType` union in `actionRegistry.ts`
2. Add entry to `ACTION_REGISTRY` with buttons
3. Add handler to `ACTION_HANDLERS`

No changes needed to hooks or components.
