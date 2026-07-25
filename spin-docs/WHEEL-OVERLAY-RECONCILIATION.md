# Wheel Overlay — design handoff vs. built system

**Written 2026-07-25.** Reconciles `design_handoff_wheel_overlay/` (Wheel Overlay Design
Spec7) against what Producer Dock and the overlays repo actually do today.

The design bundle is high-fidelity and self-contained, and its README is right that the
integration contracts are the real work. But it was authored against a *prototype*
topology, and this project's topology is more constrained in two places and less
constrained in one. This doc is the delta. **Where this doc and the bundle disagree, this
doc wins** — same relationship `PHASE0-FINDINGS.md` has to the original spec PDF.

This doc now lives INSIDE the overlays repo, next to the code it describes, so it is
versioned with it. Two references still point outside the repo — `PHASE0-FINDINGS.md`
and the gift-tracker export both live in the project root, which is not a git repo.

Read order stays: `SPIN-THE-SCREEN-PREAMBLE_1.md` → spec PDF → `../../PHASE0-FINDINGS.md` →
`HANDOFF-ANSWERS.md` → this doc → `design_handoff_wheel_overlay/README.md`.

---

## Summary

| # | Contract | Verdict | Blocks |
|---|---|---|---|
| 1 | Gift events in | **Works**, payload needs 1 field + 1 derivation | — |
| 2 | Face tracking (`headNow`) | **Built** — gesture-cam → dock socket → overlay | — |
| 3 | Game-scene tracking (`targetsNow`) | **Buildable** — gesture-cam already does game-object vision | Ball Drop only |
| 4 | Virtual camera in-overlay | **Buildable, hardest** — cover the cam with a still, then own the pixels | Ball Drop only |

