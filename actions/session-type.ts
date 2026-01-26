"use server";

import { prisma } from "@/lib/prisma";

export type SessionType =
  | "course_welcome"
  | "course_welcome_back"
  | "lesson_welcome"
  | "lesson_welcome_back";

export interface SessionTypeResult {
  sessionType: SessionType;
  isFirstCourseVisit: boolean;
  isIntroLesson: boolean;
  isFirstLessonVisit: boolean;
  lessonNumber: number;
  prevLessonTitle: string | null;
  courseProgress: {
    completedLessons: number;
    totalLessons: number;
    lastLessonTitle: string | null;
  };
  lessonProgress: {
    completionPercentage: number;
    lastPosition: number;
    status: string;
  } | null;
}

interface GetSessionTypeParams {
  userId: string;
  courseId: string;
  lessonId?: string;
}

export async function getSessionType({
  userId,
  courseId,
  lessonId,
}: GetSessionTypeParams): Promise<SessionTypeResult> {
  // 1. Check if first course visit (no lesson progress exists)
  const existingProgressCount = await prisma.lessonProgress.count({
    where: { userId, lesson: { courseId } },
  });
  const isFirstCourseVisit = existingProgressCount === 0;

  // 2. Get course progress
  const [totalLessons, completedLessons, lastAccessedProgress] =
    await Promise.all([
      prisma.lesson.count({ where: { courseId, isPublished: true } }),
      prisma.lessonProgress.count({
        where: { userId, lesson: { courseId }, status: "completed" },
      }),
      prisma.lessonProgress.findFirst({
        where: { userId, lesson: { courseId } },
        include: { lesson: { select: { title: true } } },
        orderBy: { lastAccessedAt: "desc" },
      }),
    ]);

  // 3. Determine if current lesson is intro lesson
  let isIntroLesson = false;
  let isFirstLessonVisit = true;
  let lessonNumber = 1;
  let prevLessonTitle: string | null = null;
  let lessonProgress = null;

  if (lessonId) {
    const [currentLesson, firstModule, allLessons, existingProgress] =
      await Promise.all([
        prisma.lesson.findUnique({
          where: { id: lessonId },
          select: { id: true, orderIndex: true, moduleId: true },
        }),
        prisma.module.findFirst({
          where: { courseId, isPublished: true },
          orderBy: { orderIndex: "asc" },
          select: { id: true },
        }),
        prisma.lesson.findMany({
          where: { courseId, isPublished: true },
          include: { module: { select: { orderIndex: true } } },
          orderBy: [{ module: { orderIndex: "asc" } }, { orderIndex: "asc" }],
        }),
        prisma.lessonProgress.findUnique({
          where: { userId_lessonId: { userId, lessonId } },
        }),
      ]);

    if (currentLesson && firstModule) {
      isIntroLesson =
        currentLesson.orderIndex === 0 &&
        currentLesson.moduleId === firstModule.id;
    }

    // Find global lesson position
    const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
    lessonNumber = currentIndex >= 0 ? currentIndex + 1 : 1;
    if (currentIndex > 0) {
      prevLessonTitle = allLessons[currentIndex - 1].title;
    }

    isFirstLessonVisit =
      !existingProgress || existingProgress.status === "not_started";

    if (existingProgress) {
      lessonProgress = {
        completionPercentage: existingProgress.completionPercentage,
        lastPosition: existingProgress.lastPosition,
        status: existingProgress.status,
      };
    }
  }

  // 4. Determine session type
  let sessionType: SessionType;
  if (isIntroLesson) {
    sessionType = isFirstCourseVisit ? "course_welcome" : "course_welcome_back";
  } else {
    sessionType = isFirstLessonVisit ? "lesson_welcome" : "lesson_welcome_back";
  }

  return {
    sessionType,
    isFirstCourseVisit,
    isIntroLesson,
    isFirstLessonVisit,
    lessonNumber,
    prevLessonTitle,
    courseProgress: {
      completedLessons,
      totalLessons,
      lastLessonTitle: lastAccessedProgress?.lesson?.title || null,
    },
    lessonProgress,
  };
}
