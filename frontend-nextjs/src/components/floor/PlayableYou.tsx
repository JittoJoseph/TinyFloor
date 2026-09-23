"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, Mic, Video } from "lucide-react";
import { PixelAvatar, Nameplate, type AvatarDirection } from "@/components/PixelAvatar";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { MAP } from "./FloorScene";
import { walkable } from "./grid";

/** The app's walking speed: 120px a second on 32px tiles. */
const SPEED = 3.75;
/** How close counts as next to someone, in tiles, the way the app's proximity ring reads on screen. */
const NEAR = 2.2;

type Tile = [number, number];

export interface Neighbour {
  name: string;
  seed: string;
  at: Tile;
}

/**
 * You, on a floor on the website: click (or tap) anywhere and you walk there
 * around the desks, or steer with the arrow keys once the floor has focus.
 * Walk up to someone and the bar the app shows beside them appears. It lives
 * inside FloorScene's floor, so it shares the floor's tiles and scale.
 */
export function PlayableYou({
  start,
  character,
  name,
  neighbours = [],
  hint,
  labels,
}: {
  start: Tile;
  character: string;
  name: string;
  neighbours?: Neighbour[];
  /** A nudge shown beside you until you first move. */
  hint?: ReactNode;
  labels: { video: string; audio: string; message: string };
}) {
  const body = useRef<HTMLDivElement>(null);
  const spot = useRef({ x: start[0], y: start[1] });
  const path = useRef<Tile[]>([]);
  const held = useRef<AvatarDirection | null>(null);
  const [face, setFace] = useState<AvatarDirection>("down");
  const [moving, setMoving] = useState(false);
  const [moved, setMoved] = useState(false);
  const [near, setNear] = useState<Neighbour | null>(null);

  const place = useCallback(() => {
    const el = body.current;
    if (!el) return;
    el.style.left = `${((spot.current.x + 0.5) / MAP.width) * 100}%`;
    el.style.top = `${((spot.current.y + 0.85) / MAP.height) * 100}%`;
  }, []);

  const walkTo = useCallback((goal: Tile) => {
    const from: Tile = [Math.round(spot.current.x), Math.round(spot.current.y)];
    // Nobody walks through anybody: the tiles people stand on are taken.
    const taken = new Set(neighbours.map((one) => `${one.at[0]},${one.at[1]}`));
    const free = (x: number, y: number) => walkable(x, y) && !taken.has(`${x},${y}`);
    const target = nearestFree(goal, free, from);
    if (!target) return;
    const route = route4(from, target, free);
    if (!route) return;
    path.current = route;
    setMoved(true);
  }, [neighbours]);

  useEffect(() => {
    const world = body.current?.parentElement;
    const root = world?.parentElement;
    if (!world || !root) return;
    place();

    // A click rather than a press, so a finger that lands on the floor to scroll the page doesn't walk you anywhere.
    const onPointer = (event: MouseEvent) => {
      if (event.button !== 0) return;
      const box = world.getBoundingClientRect();
      const x = Math.floor(((event.clientX - box.left) / box.width) * MAP.width);
      const y = Math.floor(((event.clientY - box.top) / box.height) * MAP.height - 0.3);
      walkTo([x, y]);
      wake();
    };
    const KEYS: Record<string, AvatarDirection> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
    };
    const onKey = (event: KeyboardEvent) => {
      const direction = KEYS[event.key];
      if (!direction) return;
      event.preventDefault();
      held.current = event.type === "keydown" ? direction : held.current === direction ? null : held.current;
      if (held.current) wake();
    };
    root.addEventListener("click", onPointer);
    root.addEventListener("keydown", onKey);
    root.addEventListener("keyup", onKey);
    const onBlur = () => (held.current = null);
    root.addEventListener("blur", onBlur);

    // The loop runs only while you're on the move; standing still costs nothing.
    let last = 0;
    let frame = 0;
    let running = false;
    let wasMoving = false;
    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // A held key walks one tile at a time, the same as a click on the next tile.
      if (!path.current.length && held.current) {
        const step = STEP[held.current];
        const next: Tile = [Math.round(spot.current.x) + step[0], Math.round(spot.current.y) + step[1]];
        if (walkable(next[0], next[1]) && !neighbours.some((one) => one.at[0] === next[0] && one.at[1] === next[1])) {
          path.current = [next];
          setMoved(true);
        } else setFace(held.current);
      }
      const goal = path.current[0];
      if (goal) {
        const dx = goal[0] - spot.current.x;
        const dy = goal[1] - spot.current.y;
        const distance = Math.hypot(dx, dy);
        const stride = SPEED * dt;
        if (distance <= stride) {
          spot.current = { x: goal[0], y: goal[1] };
          path.current.shift();
        } else {
          spot.current = { x: spot.current.x + (dx / distance) * stride, y: spot.current.y + (dy / distance) * stride };
        }
        setFace(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        place();
      }
      const isMoving = path.current.length > 0;
      if (isMoving !== wasMoving) {
        wasMoving = isMoving;
        setMoving(isMoving);
      }
      const distance = (one: Neighbour) => Math.hypot(one.at[0] - spot.current.x, one.at[1] - spot.current.y);
      const close = neighbours.filter((one) => distance(one) <= NEAR).sort((a, b) => distance(a) - distance(b))[0] ?? null;
      setNear((current) => (current?.name === close?.name ? current : close));
      if (path.current.length || held.current) frame = requestAnimationFrame(tick);
      else running = false;
    };
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("click", onPointer);
      root.removeEventListener("keydown", onKey);
      root.removeEventListener("keyup", onKey);
      root.removeEventListener("blur", onBlur);
    };
  }, [neighbours, place, walkTo]);

  return (
    <>
      <div ref={body} className="absolute z-10" style={{ left: `${((start[0] + 0.5) / MAP.width) * 100}%`, top: `${((start[1] + 0.85) / MAP.height) * 100}%` }}>
        <PixelAvatar character={character} direction={face} running={moving} width="var(--tile)" style={{ left: 0, top: 0 }} />
        <Nameplate name={name} size="var(--tile)" offset="calc(var(--tile) * 1.45 + 4px)" />
        {hint && (
          <span
            className={cn(
              "pointer-events-none absolute start-[calc(var(--tile)*0.9)] top-[calc(var(--tile)*-1.2)] whitespace-nowrap transition-opacity duration-500",
              moved && "opacity-0",
            )}
          >
            {hint}
          </span>
        )}
        {/* Under your feet, naming who you're next to: the bar the app shows then. */}
        {near && (
          <div key={near.name} className="absolute left-0 top-2 z-20 -translate-x-1/2 transition-[opacity,translate] duration-200 starting:-translate-y-1 starting:opacity-0">
            <NearbyBar name={near.name} seed={near.seed} labels={labels} />
          </div>
        )}
      </div>
    </>
  );
}

