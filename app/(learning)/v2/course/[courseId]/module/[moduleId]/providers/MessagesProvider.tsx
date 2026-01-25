"use client";

import { useRoomContext } from "@livekit/components-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLearningPanel } from "@/contexts/LearningPanelContext";
import {
  initializeChatSession,
  type MessageData,
} from "@/lib/chat/message-store";
import { useChat } from "../hooks/useChat";
import { type FAResponse, type QuizMessage, useQuiz } from "../hooks/useQuiz";
import { useModuleContext } from "./ModuleProvider";

// ============================================================================
// Types
// ============================================================================

export type ChatItem =
  | { type: "message"; data: MessageData }
  | { type: "quiz"; data: QuizMessage };

interface MessagesContextType {
  // Session
  conversationId: string | null;
  isLoading: boolean;

  // Chat (from useChat)
  messages: MessageData[];
  isSending: boolean;
  addUserMessage: (
    text: string,
    messageType?: string,
    inputType?: string
  ) => Promise<string>;
  addAssistantMessage: (text: string, messageType?: string) => Promise<string>;
  lastAssistantMessageId: string | undefined;

  // Quiz (from useQuiz) - includes FA
  quizMessages: QuizMessage[];
  activeQuizQuestion: QuizMessage | null;
  isQuizProcessing: boolean;
  isInFASession: boolean;
  startWarmup: () => Promise<void>;
  triggerInlesson: (questionId: string) => Promise<void>;
  startFA: (topic?: string) => Promise<void>;
  submitQuizAnswer: (questionId: string, answer: string) => Promise<void>;
  skipQuizQuestion: (questionId: string) => Promise<void>;

  // Toast state (for feedback)
  showSuccessToast: boolean;
  showErrorToast: boolean;
  setShowSuccessToast: (show: boolean) => void;
  setShowErrorToast: (show: boolean) => void;

  // Combined
  allItems: ChatItem[];
}

const MessagesContext = createContext<MessagesContextType | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface MessagesProviderProps {
  children: ReactNode;
}

export function MessagesProvider({ children }: MessagesProviderProps) {
  const { userId, module } = useModuleContext();
  const { selectedLessonId } = useLearningPanel();
  const room = useRoomContext();

  // Derive activeLesson from URL state + module.lessons
  const activeLesson = useMemo(() => {
    if (!selectedLessonId) return null;
    return module.lessons.find((l) => l.id === selectedLessonId) || null;
  }, [selectedLessonId, module.lessons]);

  // ---------------------------------------------------------------------------
  // Session Initialization
  // ---------------------------------------------------------------------------
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function init() {
      try {
        const { conversation } = await initializeChatSession({
          userId,
          moduleId: module.id,
          contextType: "welcome",
        });

        setConversationId(conversation.id);

        if (conversation.messages.length > 0) {
          setHistoryMessages(conversation.messages);
        }
      } catch (error) {
        console.error("[MessagesProvider] Failed to initialize:", error);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [userId, module.id]);

  // ---------------------------------------------------------------------------
  // Compose Hooks
  // ---------------------------------------------------------------------------

  // Chat hook
  const chat = useChat({ conversationId });

  // Data channel publish function (for quiz evaluation requests, etc.)
  const publishData = useCallback(
    async (data: string) => {
      if (room?.localParticipant) {
        const encoder = new TextEncoder();
        await room.localParticipant.publishData(encoder.encode(data), {
          reliable: true,
        });
      }
    },
    [room]
  );

  // Quiz hook (handles warmup, inlesson, AND FA)
  const quiz = useQuiz({
    userId,
    lessonId: activeLesson?.id,
    quiz: (activeLesson?.quiz as unknown) || null,
    publishData,
  });

  // ---------------------------------------------------------------------------
  // Data Channel Listener (for FA responses)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: unknown,
      _kind?: unknown,
      _topic?: string
    ) => {
      try {
        const decoder = new TextDecoder();
        const text = decoder.decode(payload);
        const data = JSON.parse(text);

        // Route FA responses to quiz hook
        if (data.type === "fa_response") {
          quiz.handleFAResponse(data as FAResponse);
        }

        // Route quiz evaluation results (for in-lesson text questions)
        if (data.type === "quiz_evaluation_result") {
          console.log("[MessagesProvider] Quiz eval result:", data);
        }
      } catch {
        // Not JSON or parse error - ignore (could be other data)
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [room, quiz.handleFAResponse]);

  // ---------------------------------------------------------------------------
  // Combine Messages
  // ---------------------------------------------------------------------------

  // Merge history + current messages (dedupe)
  const allMessages = useMemo(() => {
    const historyIds = new Set(historyMessages.map((m) => m.id));
    const current = chat.messages.filter((m) => !historyIds.has(m.id));
    return [...historyMessages, ...current];
  }, [historyMessages, chat.messages]);

  // Combine chat + quiz, sort by time
  const allItems = useMemo<ChatItem[]>(() => {
    const msgItems: ChatItem[] = allMessages.map((m) => ({
      type: "message",
      data: m,
    }));
    const quizItems: ChatItem[] = quiz.quizMessages.map((m) => ({
      type: "quiz",
      data: m,
    }));

    return [...msgItems, ...quizItems].sort(
      (a, b) =>
        new Date(a.data.createdAt).getTime() -
        new Date(b.data.createdAt).getTime()
    );
  }, [allMessages, quiz.quizMessages]);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  const value = useMemo<MessagesContextType>(
    () => ({
      // Session
      conversationId,
      isLoading,

      // Chat
      messages: allMessages,
      isSending: chat.isSending,
      addUserMessage: chat.addUserMessage,
      addAssistantMessage: chat.addAssistantMessage,
      lastAssistantMessageId: chat.lastAssistantMessageId,

      // Quiz (includes FA)
      quizMessages: quiz.quizMessages,
      activeQuizQuestion: quiz.activeQuestion,
      isQuizProcessing: quiz.isProcessing,
      isInFASession: quiz.isInFASession,
      startWarmup: quiz.startWarmup,
      triggerInlesson: quiz.triggerInlesson,
      startFA: quiz.startFA,
      submitQuizAnswer: quiz.submitAnswer,
      skipQuizQuestion: quiz.skipQuestion,

      // Toast
      showSuccessToast,
      showErrorToast,
      setShowSuccessToast,
      setShowErrorToast,

      // Combined
      allItems,
    }),
    [
      conversationId,
      isLoading,
      allMessages,
      chat.isSending,
      chat.addUserMessage,
      chat.addAssistantMessage,
      chat.lastAssistantMessageId,
      quiz.quizMessages,
      quiz.activeQuestion,
      quiz.isProcessing,
      quiz.isInFASession,
      quiz.startWarmup,
      quiz.triggerInlesson,
      quiz.startFA,
      quiz.submitAnswer,
      quiz.skipQuestion,
      showSuccessToast,
      showErrorToast,
      allItems,
    ]
  );

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within MessagesProvider");
  }
  return context;
}
