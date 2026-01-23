"use client";

import { useEffect, useRef, useState } from "react";
import { generateTTS } from "@/actions/tts";
import { useAudioContext } from "@/contexts/AudioContext";
import type { TTSOptions } from "@/lib/tts";

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAudioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {
    isMuted,
    setIsPlaying: setGlobalPlaying,
    setMuted,
  } = useAudioContext();

  // Auto-stop when muted
  useEffect(() => {
    if (isMuted && isPlaying) {
      stop();
    }
  }, [isMuted, isPlaying, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [stop]);

  // Set up user interaction listener for retry
  useEffect(() => {
    const handleUserInteraction = () => {
      if (pendingAudioRef.current) {
        console.log(
          "[useTTS] User interaction detected, retrying audio playback"
        );
        const audio = pendingAudioRef.current;
        pendingAudioRef.current = null;

        audio
          .play()
          .then(() => {
            setMuted(false); // Unmute on successful playback
          })
          .catch((err) => {
            console.error("[useTTS] Retry failed:", err);
          });

        // Remove listeners after first interaction
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
        document.removeEventListener("keydown", handleUserInteraction);
      }
    };

    if (pendingAudioRef.current) {
      document.addEventListener("click", handleUserInteraction);
      document.addEventListener("touchstart", handleUserInteraction);
      document.addEventListener("keydown", handleUserInteraction);
    }

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [setMuted]);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setGlobalPlaying(false);
  };

  const speak = async (text: string, options?: TTSOptions) => {
    console.log(
      "[useTTS] speak() called with text:",
      text.substring(0, 50),
      "options:",
      options
    );
    console.log(
      "[useTTS] Current state - isMuted:",
      isMuted,
      "isLoading:",
      isLoading,
      "isPlaying:",
      isPlaying
    );

    // Early return if muted (check before interrupt logic)
    if (isMuted) {
      console.log("[useTTS] Audio is muted, skipping playback");
      return;
    }

    // If interrupt is true, stop current playback and proceed
    if (options?.interrupt) {
      console.log("[useTTS] Interrupt flag set, stopping current playback");
      stop();
      // Don't check isLoading/isPlaying when interrupting - always proceed
    } else {
      // Safety check: prevent duplicate playback unless interrupting
      if (isLoading || isPlaying) {
        console.log(
          "[useTTS] Already loading or playing, skipping duplicate request"
        );
        return;
      }
    }

    console.log("[useTTS] Proceeding with TTS generation");

    // Stop any currently playing audio
    stop();

    setIsLoading(true);
    setError(null);

    try {
      // Call server action
      const result = await generateTTS(text, options);

      if (!(result.success && result.audioData)) {
        setError(result.error || "Failed to generate audio");
        console.error("[useTTS] Generation failed:", result.error);
        return;
      }

      // Create audio element
      const audio = new Audio(`data:audio/mp3;base64,${result.audioData}`);
      audioRef.current = audio;

      // Set up event listeners
      audio.onplay = () => {
        console.log("[useTTS] Audio started playing");
        setIsPlaying(true);
        setGlobalPlaying(true);
      };

      audio.onended = () => {
        console.log("[useTTS] Audio finished playing");
        setIsPlaying(false);
        setGlobalPlaying(false);
      };

      audio.onerror = (e) => {
        console.error("[useTTS] Audio playback error:", e);
        setError("Audio playback failed");
        setIsPlaying(false);
        setGlobalPlaying(false);
      };

      // Try to play audio
      try {
        await audio.play();
      } catch (playError: any) {
        console.error("[useTTS] Autoplay failed:", playError);

        // If autoplay failed due to user interaction requirement
        if (
          playError.name === "NotAllowedError" ||
          playError.message.includes("user gesture")
        ) {
          console.log(
            "[useTTS] Autoplay blocked, setting muted state and waiting for user interaction"
          );

          // Set muted state
          setMuted(true);

          // Keep audio ready for retry
          pendingAudioRef.current = audio;

          // Clear retry after 5 seconds
          retryTimeoutRef.current = setTimeout(() => {
            console.log("[useTTS] Retry timeout expired");
            pendingAudioRef.current = null;
          }, 5000);

          setError("Click anywhere to enable audio");
        } else {
          throw playError;
        }
      }
    } catch (err: any) {
      console.error("[useTTS] Error:", err);
      setError(err?.message || "Failed to generate audio");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    error,
  };
}
