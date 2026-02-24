import React, { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import { EASE_APPLE } from "../../motion/config";

const THINKING_MESSAGES = [
  "Evaluating response...",
  "Analyzing clarity...",
  "Measuring technical depth...",
];

function AIThinkingIndicator({ className = "" }) {
  const shouldReduceMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((previous) => (previous + 1) % THINKING_MESSAGES.length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100/90 dark:bg-slate-800/70 px-4 py-2 ${className}`}
    >
      <div className="flex items-end gap-1">
        {[0, 1, 2].map((dotIndex) => (
          <Motion.span
            key={dotIndex}
            className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-300"
            animate={
              shouldReduceMotion
                ? { opacity: 0.9 }
                : { opacity: [0.35, 1, 0.35], y: [0, -2, 0] }
            }
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: EASE_APPLE,
              delay: shouldReduceMotion ? 0 : dotIndex * 0.2,
            }}
          />
        ))}
      </div>

      <div className="min-w-[170px] text-left">
        <AnimatePresence mode="wait" initial={false}>
          <Motion.p
            key={THINKING_MESSAGES[messageIndex]}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: EASE_APPLE }}
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            {THINKING_MESSAGES[messageIndex]}
          </Motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default AIThinkingIndicator;
