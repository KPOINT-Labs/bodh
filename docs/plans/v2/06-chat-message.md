# V2 ChatMessage & QuizQuestion - Message Rendering Components

## Overview

Two separate components for rendering chat items:
1. **ChatMessage** - Regular chat messages (user/assistant)
2. **QuizQuestion** - All quiz types (warmup, inlesson, FA) - unified rendering

**V1 Files:**
- `components/chat/ChatMessage.tsx` (93 lines)
- `components/chat/MessageContent.tsx` (595 lines)
- `components/chat/AssessmentQuestion.tsx`
- `components/chat/InLessonQuestion.tsx`
- `components/chat/FeedbackBadge.tsx`
- `components/chat/AssessmentSummary.tsx`

**V2 Approach:** QuizQuestion handles ALL quiz types with identical UI. FA looks the same as warmup/inlesson.

## Current ChatMessage Props

```typescript
interface ChatMessageProps {
  message: MessageData;
  onQuestionAnswer?: (questionNumber: number, answer: string) => void;
  onQuestionSkip?: (questionNumber: number) => void;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  isFromHistory?: boolean;
  onInlessonAnswer?: (questionId: string, answer: string) => void;
  onInlessonSkip?: (questionId: string) => void;
  onWarmupAnswer?: (questionId: string, answer: string) => void;
  onWarmupSkip?: (questionId: string) => void;
}
```

**Problem:** 8 callback props for different question types - messy.

## V2 Approach

In v2, quiz questions are separate from chat messages:

| V1 | V2 |
|----|----|
| Quiz embedded in MessageContent | Separate QuizQuestion component |
| `onInlessonAnswer`, `onWarmupAnswer` props | `useMessages().submitQuizAnswer()` |
| `messageType: "warmup_mcq"` detection | `ChatItem.type === "quiz"` |

### V2 ChatMessage (Simplified)

```typescript
interface ChatMessageProps {
  message: MessageData;
  onTimestampClick?: (seconds: number) => void;
  isFromHistory?: boolean;
}

export function ChatMessage({
  message,
  onTimestampClick,
  isFromHistory = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={
          isUser
            ? "max-w-[75%] rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2 text-gray-900"
            : "max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 text-gray-800"
        }
      >
        <MessageContent
          content={message.content}
          messageType={message.messageType}
          role={message.role}
          onTimestampClick={onTimestampClick}
          isFromHistory={isFromHistory}
        />
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}
```

### V2 MessageContent (Simplified)

Remove quiz-related rendering (handled by QuizQuestion):

```typescript
interface MessageContentProps {
  content: string;
  messageType?: string;
  role?: "user" | "assistant" | "system";
  onTimestampClick?: (seconds: number) => void;
  isFromHistory?: boolean;
}

export function MessageContent({
  content,
  messageType,
  role,
  onTimestampClick,
  isFromHistory = false,
}: MessageContentProps) {
  // FA feedback rendering (correct/incorrect)
  if (messageType === "fa" && role === "assistant") {
    const feedback = detectAnswerFeedback(content);
    // ... render feedback with badge
  }

  // Regular message content
  return (
    <div className="text-sm leading-relaxed">
      {content.split("\n").map((line, index) => {
        // Headers, lists, inline markdown, timestamps
        // ... existing parsing logic
      })}
    </div>
  );
}
```

## What Moves to QuizQuestion

| Rendering | V1 Location | V2 Location |
|-----------|-------------|-------------|
| Warmup MCQ | MessageContent | QuizQuestion |
| In-lesson MCQ | MessageContent (InLessonQuestion) | QuizQuestion |
| In-lesson text | MessageContent | QuizQuestion |
| **FA MCQ** | N/A (was chat message) | **QuizQuestion** |
| **FA text** | N/A (was chat message) | **QuizQuestion** |
| Question options | InLessonQuestion | QuizQuestion |
| Answer/Skip buttons | InLessonQuestion | QuizQuestion |

**Key Change:** FA now renders identically to warmup/inlesson - same QuizQuestion component.

## V2 QuizQuestion Component

New unified component for ALL quiz types (warmup, inlesson, FA).

