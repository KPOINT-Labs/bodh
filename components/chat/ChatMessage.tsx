import { Sparkles, User } from "lucide-react";
import { MessageContent } from "./MessageContent";
import type { MessageData } from "@/types/chat";

interface ChatMessageProps {
  message: MessageData;
  onQuestionAnswer?: (questionNumber: number, answer: string) => void;
}

/**
 * Renders a single chat message bubble
 * Handles both user and assistant messages with appropriate styling
 * Supports special rendering for FA (formative assessment) messages
 */
export function ChatMessage({ message, onQuestionAnswer }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
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
        <MessageContent 
          content={message.content} 
          messageType={message.messageType}
          onQuestionAnswer={onQuestionAnswer}
        />
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  );
}
