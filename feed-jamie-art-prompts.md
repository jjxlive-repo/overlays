# FEED JAMIE — Image Generation Prompts

Same workflow as `character-art-gpt-prompts.md`: paste the **Master Spec** once at the start of the
image-gen session (or repeat it in every prompt if the tool forgets context), then send one
**per-image prompt** per file. Save each result with the exact filename shown and drop it into
`assets/feed-jamie/` (items go in `assets/feed-jamie/items/`). No code changes needed — the overlay
picks them up on refresh / "Reload assets".

---

## 1. MASTER SPEC (paste this every time)

```
Create a single character sticker illustration of "Jamie", a cute cartoon dog mascot for a livestream overlay.

CANVAS & FORMAT
- Output size: 1200x1400 pixels, portrait canvas.
- Background: fully transparent PNG (alpha channel). No background color, no ground shadow, no scene, no vignette.
- FULL BODY, nothing cropped — ears, tail, and paws must be entirely inside the frame.
- Center the character horizontally. The lowest paw/body point must sit at roughly 94% of the canvas height (about y=1320 of 1400), with clear empty space above the head.
- The character fills roughly 70-80% of the canvas height.

CHARACTER (identical in every image)
- Chibi sticker-style fluffy dog, charcoal-gray fur (#3A3A40 range).
- VERY large upright triangular ears with lighter gray inner ears.
- Large glossy black circular eyes with big white shine dots.
- Small black shiny nose, short rounded muzzle, tiny curved eyebrows.
- Small peach-orange blush circles on the cheeks.
- Compact rounded paws, fluffy cheek/chest/tail fur, small pink tongue only when the pose calls for it.
- Big head, small round body — cute chibi proportions.

STYLE
- Thick organic black outline around all shapes.
- THICK WHITE STICKER BORDER around the entire silhouette (like a die-cut sticker).
- Minimal soft shading, flat marker-style color fills, hand-drawn digital marker texture.
- A few cobalt-blue (#3B82F6) edge highlight strokes along the fur silhouette.
- Must read clearly at very small mobile size — bold shapes, no fine detail.

DO NOT
- No realism, no anatomical detail, no long legs, no painterly rendering, no heavy shading.
- Not wolf-like, not thin or angular, no other breed or color.
- No collar, no text, no logos, no watermark, no 3D render, no drop shadow baked into the image.
- Do not change the head shape, ear size, eye size, proportions, colors, or outline thickness between images — every image is the SAME character in a different pose.
```

---

## 2. CONSISTENCY LINE (add to every prompt after the first)

```
This is the exact same Jamie character as the previous images — identical head shape, ear size and angle, eye size and placement, fur color, blush, outline thickness, and white sticker border. Only the pose and expression change as described below.
```

If your generator supports reference images, feed it your best accepted frame (usually
`jamie-idle-01.png`) as the reference for every subsequent frame — especially the blink frame.

---

## 3. PRIORITY 1 — generate these 10 first

### jamie-idle-01.png
```
Pose for this image (file: jamie-idle-01.png):
Jamie sits upright and compact, facing the viewer, perfectly calm and content. Both ears fully upright. Eyes open with big shine dots. Mouth closed in a small soft smile. Front paws together on the ground between the hind legs. Tail relaxed, curled at one side on the ground. This is the neutral "default sit" — balanced, symmetrical, relaxed. All four paws / body base rest on the same invisible floor line near the bottom of the canvas.
```

### jamie-idle-02-blink.png
```
Pose for this image (file: jamie-idle-02-blink.png):
EXACTLY the same sitting pose, camera angle, size and position on the canvas as jamie-idle-01 — pixel-identical body, ears, paws, and tail. The ONLY change: the eyes are closed, drawn as two downward-curved happy eyelid lines. Nothing else moves. This frame is swapped in for a 0.16-second blink, so any misalignment will visibly jump.
```

### jamie-anticipation-01.png
```
Pose for this image (file: jamie-anticipation-01.png):
Jamie in an excited play-bow: front legs stretched forward flat on the ground, chest low, rear end raised, tail up and alert, ears pricked forward. Eyes wide and eager, mouth slightly open in an excited grin. Body angled slightly toward the upper-right as if watching a toy in the air. Front paws touch the same floor line near the bottom of the canvas.
```

