"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { audioManager } from "@/lib/audio/quizAudio";

interface ChoiceButton {
  label: string;
  action: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface ChoiceButtonsProps {
  buttons: ChoiceButton[];
  onSelect: (action: string) => void;
}

export function ChoiceButtons({ buttons, onSelect }: ChoiceButtonsProps) {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  const handleClick = (action: string, index: number, disabled?: boolean) => {
    if (disabled) return;
    setClickedIndex(index);
    audioManager?.play("click");
    setTimeout(() => {
      onSelect(action);
      setClickedIndex(null);
    }, 300);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {buttons.map((button, index) => {
        const Icon = button.icon;
        return (
          <button
            key={index}
            onClick={() => handleClick(button.action, index, button.disabled)}
            disabled={button.disabled}
            className={cn(
              "group flex-1 relative px-4 py-2 rounded-lg overflow-hidden transition-all duration-300 text-sm",
              button.disabled
                ? "bg-gray-100/70 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"
                : "bg-white/70 hover:bg-white/90 text-gray-600 hover:text-blue-600 hover:scale-[1.01] hover:shadow-md hover:shadow-blue-200/30 border border-blue-200 hover:border-blue-300",
              clickedIndex === index && "animate-success-bounce scale-105"
            )}
          >
            {/* Shine effect - only show if not disabled */}
            {!button.disabled && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}

            <div className="relative flex items-center justify-center gap-1.5">
              {Icon && <Icon className="w-4 h-4" />}
              <span>{button.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
