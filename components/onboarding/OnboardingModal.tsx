"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, MessageCircle, Play, Keyboard, BookOpen, Rocket } from "lucide-react";

interface OnboardingModalProps {
  isReturningUser?: boolean;
  onComplete?: () => void;
}

const STORAGE_KEY = "bodh-onboarding-v1";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Your AI Learning Companion!",
    description: "I'm here to guide you through video lectures with personalized support. Let me show you around!",
  },
  {
    icon: MessageCircle,
    title: "Chat Interface",
    description: "This is where we'll have conversations! I'll ask questions, check your understanding, and provide encouragement as you learn.",
  },
  {
    icon: Play,
    title: "Video Player",
    description: "Watch video lectures here. I can pause videos to check in with you, ask questions, and help reinforce what you're learning.",
  },
  {
    icon: Keyboard,
    title: "Your Voice Matters",
    description: "Type your responses, ask questions, or share your thoughts here. I'm always listening and ready to help!",
  },
  {
    icon: BookOpen,
    title: "Your Courses",
    description: "Switch between courses here. Each course has multiple lessons for you to explore at your own pace.",
  },
  {
    icon: Rocket,
    title: "Ready to Learn?",
    description: "That's it! Just start chatting with me, and I'll guide you through your learning journey. Let's make learning fun together!",
  },
];

export function OnboardingModal({ isReturningUser = false, onComplete }: OnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) {
    return null;
  }

  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

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
            {step.title}
          </h3>

          <p className="text-gray-700 text-center mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-center gap-2 mt-3">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-violet-500 w-4'
                      : index < currentStep
                      ? 'bg-violet-300'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {currentStep === steps.length - 1 ? "Let's Start!" : 'Next'}
            </button>
          </div>

          {/* Skip Button */}
          {currentStep < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip Tutorial
            </button>
          )}
        </div>
      </div>
    </>
  );
}
