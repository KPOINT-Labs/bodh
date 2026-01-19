"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

type MuteCallback = (muted: boolean) => void;

interface AudioContextType {
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
  /** Register a callback to be notified when mute state changes */
  registerMuteCallback: (callback: MuteCallback) => void;
  /** Unregister a previously registered callback */
  unregisterMuteCallback: (callback: MuteCallback) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Store registered callbacks for mute state changes
  const muteCallbacksRef = useRef<Set<MuteCallback>>(new Set());

  // Load muted state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("audio-muted");
    if (saved !== null) {
      setIsMuted(saved === "true");
    }
  }, []);

  // Save muted state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("audio-muted", String(isMuted));
  }, [isMuted]);

  // Notify all registered callbacks when mute state changes
  const notifyCallbacks = useCallback((muted: boolean) => {
    muteCallbacksRef.current.forEach((callback) => {
      try {
        callback(muted);
      } catch (err) {
        console.error("[AudioContext] Callback error:", err);
      }
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      // Notify callbacks with the new value
      notifyCallbacks(newMuted);
      return newMuted;
    });
  }, [notifyCallbacks]);

  const setMutedWithNotify = useCallback((muted: boolean) => {
    setIsMuted(muted);
    notifyCallbacks(muted);
  }, [notifyCallbacks]);

  const registerMuteCallback = useCallback((callback: MuteCallback) => {
    muteCallbacksRef.current.add(callback);
  }, []);

  const unregisterMuteCallback = useCallback((callback: MuteCallback) => {
    muteCallbacksRef.current.delete(callback);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        isMuted,
        isPlaying,
        toggleMute,
        setMuted: setMutedWithNotify,
        setIsPlaying,
        registerMuteCallback,
        unregisterMuteCallback,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error("useAudioContext must be used within AudioContextProvider");
  }
  return context;
}
