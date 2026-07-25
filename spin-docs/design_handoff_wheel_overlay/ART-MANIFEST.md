# Spin The Screen — generated art manifest

This pack fills the production-art gaps identified in `Art Brief.md`,
`Wheel Overlay Spec.md`, and `Pasted markdown.md`.

## Audit result

The supplied ZIP contains briefs, HTML/CSS/JavaScript, and two visual references,
but no finished production PNGs.

Three assets were already completed earlier and were not duplicated here:

- Reel housing → `splatty-reel-housing-empty-thin.png`
- Eight action icons → `splatty-action-icons-8-grid.png`
- Four accessible prize-tier frames → `splatty-prize-reveal-frames-4-tier-accessible.png`

## Generated files

### Stamp

- `stamp-die.png` — standard upright purple stamp
- `stamp-die-press.png` — compressed/tilted press frame
- `stamp-die-legend.png` — gold Legend variant
- `ink-plate.png` — blank dark ink-impression plate
- `ink-alpha-1.png` — heavy uneven impression mask
- `ink-alpha-2.png` — dry-streak impression mask
- `ink-alpha-3.png` — lighter broken impression mask
- `seal-legend.png` — blank gold Legend seal

### Bucket and water

- `bucket.png` — upright empty purple bucket
- `bucket-legend.png` — purple bucket with unmistakable gold Legend hardware
- `bucket-pour.png` — right-facing tipped bucket with attached water
- `bucket-mouth.png` — top-down ball-drop receptacle
- `water-sheet.png` — separate right-moving thrown water mass
- `water-splash-crown.png` — front-facing splash crown
- `wet-film.png` — subtle face sheen overlay

### Ball Drop

- `ball-shell.png` — lower-right sphere shading and rim occlusion
- `ball-gloss.png` — upper-left gloss and rim-light layer
- `ball-ring.png` — purple hollow webcam ring
- `ball-ring-legend.png` — gold Legend webcam ring

Recommended layer order:

1. Circular webcam crop
2. `ball-shell.png`
3. `ball-gloss.png`
4. `ball-ring.png` or `ball-ring-legend.png`

### Supporter wall

- `brick.png` — standard dark-plum supporter brick
- `brick-2.png` — alternate chip pattern
- `brick-3.png` — alternate chip pattern
- `brick-legend.png` — dark brick with gold top-tier edge

All four bricks are exactly 1024×320 and retain a dark, uncluttered live-text area.

### Remaining commissioned effects

- `frame-marquee.png` — hollow purple portrait marquee
- `frame-marquee-legend.png` — hollow gold Legend marquee
- `glass-crack-web.png` — standalone radial crack overlay
- `glass-shards.png` — six separated shard sprites
- `spotlight-cone.png` — warm gold cone; lower opacity in CSS
- `spotlight-floor-pool.png` — warm gold floor ellipse
- `splat-badge.png` — blank-center purple splat badge
- `storm-star.png` — lavender star, gold bolt, blue rain marks

## Technical notes

- Every visible overlay asset is a PNG with real alpha and transparent corners.
- The three `ink-alpha-*.png` files are intentionally opaque, pure two-color
  black-and-white masks at exactly 2048×1024.
- `ball-shell.png`, `wet-film.png`, `spotlight-cone.png`, and
  `spotlight-floor-pool.png` are compositing layers; tune their final opacity in CSS.
- No asset contains baked text, letters, numbers, scene backgrounds, checkerboards,
  or drop shadows.
- Gold is reserved for Legend/top-tier variants. Standard assets rely on silhouette,
  ornament, and light/dark contrast—not blue-versus-purple hue alone.

## Still handled well by CSS

The brief explicitly marks confetti, standalone lightning, small falling sparkles,
and tier ornament glyphs as lowest priority. They are not duplicated here because
the existing CSS implementation already handles them and the supplied accessible
tier-frame sheet replaces the tier-glyph dependency.
