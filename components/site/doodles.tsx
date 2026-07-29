"use client";

import { motion } from "motion/react";

type DoodleProps = {
  className?: string;
  delay?: number;
  duration?: number;
  strokeWidth?: number;
};

const PENCIL = "url(#pencil-stroke)";

const draw = (delay: number, duration: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: "-60px" },
  transition: { delay, duration, ease: "easeInOut" as const },
});

/**
 * Pencil underline: uneven bumps, drifting baseline, plus a fainter
 * second pass slightly offset — like the pencil went over it twice.
 */
export function Squiggle({
  className,
  delay = 0,
  duration = 0.8,
  strokeWidth = 4,
}: DoodleProps) {
  return (
    <svg
      viewBox="0 0 220 18"
      fill="none"
      className={className}
      filter={PENCIL}
      aria-hidden
    >
      <motion.path
        d="M4 10.5 C 22 5.5, 38 4.2, 57 8.6 C 71 11.8, 83 12.8, 99 9.2 C 111 6.6, 121 5.2, 137 7.4 C 154 9.8, 167 11.4, 183 8.2 C 196 5.8, 207 7.6, 216 9.6"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        {...draw(delay, duration)}
      />
      <motion.path
        d="M7 12.8 C 27 8.4, 44 7.2, 60 10.6 C 74 13.4, 87 13.8, 102 10.8 C 116 8, 127 6.8, 141 8.9 C 156 11.1, 169 12.6, 184 9.8 C 196 7.6, 206 9.2, 212 11"
        stroke="currentColor"
        strokeWidth={strokeWidth * 0.6}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.35 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{
          delay: delay + duration * 0.55,
          duration: duration * 0.8,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}

/** Rough oval scribbled around a word. */
export function CircleScribble({
  className,
  delay = 0,
  duration = 1,
  strokeWidth = 4,
}: DoodleProps) {
  return (
    <svg
      viewBox="0 0 260 70"
      fill="none"
      className={className}
      filter={PENCIL}
      aria-hidden
    >
      <motion.path
        d="M196 12 C 150 2, 40 4, 22 26 C 6 46, 60 66, 130 63 C 200 60, 252 46, 245 27 C 238 10, 168 5, 118 10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        {...draw(delay, duration)}
      />
    </svg>
  );
}

/** Curved arrow used for handwritten annotations. */
export function ArrowCurve({
  className,
  delay = 0,
  duration = 0.7,
  strokeWidth = 3.5,
}: DoodleProps) {
  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      className={className}
      // filter={PENCIL}
      aria-hidden
    >
      <motion.path
        d="M8 8 C 42 16, 78 34, 91 66"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        {...draw(delay, duration)}
      />
      <motion.path
        d="M74 62 L 92 70 L 95 50"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(delay + duration * 0.7, 0.3)}
      />
    </svg>
  );
}

/** Short straight-ish arrow pointing right. */
export function ArrowShort({
  className,
  delay = 0,
  duration = 0.5,
  strokeWidth = 3.5,
}: DoodleProps) {
  return (
    <svg
      viewBox="0 0 90 40"
      fill="none"
      className={className}
      filter={PENCIL}
      aria-hidden
    >
      <motion.path
        d="M4 22 C 28 16, 52 16, 82 20"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        {...draw(delay, duration)}
      />
      <motion.path
        d="M66 8 L 84 20 L 63 30"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw(delay + duration * 0.7, 0.25)}
      />
    </svg>
  );
}

/** Hand-drawn asterisk — the brand's little punctuation mark. */
export function Asterisk({
  className,
  delay = 0,
  duration = 0.6,
  strokeWidth = 4,
}: DoodleProps) {
  const strokes = ["M18 4 L18 32", "M5 11 L31 25", "M31 11 L5 25"];
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      filter={PENCIL}
      aria-hidden
    >
      {strokes.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          {...draw(delay + i * 0.12, duration / 2)}
        />
      ))}
    </svg>
  );
}

/** Four-ray sparkle. */
export function Sparkle({
  className,
  delay = 0,
  duration = 0.5,
  strokeWidth = 3.5,
}: DoodleProps) {
  const rays = [
    "M20 3 L20 14",
    "M20 26 L20 37",
    "M3 20 L14 20",
    "M26 20 L37 20",
  ];
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      filter={PENCIL}
      aria-hidden
    >
      {rays.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          {...draw(delay + i * 0.08, duration / 2)}
        />
      ))}
    </svg>
  );
}

/** Static asterisk for repeating decorative use (no animation). */
export function AsteriskStatic({
  className,
  strokeWidth = 4,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      filter={PENCIL}
      aria-hidden
    >
      <path
        d="M18 4 L18 32 M5 11 L31 25 M31 11 L5 25"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A strip of masking tape for pinning cards to the page. */
export function Tape({
  className = "",
  rotate = -6,
}: {
  className?: string;
  rotate?: number;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute h-7 w-24 bg-sand/70 shadow-sm ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    />
  );
}
