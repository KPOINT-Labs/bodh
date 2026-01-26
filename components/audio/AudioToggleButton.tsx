"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useAudioContext } from "@/contexts/AudioContext";

export function AudioToggleButton() {
  const { isMuted, toggleMute } = useAudioContext();

  return (
    <button
      aria-label={isMuted ? "Unmute voice" : "Mute voice"}
      className={`tour-audio-toggle rounded-lg p-2 transition-all hover:scale-110 ${
        isMuted
          ? "bg-gray-300 text-gray-600 hover:bg-gray-400"
          : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      onClick={toggleMute}
      title={isMuted ? "Unmute voice" : "Mute voice"}
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </button>
  );
}
