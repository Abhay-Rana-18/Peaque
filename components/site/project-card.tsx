"use client";

import { useEffect, useRef } from "react";
import { CardShapeDraw } from "./card-shape-draw";
import { TorusKnotFlat } from "./torus-knot-flat";

const FRAME_ASPECT = 1440 / 810;

/**
 * Exported SVGs carry bleed around the designed node box for their shadows, so
 * the file is bigger than the shape it draws. Each asset is therefore sized to
 * its EXPORTED canvas and offset back by the bleed, rather than sized to the
 * node box — otherwise the artwork renders shrunk by the bleed amount.
 *
 * `chat_bubble` is the one to watch: its bleed is asymmetric (31.71% above,
 * 119.72% below, for a long drop shadow), so its image centre is nowhere near
 * its node centre and it cannot be centred by eye.
 */
const ASSETS = {
  bubble: { w: 2.0506, h: 2.5143, left: -0.5253, top: -0.3171 },
  arrow: { w: 85 / 83.998, h: 67 / 66.24, left: -0.006, top: -0.0057 },
} as const;

/**
 * Geometry shared by ALL four projects, as percentages of the stage — see the
 * header note. Anything a slide is allowed to move for itself lives in
 * PROJECTS below instead, so this block is the invariant skeleton: change a
 * number here and every slide moves with it.
 */
const POS = {
  card: { left: 38.8, top: 22.0, width: 22.7, height: 53.0 },
  note: { left: 70.6, top: 22.6, width: 22.8707, height: 11.1111 },
  arrow: { left: 67.6, top: 30.9, width: 8.0, height: 10.0 },
  num: { left: 9.8, top: 79.9 },
  knotBig: { left: 17.7424, top: 66.5586, width: 62.6162, height: 104.2012 },
  knotRight: { left: 78.3, top: 52.0, width: 41.0733, height: 64.099 },
  // top/left nudged up and left from the raw Figma box (was 19.2593/-6.611)
  // per feedback that the landing spot should sit further in that direction.
  // width/height untouched — size is correct, only the destination moved.
  knotLeft: { left: -18, top: 20, width: 22.6978, height: 36.5398 },
} as const;

type Box = { left: number; top: number; width: number; height: number };

/**
 * One slide. The card, note, counter and knots are fixed by POS; a project only
 * gets to move its two pills, its chat bubble and its scribble, and to bring
 * its own copy and clip. That split is the point — it is what makes four slides
 * read as one designed composition being re-dressed rather than four unrelated
 * layouts, and it keeps a new project a data edit rather than a markup edit.
 */
/** Arrow configuration for a project's hand-drawn note arrow. */
export type ProjectArrow = {
  /** Position box for the arrow SVG, as percentages of the stage. */
  pos: Box;
  /** viewBox string for the arrow SVG element. */
  viewBox: string;
  /** SVG path `d` attribute for the arrow stem. */
  pathD: string;
  /** SVG path `d` attribute for the arrowhead. */
  headD: string;
  /** Optional fill color for the arrowhead path (for filled contour shapes). */
  headFill?: string;
  /** Optional rotation in degrees for this arrow (e.g. -15, 25, 180). */
  rotation?: number;
  /** Optional CSS transform-origin for the rotation (defaults to "center"). */
  transformOrigin?: string;
};

export type ProjectSpec = {
  /** Stable identity for React keys — not the array index, so reordering is safe. */
  id: string;
  video: string;
  aiPill: Box & { text: string; bg?: string; textColor?: string; borderColor?: string };
  pdPill: Box & { text: string; bg?: string; textColor?: string; borderColor?: string };
  bubble: Box;
  /**
   * Keep this box aspect-exact for the scribble artwork's 162x169 (see
   * CardShapeDraw), i.e. height ≈ width * 1.8546 in these units — width% of
   * 1440 against height% of 810. Break that ratio and the mark stretches.
   */
  shape: Box & { rotation?: number; transformOrigin?: string };
  /** Position box for the hand-written note text (left, top, width, height as % of stage). */
  notePos?: Box;
  /** Rotation angle (in degrees) for the hand-written note text. */
  noteRotation?: number;
  /** Fixed pivot side for tilting ("left" = left side fixed 0% 50%, "right" = right side fixed 100% 50%, or custom CSS transformOrigin string). Defaults to "left". */
  notePivot?: "left" | "right" | string;
  /** Text alignment for the note ("left", "right", "center"). Defaults to "right". */
  noteAlign?: "left" | "right" | "center";
  /** Custom note text. Falls back to the default if omitted. */
  noteText?: string;
  /** Custom arrow configuration. Falls back to the default if omitted. */
  arrow?: ProjectArrow;
};

