export interface Course {
  id: string;
  title: string;
  description: string;
  progress: number;
  duration: string;
  isActive?: boolean;
  status?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoId: string;
  duration: string;
  objective: string;
  learningObjectives: string[];
  analogy?: string;
  content: LessonContent[];
}

export interface LessonContent {
  id: string;
  type: "video" | "interactive" | "text" | "assessment";
  title: string;
  description: string;
  data: any; // Flexible data structure for different content types
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export interface UserProgress {
  courseId: string;
  lessonId: string;
  completed: boolean;
  timeSpent: number;
  lastAccessed: Date;
}