"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { motion } from "motion/react";
import { DotGridZoom } from "./dot-grid-zoom";
import { TorusKnot3D } from "./three/torus-knot";

type Token = {
  text: string;
  name: string;
  className?: string;
  /**
   * Drops the trailing space. Words normally carry one so they separate, but it
   * is a real space character and the h1's `[word-spacing:0.22em]` applies on
   * top of it — about 0.48em together. Before the badge slot that reads as a
   * lopsided gap, since nothing sits on the slot's other side.
   */
  tight?: boolean;
};

/**
 * Headline values taken from the Figma "Main" frame (1440x810, node 1:16879).
 * Type is Archivo at 63.549px / 65px line-height, so all the geometry below is
 * expressed as a fraction of that size and stays on the existing type scale.
 *
 * The emphasised words are NOT `--ink` (#26311c) — that token is the site's
 * body green and is right elsewhere, but the headline uses a deeper one.
 */
const HEADLINE_GREEN = "text-[#142b01]";
/** The period after "Founders" — see the notes about `--coral` being #e8734a. */
const HEADLINE_CORAL = "text-[#ef7c58]";

/**
 * Social badge geometry, in em of the headline font-size.
 *
 * Both badges are the same object in Figma: a 50x50 white tile, `rounded-[7px]`,
 * 1px black border, with a two-stop shade over it and a soft double shadow. Only
 * their rotation and their glyph differ — Instagram -11.04deg, LinkedIn +18.26deg.
 */
const BADGE = {
  /**
   * The tile itself, before rotation — the single number that sets the size.
   * 1em matches the headline font size. Everything else below is a multiple of
   * this, so changing it rescales the pair and its slot together.
   */
  tile: 1,
  /**
   * Rotated bounding box of a square tile = side * (|cos| + |sin|), so the
   * tiles occupy more room than `tile` and the two differ because their angles
   * do. The slot spans both half-boxes plus the 0.692 centre-to-centre gap.
   */
  slot: 1.91,
  /**
   * The slot while the pair is still stacked. Both badges sit on the slot's
   * centre until the fan, so this only has to hold the WIDER of the two boxes —
   * LinkedIn's, which fills it exactly with no slack. The slot then widens to
   * `slot` in step with the fan, so the room the pair needs is made in real
   * time by pushing the words apart rather than being reserved up front.
   */
  slotCollapsed: 1.263,
  /**
   * Where each tile ends up, measured from the slot's CENTRE as a share of one
   * tile's width. Centre-relative rather than left-relative on purpose: the
   * slot's width is animating underneath, so anything anchored to its left edge
   * would drift as it grows. Anchored to the centre, 0 is the stacked position
   * for both and these are simply the fan's destinations.
   * Not symmetric, because the two rotated boxes are not the same size.
   */
  instagramRest: "-36.85%",
  linkedinRest: "32.35%",
  /** each badge's resting angle; the fan starts from flat by cancelling it */
  instagramTilt: -11.04,
  linkedinTilt: 18.26,
  /**
   * instagram.svg and Linkedin-svg.svg carry their own tile, border, shadow AND
   * rotation baked into the artwork, on oversized canvases sized for shadow bleed.
   * So they render at their respective imgScales relative to the tile and are
   * placed by the tile's centre within that canvas, not by the image's own centre.
   */
  instagramImgScale: 1.9437,
  instagramTileCentreX: "49.59%",
  instagramTileCentreY: "34.63%",
  linkedinImgScale: 1.8528,
  linkedinTileCentreX: "49.70%",
  linkedinTileCentreY: "35.13%",
} as const;

/**
 * On-load onset table, in seconds.
 *
 * The spec quotes absolute times from page load, where the curtain begins its
 * lift at 0.967s. We run a Lottie preloader of our own instead of the spec's
 * signature draw, so the hero's clock is re-based to the curtain start: every
 * value below is `specTime - 0.967`, and t=0 is the `peaque:reveal` event that
 * the loader fires as the curtain starts moving.
 *
 * The cadence is hand-tuned, not a uniform stagger (gaps run 0.07 - 0.24s), so
 * these are absolute positions on the timeline rather than a `stagger` value.
 */
const AT = {
  // §4c — headline word cascade
  retention: 0.533, //   1.50s
  driven: 0.753, //      1.72s
  motion: 0.993, //      1.96s
  // Pulled onto `motion` from the spec's own 2.03s: the pill and the word it
  // belongs to now start together rather than the pill trailing by 0.07s.
  arrowPill: 0.993, //   1.96s
  cursorIn: 1.133, //    2.10s
  amp: 1.243, //         2.21s
  design: 1.353, //      2.32s
  for: 1.503, //         2.47s
  results: 1.593, //     2.56s
  linkedin: 1.793, //    2.76s
  oriented: 1.933, //    2.90s
  founders: 2.023, //    2.99s
  // §5 — the "Figma" beat
  designSwap: 2.053, //  3.02s
  instagram: 2.403, //   3.37s
  // §6 — hand-drawn accents
  tagLeft: 2.463, //     3.43s
  underline: 2.603, //   3.57s
  arrowLeft: 2.713, //   3.68s
  noteRight: 3.383, //   4.35s
  squiggle: 3.483, //    4.45s
} as const;

// §4b/§9 — entrance distances are quoted at the reference's ~62px headline type
// size and must scale with our type scale rather than being pinned to px.
const WORD_RISE_EM = 24 / 62;
// §4d — the block is centre-anchored, so it drifts up as lines are added.
const BLOCK_DRIFT_EM = 126 / 62;
// §5a — the cursor enters 117px below where it lands on "Design".
const CURSOR_ENTRY_RISE_EM = 117 / 62;
// The block has finished re-centring once the last line has settled.
const DRIFT_END = AT.founders + 0.5;

/** How long the pair takes to fan apart once it starts. */
const BADGE_FAN_DURATION = 0.18;
/**
 * LinkedIn's entrance rise. Matched to the headline words' own 0.5s tween so it
 * arrives the same way the text does, rather than snapping in.
 */
const BADGE_RISE_DURATION = 0.5;
/** The rise distance, as a share of the tile — the words' 24/62em on a 1em tile. */
const BADGE_RISE_FROM = `${(WORD_RISE_EM / BADGE.tile) * 100}%`;

/**
 * LinkedIn's rotation has three beats, which a single from/to cannot express:
 * it arrives tilted, straightens as it lands, holds there while it waits alone,
 * then tilts again on the fan. So it is keyframed across one span with `times`
 * marking each beat.
 *
 * The values are NEGATED tilts because the artwork carries its own +18.26deg:
 * the element sits at -tilt to read straight, and at 0 to read tilted. Folding
 * the cancellation in here is also what frees the wrapper in the markup of a CSS
 * `rotate`, so it can safely become a motion element for the rise — Framer
 * claims `rotate` out of `style`, and the two cannot share an element.
 *
 * Declared here, below `AT` and `WORD_RISE_EM`, because it reads both.
 */
const BADGE_ROTATE_DURATION = AT.instagram + BADGE_FAN_DURATION - AT.linkedin;
const BADGE_ROTATE_KEYFRAMES = [0, -BADGE.linkedinTilt, -BADGE.linkedinTilt, 0];
const BADGE_ROTATE_TIMES = [
  0,
  BADGE_RISE_DURATION / BADGE_ROTATE_DURATION,
  (AT.instagram - AT.linkedin) / BADGE_ROTATE_DURATION,
  1,
];

