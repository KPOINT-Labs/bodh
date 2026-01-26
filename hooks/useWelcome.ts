"use client";

/**
 * useWelcome - Hook for orchestrating welcome message flow
 *
 * Generates welcome message via LLM, plays TTS, and tracks completion.
 * Replaces LiveKit agent welcome functionality.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useTTS } from "./useTTS";
import { useAudioContext } from "@/contexts/AudioContext";
import {
  generateWelcomeMessage,
  type WelcomeContext,
} from "@/actions/welcome";
import { type SessionType } from "@/lib/welcome/prompts";

export type { SessionType, WelcomeContext };

interface UseWelcomeOptions {
  /** Disable welcome entirely (e.g., in tour mode) */
  enabled?: boolean;
  /** Called when welcome message is generated (before TTS) */
  onMessageGenerated?: (message: string) => void;
  /** Called when welcome flow completes (after TTS or immediately if muted) - receives the message */
  onComplete?: (message: string) => void;
}

interface UseWelcomeReturn {
  /** The generated welcome message text */
  welcomeMessage: string | null;
  /** True while generating message via LLM */
  isGenerating: boolean;
  /** True while TTS is playing */
  isPlaying: boolean;
  /** True while either generating or playing */
  isLoading: boolean;
  /** True when welcome flow is complete (message generated + TTS done or skipped) */
  isComplete: boolean;
  /** Error message if generation or playback failed */
  error: string | null;
  /** Stop TTS playback */
  stop: () => void;
  /** Replay the welcome message TTS */
  replay: () => Promise<void>;
}

export function useWelcome(
  sessionType: SessionType | null,
  context: Omit<WelcomeContext, "sessionType">,
  options: UseWelcomeOptions = {}
): UseWelcomeReturn {
  const { enabled = true, onMessageGenerated, onComplete } = options;

  const { speak, isPlaying, isLoading: ttsLoading, stop } = useTTS();
  const { isMuted } = useAudioContext();

  // Track which session type we've already started generating for
  // This prevents duplicate generation even if component remounts (StrictMode)
  const hasStartedForSessionRef = useRef<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate and play welcome message
  useEffect(() => {
    // Skip if disabled, no session type, or already started for this session type
    if (!enabled || !sessionType || hasStartedForSessionRef.current === sessionType) {
      return;
    }

    hasStartedForSessionRef.current = sessionType;

    const generateAndPlay = async () => {
      setIsGenerating(true);
      setError(null);
      let generatedMessage: string | null = null;

      try {
        console.log("[useWelcome] Generating welcome message for:", sessionType);

        // Generate message via server action
        generatedMessage = await generateWelcomeMessage({
          sessionType,
          ...context,
        });

        console.log("[useWelcome] Generated message:", generatedMessage.substring(0, 100) + "...");
        setWelcomeMessage(generatedMessage);
        onMessageGenerated?.(generatedMessage);

        // Play TTS if not muted
        if (!isMuted) {
          console.log("[useWelcome] Playing TTS...");
          await speak(generatedMessage);
          console.log("[useWelcome] TTS complete");
        } else {
          console.log("[useWelcome] Audio muted, skipping TTS");
        }
      } catch (err) {
        console.error("[useWelcome] Error:", err);
        setError(err instanceof Error ? err.message : "Failed to generate welcome");
      } finally {
        setIsGenerating(false);
        setIsComplete(true);
        if (generatedMessage) {
          onComplete?.(generatedMessage);
        }
      }
    };

    generateAndPlay();
  }, [sessionType, enabled]); // Intentionally minimal deps - runs once per session type

  // Replay TTS
  const replay = useCallback(async () => {
    if (welcomeMessage && !isMuted) {
      await speak(welcomeMessage, { interrupt: true });
    }
  }, [welcomeMessage, isMuted, speak]);

  return {
    welcomeMessage,
    isGenerating,
    isPlaying,
    isLoading: isGenerating || ttsLoading,
    isComplete,
    error,
    stop,
    replay,
  };
}
