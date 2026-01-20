/**
 * Action Registry - Centralized configuration for all action button types
 *
 * This file defines all action types, their button configurations, and types.
 * To add a new action type:
 * 1. Add the type to ActionType union
 * 2. Add entry to ACTION_REGISTRY with buttons
 * 3. Add handler to actionHandlers.ts
 */

// Action button configuration
export interface ActionButton {
  id: string; // Unique ID for handler lookup (e.g., "continue", "skip")
  label: string; // Display text (e.g., "Continue where you left")
  variant?: "primary" | "secondary"; // Styling - primary = filled, secondary = outline
}

// Registry entry for each action type
export interface ActionDefinition {
  buttons: ActionButton[];
  /** If true, buttons disappear after click. If false, buttons stay visible. Default: true */
  dismissAfterClick?: boolean;
}

// All possible action types
export type ActionType =
  | "course_welcome" // After intro welcome → "See the intro", "Continue to Lesson 1", "Take a tour"
  | "course_welcome_back" // Returning to course → "Continue learning", "Take a tour"
  | "lesson_welcome" // First time lesson 2+ → "Start warm-up", "Skip"
  | "lesson_welcome_back" // Returning to lesson → "Continue where left", "Start from beginning"
  | "fa_intro" // Mid-lesson FA trigger → "Start quick check", "Skip for now"
  | "concept_check" // Concept completion → "Submit", "Skip"
  | "lesson_complete" // After lesson ends → "Take assessment", "Warm-up", "Next lesson"
  | "assessment_complete" // After FA done → "View feedback"
  | "feedback_complete"; // After feedback → "Review now", "Continue to next"

// What gets stored in state
export interface PendingAction {
  type: ActionType;
  metadata?: Record<string, unknown>; // e.g., { lastPosition: 326, topic: "Iteration" }
}

// Central registry of all action configurations
export const ACTION_REGISTRY: Record<ActionType, ActionDefinition> = {
  // Session type actions
  course_welcome: {
    buttons: [
      { id: "see_intro", label: "See the intro", variant: "primary" },
      { id: "skip_to_lesson", label: "Continue to Lesson 1", variant: "secondary" },
      { id: "take_tour", label: "Take a tour", variant: "secondary" },
    ],
  },
  course_welcome_back: {
    buttons: [
      { id: "continue", label: "Continue learning", variant: "primary" },
      { id: "take_tour", label: "Take a tour", variant: "secondary" },
    ],
  },
  lesson_welcome: {
    buttons: [
      { id: "start_warmup", label: "Start warm-up", variant: "primary" },
      { id: "skip", label: "Skip", variant: "secondary" },
    ],
  },
  lesson_welcome_back: {
    buttons: [
      { id: "continue", label: "Continue where you left", variant: "primary" },
      { id: "restart", label: "Start from beginning", variant: "secondary" },
    ],
    dismissAfterClick: false, // Keep visible - user may want to use again
  },

  // Mid-lesson actions
  fa_intro: {
    buttons: [
      { id: "start", label: "Start quick check", variant: "primary" },
      { id: "skip", label: "Skip for now", variant: "secondary" },
    ],
  },
  concept_check: {
    buttons: [
      { id: "submit", label: "Submit", variant: "primary" },
      { id: "skip", label: "Skip", variant: "secondary" },
    ],
  },

  // Post-lesson actions
  lesson_complete: {
    buttons: [
      { id: "assessment", label: "Take assessment", variant: "primary" },
      { id: "warmup_next", label: "Warm-up for next lesson", variant: "secondary" },
      { id: "next_lesson", label: "Jump to next lesson", variant: "secondary" },
    ],
  },
  assessment_complete: {
    buttons: [
      { id: "view_feedback", label: "View feedback", variant: "primary" },
    ],
  },
  feedback_complete: {
    buttons: [
      { id: "review", label: "Review now", variant: "primary" },
      { id: "next_lesson", label: "Continue to next lesson", variant: "secondary" },
    ],
  },
};
