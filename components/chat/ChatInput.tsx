"use client";

import { useRef, useState } from "react";

interface ChatInputProps {
  placeholder?: string;
  disabled?: boolean;
  onSend?: (message: string) => void | Promise<void>;
  isLoading?: boolean;
}

export function ChatInput({
  placeholder = "Tap to talk",
  disabled = false,
  onSend,
  isLoading = false,
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async () => {
    const message = inputValue.trim();
    if (message && onSend) {
      setInputValue("");
      await onSend(message);
    }
  };

  const handleVoiceClick = () => {
    console.log("Voice input clicked");
    // TODO: Integrate with voice input API
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <div className="flex items-center justify-center p-[20px]">
      <div className="bg-white border border-gray-200 flex h-[58px] items-center justify-between pl-[25px] pr-[8px] py-[7px] relative rounded-full shadow-sm flex-1 max-w-3xl">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isLoading ? "Thinking..." : placeholder}
          disabled={isDisabled}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none font-normal text-[16px] text-gray-900 placeholder-[#99a1af] tracking-[-0.3125px] leading-[24px] disabled:opacity-50"
        />
        <button
          onClick={inputValue.trim() ? handleSubmit : handleVoiceClick}
          disabled={isDisabled}
          className="flex items-center justify-center w-[44px] h-[44px] rounded-full shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, #FB64B6 0%, #C27AFF 50%, #51A2FF 100%)'
          }}
        >
          {isLoading ? (
            <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
          ) : inputValue.trim() ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 10H4M6 7V13M10 4V16M14 7V13M18 10H16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}