# Hero Section — On-Load Animation Spec

> **Purpose:** implementation contract for the hero on-load sequence, reverse-engineered
> frame-by-frame from `Animation.mp4` (2880×1620 @ 60 fps, 6.25 s = 375 frames).
> The recording is a 2× capture of a **1440 × 810 CSS viewport**.
> All timings below are **seconds from page load** (video t=0 = load).
> All pixel values are **CSS px at a 1440 px-wide viewport** unless marked otherwise.
>
> **The layout/markup already exists and is responsive. This spec adds motion only.
> Do not change the existing DOM structure, styles, or breakpoints beyond what is
> strictly required to attach animations (wrapper spans, `will-change`, initial hidden state).**

---

## 1. The sequence at a glance

| # | Stage | Window | What happens |
|---|-------|--------|--------------|
| 0 | **Preloader** | 0.00 → 1.19 s | Full-screen dark-green overlay. A white cursive signature (the logo's swash) **draws itself**, then **erases itself** from the start of the path. |
| 1 | **Curtain lift** | 0.97 → 1.63 s | The green overlay slides **up** off-screen, wiping the hero into view from the bottom edge. Overlaps the tail of the signature erase. |
| 2 | **Headline cascade** | 1.50 → 3.05 s | Headline builds **word by word** (9 words + 4 inline badges), each fading up. The block is centre-anchored, so it drifts upward as lines are added. |
| 3 | **Figma beat** | 3.02 → 3.55 s | "Design" swaps font, a Figma selection frame snaps around it, the collaborator cursor settles, a 2nd social icon fans out. |
| 4 | **Hand-drawn accents** | 3.43 → 5.55 s | Orange underline draws under "Founders", then the left tag + arrow, then the right note + squiggle. |
| — | **Rest** | ≥ 5.6 s | Fully static. No idle/loop animations anywhere. |

**Total runtime ≈ 5.6 s.**

### CRITICAL — what does *not* animate

Measured pixel-diff against the final frame is **exactly 0** from the moment the curtain
clears. These elements are simply *revealed* by the wipe and must have **no entrance
animation of their own**:

- Header: logo, nav links (`Why us? / Plans / Services / Work`), `Contact Us` button
- Page background: cream fill, dot grid, diagonal light streaks
- Blurred green 3D knot blob (bottom-left)
- Circular scroll-down indicator (bottom-right)

They must be rendered at final opacity/position **behind** the overlay so the curtain
reveals them already in place. Do not fade them in. Do not add a float/bob loop to the
scroll indicator — there is none in the reference.

---

## 2. Stage 0 — Preloader signature

**Overlay:** full viewport, `background: #045602`, `position: fixed; inset: 0; z-index: 9999`.

**Mark:** the cursive swash from the `℮Peaque` logo, as a single **SVG path**, white stroke,
~3 px stroke-width, ~**138 × 45 px**, centred in the viewport (both axes).

### 2a. Draw

| Property | Value |
|---|---|
| Technique | `stroke-dasharray` = path length, animate `stroke-dashoffset` → 0 |
| Start | **0.09 s** |
| End | **0.85 s** (duration ≈ 0.76 s) |
| Easing | reads close to `linear`, very slightly front-loaded — `linear` or `power1.out` both match |
| Line cap | `round` |

### 2b. Erase (tail chases the head)

The path does **not** fade out — the *start* of the stroke retreats along the path while
the head is already finished, so the visible segment shrinks to nothing at the far end.

| Property | Value |
|---|---|
| Technique | second dash offset / trim-path **start** → 1 (see snippet below) |
| Start | **0.80 s** (overlaps the last ~50 ms of the draw) |
| End | **1.19 s** (duration ≈ 0.39 s) |
| Easing | slightly accelerating — `power1.in` |

```js
// Two-value trim on one path (no library needed):
// dasharray "visibleLen, gap" + dashoffset drives head; animating dasharray drives tail.
// Easiest reliable implementation = two stacked copies:
//   pathDraw  : dashoffset  L -> 0     (0.09s, 0.76s)
//   pathMask  : same path, stroke = overlay colour, dashoffset L -> 0 (0.80s, 0.39s)
// The mask copy paints over the drawn stroke in the background green, producing the erase.
```

---

## 3. Stage 1 — Curtain lift

The green overlay translates **up and out**. Because the hero is static underneath, the
white page appears to grow from the **bottom edge upward**.

| Property | Value |
|---|---|
| Element | the `#045602` preloader overlay |
| Transform | `translateY(0)` → `translateY(-100%)` |
| Start | **0.967 s** |
| End | **1.633 s** |
| Duration | **0.667 s** |
| Easing | **`cubic-bezier(0.9, 0.02, 0.6, 0.95)`** |

> The easing was numerically fitted to 41 sampled frames (SSE ≈ 0.0014 — essentially exact).
> It is a **hard ease-in with a soft landing**: barely moves for the first half, then snaps
> up and cushions. Reference progress points: 30 % of time → 5 % moved, 50 % → 18 %,
> 70 % → 53 %, 80 % → 83 %, 90 % → 96 %. Do **not** substitute `ease-in-out` — it kills the effect.
>
> After the transform completes, set `pointer-events: none` and unmount / `display:none`
> the overlay.

---

## 4. Stage 2 — Headline word cascade

### 4a. Final copy & styling (for reference — already built)

```
Retention Driven
Motion (→) & Design
for Results (in)(ig) Oriented
Founders.
```

| Token | Font | Colour |
|---|---|---|
| `Retention`, `Results` | sans **bold** | `#153101` (deep green) |
| `Driven`, `Motion`, `&`, `for`, `Oriented` | sans **regular** | `#000000` |
| `Design` | **starts** in a handwritten script face, **swaps** at 3.02 s to a light rounded geometric sans | `#000000` → grey-black |
| `Founders` | sans **bold italic** | `#153101` |
| `.` after Founders | — | `#E5735B` (orange) |

Metrics at 1440 px viewport: font-size ≈ **62 px**, line-height ≈ **66 px** (≈1.06),
block width ≈ **678 px**, block horizontally centred (measured centre 48.9 % of viewport —
treat as centred), block **vertically centred** in the hero.

### 4b. Per-item entrance tween (identical for every word)

| Property | From | To |
|---|---|---|
| `opacity` | 0 | 1 |
| `transform` | `translateY(24px)` | `translateY(0)` |

| | |
|---|---|
| Duration | **0.50 s** |
| Easing | **`power3.out`** / `cubic-bezier(0.165, 0.84, 0.44, 1)` |
| Notes | No blur, no scale, no per-character split. **Word-level only.** Verified: a word reads solid ~0.2 s after its onset and finishes settling ~0.3–0.35 s after — that is exactly what a 0.5 s `power3.out` produces. |

### 4c. Exact onset table

`t` = the frame where the item first becomes visible (its tween's start).

| # | Item | Onset (s) | Δ from prev | Entrance |
|---|------|-----------|-------------|----------|
| 1 | `Retention` | **1.50** | — | word tween |
| 2 | `Driven` | **1.72** | +0.22 | word tween |
| 3 | `Motion` | **1.96** | +0.24 | word tween |
| 4 | **orange arrow pill** | **2.03** | +0.07 | `scale 0→1`, 0.25 s, `back.out(1.4)`-ish (no visible overshoot; `power2.out` also fine) |
| 5 | `&` | **2.21** | +0.18 | word tween |
| 6 | `Design` | **2.32** | +0.11 | word tween |
| 7 | **collaborator cursor** (`Abhay`) | **2.10** | — | slides in from **off-screen right**, travels up-left toward "Design" (see §5a) |
| 8 | `for` | **2.47** | +0.15 | word tween |
| 9 | `Results` | **2.56** | +0.09 | word tween |
| 10 | **LinkedIn icon** | **2.76** | +0.20 | `scale 0→1`, **0.11 s** — a fast snap, noticeably quicker than the arrow pill |
| 11 | `Oriented` | **2.90** | +0.14 | word tween |
| 12 | `Founders` + orange `.` | **2.99** | +0.09 | word tween |

> The cadence is **hand-tuned, not a uniform stagger** (gaps range 0.07 → 0.24 s).
> Use the absolute onsets above rather than a single `stagger` value. If you must
> approximate with a uniform stagger, use **0.18 s** — but the table is the ground truth.

### 4d. Block re-centring (important, easy to get wrong)

The headline block is **vertically centred**, so every new line pushes the whole block
upward. Measured: line 1's top edge travels **135 → 93** (analysis scale) = **126 CSS px
upward** over the whole cascade, and the drift is **smooth and continuous, never a jump**.

Horizontally the lines are also centred, so appending `& Design` visibly slides
`Motion (→)` to the **left** as it lands.

Implementation options, in order of preference:

1. **Framer Motion `layout` prop** on the headline container/lines — gives the smooth
   re-centre for free. Pair with `transition={{ layout: { duration: 0.5, ease: [0.165,0.84,0.44,1] } }}`.
2. **GSAP Flip** on each line insertion.
3. Manual: keep all 4 lines in the DOM at full height from the start and animate the
   container's `translateY` from `+126px` → `0` in 3 eased steps timed to line 2 (1.96 s),
   line 3 (2.47 s) and line 4 (2.99 s).

Do **not** let lines pop in with `display:none` → `block`, which produces a stepped jump.

---

## 5. Stage 3 — The "Figma" beat

This is the signature moment of the piece; get these four details right.

### 5a. Collaborator cursor `Abhay`

- Green arrow pointer + rounded label pill, pill fill `#277802`, white text. Arrow points **left** (◄) on entry.
- **2.10 s** — crosses the **right edge** of the viewport at roughly **60 % viewport height**.
- **2.10 → 2.95 s** (≈0.85 s) — glides **up and to the left** toward the word "Design",
  strongly decelerating. Measured centre path (CSS px @1440): `(1440, 486) → (1011, 369)`.
  Easing: `power3.out`. Nearly all of the travel happens in the first 0.35 s.
- **3.17 → 3.45 s** — after the click beat, it **retreats ~45 px right and ~6 px down**
  and the arrow **rotates** from ◄ to a standard down-left pointer, as if it just released
  the resize handle. Final centre ≈ `(1056, 375)`.
- Completely static after **3.45 s**.

### 5b. `Design` font swap + selection frame — **3.02 s, single frame, no transition**

At exactly 3.02 s (frame 182), on the **same frame**:

- `Design` switches from the **handwritten script face** to a **light rounded geometric sans**
  (Quicksand / Comfortaa weight-300 look). Instant swap — no crossfade.
- A **Figma selection frame** appears around it: 1 px dotted/dashed border, small square
  corner handles, plus a vertical grey resize bar just outside the right edge with a small
  green pill handle below it.
- The frame **does not resize** afterwards — it stays fixed once shown. (Verified across
  3.05 → 3.68 s.)

### 5c. Instagram icon fans out

| | |
|---|---|
| Onset | **3.37 s** |
| Settle | **3.55 s** (duration ≈ 0.18 s) |
| Motion | emerges from **behind** the LinkedIn icon, sliding left + rotating ~-12° into a fanned/stacked arrangement |
| Easing | `power2.out` |

Final look: both icons are ~42 px rounded squares, slightly rotated in opposite directions,
overlapping like a small stack of cards, inline inside line 3.

---

## 6. Stage 4 — Hand-drawn accents

All four are **SVG stroke-draw** (`stroke-dashoffset`) or fades — none use scale/opacity pops.

| Element | Start | End | Duration | Technique |
|---|---|---|---|---|
| **Orange underline** under `Founders` | **3.57** | **3.90** | 0.33 s | stroke draw, **left → right**, colour `#E5735B`, hand-drawn wobble, ~288 px long, sits just below the baseline |
| **Left tag** `For Socials, Apps, Websites & Products` | **3.43** | **3.62** | 0.19 s | fade in (+ small rise). Light-grey pill/tag, rotated ≈ **-8°**, sits upper-left of the headline |
| **Left curved arrow** (tag → `Retention`) | **3.68** | **4.55** | **0.87 s** | stroke draw from the tag downward-right, with an arrowhead at the end. Slowest draw in the piece — deliberately unhurried |
| **Right note** `We give every project the love and affection it deserves. :)` | **4.35** | **4.52** | 0.17 s | fade in. Grey handwritten-style text, 2 lines, rotated ≈ **-6°**, upper-right |
| **Right squiggle** (curly line under the note) | **4.45** | **5.55** | **1.10 s** | stroke draw, starts as a small hook on the left, loops right then curls down-left. Longest tween in the piece |

Easing for the stroke draws: `power1.inOut` matches the observed pen-speed profile.
Arrowheads should appear only at the very end of their path (draw them as part of the
same path so the dash reveal handles it).

---

## 7. Colour tokens (sampled from the video)

| Token | Hex | Used for |
|---|---|---|
| `--preloader-green` | `#045602` | preloader overlay |
| `--bg-cream` | `#FFFEF9` | page background |
| `--green-ink` | `#153101` | `Retention`, `Results`, `Founders` |
| `--green-cursor` | `#277802` | `Abhay` cursor pill + arrow |
| `--orange` | `#E5735B` | arrow pill fill, `Founders.` period, underline |
| `--black` | `#000000` | regular headline words |
| `--grey-annotation` | ~`#9A9A9A` | left tag text, right note, hand-drawn arrows/squiggle |
| `--btn-border` | ~`#E5E6E1` | `Contact Us` outline, scroll-indicator ring |

---

## 8. Copy-paste GSAP timeline

Absolute times via the position parameter, so the table above maps 1:1.

```js
import gsap from "gsap";

const EASE_WORD    = "power3.out";
const EASE_CURTAIN = "cubic-bezier(0.9, 0.02, 0.6, 0.95)"; // use CustomEase, or the raw values below

gsap.registerPlugin(/* CustomEase */);
// CustomEase.create("curtain", "M0,0 C0.9,0.02 0.6,0.95 1,1");

const wordIn = { opacity: 0, y: 24 };

const tl = gsap.timeline({ defaults: { ease: EASE_WORD } });

/* ---------- Stage 0 : signature ---------- */
tl.fromTo("#sig-draw", { strokeDashoffset: (i, el) => el.getTotalLength() },
                       { strokeDashoffset: 0, duration: 0.76, ease: "none" }, 0.09)
  .fromTo("#sig-erase", { strokeDashoffset: (i, el) => el.getTotalLength() },
                        { strokeDashoffset: 0, duration: 0.39, ease: "power1.in" }, 0.80)

/* ---------- Stage 1 : curtain ---------- */
  .to("#preloader", { yPercent: -100, duration: 0.667, ease: "curtain",
                      onComplete: () => document.querySelector("#preloader").remove() }, 0.967)

/* ---------- Stage 2 : headline cascade ---------- */
  .from(".w-retention", { ...wordIn, duration: 0.5 }, 1.50)
  .from(".w-driven",    { ...wordIn, duration: 0.5 }, 1.72)
  .from(".w-motion",    { ...wordIn, duration: 0.5 }, 1.96)
  .from(".badge-arrow", { scale: 0, opacity: 0, duration: 0.25, ease: "power2.out",
                          transformOrigin: "50% 50%" },                 2.03)
  .from(".w-amp",       { ...wordIn, duration: 0.5 }, 2.21)
  .from(".w-design",    { ...wordIn, duration: 0.5 }, 2.32)
  .fromTo(".cursor-abhay", { x: 429, y: 117, autoAlpha: 1 },  // offsets from its FINAL rest spot
                           { x: 0, y: 0, duration: 0.85, ease: "power3.out" },  2.10)
  .from(".w-for",       { ...wordIn, duration: 0.5 }, 2.47)
  .from(".w-results",   { ...wordIn, duration: 0.5 }, 2.56)
  .from(".badge-li",    { scale: 0, opacity: 0, duration: 0.11, ease: "power2.out",
                          transformOrigin: "50% 50%" },                 2.76)
  .from(".w-oriented",  { ...wordIn, duration: 0.5 }, 2.90)
  .from(".w-founders",  { ...wordIn, duration: 0.5 }, 2.99)

/* ---------- Stage 3 : Figma beat ---------- */
  .set(".w-design",     { className: "+=is-selected" },                  3.02) // font swap
  .set(".selection-frame", { autoAlpha: 1 },                             3.02)
  .to(".cursor-abhay",  { rotate: -38, x: "+=45", y: "+=6",
                          duration: 0.28, ease: "power2.out" },          3.17)
  .from(".badge-ig",    { x: 14, rotate: 12, opacity: 0, scale: 0.6,
                          duration: 0.18, ease: "power2.out" },          3.37)

/* ---------- Stage 4 : accents ---------- */
  .from(".tag-left",    { opacity: 0, y: 10, duration: 0.19 },           3.43)
  .fromTo("#underline", { strokeDashoffset: (i,el)=>el.getTotalLength() },
                        { strokeDashoffset: 0, duration: 0.33, ease: "power1.inOut" }, 3.57)
  .fromTo("#arrow-left",{ strokeDashoffset: (i,el)=>el.getTotalLength() },
                        { strokeDashoffset: 0, duration: 0.87, ease: "power1.inOut" }, 3.68)
  .from(".note-right",  { opacity: 0, y: 8, duration: 0.17 },            4.35)
  .fromTo("#squiggle",  { strokeDashoffset: (i,el)=>el.getTotalLength() },
                        { strokeDashoffset: 0, duration: 1.10, ease: "power1.inOut" }, 4.45);
```

**Framer Motion equivalent:** same numbers — put each item's onset in `transition.delay`,
use `ease: [0.165, 0.84, 0.44, 1]` for words and `[0.9, 0.02, 0.6, 0.95]` for the curtain,
and add `layout` to the headline lines for the re-centring in §4d.

---

## 9. Required guard-rails

- **FOUC / flash:** every animated item must start hidden **in CSS**, not via JS on mount,
  or the full headline flashes before the timeline runs. The preloader overlay must paint
  on the very first frame.
- **Scroll lock:** lock `body` scroll from 0 s until the curtain finishes (1.63 s), then release.
- **Fonts:** the headline uses ≥3 faces (sans regular, sans bold, script, rounded light) —
  preload them and gate the timeline on `document.fonts.ready`, otherwise the word widths
  reflow mid-cascade and the centring jumps.
- **`prefers-reduced-motion: reduce`:** skip the whole thing. Show the final hero state
  immediately; no preloader, no cascade. At most a single 200 ms opacity fade.
- **Run once per session** (`sessionStorage` flag) if the hero re-mounts on client-side
  navigation — a 5.6 s preloader on every route change is punishing.
- **Performance:** animate only `opacity` / `transform` / `stroke-dashoffset`.
  Add `will-change: transform, opacity` to the animated nodes and remove it on complete.
- **Responsive:** the timeline is resolution-independent — keep the same times at every
  breakpoint. Only scale the distance values (`translateY 24px`, cursor travel, block drift)
  with the existing type scale. On < 768 px, consider dropping the left tag, left arrow,
  right note and squiggle (stages at 3.43 s +) entirely — they have no room — and ending
  the sequence at ~3.9 s.

---

## 10. Acceptance checklist

- [ ] Signature draws in ~0.76 s, then **erases from its start** (does not fade out).
- [ ] Curtain slides **up**, revealing from the **bottom**, in 0.667 s with the hard-in/soft-out ease.
- [ ] Header, background, blob and scroll indicator are **already in place** when the curtain clears — zero entrance animation.
- [ ] "Retention" appears at 1.50 s, "Founders" at 2.99 s; all 9 words + 4 badges match the §4c table within ±40 ms.
- [ ] Headline block drifts **smoothly** upward (~126 px total) and re-centres horizontally as lines are added — no jumps.
- [ ] "Design" font swap and the selection frame land on the **same frame** at 3.02 s.
- [ ] Instagram icon fans out from *behind* LinkedIn at 3.37 s.
- [ ] Underline draws left→right 3.57 → 3.90 s.
- [ ] Left arrow (0.87 s) and right squiggle (1.10 s) are visibly slower than everything else.
- [ ] Everything is completely static from 5.6 s onward — no idle loops.
- [ ] Reduced-motion path renders the final state instantly.
