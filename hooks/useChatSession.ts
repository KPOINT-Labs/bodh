"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type MessageData, storeMessage } from "@/lib/chat/message-store";
import type { QuizOption } from "@/types/assessment";
import type { ActionType } from "@/lib/actions/actionRegistry";
import { useTTS } from "@/hooks/useTTS";

// Counter for generating unique temp IDs (prevents duplicates when called in same millisecond)
let tempIdCounter = 0;

// Extended message data for local UI state (includes metadata for in-lesson questions)
export interface ExtendedMessageData extends MessageData {
  metadata?: {
    questionId?: string;
    questionType?: "mcq" | "text";
    options?: QuizOption[];
    correctOption?: string;
    isAnswered?: boolean;
    isSkipped?: boolean;
  };
  // V2 Action fields - actions stored directly on messages
  action?: ActionType;
  actionMetadata?: Record<string, unknown>;
  actionStatus?: "pending" | "handled" | "dismissed";
  actionHandledButtonId?: string;
}

// Options for addAssistantMessage
export interface AddAssistantMessageOptions {
  messageType?: string;
  action?: ActionType;
  actionMetadata?: Record<string, unknown>;
  /** When true, automatically plays TTS for this message using default voice settings */
  tts?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  orderIndex: number;
  kpointVideoId?: string | null;
  youtubeVideoId?: string | null;
  description?: string | null;
}

interface UseChatSessionOptions {
  courseId: string;
  conversationId: string | null;
  selectedLesson: Lesson | null;
  lessons: Lesson[];
  getCurrentTime: () => number;
}

/**
 * Hook to manage chat session state and message sending
 * Handles optimistic updates and API communication
 */
