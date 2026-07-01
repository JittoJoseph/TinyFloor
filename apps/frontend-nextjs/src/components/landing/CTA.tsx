import React from "react";
import Link from "next/link";

export const CTA: React.FC = () => {
  return (
    <section className="w-full px-4 md:px-8 mb-20 md:mb-24">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#f2f2eb] border border-[rgba(0,0,0,0.06)] shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-3xl p-12 md:p-16 flex flex-col items-center text-center relative overflow-hidden">
          <h2 className="font-body text-3xl md:text-4xl font-light text-[var(--color-braun-text)] tracking-tight mb-8">
            Your space is <span className="font-medium">ready.</span>
          </h2>
          <Link
            href="/rooms"
            className="inline-flex items-center justify-center h-14 px-10 bg-[var(--color-braun-orange)] text-white rounded-full font-body font-bold uppercase tracking-[0.15em] text-xs hover:bg-[#3d3d3d] transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
};
