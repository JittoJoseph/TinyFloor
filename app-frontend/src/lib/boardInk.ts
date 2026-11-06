import { getStroke, type StrokeOptions } from "perfect-freehand";
import type { Stroke } from "./WhiteboardManager";

/**
 * How a board stroke is drawn: as ink, not a polyline. perfect-freehand (MIT,
 * the library tldraw and Excalidraw draw with) smooths the points and swells
 * and thins the line with the pen's speed, so a quick scribble reads as
 * handwriting instead of a chain of straight segments. Drawn from the points
 * alone, a stroke looks the same on every screen and on the board on the wall.
 */
const PEN: StrokeOptions = { thinning: 0.3, smoothing: 0.55, streamline: 0.12, simulatePressure: true };
/** The eraser keeps one width: it should take away exactly what it covers. */
const ERASER: StrokeOptions = { thinning: 0, smoothing: 0.5, streamline: 0.12, simulatePressure: false };
/** Ink thins with speed, so a pen draws a little wider than its size to keep the old weight on average. */
const WEIGHT = 1.45;

/** A stroke's ink at a size, as a shape to fill. `done`: the pen has lifted, so its end is finished. */
export function inkOf(stroke: Stroke, width: number, height: number, scale: number, done: boolean): Path2D {
  const { points } = stroke;
  const pairs: [number, number][] = [];
  for (let i = 0; i + 1 < points.length; i += 2) pairs.push([points[i] * width, points[i + 1] * height]);
  const size = Math.max(1.5, stroke.size * scale * (stroke.erase ? 1 : WEIGHT));
  // A tap: a round dot the pen's size.
  if (pairs.length === 1) {
    const dot = new Path2D();
    dot.arc(pairs[0][0], pairs[0][1], size / 2, 0, Math.PI * 2);
    return dot;
  }
  const outline = getStroke(through(pairs), {
    ...(stroke.erase ? ERASER : PEN),
    size,
    last: done,
  });
  return new Path2D(svgPath(outline));
}

/** Between filled-in points, no farther apart than this (in canvas pixels). */
const STEP = 3;
/** And no more than this many to a gap, for a stroke dragged right across the board. */
const MOST_STEPS = 24;

/**
 * The points a pen reported, with more filled in between along a curve that
 * passes through every one of them (centripetal Catmull-Rom). A quick hand
 * gives few points far apart: joined straight, a loop came out a polygon, and
 * inked as they were, the outline's rounding cut a zig-zag's peaks in half.
 */
function through(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;
  const out: [number, number][] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const gap = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.min(MOST_STEPS, Math.ceil(gap / STEP));
    for (let step = 1; step <= steps; step++) out.push(catmullRom(p0, p1, p2, p3, step / steps));
  }
  return out;
}

/** A point on the centripetal Catmull-Rom curve from p1 to p2, `t` of the way along. */
function catmullRom(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const knot = (a: [number, number], b: [number, number]) => Math.max(Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])), 1e-4);
  const t1 = knot(p0, p1);
  const t2 = t1 + knot(p1, p2);
  const t3 = t2 + knot(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const mix = (a: [number, number], b: [number, number], ta: number, tb: number): [number, number] => {
    const k = tb === ta ? 0 : (u - ta) / (tb - ta);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const a1 = mix(p0, p1, 0, t1);
  const a2 = mix(p1, p2, t1, t2);
  const a3 = mix(p2, p3, t2, t3);
  const b1 = mix(a1, a2, 0, t2);
  const b2 = mix(a2, a3, t1, t3);
  return mix(b1, b2, t1, t2);
}

/** An outline as an SVG path, its corners rounded through their midpoints (perfect-freehand's own way). */
function svgPath(outline: number[][]): string {
  if (outline.length < 4) return "";
  const average = (a: number, b: number) => (a + b) / 2;
  const c = outline[2];
  let [a, b] = outline;
  let path = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`;
  for (let i = 2; i < outline.length - 1; i++) {
    a = outline[i];
    b = outline[i + 1];
    path += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `;
  }
  return `${path}Z`;
}

/**
 * Paints a whole board, keeping each finished stroke's ink so only the ones
 * still being drawn are worked out again: a full board repaints in a few
 * milliseconds, every frame a stroke grows.
 */
export class BoardPainter {
  private ink = new Map<string, { points: number; done: boolean; path: Path2D }>();
  private size = "";

  constructor(private readonly background: string) {}

  paint(ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, strokes: Stroke[], drawing: (id: string) => boolean) {
    const size = `${width}x${height}x${scale}`;
    if (size !== this.size) {
      this.size = size;
      this.ink.clear();
    }
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, width, height);
    const seen = new Set<string>();
    for (const stroke of strokes) {
      if (!stroke.points.length) continue;
      seen.add(stroke.id);
      const done = !drawing(stroke.id);
      let kept = this.ink.get(stroke.id);
      if (!kept || kept.points !== stroke.points.length || kept.done !== done) {
        kept = { points: stroke.points.length, done, path: inkOf(stroke, width, height, scale, done) };
        this.ink.set(stroke.id, kept);
      }
      ctx.fillStyle = stroke.erase ? this.background : stroke.color;
      ctx.fill(kept.path);
    }
    for (const id of this.ink.keys()) if (!seen.has(id)) this.ink.delete(id);
  }
}