**Key UI decisions:**
- User's answer shown as a bubble (like user chat message)
- Feedback shown as color-coded card (green=correct, red=incorrect)
- Show correct answer when user gets it wrong (for MCQ)

```typescript
interface QuizQuestionProps {
  question: QuizMessage;
  onAnswer: (questionId: string, answer: string) => void;
  onSkip: (questionId: string) => void;
  disabled?: boolean;
}

export function QuizQuestion({
  question,
  onAnswer,
  onSkip,
  disabled,
}: QuizQuestionProps) {
  const { 
    questionId, 
    question: text, 
    questionType, 
    options, 
    correctOption,     // For showing correct answer when wrong
    status, 
    userAnswer,        // User's submitted answer
    isCorrect, 
    feedback,
    type,              // "warmup" | "inlesson" | "fa"
    questionNumber,    // FA only: 1-5
    isComplete,        // FA only: session complete
    completionSummary, // FA only: final summary
  } = question;

  // Helper: Get option text by ID
  const getOptionText = (optionId: string) => {
    return options?.find(o => o.id === optionId)?.text || optionId;
  };

  // FA completion summary (after all questions)
  if (type === "fa" && isComplete && completionSummary) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">
          <CheckCircle className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-green-50 px-4 py-3">
          <p className="font-medium text-green-800">Assessment Complete</p>
          <p className="text-sm text-green-700 mt-1">{completionSummary}</p>
        </div>
      </div>
    );
  }

  // Already answered/skipped - show result with user answer and feedback
  if (status === "answered" || status === "skipped") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500">
          <HelpCircle className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-purple-50 px-4 py-3">
          {/* Question number for FA */}
          {type === "fa" && questionNumber && (
            <p className="text-xs text-purple-600 mb-1">Question {questionNumber}</p>
          )}
          
          {/* Question text */}
          <p className="font-medium">{text}</p>
          
          {/* User's answer bubble */}
          {status === "answered" && userAnswer && (
            <div className="flex justify-end mt-3">
              <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                <p className="text-sm text-gray-800">
                  {questionType === "mcq" 
                    ? `${userAnswer}. ${getOptionText(userAnswer)}`
                    : userAnswer
                  }
                </p>
              </div>
            </div>
          )}
          
          {/* Feedback card (color-coded) */}
          {status === "answered" && (
            <div className={`mt-3 rounded-lg p-3 ${
              isCorrect 
                ? "bg-green-50 border border-green-200" 
                : "bg-red-50 border border-red-200"
            }`}>
              {/* Badge */}
              <div className="flex items-center gap-2 mb-1">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">Correct</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Incorrect</span>
                  </>
                )}
              </div>
              
              {/* Show correct answer when wrong (MCQ only) */}
              {!isCorrect && questionType === "mcq" && correctOption && (
                <p className="text-sm text-red-700 mb-1">
                  The correct answer is {correctOption}. {getOptionText(correctOption)}
                </p>
              )}
              
              {/* Feedback text */}
              {feedback && (
                <p className={`text-sm ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {feedback}
                </p>
              )}
            </div>
          )}
          
          {/* Skipped state */}
          {status === "skipped" && (
            <div className="mt-3 rounded-lg p-3 bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-500 italic">Skipped</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pending - show question with options
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500">
        <HelpCircle className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-purple-50 px-4 py-3">
        {/* Question number for FA */}
        {type === "fa" && questionNumber && (
          <p className="text-xs text-purple-600 mb-1">Question {questionNumber}</p>
        )}
        
        <p className="font-medium mb-3">{text}</p>
        
        {/* MCQ Options */}
        {questionType === "mcq" && options && (
          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onAnswer(questionId, opt.id)}
                disabled={disabled}
                className="w-full text-left px-3 py-2 rounded-lg border border-purple-200 
                         hover:bg-purple-100 hover:border-purple-300 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-medium text-purple-700">{opt.id}.</span> {opt.text}
              </button>
            ))}
          </div>
        )}

        {/* Text Input */}
        {questionType === "text" && (
          <TextInput 
            onSubmit={(text) => onAnswer(questionId, text)} 
            disabled={disabled}
            placeholder="Type your answer..."
          />
        )}

        {/* Skip Button */}
        <button 
          onClick={() => onSkip(questionId)} 
          disabled={disabled}
          className="mt-3 text-sm text-gray-500 hover:text-gray-700"
        >
          Skip this question
        </button>
      </div>
    </div>
  );
}
```

## Visual Layout Summary

### Pending State (unanswered)
```
┌─────────────────────────────────────────┐
│ 🟣 Question 1                           │
│ What is a variable in programming?      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ A. A fixed value                    │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ B. A storage location               │ │
│ └─────────────────────────────────────┘ │
│ ...                                     │
│                                         │
│ Skip this question                      │
└─────────────────────────────────────────┘
```

### Answered State (correct)
```
┌─────────────────────────────────────────┐
│ 🟣 Question 1                           │
│ What is a variable in programming?      │
│                                         │
│               ┌─────────────────────┐   │
│               │ B. A storage loc... │   │  ← User answer (right-aligned)
│               └─────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✅ Correct                          │ │  ← Green card
│ │ A variable stores data that can     │ │
│ │ change during execution.            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Answered State (incorrect)
```
┌─────────────────────────────────────────┐
│ 🟣 Question 1                           │
│ What is a variable in programming?      │
│                                         │
│               ┌─────────────────────┐   │
│               │ C. A type of loop   │   │  ← User answer (right-aligned)
│               └─────────────────────┘   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ❌ Incorrect                        │ │  ← Red card
│ │ The correct answer is B. A storage  │ │  ← Shows correct answer
│ │ location that holds data.           │ │
│ │                                     │ │
│ │ A variable stores data that can     │ │  ← Feedback
│ │ change during execution.            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Key Points

1. **Unified UI** - FA looks identical to warmup/inlesson (same colors, same layout)
2. **User answer as bubble** - Right-aligned, styled like user chat message
3. **Color-coded feedback card** - Green for correct, red for incorrect
4. **Show correct answer** - When user gets MCQ wrong, display the correct option
5. **Same handlers** - `onAnswer` and `onSkip` work for all types (routed correctly by useQuiz)
6. **Text input** - Works for both inlesson text questions AND FA text questions

## Rendering in ChatPanel

```typescript
function ChatPanel() {
  const { allItems, submitQuizAnswer, skipQuizQuestion } = useMessages();

  return (
    <div className="space-y-4">
      {allItems.map((item) =>
        item.type === "message" ? (
          <ChatMessage key={item.data.id} message={item.data} />
        ) : (
          <QuizQuestion
            key={item.data.id}
            question={item.data}
            onAnswer={submitQuizAnswer}
            onSkip={skipQuizQuestion}
          />
        )
      )}
    </div>
  );
}
```

## Files to Modify

| File | Change |
|------|--------|
| `ChatMessage.tsx` | Remove quiz callback props |
| `MessageContent.tsx` | Remove warmup_mcq, inlesson rendering |
| `InLessonQuestion.tsx` | May be reused in QuizQuestion or deleted |

## Files to Create

| File | Purpose |
|------|---------|
| `QuizQuestion.tsx` | Unified quiz rendering (MCQ + text) |

## Benefits

1. **Cleaner props** - ChatMessage has 3 props instead of 9
2. **Separation** - Quiz logic in QuizQuestion, not MessageContent
3. **Type safety** - QuizMessage type vs detecting `messageType`
4. **Reusable** - QuizQuestion can be used anywhere
5. **Testable** - Test quiz rendering independently
6. **Unified FA** - FA looks identical to other quizzes (user request)

## Notes

- MessageContent still handles: markdown, timestamps, headers, lists
- QuizQuestion handles: ALL quiz types (warmup, inlesson, FA), MCQ options, text input, answered state, feedback display
- FeedbackBadge reused for correct/incorrect indicators
- FA completion summary shown at end of FA session

## Quiz Types Summary

| Type | Source | UI | Handler |
|------|--------|-----|---------|
| Warmup | DB | QuizQuestion | useQuiz (local eval) |
| In-lesson MCQ | DB | QuizQuestion | useQuiz (local eval) |
| In-lesson text | DB | QuizQuestion | useQuiz → agent |
| FA MCQ | Agent | QuizQuestion | useQuiz → agent |
| FA text | Agent | QuizQuestion | useQuiz → agent |

All render with the same QuizQuestion component - **visually indistinguishable**.
