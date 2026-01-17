"use client";

import { useEffect, useMemo, useRef } from "react";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useLearningPanel } from "@/contexts/LearningPanelContext";

const TOUR_STORAGE_KEY = "bodh-tour-v1";

type TourStepConfig = {
  id: string;
  target: string;
  title: string;
  description: string;
  side: "top" | "right" | "bottom" | "left" | "over";
  align: "start" | "center" | "end";
  variant: "center" | "anchor";
};

type ProductTourProps = {
  isReturningUser?: boolean;
  isSessionTypeLoading?: boolean;
  shouldStart?: boolean;
};

const tourSteps: TourStepConfig[] = [
  {
    id: "welcome",
    target: "#tour-center-anchor",
    title: "✨ Welcome to Your AI Learning Companion!",
    description:
      "I'm here to guide you through video lectures with personalized support. Let me show you around!",
    side: "over",
    align: "center",
    variant: "center",
  },
  {
    id: "chat",
    target: '[data-tour="chat-stream"]',
    title: "💬 Chat Interface",
    description:
      "This is where we'll have conversations! I'll ask questions, check your understanding, and provide encouragement as you learn.",
    side: "right",
    align: "center",
    variant: "anchor",
  },
  {
    id: "video",
    target: '[data-tour="video-panel"]',
    title: "🎥 Video Player",
    description:
      "Watch video lectures here. I can pause videos to check in with you, ask questions, and help reinforce what you're learning.",
    side: "left",
    align: "center",
    variant: "anchor",
  },
  {
    id: "input",
    target: '[data-tour="chat-input"]',
    title: "⌨️ Your Voice Matters",
    description:
      "Type your responses, ask questions, or share your thoughts here. I'm always listening and ready to help!",
    side: "top",
    align: "center",
    variant: "anchor",
  },
  {
    id: "courses",
    target: '[data-tour="course-sidebar"]',
    title: "📚 Your Courses",
    description:
      "Switch between courses here. Each course has multiple lessons for you to explore at your own pace.",
    side: "right",
    align: "center",
    variant: "anchor",
  },
  {
    id: "ready",
    target: "#tour-center-anchor",
    title: "🚀 Ready to Learn?",
    description:
      "That's it! Just start chatting with me, and I'll guide you through your learning journey. Let's make learning fun together!",
    side: "over",
    align: "center",
    variant: "center",
  },
];

function renderProgress(
  wrapper: HTMLElement,
  totalSteps: number,
  activeIndex: number,
  isCenter: boolean
) {
  const existing = wrapper.querySelector(".bodh-tour-progress");
  if (existing) {
    existing.remove();
  }

  const progress = document.createElement("div");
  progress.className = `bodh-tour-progress${isCenter ? " bodh-tour-progress--center" : ""}`;

  if (isCenter) {
    const bar = document.createElement("div");
    bar.className = "bodh-tour-progress-bar";
    const fill = document.createElement("div");
    fill.className = "bodh-tour-progress-fill";
    const percentage = totalSteps > 0 ? ((activeIndex + 1) / totalSteps) * 100 : 0;
    fill.style.width = `${percentage}%`;
    bar.appendChild(fill);
    progress.appendChild(bar);
  }

  const dots = document.createElement("div");
  dots.className = "bodh-tour-dots";
  for (let i = 0; i < totalSteps; i += 1) {
    const dot = document.createElement("span");
    dot.className = "bodh-tour-dot";
    if (i < activeIndex) {
      dot.classList.add("is-complete");
    }
    if (i === activeIndex) {
      dot.classList.add("is-active");
    }
    dots.appendChild(dot);
  }
  progress.appendChild(dots);

  const footer = wrapper.querySelector(".driver-popover-footer");
  if (footer?.parentElement) {
    footer.parentElement.insertBefore(progress, footer);
  } else {
    wrapper.appendChild(progress);
  }
}

function ensureSparkleIcon(wrapper: HTMLElement) {
  if (wrapper.querySelector(".bodh-tour-icon")) {
    return;
  }

  const icon = document.createElement("div");
  icon.className = "bodh-tour-icon";
  icon.innerHTML = '<span aria-hidden="true">✨</span>';
  wrapper.insertBefore(icon, wrapper.firstChild);
}

function ensureSkipButton(wrapper: HTMLElement, onSkip: () => void) {
  const existing = wrapper.querySelector<HTMLButtonElement>(".bodh-tour-skip");
  if (existing) {
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "bodh-tour-skip";
  button.textContent = "Skip Tutorial";
  button.addEventListener("click", onSkip);
  wrapper.appendChild(button);
}

export function ProductTour({
  isReturningUser = false,
  isSessionTypeLoading = false,
  shouldStart = true,
}: ProductTourProps) {
  const { expandPanel } = useLearningPanel();
  const driverRef = useRef<Driver | null>(null);

  const steps = useMemo(() => tourSteps, []);

  useEffect(() => {
    if (!shouldStart || isSessionTypeLoading || isReturningUser) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (localStorage.getItem(TOUR_STORAGE_KEY)) {
      return;
    }

    const handleComplete = () => {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    };

    const availableSteps: DriveStep[] = steps
      .filter((step) => document.querySelector(step.target))
      .map((step) => ({
        element: step.target,
        onHighlightStarted: () => {
          if (step.id === "courses") {
            expandPanel();
          }
        },
        popover: {
          title: step.title,
          description: step.description,
          side: step.side,
          align: step.align,
          popoverClass: `bodh-tour-popover bodh-tour-popover--${step.variant}`,
          onPopoverRender: (popover, opts) => {
            const total = opts.driver.getConfig().steps?.length || 0;
            const activeIndex = opts.state.activeIndex ?? opts.driver.getActiveIndex() ?? 0;
            const isLast = opts.driver.isLastStep();
            const isCenter = step.variant === "center";

            popover.previousButton.textContent = "Back";
            popover.nextButton.textContent = isLast
              ? isCenter
                ? "Let's Start!"
                : "Got it!"
              : "Next";

            renderProgress(popover.wrapper, total, activeIndex, isCenter);

            if (isCenter) {
              ensureSparkleIcon(popover.wrapper);
            }

            const existingSkip = popover.wrapper.querySelector(".bodh-tour-skip");
            if (!isLast) {
              if (!existingSkip) {
                ensureSkipButton(popover.wrapper, () => {
                  handleComplete();
                  opts.driver.destroy();
                });
              }
            } else if (existingSkip) {
              existingSkip.remove();
            }
          },
        },
      }));

    if (availableSteps.length === 0) {
      return;
    }

    expandPanel();

    const tour = driver({
      steps: availableSteps,
      animate: true,
      smoothScroll: true,
      overlayColor: "#000000",
      overlayOpacity: 0.6,
      stagePadding: 8,
      stageRadius: 16,
      allowClose: true,
      showButtons: ["previous", "next", "close"],
      onDestroyed: () => {
        handleComplete();
      },
    });

    driverRef.current = tour;

    const startTimer = window.setTimeout(() => {
      tour.drive(0);
    }, 300);

    return () => {
      window.clearTimeout(startTimer);
      if (driverRef.current?.isActive()) {
        driverRef.current.destroy();
      }
      driverRef.current = null;
    };
  }, [expandPanel, isReturningUser, isSessionTypeLoading, steps]);

  return null;
}
