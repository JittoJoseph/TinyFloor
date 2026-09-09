"""Generates the SpatialMeet office map.

Floors and flat wall faces stay as tile layers. Everything a player can pass in
front of or behind is emitted into object layers so the scene can sort it by y,
which is what lets a desk cover your legs while your head stays visible.

Furniture keeps the row offsets it had in the map it was harvested from, and is
placed by naming the wall it belongs to rather than by naming a floor tile, so a
poster lands on the wall face instead of a tile or two out on the floor.
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "frontend-nextjs", "public")
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "office-map.original.tmj")
DST = os.path.join(PUB, "tilesets", "office-map.tmj")

W, H, TS = 48, 32, 32

W_CAP, W_FACE, W_VERT = 178, 194, 28
W_TL, W_TR, W_TEE = 13, 11, 185
W_COL_TOP, W_JOIN = 11, 59
W_END_TOP, W_END_BOT = 180, 196

CHAIR_FIRSTGID = 1073
CHAIR_FRAME = {"down": 1, "up": 5}
CHAIR_WARM = 6


def floorset(b):
    return {"corner": b + 1, "top": b + 2, "left": b + 17, "fill": b + 18}


PLANK, PLANK_ALT, MAROON = floorset(90), floorset(93), floorset(186)

MEETING = dict(x=1, y=2, w=13, h=14, door=8)
OFFICE = dict(x=1, y=18, w=13, h=13, door=24)
WALL_X = 14
HALL = dict(x=15, y=2, w=32, h=29)
BREAK = dict(x=33, y=2, w=14, h=7)

CLUSTERS = [(17, 7), (31, 12), (18, 19), (32, 24)]
DESK_COLS = (3, 9)

# Harvested from the previous map as (x, y, w, h). Rects that start on a wall cap
# row keep that alignment, so passing a cap row puts them back on the wall.
STAMPS = {
    "painting": (6, 0, 2, 2),
    "notice": (10, 0, 2, 2),
    "vending": (12, 0, 4, 3),
    "cooler": (2, 0, 1, 3),
    "counter": (3, 0, 2, 3),
    "bookcase": (18, 0, 2, 3),
    "shelf": (24, 0, 2, 3),
    "poster": (26, 0, 2, 2),
    "coffee": (41, 0, 3, 3),
    "art_small": (2, 8, 1, 2),
    "charts": (7, 8, 2, 2),
    "trophy": (10, 8, 1, 2),
    "cert": (11, 8, 1, 2),
    "sofa": (8, 2, 3, 3),
    "plant": (11, 12, 1, 3),
    "plant2": (53, 6, 1, 3),
    "cabinet": (3, 4, 2, 3),
    "printer_desk": (41, 22, 5, 2),
    "desk_small": (17, 21, 6, 3),
    "desk_bank": (16, 5, 13, 3),
}
FURN_LAYERS = ["DesksBack", "DeskItems_Back", "Dividers", "DesksFront",
               "DeskItems_Front", "OverPlayer_Layer"]

TABLE = {"tl": 226, "t": 227, "tr": 228, "l": 242, "m": 243, "r": 244,
         "bl": 258, "b": 259, "br": 260}


class Build:
    def __init__(self, src):
        self.sw = src["width"]
        self.slayers = {l["name"]: l["data"] for l in src["layers"]
                        if l["type"] == "tilelayer"}
        self.ground = [0] * (W * H)
        self.walls = [0] * (W * H)
        self.furniture = []
        self.chairs = []
        self.computers = []
        self.boards = []
        self.speakers = []
        self.colliders = []
        self.zones = []
        self.nid = 1

    def oid(self):
        self.nid += 1
        return self.nid - 1

    def g(self, x, y, v):
        if 0 <= x < W and 0 <= y < H:
            self.ground[y * W + x] = v

    def w(self, x, y, v):
        if 0 <= x < W and 0 <= y < H:
            self.walls[y * W + x] = v

    def floor(self, x, y, w, h, fs):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.g(xx, yy, fs["fill"])

    def shade(self):
        """Wall shadows follow the walls rather than the rectangle a floor was
        painted with, so a doorway breaks the shadow the way it should. Each
        floor block stores corner/top/left at a fixed offset from its fill."""
        def is_wall(x, y):
            if x < 0 or y < 0 or x >= W or y >= H:
                return True
            return bool(self.walls[y * W + x])

        for y in range(H):
            for x in range(W):
                fill = self.ground[y * W + x]
                if not fill:
                    continue
                above, left = is_wall(x, y - 1), is_wall(x - 1, y)
                if above and left:
                    self.g(x, y, fill - 17)
                elif above:
                    self.g(x, y, fill - 16)
                elif left:
                    self.g(x, y, fill - 1)
                elif is_wall(x - 1, y - 1):
                    self.g(x, y, fill - 15)

    def obj(self, bucket, x, y, w, h, gid=None, name="", props=None):
        o = dict(id=self.oid(), name=name, rotation=0, type="", visible=True,
                 x=x, y=y, width=w, height=h)
        if gid:
            o["gid"] = gid
        if props:
            o["properties"] = [dict(name=k, type="string", value=v)
                               for k, v in props.items()]
        bucket.append(o)
        return o

    def solid(self, tx, ty, tw, th):
        if tw > 0 and th > 0:
            self.obj(self.colliders, tx * TS, ty * TS, tw * TS, th * TS)

    def zone(self, name, tx, ty, tw, th):
        self.obj(self.zones, tx * TS, ty * TS, tw * TS, th * TS, name=name)

    def chair(self, tx, ty, direction, warm=False):
        """ty is the chair's base row; the sprite is two tiles tall so it tucks
        into the desk row above it."""
        frame = CHAIR_FRAME[direction] + (CHAIR_WARM if warm else 0)
        self.obj(self.chairs, tx * TS, (ty + 1) * TS, TS, TS * 2,
                 gid=CHAIR_FIRSTGID + frame, props={"direction": direction})

    def place(self, key, dx, dy, solid=True, solid_rows=None):
        """dy is the top row. Wall stamps keep the cap row they were drawn on."""
        sx, sy, sw, sh = STAMPS[key]
        for name in FURN_LAYERS:
            data = self.slayers.get(name)
            if not data:
                continue
            for iy in range(sh):
                for ix in range(sw):
                    gid = data[(sy + iy) * self.sw + (sx + ix)]
                    if not gid:
                        continue
                    self.obj(self.furniture, (dx + ix) * TS,
                             (dy + iy + 1) * TS, TS, TS, gid=gid)
        if solid:
            rows = sh if solid_rows is None else solid_rows
            self.solid(dx, dy + sh - rows, sw, rows)
        return sw, sh

    def place_bottom(self, key, dx, bottom, **kw):
        """Anchors by the last row, for anything standing against a lower wall."""
        return self.place(key, dx, bottom - STAMPS[key][3] + 1, **kw)

    def place_right(self, key, right, dy, **kw):
        return self.place(key, right - STAMPS[key][2] + 1, dy, **kw)

    def table(self, x, y, w, h):
        for iy in range(h):
            band = "t" if iy == 0 else ("b" if iy == h - 1 else "m")
            for ix in range(w):
                side = "l" if ix == 0 else ("r" if ix == w - 1 else "")
                key = (side or "m") if band == "m" else band + side
                self.obj(self.furniture, (x + ix) * TS, (y + iy + 1) * TS,
                         TS, TS, gid=TABLE[key])
        self.solid(x, y, w, h)

    def cluster(self, x, y):
        """A pod of four: two desks back to back across a divider, one seat per
        side, so half the pod faces the camera and half faces away."""
        sw, sh = self.place("desk_bank", x, y)
        for col in DESK_COLS:
            self.chair(x + col, y + sh, "up")
            self.chair(x + col, y, "down")
        self.obj(self.computers, (x + 1) * TS, y * TS, (sw - 2) * TS, TS,
                 name="desk-%d-%d" % (x, y))


def build():
    b = Build(json.load(open(SRC)))

    b.floor(MEETING["x"], MEETING["y"], MEETING["w"], MEETING["h"], PLANK_ALT)
    b.floor(OFFICE["x"], OFFICE["y"], OFFICE["w"], OFFICE["h"], MAROON)
    b.floor(HALL["x"], HALL["y"], HALL["w"], HALL["h"], PLANK)

    for xx in range(W):
        b.w(xx, 0, W_CAP)
        b.w(xx, 1, W_FACE)
        b.w(xx, H - 1, W_CAP)
    for yy in range(H):
        b.w(0, yy, W_VERT)
        b.w(W - 1, yy, W_VERT)
    b.w(0, 0, W_TL)
    b.w(W - 1, 0, W_TR)
    b.solid(0, 0, W, 2)
    b.solid(0, H - 1, W, 1)
    b.solid(0, 0, 1, H)
    b.solid(W - 1, 0, 1, H)

    for r in (MEETING, OFFICE):
        d0, d1 = r["door"], r["door"] + 2
        top = r["y"] - 2
        for yy in range(top, r["y"] + r["h"]):
            if d0 <= yy < d1:
                continue
            b.w(WALL_X, yy, W_VERT)
        b.w(WALL_X, d0 - 2, W_END_TOP)
        b.w(WALL_X, d0 - 1, W_END_BOT)
        b.w(WALL_X, d1, W_COL_TOP)
        for yy in range(d0, d1):
            b.g(WALL_X, yy, PLANK["fill"])
        b.solid(WALL_X, top, 1, d0 - top)
        b.solid(WALL_X, d1, 1, r["y"] + r["h"] - d1)

    div = OFFICE["y"] - 2
    for xx in range(1, WALL_X):
        b.w(xx, div, W_CAP)
        b.w(xx, div + 1, W_FACE)
    b.w(WALL_X, div, W_JOIN)
    b.solid(1, div, WALL_X - 1, 2)

    b.shade()

    # ---- meeting room: table centred, everything else against a wall ------
    b.zone("meeting", MEETING["x"], MEETING["y"], MEETING["w"], MEETING["h"])
    b.place("shelf", 1, 0)
    b.place("charts", 4, 0)
    b.place("painting", 7, 0)
    b.place("cooler", 11, 0)
    b.place("counter", 12, 0)
    b.table(3, 7, 8, 3)
    for i in range(3):
        b.chair(4 + i * 2, 7, "down", warm=True)
        b.chair(4 + i * 2, 10, "up", warm=True)
    mbottom = MEETING["y"] + MEETING["h"] - 1
    b.place_bottom("sofa", 1, mbottom)
    b.place_bottom("plant", 13, mbottom)

    # ---- manager's office: desk faces the door, manager sits behind it ----
    b.zone("office", OFFICE["x"], OFFICE["y"], OFFICE["w"], OFFICE["h"])
    b.place("cert", 2, div)
    b.place("trophy", 4, div)
    b.place("art_small", 6, div)
    b.place("cabinet", 11, div + 2)
    b.place("bookcase", 8, div)
    b.place("desk_small", 4, 22)
    b.chair(7, 23, "down")
    b.chair(5, 25, "up")
    b.chair(9, 25, "up")
    obottom = OFFICE["y"] + OFFICE["h"] - 1
    b.place_bottom("sofa", 1, obottom)
    b.place_bottom("plant2", 13, obottom)
    b.obj(b.computers, 5 * TS, 22 * TS, 3 * TS, TS, name="office-desk")

    # ---- main hall --------------------------------------------------------
    b.zone("hall", HALL["x"], HALL["y"], HALL["w"], HALL["h"])
    b.place("shelf", 15, 0)
    b.place("poster", 17, 0)
    b.place("notice", 30, 0)
    for x, y in CLUSTERS:
        b.cluster(x, y)

    hbottom = HALL["y"] + HALL["h"] - 1
    b.place_bottom("printer_desk", 16, hbottom)
    b.place_bottom("plant", 24, hbottom)
    b.place_bottom("plant2", 40, hbottom)
    b.place_right("cabinet", 46, 16)
    b.place("plant", 46, 10)

    # ---- break corner, open to the hall rather than walled off ------------
    b.zone("break", BREAK["x"], BREAK["y"], BREAK["w"], BREAK["h"])
    b.place("vending", 33, 0)
    b.place("counter", 37, 0)
    b.place("coffee", 40, 0)
    b.place("painting", 44, 0)
    b.place("sofa", 34, 3)
    b.place("plant", 45, 3)
    b.obj(b.speakers, 39 * TS, 7 * TS, TS, TS, name="break")

    # the board fills the hall's north wall, in sight from the entrance
    b.obj(b.boards, 22 * TS, 0, 3 * TS, 2 * TS, name="main")

    return b


def tilelayer(name, data, lid):
    return dict(data=data, height=H, id=lid, name=name, opacity=1,
                type="tilelayer", visible=True, width=W, x=0, y=0)


def objlayer(name, objs, lid):
    return dict(draworder="topdown", id=lid, name=name, objects=objs,
                opacity=1, type="objectgroup", visible=True, x=0, y=0)


def main():
    b = build()
    tilesets = json.load(open(SRC))["tilesets"] + [
        dict(columns=1, firstgid=CHAIR_FIRSTGID, image="items/chair.png",
             imageheight=1472, imagewidth=32, margin=0, name="chair",
             spacing=0, tilecount=23, tileheight=64, tilewidth=32),
    ]
    out = dict(compressionlevel=-1, height=H, infinite=False,
               orientation="orthogonal", renderorder="right-down",
               tiledversion="1.10.2", tileheight=TS, tilewidth=TS,
               type="map", version="1.10", width=W,
               nextlayerid=20, nextobjectid=b.nid, tilesets=tilesets)
    out["layers"] = [
        tilelayer("Ground", b.ground, 1),
        tilelayer("Walls", b.walls, 2),
        objlayer("Furniture", b.furniture, 3),
        objlayer("Chair", b.chairs, 4),
        objlayer("Computer", b.computers, 5),
        objlayer("Whiteboard", b.boards, 6),
        objlayer("Speaker", b.speakers, 7),
        objlayer("Colliders", b.colliders, 8),
        objlayer("Zones", b.zones, 9),
    ]
    json.dump(out, open(DST, "w"), indent=1)
    print("wrote", DST, "%dx%d" % (W, H),
          "furniture=%d chairs=%d colliders=%d"
          % (len(b.furniture), len(b.chairs), len(b.colliders)))


if __name__ == "__main__":
    main()
