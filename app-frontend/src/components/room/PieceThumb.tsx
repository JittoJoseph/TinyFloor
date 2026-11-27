import { FLOOR } from "shared-protocol/map";
import atlas from "shared-protocol/catalog/atlas.json";
import { FLOOR_FILES } from "@/lib/floorWarmup";

const frames = atlas.frames as unknown as Record<string, [number, number, number, number]>;

/** A desk chair's own pixels, by its item: chairs aren't desk things, so the floor keeps theirs with the chairs. */
const chairArt = new Map(Object.values(FLOOR.chairs).flatMap((chairs) => chairs.map((chair) => [chair.item, chair.art] as const)));

/** A thing's own pixels: where they are in its frame, and how big. */
export function artOf(item: string) {
  const frame = frames[item];
  const [left, top, right, bottom] = FLOOR.things[item]?.art ?? chairArt.get(item) ?? [0, 0, frame?.[2] ?? 0, frame?.[3] ?? 0];
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * A thing as the floor draws it, from the atlas, cropped to its pixels, at the
 * largest whole scale (so the pixels stay square and crisp) that fits the box,
 * or half its size where only that fits.
 */
export function PieceThumb({ item, box, at }: { item: string; box: [number, number]; /** One scale for all, instead of each its largest: things kept in proportion to each other. */ at?: number }) {
  const frame = frames[item];
  if (!frame) return null;
  const [x, y] = frame;
  const { left, top, width, height } = artOf(item);
  const fits = Math.min(box[0] / width, box[1] / height);
  // Whole scales up to 3; smaller than its own size (a thumb in a small tile), a half where that fits, and smoothly below.
  const scale = at ?? (fits >= 1 ? Math.min(3, Math.floor(fits)) : fits >= 0.5 ? 0.5 : fits);
  return (
    <span
      aria-hidden="true"
      className="block shrink-0"
      style={{
        width: width * scale,
        height: height * scale,
        backgroundImage: `url(${FLOOR_FILES.items})`,
        backgroundPosition: `-${(x + left) * scale}px -${(y + top) * scale}px`,
        backgroundSize: `${atlas.width * scale}px ${atlas.height * scale}px`,
        imageRendering: scale >= 0.5 ? "pixelated" : "auto",
      }}
    />
  );
}
