"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
// Utils
import { detectAnswerFeedback } from "@/lib/chat/assessment";
import { initializeChatSession } from "@/lib/chat/message-store";
// Types
import type { Course, Lesson, MessageData, Module } from "@/types/chat";

/**
 * Hook for typing effect on agent transcript
 * Gradually reveals text character by character for live feel
 */
function useTypingEffect(
  fullText: string,
  isActive: boolean,
  typingSpeed = 20 // ms per character
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

    if (!(isActive && fullText)) {
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
    "summary",
    "overall",
    "score",
    "scored",
    "out of",
    "correct answer",
    "you got",
    "total",
    "assessment complete",
    "great job",
    "well done",
    "keep practicing",
    "final score",
    "your performance",
    "you answered",
  ];
  return summaryIndicators.some((indicator) =>
    lowerContent.includes(indicator)
  );
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
    if (
      msg.messageType === "fa" &&
      msg.role === "assistant" &&
      msg.content.includes("\n---")
    ) {
      const [firstPart, ...restParts] = msg.content.split(/\n---+\n?/);
      const secondPart = restParts.join("\n").trim();

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

// Components
import {
  ChatMessage,
  MessageContent,
  TypingIndicator,
} from "@/components/chat";
// Hooks
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { ActionButtons } from "./ActionButtons";
import { ChatHeader } from "./ChatHeader";
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
  onAddUserMessage?: (
    message: string,
    messageType?: string,
    inputType?: string
  ) => Promise<void>;
  /** Whether voice mode is enabled (user can speak to agent) */
  isVoiceModeEnabled?: boolean;
  /** Current user transcript from voice input (live transcription) */
  userTranscript?: string;
  /** Whether user is currently speaking in voice mode */
  isUserSpeaking?: boolean;
  /** Pending action from the action registry */
  pendingAction?: import("@/lib/actions/actionRegistry").PendingAction | null;
  /** Handler for action button clicks */
  onActionButtonClick?: (buttonId: string) => void;
  /** Whether action buttons should be disabled */
  isActionDisabled?: boolean;
  onInlessonAnswer?: (questionId: string, answer: string) => void;
  onInlessonSkip?: (questionId: string) => void;
  onWarmupAnswer?: (questionId: string, answer: string) => void;
  onWarmupSkip?: (questionId: string) => void;
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
  course: _course,
  module,
  userId,
  onLessonSelect: _onLessonSelect,
  onConversationReady,
  onTimestampClick,
  chatMessages = [],
  isWaitingForResponse = false,
  isVideoPlaying: _isVideoPlaying = false,
  hasSelectedLesson: _hasSelectedLesson = false,
  agentTranscript = "",
  isAgentSpeaking = false,
  isLiveKitConnected = false,
  isReturningUser = false,
  sendTextToAgent,
  onAddUserMessage,
  isVoiceModeEnabled = false,
  userTranscript = "",
  isUserSpeaking = false,
  pendingAction = null,
  onActionButtonClick,
  isActionDisabled = false,
  onInlessonAnswer: _onInlessonAnswer,
  onInlessonSkip: _onInlessonSkip,
  onWarmupAnswer: _onWarmupAnswer,
  onWarmupSkip: _onWarmupSkip,
}: ChatAgentProps) {
  // State for session initialization
  const [historyMessages, setHistoryMessages] = useState<MessageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  // Store the welcome message locally (not in DB) so it persists in UI
  // This captures the welcome/welcome_back transcript when agent finishes speaking
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const welcomeCapturedRef = useRef(false);

  // Handler for assessment question answers - routes through LiveKit
  const handleQuestionAnswer = useCallback(
    async (questionNumber: number, answer: string) => {
      console.log(`Question ${questionNumber} answered:`, answer);

      if (!(isLiveKitConnected && sendTextToAgent)) {
        console.warn(
          "[ChatAgent] LiveKit not connected, cannot send FA answer"
        );
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
    },
    [isLiveKitConnected, sendTextToAgent, onAddUserMessage]
  );

  // Handler for skipping assessment questions - routes through LiveKit
  const handleQuestionSkip = useCallback(
    async (questionNumber: number) => {
      console.log(`Question ${questionNumber} skipped`);

      if (!(isLiveKitConnected && sendTextToAgent)) {
        console.warn(
          "[ChatAgent] LiveKit not connected, cannot send skip request"
        );
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
        console.error(
          "[ChatAgent] Failed to send skip request via LiveKit:",
          err
        );
      }
    },
    [isLiveKitConnected, sendTextToAgent, onAddUserMessage]
  );

  // Get the first lesson from the module
  const firstLesson = module.lessons.sort(
    (a, b) => a.orderIndex - b.orderIndex
  )[0];

  // Initialize chat session (create/get thread and conversation, load history)
  // Welcome messages are NOT stored - LiveKit agent handles welcome display
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
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
      if (historyMessageIds.has(msg.id)) {
        return false;
      }
      // Skip if already seen in this array (deduplication)
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
    // Debug: log what's in chatMessages and filtered
    console.log(
      "[ChatAgent] chatMessages:",
      chatMessages.length,
      "filtered:",
      filtered.length,
      "messages:",
      filtered.map((m) => ({
        id: m.id.substring(0, 20),
        role: m.role,
        content: m.content.substring(0, 30),
      }))
    );
    return filtered;
  }, [chatMessages, historyMessageIds]);

  const hasAnchorMatch = useMemo(() => {
    const anchor = pendingAction?.anchorMessageId;
    if (!anchor) {
      return true;
    }
    return filteredChatMessages.some((message) => message.id === anchor);
  }, [pendingAction?.anchorMessageId, filteredChatMessages]);

  // Get the last user message type to determine how to render the live agent transcript
  // This ensures FA responses are rendered with assessment UI during live streaming
  const lastUserMessageType = useMemo(() => {
    const userMessages = filteredChatMessages.filter(
      (msg) => msg.role === "user"
    );
    if (userMessages.length > 0) {
      return userMessages.at(-1).messageType || "general";
    }
    return "general";
  }, [filteredChatMessages]);

  // Track previous chat messages length to detect new user messages
  const prevChatMessagesLengthRef = useRef(filteredChatMessages.length);

  // Capture welcome message when agent finishes speaking (before any user interaction)
  // This keeps the welcome visible in UI without storing in DB
  useEffect(() => {
    // Only capture if:
    // 1. Agent has finished speaking (!isAgentSpeaking)
    // 2. There's a transcript
    // 3. No chat messages yet (this is the welcome, not a response)
    // 4. Haven't captured yet
    if (
      !isAgentSpeaking &&
      agentTranscript &&
      filteredChatMessages.length === 0 &&
      !welcomeCapturedRef.current
    ) {
      console.log("[ChatAgent] Capturing welcome message for UI persistence");
      setWelcomeMessage(agentTranscript);
      welcomeCapturedRef.current = true;
    }
  }, [isAgentSpeaking, agentTranscript, filteredChatMessages.length]);

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
      const latestMsg = filteredChatMessages.at(-1);
      const isNewMessage =
        filteredChatMessages.length > prevChatMessagesLengthRef.current;
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

  // Loading state
  if (isLoading) {
    return <LoadingState isReturningUser={isReturningUser} />;
  }

  return (
    <Card className="border-none bg-transparent p-6 shadow-none">
      <ChatHeader />

      <div className="space-y-4">
        {/* History Messages */}
        {historyMessages.length > 0 && (
          <div className="space-y-4">
            {expandMessagesWithSeparator(historyMessages).map((msg) => (
              <ChatMessage
                isFromHistory={true}
                key={msg.id}
                message={msg}
                onInlessonAnswer={_onInlessonAnswer}
                onInlessonSkip={_onInlessonSkip}
                onQuestionAnswer={handleQuestionAnswer}
                onQuestionSkip={handleQuestionSkip}
                onTimestampClick={onTimestampClick}
                onWarmupAnswer={_onWarmupAnswer}
                onWarmupSkip={_onWarmupSkip}
              />
            ))}
          </div>
        )}

        {/* Welcome message - show captured welcome or live transcript */}
        {/* Case 1: No chat messages yet - show live transcript or connecting state */}
        {filteredChatMessages.length === 0 &&
          !welcomeMessage &&
          (isLiveKitConnected && agentTranscript ? (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <div className="text-gray-800 text-sm leading-relaxed">
                  <MessageContent
                    content={typedAgentTranscript}
                    onTimestampClick={onTimestampClick}
                  />
                  {/* Show cursor when agent speaking or typing effect in progress */}
                  {(isAgentSpeaking ||
                    typedAgentTranscript.length < agentTranscript.length) && (
                    <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-blue-500" />
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
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2 text-gray-500 text-sm italic leading-relaxed">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  Connecting to your AI assistant...
                </div>
              </div>
            </div>
          ) : null)}

        {/* Case 2: Welcome captured - show it persistently (even when chat messages exist) */}
        {welcomeMessage && (
          <div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <div className="text-gray-800 text-sm leading-relaxed">
                  <MessageContent
                    content={welcomeMessage}
                    onTimestampClick={onTimestampClick}
                  />
                </div>
              </div>
            </div>
            {!(isAgentSpeaking || filteredChatMessages.length) &&
              pendingAction &&
              isLiveKitConnected &&
              pendingAction.anchorMessageId === "welcome" &&
              onActionButtonClick && (
                <ActionButtons
                  disabled={isActionDisabled}
                  onButtonClick={onActionButtonClick}
                  pendingAction={pendingAction}
                />
              )}
          </div>
        )}

        {/* Chat Messages (from current session) - flows naturally after history */}
        {filteredChatMessages.length > 0 && (
          <div className="space-y-4">
            {expandMessagesWithSeparator(filteredChatMessages).map(
              (msg, index, all) => {
                const isLast = index === all.length - 1;
                const anchor = pendingAction?.anchorMessageId;
                const matchesAnchor = anchor
                  ? anchor === msg.id || (!hasAnchorMatch && isLast)
                  : isLast;
                const shouldShowActionButtons =
                  matchesAnchor &&
                  !isAgentSpeaking &&
                  pendingAction &&
                  isLiveKitConnected &&
                  onActionButtonClick;

                return (
                  <div key={msg.id}>
                    <ChatMessage
                      isFromHistory={false}
                      message={msg}
                      onInlessonAnswer={_onInlessonAnswer}
                      onInlessonSkip={_onInlessonSkip}
                      onQuestionAnswer={handleQuestionAnswer}
                      onQuestionSkip={handleQuestionSkip}
                      onTimestampClick={onTimestampClick}
                      onWarmupAnswer={_onWarmupAnswer}
                      onWarmupSkip={_onWarmupSkip}
                    />
                    {shouldShowActionButtons && (
                      <ActionButtons
                        disabled={isActionDisabled}
                        onButtonClick={onActionButtonClick}
                        pendingAction={pendingAction}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* User voice transcript - shows when user is speaking in voice mode */}
        {isVoiceModeEnabled && userTranscript && (
          <div className="flex items-start justify-end gap-3">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-3 text-white">
              <div className="text-sm leading-relaxed">
                {userTranscript}
                {/* Show pulsing microphone indicator when user is speaking */}
                {isUserSpeaking && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                    <span className="animation-delay-150 ml-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                    <span className="animation-delay-300 ml-0.5 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
                  </span>
                )}
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">
              <svg
                className="h-4 w-4 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Live agent transcript (shows at bottom when agent is responding to user) */}
        {/* Only show when there are chat messages (conversation has started) */}
        {filteredChatMessages.length > 0 &&
          isLiveKitConnected &&
          agentTranscript && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3">
                <div className="text-gray-800 text-sm leading-relaxed">
                  <MessageContent
                    content={typedAgentTranscript}
                    messageType={lastUserMessageType}
                    onQuestionAnswer={handleQuestionAnswer}
                    onQuestionSkip={handleQuestionSkip}
                    onTimestampClick={onTimestampClick}
                  />
                  {/* Show cursor when agent is speaking or typing effect in progress */}
                  {(isAgentSpeaking ||
                    typedAgentTranscript.length < agentTranscript.length) && (
                    <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-blue-500" />
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Typing Indicator - show when waiting but agent hasn't started responding yet */}
        {isWaitingForResponse && !agentTranscript && !pendingAction && (
          <TypingIndicator />
        )}

        {/* No lessons message */}
        {!firstLesson && (
          <p className="ml-11 text-gray-500 text-sm">
            No lessons available in this module yet. Please check back later.
          </p>
        )}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>
    </Card>
  );
}
