# Splatty Squad — gifter crowd sprite system (extracted 2026-08-01)

Carved out of feed-jamie-overlay.html when Feed Jamie moved to the points/XP
economy. Preserved for reuse: intended next home is the WHEEL REWARD overlay
(top gifters standing on the bricks). Full working history: git history of
overlays/feed-jamie-overlay.html up to commit fe5a09c.

What it does: one mini splatty sprite per unique gifter, sorted by USD total,
top gifter nearest the anchor wearing a crown; platform picks the art pool
(yt/tt); overflow beyond 7 shown as a +N pip; hop/toss burst reactions.

Feed points needed by the code: a roster map key -> {name, platform, usd},
an anchor {x, y(feet line), fanSize, spreadX}, a facing side, and art under
assets/top-splatty/ (already in this repo, see paths below).

## CSS
```css

  /* ── crowd of mini splatties (one per unique gifter) on the floor ── */
  #squad-crowd { position: absolute; inset: 0; z-index: 30; pointer-events: none; }
  .sq-fan {
    position: absolute; object-fit: contain; pointer-events: none;
    transform-origin: 50% 100%;
    animation: sqCheer 2.4s ease-in-out infinite;
  }
  .sq-fan.mirror { scale: -1 1; }
  @keyframes sqCheer {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px) scaleY(1.03); }
  }
  .sq-fan.hop { animation: sqHop .6s cubic-bezier(.34,1.56,.64,1); }
  @keyframes sqHop {
    0% { transform: translateY(0); }
    40% { transform: translateY(-20px) scaleY(1.1); }
    70% { transform: translateY(2px) scaleY(.9); }
    100% { transform: translateY(0); }
  }
  .sq-fan.toss { animation: sqToss .7s cubic-bezier(.34,1.56,.64,1); }
  @keyframes sqToss {
    0% { transform: translateY(0); }
    30% { transform: translateY(6px) scaleY(.85); }
    60% { transform: translateY(-24px) scaleY(1.12); }
    100% { transform: translateY(0); }
  }
  .sq-crown {
    position: absolute; object-fit: contain; pointer-events: none; z-index: 31;
    animation: sqCrownBob 2.6s ease-in-out infinite;
    transition: left .8s cubic-bezier(.34,1.56,.64,1), top .8s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes sqCrownBob {
    0%,100% { transform: translateY(0) rotate(-6deg); }
    50% { transform: translateY(-5px) rotate(4deg); }
  }
  .sq-pip {
    position: absolute; pointer-events: none; z-index: 30;
    background: rgba(42,8,69,.9); border: 2px solid #C084FC;
    border-radius: 999px; color: #FFF6D8;
    font: 700 15px 'DM Sans', sans-serif;
    padding: 2px 9px 3px; line-height: 1.2; white-space: nowrap;
    display: none; align-items: center; justify-content: center;
  }

```

