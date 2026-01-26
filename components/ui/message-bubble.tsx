import { Sparkles, User } from "lucide-react";
import { useEffect, useState } from "react";

interface MessageBubbleProps {
  type: "ai" | "user";
  content: string;
  onAnimationComplete?: () => void;
  enableAnimation?: boolean;
  isFirstMessage?: boolean;
}

export function MessageBubble({
  type,
  content,
  onAnimationComplete,
  enableAnimation = false,
  isFirstMessage = false,
}: MessageBubbleProps) {
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (enableAnimation) {
      // Split content into words for typing animation
      const wordArray = content
        .split(/(\s+)/g)
        .filter((segment) => segment.trim().length > 0);
      setWords(wordArray);
      setCurrentWordIndex(0);
      setAnimationComplete(false);
    } else {
      setWords([]);
      setCurrentWordIndex(-1);
      setAnimationComplete(true);
    }
  }, [content, enableAnimation]);

  // Word-by-word typing animation
  useEffect(() => {
    if (
      enableAnimation &&
      words.length > 0 &&
      currentWordIndex < words.length
    ) {
      const timer = setTimeout(() => {
        setCurrentWordIndex((prev) => prev + 1);
      }, 80); // Show each word every 80ms

      return () => clearTimeout(timer);
    }
    if (
      enableAnimation &&
      currentWordIndex >= words.length &&
      !animationComplete
    ) {
      setAnimationComplete(true);
      if (onAnimationComplete) {
        setTimeout(() => onAnimationComplete(), 200);
      }
    }
  }, [
    currentWordIndex,
    words.length,
    enableAnimation,
    animationComplete,
    onAnimationComplete,
  ]);

  // Call completion callback immediately if no animation
  useEffect(() => {
    if (!enableAnimation && onAnimationComplete) {
      const timer = setTimeout(() => onAnimationComplete(), 100);
      return () => clearTimeout(timer);
    }
  }, [enableAnimation, onAnimationComplete]);

  if (type === "ai") {
    if (enableAnimation && words.length > 0) {
      return (
        <div className="flex w-full animate-fade-in items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div
            className={`max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 ${
              isFirstMessage ? "text-base" : "text-sm"
            }`}
          >
            <p className="whitespace-pre-line text-gray-800 leading-relaxed">
              {words.map((word, index) => {
                const isVisible = index < currentWordIndex;
                const isCurrent = index === currentWordIndex;
                return (
                  <span
                    className={`${isVisible ? "opacity-100" : "opacity-0"} ${
                      isCurrent ? "font-semibold" : ""
                    } transition-opacity duration-100`}
                    key={index}
                  >
                    {word}{" "}
                  </span>
                );
              })}
            </p>
          </div>
        </div>
      );
    }

    // No animation - show instantly
    return (
      <div className="flex w-full animate-fade-in items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div
          className={`max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 ${
            isFirstMessage ? "text-base" : "text-sm"
          }`}
        >
          <p className="whitespace-pre-line text-gray-800 leading-relaxed">
            {content.trim()}
          </p>
        </div>
      </div>
    );
  }

  // User message
  if (type === "user") {
    if (enableAnimation && words.length > 0) {
      return (
        <div className="flex w-full animate-fade-in items-start justify-end gap-2">
          <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-3">
            <p className="whitespace-pre-line text-sm text-white">
              {words.map((word, index) => {
                const isVisible = index < currentWordIndex;
                return (
                  <span
                    className={`${isVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-100`}
                    key={index}
                  >
                    {word}{" "}
                  </span>
                );
              })}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100">
            <User className="h-4 w-4 text-indigo-700" />
          </div>
        </div>
      );
    }

    // No animation - show instantly
    return (
      <div className="flex w-full animate-fade-in items-start justify-end gap-2">
        <div className="max-w-[70%] rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-3">
          <p className="whitespace-pre-line text-sm text-white">
            {content.trim()}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100">
          <User className="h-4 w-4 text-indigo-700" />
        </div>
      </div>
    );
  }

  return null;
}
