"""
Generates every app icon variant from assets/images/icon-source.png.

Usage: python scripts/make-icons.py   (requires Pillow)

Outputs (assets/images/):
  icon.png                       1024x1024 main icon (iOS + fallback)
  android-icon-background.png    solid chalkboard green
  android-icon-foreground.png    artwork shrunk into the adaptive-icon safe zone
  android-icon-monochrome.png    white silhouette for Android 13+ themed icons
  splash-icon.png                rounded icon on transparency for the splash screen
  favicon.png                    48x48 for web
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "images"
SIZE = 1024
# Adaptive icons show roughly the central 66% (often as a circle); the artwork's bounding
# box is scaled to this fraction of the canvas so it stays inside that zone.
SAFE_FRACTION = 0.50

src = Image.open(OUT / "icon-source.png").convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)

# Background colour: median of the border pixels.
border = [src.getpixel((x, y)) for x in range(0, SIZE, 16) for y in (4, SIZE - 5)]
border += [src.getpixel((x, y)) for y in range(0, SIZE, 16) for x in (4, SIZE - 5)]
bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
print("background colour: #%02X%02X%02X" % bg)

src.save(OUT / "icon.png")
Image.new("RGB", (SIZE, SIZE), bg).save(OUT / "android-icon-background.png")


def clean(mask: Image.Image, open_size: int, close_size: int) -> Image.Image:
    """Removes speckles (opening), fills small holes (closing), softens the edge."""
    mask = mask.filter(ImageFilter.MinFilter(open_size)).filter(ImageFilter.MaxFilter(open_size))
    mask = mask.filter(ImageFilter.MaxFilter(close_size)).filter(ImageFilter.MinFilter(close_size))
    return mask.filter(ImageFilter.GaussianBlur(1.2))


def fit_to_safe_zone(img: Image.Image, box) -> Image.Image:
    """Crops `img` to `box`, scales it to SAFE_FRACTION of the canvas and centres it."""
    crop = img.crop(box)
    target = int(SIZE * SAFE_FRACTION)
    scale = target / max(crop.width, crop.height)
    crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(crop, ((SIZE - crop.width) // 2, (SIZE - crop.height) // 2), crop)
    return canvas


px = src.load()

# Foreground: everything clearly different from the chalkboard (tiles, letters, arrow).
fg_mask = Image.new("L", (SIZE, SIZE), 0)
fm = fg_mask.load()
for y in range(SIZE):
    for x in range(SIZE):
        r, g, b = px[x, y]
        fm[x, y] = 255 if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 110 else 0
fg_mask = clean(fg_mask, 11, 15).point(lambda v: 255 if v > 128 else 0)
# Background = dark area reachable from the edges, so dark ink enclosed by a tile stays opaque.
ImageDraw.floodfill(fg_mask, (0, 0), 128)
fg_mask = fg_mask.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.GaussianBlur(1.2))
box = fg_mask.point(lambda v: 255 if v > 128 else 0).getbbox()
pad = 8
box = (max(0, box[0] - pad), max(0, box[1] - pad), min(SIZE, box[2] + pad), min(SIZE, box[3] + pad))

fg = src.convert("RGBA")
fg.putalpha(fg_mask)
fit_to_safe_zone(fg, box).save(OUT / "android-icon-foreground.png")

# Monochrome: white tile silhouettes with the letters (black C, white chalk R) cut out.
letters = Image.new("L", (SIZE, SIZE), 0)
lm = letters.load()
for y in range(SIZE):
    for x in range(SIZE):
        r, g, b = px[x, y]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        black_ink = lum < 90 and b < r + 40
        white_chalk = lum > 170 and abs(r - b) < 18
        lm[x, y] = 255 if black_ink or white_chalk else 0
letters = clean(letters, 3, 7)
mono_alpha = Image.composite(Image.new("L", (SIZE, SIZE), 0), fg_mask, letters.point(lambda v: 255 if v > 128 else 0))
mono = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 255))
mono.putalpha(mono_alpha)
fit_to_safe_zone(mono, box).save(OUT / "android-icon-monochrome.png")

# Splash: the full icon with rounded corners on transparency.
rounded = src.convert("RGBA")
corner = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(corner).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=SIZE // 5, fill=255)
rounded.putalpha(corner)
rounded.resize((512, 512), Image.LANCZOS).save(OUT / "splash-icon.png")

src.resize((48, 48), Image.LANCZOS).save(OUT / "favicon.png")
print("icons written to", OUT)
