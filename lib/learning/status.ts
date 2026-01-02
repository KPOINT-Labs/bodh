import type { LessonStatus, ModuleStatus } from "@/types/learning";

/**
 * Get background color class for lesson status indicator
 */
export function getStatusColor(status: LessonStatus): string {
  const colors: Record<LessonStatus, string> = {
    completed: "bg-green-500",
    seen: "bg-blue-400",
    attempted: "bg-blue-500",
    in_progress: "bg-yellow-500",
    not_started: "bg-gray-300",
  };
  return colors[status] || "bg-gray-300";
}

/**
 * Get display text for lesson status
 */
export function getStatusText(status: LessonStatus): string {
  const texts: Record<LessonStatus, string> = {
    completed: "Completed",
    seen: "Seen",
    attempted: "Attempted",
    in_progress: "In Progress",
    not_started: "",
  };
  return texts[status] || "";
}

/**
 * Get text color class for lesson status
 */
export function getStatusTextColor(status: LessonStatus): string {
  const colors: Record<LessonStatus, string> = {
    completed: "text-green-500",
    seen: "text-blue-400",
    attempted: "text-blue-500",
    in_progress: "text-yellow-600",
    not_started: "text-gray-400",
  };
  return colors[status] || "text-gray-400";
}

/**
 * Get display text and color for module status
 */
export function getModuleStatusText(status: ModuleStatus): { text: string; color: string } {
  const statuses: Record<ModuleStatus, { text: string; color: string }> = {
    completed: { text: "Completed", color: "text-green-500" },
    in_progress: { text: "In Progress", color: "text-orange-500" },
    yet_to_start: { text: "Yet to start", color: "text-gray-400" },
  };
  return statuses[status] || { text: "", color: "" };
}
