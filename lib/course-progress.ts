import {
  CourseStatus,
  LessonStatus,
  LessonWithProgress,
  LessonType,
} from "@/types/course";

/**
 * Calculate overall course progress from lesson progress
 * @param lessons Array of lessons with progress data
 * @returns Progress percentage (0-100)
 */
export function calculateCourseProgress(
  lessons: LessonWithProgress[]
): number {
  if (!lessons || lessons.length === 0) return 0;

  const completedCount = lessons.filter(
    (lesson) => lesson.progress?.status === "completed"
  ).length;

  return Math.round((completedCount / lessons.length) * 100);
}

/**
 * Determine course status based on progress
 * @param progress Progress percentage (0-100)
 * @param completedLessons Number of completed lessons
 * @returns Course status
 */
export function getCourseStatus(
  progress: number,
  completedLessons: number
): CourseStatus {
  if (completedLessons === 0) return "yet_to_start";
  if (progress === 100) return "completed";
  return "in_progress";
}

/**
 * Get lesson status display information
 * @param lessonProgress Lesson progress object
 * @param lessonType Type of lesson
 * @returns Object with color, label, and badge variant
 */
export function getLessonStatusInfo(
  lessonProgress: LessonWithProgress["progress"],
  lessonType: string
) {
  if (!lessonProgress || lessonProgress.status === "not_started") {
    return {
      color: "bg-gray-400",
      label: "Not Started",
      badgeVariant: "secondary" as const,
      textColor: "text-gray-600",
    };
  }

  const status = lessonProgress.status;

  // Completed lessons
  if (status === "completed") {
    // Different colors based on lesson type
    if (lessonType === "flashcards") {
      return {
        color: "bg-purple-500",
        label: "Seen",
        badgeVariant: "default" as const,
        textColor: "text-green-600",
      };
    }
    if (lessonType === "quiz") {
      return {
        color: "bg-blue-500",
        label: "Attempted",
        badgeVariant: "default" as const,
        textColor: "text-green-600",
      };
    }
    // Default for lectures and other types
    return {
      color: "bg-green-500",
      label: "Completed",
      badgeVariant: "default" as const,
      textColor: "text-green-600",
    };
  }

  // In progress
  return {
    color: "bg-yellow-500",
    label: "In Progress",
    badgeVariant: "secondary" as const,
    textColor: "text-yellow-600",
  };
}

/**
 * Format duration in minutes to human-readable string
 * @param minutes Duration in minutes
 * @returns Formatted string like "15 min" or "1h 30min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

/**
 * Get status badge color based on course status
 * @param status Course status
 * @returns Tailwind color classes
 */
export function getStatusBadgeColor(status: CourseStatus): string {
  switch (status) {
    case "completed":
      return "text-green-600 bg-green-50";
    case "in_progress":
      return "text-yellow-600 bg-yellow-50";
    case "yet_to_start":
      return "text-gray-600 bg-gray-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

/**
 * Get status label for display
 * @param status Course status
 * @returns Display label
 */
export function getStatusLabel(status: CourseStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In Progress";
    case "yet_to_start":
      return "Yet to start";
    default:
      return "Yet to start";
  }
}
