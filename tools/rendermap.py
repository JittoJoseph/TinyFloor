import json, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "frontend-nextjs", "public")

def load_tilesets(m, base):
    sets = []
    for ts in m["tilesets"]:
        img = os.path.normpath(os.path.join(base, ts["image"]))
        im = Image.open(img).convert("RGBA")
        cols = ts.get("columns") or im.width // ts["tilewidth"]
        sets.append((ts["firstgid"], ts["firstgid"] + ts["tilecount"] - 1, im, cols,
                     ts["tilewidth"], ts["tileheight"], ts["name"]))
    return sorted(sets, key=lambda s: -s[0])

def tile_image(sets, gid):
    gid &= 0x1FFFFFFF
    for first, last, im, cols, tw, th, _ in sets:
        if first <= gid <= last:
            i = gid - first
            c, r = i % cols, i // cols
            return im.crop((c * tw, r * th, c * tw + tw, r * th + th))
    return None

def render(path, out, grid=0, layers=None, objects=True, scale=1):
    m = json.load(open(path))
    base = os.path.dirname(os.path.abspath(path))
    sets = load_tilesets(m, base)
    tw, th = m["tilewidth"], m["tileheight"]
    W, H = m["width"] * tw, m["height"] * th
    canvas = Image.new("RGBA", (W, H), (24, 24, 32, 255))

    for l in m["layers"]:
        if layers and l["name"] not in layers:
            continue
        if l["type"] == "tilelayer":
            data = l["data"]
            for i, gid in enumerate(data):
                if not gid:
                    continue
                t = tile_image(sets, gid)
                if t is None:
                    continue
                x, y = (i % m["width"]) * tw, (i // m["width"]) * th
                canvas.alpha_composite(t, (x, y))
        elif l["type"] == "objectgroup" and objects:
            for o in sorted(l["objects"], key=lambda o: o["y"]):
                if not o.get("gid"):
                    continue
                t = tile_image(sets, o["gid"])
                if t is None:
                    continue
                canvas.alpha_composite(t, (int(o["x"]), int(o["y"] - t.height)))

    if grid:
        d = ImageDraw.Draw(canvas)
        for x in range(0, W, tw * grid):
            d.line([(x, 0), (x, H)], fill=(255, 120, 60, 90))
            d.text((x + 2, 2), str(x // tw), fill=(255, 220, 120, 220))
        for y in range(0, H, th * grid):
            d.line([(0, y), (W, y)], fill=(255, 120, 60, 90))
            d.text((2, y + 2), str(y // th), fill=(255, 220, 120, 220))

    if scale != 1:
        canvas = canvas.resize((int(W * scale), int(H * scale)), Image.NEAREST)
    canvas.convert("RGB").save(out)
    print(out, canvas.size)

if __name__ == "__main__":
    args = sys.argv[1:]
    render(args[0], args[1], grid=int(args[2]) if len(args) > 2 else 0,
           scale=float(args[3]) if len(args) > 3 else 1)