/**
 * All four point at the same clip for now, by request. Swapping in the real
 * ones is a one-line change per entry — and because the <video> is keyed on
 * `video`, four identical srcs mean the element is never remounted and the
 * clip simply keeps playing across a slide change, while four distinct srcs
 * will remount cleanly. Nothing else has to change.
 */
/** Default arrow shared by all projects unless overridden. */
const DEFAULT_ARROW: ProjectArrow = {
  pos: { left: 67.6, top: 30.9, width: 8.0, height: 10.0 },
  viewBox: "0 0 85 67",
  pathD: "M83.998 0.123047C75.9995 31.623 36.4995 50.123 2.99951 56.123",
  headD: "M15.5946 63.0234C13.3857 61.1206 5.96661 56.2005 2.3296 56.3496C0.77089 56.4135 10.408 50.5195 12.4756 45.6231",
};

const PROJECT2_ARROW: ProjectArrow = {
  pos: { left: 59.0, top: 11.0, width: 15.1404, height: 20.0 },
  viewBox: "0 0 118 122",
  pathD: "M115.432 94.8007C109.999 26.5722 25.4982 23.572 7.49965 42.5718",
  headD:
    "M11.7555 25.0937C11.21 28.5 9.67 35.8 7.49965 42.5718C11.5 44.1 17.6 45.7 26.274 48.9424",
  rotation: 0,
};

/**
 * Project 3's arrow — Figma node 253:4550, the 03/04 frame. Box 863,504
 * 84x66.24. Figma exported both paths as plain strokes here, so they go in as
 * they came; the shape is the same mark project 1 uses, at its natural size.
 */
const PROJECT3_ARROW: ProjectArrow = {
  pos: { left: 65.0, top: 64.5, width: 6.8332, height: 9.1777 },
  viewBox: "0 0 84.483 66.3628",
  pathD: "M83.9984 0.123056C75.9998 31.6231 36.4998 50.1231 2.99982 56.1231",
  headD:
    "M15.5947 63.0234C13.3859 61.1206 5.96676 56.2005 2.32975 56.3496C0.771039 56.4135 10.4081 50.5195 12.4758 45.6231",
};

const DEFAULT_NOTE_POS: Box = { left: 70.6, top: 22.6, width: 22.8707, height: 11.1111 };
const DEFAULT_NOTE_ROTATION = 3.208;
const DEFAULT_NOTE_TEXT =
  "We design and animate your products so that it feels seamless and engaging to your users, of course, with a touch of our creativity ;-)";