/**
 * The "Abhay" cursor's journey, on the same reveal-relative clock as `AT`.
 *
 * This deliberately supersedes §5a's ending. The spec has the cursor retreat
 * ~45px and freeze the moment it clicks; here it carries on to the weight
 * slider that the click just revealed, drags it up from the bottom of its
 * range, parks, and only *then* lets the arrow swing round to its resting
 * angle. Everything up to and including the click at `AT.designSwap` is
 * unchanged from the spec.
 *
 * Consequence worth knowing: the sequence now settles around 6.1s rather than
 * the spec's 5.6s, so §10's "completely static from 5.6s" no longer holds.
 */
const CURSOR = {
  /** beat after the click before it heads for the slider */
  toSliderGap: 0.1,
  toSliderDur: 0.45,
  /** presses the handle */
  grabDur: 0.09,
  /** drags it up; the weight rises with the arrow tip */
  dragDur: 0.7,
  releaseDur: 0.14,
  /** beat after releasing before it leaves for its parked spot */
  parkGap: 0.07,
  parkDur: 0.8,
  /** only once parked does the arrow sweep to its default angle */
  arrowSettleMs: 700,
} as const;

// Point on a stadium / rounded-pill shape outline of half-width `a` and half-height `b`
// at direction `angle` from center, offset by an exact uniform distance `gap`.
function stadiumBoundaryPoint(
  angle: number,
  a: number,
  b: number,
  gap: number = 10,
) {
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
  const [hoveredBadge, setHoveredBadge] = useState<
    "instagram" | "linkedin" | null
  >(null);
  const [ctaHovered, setCtaHovered] = useState(false);
  const DESIGN_WEIGHT_MIN = 200;
  const DESIGN_WEIGHT_MAX = 750;
  // Where the cursor leaves the slider, and therefore the resting weight.
  const DESIGN_WEIGHT_DEFAULT = 400;
  const [designWeight, setDesignWeight] = useState(DESIGN_WEIGHT_DEFAULT);
  const designTrackRef = useRef<HTMLSpanElement>(null);
  const abhayRef = useRef<HTMLSpanElement>(null);
  const designWordRef = useRef<HTMLSpanElement>(null);
  const [isDesignClicked, setIsDesignClicked] = useState(false);
  const ABHAY_ARROW_GAP = 20;
  const ABHAY_REACT_RADIUS = 160;
  const DEFAULT_ABHAY_ANGLE = -2.7;
  const [abhayAngle, setAbhayAngle] = useState(DEFAULT_ABHAY_ANGLE);
  const [abhayHalfSize, setAbhayHalfSize] = useState({ w: 42, h: 19 });
  const [isAbhayTracking, setIsAbhayTracking] = useState(false);
  // Below lg the desktop-only intro never runs, so "Design" must render its
  // final state (real heading font) instead of the pre-"click" hand font.
  const [isDesktopView, setIsDesktopView] = useState<boolean | null>(null);
  // §9 — under reduced motion nothing animates, so the "click" that would
  // normally select "Design" never happens; the rest state has to be rendered.
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setIsDesktopView(desktopMq.matches);
      setPrefersReducedMotion(reducedMq.matches);
    };
    update();
    desktopMq.addEventListener("change", update);
    reducedMq.addEventListener("change", update);
    return () => {
      desktopMq.removeEventListener("change", update);
      reducedMq.removeEventListener("change", update);
    };
  }, []);

  const designSelected = isDesignClicked || prefersReducedMotion;
  // Shared by the visible word and the ghost that sizes its box, so the box
  // follows the family swap but not the weight.
  const designFontFamily =
    designSelected || isDesktopView === false
      ? "inherit"
      : "'Ink Free', var(--font-hand), var(--font-kalam), cursive";

  // Social badge choreography. LinkedIn snaps in alone, untilted, at the centre
  // of the pair's slot — a single card. At AT.instagram the two fan apart from
  // that shared spot: LinkedIn slides right and tilts one way while Instagram
  // emerges from behind it (it sits a layer lower) sliding left and tilting the
  // other. Per-property transitions give LinkedIn its two separate beats
  // without needing a second piece of state to track the stage.
  const badgeFan = prefersReducedMotion
    ? { duration: 0 }
    : {
        duration: BADGE_FAN_DURATION,
        delay: AT.instagram,
        ease: "easeOut" as const,
      };
  // LinkedIn rises like a headline word rather than snapping in.
  const badgeRise = prefersReducedMotion
    ? { duration: 0 }
    : {
        duration: BADGE_RISE_DURATION,
        delay: AT.linkedin,
        ease: "easeOut" as const,
      };
  // One tween spanning rise -> straighten -> hold -> tilt; see the keyframes.
  const badgeLinkedinRotate = prefersReducedMotion
    ? { duration: 0 }
    : {
        duration: BADGE_ROTATE_DURATION,
        delay: AT.linkedin,
        times: BADGE_ROTATE_TIMES,
        ease: "easeOut" as const,
      };
  // The hover lift must never inherit an entrance delay.
  const badgeHover = { duration: 0.3, delay: 0, ease: "easeOut" as const };

  const ctaArrowRef = useRef<HTMLAnchorElement>(null);
  // Line 2 ("Motion (→) & Design") and the group holding just "Motion" and its
  // arrow. Both are needed to work out how far the line has to start displaced
  // for that group alone to read as centred — see `motionLeadShift`.
  const line2Ref = useRef<HTMLSpanElement>(null);
  const motionGroupRef = useRef<HTMLSpanElement>(null);
  const underlineRef = useRef<SVGRectElement>(null);
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
        // Smooth ease-out cubic easing
        const easeProgress = 1 - Math.pow(1 - progress, 3);

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
    ABHAY_ARROW_GAP,
  );
  const abhayArrowX = abhayBoundary.x;
  const abhayArrowY = abhayBoundary.y;

  /**
   * How far line 2 has to sit to the right for "Motion" and its arrow to read
   * as centred on their own, before "& Design" exist to balance them.
   *
   * The line is centre-aligned, so its content [L, R] straddles the centre C.
   * For the lead group alone to straddle C instead, everything shifts by
   * s = (R - groupRight) / 2 — half the width of what follows it. Shifting the
   * whole line rather than the group alone is what makes this read as the line
   * re-centring: "Motion" slides left while "& Design" arrive from the right,
   * instead of "Motion" sliding out from underneath them.
   *
   * Measured lazily, never at mount: the widths are only meaningful once the
   * headline's fonts have loaded, which the loader gates the reveal on.
   */
  const motionLeadShift = useCallback(() => {
    const group = motionGroupRef.current;
    const design = designWordRef.current;
    if (!group || !design) return 0;
    return (
      (design.getBoundingClientRect().right -
        group.getBoundingClientRect().right) /
      2
    );
  }, []);

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
          // `isSmall` exists purely so at least one query always matches —
          // gsap.matchMedia skips the callback entirely otherwise.
          isSmall: "(max-width: 1023px)",
          isDesktop: "(min-width: 1024px)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { isDesktop, reduced } = context.conditions as {
            isSmall: boolean;
            isDesktop: boolean;
            reduced: boolean;
          };

          const headEl = scope.current?.querySelector<HTMLElement>("h1");
          const wordEls = gsap.utils.toArray<HTMLElement>("[data-word]");
          const introFadeEls =
            gsap.utils.toArray<HTMLElement>("[data-intro-fade]");
          const wordEl = (name: string) =>
            scope.current?.querySelector<HTMLElement>(`[data-word="${name}"]`);

          const strokePaths = [
            socialsArrowPathRef.current,
            socialsArrowHeadRef.current,
            asideScribblePathRef.current,
          ];

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

          // The hand-placed annotations sit at a deliberate angle (`-rotate-9`
          // on the left tag's container, `-rotate-2` on its inline stand-in).
          // Tailwind v4 emits those as the standalone `rotate` property, which
          // composes with the `transform` GSAP writes instead of being
          // overwritten by it — so a `rotation` of exactly the negation of the
          // CSS tilt renders the element visually straight, and easing that to
          // 0 lets it settle into the angle the class already specifies.
          // Reading the value back off the DOM keeps the markup the single
          // source of truth for the angle; retype the class and this follows.
          const cssTiltOf = (el: HTMLElement | null) => {
            for (
              let node = el;
              node && node !== scope.current;
              node = node.parentElement
            ) {
              const rotate = getComputedStyle(node).rotate;
              if (rotate && rotate !== "none") return parseFloat(rotate) || 0;
            }
            return 0;
          };
          // Held back until the fade has landed, so the tag is unmistakably
          // straight before it leans over rather than doing both at once.
          const tiltSettleAt = AT.tagLeft + 0.19;

          // gentle parallax out as you scroll away
          gsap.to("[data-hero-inner]", {
            yPercent: isDesktop ? -12 : -6,
            autoAlpha: 0.25,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });

          // §9 — `prefers-reduced-motion`: render the rest state immediately and
          // run no sequence at all.
          if (reduced) {
            gsap.set(wordEls, { autoAlpha: 1, y: 0 });
            // rotation 0 leaves the CSS tilt showing on its own — the rest state
            gsap.set(introFadeEls, { autoAlpha: 1, y: 0, rotation: 0 });
            if (headEl) gsap.set(headEl, { y: 0 });
            if (ctaArrowRef.current) {
              gsap.set(ctaArrowRef.current, { autoAlpha: 1, scale: 1 });
            }
            if (underlineRef.current) {
              gsap.set(underlineRef.current, {
                attr: { width: 290 },
                autoAlpha: 1,
              });
            }
            gsap.set([socialsTagRef.current, asideTagRef.current], {
              autoAlpha: 1,
              y: 0,
              rotation: 0,
            });
            strokePaths.forEach((p) => {
              if (p) {
                gsap.set(p, {
                  strokeDasharray: "none",
                  strokeDashoffset: 0,
                  autoAlpha: 1,
                });
              }
            });
            introRef.current = null;
            return;
          }

          // Distances scale with the type scale so the timeline stays identical
          // at every breakpoint while the travel stays proportional (§9).
          const headFont = headEl
            ? parseFloat(getComputedStyle(headEl).fontSize) || 62
            : 62;
          const wordRise = headFont * WORD_RISE_EM;
          const drift = headFont * BLOCK_DRIFT_EM;

          // Initial hidden state setup
          gsap.set(wordEls, { autoAlpha: 0, y: wordRise });
          // The drift moves the entire headline subtree, so promote it for the
          // duration and drop the hint again once it lands (§9).
          if (headEl) gsap.set(headEl, { y: drift, willChange: "transform" });
          if (ctaArrowRef.current) {
            gsap.set(ctaArrowRef.current, { autoAlpha: 0, y: wordRise });
          }
          if (underlineRef.current) {
            gsap.set(underlineRef.current, {
              attr: { width: 0 },
              autoAlpha: 1,
            });
          }
          if (socialsTagRef.current) {
            gsap.set(socialsTagRef.current, {
              autoAlpha: 0,
              y: 10,
              rotation: -cssTiltOf(socialsTagRef.current),
            });
          }
          if (asideTagRef.current) {
            gsap.set(asideTagRef.current, { autoAlpha: 0, y: 8 });
          }
          gsap.set(introFadeEls, {
            autoAlpha: 0,
            y: 10,
            rotation: (_i: number, el: HTMLElement) => -cssTiltOf(el),
          });
          strokePaths.forEach(preparePath);

          // Paused until the loader's curtain starts lifting. `power3.out` is
          // the spec's word ease — cubic-bezier(0.165, 0.84, 0.44, 1).
          const tl = gsap.timeline({
            paused: true,
            defaults: { ease: "power3.out" },
          });

          /* ---------- §4 : headline word cascade ---------- */
          const word = (name: string, at: number) => {
            const el = wordEl(name);
            if (el) tl.to(el, { autoAlpha: 1, y: 0, duration: 0.5 }, at);
          };

          word("retention", AT.retention);
          word("driven", AT.driven);
          word("motion", AT.motion);
          word("amp", AT.amp);
          word("design", AT.design);
          word("for", AT.for);
          word("results", AT.results);
          word("oriented", AT.oriented);
          // the orange period lands with "Founders", not after it
          word("founders", AT.founders);
          word("period", AT.founders);

          // §4d — the block is vertically centred, so it rides upward as lines
          // are added. Our four lines are always in the DOM at full height
          // (words are hidden with autoAlpha, never `display:none`), so the
          // drift has to be driven rather than falling out of the centring.
          //
          // This is ONE continuous glide spanning the whole cascade, not a tween
          // per line. Stepping it — even with the steps butted up against each
          // other — makes every step ease to a dead stop before the next picks
          // up, and the block visibly lurches between four resting positions.
          // A single eased move reads the way the reference does: the block is
          // never not moving between the first word and the last one settling.
          if (headEl) {
            tl.to(
              headEl,
              {
                y: 0,
                duration: DRIFT_END - AT.retention,
                ease: "power1.inOut",
                onComplete: () => gsap.set(headEl, { willChange: "auto" }),
              },
              AT.retention,
            );
          }

          // Orange arrow pill — rises and fades exactly like a headline word
          // (same distance, same 0.5s, same default ease) rather than scaling
          // up, so it arrives at full size alongside "Motion".
          if (ctaArrowRef.current) {
            tl.to(
              ctaArrowRef.current,
              { autoAlpha: 1, y: 0, duration: 0.5 },
              AT.arrowPill,
            );
          }

          // "Motion" and its arrow land centred on their own, then the line
          // slides back into true as the rest of it arrives — the word acting
          // out what it says. The displacement is applied at reveal (it has to
          // be measured, so it cannot be baked in here); this only walks it
          // back. Timed to start with "&" and finish exactly as "Design"
          // settles, so the travel lasts precisely as long as the remaining
          // text takes to render.
          if (line2Ref.current) {
            tl.to(
              line2Ref.current,
              {
                x: 0,
                duration: AT.design + 0.5 - AT.amp,
                ease: "power2.inOut",
              },
              AT.amp,
            );
          }

          /* ---------- §6 : hand-drawn accents ---------- */

          // underline under "Founders" — draws left to right
          if (underlineRef.current) {
            tl.to(
              underlineRef.current,
              { attr: { width: 290 }, duration: 0.33, ease: "power1.inOut" },
              AT.underline,
            );
          }

          // the lg-only floating tag; below lg the inline stand-in takes its beat
          tl.to(
            introFadeEls,
            { autoAlpha: 1, y: 0, duration: 0.19, ease: "power2.out" },
            AT.tagLeft,
          ).to(
            introFadeEls,
            { rotation: 0, duration: 0.38, ease: "power2.out" },
            tiltSettleAt,
          );

          if (isDesktop) {
            if (socialsTagRef.current) {
              // lands flat...
              tl.to(
                socialsTagRef.current,
                { autoAlpha: 1, y: 0, duration: 0.19, ease: "power2.out" },
                AT.tagLeft,
              )
                // ...then leans over into its hand-placed angle
                .to(
                  socialsTagRef.current,
                  { rotation: 0, duration: 0.38, ease: "power2.out" },
                  tiltSettleAt,
                );
            }
            // 0.87s of draw, split so the arrowhead only lands at the very end
            if (socialsArrowPathRef.current) {
              tl.to(
                socialsArrowPathRef.current,
                { strokeDashoffset: 0, duration: 0.72, ease: "power1.inOut" },
                AT.arrowLeft,
              );
            }
            if (socialsArrowHeadRef.current) {
              tl.to(
                socialsArrowHeadRef.current,
                { strokeDashoffset: 0, duration: 0.15, ease: "power1.out" },
                AT.arrowLeft + 0.72,
              );
            }
            if (asideTagRef.current) {
              tl.to(
                asideTagRef.current,
                { autoAlpha: 1, y: 0, duration: 0.17, ease: "power2.out" },
                AT.noteRight,
              );
            }
            // longest tween in the piece — deliberately unhurried
            if (asideScribblePathRef.current) {
              tl.to(
                asideScribblePathRef.current,
                { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" },
                AT.squiggle,
              );
            }
          }

          introRef.current = tl;
          if (revealedRef.current) tl.play();

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

    // Displace line 2 before the timeline starts, so "Motion" and its arrow
    // arrive centred. This has to happen here rather than when the timeline is
    // built: the shift is measured from the rendered line, and at build time
    // the headline's fonts may not have loaded yet. Skipped under reduced
    // motion, where the timeline never runs to walk it back.
    if (
      line2Ref.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      gsap.set(line2Ref.current, { x: motionLeadShift() });
    }

    introRef.current?.play();

    // Below lg the "Abhay" tag is hidden (see its `hidden lg:block` className),
    // so skip measuring/animating it — the rects would be meaningless (0-sized).
    if (!window.matchMedia("(min-width: 1024px)").matches) return;

    const abhayEl = abhayRef.current;
    const designEl = designWordRef.current;
    const trackEl = designTrackRef.current;
    if (!abhayEl || !designEl || !trackEl) return;

    // §9 — reduced motion gets the rest state, no journey. `designSelected`
    // covers the selection frame; the tag just needs to be parked and visible.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(abhayEl, { x: 0, y: 0, opacity: 1 });
      return;
    }

    // Measure exact bounding rectangles & sizes in screen space. The slider is
    // only faded out at this point, not unmounted, so it already has a real box.
    const abhayRect = abhayEl.getBoundingClientRect();
    const designRect = designEl.getBoundingClientRect();
    const trackRect = trackEl.getBoundingClientRect();
    const arrowEl = abhayEl.querySelector<HTMLElement>("[data-abhay-arrow]");
    const arrowRect = arrowEl?.getBoundingClientRect();

    const abhayCenterX = abhayRect.left + abhayRect.width / 2;
    const abhayCenterY = abhayRect.top + abhayRect.height / 2;

    // Arrow tip offset from arrow box center in screen space:
    // In 44x40 viewBox, arrow path tip is at X=40 with strokeWidth=4 round join extending to X=42.5, center at X=22.
    // So tip offset from arrow center is (18.5 / 44) * width.
    const arrowWidth = arrowRect ? arrowRect.width : 32;
    const arrowTipScreenLen = (18.5 / 44) * arrowWidth;

    // Calculate exact arrow boundary offset from tag center in screen space when pointing left (Math.PI)
    const arrowBoundaryScreen = stadiumBoundaryPoint(
      Math.PI,
      abhayRect.width / 2,
      abhayRect.height / 2,
      (ABHAY_ARROW_GAP * abhayRect.height) / 38,
    );

    // Screen coordinates of arrow tip when abhayEl is at (0, 0)
    const screenTipX = abhayCenterX + arrowBoundaryScreen.x - arrowTipScreenLen;
    const screenTipY = abhayCenterY + arrowBoundaryScreen.y;

    // 1. Point the arrow tip EXACTLY at the word "Design" — where it clicks.
    const designTargetX = designRect.right - screenTipX;
    const designTargetY = designRect.top + designRect.height / 2 - screenTipY;

    // 2. Point the arrow tip EXACTLY at the slider handle, parked at the bottom
    //    of its track (weight = DESIGN_WEIGHT_MIN), then at the handle's resting
    //    height (weight = DESIGN_WEIGHT_DEFAULT) — the top of the drag.
    const sliderBottomX = trackRect.left + trackRect.width / 2 - screenTipX;
    const sliderBottomY = trackRect.bottom - screenTipY;

    const defaultRatio =
      (DESIGN_WEIGHT_DEFAULT - DESIGN_WEIGHT_MIN) /
      (DESIGN_WEIGHT_MAX - DESIGN_WEIGHT_MIN);
    const sliderDefaultY =
      trackRect.bottom - defaultRatio * trackRect.height - screenTipY;

    // The weight is read back off the drag tween's own y rather than from a
    // screen coordinate. Both endpoints above are *relative* offsets between
    // two elements that sit inside the h1, so they survive the headline's
    // re-centring drift; an absolute screen comparison would not, since the
    // rects here are measured while the block is still pushed down by it.
    const dragSpan = sliderDefaultY - sliderBottomY;
    // Each push re-renders the whole hero, and the drag overlaps the left
    // arrow's stroke draw — so skip the frames where the rounded weight has not
    // actually moved. The ease is slowest at both ends of the drag, which is
    // exactly where those duplicate frames bunch up.
    let lastWeight = -1;
    const pushWeightAtCurrentY = () => {
      const y = gsap.getProperty(abhayEl, "y") as number;
      const t = dragSpan === 0 ? 1 : (y - sliderBottomY) / dragSpan;
      const clamped = Math.min(1, Math.max(0, t));
      const weight = Math.round(
        DESIGN_WEIGHT_MIN +
          clamped * (DESIGN_WEIGHT_DEFAULT - DESIGN_WEIGHT_MIN),
      );
      if (weight === lastWeight) return;
      lastWeight = weight;
      setDesignWeight(weight);
    };

    // §5a — enters by crossing the right edge of the viewport, well below where
    // it lands, then glides up and to the left, strongly decelerating: nearly
    // all of the travel happens in the first 0.35s of the 0.85s tween.
    //
    // It parks fully outside the right edge and is left at full opacity the
    // whole time — the section clips it, so it wipes into view as it travels.
    // Fading or switching it on at the edge instead makes it "appear" at a
    // fixed spot, which is precisely the popping the rest of this fixes.
    const headFont = parseFloat(getComputedStyle(designEl).fontSize) || 62;
    const startX = window.innerWidth - abhayRect.left + 8;
    const startY = designTargetY + headFont * CURSOR_ENTRY_RISE_EM;

    const tl = gsap.timeline();

    // The arrow points straight left (◄) for the entire journey — it is the
    // thing doing the clicking and dragging, so it stays aimed at whatever it
    // is working on, and only swings round once the tag has parked.
    // `abhayAngleRef` must move with it or that final sweep starts from a stale
    // angle and takes the long way round. Both this and the weight reset happen
    // up front, while the tag is still off-screen and "Design" is still hidden,
    // so neither React render lands on a frame that is animating.
    tl.set(abhayEl, { x: startX, y: startY, opacity: 1, scale: 1 }, 0)
      .call(
        () => {
          setAbhayAngle(Math.PI);
          abhayAngleRef.current = Math.PI;
          // park the handle at the foot of its track so the drag has somewhere
          // to travel from
          setDesignWeight(DESIGN_WEIGHT_MIN);
        },
        undefined,
        0,
      )
      // 1. glides in and lands on "Design"
      .to(
        abhayEl,
        {
          x: designTargetX,
          y: designTargetY,
          duration: 0.85,
          ease: "power3.out",
        },
        AT.cursorIn,
      )
      // 2. §5b — the click. Font swap, selection frame and slider all land on
      //    the same frame, with no transition on any of them.
      .call(() => setIsDesignClicked(true), undefined, AT.designSwap)
      // 3. crosses to the slider handle the click just revealed
      .to(
        abhayEl,
        {
          x: sliderBottomX,
          y: sliderBottomY,
          duration: CURSOR.toSliderDur,
          ease: "power2.inOut",
        },
        AT.designSwap + CURSOR.toSliderGap,
      )
      // 4. presses it
      .to(abhayEl, {
        scale: 0.9,
        duration: CURSOR.grabDur,
        ease: "power1.in",
      })
      // 5. drags it up, "Design" thickening as the arrow tip rises
      .to(abhayEl, {
        y: sliderDefaultY,
        duration: CURSOR.dragDur,
        ease: "power1.inOut",
        onUpdate: pushWeightAtCurrentY,
      })
      // 6. releases
      .to(abhayEl, {
        scale: 1,
        duration: CURSOR.releaseDur,
        ease: "back.out(2)",
      })
      // 7. leaves for its parked spot — and only once it arrives does the arrow
      //    sweep round to its resting angle, handing over to cursor tracking
      .to(
        abhayEl,
        {
          x: 0,
          y: 0,
          duration: CURSOR.parkDur,
          ease: "power3.out",
          onComplete: () => startReturnToDefaultAnimation(CURSOR.arrowSettleMs),
        },
        `+=${CURSOR.parkGap}`,
      );

    return () => {
      tl.kill();
    };
  }, [revealed, startReturnToDefaultAnimation, motionLeadShift]);

  /**
   * Lands on the hero's bottom edge, which is the top of whatever section
   * follows — measured rather than assumed, so it does not depend on the hero
   * being exactly one viewport tall or on the next section's markup.
   */
  const scrollToNextSection = () => {
    if (!scope.current) return;
    window.scrollTo({
      top: scope.current.getBoundingClientRect().bottom + window.scrollY,
      behavior: "smooth",
    });
  };

  const words = (tokens: Token[]) =>
    tokens.map((t, i) => (
      <span
        key={i}
        className="inline-block overflow-hidden align-top pb-[0.08em] -mb-[0.08em]"
      >
        <span
          data-word={t.name}
          className={`inline-block will-change-transform ${t.className ?? ""}`}
        >
          {t.text}
          {t.tight ? null : " "}
        </span>
      </span>
    ));

  return (
    <section
      ref={scope}
      id="top"
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-5"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[url('/bg.svg')] bg-cover bg-center"
        />
        {/* Slowly rotating 3D trefoil knot, lower-left — real geometry rather
            than the flat /public/3d.svg render, so it can actually turn on its
            axis instead of squashing edge-on. Sits above the dot grid but
            below the headline; softened so it reads as ambient depth. */}
        {/* Size and position are derived from the Figma "Main" frame rather
            than eyeballed. Node 1:19093 places a 431.012x346.207 rect, rotated
            -8.47284deg, at (-145, 460.505) in 1440x810. Inside it sits the
            201x200 render whose ink occupies 147x158px, so the knot actually
            draws at 315.2x273.5px with its centre — after the rotation — at
            (78.81, 665.68). That is the 5.473% / 17.817% below.

            The box is anchored by its CENTRE, not a corner. The knot renders
            centred in the canvas with camera margin around it, so centre
            anchoring is what makes size and position independent: change the
            clamp and it grows in place rather than crawling toward a corner.
            34vw puts the rendered ink at ~316x303px against the design's
            315.2x273.5 — the width is essentially exact.

            The cap is 34vw measured at 6000px, the same viewport the headline
            and the block's max-width cap at, so all three stop growing together
            and the knot holds its 34% share of the width the whole way up. It
            was 50rem, which 34vw reached at 2353px — from there the knot was
            frozen while everything around it kept scaling, down to 18% of the
            viewport by 4400px and 13% by 6000px.

            The one thing NOT reproduced is that the design scales that square
            201x200 render into a 431x346 box, stretching it 1.2388x
            horizontally. Matching the width therefore leaves this ~11% taller
            than the design. Reproducing the squash would mean fighting the
            camera's aspect to distort a knot on purpose, so the geometry is
            left true; that difference is the whole of the height gap.

            On the two properties that look like mismatches against Figma's
            inspector: its `filter: blur(0px)` is deliberately NOT copied. That
            means no *additional* CSS blur, but the design's edges still measure
            a ~14px transition because its source is a 201px render upscaled
            ~2.1x. This is real geometry and therefore pixel-sharp, so it needs
            ~2.5px of blur to land on that same 14px edge (measured: 13px).
            Setting 0 here would read visibly crisper than the design, not
            closer to it. Opacity 0.15 is likewise measured, not the raw 0.13
            fill-opacity — it matches the design's peak green delta of ~13. */}
        <TorusKnot3D className="pointer-events-none absolute bottom-[30.817%] left-[5.473%] hidden h-[clamp(21rem,34vw,127.5rem)] w-[clamp(21rem,34vw,127.5rem)] -translate-x-1/2 translate-y-1/2 -rotate-[8.473deg] opacity-[0.15] blur-[2.5px] sm:block" />

        <DotGridZoom
          gap={30}
          baseSize={3}
          maxSize={18}
          proximity={130}
          color="#D8D8D8"
        />
      </div>

      {/* The max-width cap has to reach the same viewport width as the
          headline's font cap, or the two stop moving together. 68vw hit the old
          187rem (2992px) at 4400px, while the type carries on to 16.875rem at
          6000px — across that stretch the block was frozen while the words kept
          growing, so the room fell from 15.11em to 11.08em and line 3 wrapped.
          255rem is 68vw at 6000px, so both cap together and the ratio holds
          from there on. Below 4400px the cap never bound, so nothing there
          changes. Keep these two in step if either is retuned. */}
      <div
        data-hero-inner
        className="relative mx-auto flex w-full max-w-7xl min-[1440px]:max-w-[clamp(90rem,68vw,255rem)] flex-col items-center text-center px-0 sm:px-5 2xl:px-0"
      >
        {/* "for socials, apps..." tag + curved arrow, pointing into the headline */}
        <div className="absolute top-3 hidden -rotate-9 min-[1024px]:block origin-top-left min-[1024px]:left-[calc(50%-27rem)] min-[1024px]:scale-90 min-[1280px]:left-[calc(50%-33rem)] min-[1280px]:scale-100 min-[1440px]:left-[calc(50%-38rem)] min-[1440px]:scale-110 min-[1600px]:left-[calc(50%-45rem)] min-[1600px]:scale-125 min-[1920px]:left-[calc(50%-48rem)] min-[1920px]:scale-135 min-[2120px]:left-[calc(50%-55rem)] min-[2120px]:scale-140 min-[2400px]:left-[calc(50%-60rem)] min-[2400px]:scale-170 min-[2800px]:left-[calc(50%-70rem)] min-[2800px]:scale-195 min-[3300px]:left-[calc(50%-82rem)] min-[3300px]:scale-230 min-[3840px]:left-[calc(50%-95rem)] min-[3840px]:scale-260 min-[4400px]:left-[calc(50%-108rem)] min-[4400px]:scale-295 min-[5120px]:left-[calc(50%-126rem)] min-[5120px]:scale-345 min-[6000px]:left-[calc(50%-147rem)] min-[6000px]:scale-400">
          <span
            ref={socialsTagRef}
            className="inline-block rounded-full bg-[#F5F5F5] px-4 py-1.5 text-xs text-[#4F6156]"
          >
            For Socials, Apps, Websites &amp; Products
          </span>

          <svg
            viewBox="0 0 70 48"
            fill="none"
            aria-hidden
            className="ml-24 mt-1 w-20 text-ink"
          >
            <path
              ref={socialsArrowPathRef}
              d="M0.484375 0.125488C3.98438 13.6255 38.4844 39.6255 69.9844 39.6255"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <g transform="translate(56.624, 28.868)">
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

        {/* hand-written aside, top right.

            Below 2800 is derived from the 2800 step rather than eyeballed:
            solving that pair against the headline's font size gives
            right = 8.254 x font and top = -0.635 x font, and every width under
            it is those two constants re-evaluated at its own clamp()ed font
            size. 2800 and up are left exactly as set. The font is flat at 56px
            below 1244px (the clamp's floor), which is why 1024 and 1280 barely
            differ — and why 1280 needs no `top` of its own. */}
        <div
          ref={asideTagRef}
          className="absolute hidden text-right min-[1024px]:block min-[1024px]:right-[calc(50%-29rem)] min-[1024px]:-top-0 min-[1280px]:right-[calc(50%-30rem)] min-[1440px]:right-[calc(50%-33rem)] min-[1440px]:-top-10 min-[1600px]:right-[calc(50%-37rem)] min-[1600px]:-top-11 min-[1920px]:right-[calc(50%-42rem)] min-[1920px]:-top-14 min-[2120px]:right-[calc(50%-49rem)] min-[2120px]:-top-15 min-[2400px]:right-[calc(50%-56rem)] min-[2400px]:-top-17 min-[2800px]:right-[calc(50%-65rem)] min-[2800px]:-top-20 min-[3300px]:right-[calc(50%-80rem)] min-[3300px]:-top-27 min-[3840px]:right-[calc(50%-95rem)] min-[3840px]:-top-30 min-[4400px]:right-[calc(50%-98rem)] min-[4400px]:-top-38 min-[5120px]:right-[calc(50%-100rem)] min-[5120px]:-top-40 min-[6000px]:right-[calc(50%-130rem)] min-[6000px]:-top-45"
        >
          <div className="rotate-10 origin-top-right min-[1024px]:scale-90 min-[1280px]:scale-100 min-[1440px]:scale-110 min-[1600px]:scale-125 min-[1920px]:scale-135 min-[2120px]:scale-140 min-[2400px]:scale-170 min-[2800px]:scale-195 min-[3300px]:scale-230 min-[3840px]:scale-260 min-[4400px]:scale-295 min-[5120px]:scale-345 min-[6000px]:scale-400 w-48 min-[1280px]:w-48 min-[1440px]:w-46 min-[1600px]:w-46 min-[1920px]:w-46 min-[2400px]:w-46 min-[2800px]:w-46 min-[3300px]:w-46 min-[3840px]:w-46 min-[4400px]:w-46">
            <p className="font-kalam text-xs sm:text-sm min-[1280px]:text-base leading-snug text-ink/90 [text-wrap:balance]">
              We give every project the love <br />
              and affection it deserves :)
            </p>
            <svg
              viewBox="0 0 113 83"
              fill="none"
              aria-hidden
              className="-ml-3 -mt-3 w-28 min-[1440px]:w-34 -rotate-10 text-ink/80"
            >
              <path
                ref={asideScribblePathRef}
                opacity="0.7"
                d="M19.6048 0.5C15.6048 0.5 -5.39516 5 2.10484 11.5C9.60484 18 108.105 33 111.605 37.5C115.105 42 44.1055 23.5 39.1055 24.5C34.1055 25.5 70.1055 33.5 75.6055 37.5C81.1055 41.5 51.1055 38 53.6055 44C56.1055 50 112.105 62 96.1055 82"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* mobile/tablet stand-in for the lg-only floating tag — keeps content parity below lg */}
        <span
          data-hero-fade
          data-intro-fade
          className="mt-16 mb-5 inline-block -rotate-2 rounded-full bg-[#F5F5F5] px-3.5 py-1.5 text-[11px] font-medium text-[#4F6156] sm:text-xs lg:hidden"
        >
          For Socials, Apps, Websites &amp; Products
        </span>

        {/* Figma "Main": 65px leading on 63.549px type, and the words that are
            not the deep green are plain black rather than `--ink`.

            The lg cap carries the size past 4400px. At 12.4rem (198.4px) the
            fluid 4.5vw stopped at a 4409px viewport, so the headline froze
            exactly where the rest of the layout keeps stepping up. 16.875rem
            (270px) is 4.5vw at 6000px, which carries it through the next two
            widths above 4400 — 5120 and 6000 — and only the cap moves, so every
            width below 4409px renders identically to before.

            Deliberately one clamp rather than `min-[5120px]:text-*` steps:
            arbitrary min-[] variants are emitted ahead of the named ones, so on
            font-size they lose to the `lg:` rule that is still matching, and the
            step would silently do nothing. Other properties here can use min-[]
            freely because nothing named competes for them. */}
        <h1 className="mt-3 font-heading font-normal leading-[1.023] tracking-normal [word-spacing:0.22em] text-black lg:mt-16 text-[clamp(1.5rem,7vw,2.5rem)] sm:text-[clamp(2.75rem,7vw,3.75rem)] md:text-[clamp(3.25rem,4.5vw,4.25rem)] lg:text-[clamp(3.5rem,4.5vw,16.875rem)]">
          <span className="block">
            {words([
              {
                text: "Retention",
                name: "retention",
                className: `font-extrabold ${HEADLINE_GREEN}`,
              },
              { text: "Driven", name: "driven", className: "font-medium" },
            ])}
          </span>

          <span ref={line2Ref} className="relative block">
            <span
              ref={motionGroupRef}
              className="group/cta relative inline-flex items-center"
            >
              <span className="inline-block transition-transform duration-700 ease-out group-has-[a:hover]/cta:-translate-x-[2.1em]">
                {words([
                  { text: "Motion", name: "motion", className: "font-normal" },
                ])}
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
                  className="pointer-events-none absolute right-0 top-0 z-0 flex h-full w-full items-center justify-end overflow-hidden rounded-full bg-[#0F2100] border border-[#022C12] pr-[0.74em] transition-[width] duration-700 ease-out group-hover/arrow:w-[3.1em]"
                >
                  <span className="mr-3 translate-x-0 whitespace-nowrap text-[0.4em] font-semibold [word-spacing:normal] text-cream opacity-0 transition-all duration-700 ease-out group-hover/arrow:translate-x-0 group-hover/arrow:opacity-100">
                    Book a call
                  </span>
                </span>

                <span className="relative z-10 inline-flex size-[0.6em] shrink-0 items-center justify-center rounded-full bg-[#EF7C58] shadow-[0_10px_24px_-6px_rgba(232,115,74,0.6)]">
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
            {/* the only word not set in Archivo — Figma has it in Inter Light */}
            {words([
              { text: "&", name: "amp", className: "font-sans font-light" },
            ])}
            <span
              data-fall-item
              className="relative mx-1 inline-block overflow-visible align-top"
            >
              {/* The box is sized by a ghost pinned to the resting weight, and
                  the real word is taken out of flow on top of it. Dragging the
                  slider then changes only how "Design" is drawn, never how much
                  room it claims — heavier weights spill over this box instead of
                  re-flowing the whole line, and the selection frame and slider
                  rail (both positioned against this box) stay put too.

                  The ghost tracks `designFontFamily` but not `designWeight`:
                  the box should still follow the one-off swap out of the script
                  face, just not the live weight drag.

                  Nothing clips here on purpose — the old `overflow-hidden` mask
                  would have cut the overspill off rather than letting it show. */}
              <span className="relative inline-block pb-[0.08em] -mb-[0.08em] align-top">
                <span
                  aria-hidden
                  className="invisible"
                  style={{
                    fontWeight: DESIGN_WEIGHT_DEFAULT,
                    fontFamily: designFontFamily,
                  }}
                >
                  Design
                </span>
                {/* The centring sits on this wrapper, which GSAP never touches,
                    for the same reason the "Abhay" tag keeps its responsive
                    scale on an inner span: when GSAP animates the word's `y` it
                    folds any standalone CSS `translate` into its own transform
                    and leaves `translate: none` behind. That resolves the -50%
                    against the word's width at that instant and freezes it as
                    pixels — so once the headline's clamp() changed the font
                    size, the word drifted left on narrow screens and right on
                    wide ones. Kept apart, the percentage stays a percentage. */}
                <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap">
                  <span
                    ref={designWordRef}
                    data-word="design"
                    className="inline-block will-change-transform transition-[font-weight] duration-300"
                    style={{
                      fontWeight: designWeight,
                      fontFamily: designFontFamily,
                    }}
                  >
                    Design
                  </span>
                </span>
              </span>

              {/* dotted selection border — snaps in on the same frame as the
                  font swap, with no crossfade (spec §5b) */}
              <span
                aria-hidden
                className={`pointer-events-none absolute -inset-1 min-[1024px]:-inset-[0.05em] border border-dashed border-ink/50 ${
                  designSelected ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* 4 corner dots marking the selection — centered exactly on the dashed box's corners */}
              {[
                "-top-1 -left-1 min-[1024px]:-top-[0.05em] min-[1024px]:-left-[0.05em] -translate-x-1/2 -translate-y-1/2",
                "-top-1 -right-1 min-[1024px]:-top-[0.05em] min-[1024px]:-right-[0.05em] translate-x-1/2 -translate-y-1/2",
                "-bottom-1 -left-1 min-[1024px]:-bottom-[0.05em] min-[1024px]:-left-[0.05em] -translate-x-1/2 translate-y-1/2",
                "-bottom-1 -right-1 min-[1024px]:-bottom-[0.05em] min-[1024px]:-right-[0.05em] translate-x-1/2 translate-y-1/2",
              ].map((pos) => (
                <span
                  key={pos}
                  aria-hidden
                  className={`pointer-events-none absolute ${pos} size-1.5 min-[1024px]:size-[0.075em] min-[1024px]:min-w-[6px] min-[1024px]:min-h-[6px] rounded-full bg-black ${
                    designSelected ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {/* interactive vertical slider — controls "Design"'s font-weight live, within a subtle range */}
              <span
                ref={designTrackRef}
                onPointerDown={(e) => {
                  if (!designSelected) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateDesignWeightFromPointer(e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!designSelected) return;
                  if (e.buttons === 1) updateDesignWeightFromPointer(e.clientY);
                }}
                // Top/bottom deliberately mirror the dashed selection box's
                // `-inset-1` / `-inset-[0.05em]` above, so the rail is exactly
                // as tall as the box it belongs to. The box itself stays wide —
                // a 1px rail is far too thin to grab, so this keeps a ~20px
                // pointer target with the line centred inside it.
                className={`absolute -right-9 min-[1024px]:left-[calc(100%+0.32em)] -top-1 min-[1024px]:-top-[0.05em] -bottom-1 min-[1024px]:-bottom-[0.05em] flex w-5 min-[1024px]:w-[0.3em] min-[1024px]:min-w-[20px] items-center justify-center ${
                  designSelected
                    ? "opacity-100 pointer-events-auto cursor-pointer"
                    : "opacity-0 pointer-events-none"
                }`}
              >
                {/* A hairline, matching the design's plain 1px rule. Held at
                    1px rather than scaled in em so it stays a line at every
                    breakpoint — the same reason the dashed box beside it uses a
                    1px border. Solid `ink/50` to match that border too; the old
                    sand-to-ink gradient was invisible at this width. */}
                <span aria-hidden className="h-full w-[3px] bg-ink/50" />
                <span
                  aria-hidden
                  // Sized down to suit the hairline rail — roughly the design's
                  // 15 x 6.667px handle rather than the old 24 x 12px, which
                  // dwarfed a 1px line.
                  className="absolute left-1/2 h-1.5 w-3.5 min-[1024px]:h-[0.105em] min-[1024px]:w-[0.236em] min-[1024px]:min-h-[7px] min-[1024px]:min-w-[15px] rounded-md min-[1024px]:rounded-[0.1em] border border-black bg-white opacity-100 shadow-sm"
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
              className="absolute top-1/2 hidden -translate-y-1/2 min-[1024px]:block opacity-0 origin-left left-[calc(100%+1rem)] min-[1280px]:left-[calc(100%+1.5rem)] min-[1440px]:left-[calc(100%+2rem)] min-[1600px]:left-[calc(100%+2.5rem)] min-[2120px]:left-[calc(100%+2.75rem)] min-[2400px]:left-[calc(100%+3.1rem)] min-[2800px]:left-[calc(100%+3.6rem)] min-[3300px]:left-[calc(100%+4.3rem)] min-[3840px]:left-[calc(100%+4.9rem)] min-[4400px]:left-[calc(100%+5.6rem)] min-[5120px]:left-[calc(100%+6.5rem)] min-[6000px]:left-[calc(100%+7.6rem)]"
            >
              {/* GSAP folds the CSS `scale` property into its own transform on the
                  wrapper above (leaving `scale: none` inline), so the responsive
                  scale steps must live on this inner span it never animates. */}
              <span className="block origin-left min-[1024px]:scale-90 min-[1280px]:scale-100 min-[1440px]:scale-110 min-[1600px]:scale-125 min-[2120px]:scale-140 min-[2400px]:scale-155 min-[2800px]:scale-180 min-[3300px]:scale-215 min-[3840px]:scale-245 min-[4400px]:scale-280 min-[5120px]:scale-325 min-[6000px]:scale-380">
                <span
                  aria-hidden
                  data-abhay-arrow
                  style={{
                    transform: `translate(-50%, -50%) translate(${abhayArrowX}px, ${abhayArrowY}px) rotate(${(abhayAngle * 180) / Math.PI}deg)`,
                  }}
                  className={`pointer-events-none absolute left-1/2 top-1/2 size-7.5 min-[1280px]:size-8 min-[1600px]:size-8.5 min-[1920px]:size-9 text-[#1e7a00] drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform ease-out ${
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

                <span className="relative flex items-center rounded-full bg-[#1e7a00] px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm font-medium text-white shadow-[0_8px_20px_-4px_rgba(30,122,0,0.4)]">
                  Abhay
                </span>
              </span>
            </span>
          </span>

          <span className="block">
            {words([
              { text: "for", name: "for", className: "font-light" },
              {
                text: "Results",
                name: "results",
                className: `font-extrabold ${HEADLINE_GREEN}`,
                // the badge slot follows immediately, so this word must not
                // also contribute a space
                tight: true,
              },
            ])}
            {/* `align-middle` lines the box's centre up with baseline + half the
                x-height, but the words either side read as centred on their
                CAPS — and for Archivo the cap centre sits 0.101em higher than
                that. Hence the lift; the old code nudged 0.1em the other way,
                which put the pair 0.2em low.
                The height stays under the 1.023 leading on purpose: the badges
                are absolutely positioned, so they can overflow it visually
                without the line box growing and forcing the lines apart. */}
            {/* The width animates rather than being reserved. While the pair is
                stacked the slot is only as wide as one badge, so there is no
                dead space flanking it; it then widens in step with the fan, and
                because the headline lines are centred that pushes "for Results"
                left and "Oriented" right in real time. This is a genuine layout
                animation — reflowing the line is the whole point of it. */}
            <motion.span
              data-fall-item
              className="relative inline-block h-[0.95em] -translate-y-[0.101em] align-middle"
              initial={{ width: `${BADGE.tile * BADGE.slotCollapsed}em` }}
              animate={
                revealed ? { width: `${BADGE.tile * BADGE.slot}em` } : {}
              }
              transition={{ width: badgeFan }}
            >
              {/* Instagram badge — left, tucked behind LinkedIn. §5c: emerges
                  from *behind* it, sliding left out of the stack and tilting as
                  it goes. `x` is a share of its own tile width, so the travel
                  scales with the headline type scale.

                  The tilt is animated 0 -> -11.04 and the inner wrapper below
                  cancels the angle baked into the artwork. It cannot go on this
                  element's `style` instead: Framer Motion claims `rotate` as one
                  of its own transform values, so a `style.rotate` here is
                  swallowed and then overridden by the animated one — which left
                  only the inner cancellation and rendered the badge flat. */}
              <motion.span
                aria-hidden
                initial={{
                  opacity: 0,
                  scale: 0.6,
                  rotate: 0,
                  x: "0%",
                }}
                animate={
                  revealed
                    ? {
                        opacity: 1,
                        scale: 1,
                        rotate: BADGE.instagramTilt,
                        x: BADGE.instagramRest,
                        y:
                          hoveredBadge === "instagram"
                            ? -8
                            : hoveredBadge === "linkedin"
                              ? 8
                              : 0,
                        zIndex: hoveredBadge === "instagram" ? 30 : 10,
                      }
                    : {}
                }
                transition={{
                  opacity: badgeFan,
                  scale: badgeFan,
                  rotate: badgeFan,
                  x: badgeFan,
                  y: badgeHover,
                  zIndex: { duration: 0 },
                }}
                onMouseEnter={() => setHoveredBadge("instagram")}
                onMouseLeave={() => setHoveredBadge(null)}
                className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  width: `${BADGE.tile}em`,
                  height: `${BADGE.tile}em`,
                }}
              >
                {/* Cancels the angle baked into the artwork, so the visible tile
                    ends up at whatever the animated rotation above says. That is
                    what lets this span — the sole hover target — carry the tile's
                    real angle, instead of the two disagreeing at the corners.
                    A plain span, so its `rotate` is the CSS property and Framer
                    Motion never sees it. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{ rotate: `${-BADGE.instagramTilt}deg` }}
                >
                  {/* placed by the tile's centre within the canvas rather than
                      the image's own — the canvas is oversized for shadow bleed,
                      which sits the tile above centre */}
                  {/* Static export with `images.unoptimized`, and these are
                      inline SVG icons — next/image would optimize nothing here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/instagram.svg"
                    alt=""
                    className="absolute max-w-none"
                    style={{
                      width: `${BADGE.tile * BADGE.instagramImgScale}em`,
                      left: "57%",
                      top: "50%",
                      transform: `translate(-${BADGE.instagramTileCentreX}, -${BADGE.instagramTileCentreY})`,
                    }}
                  />
                </span>
              </motion.span>
              {/* LinkedIn badge — right, layered on top. It rises into place
                  the way the headline words do, arriving already tilted and
                  straightening as it lands; it then holds straight and centred
                  between the two resting spots until the pair fans apart, where
                  it slides right and takes its +18.26deg tilt back.

                  The rotation is keyframed on this element and the rise lives on
                  the wrapper inside, because the two beats overlap in time and a
                  single from/to cannot describe tilted -> straight -> tilted. */}
              <motion.span
                aria-hidden
                initial={{
                  rotate: BADGE_ROTATE_KEYFRAMES[0],
                  x: "0%",
                }}
                animate={
                  revealed
                    ? {
                        rotate: BADGE_ROTATE_KEYFRAMES,
                        x: BADGE.linkedinRest,
                        y:
                          hoveredBadge === "linkedin"
                            ? -8
                            : hoveredBadge === "instagram"
                              ? 8
                              : 0,
                        zIndex: hoveredBadge === "linkedin" ? 30 : 20,
                      }
                    : {}
                }
                transition={{
                  rotate: badgeLinkedinRotate,
                  // slides out of the stack as the pair fans apart
                  x: badgeFan,
                  y: badgeHover,
                  zIndex: { duration: 0 },
                }}
                onMouseEnter={() => setHoveredBadge("linkedin")}
                onMouseLeave={() => setHoveredBadge(null)}
                className="absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{
                  width: `${BADGE.tile}em`,
                  height: `${BADGE.tile}em`,
                }}
              >
                {/* Carries the rise and the fade. Kept off the element above
                    because that one owns `y` for the hover lift, and the two
                    would overwrite each other. */}
                <motion.span
                  aria-hidden
                  initial={{ opacity: 0, y: BADGE_RISE_FROM }}
                  animate={revealed ? { opacity: 1, y: "0%" } : {}}
                  transition={badgeRise}
                  className="pointer-events-none absolute inset-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/Linkedin-svg.svg"
                    alt=""
                    className="absolute max-w-none"
                    style={{
                      width: `${BADGE.tile * BADGE.linkedinImgScale}em`,
                      left: "44%",
                      top: "50%",
                      transform: `translate(-${BADGE.linkedinTileCentreX}, -${BADGE.linkedinTileCentreY})`,
                    }}
                  />
                </motion.span>
              </motion.span>
            </motion.span>
            {words([
              { text: "Oriented", name: "oriented", className: "font-[500]" },
            ])}
          </span>

          <span className="ml-[0.02em] inline-block align-top">
            <span className="relative inline-block overflow-visible">
              <span>
                {words([
                  {
                    text: "Founders",
                    name: "founders",
                    className: `italic font-semibold ${HEADLINE_GREEN}`,
                  },
                ])}
              </span>
              <svg
                viewBox="0 0 290 10"
                aria-hidden
                data-fall-item
                className="absolute bottom-[-0.1em] left-[-2%] w-[100%] overflow-visible"
              >
                <defs>
                  <clipPath id="underline-clip">
                    <rect
                      ref={underlineRef}
                      x="0"
                      y="0"
                      width="290"
                      height="10"
                    />
                  </clipPath>
                </defs>
                <image
                  href="/underline.svg"
                  width="290"
                  height="10"
                  clipPath="url(#underline-clip)"
                  preserveAspectRatio="none"
                />
              </svg>
            </span>
            <span>
              {words([
                {
                  text: ".",
                  name: "period",
                  className: `font-extrabold ${HEADLINE_CORAL}`,
                },
              ])}
            </span>
          </span>
        </h1>
      </div>

      {/* scroll cue, bottom right — aligned directly under the navbar contact button */}
      <button
        type="button"
        aria-label="Scroll to explore"
        data-hero-fade
        onClick={scrollToNextSection}
        className="absolute bottom-6 right-[clamp(1.5rem,5vw,6rem)] min-[1920px]:right-[clamp(2rem,5vw,8rem)] min-[2400px]:right-[clamp(2.5rem,5vw,10rem)] min-[2800px]:right-[clamp(3rem,5vw,12rem)] min-[3300px]:right-[clamp(3.5rem,5vw,15rem)] min-[3840px]:right-[clamp(4rem,5vw,18rem)] min-[4400px]:right-[clamp(4.5rem,5vw,22rem)] z-20 flex size-12 items-center justify-center rounded-full border border-dashed border-ink/90 text-black transition-colors hover:border-ink hover:border-white hover:bg-ink/90 hover:text-white sm:bottom-8 sm:size-13 md:bottom-10 lg:size-14"
      >
        <svg
          width="21"
          height="24"
          viewBox="0 0 21 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
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
