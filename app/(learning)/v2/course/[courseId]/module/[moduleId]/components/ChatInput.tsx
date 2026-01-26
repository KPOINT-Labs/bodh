"use client";

import { Send } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { useMessages } from "../providers/MessagesProvider";

interface ChatInputProps {
  placeholder?: string;
  className?: string;
}

export function ChatInput({
  placeholder = "Type a message...",
  className,
}: ChatInputProps) {
  const { addUserMessage, isSending, isQuizProcessing, activeQuizQuestion } =
    useMessages();
  const [input, setInput] = useState("");

  const isDisabled = isSending || isQuizProcessing || !!activeQuizQuestion;

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || isDisabled) return;

      setInput("");
      try {
        await addUserMessage(text);
      } catch (error) {
        console.error("[ChatInput] Failed to send message:", error);
        // Restore input on error
        setInput(text);
      }
    },
    [input, isDisabled, addUserMessage]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <form
      className={cn("flex items-end gap-2 border-t bg-white p-4", className)}
      onSubmit={handleSubmit}
    >
      <div className="relative flex-1">
        <textarea
          className={cn(
            "w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3",
            "focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "placeholder:text-gray-400",
            "max-h-[120px] min-h-[48px]"
          )}
          disabled={isDisabled}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeQuizQuestion
              ? "Answer the question above first..."
              : isDisabled
                ? "Please wait..."
                : placeholder
          }
          rows={1}
          style={{
            height: "auto",
            minHeight: "48px",
          }}
          value={input}
        />
      </div>
      <button
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          "bg-gradient-to-r from-purple-600 to-indigo-600 text-white",
          "hover:from-purple-500 hover:to-indigo-500",
          "disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400",
          "transition-all duration-200"
        )}
        disabled={!input.trim() || isDisabled}
        type="submit"
      >
        {isSending ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </button>
    </form>
  );
}
