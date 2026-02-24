import React, { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "motion/react";

const THEME_KEY = "theme";

const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M21 14.3A8.8 8.8 0 1 1 9.7 3a7 7 0 1 0 11.3 11.3Z" />
  </svg>
);

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.toggle("dark", isDark);
    window.localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");

    const timer = window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 700);

    return () => {
      window.clearTimeout(timer);
      root.classList.remove("theme-transition");
    };
  }, [isDark]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Toggle theme"
        aria-pressed={isDark}
        onClick={() => setIsDark((prev) => !prev)}
        className="group relative flex h-11 w-20 sm:h-12 sm:w-24 items-center rounded-full p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 dark:focus-visible:ring-indigo-400/70"
      >
        <div className="absolute inset-0 overflow-hidden rounded-full border border-white/30 bg-white/20 backdrop-blur-xl shadow-[0_8px_30px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-white/10">
          <Motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,208,255,0.95) 0%, rgba(94,170,255,0.9) 45%, rgba(188,232,255,0.95) 100%)",
            }}
            animate={{ opacity: isDark ? 0 : 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
          <Motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(12,17,35,0.95) 0%, rgba(30,44,92,0.9) 50%, rgba(9,12,24,0.96) 100%)",
            }}
            animate={{ opacity: isDark ? 1 : 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
          <Motion.div
            className="absolute -inset-x-8 -inset-y-6"
            style={{
              background: isDark
                ? "radial-gradient(circle at 72% 35%, rgba(129,140,248,0.45), rgba(129,140,248,0) 55%)"
                : "radial-gradient(circle at 28% 30%, rgba(255,255,255,0.65), rgba(255,255,255,0) 55%)",
            }}
            animate={{
              x: isDark ? [-10, 8, -10] : [8, -10, 8],
              opacity: isDark ? 0.35 : 0.25,
            }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>

        <Motion.div
          className="pointer-events-none absolute top-1/2 h-16 w-16 sm:h-20 sm:w-20 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            background: isDark
              ? "radial-gradient(circle, rgba(129,140,248,0.55) 0%, rgba(129,140,248,0) 70%)"
              : "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)",
          }}
          animate={{ x: isDark ? 38 : -4 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        />

        <Motion.div
          className="relative z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/60 bg-white/85 shadow-[0_8px_16px_rgba(15,23,42,0.2)] backdrop-blur-md dark:border-white/20 dark:bg-slate-900/85"
          animate={{ x: isDark ? 34 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <Motion.div
              key={isDark ? "moon" : "sun"}
              initial={{ rotate: isDark ? -90 : 90, scale: 0.7, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: isDark ? 90 : -90, scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={isDark ? "text-indigo-200" : "text-amber-500"}
            >
              {isDark ? <MoonIcon /> : <SunIcon />}
            </Motion.div>
          </AnimatePresence>
        </Motion.div>
      </button>
    </div>
  );
}

export default ThemeToggle;
