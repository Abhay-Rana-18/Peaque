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

// `Math.atan2` wraps its result into (-π, π], and that range's discontinuity sits
// on the negative x-axis — directly left of the tag. Crossing it flips the raw value
// by ~2π, which a CSS `rotate()` transition renders as a full 360° spin even though
// the real direction barely moved. Returning the equivalent angle nearest `current`
// keeps the fed value continuous, so the transition always takes the short way round.
function nearestEquivalentAngle(target: number, current: number) {
  const delta = target - current;
  return current + Math.atan2(Math.sin(delta), Math.cos(delta));
}

export function Hero() {
  const scope = useRef<HTMLElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const [hoveredBadge, setHoveredBadge] = useState<"instagram" | "linkedin" | null>(null);
  const [ctaHovered, setCtaHovered] = useState(false);
  const DESIGN_WEIGHT_MIN = 200;
  const DESIGN_WEIGHT_MAX = 750;
  const [designWeight, setDesignWeight] = useState(400);
  const designTrackRef = useRef<HTMLSpanElement>(null);
  const abhayRef = useRef<HTMLSpanElement>(null);
  const designWordRef = useRef<HTMLSpanElement>(null);
  const [isDesignClicked, setIsDesignClicked] = useState(false);
  const [designPulsing, setDesignPulsing] = useState(false);
  const ABHAY_ARROW_GAP = 24;
  const ABHAY_REACT_RADIUS = 160;
  const DEFAULT_ABHAY_ANGLE = -2.7;
  const [abhayAngle, setAbhayAngle] = useState(DEFAULT_ABHAY_ANGLE);
  const [abhayHalfSize, setAbhayHalfSize] = useState({ w: 42, h: 19 });
  const [isAbhayTracking, setIsAbhayTracking] = useState(false);

  const ctaArrowRef = useRef<HTMLAnchorElement>(null);
  const underlineRef = useRef<HTMLImageElement>(null);
  const socialsTagRef = useRef<HTMLSpanElement>(null);
  const socialsArrowPathRef = useRef<SVGPathElement>(null);
  const socialsArrowHeadRef = useRef<SVGPathElement>(null);
  const asideTagRef = useRef<HTMLDivElement>(null);
  const asideScribblePathRef = useRef<SVGPathElement>(null);

  const abhayAngleRef = useRef(DEFAULT_ABHAY_ANGLE);
  const animFrameRef = useRef<number | null>(null);

  const startReturnToDefaultAnimation = useCallback(
    (customDuration?: number) => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      const startAngle = abhayAngleRef.current;
      // Tracking leaves `startAngle` unwrapped (it accumulates across revolutions),
      // so resolve the resting angle into whichever revolution the arrow is in now.
      // Snapping to the bare constant instead would itself be a 2π jump — i.e. a spin.
      const endAngle = nearestEquivalentAngle(DEFAULT_ABHAY_ANGLE, startAngle);
      const diff = endAngle - startAngle;

      if (Math.abs(diff) < 0.01) {
        setAbhayAngle(endAngle);
        abhayAngleRef.current = endAngle;
        return;
      }

      const duration = customDuration ?? 1200; // ms — slow, graceful return
      const startTime = performance.now();

      const animateStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Smooth ease-in-out cubic easing
        const easeProgress =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const currentAngle = startAngle + diff * easeProgress;

        abhayAngleRef.current = currentAngle;
        setAbhayAngle(currentAngle);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateStep);
        } else {
          abhayAngleRef.current = endAngle;
          setAbhayAngle(endAngle);
          animFrameRef.current = null;
        }
      };

      animFrameRef.current = requestAnimationFrame(animateStep);
    },
    [DEFAULT_ABHAY_ANGLE],
  );

  useEffect(() => {
    // "Abhay" tag is only rendered (lg:block) on large screens — skip the
    // cursor-tracking work entirely below that breakpoint.
    const mq = window.matchMedia("(min-width: 1024px)");
    let active = mq.matches;
    const handleMouseMove = (e: MouseEvent) => {
      if (!active) return;
      const el = abhayRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      if (Math.hypot(dx, dy) > ABHAY_REACT_RADIUS) {
        setIsAbhayTracking((wasTracking) => {
          if (wasTracking) {
            startReturnToDefaultAnimation();
          }
          return false;
        });
        return;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const targetAngle = nearestEquivalentAngle(
        Math.atan2(dy, dx),
        abhayAngleRef.current,
      );
      abhayAngleRef.current = targetAngle;
      setAbhayAngle(targetAngle);
      setAbhayHalfSize({ w: rect.width / 2, h: rect.height / 2 });
      setIsAbhayTracking(true);
    };
    const handleChange = (e: MediaQueryListEvent) => {
      active = e.matches;
    };
    mq.addEventListener("change", handleChange);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      mq.removeEventListener("change", handleChange);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ABHAY_REACT_RADIUS, DEFAULT_ABHAY_ANGLE, startReturnToDefaultAnimation]);

  const abhayBoundary = stadiumBoundaryPoint(
    abhayAngle,
    abhayHalfSize.w,
    abhayHalfSize.h,
    ABHAY_ARROW_GAP
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
      const mm = gsap.matchMedia();

      mm.add(
        {
          isMobile: "(max-width: 639px)",
          isTablet: "(min-width: 640px) and (max-width: 1023px)",
          isDesktop: "(min-width: 1024px)",
        },
        (context) => {
          const { isMobile } = context.conditions as {
            isMobile: boolean;
            isTablet: boolean;
          };

          const fadeY = isMobile ? 14 : 24;
          const fadeDuration = isMobile ? 0.6 : 0.8;
          const fadeStagger = isMobile ? 0.08 : 0.12;
          const parallaxDistance = isMobile ? -6 : -12;

          const preparePath = (pathEl: SVGPathElement | null) => {
            if (!pathEl) return 0;
            const length = pathEl.getTotalLength();
            gsap.set(pathEl, {
              strokeDasharray: length,
              strokeDashoffset: length,
              autoAlpha: 1,
            });
            return length;
          };

          const wordEls = gsap.utils.toArray<HTMLElement>("[data-word]");

          // Initial hidden state setup
          gsap.set(wordEls, { autoAlpha: 0, y: 16 });
          if (ctaArrowRef.current) {
            gsap.set(ctaArrowRef.current, { autoAlpha: 0, scale: 0.4 });
          }
          if (underlineRef.current) {
            gsap.set(underlineRef.current, { scaleX: 0, autoAlpha: 1, transformOrigin: "left center" });
          }
          if (socialsTagRef.current) {
            gsap.set(socialsTagRef.current, { autoAlpha: 0, y: 10 });
          }
          preparePath(socialsArrowPathRef.current);
          preparePath(socialsArrowHeadRef.current);

          if (asideTagRef.current) {
            gsap.set(asideTagRef.current, { autoAlpha: 0, y: 10 });
          }
          preparePath(asideScribblePathRef.current);
          gsap.set("[data-hero-fade]", { autoAlpha: 0, y: fadeY });

          // Paused until the loader lifts
          const tl = gsap.timeline({
            paused: true,
            defaults: { ease: "power3.out" },
          });

          // FIRST: Center big text word by word from top to bottom
          wordEls.forEach((el, index) => {
            tl.to(el, { autoAlpha: 1, y: 0, duration: 0.4 }, index === 0 ? 0.15 : "-=0.28");

            // Right arrow appears seamlessly alongside "Motion" at word index 2
            if (index === 2 && ctaArrowRef.current) {
              tl.to(
                ctaArrowRef.current,
                { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" },
                "<",
              );
            }
          });

          // When "Founders." is loaded, its bottom line animates from start to end (left to right)
          if (underlineRef.current) {
            tl.to(
              underlineRef.current,
              { scaleX: 1, duration: 0.65, ease: "power2.out" },
              "+=0.05",
            );
          }

          // SECONDLY: 'For socials, Apps, websites & Products' is loaded and after it below arrow is animated rendering from start to end
          if (socialsTagRef.current) {
            tl.to(
              socialsTagRef.current,
              { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
              "+=0.15",
            );
          }
          if (socialsArrowPathRef.current) {
            tl.to(
              socialsArrowPathRef.current,
              { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" },
              "-=0.15",
            );
          }
          if (socialsArrowHeadRef.current) {
            tl.to(
              socialsArrowHeadRef.current,
              { strokeDashoffset: 0, duration: 0.25, ease: "power2.out" },
              "-=0.1",
            );
          }

          // THIRDLY: "We give every project..." is loaded and after it below SVG is animated rendering from start to end
          if (asideTagRef.current) {
            tl.to(
              asideTagRef.current,
              { autoAlpha: 1, y: 0, duration: 0.45, ease: "power2.out" },
              "+=0.15",
            );
          }
          if (asideScribblePathRef.current) {
            tl.to(
              asideScribblePathRef.current,
              { strokeDashoffset: 0, duration: 0.75, ease: "power1.inOut" },
              "-=0.15",
            );
          }

          // Finally reveal remaining elements (badges and scroll cue)
          tl.to(
            "[data-hero-fade]",
            { autoAlpha: 1, y: 0, duration: fadeDuration, stagger: fadeStagger },
            "-=0.2",
          );

          introRef.current = tl;
          if (revealedRef.current) tl.play();

          // gentle parallax out as you scroll away
          gsap.to("[data-hero-inner]", {
            yPercent: parallaxDistance,
            autoAlpha: 0.25,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });

          return () => {
            introRef.current = null;
          };
        },
      );
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
    revealedRef.current = revealed;
    if (!revealed) return;
    introRef.current?.play();

    // Below lg the "Abhay" tag is hidden (see its `hidden lg:block` className),
    // so skip measuring/animating it — the rects would be meaningless (0-sized).
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    const abhayEl = abhayRef.current;
    const designEl = designWordRef.current;
    const trackEl = designTrackRef.current;
    if (!abhayEl || !designEl || !trackEl) return;

    // Set arrow direction pointing left towards targets (Math.PI / 180deg)
    setAbhayAngle(Math.PI);

    // Start with minimum weight at slider bottom
    setDesignWeight(DESIGN_WEIGHT_MIN);

    // Measure exact bounding rectangles
    const abhayRect = abhayEl.getBoundingClientRect();
    const designRect = designEl.getBoundingClientRect();
    const trackRect = trackEl.getBoundingClientRect();

    const abhayHalfW = abhayRect.width / 2;
    const abhayHalfH = abhayRect.height / 2;
    const abhayCenterX = abhayRect.left + abhayHalfW;
    const abhayCenterY = abhayRect.top + abhayHalfH;

    // Calculate exact arrow tip offset when pointing left (Math.PI)
    const arrowBoundary = stadiumBoundaryPoint(
      Math.PI,
      abhayHalfW,
      abhayHalfH,
      ABHAY_ARROW_GAP,
    );

    // SVG arrow tip extends ~18px left of arrow center when rotated 180deg (Math.PI)
    const ARROW_TIP_LENGTH = 18;
    const arrowTipX = arrowBoundary.x - ARROW_TIP_LENGTH;

    // 1. Point arrow tip EXACTLY at the word "Design"
    const designTargetPointX = designRect.right;
    const designTargetPointY = designRect.top + designRect.height / 2;

    const designTargetX = designTargetPointX - abhayCenterX - arrowTipX;
    const designTargetY = designTargetPointY - abhayCenterY - arrowBoundary.y;

    const startX = Math.max(400, window.innerWidth - abhayRect.left + 120);

    // 2. Point arrow tip EXACTLY at the vertical slider controller knob
    const trackCenterX = trackRect.left + trackRect.width / 2;
    const sliderBottomPointY = trackRect.bottom - 4;

    const sliderBottomX = trackCenterX - abhayCenterX - arrowTipX;
    const sliderBottomY = sliderBottomPointY - abhayCenterY - arrowBoundary.y;

    const DEFAULT_WEIGHT = 400;
    const defaultRatio =
      (DEFAULT_WEIGHT - DESIGN_WEIGHT_MIN) /
      (DESIGN_WEIGHT_MAX - DESIGN_WEIGHT_MIN);
    const sliderDefaultPointY =
      trackRect.bottom - defaultRatio * trackRect.height;
    const sliderDefaultY =
      sliderDefaultPointY - abhayCenterY - arrowBoundary.y;

    const tl = gsap.timeline({ delay: 0.25 });

    tl.set(abhayEl, { x: startX, y: 0, opacity: 0, scale: 1 })
      .to(abhayEl, {
        x: designTargetX,
        y: designTargetY,
        opacity: 1,
        duration: 1.2,
        ease: "power2.out",
      })
      .to(abhayEl, {
        scale: 0.82,
        duration: 0.12,
        ease: "power1.in",
        onComplete: () => {
          setIsDesignClicked(true);
          setDesignPulsing(true);
          setTimeout(() => setDesignPulsing(false), 350);
        },
      })
      .to(abhayEl, {
        scale: 1,
        duration: 0.14,
        ease: "back.out(2)",
      })
      .to({}, { duration: 0.25 })
      .to(abhayEl, {
        x: sliderBottomX,
        y: sliderBottomY,
        duration: 0.7,
        ease: "power2.inOut",
      })
      .to(abhayEl, {
        scale: 0.88,
        duration: 0.1,
      })
      .to(abhayEl, {
        y: sliderDefaultY,
        duration: 0.9,
        ease: "power1.inOut",
        onUpdate: function () {
          const abhayCurrentY =
            abhayRect.top + (gsap.getProperty(abhayEl, "y") as number);
          const arrowTipY = abhayCurrentY + abhayHalfH + arrowBoundary.y;
          const ratio = 1 - (arrowTipY - trackRect.top) / trackRect.height;
          const clamped = Math.min(1, Math.max(0, ratio));
          const weight = Math.round(
            DESIGN_WEIGHT_MIN +
              clamped * (DESIGN_WEIGHT_MAX - DESIGN_WEIGHT_MIN),
          );
          setDesignWeight(weight);
        },
      })
      .to(abhayEl, {
        scale: 1,
        duration: 0.15,
        ease: "back.out(2)",
      })
      .to({}, { duration: 0.2 })
      .to(abhayEl, {
        x: 0,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
        onComplete: () => {
          startReturnToDefaultAnimation();
        },
      });

    return () => {
      tl.kill();
    };
  }, [revealed, startReturnToDefaultAnimation]);

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
        <div className="absolute top-3 left-12 hidden -rotate-9 lg:block">
          <span
            ref={socialsTagRef}
            className="inline-block rounded-full bg-[#F5F5F5] px-4 py-1.5 text-xs font-medium text-[#4F6156]"
          >
            For Socials, Apps, Websites &amp; Products
          </span>

          <svg
            viewBox="0 0 70 48"
            fill="none"
            aria-hidden
            className="ml-24 mt-1 w-20 text-ink/60"
          >
            <path
              ref={socialsArrowPathRef}
              d="M0.484375 0.125488C3.98438 13.6255 38.4844 39.6255 69.9844 39.6255"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <g transform="translate(54.624, 28.868)">
              <path
                ref={socialsArrowHeadRef}
                d="M2.87622 0.257233C4.37622 2.75723 9.87622 9.75723 13.3762 10.7572C14.8762 11.1858 3.87622 13.7572 0.376221 17.7572"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </svg>
        </div>

        {/* hand-written aside, top right */}
        <div
          ref={asideTagRef}
          className="absolute -top-10 right-16 hidden w-50 rotate-10 text-right lg:block"
        >
          <p className="font-hand text-xl leading-snug text-ink/90">
            We give every project the love and affection it deserves :)
          </p>
          <svg
            viewBox="0 0 113 83"
            fill="none"
            aria-hidden
            className="-ml-3 -mt-5 w-36 -rotate-10 text-ink/60"
          >
            <path
              ref={asideScribblePathRef}
              opacity="0.7"
              d="M19.6048 0.5C15.6048 0.5 -5.39516 5 2.10484 11.5C9.60484 18 108.105 33 111.605 37.5C115.105 42 44.1055 23.5 39.1055 24.5C34.1055 25.5 70.1055 33.5 75.6055 37.5C81.1055 41.5 51.1055 38 53.6055 44C56.1055 50 112.105 62 96.1055 82"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="mt-24 font-heading font-black leading-[1.05] tracking-normal [word-spacing:0.22em] text-ink md:mt-16">
          <span className="block text-[clamp(2.25rem,9vw,3.25rem)] sm:text-[clamp(2.75rem,7vw,3.75rem)] md:text-[clamp(3.25rem,4.5vw,4.25rem)] lg:text-[clamp(3.5rem,3.9vw,5rem)]">
            {words([
              { text: "Retention", className: "font-[750]" },
              { text: "Driven", className: "font-normal" },
            ])}
          </span>

          <span className="relative block text-[clamp(2.25rem,9vw,3.25rem)] sm:text-[clamp(2.75rem,7vw,3.75rem)] md:text-[clamp(3.25rem,4.5vw,4.25rem)] lg:text-[clamp(3.5rem,3.9vw,5rem)]">
            <span className="group/cta relative inline-flex items-center">
              <span className="inline-block transition-transform duration-700 ease-in-out group-has-[a:hover]/cta:-translate-x-[2.42em]">
                {words([{ text: "Motion", className: "font-normal" }])}
              </span>
              <motion.a
                ref={ctaArrowRef}
                href="#contact"
                data-fall-item
                className="group/arrow relative mr-[0.22em] inline-flex size-[0.88em] -translate-y-[0.05em] shrink-0 items-center justify-center align-middle"
              >
                {/* expanding pill background + text — absolutely positioned so it never
                    affects the surrounding text flow (guarantees "& Design" never moves) */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-0 z-0 flex h-full w-full items-center justify-end overflow-hidden rounded-full bg-black/80 pr-[0.74em] transition-[width] duration-700 ease-in-out group-hover/arrow:w-[3.3em]"
                >
                  <span className="mr-1.5 translate-x-2 whitespace-nowrap text-[0.4em] font-semibold text-cream opacity-0 transition-all duration-700 ease-in-out group-hover/arrow:translate-x-0 group-hover/arrow:opacity-100">
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
                  ref={designWordRef}
                  data-word
                  className={`inline-block will-change-transform transition-all duration-300 ${
                    designPulsing ? "scale-105" : ""
                  }`}
                  style={{
                    fontWeight: designWeight,
                    fontFamily: isDesignClicked
                      ? "inherit"
                      : "'Ink Free', var(--font-hand), var(--font-kalam), cursive",
                  }}
                >
                  Design
                </span>
              </span>

              {/* dotted selection border */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -inset-1 border border-dashed border-ink/50 transition-opacity duration-300 ${
                  isDesignClicked ? "opacity-100" : "opacity-0"
                }`}
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
                  className={`pointer-events-none absolute ${pos} size-1.5 rounded-full bg-black transition-opacity duration-300 ${
                    isDesignClicked ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {/* interactive vertical slider — controls "Design"'s font-weight live, within a subtle range */}
              <span
                ref={designTrackRef}
                onPointerDown={(e) => {
                  if (!isDesignClicked) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateDesignWeightFromPointer(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!isDesignClicked) return;
                  if (e.buttons === 1) updateDesignWeightFromPointer(e.clientY);
                }}
                className={`absolute -right-9 -top-2 -bottom-2 flex w-4 items-center justify-center transition-opacity duration-300 ${
                  isDesignClicked
                    ? "opacity-100 pointer-events-auto cursor-pointer"
                    : "opacity-0 pointer-events-none"
                }`}
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
              className="absolute -right-16 top-1/2 hidden -translate-y-1/2 lg:block opacity-0"
            >
              <span
                aria-hidden
                style={{
                  transform: `translate(${abhayArrowX}px, ${abhayArrowY}px) rotate(${(abhayAngle * 180) / Math.PI}deg)`,
                }}
                className={`pointer-events-none absolute left-1/2 top-1/2 -ml-6 -mt-6 size-11 text-[#1e7a00] drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform ease-out ${
                  isAbhayTracking ? "duration-150" : "duration-75"
                }`}
              >
                <svg
                  viewBox="0 0 44 40"
                  className="size-full overflow-visible"
                >
                  <path
                    d="M40 20 L6 4 L14 20 L6 36 Z"
                    fill="currentColor"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <span className="relative flex items-center rounded-full bg-[#1e7a00] px-4 py-1.5 text-base font-medium text-white shadow-[0_8px_20px_-4px_rgba(30,122,0,0.4)]">
                Abhay
              </span>
            </span>
          </span>

          <span className="block text-[clamp(2.25rem,9vw,3.25rem)] sm:text-[clamp(2.75rem,7vw,3.75rem)] md:text-[clamp(3.25rem,4.5vw,4.25rem)] lg:text-[clamp(3.5rem,3.9vw,5rem)]">
            {words([
              { text: "for", className: "font-normal" },
              { text: "Results", className: "font-[750]" },
            ])}
            <span
              data-fall-item
              className="relative mx-3.5 inline-block h-[0.95em] w-[1.5em] translate-y-[0.1em] align-middle"
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
                        y: hoveredBadge === "instagram" ? -8 : hoveredBadge === "linkedin" ? 8 : 0,
                        zIndex: hoveredBadge === "instagram" ? 30 : 10,
                      }
                    : {}
                }
                transition={{
                  duration: 0.5,
                  delay: 0.9,
                  ease: "backOut",
                  y: { duration: 0.3, ease: "easeOut" },
                }}
                onMouseEnter={() => setHoveredBadge("instagram")}
                onMouseLeave={() => setHoveredBadge(null)}
                className="absolute left-0 top-[0.4em] z-10 flex size-[0.58em] translate-y-[-40%] cursor-pointer items-center justify-center rounded-xs ring-1 ring-black ring-offset-8 ring-offset-white shadow-[0_10px_20px_-6px_rgba(38,49,28,0.4)]"
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
                        y: hoveredBadge === "linkedin" ? -8 : hoveredBadge === "instagram" ? 8 : 0,
                        zIndex: hoveredBadge === "linkedin" ? 30 : 20,
                      }
                    : {}
                }
                transition={{
                  duration: 0.5,
                  delay: 1,
                  ease: "backOut",
                  y: { duration: 0.3, ease: "easeOut" },
                }}
                onMouseEnter={() => setHoveredBadge("linkedin")}
                onMouseLeave={() => setHoveredBadge(null)}
                className="absolute right-[0.25em] top-1/2 z-20 flex size-[0.58em] translate-y-[-50%] cursor-pointer items-center justify-center rounded-xs bg-[#0a66c2] ring-1 ring-black ring-offset-8 ring-offset-white shadow-[0_10px_20px_-6px_rgba(38,49,28,0.4)]"
              >
                <FaLinkedinIn className="size-[0.46em] text-white" />
              </motion.span>
            </span>
            {words([{ text: "Oriented", className: "font-[500]" }])}
          </span>

          <span className="relative ml-[0.02em] inline-block overflow-visible align-top">
            <span className="block text-[clamp(2.25rem,9vw,3.25rem)] sm:text-[clamp(2.75rem,7vw,3.75rem)] md:text-[clamp(3.25rem,4.5vw,4.25rem)] lg:text-[clamp(3.5rem,3.9vw,5rem)]">
              {words([
                { text: "Founders", className: "italic font-semibold" },
                { text: ".", className: "text-coral" },
              ])}
            </span>
            <motion.img
              ref={underlineRef}
              src="/underline.svg"
              alt=""
              aria-hidden
              data-fall-item
              className="absolute -bottom-3 left-[-2%] w-[104%] origin-left"
            />
          </span>
        </h1>
      </div>

      {/* scroll cue, bottom right — aligned directly under the navbar contact button */}
      <button
        type="button"
        aria-label="Scroll to explore"
        data-hero-fade
        onClick={handleFallAway}
        className="absolute bottom-6 right-4 z-20 flex size-12 items-center justify-center rounded-full border border-dashed border-ink/90 text-black transition-colors hover:border-ink hover:border-white hover:bg-ink/90 hover:text-white sm:bottom-8 sm:right-6 sm:size-14 md:bottom-10 md:right-8 lg:bottom-10 lg:right-12 lg:size-16 xl:right-16 2xl:right-20"
      >
        <svg width="21" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10.5 1V11.75V22.5M20 14L10.5 22.5L1 14"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

      </button>
    </section>
  );
}