Contracts 3 and 4 exist solely to serve Ball Drop. Both were called "not viable" in an
earlier revision; that was WRONG and is corrected below. Ball Drop is deferred on COST and
RISK, not on impossibility. See [Effect roster](#effect-roster-eight-not-nine).

Beyond the contracts there are four design-vs-built conflicts that the README does not
know about, listed in [Conflicts](#conflicts-the-bundle-doesnt-know-about). The biggest is
the supporter wall versus signature expiry.

---

## What changed under the bundle

**Ably is GONE (2026-07-25) — removed, not disabled.** It was briefly a single
`ABLY_ENABLED = false` switch in jjx-core, justified by the claim that jjx-core was the
only place constructing an Ably client. **That claim was false:**
`../follow-meter-overlay.html` built its own `new Ably.Realtime` directly, never
consulted the flag, and defaulted to on — so it kept opening billable connections after
the switch was thrown. A kill switch one page can walk around is not a kill switch, so the
code is now deleted at three layers: every fallback path out of `dockRealtime` and
`createOverlayBus`, all 16 hardcoded key literals (and `JJX.ABLY_KEY`, now `null`), and all
19 `cdn.ably.com` SDK tags — so the `Ably` global does not exist and any reintroduced call
fails loudly rather than quietly billing.

Consequence that had to be handled: Ably was the safety net for a dropped dock socket, and
both transports used to give up after 3 attempts. With no net, both now retry **forever**
with capped backoff — otherwise a routine dock restart would leave overlays dark for the
rest of a stream.

All realtime rides `JJX.dockRealtime()` over `ws://127.0.0.1:4317/overlay-ws`.
`ABLY_MAIN_CHANNEL = 'splat-overlay'` survives as a routing string only.

**This resolves Test C.** The open question was whether an https GitHub Pages page could
reach `ws://localhost`. It can: Chrome treats `127.0.0.1` as a potentially-trustworthy
origin, so `ws://127.0.0.1` from an https page is not mixed-content-blocked. Every overlay
is in production on that path. Face-tracking data therefore has a transport, and the
checkpoint-5 blocker recorded in project memory is lifted.

`OverlayBridge.enqueue` delivers to the local socket first and unbatched, explicitly
"even when Ably publishing is off"
(`C:/ProducerDock/src/server/overlay/overlayBridge.ts:364`), so `wheel.spin` reaches the
overlay with no Ably involvement.

---

## Contract 1 — gift events

**Aligned:** tier vocabulary is identical. `WHEEL_TIERS = ['spin','power','takeover','legend']`
(`C:/ProducerDock/src/shared/schemas/wheel.ts`) matches the README's four tiers exactly,
including the `k` scaling story being a pure presentation concern the overlay owns.

**Correction — the overlay never rolls the wheel.** The README's entry point is
`spinGift({ …, result })` where "omit and the wheel picks at random." That is
prototype-harness framing. In production `wheelResolver.ts` selects the result with
`secureRandomIndex()` (rejection sampling, deliberately not `% n`, so an 8-slice wheel
stays unbiased), persists it, and only then publishes. Result, variant, style seed,
signature class and revision are all fixed server-side so every client and every reconnect
agrees. **The overlay must treat `result` as authoritative input and must never contain a
random branch.**

### Payload delta

`WheelSpinSchema` is `.strict()` at `schemaVersion: z.literal(1)`, so this is a versioned
change, not an additive one. What the handoff's renderer wants versus what ships:

| README field | Status | Resolution |
|---|---|---|
| `user` | ✅ `user.username` | — |
| `avatarUrl` | ✅ `user.avatarUrl` | optional; README's splat-badge + initial fallback stands |
| `giftName` | ✅ `gift.name` | — |
| `giftAmount` | ✅ `gift.repeatCount` | — |
| `result` | ✅ `result` | authoritative, see above |
| `platform` | ❌ **missing** | **add to `WheelSpinSchema`** — present on the internal `WheelEvent`, dropped on publish |
| `usd` | ❌ **missing** | **derive overlay-side**: `gift.totalValue × 0.01` |
| `giftIcon` | ❌ missing | derive overlay-side from `gift.name` via `../tiktok_gifts.json` |
| `giftUnit` | ❌ missing | derive from `platform` (coins / jewels / usd / bits / subs) |

Only `platform` needs a schema change. The rest are overlay-side derivations.

**`usd` is not cosmetic.** The README tiers effects from `usd`, which the overlay can
ignore because `tier` arrives pre-resolved — but the **supporter wall styles names by
dollars, not tier** (≥100 / 25–99 / 5–24 / <5), and that number does not exist in the
payload. The conversion is exact and already a project constant:
`TIKTOK_COIN_COST_USD = 0.01` and `YOUTUBE_JEWEL_COST_USD = 0.01`
(`C:/ProducerDock/src/shared/constants/pricing.ts`), and `gift.totalValue` is already
normalised to coin equivalents by `tierResolver.coinEquivalent()`. So
`usd = totalValue * 0.01` holds across TikTok gifts, YouTube jewels and Super Chats
without a new field. Prefer that over widening the payload.

### Thresholds

The README's thresholds are USD; the dock's are coin floors. Both are runtime config, so
this is a tuning decision rather than a code conflict — but they are not the same curve:

| tier | README (usd) | dock default (coins) | dock in usd |
|---|---|---|---|
| legend | ≥ 50 | 5,000 | $50 ✅ agrees |
| takeover | ≥ 20 | 1,000 | $10 |
| power | ≥ 3 | 100 | $1 |
| spin | else | 10 | $0.10 |

Only Legend agrees. Two notes before anyone "fixes" the dock to match:

- The dock's numbers are **deliberate simulation-calibration placeholders** (JJ,
  HANDOFF-ANSWERS §5.1), with Galaxy at 1,000 landing exactly on the Takeover floor on
  purpose to preserve its Splat Save prestige. They are expected to be retuned after ~2
  weeks of real gift data. The README's numbers are the prototype author's guess at a
  gift economy they had no data for. **Keep the dock's.**
- The README's "spin = else" is wrong for this project regardless of tuning. `spin` is
  also the *qualification floor*, and `allowPennySpins: false` is the default because
  1-coin gifts (Rose / Heart Me) are reserved for the separate rose/pet mechanic. A gift
  below the spin floor produces **no spin at all**, not a spin-tier spin.

Thresholds live in `WheelThresholdsSchema` inside `AppSettingsSchema`, editable live —
which is what the README asks for when it says thresholds should be config, not code.
That box is already ticked.

---

## Contract 2 — face tracking

**BUILT 2026-07-25.** `gesture-cam.html` publishes, `wheel-overlay.html` subscribes, both
over the dock socket on a `head-track` channel.

The publisher lives in gesture-cam because that is the only page that can produce a head
box: it already captures the projector pixels and already runs `FaceLandmarker` per frame,
in desktop Chrome — TikTok Studio cannot host `getDisplayMedia`. Head box comes from the
face-oval extremes (10 crown, 152 chin, 234/454 cheeks); roll from the eye corners.

- **The coordinate transform already existed.** `mapPoint()` maps normalised landmarks
  through `camToFrame` → `frameToOut` into 1080×1920 — the same transform gesture events
  already use, so the head box lands in the overlay's space for free.
- **Roll is computed from the MAPPED eye corners, not the raw ones.** `camToFrame`/
  `frameToOut` can scale x and y differently, which would skew an angle measured before
  mapping.
- **It is deliberately NOT wrapped by gesture-cam's daily publish-cap guard.** That guard
  wraps `ch` only, and exists to stop a runaway metered Ably bill. Head tracking is a
  continuous stream — exactly what the guard is built to catch — so routing it through
  would trip the cap in minutes and take gesture events down with it. It is safe *only*
  because Ably is off and this rides the local socket. **If Ably is ever switched back on,
  this stream must not go with it.**
- Throttled to 30Hz with a change-gate, so a still head costs nothing.

**Dropout rule:** the overlay simply stops updating, which freezes on the last known box —
`setHead` rejecting bad input is a no-op, never a reset, because a snap back to a default
is far more visible than a stale anchor. On a cold start there is no last known box, so
the opening fallback is the layout rect (`{400, 62, 280, 342}` cam-top,
`{390, 1075, 300, 365}` cam-bottom).

Verified: box lands inside the stage, roll 0 for level eyes and 11.3° for a tilted eye
line, throttle and change-gate both drop redundant sends, a collapsed/implausible face is
dropped rather than published, garbage (`NaN`, zero/negative dimensions, null, strings) is
rejected overlay-side, missing roll defaults to 0, and a stale box still renders every
effect correctly. Stamp confirmed anchoring to the tracked box rather than the fallback —
plate width 311px = `389 × 0.80`, where the fallback would give 224.

**Known limitation, unchanged:** gesture-cam is `getDisplayMedia` projector capture, so
tracking arrives with projector-capture lag — already accepted for v1.

**Known limitation carried forward:** gesture-cam is `getDisplayMedia` projector capture
running in desktop Chrome — it cannot run inside TikTok Studio (`../../PHASE0-FINDINGS.md`).
So head tracking arrives with projector-capture lag, which was already accepted for v1.

**Do not route `headNow` through anything metered or batched.** It is a per-frame stream;
it belongs on the raw socket, not on the `OverlayBridge` publish path.

**Graceful degradation is a hard requirement, not a nicety.** Stamp, Curse, Buckets and
Avatar must all render correctly against the static fallback rect, because that is the
checkpoint-4 configuration. The static rect is a decent approximation while JJ stays
roughly centred in a fixed cam rect; it degrades, it does not break.

---

## Contracts 3 & 4 — game-scene vision and virtual camera

**CORRECTED 2026-07-25. An earlier revision of this document called both "not viable".
That was wrong.** Both are buildable; contract 4 is merely the hardest of the four. The
correction matters because "blocked" was being used to justify leaving Ball Drop out.

**Contract 3 — straightforwardly doable.** The earlier claim was that it "needs frame
access to the game — the same capture problem". `gesture-cam.html` already has that
access, and already does this exact class of work: it detects Ball Guys balls **visually**
from projector pixels inside a user-calibrated `gameBox` ("no API, no DOM, nothing to
query — the balls are found VISUALLY"). It already publishes derived geometry at high
frequency (`body-colliders`), and `mapPoint()` already converts into overlay coordinates.
A bucket-rect detector is a feature to write, comparable to the ball detector that ships
today — not an architectural blocker.

**Contract 4 — hard, with a real technique, and a real risk.** The old reasoning was "an
overlay cannot reshape a source it does not own." True but beside the point: it does not
need to own the camera, it needs to **cover** it.

The spec itself freezes the cam at detach — "snapshot the cam `<video>` to a canvas once,
keep that still in place with a radial-gradient mask punching a transparent circle". So
the design already accepts a frozen camera. The overlay can therefore paint a still of the
cam over the live cam rect, and from that instant **it owns those pixels**: masking,
hole-punching and reshaping all happen on its own copy, with the real cam hidden behind
it. gesture-cam already captures the cam strip (`camBox`), and jjx-core already has
chunked asset transfer (`createAssetSender`/`Receiver`) built for exactly this payload
shape. No scene rearchitecture required.

What makes it genuinely hard, and why it stays last:

1. **Alignment.** The still must land pixel-exact over the live cam rect or the freeze
   shows a seam. This rides entirely on `camBox` calibration and the capture mapping being
   precise — the main risk.
2. **Colour/gamma match** between projector capture and what Studio composites.
3. **Baked-in overlays.** The captured strip includes anything Studio drew over the cam,
   which would end up inside the still.
4. **Capture lag** — the snapshot is a few frames stale, so the freeze jumps back slightly.
5. A ball carrying a **live** feed needs streamed video. Carrying the frozen face is the
   cheap substitute and costs little of the gag.

`ball` would also need adding to the dock's `WHEEL_RESULTS` enum and `RESULT_VARIANTS`.

---

## Conflicts the bundle doesn't know about

### Effect roster: eight, not nine

The dock's `WHEEL_RESULTS` enum has **eight** entries — no `ball`
(`C:/ProducerDock/src/shared/schemas/wheel.ts`). So does
`../wheel-overlay.html:191`. So, notably, does the bundle's own
`design_handoff_wheel_overlay/Wheel Overlay Spec.md`, whose section 3 is titled **"The
eight effects."** Ball Drop appears only in the README, and the prototype's review panel
still says "8 effects × 4 tiers."

Ball Drop is a later accretion onto the prototype, and it is precisely the effect that
drags in both unviable contracts.

**Recommendation: hold the enum at eight.** Do not add `ball` to `WheelResultSchema` — an
enum entry the renderer cannot honour would let the resolver select a result that produces
a dead spin on a live stream. Ball Drop is a stretch goal gated on the camera
rearchitecture, and its README section should be preserved as design capital for when
that happens.

### Lifecycle: the README deletes two of checkpoint 3's five lanes

Checkpoint 3 built five lanes — ambient / signature / receipt / wheel / impact. The README
specifies three phases and states plainly: **"No receipt card, no ambient tail."** It also
replaces the signature lane with the supporter wall.

That is a deliberate design decision and it is a good one — the receipt card and ambient
tail both compete with the hero line for the same attention beat. But it means checkpoint
3's `renderReceipt` and ambient lanes get **deleted**, not restyled. Worth saying out loud
so it doesn't read as regression when the diff lands.

### Supporter wall vs. signature expiry — needs a decision

**This is the sharpest conflict in the bundle and it has no clean answer in either
document.**

The backend publishes `signature: { class, createdAt, expiresAt }` with real lifetimes
(JJ, HANDOFF-ANSWERS §5.3): Spin ≈10 min, Power ≈30 min, Takeover rest-of-session, Legend
session-scoped with `expiresAt: null`. Checkpoint 3's overlay honours this — timed tiers
auto-retire, session-scoped ones persist.

The README's supporter wall has **no expiry concept at all**. It specifies 32 fixed slots,
five courses in running bond, filled ground-up, and: *"Bricks never move. A supporter is
written to a fixed slot index and stays there. When the wall is full the pointer wraps and
overwrites the oldest brick in place."*

These models are incompatible. Retiring a Spin brick after 10 minutes punches a hole in
the middle of the brickwork, which breaks running bond, breaks "fills from the ground up,"
and breaks "no placeholder courses — the wall *is* the bricks."

Note also that the wall styles names **by dollars, not tier**, which sidelines
`signature.class` as well. Taken together the wall ignores the entire signature model the
backend computes.

Three options:

1. **Wall ignores expiry** (recommended). Bricks are permanent until the 32-slot pointer
   wraps. `expiresAt` and `signature.class` go unused by the wall; the wall's own 32-slot
   capacity becomes the forgetting mechanism, which is self-regulating and visually
   coherent. Cost: Takeover/Legend lose guaranteed session-long persistence — a busy
   stream could wrap 32 slots and overwrite a Legend.
2. **Wall honours expiry, expired slots go dark rather than empty.** Preserves the
   ledger's tier semantics and keeps the brickwork intact, at the cost of dead bricks
   occupying slots.
3. **Two surfaces** — permanent wall plus a separate expiring signature strip. Most
   faithful to both documents, most screen real estate, and the README explicitly killed
   the ambient tail to buy that space back.

**DECIDED 2026-07-25 — option 1, and it was decided by physics, not preference.** JJ's
requirement is that the wall be a literal physical wall, bricks touching, nothing
floating. A brick cannot vanish out of the middle of a physical wall, so honouring
`expiresAt` on the wall is simply not available. `signature.expiresAt` and
`signature.class` remain authoritative for the SIGNATURE lane, which still retires
names on schedule; the wall ignores both and forgets by capacity alone.

Implemented with the Legend guard: `nextWallSlot()` steps over top-tier bricks while any
lesser slot is free, and yields (overwriting the oldest) if every slot is top-tier, so it
is bounded by the slot count and cannot spin.

### Wall geometry — the handoff's numbers leave two gaps

Measured, not assumed. Both would have shown as bare stage in a wall specified to have
none:

- **The 350px band does not divide by the handoff's brick.** 5 courses at 62+3 = 325px,
  leaving 25px of slack for the wall to float on. **Resolved (JJ, 2026-07-25): 6 courses**
  at 58.33px pitch fill 350 exactly. Brick becomes 177.5×55.33, which is also the art's
  own 1024×320 aspect (3.2) — so the bricks stop being squashed ~12% as a side effect.
- **A 3px sliver at the right end of every flush course.** 6×177 + 5×3 = 1077, not 1080.
  Brick width is now DERIVED — `(1080 - 5×3) / 6 = 177.5` — so courses close flush on
  both edges by construction rather than by a hardcoded number that happens to fit.

Slot count moves from the handoff's 32 to **39: 33 name-bearing + 6 closers.** Closers
are the clipped part-bricks at the ends of the offset courses — real masonry, laid with
the course, carrying no name. Without them each offset course has a ~90px hole at each
edge. Verified: 39 pieces, every joint exactly 3px, zero edge gaps on all six courses,
bottom course flush on the floor.

### Wall capacity vs. session volume — CHECKED, and 33 is right

Measured against `../../gift-tracker-backup-2026-06-29-fixed.json` (2,641 gift rows, 23
sessions), approximating the dock's ComboSettler by merging same-user same-type gifts
inside a 20s window, then counting what clears the `spin` floor of 10 coins:

| qualifying spins per session | |
|---|---|
| median | 8 |
| p75 | 15 |
| p90 | 26 |
| busiest session | **32** |
| sessions over 33 | **0 of 23** |

So the wall fills at most once on the biggest night on record and never wraps mid-session.
That is a good fit — but it is a *tight* one: the busiest session came within one brick of
wrapping, so treat slot count as config and re-check if the thresholds are ever lowered
(a lower floor moves far more gifts into qualifying range).

---

## What's shippable now

**ALL 8 BUILT 2026-07-25.** `stamp` `curse` `flood` `weather` `crack` `spotlight` `frame`
`avatar` — every result in the dock's enum has a real implementation; no placeholder cards
remain. Verified across all 32 effect×tier combinations: no errors, no lane leaks after
teardown, and tier counts matching the spec exactly (weather 42/90/150/190 particles,
flood 1/2/3/5 buckets, crack 6/10/15/26 spokes, avatar 1/1/3/6 invaders).

`weather`, `crack`, `spotlight` and `frame` are frame-anchored and need nothing further.
`stamp`, `curse`, `flood` and `avatar` are head-anchored and currently run against the
static layout rect — they upgrade for free the moment contract 2 lands, with no code
change, because they all read `headNow` live.

**Blocked:** `ball` only — and it is not in the enum, so it can never be selected.

Three details that are easy to get silently wrong, all verified rather than assumed:

- **`border-image` is inert on an `<img>` and inert without a `border-width`.** FRAME is a
  wrapper `<div>` with a real border-width; confirmed computed `border-image-slice: 34% fill`
  and a non-zero border.
- **CURSE's glitch must be `steps()`.** A smoothly interpolated glitch is not a glitch;
  confirmed `steps(4)` on the hue-split ghosts, `screen` blend on the core at 0.62, and
  `multiply` on the vignette.
- **CURSE at Legend must be painted SOLID.** A screen-blended avatar over dark gameplay is
  invisible. Confirmed `mix-blend-mode: normal`, pinned at 680px dead centre, released from
  head tracking, with centre y biased below the hero band.

---

## Checkpoint 4 prerequisites

Checkpoint 4 is the Stamp vertical slice, and Stamp is unaffected by every blocker above —
it is head-anchored but degrades onto the static rect, which was already the plan.

1. ~~Add `platform` to `WheelSpinSchema`; bump `schemaVersion` 1 → 2.~~ **DONE
   2026-07-25.** `platform: PlatformSchema` added, `schemaVersion: z.literal(2)`,
   resolver carries `event.platform` through. 666 dock tests green, typecheck clean.
   No `usd` field added — see the schema comment for why. A version *bump* was safe
   rather than an optional field because `wheelStore.getSnapshot` already skips rows it
   cannot parse during hydration.
2. ~~Derive `usd = gift.totalValue * 0.01` overlay-side.~~ **DONE 2026-07-25.** `usdOf`,
   `unitOf`, `usdLabel` and `giftChip` in `../wheel-overlay.html`. Verified
   across tiktok/youtube/twitch, sub-$1 (Rose 25 → `$0.25`), missing platform, anonymous
   gift, and an injection-shaped gift name (`el()` assigns innerHTML, so names are
   `esc()`d).
3. ~~Move the art pack into `../assets/wheel/`.~~ **DONE 2026-07-25.** 30 art
   files + checkpoint 3's 3 placeholders. **`ink-alpha-1..3.png` were deliberately NOT
   copied** — they are the opaque source textures that do nothing as a mask, and leaving
   them out of the deployed folder makes the README's warned-about mistake unmakeable.
   They remain in `design_handoff_wheel_overlay/assets/`.
4. **Preload the whole art set.** The README is right that first-fire decode gaps make the
   ink texture and splash crown simply absent on play one — on a live stream that is the
   first impression of the flagship effect.
5. Use `ink-mask-*.png`, never `ink-alpha-*.png`. The alpha files are fully opaque and do
   nothing as a mask; `mask-mode: luminance` would invert the intent.
6. ~~Delete the receipt and ambient lanes.~~ **DONE 2026-07-25 — and the SIGNATURE lane
   with them.** The handoff kills receipt and ambient by name, and its lifecycle table
   independently says idle shows "supporter wall only", which retires the signature rail
   too: persistent recognition is now the wall's job. `signature.expiresAt` is
   consequently unused by the overlay; the dock still computes it, harmlessly, for
   checkpoint 8's operator controls.
7. ~~Decide the supporter-wall expiry question.~~ **DECIDED + BUILT 2026-07-25** — see
   the wall section above.
8. ~~Fix the stale "over Ably" header comments.~~ **DONE 2026-07-25**, along with a note
   that `spinGift({ result })`'s "picks at random" must never be implemented here.

~~Deferred to checkpoint 5: the `headNow` publisher and coordinate transform.~~ **DONE
2026-07-25** — see contract 2 above.

The overlay is now on stream-launch's browser-source list as **"Spin The Screen"**. It is
useful with or without gesture-cam running: head-anchored effects use the tracked box when
it is there and the layout anchor when it is not.

Deferred indefinitely: Ball Drop, contracts 3 and 4.

**Everything in this document has been verified structurally — and nothing has been seen.**
The build environment does not composite, so every check above reads computed styles, DOM
state and timer sequencing with animations frozen. Eight effects of motion design and a
wall with drop physics are correct *as code*; whether they look right on stream is still an
open question, and the first real viewing should be treated as a review, not a formality.

---

## README errata

Small, but they'll mislead a cold reader:

- **"These three are the whole job"** sits above a list of **four** contracts.
- **Effect count disagrees with itself**: nine in the id list, "8 effects × 4 tiers" in
  the review-panel description — and the companion `Wheel Overlay Spec.md` says eight.
- The **`spinGift({ result })` "wheel picks at random"** framing describes the prototype
  harness, not the production contract, and is actively dangerous if implemented — see
  Contract 1.
- **"spin = else"** contradicts the qualification floor and `allowPennySpins: false`.
