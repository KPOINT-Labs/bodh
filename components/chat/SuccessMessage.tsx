"use client";

import { CheckCircle, Sparkles } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useFeedbackSound } from "@/hooks/useFeedbackSound";

interface SuccessMessageProps {
  show: boolean;
  message?: string;
}

export function SuccessMessage({ show, message = "Great job!" }: SuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { playSound } = useFeedbackSound();
  const prevShowRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show && !prevShowRef.current) {
      playSound("success");
    }
    prevShowRef.current = show;
  }, [show, playSound]);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);

  if (!isVisible || !mounted) return null;

  return createPortal(
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none">
      <div className="animate-bounce-in bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-4 border-4 border-white">
        <CheckCircle className="w-8 h-8 animate-spin-slow" />
        <span className="text-2xl font-bold">{message}</span>
        <Sparkles className="w-8 h-8 animate-pulse" />
      </div>
    </div>,
    document.body
  );
}
