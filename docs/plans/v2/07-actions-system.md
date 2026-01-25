# V2 Actions System

## Overview

Actions are **fields on chat messages**, not separate items. A message can have optional action buttons attached to it.

**Key Insight:** Instead of tracking `anchorMessageId` separately, we attach `action` and `actionMetadata` directly to the message that should show buttons.

## V1 Problems (Why We Changed)

1. **Ref hell** - Dependencies passed via 24 refs in ModuleContent
2. **Tight coupling** - Central handlers needed ALL deps from ModuleContent
3. **Anchor tracking** - Had to track which message to show buttons after
4. **Central dependency object** - `ActionDependencies` with 10+ fields

## V2 Solution

| Aspect | Solution |
|--------|----------|
| Action storage | Fields on `MessageData` |
| Anchor tracking | Not needed - action IS on the message |
| Dependencies | Distributed - each component registers handlers for what it owns |
| Handler lookup | `ActionsProvider` registry with `actionType:buttonId` keys |
| Rendering | Inside `ChatMessage` component |

## Action Types

```typescript
// lib/actions/actionRegistry.ts (KEEP from V1)
type ActionType =
  | "course_welcome"      // First time course -> "See the intro", "Continue to Lesson 1"
  | "course_welcome_back" // Returning -> "Continue learning"
  | "lesson_welcome"      // First time lesson -> "Start warm-up", "Skip"
  | "lesson_welcome_back" // Returning -> "Continue where left", "Start from beginning"
  | "fa_intro"            // FA trigger -> "Start quick check", "Skip"
  | "inlesson_complete"   // After in-lesson Q -> "Continue watching"
  | "warmup_complete"     // After warmup -> "Start the video"
  | "lesson_complete"     // End of lesson -> "Take assessment", "Next lesson"
  | "assessment_complete" // After FA done -> "View feedback"
  | "feedback_complete";  // After feedback -> "Review now", "Continue to next"
```

## MessageData with Action Fields

```typescript
interface MessageData {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  inputType?: string;
  messageType?: string;
  createdAt: string;
  
  // Action fields (optional - only on messages that show actions)
  action?: ActionType;
  actionMetadata?: Record<string, unknown>;
  actionStatus?: "pending" | "handled" | "dismissed";
  actionHandledButtonId?: string;
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ModuleView                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     ActionsProvider                          ││
│  │  - handlersMap (registered handlers)                         ││
│  │  - handleButtonClick(messageId, buttonId)                    ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │                  MessagesProvider                        │││
│  │  │  - addAssistantMessage() accepts action fields           │││
│  │  │  - Registers: warmup, FA, chat handlers                  │││
│  │  │  ┌─────────────────┐  ┌─────────────────┐               │││
│  │  │  │   ChatPanel     │  │   VideoPanel    │               │││
│  │  │  │  Renders:       │  │  Registers:     │               │││
│  │  │  │  - ChatMessage  │  │  - playVideo    │               │││
│  │  │  │    (with action │  │  - pauseVideo   │               │││
│  │  │  │     buttons)    │  │  - seekTo       │               │││
│  │  │  └─────────────────┘  └─────────────────┘               │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│  Registers: navigation handlers (selectLesson, startTour)       │
└─────────────────────────────────────────────────────────────────┘
```

## Files

```
app/(learning)/v2/course/[courseId]/module/[moduleId]/
├── providers/
│   ├── ActionsProvider.tsx      # Handler registry + handleButtonClick
│   └── MessagesProvider.tsx     # addAssistantMessage accepts action fields
├── hooks/
│   └── useChat.ts               # MessageData type with action fields
└── components/
    ├── ChatMessage.tsx          # Renders action buttons if message.action exists
    └── VideoPanel.tsx           # Registers video control handlers

lib/actions/
└── actionRegistry.ts            # KEEP: Button definitions only (DELETE actionHandlers.ts)
```

## Data Flow

```
1. Agent finishes speaking (transcript callback)
   ↓
2. addAssistantMessage(text, { action: "lesson_welcome", actionMetadata: {...} })
   ↓
3. Message added to messages[] with action fields
   ↓
4. ChatMessage renders message content + action buttons (if action && status === "pending")
   ↓
5. User clicks button
   ↓
6. handleButtonClick(messageId, actionType, buttonId, metadata)
   ↓
7. ActionsProvider finds registered handler, executes it
   ↓
8. onActionHandled(messageId, buttonId) -> updateMessageAction()
   ↓
9. Message.actionStatus = "handled", ChatMessage re-renders (shows "Action taken")
```

---

## Implementation

### 1. ActionsProvider (Handler Registry)

