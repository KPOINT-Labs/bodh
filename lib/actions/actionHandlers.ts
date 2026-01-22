/**
 * Action Handlers - Handler functions for each action type
 *
 * Each handler receives the button ID, metadata, and dependencies.
 * Dependencies are injected from the component using the hook.
 */

import type { Lesson } from "@/types/chat";
import type { ActionType } from "./actionRegistry";

// Dependencies injected from ModuleContent
export interface ActionDependencies {
  seekTo: (seconds: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  selectLesson: (lesson: Lesson) => void;
  sendTextToAgent: (message: string) => Promise<void>;
  addUserMessage: (message: string, messageType?: string, inputType?: string) => Promise<void>;
  startTour: () => void;
  startWarmup?: () => Promise<void>; // Start DB-driven warmup quiz
}

type ActionHandler = (
  buttonId: string,
  metadata: Record<string, unknown>,
  deps: ActionDependencies
) => void | Promise<void>;

export const ACTION_HANDLERS: Record<ActionType, ActionHandler> = {
  course_welcome: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "see_intro":
        deps.selectLesson(metadata.introLesson as Lesson);
        break;
      case "skip_to_lesson":
        deps.selectLesson(metadata.firstLesson as Lesson);
        break;
      case "take_tour":
        deps.startTour();
        break;
    }
  },

  course_welcome_back: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "continue":
        deps.selectLesson(metadata.lastLesson as Lesson);
        // Small delay to let video player initialize
        setTimeout(() => {
          // Use explicit check for undefined/null to handle position 0 correctly
          const position = metadata.lastPosition as number | undefined;
          if (position !== undefined && position !== null) {
            deps.seekTo(position);
          }
          deps.playVideo();
        }, 500);
        break;
      case "take_tour":
        deps.startTour();
        break;
    }
  },

  lesson_welcome: async (buttonId, _metadata, deps) => {
    switch (buttonId) {
      case "start_warmup":
        // Start DB-driven warmup quiz if available
        if (deps.startWarmup) {
          await deps.startWarmup();
        } else {
          // Fallback: just play the video
          deps.playVideo();
        }
        break;
      case "skip":
        deps.playVideo();
        break;
    }
  },

  lesson_welcome_back: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "continue":
        // Use explicit check for undefined/null to handle position 0 correctly
        const position = metadata.lastPosition as number | undefined;
        if (position !== undefined && position !== null) {
          deps.seekTo(position);
        }
        deps.playVideo();
        break;
      case "restart":
        deps.seekTo(0);
        deps.playVideo();
        break;
    }
  },

  fa_intro: async (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "start":
        // Display user message in chat UI
        await deps.addUserMessage("Ask me a formative assessment", "fa", "auto");
        // Send FA request to agent
        const topic = metadata.topic as string;
        const agentMessage = `
          Be in assessment mode.

          Generate EXACTLY 3 questions on ${topic} (use mixed question types if needed).
          Ask questions one by one.
          If the user answers 2 questions correctly, stop the assessment and provide feedback.

          IMPORTANT:
          - Do NOT tell the user about the 3 question limit or the 2 correct answers threshold.
          - Do NOT mention "I will ask 3 questions" or similar.
          - Just start with the first question naturally.
          - Give answer explanation in strictly 2 sentences.

          User query: Ask me a formative assessment on "${topic}".
        `.trim();
        await deps.sendTextToAgent(agentMessage);
        break;
      case "skip":
        deps.playVideo();
        break;
    }
  },

  concept_check: async (buttonId, _metadata, deps) => {
    switch (buttonId) {
      case "submit":
        // Submit will be handled by the concept check UI component
        // This is a placeholder for future implementation
        break;
      case "skip":
        deps.playVideo();
        break;
    }
  },

  lesson_complete: async (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "assessment":
        await deps.addUserMessage("Take assessment on this lesson", "fa", "auto");
        await deps.sendTextToAgent("Start a lesson assessment. Ask 5 questions covering the main topics.");
        break;
      case "warmup_next":
        await deps.addUserMessage("Warm-up for next lesson", "warmup", "auto");
        await deps.sendTextToAgent(
          `Start a warm-up quiz to prepare for the next lesson. Ask 3 quick questions based on what we just learned.`
        );
        break;
      case "next_lesson":
        deps.selectLesson(metadata.nextLesson as Lesson);
        break;
    }
  },

  assessment_complete: (buttonId, _metadata, _deps) => {
    switch (buttonId) {
      case "view_feedback":
        // Feedback display will be handled by the assessment UI
        // This is a placeholder for future implementation
        break;
    }
  },

  feedback_complete: (buttonId, metadata, deps) => {
    switch (buttonId) {
      case "review":
        // Review content display will be handled by the feedback UI
        // This is a placeholder for future implementation
        break;
      case "next_lesson":
        deps.selectLesson(metadata.nextLesson as Lesson);
        break;
    }
  },
};
