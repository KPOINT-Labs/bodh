"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AssessmentQuestionProps {
  question: string;
  options?: string[];
  questionNumber?: number;
  onAnswer: (answer: string) => void;
  onSkip?: () => void;
  isAnswered?: boolean;
  answerType?: "multiple_choice" | "short_answer" | "numerical" | "long_answer";
  placeholder?: string;
  isFromHistory?: boolean;
  submittedAnswer?: string;
}

export function AssessmentQuestion({
  question,
  options,
  questionNumber,
  onAnswer,
  onSkip,
  isAnswered = false,
  answerType = "multiple_choice",
  placeholder,
  isFromHistory = false,
  submittedAnswer,
}: AssessmentQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);

  // Initialize with submitted answer if it exists
  React.useEffect(() => {
    if (submittedAnswer && isFromHistory) {
      if (answerType === "multiple_choice") {
        setSelectedAnswer(submittedAnswer);
      } else {
        setTextAnswer(submittedAnswer);
      }
      setHasSubmitted(true);
    }
  }, [submittedAnswer, isFromHistory, answerType]);

  const handleSubmit = () => {
    if (answerType === "multiple_choice" && selectedAnswer && options) {
      // Get the full option text for display
      const optionIndex = selectedAnswer.charCodeAt(0) - 65;
      if (optionIndex >= 0 && optionIndex < options.length) {
        const optionText = options[optionIndex]
          .replace(/^[A-D]\)\s*/i, "")
          .trim();
        onAnswer(optionText);
        setHasSubmitted(true);
      }
    } else if (textAnswer.trim()) {
      onAnswer(textAnswer);
      setHasSubmitted(true);
    }
  };

  const handleOptionSelect = (optionLetter: string) => {
    if (!(hasSubmitted || hasSkipped)) {
      setSelectedAnswer(optionLetter);
    }
  };

  const handleSkip = () => {
    setHasSkipped(true);
    onSkip?.();
  };

  const isMultipleChoice =
    answerType === "multiple_choice" && options && options.length > 0;
  const isTextInput = ["short_answer", "numerical", "long_answer"].includes(
    answerType
  );

  return (
    <div className="w-full space-y-4">
      {/* Question Number and Text */}
      <p className="font-medium text-gray-800 text-sm leading-relaxed">
        {questionNumber && (
          <span className="text-gray-900">Q{questionNumber}: </span>
        )}
        {question}
      </p>

      {/* Options and Submit Section - Card Style */}
      {isMultipleChoice && (
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {/* Options */}
          {options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const optionText = option.replace(/^[A-D]\)\s*/i, "").trim();
            const isSelected = selectedAnswer === optionLetter;

            return (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-2 border-blue-400 bg-blue-50"
                    : "border-2 border-transparent bg-gray-50 hover:bg-gray-100"
                }
                  ${hasSubmitted || hasSkipped || isFromHistory ? "cursor-not-allowed opacity-75" : "cursor-pointer"}
                `}
                disabled={hasSubmitted || hasSkipped || isFromHistory}
                key={index}
                onClick={() => handleOptionSelect(optionLetter)}
                type="button"
              >
                {/* Radio Circle */}
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"}
                  `}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fillRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                {/* Option Text */}
                <span
                  className={`text-sm ${isSelected ? "font-medium text-gray-900" : "text-gray-700"}`}
                >
                  {optionText}
                </span>
              </button>
            );
          })}

          {/* Submit Button */}
          <Button
            className="mt-2 w-full transform rounded-xl bg-gradient-to-r from-blue-500 to-indigo-400 px-6 py-3 font-medium text-sm text-white shadow-md transition-all duration-150 hover:scale-[1.02] hover:from-blue-600 hover:to-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              !selectedAnswer || hasSubmitted || hasSkipped || isFromHistory
            }
            onClick={handleSubmit}
          >
            {isFromHistory ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    fillRule="evenodd"
                  />
                </svg>
                Attempted
              </span>
            ) : hasSubmitted ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    fill="none"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  />
                </svg>
                Evaluating...
              </span>
            ) : (
              "Submit Answer"
            )}
          </Button>

          {/* Skip Button - Left aligned below submit */}
          {!(isFromHistory || hasSubmitted) && (
            <button
              className="mt-2 flex items-center gap-1 text-gray-400 text-xs transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={hasSkipped}
              onClick={handleSkip}
            >
              {hasSkipped ? (
                <>
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      fill="none"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Skipping...</span>
                </>
              ) : (
                <>
                  <span>Skip this question</span>
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Text Input Section - Card Style */}
      {isTextInput && (
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {/* Text Input Field */}
          {answerType === "long_answer" ? (
            <Textarea
              className="min-h-[100px] w-full resize-none rounded-xl border-2 border-transparent bg-gray-50 px-4 py-3.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
              disabled={hasSubmitted || hasSkipped || isFromHistory}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={placeholder || "Type your answer here..."}
              rows={4}
              value={textAnswer}
            />
          ) : (
            <Input
              className="w-full rounded-xl border-2 border-transparent bg-gray-50 px-4 py-3.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-75"
              disabled={hasSubmitted || hasSkipped || isFromHistory}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={
                placeholder ||
                (answerType === "numerical"
                  ? "Enter a number..."
                  : "Type your answer here...")
              }
              type={answerType === "numerical" ? "number" : "text"}
              value={textAnswer}
            />
          )}

          {/* Submit Button */}
          <Button
            className="w-full transform rounded-xl bg-gradient-to-r from-blue-500 to-indigo-400 px-6 py-3 font-medium text-sm text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:from-blue-600 hover:to-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              !textAnswer.trim() || hasSubmitted || hasSkipped || isFromHistory
            }
            onClick={handleSubmit}
          >
            {isFromHistory ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    fillRule="evenodd"
                  />
                </svg>
                Attempted
              </span>
            ) : hasSubmitted ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    fill="none"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  />
                </svg>
                Evaluating...
              </span>
            ) : (
              "Submit Answer"
            )}
          </Button>

          {/* Skip Button - Left aligned below submit */}
          {!(isFromHistory || hasSubmitted) && (
            <button
              className="mt-2 flex items-center gap-1 text-gray-400 text-xs transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={hasSkipped}
              onClick={handleSkip}
            >
              {hasSkipped ? (
                <>
                  <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      fill="none"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Skipping...</span>
                </>
              ) : (
                <>
                  <span>Skip this question</span>
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 5l7 7-7 7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
