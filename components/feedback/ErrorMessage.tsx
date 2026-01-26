"use client";

import { AnimatePresence, motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ErrorMessageProps {
  show: boolean;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export function ErrorMessage({
  show,
  message = "Not quite correct!",
  duration = 2000,
  onClose,
}: ErrorMessageProps) {
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
          className="pointer-events-none fixed top-8 left-1/2 z-[200] -translate-x-1/2"
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <motion.div
            animate={{ x: [0, -10, 10, -6, 6, -3, 3, 0] }}
            className="rounded-2xl border-2 border-red-300 bg-red-500/95 px-6 py-4 shadow-2xl shadow-red-500/50 backdrop-blur-xl"
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <XCircle className="h-8 w-8 text-white" />
                <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
              </div>
              <p className="font-semibold text-lg text-white">{message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
