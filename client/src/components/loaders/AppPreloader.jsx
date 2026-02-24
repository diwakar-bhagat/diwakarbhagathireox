import React from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import { useSelector } from "react-redux";
import { EASE_APPLE } from "../../motion/config";

function AppPreloader() {
  const shouldReduceMotion = useReducedMotion();
  const { appBooting, bootProgress } = useSelector((state) => state.ui);

  return (
    <AnimatePresence>
      {appBooting && (
        <Motion.div
          className="fixed inset-0 z-[140] bg-black text-white flex items-center justify-center"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: {
              duration: shouldReduceMotion ? 0 : 0.45,
              ease: EASE_APPLE,
            },
          }}
        >
          <div className="w-[240px] flex flex-col items-center gap-6">
            <Motion.div
              className="text-5xl font-black tracking-tight"
              initial={{ opacity: 0.75 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: EASE_APPLE }}
            >
              H!
            </Motion.div>

            <div className="w-full h-[6px] rounded-full bg-white/20 overflow-hidden">
              <Motion.div
                className="h-full w-full bg-emerald-400"
                style={{ transformOrigin: "0% 50%" }}
                animate={{ scaleX: Math.max(0, Math.min(1, bootProgress / 100)) }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: EASE_APPLE }}
              />
            </div>

            <p className="text-xs tracking-[0.18em] uppercase text-white/65">
              {Math.round(bootProgress)}%
            </p>
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppPreloader;