### jamie-treat-catch-01.png
```
Pose for this image (file: jamie-treat-catch-01.png):
Jamie springing upward from a sit — hind paws still near the ground, body stretched up, front paws raised to chest height. Mouth WIDE open in a happy catch, tongue slightly visible, eyes locked upward. Tail up. Do NOT draw any treat or food — the mouth is empty (the game engine flies the treat into the mouth). The open mouth sits slightly right of the canvas center, roughly 40% down from the top.
```

### jamie-treat-chew-01.png
```
Pose for this image (file: jamie-treat-chew-01.png):
Jamie back in the seated pose from jamie-idle-01, chewing happily: cheeks slightly puffed out, mouth closed, eyes squeezed shut in a blissful curve, small crumb specks optional near the mouth. Ears relaxed. Same seated silhouette and floor position as idle-01.
```

### jamie-treat-happy.png
```
Pose for this image (file: jamie-treat-happy.png):
Jamie seated, extremely satisfied after a snack: big open smile with pink tongue out, eyes closed in upward happy curves, blush prominent, tail mid-wag lifted off the ground, chest puffed. Same seated position and floor line as jamie-idle-01.
```

### jamie-fetch-ready.png
```
Pose for this image (file: jamie-fetch-ready.png):
Jamie in a low, focused hunting crouch: whole body lowered, front legs bent and coiled, rear slightly up, tail straight back, ears pointed sharply forward, eyes wide and locked upward toward the upper-right like tracking a ball in flight. Mouth closed and determined. Paws on the floor line near the bottom of the canvas.
```

### jamie-fetch-leap.png
```
Pose for this image (file: jamie-fetch-leap.png):
Jamie fully airborne mid-leap, body stretched diagonally upward toward the upper-right, front paws extended forward/up, hind legs trailing, tail streaming behind. Mouth WIDE open ready to catch — but draw NO ball (the game engine adds it). Eyes thrilled and wide. The open mouth sits slightly right of canvas center, roughly one-third down from the top. Nothing touches the floor in this frame, but keep the character centered in the same canvas region as the other frames.
```

### jamie-fetch-catch.png
```
Pose for this image (file: jamie-fetch-catch.png):
Jamie landing from the leap, front paws down on the floor line, rear still slightly raised, mouth CLOSED as if it just clamped shut around a ball — cheeks slightly bulged, proud sparkling eyes. Do NOT draw the ball. Mouth area sits slightly right of canvas center, roughly 40% down from the top.
```

### jamie-heart-celebrate-01.png
```
Pose for this image (file: jamie-heart-celebrate-01.png):
Jamie's biggest celebration: joyful vertical jump, both front paws thrown up in the air, tongue out, eyes shut in ecstatic happy curves, ears bouncing outward, tail high. Add two or three small purple hearts (#A855F7) floating around the head as part of the sticker. Maximum cuteness and energy — this is the "someone sent a Heart Me" jackpot pose.
```

---

## 4. PRIORITY 2

### jamie-track-left.png / jamie-track-center.png / jamie-track-right.png
```
Pose (file: jamie-track-left.png): Same seated pose, position, and floor line as jamie-idle-01, but the head is turned and tilted toward the UPPER-LEFT, eyes looking up-left at something moving, ears alert. Body stays front-facing; only head and eyes redirect. Mouth closed, curious.
```
Repeat for `jamie-track-center.png` (chin lifted, eyes straight up) and `jamie-track-right.png` (head toward upper-right).

### jamie-anticipation-02-wiggle.png
```
Pose (file: jamie-anticipation-02-wiggle.png): The SAME play-bow as jamie-anticipation-01, same canvas position and floor contact, but the rear end and tail are swung about 15 degrees to the other side mid-wiggle, and the tail is drawn with small motion dashes. These two frames alternate to create an excited butt-wiggle loop, so everything except the hips/tail must align with anticipation-01.
```

