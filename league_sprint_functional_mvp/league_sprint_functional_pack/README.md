# League Sprint Functional MVP Pack

This pack uses your uploaded `gift-bar.html` as the overlay and `stream-dock.html` as the controller.

## Files
- `gift-bar.html` — overlay with League Sprint renderer, middle bar, popup zone, and bottom shelf.
- `stream-dock.html` — controller with League Sprint test buttons that publish `league-sprint` events over Ably.
- `assets/cards/art/*.png` — 20 MVP anchor art files derived from the uploaded character progression sheets.
- `assets/cards/icons/*.svg` — type icons.
- `assets/cards/frames/*.svg` and `assets/cards/chips/*.svg` — reusable UI assets/placeholders.

## Important
The 20 PNGs are functional MVP crops. They are good enough for integration/testing, but they are not final polished transparent art redraws.

## Setup
Keep `gift-bar.html`, `stream-dock.html`, and the `assets/` folder in the same directory.

Open `gift-bar.html` as the TikTok Studio browser source.
Open `stream-dock.html` as the controller.

## Testing
Use the League Sprint test buttons in Stream Dock:
- Card Popup
- Live Duel
- Leaders
- 20 Anchors
- Badges
- Rebirth
- Pips
- Fragments
- Promoted

The overlay listens for Ably channel events named `league-sprint`.