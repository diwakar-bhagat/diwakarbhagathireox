import React from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import useNetworkStatus from "../../hooks/useNetworkStatus";
import { EASE_APPLE } from "../../motion/config";

function NetworkStatusPill() {
  const shouldReduceMotion = useReducedMotion();
  const { isOnline, showRecovered, visible } = useNetworkStatus();

  const isOffline = !isOnline;
  const label = isOffline ? "You're offline" : showRecovered ? "Back online" : "";

  return (
    <AnimatePresence>
      {visible && (
        <Motion.div
          className="fixed left-1/2 bottom-5 -translate-x-1/2 z-[110] pointer-events-none"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: EASE_APPLE }}
        >
          <div
            className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              isOffline
                ? "bg-red-500 text-white"
                : "bg-emerald-500 text-white"
            }`}
          >
            {label}
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

export default NetworkStatusPill;
