# V2 QuizQuestion Component - Unified Quiz Rendering

## Overview

Unified component for rendering ALL quiz types (warmup, inlesson, FA) with identical UI.
Uses **Framer Motion** for all animations (matching v1's latest `components/feedback/` pattern).

**File:** `app/(learning)/v2/course/[courseId]/module/[moduleId]/components/QuizQuestion.tsx`

## Design Decisions

| Decision | Choice |
|----------|--------|
| User answer display | Right-aligned bubble (like user chat message) |
| Feedback display | Color-coded card (green=correct, red=incorrect) |
| Show correct answer when wrong | Yes (MCQ only) |
| FA vs other quizzes | Identical UI - visually indistinguishable |
| Animation library | **Framer Motion** (no custom CSS animations) |
| Sound effects | `audioManager.play("success")` / `audioManager.play("error")` / `audioManager.play("click")` |
| Confetti | `fireConfetti()` on correct answer |
| Toast notifications | `SuccessMessage` and `ErrorMessage` from `@/components/feedback/` |

## V1 Components to Reuse (Framer Motion)

### Success Toast (`components/feedback/SuccessMessage.tsx`)

```typescript
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";

// Portal to document.body
// Position: Fixed, centered horizontally, 1/3 from top
// Animation:
//   initial: { opacity: 0, scale: 0.6, y: -40 }
//   animate: { opacity: 1, scale: 1, y: 0 }
//   exit: { opacity: 0, scale: 0.8, y: -20 }
//   transition: { type: "spring", stiffness: 260, damping: 18 }
// Style: Green gradient (from-green-500 to-emerald-500), white border, rounded-3xl
// Icons: CheckCircle + Sparkles
// Duration: Auto-dismiss after 2000ms
// Default message: "Great job!"
```

### Error Toast (`components/feedback/ErrorMessage.tsx`)

```typescript
import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { createPortal } from "react-dom";

// Portal to document.body
// Position: Fixed, centered horizontally, at top
// Outer animation:
//   initial: { opacity: 0, scale: 0.9, y: -10 }
//   animate: { opacity: 1, scale: 1, y: 0 }
//   exit: { opacity: 0, scale: 0.9, y: -10 }
//   transition: { type: "spring", stiffness: 260, damping: 20 }
// Inner SHAKE animation:
//   animate: { x: [0, -10, 10, -6, 6, -3, 3, 0] }
//   transition: { duration: 0.6, ease: "easeInOut" }
// Style: Red background (bg-red-500/95), red border, shadow with red glow
// Icon: XCircle with ping animation overlay (animate-ping on div)
// Duration: Auto-dismiss after 2000ms
// Default message: "Not quite correct!"
```

### Sound Effects (`lib/audio/quizAudio.ts`)

```typescript
import { audioManager } from "@/lib/audio/quizAudio";

audioManager?.play("click");    // On option select
audioManager?.play("success");  // On correct answer
audioManager?.play("error");    // On incorrect answer
```

### Confetti (`components/ui/confetti.tsx`)

```typescript
import { fireConfetti } from "@/components/ui/confetti";

fireConfetti();  // On correct answer
```

## MCQ Component Animations (Framer Motion)

### Option Buttons - Staggered Entry

```typescript
import { motion } from "framer-motion";

// Container for staggered children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // 100ms delay between each option
    },
  },
};

// Individual option animation
const optionVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

// Usage
<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {options.map((opt) => (
    <motion.button key={opt.id} variants={optionVariants}>
      {opt.text}
    </motion.button>
  ))}
</motion.div>
```

### Option Selection Animation

```typescript
// On select: scale up slightly with spring
const selectedAnimation = {
  scale: 1.02,
  transition: { type: "spring", stiffness: 400, damping: 17 }
};

// Unselected state
const unselectedAnimation = {
  scale: 1,
  transition: { type: "spring", stiffness: 400, damping: 17 }
};
```

### Correct Answer - Success Glow

```typescript
// Card container gets success treatment
const successCardVariants = {
  initial: { borderColor: "rgb(147 197 253)" },  // blue-300
  correct: { 
    borderColor: "rgb(34 197 94)",  // green-500
    boxShadow: "0 0 20px rgba(34, 197, 94, 0.3)",
    transition: { duration: 0.3 }
  },
};

// Selected option gets checkmark icon transition
const correctOptionVariants = {
  initial: { backgroundColor: "white" },
  correct: { 
    backgroundColor: "rgb(220 252 231)",  // green-100
    scale: 1.02,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
};
```

### Incorrect Answer - Shake Animation

```typescript
// Card container shakes
const shakeVariants = {
  shake: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    borderColor: "rgb(239 68 68)",  // red-500
    transition: { duration: 0.5 }
  },
};

// Wrong selected option
const incorrectOptionVariants = {
  initial: { backgroundColor: "white" },
  incorrect: { 
    backgroundColor: "rgb(254 226 226)",  // red-100
    scale: 1.02,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
};

// Correct option highlight (when user was wrong)
const correctHighlightVariants = {
  initial: { backgroundColor: "white", opacity: 1 },
  highlight: { 
    backgroundColor: "rgb(220 252 231)",  // green-100
    opacity: 0.8,
    transition: { duration: 0.3, delay: 0.3 }
  },
};
```

### Submit Button - Pulse When Ready

```typescript
// Pulse animation when option is selected
const submitButtonVariants = {
  idle: { scale: 1 },
  ready: {
    scale: [1, 1.03, 1],
    transition: { 
      repeat: Infinity, 
      duration: 1.5,
      ease: "easeInOut"
    }
  },
};
```

## Animation Flow (Triggered in useQuiz hook)

| Event | Sound | Visual | Timing |
|-------|-------|--------|--------|
| Option click | `click` | Scale spring (1.02) | Immediate |
| Submit (correct) | `success` | Glow + Confetti + SuccessToast | 900ms toast |
| Submit (incorrect) | `error` | Shake + ErrorToast + Show correct | 900ms toast |
| Skip | None | Fade out | Immediate |

### Sequence in useQuiz.submitAnswer()

```typescript
// MCQ - local evaluation with animations
if (message.questionType === "mcq") {
  const isCorrect = answer === message.correctOption;

  if (isCorrect) {
    audioManager?.play("success");       // 1. Sound
    fireConfetti();                       // 2. Confetti
    setShowSuccessToast(true);           // 3. Toast
    setTimeout(() => setShowSuccessToast(false), 900);
  } else {
    audioManager?.play("error");         // 1. Sound  
    setShowErrorToast(true);             // 2. Toast with shake
    setTimeout(() => setShowErrorToast(false), 900);
  }

  // Update message state (triggers UI animation)
  setQuizMessages((prev) =>
    prev.map((m) =>
      m.questionId === questionId
        ? { ...m, status: "answered", userAnswer: answer, isCorrect, feedback }
        : m
    )
  );

  // Wait for animation before advancing
  await new Promise((resolve) => setTimeout(resolve, 900));

  advanceQuiz(newStats);
}
```

## Props

```typescript
import type { QuizMessage } from "../hooks/useQuiz";

interface QuizQuestionProps {
  question: QuizMessage;
  onAnswer: (questionId: string, answer: string) => void;
  onSkip: (questionId: string) => void;
  disabled?: boolean;
}
```

## QuizMessage Type (from useQuiz)

```typescript
interface QuizMessage {
  id: string;
  type: "warmup" | "inlesson" | "fa";
  questionId: string;
  question: string;
  questionType: "mcq" | "text";
  options?: QuizOption[];              // { id: "A", text: "Option text" }
  correctOption?: string;              // "A", "B", etc. (for local eval)
  status: "pending" | "answered" | "skipped";
  userAnswer?: string;                 // User's submitted answer
  isCorrect?: boolean;
  feedback?: string;
  createdAt: string;
  // FA-specific
  questionNumber?: number;             // 1-5
  isComplete?: boolean;
  completionSummary?: string;
}
```

## Full Implementation (Framer Motion)

```typescript
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Circle, HelpCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { audioManager } from "@/lib/audio/quizAudio";
import { cn } from "@/lib/utils";
import type { QuizMessage } from "../hooks/useQuiz";

interface QuizQuestionProps {
  question: QuizMessage;
  onAnswer: (questionId: string, answer: string) => void;
  onSkip: (questionId: string) => void;
  disabled?: boolean;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const optionVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  },
};

const cardVariants = {
  initial: { borderColor: "rgb(216 180 254)" },  // purple-300
  correct: { 
    borderColor: "rgb(34 197 94)",
    boxShadow: "0 0 20px rgba(34, 197, 94, 0.25)",
    transition: { duration: 0.3 }
  },
  incorrect: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    borderColor: "rgb(239 68 68)",
    transition: { duration: 0.5 }
  },
};

const feedbackCardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 25, delay: 0.2 }
  },
};

export function QuizQuestion({
  question,
  onAnswer,
  onSkip,
  disabled = false,
}: QuizQuestionProps) {
  const {
    questionId,
    question: text,
    questionType,
    options,
    correctOption,
    status,
    userAnswer,
    isCorrect,
    feedback,
    type,
    questionNumber,
    isComplete,
    completionSummary,
  } = question;

  const [selected, setSelected] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getOptionText = (optionId: string): string => {
    return options?.find((o) => o.id === optionId)?.text || optionId;
  };

  const formatUserAnswer = (): string => {
    if (!userAnswer) return "";
    if (questionType === "mcq") {
      return `${userAnswer}. ${getOptionText(userAnswer)}`;
    }
    return userAnswer;
  };

  const handleOptionSelect = (optionId: string) => {
    if (disabled || isSubmitting) return;
    audioManager?.play("click");
    setSelected(optionId);
  };

  const handleSubmit = () => {
    if (!selected || disabled || isSubmitting) return;
    setIsSubmitting(true);
    onAnswer(questionId, selected);
  };

  const handleTextSubmit = () => {
    if (!textAnswer.trim() || disabled || isSubmitting) return;
    setIsSubmitting(true);
    onAnswer(questionId, textAnswer.trim());
    setTextAnswer("");
  };

  // =========================================================================
  // State 1: FA Completion Summary
  // =========================================================================
  if (type === "fa" && isComplete && completionSummary) {
    return (
      <motion.div 
        className="flex items-start gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">
          <CheckCircle className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-green-50 px-4 py-3 border border-green-200">
          <p className="font-medium text-green-800">Assessment Complete</p>
          <p className="text-sm text-green-700 mt-1">{completionSummary}</p>
        </div>
      </motion.div>
    );
  }

  // =========================================================================
  // State 2 & 3: Answered or Skipped
  // =========================================================================
  if (status === "answered" || status === "skipped") {
    return (
      <div className="flex items-start gap-3">
        {/* Question Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500">
          <HelpCircle className="h-4 w-4 text-white" />
        </div>

        <motion.div 
          className={cn(
            "max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 border-2",
            status === "answered" && isCorrect && "bg-green-50/50 border-green-300",
            status === "answered" && !isCorrect && "bg-red-50/30 border-red-300",
            status === "skipped" && "bg-purple-50 border-purple-200"
          )}
          initial="initial"
          animate={status === "answered" ? (isCorrect ? "correct" : "incorrect") : "initial"}
          variants={cardVariants}
        >
          {/* Question Number (FA only) */}
          {type === "fa" && questionNumber && (
            <p className="text-xs text-purple-600 mb-1">Question {questionNumber}</p>
          )}

          {/* Question Text */}
          <p className="font-medium text-gray-900">{text}</p>

          {/* MCQ Options (answered state) */}
          {status === "answered" && questionType === "mcq" && options && (
            <div className="mt-3 space-y-2">
              {options.map((opt) => {
                const isUserAnswer = opt.id === userAnswer;
                const isCorrectOption = opt.id === correctOption;
                
                return (
                  <motion.div
                    key={opt.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      isUserAnswer && isCorrect && "border-green-400 bg-green-100",
                      isUserAnswer && !isCorrect && "border-red-400 bg-red-100",
                      !isUserAnswer && isCorrectOption && !isCorrect && "border-green-400 bg-green-50 opacity-80",
                      !isUserAnswer && !isCorrectOption && "border-gray-200 bg-white/50 opacity-60"
                    )}
                    initial={{ scale: 1 }}
                    animate={{ 
                      scale: isUserAnswer ? 1.02 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="flex-shrink-0">
                      {isUserAnswer ? (
                        isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      ) : isCorrectOption && !isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                    <span className="flex-1 text-gray-800">
                      <span className="mr-2 font-medium text-muted-foreground">{opt.id}.</span>
                      {opt.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Text Answer (answered state) */}
          {status === "answered" && questionType === "text" && userAnswer && (
            <div className="flex justify-end mt-3">
              <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                <p className="text-sm text-gray-800">{userAnswer}</p>
              </div>
            </div>
          )}

          {/* Feedback Card */}
          {status === "answered" && (
            <motion.div
              className={cn(
                "mt-3 rounded-lg p-3",
                isCorrect
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              )}
              variants={feedbackCardVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="flex items-center gap-2 mb-1">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">Not quite right</span>
                  </>
                )}
              </div>

              {feedback && (
                <p className={cn("text-sm", isCorrect ? "text-green-700" : "text-red-700")}>
                  {feedback}
                </p>
              )}
            </motion.div>
          )}

          {/* Skipped Card */}
          {status === "skipped" && (
            <motion.div 
              className="mt-3 rounded-lg p-3 bg-gray-50 border border-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-sm text-gray-500 italic">Skipped</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // State 4 & 5: Pending (MCQ or Text)
  // =========================================================================
  return (
    <div className="flex items-start gap-3">
      {/* Question Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500">
        <HelpCircle className="h-4 w-4 text-white" />
      </div>

      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-purple-50 px-4 py-3 border-2 border-purple-200">
        {/* Question Number (FA only) */}
        {type === "fa" && questionNumber && (
          <p className="text-xs text-purple-600 mb-1">Question {questionNumber}</p>
        )}

        {/* Question Text */}
        <p className="font-medium text-gray-900 mb-3">{text}</p>

        {/* MCQ Options */}
        {questionType === "mcq" && options && (
          <motion.div 
            className="space-y-2"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {options.map((opt) => (
              <motion.button
                key={opt.id}
                variants={optionVariants}
                onClick={() => handleOptionSelect(opt.id)}
                disabled={disabled || isSubmitting}
                whileHover={{ scale: disabled ? 1 : 1.01 }}
                whileTap={{ scale: disabled ? 1 : 0.99 }}
                animate={{ 
                  scale: selected === opt.id ? 1.02 : 1,
                  borderColor: selected === opt.id ? "rgb(147 51 234)" : "rgb(233 213 255)",
                  backgroundColor: selected === opt.id ? "rgb(243 232 255)" : "white",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg border-2 flex items-center gap-3",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <div className="flex-shrink-0">
                  {selected === opt.id ? (
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <span className="flex-1 text-gray-800">
                  <span className="mr-2 font-medium text-purple-700">{opt.id}.</span>
                  {opt.text}
                </span>
              </motion.button>
            ))}

            {/* Submit & Skip buttons */}
            <div className="flex items-center gap-2 pt-2">
              <motion.button
                onClick={handleSubmit}
                disabled={!selected || disabled || isSubmitting}
                animate={selected && !disabled && !isSubmitting ? {
                  scale: [1, 1.02, 1],
                } : { scale: 1 }}
                transition={selected ? { 
                  repeat: Infinity, 
                  duration: 1.5,
                  ease: "easeInOut"
                } : {}}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white",
                  "bg-gradient-to-r from-purple-600 to-indigo-600",
                  "hover:from-purple-500 hover:to-indigo-500",
                  "disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
                {isSubmitting ? "Checking..." : "Submit Answer"}
              </motion.button>
              <button
                onClick={() => onSkip(questionId)}
                disabled={disabled || isSubmitting}
                className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}

        {/* Text Input */}
        {questionType === "text" && (
          <div className="space-y-2">
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={disabled || isSubmitting}
              placeholder="Type your answer..."
              className="w-full px-3 py-2 rounded-lg border border-purple-200 
                       bg-white focus:outline-none focus:ring-2 focus:ring-purple-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       resize-none min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleTextSubmit}
                disabled={disabled || isSubmitting || !textAnswer.trim()}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white",
                  "bg-gradient-to-r from-purple-600 to-indigo-600",
                  "hover:from-purple-500 hover:to-indigo-500",
                  "disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
              <button
                onClick={() => onSkip(questionId)}
                disabled={disabled || isSubmitting}
                className="px-3 py-2 text-gray-500 text-sm hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

## ChatPanel Integration (Toast Rendering)

```typescript
// In ChatPanel.tsx
"use client";

import { SuccessMessage } from "@/components/feedback/SuccessMessage";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";
import { useMessages } from "../providers/MessagesProvider";
import { ChatMessage } from "./ChatMessage";
import { QuizQuestion } from "./QuizQuestion";

export function ChatPanel() {
  const { 
    allItems, 
    submitQuizAnswer, 
    skipQuizQuestion, 
    isQuizProcessing,
    showSuccessToast,
    showErrorToast,
    setShowSuccessToast,
    setShowErrorToast,
  } = useMessages();

  return (
    <>
      <div className="space-y-4 p-4">
        {allItems.map((item) =>
          item.type === "message" ? (
            <ChatMessage key={item.data.id} message={item.data} />
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
      </div>
      
      {/* Toast portals from @/components/feedback/ */}
      <SuccessMessage
        show={showSuccessToast}
        message="Great job!"
        onClose={() => setShowSuccessToast(false)}
      />
      <ErrorMessage
        show={showErrorToast}
        message="Not quite correct!"
        onClose={() => setShowErrorToast(false)}
      />
    </>
  );
}
```

## Dependencies

```typescript
// Required imports
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Circle, HelpCircle, XCircle } from "lucide-react";
import { audioManager } from "@/lib/audio/quizAudio";
import { fireConfetti } from "@/components/ui/confetti";
import { SuccessMessage } from "@/components/feedback/SuccessMessage";
import { ErrorMessage } from "@/components/feedback/ErrorMessage";
import { cn } from "@/lib/utils";
```

## Styling Summary

| Element | Style |
|---------|-------|
| Question card (pending) | `bg-purple-50 border-purple-200` |
| Question card (correct) | `bg-green-50/50 border-green-300` + glow shadow |
| Question card (incorrect) | `bg-red-50/30 border-red-300` + shake animation |
| Selected option | `bg-purple-100 border-purple-600` + scale 1.02 |
| Correct option (answered) | `bg-green-100 border-green-400` + CheckCircle |
| Incorrect option (answered) | `bg-red-100 border-red-400` + XCircle |
| Correct highlight (when wrong) | `bg-green-50 border-green-400 opacity-80` |
| Feedback card | Spring entry with delay 0.2s |
| Submit button | Gradient purple→indigo, pulse when ready |
| SuccessToast | Green gradient, spring scale/y, CheckCircle+Sparkles |
| ErrorToast | Red with shake x:[0,-10,10,-8,8,-4,4,0], ping icon |

## Notes

1. **All animations use Framer Motion** - No custom CSS keyframe animations
2. **Toasts from `@/components/feedback/`** - Reuse existing Framer Motion components
3. **Sound effects triggered in useQuiz** - Not in QuizQuestion component
4. **Confetti triggered in useQuiz** - After correct answer
5. **Staggered option entry** - 80ms delay between each option appearing
6. **Submit button pulses** - When option is selected and ready to submit
7. **Card shake on incorrect** - Framer Motion x array animation
8. **Feedback card slides in** - Spring animation with 0.2s delay