export function useChatSession({
  courseId,
  conversationId,
  selectedLesson,
  lessons,
  getCurrentTime,
}: UseChatSessionOptions) {
  const [chatMessages, setChatMessages] = useState<ExtendedMessageData[]>([]);
  const [isSending, setIsSending] = useState(false);
  const lastAssistantMessageIdRef = useRef<string | undefined>(undefined);

  // TTS hook for automatic text-to-speech on messages with tts: true
  const { speak } = useTTS();

  // Use refs for values that change but shouldn't recreate sendMessage
  const conversationIdRef = useRef(conversationId);
  const courseIdRef = useRef(courseId);
  const selectedLessonRef = useRef(selectedLesson);
  const lessonsRef = useRef(lessons);
  const getCurrentTimeRef = useRef(getCurrentTime);

  // Keep refs updated
  useEffect(() => {
    conversationIdRef.current = conversationId;
    courseIdRef.current = courseId;
    selectedLessonRef.current = selectedLesson;
    lessonsRef.current = lessons;
    getCurrentTimeRef.current = getCurrentTime;
  });

  // Stable sendMessage - never recreated
  // isAnswer: true when user is answering an FA question (not starting a new assessment)
  const sendMessage = useCallback(
    async (message: string, taskGraphType?: "QnA" | "FA", isAnswer?: boolean) => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return;
      }

      // Always show user message with a temporary ID
      const tempUserMessage: MessageData = {
        id: `temp-${Date.now()}`,
        conversationId: convId,
        role: "user",
        content: message,
        inputType: "text",
        messageType: taskGraphType?.toLowerCase() || "general",
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, tempUserMessage]);

      setIsSending(true);

      try {
        // Build video IDs array - use selected lesson or fallback to first lesson
        const videoIds: string[] = [];
        const currentLessons = lessonsRef.current;
        const activeLesson =
          selectedLessonRef.current || currentLessons.sort((a, b) => a.orderIndex - b.orderIndex)[0];

        if (activeLesson?.youtubeVideoId) {
          videoIds.push(activeLesson.youtubeVideoId);
        }

        console.log("Active lesson:", activeLesson?.title, "YouTube ID:", activeLesson?.youtubeVideoId);

        // Get current video timestamp
        const startTimestamp = getCurrentTimeRef.current();

        console.log(
          "Sending message - videoIds:",
          videoIds,
          "startTimestamp:",
          startTimestamp,
          "taskGraphType:",
          taskGraphType,
          "isAnswer:",
          isAnswer
        );

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: convId,
            courseId: courseIdRef.current,
            taskGraphType,
            videoIds,
            startTimestamp,
            isAnswer: isAnswer || false,
          }),
        });

        const data = await response.json();

        if (data.success) {
          setChatMessages((prev) => [...prev, data.assistantMessage]);
        } else {
          console.error("Chat error:", data.error);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [] // Empty deps - sendMessage is now stable
  );

  // Send FA message without showing user message in chat UI
  const sendFAMessage = useCallback(
    async (message: string, timestampSeconds?: number) => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return;
      }

      setIsSending(true);

      try {
        // Build video IDs array - use selected lesson or fallback to first lesson
        const videoIds: string[] = [];
        const currentLessons = lessonsRef.current;
        const activeLesson =
          selectedLessonRef.current || currentLessons.sort((a, b) => a.orderIndex - b.orderIndex)[0];

        if (activeLesson?.youtubeVideoId) {
          videoIds.push(activeLesson.youtubeVideoId);
        }

        // Use provided timestamp or get current video timestamp
        const startTimestamp = timestampSeconds ?? getCurrentTimeRef.current();

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            conversationId: convId,
            courseId: courseIdRef.current,
            taskGraphType: "FA",
            videoIds,
            startTimestamp,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Only show the assistant message, not the user message
          setChatMessages((prev) => [...prev, data.assistantMessage]);
        } else {
          console.error("FA message error:", data.error);
        }
      } catch (error) {
        console.error("Failed to send FA message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [] // Empty deps - sendFAMessage is now stable
  );

  // Add user message to chat and store in DB (for LiveKit flow)
  const addUserMessage = useCallback(
    async (message: string, messageType: string = "general", inputType: string = "text") => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return;
      }

      // Optimistically add to UI with temp ID (use counter to ensure uniqueness)
      const tempId = `user-${Date.now()}-${++tempIdCounter}`;
      const userMessage: MessageData = {
        id: tempId,
        conversationId: convId,
        role: "user",
        content: message,
        inputType: inputType,
        messageType: messageType,
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, userMessage]);

      console.log("[ChatSession] addUserMessage", {
        tempId,
        messageType,
      });

      // Store in database
      try {
        const savedMessage = await storeMessage(convId, "user", message, {
          inputType,
          messageType,
        });
        console.log("[ChatSession] User message stored in DB:", savedMessage.id);

        // Update the temp ID with the real ID
        setChatMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, id: savedMessage.id } : msg))
        );
      } catch (error) {
        console.error("[ChatSession] Failed to store user message:", error);
      }
    },
    []
  );

  // Add assistant message to chat and store in DB (for LiveKit agent transcript)
  // V2: Now accepts options object with optional action fields
  // V3: Supports tts: true for automatic text-to-speech
  const addAssistantMessage = useCallback(
    async (
      message: string,
      options: AddAssistantMessageOptions | string = "general"
    ): Promise<string | undefined> => {
      // Handle legacy string parameter for backward compatibility
      const opts: AddAssistantMessageOptions =
        typeof options === "string" ? { messageType: options } : options;

      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return undefined;
      }

      // Optimistically add to UI with temp ID (use counter to ensure uniqueness)
      const tempId = `assistant-${Date.now()}-${++tempIdCounter}`;
      lastAssistantMessageIdRef.current = tempId;
      const assistantMessage: ExtendedMessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: message,
        inputType: "text",
        messageType: opts.messageType || "general",
        createdAt: new Date().toISOString(),
        // V2: Add action fields if provided
        action: opts.action,
        actionMetadata: opts.actionMetadata,
        actionStatus: opts.action ? "pending" : undefined,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      console.log("[ChatSession] addAssistantMessage", {
        tempId,
        messageType: opts.messageType,
        action: opts.action,
        tts: opts.tts,
      });

      // Play TTS if enabled (for fresh messages only - this function is only called for new messages)
      if (opts.tts) {
        speak(message);
      }

      // Store in database
      try {
        const savedMessage = await storeMessage(convId, "assistant", message, {
          inputType: "text",
          messageType: opts.messageType || "general",
          // V2: Store action fields
          action: opts.action,
          actionMetadata: opts.actionMetadata,
          actionStatus: opts.action ? "pending" : undefined,
        });
        console.log("[ChatSession] Assistant message stored in DB:", savedMessage.id);
        lastAssistantMessageIdRef.current = savedMessage.id;

        // Update the temp ID with the real ID
        setChatMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, id: savedMessage.id } : msg))
        );
        return savedMessage.id;
      } catch (error) {
        console.error("[ChatSession] Failed to store assistant message:", error);
      }
      return tempId;
    },
    [speak]
  );

  const getLastAssistantMessageId = useCallback(() => lastAssistantMessageIdRef.current, []);

  // Add in-lesson question to chat (local only - not stored in DB initially)
  // The question will be stored as an attempt when answered
  const addInlessonQuestion = useCallback(
    (question: {
      id: string;
      question: string;
      type: "mcq" | "text";
      options?: QuizOption[];
      correctOption?: string;
    }) => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return null;
      }

      const tempId = `inlesson-${Date.now()}-${++tempIdCounter}`;
      const inlessonMessage: ExtendedMessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: question.question,
        inputType: "text",
        messageType: "inlesson",
        createdAt: new Date().toISOString(),
        metadata: {
          questionId: question.id,
          questionType: question.type,
          options: question.options,
          correctOption: question.correctOption,
          isAnswered: false,
          isSkipped: false,
        },
      };

      console.log("[ChatSession] Adding in-lesson question to chat:", {
        questionId: question.id,
        type: question.type,
      });

      setChatMessages((prev) => [...prev, inlessonMessage]);
      return tempId;
    },
    []
  );

  // Mark an in-lesson question as answered
  const markInlessonAnswered = useCallback((messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.metadata
          ? { ...msg, metadata: { ...msg.metadata, isAnswered: true } }
          : msg
      )
    );
  }, []);

  // Mark an in-lesson question as skipped
  const markInlessonSkipped = useCallback((messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.metadata
          ? { ...msg, metadata: { ...msg.metadata, isSkipped: true } }
          : msg
      )
    );
  }, []);

  // Add feedback message for in-lesson answer
  // V2: Now supports optional action fields
  const addInlessonFeedback = useCallback(
    (isCorrect: boolean, feedback: string, actionOptions?: { action?: ActionType; actionMetadata?: Record<string, unknown> }) => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return;
      }

      const tempId = `inlesson-feedback-${Date.now()}-${++tempIdCounter}`;
      const feedbackMessage: ExtendedMessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: `${isCorrect ? "**Correct!**" : "**Not quite.**"} ${feedback}`,
        inputType: "text",
        messageType: "inlesson_feedback",
        createdAt: new Date().toISOString(),
        // V2: Add action fields if provided
        action: actionOptions?.action,
        actionMetadata: actionOptions?.actionMetadata,
        actionStatus: actionOptions?.action ? "pending" : undefined,
      };

      setChatMessages((prev) => [...prev, feedbackMessage]);
      return tempId;
    },
    []
  );

  // Add warmup question to chat (same as in-lesson but with warmup type)
  const addWarmupQuestion = useCallback(
    (question: {
      id: string;
      question: string;
      options?: QuizOption[];
      correctOption?: string;
    }) => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return null;
      }

      const tempId = `warmup-${Date.now()}-${++tempIdCounter}`;
      const warmupMessage: ExtendedMessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: question.question,
        inputType: "text",
        messageType: "warmup_mcq",
        createdAt: new Date().toISOString(),
        metadata: {
          questionId: question.id,
          questionType: "mcq",
          options: question.options,
          correctOption: question.correctOption,
          isAnswered: false,
          isSkipped: false,
        },
      };

      console.log("[ChatSession] Adding warmup question to chat:", {
        questionId: question.id,
      });

      setChatMessages((prev) => [...prev, warmupMessage]);
      return tempId;
    },
    []
  );

  // Mark a warmup question as answered
  const markWarmupAnswered = useCallback((messageId: string, userAnswer?: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.metadata
          ? { ...msg, metadata: { ...msg.metadata, isAnswered: true, userAnswer } }
          : msg
      )
    );
  }, []);

  // Mark a warmup question as skipped
  const markWarmupSkipped = useCallback((messageId: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId && msg.metadata
          ? { ...msg, metadata: { ...msg.metadata, isSkipped: true } }
          : msg
      )
    );
  }, []);

  // Add feedback message for warmup answer
  const addWarmupFeedback = useCallback(
    (isCorrect: boolean, feedback: string) => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return;
      }

      const tempId = `warmup-feedback-${Date.now()}-${++tempIdCounter}`;
      const feedbackMessage: ExtendedMessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: `${isCorrect ? "**Correct!**" : "**Not quite.**"} ${feedback}`,
        inputType: "text",
        messageType: "warmup_feedback",
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, feedbackMessage]);
      return tempId;
    },
    []
  );

  // V2: Update action status on a message (local state + DB)
  const updateMessageAction = useCallback(
    async (
      messageId: string,
      status: "handled" | "dismissed",
      buttonId?: string
    ) => {
      // Debug: Log message count before update
      console.log("[ChatSession] updateMessageAction - messageId:", messageId, "chatMessages count:", chatMessages.length);

      // Update local state immediately (optimistic)
      setChatMessages((prev) => {
        console.log("[ChatSession] updateMessageAction - prev messages:", prev.length);
        const updated = prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                actionStatus: status,
                actionHandledButtonId: buttonId,
              }
            : m
        );
        console.log("[ChatSession] updateMessageAction - updated messages:", updated.length);
        return updated;
      });
      console.log("[ChatSession] updateMessageAction", { messageId, status, buttonId });

      // Persist to DB (skip temp IDs that haven't been saved yet)
      if (!messageId.startsWith("temp-") && !messageId.startsWith("assistant-")) {
        const { updateMessageActionStatus } = await import("@/lib/actions/message");
        const result = await updateMessageActionStatus(messageId, status, buttonId);
        if (!result.success) {
          console.error("[ChatSession] Failed to persist action status:", result.error);
        }
      }
    },
    []
  );

  return {
    chatMessages,
    setChatMessages,
    isSending,
    sendMessage,
    sendFAMessage,
    addUserMessage,
    addAssistantMessage,
    addInlessonQuestion,
    markInlessonAnswered,
    markInlessonSkipped,
    addInlessonFeedback,
    getLastAssistantMessageId,
    // Warmup support
    addWarmupQuestion,
    markWarmupAnswered,
    markWarmupSkipped,
    addWarmupFeedback,
    // V2: Action support
    updateMessageAction,
  };
}
