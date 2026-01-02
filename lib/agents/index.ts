/**
 * Agents Module
 *
 * This module exports all AI agents used in the application.
 * Uses Google Gemini (gemini-2.0-flash) as the underlying LLM.
 */

export {
  createCourseWelcomeAgent,
  createReturningStudentAgent,
  generateCourseSummary,
  generateWelcomeBackMessage,
} from "./course-welcome-agent";

export type { CourseContext } from "./prompts";
export {
  getCourseWelcomePrompt,
  getReturningStudentPrompt,
} from "./prompts";
