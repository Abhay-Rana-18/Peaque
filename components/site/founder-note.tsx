"use client";

import { motion } from "motion/react";
import { Reveal } from "./reveal";
import { ArrowCurve, ArrowShort, Asterisk, Sparkle, Tape } from "./doodles";

const drawIn = (delay: number, duration = 0.8) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, margin: "-60px" },
  transition: { delay, duration, ease: "easeInOut" as const },
});

/** Tiny colored-pencil doodles dotted through the note, reference-style. */
function Doodle({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex size-6 shrink-0 align-[-0.2em]">
      {children}
    </span>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 20 20" filter="url(#pencil-stroke)" aria-hidden>
      <path
        d="M10 17 C 4 12, 2 7, 5.5 4.8 C 8 3.2, 10 5, 10 6.5 C 10 5, 12 3.2, 14.5 4.8 C 18 7, 16 12, 10 17 Z"
        fill="#e05d4f"
      />
    </svg>
  );
}

function Smile() {
  return (
    <svg viewBox="0 0 20 20" fill="none" filter="url(#pencil-stroke)" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="#4a7fd4" strokeWidth="2" />
      <circle cx="7.2" cy="8.2" r="1.2" fill="#4a7fd4" />
      <circle cx="12.8" cy="8.2" r="1.2" fill="#4a7fd4" />
      <path
        d="M6.5 12.2 C 8 14.4, 12 14.4, 13.5 12.2"
        stroke="#4a7fd4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Grow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" filter="url(#pencil-stroke)" aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#4f9d5f" />
      <path
        d="M10 14.5 V 6 M6.8 9 L 10 5.5 L 13.2 9"
        stroke="#fffdf6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Focus() {
  return (
    <svg viewBox="0 0 20 20" fill="none" filter="url(#pencil-stroke)" aria-hidden>
      <circle cx="10" cy="10" r="8" stroke="#8a5fc9" strokeWidth="2" />
      <circle cx="10" cy="10" r="3" fill="#8a5fc9" />
    </svg>
  );
}

/** Flanking margin doodles — colored pencil, drawn in on scroll. */
function SpiralDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" filter="url(#pencil-stroke)" aria-hidden className={className}>
      <motion.path
        d="M22 19 C 26 16, 26 24, 19 24 C 10 24, 10 12, 20 10 C 32 8, 36 24, 25 30 C 12 37, 2 24, 7 12"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        {...drawIn(0.5, 1)}
      />
    </svg>
  );
}

function StarDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" filter="url(#pencil-stroke)" aria-hidden className={className}>
      <motion.path
        d="M20 3 L24.2 14.8 L37 15 L27 22.6 L30.8 35 L20 27.6 L9.2 35 L13 22.6 L3 15 L15.8 14.8 Z"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...drawIn(0.35, 1.1)}
      />
    </svg>
  );
}

function HeartOutline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" filter="url(#pencil-stroke)" aria-hidden className={className}>
      <motion.path
        d="M10 17 C 4 12, 2 7, 5.5 4.8 C 8 3.2, 10 5, 10 6.5 C 10 5, 12 3.2, 14.5 4.8 C 18 7, 16 12, 10 17 Z"
        stroke="#e05d4f"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...drawIn(0.7, 0.8)}
      />
    </svg>
  );
}

function Paperclip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 44" fill="none" aria-hidden className={className}>
      <path
        d="M7 30 V11 a7 7 0 0 1 14 0 v22 a5 5 0 0 1 -10 0 V13 a2.5 2.5 0 0 1 5 0 v18"
        stroke="#7a8070"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FounderNote() {
  return (
    <section className="px-5 py-28 md:py-36">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="font-hand text-2xl text-moss md:text-3xl">
            a note from the studio
          </p>
        </Reveal>

        <div className="relative mt-10">
          {/* left margin decorations */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-44 hidden w-40 lg:block"
          >
            <p className="absolute right-2 top-2 -rotate-6 font-hand text-2xl text-moss">
              our story
            </p>
            <ArrowCurve className="absolute right-4 top-12 w-14 rotate-[-15deg] text-moss" delay={0.3} />
            <SpiralDoodle className="absolute left-4 top-[38%] w-16 text-[#4a7fd4]" />
            <HeartOutline className="absolute bottom-[24%] right-8 w-10 rotate-12" />
            <Asterisk className="absolute bottom-8 left-8 w-8 text-moss" delay={0.8} />
          </div>

          {/* right margin decorations */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -right-44 hidden w-40 lg:block"
          >
            <StarDoodle className="absolute left-4 top-8 w-16 rotate-6 text-[#dfa53a]" />
            <Sparkle className="absolute right-6 top-[40%] w-10 text-[#8a5fc9]" delay={0.6} />
            <ArrowShort className="absolute bottom-[26%] left-2 w-12 -scale-x-100 text-[#4f9d5f]" delay={0.9} />
            <Tape className="bottom-10 right-8 rotate-12" rotate={12} />
          </div>

          <Reveal delay={0.12}>
            <figure className="relative -rotate-[1.2deg] rounded-2xl bg-white p-8 shadow-[0_18px_50px_-12px_rgb(38_49_28/0.3)] md:p-14">
              {/* crumpled-paper relief */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-60 mix-blend-multiply filter-[url(#crumple)]"
              />
              <Tape className="-top-3 left-1/2 -ml-12" rotate={-5} />
              <Tape className="-bottom-3 right-10" rotate={7} />
              <Paperclip className="absolute -top-4 left-10 w-7 rotate-[-14deg]" />

              <div className="relative space-y-7 font-hand text-2xl leading-snug text-ink/85 md:text-[1.8rem]">
                <p>
                  We started Peaque to give AI startups an easy way to get
                  high-quality motion and design without the stress of finding
                  the <Doodle><Smile /></Doodle> perfect studio for your launch
                  or your growing team.
                </p>
                <p>
                  We work like an in-house team and treat every project like
                  it&apos;s <Doodle><Heart /></Doodle> our own. To keep our work
                  top-notch, we only take on a few projects at a time.
                </p>
                <p>
                  Our goal is to help you <Doodle><Grow /></Doodle> grow, so you
                  can <Doodle><Focus /></Doodle> focus on what matters most to
                  you while we handle everything that moves.
                </p>
              </div>

              <figcaption className="relative mt-10 -rotate-2 font-hand text-2xl text-moss md:text-3xl">
                With love,
                <br />
                Team Peaque ✳
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
