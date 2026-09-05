"use client";

import React, { useEffect, useRef, useState } from "react";

export const AutoHeight: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const element = inner.current;
    if (!element) return;

    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{ height }}
      className="overflow-hidden transition-[height] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
    >
      <div ref={inner}>{children}</div>
    </div>
  );
};
