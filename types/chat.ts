/**
 * Shared types for chat components
 */

export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  learningObjectives?: string[];
}

export interface ChatAgentProps {
  course: Course;
  module: Module;
  userId: string;
  onLessonSelect: (lesson: Lesson) => void;
  onConversationReady?: (conversationId: string) => void;
  chatMessages?: MessageData[];
  isWaitingForResponse?: boolean;
}

import type { QuizOption } from "./assessment";
import type { ActionType } from "@/lib/actions/actionRegistry";

export interface MessageData {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  inputType: string;
  messageType: string;
  createdAt: string;
  // Optional metadata for in-lesson/warmup questions (not persisted to DB)
  metadata?: {
    questionId?: string;
    questionType?: "mcq" | "text";
    options?: QuizOption[];
    correctOption?: string;
    userAnswer?: string;
    isAnswered?: boolean;
    isSkipped?: boolean;
  };
  // V2 Action fields - actions stored directly on messages
  action?: ActionType;
  actionMetadata?: Record<string, unknown>;
  actionStatus?: "pending" | "handled" | "dismissed";
  actionHandledButtonId?: string;
}
