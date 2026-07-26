# Design: cross-overlay reactions to Spin The Screen

**Status:** proposal for review. Nothing here is built.
**Scope:** how overlays other than `wheel-overlay.html` respond when a wheel effect fires.
**Prerequisite reading:** `WHEEL-OVERLAY-RECONCILIATION.md`, then
`design_handoff_wheel_overlay/README.md` ("The nine effects").

---

## 1. The recommendation in short

Keep the wheel a dumb renderer that **announces what physically happened**, and let each
overlay decide what to do about it. Add three semantic events to the existing `wheel-fx`
channel — `fx-begin` / `fx-end` (the envelope) and `impact` (something struck here) — carrying
position, magnitude and a `runId`. Purely visual responses need no event at all; source
z-order already delivers them (§2.1).

Then react in **exactly four overlays**: Feed Jamie, New Here, Hand Feed, and Bomb Drop.
The other ten get camera beats only, which they already have. Nine overlays quietly not
reacting is the correct outcome, not an unfinished one.

The whole feature costs roughly **10 messages per spin** worst case (§10), including the
`bump`/`shake` beats already shipped.

---

## 2. The principle: describe the event, not the response

**Recommendation: adopt the instinct in the brief. The publisher describes what happened;
the subscriber decides how to respond.** Three reasons, in order of weight:

1. **It is the only version that respects "the wheel stays a dumb renderer."** If the wheel
   said `jamie.playSequence('shake-off')`, the wheel would need to know Jamie's sequence
   names, his floor line, and whether he is mid-Heart-Me. That is a second source of truth
   about another overlay's state, which is exactly what the constraint forbids.
2. **Only the subscriber knows what it can afford.** Feed Jamie knows he is mid-catch and
   must not be interrupted. The chat box knows it must never move. The wheel cannot know
   either, and would be wrong at exactly the moments that matter most.
3. **It makes new overlays free.** A future overlay subscribes and reacts without a wheel
   change. Under the prescriptive model every new overlay is a wheel edit.

The cost is real and worth naming: **choreography drifts.** Twelve authors each deciding
what "water landed" means will not be in unison the way `cameraBeats` is. That is
acceptable here precisely because it is the *inverse* of the camera case — the camera must
be identical everywhere or the illusion breaks; reactions must be *characterful* or they
are pointless. Where unison matters, it stays in `jjx-core`.

**The line, stated once:** the publisher owns **what, where, and how big**. The subscriber
owns **whether and how**.

### 2.1 Corollary: use compositing, not messages, for anything purely visual

**If the desired result is "these pixels look different", solve it with source z-order in
TikTok Studio, not with an event.** Studio composites the sources; a semi-transparent
layer in a higher source already tints everything beneath it.

Spotlight is the proof. `runSpotlight` paints `.sl-dark` — `rgba(10,4,20,.72)`, placed at
`0,0,1080,1920`, i.e. the whole frame — and fades it in over 500ms. **Put the wheel above
Feed Jamie in the source list and Jamie darkens during a Spotlight with zero code.** The
same free ride covers Curse's vignette, Weather's particles, Crack's web, and Legend's
gold flash: all of it renders over Jamie, correctly, because effects belong in front of
the scene.

This is why the `ambient` event proposed in earlier drafts is **cut** (§3.4). It would have
been a message, a validation path, an on/off state machine and a cleanup guarantee, all to
reproduce something the compositor does for free — and worse, since twelve overlays each
dimming themselves would multiply into a black frame (§6.1).

**The split this leaves is clean:**

| Want | Mechanism |
|---|---|
| Jamie *looks* darker / wetter / stormier | **Z-order.** Free, exact, no failure mode. |
| Jamie *behaves* differently — flinches, shakes off, looks at it | **Messages.** §3. |

Compositing cannot make Jamie shake off water, so `impact` still earns its place. Nothing
else does.

### 2.2 The source stack this implies

Top to bottom in TikTok Studio:

1. **Text surfaces** — Chat Box, SSN Chat, Gift Bar, Follow Meter, League Sprint,
   Splatties Level Up. Above the wheel, so they stay readable through any effect.
2. **`wheel-overlay.html`** — effects render over the scene and under the text.
3. **Scene/character overlays** — Feed Jamie, New Here, Hand Feed, Bomb Drop, Gesture FX,
   Featured Splat, Kegel Workout.

