import React from "react";
import { motion as Motion, useReducedMotion } from "motion/react";
import { EASE_APPLE } from "../../motion/config";

const variantClassMap = {
  text: "h-4",
  card: "h-28",
  chart: "h-full",
};

const resolveSizeValue = (value) => {
  if (value === undefined || value === null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
};

function Skeleton({
  width = "100%",
  height,
  rounded = "rounded-md",
  variant = "text",
  className = "",
}) {
  const shouldReduceMotion = useReducedMotion();
  const roundedClass =
    typeof rounded === "string" ? rounded : rounded ? "rounded-md" : "rounded-none";
  const baseHeight = variantClassMap[variant] || variantClassMap.text;

  return (
    <div
      className={`relative overflow-hidden bg-gray-200/85 dark:bg-slate-700/65 ${baseHeight} ${roundedClass} ${className}`}
      style={{
        width: resolveSizeValue(width),
        height: resolveSizeValue(height),
      }}
      aria-hidden="true"
    >
      {!shouldReduceMotion && (
        <Motion.div
          className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ x: ["-120%", "360%"] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: EASE_APPLE,
          }}
        />
      )}
    </div>
  );
}

export default Skeleton;
