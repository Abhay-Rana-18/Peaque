"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const TEXT =
  "A thousand AI products launch every week. Being good is not enough anymore — you have to be understood.";

/** Words ink in one by one as you scroll, agilebydesign-style. */
export function Statement() {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to("[data-word]", {
        opacity: 1,
        ease: "none",
        stagger: 0.6,
        scrollTrigger: {
          trigger: scope.current,
          start: "top 78%",
          end: "bottom 45%",
          scrub: 0.4,
        },
      });
      gsap.to("[data-statement-squiggle]", {
        strokeDashoffset: 0,
        ease: "none",
        scrollTrigger: {
          trigger: scope.current,
          start: "center 55%",
          end: "bottom 40%",
          scrub: 0.4,
        },
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  const words = TEXT.split(" ");
  const last = words.length - 1;

  return (
    <section ref={scope} className="px-5 py-32 md:py-44">
      <p className="mx-auto max-w-4xl font-heading text-3xl font-bold leading-[1.25] tracking-tight text-ink md:text-5xl">
        {words.map((word, i) =>
          i === last ? (
            <span key={i} className="relative inline-block">
              <span data-word className="opacity-15">
                {word}
              </span>
              <svg
                viewBox="0 0 220 18"
                aria-hidden
                filter="url(#pencil-stroke)"
                className="absolute -bottom-1 left-0 w-full text-moss"
              >
                <path
                  data-statement-squiggle
                  d="M4 10.5 C 22 5.5, 38 4.2, 57 8.6 C 71 11.8, 83 12.8, 99 9.2 C 111 6.6, 121 5.2, 137 7.4 C 154 9.8, 167 11.4, 183 8.2 C 196 5.8, 207 7.6, 216 9.6"
                  stroke="currentColor"
                  strokeWidth={5}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={320}
                  strokeDashoffset={320}
                />
              </svg>
            </span>
          ) : (
            <span key={i} data-word className="opacity-15">
              {word}{" "}
            </span>
          )
        )}
      </p>
    </section>
  );
}
