"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { faqs } from "./faqs";

export const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="w-full max-w-4xl mx-auto px-4 md:px-8 py-14 md:py-24"
    >
      <h2
        id="faq-title"
        className="font-body text-[2rem] md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight leading-[1.1] mb-8 md:mb-12"
      >
        Before you <span className="font-medium">walk in.</span>
      </h2>

      <div className="border-t border-black/10">
        {faqs.map((faq, index) => {
          const expanded = open === index;
          return (
            <div key={faq.q} className="border-b border-black/10">
              <h3>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpen(expanded ? null : index)}
                  className="cursor-pointer w-full flex items-start justify-between gap-6 py-5 md:py-6 text-left font-body text-lg md:text-xl font-medium text-[var(--color-braun-text)] leading-snug transition-opacity duration-200 hover:opacity-70"
                >
                  {faq.q}
                  <Plus
                    aria-hidden="true"
                    strokeWidth={2}
                    className={`w-5 h-5 mt-1 shrink-0 text-[var(--color-braun-orange)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      expanded ? "rotate-45" : ""
                    }`}
                  />
                </button>
              </h3>
              <div
                id={`faq-answer-${index}`}
                role="region"
                className={`grid transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  expanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="font-body text-base md:text-lg text-[var(--color-braun-text)] opacity-60 leading-relaxed pb-6 md:pb-7 pr-8 md:pr-12">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
