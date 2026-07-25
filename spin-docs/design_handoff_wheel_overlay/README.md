# Handoff: Spin The Screen — Wheel Overlay

## Overview

A 1080×1920 transparent stream overlay for a gift-driven "spin the wheel" mechanic. A
viewer sends a gift, a wheel spins, one of nine effects fires over the streamer's face
and gameplay, and the giver's name is mortared permanently into a supporter wall at the
bottom of frame.

Everything is driven by one entry point: a gift event carrying a normalised USD value.
That value picks a tier, and the tier scales every effect's size, duration, quantity and
palette. The overlay is designed to run as an OBS browser source at 1080×1920 with a
transparent background.

## About the design files

**The files in this bundle are design references created in HTML.** They are prototypes
that demonstrate the intended look, motion and behaviour — not production code to lift
directly. The task is to **recreate these designs in the target codebase's environment**
(React, Svelte, a native overlay renderer, whatever the project uses) following its
established patterns.

Two things about the prototype that are prototype-only:

- The whole design is one file with **inline styles and imperative DOM effect builders**.
  That is a constraint of the tool it was authored in, not a recommendation. In a real
  codebase, effects should be components/modules with a shared timeline utility.
- The face tracker, the game-scene tracker and the camera are all **mocked with
  synthetic motion and placeholder art**. See "Integration contracts" — those are the
  three seams where real systems plug in.

## Fidelity

**High-fidelity.** Colours, typography, timings, easing curves, sizes and tier scaling
are all final and specified below. Recreate the visual result precisely. The production
art pack is real and included (`assets/`).

---

## Integration contracts

These three are the whole job. Everything else follows from them.

### 1. Gift events in

```js
spinGift({
  user,        // "@handle"
  avatarUrl,   // optional; falls back to a splat badge + initial
  platform,    // 'tiktok' | 'youtube' | 'twitch' — affects the displayed gift only
  giftName,    // "Rose", "Super Chat", "Bits"
  giftIcon,    // single glyph
  giftAmount,  // 1, 500, 25, 10000
  giftUnit,    // 'coins' | 'jewels' | 'usd' | 'bits' | 'subs'
  usd,         // REQUIRED — normalised value, this is what picks the tier
  result       // optional effect id; omit and the wheel picks at random
})
```

**Tier is derived from `usd` only, never from a platform's own unit:**

| usd | tier |
|---|---|
| ≥ 50 | legend |
| ≥ 20 | takeover |
| ≥ 3 | power |
| else | spin |

Tune these thresholds to the real gift economy — they are the one number that should be
config, not code.

Events queue; one plays at a time. A `runId` guard means an interrupted effect can never
leak DOM into the next one.

### 2. Face tracking

A tracker must write a head box into the render loop every frame:

```js
headNow = { x, y, w, h, roll }   // px in the 1080×1920 stage, roll in degrees
```

Prototype default: `{ x:400, y:62, w:280, h:342, roll:0 }` (top-cam layout).

Everything head-anchored reads this live value and translates *and* rotates with roll,
including through hold periods. Derived points:

- `headPoint(h, ox, oy)` — a point in head units, rotated by roll. `ox`/`oy` are
  fractions of head width/height from head centre.
- `forehead(h)` = `headPoint(h, 0, -0.26)`

Stamp, Buckets, Curse and the Ball all anchor through these. If the tracker drops out,
freeze on the last known box rather than snapping to a default.

### 3. Game-scene tracking (Ball Drop only)

The Ball Drop lands in the **game's own bucket**, so a vision layer must write:

```js
targetsNow = { x, y, w, h }   // the detected bucket rect
```

When present, the overlay does **not** draw a bucket — it draws a tracked lock-on
reticle and takes the ball's target centre, mouth height and floor line from that rect.
When absent, it falls back to drawing its own bucket at `stageX`-ish and the layout's
ground line. Both paths must work.

### 4. Camera

The camera must be a **virtual camera composited inside the overlay**, not a separate
source underneath it. Ball Drop reshapes the cam from a rectangle into a circle, flies it
across the frame, and leaves a frozen still with a hole punched in it. An overlay cannot
reshape a source it does not own.

