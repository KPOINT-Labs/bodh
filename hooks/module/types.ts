"use client";

import type { ActionType } from "@/lib/actions/actionRegistry";
import type { WarmupQuestion } from "@/types/assessment";

export type LiveKitEvent =
  | {
      type: "LIVEKIT/CONNECTED";
    }
  | {
      type: "LIVEKIT/DISCONNECTED";
    }
  | {
      type: "LIVEKIT/TRANSCRIPT_PARTIAL";
      text: string;
      segmentId: string;
    }
  | {
      type: "LIVEKIT/TRANSCRIPT_FINAL";
      text: string;
      segmentId: string;
    }
  | {
      type: "LIVEKIT/USER_TRANSCRIPT_PARTIAL";
      text: string;
    }
  | {
      type: "LIVEKIT/USER_TRANSCRIPT_FINAL";
      text: string;
    }
  | {
      type: "LIVEKIT/AGENT_SPEAKING_START";
    }
  | {
      type: "LIVEKIT/AGENT_SPEAKING_END";
    }
  | {
      type: "LIVEKIT/FA_INTRO_COMPLETE";
      topic: string;
      introMessage: string;
    };

export type ChatEvent =
  | {
      type: "CHAT/USER_MESSAGE_SENT";
      text: string;
      messageType: string;
      inputType: string;
    }
  | {
      type: "CHAT/ASSISTANT_MESSAGE_ADDED";
      messageId: string;
      text: string;
      messageType: string;
    }
  | {
      type: "CHAT/ADD_ASSISTANT_MESSAGE";
      text: string;
      messageType: string;
    };

export type ActionEvent =
  | {
      type: "ACTION/SHOW";
      actionType: ActionType;
      metadata?: Record<string, unknown>;
      anchorMessageId?: string;
    }
  | {
      type: "ACTION/DISMISS";
    }
  | {
      type: "ACTION/BUTTON_CLICKED";
      buttonId: string;
      actionType: ActionType;
    };

export type WarmupEvent =
  | {
      type: "WARMUP/START";
      questions: WarmupQuestion[];
    }
  | {
      type: "WARMUP/QUESTION_SHOWN";
      questionId: string;
      messageId: string;
    }
  | {
      type: "WARMUP/ANSWERED";
      questionId: string;
      answer: string;
      isCorrect: boolean;
    }
  | {
      type: "WARMUP/SKIPPED";
      questionId: string;
    }
  | {
      type: "WARMUP/COMPLETE";
      correctCount: number;
      totalCount: number;
      skippedCount: number;
    };

export type InlessonEvent =
  | {
      type: "INLESSON/QUESTION_TRIGGERED";
      questionId: string;
      question: string;
      questionType: "mcq" | "text";
      options?: { id: string; text: string }[];
      correctOption?: string;
    }
  | {
      type: "INLESSON/QUESTION_SHOWN";
      questionId: string;
      messageId: string;
    }
  | {
      type: "INLESSON/ANSWERED";
      questionId: string;
      answer: string;
      isCorrect: boolean | null;
    }
  | {
      type: "INLESSON/SKIPPED";
      questionId: string;
    }
  | {
      type: "INLESSON/EVALUATION_RESULT";
      questionId: string;
      isCorrect: boolean;
      feedback: string;
    };

export type PlayerEvent =
  | {
      type: "PLAYER/READY";
    }
  | {
      type: "PLAYER/PLAYING";
    }
  | {
      type: "PLAYER/PAUSED";
    }
  | {
      type: "PLAYER/ENDED";
    }
  | {
      type: "PLAYER/SEEK_REQUESTED";
      seconds: number;
    }
  | {
      type: "PLAYER/FA_TRIGGER";
      topic: string;
      timestampSeconds: number;
    };

export type SessionEvent =
  | {
      type: "SESSION/LESSON_SELECTED";
      lessonId: string;
    }
  | {
      type: "SESSION/PANEL_OPENED";
    }
  | {
      type: "SESSION/PANEL_CLOSED";
    }
  | {
      type: "SESSION/WELCOME_STORED";
      messageId?: string;
    }
  | {
      type: "SESSION/USER_INTERACTED";
      messageType: string;
    };

export type ModuleEvent =
  | LiveKitEvent
  | ChatEvent
  | ActionEvent
  | WarmupEvent
  | InlessonEvent
  | PlayerEvent
  | SessionEvent;

export interface ModuleState {
  isReturningUser: boolean;
  welcomeStored: boolean;
  welcomeMessageId?: string;
  userHasInteracted: boolean;
  lastUserMessageType: string;

  storedSegmentIds: string[];
  storedVoiceMessages: string[];

  activeInlessonQuestion: {
    questionId: string;
    messageId: string;
    type: "mcq" | "text";
    correctOption?: string;
  } | null;

  warmupState: {
    isActive: boolean;
    questions: WarmupQuestion[];
    currentIndex: number;
    questionMessageIds: Record<string, string>;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
  };

  showSuccessToast: boolean;
  showErrorToast: boolean;

  pendingAction: {
    type: ActionType;
    metadata?: Record<string, unknown>;
    anchorMessageId?: string;
  } | null;
}

export const INITIAL_MODULE_STATE: ModuleState = {
  isReturningUser: false,
  welcomeStored: false,
  welcomeMessageId: undefined,
  userHasInteracted: false,
  lastUserMessageType: "general",
  storedSegmentIds: [],
  storedVoiceMessages: [],
  activeInlessonQuestion: null,
  warmupState: {
    isActive: false,
    questions: [],
    currentIndex: 0,
    questionMessageIds: {},
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
  },
  showSuccessToast: false,
  showErrorToast: false,
  pendingAction: null,
};

export type EmitFn = (event: ModuleEvent) => void;

export interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
  duration?: number;
  quiz?: unknown;
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
