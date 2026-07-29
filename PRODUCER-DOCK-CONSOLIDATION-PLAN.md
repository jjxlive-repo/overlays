# Producer Dock and Overlay Consolidation Plan

Status: Approved implementation brief  
Primary live viewport: approximately 853 px wide in a full-height Chrome tab  
Broadcast canvas: 1080 × 1920  
Transport: Producer Dock local socket only; no Ably dependency

Implementation progress (2026-07-26):

- Checkpoint 1 complete and visually verified at 853 × 1200 and 853 × 900 with no horizontal
  overflow. The two-column dashboard, compact navigation, overlay drawer, chat platform
  treatment, supporter styling, and unchanged priority eligibility are in place.
- Checkpoint 2 complete and verified. Broadcast Message and Supporter Spotlight settings,
  category order, Featured real-data lookup, display-name overrides, and explicit coins/USD
  display values are owned by Producer Dock.
- Checkpoint 3 complete and verified. Strip, Card, and Spotlight render correctly at
  1080 × 1920, including long copy, persistent reload recovery, and the legacy event adapters.
- Checkpoint 4 complete and verified. Supporter Rail/Spotlight, missing-avatar initials,
  TikTok coin and YouTube USD treatments, and the priority order
  Gift → manual Supporter → Event promo → Broadcast → automatic Supporter all work.
  Lower-priority timers pause and resume instead of expiring behind an interruption.
- Checkpoint 5 complete and verified. Producer Dock contains live quick actions, Overlay Studio
  contains setup controls, retired duplicate Stream Dock/Overlay Studio panels are hidden, and
  Stream Launch identifies the consolidated Gesture Suite plus the intentionally separate
  camera-owning Hand Feed source.
- Checkpoint 6 is locally complete. The only remaining acceptance check requires a real TikTok
  LIVE Studio/live-platform rehearsal at 100% zoom; every repeatable local and browser check is
  now green.
- Current verification: Producer Dock typecheck passed, production build passed,
  60 test files / 727 tests passed, changed non-module inline HTML scripts parse, the local
  server is healthy, the Broadcast reload-state endpoint restores correctly, Gesture Engine
  reaches Models ready with no console errors, and the combined Gesture Suite loads its four
  1080 × 1392 compensated layers inside the 1080 × 1920 source.
- The sustained mixed-chat test produced 90 rows at 853 px with no row or page overflow. Plain
  and paid YouTube messages stayed in normal chat, while the priority lane contained only
  VIP/question/supporter-qualified rows. The explicit steady-chat simulator now works even when
  real adapters keep automatic simulation disabled, and stops without leaving a timer behind.
- An open overlay reconnected after a forced Producer Dock restart without a page reload.
  Background-tab Broadcast timing completed correctly, and duplicate gift delivery produced one
  alert animation rather than two.
- All 11 Stream Launch source URLs returned a 1080 × 1920 viewport, applied
  `jjx-ttls-canvas-fix`, scaled the body to exactly 1080 × 1392 (`scale: 1 0.725`), and logged no
  browser errors.
- No active overlay or Producer Dock runtime loads or instantiates Ably. Historical references
  remain only in `_retired` snapshots and explanatory migration comments.

This file is the persistent source of truth for the Producer Dock UI, chat visibility,
Broadcast Message, and Supporter Spotlight work. Implementation must follow all ten phases
and the six checkpoints below.

## Fixed product decisions

- Keep the Producer Dock's two-column live dashboard.
- Ordinary YouTube messages remain ordinary chat.
- A message does not enter the priority lane merely because it came from YouTube.
- Priority-lane eligibility remains limited to VIPs, questions, supporters, and the other
  existing attention-qualified categories.
- Normal YouTube messages receive stronger visual identification without priority promotion.
- TikTok Fan Club members and paid YouTube members receive an additional supporter treatment
  in the normal feed.
- Live controls contain quick actions only. Detailed styling, placement, timing, uploads, and
  calibration belong in setup surfaces.
- One Broadcast Message system replaces the duplicate announce, live-text, promo-card, legacy
  pill, and comment-prompt presentation systems.
- Mechanic-owned text remains controlled by its mechanic.
- Supporter Spotlight uses Producer Dock leaderboard data and never fabricates an avatar,
  amount, unit, or state.
- Existing event contracts remain compatible during migration.

## Phase 1 — Producer Dock cleanup and responsive shell

Target the actual 853 px-wide operating environment first.

### Remove obsolete architecture

