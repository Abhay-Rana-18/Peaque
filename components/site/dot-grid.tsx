"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/utils";

function throttle<T extends (...args: never[]) => void>(fn: T, limit: number) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = performance.now();
    if (now - last >= limit) {
      last = now;
      fn(...args);
    }
  };
}

interface Dot {
  cx: number;
  cy: number;
  xOffset: number;
  yOffset: number;
  _inertiaApplied: boolean;
}

export interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const REM_BREAKPOINTS = [
  { w: 0, rem: 1.25 },
  { w: 1024, rem: 1.875 },
  { w: 1280, rem: 2.25 },
  { w: 1440, rem: 2.5 },
  { w: 1600, rem: 2.75 },
  { w: 1920, rem: 3.25 },
  { w: 2120, rem: 3.5 },
  { w: 2400, rem: 4.0 },
  { w: 2800, rem: 4.75 },
  { w: 3300, rem: 5.5 },
  { w: 3840, rem: 6.25 },
  { w: 4400, rem: 7.25 },
];

function calculateGapInRem(width: number): number {
  if (width <= REM_BREAKPOINTS[0].w) return REM_BREAKPOINTS[0].rem;
  const maxEntry = REM_BREAKPOINTS[REM_BREAKPOINTS.length - 1];
  if (width >= maxEntry.w) return maxEntry.rem;

  for (let i = 0; i < REM_BREAKPOINTS.length - 1; i++) {
    const curr = REM_BREAKPOINTS[i];
    const next = REM_BREAKPOINTS[i + 1];
    if (width >= curr.w && width <= next.w) {
      const progress = (width - curr.w) / (next.w - curr.w);
      return curr.rem + progress * (next.rem - curr.rem);
    }
  }
  return 2.5;
}