This ordering enforces §6's legibility rule structurally instead of by convention: text
cannot be darkened by an effect because it is never underneath one. It is a setup step in
Studio, not code — but it is load-bearing, so it belongs in the spec.

One accepted consequence: Jamie is behind the effects, so a Heart Me that overlaps a spin
is partly occluded. That is correct — the wheel is the larger moment, and effects are
supposed to be in front.

---

## 3. The event contract

Same channel as today (`wheel-fx`), same transport, same facade. `bump` and `shake` are
unchanged and remain camera beats.

### 3.1 `fx-begin`

Fired once, at the start of the impact phase (not during the spin — the spin is suspense,
nothing has happened yet).

```js
{
  runId:  'r7f3a91',   // unique per spin; the wheel already has this guard
  id:     'flood',     // one of the nine
  tier:   'legend',    // spin | power | takeover | legend
  k:      2.15,        // 1.00 | 1.35 | 1.75 | 2.15
  holdMs: 2600,        // the tier's hold — how long the effect owns the frame
  scope:  'frame'      // 'cam' | 'frame' — how much of the screen this effect claims
}
```

`scope` matters: Crack at Spin fractures only the cam; at Takeover it fractures the whole
frame. A subscriber outside the cam region should ignore a `cam`-scoped effect.

### 3.2 `fx-end`

```js
{ runId: 'r7f3a91', id: 'flood' }
```

Fired when the effect finishes **and** when it is interrupted by the next spin.

### 3.3 `impact` — something struck at a point

The workhorse. Fired at each discrete physical beat.

```js
{
  runId: 'r7f3a91',
  id:    'flood',
  kind:  'water',    // water | glass | strike | object | press
  x: 540, y: 300,    // stage px, 1080x1920 — the SAME space every overlay uses
  k: 2.15,
  seq: 2             // 0-based index within this run (bucket 3 of 5 -> 2)
}
```

`kind` is a small closed set, deliberately coarser than the nine effect ids, because a
subscriber almost always wants "something wet hit near me", not "bucket three of a Legend
Flood". Mapping:

| effect | fires `impact` | kind | when |
|---|---|---|---|
| flood | 1 / 2 / 3 / 5 | `water` | each bucket's water lands (~645ms after that bucket enters) |
| crack | 1 | `glass` | at the fracture origin, on the white core flash |
| weather | 0, or 4 at Legend | `strike` | each lightning strike |
| ball | 2–4 | `object` | each bounce, and the landing in the bucket |
| stamp | 1, or 4 at Legend | `press` | each die contact |
| curse, spotlight, frame, avatar | — | — | nothing physically strikes the scene |

### 3.4 `ambient` — **cut, deliberately**

Earlier drafts proposed an `ambient { state:'on'|'off', kind:'dark'|'storm'|'corrupt' }`
event so overlays could respond to sustained environmental changes.

**Do not build it.** Every case it covered is visual, and §2.1 shows the compositor already
handles those correctly and for free once the wheel sits above the scene overlays. The
event would have added an on/off state machine, a pairing guarantee, and a cleanup path —
four new failure modes — to reproduce a tint.

If a *behavioural* ambient response is ever wanted (Jamie visibly hunkering through a
storm rather than merely being rained on), reopen this — but note it was judged low value
against its complexity, and that the visual half is already solved.

### 3.5 Validation is mandatory, and `cameraBeats` is the model

`cameraBeats` already range-checks every field and returns silently on anything odd:

```js
if (!(scale > 1 && scale < 1.2) || !(ms > 0 && ms < 4000)) return;
```

Every reaction handler must do the same: `x`/`y` inside 0–1080 / 0–1920, `k` inside
1.0–2.2, `holdMs` inside 0–6000, `kind`/`id`/`state` in their known sets. **A malformed
message must be a no-op, never a stuck animation.** This is enforced centrally (§7) so
each overlay does not re-implement it.

---

## 4. Who reacts, and to what

### 4.1 The four that react

