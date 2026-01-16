import { useState, useEffect, useRef } from "react";

interface UseSessionTypeOptions {
  userId: string;
  moduleId: string;
}

interface UseSessionTypeReturn {
  /** Session type based on whether user has existing messages */
  sessionType: "welcome" | "welcome_back";
  /** Whether the check is still loading */
  isLoading: boolean;
  /** Whether this is a returning user (has existing messages) */
  isReturningUser: boolean;
}

/**
 * Hook to determine session type before initializing LiveKit
 * Checks if user has existing conversation messages in this module
 */
export function useSessionType(
  options: UseSessionTypeOptions
): UseSessionTypeReturn {
  const { userId, moduleId } = options;
  const [sessionType, setSessionType] = useState<"welcome" | "welcome_back">("welcome");
  const [isLoading, setIsLoading] = useState(true);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Prevent double check in React Strict Mode
    if (hasChecked.current) return;
    hasChecked.current = true;

    async function checkSessionType() {
      try {
        // Check if user has an existing thread with messages
        const response = await fetch(
          `/api/thread?userId=${userId}&moduleId=${moduleId}`
        );
        const data = await response.json();

        if (data.success && data.thread) {
          // Check if any conversation has messages (welcome context)
          const welcomeConversation = data.thread.conversations?.find(
            (conv: { contextType: string; messages?: unknown[] }) =>
              conv.contextType === "welcome" && conv.messages && conv.messages.length > 0
          );

          if (welcomeConversation) {
            setSessionType("welcome_back");
            setIsReturningUser(true);
          } else {
            setSessionType("welcome");
            setIsReturningUser(false);
          }
        }
      } catch (error) {
        console.error("[useSessionType] Failed to check session type:", error);
        // Default to welcome on error
        setSessionType("welcome");
        setIsReturningUser(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkSessionType();
  }, [userId, moduleId]);

  return { sessionType, isLoading, isReturningUser };
}
