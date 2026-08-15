"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

/** Full-width showreel that scales up and squares off as it enters. */
export function Reel() {
  const scope = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isIntersecting = false;
    video.muted = true;
    video.defaultMuted = true;

    const playVideo = () => {
      if (video.paused && document.visibilityState === "visible" && isIntersecting) {
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
        if (isIntersecting) {
          playVideo();
        } else {
          pauseVideo();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(video);

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isIntersecting) {
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
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-reel-frame]",
        { scale: 0.86, borderRadius: 48 },
        {
          scale: 1,
          borderRadius: 12,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top 85%",
            end: "top 25%",
            scrub: 0.4,
          },
        }
      );
      // subtle parallax inside the frame
      gsap.fromTo(
        "[data-reel-video]",
        { yPercent: -8 },
        {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={scope} className="px-5 pb-28 md:pb-40">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-ink md:text-3xl">
            Showreel &apos;26
          </h2>
          <span className="font-hand text-2xl text-moss">100% handmade motion ✳</span>
        </div>
        <div
          data-reel-frame
          className="overflow-hidden border-2 border-ink/80 will-change-transform"
        >
          <div className="aspect-video overflow-hidden">
            <video
              ref={videoRef}
              data-reel-video
              className="h-full w-full scale-[1.18] object-cover"
              src="/resources/bg5.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
            />
          </div>
        </div>
      </div>
    </section>
  );
}