- Remove the Ably Bridge section from Settings.
- Remove `ABLY_API_KEY` status and Stream Dock pairing instructions.
- Remove or update remaining comments and labels that describe Ably as the live transport.
- Show the Producer Dock local overlay socket as the single transport status.

### Redesign the Overlay popover

Replace the fixed 232 px On Air rail and four cramped simultaneous cards with:

1. A full-width compact On Air status band.
2. Four primary tabs:
   - Broadcast
   - Supporters
   - Games
   - Emergency
3. One full-width working surface for the active tab.

Example status band:

`● BUS · Jamie 1.75× · Follow ? · Broadcast OFF · Supporters AUTO`

### Live-control sizing

- Primary button height: 32–36 px.
- Secondary control height: 28–30 px.
- Button text: at least 12 px.
- Keep dangerous actions visually separated.
- Use full-width Show/Update and Hide buttons where appropriate.

### Bottom navigation

Keep visible:

- Overlays
- Timeline
- More
- Compact session status

Move under More:

- Activity graphs
- Simulator
- Identity links
- Diagnostics
- Settings
- Setup
- Export

Make End Session an arm-then-confirm action.

## Phase 2 — Chat visibility pass

### Normal YouTube messages

- Keep them only in the normal feed unless they separately qualify for priority.
- Replace the 15 px red square with a wider, labeled `▶ YT` badge.
- Give the badge a strong high-luminance outline and white glyph/text.
- Use a bright cream username instead of muted red.
- Use only an extremely subtle neutral/warm row tint.
- Keep message text neutral white.
- Do not use the supporter gold rail for ordinary YouTube messages.
- Make the YouTube filter visibly distinct without implying priority.

### Priority-lane rules

Do not change eligibility. The lane remains for:

- VIPs
- Questions needing an answer
- Supporters
- Other existing attention-qualified categories

Potential naming clarification:

- Left dashboard panel: Producer Queue
- Chat lane: Priority Messages

### Fan Club and paid-member treatment

In the normal feed, TikTok Fan Club and paid YouTube members receive:

- A 3 px gold left rail.
- A faint gold gradient fading across the row.
- A gold-backed speaker plate around platform badge, name, and membership badge.
- A heavier username.
- TikTok badge such as `♥ FC 8`.
- YouTube badge such as `★ MEMBER` or its real membership tier.
- Neutral message text.
- No perpetual animation.

Fix the current implementation gap where `PlatformBadge` supports `paying`, but the chat row
does not pass it.

### Chat tools

Keep immediately visible:

- All
- TikTok
- YouTube
- Questions
- Supporters
- Attention

Move VIP, search, font-size, and compact controls into a secondary control when needed for the
853 px layout.

## Phase 3 — Main dashboard refinement

### Momentum strip

Show four primary values per platform:

- TikTok: Viewers, Chat, Follows, Gifts
- YouTube: Viewers, Chat, Subs, Supers

Move joins, likes, freshness details, and other secondary metrics into hover/detail states.
Increase the current micro-label size.

### Empty panels

Preserve stable panel geometry while reducing empty visual weight:

- Remove unnecessary nested empty-state boxes.
- Use compact status sentences.
- Lower border/background contrast while empty.
- Restore stronger emphasis when content appears.

## Phase 4 — Persistent overlay configuration

Producer Dock becomes the source of truth for:

### Broadcast Message

- Saved presets
- Default layout
- Placement
- Size
- Visual treatment
- Duration
- Active preset/message state

### Supporter Spotlight

- Master enabled state
- Enabled categories
- Category order
- Rotation interval
- Position and size
- Featured supporter
- Rail/Spotlight mode

Remove browser-localStorage ownership for these shared settings.

## Phase 5 — Consolidated Broadcast Message renderer

Create one renderer with:

- Strip
- Card
- Spotlight

Shared fields:

- Headline
- Supporting line
- Optional body
- Optional badge
- Preset ID
- Layout
- Placement
- Size
- Theme
- Duration

Use the current painted promo-card design language as the visual foundation.

Temporary compatibility adapters:

- `announce` → Spotlight
- `live-text.strip` → Strip
- `live-text.promo` → Card
- Legacy `pill` → Card
- `comment-prompt` → Spotlight with optional rotation

Mechanic-owned text remains separate:

- Feed Jamie prompts and meters
- Follow alerts
- Kegel status
- Gift notifications and boosts
- Game progress
- Mission strips driven by game state

## Phase 6 — Supporter Spotlight renderer

Create a dedicated `#supporter-spotlight` element instead of reusing `#bar-info`.

