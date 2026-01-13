"use client";

import { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

// Types
import type { Course, Module, Lesson, MessageData } from "@/types/chat";

// Utils
import { detectAnswerFeedback } from "@/lib/chat/assessment";

/**
 * Split messages that contain "---" separator into two separate messages
 * This is used for FA final feedback where we want to show the assessment summary
 * as a separate assistant message
 */
function expandMessagesWithSeparator(messages: MessageData[]): MessageData[] {
  const expanded: MessageData[] = [];

  for (const msg of messages) {
    // Only split FA assistant messages with "---" separator
    if (msg.messageType === "fa" && msg.role === "assistant" && msg.content.includes('\n---')) {
      const [firstPart, ...restParts] = msg.content.split(/\n---+\n?/);
      const secondPart = restParts.join('\n').trim();

      // First message: feedback part
      expanded.push({
        ...msg,
        id: `${msg.id}-part1`,
        content: firstPart.trim(),
      });

      // Second message: assessment summary (if exists)
      if (secondPart) {
        expanded.push({
          ...msg,
          id: `${msg.id}-part2`,
          content: secondPart,
        });
      }
    } else {
      expanded.push(msg);
    }
  }

  return expanded;
}

// Hooks
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
  onSendMessage?: (message: string, taskGraphType?: "QnA" | "FA", isAnswer?: boolean) => void;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  chatMessages?: MessageData[];
  isWaitingForResponse?: boolean;
  isVideoPlaying?: boolean;
  /** Agent transcript from LiveKit (spoken text) */
  agentTranscript?: string;
  /** Whether agent is currently speaking */
  isAgentSpeaking?: boolean;
  /** Whether LiveKit is connected */
  isLiveKitConnected?: boolean;
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
  isVideoPlaying = false,
  agentTranscript = "",
  isAgentSpeaking = false,
  isLiveKitConnected = false,
}: ChatAgentProps) {
  // Handler for assessment question answers
  const handleQuestionAnswer = (questionNumber: number, answer: string) => {
    console.log(`Question ${questionNumber} answered:`, answer);
    // Send the answer to the FA API with isAnswer=true (don't add assessment prompt)
    if (onSendMessage) {
      onSendMessage(answer, "FA", true);
    }
  };

  // Get the first lesson from the module
  const firstLesson = module.lessons.sort(
    (a, b) => a.orderIndex - b.orderIndex
  )[0];

  // Auto-scroll hook
  const { scrollRef, scrollToBottom } = useAutoScroll();

  // Chat initialization hook (with streaming support)
  const { historyMessages, latestMessage, isLoading, isStreaming, isReturningUser } =
    useChatInitialization({
      course,
      module,
      userId,
      firstLesson,
      onConversationReady,
    });

  // Auto-scroll during streaming (local or agent transcript)
  useEffect(() => {
    if ((isStreaming && latestMessage) || (isAgentSpeaking && agentTranscript)) {
      scrollToBottom();
    }
  }, [isStreaming, latestMessage, isAgentSpeaking, agentTranscript, scrollToBottom]);

  // Auto-scroll when chat messages change (with delay for feedback messages)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const latestMsg = chatMessages[chatMessages.length - 1];

      // Check if the latest message is an FA response with feedback
      if (latestMsg.messageType === "fa" && latestMsg.role === "assistant") {
        const feedback = detectAnswerFeedback(latestMsg.content);

        // If it has feedback, delay scroll to let user see the badge first
        if (feedback.type) {
          const timer = setTimeout(() => {
            scrollToBottom();
          }, 2000); // Match FeedbackBadge duration
          return () => clearTimeout(timer);
        }
      }

      // For non-feedback messages, scroll immediately
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
            {expandMessagesWithSeparator(historyMessages).map((msg) => (
              <ChatMessage key={msg.id} message={msg} onQuestionAnswer={handleQuestionAnswer} onTimestampClick={onTimestampClick} isFromHistory={true} />
            ))}
          </div>
        )}

        {/* Current/Latest Message with streaming text */}
        {/* When LiveKit is connected, prefer agent transcript over local generation */}
        {(isLiveKitConnected && agentTranscript) || (!isLiveKitConnected && latestMessage) ? (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
              <div className="text-sm leading-relaxed text-gray-800">
                <MessageContent
                  content={isLiveKitConnected && agentTranscript ? agentTranscript : latestMessage}
                  onTimestampClick={onTimestampClick}
                />
                {/* Show cursor when streaming locally or agent is speaking */}
                {(isStreaming || isAgentSpeaking) && (
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                )}
              </div>
            </div>
          </div>
        ) : isLiveKitConnected ? (
          /* Waiting for agent to speak when LiveKit is connected but no transcript yet */
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
              <div className="text-sm leading-relaxed text-gray-500 italic flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Connecting to your AI assistant...
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons - show after message is complete */}
        {!isStreaming && !isAgentSpeaking && firstLesson && (
          <ActionButtons
            firstLesson={firstLesson}
            module={module}
            isReturningUser={isReturningUser}
            isVideoPlaying={isVideoPlaying}
            onStartLesson={handleStartLesson}
            onContinueLearning={handleContinueFromLastLesson}
          />
        )}

        {/* Chat Messages (from current session) */}
        {chatMessages.length > 0 && (
          <div className="space-y-4 pt-4 mt-4 border-t border-gray-100">
            {expandMessagesWithSeparator(chatMessages).map((msg) => (
              <ChatMessage key={msg.id} message={msg} onQuestionAnswer={handleQuestionAnswer} onTimestampClick={onTimestampClick} isFromHistory={false} />
            ))}
          </div>
        )}

        {/* Typing Indicator */}
        {isWaitingForResponse && <TypingIndicator />}

        {/* No lessons message */}
        {!isStreaming && !firstLesson && (
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