```typescript
// providers/ActionsProvider.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { ActionType } from "@/lib/actions/actionRegistry";

type ActionHandler = (metadata: Record<string, unknown>) => void | Promise<void>;

interface ActionsContextType {
  handleButtonClick: (
    messageId: string,
    actionType: ActionType,
    buttonId: string,
    metadata: Record<string, unknown>
  ) => Promise<void>;
  registerHandler: (actionType: ActionType, buttonId: string, handler: ActionHandler) => void;
  unregisterHandler: (actionType: ActionType, buttonId: string) => void;
}

const ActionsContext = createContext<ActionsContextType | null>(null);

interface ActionsProviderProps {
  children: ReactNode;
  onActionHandled?: (messageId: string, buttonId: string) => void;
}

export function ActionsProvider({ children, onActionHandled }: ActionsProviderProps) {
  // Handler registry: Map<"actionType:buttonId", handler>
  const handlersRef = useRef<Map<string, ActionHandler>>(new Map());

  const registerHandler = useCallback(
    (actionType: ActionType, buttonId: string, handler: ActionHandler) => {
      const key = `${actionType}:${buttonId}`;
      handlersRef.current.set(key, handler);
    },
    []
  );

  const unregisterHandler = useCallback(
    (actionType: ActionType, buttonId: string) => {
      const key = `${actionType}:${buttonId}`;
      handlersRef.current.delete(key);
    },
    []
  );

  const handleButtonClick = useCallback(
    async (
      messageId: string,
      actionType: ActionType,
      buttonId: string,
      metadata: Record<string, unknown>
    ) => {
      const key = `${actionType}:${buttonId}`;
      const handler = handlersRef.current.get(key);

      if (handler) {
        try {
          await handler(metadata);
        } catch (error) {
          console.error(`[ActionsProvider] Handler error for ${key}:`, error);
        }
      } else {
        console.warn(`[ActionsProvider] No handler registered for ${key}`);
      }

      // Notify parent to update message status
      onActionHandled?.(messageId, buttonId);
    },
    [onActionHandled]
  );

  const value = useMemo<ActionsContextType>(
    () => ({ handleButtonClick, registerHandler, unregisterHandler }),
    [handleButtonClick, registerHandler, unregisterHandler]
  );

  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

export function useActions() {
  const context = useContext(ActionsContext);
  if (!context) {
    throw new Error("useActions must be used within ActionsProvider");
  }
  return context;
}

// Helper hook for registering handlers with cleanup
export function useRegisterActionHandlers(
  handlers: Array<{
    actionType: ActionType;
    buttonId: string;
    handler: ActionHandler;
  }>
) {
  const { registerHandler, unregisterHandler } = useActions();

  useEffect(() => {
    for (const { actionType, buttonId, handler } of handlers) {
      registerHandler(actionType, buttonId, handler);
    }

    return () => {
      for (const { actionType, buttonId } of handlers) {
        unregisterHandler(actionType, buttonId);
      }
    };
  }, [handlers, registerHandler, unregisterHandler]);
}
```

### 2. useChat Hook (Action Methods)

```typescript
// hooks/useChat.ts
interface AddMessageOptions {
  inputType?: string;
  messageType?: string;
  action?: ActionType;
  actionMetadata?: Record<string, unknown>;
}

interface AttachActionOptions {
  action: ActionType;
  actionMetadata?: Record<string, unknown>;
}

interface UseChatReturn {
  messages: MessageData[];
  isSending: boolean;
  addUserMessage: (text: string, options?: AddMessageOptions) => Promise<string>;
  addAssistantMessage: (text: string, options?: AddMessageOptions) => Promise<string>;
  
  // Action methods
  attachActionToMessage: (messageId: string, options: AttachActionOptions) => void;
  attachActionToLastAssistantMessage: (options: AttachActionOptions) => void;
  updateMessageAction: (messageId: string, status: "handled" | "dismissed", buttonId?: string) => void;
  
  lastAssistantMessageId: string | undefined;
}
```

Key action methods:

```typescript
// Attach action to an existing message (by ID)
const attachActionToMessage = useCallback(
  (messageId: string, options: AttachActionOptions) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, action: options.action, actionMetadata: options.actionMetadata, actionStatus: "pending" }
          : m
      )
    );
  },
  []
);

// Attach action to the last assistant message (convenience method)
const attachActionToLastAssistantMessage = useCallback(
  (options: AttachActionOptions) => {
    const lastId = lastAssistantMessageIdRef.current;
    if (lastId) attachActionToMessage(lastId, options);
  },
  [attachActionToMessage]
);

// Update action status (called when button is clicked)
const updateMessageAction = useCallback(
  (messageId: string, status: "handled" | "dismissed", buttonId?: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, actionStatus: status, actionHandledButtonId: buttonId }
          : m
      )
    );
  },
  []
);
```

### 3. ChatMessage Component

