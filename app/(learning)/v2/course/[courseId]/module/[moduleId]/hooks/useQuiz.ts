"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { fireConfetti } from "@/components/ui/confetti";
import { recordAttempt } from "@/lib/actions/assessment";
import { audioManager } from "@/lib/audio/quizAudio";
import type {
  AssessmentType,
  InLessonQuestion,
  LessonQuiz,
  QuizOption,
  WarmupQuestion,
} from "@/types/assessment";

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

// Quiz message that appears in chat (unified for all quiz types)
export interface QuizMessage {
  id: string;
  type: "warmup" | "inlesson" | "fa"; // Added "fa"
  questionId: string;
  question: string;
  questionType: "mcq" | "text";
  options?: QuizOption[];
  correctOption?: string; // Only for warmup/inlesson MCQ (local eval)
  status: "pending" | "answered" | "skipped";
  userAnswer?: string;
  isCorrect?: boolean;
  feedback?: string;
  createdAt: string;
  // FA-specific fields
  questionNumber?: number; // FA question 1-5
  isComplete?: boolean; // FA session complete
  completionSummary?: string; // FA final summary
}

// FA response from agent via data channel
export interface FAResponse {
  type: "fa_response";
  questionId?: string; // Added by frontend if missing
  raw_text: string;
  tts_text: string;
  feedback_type: "correct" | "incorrect" | null;
  question_number: number | null;
  question_text: string | null;
  options: string[] | null;
  is_mcq: boolean;
  is_complete: boolean;
  completion_summary?: string;
}

interface QuizState {
  type: "warmup" | "inlesson" | "fa"; // Added "fa"
  questions: (WarmupQuestion | InLessonQuestion)[];
  currentIndex: number;
  stats: { correct: number; incorrect: number; skipped: number };
}

interface UseQuizOptions {
  userId: string;
  lessonId: string | undefined;
  quiz: LessonQuiz | null;
  publishData?: (data: string) => Promise<void>; // Data channel for quiz/FA
  onQuizComplete?: (
    type: "warmup" | "inlesson" | "fa",
    stats: QuizState["stats"]
  ) => void;
}

interface UseQuizReturn {
  quizMessages: QuizMessage[];
  activeQuestion: QuizMessage | null;
  isProcessing: boolean;
  isInFASession: boolean; // NEW: Track if FA is active (for input routing)

  // Warmup (DB)
  startWarmup: () => Promise<void>;

  // In-lesson (DB)
  triggerInlesson: (questionId: string) => Promise<void>;

  // FA (Agent) - NEW
  startFA: (topic?: string) => Promise<void>;
  handleFAResponse: (response: FAResponse) => void;

  // Unified answer/skip
  submitAnswer: (questionId: string, answer: string) => Promise<void>;
  skipQuestion: (questionId: string) => Promise<void>;
}

