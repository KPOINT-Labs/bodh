"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AssessmentQuestionProps {
  question: string;
  options?: string[];
  questionNumber?: number;
  onAnswer: (answer: string) => void;
  isAnswered?: boolean;
}

export function AssessmentQuestion({
  question,
  options,
  questionNumber,
  onAnswer,
  isAnswered = false
}: AssessmentQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedAnswer) {
      onAnswer(selectedAnswer);
      setHasSubmitted(true);
    }
  };

  const handleOptionSelect = (optionLetter: string) => {
    if (!hasSubmitted && !isAnswered) {
      setSelectedAnswer(optionLetter);
    }
  };

  const isMultipleChoice = options && options.length > 0;

  return (
    <div className="w-full max-w-xl bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Question Number and Text */}
      <p className="text-gray-800 text-sm leading-relaxed mb-4 font-semibold">
        {questionNumber && <span className="text-blue-600">Q{questionNumber}. </span>}
        {question}
      </p>

      {isMultipleChoice ? (
        <div className="space-y-2">
          {/* Options */}
          {options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
            const optionText = option.replace(/^[A-D]\)\s*/i, '').trim();
            const isSelected = selectedAnswer === optionLetter;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleOptionSelect(optionLetter)}
                disabled={hasSubmitted || isAnswered}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${(hasSubmitted || isAnswered) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                `}
              >
                {/* Radio Circle */}
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                  `}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                {/* Option Text */}
                <span className="text-sm text-gray-700">{optionText}</span>
              </button>
            );
          })}

          {/* Submit Button */}
          {!hasSubmitted && !isAnswered && (
            <div className="pt-3">
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </Button>
            </div>
          )}

          {/* Submitted State */}
          {(hasSubmitted || isAnswered) && (
            <div className="pt-2 text-sm text-green-600 font-medium">
              Answer submitted
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            Type your answer in the chat input below.
          </p>
        </div>
      )}
    </div>
  );
}