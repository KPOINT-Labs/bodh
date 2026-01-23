import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  /** Scroll behavior: smooth or instant */
  behavior?: ScrollBehavior;
  /** Distance from bottom (in pixels) to consider "at bottom" for auto-scroll */
  threshold?: number;
}

interface UseAutoScrollReturn {
  /** Ref to attach to the scroll anchor element */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Function to trigger scroll to bottom */
  scrollToBottom: () => void;
  /** Whether the user is currently at/near the bottom */
  isAtBottom: boolean;
  /** Force scroll to bottom (ignores user scroll position) */
  forceScrollToBottom: () => void;
}

/**
 * Find the closest scrollable ancestor of an element
 * Searches up the DOM tree for an element with overflow: auto/scroll
 */
function findScrollableAncestor(
  element: HTMLElement | null
): HTMLElement | null {
  if (!element) {
    return null;
  }

  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const isScrollable = overflowY === "auto" || overflowY === "scroll";

    // Check if this element is actually scrollable (has scrollable content)
    if (isScrollable && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Hook for smart auto-scrolling to the bottom of a container
 * Only auto-scrolls if the user is already near the bottom,
 * allowing users to scroll up and read history without interruption.
 *
 * @example
 * const { scrollRef, containerRef, scrollToBottom } = useAutoScroll();
 *
 * // In JSX:
 * <div ref={containerRef} className="overflow-y-auto">
 *   {messages.map(...)}
 *   <div ref={scrollRef} />
 * </div>
 */
export function useAutoScroll(
  options: UseAutoScrollOptions = {}
): UseAutoScrollReturn {
  const { behavior = "smooth", threshold = 100 } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableAncestorRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Track if user has manually scrolled away from bottom
  const userScrolledAwayRef = useRef(false);

  // Find and cache the scrollable ancestor
  useEffect(() => {
    if (containerRef.current) {
      scrollableAncestorRef.current = containerRef.current;
    } else if (scrollRef.current) {
      scrollableAncestorRef.current = findScrollableAncestor(scrollRef.current);
    }
  }, []);

  // Check if user is at/near the bottom of the scroll container
  const checkIfAtBottom = useCallback(() => {
    const container = scrollableAncestorRef.current || containerRef.current;
    if (!container) {
      // Try to find scrollable ancestor if not cached yet
      if (scrollRef.current) {
        scrollableAncestorRef.current = findScrollableAncestor(
          scrollRef.current
        );
        if (scrollableAncestorRef.current) {
          const { scrollTop, scrollHeight, clientHeight } =
            scrollableAncestorRef.current;
          const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
          return distanceFromBottom <= threshold;
        }
      }
      return true; // Default to true if we can't determine
    }

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, [threshold]);

  // Update isAtBottom state on scroll and track user scroll behavior
  useEffect(() => {
    // Try to find scrollable container
    let container: HTMLElement | null = containerRef.current;
    if (!container && scrollRef.current) {
      container = findScrollableAncestor(scrollRef.current);
      scrollableAncestorRef.current = container;
    }
    if (!container) {
      return;
    }

    let lastScrollTop = container.scrollTop;

    const handleScroll = () => {
      if (!container) {
        return;
      }

      const currentScrollTop = container.scrollTop;
      const atBottom = checkIfAtBottom();

      // Detect if user is scrolling UP (away from bottom)
      if (currentScrollTop < lastScrollTop && !atBottom) {
        userScrolledAwayRef.current = true;
      }

      // If user scrolled back to bottom, reset the flag
      if (atBottom) {
        userScrolledAwayRef.current = false;
      }

      setIsAtBottom(atBottom);
      lastScrollTop = currentScrollTop;
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container?.removeEventListener("scroll", handleScroll);
  }, [checkIfAtBottom]);

  // Smart scroll - only scrolls if user hasn't manually scrolled away
  const scrollToBottom = useCallback(() => {
    // Don't auto-scroll if user has manually scrolled away
    if (userScrolledAwayRef.current) {
      return;
    }

    if (checkIfAtBottom()) {
      scrollRef.current?.scrollIntoView({ behavior });
    }
  }, [behavior, checkIfAtBottom]);

  // Force scroll - always scrolls regardless of user position
  const forceScrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior });
    setIsAtBottom(true);
    userScrolledAwayRef.current = false; // Reset the flag
  }, [behavior]);

  return {
    scrollRef,
    containerRef,
    scrollToBottom,
    isAtBottom,
    forceScrollToBottom,
  };
}
