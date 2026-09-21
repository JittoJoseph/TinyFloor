"""
Draws TinyFloor's mark — the rail's Logo (components/app/AppShell.tsx): a
rounded square in ink, with a two-by-two of pixels, one of them orange — into
every icon the site ships. Run it again if the mark changes:

    python scripts/make-icons.py

Writes src/app/favicon.ico, src/app/icon.svg, src/app/apple-icon.png and
public/icon-192.png, icon-512.png and icon-maskable-512.png.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "src" / "app"
PUBLIC = ROOT / "public"

INK = (26, 26, 24)  # --ui-foreground, light theme
PAPER = (250, 250, 248)  # --ui-background, light theme
BRAND = (255, 90, 31)  # --ui-brand
RADIUS = 0.30  # rounded-[30%], as the Logo draws it
FAINT = 0.45  # the two dimmer pixels


def blend(top, bottom, alpha):
    return tuple(round(t * alpha + b * (1 - alpha)) for t, b in zip(top, bottom))


def mark(size, *, rounded=True, inner=0.5, pad=0.0):
    """The mark at `size` pixels. `inner` is the grid's share of the tile (the
    Logo uses half; tiny favicons get more so the pixels survive). `pad` shrinks
    the tile inside a transparent canvas."""
    scale = 8  # drawn big, then reduced, so edges are smooth
    big = size * scale
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    inset = round(big * pad)
    tile = big - inset * 2
    box = (inset, inset, inset + tile - 1, inset + tile - 1)
    if rounded:
        draw.rounded_rectangle(box, radius=round(tile * RADIUS), fill=INK)
    else:
        draw.rectangle(box, fill=INK)

    # The Logo's 16-unit grid: squares at 1 and 9, six units wide.
    grid = tile * inner
    unit = grid / 16
    left = inset + (tile - grid) / 2
    faint = blend(PAPER, INK, FAINT)
    for (x, y), color in (((1, 1), PAPER), ((9, 1), faint), ((1, 9), faint), ((9, 9), BRAND)):
        x0 = round(left + x * unit)
        y0 = round(left + y * unit)
        x1 = round(left + (x + 6) * unit) - 1
        y1 = round(left + (y + 6) * unit) - 1
        draw.rectangle((x0, y0, x1, y1), fill=color)

    return image.resize((size, size), Image.LANCZOS)


def svg():
    """A vector favicon that follows the tab's theme, like the Logo does."""
    return """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .tile { fill: #1a1a18 } .ink { fill: #fafaf8 } .brand { fill: #ff5a1f }
    @media (prefers-color-scheme: dark) {
      .tile { fill: #ededeb } .ink { fill: #0f0f10 } .brand { fill: #ff6b35 }
    }
  </style>
  <rect class="tile" width="32" height="32" rx="9.6"/>
  <g shape-rendering="crispEdges">
    <rect class="ink" x="7" y="7" width="8" height="8"/>
    <rect class="ink" x="17" y="7" width="8" height="8" opacity="0.45"/>
    <rect class="ink" x="7" y="17" width="8" height="8" opacity="0.45"/>
    <rect class="brand" x="17" y="17" width="8" height="8"/>
  </g>
</svg>
"""


def main():
    # Tabs are tiny: a bigger grid there, so the four pixels still read.
    ico = [mark(size, inner=0.62) for size in (16, 32, 48)]
    ico[-1].save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:-1])
    (APP / "icon.svg").write_text(svg(), encoding="utf-8")
    # iOS rounds its own corners and dislikes transparency: a full square.
    mark(180, rounded=False).convert("RGB").save(APP / "apple-icon.png", optimize=True)
    mark(192).save(PUBLIC / "icon-192.png", optimize=True)
    mark(512).save(PUBLIC / "icon-512.png", optimize=True)
    # Android crops maskable icons to its own shape: full bleed, grid in the safe zone.
    mark(512, rounded=False, inner=0.42).save(PUBLIC / "icon-maskable-512.png", optimize=True)
    print("icons written")


if __name__ == "__main__":
    main()
