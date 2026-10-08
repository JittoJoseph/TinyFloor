"use client";

import React, { useLayoutEffect, useRef } from "react";

/**
 * The entry panel grows and shrinks as its steps change, instead of snapping to
 * the new size. The height is fixed only while it animates and always ends back
 * at `auto`, so a stale measurement can never clip what is inside.
 */
export const AutoHeight: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const box = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  /** How tall it was before this render, which the new height animates from. */
  const before = useRef<number | null>(null);

  // After every render, in case a step, an error or a hint changed the height.
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = content.current;
    if (!outer || !inner) return;

    const settle = () => {
      outer.style.height = "auto";
      outer.style.overflow = "";
      before.current = inner.getBoundingClientRect().height;
    };

    const to = inner.getBoundingClientRect().height;
    const from = before.current;
    before.current = to;
    // The first render, or a change too small to be worth animating.
    if (from === null || Math.abs(from - to) < 1) {
      settle();
      return;
    }

    outer.style.height = `${from}px`;
    outer.style.overflow = "hidden";
    void outer.offsetHeight; // so the browser starts from the old height
    outer.style.height = `${to}px`;

    outer.addEventListener("transitionend", settle, { once: true });
    // Nothing animates when motion is reduced, so settle on a timer too.
    const timer = setTimeout(settle, 600);
    return () => {
      clearTimeout(timer);
      outer.removeEventListener("transitionend", settle);
    };
  });

  return (
    <div ref={box} className="auto-height">
      <div ref={content}>{children}</div>
    </div>
  );
};