## JS
```js
/* ── crowd ── */
const sqFanEls = [];
let sqCrownEl = null, sqPipEl = null;
const SQ_FAN_ART = {
  yt: ['splatty-fan-yt-01', 'splatty-fan-yt-02', 'splatty-fan-yt-03', 'splatty-fan-yt-04', 'splatty-fan-yt-05', 'splatty-fan-yt-06']
    .map(f => `assets/top-splatty/character/${f}.png`),
  tt: ['splatty-fan-tt-01', 'splatty-fan-tt-02', 'splatty-fan-tt-03', 'splatty-fan-tt-04', 'splatty-fan-tt-05', 'splatty-fan-tt-06']
    .map(f => `assets/top-splatty/character/${f}.png`),
};
const SQ_CROWN_ART = 'assets/top-splatty/ui/top-splatty-crown.png';
const SQ_ICED_CROWN_ART = 'assets/top-splatty/ui/crown-iced.png';

function sqBuildCrowd() {
  const box = $('squad-crowd');
  box.innerHTML = '';
  sqFanEls.length = 0;
  for (let i = 0; i < 8; i++) {
    const img = document.createElement('img');
    img.className = 'sq-fan';
    img.style.display = 'none';
    img.style.animationDelay = (i * 0.32) + 's';
    box.appendChild(img);
    sqFanEls.push(img);
  }
  sqPipEl = document.createElement('div');
  sqPipEl.className = 'sq-pip';
  box.appendChild(sqPipEl);
  sqCrownEl = document.createElement('img');
  sqCrownEl.className = 'sq-crown';
  sqCrownEl.src = SQ_CROWN_ART;
  sqCrownEl.style.display = 'none';
  box.appendChild(sqCrownEl);
}

/* fans sorted by total (top treater closest to Jamie, wearing the crown) */
function sqUpdateCrowd() {
  if (!sqFanEls.length) return;
  const rows = Object.entries(sqState.gifters)
    .map(([k, g]) => ({ key: k, ...g }))
    .sort((a, b) => b.usd - a.usd);
  sqState.topKey = rows.length ? rows[0].key : null;
  const show = SQ.enabled ? Math.min(sqFanEls.length - 1, rows.length) : 0;
  const jamieOnLeft = CFG.jamie.side !== 'right';
  const size = SQ.crowd.fanSize;
  const crowdBaseY = SQ.crowd.y || CFG.floor.y;   // feet line: canvas placement or the floor
  const jitter = [0, -6, 4, -3, 6, -5, 3, -4];
  let crownTarget = null;
  sqFanEls.forEach((img, i) => {
    if (i >= show) { img.style.display = 'none'; return; }
    const row = rows[i];
    const w = size * (1 - i * 0.055);
    /* rank 0 stands closest to Jamie; the line walks away from him */
    const step = (w * 0.62) + SQ.crowd.spreadX * 0.3;
    const x = jamieOnLeft ? SQ.crowd.x + i * step : SQ.crowd.x - i * step;
    const pool = SQ_FAN_ART[row.platform === 'youtube' ? 'yt' : 'tt'];
    const art = pool[i % pool.length];
    if (img.dataset.src !== art) { img.src = art; img.dataset.src = art; }
    img.classList.toggle('mirror', jamieOnLeft);   // face toward Jamie
    img.style.width = w + 'px'; img.style.height = w + 'px';
    img.style.left = (x - w / 2) + 'px';
    img.style.top = (crowdBaseY - w + 4 + jitter[i]) + 'px';
    img.style.display = '';
    img.dataset.gifter = row.key;
    if (i === 0) crownTarget = { x, w, top: crowdBaseY - w + 4 + jitter[0] };
  });
  const extra = rows.length - show;
  if (extra > 0 && SQ.enabled) {
    sqPipEl.textContent = '+' + extra;
    sqPipEl.style.display = 'flex';
    const lastX = jamieOnLeft ? SQ.crowd.x + show * (size * 0.62 + SQ.crowd.spreadX * 0.3) : SQ.crowd.x - show * (size * 0.62 + SQ.crowd.spreadX * 0.3);
    sqPipEl.style.left = (lastX - 22) + 'px';
    sqPipEl.style.top = (crowdBaseY - 26) + 'px';
  } else sqPipEl.style.display = 'none';
  if (crownTarget) {
    const cw = crownTarget.w * 0.62, ch = cw * 0.72;
    sqCrownEl.style.width = cw + 'px'; sqCrownEl.style.height = ch + 'px';
    sqCrownEl.style.left = (crownTarget.x - cw / 2) + 'px';
    sqCrownEl.style.top = (crownTarget.top - ch * 0.72) + 'px';
    sqCrownEl.style.display = '';
  } else sqCrownEl.style.display = 'none';
}
function sqFansReact(cls, onlyKey) {
  sqFanEls.forEach((img) => {
    if (img.style.display === 'none') return;
    if (onlyKey && img.dataset.gifter !== onlyKey) return;
    img.classList.remove('hop', 'toss'); void img.offsetWidth;
    img.classList.add(cls);
    setTimeout(() => img.classList.remove(cls), 750);
  });
}

```

## Wiring notes
- DOM: one absolutely-positioned full-stage container (was #squad-crowd, z 30).
- Call sqBuildCrowd() once, sqUpdateCrowd() on roster change/layout,
  sqFansReact('hop', key) on a gift, sqFansReact('toss') when a prize launches.
- Crown swap: SQ_ICED_CROWN_ART was shown at care tier >= 6 (cosmetic only).
- The roster persisted in localStorage with a 6h staleness cutoff:
  {gifters, ts} — see sqPersist()/boot load in the same git history.
