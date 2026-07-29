"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { motion } from "motion/react";
import { FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { DotGrid } from "./dot-grid";

type Token = { text: string; className?: string };

// Point on a stadium / rounded-pill shape outline of half-width `a` and half-height `b`
// at direction `angle` from center, offset by an exact uniform distance `gap`.
function stadiumBoundaryPoint(angle: number, a: number, b: number, gap: number = 10) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // For a stadium shape (rounded pill), caps are semicircles of radius `b` at x = ±(a - b).
  const capX = Math.max(a - b, 0);

  let px = 0;
  let py = 0;

  if (capX === 0) {
    // Pure circle
    px = b * dx;
    py = b * dy;
  } else {
    // Check if ray intersects straight top/bottom edge
    const tY = dy !== 0 ? b / Math.abs(dy) : Infinity;
    const xAtTY = tY * dx;

    if (Math.abs(xAtTY) <= capX) {
      px = xAtTY;
      py = b * Math.sign(dy);
    } else {
      // Intersects left or right semicircular cap
      const cx = capX * (dx >= 0 ? 1 : -1);
      const proj = dx * cx;
      const disc = Math.max(proj * proj - (cx * cx - b * b), 0);
      const t = proj + Math.sqrt(disc);
      px = t * dx;
      py = t * dy;
    }
  }

  // Push outwards along ray angle by uniform gap
  return {
    x: px + dx * gap,
    y: py + dy * gap,
  };
}