| Overlay | Reacts to | Response |
|---|---|---|
| **Feed Jamie** | `water`, `glass`, `strike`, `object` | The full case — see §5 |
| **New Here** (crowd pile) | `water`, `glass`, `strike` | The crowd flinches/ducks as one, ~250ms, amplitude by `k`. It is a crowd of characters; a crowd that ignores lightning is a dead crowd. |
| **Hand Feed** | `water`, `object` | If a hand/food item is in flight, nudge its trajectory or make it flinch back. Only while something is actually on screen — otherwise no-op. |
| **Bomb Drop** | `glass`, `strike`, `object` | Live bombs/balls get an impulse. It is already a physics overlay; it has somewhere to put a force. |

### 4.2 The ten that do not, and why

| Overlay | Why not |
|---|---|
| **SSN Chat**, **Chat Box** | Text that must be read. Non-negotiable — see §6. |
| **Gift Bar** | Names and amounts. A gift is a receipt; it must survive the spectacle intact. |
| **Follow Meter** | A number. Same. |
| **League Sprint** | Score windows, and it sits at 0–450px — inside the cam region, where effects are densest. Highest risk of collision, lowest tolerance for it. |
| **Splatties Level Up** | A moment of its own. Two celebrations fighting reads as a bug. |
| **Featured Splat** | Showcases one viewer's art. Reacting means degrading someone's featured work. |
| **Kegel Workout** | An instructional timer people follow. Interfering is actively user-hostile. |
| **Gesture FX** | Renders the streamer's own gestures. Making it react to the wheel muddles whose action caused what — the one overlay where authorship must stay legible. |
| **Wheel** | It is the publisher. |
| **Gift Bar promo cards** | Same as Gift Bar. |

**These still receive `bump`/`shake`.** They already move as one camera. That is the right
amount of participation for a text surface, and it is already shipped.

---

## 5. Feed Jamie: the case worth designing properly

Jamie is the reason this feature exists, so the spec should be concrete about him.

### 5.1 Geometry — check it before assuming

**`cam-top` is the only supported layout.** The operator has ruled out `cam-bottom`
permanently, so every position below is a fixed fact, not an assumption to re-derive.
Do not write layout-switching logic for reactions.

At default config (`feed-jamie-config.json`: `floor.y: 500`, `jamie.x: 130`,
`jamie.width: 260`), Jamie's box lands at roughly **x 130–390, y 238–541**, feet on the
floor line at y 500. The tracked head is **x 400–680, y 62–404** (`cam-top`: facecam
`0,0,1080,470`, ground line 1740).

**So Jamie stands beside the streamer's head, not under it.** The brief's framing — "a
bucket empties over the streamer's head and it lands on Jamie" — is not automatic. At Spin
tier, one bucket tipping at the head lands around x 400–680; Jamie is outside that.

Three consequences:

1. **Reactions must test distance, not assume contact.** Use a splash radius:
   `hit = |impact.x - jamieCentreX| < 260 * k`. At Legend (`k` 2.15) almost everything is
   in range; at Spin, only a close impact is. This makes tier scaling fall out of the
   geometry for free, which is a better reason to scale than "Legend should be bigger".
2. **Never hardcode Jamie's rect.** `jamie.x`, `width`, `scale`, `side`, and live `growth`
   all move him, and the operator changes them mid-stream. Read `jamieRect` at event time.
3. **A near-miss is a real response.** If water lands *next to* Jamie, he should look at
   it, not get soaked. That is funnier and it is honest to the physics.

### 5.2 Responses

| Beat | Response | Notes |
|---|---|---|
| `water` (hit) | Existing `bubble-surprised` → shake-off; add a wet sheen if art allows | Reuse frames before commissioning any |
| `water` (near miss) | Look toward `impact.x` — the `tracking` poses already do this | Free; no new art |
| `glass` | Flinch/cower ~400ms | `miss` or `confused` frames are close |
| `strike` | Duck, brief | Legend Weather only (4 strikes) |
| `object` | Track it — Jamie watching the cam-ball bounce past is the joke telling itself | Reuse `tracking` |

Darkening during Spotlight, rain during Weather and Curse's vignette are **not in this
table on purpose** — the compositor delivers all three once the sources are stacked per
§2.2. Do not add code for them.

### 5.3 The hard part: Jamie has his own state machine

Jamie is mid-something a lot of the time — `PAYOFF`, `CELEBRATE`, a Heart Me run to centre
screen, a Jackpot. **Reactions must lose every conflict.**

Recommended precedence, highest first:
`heartMeActive` / `jackpotActive` → `PAYOFF` / `CELEBRATE` → wheel reaction → `IDLE` /
`TRACKING` ambience.

