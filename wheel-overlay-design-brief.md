# SPIN THE SCREEN — Wheel Overlay · Visual Design Brief

You are redesigning the **look, motion, copy and cohesion** of a livestream overlay. A
working logic engine already exists (state machine, reel landing, queue, persistence) — do
**not** redesign the data flow. Redesign how it **looks, moves, and reads**, and design the
**8 effects to actually DO something on screen**, not just show a card. Right now it looks
like flat placeholder boxes (a gray chip with a name in it). That is the problem to solve.

---

## 1. What it is

A gift-triggered prize wheel for a TikTok/YouTube live stream. A viewer's gift spins an
**edge-on reel**; it lands on one of **8 results**; the result plays a real on-screen
**effect** scaled by one of **4 tiers**; the winner earns a persistent on-screen
**signature**. Energy = cute arcade/gacha loot spin, juicy and rewarding — not a corporate
raffle wheel.

## 2. Hard constraints (non-negotiable)

- **1080×1920 vertical, fully transparent.** Browser source in TikTok LIVE Studio,
  composited **OVER live gameplay + the streamer's facecam.** Must stay legible over any
  moving video and must **not bury the center/face** except for a brief Takeover/Legend beat.
- `pointer-events: none`. **No vw/vh, no bottom-anchoring** (Studio rescales the source).
  Work in fixed px inside a 1080×1920 stage.
- **Colorblind-safe (severe red–green).** Never carry meaning in red-vs-green. Use
  brightness, shape, scale, icon, motion, position, and text. (That's why tiers escalate by
  ornament/size and only the top tier is gold.)
- GPU-cheap: runs beside a game. Animate transform/opacity; no per-frame layout thrash, no
  monster blur stacks, use capped/reusable particle pools.
- **Overlay illusion only.** It cannot actually filter/alter TikTok's camera pixels —
  effects are drawn ON TOP. Don't imply otherwise.

## 3. Design system — match the existing overlays

**Palette (purple "splatty" brand):** plum `#3B0764` · mid `#7B2FBE` · bright `#A855F7` ·
light lavender `#C084FC` · magenta accent `#E879F9` · near-white `#FAF5FF`.
**Gold `#FBBF24` = Legend tier ONLY.** (Platform tints if ever needed: TT blue `#38BDF8`,
YT red `#F87171`.)

**Existing art (in `overlays/assets/wheel/`, USE THESE):**
- `reel-housing.png` — purple reel frame, baked-in magenta indicator line + side triangles;
  scrolling segments show through its window.
- `icons.png` (2×4) — the 8 result icons in-brand.
- `tier-frames.png` (4 across) — small purple → gemstone purple → magenta starburst → gold
  crown+laurel (Legend). Currently NOT wired; wiring these well is core to the fix.
- Request NEW art freely (see §9) with in-style image-gen prompts.

## 4. Typography (concrete — the current flat system font is a big part of why it looks cheap)

Load via Google Fonts. Three roles, used consistently:
- **Boogaloo** — the DISPLAY voice. Big celebratory headlines, tier words, result names.
  This is where the "fun" lives; use it large (64–110px) with a thick dark outline + soft
  glow so it pops over video.
- **Fredoka** (600–700) — names, labels, the reel segment text, signature chips. Rounded,
  friendly, bold.
- **DM Mono** — small system bits only (queue `#3`, coin value, timers). Never for hero text.
Baseline sizes on the 1080 canvas: hero headline 72–110 · result name 56–72 · username
40–56 · tier word 30–40 · ambient 24–28 · signature name 22–30 · system 16–20. Everything
bold, high-contrast, thick outline (2–4px dark) + subtle drop shadow so it survives on top
of bright gameplay. **No thin weights, no default sans, no gray-on-gray.**

## 5. On-screen COPY / MESSAGES (design these as typographic moments, not labels)

Placeholders: `{user}` = @username, `{TIER}`, `{RESULT}` = short label, `{pos}` = queue #.

- **Receipt (acknowledged):** `{user} LOCKED A {TIER}` — append ` · #{pos}` only while
  waiting in queue (drop it when it plays next). Should land like a satisfying *stamp/click*.
- **Spinning:** a tier ribbon/banner reading `{TIER}` rides along while the reel decelerates.
  Optional tease line: `SPINNING…` → `LANDING…`.
- **Impact headline (the payoff — make each punchy, verb-forward, Boogaloo huge):**
  - Curse → `{user} CURSED THE CAMERA`
  - Stamp → `{user} IS LEAVING THEIR MARK` (flagship — then the name gets stamped, see §6)
  - Flood → `{user} FLOODED THE SCREEN`
  - Weather → `{user} SUMMONED A STORM`
  - Crack → `{user} CRACKED THE SCREEN`
  - Spotlight → `{user} STOLE THE SPOTLIGHT`
  - Frame → `{user} CLAIMED THE FRAME`
  - Avatar → `{user} INVADED`
  - Under the headline: `{TIER} · {RESULT}`.
