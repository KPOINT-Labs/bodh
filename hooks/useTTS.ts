"use client";

import { useState, useRef, useEffect } from "react";
import { useAudioContext } from "@/contexts/AudioContext";
import { generateTTS } from "@/actions/tts";
import { TTSOptions } from "@/lib/tts";

export function useTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { isMuted, setIsPlaying: setGlobalPlaying } = useAudioContext();

  // Auto-stop when muted
  useEffect(() => {
    if (isMuted && isPlaying) {
      stop();
    }
  }, [isMuted, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

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
    // Early return if muted
    if (isMuted) {
      console.log("[useTTS] Audio is muted, skipping playback");
      return;
    }

    // Stop any currently playing audio
    stop();

    setIsLoading(true);
    setError(null);

    try {
      // Call server action
      const result = await generateTTS(text, options);

      if (!result.success || !result.audioData) {
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

      // Play audio
      await audio.play();
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
