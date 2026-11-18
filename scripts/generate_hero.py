from PIL import Image, ImageDraw, ImageFilter
import random, math

random.seed(11)
S = 2
W, H = 1200 * S, 1400 * S
img = Image.new('RGB', (W, H), '#201814')
draw = ImageDraw.Draw(img)

# --- sky gradient -----------------------------------------------------------
top = (28, 21, 18)
mid = (92, 56, 41)
low = (196, 121, 78)
for y in range(H):
    t = y / H
    if t < 0.62:
        k = t / 0.62
        c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
    else:
        k = min(1, (t - 0.62) / 0.38)
        c = tuple(int(mid[i] + (low[i] - mid[i]) * k) for i in range(3))
    draw.line([(0, y), (W, y)], fill=c)

# warm sun glow
glow = Image.new('RGB', (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([W * 0.52, H * 0.28, W * 0.98, H * 0.62], fill=(231, 156, 101))
glow = glow.filter(ImageFilter.GaussianBlur(150 * S))
img = Image.blend(img, Image.blend(img, glow, 0.55), 0.75)
draw = ImageDraw.Draw(img)

# soft cloud bands
for i, (yy, alpha) in enumerate([(0.34, 26), (0.42, 20), (0.5, 16)]):
    band = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    bd.ellipse([-W * 0.2, H * yy - 60 * S, W * 0.8, H * yy + 70 * S], fill=(255, 214, 185, alpha))
    bd.ellipse([W * 0.35, H * (yy - 0.04), W * 1.2, H * (yy + 0.05)], fill=(255, 220, 194, alpha))
    band = band.filter(ImageFilter.GaussianBlur(60 * S))
    img = Image.alpha_composite(img.convert('RGBA'), band).convert('RGB')
draw = ImageDraw.Draw(img)

# distant tree line
for x in range(-50, W + 100, 55 * S):
    h = random.randint(110, 230) * S
    y = int(H * 0.66)
    draw.ellipse([x, y - h, x + 120 * S, y + 30 * S], fill=(44, 38, 31))

GROUND = int(H * 0.78)

# --- plaza ------------------------------------------------------------------
draw.rectangle([0, GROUND, W, H], fill=(35, 29, 25))
for i in range(14):
    y = GROUND + i * 18 * S
    draw.line([(0, y), (W, y)], fill=(30, 25, 22) if i % 2 else (40, 33, 28))
# reflecting strip
draw.polygon([(W * 0.16, GROUND), (W * 0.84, GROUND), (W, H), (0, H)], fill=(47, 37, 31))

# --- main building ----------------------------------------------------------
def window_row(x0, x1, y, count, wh, gap, color=(240, 187, 137)):
    total = x1 - x0
    slot = total / count
    for i in range(count):
        wx = x0 + i * slot + gap
        ww = slot - gap * 2
        lit = random.random() > 0.32
        draw.rounded_rectangle(
            [wx, y, wx + ww, y + wh],
            radius=2 * S,
            fill=(color if lit else (58, 46, 38))
        )

# base plinth
draw.rectangle([W * 0.10, GROUND - 26 * S, W * 0.90, GROUND + 8 * S], fill=(214, 190, 166))
draw.rectangle([W * 0.10, GROUND - 10 * S, W * 0.90, GROUND + 2 * S], fill=(166, 138, 112))

# side wings
for (x0, x1, top_y) in [
    (W * 0.09, W * 0.36, 0.47),
    (W * 0.64, W * 0.91, 0.47),
    (W * 0.14, W * 0.30, 0.40),
    (W * 0.70, W * 0.86, 0.40),
]:
    draw.rectangle([x0, H * top_y, x1, GROUND], fill=(198, 172, 148))
    draw.rectangle([x0, H * top_y, x1, H * top_y + 12 * S], fill=(230, 208, 184))
    # vertical fins
    for x in range(int(x0), int(x1), 26 * S):
        draw.rectangle([x, H * top_y + 18 * S, x + 7 * S, GROUND - 30 * S], fill=(178, 151, 128))
    # window bands
    for row in range(3):
        y = H * top_y + (60 + row * 62) * S
        window_row(x0 + 20 * S, x1 - 16 * S, y, 4, 30 * S, 9 * S, (233, 179, 128))

# central atrium
draw.rectangle([W * 0.31, H * 0.30, W * 0.69, GROUND], fill=(222, 199, 175))
draw.rectangle([W * 0.31, H * 0.30, W * 0.69, H * 0.30 + 16 * S], fill=(243, 226, 205))
# glass grid center
draw.rectangle([W * 0.355, H * 0.355, W * 0.645, H * 0.66], fill=(70, 66, 58))
for i in range(7):
    x = W * 0.355 + i * (W * 0.29 / 7)
    draw.rectangle([x + 4 * S, H * 0.355, x + (W * 0.29 / 7) - 6 * S, H * 0.66], fill=(54, 49, 43))
    # warm interior glow on some panes
    if i in (1, 3, 5):
        draw.rectangle(
            [x + 4 * S, H * 0.355, x + (W * 0.29 / 7) - 6 * S, H * 0.66],
            fill=(118, 84, 58)
        )
        draw.rectangle(
            [x + 9 * S, H * 0.44, x + (W * 0.29 / 7) - 12 * S, H * 0.64],
            fill=(212, 150, 96)
        )

# tower
draw.rectangle([W * 0.45, H * 0.20, W * 0.55, H * 0.34], fill=(213, 188, 162))
draw.rectangle([W * 0.45, H * 0.20, W * 0.55, H * 0.205], fill=(241, 221, 199))
draw.rectangle([W * 0.462, H * 0.215, W * 0.538, H * 0.33], fill=(88, 76, 64))
for i in range(3):
    y = H * 0.22 + i * H * 0.036
    draw.rectangle([W * 0.466, y, W * 0.534, y + H * 0.022], fill=(216, 156, 105))

# entrance
draw.rectangle([W * 0.405, H * 0.665, W * 0.595, GROUND - 20 * S], fill=(32, 27, 23))
draw.arc([W * 0.405, H * 0.60, W * 0.595, H * 0.73], 180, 360, fill=(242, 216, 188), width=10 * S)
for i in range(5):
    x = W * 0.415 + i * W * 0.036
    draw.rectangle([x, H * 0.64, x + 5 * S, GROUND - 20 * S], fill=(56, 46, 38))

# uplights
for x in (0.18, 0.28, 0.38, 0.62, 0.72, 0.82):
    cone = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cone)
    cx = W * x
    cd.polygon(
        [(cx - 6 * S, GROUND - 30 * S), (cx + 6 * S, GROUND - 30 * S), (cx + 52 * S, GROUND - 300 * S), (cx - 52 * S, GROUND - 300 * S)],
        fill=(255, 186, 122, 26)
    )
    cone = cone.filter(ImageFilter.GaussianBlur(18 * S))
    img = Image.alpha_composite(img.convert('RGBA'), cone).convert('RGB')
draw = ImageDraw.Draw(img)

# trees foreground
for side in (-1, 1):
    for k in range(4):
        cx = W * (0.06 if side < 0 else 0.94) + side * k * 34 * S * -1
        cy = GROUND - 20 * S
        h = (300 + k * 45) * S
        draw.rectangle([cx - 6 * S, cy - h * 0.3, cx + 6 * S, cy], fill=(38, 31, 26))
        for j in range(5):
            r = (100 - j * 12) * S
            draw.ellipse(
                [cx - r, cy - h * (0.28 + j * 0.12) - r * 0.8, cx + r, cy - h * (0.28 + j * 0.12) + r * 0.5],
                fill=(31, 40, 30) if j % 2 else (36, 45, 33)
            )

# --- vignette + grain -------------------------------------------------------
vignette = Image.new('L', (W, H), 0)
vd = ImageDraw.Draw(vignette)
vd.ellipse([-W * 0.25, -H * 0.2, W * 1.25, H * 1.2], fill=255)
vignette = vignette.filter(ImageFilter.GaussianBlur(120 * S))
dark = Image.new('RGB', (W, H), (12, 9, 7))
img = Image.composite(img, dark, vignette)
img = Image.blend(img, img.filter(ImageFilter.GaussianBlur(0.6 * S)), 0.18)

pix = img.load()
for _ in range((W * H) // 24):
    x = random.randrange(W)
    y = random.randrange(H)
    r, g, b = pix[x, y]
    n = random.randint(-7, 7)
    pix[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

img = img.resize((1200, 1400), Image.LANCZOS)
img.save('client/public/images/campus-hero.jpg', 'JPEG', quality=90, optimize=True)
print('wrote', img.size)
