"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import { usePeerLearning } from "@/hooks/usePeerLearning";
import type { Lesson, PeerLearningPanelProps } from "@/types/learning";

// Sub-components
import { CollapsedPanel } from "./CollapsedPanel";
import { CourseList } from "./CourseList";
import { EmptyPanel } from "./EmptyPanel";
import { ErrorPanel } from "./ErrorPanel";
import { LoadingPanel } from "./LoadingPanel";

/**
 * PeerLearningPanel - Sidebar for course navigation
 *
 * Displays:
 * - List of enrolled courses with accordion expansion
 * - Module/lesson hierarchy within selected course
 * - Progress indicators
 * - Collapsible sidebar
 */
export function PeerLearningPanel({
  className = "",
  userId: propUserId,
  activeCourseId,
  activeModuleId,
  activeLessonId,
  isCollapsed = false,
  onToggleCollapse,
}: PeerLearningPanelProps) {
  const router = useRouter();
  const { triggerRightPanelHighlight } = useLearningPanel();

  const {
    userId,
    courses,
    selectedCourse,
    expandedModules,
    isLoading,
    error,
    selectCourse,
    toggleModule,
  } = usePeerLearning({
    userId: propUserId,
    activeCourseId,
    activeModuleId,
  });

  const handleLessonClick = (
    courseId: string,
    moduleId: string,
    lesson: Lesson
  ) => {
    // If this lesson is already active, highlight the right panel to show it's already displayed
    if (moduleId === activeModuleId && lesson.id === activeLessonId) {
      triggerRightPanelHighlight();
      return;
    }

    const course = courses.find((c) => c.id === courseId);
    // Use course_id (e.g. "BSCCS1001") for URL, fallback to slug, then id
    const courseUrlId = course?.course_id || course?.slug || courseId;
    // Include lessonId in URL to auto-select the lesson
    router.push(
      `/course/${courseUrlId}/module/${moduleId}?lesson=${lesson.id}`
    );
  };

  const handleDeleteThread = async (moduleId: string) => {
    if (!userId) {
      toast.error("User not found");
      return;
    }

    try {
      const response = await fetch(
        `/api/thread?userId=${userId}&moduleId=${moduleId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success("Thread history deleted successfully");
        // Refresh the page to reset the chat state
        router.refresh();
      } else {
        toast.error(data.error || "Failed to delete thread");
      }
    } catch (err) {
      console.error("Failed to delete thread:", err);
      toast.error("Failed to delete thread");
    }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <CollapsedPanel
        className={className}
        onToggleCollapse={onToggleCollapse}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingPanel className={className} />;
  }

  // Error state
  if (error) {
    return <ErrorPanel className={className} error={error} />;
  }

  // Empty state
  if (courses.length === 0) {
    return (
      <EmptyPanel className={className} onToggleCollapse={onToggleCollapse} />
    );
  }

  // Course list with accordion for modules
  return (
    <CourseList
      activeLessonId={activeLessonId}
      activeModuleId={activeModuleId}
      className={className}
      courses={courses}
      expandedModules={expandedModules}
      onDeleteThread={handleDeleteThread}
      onLessonClick={handleLessonClick}
      onSelectCourse={selectCourse}
      onToggleCollapse={onToggleCollapse}
      onToggleModule={toggleModule}
      selectedCourse={selectedCourse}
    />
  );
}
