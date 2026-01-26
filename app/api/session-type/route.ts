import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/session-type
 *
 * Determines the session type based on user's enrollment and lesson progress.
 *
 * Query params:
 * - userId: User ID
 * - courseId: Course ID
 * - lessonId: Current lesson ID
 *
 * Returns:
 * - sessionType: "course_welcome" | "course_welcome_back" | "lesson_welcome" | "lesson_welcome_back"
 * - isFirstCourseVisit: boolean
 * - isIntroLesson: boolean
 * - isFirstLessonVisit: boolean
 * - courseProgress: { completedLessons, totalLessons, lastLessonTitle }
 * - lessonProgress: { completionPercentage, lastPosition }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const courseId = searchParams.get("courseId");
    const lessonId = searchParams.get("lessonId");

    console.log("[SESSION_TYPE] ========== START ==========");
    console.log("[SESSION_TYPE] Request params:", {
      userId,
      courseId,
      lessonId,
    });

    if (!(userId && courseId)) {
      return NextResponse.json(
        { success: false, error: "userId and courseId are required" },
        { status: 400 }
      );
    }

    // 1. Check enrollment and existing progress (course level)
    // Note: Enrollment may already exist due to auto-enrollment in page.tsx
    // So we check lesson progress to determine if this is truly a first visit
    const [enrollment, existingProgressCount] = await Promise.all([
      prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      }),
      // Count lesson progress entries for this user in this course
      prisma.lessonProgress.count({
        where: {
          userId,
          lesson: { courseId },
        },
      }),
    ]);

    // First visit = no lesson progress exists (enrollment may exist due to auto-enroll)
    const isFirstCourseVisit = existingProgressCount === 0;
    console.log("[SESSION_TYPE] Step 1 - Enrollment check:", {
      hasEnrollment: !!enrollment,
      existingProgressCount,
      isFirstCourseVisit,
    });

    // Create enrollment if it doesn't exist
    if (!enrollment) {
      await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: "active",
        },
      });
    }

    // 2. Get course progress
    const [totalLessons, completedLessons, allLessonProgress] =
      await Promise.all([
        // Total lessons in course
        prisma.lesson.count({
          where: { courseId, isPublished: true },
        }),
        // Completed lessons
        prisma.lessonProgress.count({
          where: {
            userId,
            lesson: { courseId },
            status: "completed",
          },
        }),
        // All lesson progress for this user in this course (to find last accessed)
        prisma.lessonProgress.findMany({
          where: {
            userId,
            lesson: { courseId },
          },
          include: {
            lesson: {
              select: { title: true, orderIndex: true },
            },
          },
          orderBy: { lastAccessedAt: "desc" },
          take: 1,
        }),
      ]);

    const lastLessonTitle = allLessonProgress[0]?.lesson?.title || null;
    console.log("[SESSION_TYPE] Step 2 - Course progress:", {
      totalLessons,
      completedLessons,
      lastLessonTitle,
    });

    // 3. Check if current lesson is the intro (first lesson)
    let isIntroLesson = false;
    let currentLesson = null;
    let firstModule = null;

    if (lessonId) {
      currentLesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { id: true, title: true, orderIndex: true, moduleId: true },
      });

      console.log("[SESSION_TYPE] Step 3a - Current lesson:", currentLesson);

      if (currentLesson) {
        // Check if this is the first lesson (orderIndex 0) in the first module
        firstModule = await prisma.module.findFirst({
          where: { courseId, isPublished: true },
          orderBy: { orderIndex: "asc" },
          select: { id: true, title: true, orderIndex: true },
        });

        // Get current module to determine global lesson position
        const _currentModule = await prisma.module.findUnique({
          where: { id: currentLesson.moduleId },
          select: { orderIndex: true },
        });

        console.log("[SESSION_TYPE] Step 3b - First module:", firstModule);
        console.log("[SESSION_TYPE] Step 3c - Intro lesson check:", {
          currentLessonOrderIndex: currentLesson.orderIndex,
          currentLessonModuleId: currentLesson.moduleId,
          firstModuleId: firstModule?.id,
          isOrderIndex0: currentLesson.orderIndex === 0,
          isInFirstModule: currentLesson.moduleId === firstModule?.id,
        });

        isIntroLesson =
          currentLesson.orderIndex === 0 &&
          currentLesson.moduleId === firstModule?.id;
      }
    }
    console.log("[SESSION_TYPE] Step 3 - isIntroLesson:", isIntroLesson);

    // 3.5. Find the globally previous lesson (across all modules)
    let prevLessonTitle: string | null = null;
    let lessonNumber = 1;

    if (lessonId && currentLesson) {
      // Get all lessons from the course with their module info, sorted globally
      const allLessonsInCourse = await prisma.lesson.findMany({
        where: {
          courseId,
          isPublished: true,
        },
        include: {
          module: {
            select: { orderIndex: true },
          },
        },
        orderBy: [{ module: { orderIndex: "asc" } }, { orderIndex: "asc" }],
      });

      // Find current lesson's global position and the previous lesson
      const currentIndex = allLessonsInCourse.findIndex(
        (l) => l.id === lessonId
      );
      // Guard against -1 (lesson not found in published list)
      lessonNumber = currentIndex >= 0 ? currentIndex + 1 : 1; // 1-based lesson number, default to 1 if not found

      if (currentIndex > 0) {
        prevLessonTitle = allLessonsInCourse[currentIndex - 1].title;
      }

      console.log("[SESSION_TYPE] Step 3.5 - Global lesson position:", {
        totalLessonsInCourse: allLessonsInCourse.length,
        currentIndex,
        lessonNumber,
        prevLessonTitle,
      });
    }

    // 4. Check lesson progress
    let lessonProgress = null;
    let isFirstLessonVisit = true;

    if (lessonId) {
      lessonProgress = await prisma.lessonProgress.findUnique({
        where: {
          userId_lessonId: { userId, lessonId },
        },
      });

      console.log(
        "[SESSION_TYPE] Step 4a - Existing lesson progress:",
        lessonProgress
      );

      isFirstLessonVisit =
        !lessonProgress || lessonProgress.status === "not_started";

      console.log("[SESSION_TYPE] Step 4b - isFirstLessonVisit:", {
        hasLessonProgress: !!lessonProgress,
        progressStatus: lessonProgress?.status,
        isFirstLessonVisit,
      });

      // Create lesson progress if first visit
      if (!lessonProgress) {
        lessonProgress = await prisma.lessonProgress.create({
          data: {
            userId,
            lessonId,
            status: "not_started",
          },
        });
        console.log("[SESSION_TYPE] Step 4c - Created new lesson progress");
      }
    }

    // 5. Determine session type
    // Logic: Intro lesson → course-level welcome, Other lessons → lesson-level welcome
    let sessionType: string;

    console.log("[SESSION_TYPE] Step 5 - Decision inputs:", {
      isFirstCourseVisit,
      isIntroLesson,
      isFirstLessonVisit,
    });

    if (isIntroLesson) {
      // On intro lesson → always use course-level welcome
      if (isFirstCourseVisit) {
        sessionType = "course_welcome";
        console.log(
          "[SESSION_TYPE] Step 5 - Decision: course_welcome (first course visit + intro lesson)"
        );
      } else {
        sessionType = "course_welcome_back";
        console.log(
          "[SESSION_TYPE] Step 5 - Decision: course_welcome_back (returning user + intro lesson)"
        );
      }
    } else {
      // On lesson 2+ → use lesson-level welcome
      if (isFirstLessonVisit) {
        sessionType = "lesson_welcome";
        console.log(
          "[SESSION_TYPE] Step 5 - Decision: lesson_welcome (first time on this lesson)"
        );
      } else {
        sessionType = "lesson_welcome_back";
        console.log(
          "[SESSION_TYPE] Step 5 - Decision: lesson_welcome_back (returning to same lesson)"
        );
      }
    }

    console.log("[SESSION_TYPE] ========== FINAL RESULT ==========");
    console.log("[SESSION_TYPE] sessionType:", sessionType);

    // 6. Update last accessed time
    if (lessonId && lessonProgress) {
      await prisma.lessonProgress.update({
        where: { id: lessonProgress.id },
        data: {
          lastAccessedAt: new Date(),
          status:
            lessonProgress.status === "not_started"
              ? "in_progress"
              : lessonProgress.status,
        },
      });
    }

    const response = {
      success: true,
      sessionType,
      isFirstCourseVisit,
      isIntroLesson,
      isFirstLessonVisit,
      lessonNumber, // 1-based global lesson number
      prevLessonTitle, // Previous lesson title for warm-up context
      courseProgress: {
        completedLessons,
        totalLessons,
        lastLessonTitle,
      },
      lessonProgress: lessonProgress
        ? {
            completionPercentage: lessonProgress.completionPercentage,
            lastPosition: lessonProgress.lastPosition,
            status: lessonProgress.status,
          }
        : null,
    };

    console.log("[SESSION_TYPE] Response:", JSON.stringify(response, null, 2));
    console.log("[SESSION_TYPE] ========== END ==========");

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API_SESSION_TYPE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to determine session type" },
      { status: 500 }
    );
  }
}