Concretely: if `heartMeActive || jackpotActive`, drop the reaction entirely — do not queue
it. A Heart Me that stutters because a bucket landed is a worse outcome than a Jamie who
ignored one bucket. This mirrors the guard already in `triggerHeartMe`.

There is no ambient exception to manage, because there is no ambient event: the Spotlight
darkening reaches Jamie through the compositor (§2.1) and never touches his state machine
at all. That is a second, quieter argument for the z-order approach — it cannot conflict
with a Heart Me, because it is not code.

---

## 6. Legibility: the hard constraints

These are pass/fail, not preferences.

1. **No overlay may darken, veil, or tint the full frame.** Only the wheel does that. If
   twelve overlays each dim for `dark`, the frame goes black. **Reactions are local to the
   reacting element** — Jamie dims *his sprite*, not the stage.
2. **Nothing that carries text may move, scale, rotate, blur, or reduce contrast** beyond
   the camera beat it already gets.
3. **No reaction may draw outside its own overlay's normal footprint.** An overlay that
   normally occupies the bottom 300px must not splash water at y=800 — it has no way to
   know what is there, because sources cannot see each other.
4. **No reaction may persist past its effect.** See §7.
5. **Reactions never carry gold.** Gold is Legend-only and the wheel owns that grammar.
   Twelve overlays adding their own gold at Legend dilutes the single signal that makes
   Legend feel rare. Recommendation: **reactions use no gold at any tier** — cleaner than
   a rule everyone has to remember to gate.

---

## 7. Lifecycle, cancellation, and the guarantees owed

**Every message stands alone.** A subscriber must be able to act on any single message
without having seen the previous one. `runId` exists for cancellation and ordering, not as
a required handshake. This is what makes a mid-effect page load safe: the overlay simply
missed a beat, which is survivable, rather than entering a broken state.

**Five guarantees every subscriber owes:**

1. **Self-expiry.** Every reaction sets its own timer at `min(holdMs, 2600) + 600ms` grace
   and cleans up when it fires, **whether or not `fx-end` arrives.** `fx-end` is an
   optimisation, never the only path out. The wheel reloading mid-effect must not leave
   Jamie permanently wet.
2. **Supersede, don't stack.** A new `fx-begin` cancels every reaction from the previous
   `runId` immediately.
3. **Ignore stale runs.** Discard any `impact` / `fx-end` whose `runId` has
   already ended. Out-of-order delivery must not resurrect a finished reaction.
4. **Never touch the camera-beat target.** `#stage` / `<body>` carries the
   `cameraBeats` transform; a second transform on the same element silently replaces it —
   `jjx-core` already warns about this at runtime. Reactions animate **child elements or a
   dedicated wrapper**, never the beat target. Feed Jamie's own CSS says this out loud:
   *"#stage MUST NOT carry a transform of its own."*
5. **No-op on garbage.** Validation failure is silent and total (§3.5).

**Reactions never hydrate.** On load, an overlay assumes nothing is running. A reaction is
transient garnish; resuming one mid-way looks worse than missing it.

---

## 8. Tier scaling

**Recommendation: continuous intensity, not discrete choreography.**

Pass `k` (1.00–2.15) and let subscribers scale amplitude, duration, and *reach* (§5.1).
Do **not** give reactions per-tier variants the way the wheel has.

- **Not binary**, because a Legend Flood is five buckets and a Spin Flood is one; a fixed
  response would either under-sell the pile-on or over-sell the single hit. And `impact`
  fires per bucket anyway, so Jamie naturally reacts five times — the escalation is free.
- **Not full tier grammar**, because that is 4 variants × 6 beats × 4 overlays of design
  and QA for garnish, and at Legend the frame is already at maximum density. Reactions
  competing with `legendFlare()` makes the frame noisier, not bigger.

The honest summary: **the wheel expresses tier; reactions express reach.**

---

## 9. Where the code lives

Follow the `cameraBeats` precedent exactly: **`jjx-core.js` owns the protocol and the
safety; each overlay owns its own expression.**

### Add to `jjx-core.js`

```js
JJX.fxReactions({
  client: ably,                  // or { bus }, same as cameraBeats
  onImpact:  (e) => {...},       // validated, runId-scoped
  onBegin:   (e) => {...},       // optional
  onEnd:     (e) => {...},       // optional
  maxHoldMs: 3200                // enforced ceiling; core cancels for you
});
```

