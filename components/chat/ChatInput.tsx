"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2, Send, Mic, MicOff, X } from "lucide-react";
import { toast } from "sonner";
import { useLiveKit } from "@/hooks/useLiveKit";

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  conversationId?: string;
  courseId?: string;
  userId?: string;
  videoIds?: string[];
}

export function ChatInput({
  placeholder = "Tap to talk",
  disabled = false,
  onSend,
  isLoading = false,
  conversationId,
  courseId,
  userId,
  videoIds,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  // LiveKit voice hook - connects to Prism backend
  const { isConnected, isConnecting, isMuted, error: voiceError, connect, disconnect, toggleMute } = useLiveKit({
    conversationId: conversationId || "",
    courseId: courseId || "",
    userId: userId,
    videoIds: videoIds,
  });

  // Log voice errors when they occur
  useEffect(() => {
    if (voiceError) {
      console.error("[Voice] Error:", voiceError);
      toast.error("Voice connection failed", {
        description: voiceError,
      });
    }
  }, [voiceError]);

  // Track previous connection state to detect changes
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current) {
      // Just connected
      toast.success("Voice session started", {
        description: "You can now speak to the AI assistant",
      });
    } else if (!isConnected && prevConnectedRef.current) {
      // Just disconnected
      toast.info("Voice session ended");
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // Handle text message submit
  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (message && onSend) {
      setInputValue("");
      await onSend(message);
    }
  };

  // Handle voice button click - connects or toggles mute
  const handleVoiceClick = async () => {
    console.log("[Voice] Button clicked", { conversationId, courseId, isConnected, isMuted });

    if (!conversationId || !courseId) {
      console.warn("[Voice] Missing required props:", { conversationId, courseId });
      return;
    }

    if (isConnected) {
      // Toggle mute when connected
      console.log("[Voice] Toggling mute...");
      await toggleMute();
    } else {
      // Start voice session
      console.log("[Voice] Starting session...");
      await connect();
    }
  };

  // Handle end session button click
  const handleEndSession = async () => {
    console.log("[Voice] Ending session...");
    await disconnect();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || isLoading;

  // Determine placeholder text
  const getPlaceholder = () => {
    if (isLoading) return "Thinking...";
    if (isConnected) return isMuted ? "Mic muted" : "Listening...";
    return placeholder;
  };

  return (
    <div className="flex items-center justify-center px-6 py-4">
      <div className="bg-white border border-gray-200 flex h-[58px] items-center justify-between pl-[25px] pr-[8px] py-[7px] relative rounded-full shadow-sm w-full">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={isDisabled || isConnected}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none font-normal text-[16px] text-gray-900 placeholder-[#99a1af] tracking-[-0.3125px] leading-[24px] disabled:opacity-50"
        />
        <div className="flex items-center gap-2">
          {/* End session button - only shown when connected */}
          {isConnected && (
            <button
              onClick={handleEndSession}
              className="flex items-center justify-center w-[36px] h-[36px] rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title="End voice session"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          )}
          {/* Main action button */}
          <button
            onClick={inputValue.trim() ? handleSubmit : handleVoiceClick}
            disabled={isDisabled || isConnecting}
            className="flex items-center justify-center w-[44px] h-[44px] rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{
              background: isConnected
                ? isMuted
                  ? "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)" // Gray when muted
                  : "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" // Green when listening
                : "linear-gradient(135deg, #FB64B6 0%, #C27AFF 50%, #51A2FF 100%)", // Default gradient
            }}
            title={isConnected ? (isMuted ? "Unmute" : "Mute") : "Start voice"}
          >
            {isLoading || isConnecting ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : inputValue.trim() ? (
              <Send className="h-5 w-5 text-white" />
            ) : isConnected && isMuted ? (
              <MicOff className="h-5 w-5 text-white" />
            ) : (
              <Mic className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