Preserve these categories:

- Daily
- Weekly
- Monthly
- TikTok
- YouTube
- Featured supporter

Presentation modes:

- Supporter Rail: compact automatic rotation
- Supporter Spotlight: larger manual recognition moment

Design language:

- Painted category ribbon
- Cream/ink supporter card
- Large display name
- Gold amount chip
- Explicit unit
- Platform icon plus written label
- Optional real avatar
- Non-fabricated platform fallback
- Hard shadow and irregular geometry

Data-contract fixes:

- Add explicit `unit` or `displayValue`.
- Persist enabled categories and order.
- Implement Featured supporter instead of always publishing `custom: null`.
- Preserve Viewer Records display-name overrides.

## Phase 7 — Screen-priority coordinator

Enforce this display priority:

1. Gift alert
2. Manual Supporter Spotlight
3. Event promo
4. Broadcast Message
5. Automatic Supporter Rail

Higher-priority content pauses lower-priority content and restores it afterward.

## Phase 8 — Final live controls

### Broadcast tab

- Preset
- Headline quick edit
- Supporting-line quick edit
- Strip/Card/Spotlight
- Show or Update
- Hide

### Supporters tab

- Auto on/off
- Next
- Daily
- Weekly
- Monthly
- TikTok
- YouTube
- Featured
- Hide

### Games tab

- Jamie live actions
- Kegel sequence actions
- Gesture-controlled effects
- No detailed setup sliders

### Emergency tab

- Reset controls only
- Every action arms before firing
- Clear wording about what each reset removes

## Phase 9 — Overlay Studio and legacy retirement

Overlay Studio owns:

- Preset creation
- Placement
- Styling
- Timing
- Comment rotation and match rules
- Supporter category order
- Event-promo images and players
- Mechanic-specific setup

After verification:

- Remove duplicate live controls from Stream Dock.
- Remove separate announcement and Pill/Strip/Card editors.
- Remove obsolete top-gifter localStorage settings.
- Retain compatibility adapters for a transition period.
- Update Stream Launch descriptions and ownership labels.

## Phase 10 — Verification

Test:

- Producer Dock at 853 × 1200.
- Stress test at 853 × 900.
- Browser zoom at 100%.
- High-volume mixed TikTok/YouTube chat.
- Ordinary YouTube messages never entering the priority lane solely due to platform.
- VIPs, questions, and supporters still qualifying correctly.
- Fan Club and paid-member styling in normal and priority rows.
- 1080 × 1920 broadcast rendering.
- Long supporter names and long promotional copy.
- Coins, dollars, jewels, and missing-unit protection.
- Missing avatar and missing-data states.
- Gift alerts interrupting and restoring supporter rotation.
- Event promo interrupting and restoring lower-priority content.
- Browser-source reload and Producer Dock reconnection.
- Hidden/occluded browser-source behavior.
- Compatibility events during migration.
- No Ably references or dependency.
- No duplicated overlay events.

## Six implementation checkpoints

### Checkpoint 1 — Producer Dock shell and chat visibility

Complete Phases 1–3. Verify the 853 px layout, corrected YouTube visual treatment, unchanged
priority-lane eligibility, and stronger Fan Club/paid-member treatment.

### Checkpoint 2 — Persistent settings and data contracts

Complete Phase 4 and the Supporter Spotlight payload corrections from Phase 6. Verify persisted
settings, explicit units, Featured supporter, category order, and display-name overrides.

### Checkpoint 3 — Broadcast Message renderer

Complete Phase 5. Verify Strip, Card, Spotlight, presets, and all legacy event adapters.

### Checkpoint 4 — Supporter Spotlight and priority coordinator

Complete Phases 6–7. Verify both supporter presentation modes and all interruption/restoration
rules.

### Checkpoint 5 — Control migration and legacy retirement

Complete Phases 8–9. Verify live/setup ownership, Stream Launch descriptions, and removal of
duplicate legacy controls.

### Checkpoint 6 — Full live verification

Complete Phase 10. Do not mark the project complete until every verification item passes or is
explicitly documented as a remaining blocker.

Current remaining external acceptance check:

- Run one real TikTok LIVE Studio dress rehearsal at 100% zoom using mixed TikTok/YouTube traffic.
  Confirm every Link source with Custom Resolution `1080 × 1392`, `ttlsFix=1`, and Stretch; this
  is the required compensation for LIVE Studio's 264 px top and bottom source crop. The local
  renderer, background-tab, reconnect, traffic, routing, and sizing portions already pass.
