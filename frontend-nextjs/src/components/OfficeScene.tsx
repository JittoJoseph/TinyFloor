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
  distance: number;
  duration: number;
  delay?: number;
  pattern?: "a" | "b" | "c";
}

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
    ["--stroll-distance" as string]: `${path.distance}px`,
  };
}

export const OfficeScene: React.FC<{
  occupants?: Occupant[];
  focus?: string;
  zoom?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({
  occupants = [],
  focus = "48% 62%",
  zoom = "cover",
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
            offset={
              typeof person.width === "number"
                ? Math.round(person.width * HEAD_RATIO) + NAMEPLATE_GAP
                : 48
            }
          />
        )}
      </div>
    ))}
    {children}
  </div>
);
