import React from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import { useSelector } from "react-redux";
import { EASE_APPLE } from "../../motion/config";
import Skeleton from "./Skeleton";

function ResumeParsingOverlay() {
  const shouldReduceMotion = useReducedMotion();
  const resumeParsing = useSelector((state) => state.ui.resumeParsing);

  return (
    <AnimatePresence>
      {resumeParsing && (
        <Motion.div
          className="fixed inset-0 z-[120] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: EASE_APPLE }}
        >
          <Motion.div
            className="w-full max-w-xl rounded-3xl border border-gray-200/70 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-2xl p-6 sm:p-7"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: EASE_APPLE }}
          >
            <div className="mx-auto max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 p-5 space-y-4">
              <Skeleton width="56%" height={18} rounded="rounded-md" />
              <Skeleton width="70%" height={12} rounded="rounded-md" />

              <div className="space-y-2 pt-1">
                <Skeleton variant="text" width="28%" />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="82%" />
              </div>

              <div className="space-y-2 pt-1">
                <Skeleton variant="text" width="36%" />
                <Skeleton variant="text" width="96%" />
                <Skeleton variant="text" width="84%" />
              </div>

              <div className="space-y-2 pt-1">
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="88%" />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Motion.span
                className="h-2 w-2 rounded-full bg-emerald-500"
                animate={shouldReduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: EASE_APPLE }}
              />
              <span>Analyzing resume structure...</span>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

export default ResumeParsingOverlay;
