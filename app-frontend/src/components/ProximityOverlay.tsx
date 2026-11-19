"use client";

import { useEffect, useRef, useState } from "react";
import { NearbyPlayer, ProximityActions, TOUCH_BREAKPOINT } from "./ProximityActions";
import { setCardPlacer } from "@/lib/proximity";

const GAP = 22;
const PADDING = 12;
/** About how wide the card ends up with a long name, so it can be kept on the screen before it paints. */
const BAR_WIDTH = { pointer: 300, touch: 350 };
/** The transform last written onto each card, kept off the page so checking it isn't a change too. */
const placed = new WeakMap<HTMLDivElement, string>();

/**
 * The cards beside the people you're standing with. React renders who they
 * are (ProximityManager tells it when that changes); where they are is
 * written onto each card every frame, straight from the floor (lib/proximity),
 * so a card moves with its person as the camera glides, never a render behind.
 * A card goes to the right of its person, or the left where the right has no
 * room, and always stays on the screen.
 */
export default function ProximityOverlay() {
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [touch, setTouch] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const cards = useRef(new Map<string, HTMLDivElement>());
  const viewport = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      viewport.current = window.innerWidth;
      setViewportWidth(window.innerWidth);
      setTouch(window.innerWidth < TOUCH_BREAKPOINT);
    };
    handleResize();

    const handleProximityUpdate = (event: CustomEvent<NearbyPlayer[]>) => setNearbyPlayers(event.detail);
    const handlePlayerStatusChanged = (event: CustomEvent<{ id: string; status: string }>) => {
      const { id, status } = event.detail;
      setNearbyPlayers((prev) => prev.map((player) => (player.id === id ? { ...player, status } : player)));
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("proximityUpdate", handleProximityUpdate as EventListener);
    window.addEventListener("playerStatusChanged", handlePlayerStatusChanged as EventListener);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("proximityUpdate", handleProximityUpdate as EventListener);
      window.removeEventListener("playerStatusChanged", handlePlayerStatusChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    const width = BAR_WIDTH[touch ? "touch" : "pointer"];
    setCardPlacer((id, x, y) => {
      const card = cards.current.get(id);
      if (!card) return;
      const transform = place(x, y, width, viewport.current);
      // Only when it moved: a write is a style change the page (and its session recording) has to take in.
      if (placed.get(card) === transform) return;
      placed.set(card, transform);
      card.style.transform = transform;
    });
    return () => setCardPlacer(null);
  }, [touch]);

  const width = BAR_WIDTH[touch ? "touch" : "pointer"];
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {nearbyPlayers.map((player) => (
        <div
          key={player.id}
          ref={(card) => {
            if (card) cards.current.set(player.id, card);
            else cards.current.delete(player.id);
          }}
          className="pointer-events-auto absolute left-0 top-0 will-change-transform"
          // Where it was when it appeared; from then on the floor moves it (setCardPlacer).
          style={{ transform: place(player.x, player.y, width, viewportWidth) }}
        >
          <ProximityActions player={player} touch={touch} />
        </div>
      ))}
    </div>
  );
}

/** Beside someone at (x, y): to their right, or their left where the right has no room, on the screen, centred on them. */
function place(x: number, y: number, width: number, viewportWidth: number): string {
  const spaceRight = viewportWidth - PADDING - (x + GAP);
  const spaceLeft = x - GAP - PADDING;
  const flip = spaceRight < width && spaceLeft > spaceRight;
  let left = flip ? x - GAP - width : x + GAP;
  if (viewportWidth > 0) left = Math.min(Math.max(left, PADDING), Math.max(PADDING, viewportWidth - width - PADDING));
  // To a tenth of a pixel: smooth as it moves, and still once the camera has settled (its follow creeps by far less).
  const tenth = (v: number) => Math.round(v * 10) / 10;
  return `translate3d(${tenth(left)}px, ${tenth(y)}px, 0) translateY(-50%)`;
}
