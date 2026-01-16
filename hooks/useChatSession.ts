"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type MessageData, storeMessage } from "@/lib/chat/message-store";

// Counter for generating unique temp IDs (prevents duplicates when called in same millisecond)
let tempIdCounter = 0;

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
  const [chatMessages, setChatMessages] = useState<MessageData[]>([]);
  const [isSending, setIsSending] = useState(false);

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
  const addAssistantMessage = useCallback(
    async (message: string, messageType: string = "general") => {
      const convId = conversationIdRef.current;
      if (!convId) {
        console.error("Conversation not ready");
        return;
      }

      // Optimistically add to UI with temp ID (use counter to ensure uniqueness)
      const tempId = `assistant-${Date.now()}-${++tempIdCounter}`;
      const assistantMessage: MessageData = {
        id: tempId,
        conversationId: convId,
        role: "assistant",
        content: message,
        inputType: "text",
        messageType: messageType,
        createdAt: new Date().toISOString(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);

      // Store in database
      try {
        const savedMessage = await storeMessage(convId, "assistant", message, {
          inputType: "text",
          messageType,
        });
        console.log("[ChatSession] Assistant message stored in DB:", savedMessage.id);

        // Update the temp ID with the real ID
        setChatMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, id: savedMessage.id } : msg))
        );
      } catch (error) {
        console.error("[ChatSession] Failed to store assistant message:", error);
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
  };
}
