"use client";

import React, { useEffect, useRef, useState } from "react";

let observer: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();

function watch(element: Element, onEnter: () => void) {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          callbacks.get(entry.target)?.();
          callbacks.delete(entry.target);
          observer?.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
  }

  callbacks.set(element, onEnter);
  observer.observe(element);

  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
  };
}

export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  x?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "span";
}> = ({ children, delay = 0, x = 0, y = 16, className = "", as = "div" }) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const Tag = as;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return watch(element, () => setShown(true));
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`transition-[opacity,transform,filter] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:translate-x-0 motion-reduce:translate-y-0 ${
        shown ? "opacity-100 blur-0" : "opacity-0 blur-[3px]"
      } ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        transform: shown ? undefined : `translate(${x}px, ${y}px)`,
      }}
    >
      {children}
    </Tag>
  );
};
