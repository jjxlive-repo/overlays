# Spin the Screen — Implementation Preamble

**Read this before the attached spec ("Spin the Screen" GPT spec). The spec is authoritative for requirements and acceptance tests, but it makes assumptions about this codebase that are corrected here. Where this preamble and the spec conflict, this preamble wins.**

---

## 1. Term mapping — what the spec's abstractions actually are

| Spec term | Reality in this project |
|---|---|
| "Existing gesture controller" | `gesture-cam.html` in `jjxlive-repo/overlays`. It exists. Audit it before anything else (see Phase 0). |
| "Existing backend/controller process" | The **producer-dock** app (separate local project: Node.js + TypeScript, Express/Fastify, React + Vite, WebSockets, SQLite). The overlays repo itself is **static GitHub Pages — it has no backend.** All authoritative resolution, persistence, queue state, and the signature registry live in producer-dock's SQLite. |
| "Gift/TikFinity event ingestion" | Two real sources: **Social Stream Ninja** websocket (`wss://io.socialstream.ninja/join/usNkSpEutq/4`, already integrated in `stream-dock.html` / `featured-splat.html`, gift detection requires currency symbols to avoid Stars/sticker false positives) and **TikFinity** (a producer-dock data source; better completed-streak semantics). Build the normalization adapter over BOTH; dedupe by stable event ID collapses double-reports. |
| "Existing Ably channels" | Ably Realtime, channel `splat-overlay`. Chosen because BroadcastChannel fails between TikTok LIVE Studio and Chrome. **Do not regress to fixed-interval publishing** — a prior rate-limit incident forced publish-on-change + 10s heartbeat everywhere. |
| "Existing overlay renderer" / "existing overlay method" | Standalone HTML pages hosted on GitHub Pages, loaded into TikTok LIVE Studio as browser-source URLs (Studio rejects `file://` paths). Vertical 1080×1920. **No bottom-anchored positioning, no viewport units.** |
| "Existing operator/control interface" | `stream-dock.html` (panels use the unified Layout accordion, auto-save via `scheduleGistSave()` + localStorage). Wheel operator controls go here — no second dashboard. |
| "Existing persistence mechanism" | Producer-dock SQLite (authoritative) + gist/localStorage patterns in stream-dock (cache/config only). |

## 2. Production pipeline (do not reverse)

TikTok LIVE Studio is the master compositor: camera + gameplay + overlays as separate Studio sources, native face enhancement and Interactive Gift effects applied there → Studio opens a flattened projector → OBS captures that projector window full-screen. The wheel overlay must load **inside LIVE Studio** via the existing browser-source method. Do not move composition into OBS, do not substitute an OBS Virtual Camera, do not disturb TikTok's camera recognition.

Note: the older Aitum multi-canvas duplicate-browser-source concern applies to OBS-side sources only; overlays inside LIVE Studio are not duplicated. Publish-on-change discipline still applies to everything.

## 3. Phase 0 — mandatory audits and experiments BEFORE any wheel code

**0a. Audit `gesture-cam.html`.** Document:
- Where it runs today (Chrome tab? OBS browser source? Has it ever been loaded inside LIVE Studio, and did `getUserMedia` get granted there?)
- Which model (MediaPipe Hands-only vs Holistic/face-capable), worker vs main thread
- How it emits events today (Ably? anything local?) — if Ably-only, there is no local IPC yet and one must be added
- Frame acquisition path, so face inference can share it (spec: no second `getUserMedia`, no duplicate decode)

**0b. Topology Test A (10 min):** Load `gesture-cam.html` as a LIVE Studio browser source. Does Studio grant camera permission? Load a second trivial page as another Studio source. Do the two share a browsing context (does `BroadcastChannel` deliver between them)?

**0c. Topology Test B (2 min):** Add a `http://localhost:<port>` URL as a LIVE Studio browser source (serve any page from producer-dock). Does Studio accept it?

