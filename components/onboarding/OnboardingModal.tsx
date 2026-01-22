"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";

interface OnboardingModalProps {
  isReturningUser?: boolean;
  onComplete?: () => void;
}

const STORAGE_KEY = "bodh-onboarding-v1";

const welcomeContent = {
  icon: Sparkles,
  title: "Hi! I'm Aditi",
  description: "Your personal learning companion. I'll be right here with you as you watch your lessons — asking questions, clearing doubts, and cheering you on.",
  ttsMessage: "Hi! I'm Aditi, your personal learning companion. I'll be right here with you as you watch your lessons — asking questions, clearing doubts, and cheering you on. Click on Let's Start to take a quick tour and see how I can help you learn!",
};

export function OnboardingModal({ isReturningUser = false, onComplete }: OnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const { speak } = useTTS();
  const hasSpokenRef = useRef(false);

  useEffect(() => {
    // Check if tour query parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    const forceTour = urlParams.get('tour') === 'true';

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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in" />

      {/* Centered Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
        <div className="relative max-w-lg w-full backdrop-blur-xl bg-gradient-to-br from-white/95 to-white/90 border-2 border-violet-300 rounded-3xl p-8 shadow-2xl shadow-violet-500/20 animate-scale-in">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg animate-bounce-slow">
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <h3 className="text-2xl text-center mb-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
            {welcomeContent.title}
          </h3>

          <p className="text-gray-700 text-center mb-8 leading-relaxed">
            {welcomeContent.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartTour}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
            >
              Let&apos;s Start!
            </button>

            <button
              onClick={handleSkip}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
            >
              Skip Tutorial
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
