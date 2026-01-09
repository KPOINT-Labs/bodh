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
  isAnswered?: boolean;
  answerType?: 'multiple_choice' | 'short_answer' | 'numerical' | 'long_answer';
  placeholder?: string;
  isFromHistory?: boolean;
  submittedAnswer?: string;
}

export function AssessmentQuestion({
  question,
  options,
  questionNumber,
  onAnswer,
  isAnswered = false,
  answerType = 'multiple_choice',
  placeholder,
  isFromHistory = false,
  submittedAnswer
}: AssessmentQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Initialize with submitted answer if it exists
  React.useEffect(() => {
    if (submittedAnswer && isFromHistory) {
      if (answerType === 'multiple_choice') {
        setSelectedAnswer(submittedAnswer);
      } else {
        setTextAnswer(submittedAnswer);
      }
      setHasSubmitted(true);
    }
  }, [submittedAnswer, isFromHistory, answerType]);


  const handleSubmit = () => {
    if (answerType === 'multiple_choice' && selectedAnswer && options) {
      // Get the full option text for display
      const optionIndex = selectedAnswer.charCodeAt(0) - 65;
      if (optionIndex >= 0 && optionIndex < options.length) {
        const optionText = options[optionIndex].replace(/^[A-D]\)\s*/i, '').trim();
        onAnswer(optionText);
        setHasSubmitted(true);
      }
    } else if (textAnswer.trim()) {
      onAnswer(textAnswer);
      setHasSubmitted(true);
    }
  };

  const handleOptionSelect = (optionLetter: string) => {
    if (!hasSubmitted) {
      setSelectedAnswer(optionLetter);
    }
  };

  const isMultipleChoice = answerType === 'multiple_choice' && options && options.length > 0;
  const isTextInput = ['short_answer', 'numerical', 'long_answer'].includes(answerType);

  return (
    <div className="w-full space-y-4">
      {/* Question Number and Text */}
      <p className="text-gray-800 text-sm leading-relaxed font-medium">
        {questionNumber && <span className="text-gray-900">Q{questionNumber}: </span>}
        {question}
      </p>

      {/* Options and Submit Section - Card Style */}
      {isMultipleChoice && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          {/* Options */}
          {options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const optionText = option.replace(/^[A-D]\)\s*/i, '').trim();
            const isSelected = selectedAnswer === optionLetter;

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleOptionSelect(optionLetter)}
                disabled={hasSubmitted || isFromHistory}
                className={`
                  w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all duration-200
                  ${isSelected
                    ? 'bg-blue-50 border-2 border-blue-400'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }
                  ${(hasSubmitted || isFromHistory) ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
                `}
              >
                {/* Radio Circle */}
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}
                  `}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Option Text */}
                <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                  {optionText}
                </span>
              </button>
            );
          })}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer || hasSubmitted || isFromHistory}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-400 hover:from-blue-600 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-2 transform transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isFromHistory ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Attempted
              </span>
            ) : hasSubmitted ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Evaluating...
              </span>
            ) : (
              'Submit Answer'
            )}
          </Button>
        </div>
      )}

      {/* Text Input Section - Card Style */}
      {isTextInput && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          {/* Text Input Field */}
          {answerType === 'long_answer' ? (
            <Textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={placeholder || "Type your answer here..."}
              disabled={hasSubmitted || isFromHistory}
              className="w-full min-h-[100px] px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white resize-none text-sm disabled:opacity-75"
              rows={4}
            />
          ) : (
            <Input
              type={answerType === 'numerical' ? 'number' : 'text'}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={placeholder || (answerType === 'numerical' ? "Enter a number..." : "Type your answer here...")}
              disabled={hasSubmitted || isFromHistory}
              className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm disabled:opacity-75"
            />
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!textAnswer.trim() || hasSubmitted || isFromHistory}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-400 hover:from-blue-600 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isFromHistory ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Attempted
              </span>
            ) : hasSubmitted ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Evaluating...
              </span>
            ) : (
              'Submit Answer'
            )}
          </Button>
        </div>
      )}

    </div>
  );
}