```typescript
// components/ChatMessage.tsx
export function ChatMessage({ message }: { message: MessageData }) {
  const { handleButtonClick } = useActions();
  const isAssistant = message.role === "assistant";

  const hasAction = isAssistant && message.action;
  const actionDefinition = hasAction ? ACTION_REGISTRY[message.action!] : null;
  const isPending = message.actionStatus === "pending";
  const isHandled = message.actionStatus === "handled";

  const onButtonClick = async (buttonId: string) => {
    if (!message.action) return;
    await handleButtonClick(message.id, message.action, buttonId, message.actionMetadata || {});
  };

  return (
    <div className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
      {/* Avatar + Message bubble */}
      
      {/* Action Buttons */}
      {hasAction && actionDefinition && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
          {isPending && actionDefinition.buttons.map((button) => (
            <Button key={button.id} onClick={() => onButtonClick(button.id)}>
              {button.label}
            </Button>
          ))}
          {isHandled && (
            <span className="text-muted-foreground">
              {actionDefinition.buttons.find((b) => b.id === message.actionHandledButtonId)?.label}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
```

---

## Triggering Actions

### Method 1: Add action WITH the message

```typescript
await addAssistantMessage(text, {
  messageType: "general",
  action: "course_welcome",
  actionMetadata: { introLesson, firstLesson },
});
```

### Method 2: Attach action LATER

```typescript
// Message added first
const messageId = await addAssistantMessage(text, { messageType: "general" });

// Later, attach action
attachActionToMessage(messageId, {
  action: "course_welcome",
  actionMetadata: { introLesson, firstLesson },
});

// OR: Attach to last assistant message
attachActionToLastAssistantMessage({
  action: "lesson_welcome",
  actionMetadata: { prevLessonTitle },
});
```

---

## Registering Handlers

Each component registers handlers for actions it owns:

```typescript
// VideoPanel - video control handlers
useRegisterActionHandlers([
  { actionType: "inlesson_complete", buttonId: "continue_video", handler: () => playVideo() },
  { actionType: "lesson_welcome", buttonId: "skip", handler: () => playVideo() },
  { actionType: "lesson_welcome_back", buttonId: "continue", handler: () => seekTo(lastPosition) },
  { actionType: "lesson_welcome_back", buttonId: "restart", handler: () => seekTo(0) },
  { actionType: "warmup_complete", buttonId: "watch_lesson", handler: () => playVideo() },
]);

// MessagesProvider - quiz handlers
useEffect(() => {
  registerHandler("lesson_welcome", "start_warmup", () => startWarmup());
  registerHandler("fa_intro", "start", (metadata) => startFA(metadata.topic));
  registerHandler("lesson_complete", "assessment", () => startFA());
  registerHandler("lesson_complete", "warmup_next", () => startWarmupForNextLesson());
}, []);

// ModuleView - navigation handlers
useEffect(() => {
  registerHandler("course_welcome", "see_intro", () => setSelectedLessonId(introLesson.id));
  registerHandler("course_welcome", "skip_to_lesson", () => setSelectedLessonId(firstLesson.id));
  registerHandler("course_welcome", "take_tour", () => startTour());
  registerHandler("lesson_complete", "next_lesson", () => goToNextLesson());
}, []);
```

---

## Handler Registration Checklist

| Action Type | Button ID | Handler Location |
|-------------|-----------|------------------|
| `course_welcome` | `see_intro` | ModuleView |
| `course_welcome` | `skip_to_lesson` | ModuleView |
| `course_welcome` | `take_tour` | ModuleView |
| `course_welcome_back` | `continue` | VideoPanel |
| `course_welcome_back` | `take_tour` | ModuleView |
| `lesson_welcome` | `start_warmup` | MessagesProvider |
| `lesson_welcome` | `skip` | VideoPanel |
| `lesson_welcome_back` | `continue` | VideoPanel |
| `lesson_welcome_back` | `restart` | VideoPanel |
| `fa_intro` | `start` | MessagesProvider |
| `fa_intro` | `skip` | VideoPanel |
| `inlesson_complete` | `continue_video` | VideoPanel |
| `warmup_complete` | `watch_lesson` | VideoPanel |
| `lesson_complete` | `assessment` | MessagesProvider |
| `lesson_complete` | `warmup_next` | MessagesProvider |
| `lesson_complete` | `next_lesson` | ModuleView |

---

## Message Examples

### Pending Action
```typescript
{
  id: "msg-123",
  role: "assistant",
  content: "Welcome! I'm Bodh, your learning companion...",
  action: "course_welcome",
  actionMetadata: { introLesson: {...}, firstLesson: {...} },
  actionStatus: "pending",
}
```

### After Button Click
```typescript
{
  id: "msg-123",
  role: "assistant", 
  content: "Welcome! I'm Bodh, your learning companion...",
  action: "course_welcome",
  actionMetadata: { introLesson: {...}, firstLesson: {...} },
  actionStatus: "handled",
  actionHandledButtonId: "see_intro",
}
```

---

## Benefits

1. **No anchor ID issues** - Action is ON the message, not referencing it
2. **No central dependency object** - Each component registers handlers with its own deps
3. **Simpler allItems** - Just messages + quizzes (2 types, not 3)
4. **Optimistic-friendly** - Even if message ID changes, action stays attached
5. **Clear ownership** - Message owns its action state, component owns its handlers
