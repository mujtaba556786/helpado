# Helpado brand mark

`pin.png` is the master artwork: a white location pin with a handshake inside,
on transparent background. Everything else — every launcher icon, the splash
icon, the favicons, the in-app logo and the admin panel's mark — is generated
from it, so the mark only ever exists in one place.

## Regenerating

```bash
python3 frontend/res/brand/build_icons.py
```

Requires Pillow (`pip3 install Pillow`). It rewrites all 26 files in place and
prints what it wrote. Never hand-edit the generated PNGs — change `pin.png` or
the constants at the top of the script and re-run.

## What the script guarantees

- **Brand colour.** The tile gradient is `#43AE71 → #1C7449`, the same tokens the
  UI5 theme and the landing page use, so the launcher icon matches the app.
- **Android icons** keep the rounded tile and alpha, matching the densities
  declared in `frontend/config.xml`.
- **iOS icons are square and fully opaque.** iOS applies its own corner mask, and
  the App Store rejects an icon with an alpha channel — baking corners in would
  round them twice.
- **Splash assets** keep the insets Android 12's SplashScreen API expects
  (62.1% for `splashscreen.png`, 88.2% for `splash_icon.png`).
- Everything renders at 4x and downsamples, so the 36px launcher icon stays clean.
