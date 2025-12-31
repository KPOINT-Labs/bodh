"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2, Send, Mic, MicOff } from "lucide-react";
import { useLiveKit } from "@/hooks/useLiveKit";

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  conversationId?: string;
  courseId?: string;
}

export function ChatInput({
  placeholder = "Tap to talk",
  disabled = false,
  onSend,
  isLoading = false,
  conversationId,
  courseId,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  // LiveKit voice hook - connects to Prism backend
  const { isConnected, isConnecting, error: voiceError, connect, disconnect } = useLiveKit({
    conversationId: conversationId || "",
    courseId: courseId || "",
  });

  // Log voice errors when they occur
  useEffect(() => {
    if (voiceError) {
      console.error("[Voice] Error:", voiceError);
    }
  }, [voiceError]);

  // Handle text message submit
  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (message && onSend) {
      setInputValue("");
      await onSend(message);
    }
  };

  // Handle voice button click
  const handleVoiceClick = async () => {
    console.log("[Voice] Button clicked", { conversationId, courseId, isConnected });

    if (!conversationId || !courseId) {
      console.warn("[Voice] Missing required props:", { conversationId, courseId });
      return;
    }

    if (isConnected) {
      console.log("[Voice] Stopping session...");
      await disconnect();
    } else {
      console.log("[Voice] Starting session...");
      await connect();
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <div className="flex items-center justify-center px-6 py-4">
      <div className="bg-white border border-gray-200 flex h-[58px] items-center justify-between pl-[25px] pr-[8px] py-[7px] relative rounded-full shadow-sm w-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isConnected ? "Listening..." : isLoading ? "Thinking..." : placeholder}
          disabled={isDisabled || isConnected}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none font-normal text-[16px] text-gray-900 placeholder-[#99a1af] tracking-[-0.3125px] leading-[24px] disabled:opacity-50"
        />
        <button
          onClick={inputValue.trim() ? handleSubmit : handleVoiceClick}
          disabled={isDisabled || isConnecting}
          className="flex items-center justify-center w-[44px] h-[44px] rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          style={{
            background: isConnected
              ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
              : "linear-gradient(135deg, #FB64B6 0%, #C27AFF 50%, #51A2FF 100%)",
          }}
        >
          {isLoading || isConnecting ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : inputValue.trim() ? (
            <Send className="h-5 w-5 text-white" />
          ) : isConnected ? (
            <MicOff className="h-5 w-5 text-white" />
          ) : (
            <Mic className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
    </div>
  );
}
