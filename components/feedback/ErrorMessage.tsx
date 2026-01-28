"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { XCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useFeedbackSound } from "@/hooks/useFeedbackSound";

interface ErrorMessageProps {
  show: boolean;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export function ErrorMessage({ show, message = "Not quite correct!", duration = 2000, onClose }: ErrorMessageProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const { playSound } = useFeedbackSound();
  const prevShowRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show && !prevShowRef.current) {
      // Play sound only on transition from hidden to shown
      playSound("error");
    }
    prevShowRef.current = show;
  }, [show, playSound]);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, duration, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
        >
          <motion.div
            animate={{ x: [0, -10, 10, -6, 6, -3, 3, 0] }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="backdrop-blur-xl bg-red-500/95 border-2 border-red-300 rounded-2xl px-6 py-4 shadow-2xl shadow-red-500/50"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <XCircle className="w-8 h-8 text-white" />
                <div className="absolute inset-0 bg-white/30 rounded-full animate-ping"></div>
              </div>
              <p className="text-white text-lg font-semibold">{message}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
