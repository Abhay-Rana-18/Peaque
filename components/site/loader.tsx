"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, cubicBezierEase } from "@/lib/gsap";

/**
 * Curtain-lift ease from the hero on-load spec (§3): a hard ease-in with a soft
 * landing — barely moves for the first half, then snaps up and cushions.
 * `ease-in-out` is NOT a substitute; it kills the effect.
 */
const CURTAIN_EASE = cubicBezierEase(0.9, 0.02, 0.6, 0.95);

/**
 * Intro loader: displays the Loading.gif animation centered on screen.
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

    // Preload & decode the GIF so it is guaranteed visible before starting timer
    const preloadGif = new Promise<void>((resolve) => {
      const img = new Image();
      img.src = "/Loading.gif";
      if (img.complete) {
        if ("decode" in img) {
          img.decode().then(() => resolve()).catch(() => resolve());
        } else {
          resolve();
        }
      } else {
        img.onload = () => {
          if ("decode" in img) {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve(); // safety fallback
      }
    });

    // Gate on both fonts readiness and GIF decoding
    Promise.all([document.fonts.ready, preloadGif]).then(() => {
      if (cancelled) return;

      tl = gsap.timeline();
      // hold beat for loading animation, then dismiss loader content and slide up panel
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#004801]"
    >
      <div
        ref={logoRef}
        className="flex items-center justify-center p-4"
      >
        {!logoGone && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/Loading.gif"
            alt="Loading..."
            fetchPriority="high"
            loading="eager"
            decoding="sync"
            className="h-auto w-[clamp(16rem,24vw,65rem)] max-h-[85vh] object-contain"
          />
        )}
      </div>
    </div>
  );
}


