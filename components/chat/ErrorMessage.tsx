"use client";

import { XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ErrorMessageProps {
  show: boolean;
  message?: string;
}

export function ErrorMessage({
  show,
  message = "Not quite correct!",
}: ErrorMessageProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      const timeout = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [show]);

  if (!(visible && mounted)) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed top-8 left-1/2 z-[200] -translate-x-1/2 transition-all duration-300 ${
        show
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-4 scale-90 opacity-0"
      }`}
    >
      <div className="animate-shake rounded-2xl border-2 border-red-300 bg-red-500/95 px-6 py-4 shadow-2xl shadow-red-500/50 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <XCircle className="h-8 w-8 animate-pulse text-white" />
            <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
          </div>
          <p className="font-semibold text-lg text-white">{message}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
