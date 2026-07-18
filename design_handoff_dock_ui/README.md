# Design Handoff — Stream Dock UI improvement pass

## What this is
A **UI/visual-design improvement pass** on `overlays/stream-dock.html` — the streamer's
main at-a-glance **control dock**, used live while streaming to TikTok + YouTube
simultaneously. It merges both platforms' chat into one feed, routes gifts/super chats
into a "Money In" rail, lets the streamer feature a message on the broadcast overlay with
one click, and hosts the controls for ~30 broadcast overlays (gift bars, splat cards,
crowd effects, timeouts, etc.).

This is **not a from-scratch build and not a rewrite.** The dock already works. The goal is
to make it **look and feel better** — hierarchy, spacing, consistency, polish — while
leaving every behavior intact.

> ⚠️ **HARD ACCESSIBILITY CONSTRAINT — the streamer is red-green colorblind.**
> Nothing may rely on distinguishing red from green. Status/state must be carried by
> **text labels, shape, or brightness — never color alone.** Wherever you'd normally reach
> for green (success/on/live), use **sky-blue `#38bdf8`**. The CSS variable literally named
> `--green` is already set to blue (`#3b82f6`) for this reason — do not "fix" it to green.
> Platform identity uses glyph shape + black-vs-red badges (♪ on black = TikTok,
> ▶ on red = YouTube), never red-vs-green.

---

## Tech constraints (read before designing)
- **Single file**, `overlays/stream-dock.html`, ~11,500 lines: inline `<style>` + vanilla
  JS + Ably realtime. **No build step, no framework, no bundler, no external CSS.** Ship CSS
  the design can be implemented as: plain CSS + CSS custom properties.
- **Reuse the existing `:root` token system** (see `design-tokens.md`). Extend it; don't
  invent a parallel one. Most colors, fonts, radii, and type sizes are already variables.
- **Fonts already loaded** (Google Fonts): DM Sans (UI), DM Mono (numbers/amounts),
  Boogaloo (big display numerals), plus Inter/Nunito/Poppins/Roboto/Ubuntu/Rajdhani/Exo 2/
  Outfit (user-selectable chat font). Don't add new font families without reason.
- **Deliverable format:** annotated mockups + exact specs (colors as hex/rgba, px sizes,
  spacing, radii) that map onto the existing classes/variables — same as the previous
  readability handoff. HTML `.dc.html` prototypes are ideal. Do **not** hand back a React/
  Tailwind/Figma-only artifact that can't be transcribed into this file's vanilla patterns.
- **It renders inside OBS/TikTok Studio and in a browser tab.** The compositor (TikTok
  Studio) owns the camera and scene; this dock is an operator control surface, not an
  on-camera graphic. Design for a dense, glanceable operator tool, not a viewer-facing screen.

---

## Current layout (what exists today — preview the file to see it live)
Two columns under a thin top bar, with a status/footer bar pinned at the bottom.

```
┌───────────────────────────────────────────────────────────────────────┐
│  ● TIKTOK  — 👁      ● YOUTUBE  — 👁          (top viewer-count bar)     │
├──────────────────────────────┬────────────────────────────────────────┤
│  ALL CHAT  0  click to feature│  ┃ CONFIG TOGGLES            (section)  │
│  [1][2] [⬇Live] [⊞Controls] ⚙│  ┃ ▸ OVERLAY TOGGLES  (collapsible card)│
│ ┌────────────┬──────────────┐ │  ┃ ▸ LAYOUT — POSITION & SCALE          │
│ │ MONEY IN   │  chat feed    │ │  ┃ ▾ CLOUD SYNC (GITHUB GIST)           │
│ │ ·0 today $0│  (big rows,   │ │  ┃ MODERATION                          │
│ │ hero cards │   avatars,    │ │  ┃ ▸ TIMEOUT BOX                        │
│ │ coin rows  │   pills)      │ │  ┃ TESTING ▸ GIFTS ▸ CHAT               │
│ └────────────┴──────────────┘ │  ┃ PROMO ▸ LIVE TEXT ▸ EVENT PROMO …    │
│ [ Send to all chats…] [Send]  │  ┃ EVENTS · CHAT GAMES · MILK BAR …     │
├──────────────────────────────┴────────────────────────────────────────┤
│ ●Splat ●SSN ●TF   Ably: N msgs · est./mo · daily cap   [Reset][Save][✕] │
└───────────────────────────────────────────────────────────────────────┘
```

### Left column — "All Chat" (the primary work surface)
- **Header:** live dot, "All Chat" title, message count badge, "click to feature" hint,
  1/2-column chat toggle, **⬇ Live** auto-scroll toggle, **⊞ Controls** (collapses the right
  column to give chat more room), **⚙** font/size settings.
- **Money In rail** (left, 300px): gifts + super chats pulled out of chat. Gold theme.
  Super chats = hero cards; TikTok coin gifts = compact rows; running session total in the
  header. Cards are click-to-feature too.
