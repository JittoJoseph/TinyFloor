"use client";

import React, { useEffect, useRef, useState } from "react";
import { Video, Zap, Map, Smile } from "lucide-react";

const featureList = [
  {
    icon: Video,
    title: "Proximity Video",
    desc: "Walk up to anyone to instantly start a video or voice call.",
  },
  {
    icon: Map,
    title: "Retro Office",
    desc: "Hang out and collaborate in a cozy, cute 16-bit virtual workspace.",
  },
  {
    icon: Smile,
    title: "Custom Avatars",
    desc: "Express yourself with one of our many custom pixel-art characters.",
  },
  {
    icon: Zap,
    title: "Real-Time Sync",
    desc: "Experience seamless movement and interactions across the map.",
  },
];

const FeatureCard = ({ feature }: { feature: (typeof featureList)[0] }) => {
  const [isInView, setIsInView] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "-20% 0px -20% 0px",
        threshold: 0,
      },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  return (
    <div ref={cardRef} className="flex flex-col gap-5 md:gap-6">
      <div
        className={`w-full h-40 md:h-64 rounded-3xl flex items-center justify-center border transition-all duration-700 ease-out relative overflow-hidden ${
          isInView
            ? "bg-[#f4f4f0] border-[rgba(0,0,0,0.1)] shadow-[0_20px_50px_rgba(0,0,0,0.05),inset_0_2px_10px_rgba(255,255,255,1)] scale-100"
            : "bg-[#e8e8e3] border-[rgba(0,0,0,0.06)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] scale-[0.98]"
        }`}
      >
        <div
          className={`relative transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isInView
              ? "scale-110 opacity-100 translate-y-0"
              : "scale-75 opacity-20 translate-y-4"
          }`}
        >
          <feature.icon
            className={`w-14 h-14 md:w-20 md:h-20 transition-colors duration-1000 ${
              isInView
                ? "text-[var(--color-braun-orange)]"
                : "text-[rgba(0,0,0,0.2)]"
            }`}
            strokeWidth={1.2}
          />
        </div>
      </div>

      <div
        className={`pl-4 md:pl-6 transition-all duration-700 ${
          isInView
            ? "border-[var(--color-braun-text)]"
            : "border-[rgba(0,0,0,0.1)]"
        }`}
      >
        <h3
          className={`font-body text-xl md:text-2xl font-medium text-[var(--color-braun-text)] mb-1 md:mb-3 tracking-tight leading-snug transition-opacity duration-700 ${
            isInView ? "opacity-100" : "opacity-60"
          }`}
        >
          {feature.title}
        </h3>
        <p
          className={`font-body text-sm md:text-base text-[var(--color-braun-text)] leading-relaxed max-w-sm transition-opacity duration-700 ${
            isInView ? "opacity-70" : "opacity-40"
          }`}
        >
          {feature.desc}
        </p>
      </div>
    </div>
  );
};

export const Features: React.FC = () => {
  return (
    <section
      id="features"
      className="py-12 md:py-20 px-4 md:px-8 max-w-6xl mx-auto w-full relative"
    >
      <div className="flex flex-col md:flex-row gap-8 md:gap-16">
        <div className="md:w-5/12 flex-shrink-0 relative">
          <div className="sticky top-20 md:top-1/2 md:-translate-y-1/2 z-10 bg-[var(--color-braun-bg)]/90 backdrop-blur-sm md:backdrop-blur-none py-4 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 transition-transform duration-300">
            <h2 className="font-body text-[2rem] md:text-5xl font-light text-[var(--color-braun-text)] leading-[1.1] tracking-tight mb-4 md:mb-6">
              Everything <br className="hidden md:block" />
              <span className="font-medium">you need.</span>
            </h2>
            <p className="font-body text-base md:text-lg text-[var(--color-braun-text)] opacity-50 max-w-xs leading-relaxed">
              All the tools necessary to bring your team together and
              collaborate effortlessly.
            </p>
          </div>
        </div>

        <div className="md:w-7/12 flex flex-col gap-16 md:gap-32 mt-4 md:mt-0">
          {featureList.map((f, i) => (
            <FeatureCard key={i} feature={f} />
          ))}
        </div>
      </div>
    </section>
  );
};
