import type { CSSProperties, ReactNode } from "react";
import { PixelAvatar, Nameplate, type AvatarDirection } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";
import { CHAIRS, PIECES } from "./grid";

/**
 * The real floor, drawn for the website: the map the app loads, rendered once
 * to /floor.webp (48 by 32 tiles of 32px, 20KB), with people standing, sitting
 * and walking on it. Everything is placed in tiles, the way the app places
 * it, so a person is one tile wide at any size and a walk follows the aisles.
 *
 * Server-rendered markup and CSS only: each walk is a keyframe animation
 * written out for that walk, with the sprite for each way they face shown
 * only while they face it. Nothing here runs in the browser.
 */

export const MAP = { width: 48, height: 32 };
const TILE_PX = 32;

type Tile = [number, number];
type Face = AvatarDirection;

interface Someone {
  character: string;
  name?: string;
  status?: string;
}

/** Someone standing still on a tile. */
export interface Stander extends Someone {
  at: Tile;
  face?: Face;
  /** Running on the spot, as a character does while it is being picked. */
  running?: boolean;
}

/**
 * Someone sitting on one of the map's chairs, given as the chair object's
 * tile (its left edge and its bottom, as Tiled stores it). They face the way
 * the chair does, as in the app: a chair facing down is behind its desk, so
 * the desk hides their legs; a chair facing up has its back to us, drawn over
 * them, with their name under it.
 */
export interface Sitter extends Someone {
  chair: Tile;
}

/**
 * Someone walking a loop through the given tiles, straight lines only (a
 * diagonal step is walked across then down). A third number on a stop is a
 * pause there, in seconds, facing `faces[index]` or the way they arrived.
 */
export interface Walker extends Someone {
  path: Array<[number, number, number?]>;
  faces?: Record<number, Face>;
  /** Tiles a second. The app walks at 3.75; people strolling on a website look calmer slower. */
  speed?: number;
  /** Start this many seconds into the loop, so a room doesn't set off in step. */
  offset?: number;
}

/** Where a person's feet go on their tile. */
const feet = ([x, y]: Tile) => ({ x: x + 0.5, y: y + 0.85 });

