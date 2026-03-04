import React, { useEffect } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "motion/react";
import { useDispatch, useSelector } from "react-redux";
import { clearPaymentProcessing } from "../../redux/uiSlice";
import { EASE_APPLE } from "../../motion/config";

const statusMeta = {
  processing: {
    title: "Securing your transaction",
    subtitle: "Please don't refresh",
    accent: "text-[#8B5CF6]",
    border: "border-[#5100FF]/30",
  },
  success: {
    title: "Transaction verified",
    subtitle: "Applying credits to your account",
    accent: "text-[#8B5CF6]",
    border: "border-[#5100FF]/30",
  },
  error: {
    title: "Payment interrupted",
    subtitle: "Please try again",
    accent: "text-red-400",
    border: "border-red-500/30",
  },
};

function PaymentProcessingOverlay() {
  const shouldReduceMotion = useReducedMotion();
  const dispatch = useDispatch();
  const { status, message } = useSelector((state) => state.ui.paymentProcessing);
  const isVisible = status !== "idle";
  const meta = statusMeta[status] || statusMeta.processing;

  useEffect(() => {
    if (!isVisible) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  useEffect(() => {
    if (status !== "success" && status !== "error") return;

    const timer = window.setTimeout(
      () => {
        dispatch(clearPaymentProcessing());
      },
      status === "success" ? 700 : 1400
    );

    return () => window.clearTimeout(timer);
  }, [dispatch, status]);

  return (
    <AnimatePresence>
      {isVisible && (
        <Motion.div
          className="fixed inset-0 z-[121] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: EASE_APPLE }}
        >
          <Motion.div
            className={`relative w-full max-w-sm rounded-2xl border ${meta.border} glass-card shadow-2xl p-6 text-center`}
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, scale: 1 }}
            animate={
              status === "error" && !shouldReduceMotion
                ? { opacity: 1, y: 0, x: [0, -3, 3, -2, 2, 0] }
                : { opacity: 1, y: 0, scale: status === "success" ? [1, 1.01, 1] : 1 }
            }
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: EASE_APPLE }}
          >
            {status === "success" && !shouldReduceMotion && (
              <Motion.div
                className="absolute inset-0 rounded-2xl bg-[#5100FF]/15"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.45, ease: EASE_APPLE }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center gap-4">
              {status === "processing" && (
                <Motion.div
                  className="h-12 w-12 rounded-full border-[3px] border-[#5100FF]/20 border-t-[#8B5CF6]"
                  animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                  transition={{ duration: 0.95, ease: "linear", repeat: Infinity }}
                />
              )}

              {status === "success" && (
                <div className="h-12 w-12 rounded-full grid place-items-center bg-[#5100FF]/20 text-[#A78BFA] text-xl font-bold">
                  ✓
                </div>
              )}

              {status === "error" && (
                <div className="h-12 w-12 rounded-full grid place-items-center bg-red-500/20 text-red-400 text-xl font-bold">
                  !
                </div>
              )}

              <p className={`text-base font-semibold ${meta.accent}`}>{meta.title}</p>
              <p className="text-sm text-slate-400">
                {message || meta.subtitle}
              </p>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

export default PaymentProcessingOverlay;
