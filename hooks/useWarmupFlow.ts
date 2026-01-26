"use client";

import { useCallback, useState } from "react";
import type { ActionType } from "@/lib/actions/actionRegistry";
import { recordAttempt } from "@/lib/actions/assessment";
import type { LessonQuiz, WarmupQuestion } from "@/types/assessment";

interface WarmupState {
  isActive: boolean;
  questions: WarmupQuestion[];
  currentIndex: number;
  messageIds: Map<string, string>;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
}

const INITIAL_STATE: WarmupState = {
  isActive: false,
  questions: [],
  currentIndex: 0,
  messageIds: new Map(),
  correctCount: 0,
  incorrectCount: 0,
  skippedCount: 0,
};

type ShowActionFn = (
  type: ActionType,
  metadata?: Record<string, unknown>,
  anchorMessageId?: string
) => void;

type AddAssistantMessageFn = (
  message: string,
  messageType?: string
) => Promise<string | undefined>;

interface UseWarmupFlowProps {
  userId: string;
  lessonId: string | undefined;
  quiz: LessonQuiz | null;
  addWarmupQuestion: (question: {
    id: string;
    question: string;
    options?: { id: string; text: string }[];
    correctOption?: string;
  }) => string | null;
  markWarmupAnswered: (messageId: string, userAnswer?: string) => void;
  markWarmupSkipped: (messageId: string) => void;
  addWarmupFeedback: (
    isCorrect: boolean,
    feedback: string
  ) => string | undefined;
  showActionRef: React.MutableRefObject<ShowActionFn | null>;
  addAssistantMessageRef: React.MutableRefObject<AddAssistantMessageFn | null>;
}

