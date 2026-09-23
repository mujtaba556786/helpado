"""Generate the whole Helpado icon set from the extracted pin artwork.

Brand gradient is the app's own green (#43AE71 -> #1C7449), the same tokens the
UI5 theme and the landing page already use, so the launcher icon matches the UI.
"""
import os
from PIL import Image, ImageDraw

C0, C1 = (67, 174, 113), (28, 116, 73)      # #43AE71 -> #1C7449
RADIUS = 116 / 512                           # same corner ratio as the old mark
PIN = Image.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pin.png'))
SS = 4                                       # supersample factor for the corner mask


def tile(size, rounded=True):
    g = Image.new('RGB', (size, size))
    gp = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1)) if size > 1 else 0
            gp[x, y] = tuple(int(C0[i] + (C1[i] - C0[i]) * t) for i in range(3))
    if not rounded:
        return g.convert('RGBA')
    m = Image.new('L', (size * SS, size * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * SS - 1, size * SS - 1],
                                        radius=int(size * SS * RADIUS), fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(g, (0, 0), m)
    return out


def icon(size, rounded=True, opaque=False, pin_ratio=0.70, top_ratio=0.15):
    """Render at 4x then downsample, so small sizes stay clean."""
    big = max(size * SS, 512)
    base = tile(big, rounded=rounded)
    h = int(big * pin_ratio)
    p = PIN.resize((max(1, int(PIN.width * h / PIN.height)), h), Image.LANCZOS)
    base.alpha_composite(p, ((big - p.width) // 2, int(big * top_ratio)))
    out = base.resize((size, size), Image.LANCZOS)
    if opaque:                                # iOS rejects alpha in app icons
        flat = Image.new('RGB', (size, size), C0)
        flat.paste(out, (0, 0), out)
        return flat
    return out


def inset(canvas, ratio):
    """Icon centred on a transparent canvas — the Android-12 splash convention."""
    side = int(round(canvas * ratio))
    out = Image.new('RGBA', (canvas, canvas), (0, 0, 0, 0))
    out.alpha_composite(icon(side), ((canvas - side) // 2, (canvas - side) // 2))
    return out


def splash(w, h, bg):
    """Portrait launch image: the mark centred on a flat background."""
    out = Image.new('RGB', (w, h), bg)
    side = int(round(min(w, h) * 0.32))
    m = icon(side)
    out.paste(m, ((w - side) // 2, (h - side) // 2), m)
    return out


ANDROID_ICONS = [('ldpi', 36), ('mdpi', 48), ('hdpi', 72),
                 ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]
IOS_ICONS = (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024)
ANDROID_SPLASH = [('ldpi', 200, 320), ('mdpi', 320, 480), ('hdpi', 480, 800),
                  ('xhdpi', 720, 1280), ('xxhdpi', 960, 1600), ('xxxhdpi', 1280, 1920)]
IOS_SPLASH = [('Default~iphone', 320, 480), ('Default@2x~iphone', 640, 960),
              ('Default-568h@2x~iphone', 640, 1136), ('Default-667h', 750, 1334),
              ('Default-736h', 1242, 2208), ('Default-2436h', 1125, 2436),
              ('Default-Portrait~ipad', 768, 1024), ('Default-Portrait@2x~ipad', 1536, 2048)]

WHITE = (255, 255, 255)
NAVY = (15, 23, 42)          # matches StatusBarBackgroundColor in config.xml


def write_res(root, made):
    """Both Cordova trees carry the same res/ — frontend/res and the live project
    at frontend/mobile/res. They were byte-identical before this script existed;
    generating into both is what keeps them that way."""
    for name, px in ANDROID_ICONS:
        p = f'{root}/res/icon/android/{name}.png'
        icon(px).save(p); made.append((p, f'{px}px'))

    # iOS masks the icon itself, so these are square and opaque (alpha is rejected).
    for px in IOS_ICONS:
        p = f'{root}/res/icon/ios/icon-{px}.png'
        icon(px, rounded=False, opaque=True).save(p); made.append((p, f'{px}px'))

    inset(512, 0.621).save(f'{root}/res/screen/android/splashscreen.png')
    inset(288, 0.882).save(f'{root}/res/screen/android/splash_icon.png')
    made += [(f'{root}/res/screen/android/splashscreen.png', '512px'),
             (f'{root}/res/screen/android/splash_icon.png', '288px')]

    for name, w, h in ANDROID_SPLASH:
        p = f'{root}/res/screen/android/{name}.png'
        if os.path.exists(os.path.dirname(p)):
            splash(w, h, WHITE).save(p); made.append((p, f'{w}x{h}'))

    for name, w, h in IOS_SPLASH:
        p = f'{root}/res/screen/ios/{name}.png'
        if os.path.exists(os.path.dirname(p)):
            splash(w, h, NAVY).save(p); made.append((p, f'{w}x{h}'))


if __name__ == '__main__':
    HERE = os.path.dirname(os.path.abspath(__file__))
    F = os.path.abspath(os.path.join(HERE, '..', '..'))          # frontend/
    REPO = os.path.abspath(os.path.join(F, '..'))
    made = []

    write_res(F, made)                                            # frontend/res
    write_res(os.path.join(F, 'mobile'), made)                    # the live Cordova project

    icon(512).save(f'{F}/webapp/img/logo.png')
    icon(64).save(f'{F}/webapp/img/favicon.png')
    icon(180, rounded=False, opaque=True).save(f'{F}/webapp/img/apple-touch-icon.png')
    made += [(f'{F}/webapp/img/logo.png', '512px'), (f'{F}/webapp/img/favicon.png', '64px'),
             (f'{F}/webapp/img/apple-touch-icon.png', '180px')]

    # The React admin panel (vite publicDir -> served at /admin/logo.png).
    # Square on purpose: the panel's own Tailwind classes round it (rounded-xl in
    # the sidebar, rounded-[2.5rem] on the login card). Baking corners in as well
    # rounds it twice and the tile turns into a blob.
    adm = os.path.join(REPO, 'backend', 'public')
    icon(512, rounded=False, opaque=True).save(f'{adm}/logo.png')
    icon(64).save(f'{adm}/favicon.png')
    made += [(f'{adm}/logo.png', '512px'), (f'{adm}/favicon.png', '64px')]

    for p, size in made:
        print(f'{size:>10}  {os.path.relpath(p, REPO)}')
    print(f'\n{len(made)} files written')
