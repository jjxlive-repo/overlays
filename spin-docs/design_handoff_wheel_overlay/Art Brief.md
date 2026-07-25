# Art Brief — Spin The Screen overlay

## How to use this

Paste the **Style preamble** once, then one asset prompt per message. Two practical notes:

- **Ask for one asset per image.** Image models are bad at sprite sheets — you'll get
  inconsistent scale and muddy alpha. Where I've listed variants, generate them as
  separate images in the same chat so the style carries over.
- **Always say "transparent background, PNG"** and **"no text, no letters, no numbers"**.
  Every name in this overlay is live text rendered over the art; baked-in lettering makes
  the asset unusable.

Priority order below is real — the top five are where hand-built CSS is weakest and art
buys the most. The rest already look fine and can wait.

---

## Style preamble (paste first)

> I'm making art assets for a live-stream overlay. Consistent style for everything:
> flat cartoon "sticker" illustration, bold 6–8px dark outline in near-black purple
> `#2A0447`, chunky simplified forms, minimal internal detail, cel shading with 2–3 tone
> steps and one hard specular highlight — no soft airbrush gradients, no photorealism,
> no drop shadows baked in.
> Palette: purples `#3B0764 #5B1799 #7B2FBE #A855F7 #C084FC #E879F9`, paper white
> `#FAF5FF`, gold accents `#FBBF24 #FDE68A #B45309`, water lavender `#C4B5FD #A5B4FC`.
> Gold is reserved for the top tier only, so most assets have a purple and a gold variant.
> Every asset: transparent background, PNG, centred, roughly 12% empty margin, no text,
> no letters, no numbers, no watermark, straight-on or gentle three-quarter view,
> no perspective vanishing point.

---

## 1 — Stamp die  ·  `stamp-die.png`  ·  2048×2048

The flagship prop. Currently built from CSS boxes and it shows.

> A chunky cartoon rubber stamp tool, three-quarter view from slightly above, standing
> upright. Round lacquered purple handle knob on top (`#C084FC` to `#7B2FBE`), a short
> ribbed metal ferrule in gold `#FBBF24`, and a wide rectangular wooden body in deep
> purple `#5B1799` to `#2A0447`. The rubber stamping face on the bottom is visible as a
> flat magenta-pink pad `#E879F9`, completely blank. Thick dark outline, sticker style,
> one hard highlight down the left edge of the handle. Transparent background, no text.

**Also ask for:** a **gold Legend variant** (handle `#FDE68A → #B45309`, gold body bands),
and the same die **tilted 25° as if mid-press**, so the press frame can swap sprites.

---

## 2 — Ink impression alpha  ·  `ink-alpha-1.png` … `-3.png`  ·  2048×1024

This is what makes a stamp look *stamped* rather than printed. Three variants so repeat
stamps don't look identical.

> A black-on-white alpha mask texture of a rubber-stamp ink impression, no imagery — just
> the ink coverage pattern. Solid black in the centre, breaking up toward the edges into
> speckle, fibre gaps and dry patches, like a rubber stamp pressed with uneven pressure on
> slightly textured paper. High contrast, no grey mush, no paper colour, no text, no
> border. Pure black shapes on pure white.

---

## 3 — Bucket  ·  `bucket.png`  ·  2048×2048

Used twice: the buckets that get thrown at you, *and* the receptacle the ball drops into.
One prop, two jobs — worth getting right.

> A chunky cartoon galvanised bucket, three-quarter view, tapered narrower at the base,
> with two horizontal hoop bands around the body and a rolled rim. Body in purple
> `#7B2FBE` with `#C9A6F0` highlight and `#3B0764` shadow, rim and bands in lavender
> `#C084FC`. A thin dark metal bail handle arcs over the top, attached with two round
> studs. Empty — no water. Thick dark outline, sticker style, one hard vertical highlight
> on the left of the body. Transparent background, no text.

**Also ask for:** a **gold-rim Legend variant**; the bucket **tipped ~110° pouring**, mouth
toward the viewer's right; and a **top-down view of the open mouth** (an ellipse of dark
interior with a rim) for the ball-drop receptacle.

---

## 4 — Sphere shading overlay  ·  `ball-shell.png`  ·  2048×2048

The Ball Drop turns your virtual cam into a ball. The cam is a flat circle — this is the
layer that makes it read as a sphere. Two separate images:

> **(a)** A circular sphere shading overlay: transparent in the centre, darkening toward
> the lower-right edge into deep purple-black, with a soft ambient occlusion ring around
> the whole rim. No colour in the middle, no outline, nothing but the shading. Square
> canvas, the circle touching the edges. Transparent PNG.

> **(b)** A circular glossy highlight layer: one large soft elliptical white highlight in
> the upper-left third and a thin bright rim-light arc along the upper edge, everything
> else fully transparent. No outline, no shading, no colour. Transparent PNG.

**Also ask for:** a thick **ring frame** (a hollow circular band, purple with a lighter
inner bevel, plus a gold variant) to sit as the ball's edge.

