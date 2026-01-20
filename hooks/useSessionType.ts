import { useState, useEffect, useRef } from "react";

export type SessionType =
  | "course_welcome"      // First time in course (on intro lesson)
  | "course_welcome_back" // Returning to course
  | "lesson_welcome"      // First time in lesson 2+ (offer warm-up)
  | "lesson_welcome_back"; // Returning to same lesson

interface CourseProgress {
  completedLessons: number;
  totalLessons: number;
  lastLessonTitle: string | null;
}

interface LessonProgressData {
  completionPercentage: number;
  lastPosition: number;
  status: string;
}

interface UseSessionTypeOptions {
  userId: string;
  courseId: string;
  lessonId?: string;
  moduleId?: string; // Kept for backwards compatibility
}

interface UseSessionTypeReturn {
  /** Combined session type for agent */
  sessionType: SessionType;
  /** Whether this is the first time user visits this course */
  isFirstCourseVisit: boolean;
  /** Whether current lesson is the intro (first) lesson */
  isIntroLesson: boolean;
  /** Whether this is the first time user visits this lesson */
  isFirstLessonVisit: boolean;
  /** 1-based global lesson number across all modules */
  lessonNumber: number;
  /** Previous lesson title for warm-up context */
  prevLessonTitle: string | null;
  /** Course progress data */
  courseProgress: CourseProgress | null;
  /** Lesson progress data */
  lessonProgress: LessonProgressData | null;
  /** Whether the check is still loading */
  isLoading: boolean;
  /** Whether this is a returning user (has existing enrollment) */
  isReturningUser: boolean;
}

/**
 * Hook to determine session type based on user's enrollment and lesson progress.
 *
 * Session Types:
 * - course_welcome: First time in course, on intro lesson
 * - course_welcome_back: Returning to course
 * - lesson_welcome: First time in lesson 2+ (offer warm-up from previous lesson)
 * - lesson_welcome_back: Returning to same lesson (continue where left off)
 */
export function useSessionType(
  options: UseSessionTypeOptions
): UseSessionTypeReturn {
  const { userId, courseId, lessonId } = options;

  const [sessionType, setSessionType] = useState<SessionType>("course_welcome");
  const [isFirstCourseVisit, setIsFirstCourseVisit] = useState(true);
  const [isIntroLesson, setIsIntroLesson] = useState(false);
  const [isFirstLessonVisit, setIsFirstLessonVisit] = useState(true);
  const [lessonNumber, setLessonNumber] = useState(1);
  const [prevLessonTitle, setPrevLessonTitle] = useState<string | null>(null);
  const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(false);

  const hasChecked = useRef(false);
  const lastLessonId = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Reset check if lessonId changes
    if (lessonId !== lastLessonId.current) {
      hasChecked.current = false;
      lastLessonId.current = lessonId;
    }

    // Prevent double check in React Strict Mode
    if (hasChecked.current) return;
    hasChecked.current = true;

    async function checkSessionType() {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          userId,
          courseId,
        });

        if (lessonId) {
          params.append("lessonId", lessonId);
        }

        const response = await fetch(`/api/session-type?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setSessionType(data.sessionType as SessionType);
          setIsFirstCourseVisit(data.isFirstCourseVisit);
          setIsIntroLesson(data.isIntroLesson);
          setIsFirstLessonVisit(data.isFirstLessonVisit);
          setLessonNumber(data.lessonNumber || 1);
          setPrevLessonTitle(data.prevLessonTitle || null);
          setCourseProgress(data.courseProgress);
          setLessonProgress(data.lessonProgress);
          setIsReturningUser(!data.isFirstCourseVisit);

          console.log("[useSessionType] Session type determined:", {
            sessionType: data.sessionType,
            isFirstCourseVisit: data.isFirstCourseVisit,
            isIntroLesson: data.isIntroLesson,
            isFirstLessonVisit: data.isFirstLessonVisit,
            lessonNumber: data.lessonNumber,
            prevLessonTitle: data.prevLessonTitle,
          });
        } else {
          console.error("[useSessionType] API error:", data.error);
          // Default to course_welcome on error
          setSessionType("course_welcome");
        }
      } catch (error) {
        console.error("[useSessionType] Failed to check session type:", error);
        // Default to course_welcome on error
        setSessionType("course_welcome");
      } finally {
        setIsLoading(false);
      }
    }

    checkSessionType();
  }, [userId, courseId, lessonId]);

  return {
    sessionType,
    isFirstCourseVisit,
    isIntroLesson,
    isFirstLessonVisit,
    lessonNumber,
    prevLessonTitle,
    courseProgress,
    lessonProgress,
    isLoading,
    isReturningUser,
  };
}