export function useWarmupFlow({
  userId,
  lessonId,
  quiz,
  addWarmupQuestion,
  markWarmupAnswered,
  markWarmupSkipped,
  addWarmupFeedback,
  showActionRef,
  addAssistantMessageRef,
}: UseWarmupFlowProps) {
  const [warmupState, setWarmupState] = useState<WarmupState>(INITIAL_STATE);

  const startWarmup = useCallback(async () => {
    if (!quiz?.warmup || quiz.warmup.length === 0 || !lessonId) {
      console.warn("[useWarmupFlow] No warmup questions available");
      return;
    }

    // Always show all warmup questions (no filtering by answered status)
    const allQuestions = quiz.warmup;

    console.log(
      "[useWarmupFlow] Starting warmup with",
      allQuestions.length,
      "questions"
    );

    const firstQuestion = allQuestions[0];
    const messageId = addWarmupQuestion({
      id: firstQuestion.id,
      question: firstQuestion.question,
      options: firstQuestion.options,
      correctOption: firstQuestion.correct_option,
    });

    if (messageId) {
      const messageIds = new Map<string, string>();
      messageIds.set(firstQuestion.id, messageId);

      setWarmupState({
        isActive: true,
        questions: allQuestions,
        currentIndex: 0,
        messageIds,
        correctCount: 0,
        incorrectCount: 0,
        skippedCount: 0,
      });
    }
  }, [quiz, lessonId, addWarmupQuestion, showActionRef]);

  const handleAnswer = useCallback(
    async (questionId: string, answer: string) => {
      console.log("[useWarmupFlow] Answer received:", { questionId, answer });

      if (!warmupState.isActive) {
        console.warn("[useWarmupFlow] No active warmup");
        return;
      }

      const currentQuestion = warmupState.questions[warmupState.currentIndex];
      if (!currentQuestion || currentQuestion.id !== questionId) {
        console.warn("[useWarmupFlow] Question ID mismatch");
        return;
      }

      const messageId = warmupState.messageIds.get(questionId);
      if (!messageId) {
        console.warn("[useWarmupFlow] No message ID for question");
        return;
      }

      const isCorrect = answer === currentQuestion.correct_option;
      const feedback =
        currentQuestion.feedback ||
        (isCorrect
          ? "Great job! You got it right."
          : "That's not quite right, but don't worry - keep learning!");

      markWarmupAnswered(messageId, answer);

      if (lessonId) {
        await recordAttempt({
          odataUserId: userId,
          lessonId,
          assessmentType: "warmup",
          questionId,
          answer,
          isCorrect,
          isSkipped: false,
          feedback,
        });
      }

      await new Promise((resolve) =>
        setTimeout(resolve, isCorrect ? 2500 : 2000)
      );

      addWarmupFeedback(isCorrect, feedback);

      const nextIndex = warmupState.currentIndex + 1;
      if (nextIndex < warmupState.questions.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const nextQuestion = warmupState.questions[nextIndex];
        const nextMessageId = addWarmupQuestion({
          id: nextQuestion.id,
          question: nextQuestion.question,
          options: nextQuestion.options,
          correctOption: nextQuestion.correct_option,
        });

        if (nextMessageId) {
          setWarmupState((prev) => {
            const newMessageIds = new Map(prev.messageIds);
            newMessageIds.set(nextQuestion.id, nextMessageId);
            return {
              ...prev,
              currentIndex: nextIndex,
              messageIds: newMessageIds,
              correctCount: prev.correctCount + (isCorrect ? 1 : 0),
              incorrectCount: prev.incorrectCount + (isCorrect ? 0 : 1),
            };
          });
        }
      } else {
        await completeWarmup(isCorrect, false);
      }
    },
    [
      warmupState,
      lessonId,
      userId,
      markWarmupAnswered,
      addWarmupFeedback,
      addWarmupQuestion,
    ]
  );

  const handleSkip = useCallback(
    async (questionId: string) => {
      console.log("[useWarmupFlow] Question skipped:", questionId);

      if (!warmupState.isActive) {
        console.warn("[useWarmupFlow] No active warmup");
        return;
      }

      const messageId = warmupState.messageIds.get(questionId);
      if (messageId) {
        markWarmupSkipped(messageId);
      }

      if (lessonId) {
        await recordAttempt({
          odataUserId: userId,
          lessonId,
          assessmentType: "warmup",
          questionId,
          answer: null,
          isCorrect: null,
          isSkipped: true,
          feedback: null,
        });
      }

      const nextIndex = warmupState.currentIndex + 1;
      if (nextIndex < warmupState.questions.length) {
        const nextQuestion = warmupState.questions[nextIndex];
        const nextMessageId = addWarmupQuestion({
          id: nextQuestion.id,
          question: nextQuestion.question,
          options: nextQuestion.options,
          correctOption: nextQuestion.correct_option,
        });

        if (nextMessageId) {
          setWarmupState((prev) => {
            const newMessageIds = new Map(prev.messageIds);
            newMessageIds.set(nextQuestion.id, nextMessageId);
            return {
              ...prev,
              currentIndex: nextIndex,
              messageIds: newMessageIds,
              skippedCount: prev.skippedCount + 1,
            };
          });
        }
      } else {
        await completeWarmup(false, true);
      }
    },
    [warmupState, lessonId, userId, markWarmupSkipped, addWarmupQuestion]
  );

  const completeWarmup = useCallback(
    async (lastWasCorrect: boolean, lastWasSkipped: boolean) => {
      console.log("[useWarmupFlow] Warmup complete!");

      const totalQuestions = warmupState.questions.length;
      const finalCorrectCount =
        warmupState.correctCount + (lastWasCorrect ? 1 : 0);
      const finalSkippedCount =
        warmupState.skippedCount + (lastWasSkipped ? 1 : 0);

      setWarmupState(INITIAL_STATE);

      let completionMessage: string;
      if (finalCorrectCount === totalQuestions) {
        completionMessage = `Amazing! You got all ${totalQuestions} questions right! You're ready to dive into the lesson.`;
      } else if (finalCorrectCount > 0) {
        completionMessage = `Nice effort! You got ${finalCorrectCount} out of ${totalQuestions} correct${finalSkippedCount > 0 ? ` (${finalSkippedCount} skipped)` : ""}. Let's watch the lesson to strengthen your understanding.`;
      } else if (finalSkippedCount === totalQuestions) {
        completionMessage = `No problem! Let's watch the lesson and you can always try the warmup questions later.`;
      } else {
        completionMessage = `No worries! The warmup helps identify areas to focus on. Let's watch the lesson together.`;
      }

      const feedbackMessageId = await addAssistantMessageRef.current?.(
        completionMessage,
        "general"
      );

      showActionRef.current?.("warmup_complete", {}, feedbackMessageId);
    },
    [warmupState, addAssistantMessageRef, showActionRef]
  );

  return {
    warmupState,
    startWarmup,
    handleWarmupAnswer: handleAnswer,
    handleWarmupSkip: handleSkip,
  };
}
