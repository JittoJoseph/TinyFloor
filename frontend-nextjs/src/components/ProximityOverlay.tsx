"use client";

import { useEffect, useState } from "react";
import {
  NearbyPlayer,
  ProximityActions,
  TOUCH_BREAKPOINT,
} from "./ProximityActions";

const GAP = 22;
const PADDING = 12;
const BAR_WIDTH = {
  pointer: { guest: 144, member: 178 },
  touch: { guest: 186, member: 230 },
};

export default function ProximityOverlay() {
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();

    const handleProximityUpdate = (event: CustomEvent<NearbyPlayer[]>) => {
      setNearbyPlayers(event.detail);
    };

    const handlePlayerStatusChanged = (
      event: CustomEvent<{ id: string; status: string }>,
    ) => {
      const { id, status } = event.detail;
      setNearbyPlayers((prev) =>
        prev.map((player) =>
          player.id === id ? { ...player, status } : player,
        ),
      );
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener(
      "proximityUpdate",
      handleProximityUpdate as EventListener,
    );
    window.addEventListener(
      "playerStatusChanged",
      handlePlayerStatusChanged as EventListener,
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener(
        "proximityUpdate",
        handleProximityUpdate as EventListener,
      );
      window.removeEventListener(
        "playerStatusChanged",
        handlePlayerStatusChanged as EventListener,
      );
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {nearbyPlayers.map((player) => {
        const touch = viewportWidth > 0 && viewportWidth < TOUCH_BREAKPOINT;
        const width =
          BAR_WIDTH[touch ? "touch" : "pointer"][
            player.guest ? "guest" : "member"
          ];

        const spaceRight = viewportWidth - PADDING - (player.x + GAP);
        const spaceLeft = player.x - GAP - PADDING;
        const flip = spaceRight < width && spaceLeft > spaceRight;

        let left = flip ? player.x - GAP - width : player.x + GAP;
        if (viewportWidth > 0) {
          const maxLeft = Math.max(PADDING, viewportWidth - width - PADDING);
          left = Math.min(Math.max(left, PADDING), maxLeft);
        }

        return (
          <div
            key={player.id}
            className="absolute pointer-events-auto"
            style={{
              left,
              top: player.y,
              transform: "translateY(-50%)",
            }}
          >
            <ProximityActions player={player} touch={touch} />
          </div>
        );
      })}
    </div>
  );
}
