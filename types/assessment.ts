/**
 * Assessment Types - Type definitions for warmup quizzes and in-lesson questions
 *
 * These types define the structure of quiz data stored in the lesson.quiz JSON field.
 */

export interface QuizOption {
  id: string;
  text: string;
}

export interface WarmupQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correct_option: string; // ID of the correct option
  feedback: string;
  chapter_id?: string; // Reference to a chapter if questions are organized by chapter
}

export interface InLessonQuestion {
  id: string;
  question: string;
  timestamp: number; // Timestamp in seconds when the question should trigger
  type: "mcq" | "text"; // MCQ = multiple choice, text = free-form answer
  options?: QuizOption[]; // Only for MCQ type
  correct_option?: string; // Only for MCQ type - ID of the correct option
  chapter_id?: string;
}

export interface LessonQuiz {
  chapters?: Array<{ id: string; title: string }>;
  warmup?: WarmupQuestion[];
  inlesson?: InLessonQuestion[];
}

// Assessment attempt types for tracking user progress
export type AssessmentType = "warmup" | "inlesson";

export interface AssessmentAttemptInput {
  odataUserId: string;
  lessonId: string;
  assessmentType: AssessmentType;
  questionId: string;
  answer?: string | null;
  isCorrect?: boolean | null;
  isSkipped?: boolean;
  feedback?: string | null;
}

// Quiz evaluation result from Sarvam/agent
export interface QuizEvaluationResult {
  questionId: string;
  isCorrect: boolean;
  feedback: string;
}
