"""
Works out what the website needs to draw people on the floor, from the map
the app loads (public/tilesets/office-map.tmj). Run it again if the map changes:

    python scripts/floor-data.py

Writes src/components/floor/grid.ts:
- WALKABLE, the tiles you can stand on, the way the app's NavGrid decides it
  (a tile is blocked when its 16px core touches a collider).
- CHAIRS, every chair with the way it faces and what the app draws over
  whoever sits in it: the game sorts sprites by their base, so a desk hides
  the legs of someone facing us and a chair's back hides someone facing away.

and public/floor-pieces.webp, the few furniture tiles those need, cut from the
textures the map is built from, one to a 32 by 64 cell.
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
MAP = json.loads((PUBLIC / "tilesets" / "office-map.tmj").read_text())
W, H, T = MAP["width"], MAP["height"], MAP["tilewidth"]


def layer(name):
    return next(one for one in MAP["layers"] if one["name"] == name)


def direction(obj):
    return next(p["value"] for p in obj.get("properties", []) if p["name"] == "direction")


# Walkable tiles, as Navigation.ts's NavGrid: inside the border, and a 16px core clear of colliders.
colliders = layer("Colliders")["objects"]
CORE = 8
rows = []
for ty in range(H):
    row = ""
    for tx in range(W):
        cx, cy = tx * T + T / 2, ty * T + T / 2
        inside = 1 <= tx < W - 1 and 1 <= ty < H - 1
        blocked = any(
            cx + CORE > r["x"] and cx - CORE < r["x"] + r["width"] and cy + CORE > r["y"] and cy - CORE < r["y"] + r["height"]
            for r in colliders
        )
        row += "." if inside and not blocked else "#"
    rows.append(row)

# The textures, by first gid.
SHEETS = {
    t["firstgid"]: Image.open(PUBLIC / "tilesets" / t["image"]).convert("RGBA")
    for t in MAP["tilesets"]
}


def cut(gid, tall):
    first = max(g for g in SHEETS if g <= gid)
    sheet = SHEETS[first]
    frame = gid - first
    if tall:  # items/chair.png: one column of 32 by 64 frames
        return sheet.crop((0, frame * 2 * T, T, frame * 2 * T + 2 * T))
    columns = sheet.width // T
    x, y = (frame % columns) * T, (frame // columns) * T
    return sheet.crop((x, y, x + T, y + T))


# Everything drawn above the floor, with the depth the game gives it (MapManager: the base y;
# a chair facing down one less, so its seat tucks under the desk row).
things = []
for obj in layer("Furniture")["objects"]:
    things.append({"depth": obj["y"], "x": obj["x"], "y": obj["y"] - T, "h": T, "gid": obj["gid"], "tall": False})
chairs = layer("Chair")["objects"]
for obj in chairs:
    things.append({"depth": obj["y"] - (1 if direction(obj) == "down" else 0), "x": obj["x"], "y": obj["y"] - 2 * T, "h": 2 * T, "gid": obj["gid"], "tall": True})

# SeatManager's SEAT table: where a seated sprite sits relative to the chair, and its depth.
SEAT = {"down": (-12, -0.5), "up": (-32, -2), "left": (-20, 2), "right": (-20, 2)}
pieces = []  # (gid, tall), in atlas order
entries = []
for obj in chairs:
    face = direction(obj)
    dy, dd = SEAT[face]
    x, base = obj["x"] + T / 2, obj["y"]
    y, depth = base + dy, base + dd
    # The drawn body of a seated character: 16 by 23 of its 32px frame, doubled.
    body = (x - 16, x + 16, y - 46, y)
    over = []
    for one in sorted(things, key=lambda t: t["depth"]):
        if one["depth"] <= depth:
            continue
        if one["x"] + T <= body[0] or one["x"] >= body[1] or one["y"] + one["h"] <= body[2] or one["y"] >= body[3]:
            continue
        key = (one["gid"], one["tall"])
        if key not in pieces:
            pieces.append(key)
        over.append(f"[{pieces.index(key)}, {one['x'] / T:g}, {one['y'] / T:g}, {1 if one['tall'] else 0}]")
    entries.append(f'  "{int(obj["x"] // T)},{int(obj["y"] // T)}": {{ face: "{face}", over: [{", ".join(over)}] }},')

atlas = Image.new("RGBA", (T * len(pieces), 2 * T), (0, 0, 0, 0))
for index, (gid, tall) in enumerate(pieces):
    atlas.paste(cut(gid, tall), (index * T, 0))
atlas.save(PUBLIC / "floor-pieces.webp", format="WEBP", lossless=True, method=6, quality=100)

walkable = "\n".join(f'  "{row}",' for row in rows)
chair_rows = "\n".join(entries)
(ROOT / "src" / "components" / "floor" / "grid.ts").write_text(
    f'''// Written by scripts/floor-data.py from the map. Run it again rather than editing this by hand.

/**
 * Where you can stand on the floor, one character a tile: "." to walk on, "#"
 * a wall or furniture, as the app's NavGrid works it out from the colliders.
 */
const WALKABLE = [
{walkable}
];

export const walkable = (x: number, y: number) => WALKABLE[y]?.[x] === ".";

/** How many pieces are in /floor-pieces.webp, one to a 32 by 64 cell. */
export const PIECES = {len(pieces)};

/**
 * The map's chairs, by the tile Tiled keeps them at (their left edge and
 * bottom): the way each faces, and what the app draws over whoever sits in
 * it: the desk over the legs of someone facing us, the chair's back over
 * someone facing away. Each is [piece, left, top, tall] in tiles, a piece
 * being a cell of /floor-pieces.webp, one tile tall or two.
 */
export const CHAIRS: Record<string, {{ face: "up" | "down" | "left" | "right"; over: Array<[number, number, number, number]> }}> = {{
{chair_rows}
}};
''',
    encoding="utf-8",
)
print(f"{len(pieces)} pieces, {len(entries)} chairs")
