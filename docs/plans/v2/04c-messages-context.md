# V2 MessagesContext - Composition Layer

## Overview

Context that composes `useChat` + `useQuiz` hooks and provides unified access.
Handles session initialization, data channel listeners, and combines messages for rendering.

**This is the composition layer, not the logic layer.**

## Key Responsibilities

1. Initialize chat session (conversationId, history)
2. Compose `useChat` + `useQuiz` hooks
3. **Listen to data channel for FA responses** (routes to `useQuiz.handleFAResponse`)
4. Combine and sort all items for rendering

## File: `app/(learning)/v2/course/[courseId]/module/[moduleId]/providers/MessagesProvider.tsx`

```typescript
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRoomContext } from "@livekit/components-react";

import { initializeChatSession, type MessageData } from "@/lib/chat/message-store";

import { useModuleContext } from "./ModuleProvider";
import { useChat } from "../hooks/useChat";
import { useQuiz, type QuizMessage, type FAResponse } from "../hooks/useQuiz";

// ============================================================================
// Types
// ============================================================================

export type ChatItem =
  | { type: "message"; data: MessageData }
  | { type: "quiz"; data: QuizMessage };

interface MessagesContextType {
  // Session
  conversationId: string | null;
  isLoading: boolean;

  // Chat (from useChat)
  messages: MessageData[];
  isSending: boolean;
  addUserMessage: (text: string, messageType?: string, inputType?: string) => Promise<string>;
  addAssistantMessage: (text: string, messageType?: string) => Promise<string>;
  lastAssistantMessageId: string | undefined;

  // Quiz (from useQuiz) - includes FA
  quizMessages: QuizMessage[];
  activeQuizQuestion: QuizMessage | null;
  isQuizProcessing: boolean;
  isInFASession: boolean;                                    // NEW: For input routing
  startWarmup: () => Promise<void>;
  triggerInlesson: (questionId: string) => Promise<void>;
  startFA: (topic?: string) => Promise<void>;                // NEW: Start FA session
  submitQuizAnswer: (questionId: string, answer: string) => Promise<void>;
  skipQuizQuestion: (questionId: string) => Promise<void>;

  // Combined
  allItems: ChatItem[];
}

const MessagesContext = createContext<MessagesContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface MessagesProviderProps {
  children: ReactNode;
}

export function MessagesProvider({ children }: MessagesProviderProps) {
  const { userId, module, activeLesson } = useModuleContext();
  const room = useRoomContext();

  // ---------------------------------------------------------------------------
  // Session Initialization
  // ---------------------------------------------------------------------------
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function init() {
      try {
        const { conversation } = await initializeChatSession({
          userId,
          moduleId: module.id,
          contextType: "welcome",
        });

        setConversationId(conversation.id);

        if (conversation.messages.length > 0) {
          setHistoryMessages(conversation.messages);
        }
      } catch (error) {
        console.error("[MessagesProvider] Failed to initialize:", error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [userId, module.id]);

  // ---------------------------------------------------------------------------
  // Compose Hooks
  // ---------------------------------------------------------------------------
  
  // Chat hook
  const chat = useChat({ conversationId });

  // Data channel publish function (for quiz evaluation requests, etc.)
  const publishData = useCallback(
    async (data: string) => {
      if (room?.localParticipant) {
        const encoder = new TextEncoder();
        await room.localParticipant.publishData(encoder.encode(data), {
          reliable: true,
        });
      }
    },
    [room]
  );

  // Quiz hook (handles warmup, inlesson, AND FA)
  const quiz = useQuiz({
    userId,
    lessonId: activeLesson?.id,
    quiz: (activeLesson?.quiz as any) || null,
    publishData,
  });

  // ---------------------------------------------------------------------------
  // Data Channel Listener (for FA responses)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: any,
      kind?: any,
      topic?: string
    ) => {
      try {
        const decoder = new TextDecoder();
        const text = decoder.decode(payload);
        const data = JSON.parse(text);

        // Route FA responses to quiz hook
        if (data.type === "fa_response") {
          quiz.handleFAResponse(data as FAResponse);
        }

        // Route quiz evaluation results (for in-lesson text questions)
        if (data.type === "quiz_evaluation_result") {
          // Could handle here or in useQuiz - TBD based on implementation
          console.log("[MessagesProvider] Quiz eval result:", data);
        }
      } catch (e) {
        // Not JSON or parse error - ignore (could be other data)
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room, quiz.handleFAResponse]);

  // ---------------------------------------------------------------------------
  // Combine Messages
  // ---------------------------------------------------------------------------
  
  // Merge history + current messages (dedupe)
  const allMessages = useMemo(() => {
    const historyIds = new Set(historyMessages.map((m) => m.id));
    const current = chat.messages.filter((m) => !historyIds.has(m.id));
    return [...historyMessages, ...current];
  }, [historyMessages, chat.messages]);

  // Combine chat + quiz, sort by time
  const allItems = useMemo<ChatItem[]>(() => {
    const msgItems: ChatItem[] = allMessages.map((m) => ({ type: "message", data: m }));
    const quizItems: ChatItem[] = quiz.quizMessages.map((m) => ({ type: "quiz", data: m }));

    return [...msgItems, ...quizItems].sort(
      (a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime()
    );
  }, [allMessages, quiz.quizMessages]);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  const value = useMemo<MessagesContextType>(
    () => ({
      // Session
      conversationId,
      isLoading,

      // Chat
      messages: allMessages,
      isSending: chat.isSending,
      addUserMessage: chat.addUserMessage,
      addAssistantMessage: chat.addAssistantMessage,
      lastAssistantMessageId: chat.lastAssistantMessageId,

      // Quiz (includes FA)
      quizMessages: quiz.quizMessages,
      activeQuizQuestion: quiz.activeQuestion,
      isQuizProcessing: quiz.isProcessing,
      isInFASession: quiz.isInFASession,      // NEW
      startWarmup: quiz.startWarmup,
      triggerInlesson: quiz.triggerInlesson,
      startFA: quiz.startFA,                   // NEW
      submitQuizAnswer: quiz.submitAnswer,
      skipQuizQuestion: quiz.skipQuestion,

      // Combined
      allItems,
    }),
    [
      conversationId,
      isLoading,
      allMessages,
      chat.isSending,
      chat.addUserMessage,
      chat.addAssistantMessage,
      chat.lastAssistantMessageId,
      quiz.quizMessages,
      quiz.activeQuestion,
      quiz.isProcessing,
      quiz.isInFASession,
      quiz.startWarmup,
      quiz.triggerInlesson,
      quiz.startFA,
      quiz.submitAnswer,
      quiz.skipQuestion,
      allItems,
    ]
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within MessagesProvider");
  }
  return context;
}
```

