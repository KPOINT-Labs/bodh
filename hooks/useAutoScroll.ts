import { useRef, useCallback } from "react";

interface UseAutoScrollOptions {
  /** Scroll behavior: smooth or instant */
  behavior?: ScrollBehavior;
}

interface UseAutoScrollReturn {
  /** Ref to attach to the scroll anchor element */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Function to trigger scroll to bottom */
  scrollToBottom: () => void;
}

/**
 * Hook for auto-scrolling to the bottom of a container
 *
 * @example
 * const { scrollRef, scrollToBottom } = useAutoScroll();
 *
 * // In JSX:
 * <div className="messages">
 *   {messages.map(...)}
 *   <div ref={scrollRef} />
 * </div>
 */
export function useAutoScroll(
  options: UseAutoScrollOptions = {}
): UseAutoScrollReturn {
  const { behavior = "smooth" } = options;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior });
  }, [behavior]);

  return { scrollRef, scrollToBottom };
}
