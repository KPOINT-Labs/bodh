"use client";

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
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
    { emoji: '😟', label: 'Not confident', color: 'from-red-500 to-orange-500' },
    { emoji: '😐', label: 'Somewhat confident', color: 'from-yellow-500 to-amber-500' },
    { emoji: '😄', label: 'Very confident', color: 'from-green-500 to-emerald-500' }
  ];

  const handleSelect = (index: number) => {
    setSelected(index);
    audioManager?.play('click'); 
  };

  const handleSubmit = () => {
    if (selected !== null) {
      setIsSubmitting(true);
      audioManager?.play('success');
      
      setTimeout(() => {
        onSubmit(selected);
      }, 800);
    }
  };

  return (
    <div className={cn(
      "animate-fade-in mx-auto max-w-2xl backdrop-blur-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-2xl p-5 space-y-4 shadow-lg shadow-blue-200/30",
      isSubmitting && "animate-glow-success"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-blue-600" />
        <h3 className="text-gray-800 text-sm">How confident are you?</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {levels.map((level, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "group relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300",
              selected === index
                ? `border-blue-500 ${level.color} bg-opacity-20 scale-[1.05] shadow-lg shadow-blue-400/50 animate-success-bounce`
                : "border-blue-200 bg-white/60 hover:border-blue-400 hover:bg-white/80 hover:scale-[1.03] hover:shadow-sm"
            )}
          >
            {selected === index && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-300/30 to-indigo-300/30 rounded-xl blur-lg animate-pulse-scale"></div>
            )}
            
            <div className={cn(
              "relative transition-all duration-300",
              (hoveredIndex === index || selected === index) && "scale-110 animate-wiggle"
            )}>
              <span className="text-4xl">{level.emoji}</span>
            </div>
            
            <div className="relative text-center">
              <span className={cn(
                "text-xs transition-colors",
                selected === index ? "text-gray-900" : "text-gray-600"
              )}>
                {level.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={selected === null}
        className={cn(
          "group w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100 hover:shadow-lg hover:shadow-blue-500/50 disabled:shadow-none disabled:cursor-not-allowed border border-blue-400/30 disabled:border-gray-400/30 relative overflow-hidden text-sm",
          selected !== null && !isSubmitting && "animate-pulse-scale"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        <span className="relative flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Submit Confidence Level
        </span>
      </button>
    </div>
  );
}
