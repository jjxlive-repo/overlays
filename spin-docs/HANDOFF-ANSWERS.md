# Spin the Screen — handoff prompt (fill in the blanks, paste to the agent)

Read these before writing any code, in this order:
1. "C:\Users\socia\Downloads\SPIN-THE-SCREEN-PREAMBLE_1.md" ← preamble (overrides the spec)
2. "C:\Users\socia\Downloads\Spin the Screen Implementation Specification.pdf" ← spec
3. "C:\Users\socia\Claude\Projects\JJxLive Stream\PHASE0-FINDINGS.md" ← Phase 0 audit results (overrides BOTH where they conflict — the audits corrected several spec/preamble assumptions)

Phase 0 is complete. Below are my manual TikTok LIVE Studio test results and my answers to the
open decisions in PHASE0-FINDINGS.md §5. Pick the transport topology per §3 based on these
results, then START CHECKPOINT 1.

## Topology test results (from phase0-tests/README-TESTS.md)

Test B (localhost browser source in Studio):
- Page rendered: YES / NO
- Clock ticking: YES / NO
- "WebSocket CONNECTED ✓": YES / NO

Test A (context sharing):
- A1 (both pages Studio sources): BC = WORKS / DEAD · storage = WORKS / DEAD
- A2 (sender Studio, receiver Chrome): BC = WORKS / DEAD · storage = WORKS / DEAD
- A3 (sender Chrome, receiver Studio): BC = WORKS / DEAD · storage = WORKS / DEAD
- getUserMedia probe line inside Studio said: ___________
- getDisplayMedia probe line inside Studio said: ___________
- User agent line inside Studio said: ___________

Test C (optional, https→ws://localhost inside Studio): NOT RUN / VERDICT WORKS / VERDICT BLOCKED

## Answers to the §5 open decisions

1. Tier thresholds (Spin / Power / Takeover / Legend coins): Spin 10–99 · Power 100–999 ·
   Takeover 1,000–4,999 · Legend 5,000+. These are SIMULATION-CALIBRATION placeholders in config,
   not code constants — expect retuning after ~2 weeks of real gift data. (Galaxy lands exactly at
   the Takeover floor, preserving its Splat Save prestige.)
2. Rose/Heart Me (1-coin) on the wheel?: exclude-with-config-flag. Wheel floor is the Spin
   threshold (10 coins); 1-coin gifts are reserved for the separate rose/pet mechanic. The flag
   exists only so we can run occasional "penny spins" special events without a code change.
3. Signature expiry per tier + session-vs-weekly: Spin ≈10 min · Power ≈30 min · Takeover
   rest-of-session · Legend session-level, removable only via confirmed session reset. The weekly
   "Top Splatty" pennant is a SEPARATE registry keyed on gift totals with a Monday reset — it may
   read the same gift events but shares no state or expiry logic with wheel signatures.
4. Audio: confirmed none at launch; schedule the TikTok/OBS/Wave Link routing inspection as its
   own small post-launch checkpoint, and only then design effect audio.
5. Overlay origin: localhost:4317 OK — single origin for gesture-cam + wheel overlay + WS keeps
   the transport trivial and removes the Pages deploy loop from iteration. Only revisit GitHub
   Pages if my Test B result below fails.
6. Ably key swap in checkpoint 6: in scope. The overlays repo is public, so improving toward
   token auth is worth doing while we're in the channel code anyway — but do it as the last step
   of the checkpoint and verify Milk Meter + gift-bar still connect before moving on.
7. Producer-dock repo path confirmed (OneDrive code + C:\ProducerDockData DBs): YES — and keep it
   that way: SQLite DBs must never move into the OneDrive-synced tree (sync + WAL files corrupt
   databases). If any code currently writes a DB beside the source, flag it.
8. Projector-capture tracking tradeoff (anchor lag + occlusion coasting) accepted: YES for v1.
   Use the spec's lost-face rules (fresh-anchor grace period → configured fallback anchor, smooth
   reacquisition blend) to mask occlusion coasting, and surface measured anchor latency in the
   tracking diagnostics so we can judge whether the stamp feel warrants revisiting camera-direct
   capture later.

Proceed with checkpoint 1 now. Keep the project runnable after every checkpoint, and stop and ask
before anything that PHASE0-FINDINGS.md lists as an open risk.
