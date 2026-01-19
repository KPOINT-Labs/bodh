"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useAudioContext } from "@/contexts/AudioContext";

export function AudioToggleButton() {
  const { isMuted, toggleMute } = useAudioContext();

  return (
    <button
      onClick={toggleMute}
      className={`tour-audio-toggle p-2 rounded-lg transition-all hover:scale-110 ${
        isMuted
          ? "bg-gray-300 text-gray-600 hover:bg-gray-400"
          : "bg-blue-500 text-white hover:bg-blue-600"
      }`}
      title={isMuted ? "Unmute voice" : "Mute voice"}
      aria-label={isMuted ? "Unmute voice" : "Mute voice"}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
    </button>
  );
}
