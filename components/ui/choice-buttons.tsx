import { useState } from "react";
import { audioManager } from "@/lib/audio-manager";

interface ChoiceButtonsProps {
  buttons: {
    label: string;
    action: string;
    disabled?: boolean;
  }[];
  onSelect: (action: string) => void;
}

export function ChoiceButtons({ buttons, onSelect }: ChoiceButtonsProps) {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  const handleClick = (action: string, index: number, disabled?: boolean) => {
    if (disabled) {
      return;
    }

    setClickedIndex(index);
    audioManager.play("click");

    setTimeout(() => {
      onSelect(action);
      setClickedIndex(null);
    }, 300);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button, index) => (
        <button
          className={`group relative flex-1 overflow-hidden rounded-lg px-4 py-2 font-medium text-sm transition-all duration-300 ${
            button.disabled
              ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 opacity-60"
              : "border border-blue-200 bg-white text-gray-600 hover:scale-[1.01] hover:border-blue-300 hover:bg-white/90 hover:text-blue-600 hover:shadow-blue-200/30 hover:shadow-md"
          } ${clickedIndex === index ? "scale-105" : ""}`}
          disabled={button.disabled}
          key={index}
          onClick={() => handleClick(button.action, index, button.disabled)}
        >
          {/* Shine effect */}
          {!button.disabled && (
            <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
          )}

          <div className="relative flex items-center justify-center gap-1.5">
            <span>{button.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
