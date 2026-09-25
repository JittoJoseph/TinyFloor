import type { CSSProperties, ReactNode } from "react";
import { PixelAvatar, Nameplate, type AvatarDirection } from "@/components/PixelAvatar";
import { cn } from "@/lib/utils";
import { CHAIRS, PIECES } from "./grid";

/**
 * The real floor, drawn for the website: the map the app loads, rendered once
 * to /floor.webp (48 by 32 tiles of 32px, 20KB), with people standing and
 * sitting on it. Everything is placed in tiles, the way the app places it, so
 * a person is one tile wide at any size.
 *
 * Server-rendered markup and CSS only, and nobody moves from their spot: the
 * only motion is each character's idle cycle, a few small sprites stepping in
 * place, which the browser skips altogether while the scene is off screen.
 * Every scene shares the one map and the characters' sheets.
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
  priority = false,
  className,
  children,
  style,
  over,
}: {
  /** The part of the map in view, in tiles: [left, top, width, height]. It covers the box, cropping whichever side is long. */
  view: [number, number, number, number];
  standing?: Stander[];
  sitting?: Sitter[];
  /** The page's main picture: fetch it first. */
  priority?: boolean;
  className?: string;
  /** Laid over the floor, in the floor's own coordinates (see OnFloor). Decorative: hidden from assistive tech. */
  children?: ReactNode;
  /** Laid over the box itself, in its coordinates: the app's chips and buttons. Not hidden. */
  over?: ReactNode;
  style?: CSSProperties;
}) {
  const [vx, vy, vw, vh] = view;
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  // The floor's width that covers the box with the view: a tile is the larger of box/view on either axis.
  const width = `max(100cqw * ${MAP.width / vw}, 100cqh * ${MAP.width / vh})`;

  return (
    <div
      className={cn(
        // Off screen, content-visibility skips drawing it, idle frames and all.
        "relative overflow-hidden bg-[#3a3a50] [container-type:size] [content-visibility:auto]",
        className,
      )}
      style={style}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 aspect-[3/2] [container-type:inline-size]"
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

        {/* Back to front, so whoever stands lower on the floor is drawn over whoever stands behind them. */}
        {[
          ...sitting.map((one) => ({ y: one.chair[1], node: <Seated key={`s${one.chair}`} {...one} /> })),
          ...standing.map((one) => ({ y: feet(one.at).y, node: <Standing key={`t${one.at}${one.character}`} {...one} /> })),
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
