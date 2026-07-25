# SPIN THE SCREEN — Wheel Overlay Spec

Canvas: **1080 × 1920**, transparent browser source. `?live` on the URL strips the
review panel and mock backdrop and renders the stage 1:1.

### Face tracking

Two rects. `facecam` is the static camera window, default
`{ x: 170, y: 1040, w: 740, h: 420 }` — Curse and Spotlight frame against it.
`head` is the **tracked head box**, default `{ x: 390, y: 1075, w: 300, h: 365, roll: 0 }`,
and a tracker writes a fresh `{x, y, w, h, roll}` into it every frame. In this build a
synthetic bob/sway drives it so the anchoring is visible; the mock backdrop's head
placeholder rides the same signal.

Anything head-anchored reads the live value, never a static rect: it translates *and*
rotates with roll for the whole beat, including the dwell. The forehead point is
derived at `0.26 × head height` above head centre, rotated by roll. Stamp and Bucket
are fully tracked; Curse tracks the possessing avatar to the head centre.

---

## 1. Tiers

Four tiers, driven by gift value. Every tier scales the same three levers —
**size (`k`), duration, ornament** — so escalation reads instantly without new art.
Gold is reserved for Legend and appears nowhere else.

| tier | `k` | spin dur | hold | ornament | ring |
|---|---|---|---|---|---|
| SPIN | 1.00 | 1900 ms | 1200 ms | ✦ | `#7B2FBE` plum |
| POWER | 1.35 | 2500 ms | 1600 ms | ✦✦ | `#A855F7` bright |
| TAKEOVER | 1.75 | 3300 ms | 2100 ms | ✷ | `#E879F9` magenta |
| LEGEND | 2.15 | 5200 ms | 2600 ms | ♛ | `#FBBF24` gold |

`k` multiplies effect scale, stroke weights, particle counts, glow radius, canvas
bump amplitude and spark count. Reel revolutions are `4 + tierIndex`, so a Legend
spin visibly outlasts a Spin.

**Tier reads at a glance:** SPIN is local and contained; POWER breaks the facecam
bounds; TAKEOVER owns the full frame; LEGEND owns the full frame *in gold* with an
extra flash/emboss beat.

---

## 2. Lifecycle

Three phases. No receipt card, no ambient tail — the name rides above the reel while
it spins, then the effect *is* the payoff. One event at a time; the rest queue.

| phase | duration | what shows |
|---|---|---|
| `spinning` | tier `dur` | username + ornamented tier word at y 196, edge-on 3D reel at y 380 with tier ribbon, `SPINNING…` → `LANDING…` |
| `impact` | per effect | hero line + the effect itself; canvas bump on the beat. The hero line is the **only** place the name is written during impact — in-scene effects never print it a second time |
| `idle` | — | signature rail only |

The name is credited *during* the spin, so the tension beat and the attribution beat
are the same beat — nothing is spent on a card that just says who is about to spin.
When the effect lands the name is already established, which is why the hero line can
be a verb phrase rather than a re-introduction.

Zones: name 190–300 · reel/reveal 300–1050 · facecam 1040–1460 · signature rail
right edge from y 700.

**Signature rail — TAKEOVER and LEGEND only.** Spin and Power are consumed entirely
in the moment and leave nothing behind; the two paid tiers are the only ones that
persist, capped at 4, popping in at 300 ms `cb(.2,1.4,.3,1)`. That scarcity is the
point: a signature on screen means someone spent real money, so the rail stays
readable and stays an incentive. Legend badges are gold-embossed, Takeover magenta.

**Queueing** — `runId` guards teardown, so an interrupted effect can never leak DOM
into the next one. Queue depth is visible in the harness, not on the overlay.

---

## 3. The eight effects

All eight are integrated into the scene — masked, blended, displaced or lit against
the gameplay. None of them is text on a solid plate.

### STAMP ✦ — flagship, face-tracked
The name is *physically stamped on the forehead*. A chunky die swings in on an arc,
presses down and squashes 3.5% (hard ease-in), and on contact: canvas bump, ink burst,
expanding ripple ring — all three anchored to the brow, not the frame. It lifts away
revealing an ink impression built from an SVG turbulence + displacement +
speckle-erosion filter, blended `multiply` so the skin shows through the ink.
Double-ruled border, name, tier sub-line, rotated −4.5°.

The impression rides the head for the whole dwell — translating and rolling with it —
then peels off into the signature rail (Takeover, Legend) or fades (Spin, Power).

**Size by tier**, measured against tracked head width so it always sits on the brow:
Spin 54% · Power 68% · Takeover 80% · Legend 90%. Capped under head width so even
Legend never overhangs the skull.
**Duration by tier**: swing 390–470 ms · press 108–134 ms · lift 470–550 ms ·
dwell = `tier hold` (1200 → 2600 ms).
Legend swaps to a gold embossed seal with a raised inner highlight.

### CURSE ◍ — the giver possesses the camera
The curse **is the giver's avatar**. Their face is screen-blended over the tracked
head in three layers — a core at 62% plus two hue-split clones offset ±11 px running
stepped glitch loops — inside a breathing magenta halo, so it reads as something
wearing the streamer's face rather than a picture pasted on it. Four smaller
gold-ringed avatar sigils pin to the cursed frame's corners.

Around it: vignette multiplies inward, `screen`-blended RGB tear-bars glitch across
the cam on stepped 6-frame loops, a dashed magenta frame with gold corner brackets
snaps on, and dark ink drips run from the top edge. `avatarUrl` falls back to a
letter splat. No text label — the hero line carries the name.

