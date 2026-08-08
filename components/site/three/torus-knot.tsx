"use client";

import { useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { Mesh } from "three";
import { gsap } from "@/lib/gsap";

// Sampled straight out of public/3d.svg's embedded render so the real geometry
// matches the flat asset it replaces.
const BASE = "#30a878";
const SHADOW = "#208a5b";

/**
 * Horizontal squash, applied in screen space (see the group in `Knot`).
 *
 * There is no torus-knot parameter for this. `radius` and `tube` both scale the
 * loops evenly, so they can only make an opening bigger or smaller, never
 * narrower — closing the gap across x while leaving it long down y has to be a
 * non-uniform scale.
 *
 * The cost is that exact three-fold symmetry only holds under uniform scaling.
 * Each lobe points a different way, so a horizontal squash shortens each by a
 * different amount and they stop being congruent. That is inherent to
 * stretching the figure, not a bug to fix; keeping this mild is what stops it
 * from reading as lopsided.
 */
const KNOT_SQUASH_X = 0.85;

function Knot() {
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // A slow, continuous turn is the whole point of the piece — but honour a
    // reduced-motion preference by simply leaving it at its resting angle.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      // The ONLY rotation, and it has to stay that way. z is the normal to the
      // plane the trefoil lies in (the geometry spans ±1.5 in x/y but only ±0.5
      // in z), so spinning here turns the shape within its own plane: the
      // three-lobed silhouette is carried round rigidly and every lobe stays
      // exactly congruent with the others at every frame.
      //
      // Rotation about x or y does NOT do that. It tips the plane away from the
      // camera, which foreshortens each lobe by a different amount depending on
      // where it currently sits — so the lobes stop matching and the outline
      // goes lumpy. That is why the breathing tilt that used to live here is
      // gone; it was the direct cause of the shape looking irregular.
      //
      // Linear easing keeps it steady — any ease makes a looping spin visibly
      // pulse at the seam.
      gsap.to(mesh.rotation, {
        z: mesh.rotation.z + Math.PI * 2,
        duration: 34,
        ease: "none",
        repeat: -1,
      });

      // A barely-there vertical float, so it feels suspended
      // rather than pinned to the page.
      gsap.to(mesh.position, {
        y: 0.16,
        duration: 7,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    // Narrowed across x so each loop's opening closes up horizontally and the
    // shape draws out lengthways instead of sitting wide.
    //
    // The squash belongs on this group and NOT on the mesh. A mesh's own scale
    // is applied inside its rotation, so a local x-scale would turn with the
    // knot and the flattening would sweep round as it spins. Here the parent
    // transform applies after the child's rotation, which pins the squash to
    // the screen: the knot rotates behind a fixed distortion.
    <group scale={[KNOT_SQUASH_X, 1, 1]}>
      {/* Dead face-on, and deliberately so. The trefoil has exact three-fold
          symmetry only in its own plane: seen square-on, the three lobes are
          congruent, each one two near-straight flanks running out from the
          middle to a rounded outer corner. Any resting tilt (this used to be
          [0.34, 0.18, 0]) projects that plane at an angle, and since each lobe
          points a different way, each gets squashed by a different amount — the
          lobes come out unequal and the outline irregular. Depth still reads
          because the strand weaves ±0.5 in z, so the over/under crossings are
          plainly visible without tipping anything. */}
      <mesh ref={meshRef} rotation={[0, 0, 0]}>
      {/* p=2, q=3 — the trefoil in the source asset.

          Radius 1.1 with tube 0.215, a deliberate departure from the flat
          asset. Measuring the 201x200 PNG embedded in public/TorusKnot 4.svg
          (ink 147x158px, tube diameter ~23.4px) solves to T = 0.261-0.284, and
          the geometry sat at 0.26 to match. Drawn as real geometry that reads
          heavier than the render does, so the strand is slimmed and the curve
          it follows widened instead.

          The pair is what matters, not either number alone. Growing the radius
          while thinning the tube stretches each lobe rather than fattening it:
          the pipe drops from 14.8% of the knot's width to 11.5%, and the hole
          at the centre opens up by about 40%. That is what sharpens the
          silhouette into a clean three-cornered figure — a thicker tube fills
          those corners in and the whole thing reads as a rounded blob.

          Segments are deliberately extravagant: 600 along the tube, 64 around
          it. The trefoil curve is ~12 units long, so the old 190 put a segment
          every ~0.058u — coarse enough that the silhouette rippled, reading as
          a gentle waviness travelling along the tube. At 600/64 the facets are
          smaller than a pixel at any size this renders. It costs ~39k vertices,
          which is nothing for one static mesh, and buys a genuinely round tube. */}
      <torusKnotGeometry args={[1.1, 0.215, 600, 64, 2, 3]} />
      {/* Deliberately plain: fully matte, no specular lobe to travel across the
          tube as it turns.

          `dithering` is the important one. The knot is composited at 15%
          opacity, so its entire shading range is squeezed into roughly twenty
          8-bit levels — and a smooth gradient across twenty levels quantises
          into visible steps, which is exactly the "up and down" banding that
          survived the material being simplified. Dithering breaks those steps
          up with sub-level noise, and it is the fix for banding specifically;
          no amount of extra geometry or softer lighting removes it.

          The whisper of emissive keeps the shadow side from drifting grey. */}
      <meshStandardMaterial
        color={BASE}
        roughness={1}
        metalness={0}
        emissive={SHADOW}
        emissiveIntensity={0.12}
        dithering
      />
      </mesh>
    </group>
  );
}

export function TorusKnot3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        // `flat` = NoToneMapping. R3F defaults to ACES filmic, whose shoulder
        // rolls off the light end of the shading into an S-curve — on a single
        // flat-coloured object that shows up as an uneven ramp along the tube
        // rather than as the even falloff the source render has.
        flat
        // Was capped at 1.5 on the reasoning that blurred, low-opacity content
        // cannot show the difference. It can: at 1.5 the tube's silhouette is
        // reconstructed from too few samples and the edge shimmers as it turns.
        dpr={[1, 2]}
        // Effectively orthographic. The strand weaves ±0.5 in z, so under
        // perspective the parts nearer the camera project larger than the parts
        // behind — at the old z 15.2 / fov 20 that was ±3.3%, enough to stop the
        // three lobes measuring the same and to swell the tube wherever it
        // crosses in front of itself. Pulling back to z 80 and narrowing the fov
        // to 3.838 holds the frustum at the same ~5.36 units, so the framing is
        // untouched, but drops that variation to ±0.63% — near enough to a flat
        // projection that the lobes are congruent. A true orthographic camera
        // would be exact, but its zoom is tied to the canvas's pixel size, which
        // would peg the knot to a fixed size and break the responsive scaling.
        camera={{ position: [0, 0, 80], fov: 3.838 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        {/* Two lights, not four. The old rig added a cool rim from behind and a
            coloured bounce, which cross-lit the tube and banded its shade as it
            rotated. Ambient carries most of the exposure and the single key only
            models the form — the surface stays evenly lit end to end, so nothing
            travels across it as it turns. The ratio is pushed further than
            before (1.3 : 0.7) because every bit of contrast removed here is
            contrast that cannot band once this is composited at 15% opacity. */}
        <ambientLight intensity={1.3} />
        {/* Key light, upper-left — matches the highlight direction baked into
            the original render. */}
        <directionalLight position={[-3, 4, 4]} intensity={0.7} color="#ffffff" />
        <Knot />
      </Canvas>
    </div>
  );
}