- **Ambient (lingering, calm, lower-third):** `{icon} {user} — {RESULT}`.
- **Signature chip (persistent):** just `{user}` with its tier ornament — but make it a
  *designed keepsake* (see §7), NOT a gray box.

## 6. THE 8 EFFECTS — what each must actually DO on screen (this is the point)

Each result is a real animated effect over the video, sized/intensified by tier, that
**incorporates the username** and **leaves a signature** afterward. One polished default per
effect (variants come later). Behaviors from the spec:

1. **Camera Curse** — a "cursed camera" treatment **confined to the facecam rectangle**:
   glitch bars, a warning frame, dripping ink. Reads `CAMERA CURSED BY {user}`. Tier =
   size/intensity/duration.
2. **Stamp Your Name (FLAGSHIP — most polish):** show `{user} IS LEAVING THEIR MARK` → an
   **oversized rubber stamp** swings in → presses onto the face/upper-camera area →
   restrained impact + canvas bump → lifts → reveals a **readable rubber-ink `{user}`
   impression** that sticks briefly, then peels off and flies into the signature rail.
   Bigger tier = bigger stamp, longer stick, fancier seal (Legend = gold embossed seal).
3. **Color Flood** — one branded **translucent fluid/tint** blooms from an impact point and
   spreads (farther by tier), respecting gameplay-safe areas, capped opacity, `{user}` worked
   into the wash.
4. **Weather Control** — one polished weather system (falling stars / rain) over the scene:
   Spin = local facecam weather → Power = full facecam → Takeover = readable full-canvas →
   Legend = premium storm entrance. Reusable particle pool.
5. **Break the Glass** — a **screen-shatter** illusion: small local crack (Spin) → regional
   fracture (Power) → brief **`{user}`-forming full-canvas fracture** (Takeover/Legend) →
   leaves an etched signature.
6. **Steal the Spotlight** — dim the overlay, a **spotlight searches the canvas**, lands on
   the face, a second light reveals `{user}`'s name, which then slides into the rail.
7. **Claim the Frame** — a decorative **border/marquee** claims the canvas edge: small border
   (Spin) → larger (Power) → premium marquee (Takeover) → full-frame entrance (Legend).
8. **Avatar Invasion** — the sender's **avatar** crashes through / peeks around the border
   (fallback: first letter of `{user}` in a splat badge). Tier = size/travel/persistence.
   Avatar load failure must never block the queue.

**Tier scaling rule for ALL effects:** Spin = small & local & short · Power = bigger region
& medium · Takeover = brief full-canvas moment, premium signature · Legend = grand gold
full-canvas entrance + session-level recognition. Escalate by size/ornament/motion, not hue.

## 7. Signatures & the rail — make them keepsakes

The persistent "signature" is the reward that drives more gifting — treat it like a
collectible badge, not a chip. Four classes by tier: small (purple) · medium (brighter,
sparkle) · premium (magenta, ornate) · **legend (gold, crown/laurel)**. Each shows `{user}`
in Fredoka with a tier ornament, in-brand outline + glow, arriving with a little pop and
retiring gracefully. They stack on a side rail without covering gameplay.

## 8. Lifecycle, timing & layout zones

**Beats (tune the timings):** receipt (~0.4s in, hold ~1.5s) → spinning (~2s, reel
decelerates, labels upright) → impact/effect (2–4s, Legend ≤6s) → ambient (10–45s) →
signature persists. Active spin is never interrupted; queued spins play in order; ambient
never blocks the next spin; idle = empty screen.

**Zone map (1080×1920), keep the game clear:** top band (~0–260) receipt · center-upper
(~300–1050) reel then reveal (Takeover/Legend may expand toward full-canvas briefly) · face
zone (~1050–1450) mostly CLEAR · lower third (~1400–1750) ambient · right rail signatures.

## 9. Deliverable

A **single self-contained HTML/CSS/JS file** (no build) that renders the **polished visual
for every state AND a playable default of each of the 8 effects**, using the existing art by
relative path, matching the tokens/type above, as one cohesive juicy system. Include:
- A `demo(result, tier)` harness + buttons to trigger any effect at any tier for review.
- The **edge-on reel** landing on a chosen result, labels upright.
- All **4 tier treatments** (wire/improve `tier-frames.png`).
- The **8 effects visibly doing their thing** over a placeholder "gameplay" backdrop (drop a
  dummy video/image behind the stage so effects can be judged over motion).
- **Motion specs** (duration + easing) per transition.
- A list of any **NEW art** needed, with in-style image-gen prompts.

**Keep state names + data fields intact** (receipt / spinning / impact / ambient / signature;
fields: `user`, `avatarUrl`, `giftName`, `giftValue`, `tier`, `result`, `signatureClass`,
queue `pos`) so the visual layer ports onto the working engine. Redesign the look and the
effects — not the data model or the result/tier set.