const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(4)}%`;

/** The seated pose's offset from the chair, from SeatManager's SEAT table, in tiles. */
const SEAT_DY: Record<Face, number> = { down: -12 / TILE_PX, up: -1, left: -20 / TILE_PX, right: -20 / TILE_PX };
/** Frame of each seated pose in the character atlas (24 idle, 24 run, then down, left, right, up). */
const SIT_FRAME: Record<Face, number> = { down: 48, left: 49, right: 50, up: 51 };

export function FloorScene({
  view,
  standing = [],
  sitting = [],
  walking = [],
  priority = false,
  className,
  children,
  style,
  over,
  glide = false,
  period,
}: {
  /** The part of the map in view, in tiles: [left, top, width, height]. It covers the box, cropping whichever side is long. */
  view: [number, number, number, number];
  standing?: Stander[];
  sitting?: Sitter[];
  walking?: Walker[];
  /** The page's main picture: fetch it first. */
  priority?: boolean;
  className?: string;
  /** Laid over the floor, in the floor's own coordinates (see OnFloor). Decorative: hidden from assistive tech. */
  children?: ReactNode;
  /** Laid over the box itself, in its coordinates: the app's chips and buttons. Not hidden. */
  over?: ReactNode;
  style?: CSSProperties;
  /** Pan smoothly to a new view, the way the app's camera follows you: keep the views the same size and only the pan moves. */
  glide?: boolean;
  /**
   * Seconds the whole scene repeats in: each walk is eased a little faster or
   * slower so it goes round a whole number of times in it. Recording a scene
   * this long (see scripts/scenes.mjs) then loops without a seam.
   */
  period?: number;
}) {
  const [vx, vy, vw, vh] = view;
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  const walks = walking.map((walker, index) => walk(walker, index, period));
  // The floor's width that covers the box with the view: a tile is the larger of box/view on either axis.
  const width = `max(100cqw * ${MAP.width / vw}, 100cqh * ${MAP.width / vh})`;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#3a3a50] [container-type:size]",
        className,
      )}
      style={style}
    >
      <div
        aria-hidden
        className={cn(
          "absolute left-0 top-0 aspect-[3/2] [container-type:inline-size]",
          glide && "transition-[translate] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.25,1)] motion-reduce:transition-none",
        )}
        style={{
          width,
          // Centred on the view, but never past the map's edge, like the app's camera bounds.
          translate: `clamp(calc(100cqw - ${width}), calc(50cqw - ${width} * ${(cx / MAP.width).toFixed(5)}), 0px) clamp(calc(100cqh - ${width} * ${MAP.height / MAP.width}), calc(50cqh - ${width} * ${(cy / MAP.width).toFixed(5)}), 0px)`,
          ["--tile" as string]: `calc(100cqw / ${MAP.width})`,
          direction: "ltr",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a 20KB pixel map, drawn at its own pixels */}
        <img
          src="/floor.webp"
          width={MAP.width * TILE_PX}
          height={MAP.height * TILE_PX}
          alt=""
          draggable={false}
          // Every scene draws this same small file, so it is fetched once; lazy would
          // save nothing, and inside a scrolling panel the browser may never load it.
          loading="eager"
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="absolute inset-0 size-full select-none [image-rendering:pixelated]"
        />

        {walks.length > 0 && <style>{walks.map((one) => one.css).join("")}</style>}

        {/* Back to front, so whoever stands lower on the floor is drawn over whoever stands behind them. */}
        {[
          ...sitting.map((one) => ({ y: one.chair[1], node: <Seated key={`s${one.chair}`} {...one} /> })),
          ...standing.map((one) => ({ y: feet(one.at).y, node: <Standing key={`t${one.at}${one.character}`} {...one} /> })),
          ...walks.map((one) => ({ y: one.y, node: one.node })),
        ]
          .sort((a, b) => a.y - b.y)
          .map((one) => one.node)}

        {children}
      </div>
      {over}
    </div>
  );
}

/** Lays its children on the floor at a tile, centred on it, in the floor's coordinates. */
export function OnFloor({ at, className, children }: { at: [number, number]; className?: string; children: ReactNode }) {
  return (
    <div className={cn("absolute -translate-x-1/2", className)} style={{ left: pct(at[0], MAP.width), top: pct(at[1], MAP.height) }}>
      {children}
    </div>
  );
}

const TILE = "var(--tile)";

function Plate({ name, status }: { name?: string; status?: string }) {
  if (!name) return null;
  return <Nameplate name={name} status={status} size={TILE} offset={`calc(${TILE} * 1.45 - 2px)`} />;
}

function Standing({ character, name, status, at, face = "down", running }: Stander) {
  const spot = feet(at);
  return (
    <div className="absolute" style={{ left: pct(spot.x, MAP.width), top: pct(spot.y, MAP.height) }}>
      <PixelAvatar character={character} direction={face} running={running} width={TILE} style={{ left: 0, top: 0 }} />
      <Plate name={name} status={status} />
    </div>
  );
}

/** A piece of furniture from /floor-pieces.webp (see scripts/floor-data.py), placed on the floor in tiles. */
function Piece({ index, left, top, tall }: { index: number; left: number; top: number; tall: boolean }) {
  return (
    <span
      className="absolute bg-[url(/floor-pieces.webp)] bg-no-repeat [image-rendering:pixelated]"
      style={{
        left: pct(left, MAP.width),
        top: pct(top, MAP.height),
        width: TILE,
        height: tall ? `calc(${TILE} * 2)` : TILE,
        backgroundSize: `calc(${TILE} * ${PIECES}) calc(${TILE} * 2)`,
        backgroundPosition: `calc(${TILE} * ${-index}) 0`,
      }}
    />
  );
}

function Seated({ character, name, status, chair }: Sitter) {
  const { face, over } = CHAIRS[`${chair[0]},${chair[1]}`] ?? { face: "down" as const, over: [] };
  const x = chair[0] + 0.5;
  const y = chair[1] + SEAT_DY[face];
  return (
    <>
      <div className="absolute" style={{ left: pct(x, MAP.width), top: pct(y, MAP.height) }}>
        <span
          className="absolute left-0 top-0 aspect-square -translate-x-1/2 -translate-y-full bg-no-repeat [image-rendering:pixelated]"
          style={{
            width: `calc(${TILE} * 2)`,
            backgroundImage: `url(/characters/${character}.png)`,
            backgroundSize: "5200% 100%",
            backgroundPositionX: `${((SIT_FRAME[face] / 51) * 100).toFixed(4)}%`,
          }}
        />
        {face !== "up" && <Plate name={name} status={status} />}
      </div>
      {/* Whatever the app draws in front of them: the desk over their legs, or the chair's back. */}
      {over.map(([index, left, top, tall]) => (
        <Piece key={`${index}-${left}-${top}`} index={index} left={left} top={top} tall={tall === 1} />
      ))}
      {/* Someone facing away has their name under the chair, where the app puts it. */}
      {face === "up" && name && (
        <div className="absolute" style={{ left: pct(x, MAP.width), top: pct(chair[1], MAP.height) }}>
          <Nameplate name={name} status={status} size={TILE} offset={`calc(${TILE} * -0.58)`} />
        </div>
      )}
    </>
  );
}

type State = `${"run" | "idle"}-${Face}`;

/**
 * One walker's loop as CSS: a keyframe track moving them from stop to stop,
 * and one track per sprite (running or standing, each way they face) that
 * shows it only while it is the one in use.
 */
function walk(walker: Walker, index: number, period?: number) {
  const { character, name, status, faces = {}, speed = 2.2, offset = 0 } = walker;
  const stops = walker.path.map(([x, y, pause]) => ({ x, y, pause: pause ?? 0 }));
  if (stops.length > 1 && (stops[0].x !== stops.at(-1)!.x || stops[0].y !== stops.at(-1)!.y)) {
    stops.push({ ...stops[0], pause: 0 });
  }

  // Straight legs only: a diagonal is split into across, then down.
  type Leg = { from: Tile; to: Tile; face: Face; seconds: number } | { at: Tile; face: Face; seconds: number };
  const legs: Leg[] = [];
  let facing: Face = "down";
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    if (i > 0) {
      const prev = stops[i - 1];
      const corners: Tile[] = [[prev.x, prev.y]];
      if (prev.x !== stop.x && prev.y !== stop.y) corners.push([stop.x, prev.y]);
      corners.push([stop.x, stop.y]);
      for (let c = 1; c < corners.length; c++) {
        const [ax, ay] = corners[c - 1];
        const [bx, by] = corners[c];
        facing = bx > ax ? "right" : bx < ax ? "left" : by < ay ? "up" : "down";
        legs.push({ from: [ax, ay], to: [bx, by], face: facing, seconds: Math.hypot(bx - ax, by - ay) / speed });
      }
    }
    // The last stop is the first again; its pause was taken at the start.
    if (stop.pause > 0 && i < stops.length - 1) {
      facing = faces[i] ?? facing;
      legs.push({ at: [stop.x, stop.y], face: facing, seconds: stop.pause });
    }
  }

  let total = legs.reduce((sum, leg) => sum + leg.seconds, 0) || 1;
  if (period) {
    // Round the loop to a whole share of the period, and stretch every leg to match.
    const fit = period / Math.max(1, Math.round(period / total));
    for (const leg of legs) leg.seconds *= fit / total;
    total = fit;
  }
  const id = `fw${hash(`${character}${JSON.stringify(walker.path)}${index}`)}`;
  const start = feet([stops[0].x, stops[0].y]);

  // Where they are at each leg's start and end, relative to the start, in tiles.
  const moves: string[] = [];
  const spans = new Map<State, string[]>();
  let t = 0;
  const states: Array<{ from: number; state: State }> = [];
  for (const leg of legs) {
    const p = (value: number) => ((value / total) * 100).toFixed(3);
    if ("from" in leg) {
      const a = feet(leg.from);
      const b = feet(leg.to);
      moves.push(`${p(t)}%{translate:calc(var(--tile)*${(a.x - start.x).toFixed(3)}) calc(var(--tile)*${(a.y - start.y).toFixed(3)})}`);
      moves.push(`${p(t + leg.seconds)}%{translate:calc(var(--tile)*${(b.x - start.x).toFixed(3)}) calc(var(--tile)*${(b.y - start.y).toFixed(3)})}`);
      states.push({ from: t, state: `run-${leg.face}` });
    } else {
      states.push({ from: t, state: `idle-${leg.face}` });
    }
    t += leg.seconds;
  }
  const used = [...new Set(states.map((one) => one.state))];
  for (const state of used) {
    const frames = states.map((one) => `${((one.from / total) * 100).toFixed(3)}%{opacity:${one.state === state ? 1 : 0}}`);
    frames.push(`100%{opacity:${states.at(-1)!.state === state ? 1 : 0}}`);
    spans.set(state, frames);
  }

  const delay = `${(-offset).toFixed(2)}s`;
  const css =
    `@keyframes ${id}{${moves.join("")}}` +
    `.${id}{animation:${id} ${total.toFixed(2)}s linear ${delay} infinite}` +
    used
      .map((state) => `@keyframes ${id}-${state}{${spans.get(state)!.join("")}}.${id}-${state}{animation:${id}-${state} ${total.toFixed(2)}s step-end ${delay} infinite}`)
      .join("") +
    `@media (prefers-reduced-motion:reduce){.${id},[class*="${id}-"]{animation:none!important}}`;

  // Without animation (reduced motion), they stand at the start facing the first way they'd go.
  const first = states[0]?.state ?? "idle-down";
  const node = (
    <div key={id} className="absolute" style={{ left: pct(start.x, MAP.width), top: pct(start.y, MAP.height) }}>
      <div className={cn("absolute left-0 top-0", id)}>
        {used.map((state) => {
          const [mode, face] = state.split("-") as ["run" | "idle", Face];
          return (
            <span key={state} className={cn("absolute left-0 top-0", `${id}-${state}`)} style={{ opacity: state === first ? 1 : 0 }}>
              <PixelAvatar character={character} direction={face} running={mode === "run"} width={TILE} style={{ left: 0, top: 0 }} />
            </span>
          );
        })}
        <Plate name={name} status={status} />
      </div>
    </div>
  );

  return { css, node, y: start.y };
}

/** A short stable name for a walk's keyframes. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
