"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { Logo } from "./logo";

/**
 * Intro loader: a blank white page with the logo centered while its
 * pencil swash draws itself. The logo then fades out in place and the
 * page itself slides up to reveal the site. Fires `peaque:reveal` (and
 * sets `__peaqueIntroDone`) as the slide starts so the hero can time
 * its entrance to the curtain lift.
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
    // let the swash finish drawing, hold a beat, then dismiss the logo
    // where it stands — only the page moves
    tl.to(logoRef.current, {
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.in",
      delay: 1.8,
    }).to(
      panelRef.current,
      {
        yPercent: -100,
        duration: 0.9,
        ease: "power4.inOut",
        onStart: reveal,
        onComplete: () => setGone(true),
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white"
    >
      <div ref={logoRef}>
        <Logo className="text-3xl md:text-5xl" />
      </div>
    </div>
  );
}
