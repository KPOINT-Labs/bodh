import { useState, useEffect, useCallback } from "react";
import type { Course, Module } from "@/types/learning";

interface UsePeerLearningOptions {
  userId?: string;
  activeCourseId?: string;
  activeModuleId?: string;
}

interface UsePeerLearningReturn {
  userId: string | null;
  courses: Course[];
  selectedCourse: Course | null;
  expandedModules: string[];
  isLoading: boolean;
  error: string | null;
  selectCourse: (course: Course) => void;
  backToCourses: () => void;
  toggleModule: (moduleId: string) => void;
}

/**
 * Hook for managing peer learning panel data and state
 */
export function usePeerLearning(options: UsePeerLearningOptions): UsePeerLearningReturn {
  const { userId: propUserId, activeCourseId, activeModuleId } = options;

  const [userId, setUserId] = useState<string | null>(propUserId || null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  // Fetch current user if userId not provided
  useEffect(() => {
    async function fetchCurrentUser() {
      if (propUserId) {
        setUserId(propUserId);
        return;
      }

      try {
        const response = await fetch("/api/user/current");
        const data = await response.json();

        if (data.success) {
          setUserId(data.user.id);
        } else {
          setError(data.error || "Failed to get user");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err);
        setError("Failed to get user");
        setIsLoading(false);
      }
    }

    fetchCurrentUser();
  }, [propUserId]);

  // Fetch enrolled courses when userId is available
  useEffect(() => {
    async function fetchCourses() {
      if (!userId) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/courses/enrolled?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setCourses(data.courses);

          // Auto-select course if activeCourseId is provided, otherwise select first
          if (data.courses.length > 0) {
            const courseToSelect = activeCourseId
              ? data.courses.find((c: Course) => c.id === activeCourseId)
              : data.courses[0];

            if (courseToSelect) {
              setSelectedCourse(courseToSelect);

              // Auto-expand active module or first in-progress module
              const moduleToExpand = activeModuleId
                ? courseToSelect.modules.find((m: Module) => m.id === activeModuleId)
                : courseToSelect.modules.find((m: Module) => m.status === "in_progress");

              if (moduleToExpand) {
                setExpandedModules([moduleToExpand.id]);
              }
            }
          }
        } else {
          setError(data.error || "Failed to load courses");
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses");
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchCourses();
    }
  }, [userId, activeCourseId, activeModuleId]);

  const toggleModule = useCallback((moduleId: string) => {
    // Don't collapse if this is the active module
    if (moduleId === activeModuleId) {
      // Just ensure it's expanded
      setExpandedModules((prev) =>
        prev.includes(moduleId) ? prev : [...prev, moduleId]
      );
      return;
    }

    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  }, [activeModuleId]);

  const backToCourses = useCallback(() => {
    setSelectedCourse(null);
  }, []);

  const selectCourse = useCallback((course: Course) => {
    // Toggle: if clicking the same course, collapse it
    if (selectedCourse?.id === course.id) {
      setSelectedCourse(null);
      setExpandedModules([]);
      return;
    }

    setSelectedCourse(course);
    // Auto-expand first in-progress module
    const inProgressModule = course.modules.find((m) => m.status === "in_progress");
    if (inProgressModule) {
      setExpandedModules([inProgressModule.id]);
    } else {
      setExpandedModules([]);
    }
  }, [selectedCourse]);

  return {
    userId,
    courses,
    selectedCourse,
    expandedModules,
    isLoading,
    error,
    selectCourse,
    backToCourses,
    toggleModule,
  };
}
