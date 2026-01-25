# V2 Module Page - Folder Structure

## Route Structure

```
app/(learning)/v2/course/[courseId]/module/[moduleId]/
├── page.tsx                    # Server component - data fetching, auth, token generation
├── ModuleView.tsx              # Client component - layout orchestration (~150 lines)
│
├── providers/
│   ├── ModuleProvider.tsx      # Module-specific context (course, module, lesson, userId)
│   ├── ActionsProvider.tsx     # Distributed action handler registry
│   └── MessagesProvider.tsx    # Composes useChat + useQuiz, provides unified access
│
├── hooks/
│   ├── useChat.ts              # Chat message state + DB persistence (~100 lines)
│   ├── useQuiz.ts              # Quiz state for warmup, inlesson, FA (~150 lines)
│   ├── useAgentTranscript.ts   # LiveKit transcript stream handler
│   ├── useVoiceMode.ts         # Enable/disable voice mode via RPC
│   └── useLiveKitAudioSync.ts  # Sync global mute with LiveKit agent
│
└── components/
    ├── ChatPanel.tsx           # Message list rendering (~150 lines, reads from useMessages)
    ├── ChatInput.tsx           # Input field + voice toggle
    ├── ChatMessage.tsx         # Single message with action buttons
    ├── QuizQuestion.tsx        # Inline MCQ/text question UI with Framer Motion
    ├── VideoPanel.tsx          # KPoint player wrapper + handler registration
    ├── VoiceIndicator.tsx      # Mic status, speaking indicator
    └── ModuleHeader.tsx        # Lesson title, navigation breadcrumb
```

## Shared/Existing Code (Reuse from v1)

```
contexts/
├── LearningPanelContext.tsx    # Enhanced: sidebar + right panel + nuqs URL sync
└── AudioContext.tsx            # Global audio mute state

actions/
├── livekit.ts                  # Server actions: getLiveKitToken, updateRoomMetadata
└── session-type.ts             # getSessionType for welcome messages

lib/
├── livekit.ts                  # RoomServiceClient singleton
├── url-state.ts                # NEW: nuqs search param definitions
├── actions/
│   └── actionRegistry.ts       # Button definitions (KEEP from v1)
├── audio/
│   └── quizAudio.ts            # Sound effects (KEEP from v1)
└── chat/
    └── message-store.ts        # Existing: storeMessage, initializeChatSession

components/
├── ui/confetti.tsx             # Confetti utility (KEEP from v1)
└── feedback/SuccessMessage.tsx # Toast component (KEEP from v1)
```

## Files to DELETE from v1

```
lib/actions/actionHandlers.ts   # Replaced by distributed handler registration
```

## Dependencies

```
New packages:
- nuqs                          # Type-safe URL state
- @livekit/components-react     # Official LiveKit SDK
- @livekit/components-styles    # LiveKit component styles

Existing packages (already installed):
- livekit-client
- livekit-server-sdk
- framer-motion                 # Quiz animations
```

## Key Differences from V1

| Aspect | V1 | V2 |
|--------|----|----|
| LiveKit | Custom 1260-line hook | Official SDK (`LiveKitRoom`, `RoomAudioRenderer`) + custom hooks |
| Chat + Quiz | 3 hooks (944 lines) + useChatSession (544 lines) | useChat (~100) + useQuiz (~150) + MessagesProvider (~100) |
| URL state | Manual URLSearchParams | nuqs with type-safe parsers |
| Panel control | Local state in ModuleContent | Context + URL sync globally accessible |
| Token fetch | useEffect + fetch | Server component + server action |
| State sharing | 24 refs | React Context |
| Main component | 1277 lines | ~150 lines |
| Actions | Central `actionHandlers.ts` | Distributed handler registration |
| Quiz types | 3 separate hooks | Unified `useQuiz` for warmup, inlesson, FA |

## Provider Hierarchy

```
page.tsx (Server Component)
└── ModuleView (Client Component)
    └── ModuleProvider (course, module, userId, activeLesson)
        └── ActionsProvider (handler registry)
            └── LiveKitRoom (token, serverUrl)
                └── RoomAudioRenderer
                └── MessagesProvider (useChat + useQuiz)
                    └── ModuleLayout
                        ├── ChatPanel
                        ├── ChatInput
                        └── VideoPanel
```

## Plan Documents

| File | Purpose |
|------|---------|
| `00-folder-structure.md` | This file - target structure |
| `01-panel-context.md` | nuqs URL state for panels |
| `02-page-server-component.md` | Server component (data fetch, token) |
| `02.1-kpoint-script-layout.md` | KPoint script + AnimatedBackground in layout |
| `03-module-view.md` | Main client component (~150 lines) |
| `04a-use-chat.md` | Chat hook (~100 lines) |
| `04b-use-quiz.md` | Unified quiz hook (warmup, inlesson, FA) |
| `04c-messages-context.md` | MessagesProvider with data channel |
| `05-chat-panel.md` | Chat UI component |
| `06-chat-message.md` | ChatMessage + QuizQuestion overview |
| `06a-quiz-question.md` | QuizQuestion with Framer Motion |
| `07-actions-system.md` | Actions as message fields + distributed handlers |
| `08-livekit-integration.md` | LiveKit SDK integration patterns |
