# Stream Dock — current design tokens

Build on these; don't invent a parallel system. All are from the `:root` block and the
recent chat/Money-In pass in `overlays/stream-dock.html`. Values are exact.

## `:root` custom properties (verbatim)
```css
:root {
  /* platform + accent */
  --tt:        #fe2c55;   /* TikTok red/pink */
  --yt:        #ff4444;   /* YouTube red */
  --gift:      #f5a623;   /* gold — gifts / Money In */
  --purple:    #A855F7;   /* primary accent (feature / brand) */
  --purple-dk: #7B2FBE;
  --green:     #3b82f6;   /* ⚠ named "green" but is BLUE — colorblind-safe "on/live". Keep blue. */
  --danger:    #F43F5E;   /* off / destructive */

  /* surfaces */
  --bg:        #0d0d12;              /* app background (near-black) */
  --bg-panel:  rgba(18,18,26,0.94);  /* panel / column background */
  --bg-card:   rgba(255,255,255,0.035);
  --bg-hover:  rgba(255,255,255,0.06);
  --bg-feat:   rgba(255,255,255,0.09);
  --border:    rgba(255,255,255,0.07);
  --border-hi: rgba(255,255,255,0.14);

  /* text */
  --txt:       rgba(255,255,255,0.90);
  --txt-dim:   rgba(255,255,255,0.42);
  --txt-name:  rgba(255,255,255,0.72);

  /* shape + type */
  --radius:    10px;
  --font:      'DM Sans', sans-serif;   /* UI */
  --mono:      'DM Mono', monospace;    /* numbers, amounts, counts */
  --boogaloo:  'Boogaloo', cursive;     /* big display numerals (viewer counts) */

  --dock-panel-title-size:   13px;
  --dock-section-title-size: 12px;
  --dock-option-size:        12px;
  --dock-help-size:          11px;
}
```

## Colorblind-safe status palette (do not introduce green)
| Meaning            | Color                        | Also carried by |
|--------------------|------------------------------|-----------------|
| On / Live / Member | sky-blue `#38bdf8` (`--green` = `#3b82f6`) | text label + shape |
| Off / Destructive  | `#F43F5E` (`--danger`)       | text label      |
| Gift / money / superfan | gold `#f5a623`, text `#ffd27a` / `#ffb84d` | label + amount |
| Fan (TikTok)       | pink `#ff8fb0`               | "♥ FAN" label   |
| Feature / brand    | purple `#A855F7` / `#c084fc` | "★ featuring"   |

Platform identity (never red-vs-green): **TikTok = ♪ glyph on black `#000`**,
**YouTube = ▶ glyph on red `#ff0000`**, each as a ring + corner badge on the avatar.

## Chat + Money In type scale (recent pass — reuse as the shared language)
| Element              | Size / weight | Color |
|----------------------|---------------|-------|
| Chat message text    | 16.5px / 1.45 line | `rgba(255,255,255,.92)` (user-adjustable via ⚙) |
| Chat username        | 15px / 700    | TikTok `#ff5c8a`, YouTube `#ff8080` |
| Status pill          | 9.5px / 700   | member `#38bdf8` on `rgba(56,189,248,.16)`; superfan `#ffd27a` on `rgba(245,166,35,.2)`; fan `#ff8fb0` on `rgba(254,44,85,.16)` |
| Timestamp            | 12px          | `rgba(255,255,255,.32)` |
| Avatar               | 38px chat / 32px hero card / 30px coin row | platform ring 2.5px; corner badge 18/16/15px |
| Money rail label     | 11px / 700, .1em, uppercase | `#f5a623` |
| Money rail total     | 14px / 700, `--mono` | `#ffd27a` |
| Super-chat card amt  | 18–19px / 700, `--mono` | `#ffd27a` |
| Coin-gift row amt    | 12.5px / 700, `--mono` | `#ffb84d` |

## Shape + spacing conventions in use
- Radius: chat rows / cards **10px**, hero cards **12px**, pills/badges **4px**, small chips **5–6px**.
- Row hover: `background: rgba(255,255,255,.05)`.
- Left-accent bar for highlighted rows: `box-shadow: inset 3px 0 0 <accent>` + faint tinted bg.
- Money rail width: **300px**, `flex-shrink:0`, gold-tinted background `rgba(245,166,35,.02)`.
- Featuring state: `rgba(168,85,247,.08)` bg + `1px solid rgba(168,85,247,.25)` border.

## Animations already defined (reuse rather than add)
- `pulseDot` (1.6s) — the live dot.
- `newGlow` (1.4s) — new Money In card insert pulse.
- `vcPop` — viewer-count bump.

## Notes for the design
- `--green` is intentionally blue. If a mockup shows green anywhere as a status color, it's a bug.
- Numbers/amounts/counts should stay in `--mono` (DM Mono); big display numerals (viewer
  counts) use Boogaloo. Body/UI is DM Sans.
- The right-column control cards mostly predate the token system and use ad-hoc inline
  styles — consolidating them onto these tokens is a core part of the consistency pass.