Core is responsible for: subscribing, validating and range-checking every payload,
tracking the active `runId`, dropping stale/out-of-order messages, firing the auto-expiry
timer, and calling `onEnd` exactly once per run even if the wheel never sent `fx-end`.

That means **guarantees 1, 2, 3 and 5 in §7 are structurally impossible to get wrong** —
an overlay author cannot forget them, because they are not their job. Only guarantee 4
(don't transform the beat target) remains an authoring discipline, and it already warns at
runtime.

### Stays in each overlay
The reaction itself: which sequence Jamie plays, how the crowd ducks, what force a bomb
takes. This is the part that *should* differ.

### Stays in the wheel
`publishFx` already exists. Add the semantic calls inside the `run*` functions at the
beats identified in §3.3 — e.g. `runFlood` publishes one `impact` per bucket at its
existing water-landing beat (~645ms), which is already a distinct moment in that function.
**No new timing logic** — every one of these beats already exists in code; they are being
announced, not invented.

---

## 10. Message rate

| | per spin |
|---|---|
| `fx-begin` / `fx-end` | 2 |
| `impact` | 0–5 (Legend Flood: 5; Legend Stamp: 4; Ball: 2–4) |
| existing `bump` / `shake` | 1–5 |

**Worst case ≈ 10 messages per spin**, typical 3–6. Spins are gift-driven and human-paced.

This is defensible because it is **bounded by beats, not by frame rate or particle count**.
The rejected alternative — publishing droplet positions so subscribers can do real
collision — would be 190 particles × 60fps and is a firehose regardless of transport being
local. If a reaction ever needs particle-level fidelity, the right answer is to give the
subscriber the *arc parameters* once, not the positions continuously.

---

## 11. Things I would not build

Flagged as requested, including one the brief leans toward.

1. **Reacting to `curse`, `frame`, `avatar`, `stamp`.** These happen *to the streamer's
   face or the frame border*, not to the scene. Jamie noticing a stamp pressed on someone
   else's forehead is not physical comedy, it is noise. The brief lists all nine; I would
   wire four. Stamp emits `press` mainly so Bomb Drop can rattle — Jamie should ignore it.
2. **Splash decals that persist after the effect.** Tempting (a wet Jamie for 30s is
   funny) but it makes every effect leave residue that must be cleaned up on reload,
   across overlays that cannot see each other. If you want a lasting wet Jamie, make it
   *Feed Jamie's own* state with its own timer, triggered by the reaction — not a
   cross-overlay contract.
3. **A `reaction-ack` back-channel.** The wheel does not need to know who reacted. Adding
   it makes the wheel stateful about other overlays, which is the thing to avoid.
4. **Reacting during the `spinning` phase.** Nothing has happened yet; the suspense is the
   point. React on impact only.
5. **Any full-frame reaction.** Covered in §6, repeated because it is the one that will be
   proposed again.

---

## 12. Open questions

1. **Should Feed Jamie's reactions be operator-toggleable?** Everything else in Feed Jamie
   is. Suggest `CFG.events.wheelReactions` defaulting **off** until it has run live, for
   the same reason the roam feature would be gated.
*(Resolved: `cam-bottom` is out of scope permanently — §5.1. Ambient/darkening responses
are handled by source z-order rather than by code — §2.1.)*

---

## 13. Build order

0. **Set the source order in Studio (§2.2).** No code. Do this first — it delivers the
   Spotlight darkening immediately and is worth confirming on stream before building
   anything.
1. `JJX.fxReactions` in `jjx-core.js`, plus `fx-begin` / `fx-end` from the wheel. Nothing
   subscribes yet — verify the envelope and auto-expiry in isolation.
2. `impact` from `runFlood` only. Subscribe Feed Jamie only. **This is the whole feature in
   miniature** and the one everybody will judge; get the splash-radius and the
   state-machine precedence right here before widening.
3. Remaining `impact` publishers (`crack`, `ball`, `weather`, `stamp`).
4. New Here, Hand Feed, Bomb Drop.

Stop after step 2 and look at it on stream before continuing. If a soaked Jamie is not
funny at that point, the remaining steps will not fix it — and everything after step 2 is
optional by construction.
