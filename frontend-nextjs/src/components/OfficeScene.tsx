import React from "react";
import { PixelAvatar, Nameplate, AvatarDirection } from "./PixelAvatar";

export interface Occupant {
  character: string;
  left: string;
  top: string;
  direction?: AvatarDirection;
  name?: string;
  status?: string;
  width?: number | string;
  running?: boolean;
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
    }}
  >
    {occupants.map((person, index) => (
      <div
        key={`${person.character}-${index}`}
        className="absolute"
        style={{ left: person.left, top: person.top }}
      >
        <PixelAvatar
          character={person.character}
          direction={person.direction}
          running={person.running}
          width={person.width ?? 30}
          style={{ left: 0, top: 0 }}
        />
        {person.name && (
          <Nameplate
            name={person.name}
            status={person.status}
            offset={
              typeof person.width === "number" ? person.width * 2 + 4 : 64
            }
          />
        )}
      </div>
    ))}
    {children}
  </div>
);
