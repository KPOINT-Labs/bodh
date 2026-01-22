"use client";

import { useState } from "react";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizOption } from "@/types/assessment";

interface InLessonQuestionProps {
  question: string;
  options: QuizOption[];
  isAnswered?: boolean;
  isSkipped?: boolean;
  onAnswer: (optionId: string) => void;
  onSkip: () => void;
}

export function InLessonQuestion({
  question,
  options,
  isAnswered = false,
  isSkipped = false,
  onAnswer,
  onSkip,
}: InLessonQuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const disabled = isAnswered || isSkipped || submitting;

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitting(true);
    onAnswer(selected);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-900">{question}</p>

      <div className={cn(
        "animate-fade-in mx-auto max-w-2xl backdrop-blur-xl bg-white/80 border-2 rounded-2xl p-4 space-y-2 shadow-lg transition-all duration-300",
        submitting && selected
          ? "animate-glow-success border-green-400 shadow-green-200/50"
          : "border-blue-200 shadow-blue-200/30"
      )}>
        {options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selected === option.id;
          return (
            <label
              key={option.id}
              htmlFor={`option-${option.id}`}
              className={cn(
                "group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 animate-pop-in text-sm",
                isSelected
                  ? "border-blue-500 bg-gradient-to-r from-blue-100 to-indigo-100 shadow-md shadow-blue-300/40 scale-[1.02] animate-success-bounce"
                  : "border-blue-200 bg-white/60 hover:border-blue-400 hover:bg-white/80 hover:shadow-sm hover:scale-[1.01]",
                disabled && "cursor-not-allowed opacity-70"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => !disabled && setSelected(option.id)}
            >
              <input
                type="radio"
                id={`option-${option.id}`}
                name="mcq"
                value={option.id}
                checked={isSelected}
                onChange={() => setSelected(option.id)}
                className="sr-only"
                disabled={disabled}
              />
              <div className={cn(
                "flex-shrink-0 transition-colors duration-300",
                isSelected ? "text-blue-600" : "text-gray-300"
              )}>
                {isSelected ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <span className="flex-1 text-gray-800 group-hover:text-gray-900 transition-colors">
                <span className="font-medium text-muted-foreground mr-2">{letter}.</span>
                {option.text}
              </span>
            </label>
          );
        })}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!selected || disabled}
            className={cn(
              "group flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100 hover:shadow-lg hover:shadow-blue-500/50 disabled:shadow-none disabled:cursor-not-allowed border border-blue-400/30 disabled:border-gray-400/30 relative overflow-hidden text-sm",
              selected && !disabled && "animate-pulse-scale"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <span className="relative">{submitting ? "Submitting..." : "Submit Answer"}</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
