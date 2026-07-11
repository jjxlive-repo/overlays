# FEED JAMIE — Asset Requirements Report

Generated **2026-07-09** against the completed implementation in `feed-jamie-overlay.html`.
Every filename, frame order, duration, anchor, and target below is read from the actual code
(`SEQ`, `REACTION_SEQ`, `FRAME_FALLBACK`, `ITEM_DEFS`) and `assets/feed-jamie/asset-manifest.json`.

**Current supply status (updated 2026-07-10, v2 batch integrated): 55 Jamie sprites supplied — every animation event
now has a full 5-frame arc.** Remaining missing artwork: the 4 directional tracking sprites (`jamie-track-left/center/right/high` —
currently CSS-tilt fallback) and the 11 item PNGs (currently styled built-in SVGs).
The official Jamie design is locked: black fluffy chibi dog, LEFT ear upright / RIGHT ear floppy,
white muzzle + chest + paws + tail tip, blush, blue edge highlights, white sticker border.
All supplied frames were background-cleaned (fake checkerboard AND black backgrounds removed), normalized to the
1161×1355 canvas, and given measured per-frame feet anchors in `asset-manifest.json` — the overlay shifts each frame
so its feet land on the floor line regardless of where the art sits on its canvas. Airborne frames carry a raised anchor so jumps lift.
The v2 5-frame sequences (per event) live in the SEQ table of `feed-jamie-overlay.html`; prompts used: `feed-jamie-art-prompts-v2.md`.
⚠ ChatGPT PNGs ship with a FAKE baked-in background — run new ones through the cleanup script (section 8) before use.

---

## 1. Global standards (apply to every Jamie sprite)

