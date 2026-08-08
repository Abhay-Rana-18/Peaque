"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, cubicBezierEase } from "@/lib/gsap";
import Lottie from "lottie-react";
import animationData from "@/public/Loading_opt.lottie/animations/animation.json";

/**
 * Curtain-lift ease from the hero on-load spec (§3): a hard ease-in with a soft
 * landing — barely moves for the first half, then snaps up and cushions.
 * `ease-in-out` is NOT a substitute; it kills the effect.
 */
const CURTAIN_EASE = cubicBezierEase(0.9, 0.02, 0.6, 0.95);

/**
 * Intro loader: displays the Lottie loading animation centered on screen.
 * The animation fades out and the curtain slides up to reveal the site.
 *
 * Fires `peaque:reveal` (and sets `__peaqueIntroDone`) as the curtain *starts*
 * lifting, not when it lands — the hero's word cascade is meant to begin
 * underneath the moving curtain (spec §1: "Retention" at 1.50s vs. the curtain
 * clearing at 1.63s), so the hero timeline's t=0 is the curtain's t=0.
 */
export function Loader() {
  const panelRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  // The Lottie keeps drawing every frame even at opacity 0, and it is still
  // mounted while the curtain lifts and the hero's first words land. Tearing it
  // down the moment it finishes fading hands the whole cascade a free main
  // thread instead of making it compete with a full-screen animation.
  const [logoGone, setLogoGone] = useState(false);

  useEffect(() => {
    const reveal = () => {
      (window as unknown as { __peaqueIntroDone?: boolean }).__peaqueIntroDone =
        true;
      window.dispatchEvent(new Event("peaque:reveal"));
    };

    const unlockScroll = () => {
      document.documentElement.style.overflow = "";
    };

    document.documentElement.style.overflow = "hidden";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      unlockScroll();
      setGone(true);
      return;
    }

    let tl: gsap.core.Timeline | null = null;
    let cancelled = false;

    // Spec §9 — gate on `document.fonts.ready`. The headline uses several faces
    // and the cascade is centre-anchored, so a face landing mid-sequence would
    // reflow word widths and jump the centring.
    document.fonts.ready.then(() => {
      if (cancelled) return;

      tl = gsap.timeline();
      // hold beat for lottie animation, then dismiss loader content and slide up panel
      tl.to(logoRef.current, {
        autoAlpha: 0,
        duration: 0.35,
        ease: "power2.in",
        delay: 2.0,
        onComplete: () => setLogoGone(true),
      }).to(
        panelRef.current,
        {
          yPercent: -100,
          duration: 0.667,
          ease: CURTAIN_EASE,
          // hero cascade starts under the lifting curtain
          onStart: reveal,
          onComplete: () => {
            // scroll stays locked until the curtain has fully cleared (spec §9)
            unlockScroll();
            setGone(true);
          },
        },
        "-=0.05"
      );
    });

    return () => {
      cancelled = true;
      tl?.kill();
      unlockScroll();
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={panelRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#226800]"
    >
      <div
        ref={logoRef}
        className="w-[80vw] h-[80vw] sm:w-[75vw] sm:h-[75vw] md:w-[55rem] md:h-[55rem] lg:w-[72rem] lg:h-[72rem] xl:w-[85rem] xl:h-[85rem] 2xl:w-[98rem] 2xl:h-[98rem] max-w-[96vw] max-h-[92vh] flex items-center justify-center"
      >
        {!logoGone && (
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}


