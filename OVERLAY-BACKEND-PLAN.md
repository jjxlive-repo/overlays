# Overlay Backend Plan — drop localStorage + one shared overlay

Status: **DESIGN ONLY — no code written yet.** For review before touching the
Producer Dock project or the overlays.

## The binding constraint

TikTok Studio's Browser Source loads only **public `https` URLs**. It cannot load
`localhost`, and a page loaded from a public origin cannot fetch from `localhost`
either (mixed-content + private-network blocks). This is *why* the current design
exists:

- Overlay HTML lives on **GitHub Pages** (public https) — good, keep it.
- The **Producer Dock** and the control pages run on **localhost** — TikTok can
  never reach them directly.
- So the only paths from dock/control → the hosted overlay are **public relays**:
  **Ably** (realtime messages) and **public HTTP hosts** (GitHub Pages, or a
  tunnel/object store).

Any plan that says "the dock serves the overlay/assets to TikTok" is dead on
arrival *unless the dock is exposed at a public https URL* (see Option A).

## What "stop relying on localStorage" actually means

Two distinct uses of localStorage today, both problems:

1. **Config** (`followMeter.config.v1`, etc.) — small JSON. Fine in size, but it's
   the *source of truth* only in one browser profile, so a fresh overlay in TikTok
   Studio starts blank and has to be re-pushed.
2. **Assets** (gif/audio dataURLs, `followMeter.assets.v1`) — large. All overlays
   share the one `jjxlive-repo.github.io` origin quota, which is what threw
   **"storage full."** Assets are also currently shipped to the overlay by
   *chunking dataURLs over Ably* — works, but it's a workaround for not having a
   real file host.

The fix for both: put config + assets on a **public store the overlay fetches by
URL**, with Ably carrying only live nudges/events. localStorage drops to an
optional cache.

## Hosting options (pick one)

### Option A — Tunnel the Producer Dock (recommended)
Expose the dock at a stable public https hostname with a **Cloudflare Tunnel**
(free, named hostname; ngrok also works but rotates URLs on the free tier). Then:

- The dock's existing Fastify server (`@fastify/static`, `settingsStore`,
  `atomicWrite`) becomes the real backend: it stores config on disk and hosts
  uploaded gif/audio as **files served by URL**.
- TikTok Studio loads `https://overlays.jjxlive.<tunnel>/overlay.html`.
- Overlay fetches its config + asset URLs from the dock on load; Ably still carries
  live events/nudges.

Pros: one source of truth, no localStorage, no chunked-Ably transfer, no repo
bloat, smallest amount of *new code* (dock already has the server + storage).
Cons: streaming now requires the dock **and** the tunnel running — but Bridge Mode
already requires the dock, so this is consistent.

### Option B — Repo-as-store (GitHub Pages + GitHub API)
The dock (or a "Publish" button in the control page) commits `overlay-config.json`
and asset files under `assets/uploads/<stream>/` to the overlays repo via the
GitHub API with a token. Pages serves them publicly. Overlays fetch by URL.

Pros: no tunnel, uses hosting you already have; works even with the dock off.
Cons: a git commit per asset change; **binary gifs bloat git history** over time;
a GitHub token to keep server-side.

### Option C — Dedicated object store (Cloudflare R2 + Workers, Supabase, etc.)
A tiny public backend: control page uploads an asset → gets a public URL; saves
config to a KV/row; overlay fetches both.

Pros: most robust/scalable, no dock or repo dependency, no git bloat.
Cons: a new piece of infra to set up and keep.

**Recommendation:** **Option A** — it makes the Producer Dock the backend you were
already heading toward (Bridge Mode), removes localStorage and the chunked-Ably
asset hack in one move, and needs the least new code. Fall back to B/C only if you
don't want a tunnel dependency.

## Single shared overlay (one Browser Source)

Independent of where assets live. Build one public `overlay.html` (1080×1920,
transparent) that:

1. On load, fetches a **manifest** for the stream: which effects are enabled
   (Follow Meter, Feed Jamie, New Here, Gift Bar, …) and each one's config.
2. Renders each enabled effect as a **layer** in the one canvas, each still
   individually positionable/scalable (reuse the per-slot nudge pattern).
3. Subscribes to Ably for live events + nudges (already how effects work).

Result: TikTok Studio gets **one** Browser Source; enabling/positioning effects is
done from the dock, not by adding/removing sources.

Migration is opportunistic (same as `jjx-core`): the host loads existing effect
modules; each overlay is adapted to run as a layer when it's next touched, rather
than a big-bang rewrite.

## Data flow (target)

```
Authoring (localhost)            Public relays                 Overlay (TikTok Studio, public https)
─────────────────────            ─────────────                ─────────────────────────────────────
Producer Dock  ── stores ──▶  config + asset FILES  ──fetch──▶  overlay.html loads manifest + assets
control pages  ── nudges ──▶  Ably (realtime)        ──sub───▶  live position/scale/test + real events
Bridge Mode    ── events ──▶  Ably (realtime)        ──sub───▶  follow/gift/sub alerts
```

(Under Option A the "config + asset FILES" host *is* the tunneled dock; under B
it's GitHub Pages; under C it's the object store.)

## Migration order (proposed)

1. **Storage backend** for one overlay (Follow Meter): config + assets by URL,
   Ably for live nudges. Proves the pattern, kills the "storage full" error.
2. **Single overlay host** shell that loads Follow Meter as its first layer.
3. Migrate the next-simplest overlays (New Here, Gift Bar) onto the host + backend
   as they're touched.
4. Retire the individual Browser Sources once their effect runs inside the host.

## Open decisions for review

- **Hosting option A / B / C** (recommendation: A).
- Is a **Cloudflare Tunnel** (stable public URL for the dock) acceptable as a
  streaming-time dependency alongside the dock itself?
- **Single-overlay scope:** host *all* effects eventually, or only the
  gif/audio-alert style ones (Follow Meter + similar) and leave the big custom
  canvases (Feed Jamie) as their own source?
- Whether the Producer Dock work happens in this repo or the separate
  `producer-dock-starter` project (it's cross-project either way).
