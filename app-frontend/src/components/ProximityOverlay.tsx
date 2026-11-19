"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NearbyPlayer, ProximityActions, TOUCH_BREAKPOINT } from "./ProximityActions";
import { setCardPlacer, setCardWidth } from "@/lib/proximity";

/** Kept this far from the floor's edges. */
const PADDING = 12;
/** The transform last written onto each card, kept off the page so checking it isn't a change too. */
const placed = new WeakMap<HTMLDivElement, string>();

/**
 * What you can do with the person you're standing with, in their name tag's
 * place: the tag grows into it (ProximityActions) and shrinks back as you walk
 * on. React renders who they are (ProximityManager tells it when that
 * changes); where they are is written onto it every frame, straight from the
 * floor (lib/proximity), so it moves with them as the camera glides. Centred
 * on their tag, and always on the screen.
 */
export default function ProximityOverlay() {
  const reduce = useReducedMotion();
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [touch, setTouch] = useState(false);
  const cards = useRef(new Map<string, HTMLDivElement>());
  const widths = useRef(new WeakMap<HTMLDivElement, number>());
  const viewport = useRef(0);

  useEffect(() => {
    const handleResize = () => {
      viewport.current = window.innerWidth;
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
    setCardPlacer((id, x, y) => {
      const card = cards.current.get(id);
      if (!card) return;
      let width = widths.current.get(card);
      if (width === undefined) {
        // Before the observer has said: measured once, so it's centred from its first frame.
        width = card.offsetWidth;
        widths.current.set(card, width);
        setCardWidth(width);
      }
      const transform = place(x, y, width, viewport.current);
      // Only when it moved: a write is a style change the page (and its session recording) has to take in.
      if (placed.get(card) === transform) return;
      placed.set(card, transform);
      card.style.transform = transform;
    });
    return () => setCardPlacer(null);
  }, []);

  // Its width, as it changes (a longer name, a meeting offered instead of Talk): for keeping it on the screen, and for the floor to clear room.
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      entries.forEach((entry) => {
        const card = entry.target as HTMLDivElement;
        const width = entry.borderBoxSize?.[0]?.inlineSize ?? card.offsetWidth;
        widths.current.set(card, width);
        setCardWidth(width);
      }),
    );
    cards.current.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [nearbyPlayers]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        {nearbyPlayers.map((player) => (
          <div
            key={player.id}
            ref={(card) => {
              if (card) cards.current.set(player.id, card);
              else cards.current.delete(player.id);
            }}
            className="absolute left-0 top-0 will-change-transform"
            // Off the screen until the floor places it, the same frame it appears.
            style={{ transform: "translate3d(-9999px, 0, 0)" }}
          >
            <motion.div
              className="pointer-events-auto"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } }}
              exit={reduce ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, scale: 0.6, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }}
            >
              <ProximityActions player={player} touch={touch} />
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Centred on someone's tag at (x, y), on the screen. */
function place(x: number, y: number, width: number, viewportWidth: number): string {
  let left = x - width / 2;
  if (viewportWidth > 0 && width > 0) left = Math.min(Math.max(left, PADDING), Math.max(PADDING, viewportWidth - width - PADDING));
  // To a tenth of a pixel: smooth as it moves, and still once the camera has settled (its follow creeps by far less).
  const tenth = (v: number) => Math.round(v * 10) / 10;
  return `translate3d(${tenth(left)}px, ${tenth(y)}px, 0) translateY(-50%)`;
}
