"use client";

import { Sparkles, User } from "lucide-react";
import type { MessageData } from "@/lib/chat/message-store";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: MessageData;
  isFromHistory?: boolean;
}

export function ChatMessage({
  message,
  isFromHistory = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
          <User className="h-4 w-4 text-gray-600" />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2",
          isUser
            ? "max-w-[75%] rounded-tr-sm bg-gray-100 text-gray-900"
            : "max-w-[85%] rounded-tl-sm bg-gray-50 px-4 py-3 text-gray-800"
        )}
      >
        <MessageContent
          content={message.content}
          isFromHistory={isFromHistory}
        />
      </div>
    </div>
  );
}

// Simplified message content renderer
function MessageContent({
  content,
  isFromHistory,
}: {
  content: string;
  isFromHistory: boolean;
}) {
  // Split by newlines and render each line
  const lines = content.split("\n");

  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, index) => {
        // Skip empty lines but preserve structure
        if (!line.trim()) {
          return <br key={index} />;
        }

        // Headers (##, ###)
        if (line.startsWith("### ")) {
          return (
            <h4 className="mt-3 mb-1 font-semibold text-base" key={index}>
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 className="mt-4 mb-2 font-semibold text-lg" key={index}>
              {line.slice(3)}
            </h3>
          );
        }

        // Bullet points
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div className="ml-2 flex items-start gap-2" key={index}>
              <span className="mt-1 text-gray-400">•</span>
              <span>{renderInlineFormatting(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div className="ml-2 flex items-start gap-2" key={index}>
              <span className="font-medium text-gray-500">
                {numberedMatch[1]}.
              </span>
              <span>{renderInlineFormatting(numberedMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p className={index > 0 ? "mt-2" : ""} key={index}>
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

// Render bold and inline code
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong className="font-semibold" key={key++}>
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(remaining.slice(0, codeMatch.index));
      }
      parts.push(
        <code
          className="rounded bg-gray-200 px-1 py-0.5 font-mono text-sm"
          key={key++}
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches, add remaining text
    parts.push(remaining);
    break;
  }

  return parts.length > 0 ? parts : text;
}
