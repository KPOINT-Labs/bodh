"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AudioContextType {
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  setIsPlaying: (playing: boolean) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioContextProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <AudioContext.Provider
      value={{
        isMuted,
        isPlaying,
        toggleMute,
        setIsPlaying,
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
