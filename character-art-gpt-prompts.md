# League of Splatties — Character Art Generation Spec (for GPT image gen)

Paste the **Master Technical Spec** once at the start of your image-gen session (or repeat it in every prompt if the tool doesn't hold context). Then use the **Per-Image Prompt Template** for each of the 90 files.

---

## 1. Master Technical Spec (paste this every time)

```
Create a single character illustration for a mobile card game called "League of Splatties."

CANVAS & FORMAT
- Output size: 1024x1024px, square canvas.
- Background: fully transparent (PNG with alpha channel). No background color, no ground shadow gradient, no scene, no vignette — just the character on transparent pixels.
- The character must be FULL BODY, head to feet, entirely inside the frame with no cropping at the top, sides, or bottom.
- Center the character horizontally. Feet should sit near the bottom ~10% of the canvas (not floating in the middle), with clear headroom above the head (roughly 8-12% empty space at the top). This is important — the art gets placed in a UI card that anchors it to the bottom, so extra empty space at the top is fine but nothing should be cut off at the bottom or sides.
- The character should fill roughly 75-85% of the canvas height. Not tiny and floating in the center, not bleeding off the edges.

STYLE
- Bold, flat-shaded "vinyl toy" / sticker mascot style — thick clean silhouette, simple flat color fills, minimal gradient shading (a bit of soft cel-shading is fine), big readable shapes.
- Do NOT draw your own thick black outline around the character. Keep edges clean and softly anti-aliased — the app automatically adds a colored outline/glow around the art in code, so a hand-drawn outline will double up and look muddy.
- No text, no logos, no watermarks, no card frame, no borders, no UI elements of any kind — just the character.
- Single consistent 3/4-front "hero pose" camera angle across every image of the same character (same angle every time so the card set feels consistent).
- Lighting: soft single key light from upper-left, consistent across all images.

WHY THIS MATTERS
- This art is displayed at sizes ranging from 54px tall (tiny leaderboard chip) up to 228px tall (full popup card), always using "object-fit: contain" (never cropped, but can be small) — so silhouettes need to read clearly even tiny. Avoid fine detail that disappears at small sizes; rely on bold shapes and strong color contrast instead.
```

---

## 2. The 5 characters (consistent identity across all their ranks)

Each character needs its own fixed design — same species/body/palette in every image, only accessories/aura/pose-confidence should escalate with rank (see section 3). Give GPT this as the character's identity brief before generating that character's set:

| Character | Type | Suggested design direction |
|---|---|---|
| **Wekka** | Defender | Stocky, armored turtle/shell-creature. Round, tanky silhouette. Cool blues/teals. Calm, sturdy stance, arms crossed or shield-ready. |
| **Layla** | Attacker | Sleek, agile blade/claw-creature. Lean, angular silhouette. Hot pink/crimson palette. Dynamic lunging or striking pose. |
| **Kinz** | Balanced | Friendly round mascot creature, big eyes, approachable. Warm purple/lavender palette (matches the game's core purple-splat brand). Cheerful, confident stance. |
| **Jasper** | Gambler | Mischievous creature with a dice/card motif somewhere on its body (spots shaped like pips, a card-shaped tail, etc). Gold/green palette. Sly grin, one-hand-on-hip pose. |
| **Jamie** | Escapist | Fast, wispy creature with a trailing smoke/motion-blur tail. Slim silhouette. Cyan/electric-blue palette. Mid-dash pose, leaning forward. |

Example per-character opening line to give GPT:
```
Character: "Wekka" — a stocky, armored turtle-like creature, Defender class. Cool blue and teal color palette, round shell, calm sturdy stance with arms ready to block. This exact character design must stay identical across every rank image — only its gear/aura/pose-energy should change per the rank notes below.
```

---

## 3. Rank progression cues (brightness/shape/detail — never color-only)

JJ is red-green colorblind, so rarity **cannot** be signaled by hue alone (e.g. "green vs red glow"). Use brightness, shape complexity, and added detail instead. Same base character design at every rank — escalate like this:

| League | Feel | Visual escalation vs. the base design |
|---|---|---|
| **D** (D5→D1, entry level) | Plain, scrappy | Base design, no extra gear, muted/matte colors, simple stance. D1 (top of D) can add a tiny confidence tweak (slight grin, one small accessory) vs D5. |
| **C** (C5→C1) | Getting equipped | Add one visible piece of gear (gloves, a small weapon, a patch/badge). Slightly brighter, more saturated colors than D. Posture a bit more confident. |
| **B** (B5→B1) | Powered up | Add a soft glow/aura outline around the silhouette (rendered as part of the character, not the app's outline), extra gear piece, more dynamic pose, noticeably brighter highlights. |
| **A** (A3→A1, top tier — only 3 divisions) | Elite / legendary | Full glow aura, particle/spark accents floating near the character, most detailed gear, most dynamic hero pose, brightest highlights and highest contrast. A1 is the single most striking version of the character in the whole set. |

Within a league, divisions count DOWN as they get stronger (5 = weakest, 1 = strongest — except A league, which only has divisions 3, 2, 1). So `wekka_d1` should look a notch more confident/detailed than `wekka_d5`, even though both are still "plain D-league" tier overall.

---

## 4. Per-Image Prompt Template

Fill in the four bracketed fields and send one of these per file:

```
[MASTER TECHNICAL SPEC FROM SECTION 1]

Character: [CHARACTER IDENTITY BRIEF FROM SECTION 2]

Rank for this image: [LEAGUE] league, division [N] (file: [character]_[rank].png)
Rank styling: [PASTE THE MATCHING ROW FROM SECTION 3]

Generate this exact character at this exact rank tier, following all technical and style rules above.
```

Example, fully filled in for `wekka_b3.png`:
```
[section 1 spec]

Character: "Wekka" — a stocky, armored turtle-like creature, Defender class. Cool blue and teal
color palette, round shell, calm sturdy stance with arms ready to block. This exact character
design must stay identical across every rank image — only its gear/aura/pose-energy should
change per the rank notes below.

Rank for this image: B league, division 3 (file: wekka_b3.png)
Rank styling: Powered up — soft glow/aura outline around the silhouette, extra gear piece
(e.g. a small shoulder plate), more dynamic pose, noticeably brighter highlights than C/D tier.

Generate this exact character at this exact rank tier, following all technical and style rules above.
```

---

## 5. Full file list (90 files, save each as exactly this filename, lowercase)

For each of `wekka`, `layla`, `kinz`, `jasper`, `jamie`, generate all 18 of:

```
{character}_d5.png  {character}_d4.png  {character}_d3.png  {character}_d2.png  {character}_d1.png
{character}_c5.png  {character}_c4.png  {character}_c3.png  {character}_c2.png  {character}_c1.png
{character}_b5.png  {character}_b4.png  {character}_b3.png  {character}_b2.png  {character}_b1.png
{character}_a3.png  {character}_a2.png  {character}_a1.png
```

Upload each finished PNG to your GitHub Pages repo at:
```
assets/cards/art-rank/{character}_{rank}.png
```
(lowercase filename, no spaces) — that's the exact path the overlay already looks for, so nothing else needs to change once the files are uploaded.
