"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/** Big closing statement, agilebydesign-style: "Be the change…" */
export function Cta() {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set("[data-word]", { yPercent: 115 });
      gsap.to("[data-word]", {
        yPercent: 0,
        duration: 1,
        stagger: 0.06,
        ease: "power4.out",
        scrollTrigger: { trigger: scope.current, start: "top 70%" },
      });
      gsap.from("[data-cta-fade]", {
        autoAlpha: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: scope.current, start: "top 55%" },
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  const line = (text: string, accent = false) =>
    text.split(" ").map((w, i) => (
      <span
        key={i}
        className="inline-block overflow-hidden align-top pb-[0.1em] -mb-[0.1em]"
      >
        <span
          data-word
          className={`inline-block will-change-transform ${
            accent ? "font-hand font-semibold text-moss" : ""
          }`}
        >
          {w}&nbsp;
        </span>
      </span>
    ));

  return (
    <section
      ref={scope}
      id="contact"
      className="scroll-mt-24 px-5 py-32 text-center md:py-44"
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="font-heading text-5xl font-black leading-[1.02] tracking-tight text-ink md:text-7xl">
          <span className="block">{line("Be the launch")}</span>
          <span className="block">
            {line("everyone")}
            {line("remembers.", true)}
          </span>
        </h2>

        <p
          data-cta-fade
          className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink/70"
        >
          Tell us what you&apos;re building. We&apos;ll bring the storyboards,
          the motion, and at least three ideas you didn&apos;t ask for.
        </p>

        <div data-cta-fade className="mt-10">
          <a href="mailto:hello@peaque.studio" className="btn-sketch text-lg">
            hello@peaque.studio
          </a>
        </div>

        <p data-cta-fade className="mt-6 font-hand text-xl text-ink/50">
          replies within 24h — let&apos;s fix the boring in your brand ✎
        </p>
      </div>
    </section>
  );
}
