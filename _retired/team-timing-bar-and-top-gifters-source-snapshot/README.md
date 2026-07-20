# Team Timing Bar + Top Gifters — source snapshot

Team Timing Bar and Top Gifters were never separate files — they were embedded
directly inside `gift-bar.html` and `stream-dock.html`. Since there was no file
to `git mv` the way Dog House / Top Splatty / Crowd Glass were archived, this
folder holds a full copy of both files **exactly as they were right before**
the two features were cut out, so the removed code is preserved and easy to
diff back in if either feature is ever wanted again.

## Where each feature lived (line numbers as of this snapshot)

### Team Timing Bar
- `gift-bar.html:2764-2928` — CSS (`#team-timing-bar`, `.ttb-seg*`, `#ttb-cursor`, etc.)
- `gift-bar.html:3050-3066` — HTML (`#team-timing-bar` block, sibling of `#gift-bar`)
- `gift-bar.html:7074-7115` — `TEAM_TIMING_CONFIG` + `TTB` state object
- `gift-bar.html:7137-7780` — all `ttb*` functions + the dedicated keyboard-shortcut listener (`T`/`N`/`L`/`O`/`R`/`E`/`1-4`)
- `stream-dock.html:3043-3136` — dock control panel ("🎯 Team Timing Bar" card)
- `stream-dock.html:4774-4980` — dock-side engine (`TTB_DEFAULT_SEGMENTS`, `_ttbConfig`, `ttbPublishConfig`, `ttbCmd`, etc.)
- `stream-dock.html:6060-6088` and matching `layoutSet` cases — `LAYOUT_ELEMENTS` group `'Team Timing Bar'`
- Ably channels: `team-timing-config`, `team-timing-cmd`, `team-timing-yt-comment`, `team-timing-test`
- localStorage / Gist key: `ttbConfig`

### Top Gifters
- `gift-bar.html:1624-1686` — CSS (`#top-gifters-panel`, `.tgp-*`)
- `gift-bar.html:3095-3102` — HTML (`#top-gifters-panel` block)
- `gift-bar.html:3568-3590` — `renderTopGifters()` + `TGP_MEDALS`/`TGP_LABELS`
- `stream-dock.html:3291-3310` — dock control panel ("🏆 Top Gifters" card)
- `stream-dock.html:7600-7639` — `tgoPreviewGifters()`, `qcTGOShow()`, `qcTGOHide()`, `qcTGORefresh()`
- `overlay-control.html:557-579` — a SECOND, separate control panel ("🏆 Top Gifters Overlay") not caught in the first removal pass — `tgoTF()`/`tgoShow()`/`tgoHide()`/`tgoRefresh()` at `overlay-control.html:1006-1034`. `tgoShow()`/`tgoRefresh()` routed through tracker.html's `cmd` relay rather than publishing `top-gifters` directly.
- `tracker.html:2754-2763` — the `showTopGifters`/`hideTopGifters` branch inside the shared `ablyChannel.subscribe('cmd', ...)` handler (the relay overlay-control.html's `tgoShow()`/`tgoRefresh()` needed — `requestLeaderboard` handling in that same subscribe callback is unrelated and was kept).
- `tracker.html:2782-2832` — `publishTopGifters(visible)`, the function that actually built the ranked top-5 list and published it.
- Ably channel: `top-gifters`
- localStorage key: `dockTopGiftersVisible`; tracker.html setting key: `DB.settings.tgoTimeFrame`

**Note:** the first removal pass (2026-07-19) only caught `gift-bar.html` and `stream-dock.html`. The `overlay-control.html`/`tracker.html` pieces above were found and removed in a second pass later the same day, after a repo-wide grep sweep turned up `overlay-control.html`'s panel still publishing into a channel gift-bar.html no longer rendered. `overlay-control.html`/`tracker.html`'s pre-removal state is snapshotted in this same folder.

## What NOT to confuse this with

These two features share names or nearby code with things that were **kept**:
- "Gifter Highlight" / Giftr slides (`gifter-slides-config`) is a separate, still-live feature.
- `isTopGifter` / `.tt-top-gifter` chat-row badge highlighting (gift-bar.html) is core chat rendering, still live — `tt` there means TikTok, not Team Timing.
- `isTopGifter` / `.is-top-gifter` (tracker.html, `badgeLevel >= 10`) is the same kind of thing — a per-message chat-row highlight for high-tier gifters, unrelated to the Top Gifters Overlay leaderboard panel. Kept, not removed.

Removed from the live `gift-bar.html`/`stream-dock.html` on 2026-07-19.
