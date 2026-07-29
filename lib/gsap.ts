import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, InertiaPlugin, Physics2DPlugin);
}

export { gsap, ScrollTrigger };
