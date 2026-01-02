import { useState, useEffect, useCallback } from "react";

interface UseTypingEffectOptions {
  /** Speed in milliseconds per character */
  speed?: number;
  /** Callback when typing completes */
  onComplete?: () => void;
  /** Scroll callback during typing (called every N characters) */
  onScrollNeeded?: () => void;
  /** How often to trigger scroll (every N characters) */
  scrollInterval?: number;
}

interface UseTypingEffectReturn {
  displayedText: string;
  isTyping: boolean;
  startTyping: (text: string) => void;
}

/**
 * Hook for creating a typewriter effect on text
 *
 * @example
 * const { displayedText, isTyping, startTyping } = useTypingEffect({
 *   speed: 10,
 *   onComplete: () => console.log('Done typing'),
 * });
 */
export function useTypingEffect(
  options: UseTypingEffectOptions = {}
): UseTypingEffectReturn {
  const {
    speed = 10,
    onComplete,
    onScrollNeeded,
    scrollInterval = 50,
  } = options;

  const [fullText, setFullText] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const startTyping = useCallback((text: string) => {
    setFullText(text);
    setDisplayedText("");
    setIsTyping(true);
  }, []);

  useEffect(() => {
    if (!isTyping || !fullText) return;

    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;

        // Trigger scroll at intervals
        if (onScrollNeeded && currentIndex % scrollInterval === 0) {
          onScrollNeeded();
        }
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        onComplete?.();
        onScrollNeeded?.();
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [isTyping, fullText, speed, onComplete, onScrollNeeded, scrollInterval]);

  return { displayedText, isTyping, startTyping };
}
