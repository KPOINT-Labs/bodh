"use client";

import { useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { audioManager } from "@/lib/audio/quizAudio";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  onSubmit: (selected: string[]) => void;
}

export function MultiSelect({ options, onSubmit }: MultiSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (option: string) => {
    setSelected(prev =>
      prev.includes(option)
        ? prev.filter(item => item !== option)
        : [...prev, option]
    );
    audioManager?.play('click');
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onSubmit(selected);
      audioManager?.play('success');
    }
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl backdrop-blur-xl bg-white/80 border-2 border-purple-200 rounded-2xl p-4 space-y-2 shadow-lg shadow-purple-200/30">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-700 text-xs">Select all that apply</p>
        {selected.length > 0 && (
          <span className="text-purple-600 text-xs">{selected.length} selected</span>
        )}
      </div>
      
      {options.map((option, index) => (
        <label
          key={index}
          htmlFor={`multi-option-${index}`}
          className={cn(
            "group flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 text-sm",
            selected.includes(option)
              ? "border-purple-500 bg-gradient-to-r from-purple-100 to-pink-100 shadow-md shadow-purple-300/40 scale-[1.02]"
              : "border-purple-200 bg-white/60 hover:border-purple-400 hover:bg-white/80 hover:shadow-sm"
          )}
        >
          <input
            type="checkbox"
            id={`multi-option-${index}`}
            checked={selected.includes(option)}
            onChange={() => toggleOption(option)}
            className="sr-only"
          />
          <div className={cn(
            "flex-shrink-0 transition-colors duration-300",
            selected.includes(option) ? "text-purple-600" : "text-gray-300"
          )}>
            {selected.includes(option) ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </div>
          <span className="flex-1 text-gray-800 group-hover:text-gray-900 transition-colors">{option}</span>
        </label>
      ))}

      <button
        onClick={handleSubmit}
        disabled={selected.length === 0}
        className={cn(
          "group w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-300 hover:scale-[1.02] disabled:scale-100 hover:shadow-lg hover:shadow-purple-500/50 disabled:shadow-none disabled:cursor-not-allowed border border-purple-400/30 disabled:border-gray-400/30 relative overflow-hidden text-sm",
          selected.length > 0 && "animate-pulse-scale"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        <span className="relative">Submit Selections</span>
      </button>
    </div>
  );
}
