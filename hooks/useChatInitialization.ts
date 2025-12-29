import { useState, useEffect, useRef } from "react";
import {
  initializeChatSession,
  storeMessage,
  type MessageData,
} from "@/lib/chat/message-store";
import type { Course, Module, Lesson } from "@/types/chat";

interface UseChatInitializationOptions {
  course: Course;
  module: Module;
  userId: string;
  firstLesson?: Lesson;
  onConversationReady?: (conversationId: string) => void;
}

interface UseChatInitializationReturn {
  historyMessages: MessageData[];
  latestMessage: string;
  isLoading: boolean;
  isReturningUser: boolean;
}

/**
 * Hook for initializing chat session and generating welcome messages
 * Handles both new users and returning users
 */
export function useChatInitialization(
  options: UseChatInitializationOptions
): UseChatInitializationReturn {
  const { course, module, userId, firstLesson, onConversationReady } = options;

  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [latestMessage, setLatestMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initializeChat() {
      try {
        // Initialize chat session (get/create thread and conversation)
        const { conversation } = await initializeChatSession({
          userId,
          moduleId: module.id,
          contextType: "welcome",
        });

        // Notify parent that conversation is ready
        onConversationReady?.(conversation.id);

        if (conversation.messages.length > 0) {
          // Returning user - load previous messages
          setIsReturningUser(true);
          setHistoryMessages(conversation.messages);

          // Generate welcome back message
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "welcome_back",
              context: {
                courseTitle: course.title,
                moduleTitle: module.title,
                lastLesson: firstLesson?.title,
              },
            }),
          });

          const data = await response.json();
          setLatestMessage(
            data.success
              ? data.message
              : `Welcome back! Ready to continue with ${module.title}?`
          );
        } else {
          // First-time user - generate welcome message
          setIsReturningUser(false);

          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "welcome",
              context: {
                courseTitle: course.title,
                courseDescription: course.description,
                learningObjectives: course.learningObjectives,
                moduleTitle: module.title,
                lessonTitle: firstLesson?.title,
                lessonNumber: firstLesson
                  ? firstLesson.orderIndex + 1
                  : undefined,
              },
            }),
          });

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || "Failed to generate summary");
          }

          // Store the welcome message
          const fullMessage = `Welcome to ${course.title}!\n${data.message}`;
          await storeMessage(conversation.id, "assistant", fullMessage);
          setLatestMessage(fullMessage);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
        setLatestMessage(
          course.description ||
            "Welcome to this course! Let's begin your learning journey."
        );
        setIsLoading(false);
      }
    }

    initializeChat();
  }, [course, module, userId, firstLesson, onConversationReady]);

  return { historyMessages, latestMessage, isLoading, isReturningUser };
}
