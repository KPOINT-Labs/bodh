"use client";

import { CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { audioManager } from "@/lib/audio/quizAudio";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  onSubmit: (selected: string[]) => void;
}

export function MultiSelect({ options, onSubmit }: MultiSelectProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (option: string) => {
    setSelected((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
    audioManager?.play("click");
  };

  const handleSubmit = () => {
    if (selected.length > 0) {
      onSubmit(selected);
      audioManager?.play("success");
    }
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-2 rounded-2xl border-2 border-purple-200 bg-white/80 p-4 shadow-lg shadow-purple-200/30 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-gray-700 text-xs">Select all that apply</p>
        {selected.length > 0 && (
          <span className="text-purple-600 text-xs">
            {selected.length} selected
          </span>
        )}
      </div>

      {options.map((option, index) => (
        <label
          className={cn(
            "group flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-sm transition-all duration-300",
            selected.includes(option)
              ? "scale-[1.02] border-purple-500 bg-gradient-to-r from-purple-100 to-pink-100 shadow-md shadow-purple-300/40"
              : "border-purple-200 bg-white/60 hover:border-purple-400 hover:bg-white/80 hover:shadow-sm"
          )}
          htmlFor={`multi-option-${index}`}
          key={index}
        >
          <input
            checked={selected.includes(option)}
            className="sr-only"
            id={`multi-option-${index}`}
            onChange={() => toggleOption(option)}
            type="checkbox"
          />
          <div
            className={cn(
              "flex-shrink-0 transition-colors duration-300",
              selected.includes(option) ? "text-purple-600" : "text-gray-300"
            )}
          >
            {selected.includes(option) ? (
              <CheckSquare className="h-5 w-5" />
            ) : (
              <Square className="h-5 w-5" />
            )}
          </div>
          <span className="flex-1 text-gray-800 transition-colors group-hover:text-gray-900">
            {option}
          </span>
        </label>
      ))}

      <button
        className={cn(
          "group relative w-full overflow-hidden rounded-lg border border-purple-400/30 bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm text-white transition-all duration-300 hover:scale-[1.02] hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/50 disabled:scale-100 disabled:cursor-not-allowed disabled:border-gray-400/30 disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-none",
          selected.length > 0 && "animate-pulse-scale"
        )}
        disabled={selected.length === 0}
        onClick={handleSubmit}
      >
        <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
        <span className="relative">Submit Selections</span>
      </button>
    </div>
  );
}
