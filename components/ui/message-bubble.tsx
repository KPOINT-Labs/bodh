import { Bot, User, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MessageBubbleProps {
  type: 'ai' | 'user';
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
  isFirstMessage = false
}: MessageBubbleProps) {
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (enableAnimation) {
      // Split content into words for typing animation
      const wordArray = content.split(/(\s+)/g).filter(segment => segment.trim().length > 0);
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
    if (enableAnimation && words.length > 0 && currentWordIndex < words.length) {
      const timer = setTimeout(() => {
        setCurrentWordIndex(prev => prev + 1);
      }, 80); // Show each word every 80ms

      return () => clearTimeout(timer);
    } else if (enableAnimation && currentWordIndex >= words.length && !animationComplete) {
      setAnimationComplete(true);
      if (onAnimationComplete) {
        setTimeout(() => onAnimationComplete(), 200);
      }
    }
  }, [currentWordIndex, words.length, enableAnimation, animationComplete, onAnimationComplete]);

  // Call completion callback immediately if no animation
  useEffect(() => {
    if (!enableAnimation && onAnimationComplete) {
      const timer = setTimeout(() => onAnimationComplete(), 100);
      return () => clearTimeout(timer);
    }
  }, [enableAnimation, onAnimationComplete]);

  if (type === 'ai') {
    if (enableAnimation && words.length > 0) {
      return (
        <div className="flex gap-2 items-start animate-fade-in w-full">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className={`bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] ${
            isFirstMessage ? 'text-base' : 'text-sm'
          }`}>
            <p className="leading-relaxed text-gray-800 whitespace-pre-line">
              {words.map((word, index) => {
                const isVisible = index < currentWordIndex;
                const isCurrent = index === currentWordIndex;
                return (
                  <span
                    key={index}
                    className={`${
                      isVisible ? 'opacity-100' : 'opacity-0'
                    } ${
                      isCurrent ? 'font-semibold' : ''
                    } transition-opacity duration-100`}
                  >
                    {word}{' '}
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
      <div className="flex gap-2 items-start animate-fade-in w-full">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className={`bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] ${
          isFirstMessage ? 'text-base' : 'text-sm'
        }`}>
          <p className="leading-relaxed text-gray-800 whitespace-pre-line">
            {content.trim()}
          </p>
        </div>
      </div>
    );
  }

  // User message
  if (type === 'user') {
    if (enableAnimation && words.length > 0) {
      return (
        <div className="flex gap-2 items-start justify-end animate-fade-in w-full">
          <div className="bg-blue-500 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
            <p className="text-white text-sm whitespace-pre-line">
              {words.map((word, index) => {
                const isVisible = index < currentWordIndex;
                return (
                  <span
                    key={index}
                    className={`${isVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
                  >
                    {word}{' '}
                  </span>
                );
              })}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 border border-indigo-200">
            <User className="h-4 w-4 text-indigo-700" />
          </div>
        </div>
      );
    }

    // No animation - show instantly
    return (
      <div className="flex gap-2 items-start justify-end animate-fade-in w-full">
        <div className="bg-blue-500 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%]">
          <p className="text-white text-sm whitespace-pre-line">{content.trim()}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 border border-indigo-200">
          <User className="h-4 w-4 text-indigo-700" />
        </div>
      </div>
    );
  }

  return null;
}
