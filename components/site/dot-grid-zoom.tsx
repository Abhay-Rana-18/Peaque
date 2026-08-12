"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface Dot {
  cx: number;
  cy: number;
  radius: number;
  targetRadius: number;
}

export interface DotGridZoomProps {
  gap?: number;
  baseSize?: number;
  maxSize?: number;
  proximity?: number;
  color?: string;
  activeColor?: string;
  className?: string;
  style?: React.CSSProperties;
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

function getLighterColor(colorStr: string): string {
  const { r, g, b, a } = hexToRgba(colorStr);
  const lr = Math.min(255, Math.round(r + (255 - r) * 0.65));
  const lg = Math.min(255, Math.round(g + (255 - g) * 0.65));
  const lb = Math.min(255, Math.round(b + (255 - b) * 0.65));
  return `rgba(${lr},${lg},${lb},${a})`;
}

/**
 * A field of dots that "zoom" — grow into a lens-like bump — around the
 * pointer, smoothly falling back to their base size with distance and easing
 * back out once the pointer leaves. Single canvas for the whole grid.
 */
export function DotGridZoom({
  gap = 28,
  baseSize = 3,
  maxSize = 16,
  proximity = 140,
  color = "#D8D8D8",
  activeColor,
  className,
  style,
}: DotGridZoomProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const dprRef = useRef(1);
  // `active` is sticky: the bulge stays under a resting cursor and is only
  // released when the pointer actually leaves the page, never on a timer.
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });
  // Set whenever the buffer is reallocated, since sizing a canvas clears it and
  // the settle check below would otherwise skip repainting it.
  const forceDrawRef = useRef(true);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    // Deliberately no ctx.scale() here — `draw` sets the transform explicitly
    // every frame, so the clear and the paint can never disagree about scale.

    const cell = gap;
    const cols = Math.floor(width / cell) + 1;
    const rows = Math.floor(height / cell) + 1;
    const offsetX = (width - (cols - 1) * cell) / 2;
    const offsetY = (height - (rows - 1) * cell) / 2;

    const dots: Dot[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: offsetX + x * cell,
          cy: offsetY + y * cell,
          radius: baseSize / 2,
          targetRadius: baseSize / 2,
        });
      }
    }
    dotsRef.current = dots;
    forceDrawRef.current = true;
  }, [gap, baseSize]);

  useEffect(() => {
    buildGrid();
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(buildGrid);
    ro.observe(wrap);

    // `dpr` can change without the CSS box changing size — dragging the window
    // to a monitor with different scaling — which ResizeObserver alone misses,
    // leaving the buffer sized for the old dpr. Re-subscribe each time since
    // the query is pinned to the current value.
    let mql: MediaQueryList | null = null;
    const watchDpr = () => {
      mql?.removeEventListener("change", onDprChange);
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mql.addEventListener("change", onDprChange);
    };
    function onDprChange() {
      buildGrid();
      watchDpr();
    }
    watchDpr();

    return () => {
      ro.disconnect();
      mql?.removeEventListener("change", onDprChange);
    };
  }, [buildGrid]);

  const baseRgb = useMemo(() => hexToRgba(color), [color]);
  const activeRgb = useMemo(
    () => (activeColor ? hexToRgba(activeColor) : hexToRgba(getLighterColor(color))),
    [color, activeColor]
  );

  useEffect(() => {
    const baseRadius = baseSize / 2;
    const maxRadius = maxSize / 2;
    const proxSq = proximity * proximity;

    let rafId = 0;
    let lastFrameTime = performance.now();
    let prevX = NaN;
    let prevY = NaN;
    let prevActive = false;
    // Time constant for the ease: at dt = EASE_TAU_MS elapsed, a dot has
    // closed ~63% of the gap to its target. Tuned to feel equivalent to the
    // old fixed 0.22-per-frame factor at a steady 60fps (dt ≈ 16.7ms).
    const EASE_TAU_MS = 68;

    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      const dt = now - lastFrameTime;
      lastFrameTime = now;
      // Exponential decay keyed to elapsed wall-clock time rather than a
      // flat fraction-per-frame: a fixed per-frame factor makes the ease
      // (and therefore how long a "stuck-looking" zoomed dot takes to relax)
      // take proportionally longer in real time whenever the frame rate
      // drops — which happens more on wide viewports since the grid has far
      // more dots to redraw every frame (e.g. ~1,500 at 1920px vs ~5,000+ at
      // 4400px), compounded by the page's other concurrent GSAP/motion
      // animations competing for the main thread. Deriving the factor from
      // dt keeps the settle time consistent in real ms regardless of fps.
      const easeFactor = 1 - Math.exp(-dt / EASE_TAU_MS);

      const { x: px, y: py, active } = pointerRef.current;
      // No idle timeout: a resting cursor keeps its bulge, and dots only relax
      // once the pointer moves far enough away for the proximity test below to
      // stop matching them. Leaving the page is handled by real events on
      // `documentElement` rather than by assuming that a pause means departure.
      const pointerMoved =
        px !== prevX || py !== prevY || active !== prevActive;
      prevX = px;
      prevY = py;
      prevActive = active;

      // Pass 1 — retarget and ease. Nothing is painted here; this is split out
      // from the paint so the frame can be abandoned before touching the canvas.
      let settled = true;
      for (const dot of dotsRef.current) {
        if (active) {
          const dx = dot.cx - px;
          const dy = dot.cy - py;
          const dsq = dx * dx + dy * dy;
          if (dsq <= proxSq) {
            const t = 1 - Math.sqrt(dsq) / proximity;
            // Cubic falloff for a tight, lens-like peak near the pointer.
            dot.targetRadius =
              baseRadius + (maxRadius - baseRadius) * t * t * t;
          } else {
            dot.targetRadius = baseRadius;
          }
        } else {
          dot.targetRadius = baseRadius;
        }

        // Ease toward the target so size changes glide instead of popping
        // as the pointer moves or leaves.
        const previousRadius = dot.radius;
        dot.radius += (dot.targetRadius - dot.radius) * easeFactor;
        // Snap once close enough — otherwise the exponential decay never
        // reaches the target exactly, leaving every resting dot a fraction
        // of a pixel oversized (imperceptible alone, but it accumulates
        // into genuine visual noise across thousands of dots at wide
        // viewports). The snap is also what lets a frame ever count as
        // settled: without it nothing would compare equal and the early-out
        // below could never fire.
        if (Math.abs(dot.radius - dot.targetRadius) < 0.05) {
          dot.radius = dot.targetRadius;
        }
        if (dot.radius !== previousRadius) settled = false;
      }

      // Every dot has reached its target and the pointer is holding still, so
      // the canvas already shows the right image — repainting would be the same
      // work for the same result. This is what makes a resting bulge free: it
      // skips ~6,000 arcs per frame at 4400px, where the old code repainted the
      // whole grid forever regardless of whether anything had changed.
      if (settled && !pointerMoved && !forceDrawRef.current) {
        rafId = requestAnimationFrame(draw);
        return;
      }
      forceDrawRef.current = false;

      // Clear in *device* pixels with the transform reset, then re-apply the
      // dpr scale for painting. Clearing while the context was already scaled
      // (the old `clearRect(0, 0, canvas.width, canvas.height)`) mixes units:
      // `canvas.width` is device pixels, but a scaled context reads those
      // numbers as CSS pixels. At dpr < 1 — i.e. a zoomed-out browser, which
      // is exactly how a >1920px-wide viewport gets viewed on a normal display
      // — that cleared only the top-left corner of the buffer (at dpr 0.5,
      // one quarter of it), so the right and bottom bands were never erased
      // and every zoomed dot painted there stayed on screen permanently.
      const dpr = dprRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Pass 2 — paint. Only dots within `proximity` (or still mid-ease back
      // down) ever sit above base size; the vast majority of the grid is always
      // exactly `baseRadius`. Batching every resting dot into one path + one
      // fill() call (instead of a beginPath/arc/fill triple *per dot*) is what
      // actually keeps this cheap at wide viewports: a 4400px-wide grid has
      // ~6,000 dots vs ~2,000 at 1440px, and per-call Canvas2D overhead — not
      // raw pixel fill — was the real cost driving frame rate down (measured
      // 55fps @ 1440px vs 25fps @ 4400px with the old per-call). Fewer,
      // bigger draw calls scale far better than many tiny ones.
      ctx.fillStyle = color;
      ctx.beginPath();
      let bulgingDots: Dot[] | null = null;

      for (const dot of dotsRef.current) {
        if (dot.radius <= baseRadius + 0.05) {
          ctx.moveTo(dot.cx + baseRadius, dot.cy);
          ctx.arc(dot.cx, dot.cy, baseRadius, 0, Math.PI * 2);
        } else {
          (bulgingDots ??= []).push(dot);
        }
      }
      ctx.fill();

      if (bulgingDots) {
        for (const dot of bulgingDots) {
          const t = Math.min(
            1,
            Math.max(0, (dot.radius - baseRadius) / Math.max(0.001, maxRadius - baseRadius))
          );
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          const a = baseRgb.a + (activeRgb.a - baseRgb.a) * t;

          ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
          ctx.beginPath();
          ctx.arc(dot.cx, dot.cy, dot.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [baseSize, maxSize, proximity, color, baseRgb, activeRgb]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    // Since the bulge no longer expires on its own, departure has to be
    // observed rather than inferred from a pause. `mouseleave` is unreliable on
    // `window` — it is an element-level event — but fires correctly on
    // `documentElement`, which is what the old idle timeout was standing in for.
    // `blur` covers the cases that produces no leave event at all: alt-tabbing
    // away, or dragging the window edge to resize.
    const onLeave = () => {
      pointerRef.current.active = false;
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <div className={cn("relative h-full w-full", className)} style={style}>
      <div ref={wrapperRef} className="relative h-full w-full">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
