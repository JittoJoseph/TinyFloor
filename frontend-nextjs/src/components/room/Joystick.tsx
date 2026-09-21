"use client";

import { useEffect, useRef, useState } from "react";
import { setJoystick } from "@/lib/joystick";
import { INPUT_MODE_EVENT, isTouchInput } from "@/lib/tutorial";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "@/lib/utils";

/** The ring's radius, and how far the thumb may travel from its centre. */
const BASE = 60;
const TRAVEL = 42;
/** Below this, a resting thumb: nothing moves. */
const DEADZONE = 9;
/** Where the stick waits, from the zone's bottom-left corner. */
const REST = { x: 24 + BASE, y: 24 + BASE };
const EIGHTH = Math.PI / 4;
/** A heading holds until the thumb is this far past its edge, so it never flickers. */
const HYSTERESIS = 0.14;
const SETTLE = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * The on-screen joystick for phones and tablets. It waits at the bottom left,
 * and wherever a thumb lands in that corner of the floor it moves there, so
 * nobody has to find a small circle. The floor walks in eight headings (that
 * is what the others' copy of you predicts), so the stick snaps to eight, holds
 * a heading until the thumb is clearly past it, and lights the one it chose.
 */
export function Joystick() {
  const [touch, setTouch] = useState(isTouchInput);
  const [active, setActive] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const origin = useRef(REST);
  const current = useRef<number | null>(null);

  useEffect(() => {
    const onMode = () => setTouch(isTouchInput());
    window.addEventListener(INPUT_MODE_EVENT, onMode);
    return () => {
      window.removeEventListener(INPUT_MODE_EVENT, onMode);
      setJoystick(0, 0);
    };
  }, []);

  if (!touch) return null;

  const place = (x: number, y: number, tx: number, ty: number) => {
    base.current?.style.setProperty("transform", `translate(${x - BASE}px, ${BASE - y}px)`);
    thumb.current?.style.setProperty("transform", `translate(${tx}px, ${ty}px)`);
  };

  const point = (event: React.PointerEvent) => {
    const box = zone.current!.getBoundingClientRect();
    return { x: event.clientX - box.left, y: box.bottom - event.clientY };
  };

  const steer = (event: React.PointerEvent) => {
    const at = point(event);
    const dx = at.x - origin.current.x;
    // Measured upward, like the zone: up is +y until the thumb and the walk flip it back.
    const dy = at.y - origin.current.y;
    const distance = Math.hypot(dx, dy);
    const reach = Math.min(distance, TRAVEL);
    const angle = Math.atan2(dy, dx);
    // The thumb moves on screen, where y grows downward again.
    place(origin.current.x, origin.current.y, Math.cos(angle) * reach, -Math.sin(angle) * reach);

    let next: number | null = null;
    if (distance >= DEADZONE) {
      const held = current.current;
      const offBy = held === null ? Infinity : Math.abs(Math.atan2(Math.sin(angle - held * EIGHTH), Math.cos(angle - held * EIGHTH)));
      next = held !== null && offBy < EIGHTH / 2 + HYSTERESIS ? held : (Math.round(angle / EIGHTH) + 8) % 8;
    }
    if (next !== current.current) {
      if (next !== null) navigator.vibrate?.(6);
      current.current = next;
      setHeading(next);
    }
    if (next === null) setJoystick(0, 0);
    else setJoystick(Math.round(Math.cos(next * EIGHTH) * 1000) / 1000, Math.round(-Math.sin(next * EIGHTH) * 1000) / 1000);
  };

  const release = (event: React.PointerEvent) => {
    if (event.pointerId !== pointer.current) return;
    releasePointer(event.currentTarget, event.pointerId);
    pointer.current = null;
    current.current = null;
    origin.current = REST;
    setJoystick(0, 0);
    setHeading(null);
    setActive(false);
    place(REST.x, REST.y, 0, 0);
  };

  return (
    <div
      ref={zone}
      aria-hidden
      className={cn("pointer-events-auto absolute bottom-20 left-0 z-[5] h-[42%] max-h-80 w-1/2 max-w-80 touch-none", TOUCH_GESTURE_CLASS)}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        pointer.current = event.pointerId;
        capturePointer(event.currentTarget, event.pointerId);
        const box = zone.current!.getBoundingClientRect();
        const at = point(event);
        // Keep the whole ring inside the zone, however close to its edge the thumb lands.
        origin.current = {
          x: Math.min(Math.max(at.x, BASE + 4), box.width - BASE - 4),
          y: Math.min(Math.max(at.y, BASE + 4), box.height - BASE - 4),
        };
        setActive(true);
        navigator.vibrate?.(8);
        steer(event);
      }}
      onPointerMove={(event) => event.pointerId === pointer.current && steer(event)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        ref={base}
        className={cn(
          "absolute bottom-0 left-0 flex items-center justify-center rounded-full border backdrop-blur-md",
          "shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)]",
          active ? "border-white/35 bg-black/30 opacity-100" : "border-white/25 bg-black/20 opacity-70",
        )}
        style={{
          width: BASE * 2,
          height: BASE * 2,
          transform: `translate(${REST.x - BASE}px, ${BASE - REST.y}px)`,
          // Gliding home on release; following the finger exactly while held.
          transition: active ? "opacity 200ms, background-color 200ms" : `transform 220ms ${SETTLE}, opacity 200ms, background-color 200ms`,
        }}
      >
        {/* Eight headings around the ring; the one you are walking lights up. */}
        {Array.from({ length: 8 }, (_, index) => {
          const angle = index * EIGHTH;
          const lit = heading === index;
          return (
            <span
              key={index}
              className={cn(
                "absolute rounded-full transition-[background-color,transform,opacity] duration-150",
                lit ? "size-2 bg-white opacity-100" : "size-1.5 bg-white opacity-45",
              )}
              style={{
                transform: `translate(${Math.cos(angle) * (BASE - 11)}px, ${-Math.sin(angle) * (BASE - 11)}px) scale(${lit ? 1.25 : 1})`,
              }}
            />
          );
        })}
        <div
          ref={thumb}
          className={cn(
            "size-12 rounded-full bg-white/95 shadow-[0_2px_10px_rgb(0_0_0/0.35),inset_0_-2px_0_rgb(0_0_0/0.08)] ring-1 ring-black/10",
          )}
          style={{ transition: active ? "none" : `transform 220ms ${SETTLE}` }}
        />
      </div>
    </div>
  );
}
