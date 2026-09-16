import React from "react";
import styles from "./pixel.module.css";

export type AvatarDirection = "up" | "down" | "left" | "right";

export const STATUS_DOTS: Record<string, string> = {
  available: "bg-emerald-400",
  away: "bg-amber-400",
  busy: "bg-red-400",
  in_call: "bg-violet-400",
};

interface PixelAvatarProps {
  character: string;
  direction?: AvatarDirection;
  running?: boolean;
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const PixelAvatar: React.FC<PixelAvatarProps> = ({
  character,
  direction = "down",
  running = false,
  width = 34,
  className = "",
  style,
}) => {
  const sheet = running ? "run_16x16" : "idle_anim_16x16";

  return (
    <span
      aria-hidden="true"
      className={`${styles.sprite} ${styles[direction]} ${
        running ? styles.running : ""
      } ${className}`}
      style={{
        ...style,
        ["--sprite-w" as string]:
          typeof width === "number" ? `${width}px` : width,
        backgroundImage: `url(/characters/${character}_${sheet}.png)`,
      }}
    />
  );
};

const length = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value;

/**
 * The plate reads off the character it belongs to, so a floor that scales with
 * its container keeps the same proportions on a phone as on a desktop. Every
 * part of it is in em, and 34px wide, the usual character, gives the 13px plate
 * these screens were drawn with.
 */
export const Nameplate: React.FC<{
  name: string;
  status?: string;
  offset?: number | string;
  size?: number | string;
}> = ({ name, status = "available", offset = 62, size = 34 }) => (
  <span
    className="absolute left-0 -translate-x-1/2 flex items-center gap-[0.45em] rounded-full bg-[#1f2937]/85 border border-[#374151]/60 px-[0.6em] py-[0.25em] font-pixel leading-none text-white whitespace-nowrap"
    style={{
      bottom: length(offset),
      fontSize: `max(8px, calc(${length(size)} * 0.38))`,
    }}
  >
    <span
      className={`w-[0.55em] h-[0.55em] rounded-full ${
        STATUS_DOTS[status] ?? STATUS_DOTS.available
      }`}
    />
    {name}
  </span>
);
