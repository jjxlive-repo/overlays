# Stream Dock readable original layout + verified Crowd Glass merge

This package keeps the original Stream Dock layout and the readability/colorblind-friendly CSS override, then restores the verified Crowd Glass update.

Included:

- Original Stream Dock layout preserved.
- Readability-only CSS override preserved.
- Severe green-deficiency safe color cues preserved:
  - Blue = live / good / connected.
  - Orange = warning / reset / destructive.
  - Purple = action / active.
- Verified Crowd Glass dock controls restored:
  - `Damage / hit` slider instead of `Shatter after`.
  - `cgDamageMultiplier` saved/restored instead of `cgShatterThreshold`.
  - Crowd Glass layout target is one combined `Crowd Glass card` plus `Crack size`.
  - Crowd Glass heartbeat ping restored.
- Verified Crowd Glass overlay files included:
  - `index.html`
  - `app.js`
  - `config.js`
  - `styles.css`

Not included:

- Pass 1 Live/Edit mode.
- Pinned action rail.
- D-pad layout editor.

Quick check:

1. Open `stream-dock.html`.
2. Open `index.html` as the Crowd Glass overlay.
3. In Stream Dock, Crowd Glass should show `Damage / hit`, not `Shatter after`.
4. In Layout, Crowd Glass should show `Crowd Glass card` and `Crack size`, not separate CTA/integrity/viewer badge entries.
