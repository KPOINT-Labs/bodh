"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

// Types
import type { Course, Module, Lesson, MessageData } from "@/types/chat";

// Utils
import { detectAnswerFeedback } from "@/lib/chat/assessment";
import { initializeChatSession } from "@/lib/chat/message-store";

/**
 * Hook for typing effect on agent transcript
 * Gradually reveals text character by character for live feel
 */
function useTypingEffect(
  fullText: string,
  isActive: boolean,
  typingSpeed: number = 20 // ms per character
): string {
  const [displayedText, setDisplayedText] = useState("");
  const lastFullTextRef = useRef("");
  const displayedLengthRef = useRef(0);

  useEffect(() => {
    // If text changed (new content), we need to handle it
    if (fullText !== lastFullTextRef.current) {
      // If new text is longer (content added), continue typing from where we were
      if (fullText.startsWith(lastFullTextRef.current)) {
        // Content appended - keep current position
        lastFullTextRef.current = fullText;
      } else {
        // Completely new text - reset
        displayedLengthRef.current = 0;
        lastFullTextRef.current = fullText;
      }
    }

    if (!isActive || !fullText) {
      // Show full text immediately when not active or no text
      if (fullText && !isActive) {
        setDisplayedText(fullText);
        displayedLengthRef.current = fullText.length;
      }
      return;
    }

    // Start typing effect
    const timer = setInterval(() => {
      if (displayedLengthRef.current < fullText.length) {
        displayedLengthRef.current++;
        setDisplayedText(fullText.slice(0, displayedLengthRef.current));
      } else {
        clearInterval(timer);
      }
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [fullText, isActive, typingSpeed]);

  // Reset when fullText is cleared
  useEffect(() => {
    if (!fullText) {
      setDisplayedText("");
      displayedLengthRef.current = 0;
      lastFullTextRef.current = "";
    }
  }, [fullText]);

  return displayedText;
}

/**
 * Check if content looks like an assessment summary/feedback
 * Summaries typically contain scoring, overall assessment, or completion indicators
 */
function looksLikeSummary(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const summaryIndicators = [
    'summary', 'overall', 'score', 'scored', 'out of',
    'correct answer', 'you got', 'total', 'assessment complete',
    'great job', 'well done', 'keep practicing', 'final score',
    'your performance', 'you answered'
  ];
  return summaryIndicators.some(indicator => lowerContent.includes(indicator));
}

/**
 * Split messages that contain "---" separator into two separate messages
 * This is used for FA final feedback where we want to show the assessment summary
 * as a separate assistant message
 * Only splits if the second part actually looks like a summary
 */
function expandMessagesWithSeparator(messages: MessageData[]): MessageData[] {
  const expanded: MessageData[] = [];

  for (const msg of messages) {
    // Only split FA assistant messages with "---" separator
    if (msg.messageType === "fa" && msg.role === "assistant" && msg.content.includes('\n---')) {
      const [firstPart, ...restParts] = msg.content.split(/\n---+\n?/);
      const secondPart = restParts.join('\n').trim();

      // Only split if the second part actually looks like a summary
      if (secondPart && looksLikeSummary(secondPart)) {
        // First message: feedback part
        expanded.push({
          ...msg,
          id: `${msg.id}-part1`,
          content: firstPart.trim(),
        });

        // Second message: assessment summary
        expanded.push({
          ...msg,
          id: `${msg.id}-part2`,
          content: secondPart,
        });
      } else {
        // Not a summary split - keep message as-is
        expanded.push(msg);
      }
    } else {
      expanded.push(msg);
    }
  }

  return expanded;
}

// Hooks
import { useAutoScroll } from "@/hooks/useAutoScroll";

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
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  chatMessages?: MessageData[];
  isWaitingForResponse?: boolean;
  isVideoPlaying?: boolean;
  /** Whether a lesson is already selected (video player rendered) */
  hasSelectedLesson?: boolean;
  /** Agent transcript from LiveKit (spoken text) */
  agentTranscript?: string;
  /** Whether agent is currently speaking */
  isAgentSpeaking?: boolean;
  /** Whether LiveKit is connected */
  isLiveKitConnected?: boolean;
  /** Whether this is a returning user (from useSessionType) */
  isReturningUser?: boolean;
  /** Send text to LiveKit agent */
  sendTextToAgent?: (text: string) => Promise<void>;
  /** Add user message to chat UI and DB */
  onAddUserMessage?: (message: string, messageType?: string, inputType?: string) => Promise<void>;
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
  chatMessages = [],
  isWaitingForResponse = false,
  isVideoPlaying = false,
  hasSelectedLesson = false,
  agentTranscript = "",
  isAgentSpeaking = false,
  isLiveKitConnected = false,
  isReturningUser = false,
  sendTextToAgent,
  onAddUserMessage,
}: ChatAgentProps) {
  // State for session initialization
  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Handler for assessment question answers - routes through LiveKit
  const handleQuestionAnswer = useCallback(async (questionNumber: number, answer: string) => {
    console.log(`Question ${questionNumber} answered:`, answer);

    if (!isLiveKitConnected || !sendTextToAgent) {
      console.warn("[ChatAgent] LiveKit not connected, cannot send FA answer");
      return;
    }

    // Add user message to chat and DB
    if (onAddUserMessage) {
      await onAddUserMessage(answer, "fa", "text");
    }

    // Send to LiveKit agent (prism handles Sarvam API)
    try {
      await sendTextToAgent(answer);
    } catch (err) {
      console.error("[ChatAgent] Failed to send FA answer via LiveKit:", err);
    }
  }, [isLiveKitConnected, sendTextToAgent, onAddUserMessage]);

  // Handler for skipping assessment questions - routes through LiveKit
  const handleQuestionSkip = useCallback(async (questionNumber: number) => {
    console.log(`Question ${questionNumber} skipped`);

    if (!isLiveKitConnected || !sendTextToAgent) {
      console.warn("[ChatAgent] LiveKit not connected, cannot send skip request");
      return;
    }

    const skipMessage = "I'd like to skip this question, give next question.";

    // Add skip message to chat and DB
    if (onAddUserMessage) {
      await onAddUserMessage(skipMessage, "fa", "text");
    }

    // Send to LiveKit agent
    try {
      await sendTextToAgent(skipMessage);
    } catch (err) {
      console.error("[ChatAgent] Failed to send skip request via LiveKit:", err);
    }
  }, [isLiveKitConnected, sendTextToAgent, onAddUserMessage]);

  // Get the first lesson from the module
  const firstLesson = module.lessons.sort(
    (a, b) => a.orderIndex - b.orderIndex
  )[0];

  // Initialize chat session (create/get thread and conversation, load history)
  // Welcome messages are NOT stored - LiveKit agent handles welcome display
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initSession() {
      try {
        const { conversation } = await initializeChatSession({
          userId,
          moduleId: module.id,
          contextType: "welcome",
          // No welcomeMessage - LiveKit agent handles welcome
        });

        // Notify parent that conversation is ready
        onConversationReady?.(conversation.id);

        // Load history messages for returning users
        // Note: Welcome message is stored for first-time users
        // Welcome_back message is NOT stored for returning users
        if (conversation.messages.length > 0) {
          setHistoryMessages(conversation.messages);
        }
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, [userId, module.id, onConversationReady]);

  // Typing effect for agent transcript (live transcription feel)
  // Speed: 15ms per character = ~67 chars/sec for natural reading pace
  const typedAgentTranscript = useTypingEffect(
    agentTranscript,
    isLiveKitConnected && (isAgentSpeaking || agentTranscript.length > 0),
    15
  );

  // Auto-scroll hook with smart scrolling (respects user scroll position)
  const { scrollRef, scrollToBottom, forceScrollToBottom } = useAutoScroll({
    threshold: 150, // Consider "at bottom" if within 150px
  });

  // Filter out chatMessages that already exist in historyMessages to avoid duplicate keys
  // Also deduplicate within chatMessages in case the same message was added twice
  const historyMessageIds = useMemo(
    () => new Set(historyMessages.map((msg) => msg.id)),
    [historyMessages]
  );
  const filteredChatMessages = useMemo(() => {
    const seen = new Set<string>();
    const filtered = chatMessages.filter((msg) => {
      // Skip if already in history
      if (historyMessageIds.has(msg.id)) return false;
      // Skip if already seen in this array (deduplication)
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
    // Debug: log what's in chatMessages and filtered
    console.log("[ChatAgent] chatMessages:", chatMessages.length, "filtered:", filtered.length,
      "messages:", filtered.map(m => ({ id: m.id.substring(0, 20), role: m.role, content: m.content.substring(0, 30) })));
    return filtered;
  }, [chatMessages, historyMessageIds]);

  // Get the last user message type to determine how to render the live agent transcript
  // This ensures FA responses are rendered with assessment UI during live streaming
  const lastUserMessageType = useMemo(() => {
    const userMessages = filteredChatMessages.filter(msg => msg.role === "user");
    if (userMessages.length > 0) {
      return userMessages[userMessages.length - 1].messageType || "general";
    }
    return "general";
  }, [filteredChatMessages]);

  // Track previous chat messages length to detect new user messages
  const prevChatMessagesLengthRef = useRef(filteredChatMessages.length);

  // Auto-scroll during agent transcript with typing effect
  // Uses smart scroll - only scrolls if user is already at bottom
  useEffect(() => {
    if (isLiveKitConnected && typedAgentTranscript) {
      scrollToBottom(); // Smart scroll - respects user scroll position
    }
  }, [isLiveKitConnected, typedAgentTranscript, scrollToBottom]);

  // Auto-scroll when chat messages change
  useEffect(() => {
    if (filteredChatMessages.length > 0) {
      const latestMsg = filteredChatMessages[filteredChatMessages.length - 1];
      const isNewMessage = filteredChatMessages.length > prevChatMessagesLengthRef.current;
      prevChatMessagesLengthRef.current = filteredChatMessages.length;

      // Force scroll when USER sends a new message (they expect to see the response)
      if (isNewMessage && latestMsg.role === "user") {
        forceScrollToBottom();
        return;
      }

      // Check if the latest message is an FA response with feedback
      if (latestMsg.messageType === "fa" && latestMsg.role === "assistant") {
        const feedback = detectAnswerFeedback(latestMsg.content);

        // If it has feedback, delay scroll to let user see the badge first
        if (feedback.type) {
          const timer = setTimeout(() => {
            scrollToBottom(); // Smart scroll for assistant responses
          }, 2000); // Match FeedbackBadge duration
          return () => clearTimeout(timer);
        }
      }

      // For assistant messages, use smart scroll (respect user scroll position)
      if (isNewMessage) {
        scrollToBottom();
      }
    }
  }, [filteredChatMessages, scrollToBottom, forceScrollToBottom]);

  // Force scroll to bottom when loading completes (initial load)
  useEffect(() => {
    if (!isLoading) {
      setTimeout(forceScrollToBottom, 100);
    }
  }, [isLoading, forceScrollToBottom]);

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
              <ChatMessage key={msg.id} message={msg} onQuestionAnswer={handleQuestionAnswer} onQuestionSkip={handleQuestionSkip} onTimestampClick={onTimestampClick} isFromHistory={true} />
            ))}
          </div>
        )}

        {/* Initial welcome message (only when no chat messages yet) */}
        {/* LiveKit agent handles welcome messages - show transcript when available */}
        {filteredChatMessages.length === 0 && (
          <>
            {isLiveKitConnected && agentTranscript ? (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                  <div className="text-sm leading-relaxed text-gray-800">
                    <MessageContent
                      content={typedAgentTranscript}
                      onTimestampClick={onTimestampClick}
                    />
                    {/* Show cursor when agent speaking or typing effect in progress */}
                    {(isAgentSpeaking || typedAgentTranscript.length < agentTranscript.length) && (
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
          </>
        )}

        {/* Action Buttons - show only after LiveKit connects and agent finishes speaking */}
        {/* Conditions: LiveKit connected, agent has spoken, not speaking, no user messages, no lesson selected yet */}
        {!isAgentSpeaking &&
         firstLesson &&
         filteredChatMessages.length === 0 &&
         isLiveKitConnected &&
         agentTranscript &&
         !hasSelectedLesson && (
          <ActionButtons
            firstLesson={firstLesson}
            module={module}
            isReturningUser={isReturningUser}
            isVideoPlaying={isVideoPlaying}
            onStartLesson={handleStartLesson}
            onContinueLearning={handleContinueFromLastLesson}
          />
        )}

        {/* Chat Messages (from current session) - flows naturally after history */}
        {filteredChatMessages.length > 0 && (
          <div className="space-y-4">
            {expandMessagesWithSeparator(filteredChatMessages).map((msg) => (
              <ChatMessage key={msg.id} message={msg} onQuestionAnswer={handleQuestionAnswer} onQuestionSkip={handleQuestionSkip} onTimestampClick={onTimestampClick} isFromHistory={false} />
            ))}
          </div>
        )}

        {/* Live agent transcript (shows at bottom when agent is responding to user) */}
        {/* Only show when there are chat messages (conversation has started) */}
        {filteredChatMessages.length > 0 && isLiveKitConnected && agentTranscript && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
              <div className="text-sm leading-relaxed text-gray-800">
                <MessageContent
                  content={typedAgentTranscript}
                  messageType={lastUserMessageType}
                  role="assistant"
                  onQuestionAnswer={handleQuestionAnswer}
                  onQuestionSkip={handleQuestionSkip}
                  onTimestampClick={onTimestampClick}
                />
                {/* Show cursor when agent is speaking or typing effect in progress */}
                {(isAgentSpeaking || typedAgentTranscript.length < agentTranscript.length) && (
                  <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Typing Indicator - show when waiting but agent hasn't started responding yet */}
        {isWaitingForResponse && !agentTranscript && <TypingIndicator />}

        {/* No lessons message */}
        {!firstLesson && (
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
