/**
 * Global SVG filters that give strokes and handwriting a graphite feel:
 *
 * - `#pencil-stroke` — for doodle strokes (underlines, scribbles, arrows).
 *   A coarse turbulence displaces the path so no curve is perfectly smooth,
 *   then fine noise erodes the alpha so the line has the patchy pressure
 *   of graphite dragged over paper tooth.
 * - `#pencil-text` — a gentler variant for handwritten (Caveat) text:
 *   subtler wobble, lighter grain, so words stay legible.
 *
 * Mounted once in the root layout; referenced via `filter: url(#…)`.
 */
export function PencilDefs() {
  return (
    <svg aria-hidden className="absolute h-0 w-0 overflow-hidden">
      <defs>
        <filter id="pencil-stroke" x="-20%" y="-80%" width="140%" height="260%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03 0.06"
            numOctaves="2"
            seed="8"
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="3.5"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves="3"
            seed="2"
            result="noise"
          />
          <feColorMatrix in="noise" type="luminanceToAlpha" result="na" />
          <feComponentTransfer in="na" result="grain">
            <feFuncA type="linear" slope="1.9" intercept="0.28" />
          </feComponentTransfer>
          <feComposite in="rough" in2="grain" operator="in" />
        </filter>

        {/* crumpled-paper relief: lit fractal noise, multiplied over the sheet.
            Low base frequency gives big fold creases; high octaves add wrinkles. */}
        <filter id="crumple">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves="6"
            seed="4"
            result="noise"
          />
          <feDiffuseLighting
            in="noise"
            lightingColor="#ffffff"
            surfaceScale="2.8"
          >
            <feDistantLight azimuth="45" elevation="50" />
          </feDiffuseLighting>
        </filter>

        <filter id="pencil-text" x="-15%" y="-30%" width="130%" height="160%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.03"
            numOctaves="2"
            seed="5"
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.4"
            numOctaves="3"
            seed="11"
            result="noise"
          />
          <feColorMatrix in="noise" type="luminanceToAlpha" result="na" />
          <feComponentTransfer in="na" result="grain">
            <feFuncA type="linear" slope="1.6" intercept="0.45" />
          </feComponentTransfer>
          <feComposite in="rough" in2="grain" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}
