"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Circle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizOption } from "@/types/assessment";
import { audioManager } from "@/lib/audio/quizAudio";

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

  useEffect(() => {
    if (userAnswer) setSelected(userAnswer);
  }, [userAnswer]);

  const disabled = isAnswered || isSkipped || submitting;
  
  const isCorrect = isAnswered && selected === correctOption;
  const isIncorrect = isAnswered && selected !== correctOption;

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitting(true);

    // Brief delay for visual feedback before calling parent handler
    // Parent handles audio/confetti based on correctness
    setTimeout(() => {
      onAnswer(selected);
    }, 800);
  };

  const handleOptionSelect = (id: string) => {
    if (!disabled) {
      setSelected(id);
      audioManager?.play("click");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-900 leading-relaxed">{question}</p>

      <div className={cn(
        "animate-fade-in mx-auto max-w-2xl backdrop-blur-xl bg-white/80 border-2 rounded-2xl p-4 space-y-2 shadow-lg transition-all duration-300",
        (submitting && selected && correctOption && selected === correctOption) || isCorrect
          ? "animate-glow-success border-green-400 shadow-green-200/50"
          : (submitting && selected && correctOption && selected !== correctOption) || isIncorrect
          ? "animate-shake border-red-400 shadow-red-200/50 bg-red-50/50"
          : "border-blue-200 shadow-blue-200/30"
      )}>
        {options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selected === option.id;
          
          let optionStyle = "border-blue-200 bg-white/60 hover:border-blue-400 hover:bg-white/80 hover:shadow-sm hover:scale-[1.01]";
          
          if (isSelected) {
            if ((submitting || isAnswered) && correctOption) {
              if (option.id === correctOption) {
                 optionStyle = "border-green-500 bg-green-50 shadow-md shadow-green-200/40 scale-[1.02]";
              } else {
                 optionStyle = "border-red-500 bg-red-50 shadow-md shadow-red-200/40 scale-[1.02]";
              }
            } else {
              optionStyle = "border-blue-500 bg-gradient-to-r from-blue-100 to-indigo-100 shadow-md shadow-blue-300/40 scale-[1.02] animate-success-bounce";
            }
          } else if ((submitting || isAnswered) && correctOption && option.id === correctOption) {
            optionStyle = "border-green-500 bg-green-50/50 opacity-80";
          }

          return (
            <label
              key={option.id}
              htmlFor={`option-${option.id}`}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 animate-pop-in text-sm",
                optionStyle,
                disabled && !isSelected && "cursor-not-allowed opacity-60 hover:scale-100 hover:shadow-none hover:border-blue-200"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleOptionSelect(option.id)}
            >
              <input
                type="radio"
                id={`option-${option.id}`}
                name="mcq"
                value={option.id}
                checked={isSelected}
                onChange={() => handleOptionSelect(option.id)}
                className="sr-only"
                disabled={disabled}
              />
              <div className={cn(
                "flex-shrink-0 transition-colors duration-300",
                isSelected 
                  ? ((submitting || isAnswered) && correctOption && option.id !== correctOption ? "text-red-500" : "text-blue-600")
                  : "text-gray-300",
                ((submitting || isAnswered) && correctOption && option.id === correctOption) && "text-green-600"
              )}>
                {isSelected ? (
                  (submitting || isAnswered) && correctOption && option.id !== correctOption ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )
                ) : (
                  (submitting || isAnswered) && correctOption && option.id === correctOption ? (
                     <CheckCircle className="w-5 h-5" />
                  ) : (
                     <Circle className="w-5 h-5" />
                  )
                )}
              </div>
              <span className="flex-1 text-gray-800 group-hover:text-gray-900 transition-colors">
                <span className="font-medium text-muted-foreground mr-2">{letter}.</span>
                {option.text}
              </span>
            </label>
          );
        })}

        {!isAnswered && !isSkipped && (
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!selected || disabled}
              className={cn(
                "group flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100 hover:shadow-lg hover:shadow-blue-500/50 disabled:shadow-none disabled:cursor-not-allowed border border-blue-400/30 disabled:border-gray-400/30 relative overflow-hidden text-sm",
                selected && !disabled && !submitting && "animate-pulse-scale"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative">{submitting ? "Checking..." : "Submit Answer"}</span>
            </button>
            <button
              type="button"
              onClick={onSkip}
              disabled={disabled}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