| Property | Value |
|---|---|
| Canvas | **1161 × 1355 px transparent PNG** (locked to the supplied Priority-1 set — new frames must match) |
| Primary floor anchor | **x=588, y=1172** — lowest paw/body point of every *sitting* frame sits on this line (measured from supplied jamie-idle-01) |
| Character bounds | keep the whole character inside roughly x 90–1070, y 60–1290; never crop ears, tail, paws, or props |
| Default mouth target | x=560, y=680 (per-frame overrides listed below live in `asset-manifest.json`) |
| Default paw targets | left x=435 y=1130 · right x=726 y=1130 |
| Facing | default art faces **right** (Jamie sits on the left side of screen); the overlay mirrors automatically for right-side placement |
| Alignment | frames within one animation must not "jump" — feet/anchor identical between idle frames, head positions consistent |
| Style | cute chibi sticker: charcoal-gray fluffy dog, very large upright triangular ears, large glossy black circular eyes, small shiny nose, tiny curved eyebrows, peach-orange blush circles, compact rounded paws, short rounded muzzle, fluffy cheeks/chest/tail, thick organic black outline, **thick white sticker border**, minimal soft shading, occasional cobalt-blue (#3B82F6) edge highlights, marker texture. No collar, no realism, no 3D, no red/green-dependent cues |
| Fallback behavior | missing frame → mapped fallback frame → `jamie-idle-01.png` → built-in placeholder SVG (overlay never breaks) |

## 2. Event → frame order table (mirrors `SEQ` / `REACTION_SEQ` in code)

| Event | Frame order (file → file) | Duration | Loop | Object separate? | Supplied |
|---|---|---:|---|---|---|
| Idle (always) | idle-01 → idle-03-breathe (blink-02 injected every 4–9 s; ear-twitch-04 OR tail-wag-05 every 10–25 s) | 3.8 s/cycle | yes | — | ✓ all 5 |
| Tracking (object active) | track-left / track-center / track-right / track-high (static, picked by object position) | until state change | no | yes | ✗ (CSS-tilt fallback) |
| Anticipation (object within 180 px) | anticipation-01 → 02-wiggle → 04-wiggle-b → 05-stalk | 1.45 s/cycle | yes | yes | ✓ all 4 (+launch-03 reserved) |
| Treat catch (likes / `treat` / low gift) | treat-catch-01 → treat-catch-02 → treat-chew-01 → treat-chew-02 → treat-chew-01 → **treat-happy** | 1.3 s + 0.4 s | no | yes — flies to catch-02 mouthTarget (585,600) | ✓ all 5 |
| Fetch (follow / `ball`) | fetch-ready → fetch-leap → fetch-catch → **ball-hold → fetch-shake → ball-hold** | 1.1 s + 1.2 s | no | yes — ball flies to fetch-leap mouthTarget (650,650) | ✓ all 5 |
| Premium (subscribe, golden ball) | premium-ready → premium-catch → **premium-celebrate → premium-celebrate-02 → premium-hold** | 0.8 s + 1.9 s | no | yes — mouthTarget (600,560) | ✓ all 5 |
| Squeaky toy (`toy` / medium gift) | toy-pounce → toy-paw → toy-surprised → **toy-shake → toy-happy** | 1.1 s + 0.9 s | no | yes — flies to toy-paw rightPawTarget (800,1100) | ✓ all 5 |
| Duck (`duck`) | duck-head-tilt → duck-tilt-02 → duck-paw → duck-boop → **duck-happy** | 1.5 s + 0.5 s | no | yes — flies to duck-paw rightPawTarget (780,1140) | ✓ all 5 |
| Sock (`sock`) | sock-grab → sock-tug → sock-tug-02 → **sock-shake → sock-victory** | 1.3 s + 1.0 s | no | yes — flies to sock-grab mouthTarget (680,800) | ✓ all 5 |
| Bubble (`bubble`) | bubble-watch → bubble-track → bubble-pop → **bubble-surprised → bubble-sneeze** | 1.05 s + 0.85 s | no | yes — flies to bubble-pop rightPawTarget (770,860), pops | ✓ all 5 |
| Heart Me / high gift | heart-celebrate-01 → 02 → 03 → heart-spin → **heart-land** (+purple hearts, veil, 1.12× scale) | 2.1 s + 0.6 s (3 s total) | no | no — Jamie-only celebration (optional heart-large item spawns after) | ✓ all 5 |
| Near miss | miss (60%) or confused (40%) | 0.7–0.8 s | no | — | ✓ both |
| `jamie` keyword / generic comment | comment-look | 0.9 s | no | — | ✓ |
| Sleep / wake (control buttons) | sleep (loop) / wake | 3 s / 0.4 s | yes/no | — | ✓ both |

Bold = the CELEBRATE-state frame. Every payoff auto-chains PAYOFF → CELEBRATE → RESET (250 ms) → IDLE/TRACKING,
with a watchdog that force-resets any state that overruns (PAYOFF 4 s, CELEBRATE 4 s, ANTICIPATION 12 s).

---

## 3. Jamie sprites — full specifications

Legend: **Required** = the fallback chain collapses to the placeholder SVG without it (manifest `required: true`).
All are currently **missing** (none supplied). Folder for all: `assets/feed-jamie/`.

### IDLE

**jamie-idle-01.png — REQUIRED — Priority 1**
- State/animation: IDLE, base frame; also the terminal fallback for *every* other sprite
- Event: always visible between events
- Pose: sitting upright, compact; expression: calm soft smile, eyes open; facing: center-forward
- Ears: both fully upright; paws: front paws together on ground; tail: relaxed, curled at side; mouth: closed gentle smile
- Prop: none · Anchor: 600,1320 · Mouth target: 690,640 · Paw targets: 450/750,1170
- Alignment: this frame defines the alignment reference for the whole set
- Fallback if missing: placeholder SVG

**jamie-idle-02-blink.png — REQUIRED — Priority 1**
- State: IDLE blink (injected 160 ms every 4–9 s)
- Identical to idle-01 in every pixel except eyes closed (curved happy lids). Any drift will visibly "pop" during blinks
- Fallback: idle-01 (CSS blink used instead)

**jamie-idle-03-breathe.png — OPTIONAL — Priority 3**
- Slight chest rise vs idle-01. Not currently sequenced (breathing is CSS scale); supplying it enables future sprite breathing
- Fallback: idle-01

**jamie-idle-04-ear-twitch.png — OPTIONAL — Priority 3**
- One ear tipped/rotated, otherwise identical to idle-01. Auto-injected 260 ms every 10–25 s *only when present*
- Fallback: skipped silently

### TRACKING (all optional — Priority 2; without them Jamie tilts ±5° via CSS)

**jamie-track-left.png** — seated (anchor unchanged), head + eyes turned toward upper-left, ears alert, mouth closed.
**jamie-track-center.png** — seated, chin lifted, eyes looking straight up.
**jamie-track-right.png** — seated, head + eyes toward upper-right.
**jamie-track-high.png — OPTIONAL — Priority 3** — head tilted far up, used when the object is >260 px above the reach zone; falls back to track-center.

### ANTICIPATION

**jamie-anticipation-01.png — REQUIRED — Priority 1**
- State: ANTICIPATION (loops with -02, 350 ms each) when an object is within 180 px of the reach zone
- Pose: play-bow / crouch — front paws forward flat, rear slightly raised, tail up, ears pricked, eager wide eyes, mouth slightly open
- Anchor 600,1320 (front paws on the line) · Fallback: idle-01 + CSS crouch squash

**jamie-anticipation-02-wiggle.png — RECOMMENDED — Priority 2**
- Same play-bow with tail swung and hips shifted ~20 px — creates the excited wiggle loop. Fallback: -01 (loop becomes static)

**jamie-anticipation-03-launch.png — RECOMMENDED — Priority 3**
- Hind legs compressed, front paws starting to lift. Reserved as the capture-launch flash; falls back to -01

### TREAT (payoff for likes, `treat` keyword, low gifts, heart-large)

**jamie-treat-catch-01.png — REQUIRED — Priority 1**
- Frame 1 of payoff (250 ms): rising/jumping upward, mouth open wide, front paws raised; tail up; belly visible
- Fallback: anticipation-01

**jamie-treat-catch-02.png — RECOMMENDED — Priority 2**
- Frame 2 (350 ms): peak of catch — **the treat animates to THIS frame's mouth target (660,560)**, so the open mouth must be at that coordinate. Prop separate (do NOT draw a treat)
- Fallback: catch-01

**jamie-treat-chew-01.png — REQUIRED — Priority 1**
- Chew loop A (plays 01→02→01): seated again, cheeks slightly puffed, happy closed eyes, crumbs okay to omit (code adds crumb particles)
- Fallback: catch-01

**jamie-treat-chew-02.png — RECOMMENDED — Priority 3**
- Chew loop B: jaw shifted, cheeks puffed opposite side. Fallback: chew-01 (chew becomes static)

**jamie-treat-happy.png — REQUIRED — Priority 1**
- CELEBRATE frame (400 ms) — also reused as the duck/sock celebrate frame: satisfied grin, pink tongue out, eyes happy-closed, tail mid-wag
- Fallback: idle-01

### FETCH (payoff for follow / `ball` keyword)

**jamie-fetch-ready.png — REQUIRED — Priority 1**
- Frame 1 (250 ms): low crouch, locked on, ears forward, tail straight back. Also the premium-ready fallback. Fallback: anticipation-01

**jamie-fetch-leap.png — REQUIRED — Priority 1**
- Frame 2 (400 ms): airborne, body stretched, front paws extended up/forward, mouth open — **ball flies to mouth target 700,480**. Prop separate. Fallback: fetch-ready

**jamie-fetch-catch.png — REQUIRED — Priority 1**
- Frame 3 (450 ms): mouth closed around ball position (mouth target 690,560), landing posture. Prop separate preferred; a combined ball-in-mouth version is acceptable if noted. Fallback: treat-catch-01

**jamie-ball-hold.png — RECOMMENDED — Priority 2**
- CELEBRATE frame (700 ms): sitting proudly WITH tennis ball in mouth (combined prop — the item sprite is hidden by now). Fallback: treat-happy

**jamie-fetch-return.png — NOT USED**
- Listed in the spec but the current code has no return animation. Do not generate.

### PREMIUM / SUBSCRIPTION (golden ball) — all Priority 2, fall back to the fetch chain

**jamie-premium-ready.png** — like fetch-ready but amazed: sparkle-wide eyes, raised brows (golden ball incoming).
**jamie-premium-catch.png** — airborne premium catch, mouth target 700,500; more dynamic than fetch-leap; blue/gold edge highlights welcome.
**jamie-premium-celebrate.png** — CELEBRATE (1.7 s): proud sit with golden ball (combined prop), chest out, tail high; falls back to heart-celebrate-01.

### SQUEAKY TOY — Priority 2, falls back to anticipation/treat chain

**jamie-toy-paw.png** — seated, one front paw extended forward/right; **toy flies to this frame's right-paw target 820,1120** (prop separate).
**jamie-toy-surprised.png** — ears sharply raised, round "o" surprised mouth, leaning back slightly (the squeak!). Fallback: toy-paw.
**jamie-toy-happy.png — Priority 3** — CELEBRATE: toy pinned under paw, pleased grin (combined prop ok). Fallback: treat-happy.

### DUCK — Priority 2

**jamie-duck-head-tilt.png** — strong cute head tilt (~25°), one ear lower, curious round eyes, closed mouth. Fallback: track-center.
**jamie-duck-paw.png — Priority 3** — paw extended to duck at right-paw target 820,1120 (prop separate). Fallback: toy-paw.

### SOCK — Priority 3

**jamie-sock-grab.png** — mischievous narrowed eyes, mouth open gripping at mouth target 660,620 (prop separate).
**jamie-sock-tug.png** — leaning backward, front paws braced, body low — mid tug-of-war. Fallback: sock-grab.

### BUBBLE — Priority 2

**jamie-bubble-watch.png** — nose raised high, eyes tracking up, seated tall. Fallback: track-high.
**jamie-bubble-pop.png** — nose or single paw extended to right-paw target 800,1000 (bubble pops there; prop separate). Fallback: toy-paw.
**jamie-bubble-surprised.png — Priority 3** — CELEBRATE: small backward recoil, blinking surprise, tiny droplets ok. Fallback: toy-surprised.

### HEART ME (biggest payoff — Jamie-only, no separate prop)

**jamie-heart-celebrate-01.png — REQUIRED — Priority 1**
- Frame 1 (500 ms): joyful jump, both paws up, tongue out, eyes shut happy, tail high. Purple heart accents in-art welcome (code adds 💜 particles too). Fallback: treat-happy

**jamie-heart-celebrate-02.png — RECOMMENDED — Priority 2**
- Alternate jump frame — body rotated/offset for bounce energy. Fallback: -01

**jamie-heart-celebrate-03.png — RECOMMENDED — Priority 2**
- Peak celebration (800 ms): highest pose, **paw pads visible**, maximum joy. Fallback: -01

**jamie-heart-land.png — OPTIONAL — Priority 3**
- Happy landing crouch, big grin (600 ms). Fallback: treat-happy

### MISCELLANEOUS

**jamie-comment-look.png — Priority 2** — looks directly at camera, one paw raised in a wave; used for the `jamie` keyword and random generic-comment glances. Fallback: idle-01.
**jamie-miss.png — Priority 3** — lunging/reaching the wrong direction, ears asymmetric, "aw" expression; near-miss reaction (0.7 s, ≥8 s cooldown). Fallback: track-center.
**jamie-confused.png — NOT USED** — reserved; do not generate yet.
**jamie-sleep.png — Priority 3** — curled resting at the floor line, eyes closed (manual Sleep button). Fallback: idle-02-blink.
**jamie-wake.png — Priority 3** — ears lifting, eyes half open (0.4 s on wake). Fallback: idle-01.

---

## 4. Item sprites — `assets/feed-jamie/items/`

Standard: **512 × 512 transparent PNG**, object centered, thick black outline, **white sticker border**,
no baked drop shadow, no text, readable at 50–120 px, same marker/sticker family as Jamie.
All 11 currently missing; every one has a styled built-in SVG placeholder, so none are strictly required.

| File | Event | On-screen size | Notes |
|---|---|---:|---|
| items/treat-biscuit.png | likes (45% weight) | 88 px | round tan biscuit, baked dots |
| items/treat-bone.png | likes (30%) | 96 px | classic bone biscuit |
| items/treat-purple-splat.png | likes (20%) | 92 px | brand-purple splat cookie (#A855F7) |
| items/treat-heart.png | likes (5%) / low gift | 92 px | heart-shaped cookie |
| items/tennis-ball.png | follow / `ball` | 84 px | bright yellow, white seam curves |
| items/golden-tennis-ball.png | subscription | 94 px | gold ball + star glint (code adds gold glow) |
| items/squeaky-toy.png | `toy` / medium gift | 96 px | blue ball toy with squeaker nub |
| items/duck.png | `duck` | 96 px | yellow rubber duck, side view |
| items/sock.png | `sock` | 100 px | white/blue striped sock |
| items/bubble.png | `bubble` | 96 px | translucent blue-tinted bubble with highlight |
| items/heart-large.png | Heart Me bonus treat | 150 px | big purple heart (code adds purple glow) |

## 5. Effect assets — `assets/feed-jamie/effects/`

**No effect PNGs are needed.** Every effect in the finished code is CSS/DOM:

| Effect | Handled by | PNG needed? |
|---|---|---|
| Hearts (Heart Me) | 💜 glyph particles | no |
| Purple / gold sparkles | ✦ ★ glyphs tinted #C084FC / #F5C518 | no |
| Corner jackpot star | ★ glyph burst + purple drop-shadow glow | no |
| Treat crumbs | • glyphs tinted #D9A05B | no |
| Purple splat | ● glyphs tinted #A855F7 | no |
| Bubble pop | ○ glyphs tinted #93C5FD | no |
| Golden ball trail | CSS drop-shadow glow | no |
| Bounce squash/stretch | CSS transform | no |

## 6. Audio — `assets/feed-jamie/audio/`

All 11 sounds (bounce, ballBounce, catch, crunch, squeak, quack, pop, jackpot, heartMe, subscribe, gift)
have Web Audio placeholder synths. Optional real MP3s: host on GitHub Pages, paste the URL in
control panel section H. Missing/broken files are silently skipped.

---

## 7. GENERATE THESE FIRST

**Priority 1 — the core loop looks finished with just these 10:**
1. jamie-idle-01.png
2. jamie-idle-02-blink.png
3. jamie-anticipation-01.png
4. jamie-treat-catch-01.png
5. jamie-treat-chew-01.png
6. jamie-treat-happy.png
7. jamie-fetch-ready.png
8. jamie-fetch-leap.png
9. jamie-fetch-catch.png
10. jamie-heart-celebrate-01.png

**Priority 2 — directional life + per-item personality:**
track-left / track-center / track-right · anticipation-02-wiggle · treat-catch-02 · ball-hold ·
heart-celebrate-02 / -03 · toy-paw · toy-surprised · bubble-watch · bubble-pop · duck-head-tilt ·
premium-ready / premium-catch / premium-celebrate · comment-look · the 11 item PNGs

**Priority 3 — polish:**
miss · sleep · wake · track-high · anticipation-03-launch · treat-chew-02 · toy-happy · duck-paw ·
sock-grab · sock-tug · bubble-surprised · heart-land · idle-03-breathe · idle-04-ear-twitch

**Do not generate:** jamie-fetch-return.png, jamie-confused.png (reserved, unused by current code),
any effect PNGs (all CSS).

---

## 8. New-image intake workflow (what was done for the Priority-1 set)

1. Generate with the prompts in `feed-jamie-art-prompts.md`, attaching `jamie-idle-01.png` as the style reference.
2. ChatGPT PNGs have a **fake checkerboard background baked into the pixels** — they are NOT transparent.
   Clean them with `feed-jamie-fix-sprites.js` in the project root (requires node + `npm i pngjs`):
   `node feed-jamie-fix-sprites.js assets/feed-jamie file1.png file2.png …` — it flood-fills the
   checkerboard away from the edges and rebuilds a uniform 16 px white sticker border via distance-transform dilation.
3. Confirm the cleaned file is 1161×1355; save under the exact target filename in `assets/feed-jamie/`.
4. Set the frame's `anchor` (feet) and `mouthTarget`/paw targets in `asset-manifest.json`, flip `available` to true.
5. Push to GitHub Pages, click **Reload assets** in the control panel, check alignment with Setup guides.