### BUCKET ◒ — a bucket of water, on the head
Literal. A bucket swings down from above the tracked head (420 ms), tips at 440 ms,
and pours a tapered water column that lands on the crown at 960 ms. Impact throws
~16 × `k` droplets on arcing paths with gravity, a flattened rim ring expands from the
contact point, and the canvas bumps.

The head is then **wet**: a tracked sheen sits over the skull with a bright top
highlight, drips cling and run off the jaw, and everything rolls with the head for the
tier hold. Takeover and Legend keep going — a veil washes down the whole frame with
drips over the gameplay. Water is lavender-blue (`#C4B5FD`/`#A5B4FC`) with white
highlights, so it reads as water without leaving the palette.

### WEATHER ❉ — summon a storm
Particle pool falling on individually randomised paths (`--dx/--dy/--dr`), volume and
region both tier-gated:
Spin 42 particles in a strip inside the cam · Power 90 spilling past the cam ·
Takeover 150 full-frame · Legend 190 full-frame in gold with a lightning flash.
Top gradient multiplies to darken the sky.

### CRACK ◆ — break the glass
Radial fracture. Spokes grow out from the impact point at 180–340 ms
`cb(.1,.9,.2,1)`, each spawning a branch at a random 28–60° kink. White core flash,
380 ms screen shake, hard canvas bump, spark burst. The username is etched through a
turbulence displacement filter so it reads as scored into the glass.
Spin/Power fracture the cam (reach 240/460 px, 6/10 spokes);
Takeover/Legend fracture the whole screen from centre (900 px, 15/18 spokes).

### SPOTLIGHT ▲ — steal the spotlight
A giant radial dim mask with a clear hole *searches* — it sweeps to two decoy
positions (620 ms, 560 ms) before landing on the facecam (520 ms), with a warm
`screen`-blended beam glow tracking it. Name rises above the cam once it settles,
gold sparks on arrival. The dim lifts at `hold`.

### FRAME ▣ — claim the frame
An animated conic-gradient border rotates inside a mask (9 s, 5 s on Legend), with a
dashed inner rule, rotated diamond corner studs, and a name plate on the bottom edge.
Tier drives how much screen it claims — inset 120 / 74 / 40 / 18 px and thickness
14 / 22 / 32 / 44 px, so Legend is a frame around the entire broadcast.

### AVATAR ◉ — invade
The avatar badge slides in from off-screen left and overshoots
(520 ms `cb(.2,.95,.3,1.35)`), lands with a bump and spark burst, its name tag
snapping out beside it, then drifts up and out. `avatarUrl` is attempted; on error it
falls back to a letter splat instantly and never blocks the queue.

---

## 4. Motion vocabulary

Shared, so unrelated effects still feel like one system.

| beat | timing |
|---|---|
| name in | 420 ms `cb(.2,1.3,.3,1)` |
| reel decel | 1900–5200 ms `cb(.11,.79,.04,1)` |
| hero in | 520 ms `cb(.18,1.2,.3,1)` |
| stamp swing / press / lift | 390–470 / 108–134 / 470–550 ms by tier |
| stamp dwell | `tier hold`, tracked to the head |
| stamp peel | 640 ms (Takeover + Legend only) |
| bucket tip / pour / hit | 440 / 660 / 960 ms |
| canvas bump | 420–520 ms `cb(.2,.9,.2,1)`, amplitude × `k` |
| crack grow | 180–340 ms `cb(.1,.9,.2,1)` |
| spotlight move | 520–620 ms `cb(.35,0,.25,1)` |
| signature pop | 300 ms `cb(.2,1.4,.3,1)` — takeover + legend only |
| effect fade out | 420 ms ease |

Impacts land hard and fast; reveals overshoot; exits are soft. Nothing linear except
falling particles and the rotating marquee.

---

## 5. Type & colour

- **Boogaloo** — impact display: hero lines, tier words, etched names.
- **Fredoka 600/700** — names, plates, UI.
- **DM Mono** — timers, sub-lines, telemetry.

Purple ladder `#2A0447 → #3B0764 → #5B1799 → #7B2FBE → #A855F7 → #C084FC → #E879F9`,
paper `#FAF5FF`, gold `#FBBF24 / #FDE68A / #B45309` for Legend only. Every name gets
an 8-direction ink outline so it holds against any gameplay behind it.

---

## 6. Art to commission

Currently rendered vector-native. These would replace the CSS builds 1:1:

- `stamp-die.png` — chunky cartoon rubber stamp, ¾ view, purple lacquer handle, gold ferrule, thick dark outline, sticker style, transparent bg
- `ink-plate.png` — 2048 px grunge rubber-ink alpha sheet, uneven coverage + speckle, for masking stamped names
- `seal-legend.png` — gold embossed wax seal, crown + laurel, cartoon shading, transparent bg
- `glass-shards.png` — vector screen-shatter shard set, white highlights + purple inner glow
- `spotlight-cone.png` — soft warm stage-light cone gradient, transparent
- `frame-marquee.png` — ornate purple/gold arcade marquee border, 9-slice friendly
- `splat-badge.png` — magenta paint-splat avatar badge, thick outline
- `bucket.png` — chunky cartoon galvanised bucket, ¾ view, purple body + gold rim, thick dark outline, transparent bg
- `water-sheet.png` — splash/droplet sprite sheet, white-to-lavender, transparent
- `storm-star.png` — 3-frame falling star sprite, lavender + gold variants

---

## 7. Harness

`demo(result, tier)` queues a full lifecycle. `demoImpact(result, tier)` jumps
straight to impact. Panel gives 8 effects × 4 tiers, username, avatar URL, queue ×3,
replay, clear rail, zone guides, zoom, and the backdrop video path
(`uploads/gameplay.mp4` — HEAD-checked, falls back to the mock scene).
