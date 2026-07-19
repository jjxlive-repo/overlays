(function () {
  "use strict";

  const CFG = window.CROWD_GLASS_CONFIG;

  // ---------------------------------------------------------------------
  // Central state
  // ---------------------------------------------------------------------
  const state = {
    integrity: 100,
    maxIntegrity: 100,

    cracks: [],
    impactLabels: [],
    recentHitters: [],

    bulletproof: false,
    bulletproofEndsAt: null,

    shatterActive: false,
    repairActive: false,

    sweep: null, // { startedAt, duration, kind: 'repair' | 'full' }

    lastViewerCounts: {
      tiktok: null,
      youtube: null,
      total: null
    },

    lastEventLabel: "none",
    ws: null,
    wsStatus: "disabled",

    ably: null,
    ablyChannel: null,
    ablyStatus: "disabled",
    enabled: false,
    attached: false, // true only while the shared Ably channel is attached (see connectAbly)
    autoMode: CFG.autoMode,
    stageScale: 0.75,
    crackScale: CFG.crackScale,
    shatterCrackThreshold: CFG.shatterCrackThreshold,

    debug: false,

    _crackId: 0,
    _tagId: 0
  };

  // ---------------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------------
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("cracks-canvas");
  const ctx = canvas.getContext("2d");
  const tagsLayer = document.getElementById("impact-tags-layer");
  const viewerCountValue = document.getElementById("viewer-count-value");
  const integrityValue = document.getElementById("integrity-value");
  const integrityFill = document.getElementById("integrity-fill");
  const hitsRemainingText = document.getElementById("hits-remaining-text");
  const recentHittersList = document.getElementById("recent-hitters-list");
  const bulletproofBadge = document.getElementById("bulletproof-badge");
  const bulletproofTimer = document.getElementById("bulletproof-timer");
  const shatterOverlay = document.getElementById("shatter-overlay");
  const debugPanel = document.getElementById("debug-panel");
  const dbgIntegrity = document.getElementById("dbg-integrity");
  const dbgCracks = document.getElementById("dbg-cracks");
  const dbgBulletproof = document.getElementById("dbg-bulletproof");
  const dbgLastEvent = document.getElementById("dbg-last-event");
  const dbgWsStatus = document.getElementById("dbg-ws-status");
  const dbgAblyStatus = document.getElementById("dbg-ably-status");
  stage.style.display = "none";
  stage.style.transform = `scale(${state.stageScale})`;

  // ---------------------------------------------------------------------
  // Utility helpers
  // ---------------------------------------------------------------------
  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function scaledDamageFromDelta(delta) {
    return Math.min(CFG.burstDamageCap, Math.sqrt(delta) * 1.2);
  }

  function crackCountFromDelta(delta) {
    let count;
    if (delta <= 1) count = 1;
    else if (delta <= 10) count = 1;
    else if (delta <= 50) count = 2;
    else if (delta <= 150) count = 3;
    else if (delta <= 400) count = 4;
    else count = 5;
    return Math.min(CFG.burstMaxCracks, count);
  }

  function labelForDelta(delta, platform) {
    const platformName = platform === "youtube" ? "YouTube" : platform === "tiktok" ? "TikTok" : "";
    if (delta <= 1) return `Mystery ${platformName} viewer cracked it`.trim();
    if (delta <= 50) return `+${delta} viewers cracked it`;
    if (delta <= 150) return `+${delta} viewer burst`;
    return `+${delta} joined the hit`;
  }

  // ---------------------------------------------------------------------
  // Placement: weighted toward corners/sides, away from center + bottom UI
  // ---------------------------------------------------------------------
  function pickPlacement() {
    const p = CFG.placement;
    const critical = state.integrity <= p.criticalIntegrityThreshold;
    const zones = [
      { x1: p.minX, y1: p.minY, x2: 400, y2: 600 },       // top-left
      { x1: 680, y1: p.minY, x2: p.maxX, y2: 600 },        // top-right
      { x1: p.minX, y1: 650, x2: 380, y2: 1150 },          // middle-left
      { x1: 700, y1: 650, x2: p.maxX, y2: 1150 },          // middle-right
      { x1: p.minX, y1: 1200, x2: 420, y2: p.maxY },       // lower-left
      { x1: 660, y1: 1200, x2: p.maxX, y2: p.maxY }        // lower-right
    ];

    let zone = choice(zones);
    let x, y, tries = 0;
    do {
      x = rand(zone.x1, zone.x2);
      y = rand(zone.y1, zone.y2);
      tries++;
    } while (!critical && tries < 6 && inCenterBox(x, y));

    y = Math.min(y, p.avoidBelowY - 20);
    return { x, y };
  }

  function inCenterBox(x, y) {
    const c = CFG.placement.centerBox;
    return x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2;
  }

  // ---------------------------------------------------------------------
  // Crack geometry: small hand-drawn-looking jagged polylines
  // ---------------------------------------------------------------------
  function buildJaggedLine(x0, y0, angle, length, segments) {
    const pts = [{ x: x0, y: y0 }];
    let cx = x0, cy = y0;
    const segLen = length / segments;
    let curAngle = angle;
    for (let i = 0; i < segments; i++) {
      curAngle += rand(-0.35, 0.35);
      cx += Math.cos(curAngle) * segLen;
      cy += Math.sin(curAngle) * segLen;
      pts.push({ x: cx, y: cy });
    }
    return pts;
  }

  function pathLength(pts) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    }
    return total;
  }

  function pointAtT(pts, t) {
    const idx = clamp(Math.floor(t * (pts.length - 1)), 0, pts.length - 2);
    const localT = (t * (pts.length - 1)) - idx;
    return {
      x: lerp(pts[idx].x, pts[idx + 1].x, localT),
      y: lerp(pts[idx].y, pts[idx + 1].y, localT)
    };
  }

  function generateCrackShape(severity) {
    const size = lerp(40, 90, severity) * (state.crackScale || 1);
    const branchCount = Math.round(lerp(3, 7, severity));
    const angle0 = rand(0, Math.PI * 2);
    const mainLength = size * rand(0.55, 0.9);
    const main = buildJaggedLine(0, 0, angle0, mainLength, 4);

    const branches = [main];
    for (let i = 0; i < branchCount - 1; i++) {
      const t = rand(0.15, 0.9);
      const origin = pointAtT(main, t);
      const branchAngle = angle0 + rand(-1, 1) * (Math.PI / 3);
      const length = size * rand(0.25, 0.55);
      const segs = Math.max(2, Math.round(rand(2, 3)));
      branches.push(buildJaggedLine(origin.x, origin.y, branchAngle, length, segs));
    }
    return { size, branches, branchLengths: branches.map(pathLength) };
  }

  // ---------------------------------------------------------------------
  // Crack lifecycle object
  // ---------------------------------------------------------------------
  function createSmallCrack({ x, y, severity }) {
    severity = clamp(severity, 0, 1);
    const shape = generateCrackShape(severity);
    const crack = {
      id: ++state._crackId,
      x, y,
      shape,
      severity,
      createdAt: performance.now(),
      sealing: false,
      sealStart: null,
      swept: false
    };
    state.cracks.push(crack);
    if (state.cracks.length > CFG.maxCracksOnScreen) {
      state.cracks.splice(0, state.cracks.length - CFG.maxCracksOnScreen);
    }
    return crack;
  }

  function createBurstCracks({ delta, platform }) {
    const count = crackCountFromDelta(delta);
    const severity = clamp(0.25 + Math.log10(delta + 1) * 0.22, 0.2, 1);
    const created = [];
    for (let i = 0; i < count; i++) {
      const pos = pickPlacement();
      created.push(createSmallCrack({ x: pos.x, y: pos.y, severity }));
    }
    return created;
  }

  // Deflect star used during bulletproof mode instead of a crack.
  function createDeflectStar(x, y) {
    const star = {
      id: ++state._crackId,
      x, y,
      isStar: true,
      points: Math.round(rand(5, 8)),
      radius: rand(18, 30),
      createdAt: performance.now()
    };
    state.cracks.push(star);
    return star;
  }

  // ---------------------------------------------------------------------
  // Canvas rendering
  // ---------------------------------------------------------------------
  const GROW_MAIN_MS = 220;    // main line expands 80-300ms window (duration ~220ms)
  const GROW_MAIN_DELAY = 80;
  const GROW_BRANCH_MS = 250;  // branches extend 300-550ms window
  const GROW_BRANCH_DELAY = 300;
  const IMPACT_DOT_MS = 150;
  const SEAL_FADE_MS = 420;
  const STAR_LIFE_MS = 550;

  function partialStroke(ctx, pts, fraction, offsetX, offsetY) {
    if (fraction <= 0) return;
    const total = pathLength(pts);
    const target = total * clamp(fraction, 0, 1);
    let travelled = 0;
    ctx.beginPath();
    ctx.moveTo(pts[0].x + offsetX, pts[0].y + offsetY);
    for (let i = 1; i < pts.length; i++) {
      const segLen = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (travelled + segLen <= target) {
        ctx.lineTo(pts[i].x + offsetX, pts[i].y + offsetY);
        travelled += segLen;
      } else {
        const remain = target - travelled;
        const t = segLen === 0 ? 0 : remain / segLen;
        ctx.lineTo(
          lerp(pts[i - 1].x, pts[i].x, t) + offsetX,
          lerp(pts[i - 1].y, pts[i].y, t) + offsetY
        );
        break;
      }
    }
    ctx.stroke();
  }

  function drawCrack(crack, now) {
    const age = now - crack.createdAt;

    let fadeOutAlpha = 1;
    if (crack.sealing) {
      const sealAge = now - crack.sealStart;
      fadeOutAlpha = clamp(1 - sealAge / SEAL_FADE_MS, 0, 1);
      if (sealAge > SEAL_FADE_MS) return false; // remove
    }

    const mainFraction = clamp((age - GROW_MAIN_DELAY) / GROW_MAIN_MS, 0, 1);
    const branchFraction = clamp((age - GROW_BRANCH_DELAY) / GROW_BRANCH_MS, 0, 1);
    const dotAlpha = age < IMPACT_DOT_MS ? (1 - age / IMPACT_DOT_MS) : 0;

    ctx.save();
    ctx.translate(crack.x, crack.y);

    // impact dot flash
    if (dotAlpha > 0) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.9 * dotAlpha * fadeOutAlpha})`;
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    crack.shape.branches.forEach((pts, i) => {
      const fraction = i === 0 ? mainFraction : branchFraction;
      if (fraction <= 0) return;

      // shadow pass (offset 1.5px)
      ctx.lineWidth = i === 0 ? 3.2 : 2.4;
      ctx.strokeStyle = `rgba(0,0,0,${0.28 * fadeOutAlpha})`;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      partialStroke(ctx, pts, fraction, 1.5, 1.5);

      // main white line
      ctx.lineWidth = i === 0 ? 2.6 : 1.9;
      ctx.strokeStyle = `rgba(255,255,255,${0.82 * fadeOutAlpha})`;
      partialStroke(ctx, pts, fraction, 0, 0);

      // bright highlight core
      ctx.lineWidth = i === 0 ? 1 : 0.8;
      ctx.strokeStyle = `rgba(255,255,255,${0.95 * fadeOutAlpha})`;
      partialStroke(ctx, pts, fraction, 0, 0);
    });

    ctx.restore();
    return true;
  }

  function drawDeflectStar(star, now) {
    const age = now - star.createdAt;
    const t = clamp(age / STAR_LIFE_MS, 0, 1);
    if (t >= 1) return false;

    const alpha = 1 - t;
    const r = star.radius * (0.4 + 0.6 * t);
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(t * 0.6);
    ctx.beginPath();
    for (let i = 0; i < star.points * 2; i++) {
      const rad = i % 2 === 0 ? r : r * 0.42;
      const a = (Math.PI / star.points) * i;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(0,0,0,${0.25 * alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = `rgba(180,225,255,${0.9 * alpha})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  function drawSweep(now) {
    if (!state.sweep) return;
    const { startedAt, duration } = state.sweep;
    const t = clamp((now - startedAt) / duration, 0, 1);
    if (t >= 1) {
      state.sweep = null;
      return;
    }
    const bandX = lerp(-300, CFG.canvasWidth + 300, t);
    const grad = ctx.createLinearGradient(bandX - 140, 0, bandX + 140, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.canvasWidth, CFG.canvasHeight);
    ctx.restore();

    // sweep clears cracks it passes
    state.cracks.forEach((c) => {
      if (!c.swept && c.x < bandX + 140) {
        c.swept = true;
        if (!c.sealing) { c.sealing = true; c.sealStart = now; }
      }
    });
  }

  function drawShatterBurst(now) {
    if (!state.shatterBurst) return;
    const { startedAt, duration, lines } = state.shatterBurst;
    const t = clamp((now - startedAt) / duration, 0, 1);
    if (t >= 1) { state.shatterBurst = null; return; }
    const alpha = 1 - t;
    ctx.save();
    lines.forEach((pts) => {
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(0,0,0,${0.25 * alpha})`;
      partialStroke(ctx, pts, 1, 1.5, 1.5);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * alpha})`;
      partialStroke(ctx, pts, 1, 0, 0);
    });
    ctx.restore();
  }

  function render() {
    const now = performance.now();
    ctx.clearRect(0, 0, CFG.canvasWidth, CFG.canvasHeight);

    state.cracks = state.cracks.filter((c) => {
      if (c.isStar) return drawDeflectStar(c, now);
      return drawCrack(c, now);
    });

    drawSweep(now);
    drawShatterBurst(now);

    updateDebugPanel();
    requestAnimationFrame(render);
  }

  // ---------------------------------------------------------------------
  // Impact labels (small rounded tags, e.g. "@jessica23 cracked it")
  // ---------------------------------------------------------------------
  function showImpactTag({ text, x, y, kind }) {
    const el = document.createElement("div");
    el.className = "impact-tag" + (kind ? ` ${kind}` : "");
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    tagsLayer.appendChild(el);

    const id = ++state._tagId;
    state.impactLabels.push({ id, el });
    if (state.impactLabels.length > CFG.maxImpactLabels) {
      const old = state.impactLabels.shift();
      old.el.remove();
    }
    setTimeout(() => {
      el.remove();
      state.impactLabels = state.impactLabels.filter((l) => l.id !== id);
    }, 2100);
  }

  function updateRecentHitters(username) {
    if (!username) return;
    state.recentHitters = state.recentHitters.filter((u) => u !== username);
    state.recentHitters.unshift(username);
    state.recentHitters = state.recentHitters.slice(0, CFG.maxRecentHitters);

    recentHittersList.innerHTML = "";
    state.recentHitters.forEach((u) => {
      const row = document.createElement("div");
      row.className = "recent-hitter";
      row.textContent = `@${u}`;
      recentHittersList.appendChild(row);
    });
  }

  // ---------------------------------------------------------------------
  // Integrity / damage
  // ---------------------------------------------------------------------
  function activeCrackCount() {
    return state.cracks.filter((c) => !c.isStar && !c.sealing).length;
  }

  function applyDamage(amount) {
    if (state.shatterActive) return;
    state.integrity = clamp(state.integrity - amount, 0, state.maxIntegrity);
    updateIntegrityUI();
    if (state.integrity <= CFG.shatterAtIntegrity || activeCrackCount() >= state.shatterCrackThreshold) {
      triggerShatter();
    }
  }

  function updateIntegrityUI() {
    const pct = Math.round(state.integrity);
    integrityValue.textContent = pct;
    integrityFill.style.width = `${pct}%`;
    if (pct <= 25) integrityFill.style.background = "linear-gradient(90deg, #ff8a8a, #ff5b5b)";
    else if (pct <= 55) integrityFill.style.background = "linear-gradient(90deg, #ffe08a, #ffd15b)";
    else integrityFill.style.background = "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))";

    const avgDamage = (CFG.singleJoinDamageMin + CFG.singleJoinDamageMax) / 2;
    const hitsLeft = Math.max(1, Math.round(state.integrity / avgDamage / 8)); // rough, chunky estimate
    hitsRemainingText.textContent = `${hitsLeft} more hits shatters it`;
  }

  // ---------------------------------------------------------------------
  // Repair effects
  // ---------------------------------------------------------------------
  function repairGlass(amount, effect, source) {
    state.integrity = clamp(state.integrity + amount, 0, state.maxIntegrity);
    updateIntegrityUI();
    switch (effect) {
      case "seal_one_crack": sealOneCrack(); break;
      case "seal_recent_cracks": sealRecentCracks(3); break;
      case "repair_sweep": triggerRepairSweep(); break;
      case "major_repair": sealRecentCracks(6); break;
      case "full_wipe": triggerFullWipe(); break;
      default: break;
    }
  }

  function sealOneCrack() {
    const now = performance.now();
    const candidate = [...state.cracks].reverse().find((c) => !c.sealing && !c.isStar);
    if (candidate) { candidate.sealing = true; candidate.sealStart = now; }
  }

  function sealRecentCracks(count) {
    const now = performance.now();
    const targets = [...state.cracks].reverse().filter((c) => !c.sealing && !c.isStar).slice(0, count);
    targets.forEach((c) => { c.sealing = true; c.sealStart = now; });
  }

  function triggerRepairSweep() {
    state.sweep = { startedAt: performance.now(), duration: 650, kind: "repair" };
    state.cracks.forEach((c) => { c.swept = false; });
  }

  function triggerFullWipe() {
    state.sweep = { startedAt: performance.now(), duration: 550, kind: "full" };
    const now = performance.now();
    state.cracks.forEach((c) => {
      if (!c.isStar && !c.sealing) { c.sealing = true; c.sealStart = now; }
    });
  }

  // ---------------------------------------------------------------------
  // Bulletproof mode
  // ---------------------------------------------------------------------
  let bulletproofTickHandle = null;

  function activateBulletproof(durationMs) {
    state.bulletproof = true;
    state.bulletproofEndsAt = performance.now() + durationMs;
    state.integrity = state.maxIntegrity;
    updateIntegrityUI();

    const now = performance.now();
    state.cracks.forEach((c) => { if (!c.isStar) { c.sealing = true; c.sealStart = now; } });

    bulletproofBadge.classList.remove("hidden");
    playSound("bulletproof");

    if (bulletproofTickHandle) clearInterval(bulletproofTickHandle);
    bulletproofTickHandle = setInterval(() => {
      const remainMs = state.bulletproofEndsAt - performance.now();
      if (remainMs <= 0) {
        state.bulletproof = false;
        bulletproofBadge.classList.add("hidden");
        clearInterval(bulletproofTickHandle);
        bulletproofTickHandle = null;
        return;
      }
      const secs = Math.ceil(remainMs / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, "0");
      const ss = String(secs % 60).padStart(2, "0");
      bulletproofTimer.textContent = `${mm}:${ss}`;
    }, 250);
  }

  function handleBulletproofImpact(source) {
    const pos = pickPlacement();
    createDeflectStar(pos.x, pos.y);
    playSound("deflect");
    const text = source && source.username ? `@${source.username} deflected` : "viewer hit deflected";
    showImpactTag({ text, x: pos.x, y: pos.y });
  }

  // ---------------------------------------------------------------------
  // Shatter + reset
  // ---------------------------------------------------------------------
  function triggerShatter() {
    if (state.shatterActive) return;
    state.shatterActive = true;
    playSound("shatter");
    triggerScreenShake(1);

    const lines = [];
    const cx = CFG.canvasWidth / 2, cy = CFG.canvasHeight * 0.42;
    const burstLines = Math.round(rand(6, 9));
    for (let i = 0; i < burstLines; i++) {
      const angle = (Math.PI * 2 * i) / burstLines + rand(-0.2, 0.2);
      lines.push(buildJaggedLine(cx, cy, angle, rand(160, 320), 5));
    }
    state.shatterBurst = { startedAt: performance.now(), duration: 700, lines };

    shatterOverlay.classList.remove("hidden");
    setTimeout(() => shatterOverlay.classList.add("hidden"), 1500);

    setTimeout(resetGlass, CFG.autoResetAfterShatterMs);
  }

  function resetGlass() {
    state.cracks = [];
    state.impactLabels.forEach((l) => l.el.remove());
    state.impactLabels = [];
    state.integrity = state.maxIntegrity;
    state.shatterActive = false;
    state.shatterBurst = null;
    state.sweep = null;
    // A shatter can be forced while bulletproof is active, so resetGlass must also
    // tear that down — otherwise the badge/countdown keeps running after the glass
    // has already visually reset.
    state.bulletproof = false;
    state.bulletproofEndsAt = null;
    if (bulletproofTickHandle) { clearInterval(bulletproofTickHandle); bulletproofTickHandle = null; }
    bulletproofBadge.classList.add("hidden");
    updateIntegrityUI();
  }

  // ---------------------------------------------------------------------
  // Screen shake (subtle, non-intrusive)
  // ---------------------------------------------------------------------
  let shakeHandle = null;
  function triggerScreenShake(intensity) {
    const amp = 6 * clamp(intensity, 0, 1);
    const start = performance.now();
    const duration = 260;
    if (shakeHandle) cancelAnimationFrame(shakeHandle);
    function step() {
      const t = (performance.now() - start) / duration;
      if (t >= 1) { stage.style.transform = stage.dataset.baseTransform || ""; return; }
      const dx = (Math.random() * 2 - 1) * amp * (1 - t);
      const dy = (Math.random() * 2 - 1) * amp * (1 - t);
      stage.style.transform = `${stage.dataset.baseTransform || ""} translate(${dx}px, ${dy}px)`;
      shakeHandle = requestAnimationFrame(step);
    }
    step();
  }

  // ---------------------------------------------------------------------
  // Sound (synthesized via WebAudio so no external asset files needed)
  // ---------------------------------------------------------------------
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    return audioCtx;
  }

  function tone(ac, { freq, start, duration, type = "sine", gainStart = 0.3, gainEnd = 0.0001 }) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(gainStart, start);
    gain.gain.exponentialRampToValueAtTime(gainEnd, start + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function noiseBurst(ac, { start, duration, gainStart = 0.2 }) {
    const bufferSize = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(gainStart, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(gain);
    gain.connect(ac.destination);
    src.start(start);
  }

  function playSound(name) {
    if (!CFG.soundEnabled) return;
    const vol = clamp(CFG.soundVolume, 0, 1);
    try {
      const ac = getAudioCtx();
      if (ac.state === "suspended") ac.resume();
      const now = ac.currentTime;

      switch (name) {
        case "join":
          tone(ac, { freq: rand(1400, 1800), start: now, duration: 0.09, type: "triangle", gainStart: 0.5 * vol });
          break;
        case "burst":
          tone(ac, { freq: 1500, start: now, duration: 0.08, type: "triangle", gainStart: 0.45 * vol });
          tone(ac, { freq: 1100, start: now + 0.05, duration: 0.09, type: "triangle", gainStart: 0.35 * vol });
          break;
        case "repair":
          tone(ac, { freq: 700, start: now, duration: 0.18, type: "sine", gainStart: 0.3 * vol });
          tone(ac, { freq: 1400, start: now + 0.08, duration: 0.22, type: "sine", gainStart: 0.25 * vol });
          break;
        case "bulletproof":
          tone(ac, { freq: 2000, start: now, duration: 0.05, type: "square", gainStart: 0.25 * vol });
          tone(ac, { freq: 2600, start: now + 0.05, duration: 0.06, type: "square", gainStart: 0.2 * vol });
          break;
        case "deflect":
          tone(ac, { freq: 2200, start: now, duration: 0.05, type: "square", gainStart: 0.3 * vol });
          break;
        case "shatter":
          noiseBurst(ac, { start: now, duration: 0.35, gainStart: 0.4 * vol });
          tone(ac, { freq: 400, start: now, duration: 0.3, type: "sawtooth", gainStart: 0.25 * vol });
          break;
        default:
          break;
      }
    } catch (e) {
      // audio can fail silently (autoplay policy) without breaking the overlay
    }
  }

  // ---------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------
  function applyViewerImpact({ platform, username, delta }) {
    if (username) {
      updateRecentHitters(username);
    }
  }

  function handleViewerJoin(event) {
    if (!state.enabled) return;
    state.lastEventLabel = `viewer_join(${event.username || "anon"})`;
    const damage = rand(CFG.singleJoinDamageMin, CFG.singleJoinDamageMax) *
      (state.bulletproof ? CFG.bulletproofDamageMultiplier : 1);

    if (state.bulletproof) {
      handleBulletproofImpact({ username: event.username });
      applyDamage(damage);
      return;
    }

    const pos = pickPlacement();
    const severity = rand(0.15, 0.45);
    createSmallCrack({ x: pos.x, y: pos.y, severity });
    playSound("join");

    const text = event.username ? `@${event.username} cracked it` : "a viewer cracked it";
    showImpactTag({ text, x: pos.x, y: pos.y });

    if (event.username) updateRecentHitters(event.username);
    applyDamage(damage);
  }

  function handleViewerDelta(event) {
    const delta = Math.max(1, event.delta || 1);
    state.lastEventLabel = `viewer_delta(+${delta}, ${event.platform})`;
    if (event.platform && event.currentViewers != null) {
      state.lastViewerCounts[event.platform] = event.currentViewers;
      updateViewerCountBadge(event.currentViewers);
    }

    const baseDamage = scaledDamageFromDelta(delta);
    const damage = baseDamage * (state.bulletproof ? CFG.bulletproofDamageMultiplier : 1);

    if (state.bulletproof) {
      const count = crackCountFromDelta(delta);
      for (let i = 0; i < count; i++) {
        const pos = pickPlacement();
        createDeflectStar(pos.x, pos.y);
      }
      playSound("deflect");
      const pos = pickPlacement();
      showImpactTag({ text: `${labelForDelta(delta, event.platform)} — deflected`, x: pos.x, y: pos.y, kind: "burst" });
      applyDamage(damage);
      return;
    }

    createBurstCracks({ delta, platform: event.platform });
    playSound(delta > 10 ? "burst" : "join");

    const pos = pickPlacement();
    showImpactTag({ text: labelForDelta(delta, event.platform), x: pos.x, y: pos.y, kind: "burst" });

    applyDamage(damage);
  }

  function resolveGiftTier(coins) {
    const tiers = CFG.giftRepairTiers;
    let matched = tiers[0];
    for (const tier of tiers) {
      if (coins >= tier.minCoins) matched = tier;
    }
    return matched;
  }

  function handleGift(event) {
    if (!state.enabled) return;
    const coins = event.coins || 0;
    const tier = resolveGiftTier(coins);
    state.lastEventLabel = `gift(${event.username || "anon"}, ${coins}c, ${tier.name})`;

    const pos = pickPlacement();
    playSound(tier.effect === "bulletproof_mode" ? "bulletproof" : "repair");

    if (tier.effect === "bulletproof_mode") {
      const text = event.username ? `@${event.username} activated bulletproof` : "bulletproof activated";
      showImpactTag({ text, x: pos.x, y: pos.y, kind: "repair" });
      activateBulletproof(CFG.bulletproofDurationMs);
      if (event.username) updateRecentHitters(event.username);
      return;
    }

    repairGlass(tier.repairAmount, tier.effect, event.username);

    const repairCopy = {
      seal_one_crack: "sealed a crack",
      seal_recent_cracks: "patched the glass",
      repair_sweep: "swept a repair",
      major_repair: "repaired it",
      full_wipe: "fully wiped it"
    };
    const verb = repairCopy[tier.effect] || "repaired it";
    const text = event.username ? `@${event.username} ${verb}` : `A gift ${verb}`;
    showImpactTag({ text, x: pos.x, y: pos.y, kind: "repair" });

    if (event.username) updateRecentHitters(event.username);
  }

  function updateViewerCountBadge(count) {
    viewerCountValue.textContent = count;
  }

  // ---------------------------------------------------------------------
  // WebSocket intake
  // ---------------------------------------------------------------------
  // Most streamers never run the optional local WS server (Ably is the documented
  // primary path per the README), so a fixed 2s retry forever is constant background
  // noise for the life of the browser source. Back off exponentially, capped at 30s,
  // and reset to the base interval as soon as a connection actually succeeds.
  let _wsReconnectAttempts = 0;
  function _wsNextDelay() {
    const delay = Math.min(CFG.websocketReconnectMs * Math.pow(2, _wsReconnectAttempts), 30000);
    _wsReconnectAttempts++;
    return delay;
  }

  function connectWebSocket() {
    if (!CFG.websocketEnabled) { state.wsStatus = "disabled"; return; }
    try {
      const ws = new WebSocket(CFG.websocketUrl);
      state.ws = ws;
      state.wsStatus = "connecting";

      ws.onopen = () => { state.wsStatus = "connected"; _wsReconnectAttempts = 0; };
      ws.onclose = () => {
        state.wsStatus = "disconnected";
        setTimeout(connectWebSocket, _wsNextDelay());
      };
      ws.onerror = () => { state.wsStatus = "error"; };
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          handleIncomingEvent(data);
        } catch (e) {
          // ignore malformed payloads
        }
      };
    } catch (e) {
      state.wsStatus = "error";
      setTimeout(connectWebSocket, _wsNextDelay());
    }
  }

  function handleIncomingEvent(event) {
    if (!event || !event.type) return;
    switch (event.type) {
      case "viewer_join":
        handleViewerJoin(event);
        break;
      case "viewer_delta":
        handleViewerDelta(event);
        break;
      case "gift":
        handleGift(event);
        break;
      case "command":
        handleCommand(event.command);
        break;
      default:
        break;
    }
  }

  // Manual dock buttons and local keyboard test keys are meant to produce visible
  // feedback on demand, regardless of whether a "show" command has ever been received
  // from stream-dock (which itself defaults the glass to hidden). Without this, pressing
  // Break/Repair/J/G/B/M against a never-enabled overlay silently no-ops.
  function ensureVisible() {
    if (!state.enabled) {
      state.enabled = true;
      stage.style.display = "";
    }
  }

  function handleCommand(command) {
    state.lastEventLabel = `command(${command})`;
    switch (command) {
      case "enable":
      case "show":
        state.enabled = true;
        stage.style.display = "";
        break;
      case "disable":
      case "hide":
        state.enabled = false;
        stage.style.display = "none";
        resetGlass();
        break;
      case "reset_glass": resetGlass(); break;
      case "force_shatter": ensureVisible(); triggerShatter(); break;
      case "activate_bulletproof": ensureVisible(); activateBulletproof(CFG.bulletproofDurationMs); break;
      // Manual dock controls — bypass autoMode, always apply immediately.
      case "break_small": ensureVisible(); handleViewerJoin({ type: "viewer_join", platform: "manual", username: null }); break;
      case "break_big": ensureVisible(); simulateDelta(50, "manual"); break;
      case "repair_small": ensureVisible(); handleGift({ type: "gift", platform: "manual", username: null, giftName: "Manual Repair", coins: 75 }); break;
      case "repair_big": ensureVisible(); handleGift({ type: "gift", platform: "manual", username: null, giftName: "Manual Repair", coins: 6000 }); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------------
  // Ably intake — joins stream-dock.html's existing pub/sub feed so the glass
  // reacts to real TikTok/YouTube events without running a local WS server.
  // ---------------------------------------------------------------------
  function platformFromShortCode(p) {
    if (p === "tt") return "tiktok";
    if (p === "yt") return "youtube";
    return undefined;
  }

  // stream-dock can publish the same real gift twice — once from Social Stream Ninja's
  // chat-message parsing ("gift-alert", always active) and once from the optional Tikfinity
  // WebSocket ("milk-event" type "tiktok_gift", only when Tikfinity is connected). Dedup by
  // a short-lived signature so a single real gift never repairs the glass twice.
  const _recentGiftSignatures = new Map();
  function isDuplicateGift(signature) {
    const now = performance.now();
    for (const [key, ts] of _recentGiftSignatures) {
      if (now - ts > 4000) _recentGiftSignatures.delete(key);
    }
    if (_recentGiftSignatures.has(signature)) return true;
    _recentGiftSignatures.set(signature, now);
    return false;
  }

  function handleMilkEvent(payload) {
    if (!state.enabled) return;
    if (!payload || !payload.type || !state.autoMode) return;
    if (state.debug) console.log("[CrowdGlass] milk-event", payload);
    switch (payload.type) {
      case "join":
        handleViewerJoin({
          type: "viewer_join",
          platform: platformFromShortCode(payload.platform),
          username: payload.username || null
        });
        break;
      case "tiktok_gift": {
        const username = payload.username || payload.gifterKey || null;
        const coins = payload.coins || 0;
        if (isDuplicateGift(`tiktok:${username || "anon"}:${coins}`)) break;
        handleGift({ type: "gift", platform: "tiktok", username, giftName: payload.giftName, coins });
        break;
      }
      case "yt_superchat": {
        const username = payload.gifterKey || null;
        const coins = Math.round((payload.dollars || 0) * 100); // matches stream-dock's own $0.01/coin fallback
        if (isDuplicateGift(`youtube:${username || "anon"}:${coins}`)) break;
        handleGift({ type: "gift", platform: "youtube", username, giftName: payload.isJewels ? "Jewels" : "Superchat", coins });
        break;
      }
      default:
        break; // like/comment/heart_me/yt_sub etc. are out of scope for the crack mechanic
    }
  }

  // Real gifts (TikTok coins, YouTube superchats/jewels/donations) as parsed by
  // stream-dock's Social Stream Ninja chat listener — this is the always-on gift path,
  // unlike "milk-event" tiktok_gift which needs the optional Tikfinity connection.
  function coinsFromGiftAlert(type, amount) {
    if (type === "tiktok_coins") return amount;
    if (type === "youtube_jewels") return amount * 0.5; // $0.005/jewel -> $0.01/coin equivalence
    return amount * 100; // youtube_superchat / direct_donation: dollars -> coins equivalent
  }

  function handleGiftAlert(payload) {
    if (!state.enabled) return;
    if (!payload || !state.autoMode) return;
    if (state.debug) console.log("[CrowdGlass] gift-alert", payload);
    const coins = Math.round(coinsFromGiftAlert(payload.type, payload.amount || 0));
    if (coins <= 0) return;
    const platform = payload.platform === "tiktok" ? "tiktok" : payload.platform === "youtube" ? "youtube" : undefined;
    const username = payload.name && payload.name !== "Anonymous" ? payload.name : null;
    if (isDuplicateGift(`${platform || "other"}:${username || "anon"}:${coins}`)) return;
    handleGift({ type: "gift", platform, username, giftName: payload.giftTitle || payload.giftLabel || undefined, coins });
  }

  function handleAblyViewerCount(payload) {
    if (!state.enabled) return;
    if (!payload || payload.count == null) return;
    const platform = payload.platform === "tiktok" ? "tiktok" : payload.platform === "youtube" ? "youtube" : null;
    if (!platform) return;
    const prev = state.lastViewerCounts[platform];
    updateViewerCountBadge(payload.count);
    if (!state.autoMode || prev == null) {
      state.lastViewerCounts[platform] = payload.count;
      return;
    }
    const delta = payload.count - prev;
    if (delta > 0) {
      handleViewerDelta({ type: "viewer_delta", platform, delta, currentViewers: payload.count, timestamp: Date.now() });
    } else {
      state.lastViewerCounts[platform] = payload.count;
    }
  }

  function handleAblyCommand(payload) {
    if (!payload || !payload.command) return;
    if (payload.visible !== undefined) {
      state.enabled = !!payload.visible;
      stage.style.display = state.enabled ? "" : "none";
      if (!state.enabled) resetGlass();
    }
    if (payload.command === "set_auto") {
      state.autoMode = !!payload.value;
      return;
    }
    handleCommand(payload.command);
  }

  function applyLayoutMessage(payload) {
    if (!payload) return;
    if (payload.positions) {
      Object.keys(payload.positions).forEach((id) => {
        const pos = payload.positions[id];
        const el = document.querySelector(`[data-layout-id="${id}"]`);
        if (el && pos) {
          el.style.setProperty("--cg-ox", `${pos.x || 0}px`);
          el.style.setProperty("--cg-oy", `${pos.y || 0}px`);
        }
      });
    }
    if (payload.stageScale != null) {
      state.stageScale = clamp(payload.stageScale, 0.35, 1.3);
      stage.style.transform = `scale(${state.stageScale})`;
    }
    if (payload.crackScale != null) {
      state.crackScale = clamp(payload.crackScale, 0.3, 3);
    }
    if (payload.shatterThreshold != null) {
      state.shatterCrackThreshold = clamp(Math.round(payload.shatterThreshold), 3, CFG.maxCracksOnScreen);
    }
  }

  function announceAlive() {
    if (state.attached && state.ablyChannel) state.ablyChannel.publish("crowd-glass-alive", {}).catch(() => {});
  }

  // Ably delivers every message on a channel to every attached client regardless of
  // which named events that client subscribes to — filtering by event name is
  // client-side only and doesn't reduce delivery cost. So a real "off = zero Ably
  // cost" toggle has to fully detach from the shared channel, not just ignore what
  // arrives on it. A second, tiny, always-attached channel ("crowd-glass-toggle")
  // carries only the on/off command so this overlay can hear "turn back on" while
  // fully detached from everything else (milk-event, gift-alert, etc).
  function connectAbly() {
    if (!CFG.ablyEnabled || typeof Ably === "undefined") { state.ablyStatus = "disabled"; return; }
    try {
      const ably = new Ably.Realtime({ key: CFG.ablyKey });
      const channel = ably.channels.get(CFG.ablyChannel);
      state.ably = ably;
      state.ablyChannel = channel;
      state.ablyStatus = "connecting";

      function attachMain() {
        state.enabled = true;
        stage.style.display = "";
        if (state.attached) return; // idempotent
        state.attached = true;
        channel.attach().catch(() => {});
        announceAlive();
      }
      function detachMain() {
        state.enabled = false;
        stage.style.display = "none";
        resetGlass();
        state.attached = false;
        channel.detach().catch(() => {});
      }
      state.attachMain = attachMain;
      state.detachMain = detachMain;

      const toggleChannel = ably.channels.get("crowd-glass-toggle");
      state.toggleChannel = toggleChannel;
      toggleChannel.subscribe("set", (msg) => {
        if (msg.data && msg.data.enabled) attachMain(); else detachMain();
      });

      channel.subscribe("milk-event", (msg) => handleMilkEvent(msg.data));
      channel.subscribe("gift-alert", (msg) => handleGiftAlert(msg.data));
      channel.subscribe("crowd-glass-viewer-count", (msg) => handleAblyViewerCount(msg.data));
      channel.subscribe("crowd-glass-cmd", (msg) => handleAblyCommand(msg.data));
      channel.subscribe("crowd-glass-layout", (msg) => applyLayoutMessage(msg.data));
      channel.subscribe("crowd-glass-ping", () => announceAlive());

      ably.connection.on((stateChange) => { state.ablyStatus = stateChange.current; });
      ably.connection.once("connected", () => {
        // Ask the dock for current on/off state — covers reload, or the dock's
        // setting changing while this overlay was closed.
        toggleChannel.publish("request", {}).catch(() => {});
        announceAlive();
      });

      // The subscribe() calls above implicitly attach `channel` — start fully
      // detached (zero Ably cost) until the toggle channel says otherwise.
      // state.enabled defaults to false, so this matches existing boot behavior.
      channel.detach().catch(() => {});
    } catch (e) {
      state.ablyStatus = "error";
    }
  }

  // ---------------------------------------------------------------------
  // Debug panel
  // ---------------------------------------------------------------------
  function updateDebugPanel() {
    if (!state.debug) return;
    dbgIntegrity.textContent = Math.round(state.integrity);
    dbgCracks.textContent = `${activeCrackCount()} / ${state.shatterCrackThreshold}`;
    dbgBulletproof.textContent = state.bulletproof ? "on" : "off";
    dbgLastEvent.textContent = state.lastEventLabel;
    dbgWsStatus.textContent = state.wsStatus;
    if (dbgAblyStatus) dbgAblyStatus.textContent = `${state.ablyStatus} / ${state.autoMode ? "auto" : "manual"}`;
  }

  function toggleDebug() {
    state.debug = !state.debug;
    debugPanel.classList.toggle("hidden", !state.debug);
  }

  // ---------------------------------------------------------------------
  // Keyboard test controls
  // ---------------------------------------------------------------------
  const TEST_USERNAMES = ["jessica23", "mike", "sarah96", "tyler_live", "jamieplays", "biggifter", "sam"];
  let nameCursor = 0;
  function nextTestUsername() {
    const name = TEST_USERNAMES[nameCursor % TEST_USERNAMES.length];
    nameCursor++;
    return name;
  }

  function simulateDelta(delta, platform) {
    const current = (state.lastViewerCounts[platform] || 500) + delta;
    handleViewerDelta({ type: "viewer_delta", platform, delta, currentViewers: current, timestamp: Date.now() });
  }

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if ("jy1234gbmsr".includes(key)) ensureVisible();
    switch (key) {
      case "j":
        handleViewerJoin({ type: "viewer_join", platform: "tiktok", username: nextTestUsername(), timestamp: Date.now() });
        break;
      case "y":
        simulateDelta(1, "youtube");
        break;
      case "1":
        simulateDelta(10, "tiktok");
        break;
      case "2":
        simulateDelta(50, "tiktok");
        break;
      case "3":
        simulateDelta(150, "youtube");
        break;
      case "4":
        simulateDelta(400, "youtube");
        break;
      case "g":
        handleGift({ type: "gift", platform: "tiktok", username: nextTestUsername(), giftName: "Rose", coins: 75, timestamp: Date.now() });
        break;
      case "b":
        handleGift({ type: "gift", platform: "tiktok", username: nextTestUsername(), giftName: "Lion", coins: 6000, timestamp: Date.now() });
        break;
      case "m":
        handleGift({ type: "gift", platform: "tiktok", username: nextTestUsername(), giftName: "Universe", coins: 10000, timestamp: Date.now() });
        break;
      case "s":
        triggerShatter();
        break;
      case "r":
        resetGlass();
        break;
      case "d":
        toggleDebug();
        break;
      case "a":
        state.autoMode = !state.autoMode;
        state.lastEventLabel = `local toggle: ${state.autoMode ? "auto" : "manual"}`;
        break;
      default:
        break;
    }
  });

  // ---------------------------------------------------------------------
  // Fit-to-window scaling (for local preview; OBS renders 1:1 at 1080x1920)
  // ---------------------------------------------------------------------
  function fitStage() {
    const iw = window.innerWidth, ih = window.innerHeight;
    let scale = Math.min(iw / CFG.canvasWidth, ih / CFG.canvasHeight);
    if (!isFinite(scale) || scale <= 0) return; // ignore transient zero-size resize events
    const offsetX = (iw - CFG.canvasWidth * scale) / 2;
    const offsetY = (ih - CFG.canvasHeight * scale) / 2;
    const base = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    stage.dataset.baseTransform = base;
    stage.style.transform = base;
  }
  window.addEventListener("resize", fitStage);
  fitStage();

  // ---------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------
  updateIntegrityUI();
  connectWebSocket();
  connectAbly();
  requestAnimationFrame(render);

  // expose for debugging in the browser console
  window.CrowdGlass = {
    state, resetGlass, triggerShatter, activateBulletproof, handleIncomingEvent, render,
    handleMilkEvent, handleGiftAlert, handleAblyViewerCount, applyLayoutMessage, handleAblyCommand
  };
})();
