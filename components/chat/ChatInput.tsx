"use client";

import { useRef, useState, useEffect } from "react";
import { Loader2, Send, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useLiveKit } from "@/hooks/useLiveKit";

// LiveKit state type for when passed from parent
interface LiveKitState {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  error: string | null;
  agentTranscript: string;
  transcriptSegments: { id: string; text: string; participantIdentity: string; isAgent: boolean; isFinal: boolean; timestamp: number }[];
  isAgentSpeaking: boolean;
  isAudioBlocked: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  startAudio: () => Promise<void>;
  sendTextToAgent: (text: string) => Promise<void>;
}

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  conversationId?: string;
  courseId?: string;
  userId?: string;
  videoIds?: string[];
  /** Optional: LiveKit state passed from parent (for shared session) */
  liveKitState?: LiveKitState;
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
  liveKitState,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  // LiveKit voice hook - only used if no state passed from parent
  // When liveKitState is provided, we skip creating our own hook to avoid interference
  const ownLiveKit = useLiveKit({
    conversationId: liveKitState ? "" : (conversationId || ""),
    courseId: liveKitState ? "" : (courseId || ""),
    userId: liveKitState ? undefined : userId,
    videoIds: liveKitState ? undefined : videoIds,
    autoConnect: false, // Never auto-connect from ChatInput
  });

  // Use parent's LiveKit state if provided, otherwise use own hook
  const { isConnected, isConnecting, isMuted, audioLevel, error: voiceError, toggleMute, sendTextToAgent } =
    liveKitState || ownLiveKit;

  // Log voice errors when they occur (only for own hook, parent handles its own)
  useEffect(() => {
    if (!liveKitState && voiceError) {
      console.error("[Voice] Error:", voiceError);
      toast.error("Voice connection failed", {
        description: voiceError,
        duration: 2000
      });
    }
  }, [voiceError, liveKitState]);

  // Track previous connection state to detect changes (only for own hook)
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (liveKitState) return; // Parent handles its own toast notifications

    if (isConnected && !prevConnectedRef.current) {
      // Just connected
      toast.success("Voice session started", {
        description: "You can now speak to the AI assistant",
        duration: 2000
      });
    } else if (!isConnected && prevConnectedRef.current) {
      // Just disconnected
      toast.info("Voice session ended", { duration: 2000 });
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, liveKitState]);

  // Handle text message submit
  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (!message) return;

    setInputValue("");

    // If LiveKit is connected, send via LiveKit (agent will speak the response)
    if (isConnected && sendTextToAgent) {
      console.log("[ChatInput] Sending message via LiveKit");
      try {
        await sendTextToAgent(message);
      } catch (err) {
        console.error("[ChatInput] Failed to send via LiveKit:", err);
        // Fall back to onSend if LiveKit fails
        if (onSend) {
          await onSend(message);
        }
      }
    } else if (onSend) {
      // Fall back to direct API call
      console.log("[ChatInput] Sending message via API");
      await onSend(message);
    }
  };

  // Handle voice button click - toggle mute only (session is already connected from parent)
  const handleVoiceClick = async () => {
    console.log("[Voice] Button clicked", { isConnected, isMuted });

    if (isConnected) {
      // Toggle mute when connected
      console.log("[Voice] Toggling mute...");
      await toggleMute();
    } else {
      console.log("[Voice] Session not connected yet, waiting...");
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

  // Determine placeholder text
  const getPlaceholder = () => {
    if (isLoading) return "Thinking...";
    if (isConnected) return isMuted ? "Type your question here" : "Listening...";
    return placeholder;
  };

  return (
    <div className="flex items-center justify-center px-6 py-4">
      <div className="bg-white border border-gray-200 flex h-[58px] items-center justify-between pl-[25px] pr-[8px] py-[7px] relative rounded-full shadow-sm w-full">
        {/* Show animated listening indicator when connected and not muted */}
        {isConnected && !isMuted ? (
          <div className="flex-1 flex items-center justify-center h-full relative overflow-hidden">
            {/* Full width audio visualization - bars respond to audio level */}
            <div className="absolute inset-0 flex items-end justify-center gap-1 px-4 py-2">
              {Array.from({ length: 24 }).map((_, i) => {
                // Create wave pattern with different multipliers for each bar
                const offset = [0.3, 0.7, 1.0, 0.8, 0.5, 0.9, 0.4, 0.6, 1.0, 0.7, 0.5, 0.8, 0.6, 0.9, 0.4, 1.0, 0.7, 0.5, 0.8, 0.3, 0.9, 0.6, 0.4, 0.7][i];
                // Bars height based on audio level (always visible, grows with voice)
                const baseHeight = Math.max(4, audioLevel * 40 * offset);
                return (
                  <span
                    key={i}
                    className="flex-1 max-w-1.5 rounded-full sound-wave-bar transition-all duration-75"
                    style={{
                      height: `${baseHeight}px`,
                      opacity: audioLevel > 0.1 ? 0.85 : 0.4,
                    }}
                  />
                );
              })}
            </div>
            <span className="text-[#C27AFF] font-medium text-[15px] tracking-[-0.3px] z-10 bg-white/90 px-3 py-1 rounded-full shadow-sm">
              Listening...
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={isDisabled || (isConnected && !isMuted)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none font-normal text-[16px] text-gray-900 placeholder-[#99a1af] tracking-[-0.3125px] leading-[24px] disabled:opacity-50"
          />
        )}
        <div className="flex items-center gap-2">
          {/* Main action button - toggles mute/unmute */}
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
