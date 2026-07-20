# League Sprint / Splat Cards — source snapshot

"League Sprint" (also called "League of Splatties" in-game, and code-identical to
"Splat Cards") was never a separate file — it was embedded directly inside
`gift-bar.html` and `stream-dock.html`. This folder holds a full copy of both
files **exactly as they were right before** the feature was cut out and rebuilt
as its own standalone overlay+control pair (`league-sprint-overlay.html` +
`league-sprint-control.html`), so the removed code is preserved and easy to
diff back in if needed.

## Where the feature lived (line numbers as of this snapshot)

### `gift-bar.html` (6776 lines before removal)

CSS (inside `<style>`):
- 12–46 — `:root` League CSS vars (`--ls-*`). Note `--ls-bar-height` is also *read* by unrelated bar-geometry rules at 1184/1192/1510/1512/1516/1926.
- 49–142 — `#lsTopRegion`, mini-windows, micro-pills.
- 205 — League-owned line inside the shared `#mission-strip` block (193–216).
- 246–251, 267–269 — `.league-sprint-mode` / `.splat-cards-disabled` visibility gates (inside a mixed 245–271 cluster shared with Milk/Stream Bar/Geyser/Gift Animations toggles).
- 273–436, 570–657, 659–722, 724–968, 974–1022, 1023–1173 — card popups, bottom shelf, card-event dock, card component styling, rank marquee (possibly dead), player/system popup shell.
- 1575–1610 — `.ls-explainer-*` (renders inside the shared `#bar-info` Gifter Highlight carousel).

HTML (body):
- 2706–2718 `#lsTopRegion`; 2725 `.league-sprint-mode` class + `data-layout-id="splat-card-bar"` on the shared `#gift-bar` container; 2762–2765 `#leagueSprintBar`; 2796–2798 `#leagueBottomShelf`; 2803 `#lsRecentChallengers`; 2804 `#lsRankingsSlideshow`; 2808 `#lsMicroPills`; 2811 `#lsDuelResultPill`; 2816 `#leagueSprintEvent`.
- 6764–6767 shared `#mission-strip` container — default seeded text was League-flavored ("LEAGUE OF SPLATTIES...").

**Important:** `.league-sprint-mode` was a *static, never-toggled* class — no JS anywhere called `.classList.add/remove/toggle('league-sprint-mode')`. It was permanently baked onto `#gift-bar`, meaning gift-bar.html ran permanently in League mode (classic `#bar-hero`/`#hype-meter` view was suppressed except during `.alert-active`). Post-extraction, gift-bar.html reverts to classic mode by default since nothing sets that class anymore.

JS (script):
- 3043–3054 `LS_EXPLAINER_SLIDES`; 3070 `lsExplainerEnabled` (+ 2 unrelated/dead vars in the same declaration); 3117 `lsD5Art()` (dead, never called); 3156–3190 `showExplainerSlide()`; League-owned branches inside shared `showSlot()`/`rebuildRightPanelSlots()`/`syncRightPanelVisibility()` (~3249–3276); 3301–3306 `applySplatExplainerConfig()`.
- **3731–4828** `const LEAGUE_SPRINT = (() => {...})();` — the ~1098-line self-contained engine (card rendering, target rows/boss field, duel animation, chat command parsing, popups, mission-strip helpers `setMissionStripText`/`setGameTitle`/`setPhase` at 3889–3937). Exposed as `window.LeagueSprintCards` at 4829.
- 4830–4833 subscriptions: `giftsChannel.subscribe('league-sprint', ...)`, `chatChannel.subscribe('league-sprint-chat', ...)`, `chatChannel.subscribe('chat-message', ...)`, `chatChannel.subscribe('milk-event', msg => LEAGUE_SPRINT.handleChatMessage(msg?.data))` — **this last one is a real, intentional cross-feature dependency**: League reads Milk Bar's own `milk-event` channel. Not a bug, don't treat as dead code if seen elsewhere.
- 4835–4885 `applySplatCardLayout()` (also repositions the shared `#gift-bar`/`#bar-lines` as a side effect); 4887–4902 `applyLeagueSprintState()`; 4904–4906 more subscriptions (`splat-card-layout`, `league-sprint-state`, `splat-explainer-config`).
- 6689 League-owned line inside the shared `mission-strip-config` handler (6676–6690).

Ably channels: `league-sprint`, `league-sprint-chat`, `league-sprint-state`, `splat-card-layout`, `splat-explainer-config` (plus reads `milk-event`, a channel Milk Bar owns — legitimate cross-feature read).

### `stream-dock.html` (11258 lines before removal)

CSS: 1550–1589 (`.ls-subsection*`), 1913–1929 (`#ls-event-text-modal` Event Text editor).

HTML control panel: 2240 misleading `<!-- MILK CONTROLS -->` comment sits directly above the real 2241–2546 Splat Cards / League Sprint panel (Title/Mission-strip, Explainer toggle, text-size, round/length/cooldown, mechanics, commands/aliases, boss library, diamond drops, player admin, admin/resets + League Data JSON export/import, start/resume/next/reset, card art preview, test grids). The *real* Milk Controls card starts right after at 2548 with no comment header of its own.

