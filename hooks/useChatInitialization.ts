import { useState, useEffect, useRef, useCallback } from "react";
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
  isStreaming: boolean;
  isReturningUser: boolean;
}

/**
 * Hook for initializing chat session and generating welcome messages
 * Handles both new users and returning users
 * Streams responses with typing effect for smooth character-by-character display
 */
export function useChatInitialization(
  options: UseChatInitializationOptions
): UseChatInitializationReturn {
  const { course, module, userId, firstLesson, onConversationReady } = options;

  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [latestMessage, setLatestMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const hasInitialized = useRef(false);

  // Refs for typing effect
  const streamedTextRef = useRef("");
  const displayedIndexRef = useRef(0);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const prefixRef = useRef("");
  const streamDoneRef = useRef(false); // Track if stream fetch is complete

  // Typing speed in ms per character (lower = faster)
  const TYPING_SPEED = 1;

  // Start typing effect that reveals characters from streamedTextRef
  const startTypingEffect = useCallback(() => {
    if (typingIntervalRef.current) return; // Already running

    typingIntervalRef.current = setInterval(() => {
      const targetText = prefixRef.current + streamedTextRef.current;

      if (displayedIndexRef.current < targetText.length) {
        displayedIndexRef.current++;
        setLatestMessage(targetText.slice(0, displayedIndexRef.current));
      } else if (streamDoneRef.current) {
        // Stream finished AND all characters displayed - NOW we can stop
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        // Only set isStreaming to false when typing is complete
        setIsStreaming(false);
      }
    }, TYPING_SPEED);
  }, []);

  // Cleanup typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Start typing effect when streaming begins
  useEffect(() => {
    if (isStreaming) {
      startTypingEffect();
    }
  }, [isStreaming, startTypingEffect]);

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

        conversationIdRef.current = conversation.id;

        // Notify parent that conversation is ready
        onConversationReady?.(conversation.id);

        if (conversation.messages.length > 0) {
          // Returning user - load previous messages
          setIsReturningUser(true);
          setHistoryMessages(conversation.messages);
          setIsLoading(false);
          setIsStreaming(true);

          // Reset typing state
          prefixRef.current = "";
          streamedTextRef.current = "";
          displayedIndexRef.current = 0;
          streamDoneRef.current = false;

          // Stream welcome back message
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "welcome_back",
              stream: true,
              context: {
                courseTitle: course.title,
                moduleTitle: module.title,
                lastLesson: firstLesson?.title,
              },
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to stream welcome back message");
          }

          // Consume stream and update ref (typing effect will read from ref)
          await consumeStreamToRef(response, streamedTextRef);
          // Mark stream as done - typing effect will set isStreaming=false when complete
          streamDoneRef.current = true;
        } else {
          // First-time user - stream welcome message
          setIsReturningUser(false);
          setIsLoading(false);
          setIsStreaming(true);

          // Set initial prefix
          prefixRef.current = `Welcome to ${course.title}!\n`;
          streamedTextRef.current = "";
          displayedIndexRef.current = 0;
          streamDoneRef.current = false;

          const response = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "welcome",
              stream: true,
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

          if (!response.ok) {
            throw new Error("Failed to stream welcome message");
          }

          // Consume stream and update ref
          await consumeStreamToRef(response, streamedTextRef);

          // Store the complete welcome message
          const fullMessage = prefixRef.current + streamedTextRef.current;
          await storeMessage(conversation.id, "assistant", fullMessage);

          // Mark stream as done - typing effect will set isStreaming=false when complete
          streamDoneRef.current = true;
        }
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
        setLatestMessage(
          course.description ||
            "Welcome to this course! Let's begin your learning journey."
        );
        setIsLoading(false);
        setIsStreaming(false);
      }
    }

    initializeChat();
  }, [course, module, userId, firstLesson, onConversationReady]);

  return { historyMessages, latestMessage, isLoading, isStreaming, isReturningUser };
}

/**
 * Helper to consume a streaming response and update a ref (for typing effect)
 */
async function consumeStreamToRef(
  response: Response,
  textRef: React.MutableRefObject<string>
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No reader available");
  }

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    textRef.current += chunk;
  }

  return textRef.current;
}
