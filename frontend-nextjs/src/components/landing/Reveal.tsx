import React from "react";

export const Reveal: React.FC<{
  children: React.ReactNode;
  x?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "span";
}> = ({ children, x = 0, y = 16, className = "", as: Tag = "div" }) => (
  <Tag
    className={`reveal ${className}`}
    style={
      {
        "--reveal-x": `${x}px`,
        "--reveal-y": `${y}px`,
      } as React.CSSProperties
    }
  >
    {children}
  </Tag>
);
