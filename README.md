# Crowd Glass

Transparent 1080x1920 browser-source overlay for TikTok Live Studio / OBS. New viewers put small
cartoon cracks in the glass, gifts repair it, and enough damage triggers a brief shatter + reset.

## Files

```
crowd-glass/
  index.html   overlay markup (canvas + HTML UI layer)
  styles.css   layout, badges, tags, meter, shatter text
  config.js    all tunables — sizes, damage curve, gift tiers, copy
  app.js       state, canvas crack rendering, WebSocket intake, keyboard controls
```

## Running it

Open `index.html` directly in a browser, or point an OBS / TikTok Live Studio Browser Source at
the file with width `1080` and height `1920`. The page auto-scales to fit any preview window, but
renders at true 1:1 size when the source dimensions match.

## Keyboard test controls

| Key | Action |
|---|---|
| `J` | Named TikTok join (small crack + `@user cracked it` tag) |
| `Y` | Anonymous YouTube +1 |
| `1` | +10 viewer burst |
| `2` | +50 viewer burst |
| `3` | +150 viewer burst |
| `4` | +400 viewer burst |
| `G` | Small gift repair |
| `B` | Big gift repair (full wipe tier) |
| `M` | Mega gift — activates bulletproof mode |
| `S` | Force shatter |
| `R` | Reset glass |
| `D` | Toggle debug panel |

## WebSocket intake

The overlay connects to `ws://127.0.0.1:7788` (see `config.js`) and accepts JSON messages:

```js
{ "type": "viewer_join", "platform": "tiktok", "username": "jessica23" }
{ "type": "viewer_delta", "platform": "youtube", "delta": 37, "currentViewers": 879 }
{ "type": "gift", "platform": "tiktok", "username": "biggifter", "coins": 1000, "giftName": "Galaxy" }
{ "type": "command", "command": "reset_glass" }
{ "type": "command", "command": "force_shatter" }
{ "type": "command", "command": "activate_bulletproof" }
```

If no WebSocket server is running, the overlay retries quietly in the background and keyboard
controls still work — nothing on screen indicates a connection error unless debug mode (`D`) is on.

## Controlling it from stream-dock.html

The overlay also joins the Ably pub/sub channel (`"splat-overlay"`) that `stream-dock.html`
already uses to relay real TikTok/YouTube events (via Social Stream Ninja + Tikfinity) to your
other browser sources. No local server needed — just have both pages open with network access.

- **Live events**: real joins (`milk-event` type `join`) and gifts (`tiktok_gift` / `yt_superchat`)
  crack/repair the glass automatically. Viewer-count bursts need stream-dock's `updateViewerCount()`
  to publish `crowd-glass-viewer-count` events (already wired in) for the delta-based burst cracks.
- **stream-dock's "🔨 Crowd Glass" panel** (below Gift Bar) gives you:
  - **Auto / Manual** toggle — Manual mode ignores live events entirely; only the buttons below
    (and keyboard `J`/`Y`/`1-4`/`G`/`B`/`M` on the overlay itself) affect the glass.
  - **Break / Break Burst** — force a small crack or a burst, independent of auto mode.
  - **Repair / Big Repair** — force a repair effect.
  - **Bulletproof / Shatter / Reset** — same as the keyboard shortcuts.
- **stream-dock's "🎯 Layout" panel** has a "Crowd Glass" group for nudging the CTA text, the
  integrity/recent-hitters block, the viewer badge, and the LIVE badge (X/Y, in px), plus a
  **Crack size** scale slider (50–200%). All of it round-trips through stream-dock's existing Gist
  save/load, so it persists across reloads and machines like your other overlay layouts.

The dock shows an "● LIVE" / "● offline" status for the overlay in the Crowd Glass panel, based on
a ping/alive handshake — reload the overlay and the dock will pick it up within a couple seconds.

## Tuning

Everything gameplay/visual-feel related lives in `config.js`: damage per join, burst damage cap,
crack/label caps, gift tiers and their repair effects, bulletproof duration, and all on-screen copy.
No changes to `app.js` should be needed to retune numbers or copy.

## Design notes

- Cracks are small (40-90px), hand-drawn-looking jagged polylines with a black shadow offset and a
  bright highlight core — no shards, no red, no horror styling.
- Large viewer jumps are scaled non-linearly (`scaledDamageFromDelta`) and capped in crack count
  (`crackCountFromDelta`) so a +400 burst never spawns more than a handful of cracks.
- Placement is weighted to corners/sides and avoids the center "face" box unless integrity is
  critical, and stays clear of the bottom 120px reserved for platform UI.
- Sounds are synthesized with the Web Audio API (no asset files) so the overlay is drop-in with
  just these four files.
