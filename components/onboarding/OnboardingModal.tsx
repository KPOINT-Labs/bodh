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
    description: "I'm here to make learning interactive and personalized. Let me show you around!",
  },
  {
    icon: MessageCircle,
    title: "This is where we'll have conversations!",
    description: "Ask me anything, discuss concepts, or just chat about what you're learning. I'm here to help!",
  },
  {
    icon: Play,
    title: "Watch video lectures here",
    description: "Videos will appear on the right side. I can help explain anything you don't understand!",
  },
  {
    icon: Keyboard,
    title: "Type your responses, ask questions",
    description: "The input area at the bottom is where you can chat with me. Just type and press Enter!",
  },
  {
    icon: BookOpen,
    title: "Switch between courses here",
    description: "Access all your courses from the sidebar. I'll be with you throughout your learning journey!",
  },
  {
    icon: Rocket,
    title: "Ready to Learn!",
    description: "That's it! Just start chatting with me, and we'll explore your course together. Let's begin!",
  },
];

export function OnboardingModal({ isReturningUser = false, onComplete }: OnboardingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleSkip} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 animate-bounce-slow">
            <Icon className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {step.title}
        </h2>

        {/* Description */}
        <p className="text-center text-gray-600 mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-8 bg-purple-500"
                  : index < currentStep
                  ? "w-2 bg-purple-300"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {!isFirstStep && (
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className={`${
              isFirstStep ? "w-full" : "flex-1"
            } px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all`}
          >
            {isLastStep ? "Let's Start!" : "Next"}
          </button>
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Skip Tutorial
        </button>

        {/* Step counter */}
        <p className="text-center text-xs text-gray-400 mt-4">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
