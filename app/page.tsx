import { Loader } from "@/components/site/loader";
import { SmoothScroll } from "@/components/site/smooth-scroll";
import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { Statement } from "@/components/site/statement";
import { Flip } from "@/components/site/flip";
import { Reel } from "@/components/site/reel";
import { Services } from "@/components/site/services";
import { Work } from "@/components/site/work";
import { Why } from "@/components/site/why";
import { Pricing } from "@/components/site/pricing";
import { FounderNote } from "@/components/site/founder-note";
import { Cta } from "@/components/site/cta";
import { Footer } from "@/components/site/footer";

export default function Home() {
  return (
    <>
      <Loader />
      <SmoothScroll />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Statement />
        <Flip />
        <Reel />
        <Services />
        <Work />
        <Why />
        <Pricing />
        <FounderNote />
        <Cta />
        <Footer />
      </main>
    </>
  );
}