export const PROJECTS: ProjectSpec[] = [
  {
    id: "p1",
    video: "/projects/first_card.mp4",
    aiPill: { text: "AI-Startups", left: 34.1, top: 33.9, width: 7.6, height: 5.18 },
    pdPill: { text: "Product Design", left: 33.5, top: 70.6, width: 13.0, height: 6.0 },
    bubble: { left: 59.0, top: 41.0, width: 5.5, height: 7.0 },
    shape: { left: 52.63, top: 6.72, width: 14.17, height: 26.27 },
    notePos: DEFAULT_NOTE_POS,
    noteRotation: DEFAULT_NOTE_ROTATION,
    notePivot: "left",
    noteAlign: "right",
    noteText: DEFAULT_NOTE_TEXT,
    arrow: DEFAULT_ARROW,
  },
  {
    id: "p2",
    video: "/projects/first_card.mp4",
    aiPill: { text: "B2B", left: 56.8, top: 70.7, width: 7.6, height: 5.18, bg:"#E56A44" },
    pdPill: { text: "Webflow-Development", left: 35.7, top: 20.1, width: 15.6, height: 6.0 },
    bubble: { left: 58.3, top: 32.0, width: 5.5, height: 7.0 },
    shape: { left: 33.7, top: 60.5, width: 13.2, height: 24.48 },
    // Figma node 253:2276 in the 02/04 frame: 900,299.77 334.15x109.61.
    notePos: { left: 68.5, top: 27.6, width: 23.2047, height: 13.5324 },
    noteRotation: -3.208,
    notePivot: "right",
    noteAlign: "right",
    noteText: DEFAULT_NOTE_TEXT,
    arrow: PROJECT2_ARROW,
  },
  {
    id: "p3",
    video: "/projects/first_card.mp4",
    aiPill: { text: "AI-Startups", left: 58.7, top: 24.3, width: 7.6, height: 5.18, bg:"#8C0D98" },
    pdPill: { text: "Product Animation", left: 49.3, top: 70.6, width: 13.0, height: 6.0 },
    bubble: { left: 35.0, top: 41.0, width: 5.5, height: 7.0 },
    shape: { left: 32.35, top: 7.6, width: 14.17, height: 26.27, rotation: 280 },
    notePos: { left: 66.5, top: 54.8615, width: 23.2136, height: 13.6056 },
    noteRotation: -3.208,
    notePivot: "right",
    noteAlign: "right",
    noteText: DEFAULT_NOTE_TEXT,
    arrow: PROJECT3_ARROW,
  },
  {
    id: "p4",
    video: "/projects/first_card.mp4",
    aiPill: { text: "AI-Startups", left: 56.8, top: 70.7, width: 7.6, height: 5.18 },
    pdPill: { text: "Product Design", left: 36.8, top: 20.1, width: 11.6, height: 6.0 },
    bubble: { left: 58.3, top: 32.0, width: 5.5, height: 7.0 },
    shape: { left: 33.7, top: 60.5, width: 13.2, height: 24.48 },
    notePos: DEFAULT_NOTE_POS,
    noteRotation: DEFAULT_NOTE_ROTATION,
    notePivot: "left",
    noteAlign: "right",
    noteText: DEFAULT_NOTE_TEXT,
    arrow: DEFAULT_ARROW,
  },
];

export const PROJECT_COUNT = PROJECTS.length;

/**
 * Z depths in cqw. These are the whole reason the turn reads as 3D rather than
 * as a flat picture spinning: the pills ride in FRONT of the card and the
 * scribble sits behind it, so once the group starts rotating they visibly
 * separate from the card's plane instead of staying welded to it. At rest the
 * composition still looks flat — the gap only exists while there is rotation to
 * reveal it, which is exactly when it is wanted.
 */
const DEPTH = { shape: -1.6, tag: 2.6 } as const;

