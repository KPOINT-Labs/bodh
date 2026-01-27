/**
 * Action Handlers - Type definitions for action handler dependencies
 *
 * Note: Actual handlers are registered in ModuleContent.tsx's ActionHandlerRegistry
 * component, which has direct access to local state and functions.
 */

import type { Lesson } from "@/types/chat";

// Dependencies injected from ModuleContent
export interface ActionDependencies {
  seekTo: (seconds: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  selectLesson: (lesson: Lesson) => void;
  navigateToLesson: (lesson: Lesson & { moduleId?: string }, courseId: string) => void; // Cross-module navigation
  sendTextToAgent: (message: string) => Promise<void>;
  addUserMessage: (message: string, messageType?: string, inputType?: string) => Promise<void>;
  startTour: () => void;
  startWarmup?: () => Promise<void>; // Start DB-driven warmup quiz
  getLastAssistantMessageId?: () => string | undefined;
}
