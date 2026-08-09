import React from "react";
import Link from "next/link";
import { MousePointerClick, UserCircle, MessageCircle } from "lucide-react";

const steps = [
  {
    id: "01",
    icon: MousePointerClick,
    title: "Join a Room",
    text: "Click a link to enter your team office directly in the browser.",
  },
  {
    id: "02",
    icon: UserCircle,
    title: "Pick an Avatar",
    text: "Select your favorite custom pixel-art character before stepping inside.",
  },
  {
    id: "03",
    icon: MessageCircle,
    title: "Start Collaborating",
    text: "Walk up to anyone to start a video or voice call.",
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section
      id="how-it-works"
      className="pb-12 px-4 md:px-8 max-w-6xl mx-auto w-full"
    >
      <div className="text-center mb-16 md:mb-20">
        <h2 className="font-body text-4xl md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight mb-6">
          How it <span className="font-medium">works.</span>
        </h2>
        <div className="w-8 h-1 bg-[var(--color-braun-orange)] mx-auto"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 max-w-5xl mx-auto border-t border-[rgba(0,0,0,0.1)] pt-12 md:pt-16">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col group relative">
            <h3 className="font-body text-2xl font-medium text-[var(--color-braun-text)] mb-3 tracking-tight flex items-center gap-2">
              <span className="text-[var(--color-braun-orange)] opacity-50 text-xl font-bold">
                {index + 1}.
              </span>
              {step.title}
            </h3>
            <p className="font-body text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
