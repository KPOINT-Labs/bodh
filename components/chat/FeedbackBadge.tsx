'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, PartyPopper } from "lucide-react";
import { fireConfetti } from "@/components/ui/confetti";

interface FeedbackBadgeProps {
  type: 'correct' | 'incorrect';
  message?: string;
  duration?: number; // Duration in ms before auto-hide (default: 2000)
}

/**
 * Displays a floating feedback toast in the center of the screen
 * Auto-dismisses after a few seconds with fade-out animation
 * Fires confetti for correct answers
 *
 * NOTE: This component should only be rendered for NEW messages, not history.
 * The parent component is responsible for not rendering this for historical messages.
 */
export function FeedbackBadge({ type, message, duration = 2000 }: FeedbackBadgeProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fire confetti for correct answers
  useEffect(() => {
    if (type === 'correct') {
      fireConfetti();
    }
  }, [type]);

  // Handle fade-out and hide timers
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 500);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration]);

  if (!isVisible || !mounted) return null;

  const baseClasses = `flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-2xl transition-all duration-500 ${
    isFading ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95'
  }`;

  const toast = (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {type === 'correct' ? (
        <div className={`${baseClasses} bg-gradient-to-r from-emerald-500 to-teal-400`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <CheckCircle className="h-6 w-6 animate-spin" style={{ animationDuration: '2s' }} />
          </div>
          <span className="font-bold text-xl">{message || 'Awesome!'}</span>
          <PartyPopper className="h-6 w-6 animate-pulse" />
        </div>
      ) : (
        <div className={`${baseClasses} bg-gradient-to-r from-red-500 to-rose-400`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <XCircle className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl">{message || 'Not quite right'}</span>
        </div>
      )}
    </div>
  );

  // Use portal to render at document body level
  return createPortal(toast, document.body);
}
