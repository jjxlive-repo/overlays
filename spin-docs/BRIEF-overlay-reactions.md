# Brief: design requirements for cross-overlay reactions

Paste everything below the line into a fresh Claude Code session opened on
`C:/Users/socia/Claude/Projects/JJxLive Stream/overlays`.

---

I need you to produce **design requirements** for a feature. Do not implement it — the
deliverable is a written spec I will review before any code is written.

## The setup

This repo holds the browser-source overlays for a TikTok live stream. **`overlays/` is the
git repo** — the parent folder is not, so nothing outside this directory is versioned.

TikTok Studio composites each overlay as a **separate browser source**. They cannot touch
each other's DOM. Anything one overlay wants another to know has to go over the Producer
Dock's local WebSocket (`ws://127.0.0.1:4317/overlay-ws`), reached through
`JJX.dockRealtime()` or `JJX.createOverlayBus()` in `jjx-core.js`. Ably was removed
entirely on 2026-07-25 — there is no cloud transport and no fallback, and nothing should
reintroduce one.

`wheel-overlay.html` ("Spin The Screen") plays a gift-driven effect over the whole frame:
a viewer sends a gift, the dock picks one of nine results, and the overlay renders it.
The nine are `curse` `stamp` `flood` `weather` `crack` `spotlight` `frame` `avatar` `ball`.
Four tiers scale everything — `spin` `power` `takeover` `legend`, with multiplier `k` of
1.00 / 1.35 / 1.75 / 2.15 and hold times 1200 / 1600 / 2100 / 2600ms. Gold is Legend-only.
Read `spin-docs/WHEEL-OVERLAY-RECONCILIATION.md` first, then
`spin-docs/design_handoff_wheel_overlay/README.md` for what each effect actually does.

## What already exists (do not redesign this)

Camera-level beats are done and shipped. `wheel-overlay.html` publishes on a `wheel-fx`
channel via `publishFx()`, called from `canvasBump()` and the crack shake:

- `bump` → `{ scale, ms }`
- `shake` → `{ ms }`

Every overlay receives them through `JJX.cameraBeats()` in `jjx-core.js`, which animates
`#stage` (or `<body>`) on a fixed origin and curve — `50% 42%`, `cubic-bezier(.2,.9,.2,1)`
— deliberately identical everywhere so the sources read as **one camera moving**.

So the frame already moves together. What it does not do is **react**.

## The problem to solve

Right now every overlay responds to a Flood exactly as it responds to a Crack: it moves
with the camera and nothing else. The effects are distinct and physical — a bucket of
water, glass breaking, the lights going out, someone's face taking over the frame — and
the other layers ignore all of that.

The clearest case is `feed-jamie-overlay.html`. Jamie is a character standing on a floor
line at `y: 500` (`feed-jamie-config.json`), which is the seam between the camera and the
gameplay — so Jamie stands directly underneath everything the wheel does. When a bucket of
water empties over the streamer's head, it lands on Jamie and Jamie does not notice.

## What I want from you

A written design spec covering:

1. **Which overlays should react to which of the nine effects, and how.** The frame
   currently carries: Gift Bar, Feed Jamie, New Here, League Sprint, Bomb Drop, Hand Feed,
   Gesture FX, Featured Splat, SSN Chat, Chat Box, Kegel Workout, Splatties Level Up,
   Follow Meter, and the wheel itself. Not all of them should react to everything, and
   some should probably never react at all — say which and why.

2. **The event vocabulary.** `bump` and `shake` are camera beats. What is the right set of
   *semantic* beats — and where is the line? My instinct is that the publisher should
   describe **what happened** ("water landed here", "the lights went out") and each
   subscriber decides **how to respond**, rather than the wheel dictating other overlays'
   animations. Argue for or against that, and define the payloads either way.

3. **Lifecycle.** Effects have a hold and then end. Reactions have to end too, including
   when an effect is interrupted or the page reloads mid-effect. Say how a reaction is
   cancelled and what guarantees each subscriber owes.

4. **Tier scaling.** Should a Legend Flood soak Jamie more than a Spin Flood, or is
   reaction binary? Gold is Legend-only across this project — does that apply to
   reactions?

5. **What must NOT react, and why.** Legibility is a hard constraint: chat and gift text
   have to stay readable over arbitrary gameplay. A design that splashes water across the
   chat box fails even if it is funny. Be explicit about the limits.

6. **Where the shared code should live.** `jjx-core.js` exists specifically so these
   patterns are not hand-copied across a dozen pages — `cameraBeats` is the model to
   follow. Say what belongs there versus in individual overlays.

## Constraints you must respect

- **These are live production overlays.** Anything you propose must degrade safely: an
  overlay that misses a beat, gets a malformed one, or loads mid-effect must keep working.
- **The wheel stays a dumb renderer.** The dock decides outcomes; the overlay never rolls
  randomness. Reactions must not become a second source of truth.
- **`#stage` / `<body>` already carry the camera-beat transform** on every page. A second
  transform on the same element silently replaces it. Any new motion has to account for
  that.
- **The transport is local and cheap but not free of judgement.** A per-particle firehose
  is still wrong. Justify the message rate you propose.
- **Do not reintroduce Ably** in any form.

## Deliverable

One markdown file in `spin-docs/`, written so someone who was not part of this
conversation can build from it. Recommend rather than survey: where there is a choice,
pick one and say why. Flag anything you think is a bad idea even if I asked for it.

Read the code before proposing. Start with `jjx-core.js` (`cameraBeats`, `dockRealtime`),
`wheel-overlay.html` (`publishFx`, the `EFFECTS` registry, the nine `run*` functions), and
`feed-jamie-overlay.html` (its floor handling and existing subscriptions).
