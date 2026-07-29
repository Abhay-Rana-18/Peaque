"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { Squiggle } from "./doodles";

const services = [
  {
    number: "01",
    title: "Motion Graphics",
    pair: "See the product. Feel the brand.",
    blurb:
      "Launch films, feature drops and brand reels — animation with actual personality, not template energy.",
    video: "/resources/bg7.mp4",
  },
  {
    number: "02",
    title: "Product Explainers",
    pair: "Ninety seconds. Zero confusion.",
    blurb:
      "We turn “so… what does it do?” into “where do I sign up?” with script, voice and motion working together.",
    video: "/resources/bg3.mp4",
  },
  {
    number: "03",
    title: "AI SaaS Websites",
    pair: "Explain fast. Convert faster.",
    blurb:
      "Landing pages with motion baked in — designed to be understood in one scroll and remembered after it.",
    video: "/resources/bg4.mp4",
  },
];

export function Services() {
  const scope = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);

  // cursor-following video preview (desktop only)
  useEffect(() => {
    const preview = previewRef.current;
    if (!preview || !window.matchMedia("(hover: hover)").matches) return;

    const xTo = gsap.quickTo(preview, "x", { duration: 0.5, ease: "power3" });
    const yTo = gsap.quickTo(preview, "y", { duration: 0.5, ease: "power3" });
    const move = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    gsap.to(preview, {
      scale: active === null ? 0 : 1,
      rotate: active === null ? 6 : -3,
      duration: 0.35,
      ease: active === null ? "power3.in" : "back.out(1.4)",
    });
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) v.play().catch(() => {});
      else v.pause();
    });
  }, [active]);

  // rows slide in on scroll
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-service-row]").forEach((row) => {
        gsap.from(row, {
          y: 60,
          autoAlpha: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: row, start: "top 88%" },
        });
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={scope} id="services" className="scroll-mt-24 px-5 py-28 md:py-36">
      <div className="mx-auto max-w-6xl">
        <p className="font-hand text-2xl text-moss md:text-3xl">what we do</p>
        <h2 className="mt-3 max-w-2xl font-heading text-4xl font-black tracking-tight text-ink md:text-6xl">
          Story is the{" "}
          <span className="relative inline-block">
            strategy
            <Squiggle className="absolute -bottom-2 left-0 w-full text-sage" delay={0.3} />
          </span>
          .
        </h2>

        <div className="mt-16 border-t-2 border-ink/15">
          {services.map((s, i) => (
            <a
              key={s.number}
              href="#work"
              data-service-row
              className="group grid cursor-pointer grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-b-2 border-ink/15 py-10 transition-colors duration-300 md:grid-cols-[4rem_1.2fr_1fr] md:items-baseline md:gap-x-10 md:py-12"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="pt-1 font-hand text-3xl text-sage md:text-4xl">
                {s.number}
              </span>
              <div>
                <h3 className="font-heading text-3xl font-extrabold tracking-tight text-ink transition-transform duration-300 group-hover:translate-x-2 md:text-5xl">
                  {s.title}
                </h3>
                <p className="mt-2 font-hand text-2xl text-moss">{s.pair}</p>
              </div>
              <p className="col-span-2 max-w-md leading-relaxed text-ink/70 md:col-span-1">
                {s.blurb}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* floating preview that chases the cursor */}
      <div
        ref={previewRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-40 hidden -translate-x-1/2 -translate-y-1/2 scale-0 [@media(hover:hover)]:block"
      >
        <div className="w-72 overflow-hidden rounded-xl border-2 border-ink bg-paper p-1.5 shadow-[5px_6px_0_rgb(38_49_28/0.2)]">
          {services.map((s, i) => (
            <video
              key={s.video}
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              className={`aspect-video w-full rounded-lg object-cover ${
                active === i ? "block" : "hidden"
              }`}
              src={s.video}
              muted
              loop
              playsInline
              preload="metadata"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
