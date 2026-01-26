"use client";

import { Loader2, Mic, MicOff, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  transcriptSegments: {
    id: string;
    text: string;
    participantIdentity: string;
    isAgent: boolean;
    isFinal: boolean;
    timestamp: number;
  }[];
  isAgentSpeaking: boolean;
  isAudioBlocked: boolean;
  isWaitingForAgentResponse: boolean;
  // Voice mode state
  isVoiceModeEnabled: boolean;
  userTranscript: string;
  isUserSpeaking: boolean;
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => Promise<void>;
  startAudio: () => Promise<void>;
  sendTextToAgent: (text: string) => Promise<void>;
  clearAgentTranscript: () => void;
  // Voice mode actions
  enableVoiceMode: () => Promise<boolean>;
  disableVoiceMode: () => Promise<boolean>;
  clearUserTranscript: () => void;
}

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  /** Add user message to chat UI and store in DB (for LiveKit flow) */
  onAddUserMessage?: (
    message: string,
    messageType?: string,
    inputType?: string
  ) => void | Promise<void>;
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
  onAddUserMessage,
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
    conversationId: liveKitState ? "" : conversationId || "",
    courseId: liveKitState ? "" : courseId || "",
    userId: liveKitState ? undefined : userId,
    videoIds: liveKitState ? undefined : videoIds,
    autoConnect: false, // Never auto-connect from ChatInput
  });

  // Use parent's LiveKit state if provided, otherwise use own hook
  const {
    isConnected,
    isConnecting,
    isMuted,
    audioLevel,
    error: voiceError,
    sendTextToAgent,
    isVoiceModeEnabled,
    enableVoiceMode,
    disableVoiceMode,
  } = liveKitState || ownLiveKit;

  // Log voice errors when they occur (only for own hook, parent handles its own)
  useEffect(() => {
    if (!liveKitState && voiceError) {
      console.error("[Voice] Error:", voiceError);
      toast.error("Voice connection failed", {
        description: voiceError,
        duration: 2000,
      });
    }
  }, [voiceError, liveKitState]);

  // Track previous connection state to detect changes (only for own hook)
  const prevConnectedRef = useRef(false);
  useEffect(() => {
    if (liveKitState) {
      return; // Parent handles its own toast notifications
    }

    if (isConnected && !prevConnectedRef.current) {
      // Just connected
      toast.success("Voice session started", {
        description: "You can now speak to the AI assistant",
        duration: 2000,
      });
    } else if (!isConnected && prevConnectedRef.current) {
      // Just disconnected
      toast.info("Voice session ended", { duration: 2000 });
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, liveKitState]);

  // Handle text message submit - all messages go through LiveKit
  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (!message) {
      return;
    }

    setInputValue("");

    // All messages must go through LiveKit (prism handles Sarvam API)
    if (!isConnected) {
      console.warn("[ChatInput] LiveKit not connected, cannot send message");
      return;
    }

    console.log("[ChatInput] Sending message via LiveKit");
    // Add user message to chat UI and store in DB
    if (onAddUserMessage) {
      await onAddUserMessage(message, "general", "text");
    }
    try {
      await sendTextToAgent(message);
    } catch (err) {
      console.error("[ChatInput] Failed to send via LiveKit:", err);
    }
  };

  // Handle voice button click - toggle voice mode (enables/disables STT on agent)
  const handleVoiceClick = async () => {
    console.log("[Voice] Button clicked", {
      isConnected,
      isMuted,
      isVoiceModeEnabled,
    });

    if (!isConnected) {
      console.log("[Voice] Session not connected yet, waiting...");
      return;
    }

    if (isVoiceModeEnabled) {
      // Currently in voice mode - disable it
      console.log("[Voice] Disabling voice mode...");
      const success = await disableVoiceMode();
      if (success) {
        toast.info("Voice mode disabled", {
          description: "Switched back to text input",
          duration: 2000,
        });
      } else {
        toast.error("Failed to disable voice mode", { duration: 2000 });
      }
    } else {
      // Not in voice mode - enable it
      console.log("[Voice] Enabling voice mode...");
      const success = await enableVoiceMode();
      if (success) {
        toast.success("Voice mode enabled", {
          description: "You can now speak to the AI assistant",
          duration: 2000,
        });
      } else {
        toast.error("Failed to enable voice mode", { duration: 2000 });
      }
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
    if (isLoading) {
      return "Thinking...";
    }
    if (isConnected) {
      return isVoiceModeEnabled ? "Listening..." : "Type your question here";
    }
    return placeholder;
  };

  return (
    <div className="flex items-center justify-center px-6 py-4">
      <div className="relative flex h-[58px] w-full items-center justify-between rounded-full border border-gray-200 bg-white py-[7px] pr-[8px] pl-[25px] shadow-sm">
        {/* Show animated listening indicator when voice mode is enabled */}
        {isConnected && isVoiceModeEnabled ? (
          <div className="relative flex h-full flex-1 items-center justify-center overflow-hidden">
            {/* Full width audio visualization - bars respond to audio level */}
            <div className="absolute inset-0 flex items-end justify-center gap-1 px-4 py-2">
              {Array.from({ length: 24 }).map((_, i) => {
                // Create wave pattern with different multipliers for each bar
                const offset = [
                  0.3, 0.7, 1.0, 0.8, 0.5, 0.9, 0.4, 0.6, 1.0, 0.7, 0.5, 0.8,
                  0.6, 0.9, 0.4, 1.0, 0.7, 0.5, 0.8, 0.3, 0.9, 0.6, 0.4, 0.7,
                ][i];
                // Bars height based on audio level (always visible, grows with voice)
                const baseHeight = Math.max(4, audioLevel * 40 * offset);
                return (
                  <span
                    className="sound-wave-bar max-w-1.5 flex-1 rounded-full transition-all duration-75"
                    key={i}
                    style={{
                      height: `${baseHeight}px`,
                      opacity: audioLevel > 0.1 ? 0.85 : 0.4,
                    }}
                  />
                );
              })}
            </div>
            <span className="z-10 rounded-full bg-white/90 px-3 py-1 font-medium text-[#C27AFF] text-[15px] tracking-[-0.3px] shadow-sm">
              Listening...
            </span>
          </div>
        ) : (
          <input
            className="tour-text-input flex-1 border-none bg-transparent font-normal text-[16px] text-gray-900 leading-[24px] tracking-[-0.3125px] placeholder-[#99a1af] outline-none disabled:opacity-50"
            disabled={isDisabled || (isConnected && isVoiceModeEnabled)}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            ref={inputRef}
            type="text"
            value={inputValue}
          />
        )}
        <div className="flex items-center gap-2">
          {/* Main action button - toggles voice mode or sends text */}
          <button
            className="tour-mic-button flex h-[44px] w-[44px] items-center justify-center rounded-full shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isDisabled || isConnecting}
            onClick={inputValue.trim() ? handleSubmit : handleVoiceClick}
            style={{
              background: isConnected
                ? isVoiceModeEnabled
                  ? "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" // Green when voice mode active
                  : "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)" // Gray when voice mode off
                : "linear-gradient(135deg, #FB64B6 0%, #C27AFF 50%, #51A2FF 100%)", // Default gradient
            }}
            title={
              isConnected
                ? isVoiceModeEnabled
                  ? "Disable voice mode"
                  : "Enable voice mode"
                : "Connecting..."
            }
          >
            {isLoading || isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : inputValue.trim() ? (
              <Send className="h-5 w-5 text-white" />
            ) : isConnected && !isVoiceModeEnabled ? (
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
