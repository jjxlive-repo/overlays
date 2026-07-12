> ⚠️ **This document describes an unimplemented proposal, not the shipped overlay.**
> Features below — the surge queue, spider-crack impact hubs, `viewer_name_reveal`,
> integrity-only shatter — do not exist in `app.js`. For what's actually built, see
> [`README.md`](./README.md), which matches the shipped behavior.

# Crowd Glass (proposal — not implemented)

Transparent 1080x1920 browser-source overlay for TikTok Live Studio / OBS.

Core loop:

- New viewers put small cartoon white cracks in the glass.
- Viewer-count surges are not shown as one batch. They enter a fast visual queue and hit the glass one-by-one.
- Large surges feed 2–4 growing spider-crack impact hubs, so the glass visibly spiders outward without cluttering the whole screen.
- Named TikTok joins show individual social-proof tags and recent hitters.
- Gifts repair cracks, clear sections, or activate bulletproof mode.
- Integrity percent is the single source of truth. At 0%, the glass briefly shatters and resets.

## Files

```
crowd-glass/
  index.html   overlay markup (canvas + one combined UI card)
  styles.css   card, tags, meter, shatter text, transparent layout
  config.js    all tunables — damage, surge queue, gift tiers, copy
  app.js       state, crack rendering, WebSocket/Ably intake, keyboard controls
```

## Running it

Open `index.html` directly in a browser, or point an OBS / TikTok Live Studio Browser Source at the file with width `1080` and height `1920`.

## Keyboard test controls

| Key | Action |
|---|---|
| `J` | Named TikTok join: small crack + `@user cracked it` tag |
| `Y` | Anonymous YouTube +1 viewer |
| `1` | +10 viewer surge |
| `2` | +50 viewer surge |
| `3` | +150 viewer surge |
| `4` | +400 viewer surge |
| `G` | Small gift repair |
| `B` | Big gift repair / full wipe tier |
| `M` | Mega gift — activates bulletproof mode |
| `S` | Force shatter |
| `R` | Reset glass |
| `D` | Toggle debug panel |
| `A` | Local auto/manual toggle |

## WebSocket intake

```js
{ "type": "viewer_join", "platform": "tiktok", "username": "jessica23" }
{ "type": "viewer_delta", "platform": "youtube", "delta": 37, "currentViewers": 879 }
{ "type": "viewer_name_reveal", "platform": "youtube", "username": "CoolDadGaming" }
{ "type": "gift", "platform": "tiktok", "username": "biggifter", "coins": 1000, "giftName": "Galaxy" }
{ "type": "command", "command": "reset_glass" }
{ "type": "command", "command": "force_shatter" }
{ "type": "command", "command": "activate_bulletproof" }
```

## Surge behavior

Viewer-count jumps are no longer visually batched.

A `viewer_delta` event like `+50` creates a surge queue:

1. The card shows a live surge counter, such as `TIKTOK SURGE 17/50 hits`.
2. The overlay creates 2–4 impact hubs.
3. Each queued viewer hit animates as a small impact branch from one of those hubs.
4. The hubs spider outward over time.
5. Damage is applied per micro-hit, so integrity drops visibly as the surge lands.
6. At 0% integrity, the glass shatters and the remaining surge queue clears.

## Integrity behavior

Integrity percent is the only shatter source of truth.

There is no separate “shatter after X cracks” rule anymore.

## Social proof

Named joins:

- show a small `@username cracked it` impact tag near the crack
- add the username to `Recent hits`

Gifts:

- show a small repair tag like `@username repaired it`
- add the username to `Repairs`

## Controlling it from stream-dock.html

The Crowd Glass panel gives you:

- Auto / Manual toggle
- Break / Break Burst
- Repair / Big Repair
- Bulletproof / Shatter / Reset
- Damage-per-hit slider

The Layout panel has one combined Crowd Glass card entry:

- `Crowd Glass card` — move/scale the whole UI card
- `Crack size` — scale crack art only

The dock and overlay exchange a heartbeat every 10 seconds so the dock status stays live.
