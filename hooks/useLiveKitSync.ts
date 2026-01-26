"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface UseLiveKitSyncProps {
  isConnected: boolean;
  isAudioBlocked: boolean;
  error: string | null;
  startAudio: () => Promise<void>;
  setAudioOutputEnabled: (enabled: boolean) => Promise<boolean>;
  isAudioMuted: boolean;
  registerMuteCallback: (callback: (muted: boolean) => void) => void;
  unregisterMuteCallback: (callback: (muted: boolean) => void) => void;
}

export function useLiveKitSync({
  isConnected,
  isAudioBlocked,
  error,
  startAudio,
  setAudioOutputEnabled,
  isAudioMuted,
  registerMuteCallback,
  unregisterMuteCallback,
}: UseLiveKitSyncProps) {
  const isAudioMutedRef = useRef(isAudioMuted);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  useEffect(() => {
    if (isConnected) {
      toast.success("Voice session started", {
        description: "AI assistant is ready to speak",
        duration: 1000,
      });
    }
  }, [isConnected]);

  useEffect(() => {
    if (error) {
      toast.error("Voice connection failed", {
        description: error,
        duration: 1000,
      });
    }
  }, [error]);

  useEffect(() => {
    if (isAudioBlocked) {
      toast.info("Click to enable audio", {
        description: "Browser blocked audio playback",
        duration: 1000,
        action: {
          label: "Enable Audio",
          onClick: () => {
            startAudio();
          },
        },
      });
    }
  }, [isAudioBlocked, startAudio]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const initialMuted = isAudioMutedRef.current;
    console.log(
      "[useLiveKitSync] LiveKit connected, syncing initial mute state:",
      initialMuted
    );
    setAudioOutputEnabled(!initialMuted).catch((err) => {
      console.warn("[useLiveKitSync] Failed to sync initial mute state:", err);
    });

    const handleMuteChange = (muted: boolean) => {
      console.log("[useLiveKitSync] AudioContext mute changed:", muted);
      setAudioOutputEnabled(!muted).catch((err) => {
        console.warn(
          "[useLiveKitSync] Failed to sync audio output with mute state:",
          err
        );
      });
    };

    registerMuteCallback(handleMuteChange);
    console.log(
      "[useLiveKitSync] Registered mute callback for LiveKit audio output"
    );

    return () => {
      unregisterMuteCallback(handleMuteChange);
      console.log("[useLiveKitSync] Unregistered mute callback");
    };
  }, [
    isConnected,
    setAudioOutputEnabled,
    registerMuteCallback,
    unregisterMuteCallback,
  ]);
}
