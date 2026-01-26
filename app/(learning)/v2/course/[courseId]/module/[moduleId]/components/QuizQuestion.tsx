"use client";

import { motion } from "framer-motion";
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
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
} as const;

const cardVariants = {
  initial: { borderColor: "rgb(216 180 254)" }, // purple-300
  correct: {
    borderColor: "rgb(34 197 94)",
    boxShadow: "0 0 20px rgba(34, 197, 94, 0.25)",
    transition: { duration: 0.3 },
  },
  incorrect: {
    x: [0, -10, 10, -8, 8, -4, 4, 0],
    borderColor: "rgb(239 68 68)",
    transition: { duration: 0.5 },
  },
};

const feedbackCardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      delay: 0.2,
    },
  },
} as const;

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
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3"
        initial={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">
          <CheckCircle className="h-4 w-4 text-white" />
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-green-200 bg-green-50 px-4 py-3">
          <p className="font-medium text-green-800">Assessment Complete</p>
          <p className="mt-1 text-green-700 text-sm">{completionSummary}</p>
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
          animate={
            status === "answered"
              ? isCorrect
                ? "correct"
                : "incorrect"
              : "initial"
          }
          className={cn(
            "max-w-[85%] rounded-2xl rounded-tl-sm border-2 px-4 py-3",
            status === "answered" &&
              isCorrect &&
              "border-green-300 bg-green-50/50",
            status === "answered" &&
              !isCorrect &&
              "border-red-300 bg-red-50/30",
            status === "skipped" && "border-purple-200 bg-purple-50"
          )}
          initial="initial"
          variants={cardVariants}
        >
          {/* Question Number (FA only) */}
          {type === "fa" && questionNumber && (
            <p className="mb-1 text-purple-600 text-xs">
              Question {questionNumber}
            </p>
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
                    animate={{
                      scale: isUserAnswer ? 1.02 : 1,
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                      isUserAnswer &&
                        isCorrect &&
                        "border-green-400 bg-green-100",
                      isUserAnswer && !isCorrect && "border-red-400 bg-red-100",
                      !isUserAnswer &&
                        isCorrectOption &&
                        !isCorrect &&
                        "border-green-400 bg-green-50 opacity-80",
                      !(isUserAnswer || isCorrectOption) &&
                        "border-gray-200 bg-white/50 opacity-60"
                    )}
                    initial={{ scale: 1 }}
                    key={opt.id}
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
                      <span className="mr-2 font-medium text-muted-foreground">
                        {opt.id}.
                      </span>
                      {opt.text}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Text Answer (answered state) */}
          {status === "answered" && questionType === "text" && userAnswer && (
            <div className="mt-3 flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gray-100 px-4 py-2">
                <p className="text-gray-800 text-sm">{userAnswer}</p>
              </div>
            </div>
          )}

          {/* Feedback Card */}
          {status === "answered" && (
            <motion.div
              animate="visible"
              className={cn(
                "mt-3 rounded-lg p-3",
                isCorrect
                  ? "border border-green-200 bg-green-50"
                  : "border border-red-200 bg-red-50"
              )}
              initial="hidden"
              variants={feedbackCardVariants}
            >
              <div className="mb-1 flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700">
                      Not quite right
                    </span>
                  </>
                )}
              </div>

              {feedback && (
                <p
                  className={cn(
                    "text-sm",
                    isCorrect ? "text-green-700" : "text-red-700"
                  )}
                >
                  {feedback}
                </p>
              )}
            </motion.div>
          )}

          {/* Skipped Card */}
          {status === "skipped" && (
            <motion.div
              animate={{ opacity: 1 }}
              className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
              initial={{ opacity: 0 }}
            >
              <p className="text-gray-500 text-sm italic">Skipped</p>
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

      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border-2 border-purple-200 bg-purple-50 px-4 py-3">
        {/* Question Number (FA only) */}
        {type === "fa" && questionNumber && (
          <p className="mb-1 text-purple-600 text-xs">
            Question {questionNumber}
          </p>
        )}

        {/* Question Text */}
        <p className="mb-3 font-medium text-gray-900">{text}</p>

        {/* MCQ Options */}
        {questionType === "mcq" && options && (
          <motion.div
            animate="visible"
            className="space-y-2"
            initial="hidden"
            variants={containerVariants}
          >
            {options.map((opt) => (
              <motion.button
                animate={{
                  scale: selected === opt.id ? 1.02 : 1,
                  borderColor:
                    selected === opt.id
                      ? "rgb(147 51 234)"
                      : "rgb(233 213 255)",
                  backgroundColor:
                    selected === opt.id ? "rgb(243 232 255)" : "white",
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left",
                  "transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                )}
                disabled={disabled || isSubmitting}
                key={opt.id}
                onClick={() => handleOptionSelect(opt.id)}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                variants={optionVariants}
                whileHover={{ scale: disabled ? 1 : 1.01 }}
                whileTap={{ scale: disabled ? 1 : 0.99 }}
              >
                <div className="flex-shrink-0">
                  {selected === opt.id ? (
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <span className="flex-1 text-gray-800">
                  <span className="mr-2 font-medium text-purple-700">
                    {opt.id}.
                  </span>
                  {opt.text}
                </span>
              </motion.button>
            ))}

            {/* Submit & Skip buttons */}
            <div className="flex items-center gap-2 pt-2">
              <motion.button
                animate={
                  selected && !disabled && !isSubmitting
                    ? {
                        scale: [1, 1.02, 1],
                      }
                    : { scale: 1 }
                }
                className={cn(
                  "flex-1 rounded-lg px-4 py-2.5 font-medium text-sm text-white",
                  "bg-gradient-to-r from-purple-600 to-indigo-600",
                  "hover:from-purple-500 hover:to-indigo-500",
                  "disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500",
                  "transition-all duration-200"
                )}
                disabled={!selected || disabled || isSubmitting}
                onClick={handleSubmit}
                transition={
                  selected
                    ? {
                        repeat: Number.POSITIVE_INFINITY,
                        duration: 1.5,
                        ease: "easeInOut",
                      }
                    : {}
                }
              >
                {isSubmitting ? "Checking..." : "Submit Answer"}
              </motion.button>
              <button
                className="rounded-lg px-3 py-2 text-gray-500 text-sm transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || isSubmitting}
                onClick={() => onSkip(questionId)}
                type="button"
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
              className="min-h-[80px] w-full resize-none rounded-lg border border-purple-200 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || isSubmitting}
              onChange={(e) => setTextAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit();
                }
              }}
              placeholder="Type your answer..."
              value={textAnswer}
            />
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "flex-1 rounded-lg px-4 py-2 font-medium text-sm text-white",
                  "bg-gradient-to-r from-purple-600 to-indigo-600",
                  "hover:from-purple-500 hover:to-indigo-500",
                  "disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500",
                  "transition-all duration-200"
                )}
                disabled={disabled || isSubmitting || !textAnswer.trim()}
                onClick={handleTextSubmit}
                type="button"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
              <button
                className="rounded-lg px-3 py-2 text-gray-500 text-sm transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || isSubmitting}
                onClick={() => onSkip(questionId)}
                type="button"
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
