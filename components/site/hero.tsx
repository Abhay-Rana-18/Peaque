"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { motion } from "motion/react";
import { DotGridZoom } from "./dot-grid-zoom";
import { TorusKnotFlat } from "./torus-knot-flat";
import { PROJECTS, PROJECT_COUNT, ProjectCard } from "./project-card";

type Token = {
  text: string;
  name: string;
  className?: string;
  /** Drops the side margins, for a token that must butt against its neighbour. */
  tight?: boolean;
  /**
   * Set on any token whose className includes `italic`. Opens extra clip
   * headroom on the right so a trailing glyph's slant-overhung ink survives
   * the word's `overflow-hidden` reveal mask — see ITALIC_OVERHANG_EM.
   */
  italic?: boolean;
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
/**
 * Daylight left between the arrow tip and the final "n" of "Design" when the
 * cursor lands — ~3px at a 1440px viewport. Small enough to read as contact,
 * non-zero so the tip never actually collides with the glyph. The press then
 * opens this up further: "Design" and the tag each scale about their own
 * centre, so the word's right edge retreats left while the tag's arrow pulls
 * right, and the two withdraw from each other.
 */
const TIP_CLEARANCE_EM = 0.05;
/**
 * Scroll distance, in svh, given to the hero-to-video handover — on top of the
 * first screenful the hero occupies normally.
 */
const HANDOVER_RUNWAY_SVH = 110;
/**
 * Where in that runway the video takes over, 0-1. The hero's content clears the
 * frame first and the card only starts rising once it has; overlapping them
 * reads as two things crossing rather than one replacing the other.
 */
const HANDOVER_REEL_START = 0.42;
/** How long the video+tags group takes to rise into place, in the same 0-1 units. */
const HANDOVER_VIDEO_DURATION = 0.35;
/**
 * Scroll budget, in svh, for ONE project-to-project change: a stretch where the
 * slide simply sits and can be read, then the 3D turn that swaps it.
 *
 * These are in svh rather than timeline units because svh is the thing with a
 * real feel to it — how far the wheel travels. The timeline durations are
 * derived from them at build time against the handover's own measured length,
 * which keeps scroll-per-unit identical across the whole runway; hand-picking
 * both halves independently is what makes a scrubbed sequence speed up and slow
 * down for no visible reason.
 */
const SLIDE_HOLD_SVH = 55;
const SLIDE_FLIP_SVH = 70;
/** Rest after the last slide, so the final project is readable before release. */
const SLIDE_TAIL_SVH = 45;
/** Every transition after the first slide — three of them for four projects. */
const SLIDE_TRANSITIONS = PROJECT_COUNT - 1;
const SLIDES_RUNWAY_SVH =
  (SLIDE_HOLD_SVH + SLIDE_FLIP_SVH) * SLIDE_TRANSITIONS + SLIDE_TAIL_SVH;
/**
 * Where the tip sits vertically, as a fraction down the word's line box.
 *
 * A fraction rather than a font metric because the word is measured in the
 * SCRIPT face (the swap has not happened yet) but ends up in Archivo, and the
 * two disagree on x-height and ascent — so anything derived from one would be
 * wrong for the other. The line box itself is set by the h1's leading, which
 * both share.
 *
 * Left at the plain centre. It was briefly dropped to 0.40 to chase a tip that
 * sat too low, but that was treating the symptom: the real cause was measuring
 * the word while the intro still had it parked a rise-height below its resting
 * position (see wordRestTop). With that backed out, the centre lands where it
 * should, and biasing on top of it would overshoot above the letter.
 */
const TIP_HEIGHT_ANCHOR = 0.5;
// The block has finished re-centring once the last line has settled.
const DRIFT_END = AT.founders + 0.5;

/**
 * Half of the horizontal gap between any two items on a headline line, applied
 * to BOTH sides of every item — so two neighbours contribute half each and land
 * on a uniform 12px, while each line still ends with the same half-gap on the
 * left and the right and therefore stays centred.
 *
 * 0.0926em is 6px against the 64.8px the headline renders at 1440px, i.e. 12px
 * of gap. It is held in em rather than px so it rides the type scale like
 * everything else here; a literal 12px would be a third of a word's width at
 * 6000px and invisible beside 270px type.
 *
 * This replaced a mix of four separate sources: a trailing NBSP baked into every
 * word, `[word-spacing:0.22em]` on the h1 stacking on top of it (~0.48em, 31px,
 * together), plus ad-hoc `mx-1` / `mr-[0.22em]` on individual elements.
 *
 * Kept as a bare number rather than a `mx-[...]` class string: an italic word
 * needs a DIFFERENT value on its right edge than its left (see
 * ITALIC_OVERHANG_EM below), which means building `ml-*`/`mr-*` explicitly.
 * Mixing that with an `mx-*` on the same element is a trap — both end up
 * setting the right margin, and which one wins depends on generated-CSS order
 * rather than anything visible in the className string.
 */
const HEADLINE_HALF_GAP_EM = 0.0926;
/**
 * Extra clip headroom on an italic word's trailing edge.
 *
 * Each word sits in an `overflow-hidden` box (it is the mask the on-load
 * reveal slides out of), sized to the glyphs' upright advance width. Italic
 * slants every glyph rightward, and the ink of a trailing lowercase letter —
 * "Founders" clipped its final "s" — can extend past that advance width into
 * where the box was never sized to reach, so `overflow-hidden` cuts it.
 *
 * `pr-[ITALIC_OVERHANG_EM]` on the box gives that ink somewhere to land before
 * the clip edge; the matching `-mr-[ITALIC_OVERHANG_EM]` cancels the padding
 * back out of the layout so the next word or the tight-following period is
 * none the wider for it — the same paired-padding/negative-margin trick
 * `pb-[0.08em] -mb-[0.08em]` above already uses for descenders.
 */
const ITALIC_OVERHANG_EM = 0.08;

/**
 * How long the pair takes to fan apart once it starts. 0.18s read as a snap
 * rather than a fan — two cards separating, rotating and re-spacing the slot
 * around them is a lot of simultaneous change, and at that length the eye gets
 * the end state without the movement.
 */
const BADGE_FAN_DURATION = 0.5;
/**
 * Quintic ease-out. Framer's stock "easeOut" is a gentle quadratic that keeps
 * creeping toward the end; this leaves fast and settles hard, which is what
 * makes two overlapping cards read as being flicked apart rather than sliding.
 */
const BADGE_FAN_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
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
/**
 * Reading these needs the baked +18.26deg added: VISIBLE = keyframe + tilt.
 *   -2*tilt -> visible -18.26  arrives leaning LEFT
 *   -tilt   -> visible 0       straightens as it lands
 *   -tilt   -> visible 0       holds while it waits alone
 *   0       -> visible +18.26  fans out to its resting lean, RIGHT
 * The first frame used to be 0, i.e. visible +18.26 — arriving already leaning
 * the same way it ends up, so the rise barely rotated at all. Starting from the
 * opposite lean gives it a full 36deg to travel through instead.
 */
const BADGE_ROTATE_KEYFRAMES = [
  -2 * BADGE.linkedinTilt,
  -BADGE.linkedinTilt,
  -BADGE.linkedinTilt,
  0,
];
const BADGE_ROTATE_TIMES = [
  0,
  BADGE_RISE_DURATION / BADGE_ROTATE_DURATION,
  (AT.instagram - AT.linkedin) / BADGE_ROTATE_DURATION,
  1,
];
/**
 * One ease per segment: the rise, the hold, then the fan. A single ease across
 * all three would apply the fan's curve to the rise as well — and to the hold,
 * where it does not belong at all since nothing is moving.
 */
// Not `as const` — Framer types `ease` as a mutable Easing[], so a readonly
// tuple is rejected outright.
const BADGE_ROTATE_EASES: (
  | "easeOut"
  | "linear"
  | [number, number, number, number]
)[] = ["easeOut", "linear", BADGE_FAN_EASE];

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
  /**
   * The click press. Everything inside the "Design" box — the word, its
   * selection frame, the slider, and the "Abhay" tag with its arrow — dips
   * together, bottoms out exactly ON the click, then springs back. The font
   * swap therefore happens at the trough, so the new face arrives already at
   * the pressed size and grows out of it.
   *
   * This started at 0.985 (1.5%) over 0.1s and was invisible — roughly 1.5px
   * per side, under the threshold at which a transform that brief registers at
   * all. 0.95 is 5%, which is the usual range for a button press: felt rather
   * than watched. The dip is also slowed a little, since a change this small
   * needs a few frames on screen to read as movement instead of a glitch.
   */
  pressScale: 0.95,
  pressDownDur: 0.14,
  pressUpDur: 0.3,
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
  /**
   * The scroll runway wrapping the sticky stage. Its extra height IS the
   * handover's scrub distance — the trigger has to be this element and not the
   * section, because the section is sticky and therefore stops moving relative
   * to the viewport the moment the transition starts.
   */
  const runwayRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<gsap.core.Timeline | null>(null);
  /**
   * Which project is showing. Derived from scroll position rather than stepped
   * on each flip, so it is a pure function of where the page is — scrubbing
   * backwards walks it back correctly with no counter to keep in sync, and a
   * mid-scroll reload lands on the right slide.
   */
  const [activeProject, setActiveProject] = useState(0);
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
  /**
   * The "Design" wrapper — the ghost-sized box, not the word drawn on top of it.
   *
   * This is what the cursor aims at. The word inside is absolutely positioned
   * and centred, so its width tracks BOTH `designWeight` and the font-family
   * swap, while the "Abhay" tag hangs off this box (left: calc(100% + 0.95em)).
   * Aiming at the word therefore went stale twice over: once when the intro
   * drops the weight to its minimum at t=0, again when the family swaps on the
   * click. Aiming at the box instead means any change to it moves the target
   * and the tag by the same amount, so the offset between them cancels out.
   */
  const designBoxRef = useRef<HTMLSpanElement>(null);
  /**
   * The inner span holding just the word, its selection frame and its handles —
   * i.e. everything the click press should shrink, and nothing it should not.
   * Distinct from designBoxRef, which also contains the "Abhay" tag: pressing
   * that one scales the tag and the word together, so the gap between them
   * shrinks with everything else instead of opening up.
   */
  const designInnerRef = useRef<HTMLSpanElement>(null);
  const [isDesignClicked, setIsDesignClicked] = useState(false);
  const ABHAY_ARROW_GAP = 20;
  const ABHAY_REACT_RADIUS = 160;
  const DEFAULT_ABHAY_ANGLE = -2.7;
  const [abhayAngle, setAbhayAngle] = useState(DEFAULT_ABHAY_ANGLE);
  const [abhayHalfSize, setAbhayHalfSize] = useState({ w: 42, h: 19 });
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
        ease: BADGE_FAN_EASE,
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
        ease: BADGE_ROTATE_EASES,
      };
  // The hover lift must never inherit an entrance delay.
  const badgeHover = { duration: 0.3, delay: 0, ease: "easeOut" as const };
  /**
   * How much lower the pair sits once fanned out. Animated on the SLOT with the
   * fan's own transition, so the descent happens during the expansion rather
   * than as a jump after it; the badges' own `y` stays reserved for the ±8px
   * hover lift, which composes on top of this via the parent transform.
   */
  const BADGE_DROP_WITH_FAN = 14;

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
  /**
   * Gates cursor tracking until the intro has finished with the arrow.
   *
   * The intro drives the angle itself — the arrow points due-left through the
   * whole approach, click and drag — so letting the pointer steer it at the
   * same time means two owners fighting over one value. Flipped once the tag
   * has parked AND its closing sweep to the resting angle has run out; a ref,
   * not state, because the pointer handler reads it on every mousemove and it
   * must never trigger a render.
   */
  const abhayReadyRef = useRef(false);
  /**
   * Time constant for the arrow's cursor chase, in ms: after this long it has
   * closed ~63% of the remaining angle, and it is visually settled by roughly
   * 3x it. Deliberately far shorter than the 1200ms return-to-default — that
   * one is a one-shot toward a stationary target, whereas this is chasing a
   * target that moves with the pointer, so the same figure here would read as
   * the arrow lagging badly rather than as smoothness. Raise it to glide more
   * lazily, lower it toward instant.
   */
  const ABHAY_TRACK_TAU = 130;

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

    // Where the arrow is heading. The pointer only ever writes this; the loop
    // below is what actually moves the arrow, so tracking eases into place the
    // same way the return-to-default does instead of snapping per mousemove.
    let targetAngle = abhayAngleRef.current;
    let chaseFrame: number | null = null;
    let lastFrame = 0;
    // Whether the pointer is currently inside the radius. A plain local, not
    // state: nothing renders from it now that the arrow has no per-state CSS
    // transition, and the handler needs it synchronously — branching inside a
    // setState updater, as this used to, runs twice under StrictMode.
    let tracking = false;

    const stopChase = () => {
      if (chaseFrame !== null) {
        cancelAnimationFrame(chaseFrame);
        chaseFrame = null;
      }
    };

    // Exponential approach rather than the return's fixed-duration tween: the
    // target keeps moving while the pointer does, so there is no fixed distance
    // to divide a duration over. Framerate-independent — the per-frame fraction
    // is derived from elapsed ms, so the glide takes the same wall-clock time
    // at 60 and 144Hz. dt is clamped because a backgrounded tab hands back one
    // enormous delta, which would otherwise resolve to a jump.
    const chase = (now: number) => {
      const dt = Math.min(now - lastFrame, 64);
      lastFrame = now;

      const current = abhayAngleRef.current;
      const remaining = targetAngle - current;

      if (Math.abs(remaining) < 0.002) {
        // Settled. Park exactly on target and idle — the next mousemove
        // restarts the loop, so a still pointer costs nothing.
        abhayAngleRef.current = targetAngle;
        setAbhayAngle(targetAngle);
        stopChase();
        return;
      }

      const next = current + remaining * (1 - Math.exp(-dt / ABHAY_TRACK_TAU));
      abhayAngleRef.current = next;
      setAbhayAngle(next);
      chaseFrame = requestAnimationFrame(chase);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!active) return;
      // The intro owns the arrow's angle until it has parked — see abhayReadyRef.
      if (!abhayReadyRef.current) return;
      const el = abhayRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // Leaving the radius retargets the SAME loop at the resting angle rather
      // than handing off to startReturnToDefaultAnimation. That function is a
      // fixed-duration ease-out cubic, so the arrow used to glide back on a
      // different curve, and over 1200ms against the chase's ~110ms — in and
      // out visibly did not match. One loop, one tau, one curve: only the
      // destination differs.
      const outOfRange = Math.hypot(dx, dy) > ABHAY_REACT_RADIUS;
      const nextTarget = outOfRange ? DEFAULT_ABHAY_ANGLE : Math.atan2(dy, dx);

      if (outOfRange && !tracking) return; // already home, nothing to unwind

      // The intro's own park animation owns animFrameRef; cancel it before
      // taking over so the two are not driving the angle on the same frame.
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      targetAngle = nearestEquivalentAngle(nextTarget, abhayAngleRef.current);
      if (chaseFrame === null) {
        lastFrame = performance.now();
        chaseFrame = requestAnimationFrame(chase);
      }

      tracking = !outOfRange;
      if (!outOfRange) {
        setAbhayHalfSize({ w: rect.width / 2, h: rect.height / 2 });
      }
    };
    const handleChange = (e: MediaQueryListEvent) => {
      active = e.matches;
    };
    mq.addEventListener("change", handleChange);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      mq.removeEventListener("change", handleChange);
      window.removeEventListener("mousemove", handleMouseMove);
      stopChase();
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
              autoAlpha: 0.6,
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

          // Hero-to-video handover, scrubbed across the runway. This replaces
          // the old gentle parallax (yPercent -12, autoAlpha 0.25 against the
          // section) — that tween did a weaker version of the same thing, and
          // leaving both in place would have had two triggers writing the same
          // properties on the same element.
          //
          // Triggered on the RUNWAY, not the section: the section is sticky, so
          // once the handover begins it no longer moves relative to the
          // viewport and its own scroll positions would stop advancing.
          //
          // Only the content leaves. The background, the knot and the dot grid
          // are outside [data-hero-inner], so they hold their positions and the
          // stage stays continuous underneath the swap.
          const noteText =
            scope.current?.querySelector<HTMLElement>("[data-note-text]");
          const noteSvg = scope.current?.querySelector<SVGElement>(
            "[data-note-arrow-svg]",
          );
          const notePath = scope.current?.querySelector<SVGPathElement>(
            "[data-note-arrow-path]",
          );
          const noteHead = scope.current?.querySelector<SVGPathElement>(
            "[data-note-arrow-head]",
          );

          const prepareNotePath = (
            pathEl: SVGPathElement | null | undefined,
          ) => {
            if (!pathEl) return 0;
            const length = pathEl.getTotalLength();
            gsap.set(pathEl, {
              strokeDasharray: length,
              strokeDashoffset: length,
              autoAlpha: 1,
            });
            return length;
          };

          const notePathLen = prepareNotePath(notePath);
          const noteHeadLen = prepareNotePath(noteHead);

          // NOTE_FALL_TILT: right-side fall tilt in degrees (left side fixed by 0% 50% origin)
          const NOTE_FALL_TILT = 3.208;

          if (noteText) {
            const p0Pivot =
              PROJECTS[0]?.notePivot === "right"
                ? "100% 50%"
                : PROJECTS[0]?.notePivot === "left"
                ? "0% 50%"
                : PROJECTS[0]?.notePivot ?? "0% 50%";
            gsap.set(noteText, {
              autoAlpha: 0,
              y: 0,
              // Start straight (0 deg)
              rotation: 0,
              // Dynamic pivot based on project spec ("left" = 0% 50%, "right" = 100% 50%)
              transformOrigin: p0Pivot,
            });
          }

          if (noteSvg) {
            gsap.set(noteSvg, { autoAlpha: 0 });
          }

          /**
           * Total timeline length, filled in once every tween has been added.
           * Read by onUpdate to turn the trigger's 0-1 progress back into
           * timeline TIME, which is the unit all the cue points below are in.
           *
           * It has to be a variable rather than `handover.duration()` inline:
           * ScrollTrigger can call onUpdate while the timeline is still being
           * constructed, and comparing against a duration that is still growing
           * would fire the cues at the wrong scroll positions. Zero means "not
           * built yet", so onUpdate simply does nothing until it is.
           */
          let timelineTotal = 0;
          /** Timeline time at which each flip is exactly edge-on — the swap beats. */
          const flipMidpoints: number[] = [];

          const handover = gsap.timeline({
            scrollTrigger: {
              trigger: runwayRef.current,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
              // The knot's travel is measured from window.innerHeight, so it
              // has to be recomputed rather than kept from the first build.
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                if (!timelineTotal) return;
                const t = self.progress * timelineTotal;

                // Which slide is showing: count how many flips have passed
                // their edge-on beat. Recomputed from scratch every update
                // rather than incremented, so scrubbing backwards is handled by
                // the same line of code and cannot drift out of step.
                let next = 0;
                for (let i = 0; i < flipMidpoints.length; i++) {
                  if (t >= flipMidpoints[i]) next = i + 1;
                }
                // React bails out on an unchanged value, so this is a no-op on
                // the vast majority of scroll events.
                setActiveProject(next);
              },
            },
          });

          const navLinksEl =
            document.querySelector<HTMLElement>("[data-nav-links]");

          handover
            .to(
              "[data-hero-inner]",
              { yPercent: -70, autoAlpha: 0, ease: "none" },
              0,
            )
            // The cue belongs to the hero, so it goes with it — but faster, so
            // it is gone well before the card arrives over that corner.
            .to(
              "[data-hero-fade]",
              { autoAlpha: 0, ease: "none", duration: 0.3 },
              0,
            )
            // Fade out the background dots (DotGridZoom) on scroll to Projects
            .to(
              "[data-hero-dots]",
              { autoAlpha: 0, ease: "none", duration: 0.4 },
              0,
            )
            // The reel stage itself just needs to stop being hidden — its own
            // children now carry the entrance motion, so this is a snap rather
            // than a tween (a fade here on top of theirs would double-dim them).
            .set("[data-hero-reel]", { autoAlpha: 1 }, HANDOVER_REEL_START);

          const flipEl =
            scope.current?.querySelector<HTMLElement>("[data-project-flip]");

          if (flipEl) {
            // Video card flips into view around 3D Y axis on initial handover/onLoad
            // while rising from bottom to top.
            handover.fromTo(
              flipEl,
              { rotateY: -90 },
              {
                rotateY: 0,
                ease: "none",
                duration: HANDOVER_VIDEO_DURATION,
              },
              HANDOVER_REEL_START,
            );
          }

          handover
            .fromTo(
              "[data-project-video]",
              { yPercent: 35 },
              {
                yPercent: 0,
                ease: "none",
                duration: HANDOVER_VIDEO_DURATION,
              },
              HANDOVER_REEL_START,
            )
            .fromTo(
              "[data-project-video]",
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                ease: "none",
                duration: HANDOVER_VIDEO_DURATION * 0.34,
              },
              HANDOVER_REEL_START,
            );

          // ---- Note + Arrow: sequential handover animation ----------------
          // 1. Text fades in straight while card rises so it renders cleanly
          // 2. Once card is almost completely risen, text tilts to its angle
          // 3. Arrow stem & arrowhead draw right after tilt starts
          const noteStart = HANDOVER_REEL_START;
          const noteDur = HANDOVER_VIDEO_DURATION;

          // Determine target tilt angle for project 0 (defaults to NOTE_FALL_TILT)
          const targetTilt = PROJECTS[0]?.noteRotation ?? NOTE_FALL_TILT;

          if (noteText) {
            // Step 1: Text fades in straight just before tilting starts (50% -> 75% card rise)
            handover.to(
              noteText,
              { autoAlpha: 0.8, duration: noteDur * 0.25, ease: "none" },
              noteStart + noteDur * 0.5,
            );
            // Step 2: Once card has risen up almost completely (~75%), start tilting text
            handover.to(
              noteText,
              { rotation: targetTilt, duration: noteDur * 0.3, ease: "power1.out" },
              noteStart + noteDur * 0.75,
            );
          }

          if (noteSvg) {
            // Step 3: Arrow SVG container fades in as tilt begins
            handover.to(
              noteSvg,
              { autoAlpha: 1, duration: noteDur * 0.15, ease: "none" },
              noteStart + noteDur * 0.75,
            );
          }

          if (notePath) {
            // Arrow stem formation animation
            handover.to(
              notePath,
              { strokeDashoffset: 0, duration: noteDur * 0.35, ease: "power1.out" },
              noteStart + noteDur * 0.75,
            );
          }

          if (noteHead) {
            // Arrowhead formation animation
            handover.to(
              noteHead,
              { strokeDashoffset: 0, duration: noteDur * 0.2, ease: "power1.out" },
              noteStart + noteDur * 1.05,
            );
          }

          // The knot is the one hero element that crosses over instead of
          // leaving: it climbs and shrinks into the place the projects
          // composition wants it, so the two sections share the same object
          // rather than one fading out in favour of a second, unrelated one.
          // The hero's OWN rest position/size (bottom-[30.817%] left-[5.473%],
          // 34vw) is untouched — this only adds a transform on TOP of it that
          // is 0/1 (a no-op) until the handover begins.
          //
          // This is a FLIP: rather than guessing a px/vh offset and a scale
          // factor, it measures where the element actually IS
          // (getBoundingClientRect) and where `[data-project-knot-slot]`
          // actually is — that slot is Figma's own `knotLeft` node box, placed
          // in ProjectCard.tsx's percentage system — and computes the exact
          // translate + uniform scale that carries one onto the other. The
          // scale is uniform (min of the two axis ratios) so a square knot
          // going into a non-square Figma box is fitted and centred within it
          // rather than squashed into an ellipse.
          //
          // Both rects are read fresh via function-based tween values, not
          // captured once here — `invalidateOnRefresh` on the ScrollTrigger
          // (below) re-invokes them on resize, which is what keeps this
          // correct across breakpoints where the stage, the knot's 34vw size,
          // and the destination box all change independently.
          const knotEl =
            scope.current?.querySelector<HTMLElement>("[data-hero-knot]");
          const knotSlot = scope.current?.querySelector<HTMLElement>(
            "[data-project-knot-slot]",
          );
          if (knotEl && knotSlot) {
            const knotDelta = () => {
              const start = knotEl.getBoundingClientRect();
              const end = knotSlot.getBoundingClientRect();
              return {
                x: end.left + end.width / 2 - (start.left + start.width/2),
                y: end.top + end.height / 2 - (start.top + start.height / 2),
                scale: Math.min(
                  end.width / start.width,
                  end.height / start.height,
                ),
              };
            };
            handover.fromTo(
              knotEl,
              { x: 0, y: 0, scale: 1 },
              {
                x: () => knotDelta().x,
                y: () => knotDelta().y,
                scale: () => knotDelta().scale,
                ease: "none",
                duration: HANDOVER_REEL_START + HANDOVER_VIDEO_DURATION,
              },
              0,
            );
          }

          // The corner scribble draws itself while the card rises. What is
          // being scrubbed is the MASK brush inside CardShapeDraw — the
          // artwork is an outlined stroke with no stroke of its own to dash,
          // so a recovered centerline sweeps across it instead (see that
          // component). Same position and duration as the rise above, so the
          // mark is complete at the exact frame the card lands, whatever the
          // runway length.
          //
          // The length is measured here rather than hardcoded because it is in
          // the SVG's own user units — resolution-independent, so this survives
          // any resize without recomputing.
          const shapePath =
            scope.current?.querySelector<SVGPathElement>("[data-shape-draw]");
          if (shapePath) {
            const shapeLen = shapePath.getTotalLength();
            gsap.set(shapePath, { strokeDasharray: shapeLen });
            handover.fromTo(
              shapePath,
              { strokeDashoffset: shapeLen },
              {
                strokeDashoffset: 0,
                ease: "none",
                duration: HANDOVER_VIDEO_DURATION,
              },
              HANDOVER_REEL_START,
            );
          }

          if (navLinksEl) {
            // Fade out the navbar links (Why us?, Plans, Services, Work) on scroll to Projects
            handover.to(
              navLinksEl,
              { autoAlpha: 0, ease: "none", duration: 0.35 },
              0,
            );
          }

          // Bottom-right torus knot in the projects section — slides in
          // diagonally from below the bottom-right corner, then reveals its drop-shadow glow.
          const projectKnot = scope.current?.querySelector<HTMLElement>(
            "[data-project-knot]",
          );
          if (projectKnot) {
            gsap.set(projectKnot, {
              autoAlpha: 0.2,
              x: 200,
              y: 180,
              filter:
                "blur(3px) drop-shadow(35px 15px 30px rgba(84, 180, 65, 0)) drop-shadow(70px 25px 45px rgba(84, 180, 65, 0))",
            });
            handover.to(
              projectKnot,
              {
                x: 0,
                y: 0,
                ease: "power2.out",
                duration: HANDOVER_VIDEO_DURATION * 1.3,
              },
              HANDOVER_REEL_START,
            );
            // Apply the 0.45 drop shadow glow only when the onLoad landing animation is done
            handover.to(
              projectKnot,
              {
                filter:
                  "blur(3px) drop-shadow(35px 15px 30px rgba(84, 180, 65, 0.45)) drop-shadow(70px 25px 45px rgba(84, 180, 65, 0))",
                ease: "power1.out",
                duration: HANDOVER_VIDEO_DURATION * 0.4,
              },
              HANDOVER_REEL_START + HANDOVER_VIDEO_DURATION * 0.9,
            );
          }

          // ---- Project-to-project slide changes -------------------------
          //
          // Everything above is the handover; from here the composition is
          // parked and the four projects cycle through it.
          //
          // The turn is a HALF-FLIP SWAP rather than a two-faced card: the
          // group rotates 0 -> 90deg (edge-on, so nothing is visible), the
          // content is swapped at that instant, then it rotates -90 -> 0deg
          // back to facing. Rotation is monotonic the whole way, so it reads as
          // one continuous 180deg turn — but only ONE slide is ever in the DOM,
          // which avoids the real trap of the two-faced approach: with
          // `preserve-3d`, `backface-visibility` has to be managed per element,
          // and the pills sit at their own Z depths, so a back face would need
          // its own mirrored copy of every layer just to stay hidden.
          //
          // Scroll-per-timeline-unit is held constant by deriving these
          // durations from the handover's own measured length. `handoverDur` is
          // read BEFORE any flip is added, or it would include them.
          const handoverDur = handover.duration();
          const unitPerSvh = handoverDur / HANDOVER_RUNWAY_SVH;
          const slideHold = SLIDE_HOLD_SVH * unitPerSvh;
          const slideFlip = SLIDE_FLIP_SVH * unitPerSvh;
          for (let i = 0; i < SLIDE_TRANSITIONS; i++) {
            const flipStart =
              handoverDur + i * (slideHold + slideFlip) + slideHold;
            const flipMid = flipStart + slideFlip / 2;
            // Recorded even when the element is missing, so the counter and the
            // slide content still advance if the flip itself cannot run.
            flipMidpoints.push(flipMid);

            if (!flipEl) continue;

            // `immediateRender: false` on BOTH halves is load-bearing. fromTo
            // defaults to rendering its `from` state the moment it is created,
            // which for the second half would slam the card to -90deg at build
            // time and leave the whole section edge-on before a single pixel is
            // scrolled.
            handover.fromTo(
              flipEl,
              { rotateY: 0 },
              {
                rotateY: 90,
                ease: "none",
                duration: slideFlip / 2,
                immediateRender: false,
              },
              flipStart,
            );
            handover.fromTo(
              flipEl,
              { rotateY: -90 },
              {
                rotateY: 0,
                ease: "none",
                duration: slideFlip / 2,
                immediateRender: false,
              },
              flipMid,
            );

            // Re-draw the scribble shape on each slide change: reset to fully
            // hidden at the flip midpoint (content has just swapped) and draw
            // during the second half of the flip so the new project's mark
            // reveals alongside the card turning back to face the viewer.
            if (shapePath) {
              const shapeLen = shapePath.getTotalLength();
              handover.fromTo(
                shapePath,
                { strokeDashoffset: shapeLen },
                {
                  strokeDashoffset: 0,
                  ease: "power1.inOut",
                  duration: slideFlip / 2,
                  immediateRender: false,
                },
                flipMid,
              );
            }

            // Re-animate the hand-written note text & its arrow on each slide change:
            // 1) Fast back-animation during flip-out (flipStart -> flipMid):
            //    Arrowhead removes first, stem retracts, note text un-tilts & fades out.
            if (noteHead && noteHeadLen) {
              handover.to(
                noteHead,
                {
                  strokeDashoffset: noteHeadLen,
                  duration: slideFlip * 0.08,
                  ease: "power1.in",
                },
                flipStart,
              );
            }

            if (notePath && notePathLen) {
              handover.to(
                notePath,
                {
                  strokeDashoffset: notePathLen,
                  duration: slideFlip * 0.16,
                  ease: "power1.in",
                },
                flipStart + slideFlip * 0.05,
              );
            }

            if (noteText) {
              handover.to(
                noteText,
                {
                  autoAlpha: 0,
                  rotation: 0,
                  duration: slideFlip * 0.2,
                  ease: "power1.in",
                },
                flipStart,
              );
            }

            if (noteSvg) {
              handover.to(
                noteSvg,
                {
                  autoAlpha: 0,
                  duration: slideFlip * 0.15,
                  ease: "power1.in",
                },
                flipStart,
              );
            }

            // 2) Reveal sequence for new project (from flipMid as card turns in):
            //    a. Text fades in straight (rotation: 0) with project's notePivot transformOrigin
            //    b. Text tilts to project's noteRotation
            //    c. Arrow stem & head draw
            const nextProj = PROJECTS[i + 1] || PROJECTS[0];
            const nextPivot =
              nextProj.notePivot === "right"
                ? "100% 50%"
                : nextProj.notePivot === "left"
                ? "0% 50%"
                : nextProj.notePivot ?? "0% 50%";
            const nextRotation = nextProj.noteRotation ?? NOTE_FALL_TILT;

            if (noteText) {
              // Set transformOrigin and reset straight rotation at flipMid
              handover.set(
                noteText,
                {
                  transformOrigin: nextPivot,
                  rotation: 0,
                  autoAlpha: 0,
                },
                flipMid,
              );

              // Step A: Fade in straight (rotation: 0) while card turns in
              handover.to(
                noteText,
                {
                  autoAlpha: 0.8,
                  rotation: 0,
                  ease: "none",
                  duration: slideFlip * 0.18,
                },
                flipMid,
              );

              // Step B: Tilt text to new project angle as card finishes turning in
              handover.to(
                noteText,
                {
                  rotation: nextRotation,
                  ease: "power1.out",
                  duration: slideFlip * 0.17,
                },
                flipMid + slideFlip * 0.18,
              );
            }

            if (noteSvg) {
              handover.set(noteSvg, { autoAlpha: 0 }, flipMid);
              handover.to(
                noteSvg,
                {
                  autoAlpha: 1,
                  duration: slideFlip * 0.08,
                },
                flipMid + slideFlip * 0.2,
              );
            }

            if (notePath && notePathLen) {
              handover.to(
                notePath,
                {
                  strokeDashoffset: 0,
                  ease: "power1.out",
                  duration: slideFlip * 0.18,
                },
                flipMid + slideFlip * 0.2,
              );
            }

            if (noteHead && noteHeadLen) {
              handover.to(
                noteHead,
                {
                  strokeDashoffset: 0,
                  ease: "power1.out",
                  duration: slideFlip * 0.1,
                },
                flipMid + slideFlip * 0.38,
              );
            }
          }

          // Tail: nothing animates, the last slide simply holds. Added as an
          // empty span so the runway's final stretch maps to real timeline
          // time — without it the scrub would compress the whole sequence into
          // the earlier part of the scroll and the last project would flash past.
          handover.to({}, { duration: SLIDE_TAIL_SVH * unitPerSvh });

          // Now that every tween exists, publish the length onUpdate converts
          // progress against.
          timelineTotal = handover.duration();

          // §9 — `prefers-reduced-motion`: render the rest state immediately and
          // run no sequence at all.
          if (reduced) {
            if (navLinksEl) gsap.set(navLinksEl, { autoAlpha: 1 });
            if (projectKnot)
              gsap.set(projectKnot, {
                autoAlpha: 0.2,
                x: 0,
                y: 0,
                filter:
                  "blur(3px) drop-shadow(35px 15px 30px rgba(84, 180, 65, 0.45)) drop-shadow(70px 25px 45px rgba(84, 180, 65, 0))",
              });
            if (noteText)
              gsap.set(noteText, { autoAlpha: 0.8, y: 0, rotation: 4 });
            if (noteSvg) gsap.set(noteSvg, { autoAlpha: 1 });
            if (notePath) {
              gsap.set(notePath, {
                strokeDasharray: "none",
                strokeDashoffset: 0,
                autoAlpha: 0.8,
              });
            }
            if (noteHead) {
              gsap.set(noteHead, {
                strokeDasharray: "none",
                strokeDashoffset: 0,
                autoAlpha: 0.8,
              });
            }
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
              // Pivot on the "...Products" end rather than the pill's centre.
              // GSAP defaults transformOrigin to 50% 50%, which swings both
              // ends in opposite directions; anchoring the right edge holds it
              // still and spends the whole tilt on the "For Socials..." end.
              transformOrigin: "100% 50%",
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
            // The arrow's draw, split so the head only lands at the very end.
            // Named because the tag's tilt below is pinned to the same window —
            // both start at AT.arrowLeft and both finish on ARROW_DRAW_TOTAL,
            // so retiming the draw carries the tilt with it automatically.
            const ARROW_PATH_DRAW = 0.72;
            const ARROW_HEAD_DRAW = 0.15;
            const ARROW_DRAW_TOTAL = ARROW_PATH_DRAW + ARROW_HEAD_DRAW;

            if (socialsTagRef.current) {
              // lands flat...
              tl.to(
                socialsTagRef.current,
                { autoAlpha: 1, y: 0, duration: 0.19, ease: "power2.out" },
                AT.tagLeft,
              )
                // ...then leans over into its hand-placed angle, in lockstep
                // with the arrow underneath: same start, same finish, and the
                // same ease as the path draw so they track each other through
                // the middle rather than only agreeing at the two ends.
                .to(
                  socialsTagRef.current,
                  {
                    rotation: 0,
                    duration: ARROW_DRAW_TOTAL,
                    ease: "power1.inOut",
                  },
                  AT.arrowLeft,
                );
            }
            if (socialsArrowPathRef.current) {
              tl.to(
                socialsArrowPathRef.current,
                {
                  strokeDashoffset: 0,
                  duration: ARROW_PATH_DRAW,
                  ease: "power1.inOut",
                },
                AT.arrowLeft,
              );
            }
            if (socialsArrowHeadRef.current) {
              tl.to(
                socialsArrowHeadRef.current,
                {
                  strokeDashoffset: 0,
                  duration: ARROW_HEAD_DRAW,
                  ease: "power1.out",
                },
                AT.arrowLeft + ARROW_PATH_DRAW,
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
                { strokeDashoffset: 0, duration: 0.8, ease: "power1.inOut" },
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

    // Declared up here so the cleanup below can clear it whichever branch set it.
    let readyTimer: ReturnType<typeof setTimeout> | undefined;

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
    // No intro journey runs here, so nothing is holding the arrow: open the
    // gate now, or resizing up to lg afterwards would leave tracking dead.
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      abhayReadyRef.current = true;
      return;
    }

    const abhayEl = abhayRef.current;
    // The BOX, not the word — see designBoxRef. Both the tag and this target
    // hang off it, so the font swap moves them together instead of apart.
    const designEl = designBoxRef.current;
    const trackEl = designTrackRef.current;
    if (!abhayEl || !designEl || !trackEl) {
      abhayReadyRef.current = true;
      return;
    }

    // §9 — reduced motion gets the rest state, no journey. `designSelected`
    // covers the selection frame; the tag just needs to be parked and visible.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(abhayEl, { x: 0, y: 0, opacity: 1 });
      abhayReadyRef.current = true;
      return;
    }

    // Measure exact bounding rectangles & sizes in screen space. The slider is
    // only faded out at this point, not unmounted, so it already has a real box.
    const abhayRect = abhayEl.getBoundingClientRect();
    const designRect = designEl.getBoundingClientRect();
    const trackRect = trackEl.getBoundingClientRect();
    const arrowEl = abhayEl.querySelector<HTMLElement>("[data-abhay-arrow]");
    const arrowRect = arrowEl?.getBoundingClientRect();
    // Pinned to the arrow's tail (x=6 of the 44-unit viewBox) so the recoil at
    // the click beat pivots there — the tail holds still and only the tip pulls
    // back. GSAP would otherwise default to the box centre and move both ends.
    const arrowSvg = arrowEl?.querySelector<SVGSVGElement>("svg") ?? null;
    if (arrowSvg) {
      gsap.set(arrowSvg, { transformOrigin: `${(6 / 44) * 100}% 50%` });
    }

    // Declared here rather than beside the entry maths further down, because
    // the tip's clearance from the "n" is measured against it.
    const headFont = parseFloat(getComputedStyle(designEl).fontSize) || 62;

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

    // 1. Park the tip just off the final "n" of "Design" — close enough to read
    //    as contact, with a hair of daylight so it never actually touches.
    //
    //    Aimed at the WORD's right edge, not the box's. The box is sized by a
    //    ghost pinned to the resting weight, but the intro drops the weight to
    //    its minimum, so the real glyphs sit inset from the box and aiming at
    //    the box left an obvious gap. Measuring the word is safe here precisely
    //    because of when it happens: the script face this is measured in has a
    //    400 floor, so the drop to weight 200 does not actually narrow it, and
    //    the family swap that WOULD change the width lands on the click itself
    //    — by which point the cursor is already leaving for the slider.
    const wordEl = designWordRef.current;
    const wordRect = (wordEl ?? designEl).getBoundingClientRect();
    // CRITICAL: back out the word's own animation offset. This measures during
    // the reveal, and the intro parks every headline word BELOW its resting
    // spot at mount (gsap.set(wordEls, { y: wordRise })) ready to rise into
    // place. wordRise is 24/62em — about 25px at 1440 — so the rect read here
    // is that far low, and anything aimed at it lands a whole lowercase
    // letter-height beneath the glyph it was supposed to meet. x is unaffected:
    // that tween only moves y.
    const wordRiseOffset = wordEl
      ? (gsap.getProperty(wordEl, "y") as number)
      : 0;
    const wordRestTop = wordRect.top - wordRiseOffset;
    const designTargetX =
      wordRect.right + TIP_CLEARANCE_EM * headFont - screenTipX;
    // Vertically on the word too, not the box: the box carries pb-[0.08em] for
    // descender room, which drags its centre below the glyphs' own. But the
    // word's own rect is no better as a midpoint — it is the full line box,
    // ascender to descender, so its centre lands most of the way down the "n".
    // TIP_HEIGHT_ANCHOR aims into the upper part of the lowercase band instead.
    const designTargetY =
      wordRestTop + wordRect.height * TIP_HEIGHT_ANCHOR - screenTipY - 10;

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
    //
    // Cleared using screenTipX, NOT abhayRect.left: the arrow orbits out to the
    // LEFT of the tag, so parking the tag's own box past the edge still left the
    // arrowhead poking back into view on the right. screenTipX is already the
    // arrow tip's x at the due-left angle it holds through the approach — i.e.
    // the leftmost point of the whole assembly — so clearing that clears both.
    const startX = window.innerWidth - screenTipX + 8;
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
      // 7. leaves for its parked spot — arrow sweeps round to its resting
      //    angle simultaneously with the tag's movement
      .to(
        abhayEl,
        {
          x: 0,
          y: 0,
          duration: CURSOR.parkDur,
          ease: "power3.out",
          onStart: () => {
            startReturnToDefaultAnimation(CURSOR.parkDur * 1000);
          },
          onComplete: () => {
            abhayReadyRef.current = true;
          },
        },
        `+=${CURSOR.parkGap}`,
      );

    // A recoil on the click beat, so it reads as a click rather than the frame
    // simply appearing. Scaling the SVG horizontally about the arrow's TAIL is
    // what confines the movement to the tip: the tail sits on the origin and
    // does not shift, while the tip — 34 viewBox units away — draws back ~2
    // units, a shade over 1px on screen. Translating the arrow would slide the
    // whole shape instead.
    //
    // It goes on the <svg>, never the [data-abhay-arrow] span: that span's
    // transform is rewritten from React state every frame by the cursor chase,
    // so GSAP and React would fight over it. The svg sits inside that rotation,
    // so the scale runs along the arrow's own axis whatever way it is pointing.
    //
    // Appended after the chain rather than spliced into it because arrowSvg is
    // nullable and a null GSAP target warns. Both positions are absolute, so
    // insertion order does not affect the sequence above — and it must stay
    // that way: the park tween is placed with a RELATIVE `+=`, which resolves
    // against the timeline end at the moment it is added.
    if (arrowSvg) {
      tl.to(
        arrowSvg,
        { scaleX: 0.94, duration: 0.06, ease: "power2.in" },
        AT.designSwap,
      ).to(
        arrowSvg,
        { scaleX: 1, duration: 0.18, ease: "back.out(3)" },
        AT.designSwap + 0.06,
      );
    }

    // The press. TWO targets, each scaling about its own centre — that is the
    // whole trick. Scaling their shared parent instead (as this first did)
    // shrinks every distance inside it by the same factor, the tip-to-"n" gap
    // included, so the two close on each other rather than parting. Scaled
    // separately, the word's right edge withdraws left while the tag's arrow
    // withdraws right, and the daylight between them widens through the dip.
    //
    // The down leg ENDS on AT.designSwap and the up leg starts there, so the
    // trough coincides with the font swap: the new face appears already at the
    // pressed size, then grows out of it. Transform-only, nothing reflows.
    //
    // Note the Design target is the INNER span, not designBoxRef — the box also
    // contains the tag, which needs its own scale. And not the centring span
    // below it either: that carries a Tailwind -translate-x-1/2, and GSAP folds
    // a standalone CSS `translate` into its transform, freezing that -50% as
    // pixels. The inner span has only padding, so there is nothing to fold.
    const pressTargets = [designInnerRef.current, abhayEl].filter(Boolean);
    tl.to(
      pressTargets,
      {
        scale: CURSOR.pressScale,
        duration: CURSOR.pressDownDur,
        ease: "power2.in",
      },
      AT.designSwap - CURSOR.pressDownDur,
    ).to(
      pressTargets,
      { scale: 1, duration: CURSOR.pressUpDur, ease: "back.out(2)" },
      AT.designSwap,
    );

    return () => {
      tl.kill();
      if (readyTimer) clearTimeout(readyTimer);
    };
  }, [revealed, startReturnToDefaultAnimation, motionLeadShift]);

  /**
   * Scrolls smoothly to the Projects section (where the hero text has faded out
   * and the first project video card has landed and settled flat on screen).
   * Driven by GSAP over 1.4s for a slow, cinematic transition.
   */
  const scrollToNextSection = () => {
    const el = runwayRef.current ?? scope.current;
    if (!el) return;
    const runwayTop = el.getBoundingClientRect().top + window.scrollY;
    // Scroll to the start of the Projects section (after the handover transition)
    const targetTop =
      runwayTop + window.innerHeight * (HANDOVER_RUNWAY_SVH / 100);

    const scrollObj = { y: window.scrollY };
    gsap.to(scrollObj, {
      y: targetTop,
      duration: 1.4,
      ease: "power2.inOut",
      onUpdate: () => {
        window.scrollTo(0, scrollObj.y);
      },
    });
  };

  const words = (tokens: Token[]) => {
    const gap = HEADLINE_HALF_GAP_EM;
    const overhang = ITALIC_OVERHANG_EM;
    return tokens.map((t, i) => {
      const half = t.tight ? 0 : gap;
      // Only the trailing edge needs headroom — italic shifts each glyph's
      // top rightward relative to its own baseline anchor, which pushes ink
      // outward past the box on the right but draws it inward on the left.
      const left = half;
      const right = t.italic ? half - overhang : half;
      return (
        <span
          key={i}
          className="inline-block overflow-hidden align-top pb-[0.08em] -mb-[0.08em]"
          style={{
            marginLeft: `${left}em`,
            marginRight: `${right}em`,
            paddingRight: t.italic ? `${overhang}em` : undefined,
          }}
        >
          <span
            data-word={t.name}
            className={`inline-block will-change-transform ${t.className ?? ""}`}
          >
            {t.text}
          </span>
        </span>
      );
    });
  };

  return (
    // Scroll runway. The stage inside is sticky, so this wrapper's extra height
    // is what the handover is scrubbed against: the viewport holds still on the
    // hero while the page scrolls through it, and the swap happens in place.
    // HANDOVER_RUNWAY_SVH of travel past the first screenful — raise it to make
    // the transition feel longer, lower it to make it snappier.
    // Height is an inline style, not a Tailwind class: the value is computed,
    // and Tailwind's scanner only sees literal class strings — an interpolated
    // `h-[...]` would compile to nothing at all.
    <div
      ref={runwayRef}
      className="relative"
      style={{
        height: `${100 + HANDOVER_RUNWAY_SVH + SLIDES_RUNWAY_SVH}svh`,
      }}
    >
      <section
        ref={scope}
        id="top"
        className="sticky top-0 flex min-h-svh flex-col justify-center overflow-hidden px-5"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[url('/bg.svg')] bg-cover bg-center"
          />
          <div data-hero-dots className="absolute inset-0">
            <DotGridZoom
              gap={30}
              baseSize={3}
              maxSize={18}
              proximity={130}
              color="#D8D8D8"
              activeColor="#FAFAFA"
            />
          </div>

          <div
            data-hero-knot
            className="pointer-events-none absolute bottom-[0%] left-[5.5%] hidden h-[clamp(21rem,34vw,127.5rem)] w-[clamp(21rem,34vw,127.5rem)] -translate-x-1/2 translate-y-1/2 sm:block"
            style={{
              opacity: 0.17,
              filter:
                "blur(3px) drop-shadow(35px 15px 30px rgba(84, 180, 65, 0.45)) drop-shadow(70px 25px 45px rgba(84, 180, 65, 0))",
              WebkitMaskImage:
                "linear-gradient(to left, black 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.4) 75%, transparent 100%)",
              maskImage:
                "linear-gradient(to left, black 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.4) 75%, transparent 100%)",
            }}
          >
            <TorusKnotFlat className="h-full w-full" />
          </div>
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
              className="ml-24 mt-1 w-20 text-black"
            >
              <path
                ref={socialsArrowPathRef}
                d="M0.484375 0.125488C3.98438 13.6255 38.4844 39.6255 69.9844 39.6255"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="1"
              />
              <g transform="translate(56.624, 28.868)">
                <path
                  ref={socialsArrowHeadRef}
                  d="M2.87622 0.257233C4.37622 2.75723 9.87622 9.75723 13.3762 10.7572C14.8762 11.1858 3.87622 13.7572 0.376221 17.7572"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="1"
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
              <p className="font-kalam text-xs sm:text-sm min-[1280px]:text-base leading-snug text-black/60  [text-wrap:balance]">
                We give every project the love <br />
                and affection it deserves :)
              </p>
              <svg
                viewBox="0 0 113 83"
                fill="none"
                aria-hidden
                className="-ml-3 -mt-3 w-28 min-[1440px]:w-34 -rotate-10 text-black"
              >
                <path
                  ref={asideScribblePathRef}
                  opacity="0.6"
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
          <h1 className="mt-3 font-heading font-normal leading-[1.023] tracking-normal text-black lg:mt-16 text-[clamp(1.5rem,7vw,2.5rem)] sm:text-[clamp(2.75rem,7vw,3.75rem)] md:text-[clamp(3.25rem,4.5vw,4.25rem)] lg:text-[clamp(3.5rem,4.5vw,16.875rem)]">
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
                <span className="inline-block transition-transform duration-300 ease-out group-has-[a:hover]/cta:-translate-x-[2.2em]">
                  {words([
                    {
                      text: "Motion",
                      name: "motion",
                      className: "font-normal",
                    },
                  ])}
                </span>
                <motion.a
                  ref={ctaArrowRef}
                  href="#contact"
                  data-fall-item
                  className="group/arrow relative mx-[0.0926em] inline-flex size-[0.88em] -translate-y-[0.05em] shrink-0 items-center justify-center align-middle"
                >
                  {/* expanding pill background + text — absolutely positioned so it never
                    affects the surrounding text flow (guarantees "& Design" never moves) */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-0 top-0 z-0 flex h-full w-full items-center justify-end overflow-hidden rounded-full bg-[#0F2100] border border-[#022C12] pr-[0.74em] transition-[width] duration-300 ease-out group-hover/arrow:w-[3.1em]"
                  >
                    <span className="mr-3 translate-x-0 whitespace-nowrap text-[0.4em] font-semibold [word-spacing:normal] text-cream opacity-0 transition-all duration-300 ease-out group-hover/arrow:translate-x-0 group-hover/arrow:opacity-100">
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
                ref={designBoxRef}
                data-fall-item
                className="relative mx-[0.0926em] inline-block overflow-visible align-top"
              >
                <span
                  ref={designInnerRef}
                  className="relative inline-block pb-[0.08em] -mb-[0.08em] align-top"
                >
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

                  <span className="absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap">
                    {/* No transition on font-weight. Both the intro's drag and a
                      hand-drag push a new weight every frame, so a 300ms
                      transition never got to finish one before the next
                      replaced it — the rendered weight trailed the handle by
                      most of the drag and only caught up once it stopped, which
                      read as the weight jumping at the end rather than rising
                      with the slider. The frame-by-frame updates ARE the
                      smoothing; the weight is rounded to whole units, and a
                      1-unit step across a 200-750 range is invisible. */}
                    <span
                      ref={designWordRef}
                      data-word="design"
                      className="inline-block will-change-transform"
                      style={{
                        fontWeight: designWeight,
                        fontFamily: designFontFamily,
                      }}
                    >
                      Design
                    </span>

                    {/* Frame and handles live in HERE, not on the outer wrapper,
                      so they measure the word rather than the ghost. The ghost
                      is pinned to the resting weight, so anchoring to it left
                      the frame a fixed size while the word thickened out of it;
                      this span shrink-wraps the real word, so the frame now
                      grows with the weight. It costs nothing in layout — this
                      span is absolutely positioned, so it and everything in it
                      is out of flow and the line never reflows. At heavy
                      weights the frame will reach into the neighbouring words
                      and toward the slider rail; that overlap is accepted. */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -top-1 -bottom-1 -left-2 -right-2 min-[1024px]:-top-[0.05em] min-[1024px]:-bottom-[0.05em] min-[1024px]:-left-[0.1em] min-[1024px]:-right-[0.1em] border border-dashed border-black/50 ${
                        designSelected ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    {/* 4 corner dots marking the selection — centered exactly on
                      the dashed box's corners. left/right MUST track the frame's
                      -left/-right above (top/bottom already matched it) or the
                      dots drift off the corners once x and y diverge. */}
                    {[
                      "-top-1 -left-2 min-[1024px]:-top-[0.05em] min-[1024px]:-left-[0.1em] -translate-x-1/2 -translate-y-1/2",
                      "-top-1 -right-2 min-[1024px]:-top-[0.05em] min-[1024px]:-right-[0.1em] translate-x-1/2 -translate-y-1/2",
                      "-bottom-1 -left-2 min-[1024px]:-bottom-[0.05em] min-[1024px]:-left-[0.1em] -translate-x-1/2 translate-y-1/2",
                      "-bottom-1 -right-2 min-[1024px]:-bottom-[0.05em] min-[1024px]:-right-[0.1em] translate-x-1/2 translate-y-1/2",
                    ].map((pos) => (
                      <span
                        key={pos}
                        aria-hidden
                        className={`pointer-events-none absolute ${pos} size-1.5 min-[1024px]:size-[0.075em] min-[1024px]:min-w-[6px] min-[1024px]:min-h-[6px] bg-black ${
                          designSelected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    ))}
                  </span>
                </span>

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
                    if (e.buttons === 1)
                      updateDesignWeightFromPointer(e.clientY);
                  }}
                  // Top/bottom deliberately mirror the dashed selection box's
                  // `-inset-1` / `-inset-[0.05em]` above, so the rail is exactly
                  // as tall as the box it belongs to. The box itself stays wide —
                  // a 1px rail is far too thin to grab, so this keeps a ~14px
                  // pointer target (was 20px) with the line centred inside it.
                  className={`absolute -right-0 min-[1024px]:left-[calc(100%+0.18em)] -top-1 min-[1024px]:-top-[0.05em] -bottom-1 min-[1024px]:-bottom-[0.05em] flex w-5 min-[1024px]:w-[0.3em] min-[1024px]:min-w-[20px] items-center justify-center ${
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
                  <span aria-hidden className="h-full w-[2px] bg-black/50" />
                  <span
                    aria-hidden
                    // Height raised well past the design's 6.667px (grip is easier
                    // to see/land a pointer on when it isn't razor-thin); width
                    // nudged up only slightly to stay a mostly-vertical tick.
                    className="absolute left-1/2 h-2 w-4 min-[1024px]:h-[0.14em] min-[1024px]:w-[0.262em] min-[1024px]:min-h-[9px] min-[1024px]:min-w-[17px] rounded-md min-[1024px]:rounded-[0.1em] border border-[#175800] border-2 bg-white opacity-100 shadow-sm"
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
                <span
                  ref={abhayRef}
                  data-fall-item
                  className="absolute top-1/2 hidden -translate-y-1/2 min-[1024px]:block opacity-0 origin-left left-[calc(100%+0.95em)]"
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
                      // No CSS transition in either direction. The chase loop
                      // eases the angle every frame now, both toward the cursor
                      // and back to rest, so a transition on top would ease an
                      // already-eased value — and having it differ per state
                      // (it was 150ms tracking vs 75ms returning) is exactly what
                      // made in and out feel like different motions.
                      className="pointer-events-none absolute left-1/2 top-1/2 size-7.5 min-[1280px]:size-8 min-[1600px]:size-8.5 min-[1920px]:size-9 text-[#1e7a00] drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
                    >
                      <svg
                        viewBox="0 0 44 40"
                        className="size-full overflow-visible"
                      >
                        <path
                          d="M35.5 17.9 Q40 20 35.5 22.1 L11 33.7 Q6 36 8.5 31.1 L13.3 21.3 Q14 20 13.3 18.7 L8.5 8.9 Q6 4 11 6.3 Z"
                          fill="currentColor"
                          stroke="#FFFFFF"
                          strokeWidth="7"
                          paintOrder="stroke"
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
            </span>

            <span className="block">
              {words([
                { text: "for", name: "for", className: "font-light" },
                {
                  text: "Results",
                  name: "results",
                  className: `font-extrabold ${HEADLINE_GREEN}`,
                },
              ])}
              {/* The downward settle rides HERE, on the slot, not on the badges.
                It shares the fan's transition, so widening and descending are
                one gesture — the drop used to be a separate tween fired by a
                timer when the fan finished, which read as the pair jumping
                after the animation was over. On the slot it also stays clear
                of the badges' own `y`, which the hover lift owns; and the
                Tailwind -translate-y here survives Framer writing `transform`
                because v4 emits it as the standalone `translate` property. */}
              <motion.span
                data-fall-item
                className="relative ml-[-0.19em] mr-[-0.16em] inline-block h-[0.95em] -translate-y-[0.101em] align-middle"
                initial={{
                  width: `${BADGE.tile * BADGE.slotCollapsed}em`,
                  y: 0,
                }}
                animate={
                  revealed
                    ? {
                        width: `${BADGE.tile * BADGE.slot}em`,
                        y: BADGE_DROP_WITH_FAN,
                      }
                    : {}
                }
                transition={{ width: badgeFan, y: badgeFan }}
              >
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
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{ rotate: `${-BADGE.instagramTilt}deg` }}
                  >
                    {" "}
                    <img
                      src="/instagram.svg"
                      alt=""
                      className="absolute max-w-none"
                      style={{
                        width: `${BADGE.tile * BADGE.instagramImgScale}em`,
                        left: "58%",
                        top: "50%",
                        transform: `translate(-${BADGE.instagramTileCentreX}, -${BADGE.instagramTileCentreY})`,
                      }}
                    />
                  </span>
                </motion.span>
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
                        left: "48%",
                        top: "50%",
                        transform: `translate(-${BADGE.linkedinTileCentreX}, -${BADGE.linkedinTileCentreY})`,
                      }}
                    />
                  </motion.span>
                </motion.span>
              </motion.span>
              {words([
                {
                  text: "Oriented",
                  name: "oriented",
                  className: "font-[500]",
                },
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
                      // punctuation, not a neighbour — the period must butt
                      // against the word rather than sit a gap away
                      tight: true,
                      // the trailing "s" was clipped by this word's own
                      // overflow-hidden reveal mask — see ITALIC_OVERHANG_EM
                      italic: true,
                    },
                  ])}
                </span>
                <svg
                  viewBox="0 0 290 10"
                  aria-hidden
                  data-fall-item
                  className="absolute bottom-[-0.1em] left-[-2%] w-[105%] overflow-visible"
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
                    className: `font-extrabold ${HEADLINE_CORAL} ml-[0.09em]`,
                    tight: true,
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
          className="absolute bottom-6 right-[clamp(1.5rem,5vw,6rem)] min-[1920px]:right-[clamp(2rem,5vw,8rem)] min-[2400px]:right-[clamp(2.5rem,5vw,10rem)] min-[2800px]:right-[clamp(3rem,5vw,12rem)] min-[3300px]:right-[clamp(3.5rem,5vw,15rem)] min-[3840px]:right-[clamp(4rem,5vw,18rem)] min-[4400px]:right-[clamp(4.5rem,5vw,22rem)] z-20 flex size-12 items-center justify-center rounded-full border border-dashed border-black/90 text-black transition-colors hover:border-black hover:border-white hover:bg-black/90 hover:text-white sm:bottom-8 sm:size-13 md:bottom-10 lg:size-14"
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

        {/* The incoming section, sharing the hero's stage. It sits in the same
            sticky viewport rather than in a section of its own, which is what
            lets the navbar, background and knot stay put while only the
            contents change over. ProjectCard's own [data-project-video] and
            [data-project-note] groups carry the entrance motion (see the
            handover timeline above), so this wrapper only has to reveal
            itself and center the composition. */}
        <div
          data-hero-reel
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <ProjectCard project={PROJECTS[activeProject]} index={activeProject} />
        </div>
      </section>
    </div>
  );
}
