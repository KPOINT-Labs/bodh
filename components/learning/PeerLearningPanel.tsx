"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PeerLearningPanelProps, Lesson } from "@/types/learning";
import { usePeerLearning } from "@/hooks/usePeerLearning";

// Sub-components
import { CollapsedPanel } from "./CollapsedPanel";
import { LoadingPanel } from "./LoadingPanel";
import { ErrorPanel } from "./ErrorPanel";
import { EmptyPanel } from "./EmptyPanel";
import { CourseList } from "./CourseList";

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
  isCollapsed = false,
  onToggleCollapse,
}: PeerLearningPanelProps) {
  const router = useRouter();

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

  const handleLessonClick = (courseId: string, moduleId: string, lesson: Lesson) => {
    const course = courses.find((c) => c.id === courseId);
    const courseSlug = course?.slug || courseId;
    // Include lessonId in URL to auto-select the lesson
    router.push(`/course/${courseSlug}/module/${moduleId}?lesson=${lesson.id}`);
  };

  const handleDeleteThread = async (moduleId: string) => {
    if (!userId) {
      toast.error("User not found");
      return;
    }

    try {
      const response = await fetch(`/api/thread?userId=${userId}&moduleId=${moduleId}`, {
        method: "DELETE",
      });

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
    return <CollapsedPanel className={className} onToggleCollapse={onToggleCollapse} />;
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
    return <EmptyPanel className={className} onToggleCollapse={onToggleCollapse} />;
  }

  // Course list with accordion for modules
  return (
    <CourseList
      className={className}
      courses={courses}
      selectedCourse={selectedCourse}
      expandedModules={expandedModules}
      activeModuleId={activeModuleId}
      onSelectCourse={selectCourse}
      onToggleModule={toggleModule}
      onLessonClick={handleLessonClick}
      onToggleCollapse={onToggleCollapse}
      onDeleteThread={handleDeleteThread}
    />
  );
}
