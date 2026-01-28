"use client";

import { useCallback, useEffect } from "react";
import { useAudioContext } from "@/contexts/AudioContext";
import { audioManager } from "@/lib/audio-manager";

type SoundType = "success" | "error" | "click" | "celebration" | "notification" | "pop";

export function useFeedbackSound() {
  const { isMuted } = useAudioContext();

  // Sync audioManager enabled state with global mute state
  useEffect(() => {
    audioManager?.setEnabled(!isMuted);
  }, [isMuted]);

  const playSound = useCallback(
    (type: SoundType) => {
      if (isMuted) return;
      audioManager?.play(type as any);
    },
    [isMuted]
  );

  return { playSound };
}