export function Hero() {
  const scope = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [badgesHovered, setBadgesHovered] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);
  const DESIGN_WEIGHT_MIN = 200;
  const DESIGN_WEIGHT_MAX = 750;
  const [designWeight, setDesignWeight] = useState(400);
  const designTrackRef = useRef<HTMLSpanElement>(null);
  const abhayRef = useRef<HTMLSpanElement>(null);
  const ABHAY_ARROW_GAP = 10;
  const ABHAY_REACT_RADIUS = 160;
  const [abhayMounted, setAbhayMounted] = useState(false);
  const [abhayAngle, setAbhayAngle] = useState(-2.35);
  const [abhayHalfSize, setAbhayHalfSize] = useState({ w: 42, h: 19 });

  useEffect(() => {
    setAbhayMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      const el = abhayRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      if (Math.hypot(dx, dy) > ABHAY_REACT_RADIUS) return;
      setAbhayAngle(Math.atan2(dy, dx));
      setAbhayHalfSize({ w: rect.width / 2, h: rect.height / 2 });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const abhayBoundary = stadiumBoundaryPoint(
    abhayAngle,
    abhayHalfSize.w,
    abhayHalfSize.h,
    14 // uniform distance gap on all sides
  );
  const abhayArrowX = abhayBoundary.x;
  const abhayArrowY = abhayBoundary.y;

  const updateDesignWeightFromPointer = (clientY: number) => {
    const el = designTrackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = 1 - (clientY - rect.top) / rect.height;
    const clamped = Math.min(1, Math.max(0, ratio));
    setDesignWeight(
      Math.round(
        DESIGN_WEIGHT_MIN + clamped * (DESIGN_WEIGHT_MAX - DESIGN_WEIGHT_MIN),
      ),
    );
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set("[data-word]", { yPercent: 115 });
      gsap.set("[data-hero-fade]", { autoAlpha: 0, y: 24 });

      // paused until the loader lifts
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power4.out" },
      });
      tl.to(
        "[data-word]",
        { yPercent: 0, duration: 1.1, stagger: 0.06 },
        0.1,
      ).to(
        "[data-hero-fade]",
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 },
        "-=0.4",
      );
      introRef.current = tl;

      // gentle parallax out as you scroll away
      gsap.to("[data-hero-inner]", {
        yPercent: -12,
        autoAlpha: 0.25,
        ease: "none",
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  // wait for the loader's curtain lift (with a safety net if it never fires)
  useEffect(() => {
    const reveal = () => setRevealed(true);
    if (
      (window as unknown as { __peaqueIntroDone?: boolean }).__peaqueIntroDone
    ) {
      reveal();
      return;
    }
    window.addEventListener("peaque:reveal", reveal, { once: true });
    const fallback = setTimeout(reveal, 4500);
    return () => {
      window.removeEventListener("peaque:reveal", reveal);
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (revealed) introRef.current?.play();
  }, [revealed]);

  const [falling, setFalling] = useState(false);

  const resetHeroElements = useCallback(() => {
    if (!scope.current) return;
    setFalling(false);

    const wordWrappers = scope.current.querySelectorAll<HTMLElement>(
      "h1 .overflow-hidden",
    );
    gsap.set(wordWrappers, { overflow: "hidden" });

    const items = scope.current.querySelectorAll<HTMLElement>(
      "[data-word], [data-hero-fade], [data-fall-item]",
    );

    gsap.killTweensOf(items);

    gsap.to(items, {
      x: 0,
      y: 0,
      rotation: 0,
      opacity: 1,
      autoAlpha: 1,
      duration: 0.8,
      stagger: 0.02,
      ease: "power3.out",
      clearProps: "transform,opacity,visibility",
    });
  }, []);

  const handleFallAway = () => {
    if (falling || !scope.current) return;
    setFalling(true);

    const wordWrappers = scope.current.querySelectorAll<HTMLElement>(
      "h1 .overflow-hidden",
    );
    gsap.set(wordWrappers, { overflow: "visible" });

    const items = scope.current.querySelectorAll<HTMLElement>(
      "[data-word], [data-hero-fade], [data-fall-item]",
    );

    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const heroRect = scope.current?.getBoundingClientRect() || { width: window.innerWidth, left: 0 };
      const centerX = heroRect.left + heroRect.width / 2;
      const elCenterX = rect.left + rect.width / 2;
      
      const offsetX = (elCenterX - centerX) / (heroRect.width / 2);
      const horizontalDrift = offsetX * gsap.utils.random(30, 80);
      
      // Single consistent directional tilt (e.g. 18deg to 38deg in one direction)
      const sideSign = offsetX >= 0 ? 1 : -1;
      const tilt = sideSign * gsap.utils.random(24, 48);
      
      // Distance to drop down offscreen
      const fallDistance = window.innerHeight + 250 - rect.top;
      
      // Slow, graceful gravitational fall transition
      gsap.set(el, { transformOrigin: "50% 50%" });
      gsap.to(el, {
        y: fallDistance,
        x: horizontalDrift,
        rotation: tilt,
        opacity: 0,
        duration: gsap.utils.random(2.2, 3.0),
        delay: gsap.utils.random(0, 0.25),
        ease: "power2.in",
      });
    });

    // Smooth scroll down to next section while hero remains completely empty
    gsap.delayedCall(2.6, () => {
      window.scrollTo({
        top: window.innerHeight * 0.92,
        behavior: "smooth",
      });
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      // Only reset hero elements back into position if user explicitly scrolls back near the top of the page
      if (falling && window.scrollY < 40) {
        resetHeroElements();
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [falling, resetHeroElements]);

  const words = (tokens: Token[]) =>
    tokens.map((t, i) => (
      <span
        key={i}
        className="inline-block overflow-hidden align-top pb-[0.08em] -mb-[0.08em]"
      >
        <span
          data-word
          className={`inline-block will-change-transform ${t.className ?? ""}`}
        >
          {t.text}&nbsp;
        </span>
      </span>
    ));

  return (
    <section
      ref={scope}
      id="top"
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-5 -pt-5"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[url('/bg.svg')] bg-cover bg-center"
        />
        {/* <div
          aria-hidden
          className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full border-[46px] border-sage/25 blur-2xl"
        /> */}
        <DotGrid
          dotSize={3}
          gap={30}
          baseColor="#E5E5E5"
          activeColor="#E5E5E5"
          proximity={110}
          shockRadius={200}
          shockStrength={3}
          resistance={500}
          returnDuration={1.2}
        />
      </div>

      <div
        data-hero-inner
        className="relative mx-auto flex w-full max-w-7xl flex-col items-center text-center px-5"
      >
        {/* "for socials, apps..." tag + curved arrow, pointing into the headline */}
        <div
          data-hero-fade
          className="absolute top-3 left-12 hidden -rotate-9 md:block"
        >
          <span className="inline-block rounded-full bg-[#F5F5F5] px-4 py-1.5 text-xs font-medium text-[#4F6156]">
            For Socials, Apps, Websites &amp; Products
          </span>

          <svg
            viewBox="0 0 70 48"
            fill="none"
            aria-hidden
            className="ml-24 mt-1 w-20 text-ink/60"
          >
            <path
              d="M0.484375 0.125488C3.98438 13.6255 38.4844 39.6255 69.9844 39.6255"
              stroke="currentColor"
            />
            <g transform="translate(54.624, 28.868)">
              <path
                d="M2.87622 0.257233C4.37622 2.75723 9.87622 9.75723 13.3762 10.7572C14.8762 11.1858 3.87622 13.7572 0.376221 17.7572"
                stroke="currentColor"
              />
            </g>
          </svg>
        </div>

        {/* hand-written aside, top right */}
        <div
          data-hero-fade
          className="absolute -top-10 right-16 hidden w-50 rotate-10 text-right lg:block"
        >
          <p className="font-hand text-xl leading-snug text-ink/90">
            We give every project the love and affection it deserves :)
          </p>
          <svg
            viewBox="0 0 113 83"
            fill="none"
            aria-hidden
            // filter="url(#pencil-stroke)"
            className="-ml-3 -mt-5 w-36 -rotate-10"
          >
            <path
              opacity="0.7"
              d="M19.6048 0.5C15.6048 0.5 -5.39516 5 2.10484 11.5C9.60484 18 108.105 33 111.605 37.5C115.105 42 44.1055 23.5 39.1055 24.5C34.1055 25.5 70.1055 33.5 75.6055 37.5C81.1055 41.5 51.1055 38 53.6055 44C56.1055 50 112.105 62 96.1055 82"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mt-24 font-heading font-black leading-[1.13] tracking-normal [word-spacing:0.22em] text-ink md:mt-16">
          <span className="block text-[clamp(3.5rem,3.9vw,5rem)]">
            {words([
              { text: "Retention", className: "font-[750]" },
              { text: "Driven", className: "font-normal" },
            ])}
          </span>

          <span className="relative block text-[clamp(3.5rem,3.9vw,5rem)]">
            <span className="group/cta relative inline-flex items-center">
              <span className="inline-block transition-transform duration-700 ease-in-out group-has-[a:hover]/cta:-translate-x-34">
                {words([{ text: "Motion", className: "font-normal" }])}
              </span>
              <motion.a
                href="#contact"
                data-fall-item
                initial={{ opacity: 0, scale: 0.4 }}
                animate={revealed ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.85, ease: "backOut" }}
                className="group/arrow relative mx-2.5 inline-flex size-[0.88em] -translate-y-[0.05em] shrink-0 items-center justify-center align-middle"
              >
                {/* expanding pill background + text — absolutely positioned so it never
                    affects the surrounding text flow (guarantees "& Design" never moves) */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-0 z-0 flex h-full w-full items-center justify-end overflow-hidden rounded-full bg-black/80 pr-[0.75em] transition-[width] duration-700 ease-in-out group-hover/arrow:w-[3.26em]"
                >
                  <span className="mr-2 translate-x-3 whitespace-nowrap text-[0.4em] font-semibold text-cream opacity-0 transition-all duration-700 ease-in-out group-hover/arrow:translate-x-0 group-hover/arrow:opacity-100">
                    Book a call
                  </span>
                </span>

                <span className="relative z-10 inline-flex size-[0.6em] shrink-0 items-center justify-center rounded-full bg-coral shadow-[0_10px_24px_-6px_rgba(232,115,74,0.6)]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="size-[0.38em]"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      stroke="var(--cream)"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </motion.a>
            </span>
            {words([{ text: "&", className: "font-sans font-normal" }])}
            <span
              data-fall-item
              className="relative mx-1 inline-block overflow-visible align-top"
            >
              <span className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-top">
                <span
                  data-word
                  className="inline-block will-change-transform"
                  style={{ fontWeight: designWeight }}
                >
                  Design
                </span>
              </span>

              {/* dotted selection border */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-1 border border-dashed border-ink/50"
              />

              {/* 4 corner dots marking the selection — centered exactly on the dashed box's corners */}
              {[
                "-top-1 -left-1 -translate-x-1/2 -translate-y-1/2",
                "-top-1 -right-1 translate-x-1/2 -translate-y-1/2",
                "-bottom-1 -left-1 -translate-x-1/2 translate-y-1/2",
                "-bottom-1 -right-1 translate-x-1/2 translate-y-1/2",
              ].map((pos) => (
                <span
                  key={pos}
                  aria-hidden
                  className={`pointer-events-none absolute ${pos} size-1.5 rounded-full bg-black`}
                />
              ))}

              {/* interactive vertical slider — controls "Design"'s font-weight live, within a subtle range */}
              <span
                ref={designTrackRef}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateDesignWeightFromPointer(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) updateDesignWeightFromPointer(e.clientY);
                }}
                className="pointer-events-auto absolute -right-9 -top-2 -bottom-2 flex w-4 cursor-pointer items-center justify-center"
              >
                <span
                  aria-hidden
                  className="h-full w-1 rounded-full bg-[linear-gradient(to_top,#d9caa5,#26311c)]"
                />
                <span
                  aria-hidden
                  className="absolute left-1/2 h-2.5 w-5 rounded-sm border border-black bg-white opacity-100"
                  style={{
                    top: `${
                      100 -
                      ((designWeight - DESIGN_WEIGHT_MIN) /
                        (DESIGN_WEIGHT_MAX - DESIGN_WEIGHT_MIN)) *
                        100
                    }%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              </span>
            </span>

            {/* "Abhay" tag, tucked beside the inline icon, with an arrow that orbits it, tracking the cursor */}
            <span
              ref={abhayRef}
              data-fall-item
              className="absolute -right-32 top-1/2 hidden -translate-y-1/2 lg:block"
            >
              <span
                aria-hidden
                style={{
                  transform: abhayMounted
                    ? `translate(${abhayArrowX}px, ${abhayArrowY}px) rotate(${(abhayAngle * 180) / Math.PI}deg)`
                    : "translate(-30px, -30px) rotate(0deg)",
                }}
                className="pointer-events-none absolute left-1/2 top-1/2 -ml-4 -mt-4 size-8 text-[#226800] drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform duration-150 ease-out"
              >
                <svg
                  viewBox="0 0 44 40"
                  className="size-full overflow-visible"
                >
                  <path
                    d="M40 20 L6 4 L14 20 L6 36 Z"
                    fill="currentColor"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <motion.span
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={revealed ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 1.05, ease: "backOut" }}
                className="relative flex items-center rounded-full bg-[#226800] px-5 py-2 text-sm m-2 font-bold text-cream shadow-[0_10px_24px_-6px_rgba(38,49,28,0.5)]"
              >
                Abhay
              </motion.span>
            </span>
          </span>

          <span className="block text-[clamp(3.5rem,3.9vw,5rem)]">
            {words([
              { text: "for", className: "font-normal" },
              { text: "Results", className: "font-[750]" },
            ])}
            <span
              data-fall-item
              className="relative mx-3.5 inline-block h-[0.95em] w-[1.5em] translate-y-[0.1em] align-middle"
              onMouseEnter={() => setBadgesHovered(true)}
              onMouseLeave={() => setBadgesHovered(false)}
            >
              {/* Instagram-style badge — left, tilted left, tucked behind */}
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.4, rotate: -22 }}
                animate={
                  revealed
                    ? {
                        opacity: 1,
                        scale: 1,
                        rotate: -12,
                        y: badgesHovered ? -6 : 0,
                      }
                    : {}
                }
                transition={{
                  duration: 0.5,
                  delay: 0.9,
                  ease: "backOut",
                  y: { duration: 0.3, ease: "easeOut" },
                }}
                className="absolute left-0 top-[0.4em] z-10 flex size-[0.58em] translate-y-[-40%] items-center justify-center rounded-xs ring-1 ring-black ring-offset-8 ring-offset-white shadow-[0_10px_20px_-6px_rgba(38,49,28,0.4)]"
                style={{
                  background:
                    "linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)",
                }}
              >
                <FaInstagram className="size-[0.52em] text-white" />
              </motion.span>
              {/* LinkedIn-style badge — right, tilted right, layered on top */}
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 0.4, rotate: 22 }}
                animate={
                  revealed
                    ? {
                        opacity: 1,
                        scale: 1,
                        rotate: 12,
                        y: badgesHovered ? 6 : 0,
                      }
                    : {}
                }
                transition={{
                  duration: 0.5,
                  delay: 1,
                  ease: "backOut",
                  y: { duration: 0.3, ease: "easeOut" },
                }}
                className="absolute right-[0.25em] top-1/2 z-20 flex size-[0.58em] translate-y-[-50%] items-center justify-center rounded-xs bg-[#0a66c2] ring-1 ring-black ring-offset-8 ring-offset-white shadow-[0_10px_20px_-6px_rgba(38,49,28,0.4)]"
              >
                <FaLinkedinIn className="size-[0.46em] text-white" />
              </motion.span>
            </span>
            {words([{ text: "Oriented", className: "font-[500]" }])}
          </span>

          <span className="relative ml-[0.02em] inline-block overflow-visible align-top">
            <span className="block text-[clamp(3.5rem,3.9vw,5rem)]">
              {words([
                { text: "Founders", className: "italic font-semibold" },
                { text: ".", className: "text-coral" },
              ])}
            </span>
            <motion.img
              src="/underline.svg"
              alt=""
              aria-hidden
              data-fall-item
              initial={{ opacity: 0 }}
              animate={revealed ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 1.3, ease: "easeOut" }}
              className="absolute -bottom-3 left-[-2%] w-[104%]"
            />
          </span>
        </h1>

        {/* scroll cue, bottom right — aligned directly under the navbar contact button */}
        <button
          type="button"
          aria-label="Scroll to explore"
          data-hero-fade
          onClick={handleFallAway}
          className="absolute -bottom-24 right-5 flex size-14 items-center justify-center rounded-full border border-dashed border-ink/90 text-ink/90 transition-colors hover:border-ink hover:text-white hover:border-white hover:bg-ink/90"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M12 5v14M12 19l-6-6M12 19l6-6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}
