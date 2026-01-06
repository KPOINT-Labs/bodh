"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

// Types
import type { Course, Module, Lesson, MessageData } from "@/types/chat";

// Hooks
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChatInitialization } from "@/hooks/useChatInitialization";

// Components
import { ChatMessage, MessageContent, TypingIndicator } from "@/components/chat";
import { ChatHeader } from "./ChatHeader";
import { ActionButtons } from "./ActionButtons";
import { LoadingState } from "./LoadingState";

interface ChatAgentProps {
  course: Course;
  module: Module;
  userId: string;
  onLessonSelect: (lesson: Lesson) => void;
  onConversationReady?: (conversationId: string) => void;
  onSendMessage?: (message: string, taskGraphType?: "QnA" | "FA") => void;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  chatMessages?: MessageData[];
  isWaitingForResponse?: boolean;
}

/**
 * ChatAgent - Main chat interface component
 *
 * Displays an AI learning assistant that:
 * - Welcomes new users with personalized messages
 * - Welcomes returning users and shows chat history
 * - Displays typing animation for new messages
 * - Shows action buttons to start/continue lessons
 */
export function ChatAgent({
  course,
  module,
  userId,
  onLessonSelect,
  onConversationReady,
  onTimestampClick,
  onSendMessage,
  chatMessages = [],
  isWaitingForResponse = false,
}: ChatAgentProps) {
  // Handler for assessment question answers
  const handleQuestionAnswer = (questionNumber: number, answer: string) => {
    console.log(`Question ${questionNumber} answered:`, answer);
    // Send the answer to the FA API without adding to the prompt
    if (onSendMessage) {
      onSendMessage(answer, "FA");
    }
  };

  // Get the first lesson from the module
  const firstLesson = module.lessons.sort(
    (a, b) => a.orderIndex - b.orderIndex
  )[0];

  // Auto-scroll hook
  const { scrollRef, scrollToBottom } = useAutoScroll();

  // Chat initialization hook
  const { historyMessages, latestMessage, isLoading, isReturningUser } =
    useChatInitialization({
      course,
      module,
      userId,
      firstLesson,
      onConversationReady,
    });

  // Typing effect hook
  const { displayedText, isTyping, startTyping } = useTypingEffect({
    speed: 10,
    onScrollNeeded: scrollToBottom,
    scrollInterval: 50,
  });

  // Start typing when latest message is ready
  useEffect(() => {
    if (latestMessage && !isLoading) {
      startTyping(latestMessage);
    }
  }, [latestMessage, isLoading, startTyping]);

  // Auto-scroll when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, scrollToBottom]);

  // Scroll to bottom when loading completes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading, scrollToBottom]);

  // Event handlers
  const handleStartLesson = () => {
    if (firstLesson) {
      onLessonSelect(firstLesson);
    }
  };

  const handleContinueFromLastLesson = () => {
    // TODO: Get actual last lesson from progress
    if (firstLesson) {
      onLessonSelect(firstLesson);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState isReturningUser={isReturningUser} />;
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-sm p-6">
      <ChatHeader />

      <div className="space-y-4">
        {/* History Messages */}
        {historyMessages.length > 0 && (
          <div className="space-y-4">
            {historyMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onQuestionAnswer={handleQuestionAnswer} onTimestampClick={onTimestampClick} isFromHistory={true} />
            ))}
          </div>
        )}

        {/* Current/Latest Message with typing effect */}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
            <div className="text-sm leading-relaxed text-gray-800">
              <MessageContent content={displayedText} onTimestampClick={onTimestampClick} />
              {isTyping && (
                <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isTyping && firstLesson && (
          <ActionButtons
            firstLesson={firstLesson}
            module={module}
            isReturningUser={isReturningUser}
            onStartLesson={handleStartLesson}
            onContinueLearning={handleContinueFromLastLesson}
          />
        )}

        {/* Chat Messages (from current session) */}
        {chatMessages.length > 0 && (
          <div className="space-y-4 pt-4 mt-4 border-t border-gray-100">
            {chatMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} onQuestionAnswer={handleQuestionAnswer} onTimestampClick={onTimestampClick} isFromHistory={false} />
            ))}
          </div>
        )}

        {/* Typing Indicator */}
        {isWaitingForResponse && <TypingIndicator />}

        {/* No lessons message */}
        {!isTyping && !firstLesson && (
          <p className="text-sm text-gray-500 ml-11">
            No lessons available in this module yet. Please check back later.
          </p>
        )}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </Card>
  );
}
