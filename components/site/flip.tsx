"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Pinned contrast section — scroll scrubs from the losing move
 * (a feature dump, scribbled out) to the winning one (a story).
 */
export function Flip() {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "+=140%",
            pin: true,
            scrub: 0.5,
          },
        });

        tl.to("[data-strike]", { scaleX: 1, duration: 0.35 })
          .to(
            "[data-losing]",
            { opacity: 0.28, y: -14, duration: 0.35 },
            "<+=0.1"
          )
          .fromTo(
            "[data-winning]",
            { opacity: 0, y: 60 },
            { opacity: 1, y: 0, duration: 0.45 },
            ">-0.05"
          )
          .fromTo(
            "[data-winning-hand]",
            { opacity: 0, rotate: 4, scale: 0.85 },
            { opacity: 1, rotate: -2, scale: 1, duration: 0.3 },
            ">-0.15"
          )
          .to({}, { duration: 0.25 });
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={scope}
      className="flex min-h-svh flex-col items-center justify-center gap-10 overflow-hidden bg-moss px-5 text-center"
    >
      <div data-losing>
        <p className="font-hand text-2xl text-cream/60 md:text-3xl">launching with</p>
        <p className="relative mt-2 inline-block font-heading text-5xl font-black tracking-tight text-cream/90 md:text-8xl">
          a feature list
          <span
            data-strike
            aria-hidden
            className="absolute left-[-2%] top-1/2 h-[0.09em] w-[104%] origin-left -rotate-2 rounded-full bg-sand filter-[url(#pencil-stroke)]"
            style={{ transform: "scaleX(0) rotate(-2deg)" }}
          />
        </p>
      </div>

      <div data-winning className="opacity-0">
        <p className="font-hand text-2xl text-cream/70 md:text-3xl">launching with</p>
        <p className="mt-2 font-heading text-5xl font-black tracking-tight text-cream md:text-8xl">
          a story people{" "}
          <span data-winning-hand className="inline-block font-hand font-semibold text-sand">
            feel
          </span>
        </p>
      </div>
    </section>
  );
}
