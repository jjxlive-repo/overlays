# League Sprint Codex Revised + Final Card Art

This package uses the two uploaded revised Codex files from this turn as the source of truth:

- `gift-bar.html`
- `stream-dock.html`

Applied patch:
- Added the final full-card art assets under `assets/cards/full/`
- Patched only the League Sprint card renderer in `gift-bar.html` so cards load exact rank art:
  `assets/cards/full/{character}_{rank}.png`
- Left the revised Codex command/event feedback layer intact.
- Left `stream-dock.html` unchanged from the uploaded revised file.

Upload the extracted folder contents to GitHub, not the zip itself.