At the moment the ball detaches: snapshot the cam `<video>` to a canvas once, keep that
still in place with a radial-gradient mask punching a transparent circle at the head
position, and let the live circular feed leave with the ball. Restore at effect end.

---

## Layout

Stage is **1080×1920**, transparent. Two scene layouts; layout owns the facecam rect, the
head box, the floor line **and** the overlay's own vertical positions, so switching moves
everything together.

| | cam-top (default) | cam-bottom |
|---|---|---|
| facecam | `0, 0, 1080, 470` | `170, 1040, 740, 420` |
| head | `400, 62, 280, 342` | `390, 1075, 300, 365` |
| ground | 1740 | 1620 |
| name band top | 556 | 196 |
| reel top | 700 | 380 |
| hero line top | 760 | 420 |
| giver stage (Spotlight) | `540, 1400` | `540, 760` |

Supporter wall always occupies the **bottom 350px**.

`?live` on the URL strips the review panel and the mock backdrop and renders the stage
1:1 with a transparent body — that is the browser-source view.

---

## Lifecycle

Three phases. No receipt card, no ambient tail.

| phase | duration | what shows |
|---|---|---|
| `spinning` | tier `dur` | username at name-band top, ornament rule beneath, gift chip, then the reel |
| `impact` | per effect | hero line + the effect; canvas bump on the beat |
| `idle` | — | supporter wall only |

The name is credited *during* the spin, so tension and attribution are the same beat.

**One voice per effect.** The hero line is the only place the name is printed during
impact — in-scene effects never print it a second time. Stamp and Spotlight suppress the
hero line entirely (`hero: false`) because their in-scene payoff *is* the name.

**Canvas bump** must live on a different element from the one carrying the preview zoom
transform, or the bump replaces the scale.

---

## Tiers

| tier | k | spin dur | hold | ornament | ring | usd |
|---|---|---|---|---|---|---|
| SPIN | 1.00 | 1900ms | 1200ms | ✦ | `#7B2FBE` | 1 |
| POWER | 1.35 | 2500ms | 1600ms | ✦✦ | `#A855F7` | 5 |
| TAKEOVER | 1.75 | 3300ms | 2100ms | ✷ | `#E879F9` | 25 |
| LEGEND | 2.15 | 5200ms | 2600ms | ♛ | `#FBBF24` | 100 |

`k` multiplies effect scale, stroke weights, particle counts, glow radius and bump
amplitude. Reel revolutions are `4 + tierIndex`.

**Legend grammar — quantity + frame takeover + gold + flourish.** A shared
`legendFlare()` renders *under every effect* at Legend: a gold flash (880ms), slow
rotating radial rays (`repeating-conic-gradient`, 30s, masked to fade past 60% radius), a
gold vignette held for the beat, and an 18-spark burst off the head. Gold appears nowhere
except Legend.

---

## The nine effects

Ids: `curse`, `stamp`, `flood`, `weather`, `crack`, `spotlight`, `frame`, `avatar`, `ball`.

### STAMP ✦ — flagship, face-tracked. `hero: false`
The name is physically stamped on the face. A die swings in on an arc, presses and
squashes 3.5% on a hard ease-in, and on contact fires a canvas bump, ink burst and
expanding ripple — all anchored to the brow, not the frame. It lifts away revealing an
ink impression that **masks through a real rubber-ink alpha texture** so coverage breaks
up like a pressed stamp. The impression rides the head through the hold, then peels off
toward the wall.

- Plate width by tier, measured against head width: 54% / 68% / 80% / 90%. Capped under
  head width so even Legend never overhangs the skull.
- Durations: swing `320 + 70k`ms `cb(.2,.9,.25,1.25)` · press `86 + 22k`ms `cb(.5,0,1,1)` ·
  lift `400 + 70k`ms · dwell = tier hold · peel 640ms `cb(.4,0,.2,1)`
- **Legend = four stamps** — brow, both cheeks, chin — each on its own tracked face point,
  the die walking between them (165ms move, press, 110ms beat), scaled 66–72% for the
  cheek/chin marks. Face points: `[0,-0.27] [-0.27,0.05] [0.27,0.05] [0,0.31]`, rotations
  `-5° -15° 13° 6°`.