/** The frame's three background knots. Same raster the hero uses. */
function BackdropKnot({
  at,
  rotate,
}: {
  at: { left: number; top: number; width: number; height: number };
  rotate: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: `${at.left}%`,
        top: `${at.top}%`,
        width: `${at.width}%`,
        height: `${at.height}%`,
        transform: `rotate(${rotate}deg)`,
        opacity: 0.15,
        filter: "blur(2px)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/torus_knot.png"
        alt=""
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function ProjectVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentSrcRef = useRef<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Avoid reloading or interrupting playback if the video source hasn't changed across slides
    if (currentSrcRef.current !== src) {
      currentSrcRef.current = src;
      video.src = src;
      video.load();
    }

    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;

    let isIntersecting = true;

    const playVideo = () => {
      if (document.visibilityState === "visible" && isIntersecting) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    };

    const pauseVideo = () => {
      if (!video.paused) {
        video.pause();
      }
    };

    // IntersectionObserver to only keep decoder active when on screen
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersecting = entry?.isIntersecting ?? false;
        if (isIntersecting) {
          playVideo();
        } else {
          pauseVideo();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(video);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isIntersecting) {
        playVideo();
      } else {
        pauseVideo();
      }
    };

    video.addEventListener("loadeddata", playVideo, { once: true });
    video.addEventListener("canplay", playVideo, { once: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    playVideo();

    return () => {
      observer.disconnect();
      video.removeEventListener("loadeddata", playVideo);
      video.removeEventListener("canplay", playVideo);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover scale-[1.05] pointer-events-none select-none"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      controls={false}
      tabIndex={-1}
      aria-hidden="true"
      disablePictureInPicture
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
      style={{
        transform: "translate3d(0, 0, 0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "transform",
      }}
    />
  );
}

export function ProjectCard({
  project = PROJECTS[0],
  index = 0,
}: {
  /** The slide to draw. Hero owns which one, so scroll stays the single source of truth. */
  project?: ProjectSpec;
  /** 0-based, for the counter. */
  index?: number;
}) {
  return (
    <div
      className="relative"
      style={{
        // `contain` behaviour: grow with the width, but stop at whatever the
        // height allows so the composition is never cropped.
        width: `min(100%, calc(100svh * ${FRAME_ASPECT}))`,
        aspectRatio: `${FRAME_ASPECT}`,
        // Establishes the cqw basis every type/border size below resolves
        // against. Safe here because everything inside is absolutely
        // positioned, so nothing depends on the container measuring content.
        containerType: "size",
      }}
    >
      {/* Landing slot for the HERO's own knot, not a knot of its own — it
          renders nothing. The hero section keeps one knot object that travels
          across the handover rather than fading out in favour of a second one,
          and this box is only the measurement target that motion aims at: its
          rect is diffed against the hero knot's rect to compute exactly how far
          to move and how much to shrink (see `[data-hero-knot]` in hero.tsx).
          It has to be a real element at the FINAL resting geometry — not a
          number baked into the tween — because that geometry is Figma's own
          `knotLeft` node box, expressed in this stage's percentage system,
          which a hand-picked px/vh offset in hero.tsx could not reproduce
          across breakpoints where the stage itself changes size. */}
      <div
        data-project-knot-slot
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${POS.knotLeft.left}%`,
          top: `${POS.knotLeft.top}%`,
          width: `${POS.knotLeft.width}%`,
          height: `${POS.knotLeft.height}%`,
        }}
      />

      {/* Bottom-right torus knot in the projects section. Exact Figma node box
          with directional spread blur and infinite spin matching the hero section knot.
          Fades/rises into place on scroll; see [data-project-knot] in hero.tsx. */}
      <div
        data-project-knot
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${POS.knotRight.left}%`,
          top: `${POS.knotRight.top}%`,
          width: `${POS.knotRight.width}%`,
          height: `${POS.knotRight.height}%`,
          transform: "rotate(-18deg)",
          /* Directional spread blur: light blur on left, expanding into large drop-shadow glow toward right */
          filter:
            "blur(3px) drop-shadow(35px 15px 30px rgba(84, 180, 65, 0.45)) drop-shadow(70px 25px 45px rgba(84, 180, 65, 0))",
          WebkitMaskImage:
            "linear-gradient(to right, black 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.4) 75%, transparent 100%)",
          maskImage:
            "linear-gradient(to right, black 0%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.4) 75%, transparent 100%)",
        }}
      >
        <TorusKnotFlat className="h-full w-full" />
      </div>

      {/* Video + its 3 tags. The handover slides this outer node up from the
          bottom as one unit (see `[data-project-video]` in hero.tsx); the two
          wrappers inside it are what the slide-to-slide 3D turn needs. They are
          separate elements deliberately, each for a reason that cannot be
          folded into the others:

          - the handover FADES this outer node, and an element at opacity < 1 is
            forced to `transform-style: flat` — which would collapse the 3D
            entirely. Keeping the fade and the rotation on different nodes means
            the two can never interfere, whatever their timing.
          - `perspective` only applies to an element's own children, so it has
            to sit exactly one level above the node that rotates.
          - cqw resolves against the nearest ANCESTOR container, and the stage
            IS that container — so a cqw perspective cannot live on the stage
            itself and needs this middle wrapper to resolve correctly. */}
      <div data-project-video className="absolute inset-0">
        <div className="absolute inset-0" style={{ perspective: "104cqw" }}>
          <div
            data-project-flip
            className="absolute inset-0"
            style={{
              transformStyle: "preserve-3d",
              // Turn about the CARD's centre rather than the stage's, so the
              // card pivots in place and the tags swing around it instead of
              // the whole composition orbiting an arbitrary point.
              transformOrigin: `${POS.card.left + POS.card.width / 2}% ${
                POS.card.top + POS.card.height / 2
              }%`,
            }}
          >
            {/* Hand-drawn scribble across the card's top-right corner. Rendered
                FIRST so it sits under the video — in the design the mark passes
                behind the card, and only its right-hand part stays visible. It
                draws itself as the card rises; see CardShapeDraw. */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: `${project.shape.left}%`,
                top: `${project.shape.top}%`,
                width: `${project.shape.width}%`,
                height: `${project.shape.height}%`,
                transform: `translateZ(${DEPTH.shape}cqw)${
                  project.shape.rotation ? ` rotate(${project.shape.rotation}deg)` : ""
                }`,
                transformOrigin: project.shape.transformOrigin ?? "center",
              }}
            >
              <CardShapeDraw />
            </div>

            {/* The video. 254.828 x 347.493 in the frame — a portrait card, not
                the 16:9 the placeholder used, so the source is cropped with
                object-cover rather than letterboxed. Sits at Z 0: it is the
                plane the pills are measured in front of. */}
            <div
              className="absolute overflow-hidden pointer-events-none select-none"
              style={{
                left: `${POS.card.left}%`,
                top: `${POS.card.top}%`,
                width: `${POS.card.width}%`,
                height: `${POS.card.height}%`,
                borderRadius: "1.2066cqw",
                border: "0.1609cqw solid #FFF",
                boxShadow:
                  "0 0.2286cqw 0.4572cqw 0 rgba(0, 0, 0, 0.04), 0 1.3715cqw 2.2858cqw 0 rgba(0, 0, 0, 0.04)",
                transform: "translate3d(0, 0, 0)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                contain: "paint layout",
              }}
            >
              <ProjectVideo src={project.video} />
            </div>

            {/* Tag 1 — overlaps the card's left edge */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                left: `${project.aiPill.left}%`,
                top: `${project.aiPill.top}%`,
                width: `${project.aiPill.width}%`,
                height: `${project.aiPill.height}%`,
                background: project.aiPill.bg ?? "#176500",
                border: `0.1389cqw solid ${project.aiPill.borderColor ?? "#ffffff"}`,
                borderRadius: "1.3889cqw",
                transform: `translateZ(${DEPTH.tag}cqw)`,
              }}
            >
              <span
                className="font-heading font-medium whitespace-nowrap"
                style={{
                  fontSize: "1.1111cqw",
                  color: project.aiPill.textColor ?? "#ffffff",
                }}
              >
                {project.aiPill.text}
              </span>
            </div>

            {/* Tag 2 — overlaps the card's bottom-left corner */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                left: `${project.pdPill.left}%`,
                top: `${project.pdPill.top}%`,
                width: `${project.pdPill.width}%`,
                height: `${project.pdPill.height}%`,
                background: project.pdPill.bg ?? "#ffffff",
                border: `0.0804cqw solid ${project.pdPill.borderColor ?? "#000000"}`,
                borderRadius: "1.3674cqw",
                transform: `translateZ(${DEPTH.tag}cqw)`,
              }}
            >
              <span
                className="font-heading font-medium whitespace-nowrap"
                style={{
                  fontSize: "1.287cqw",
                  color: project.pdPill.textColor ?? "#000000",
                }}
              >
                {project.pdPill.text}
              </span>
            </div>

            {/* Tag 3 — the messaging bubble, overlapping the card's right edge. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/projects/chat_bubble.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute max-w-none"
              style={{
                left: `${project.bubble.left + project.bubble.width * ASSETS.bubble.left}%`,
                top: `${project.bubble.top + project.bubble.height * ASSETS.bubble.top}%`,
                width: `${project.bubble.width * ASSETS.bubble.w}%`,
                height: `${project.bubble.height * ASSETS.bubble.h}%`,
                transform: `translateZ(${DEPTH.tag}cqw)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Note + its arrow, grouped so the handover can fade/rise this piece in
          once the video has landed — see `[data-project-note]` in hero.tsx. */}
      {(() => {
        const nPos = project.notePos ?? DEFAULT_NOTE_POS;
        const nAlign = project.noteAlign ?? "right";
        return (
          <div data-project-note className="absolute inset-0">
            {/* Hand-written note */}
            <p
              data-note-text
              className="font-kalam absolute text-black"
              style={{
                left: `${nPos.left}%`,
                top: `${nPos.top}%`,
                width: `${nPos.width}%`,
                height: `${nPos.height}%`,
                transform: "rotate(0deg)",
                transformOrigin:
                  project.notePivot === "right"
                    ? "100% 50%"
                    : project.notePivot === "left"
                    ? "0% 50%"
                    : project.notePivot ?? "0% 50%",
                color: "#000",
                textAlign: nAlign,
                fontFamily: "Kalam, cursive",
                fontSize: "1.1111cqw",
                fontStyle: "normal",
                fontWeight: 300,
                lineHeight: "100%",
                opacity: 0,
              }}
            >
              {project.noteText ?? DEFAULT_NOTE_TEXT}
            </p>

        {/* Curved arrow from the note down toward the card, animated via SVG path draw */}
        {(() => {
          const arw = project.arrow ?? DEFAULT_ARROW;
          const rot = arw.rotation ?? 0;
          return (
            <svg
              data-note-arrow-svg
              viewBox={arw.viewBox}
              fill="none"
              aria-hidden
              className="pointer-events-none absolute max-w-none"
              style={{
                left: `${arw.pos.left}%`,
                top: `${arw.pos.top}%`,
                width: `${arw.pos.width}%`,
                height: `${arw.pos.height}%`,
                opacity: 0,
                transform: rot ? `rotate(${rot}deg)` : undefined,
                transformOrigin: arw.transformOrigin ?? "center",
              }}
            >
              <g opacity="0.7">
                <path
                  data-note-arrow-path
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                  d={arw.pathD}
                  stroke="black"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  data-note-arrow-head
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                  d={arw.headD}
                  stroke="black"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill={arw.headFill ?? "none"}
                />
              </g>
            </svg>
          );
        })()}
          </div>
        );
      })()}

      {/* Slide counter, bottom left. Two weights and two sizes in one line, so
          it is a single baseline-aligned run rather than two blocks. */}
      {/* `left` is the navbar logo's own gutter ladder, copied verbatim, rather
          than a percentage of the stage — that is what puts the counter ON the
          logo's vertical axis instead of merely near it, and keeps the two
          together as the gutter steps up at each large breakpoint.

          Only `left` leaves the stage's proportional system; the type stays in
          cqw so it still scales with the composition. On a viewport wider than
          16:9 the stage is letterboxed and the counter follows the composition
          inward rather than the viewport edge — the right call there, since the
          whole frame is inset and tracking the raw gutter would strand the
          counter away from the artwork it belongs to. */}
      <p
        className="font-heading absolute whitespace-nowrap leading-none left-[clamp(1.5rem,5vw,6rem)] min-[1920px]:left-[clamp(2rem,5vw,8rem)] min-[2400px]:left-[clamp(2.5rem,5vw,10rem)] min-[2800px]:left-[clamp(3rem,5vw,12rem)] min-[3300px]:left-[clamp(3.5rem,5vw,15rem)] min-[3840px]:left-[clamp(4rem,5vw,18rem)] min-[4400px]:left-[clamp(4.5rem,5vw,22rem)]"
        style={{ top: `${POS.num.top}%` }}
      >
        {/* Counts with the slide. It changes on the beat the card is edge-on,
            so the swap is never caught mid-read. Zero-padded rather than
            hand-written so a fifth project needs no edit here. */}
        <span
          className="font-light text-black"
          style={{ fontSize: "5.2174cqw" }}
        >
          {String(index + 1).padStart(2, "0")}/
        </span>
        <span
          className="font-extralight"
          style={{ fontSize: "2.1739cqw", color: "#515151" }}
        >
          {String(PROJECT_COUNT).padStart(2, "0")}
        </span>
      </p>
    </div>
  );
}
