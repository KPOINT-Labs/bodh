"use client";

import { CheckCircle, Circle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { audioManager } from "@/lib/audio/quizAudio";
import { cn } from "@/lib/utils";
import type { QuizOption } from "@/types/assessment";
import { Celebration } from "./Celebration";
import { ErrorMessage } from "./ErrorMessage";
import { SuccessMessage } from "./SuccessMessage";

interface InLessonQuestionProps {
  question: string;
  options: QuizOption[];
  isAnswered?: boolean;
  isSkipped?: boolean;
  correctOption?: string;
  userAnswer?: string;
  onAnswer: (optionId: string) => void;
  onSkip: () => void;
}

export function InLessonQuestion({
  question,
  options,
  isAnswered = false,
  isSkipped = false,
  correctOption,
  userAnswer,
  onAnswer,
  onSkip,
}: InLessonQuestionProps) {
  const [selected, setSelected] = useState<string | null>(userAnswer || null);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (userAnswer) {
      setSelected(userAnswer);
    }
  }, [userAnswer]);

  const disabled = isAnswered || isSkipped || submitting;

  const isCorrect = isAnswered && selected === correctOption;
  const isIncorrect = isAnswered && selected !== correctOption;

  const handleSubmit = () => {
    if (!selected) {
      return;
    }
    setSubmitting(true);

    // Check correctness and show celebration/error
    const isAnswerCorrect = correctOption && selected === correctOption;

    if (isAnswerCorrect) {
      audioManager?.play("success");
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3500);
    } else if (correctOption) {
      audioManager?.play("error");
      setShowError(true);
      setTimeout(() => setShowError(false), 2500);
    }

    // Call parent handler after delay to let animations play
    setTimeout(
      () => {
        onAnswer(selected);
      },
      isAnswerCorrect ? 2000 : 1500
    );
  };

  const handleOptionSelect = (id: string) => {
    if (!disabled) {
      setSelected(id);
      audioManager?.play("click");
    }
  };

  return (
    <>
      <Celebration show={showCelebration} />
      <SuccessMessage
        message="Awesome! 🎉"
        show={submitting && showCelebration}
      />
      <ErrorMessage message="Oops! Try again." show={submitting && showError} />

      <div className="space-y-4">
        <p className="font-medium text-gray-900 text-sm leading-relaxed">
          {question}
        </p>

        <div
          className={cn(
            "mx-auto max-w-2xl animate-fade-in space-y-2 rounded-2xl border-2 bg-white/80 p-4 shadow-lg backdrop-blur-xl transition-all duration-300",
            (submitting &&
              selected &&
              correctOption &&
              selected === correctOption) ||
              isCorrect
              ? "animate-glow-success border-green-400 shadow-green-200/50"
              : (submitting &&
                    selected &&
                    correctOption &&
                    selected !== correctOption) ||
                  isIncorrect
                ? "animate-shake border-red-400 bg-red-50/50 shadow-red-200/50"
                : "border-blue-200 shadow-blue-200/30"
          )}
        >
          {options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const isSelected = selected === option.id;

            let optionStyle =
              "border-blue-200 bg-white/60 hover:border-blue-400 hover:bg-white/80 hover:shadow-sm hover:scale-[1.01]";

            if (isSelected) {
              if ((submitting || isAnswered) && correctOption) {
                if (option.id === correctOption) {
                  optionStyle =
                    "border-green-500 bg-green-50 shadow-md shadow-green-200/40 scale-[1.02]";
                } else {
                  optionStyle =
                    "border-red-500 bg-red-50 shadow-md shadow-red-200/40 scale-[1.02]";
                }
              } else {
                optionStyle =
                  "border-blue-500 bg-gradient-to-r from-blue-100 to-indigo-100 shadow-md shadow-blue-300/40 scale-[1.02] animate-success-bounce";
              }
            } else if (
              (submitting || isAnswered) &&
              correctOption &&
              option.id === correctOption
            ) {
              optionStyle = "border-green-500 bg-green-50/50 opacity-80";
            }

            return (
              <label
                className={cn(
                  "group flex animate-pop-in cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm transition-all duration-300",
                  optionStyle,
                  disabled &&
                    !isSelected &&
                    "cursor-not-allowed opacity-60 hover:scale-100 hover:border-blue-200 hover:shadow-none"
                )}
                htmlFor={`option-${option.id}`}
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <input
                  checked={isSelected}
                  className="sr-only"
                  disabled={disabled}
                  id={`option-${option.id}`}
                  name="mcq"
                  onChange={() => handleOptionSelect(option.id)}
                  type="radio"
                  value={option.id}
                />
                <div
                  className={cn(
                    "flex-shrink-0 transition-colors duration-300",
                    isSelected
                      ? (submitting || isAnswered) &&
                        correctOption &&
                        option.id !== correctOption
                        ? "text-red-500"
                        : "text-blue-600"
                      : "text-gray-300",
                    (submitting || isAnswered) &&
                      correctOption &&
                      option.id === correctOption &&
                      "text-green-600"
                  )}
                >
                  {isSelected ? (
                    (submitting || isAnswered) &&
                    correctOption &&
                    option.id !== correctOption ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      <CheckCircle className="h-5 w-5" />
                    )
                  ) : (submitting || isAnswered) &&
                    correctOption &&
                    option.id === correctOption ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <span className="flex-1 text-gray-800 transition-colors group-hover:text-gray-900">
                  <span className="mr-2 font-medium text-muted-foreground">
                    {letter}.
                  </span>
                  {option.text}
                </span>
              </label>
            );
          })}

          {!(isAnswered || isSkipped) && (
            <div className="flex items-center gap-2 pt-2">
              <button
                className={cn(
                  "group relative flex-1 overflow-hidden rounded-lg border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm text-white transition-all duration-300 hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/50 hover:shadow-lg disabled:scale-100 disabled:cursor-not-allowed disabled:border-gray-400/30 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none",
                  selected && !disabled && !submitting && "animate-pulse-scale"
                )}
                disabled={!selected || disabled}
                onClick={handleSubmit}
              >
                <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                <span className="relative">
                  {submitting ? "Checking..." : "Submit Answer"}
                </span>
              </button>
              <button
                className="rounded-lg px-3 py-2 text-gray-500 text-xs transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                onClick={onSkip}
                type="button"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
