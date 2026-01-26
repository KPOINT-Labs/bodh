# V2 ChatPanel - Chat UI Component

## Overview

Simplified chat UI component (~150 lines vs v1's 710 lines) that:
1. Renders chat messages + quiz questions from `useMessages()` context
2. Shows live agent transcript
3. Auto-scrolls with smart behavior

**Key change**: All state comes from `MessagesProvider` - ChatPanel just renders.

## File: `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/ChatPanel.tsx`

```typescript
"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useVoiceAssistant, useRoomContext } from "@livekit/components-react";

import { Card } from "@/components/ui/card";
import { ChatMessage, MessageContent, TypingIndicator } from "@/components/chat";
import { useAutoScroll } from "@/hooks/useAutoScroll";

import { useMessages } from "../providers/MessagesProvider";
import { ChatHeader } from "./ChatHeader";
import { QuizQuestion } from "./QuizQuestion";

// TODO: Add useTypingEffect hook later for live transcript animation

export function ChatPanel() {
  // All state from MessagesContext
  const {
    allItems,
    isLoading,
    isSending,
    addAssistantMessage,
    submitQuizAnswer,
    skipQuizQuestion,
    isQuizProcessing,
  } = useMessages();

  // LiveKit hooks (from official SDK)
  const room = useRoomContext();
  const { state: agentState, agentTranscriptions } = useVoiceAssistant();

  // Derive agent state
  const isAgentSpeaking = agentState === "speaking";
  const isConnected = room?.state === "connected";

  // Get latest agent transcript
  const agentTranscript = useMemo(() => {
    const latest = agentTranscriptions[agentTranscriptions.length - 1];
    return latest?.text || "";
  }, [agentTranscriptions]);

  // Auto-scroll
  const { scrollRef, scrollToBottom, forceScrollToBottom } = useAutoScroll({
    threshold: 150,
  });

  // Store agent transcript when final
  useEffect(() => {
    const latest = agentTranscriptions[agentTranscriptions.length - 1];
    if (latest?.final && latest.text) {
      addAssistantMessage(latest.text, "general");
    }
  }, [agentTranscriptions, addAssistantMessage]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (allItems.length > 0) {
      scrollToBottom();
    }
  }, [allItems.length, scrollToBottom]);

  // Auto-scroll on transcript update
  useEffect(() => {
    if (agentTranscript) {
      scrollToBottom();
    }
  }, [agentTranscript, scrollToBottom]);

  // Force scroll when loading completes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(forceScrollToBottom, 100);
    }
  }, [isLoading, forceScrollToBottom]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-none bg-transparent p-6 shadow-none">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
          Loading chat...
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-none bg-transparent p-6 shadow-none">
      <ChatHeader />

      <div className="space-y-4">
        {/* All messages and quiz questions (pre-sorted by MessagesProvider) */}
        {allItems.map((item) =>
          item.type === "message" ? (
            <ChatMessage
              key={item.data.id}
              message={item.data}
              isFromHistory={false}
            />
          ) : (
            <QuizQuestion
              key={item.data.id}
              question={item.data}
              onAnswer={submitQuizAnswer}
              onSkip={skipQuizQuestion}
              disabled={isQuizProcessing}
            />
          )
        )}

        {/* Live agent transcript */}
        {isConnected && agentTranscript && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
              <div className="text-gray-800 text-sm leading-relaxed">
                <MessageContent content={agentTranscript} />
                {isAgentSpeaking && (
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-blue-500" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connecting state */}
        {!isConnected && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                Connecting to your AI assistant...
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isSending && !agentTranscript && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </Card>
  );
}
```

## Key Differences from V1

| Aspect | V1 (ChatAgent.tsx) | V2 (ChatPanel.tsx) |
|--------|--------------------|--------------------|
| Lines | 710 | ~150 |
| State management | Local state + props | `useMessages()` context |
| Message combining | Manual in component | Pre-combined by provider |
| Session init | In component | In MessagesProvider |
| Quiz state | Separate hook | From context |
| LiveKit state | Props from parent | Direct hook usage |

## What ChatPanel Does NOT Do

| Responsibility | Handled By |
|----------------|------------|
| Session initialization | MessagesProvider |
| Message storage | MessagesProvider |
| Quiz state management | MessagesProvider |
| Combining/sorting items | MessagesProvider |
| History vs current tracking | MessagesProvider |

## Component Composition

```
ChatPanel (renders only)
├── ChatHeader
├── ChatMessage[] (from allItems where type="message")
├── QuizQuestion[] (from allItems where type="quiz")
├── Live Agent Transcript
├── Connecting State
├── TypingIndicator
└── Scroll Anchor
```

## Data Flow

```
MessagesProvider
  │
  ├── allItems (pre-sorted ChatItem[])
  ├── isLoading, isSending, isQuizProcessing
  ├── submitQuizAnswer, skipQuizQuestion
  └── addAssistantMessage
          │
          ▼
     ChatPanel (reads + renders)
          │
          ├── useVoiceAssistant() → agentTranscriptions
          └── useRoomContext() → connection state
```

## Agent Transcript Flow

1. `useVoiceAssistant()` provides `agentTranscriptions` array
2. Latest transcript shown inline (no typing effect for now)
3. When `final: true`, stored via `addAssistantMessage()` from context
4. Stored message appears in `allItems` automatically

## Auto-Scroll Behavior

| Event | Behavior |
|-------|----------|
| `allItems.length` changes | Smart scroll |
| `agentTranscript` changes | Smart scroll |
| `isLoading` becomes false | Force scroll |

## No Props Required

All data comes from contexts:
- `useMessages()` - messages, quiz, actions
- `useVoiceAssistant()` - agent state, transcriptions  
- `useRoomContext()` - connection state

## Notes

1. **Pure render component** - No local state except auto-scroll
2. **Context-driven** - All data from MessagesProvider
3. **Official SDK** - `useVoiceAssistant` for agent state
4. **Simple** - ~150 lines vs 710 lines in v1
5. **TODO** - Add typing effect later