## What MessagesProvider Does

| Responsibility | How |
|----------------|-----|
| Session init | `initializeChatSession()` on mount |
| History loading | Stores in `historyMessages` |
| Compose hooks | Uses `useChat` + `useQuiz` |
| Data channel publish | Provides `publishData` to quiz hook |
| **Data channel listen** | Routes `fa_response` to `quiz.handleFAResponse()` |
| Merge messages | Combines history + current, dedupes |
| Sort items | Combines chat + quiz by `createdAt` |

## What MessagesProvider Does NOT Do

| Responsibility | Where |
|----------------|-------|
| Message storage | `useChat` hook |
| Quiz logic (all types) | `useQuiz` hook |
| FA question/answer state | `useQuiz` hook |
| Agent transcript | `ChatPanel` via `useVoiceAssistant` |

## Architecture

```
MessagesProvider (composition)
├── Session init (conversationId, historyMessages)
├── useChat (message state + DB)
├── useQuiz (warmup + inlesson + FA state)
├── Data channel listener → routes fa_response to useQuiz
└── Combines → allItems (chat + quiz sorted by time)
```

## Usage

```typescript
// In ChatPanel
function ChatPanel() {
  const { allItems, isLoading, submitQuizAnswer, skipQuizQuestion } = useMessages();
  
  return (
    <div>
      {allItems.map((item) => 
        item.type === "message" 
          ? <ChatMessage key={item.data.id} message={item.data} />
          : <QuizQuestion 
              key={item.data.id} 
              question={item.data}
              onAnswer={submitQuizAnswer}
              onSkip={skipQuizQuestion}
            />
      )}
    </div>
  );
}

// In ChatInput - Route based on FA session state
function ChatInput() {
  const { 
    addUserMessage, 
    isSending, 
    isInFASession,
    activeQuizQuestion,
    submitQuizAnswer 
  } = useMessages();
  const room = useRoomContext();
  
  const handleSend = async (text: string) => {
    // If in FA session and there's an active FA text question, submit as answer
    if (isInFASession && activeQuizQuestion?.type === "fa" && activeQuizQuestion.questionType === "text") {
      await submitQuizAnswer(activeQuizQuestion.questionId, text);
    } else {
      // Regular chat - send to agent
      room?.localParticipant.sendText(text);
      addUserMessage(text);
    }
  };
}

// In VideoPanel
function VideoPanel() {
  const { triggerInlesson } = useMessages();
  
  // When video reaches quiz timestamp
  onQuizTimestamp: (questionId) => triggerInlesson(questionId);
}

// In ActionButtons (FA trigger)
function ActionButtons() {
  const { startFA } = useMessages();
  
  // When user clicks "Take assessment" action
  const handleStartAssessment = (topic?: string) => {
    startFA(topic);
  };
}
```

## File Structure

```
providers/
├── ModuleProvider.tsx      # Course, module, lesson context
└── MessagesProvider.tsx    # Composes useChat + useQuiz

hooks/
├── useChat.ts              # Chat message state (~100 lines)
└── useQuiz.ts              # Quiz state (~150 lines)
```

## Benefits of This Structure

1. **Testable** - Test `useChat` and `useQuiz` independently
2. **Reusable** - Hooks work outside context if needed
3. **Single responsibility** - Each hook does one thing
4. **Clean composition** - Provider just wires things together
5. **Smaller files** - Easier to maintain
