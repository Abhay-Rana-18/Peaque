"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import Lottie from "lottie-react";
import animationData from "@/public/Loading_opt.lottie/animations/animation.json";

/**
 * Intro loader: displays the Lottie loading animation centered on screen.
 * The animation fades out and the curtain slides up to reveal the site.
 * Fires `peaque:reveal` (and sets `__peaqueIntroDone`) as the slide starts so
 * the hero can time its entrance.
 */
export function Loader() {
  const panelRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const reveal = () => {
      (window as unknown as { __peaqueIntroDone?: boolean }).__peaqueIntroDone =
        true;
      window.dispatchEvent(new Event("peaque:reveal"));
      document.documentElement.style.overflow = "";
    };

    document.documentElement.style.overflow = "hidden";

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      setGone(true);
      return;
    }

    const tl = gsap.timeline();
    // hold beat for lottie animation, then dismiss loader content and slide up panel
    tl.to(logoRef.current, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      delay: 2.0,
    }).to(
      panelRef.current,
      {
        yPercent: -100,
        duration: 0.85,
        ease: "power4.inOut",
        onStart: () => {
          document.documentElement.style.overflow = "";
        },
        onComplete: () => {
          reveal();
          setGone(true);
        },
      },
      "-=0.05"
    );

    return () => {
      tl.kill();
      document.documentElement.style.overflow = "";
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
        <Lottie
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}