function hexToRgba(colorStr: string) {
  if (!colorStr || colorStr === "transparent") {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  let hex = colorStr.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("") + "ff";
  } else if (hex.length === 4) {
    hex = hex.split("").map((c) => c + c).join("");
  } else if (hex.length === 6) {
    hex += "ff";
  }
  if (hex.length === 8) {
    return {
      r: parseInt(hex.slice(0, 2), 16) || 0,
      g: parseInt(hex.slice(2, 4), 16) || 0,
      b: parseInt(hex.slice(4, 6), 16) || 0,
      a: (parseInt(hex.slice(6, 8), 16) || 0) / 255,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * A field of dots that glow toward `activeColor` near the pointer and
 * scatter with inertia on fast moves / clicks, snapping back with a
 * gsap elastic ease. Renders on a single canvas for the whole grid
 * rather than one DOM node per dot.
 */
export function DotGrid({
  dotSize = 16,
  gap = 32,
  baseColor = "#E5E5E5",
  activeColor,
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 0,
  responsive = true,
  className,
  style,
}: DotGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const dprRef = useRef(1);
  const gridMetricsRef = useRef({
    effectiveGap: gap,
    effectiveDotSize: dotSize,
    width: 1440,
  });

  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0,
  });

  const baseRgb = useMemo(() => hexToRgba(baseColor), [baseColor]);
  const activeRgb = useMemo(() => {
    if (activeColor && activeColor !== baseColor) {
      return hexToRgba(activeColor);
    }
    const lr = Math.min(255, Math.round(baseRgb.r + (255 - baseRgb.r) * 0.65));
    const lg = Math.min(255, Math.round(baseRgb.g + (255 - baseRgb.g) * 0.65));
    const lb = Math.min(255, Math.round(baseRgb.b + (255 - baseRgb.b) * 0.65));
    return { r: lr, g: lg, b: lb, a: baseRgb.a };
  }, [baseColor, activeColor, baseRgb]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // Deliberately no ctx.scale() here — `draw` sets the transform explicitly
    // every frame, so the clear and the paint can never disagree about scale.

    const rootFontSize = typeof window !== "undefined"
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;

    // Calculate gap in rem for the 11 screen width breakdown steps:
    // 1024px (1.875rem), 1280px (2.25rem), 1440px (2.5rem), 1600px (2.75rem), 1920px (3.25rem),
    // 2120px (3.5rem), 2400px (4.0rem), 2800px (4.75rem), 3300px (5.5rem), 3840px (6.25rem), 4400px (7.25rem)
    const gapRem = responsive ? calculateGapInRem(width) : gap / rootFontSize;
    const effectiveGap = Math.max(14, Math.round(gapRem * rootFontSize));
    const effectiveDotSize = Math.max(2, Math.round(dotSize));

    const cell = effectiveDotSize + effectiveGap;
    const cols = Math.floor((width + effectiveGap) / cell);
    const rows = Math.floor((height + effectiveGap) / cell);

    const gridW = cell * cols - effectiveGap;
    const gridH = cell * rows - effectiveGap;

    const startX = Math.round((width - gridW) / 2 + effectiveDotSize / 2);
    const startY = Math.round((height - gridH) / 2 + effectiveDotSize / 2);

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: Math.round(startX + x * cell),
          cy: Math.round(startY + y * cell),
          xOffset: 0,
          yOffset: 0,
          _inertiaApplied: false,
        });
      }
    }
    dotsRef.current = dots;
    gridMetricsRef.current = { effectiveGap, effectiveDotSize, width };
  }, [dotSize, gap, responsive]);

  useEffect(() => {
    let rafId = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      // Clear in *device* pixels with the transform reset, then re-apply the
      // dpr scale for painting. Clearing while the context is already scaled
      // mixes units — `canvas.width` is device pixels but a scaled context
      // reads it as CSS pixels — so at dpr < 1 (a zoomed-out browser) only the
      // top-left corner of the buffer got cleared and everything drawn in the
      // right/bottom bands stayed on screen permanently.
      const dpr = dprRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { x: px, y: py } = pointerRef.current;
      const { effectiveDotSize, width } = gridMetricsRef.current;

      const currentProximity = responsive
        ? proximity * Math.min(1.5, Math.max(0.75, width / 1200))
        : proximity;
      const proxSq = currentProximity * currentProximity;
      const radius = effectiveDotSize / 2;

      for (const dot of dotsRef.current) {
        // Snap render coordinates to integer pixels to prevent Canvas sub-pixel anti-aliasing distortion
        const ox = Math.round(dot.cx + dot.xOffset);
        const oy = Math.round(dot.cy + dot.yOffset);
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        let fill = `rgba(${baseRgb.r},${baseRgb.g},${baseRgb.b},${baseRgb.a})`;
        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / currentProximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          const a = baseRgb.a + (activeRgb.a - baseRgb.a) * t;
          fill = `rgba(${r},${g},${b},${a})`;
        }

        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [proximity, baseColor, activeRgb, baseRgb, responsive]);

  useEffect(() => {
    buildGrid();
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(buildGrid);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [buildGrid]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const pr = pointerRef.current;
      pr.x = px;
      pr.y = py;

      const now = performance.now();
      const dt = pr.lastTime ? Math.max(1, now - pr.lastTime) : 16;
      const dx = px - pr.lastX;
      const dy = py - pr.lastY;
      const speed = (Math.hypot(dx, dy) / dt) * 1000;

      pr.lastTime = now;
      pr.lastX = px;
      pr.lastY = py;

      const { effectiveGap, width } = gridMetricsRef.current;
      const effectiveProximity = responsive
        ? proximity * Math.min(1.4, Math.max(0.75, width / 1200))
        : proximity;

      if (speed < speedTrigger) return;

      const maxPush = Math.min(18, effectiveGap * 0.6);

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - px, dot.cy - py);
        if (dist < effectiveProximity && dist > 0.5) {
          const falloff = Math.pow(1 - dist / effectiveProximity, 1.5);
          const pushAmount = maxPush * falloff * Math.min(speed / 1200, 1);

          const angle = Math.atan2(dot.cy - py, dot.cx - px);
          const targetX = Math.cos(angle) * pushAmount;
          const targetY = Math.sin(angle) * pushAmount;

          gsap.killTweensOf(dot);
          dot._inertiaApplied = true;

          gsap.to(dot, {
            xOffset: targetX,
            yOffset: targetY,
            duration: 0.1,
            ease: "power2.out",
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration || 0.7,
                ease: "elastic.out(1, 0.6)",
                onComplete: () => {
                  dot._inertiaApplied = false;
                },
              });
            },
          });
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const { effectiveGap, width } = gridMetricsRef.current;
      const currentShockRadius = responsive
        ? shockRadius * Math.min(1.5, Math.max(0.75, width / 1200))
        : shockRadius;
      const maxPush = Math.min(30, effectiveGap * 0.9);

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < currentShockRadius) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);

          const falloff = Math.max(0, 1 - dist / currentShockRadius);
          const angle = Math.atan2(dot.cy - cy, dot.cx - cx);
          const pushAmount = maxPush * falloff * (shockStrength / 3);

          const pushX = Math.cos(angle) * pushAmount;
          const pushY = Math.sin(angle) * pushAmount;

          gsap.to(dot, {
            xOffset: pushX,
            yOffset: pushY,
            duration: 0.12,
            ease: "power2.out",
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration || 0.8,
                ease: "elastic.out(1, 0.5)",
                onComplete: () => {
                  dot._inertiaApplied = false;
                },
              });
            },
          });
        }
      }
    };

    const throttledMove = throttle(onMove, 50);
    window.addEventListener("mousemove", throttledMove, { passive: true });
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("mousemove", throttledMove);
      window.removeEventListener("click", onClick);
    };
  }, [
    maxSpeed,
    speedTrigger,
    proximity,
    resistance,
    returnDuration,
    shockRadius,
    shockStrength,
    responsive,
  ]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center",
        className,
      )}
      style={style}
    >
      <div ref={wrapperRef} className="relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
