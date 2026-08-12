/**
 * Flat, spinning stand-in for the old real-geometry knot (three/torus-knot).
 *
 * Dropping the 3D canvas costs nothing visually: the mesh was deliberately
 * dead face-on with its only rotation about the screen normal (any x/y tilt
 * forshortens the three lobes unequally — see the old component's notes), and
 * a face-on z-spin is exactly what a 2D rotation of a flat image is. What it
 * buys: three/@react-three/fiber leave the bundle, and their per-frame render
 * loop stops competing with the hero's other animation.
 *
 * Asset choice: public/torus_knot.png is the design's own 201x200 render — the
 * same raster 3d.svg embeds. 3d.svg additionally bakes in the Figma frame's
 * placement, a uniform blur and a 1.24x horizontal squash; the placement and
 * blur are handled deliberately out here, and the squash was rejected back
 * when the 3D knot was sized (it distorts the geometry). So the PNG is the
 * clean source, and re-blurring an already-blurred file would compound.
 *
 * Geometry, measured off the decoded PNG (ink bbox 19,21 149x158):
 * - the ink's centre sits at 46.27% x 49.75% of the canvas, not its middle, so
 *   each copy is nudged +3.73% / +0.25% to land the KNOT on the container's
 *   centre — the hero's Figma-derived position is for the ink, not the file
 *   box — and the spin's transform-origin is that same ink centre, so the
 *   knot turns in place instead of orbiting the file box's midpoint.
 *
 * The left-heavier blur is two synchronized copies under complementary
 * horizontal masks: a heavy-blur copy visible on the left fading out to the
 * right, a light-blur copy the reverse. The masks sit on NON-rotating
 * wrappers, so the gradient stays screen-fixed while the knot turns beneath
 * it; and the two linear ramps mirror each other exactly, so their alphas sum
 * to 1 at every x and the crossfade never thins the ink.
 *
 * Spin direction is -360deg to preserve the old motion: the mesh rotated
 * positively about three.js's z with the camera on +z, which reads
 * counter-clockwise on screen, and positive CSS rotation is clockwise.
 * Keyframes and the reduced-motion guard live in globals.css.
 */
const COPIES = [
  { blur: "7px", mask: "linear-gradient(to right, black 15%, transparent 85%)" },
  {
    blur: "1.5px",
    mask: "linear-gradient(to right, transparent 15%, black 85%)",
  },
];

export function TorusKnotFlat({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="knot-float relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/torus_knot.png"
          alt=""
          className="knot-spin absolute h-full w-full object-fill"
          style={{
            transformOrigin: "46.27% 49.75%",
            left: "3.73%",
            top: "0.25%",
          }}
        />
      </div>
    </div>
  );
}
