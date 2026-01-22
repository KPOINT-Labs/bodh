# In-Lesson Questions: Chat UI Design

## Overview

Render in-lesson quiz questions in the chat panel (like FA questions) instead of as a modal overlay.

## Current State

- **QuizOverlay**: Full-screen modal for both warmup and in-lesson questions
- **AssessmentQuestion**: Inline chat component used for FA questions
- In-lesson questions trigger at video timestamps, pause video, show modal

## Target State

- In-lesson questions appear as chat messages using `AssessmentQuestion` component
- Warmup questions continue using `QuizOverlay` modal
- Consistent UX between FA and in-lesson questions

## Data Flow

### Trigger Flow
1. `useKPointPlayer` detects timestamp → calls `onInLessonTrigger(questionId)`
2. Video pauses automatically
3. Add new message to chat containing the question
4. User sees question rendered with `AssessmentQuestion` in chat panel

### Answer Flow (MCQ)
1. User selects option and clicks Submit
2. Check answer locally against `correct_option`
3. Show feedback badge (correct/incorrect) + explanation
4. Show "Continue watching" button
5. User clicks → video resumes, attempt recorded to DB

### Answer Flow (Text)
1. User types answer and clicks Submit
2. Send to LiveKit agent for evaluation (like FA)
3. Agent responds with feedback
4. Show "Continue watching" button
5. User clicks → video resumes, attempt recorded to DB

## Message Format

```typescript
{
  role: "assistant",
  messageType: "inlesson",
  content: questionText,
  metadata: {
    questionId: string,
    type: "mcq" | "text",
    options?: QuizOption[],
    correctOption?: string,  // for local MCQ evaluation
  }
}
```

## Implementation

### Files to Modify

1. **ModuleContent.tsx**
   - Add `activeInlessonQuestion` state to track current question
   - Modify `onInLessonTrigger` to add chat message instead of opening modal
   - Add `handleInlessonAnswer` function for MCQ local evaluation
   - Add `handleInlessonTextAnswer` to send text answers to agent
   - Add "Continue watching" action button after feedback
   - Remove `QuizOverlay` usage for in-lesson (keep for warmup only)

2. **MessageContent.tsx**
   - Add handling for `messageType === "inlesson"`
   - Render `AssessmentQuestion` with question data from message metadata
   - Pass `onAnswer` and `onSkip` handlers

3. **Chat message types**
   - Extend message type to include `"inlesson"`
   - Add metadata fields for question data

### Files Unchanged
- `AssessmentQuestion.tsx` - Reuse as-is
- `useKPointPlayer.ts` - Trigger logic stays same
- `QuizOverlay.tsx` - Keep for warmup quizzes only

## Resume & Recording Logic

### After MCQ Answer
1. Evaluate: `answer === question.correctOption`
2. Add feedback message to chat with `FeedbackBadge`
3. Record attempt via `recordAttempt()` server action
4. Register "Continue watching" action button
5. On click: `playerRef.current.playVideo()` + clear action buttons

### After Text Answer
1. Send to agent: `INLESSON_ANSWER:${questionId}:${answer}`
2. Agent evaluates and responds with feedback
3. On agent response: Record attempt, show "Continue watching" button
4. On click: Resume video

### Skip Handling
- Record attempt with `isSkipped: true`
- Show "Continue watching" button immediately
- Resume video on click
