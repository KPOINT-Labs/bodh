"use client";

import { Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTTS } from "@/hooks/useTTS";

interface OnboardingModalProps {
  isReturningUser?: boolean;
  onComplete?: () => void;
}

const STORAGE_KEY = "bodh-onboarding-v1";

const welcomeContent = {
  icon: Sparkles,
  title: "Hi! I'm Aditi",
  description:
    "Your personal learning companion. I'll be right here with you as you watch your lessons — asking questions, clearing doubts, and cheering you on.",
  ttsMessage:
    "Hi! I'm Aditi, your personal learning companion. I'll be right here with you as you watch your lessons — asking questions, clearing doubts, and cheering you on. Click on Let's Start to take a quick tour and see how I can help you learn!",
};

export function OnboardingModal({
  isReturningUser = false,
  onComplete,
}: OnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const { speak } = useTTS();
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    // Check if tour query parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    const forceTour = urlParams.get("tour") === "true";

    if (forceTour) {
      // Force show tour if tour=true in URL
      setTimeout(() => setIsVisible(true), 300);
      return;
    }

    // Don't show for returning users
    if (isReturningUser) {
      return;
    }

    // Check if user has already completed onboarding
    const hasCompletedOnboarding = localStorage.getItem(STORAGE_KEY);
    if (!hasCompletedOnboarding) {
      // Small delay to ensure smooth mount
      setTimeout(() => setIsVisible(true), 300);
    }
  }, [isReturningUser]);

  // Speak welcome message when modal becomes visible
  useEffect(() => {
    if (isVisible && !hasSpokenRef.current) {
      hasSpokenRef.current = true;
      // Small delay to let the modal animation complete
      setTimeout(() => {
        speak(welcomeContent.ttsMessage);
      }, 500);
    }
  }, [isVisible, speak]);

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  const handleStartTour = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    // Don't call onComplete here - it triggers welcome TTS on /courses page
    // The tour page will handle the flow and redirect back
    router.push("/course/demo/module/demo?tour=true&redirect_back_to=/courses");
  };

  if (!isVisible) {
    return null;
  }

  const Icon = welcomeContent.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] animate-fade-in bg-black/60 backdrop-blur-sm" />

      {/* Centered Modal */}
      <div className="fixed inset-0 z-[9999] flex animate-fade-in items-center justify-center p-4">
        <div className="relative w-full max-w-lg animate-scale-in rounded-3xl border-2 border-violet-300 bg-gradient-to-br from-white/95 to-white/90 p-8 shadow-2xl shadow-violet-500/20 backdrop-blur-xl">
          {/* Close Button */}
          <button
            aria-label="Skip onboarding"
            className="absolute top-4 right-4 rounded-full p-2 transition-colors hover:bg-gray-100"
            onClick={handleSkip}
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 animate-bounce-slow items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
              <Icon className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <h3 className="mb-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-center text-2xl text-transparent">
            {welcomeContent.title}
          </h3>

          <p className="mb-8 text-center text-gray-700 leading-relaxed">
            {welcomeContent.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-xl"
              onClick={handleStartTour}
            >
              Let&apos;s Start!
            </button>

            <button
              className="w-full py-2 text-gray-500 text-sm transition-colors hover:text-gray-700"
              onClick={handleSkip}
            >
              Skip Tutorial
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