JS: `DOCK_OVERLAY_ABLY` entries `'splat'`/`'splat-explainer'` (~4726–4727); `LAYOUT_ELEMENTS` group `'Splat Cards'` entries `league-shelf`/`ls-side-panel` (~5717–5720, distinct from the *different* group `'Splat'` used by `splat-notif`/`splat-pos`/`bait`) + matching `layoutGet`/`layoutSet` cases; `DOCK_OVERLAYS` entries `splat`/`splat-explainer` (~5791–5792); scattered `let`s (~6234–6259); config-default consts/loaders (~6260–6528, `LS_MECH_DEFAULTS`, `LS_COMMAND_DEFAULTS`, `LS_EVENT_TEXT_DEFAULTS`, `lsLoadEventTextConfig`, `lsText`, `lsCardVars`, `lsPopupPayload`, event-text editor open/close/save/reset, `lsLoadCommandConfig`, `lsScheduleRebirthAutoAdvance`); League-owned pieces inside shared Mission Strip persistence functions (~6538, 6645, 6676–6683 — mission-strip's default text and `commandStrip` flag were League-flavored even though the functions are shared with Milk); `publishSplatCardLayout()`/`publishSplatExplainerConfig()`/`lsToggleExplainerSlides()` (~6704–6754); font-scale helpers (~6755–6814); `lsPersistRound()`/`lsClampNumber()` (~6827–6844); mechanics/command engine helpers (~6845–6952); `lsSetGameTitle()` (~7077–7084); quick-toggle wiring (`dockQuickToggle` cases `'splat'`/`'splat-explainer'` ~7624–7625); `_dockSplatVisible` (~7657); Stream-Bar-off cascade that force-hid Splat Cards (~7678–7683, inside the shared `dockToggleStreamBar()`); `dockToggleSplatCards()` (~7706–7716); `dockTestChatCommand()` (~7781–7794, also fires a Milk comment-match test as a side effect); `dockCardByCtrl('splatcards')` sticky-nav entry (~7814); `buildSplatCardSubsections()` (~7887–7935); League-owned Gist export/import keys (~8210–8241 export, ~8318–8456 import).

**Main contiguous League block: lines 8978–10796** (~1819 lines, header `/* LEAGUE SPRINT LIVE STATE + COMMAND ENGINE */`) — `LOS_KEYS`, `LeagueSprintRankUtils`, `LeagueSprintState`, `publishLeagueSprintVisual()`, `LeagueSprintDuelEngine`, `handleLeagueSprintChatCommand()`, full Boss Library CRUD, Diamond Drops, Player Admin, round/league reset functions, `losExportData()`/`losImportData()` (League Data JSON — separate mechanism from the Gist snapshot), Auto Boss scheduling, `lsEngineTest`/`lsSeed*` test helpers, ending with `testLeagueSprint()` at 10767–10796.

**Misleading comment:** line 10766 `/* Geyser position control */` sits directly above `testLeagueSprint()`. The real geyser function, `geyserMove()`, is at 10798 — right after the League block ends.

## What NOT to confuse this with

- `#mission-strip` — **shared** with Milk Bar. Only stayed in gift-bar.html/stream-dock.html; League's control buttons for it now publish to the same `mission-strip-config` channel from `league-sprint-control.html` instead.
- `#splat-root` "Splat Overlay" (gunge/save-the-run effect, gift-bar.html CSS 1644–1892 + HTML 2906–2964) — same "splat" root word, unrelated feature, stayed in gift-bar.html.
- Dock's `.splat-bar`/`splatCmd()` footer widget (CSS 524–682, HTML 3275–3323, JS ~4928–5025) — dock's own status bar for the gunge feature, not League, stayed in stream-dock.html.
- "Gifter Highlight" / Giftr slides (`gifter-slides-config`) — separate, still-live feature, kept.
- `isTopGifter` / `.tt-top-gifter` chat badge — unrelated TikTok chat styling (`tt` = TikTok), kept.
- `lsUpdateToggleButtons()` (stream-dock.html ~7061–7075) — despite the `ls` prefix, this was dead Milk/Geyser toggle-button code referencing IDs that no longer exist. Not League. Left in place.
- `lsPanelTakeoverActive`/`lsPanelTakeoverTimer` (gift-bar.html ~3070) and `lsD5Art()` (~3117) — `ls`-prefixed but dead/orphaned. Left in place (harmless).

## New home

`league-sprint-overlay.html` + `league-sprint-control.html`, following the same
detach-by-default / toggle-on pattern as `new-here-overlay.html` +
`new-here-control.html` (own Ably connection, zero live connection until
explicitly toggled on via a dedicated `league-sprint-toggle` channel).

Removed from the live `gift-bar.html`/`stream-dock.html` on 2026-07-19.
