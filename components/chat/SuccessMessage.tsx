"use client";

import { CheckCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SuccessMessageProps {
  show: boolean;
  message?: string;
}

export function SuccessMessage({
  show,
  message = "Great job!",
}: SuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!(isVisible && mounted)) {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed top-1/3 left-1/2 z-[200] -translate-x-1/2 -translate-y-1/2">
      <div className="flex animate-bounce-in items-center gap-4 rounded-3xl border-4 border-white bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6 text-white shadow-2xl">
        <CheckCircle className="h-8 w-8 animate-spin-slow" />
        <span className="font-bold text-2xl">{message}</span>
        <Sparkles className="h-8 w-8 animate-pulse" />
      </div>
    </div>,
    document.body
  );
}
