# Feed Jamie × Splatty Squad — Art Needs (ChatGPT / image gen)

Running tally of images the merged mechanic needs. Everything below has a working
in-code fallback (inline SVG or CSS), so nothing blocks going live — real art is a
polish drop. Deliver transparent PNGs, drop into the paths shown, done (the overlay
cache-busts on every load, no code change needed).

## SHARED STYLE PREAMBLE (paste before every prompt)
> Flat 2D cartoon sticker illustration, thick dark-navy (#1A0A2A) outline, bold cel
> shading, playful chunky "Boogaloo" energy. Transparent background, PNG, centered,
> no drop shadow, no text. Matches the existing Feed Jamie / Top Splatty overlay art.

---

## 1. Premium wheel treats — `overlays/assets/feed-jamie/items/` (4 files) ⚠ NEEDED
Gift-only prizes from the wheel; must look visibly FANCIER than the free items
(biscuit, bone, tennis ball). Square-ish, reads at ~110px. Currently inline-SVG placeholders.

- `golden-bone.png` — > [PREAMBLE] A gleaming solid-gold dog bone with a small
  sparkle star, subtle shine highlights. Luxurious but cartoon-simple.
- `diamond-biscuit.png` — > [PREAMBLE] A pale-blue dog biscuit encrusted with one
  big faceted diamond in the center, tiny sparkles around it.
- `galaxy-treat.png` — > [PREAMBLE] A round dog treat that looks like a swirling
  purple galaxy — deep purple with a nebula swirl, tiny stars in pink/gold/cyan.
- `royal-burger.png` — > [PREAMBLE] A cartoon burger wearing a tiny gold crown on
  the top bun. Juicy, chunky, fit for a king.

## 2. Circular prize-wheel face — `overlays/assets/feed-jamie/items/` (optional, CSS works)
The wheel is currently CSS (pastel conic wedges + gold pointer + purple hub) with the
item art placed on the wedges — it looks decent. Real art would elevate it:

- `wheel-face.png` — > [PREAMBLE] A circular game-show prize wheel face with 8 equal
  pastel wedges (cream/lavender/pink/ice-blue repeating), thick navy rim with small
  gold studs, empty wedges (item icons are added in code). Front-on view.
- `wheel-pointer.png` — > [PREAMBLE] A chunky downward-pointing gold pointer/flap for
  the top of a prize wheel.
  (If delivered: also ask Claude to wire `wheel-face.png` in — one small code change,
  the only item on this list that needs code.)

## 3. Already covered — NO new art needed
- Crowd splatties: reuses `assets/top-splatty/character/splatty-fan-yt/tt-01..03.png` ✅
- Crown (top treater + Jamie T4+): `assets/top-splatty/ui/top-splatty-crown.png` ✅
- Iced crown (Jamie T6 MYTHIC): `assets/top-splatty/ui/crown-iced.png` ✅
- Jamie drip tiers (glow/rays/spotlight/halo/sparkles): pure CSS ✅
- Orbiting treats around Jamie (T3+): reuses existing item PNGs ✅
- Tier meter/badge: CSS ✅

## 4. Stretch / later (only if the mechanic sticks)
- 2-3 extra fan poses per platform (`splatty-fan-yt-04/05.png`, `-tt-04/05.png`) so a
  7-fan crowd repeats less.
- A "fan tossing upward" pose per platform for the wheel-prize toss moment.
- Jamie MYTHIC celebration frame (`jamie-mythic-celebrate.png`, matching the manifest
  canvas + floor anchor of the other Jamie frames) for tier-6 unlocks.
