"use client";

import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { audioManager } from "@/lib/audio/quizAudio";
import { cn } from "@/lib/utils";

interface ConfidenceSliderProps {
  onSubmit: (level: number) => void;
}

export function ConfidenceSlider({ onSubmit }: ConfidenceSliderProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const levels = [
    {
      emoji: "😟",
      label: "Not confident",
      color: "from-red-500 to-orange-500",
    },
    {
      emoji: "😐",
      label: "Somewhat confident",
      color: "from-yellow-500 to-amber-500",
    },
    {
      emoji: "😄",
      label: "Very confident",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const handleSelect = (index: number) => {
    setSelected(index);
    audioManager?.play("click");
  };

  const handleSubmit = () => {
    if (selected !== null) {
      setIsSubmitting(true);
      audioManager?.play("success");

      setTimeout(() => {
        onSubmit(selected);
      }, 800);
    }
  };

  return (
    <div
      className={cn(
        "mx-auto max-w-2xl animate-fade-in space-y-4 rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-blue-200/30 shadow-lg backdrop-blur-xl",
        isSubmitting && "animate-glow-success"
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-600" />
        <h3 className="text-gray-800 text-sm">How confident are you?</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {levels.map((level, index) => (
          <button
            className={cn(
              "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-300",
              selected === index
                ? `border-blue-500 ${level.color} scale-[1.05] animate-success-bounce bg-opacity-20 shadow-blue-400/50 shadow-lg`
                : "border-blue-200 bg-white/60 hover:scale-[1.03] hover:border-blue-400 hover:bg-white/80 hover:shadow-sm"
            )}
            key={index}
            onClick={() => handleSelect(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {selected === index && (
              <div className="absolute inset-0 animate-pulse-scale rounded-xl bg-gradient-to-br from-blue-300/30 to-indigo-300/30 blur-lg" />
            )}

            <div
              className={cn(
                "relative transition-all duration-300",
                (hoveredIndex === index || selected === index) &&
                  "scale-110 animate-wiggle"
              )}
            >
              <span className="text-4xl">{level.emoji}</span>
            </div>

            <div className="relative text-center">
              <span
                className={cn(
                  "text-xs transition-colors",
                  selected === index ? "text-gray-900" : "text-gray-600"
                )}
              >
                {level.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        className={cn(
          "group relative w-full overflow-hidden rounded-lg border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm text-white transition-all duration-300 hover:scale-[1.02] hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/50 hover:shadow-lg disabled:scale-100 disabled:cursor-not-allowed disabled:border-gray-400/30 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none",
          selected !== null && !isSubmitting && "animate-pulse-scale"
        )}
        disabled={selected === null}
        onClick={handleSubmit}
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
        <span className="relative flex items-center justify-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Submit Confidence Level
        </span>
      </button>
    </div>
  );
}
