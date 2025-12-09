"use client";

import { useRef } from "react";

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  placeholder = "Tap to talk",
  disabled = false
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (message: string) => {
    if (message.trim()) {
      console.log("Chat message:", message);
      // TODO: Integrate with actual chat API
    }
  };

  const handleVoiceClick = () => {
    console.log("Voice input clicked");
    // TODO: Integrate with voice input API
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const value = e.currentTarget.value;
      if (value.trim()) {
        handleSubmit(value);
        e.currentTarget.value = "";
      }
    }
  };

  return (
    <div className="flex items-center justify-center p-[30px]">
      <div className="bg-white border border-gray-200 flex h-[58px] items-center justify-between pl-[25px] pr-[8px] py-[7px] relative rounded-full shadow-sm flex-1 max-w-3xl">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none font-normal text-[16px] text-gray-900 placeholder-[#99a1af] tracking-[-0.3125px] leading-[24px]"
        />
        <button
          onClick={handleVoiceClick}
          disabled={disabled}
          className="flex items-center justify-center w-[44px] h-[44px] rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #FB64B6 0%, #C27AFF 50%, #51A2FF 100%)'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 10H4M6 7V13M10 4V16M14 7V13M18 10H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}