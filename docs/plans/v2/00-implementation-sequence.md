# Implementation Sequence

Review date: 2026-01-25

## Before Starting — RESOLVED ✅

| Decision | Resolution |
|----------|------------|
| Transcript handling | **Hybrid** — `useVoiceAssistant` for agent state + `registerTextStreamHandler` for transcript text |
| Toast state ownership | **MessagesProvider** owns `showSuccessToast`, `showErrorToast` |
| FA routing ownership | **MessagesProvider routes** — Single listener calls `quiz.handleFAResponse()` |
| V1 parallel deployment | **Separate `/v2/` route** — Zero risk, easy testing, clean cutover |
| ModuleProvider scope | **Minimal** — Read-only context (course, module, userId, sessionType) |

---

## Phase 1 — Foundation

| Order | Doc | Task | Status |
|-------|-----|------|--------|
| 1 | 01-panel-context.md | URL state foundation (nuqs) | ⬜ |
| 2 | 02.1-kpoint-script-layout.md | Move KPoint script + AnimatedBackground to layout | ⬜ |
| 3 | 09-module-provider.md | ModuleProvider (minimal read-only context) | ⬜ |
| 4 | 04a-use-chat.md | Chat state hook | ⬜ |
| 5 | 04b-use-quiz.md | Quiz state hook (warmup, inlesson, FA) | ⬜ |

---

## Phase 2 — Integration

| Order | Doc | Task | Status |
|-------|-----|------|--------|
| 6 | 04c-messages-context.md | Composition layer (useChat + useQuiz + data channel) | ⬜ |
| 7 | 07-actions-system.md | Actions infrastructure (distributed handlers) | ⬜ |
| 8 | 02-page-server-component.md | Page setup (auth, data fetch, token) | ⬜ |
| 9 | 08-livekit-integration.md | LiveKit wiring (SDK + custom hooks) | ⬜ |

---

## Phase 3 — UI

| Order | Doc | Task | Status |
|-------|-----|------|--------|
| 10 | 03-module-view.md | Main component (~150 lines) | ⬜ |
| 11 | 06-chat-message.md | Message rendering (simplified) | ⬜ |
| 12 | 06a-quiz-question.md | Quiz UI (Framer Motion) | ⬜ |
| 13 | 05-chat-panel.md | Panel layout | ⬜ |
| 14 | 10-video-panel.md | VideoPanel (V1 wrapper) | ⬜ |

---

## Plan Documents

| Doc | Purpose |
|-----|---------|
| `00-implementation-sequence.md` | This file — order + decisions |
| `00-folder-structure.md` | Target folder structure |
| `01-panel-context.md` | nuqs URL state for panels |
| `02-page-server-component.md` | Server component (data fetch, token) |
| `02.1-kpoint-script-layout.md` | KPoint script + AnimatedBackground in layout |
| `03-module-view.md` | Main client component (~150 lines) |
| `04a-use-chat.md` | Chat hook (~100 lines) |
| `04b-use-quiz.md` | Unified quiz hook (warmup, inlesson, FA) |
| `04c-messages-context.md` | MessagesProvider composition layer |
| `05-chat-panel.md` | Chat UI component |
| `06-chat-message.md` | ChatMessage + QuizQuestion overview |
| `06a-quiz-question.md` | QuizQuestion with Framer Motion |
| `07-actions-system.md` | Actions as message fields + distributed handlers |
| `08-livekit-integration.md` | LiveKit SDK integration patterns |
| `09-module-provider.md` | ModuleProvider (minimal context) |
| `10-video-panel.md` | VideoPanel (V1 wrapper) |

---

## Architecture Summary

```
page.tsx (Server Component)
└── ModuleView (Client Component)
    └── ModuleProvider (course, module, userId, sessionType)
        └── ActionsProvider (handler registry)
            └── LiveKitRoom (token, serverUrl)
                └── RoomAudioRenderer
                └── MessagesProvider (useChat + useQuiz + data channel)
                    └── ModuleLayout
                        ├── ChatPanel
                        ├── ChatInput
                        └── VideoPanel
```

---

## Notes

- Massive reduction: 1277 lines → ~150 lines for main component
- Strong TypeScript throughout
- Leverages official LiveKit SDK with custom hooks for app-specific logic
- V1 remains untouched at `/course/...`, V2 at `/v2/course/...`
- Transcript handling: `useVoiceAssistant` (state) + `registerTextStreamHandler` (text)
