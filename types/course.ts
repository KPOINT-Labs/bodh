// Status types aligned with Prisma schema
export type CourseStatus = "yet_to_start" | "in_progress" | "completed";
export type LessonStatus = "not_started" | "in_progress" | "completed";
export type LessonType = "lecture" | "quiz" | "flashcards" | "assignment";

// Lesson progress details
export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  status: LessonStatus;
  watchTime: number;
  completionPercentage: number;
  lastPosition: number | null;
  lastAccessedAt: Date | null;
  completedAt: Date | null;
}

// Lesson with optional progress data
export interface LessonWithProgress {
  id: string;
  moduleId: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  type: string;
  orderIndex: number;
  duration: number | null;
  isPublished: boolean;
  progress?: LessonProgress | null;
}

// Module containing lessons
export interface ModuleWithLessons {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description: string | null;
  orderIndex: number;
  isPublished: boolean;
  lessons: LessonWithProgress[];
}

// Course with calculated progress
export interface CourseWithProgress {
  id: string;
  course_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  difficulty: string;
  estimatedDuration: number;
  progress: number; // 0-100
  status: CourseStatus;
  enrolledAt?: Date;
  totalLessons: number;
  completedLessons: number;
}

// Available course for enrollment
export interface AvailableCourse {
  id: string;
  course_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  difficulty: string;
  estimatedDuration: number;
  _count?: {
    lessons: number;
  };
}

// Detailed course with modules and lessons
export interface CourseDetail {
  id: string;
  course_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  difficulty: string;
  estimatedDuration: number;
  modules: ModuleWithLessons[];
  progress: number;
  status: CourseStatus;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}