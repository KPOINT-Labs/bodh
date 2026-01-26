"use client";

import { Sparkles, User } from "lucide-react";
import { MessageContent } from "./MessageContent";
import { AssessmentSummary } from "./AssessmentSummary";
import { Button } from "@/components/ui/button";
import { ACTION_REGISTRY } from "@/lib/actions/actionRegistry";
import { useActionsOptional } from "@/contexts/ActionsContext";
import { useLearningPanel } from "@/contexts/LearningPanelContext";
import type { MessageData } from "@/types/chat";

interface ChatMessageProps {
  message: MessageData;
  onQuestionAnswer?: (questionNumber: number, answer: string) => void;
  onQuestionSkip?: (questionNumber: number) => void;
  onTimestampClick?: (seconds: number, youtubeVideoId?: string | null) => void;
  isFromHistory?: boolean;
  // In-lesson question handlers
  onInlessonAnswer?: (questionId: string, answer: string) => void;
  onInlessonSkip?: (questionId: string) => void;
  // Warmup question handlers
  onWarmupAnswer?: (questionId: string, answer: string) => void;
  onWarmupSkip?: (questionId: string) => void;
}

/**
 * Renders a single chat message bubble
 * Handles both user and assistant messages with appropriate styling
 * Supports special rendering for FA (formative assessment) messages
 *
 * V2: Also renders action buttons if message has action field
 */
export function ChatMessage({
  message,
  onQuestionAnswer,
  onQuestionSkip,
  onTimestampClick,
  isFromHistory = false,
  onInlessonAnswer,
  onInlessonSkip,
  onWarmupAnswer,
  onWarmupSkip,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const actionsContext = useActionsOptional();
  const learningPanelContext = useLearningPanel();

  // Check if this is an assessment summary (second part of a split FA message)
  const isAssessmentSummary =
    message.id.endsWith("-part2") && message.messageType === "fa";

  // For warmup messages, use warmup handlers; for inlesson, use inlesson handlers
  const isWarmupMessage = message.messageType === "warmup_mcq";
  const effectiveOnAnswer = isWarmupMessage ? onWarmupAnswer : onInlessonAnswer;
  const effectiveOnSkip = isWarmupMessage ? onWarmupSkip : onInlessonSkip;

  // V2: Action rendering logic
  const isAssistant = message.role === "assistant";
  const hasAction = isAssistant && message.action;
  const actionDefinition = hasAction ? ACTION_REGISTRY[message.action!] : null;
  const isPending = message.actionStatus === "pending";
  const isHandled = message.actionStatus === "handled";

  const handleButtonClick = async (buttonId: string) => {
    if (!message.action || !actionsContext) return;

    // Collapse panel when starting a lesson/video
    const collapseActions = [
      "see_intro",
      "skip_to_lesson",
      "continue",
      "restart",
      "skip",
      "next_lesson",
    ];
    if (collapseActions.includes(buttonId)) {
      learningPanelContext?.collapsePanel();
    }

    await actionsContext.handleButtonClick(
      message.id,
      message.action,
      buttonId,
      message.actionMetadata || {}
    );
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {/* Message row */}
      <div
        className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}
      >
        {/* Assistant Avatar */}
        {!isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={
            isUser
              ? "bg-gray-100 text-gray-900 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[75%]"
              : "bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] text-gray-800"
          }
        >
          {isAssessmentSummary ? (
            <AssessmentSummary
              content={message.content}
              onTimestampClick={onTimestampClick}
            />
          ) : (
            <MessageContent
              content={message.content}
              messageType={message.messageType}
              role={message.role}
              onQuestionAnswer={onQuestionAnswer}
              onQuestionSkip={onQuestionSkip}
              onTimestampClick={onTimestampClick}
              isFromHistory={isFromHistory}
              inlessonMetadata={message.metadata}
              onInlessonAnswer={effectiveOnAnswer}
              onInlessonSkip={effectiveOnSkip}
            />
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-600" />
          </div>
        )}
      </div>

      {/* V2: Action Buttons (rendered below the message) */}
      {hasAction && actionDefinition && actionsContext && (
        <div className="ml-11 mt-3">
          {/* Show buttons when pending OR when handled but disableAfterClick is false */}
          {(isPending || (isHandled && actionDefinition.disableAfterClick === false)) && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {actionDefinition.buttons.map((button) => (
                <Button
                  key={button.id}
                  onClick={() => handleButtonClick(button.id)}
                  variant={button.variant === "primary" ? "default" : "outline"}
                  className={
                    button.variant === "primary"
                      ? "gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full px-5"
                      : "gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full px-5"
                  }
                >
                  {button.label}
                </Button>
              ))}
            </div>
          )}
          {/* Show disabled buttons when handled and disableAfterClick is not false */}
          {isHandled && actionDefinition.disableAfterClick !== false && (
            <div className="flex items-center gap-3">
              {actionDefinition.buttons.map((button) => (
                <Button
                  key={button.id}
                  disabled
                  variant={button.variant === "primary" ? "default" : "outline"}
                  className={
                    button.variant === "primary"
                      ? "gap-2 bg-blue-500 text-white rounded-full px-5 opacity-50 cursor-not-allowed"
                      : "gap-2 border-gray-300 text-gray-700 rounded-full px-5 opacity-50 cursor-not-allowed"
                  }
                >
                  {button.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
