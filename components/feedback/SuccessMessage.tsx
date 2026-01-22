"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface SuccessMessageProps {
  show: boolean;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export function SuccessMessage({ show, message = "Great job!", duration = 2000, onClose }: SuccessMessageProps) {
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: -40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-6 rounded-3xl shadow-2xl flex items-center gap-4 border-4 border-white">
            <CheckCircle className="w-8 h-8" />
            <span className="text-2xl font-bold">{message}</span>
            <Sparkles className="w-8 h-8" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
