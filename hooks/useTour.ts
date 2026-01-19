"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTTS } from "./useTTS";
import type { Driver, DriveStep } from "driver.js";

interface UseTourOptions {
  onExpandSidebar?: () => void;
}

/**
 * Hook for managing the interactive product tour
 * Uses driver.js to highlight UI elements and integrates with TTS
 */
export function useTour(options?: UseTourOptions) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const { speak } = useTTS();
  const { onExpandSidebar } = options || {};

  /**
   * Validates that all required tour elements exist in the DOM
   */
  const validateTourElements = useCallback((): boolean => {
    const requiredSelectors = [
      ".tour-chat-area",
      ".tour-text-input",
      ".tour-mic-button",
      ".tour-video-panel",
      ".tour-lesson-sidebar",
      ".tour-audio-toggle",
    ];

    const missingElements = requiredSelectors.filter(
      (selector) => !document.querySelector(selector)
    );

    if (missingElements.length > 0) {
      console.error("Tour cannot start: missing elements", missingElements);
      return false;
    }

    return true;
  }, []);

  /**
   * Safely redirects after tour completion
   * Validates redirect URL to prevent open redirect attacks
   */
  const handleTourComplete = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get("redirect_back_to") || "/courses";

    // Security: Validate redirect URL to prevent open redirect attacks
    // Only allow same-origin relative paths starting with /
    const isValidRedirect =
      redirectUrl.startsWith("/") &&
      !redirectUrl.startsWith("//") &&
      !redirectUrl.includes("://");

    const safeRedirectUrl = isValidRedirect ? redirectUrl : "/courses";

    // Add return_from_tour=true to skip animations on return
    const redirectWithParam = safeRedirectUrl.includes("?")
      ? `${safeRedirectUrl}&return_from_tour=true`
      : `${safeRedirectUrl}?return_from_tour=true`;

    router.push(redirectWithParam);
  }, [router]);

  /**
   * Tour steps configuration
   */
  const getTourSteps = useCallback((): DriveStep[] => {
    return [
      {
        element: ".tour-chat-area",
        popover: {
          title: "AI Companion Messages",
          description:
            "Your AI companion sends messages here, guiding you through lessons and asking questions to check your understanding",
          side: "right",
          align: "start",
        },
      },
      {
        element: ".tour-text-input",
        popover: {
          title: "Type Your Responses",
          description:
            "Type your responses, ask questions, or chat with your AI companion anytime during the lesson",
          side: "top",
          align: "center",
        },
      },
      {
        element: ".tour-mic-button",
        popover: {
          title: "Voice Input",
          description:
            "Prefer speaking? Click here to use voice input instead of typing",
          side: "top",
          align: "center",
        },
      },
      {
        element: ".tour-video-panel",
        popover: {
          title: "Video Lectures",
          description:
            "Watch your video lectures here. The AI can pause the video to check in with you",
          side: "left",
          align: "center",
        },
      },
      {
        element: ".tour-lesson-sidebar",
        popover: {
          title: "Lesson Navigation",
          description:
            "Browse all your courses, modules, and lessons. Click on any lesson to jump directly to it",
          side: "right",
          align: "start",
        },
      },
      {
        element: ".tour-audio-toggle",
        popover: {
          title: "Audio Control",
          description:
            "Control whether the AI speaks to you. Toggle this anytime to mute or unmute voice playback",
          side: "bottom",
          align: "center",
        },
      },
    ];
  }, []);

  /**
   * Initialize driver.js (client-only)
   */
  useEffect(() => {
    // Client-only: Only initialize driver.js in browser
    if (typeof window === "undefined") return;

    // Dynamic import to avoid SSR issues
    import("driver.js").then((mod) => {
      const driverInstance = mod.driver({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Finish Tour",
        popoverClass: "driver-popover",
        animate: true,
        allowClose: true,
        overlayOpacity: 0.75,
        steps: getTourSteps(),

        onDestroyed: () => {
          handleTourComplete();
        },

        onHighlightStarted: (_element, step) => {
          // Guard: Only speak if description exists
          const description = step?.popover?.description;
          if (description && typeof description === "string") {
            speak(description, {
              interrupt: true, // Cancel any previous playback
            });
          }
        },
      });

      setDriver(driverInstance);
      setIsReady(true);
    });

    return () => {
      if (driver) {
        driver.destroy();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Start the tour if all elements are present
   */
  const startTour = useCallback(() => {
    if (!driver || !isReady) {
      console.error("Tour not ready yet");
      return;
    }

    // Expand sidebar if collapsed
    const sidebarElement = document.querySelector(".tour-lesson-sidebar");
    const isCollapsed = sidebarElement && !sidebarElement.classList.contains("w-80");

    if (isCollapsed && onExpandSidebar) {
      onExpandSidebar();
    }

    // Validate all required elements exist
    if (!validateTourElements()) {
      console.error("Cannot start tour: required elements missing");
      // Fallback: redirect back to courses
      router.push("/courses");
      return;
    }

    // Start the tour
    driver.drive();
  }, [driver, isReady, validateTourElements, router, onExpandSidebar]);

  return {
    driver,
    isReady,
    startTour,
  };
}