### jamie-treat-catch-02.png
```
Pose (file: jamie-treat-catch-02.png): Peak of the treat catch — Jamie at the top of a small hop, head tipped back slightly, mouth at its widest open point, front paws spread. NO treat drawn. The center of the open mouth must sit just right of canvas center, about 40% down from the top — the game flies the treat exactly there.
```

### jamie-ball-hold.png
```
Pose (file: jamie-ball-hold.png): Jamie sitting proudly like jamie-idle-01 but WITH a bright yellow tennis ball held in the mouth (draw the ball this time — combined prop), chest out, eyes proud and sparkling, tail lifted. The ball has the same sticker outline style.
```

### jamie-heart-celebrate-02.png / jamie-heart-celebrate-03.png
```
Pose (file: jamie-heart-celebrate-02.png): Alternate jump frame of the Heart Me celebration — same airborne joy as heart-celebrate-01 but the body tilted the opposite way, paws at different heights, hearts in different spots, for a bouncing loop.
```
```
Pose (file: jamie-heart-celebrate-03.png): The PEAK Heart Me pose — highest point of the jump, belly toward the viewer, both front paws spread wide showing dark rounded paw pads, tongue out, eyes shut with joy, several purple hearts around. The single most exciting image in the whole set.
```

### jamie-toy-paw.png
```
Pose (file: jamie-toy-paw.png): Jamie seated but leaning forward with ONE front paw extended out to the lower-right, reaching to bat at a toy. Eyes focused down-right, ears forward, mouth slightly open. NO toy drawn — the game places it at the extended paw. The reaching paw sits right of center, about 80% down the canvas.
```

### jamie-toy-surprised.png
```
Pose (file: jamie-toy-surprised.png): Jamie recoiling in adorable shock (the toy just squeaked!): sitting back, both ears shot straight up, eyes huge, mouth a small round "o". One paw still slightly raised. Same floor line.
```

### jamie-bubble-watch.png
```
Pose (file: jamie-bubble-watch.png): Jamie seated tall, stretching the neck up, nose pointed high, eyes crossed slightly upward watching a bubble float above. Mouth closed. Ears up. Same floor line as idle-01. No bubble drawn.
```

### jamie-bubble-pop.png
```
Pose (file: jamie-bubble-pop.png): Jamie reaching UP with one paw (or nose tilted up) to gently pop a bubble above and to the right. Eyes delighted. NO bubble drawn — the game places it at the raised paw, right of center about 70% down the canvas.
```

### jamie-duck-head-tilt.png
```
Pose (file: jamie-duck-head-tilt.png): Jamie seated with a strong, extremely cute head tilt (about 25 degrees), one ear flopping slightly lower than the other, big curious eyes, small closed mouth. The classic confused-dog look. Same seated base as idle-01.
```

### jamie-premium-ready.png / jamie-premium-catch.png / jamie-premium-celebrate.png
```
Pose (file: jamie-premium-ready.png): Like the fetch crouch but AMAZED — crouched low, eyes huge with star-struck sparkles, mouth open in awe, a few small gold (#F5C518) sparkle stars around the head. Something golden is coming.
```
```
Pose (file: jamie-premium-catch.png): Airborne catch like jamie-fetch-leap but more dramatic — body arched higher, gold sparkle stars trailing, mouth wide open just right of canvas center about one-third down. NO ball drawn.
```
```
Pose (file: jamie-premium-celebrate.png): Jamie seated proudly holding a GOLD tennis ball in the mouth (draw the golden ball — combined prop), chest out, gold sparkles around, tail high, eyes triumphant.
```

### jamie-comment-look.png
```
Pose (file: jamie-comment-look.png): Jamie seated, looking DIRECTLY at the viewer, head straight, one front paw lifted in a friendly little wave, mouth open in a happy smile, tongue tip visible. Breaking the fourth wall to greet chat.
```

---

## 5. PRIORITY 3

One-liners — combine each with the Master Spec + consistency line:

