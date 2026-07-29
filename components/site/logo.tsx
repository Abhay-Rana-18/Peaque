"use client";

import { motion } from "motion/react";

/**
 * The Peaque wordmark: bold type plus the brand's hand-drawn swash —
 * a pen loop to the left of the "P" whose tail dips and waves under
 * the whole word. Drawn as two strokes that ink in sequentially so it
 * reads as one continuous line. Size inherits from parent font-size.
 */
export function Logo({
  className = "",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  const stroke = {
    stroke: "currentColor",
    strokeWidth: 6,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  return (
    <span
      className={`relative inline-block font-heading font-black tracking-tight leading-none text-ink ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden
        filter="url(#pencil-stroke)"
        className="absolute -left-[0.62em] top-[0.18em] h-[0.62em] w-[0.62em] text-moss"
      >
        <motion.path
          d="M88 42 C 70 10, 24 8, 14 36 C 6 58, 30 74, 52 64 C 72 55, 68 32, 50 30 C 38 29, 30 38, 34 50"
          {...stroke}
          strokeWidth={7}
          initial={animated ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, delay: 0.15, ease: "easeIn" }}
        />
      </svg>
      Peaque<span className="text-sage">.</span>
      <svg
        viewBox="0 0 300 44"
        aria-hidden
        filter="url(#pencil-stroke)"
        className="absolute -bottom-[0.42em] left-[-0.5em] w-[112%] text-moss"
      >
        <motion.path
          d="M4 8 C 14 26, 24 34, 38 30 C 50 26, 52 16, 62 18 C 72 20, 74 30, 88 28 C 120 24, 150 20, 182 24 C 214 28, 244 24, 296 20"
          {...stroke}
          initial={animated ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.65, ease: "easeOut" }}
        />
      </svg>
    </span>
  );
}
