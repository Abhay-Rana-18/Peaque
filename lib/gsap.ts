import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, InertiaPlugin, Physics2DPlugin);
}

/**
 * A CSS-style `cubic-bezier(x1, y1, x2, y2)` expressed as a GSAP ease function.
 *
 * GSAP has no reader for the CSS form and `CustomEase` is a separate plugin, so
 * the curve is solved here: Newton-Raphson on x(t) to invert the progress, then
 * evaluate y(t). Falls back to bisection on the flat stretches where the
 * derivative stalls — which the hero's curtain ease (0.9, 0.02, 0.6, 0.95) has
 * plenty of, since it barely moves for its first half.
 */
export function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (p: number) => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    let t = p;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - p;
      if (Math.abs(dx) < 1e-6) return sampleY(t);
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }

    let lo = 0;
    let hi = 1;
    t = p;
    while (hi - lo > 1e-7) {
      const x = sampleX(t);
      if (Math.abs(x - p) < 1e-6) break;
      if (p > x) lo = t;
      else hi = t;
      t = lo + (hi - lo) / 2;
    }
    return sampleY(t);
  };
}

export { gsap, ScrollTrigger };
