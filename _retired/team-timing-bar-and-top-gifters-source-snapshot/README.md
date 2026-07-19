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
- Ably channel: `top-gifters`
- localStorage key: `dockTopGiftersVisible`

## What NOT to confuse this with

These two features share names or nearby code with things that were **kept**:
- "Gifter Highlight" / Giftr slides (`gifter-slides-config`) is a separate, still-live feature.
- `isTopGifter` / `.tt-top-gifter` chat-row badge highlighting is core chat rendering, still live — `tt` there means TikTok, not Team Timing.

Removed from the live `gift-bar.html`/`stream-dock.html` on 2026-07-19.
