import { useState } from 'react';
import { audioManager } from '@/lib/audio-manager';

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
    if (disabled) return;

    setClickedIndex(index);
    audioManager.play('click');

    setTimeout(() => {
      onSelect(action);
      setClickedIndex(null);
    }, 300);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {buttons.map((button, index) => (
        <button
          key={index}
          onClick={() => handleClick(button.action, index, button.disabled)}
          disabled={button.disabled}
          className={`group flex-1 relative px-4 py-2 rounded-lg overflow-hidden transition-all duration-300 text-sm font-medium ${
            button.disabled
              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-white/90 text-gray-600 hover:text-blue-600 hover:scale-[1.01] hover:shadow-md hover:shadow-blue-200/30 border border-blue-200 hover:border-blue-300'
          } ${clickedIndex === index ? 'scale-105' : ''}`}
        >
          {/* Shine effect */}
          {!button.disabled && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          )}

          <div className="relative flex items-center justify-center gap-1.5">
            <span>{button.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
