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

export const Nameplate: React.FC<{
  name: string;
  status?: string;
  offset?: number;
}> = ({ name, status = "available", offset = 62 }) => (
  <span
    className="absolute left-0 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-[#1f2937]/85 border border-[#374151]/60 px-2 py-[3px] font-pixel text-[13px] leading-none text-white whitespace-nowrap"
    style={{ bottom: `${offset}px` }}
  >
    <span
      className={`w-[7px] h-[7px] rounded-full ${
        STATUS_DOTS[status] ?? STATUS_DOTS.available
      }`}
    />
    {name}
  </span>
);
