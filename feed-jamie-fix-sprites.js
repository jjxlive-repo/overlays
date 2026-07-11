/* Strip fake checkerboard background from ChatGPT sprite PNGs and rebuild
   a clean white sticker border via distance-transform dilation.
   Usage: node fix-jamie.js <dir> <file1> <file2> ... */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const dir = process.argv[2];
const files = process.argv.slice(3);
const BORDER_FULL = 16;   // px of solid white border
const BORDER_FADE = 4;    // px of alpha falloff beyond that

function isLightNeutral(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const v = Math.max(r, g, b), m = Math.min(r, g, b);
  return v > 185 && (v - m) < 38;
}
function isDarkNeutral(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  const v = Math.max(r, g, b), m = Math.min(r, g, b);
  return v < 80 && (v - m) < 40;
}
/* sample the 4 corners: baked background may be light (white/checkerboard) or solid black */
function pickBgTest(d, W, H) {
  let dark = 0;
  for (const [x, y] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) {
    const i = (y * W + x) * 4;
    if (Math.max(d[i], d[i + 1], d[i + 2]) < 80) dark++;
  }
  return dark >= 3 ? isDarkNeutral : isLightNeutral;
}

const results = {};
for (const file of files) {
  const p = path.join(dir, file);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { width: W, height: H, data: d } = png;

  /* 1. flood fill from all edge pixels through background-colored pixels */
  const isBg = pickBgTest(d, W, H);
  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    const idx = y * W + x;
    if (bg[idx]) return;
    if (!isBg(d, idx * 4)) return;
    bg[idx] = 1;
    stack.push(idx);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const idx = stack.pop();
    const x = idx % W, y = (idx / W) | 0;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }
  /* clear background + any existing alpha=0 */
  for (let i = 0; i < W * H; i++) if (bg[i]) d[i * 4 + 3] = 0;

  /* 2. two-pass chamfer distance transform from opaque pixels */
  const INF = 1e7;
  const dist = new Float64Array(W * H).fill(INF);
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 40) dist[i] = 0;
  const D1 = 1, D2 = 1.4142;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x > 0) dist[i] = Math.min(dist[i], dist[i - 1] + D1);
      if (y > 0) {
        dist[i] = Math.min(dist[i], dist[i - W] + D1);
        if (x > 0) dist[i] = Math.min(dist[i], dist[i - W - 1] + D2);
        if (x < W - 1) dist[i] = Math.min(dist[i], dist[i - W + 1] + D2);
      }
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + 1] + D1);
      if (y < H - 1) {
        dist[i] = Math.min(dist[i], dist[i + W] + D1);
        if (x < W - 1) dist[i] = Math.min(dist[i], dist[i + W + 1] + D2);
        if (x > 0) dist[i] = Math.min(dist[i], dist[i + W - 1] + D2);
      }
    }
  }
  /* 3. paint white sticker border where transparent and close to art */
  for (let i = 0; i < W * H; i++) {
    if (d[i * 4 + 3] > 40) continue;
    const ds = dist[i];
    if (ds <= BORDER_FULL + BORDER_FADE) {
      const a = ds <= BORDER_FULL ? 255 : Math.round(255 * (1 - (ds - BORDER_FULL) / BORDER_FADE));
      d[i * 4] = 255; d[i * 4 + 1] = 255; d[i * 4 + 2] = 255; d[i * 4 + 3] = a;
    }
  }
  /* 4. final bounds */
  let minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] > 20) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  fs.writeFileSync(p, PNG.sync.write(png));
  results[file] = { W, H, minX, maxX, minY, maxY };
  console.error('done ' + file);
}
console.log(JSON.stringify(results, null, 1));
