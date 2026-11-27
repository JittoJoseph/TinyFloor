"use client";

import { useEffect, useRef, useState } from "react";
import { setJoystick } from "@/lib/joystick";
import { INPUT_MODE_EVENT, isTouchInput } from "@/lib/input";
import { capturePointer, releasePointer, TOUCH_GESTURE_CLASS } from "@/lib/touch";
import { cn } from "web-shared/lib/utils";

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
/** How big the stick is while it waits, of its size in use. */
const RESTING_SCALE = 0.7;
/**
 * Away from the waiting stick, the corner is still the floor's: a press there
 * is a tap (walk there, a chair, a chip) until it moves this far (CSS px) or is
 * held this long, and then it's the stick, from where it landed.
 */
const SLIDE = 10;
const HOLD_MS = 220;

/**
 * The on-screen joystick for phones and tablets. It waits at the bottom left,
 * and wherever a thumb slides or holds in that corner of the floor it moves
 * there, so nobody has to find a small circle; a quick tap there is still the
 * floor's (walking there), passed through to whatever is under it. The floor walks in eight headings (that
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
  /** A press away from the stick, not yet a tap or a steer: where and when it landed, and the timer that makes it a hold. */
  const pending = useRef<{ x: number; y: number; clientX: number; clientY: number; timer: number } | null>(null);

  useEffect(() => {
    const onMode = () => setTouch(isTouchInput());
    window.addEventListener(INPUT_MODE_EVENT, onMode);
    return () => {
      window.removeEventListener(INPUT_MODE_EVENT, onMode);
      if (pending.current) window.clearTimeout(pending.current.timer);
      pending.current = null;
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

  /** Takes the press: the ring comes to where it landed (kept whole inside the zone) and follows the thumb. */
  const grab = (at: { x: number; y: number }) => {
    if (!zone.current) return;
    const box = zone.current.getBoundingClientRect();
    origin.current = {
      x: Math.min(Math.max(at.x, BASE + 4), box.width - BASE - 4),
      y: Math.min(Math.max(at.y, BASE + 4), box.height - BASE - 4),
    };
    setActive(true);
    place(origin.current.x, origin.current.y, 0, 0);
    navigator.vibrate?.(8);
  };

  /** A tap that was the floor's: handed to whatever is under the zone there, the floor itself or a chip on it. */
  const tapThrough = (clientX: number, clientY: number) => {
    const element = zone.current;
    if (!element) return;
    element.style.pointerEvents = "none";
    const under = document.elementFromPoint(clientX, clientY);
    element.style.pointerEvents = "";
    if (under instanceof HTMLCanvasElement) {
      // The floor reads a mouse's press and release (a finger's are the stick's here): a click where the tap was.
      for (const type of ["mousedown", "mouseup"] as const) {
        under.dispatchEvent(new MouseEvent(type, { clientX, clientY, button: 0, buttons: type === "mousedown" ? 1 : 0, bubbles: true, cancelable: true, view: window }));
      }
      // Then the mouse off the floor, as a finger lifts: nothing stays pointed at (a chair's outline, the tile mark).
      under.dispatchEvent(new MouseEvent("mousemove", { clientX: -10000, clientY: -10000, bubbles: true, view: window }));
      under.dispatchEvent(new MouseEvent("mouseout", { clientX: -10000, clientY: -10000, bubbles: true, view: window }));
    } else {
      // An icon's svg isn't an HTML element: the control round it takes the tap.
      let target: Element | null = under;
      while (target && !(target instanceof HTMLElement)) target = target.parentElement;
      target?.click();
    }
  };

  const release = (event: React.PointerEvent) => {
    if (event.pointerId !== pointer.current) return;
    releasePointer(event.currentTarget, event.pointerId);
    pointer.current = null;
    const press = pending.current;
    if (press) {
      window.clearTimeout(press.timer);
      pending.current = null;
      if (event.type === "pointerup") tapThrough(press.clientX, press.clientY);
      return;
    }
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
        const at = point(event);
        // On the waiting stick: the stick, at once.
        if (Math.hypot(at.x - REST.x, at.y - REST.y) <= BASE * RESTING_SCALE + 8) {
          grab(at);
          steer(event);
          return;
        }
        // Anywhere else in the corner: a tap, unless it slides or holds.
        const timer = window.setTimeout(() => {
          if (!pending.current) return;
          pending.current = null;
          grab(at);
        }, HOLD_MS);
        pending.current = { ...at, clientX: event.clientX, clientY: event.clientY, timer };
      }}
      onPointerMove={(event) => {
        if (event.pointerId !== pointer.current) return;
        const press = pending.current;
        if (press) {
          const at = point(event);
          if (Math.hypot(at.x - press.x, at.y - press.y) < SLIDE) return;
          window.clearTimeout(press.timer);
          pending.current = null;
          grab(press);
        }
        steer(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        ref={base}
        className={cn(
          "absolute bottom-0 left-0 flex items-center justify-center rounded-full border backdrop-blur-md",
          "shadow-[0_8px_24px_-8px_rgb(0_0_0/0.35)]",
          active ? "border-white/35 bg-black/30 opacity-100" : "border-white/20 bg-black/15 opacity-55",
        )}
        style={{
          width: BASE * 2,
          height: BASE * 2,
          transform: `translate(${REST.x - BASE}px, ${BASE - REST.y}px)`,
          // Waiting, it's a smaller, quieter hint of itself, so the corner of the floor stays the floor's.
          // (Its own property: moving it sets the transform.)
          scale: active ? 1 : RESTING_SCALE,
          // Gliding home on release; following the finger exactly while held.
          transition: active ? `scale 160ms ${SETTLE}, opacity 200ms, background-color 200ms` : `transform 220ms ${SETTLE}, scale 220ms ${SETTLE}, opacity 200ms, background-color 200ms`,
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