export function useQuiz({
  userId,
  lessonId,
  quiz,
  publishData,
  onQuizComplete,
}: UseQuizOptions): UseQuizReturn {
  const [quizMessages, setQuizMessages] = useState<QuizMessage[]>([]);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInFASession, setIsInFASession] = useState(false); // NEW: Track FA session

  // Track last FA question for feedback association
  const lastFAQuestionIdRef = useRef<string | null>(null);

  const activeQuestion = useMemo(
    () => quizMessages.find((m) => m.status === "pending") || null,
    [quizMessages]
  );

  // Add question to chat
  const addQuizToChat = useCallback(
    (
      type: "warmup" | "inlesson",
      question: WarmupQuestion | InLessonQuestion
    ): string => {
      const questionType = "type" in question ? question.type : "mcq";
      const correctOption =
        "correct_option" in question ? question.correct_option : undefined;

      const messageId = generateId(type);
      const quizMessage: QuizMessage = {
        id: messageId,
        type,
        questionId: question.id,
        question: question.question,
        questionType,
        options: question.options,
        correctOption,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      setQuizMessages((prev) => [...prev, quizMessage]);
      return messageId;
    },
    []
  );

  // Advance to next question or complete
  const advanceQuiz = useCallback(
    (stats: QuizState["stats"]) => {
      if (!quizState) return;

      const nextIndex = quizState.currentIndex + 1;

      if (nextIndex < quizState.questions.length) {
        const nextQuestion = quizState.questions[nextIndex];
        addQuizToChat(quizState.type as "warmup" | "inlesson", nextQuestion);
        setQuizState((prev) =>
          prev ? { ...prev, currentIndex: nextIndex, stats } : null
        );
      } else {
        onQuizComplete?.(quizState.type, stats);
        setQuizState(null);
      }
    },
    [quizState, addQuizToChat, onQuizComplete]
  );

  // Start warmup flow
  const startWarmup = useCallback(async () => {
    if (!quiz?.warmup || quiz.warmup.length === 0 || !lessonId) {
      console.warn("[useQuiz] No warmup questions");
      return;
    }

    setQuizState({
      type: "warmup",
      questions: quiz.warmup,
      currentIndex: 0,
      stats: { correct: 0, incorrect: 0, skipped: 0 },
    });

    addQuizToChat("warmup", quiz.warmup[0]);
  }, [quiz, lessonId, addQuizToChat]);

  // Trigger in-lesson question
  const triggerInlesson = useCallback(
    async (questionId: string) => {
      if (!(quiz?.inlesson && lessonId)) {
        console.warn("[useQuiz] No in-lesson questions");
        return;
      }

      const question = quiz.inlesson.find((q) => q.id === questionId);
      if (!question) {
        console.warn(`[useQuiz] Question ${questionId} not found`);
        return;
      }

      setQuizState({
        type: "inlesson",
        questions: [question],
        currentIndex: 0,
        stats: { correct: 0, incorrect: 0, skipped: 0 },
      });

      addQuizToChat("inlesson", question);
    },
    [quiz, lessonId, addQuizToChat]
  );

  // Submit answer (unified for all quiz types)
  const submitAnswer = useCallback(
    async (questionId: string, answer: string) => {
      const message = quizMessages.find(
        (m) => m.questionId === questionId && m.status === "pending"
      );
      if (!message) return;

      setIsProcessing(true);

      try {
        // =====================================================================
        // FA Answer - Send to agent via data channel
        // =====================================================================
        if (message.type === "fa") {
          if (publishData) {
            await publishData(
              JSON.stringify({
                type: "fa_answer",
                questionId,
                answer,
              })
            );
          }

          // Update message with user's answer (feedback comes later via handleFAResponse)
          setQuizMessages((prev) =>
            prev.map((m) =>
              m.questionId === questionId ? { ...m, userAnswer: answer } : m
            )
          );

          // Don't set status to "answered" yet - wait for fa_response with feedback
          setIsProcessing(false);
          return;
        }

        // =====================================================================
        // Warmup/Inlesson - Local or agent evaluation
        // =====================================================================
        if (!(quizState && lessonId)) return;

        const assessmentType: AssessmentType = quizState.type as AssessmentType;

        if (message.questionType === "mcq") {
          // MCQ - evaluate locally
          const isCorrect = answer === message.correctOption;
          const feedback = isCorrect
            ? "Great job! You got it right."
            : "That's not quite right, but keep learning!";

          if (isCorrect) {
            audioManager?.play("success");
            fireConfetti();
          } else {
            audioManager?.play("error");
          }

          await recordAttempt({
            odataUserId: userId,
            lessonId,
            assessmentType,
            questionId,
            answer,
            isCorrect,
            isSkipped: false,
            feedback,
          });

          setQuizMessages((prev) =>
            prev.map((m) =>
              m.questionId === questionId
                ? {
                    ...m,
                    status: "answered" as const,
                    userAnswer: answer,
                    isCorrect,
                    feedback,
                  }
                : m
            )
          );

          const newStats = {
            ...quizState.stats,
            correct: quizState.stats.correct + (isCorrect ? 1 : 0),
            incorrect: quizState.stats.incorrect + (isCorrect ? 0 : 1),
          };

          advanceQuiz(newStats);
        } else {
          // Text question - request evaluation via data channel (QUIZ_EVAL format)
          if (publishData) {
            const payload = JSON.stringify({
              questionId,
              question: message.question,
              answer,
            });
            await publishData(`QUIZ_EVAL:${payload}`);
          }

          setQuizMessages((prev) =>
            prev.map((m) =>
              m.questionId === questionId
                ? { ...m, status: "answered" as const, userAnswer: answer }
                : m
            )
          );

          await recordAttempt({
            odataUserId: userId,
            lessonId,
            assessmentType,
            questionId,
            answer,
            isCorrect: null,
            isSkipped: false,
            feedback: null,
          });

          advanceQuiz(quizState.stats);
        }
      } catch (error) {
        console.error("[useQuiz] Failed to submit answer:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [quizState, lessonId, userId, quizMessages, publishData, advanceQuiz]
  );

  // Skip question
  const skipQuestion = useCallback(
    async (questionId: string) => {
      const message = quizMessages.find(
        (m) => m.questionId === questionId && m.status === "pending"
      );
      if (!message) return;

      setIsProcessing(true);

      try {
        // FA skip - send to agent
        if (message.type === "fa") {
          if (publishData) {
            await publishData(
              JSON.stringify({
                type: "fa_answer",
                questionId,
                answer: "skip",
              })
            );
          }
          // Don't update state here - wait for fa_response with next question
          setIsProcessing(false);
          return;
        }

        // Warmup/Inlesson skip - local handling
        if (!(quizState && lessonId)) return;

        await recordAttempt({
          odataUserId: userId,
          lessonId,
          assessmentType: quizState.type as AssessmentType,
          questionId,
          answer: null,
          isCorrect: null,
          isSkipped: true,
          feedback: null,
        });

        setQuizMessages((prev) =>
          prev.map((m) =>
            m.questionId === questionId
              ? { ...m, status: "skipped" as const }
              : m
          )
        );

        const newStats = {
          ...quizState.stats,
          skipped: quizState.stats.skipped + 1,
        };

        advanceQuiz(newStats);
      } catch (error) {
        console.error("[useQuiz] Failed to skip question:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [quizState, lessonId, userId, quizMessages, publishData, advanceQuiz]
  );

  // =========================================================================
  // FA (Formative Assessment) - NEW
  // =========================================================================

  // Start FA session
  const startFA = useCallback(
    async (topic?: string) => {
      if (!publishData) {
        console.warn("[useQuiz] No publishData function for FA");
        return;
      }

      setIsInFASession(true);

      // Send FA_INTRO to agent - agent will respond with first question
      const introMessage = topic ? `FA_INTRO:${topic}` : "FA_INTRO:";
      await publishData(introMessage);

      console.log(
        "[useQuiz] FA session started, waiting for first question..."
      );
    },
    [publishData]
  );

  // Handle FA response from agent (via data channel)
  const handleFAResponse = useCallback((response: FAResponse) => {
    console.log("[useQuiz] Received FA response:", response);

    // 1. If there's feedback, update the previous FA question
    if (response.feedback_type && lastFAQuestionIdRef.current) {
      const isCorrect = response.feedback_type === "correct";

      if (isCorrect) {
        audioManager?.play("success");
        fireConfetti();
      } else {
        audioManager?.play("error");
      }

      // Extract feedback text from tts_text (before next question)
      const feedbackText =
        response.tts_text?.split(/\[QUESTION/i)[0]?.trim() || "";

      setQuizMessages((prev) =>
        prev.map((m) =>
          m.questionId === lastFAQuestionIdRef.current
            ? {
                ...m,
                status: "answered" as const,
                isCorrect,
                feedback: feedbackText,
              }
            : m
        )
      );
    }

    // 2. If FA is complete, end session
    if (response.is_complete) {
      setIsInFASession(false);
      lastFAQuestionIdRef.current = null;

      // Could trigger onQuizComplete here if needed
      console.log("[useQuiz] FA session complete");
      return;
    }

    // 3. If there's a new question, add it
    if (response.question_text && response.question_number) {
      // Generate questionId on frontend
      const questionId = generateId("fa");
      lastFAQuestionIdRef.current = questionId;

      // Convert options array to QuizOption format
      const options: QuizOption[] | undefined = response.options?.map(
        (text, idx) => ({
          id: String.fromCharCode(65 + idx), // A, B, C, D
          text,
        })
      );

      const newQuestion: QuizMessage = {
        id: questionId,
        type: "fa",
        questionId,
        question: response.question_text,
        questionType: response.is_mcq ? "mcq" : "text",
        options,
        status: "pending",
        createdAt: new Date().toISOString(),
        questionNumber: response.question_number,
      };

      setQuizMessages((prev) => [...prev, newQuestion]);
    }
  }, []);

  return {
    quizMessages,
    activeQuestion,
    isProcessing,
    isInFASession,
    startWarmup,
    triggerInlesson,
    startFA,
    handleFAResponse,
    submitAnswer,
    skipQuestion,
  };
}
