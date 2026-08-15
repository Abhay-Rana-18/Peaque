"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Reveal } from "./reveal";
import { ArrowShort } from "./doodles";

const projects = [
  {
    src: "/resources/bg7.mp4",
    title: "Nebula AI — Launch Film",
    tag: "motion graphics",
  },
  {
    src: "/resources/bg3.mp4",
    title: "Flowstack — Product Explainer",
    tag: "explainer video",
  },
  {
    src: "/resources/bg4.mp4",
    title: "Quantis — Brand Reel",
    tag: "motion identity",
  },
  {
    src: "/resources/bg6.mp4",
    title: "Aurora — Website & Motion",
    tag: "web + motion",
  },
];

function WorkCard({ src, title, tag }: (typeof projects)[number]) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isIntersecting = false;
    video.muted = true;
    video.defaultMuted = true;

    const playVideo = () => {
      if (playing && video.paused && document.visibilityState === "visible" && isIntersecting) {
        video.play().catch(() => {});
      }
    };

    const pauseVideo = () => {
      if (!video.paused) {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersecting = entry?.isIntersecting ?? false;
        if (isIntersecting && playing) {
          playVideo();
        } else {
          pauseVideo();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(video);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && playing && isIntersecting) {
        playVideo();
      } else {
        pauseVideo();
      }
    };

    video.addEventListener("canplay", playVideo);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      observer.disconnect();
      video.removeEventListener("canplay", playVideo);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [src, playing]);

  const play = () => {
    videoRef.current?.play().catch(() => {});
    setPlaying(true);
  };
  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => (playing ? pause() : play())}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        className="relative block w-full cursor-pointer overflow-hidden rounded-xl border-2 border-ink/80"
      >
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
        />
        <span
          className={`absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border-2 border-ink bg-cream/90 text-ink transition-all duration-300 ${
            playing
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-100 group-hover:-rotate-6"
          }`}
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </span>
      </button>
      <div className="flex items-baseline justify-between gap-3 pt-4">
        <h3 className="font-heading text-lg font-bold text-ink md:text-xl">
          {title}
        </h3>
        <span className="shrink-0 font-hand text-xl text-moss">{tag}</span>
      </div>
    </div>
  );
}

export function Work() {
  return (
    <section id="work" className="scroll-mt-24 px-5 py-28 md:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-hand text-2xl text-moss md:text-3xl">
                the good stuff
              </p>
              <h2 className="mt-3 font-heading text-4xl font-black tracking-tight text-ink md:text-6xl">
                Work we&apos;re weirdly proud of.
              </h2>
            </div>
            <div className="hidden items-center gap-2 pb-3 md:flex">
              <span className="font-hand text-2xl text-ink/50">
                hover to press play
              </span>
              <ArrowShort className="w-10 text-ink/50" delay={0.3} />
            </div>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.src} delay={(i % 2) * 0.12} className={i % 2 === 1 ? "md:mt-16" : ""}>
              <WorkCard {...p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
