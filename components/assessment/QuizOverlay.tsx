"use client";

import { BookOpen, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  InLessonQuestion,
  QuizOption,
  WarmupQuestion,
} from "@/types/assessment";
import { QuizFeedback } from "./QuizFeedback";
import { QuizQuestion } from "./QuizQuestion";

type QuizType = "warmup" | "inlesson";

interface QuizOverlayProps {
  isOpen: boolean;
  quizType: QuizType;
  questions: (WarmupQuestion | InLessonQuestion)[];
  currentQuestionIndex: number;
  showFeedback: boolean;
  lastAnswer?: {
    isCorrect: boolean;
    feedback: string;
  } | null;
  isLoading?: boolean;
  onSubmitAnswer: (answer: string) => void;
  onSkipQuestion: () => void;
  onContinue: () => void;
  onClose: () => void;
}

export function QuizOverlay({
  isOpen,
  quizType,
  questions,
  currentQuestionIndex,
  showFeedback,
  lastAnswer,
  isLoading = false,
  onSubmitAnswer,
  onSkipQuestion,
  onContinue,
  onClose,
}: QuizOverlayProps) {
  if (!isOpen || questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return null;
  }

  const isWarmup = quizType === "warmup";
  const totalQuestions = questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Determine question type and options
  const questionType = "type" in currentQuestion ? currentQuestion.type : "mcq";
  const options: QuizOption[] | undefined =
    "options" in currentQuestion ? currentQuestion.options : undefined;

  // Determine if this is the last question
  const isLastQuestion = currentQuestionIndex >= totalQuestions - 1;
  const continueLabel = isLastQuestion ? "Finish" : "Next Question";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          "relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl bg-background shadow-2xl",
          "fade-in-0 zoom-in-95 animate-in duration-200"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4",
            isWarmup
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : "bg-gradient-to-r from-blue-500 to-indigo-500"
          )}
        >
          <div className="flex items-center gap-3">
            {isWarmup ? (
              <BookOpen className="h-5 w-5 text-white" />
            ) : (
              <Clock className="h-5 w-5 text-white" />
            )}
            <div>
              <h3 className="font-semibold text-sm text-white">
                {isWarmup ? "Warm-up Quiz" : "Quick Check"}
              </h3>
              <p className="text-white/80 text-xs">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>
          <Button
            className="text-white/80 hover:bg-white/20 hover:text-white"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-300",
              isWarmup ? "bg-amber-500" : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {showFeedback && lastAnswer ? (
            <QuizFeedback
              continueLabel={continueLabel}
              feedback={lastAnswer.feedback}
              isCorrect={lastAnswer.isCorrect}
              onContinue={onContinue}
            />
          ) : (
            <QuizQuestion
              isLoading={isLoading}
              onSkip={onSkipQuestion}
              onSubmit={onSubmitAnswer}
              options={options}
              question={currentQuestion.question}
              type={questionType}
            />
          )}
        </div>
      </div>
    </div>
  );
}
