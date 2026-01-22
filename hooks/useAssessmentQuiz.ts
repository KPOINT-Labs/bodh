"use client";

import { useState, useCallback, useRef } from "react";
import { recordAttempt, getAnsweredQuestionIds } from "@/lib/actions/assessment";
import type {
  LessonQuiz,
  WarmupQuestion,
  InLessonQuestion,
  AssessmentType,
  QuizEvaluationResult,
} from "@/types/assessment";

type QuizType = "warmup" | "inlesson";

interface UseAssessmentQuizProps {
  userId: string;
  lessonId?: string;
  quiz?: LessonQuiz | null;
  onQuizComplete?: () => void;
  onTextEvaluationRequest?: (
    questionId: string,
    question: string,
    answer: string
  ) => Promise<void>;
}

interface LastAnswer {
  isCorrect: boolean;
  feedback: string;
}

export function useAssessmentQuiz({
  userId,
  lessonId,
  quiz,
  onQuizComplete,
  onTextEvaluationRequest,
}: UseAssessmentQuizProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quizType, setQuizType] = useState<QuizType | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<(WarmupQuestion | InLessonQuestion)[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<LastAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to track pending text evaluation
  const pendingEvaluationRef = useRef<{
    questionId: string;
    answer: string;
  } | null>(null);

  /**
   * Start a warmup quiz
   */
  const startWarmup = useCallback(async () => {
    if (!quiz?.warmup || quiz.warmup.length === 0 || !lessonId) {
      console.warn("[useAssessmentQuiz] No warmup questions available");
      return;
    }

    // Get already answered question IDs
    const answeredIds = await getAnsweredQuestionIds(userId, lessonId, "warmup");

    // Filter out already answered questions
    const unansweredQuestions = quiz.warmup.filter(
      (q) => !answeredIds.has(q.id)
    );

    if (unansweredQuestions.length === 0) {
      console.log("[useAssessmentQuiz] All warmup questions already answered");
      onQuizComplete?.();
      return;
    }

    setQuestions(unansweredQuestions);
    setCurrentQuestionIndex(0);
    setQuizType("warmup");
    setShowFeedback(false);
    setLastAnswer(null);
    setIsOpen(true);
  }, [quiz, lessonId, userId, onQuizComplete]);

  /**
   * Start an in-lesson question
   */
  const startInlesson = useCallback(
    async (questionId: string) => {
      console.log("[useAssessmentQuiz] 📝 startInlesson called:", {
        questionId,
        hasQuiz: !!quiz,
        hasInlesson: !!quiz?.inlesson,
        inlessonCount: quiz?.inlesson?.length ?? 0,
        lessonId,
      });

      if (!quiz?.inlesson || !lessonId) {
        console.warn("[useAssessmentQuiz] ❌ No in-lesson questions available:", {
          hasQuiz: !!quiz,
          hasInlesson: !!quiz?.inlesson,
          lessonId,
        });
        return;
      }

      // Find the specific question
      const question = quiz.inlesson.find((q) => q.id === questionId);
      if (!question) {
        console.warn(`[useAssessmentQuiz] ❌ Question ${questionId} not found in:`,
          quiz.inlesson.map(q => q.id)
        );
        return;
      }

      console.log("[useAssessmentQuiz] ✓ Found question:", {
        id: question.id,
        type: question.type,
        timestamp: question.timestamp,
        questionText: question.question?.substring(0, 50) + "...",
      });

      // Check if already answered
      const answeredIds = await getAnsweredQuestionIds(userId, lessonId, "inlesson");
      console.log("[useAssessmentQuiz] Already answered IDs:", Array.from(answeredIds));

      if (answeredIds.has(questionId)) {
        console.log(`[useAssessmentQuiz] ⏭️ Question ${questionId} already answered, calling onQuizComplete`);
        onQuizComplete?.();
        return;
      }

      console.log("[useAssessmentQuiz] 🎉 Opening quiz overlay for question:", questionId);
      setQuestions([question]);
      setCurrentQuestionIndex(0);
      setQuizType("inlesson");
      setShowFeedback(false);
      setLastAnswer(null);
      setIsOpen(true);
      console.log("[useAssessmentQuiz] ✓ Quiz state updated, isOpen should now be true");
    },
    [quiz, lessonId, userId, onQuizComplete]
  );

  /**
   * Submit an answer for the current question
   */
  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!lessonId || questions.length === 0) return;

      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion) return;

      setIsLoading(true);

      try {
        const assessmentType: AssessmentType =
          quizType === "warmup" ? "warmup" : "inlesson";

        // Determine question type
        const questionType = "type" in currentQuestion ? currentQuestion.type : "mcq";

        if (questionType === "mcq") {
          // MCQ: Check answer locally
          const correctOption =
            "correct_option" in currentQuestion
              ? currentQuestion.correct_option
              : undefined;

          const isCorrect = answer === correctOption;

          // Get feedback from the question
          const feedback =
            "feedback" in currentQuestion && currentQuestion.feedback
              ? currentQuestion.feedback
              : isCorrect
              ? "Great job!"
              : "That's not quite right. Review the material and try again.";

          // Record the attempt
          await recordAttempt({
            odataUserId: userId,
            lessonId,
            assessmentType,
            questionId: currentQuestion.id,
            answer,
            isCorrect,
            isSkipped: false,
            feedback,
          });

          setLastAnswer({ isCorrect, feedback });
          setShowFeedback(true);
        } else {
          // Text question: Send to Sarvam/agent for evaluation
          if (onTextEvaluationRequest) {
            pendingEvaluationRef.current = {
              questionId: currentQuestion.id,
              answer,
            };
            await onTextEvaluationRequest(
              currentQuestion.id,
              currentQuestion.question,
              answer
            );
            // Wait for handleTextEvaluationResult to be called
          } else {
            // No evaluation available, assume correct and continue
            await recordAttempt({
              odataUserId: userId,
              lessonId,
              assessmentType,
              questionId: currentQuestion.id,
              answer,
              isCorrect: null,
              isSkipped: false,
              feedback: "Answer submitted.",
            });

            setLastAnswer({ isCorrect: true, feedback: "Answer submitted." });
            setShowFeedback(true);
          }
        }
      } catch (error) {
        console.error("[useAssessmentQuiz] Failed to submit answer:", error);
        setLastAnswer({
          isCorrect: false,
          feedback: "Failed to submit answer. Please try again.",
        });
        setShowFeedback(true);
      } finally {
        setIsLoading(false);
      }
    },
    [lessonId, questions, currentQuestionIndex, quizType, userId, onTextEvaluationRequest]
  );

  /**
   * Handle text evaluation result from Sarvam/agent
   */
  const handleTextEvaluationResult = useCallback(
    async (result: QuizEvaluationResult) => {
      if (!lessonId || !pendingEvaluationRef.current) return;

      const { questionId, answer } = pendingEvaluationRef.current;
      pendingEvaluationRef.current = null;

      // Verify the result is for the right question
      if (result.questionId !== questionId) {
        console.warn(
          "[useAssessmentQuiz] Evaluation result mismatch:",
          result.questionId,
          "vs",
          questionId
        );
        return;
      }

      const assessmentType: AssessmentType =
        quizType === "warmup" ? "warmup" : "inlesson";

      // Record the attempt with evaluation result
      await recordAttempt({
        odataUserId: userId,
        lessonId,
        assessmentType,
        questionId,
        answer,
        isCorrect: result.isCorrect,
        isSkipped: false,
        feedback: result.feedback,
      });

      setLastAnswer({
        isCorrect: result.isCorrect,
        feedback: result.feedback,
      });
      setShowFeedback(true);
      setIsLoading(false);
    },
    [lessonId, quizType, userId]
  );

  /**
   * Skip the current question
   */
  const skipQuestion = useCallback(async () => {
    if (!lessonId || questions.length === 0) return;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsLoading(true);

    try {
      const assessmentType: AssessmentType =
        quizType === "warmup" ? "warmup" : "inlesson";

      // Record the skipped attempt
      await recordAttempt({
        odataUserId: userId,
        lessonId,
        assessmentType,
        questionId: currentQuestion.id,
        answer: null,
        isCorrect: null,
        isSkipped: true,
        feedback: null,
      });

      // Move to next question or close
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        close();
        onQuizComplete?.();
      }
    } catch (error) {
      console.error("[useAssessmentQuiz] Failed to skip question:", error);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, questions, currentQuestionIndex, quizType, userId, onQuizComplete]);

  /**
   * Continue to the next question or close the quiz
   */
  const continueQuiz = useCallback(() => {
    setShowFeedback(false);
    setLastAnswer(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Quiz complete
      setIsOpen(false);
      setQuizType(null);
      setQuestions([]);
      setCurrentQuestionIndex(0);
      onQuizComplete?.();
    }
  }, [currentQuestionIndex, questions.length, onQuizComplete]);

  /**
   * Close the quiz overlay
   */
  const close = useCallback(() => {
    setIsOpen(false);
    setQuizType(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setShowFeedback(false);
    setLastAnswer(null);
    setIsLoading(false);
    pendingEvaluationRef.current = null;
  }, []);

  return {
    // State
    isOpen,
    quizType,
    questions,
    currentQuestionIndex,
    showFeedback,
    lastAnswer,
    isLoading,
    // Actions
    startWarmup,
    startInlesson,
    submitAnswer,
    skipQuestion,
    continueQuiz,
    close,
    handleTextEvaluationResult,
  };
}
