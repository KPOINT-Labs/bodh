"use server";

import { prisma } from "@/lib/prisma";
import type {
  AssessmentAttemptInput,
  AssessmentType,
  LessonQuiz,
} from "@/types/assessment";

/**
 * Fetch the quiz configuration for a lesson
 */
export async function getLessonQuiz(
  lessonId: string
): Promise<LessonQuiz | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { quiz: true },
  });

  if (!lesson?.quiz) {
    return null;
  }

  // Parse the quiz JSON field
  return lesson.quiz as LessonQuiz;
}

/**
 * Record an assessment attempt
 */
export async function recordAttempt(
  input: AssessmentAttemptInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        odataUserId: input.odataUserId,
        lessonId: input.lessonId,
        assessmentType: input.assessmentType,
        questionId: input.questionId,
        answer: input.answer,
        isCorrect: input.isCorrect,
        isSkipped: input.isSkipped ?? false,
        feedback: input.feedback,
      },
    });

    return { success: true, id: attempt.id };
  } catch (error) {
    console.error("[recordAttempt] Failed to record attempt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all attempts for a user on a specific lesson and assessment type
 */
export async function getAttempts(
  userId: string,
  lessonId: string,
  assessmentType: AssessmentType
): Promise<
  Array<{
    id: string;
    questionId: string;
    answer: string | null;
    isCorrect: boolean | null;
    isSkipped: boolean;
    feedback: string | null;
    createdAt: Date;
  }>
> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      odataUserId: userId,
      lessonId,
      assessmentType,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      questionId: true,
      answer: true,
      isCorrect: true,
      isSkipped: true,
      feedback: true,
      createdAt: true,
    },
  });

  return attempts;
}

/**
 * Check if a specific question has already been answered by the user
 */
export async function wasQuestionAnswered(
  userId: string,
  lessonId: string,
  questionId: string
): Promise<boolean> {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      odataUserId: userId,
      lessonId,
      questionId,
    },
    select: { id: true },
  });

  return attempt !== null;
}

/**
 * Get all answered question IDs for a lesson
 * Useful for filtering out already-answered questions
 */
export async function getAnsweredQuestionIds(
  userId: string,
  lessonId: string,
  assessmentType: AssessmentType
): Promise<Set<string>> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      odataUserId: userId,
      lessonId,
      assessmentType,
    },
    select: { questionId: true },
  });

  return new Set(attempts.map((a: { questionId: string }) => a.questionId));
}
