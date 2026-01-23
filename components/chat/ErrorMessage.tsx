"use client";

import { XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ErrorMessageProps {
  show: boolean;
  message?: string;
}

export function ErrorMessage({ show, message = "Not quite correct!" }: ErrorMessageProps) {
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

  if (!visible || !mounted) return null;

  return createPortal(
    <div
      className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ${
        show ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 -translate-y-4"
      }`}
    >
      <div className="backdrop-blur-xl bg-red-500/95 border-2 border-red-300 rounded-2xl px-6 py-4 shadow-2xl shadow-red-500/50 animate-shake">
        <div className="flex items-center gap-3">
          <div className="relative">
            <XCircle className="w-8 h-8 text-white animate-pulse" />
            <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
          </div>
          <p className="text-white text-lg font-semibold">{message}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
