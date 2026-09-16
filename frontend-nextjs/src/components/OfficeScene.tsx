import React from "react";
import { PixelAvatar, Nameplate, AvatarDirection } from "./PixelAvatar";

const HEAD_RATIO = 1.4375;
const NAMEPLATE_GAP = 5;

export interface Occupant {
  character: string;
  left: string;
  top: string;
  direction?: AvatarDirection;
  name?: string;
  status?: string;
  width?: number | string;
  running?: boolean;
  stroll?: StrollPath;
}

export interface StrollPath {
  /** Pixels, or any CSS length. */
  distance: number | string;
  duration: number;
  delay?: number;
  pattern?: "a" | "b" | "c";
}

/** The width of office.png when it covers the scene: it is 3:2, so it overflows whichever side is short. */
export const COVER_WIDTH = "max(100cqw, 150cqh)";

function strollTiming(path?: StrollPath): React.CSSProperties | undefined {
  if (!path) return undefined;
  return {
    animationDuration: `${path.duration}ms`,
    animationDelay: `${path.delay ?? 0}ms`,
  };
}

function strollVars(path?: StrollPath): React.CSSProperties | undefined {
  if (!path) return undefined;
  return {
    ...strollTiming(path),
    ["--stroll-distance" as string]:
      typeof path.distance === "number" ? `${path.distance}px` : path.distance,
  };
}

function nameplateOffset(width: Occupant["width"]) {
  if (typeof width === "number") return Math.round(width * HEAD_RATIO) + NAMEPLATE_GAP;
  if (typeof width === "string") return `calc(${width} * ${HEAD_RATIO} + ${NAMEPLATE_GAP}px)`;
  return 48;
}

/**
 * A slice of the office. With `pinned`, which expects the default cover zoom
 * and a centred focus, occupants are placed on the image rather than the
 * frame, so a spot stays on the same patch of floor at any frame shape.
 */
export const OfficeScene: React.FC<{
  occupants?: Occupant[];
  focus?: string;
  zoom?: string;
  pinned?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({
  occupants = [],
  focus = "48% 62%",
  zoom = "cover",
  pinned = false,
  className = "",
  children,
}) => (
  <div
    aria-hidden="true"
    className={`relative overflow-hidden bg-[#8f8f96] ${className}`}
    style={{
      backgroundImage: "url(/office.png)",
      backgroundSize: zoom,
      backgroundPosition: focus,
      imageRendering: "pixelated",
      containerType: "size",
    }}
  >
    <div
      className={
        pinned
          ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-[3/2]"
          : "contents"
      }
      style={pinned ? { width: COVER_WIDTH } : undefined}
    >
      {occupants.map((person, index) => (
        <div
          key={`${person.character}-${index}`}
          className={`absolute ${
            person.stroll
              ? `office-stroll office-pattern-${person.stroll.pattern ?? "a"}`
              : ""
          }`}
          style={{
            left: person.left,
            top: person.top,
            ...strollVars(person.stroll),
          }}
        >
          {person.stroll ? (
            <>
              <span
                className="office-walk-right absolute left-0 top-0"
                style={strollTiming(person.stroll)}
              >
                <PixelAvatar
                  character={person.character}
                  direction="right"
                  running
                  width={person.width ?? 30}
                  style={{ left: 0, top: 0 }}
                />
              </span>
              <span
                className="office-walk-left absolute left-0 top-0"
                style={strollTiming(person.stroll)}
              >
                <PixelAvatar
                  character={person.character}
                  direction="left"
                  running
                  width={person.width ?? 30}
                  style={{ left: 0, top: 0 }}
                />
              </span>
              <span
                className="office-rest absolute left-0 top-0"
                style={strollTiming(person.stroll)}
              >
                <PixelAvatar
                  character={person.character}
                  direction="down"
                  width={person.width ?? 30}
                  style={{ left: 0, top: 0 }}
                />
              </span>
            </>
          ) : (
            <PixelAvatar
              character={person.character}
              direction={person.direction}
              running={person.running}
              width={person.width ?? 30}
              style={{ left: 0, top: 0 }}
            />
          )}
          {person.name && (
            <Nameplate
              name={person.name}
              status={person.status}
              offset={nameplateOffset(person.width)}
              size={person.width ?? 30}
            />
          )}
        </div>
      ))}
    </div>
    {children}
  </div>
);
