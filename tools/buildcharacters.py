"""Builds a character atlas from the Modern Interiors sheets.

The game reads one spritesheet per character: 24 idle frames, then 24 run
frames, then one seated pose per direction, every frame 32x32 so standing and
sitting share an origin. The source sheets are 16 wide and 32 tall per frame,
so each one is placed against the middle of its cell.

Seated poses are the standing pose for that direction, nudged the way the
first four characters were drawn: back views sink into the chair, side views
lean an inch towards the desk.

Usage: python tools/buildcharacters.py Ash Dan
"""
import os, sys
from PIL import Image

PACK = os.environ.get(
    "MODERN_INTERIORS",
    r"D:\Downloads\moderninteriors-win\2_Characters\Old\Single_Characters_Legacy\16x16",
)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "private-assets", "characters")

CELL = 32
FRAME_W, FRAME_H = 16, 32
# Adam_idle_16x16.png frame order, and where each seated pose sits in its cell.
IDLE_DIRECTIONS = {"right": 0, "up": 1, "left": 2, "down": 3}
SIT_ORDER = ["down", "left", "right", "up"]
SIT_PLACEMENT = {"down": (8, 0), "left": (6, 0), "right": (10, 0), "up": (8, 7)}


def sheet(name, kind):
    return Image.open(os.path.join(PACK, f"{name}_{kind}_16x16.png")).convert("RGBA")


def frames(im):
    return [im.crop((x, 0, x + FRAME_W, FRAME_H)) for x in range(0, im.width, FRAME_W)]


def build(name):
    idle_anim = frames(sheet(name, "idle_anim"))
    run = frames(sheet(name, "run"))
    idle = frames(sheet(name, "idle"))
    if len(idle_anim) != 24 or len(run) != 24:
        raise SystemExit(f"{name}: expected 24 idle and 24 run frames, got {len(idle_anim)} and {len(run)}")

    cells = [(f, 8, 0) for f in idle_anim] + [(f, 8, 0) for f in run]
    for direction in SIT_ORDER:
        dx, dy = SIT_PLACEMENT[direction]
        cells.append((idle[IDLE_DIRECTIONS[direction]], dx, dy))

    atlas = Image.new("RGBA", (CELL * len(cells), CELL), (0, 0, 0, 0))
    for index, (frame, dx, dy) in enumerate(cells):
        atlas.paste(frame, (index * CELL + dx, dy))

    os.makedirs(OUT, exist_ok=True)
    atlas.save(os.path.join(OUT, f"{name}.png"))
    for kind in ("idle_anim", "run"):
        sheet(name, kind).save(os.path.join(OUT, f"{name}_{kind}_16x16.png"))
    print(f"{name}: {atlas.width}x{atlas.height}, {len(cells)} frames")


for character in sys.argv[1:] or ["Ash", "Dan"]:
    build(character)
