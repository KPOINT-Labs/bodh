"use client";

import type React from "react";
import { useCallback, useState } from "react";
import type { ActionType } from "@/lib/actions/actionRegistry";
import { recordAttempt } from "@/lib/actions/assessment";
import { audioManager } from "@/lib/audio/quizAudio";

interface ActiveQuestion {
  questionId: string;
  messageId: string;
  type: "mcq" | "text";
  correctOption?: string;
}

type ShowActionFn = (
  type: ActionType,
  metadata?: Record<string, unknown>,
  anchorMessageId?: string
) => void;

interface UseInlessonFlowProps {
  userId: string;
  lessonId: string | undefined;
  markInlessonAnswered: (messageId: string) => void;
  markInlessonSkipped: (messageId: string) => void;
  addInlessonFeedback: (
    isCorrect: boolean,
    feedback: string
  ) => string | undefined;
  showActionRef: React.MutableRefObject<ShowActionFn | null>;
  sendTextToAgent: (message: string) => Promise<void>;
  isLiveKitConnected: boolean;
  fireConfetti: () => void;
}

interface InlessonFlowReturn {
  activeQuestion: ActiveQuestion | null;
  setActiveQuestion: (question: ActiveQuestion | null) => void;
  handleAnswer: (questionId: string, answer: string) => Promise<void>;
  handleSkip: (questionId: string) => Promise<void>;
  showSuccessToast: boolean;
  showErrorToast: boolean;
  setShowSuccessToast: (show: boolean) => void;
  setShowErrorToast: (show: boolean) => void;
}

export function useInlessonFlow({
  userId,
  lessonId,
  markInlessonAnswered,
  markInlessonSkipped,
  addInlessonFeedback,
  showActionRef,
  sendTextToAgent,
  isLiveKitConnected,
  fireConfetti,
}: UseInlessonFlowProps): InlessonFlowReturn {
  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestion | null>(
    null
  );
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  const handleAnswer = useCallback(
    async (questionId: string, answer: string) => {
      console.log("[useInlessonFlow] Answer received:", { questionId, answer });

      if (!activeQuestion || activeQuestion.questionId !== questionId) {
        console.warn("[useInlessonFlow] No active question or ID mismatch");
        return;
      }

      const { messageId, type, correctOption } = activeQuestion;

      if (type === "mcq") {
        const isCorrect = answer === correctOption;
        const feedback = isCorrect
          ? "Great job! You got it right."
          : "That's not quite right, but don't worry - keep learning!";

        if (isCorrect) {
          audioManager?.play("success");
          fireConfetti();
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 900);
        } else {
          audioManager?.play("error");
          setShowErrorToast(true);
          setTimeout(() => setShowErrorToast(false), 900);
        }

        markInlessonAnswered(messageId);

        if (lessonId) {
          await recordAttempt({
            odataUserId: userId,
            lessonId,
            assessmentType: "inlesson",
            questionId,
            answer,
            isCorrect,
            isSkipped: false,
            feedback,
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 900));

        const feedbackMessageId = addInlessonFeedback(isCorrect, feedback);

        showActionRef.current?.("inlesson_complete", {}, feedbackMessageId);

        setActiveQuestion(null);
      } else {
        console.log(
          "[useInlessonFlow] Sending text answer to agent for evaluation"
        );

        markInlessonAnswered(messageId);

        if (isLiveKitConnected) {
          try {
            await sendTextToAgent(`INLESSON_ANSWER:${questionId}:${answer}`);
          } catch (err) {
            console.error(
              "[useInlessonFlow] Failed to send in-lesson answer:",
              err
            );
          }
        }

        setActiveQuestion(null);
      }
    },
    [
      activeQuestion,
      lessonId,
      userId,
      markInlessonAnswered,
      addInlessonFeedback,
      showActionRef,
      isLiveKitConnected,
      sendTextToAgent,
      fireConfetti,
    ]
  );

  const handleSkip = useCallback(
    async (questionId: string) => {
      console.log("[useInlessonFlow] Question skipped:", questionId);

      if (!activeQuestion || activeQuestion.questionId !== questionId) {
        console.warn("[useInlessonFlow] No active question or ID mismatch");
        return;
      }

      const { messageId } = activeQuestion;

      markInlessonSkipped(messageId);

      if (lessonId) {
        await recordAttempt({
          odataUserId: userId,
          lessonId,
          assessmentType: "inlesson",
          questionId,
          answer: null,
          isCorrect: null,
          isSkipped: true,
          feedback: null,
        });
      }

      showActionRef.current?.("inlesson_complete", {
        introMessage: "Question skipped. Let's continue with the video.",
      });

      setActiveQuestion(null);
    },
    [activeQuestion, lessonId, userId, markInlessonSkipped, showActionRef]
  );

  return {
    activeQuestion,
    setActiveQuestion,
    handleAnswer,
    handleSkip,
    showSuccessToast,
    showErrorToast,
    setShowSuccessToast,
    setShowErrorToast,
  };
}