- Ink colour: `#3B0764` plum, or `#6B4B0B`/gold at Legend with a raised inner highlight.

### CURSE ◍ — the giver possesses the camera
The curse **is the giver's avatar**: their face screen-blended over the tracked head in
three layers (a core at 62% plus two hue-split clones offset ±11px on stepped glitch
loops) inside a breathing magenta halo, so it reads as something wearing the streamer's
face. Four gold-ringed avatar sigils pin to the cursed frame's corners. Around it: a
multiplied vignette, screen-blended RGB tear bars on stepped 6-frame loops, a dashed
magenta frame with gold corner brackets, and dark ink drips from the top edge.

**Legend:** the corruption leaves the cam and takes the full 1080×1920 — 14 tear bars,
18 drips — and the avatar is **pinned dead centre of frame at 680px, released from head
tracking**, painted solid (a screen-blended avatar over dark gameplay is invisible), in a
breathing gold containment ring, with four orbit ghosts whose offsets derive from the
frame width so they cannot clip out. Centre y is biased below the hero band.

### BUCKETS ◒ — thrown from the sides
**Tier = how many buckets: 1 / 2 / 3 / 5**, gap tightening 560 → 490 → 430ms so a Legend
becomes a pile-on. Each bucket enters from off-frame on **alternating sides**, stops
beside the head just above crown height, and tips *toward* the face pivoting on its
trailing corner. The water leaves the actual tipped mouth and travels a real **arc** —
computed spawn point, apex 112–160px, rotating 46° as it flies — with nine droplets
trailing on their own offset arcs.

The bucket's resting offset is **solved backwards** from where its mouth ends up after
the 116° tip (rotating the rim vector about the 78%/86% origin), so water always leaves
the real rim. Hover clamps when the cam sits at the top of frame and there is no
headroom.

Impact is side-on: the splash crown is biased along the throw direction, the impact ring
rotates ±24° instead of lying flat, and comedy blobs fly downrange. Beats:
230ms in → 250ms tip → hit at ~645ms.

**Wetness is cumulative** — one film built on the first hit, +0.17 opacity per bucket,
with new face beads and chin drops added each time. Face water is a **bead with a tapered
trail behind it** (paired `om-run` trail + `om-bead` travel, same duration and delay),
plus fat drops that hang off the chin before letting go. Then they **shake it off**.
Takeover/Legend add a frame veil with sparse tapered run-downs that never cross the head
silhouette.

### WEATHER ❉ — summon a storm
Particle pool on randomised paths; volume and region both tier-gated: 42 in a strip
inside the cam / 90 spilling past it / 150 full-frame / 190 full-frame gold.
**Legend fires four lightning strikes** across the beat, each with its own bolt shape,
flash and bump.

### CRACK ◆ — break the glass
Radial fracture. Spokes grow at 180–340ms `cb(.1,.9,.2,1)`, each spawning a branch at a
random 28–60° kink, over a production crack-web overlay that scales in for the fine
secondary fractures. White core flash, 380ms screen shake, hard bump, spark burst.
Spin/Power fracture the cam (reach 240/460px, 6/10 spokes); Takeover/Legend fracture the
whole frame from centre (900px, 15/26 spokes). **Legend: the glass falls out** — nine gold
shards tumble off-screen on randomised spins.

### SPOTLIGHT ▲ — the giver steals your light. `hero: false`
Built on a fake-out. The light **hunts** (600 / 520ms to two decoys), **finds your face
and holds one beat** (460ms), then **slides away** (440ms) and the **giver rises into it**
— their avatar steps up out of the floor with an overshoot, a cone of light from above, a
floor pool, and a hard cast shadow so they read as standing *in* the beam. You sit in the
dark. The spotlight tightens to 0.82× when it lands on them.
Plate reads HAS THE LIGHT, or **OWNS THE STAGE** at Legend, which also gets a gold
breathing ring, **two extra sweeping beams** and 14 gold stars dropping through the beam.

