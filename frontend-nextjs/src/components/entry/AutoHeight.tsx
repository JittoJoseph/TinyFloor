import React from "react";

/**
 * The entry panel grows and shrinks as its steps change. The height is animated
 * in CSS (see `.auto-height`), so the panel is always exactly as tall as what
 * is inside it: a measured height could go stale and clip the buttons.
 */
export const AutoHeight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="auto-height">{children}</div>
);
