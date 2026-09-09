import json, os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rendermap import load_tilesets, tile_image

OUT = r"C:\Users\jitto\AppData\Local\Temp\claude\D--Projects-spacialmeet\4ff67d8a-f5c5-4d2d-878c-197350166a4d\scratchpad\insp"

def compose(path, only=None):
    m = json.load(open(path)); base = os.path.dirname(os.path.abspath(path))
    sets = load_tilesets(m, base); W = m['width']
    img = Image.new("RGBA", (W*32, m['height']*32), (0,0,0,0))
    for l in m['layers']:
        if only and l['name'] not in only: continue
        if l['type'] == 'tilelayer':
            for i,g in enumerate(l['data']):
                if not g: continue
                t = tile_image(sets, g)
                if t: img.alpha_composite(t, ((i%W)*32, (i//W)*32))
        elif l['type'] == 'objectgroup':
            for o in sorted(l['objects'], key=lambda o: o['y']):
                if not o.get('gid'): continue
                t = tile_image(sets, o['gid'])
                if t: img.alpha_composite(t, (int(o['x']), int(o['y']-t.height)))
    return img

def crop(img, x, y, w, h, scale, out, bg=(150,150,158,255)):
    c = Image.new("RGBA", (w*32, h*32), bg)
    c.alpha_composite(img.crop((x*32, y*32, (x+w)*32, (y+h)*32)))
    c = c.resize((w*32*scale, h*32*scale), Image.NEAREST)
    d = ImageDraw.Draw(c)
    for i in range(w+1): d.line([(i*32*scale,0),(i*32*scale,c.height)], fill=(255,120,60,90))
    for j in range(h+1):
        d.line([(0,j*32*scale),(c.width,j*32*scale)], fill=(255,120,60,90))
        if j < h: d.text((3, j*32*scale+3), str(y+j), fill=(255,235,120,255))
    for i in range(w): d.text((i*32*scale+3, 3), str(x+i), fill=(255,235,120,255))
    c.convert("RGB").save(os.path.join(OUT, out)); print(out, c.size)
