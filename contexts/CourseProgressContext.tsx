"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Course, LessonStatus } from "@/types/learning";

interface CourseProgressContextValue {
  // Data
  courses: Course[];
  isLoading: boolean;
  error: string | null;

  // Methods
  setCourses: (courses: Course[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateLessonProgress: (
    lessonId: string,
    completionPercentage: number,
    videoEnded: boolean
  ) => void;
}

const CourseProgressContext = createContext<CourseProgressContextValue | null>(null);

export function CourseProgressProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Optimistically update lesson progress in the courses tree
   * Mirrors server-side status calculation logic
   */
  const updateLessonProgress = useCallback(
    (lessonId: string, completionPercentage: number, videoEnded: boolean) => {
      setCourses((prevCourses) => {
        // Find and update the lesson in the nested structure
        return prevCourses.map((course) => ({
          ...course,
          modules: course.modules.map((module) => ({
            ...module,
            lessons: module.lessons.map((lesson) => {
              if (lesson.id !== lessonId) return lesson;

              // Calculate new status (mirrors server logic in lib/actions/lesson-progress.ts)
              let newStatus: LessonStatus;
              if (videoEnded || completionPercentage >= 90) {
                newStatus = "completed";
              } else {
                newStatus = "in_progress";
              }

              // Return updated lesson
              return {
                ...lesson,
                status: newStatus,
              };
            }),
          })),
        }));
      });
    },
    []
  );

  const value: CourseProgressContextValue = {
    courses,
    isLoading,
    error,
    setCourses,
    setIsLoading,
    setError,
    updateLessonProgress,
  };

  return (
    <CourseProgressContext.Provider value={value}>
      {children}
    </CourseProgressContext.Provider>
  );
}

export function useCourseProgress() {
  const context = useContext(CourseProgressContext);
  if (!context) {
    throw new Error("useCourseProgress must be used within CourseProgressProvider");
  }
  return context;
}