- **jamie-anticipation-03-launch.png** — play-bow compressed like a spring: hind legs coiled tight, front paws just lifting off, about to explode upward.
- **jamie-treat-chew-02.png** — same as treat-chew-01 with the puffed cheek and jaw shifted to the opposite side (alternate chew frame; must align with chew-01).
- **jamie-toy-happy.png** — seated with a blue squeaky toy pinned under one front paw (draw the toy), pleased mischievous grin.
- **jamie-duck-paw.png** — seated, one paw extended to gently boop something low-right (no duck drawn; paw right of center, ~80% down).
- **jamie-sock-grab.png** — mischievous narrowed eyes, mouth open gripping sideways at something (no sock drawn; mouth slightly right of center, ~45% down).
- **jamie-sock-tug.png** — leaning way back, front paws braced forward, body low, pulling hard in a tug-of-war, playful gritted mouth (no sock drawn).
- **jamie-bubble-surprised.png** — small backward recoil, blinking with one eye half-closed, tiny water droplet specks, ears back — the bubble just popped on the nose.
- **jamie-miss.png** — lunging with both paws toward the lower-left while looking the wrong way, comic "aww" expression, one ear flopped.
- **jamie-sleep.png** — curled up lying on the floor line, eyes closed, nose tucked toward the tail, tiny "z z" marks above.
- **jamie-wake.png** — same curled position but head lifting, one eye half open, ears rising.
- **jamie-track-high.png** — seated, head tipped far back looking almost straight up.
- **jamie-idle-03-breathe.png** — identical to idle-01 with the chest very slightly expanded (subtle breathing alternate; must align with idle-01).
- **jamie-idle-04-ear-twitch.png** — identical to idle-01 with one ear rotated/flicked outward (must align with idle-01).

**Do not generate:** jamie-fetch-return.png, jamie-confused.png (unused by the code).

---

## 6. ITEM SPRITES (11 files → `assets/feed-jamie/items/`)

### Item master spec (paste before each item prompt)

```
Create a single cartoon object sticker for a livestream overlay game, matching the art style of a chibi dog mascot set.

- Output: 512x512 pixels, fully transparent PNG background.
- The object is centered and fills about 70% of the canvas.
- Thick organic black outline, THICK WHITE STICKER BORDER around the silhouette (die-cut sticker look).
- Flat marker-style colors, minimal soft shading, one small white glint highlight.
- NO drop shadow, no background, no text, no character — just the object.
- Must read clearly at 50-120 pixels on a phone screen: bold simple shapes only.
```

### Per-item lines

- **treat-biscuit.png** — `A round tan dog biscuit cookie with a few darker baked dots.`
- **treat-bone.png** — `A classic bone-shaped dog biscuit in light tan with a subtle baked line down the middle.`
- **treat-purple-splat.png** — `A cookie shaped like a fun paint splat, bright purple (#A855F7) with lighter purple (#C084FC) spots.`
- **treat-heart.png** — `A heart-shaped tan cookie with a small bite-worthy chunky look and a darker drizzle line.`
- **tennis-ball.png** — `A bright yellow-green tennis ball with two curved white seam lines.`
- **golden-tennis-ball.png** — `A shiny GOLD (#F5C518) tennis ball with white seam curves and one small four-point white sparkle star on the rim.`
- **squeaky-toy.png** — `A round blue (#3B82F6) rubber squeaky dog toy with a small squeaker nub on top and light blue accents.`
- **duck.png** — `A classic yellow rubber duck in side view with an orange beak and a simple black dot eye.`
- **sock.png** — `A slightly floppy white sock with a blue cuff and two thin blue stripes.`
- **bubble.png** — `A translucent soap bubble: pale blue circle at low opacity with a bright white curved shine on the upper-left and a small white dot on the lower-right. Keep it airy and see-through.`
- **heart-large.png** — `A big glossy purple (#A855F7) heart with a lighter purple curved highlight on the upper-left.`

---

## 7. After generating

1. Save with the **exact lowercase filenames** above.
2. Drop Jamie frames into `assets/feed-jamie/`, items into `assets/feed-jamie/items/`.
3. Push to GitHub Pages (for TikTok Studio) and/or click **Reload assets** in the control panel.
4. Check alignment with **Setup guides + Jamie bounding box** in control panel section B.
   If a mouth/paw doesn't line up with where items fly, don't regenerate — nudge that frame's
   `mouthTarget` / paw target coordinates in `assets/feed-jamie/asset-manifest.json`.