### FRAME ▣ — claim the frame
Production marquee art, **9-sliced** (`border-image-slice: 34% fill` on a wrapper with a
real border-width — it is inert on an `<img>` and without a border-width). Tier drives
how much screen it claims: inset 120 / 74 / 40 / 18px, thickness 14 / 22 / 32 / 44px.
**Legend** adds a second counter-rotating gold frame outside the first plus 12 studs
chasing along the top edge.

### AVATAR ◉ — invade
The avatar badge slides in from off-screen left and overshoots
(520ms `cb(.2,.95,.3,1.35)`), lands with a bump and spark burst, name tag snapping out
beside it, then drifts up and out. Anchored to the **head**, not the cam rect, and
clamped into frame. Takeover adds 2 extra invaders, **Legend 5**, piling in from
alternating sides on staggered delays.

### BALL DROP ● — the cam becomes a ball
The cam rect shrinks and rounds into a circle centred on the tracked head (420ms
`cb(.3,.05,.2,1)`), production sphere shading (multiply) + gloss (screen) + rim ring fade
in, then it **detaches from tracking** — it is not a head any more — and goes to real
physics: gravity 2700, restitution 0.58, rotation from horizontal velocity, spark burst
and ground shadow that tightens as it falls.

**The ball never scales non-uniformly** — it is the camera, so any squash warps the face
inside. Impacts use uniform pulses (1.09× bounce, 1.06× landing).

After the tier's bounce count (1–2 tracked, 1–3 untracked) the arc is **solved
ballistically** to the bucket mouth so the gag always lands. On entry the bucket squashes
and springs back, the ball rattles with a damped horizontal wobble, the front lip paints
over it so it reads as genuinely *inside*, and a plate pops up. Takeover/Legend add
confetti (34 at Legend) and Legend gets a gold comet trail down the whole fall.

Simultaneously the cam **freezes with a cutout** — see Integration contract 4.

---

## Supporter wall

Bottom 350px. **32 fixed slots**, five courses in running bond, 3px mortar joints, brick
177×62, offset rows clipped at the edges like real brickwork. Fills **from the ground
up**, left to right.

- **Bricks never move.** A supporter is written to a fixed slot index and stays there.
  When the wall is full the pointer wraps and overwrites the oldest brick *in place*.
- **No placeholder courses and no background band** — only real supporters render. The
  wall *is* the bricks.
- Bricks **drop in with physics**: fall from 340px above, land on the course below,
  squash to 84% height, rebound twice with decreasing amplitude, settle. 560ms
  `cb(.3,.05,.4,1)`, transform origin bottom edge.
- Faces are dark production art so a white chat overlay stays legible on top. No drop
  shadow (real bricks have no gap to cast into); Legend bricks keep a gold glow.

**Names are styled by dollars, not tier** — that is what makes the wall readable as a
ledger:

| usd | colour | font | size | treatment |
|---|---|---|---|---|
| ≥ 100 | `#FDE68A` | Boogaloo | 27px | gold-edged brick, `0 0 16px` gold glow |
| 25–99 | `#FBBF24` | Fredoka 700 | 23px | `0 0 12px` gold glow |
| 5–24 | `#E879F9` | Fredoka 600 | 22px | `0 0 10px` magenta glow |
| < 5 | `#A78BFA` | Fredoka 500 | 20px | none |

Each brick also carries a small DM Mono `$n`.

---

## Design tokens

**Colours**

```
ink        #2A0447      plum       #3B0764      deep      #5B1799
mid        #7B2FBE      bright     #A855F7      lavender  #C084FC
magenta    #E879F9      paper      #FAF5FF
gold       #FBBF24      gold-light #FDE68A      gold-dark #B45309
water      #38BDF8 / #7DD3FC        (matches the delivered art — cyan, not lavender)
brick      #241041 → #0E041B
```

Gold is **Legend only**. Max two background colours anywhere.

**Typography** — Boogaloo (impact display: hero lines, tier words, etched names) ·
Fredoka 500/600/700 (names, plates, UI) · DM Mono 400/500 (timers, sub-lines, telemetry).
Every name over gameplay gets an 8-direction ink outline (`outline(px)` helper emits 8
offset text-shadows in `#2A0447`).

**Motion**