- **Chat feed:** large rows (38px avatar w/ platform ring + corner badge, 15px bold
  platform-colored name, text status pills, 16.5px message). Recently redesigned — see
  "Recently done" — treat as the baseline to refine, not redo.
- **Send bar:** send-to-all-chats input + Send.

### Right column — collapsible control stack
Colored **section header bars** (CONFIG TOGGLES, MODERATION, TESTING, PROMO, EVENTS, CHAT
GAMES, MILK BAR) group **collapsible cards** (Overlay Toggles, Layout, Cloud Sync, Timeout
Box, Gifts, Chat, Live Text, Event Promo, Top Gifters, Gifter Highlight, Stingers, Fun
Drawer, Peek Overlay, Splat Cards, Bait Card, New Here, Team Timing, Crowd Glass, Kegel,
Milk Controls/Scoring, …). This column collapses entirely via ⊞ Controls.

### Bottom status bar
Connection dots (Splat / SSN / Tikfinity), the Ably usage + daily-cap readout, and
Reset / Save / Clear.

---

## Where to focus (improvement targets — design's call on priority)
These are observations, not prescriptions. Pick what raises quality most.
1. **Right-column density & rhythm.** ~30 stacked cards under colored section bars. Grouping,
   spacing, collapse affordances, and scannability are the biggest opportunity. Section-header
   color bars vs. card headers currently compete — clarify the hierarchy.
2. **Consistency pass.** Buttons, pills, toggles, inputs, and card headers have accumulated
   slightly different paddings/radii/weights across ~11k lines. Unify into the token system.
3. **State legibility (within the colorblind rule).** On/off toggles, "connected/offline"
   dots, "OPEN/CLOSED" card chips — make state instantly readable by shape+label+brightness.
4. **The two columns as one system.** The left (chat/money) got a recent facelift; the right
   (controls) hasn't. Bring them into one visual language.
5. **Top bar + bottom status bar** polish — currently functional but plain.
6. **Empty/waiting states** ("waiting…", "Gifts & Super Chats show up here") — low effort,
   nice polish.

---

## Do NOT break (behavior that must survive a visual redesign)
- **Click-a-row-to-feature** on both chat rows and Money In cards (`featureMessage`).
- **Auto-scroll / ⬇ Live** toggle, **1/2-column** chat toggle, **⊞ Controls** collapse,
  **⚙** font + size settings (chat type size is user-adjustable — don't hard-freeze it).
- **Money In routing & dedup**, the **All Chat** TikTok+YouTube merge, gift-alert pipeline.
- Every **overlay toggle / control card** and its **Cloud Sync (GitHub Gist)** save flow.
- **Ably realtime** wiring and the **daily publish safety cap** readout in the footer.
- The **colorblind-safe** color choices already in place (sky-blue for on/live, badge shapes).
- **IDs, class names, and `on…` handlers** are referenced by ~11k lines of JS — when
  restyling, prefer changing CSS for existing selectors over renaming/removing them. If a
  structural change needs new markup, keep the existing IDs/handlers wired.

---

## How to preview
Open `overlays/stream-dock.html` directly in a browser (it runs standalone; Ably will try to
connect but the UI renders without a live stream). To see chat/money rows populate for design,
paste this in the console:
```js
addUnified({chatname:'mikatron', chatmessage:'this overlay is so clean!', membership:true}, 'yt', false, true);
addUnified({chatname:'jellybean.live', chatmessage:'love the energy 🔥', isSuperfan:true}, 'tt', true, false);
addMoneyRail({chatname:'Marcus L', chatmessage:'ty!', hasDonation:'$20'}, {isYT:true, amount:20, usd:20});
addMoneyRail({chatname:'rosielee', gifttitle:'Galaxy', hasDonation:'1,000 Coins'}, {isTT:true, amount:1000});
```
Expand the right-column cards by clicking their headers to see the full control stack.

---

## Recently done (baseline — refine, don't redo)
A readability + Money In pass already shipped on the left column:
- Bigger chat rows (38px avatars, platform ring + ♪/▶ corner badge, 15px names, 16.5px text).
- Text status pills (★ MEMBER sky-blue / ★ SUPERFAN gold / ♥ FAN pink) — colorblind-safe.
- Gifts/super chats moved out of chat into the **Money In** rail (hero cards + coin rows +
  running total), fed from the gift-alert pipeline with cross-source dedup.
See `design-tokens.md` for the exact values these use, and reuse them as the shared language
when styling the rest of the dock.

## Files
- `overlays/stream-dock.html` — the single target file (edit CSS + markup in place).
- `design-tokens.md` (in this folder) — current color/type/spacing tokens to build on.
- Repo: `github.com/jjxlive-repo/overlays` (GitHub Pages serves the live dock).
