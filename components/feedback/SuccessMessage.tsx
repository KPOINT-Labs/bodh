"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface SuccessMessageProps {
  show: boolean;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export function SuccessMessage({
  show,
  message = "Great job!",
  duration = 2000,
  onClose,
}: SuccessMessageProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="pointer-events-none fixed top-1/3 left-1/2 z-[200] -translate-x-1/2 -translate-y-1/2"
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          initial={{ opacity: 0, scale: 0.6, y: -40 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <div className="flex items-center gap-4 rounded-3xl border-4 border-white bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6 text-white shadow-2xl">
            <CheckCircle className="h-8 w-8" />
            <span className="font-bold text-2xl">{message}</span>
            <Sparkles className="h-8 w-8" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