| beat | timing |
|---|---|
| name in | 420ms `cb(.2,1.3,.3,1)` |
| reel decel | 1900–5200ms `cb(.11,.79,.04,1)` |
| hero in | 520ms `cb(.18,1.2,.3,1)` |
| canvas bump | 420–520ms `cb(.2,.9,.2,1)`, amplitude × k |
| crack grow | 180–340ms `cb(.1,.9,.2,1)` |
| water arc | 265ms, apex 112–160px |
| brick drop | 560ms `cb(.3,.05,.4,1)` |
| effect fade out | 420ms ease |

Impacts land hard and fast; reveals overshoot; exits are soft. Nothing is linear except
falling particles and the rotating marquee.

**Keyframes to port:** `om-bump om-glitch om-drip om-fall om-flood om-crack om-flash
om-marquee om-pop om-shake om-drift om-spark om-breathe om-sheen om-pour om-dump om-lead
om-run om-bead om-hang om-burst om-arc om-splash om-drop`. Several read CSS custom
properties per-instance (`--dx --dy --dr --sx --sy --dh --fd --lx --ax --ay --ah --ar
--ca --ph`) — that pattern (one keyframe, per-element variables) is worth keeping.

---

## State

```
phase          'spinning' | 'impact' | 'idle'
ev             the active gift event
queue[]        pending events; one plays at a time
runId          teardown guard
tier           demo selection
platform       'tiktok' | 'youtube' | 'twitch'
layout         'cam-top' | 'cam-bottom'
supporters[]   indexed by wall slot
wallPtr        next slot to write, wraps at 32
useGameBucket  target the game's bucket vs draw our own
headNow        live head box from the tracker
targetsNow     live game bucket rect from the vision layer
```

---

## Assets

`assets/` — production art, transparent PNGs, no baked text.

```
stamp-die.png  stamp-die-legend.png  stamp-die-press.png
ink-alpha-1..3.png     black-on-white source textures (OPAQUE)
ink-mask-1..3.png      pre-converted: ink coverage IS the alpha channel — use these
seal-legend.png
bucket.png  bucket-legend.png  bucket-pour.png  bucket-mouth.png
water-splash-crown.png  water-sheet.png  wet-film.png
ball-shell.png  ball-gloss.png  ball-ring.png  ball-ring-legend.png
brick.png  brick-2.png  brick-3.png  brick-legend.png
frame-marquee.png  frame-marquee-legend.png
glass-crack-web.png  glass-shards.png
spotlight-cone.png  spotlight-floor-pool.png
splat-badge.png  storm-star.png
```

Notes:

- **Use `ink-mask-*`, not `ink-alpha-*`.** The delivered ink art is fully opaque, so as an
  alpha mask it passes everything through and does nothing; `mask-mode: luminance` would
  invert the intent (keeping the gaps, erasing the ink). The `ink-mask-*` files are
  pre-converted so alpha = ink coverage.
- Ball layer order: circular cam crop → `ball-shell` (multiply) → `ball-gloss` (screen) →
  `ball-ring` / `-legend`.
- **Preload the whole set** — first-fire decode gaps make the splash crown and wet film
  simply absent on play one.
- `glass-shards.png` is one sheet of six sprites; slice it into separate files to use them
  individually (the prototype still uses CSS shards).
- `storm-star.png` is a composite with a bolt and rain marks — too busy at 190 particles;
  storm particles stay CSS.
- The water art is **cyan**, which overrides the purple-family water the spec originally
  called for. Either keep cyan (current) or recolour the art and flip the two water
  constants back.

---

## Files in this bundle

| file | what it is |
|---|---|
| `Wheel Overlay.dc.html` | the full prototype — all nine effects, tiers, wall, trackers, review panel |
| `Wheel Overlay Spec.md` | design spec: tiers, lifecycle, effect writeups, motion vocabulary |
| `Art Brief.md` | the commissioning brief the art pack was generated from |
| `ART-MANIFEST.md` | what the art pack contains and how it was intended to composite |
| `assets/` | production PNGs |

The prototype's own review panel (8 effects × 4 tiers, platform and layout switchers,
queue, replay, zone guides, motion-spec table) is a **harness, not part of the overlay** —
useful for testing the real implementation, not for shipping.