**Pick the transport based on results, in this preference order:**
- **A — all inside Studio:** gesture-cam + wheel overlay both as Studio sources, tracking state over `BroadcastChannel`. Zero new infrastructure.
- **B — localhost origin:** producer-dock serves both gesture-cam and the wheel overlay from localhost; tracking flows over producer-dock's existing localhost WebSocket. (Avoids the HTTPS-GitHub-Pages → `ws://localhost` mixed-content block the spec warns about.)
- **C — last resort:** tracked-effect portions render in a gesture-cam-hosted layer captured separately; Studio overlay handles non-tracked visuals. Only if A and B both fail; flag to JJ before proceeding.

The Stamp Your Name coordinate-transform utility depends entirely on which contexts share what — do not write it before the topology is decided.

## 4. Authority split (restating the spec in this project's terms)

- **Producer-dock (Node/SQLite):** SSN+TikFinity adapter → normalized event → dedupe → tier resolution (thresholds in config, not code) → `crypto.getRandomValues()` result selection → persist → publish ONE `wheel.spin` resolved event on `splat-overlay` → queue state → signature registry → session snapshots for reconnect hydration.
- **Wheel overlay (in LIVE Studio):** dumb renderer. Lanes (receipt/wheel/impact/ambient/signature), state machine, interpolation/smoothing of local tracking state, localStorage as cache only.
- **gesture-cam.html:** frame acquisition + gesture inference + new face-landmark stage (15–30 Hz, one face, worker-preferred), emitting the spec's `FaceTrackingState` over the local transport chosen in Phase 0. Never over Ably.

## 5. Repo constraints and prior incidents (violating these has bitten before)

- Ably: publish-on-change with heartbeat only; no per-frame or fixed-interval publishing.
- No secrets in the repo — it is **public** GitHub Pages. Ably token auth preserved or improved; any API keys enter via stream-dock settings → localStorage at runtime.
- 1080×1920 fixed coordinates; no viewport units; no bottom-anchoring.
- Gift detection from SSN requires currency-symbol validation (Stars/sticker false-positive history).
- Prior bugs to not reintroduce: double-firing TikTok gift alerts; overlays losing state classes mid-animation; simultaneous full-screen sequences colliding (goal explosion vs gift alert precedent — the spec's lane system is the fix, implement it for real).
- YouTube monetary events: parse `donoValue` first, fall back to jewel count × $0.005.

## 6. Checkpoint amendments

Spec checkpoint order stands, with these edits:
- **Insert Phase 0 (above) before checkpoint 1.**
- **Checkpoint 5** reads: "Extend `gesture-cam.html` with a face-landmark stage sharing its existing frame pipeline; wire its output over the Phase-0 transport." It is an extension, not a new application — but if the audit reveals gesture-cam cannot support this (e.g., architecture genuinely incompatible), stop and report per the spec's blocker clause rather than building a parallel tracker.
- **Checkpoint 6:** "existing Gift provider" = the SSN+TikFinity dual adapter in producer-dock.

## 7. Open decisions — ask JJ, don't assume

1. Coin thresholds for the four tiers (config values; ship with placeholders clearly marked SIMULATION-CALIBRATION).
2. Whether Rose/Heart Me (1-coin gifts) qualify for the wheel or stay reserved for the separate rose-trigger mechanic (pet/feed concept — do not merge the two without asking).
3. Signature expiry durations per tier and weekly-vs-session persistence (relates to the planned "Top Splatty" pennant — keep the registries compatible but separate).
4. Audio: do not add any until TikTok/OBS/Wave Link routing is inspected, per spec.

## 8. Definition of done

All 27 spec acceptance tests, plus: Phase 0 findings documented in the changed-files summary; no regression to `stream-dock.html`, `gift-bar.html`, `tracker.html`, `new-here-overlay.html`, `featured-splat.html`, or Milk Meter behavior; production overlay verified transparent and `pointer-events: none` inside an actual LIVE Studio session.