/** The app's bar beside someone you've walked up to: who, and the ways to talk. */
export function NearbyBar({ name, seed, labels }: { name: string; seed: string; labels: { video: string; audio: string; message: string } }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card p-1.5 pe-2 font-(family-name:--font-app) shadow-float  [--face-ring:var(--ui-card)]">
      <Face seed={seed} size={26} presence="available" />
      <span className="px-0.5 text-[12px] font-semibold text-foreground">{name}</span>
      <span title={labels.video} className="flex size-7 items-center justify-center rounded-full bg-foreground text-background">
        <Video className="size-3.5" />
      </span>
      <span title={labels.audio} className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <Mic className="size-3.5" />
      </span>
      <span title={labels.message} className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <MessageSquare className="size-3.5" />
      </span>
    </div>
  );
}

const STEP: Record<AvatarDirection, Tile> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** The free tile nearest the one asked for, and of those the one on your side of it. */
function nearestFree([x, y]: Tile, free: (x: number, y: number) => boolean, from: Tile): Tile | null {
  for (let r = 0; r <= 3; r++) {
    const ring: Tile[] = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(x + dx, y + dy)) ring.push([x + dx, y + dy]);
      }
    }
    if (ring.length) return ring.sort((a, b) => Math.hypot(a[0] - from[0], a[1] - from[1]) - Math.hypot(b[0] - from[0], b[1] - from[1]))[0];
  }
  return null;
}

/**
 * The shortest four-way route between two tiles, as its corners. Turning
 * costs a little, so a route runs along an aisle and turns once rather than
 * zig-zagging down a diagonal.
 */
function route4(from: Tile, to: Tile, free: (x: number, y: number) => boolean): Tile[] | null {
  const DIRS: Tile[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const TURN = 0.3;
  const state = (x: number, y: number, d: number) => (y * MAP.width + x) * 4 + d;
  const cost = new Map<number, number>();
  const came = new Map<number, number>();
  const open: Array<[number, number]> = [];
  for (let d = 0; d < 4; d++) {
    const s0 = state(from[0], from[1], d);
    cost.set(s0, 0);
    open.push([0, s0]);
  }
  let end = -1;
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [c, current] = open.shift()!;
    if (c > (cost.get(current) ?? Infinity)) continue;
    const d = current % 4;
    const cell = (current - d) / 4;
    const x = cell % MAP.width;
    const y = (cell - x) / MAP.width;
    if (x === to[0] && y === to[1]) {
      end = current;
      break;
    }
    DIRS.forEach(([dx, dy], nd) => {
      const nx = x + dx;
      const ny = y + dy;
      if (!free(nx, ny)) return;
      const next = state(nx, ny, nd);
      const nc = c + 1 + (nd === d ? 0 : TURN);
      if (nc >= (cost.get(next) ?? Infinity)) return;
      cost.set(next, nc);
      came.set(next, current);
      open.push([nc, next]);
    });
  }
  if (end < 0) return null;
  const tiles: Tile[] = [];
  for (let at: number | undefined = end; at !== undefined; at = came.get(at)) {
    const cell = (at - (at % 4)) / 4;
    tiles.unshift([cell % MAP.width, Math.floor(cell / MAP.width)]);
  }
  // Keep only the corners, so each leg is walked in one straight line.
  return tiles.filter((tile, i) => {
    if (i === 0 || i === tiles.length - 1) return true;
    const [px, py] = tiles[i - 1];
    const [nx, ny] = tiles[i + 1];
    return tile[0] - px !== nx - tile[0] || tile[1] - py !== ny - tile[1];
  });
}