---

## 5 — Supporter brick  ·  `brick.png`  ·  1024×320

Sits behind live names, must stay dark enough for white chat over it.

> A single cartoon brick face, viewed straight on, wide rectangular format with slightly
> rounded corners and subtly irregular chipped edges. Very dark plum stone `#241041` at
> the top fading to near-black `#0E041B` at the bottom, with a faint 1px lighter top edge
> and a soft dark inner shadow along the bottom. Coarse stone speckle, restrained — this
> is a background surface, not a hero prop. Thin dark outline. Transparent background,
> no text, no mortar around it.

**Also ask for:** a **gold-edged variant** (thin gold `#FBBF24` outline and faint inner
gold glow) for $100+ supporters, and 2 alternate chip patterns so the wall isn't uniform.

---

## 6 — Water  ·  three separate images  ·  2048×2048

> **(a) Splash crown** — a cartoon water splash crown seen from the front: an irregular
> upward-flaring ring of water with 8–12 rounded spikes and separated droplets flying off
> the tips. White `#FFFFFF` core to lavender `#C4B5FD` edges, translucent look, thick
> lighter outline. Transparent PNG, no text.

> **(b) Thrown water mass** — a single airborne blob of water mid-flight, stretched
> diagonally with a rounded leading head and a tapering trailing tail breaking into 3–4
> droplets. White to lavender `#A5B4FC`, glossy highlight on the leading edge.
> Transparent PNG.

> **(c) Wet film** — a soft translucent sheen overlay for a face: a rounded oval of pale
> lavender-white translucency, brightest along the top edge, fading to nothing at the
> bottom, with 3–4 subtle elongated specular highlights. Very low contrast, no outline,
> no facial features. Transparent PNG.

---

## 7 — Reel housing  ·  `reel-housing.png`  ·  2048×1024

> A chunky cartoon arcade slot-machine reel housing, front view: a wide rounded-rectangle
> cabinet in purple `#7B2FBE` to `#25043F` with a thick lavender `#C084FC` bezel and a
> large empty dark horizontal window cut through the middle. Two magenta `#E879F9`
> triangular selection pointers, one on each side, pointing inward at the centre of the
> window. Rounded plastic toy-like bevels, bold dark outline, one highlight along the top
> edge. The window must be fully transparent. No text.

---

## 8 — Ornate frame  ·  `frame-marquee.png`  ·  1536×1536

Needs to be 9-slice friendly: uniform edges, all the character in the corners.

> An ornate cartoon arcade marquee border frame, front view, square, hollow — the entire
> centre transparent. Purple `#7B2FBE` and lavender `#C084FC` banded border with rounded
> diamond studs at the four corners. The straight edge sections must be simple and
> uniform so they can be stretched; keep all decoration in the corners. Bold dark outline.
> Transparent background, no text.

**Also ask for:** a **gold Legend variant** with heavier corner ornament.

---

## 9 — Light  ·  two images

> **(a) Spotlight cone** — a soft warm stage-light cone: narrow at the top, flaring wide
> at the bottom, pale gold `#FDE68A` at maybe 30% opacity fading to fully transparent at
> the edges and toward the top. Slightly volumetric with 2–3 faint internal light streaks.
> No outline. Transparent PNG.

> **(b) Floor pool** — a warm elliptical pool of light on the ground, brightest at the
> centre, fading to transparent at the rim. Pale gold. No outline. Transparent PNG.

---

## 10 — Glass  ·  two images

> **(a) Crack web** — a cartoon screen-fracture pattern: sharp straight cracks radiating
> from a single off-centre impact point with secondary branching, and a small cluster of
> tiny fragments at the core. Bright white `#FAF5FF` lines with a thin dark edge on one
> side of each crack for depth. Only the cracks — everything else transparent. No text.

> **(b) Shards** — 6 separate angular glass shards of different sizes, arranged spread
> apart on the canvas so they can be cut out individually. Pale translucent white-lavender
> with bright edge highlights, thin dark outline. Transparent PNG.

---

## 11 — Small stuff (lowest priority, CSS handles these fine)

- **Falling star** — a rounded 4-point sparkle with a short motion streak. Lavender and gold variants.
- **Lightning bolt** — a chunky cartoon zigzag bolt, white core with gold outer glow, tapering to a point.
- **Splat badge** — a magenta paint-splat blob with a circular hole in the middle, for the avatar fallback frame.
- **Confetti** — 6 separate small shapes (rectangle, curl, diamond) in `#E879F9 #C084FC #FBBF24 #FAF5FF`.
- **Tier ornaments** — four drawn emblems: a 4-point star, a double star, an 8-point burst, and a crown. Purple set and gold set. These currently use font glyphs.

---

## If you only commission five

1. Stamp die (+ gold variant)
2. Ink impression alphas
3. Bucket (+ tipped, + gold rim)
4. Sphere shading and gloss for the ball
5. Brick faces

Those five carry the four effects a viewer actually looks at, plus the wall that's on
screen permanently.
