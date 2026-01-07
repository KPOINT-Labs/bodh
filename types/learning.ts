/**
 * Shared types for learning components
 */

export type LessonStatus = "completed" | "seen" | "attempted" | "in_progress" | "not_started";
export type ModuleStatus = "completed" | "in_progress" | "yet_to_start";
export type CourseStatus = "completed" | "in_progress" | "yet_to_start";

export interface Lesson {
  id: string;
  title: string;
  type: string;
  status: LessonStatus;
}

export interface Module {
  id: string;
  title: string;
  status: ModuleStatus;
  lessonCount: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  slug?: string | null;
  progress: number;
  status: CourseStatus;
  totalDuration?: number; // Duration in minutes
  modules: Module[];
}

export interface PeerLearningPanelProps {
  className?: string;
  userId?: string;
  activeCourseId?: string;
  activeModuleId?: string;
  activeLessonId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}
