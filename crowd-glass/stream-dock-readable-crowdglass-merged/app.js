(function () {
  "use strict";

  const CFG = window.CROWD_GLASS_CONFIG;

  const state = {
    integrity: 100,
    maxIntegrity: 100,
    cracks: [],
    impactLabels: [],
    recentHitters: [],
    recentRepairers: [],
    bulletproof: false,
    bulletproofEndsAt: 0,
    shatterActive: false,
    sweep: null,
    shatterBurst: null,
    surge: {
      pendingHits: 0,
      totalQueued: 0,
      processed: 0,
      platform: null,
      hubs: [],
      nextHitAt: 0,
      lastSoundAt: 0,
      active: false
    },
    lastViewerCounts: { tiktok: null, youtube: null, total: null },
    autoMode: CFG.autoMode,
    crackScale: CFG.crackScale || 1,
    damageMultiplier: CFG.damageMultiplier || 1,
    wsStatus: "disabled",
    ablyStatus: "disabled",
    lastEventLabel: "none",
    debug: false,
    ws: null,
    ably: null,
    ablyChannel: null,
    _crackId: 0,
    _tagId: 0,
    _hubId: 0,
    _heartbeatTimer: null
  };

  const stage = document.getElementById("stage");
  const canvas = document.getElementById("cracks-canvas");
  const ctx = canvas.getContext("2d");
  const tagsLayer = document.getElementById("impact-tags-layer");
  const controlCard = document.getElementById("control-card");
  const viewerCountValue = document.getElementById("viewer-count-value");
  const integrityValue = document.getElementById("integrity-value");
  const integrityFill = document.getElementById("integrity-fill");
  const hitsRemainingText = document.getElementById("hits-remaining-text");
  const recentHittersList = document.getElementById("recent-hitters-list");
  const recentRepairersList = document.getElementById("recent-repairers-list");
  const bulletproofBadge = document.getElementById("bulletproof-badge");
  const bulletproofTimer = document.getElementById("bulletproof-timer");
  const surgeStatus = document.getElementById("surge-status");
  const surgeMain = document.getElementById("surge-main");
  const surgeCount = document.getElementById("surge-count");
  const shatterOverlay = document.getElementById("shatter-overlay");
  const debugPanel = document.getElementById("debug-panel");
  const dbgIntegrity = document.getElementById("dbg-integrity");
  const dbgCracks = document.getElementById("dbg-cracks");
  const dbgSurge = document.getElementById("dbg-surge");
  const dbgBulletproof = document.getElementById("dbg-bulletproof");
  const dbgLastEvent = document.getElementById("dbg-last-event");
  const dbgWsStatus = document.getElementById("dbg-ws-status");
  const dbgAblyStatus = document.getElementById("dbg-ably-status");

  const rand = (min, max) => min + Math.random() * (max - min);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nowMs = () => performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function integrityDamageFactor() {
    return 1 + (1 - state.integrity / 100) * 1.55;
  }

  function inCenterBox(x, y) {
    const c = CFG.placement.centerBox;
    return x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2;
  }

  function pickPlacement() {
    const p = CFG.placement;
    const critical = state.integrity <= p.criticalIntegrityThreshold;
    const zones = [
      { x1: p.minX, y1: p.minY, x2: 400, y2: 600 },
      { x1: 680, y1: p.minY, x2: p.maxX, y2: 600 },
      { x1: p.minX, y1: 650, x2: 380, y2: 1150 },
      { x1: 700, y1: 650, x2: p.maxX, y2: 1150 },
      { x1: p.minX, y1: 1200, x2: 420, y2: p.maxY },
      { x1: 660, y1: 1200, x2: p.maxX, y2: p.maxY }
    ];
    let zone = choice(zones);
    let x = 0, y = 0, tries = 0;
    do {
      x = rand(zone.x1, zone.x2);
      y = rand(zone.y1, zone.y2);
      tries++;
    } while (!critical && tries < 6 && inCenterBox(x, y));
    return { x, y: Math.min(y, p.avoidBelowY - 20) };
  }

  function buildJaggedLine(x0, y0, angle, length, segments, jag = 0.35) {
    const pts = [{ x: x0, y: y0 }];
    let cx = x0, cy = y0, a = angle;
    const segLen = length / Math.max(1, segments);
    for (let i = 0; i < segments; i++) {
      a += rand(-jag, jag);
      cx += Math.cos(a) * segLen;
      cy += Math.sin(a) * segLen;
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
    const lt = t * (pts.length - 1) - idx;
    return {
      x: lerp(pts[idx].x, pts[idx + 1].x, lt),
      y: lerp(pts[idx].y, pts[idx + 1].y, lt)
    };
  }

  function generateCrackShape(severity) {
    const dmg = integrityDamageFactor();
    const size = lerp(54, 124, severity) * state.crackScale * dmg;
    const angle0 = rand(0, Math.PI * 2);
    const main = buildJaggedLine(0, 0, angle0, size * rand(0.78, 1.22), Math.round(rand(5, 7)), 0.24);
    const branches = [main];
    const count = Math.round(lerp(4, 8, severity + (dmg - 1) * 0.2));
    for (let i = 0; i < count - 1; i++) {
      const o = pointAtT(main, rand(0.12, 0.92));
      const longBias = i % 3 === 0 ? rand(0.52, 0.88) : rand(0.22, 0.58);
      branches.push(buildJaggedLine(o.x, o.y, angle0 + rand(-1.25, 1.25), size * longBias, Math.round(rand(2, 4)), 0.33));
      if ((i % 2 === 0 && severity > 0.35) || dmg > 1.6) {
        const o2 = pointAtT(branches[branches.length - 1], rand(0.2, 0.85));
        branches.push(buildJaggedLine(o2.x, o2.y, angle0 + rand(-1.7, 1.7), size * rand(0.12, 0.3), 2, 0.4));
      }
    }
    return { branches };
  }

  function generateHubBranchShape(hub) {
    const hit = hub.hits || 0;
    const dmg = integrityDamageFactor();
    const growth = Math.min(1.75, Math.sqrt(hit + 1) / 4.2);
    const radius = (62 + growth * 180) * state.crackScale * (0.95 + (dmg - 1) * 0.35);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const angle = (hub.baseAngle + hit * golden + rand(-0.46, 0.46)) % (Math.PI * 2);
    const isLong = (hit % 4 === 0) || hit > 10;
    const len = radius * (isLong ? rand(0.9, 1.35) : rand(0.42, 0.85));
    const main = buildJaggedLine(0, 0, angle, len, Math.round(rand(4, 7)), 0.22);
    const branches = [main];

    const sideCount = clamp(1 + Math.floor(hit / 6) + Math.floor((dmg - 1) * 2), 1, 4);
    for (let i = 0; i < sideCount; i++) {
      const origin = pointAtT(main, rand(0.18, 0.92));
      const sideLen = len * rand(0.18, isLong ? 0.46 : 0.34);
      const side = buildJaggedLine(origin.x, origin.y, angle + rand(-1.45, 1.45), sideLen, Math.round(rand(2, 4)), 0.34);
      branches.push(side);
      if (hit > 7 && Math.random() < 0.5) {
        const o2 = pointAtT(side, rand(0.22, 0.8));
        branches.push(buildJaggedLine(o2.x, o2.y, angle + rand(-1.9, 1.9), sideLen * rand(0.18, 0.34), 2, 0.4));
      }
    }
    return { branches };
  }

  function buildAbsoluteShatterLine(origin, angle, length, segments, jag) {
    return buildJaggedLine(origin.x, origin.y, angle, length, segments, jag);
  }

  function pushCrack(crack) {
    state.cracks.push(crack);
    if (state.cracks.length > CFG.maxCracksOnScreen) {
      state.cracks.splice(0, state.cracks.length - CFG.maxCracksOnScreen);
    }
    return crack;
  }

  function createSmallCrack({ x, y, severity }) {
    return pushCrack({
      id: ++state._crackId,
      x,
      y,
      shape: generateCrackShape(clamp(severity, 0, 1)),
      createdAt: nowMs(),
      sealing: false,
      sealStart: null,
      swept: false
    });
  }

  function createHubBranch({ hub, severity }) {
    hub.hits = (hub.hits || 0) + 1;
    hub.lastHitAt = nowMs();
    return pushCrack({
      id: ++state._crackId,
      x: hub.x,
      y: hub.y,
      shape: generateHubBranchShape(hub),
      createdAt: nowMs(),
      sealing: false,
      sealStart: null,
      swept: false,
      hubId: hub.id
    });
  }

  function createDeflectStar(x, y) {
    return pushCrack({
      id: ++state._crackId,
      x,
      y,
      isStar: true,
      points: Math.round(rand(5, 8)),
      radius: rand(16, 27),
      createdAt: nowMs()
    });
  }

  function partialStroke(ctx2, pts, fraction, ox, oy) {
    if (fraction <= 0) return;
    const total = pathLength(pts);
    const target = total * clamp(fraction, 0, 1);
    let travelled = 0;
    ctx2.beginPath();
    ctx2.moveTo(pts[0].x + ox, pts[0].y + oy);
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (travelled + seg <= target) {
        ctx2.lineTo(pts[i].x + ox, pts[i].y + oy);
        travelled += seg;
      } else {
        const remain = target - travelled;
        const r = seg === 0 ? 0 : remain / seg;
        ctx2.lineTo(lerp(pts[i - 1].x, pts[i].x, r) + ox, lerp(pts[i - 1].y, pts[i].y, r) + oy);
        break;
      }
    }
    ctx2.stroke();
  }

  function drawCrack(c, now) {
    const age = now - c.createdAt;
    let alpha = 1;
    if (c.sealing) {
      const sealAge = now - c.sealStart;
      alpha = clamp(1 - sealAge / 420, 0, 1);
      if (sealAge > 420) return false;
    }
    const mainF = clamp((age - 50) / 300, 0, 1);
    const branchF = clamp((age - 180) / 430, 0, 1);
    const dotA = age < 170 ? 1 - age / 170 : 0;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (dotA > 0) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${0.95 * dotA * alpha})`;
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    c.shape.branches.forEach((pts, i) => {
      const f = i === 0 ? mainF : branchF;
      if (f <= 0) return;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = i === 0 ? 3.4 : 2.4;
      ctx.strokeStyle = `rgba(0,0,0,${0.31 * alpha})`;
      partialStroke(ctx, pts, f, 1.7, 1.7);
      ctx.lineWidth = i === 0 ? 2.55 : 1.9;
      ctx.strokeStyle = `rgba(255,255,255,${0.86 * alpha})`;
      partialStroke(ctx, pts, f, 0, 0);
      ctx.lineWidth = i === 0 ? 1.05 : 0.82;
      ctx.strokeStyle = `rgba(255,255,255,${0.98 * alpha})`;
      partialStroke(ctx, pts, f, 0, 0);
    });
    ctx.restore();
    return true;
  }

  function drawDeflectStar(star, now) {
    const t = clamp((now - star.createdAt) / 550, 0, 1);
    if (t >= 1) return false;
    const a = 1 - t;
    const r = star.radius * (0.4 + 0.6 * t);
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(t * 0.6);
    ctx.beginPath();
    for (let i = 0; i < star.points * 2; i++) {
      const rad = i % 2 === 0 ? r : r * 0.42;
      const ang = (Math.PI / star.points) * i;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(0,0,0,${0.25 * a})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * a})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  function drawSweep(now) {
    if (!state.sweep) return;
    const t = clamp((now - state.sweep.startedAt) / state.sweep.duration, 0, 1);
    if (t >= 1) {
      state.sweep = null;
      return;
    }
    const x = lerp(-300, CFG.canvasWidth + 300, t);
    const grad = ctx.createLinearGradient(x - 140, 0, x + 140, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CFG.canvasWidth, CFG.canvasHeight);
    state.cracks.forEach((c) => {
      if (!c.swept && c.x < x + 140) {
        c.swept = true;
        if (!c.sealing) {
          c.sealing = true;
          c.sealStart = now;
        }
      }
    });
  }

  function drawShatterBurst(now) {
    if (!state.shatterBurst) return;
    const tRaw = clamp((now - state.shatterBurst.startedAt) / state.shatterBurst.duration, 0, 1);
    const t = easeOutCubic(tRaw);
    if (tRaw >= 1) {
      state.shatterBurst = null;
      return;
    }
    const fade = tRaw < 0.7 ? 1 : 1 - (tRaw - 0.7) / 0.3;
    ctx.save();

    if (state.shatterBurst.vignette) {
      const g = ctx.createRadialGradient(CFG.canvasWidth / 2, CFG.canvasHeight / 2, 90, CFG.canvasWidth / 2, CFG.canvasHeight / 2, 900);
      g.addColorStop(0, `rgba(255,255,255,${0.11 * fade})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CFG.canvasWidth, CFG.canvasHeight);
    }

    state.shatterBurst.lines.forEach((pts) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4.6;
      ctx.strokeStyle = `rgba(0,0,0,${0.34 * fade})`;
      partialStroke(ctx, pts, Math.min(1, t * 1.08), 2, 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = `rgba(255,255,255,${0.96 * fade})`;
      partialStroke(ctx, pts, Math.min(1, t * 1.08), 0, 0);
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(255,255,255,${1 * fade})`;
      partialStroke(ctx, pts, Math.min(1, t * 1.08), 0, 0);
    });

    ctx.restore();
  }

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
      state.impactLabels = state.impactLabels.filter((x) => x.id !== id);
    }, 2100);
  }

  function renderList(container, items, className) {
    if (!container) return;
    container.innerHTML = "";
    items.forEach((u) => {
      const row = document.createElement("div");
      row.className = className;
      row.textContent = `@${u}`;
      container.appendChild(row);
    });
  }

  function updateRecentHitters(username) {
    if (!username) return;
    state.recentHitters = state.recentHitters.filter((u) => u !== username);
    state.recentHitters.unshift(username);
    state.recentHitters = state.recentHitters.slice(0, CFG.maxRecentHitters);
    renderList(recentHittersList, state.recentHitters, "recent-hitter");
  }

  function updateRecentRepairers(username) {
    if (!username) return;
    state.recentRepairers = state.recentRepairers.filter((u) => u !== username);
    state.recentRepairers.unshift(username);
    state.recentRepairers = state.recentRepairers.slice(0, CFG.maxRecentRepairers);
    renderList(recentRepairersList, state.recentRepairers, "recent-repairer");
  }

  function activeCrackCount() {
    return state.cracks.filter((c) => !c.isStar && !c.sealing).length;
  }

  function joinDamage() {
    const amount = rand(CFG.singleJoinDamageMin, CFG.singleJoinDamageMax) * state.damageMultiplier;
    return amount * (state.bulletproof ? CFG.bulletproofDamageMultiplier : 1);
  }

  function updateIntegrityUI() {
    const pct = Math.round(state.integrity);
    integrityValue.textContent = pct;
    integrityFill.style.width = `${pct}%`;
    const avgDamage = ((CFG.singleJoinDamageMin + CFG.singleJoinDamageMax) / 2) * state.damageMultiplier;
    const hitsLeft = Math.max(1, Math.ceil(state.integrity / Math.max(0.01, avgDamage)));
    if (pct <= 25) hitsRemainingText.textContent = `${hitsLeft} more hits shatters it`;
    else if (pct <= 65) hitsRemainingText.textContent = `viewer hits are spreading the cracks`;
    else hitsRemainingText.textContent = `each new viewer adds a crack`;
  }

  function applyDamage(amount) {
    if (state.shatterActive) return;
    state.integrity = clamp(state.integrity - amount, 0, state.maxIntegrity);
    updateIntegrityUI();
    if (state.integrity <= CFG.shatterAtIntegrity) triggerShatter();
  }

  function clearExpiredHubs() {
    const life = CFG.surge.hubLifetimeMs || 22000;
    const now = nowMs();
    state.surge.hubs = state.surge.hubs.filter((hub) => now - hub.lastHitAt < life);
  }

  function desiredHubCount(extraHits = 0) {
    const base = CFG.surge.hubMin || 2;
    const max = CFG.surge.hubMax || 6;
    const pressure = state.surge.processed + state.surge.pendingHits + extraHits;
    const fromPressure = Math.floor(pressure / (CFG.surge.newHubEveryHits || 6));
    const fromDamage = Math.floor((100 - state.integrity) / 18);
    return clamp(base + fromPressure + fromDamage, base, max);
  }

  function spawnHub(platform) {
    const pos = pickPlacement();
    const hub = {
      id: `hub_${++state._hubId}`,
      x: pos.x,
      y: pos.y,
      platform: platform || state.surge.platform || "viewer",
      hits: 0,
      baseAngle: rand(0, Math.PI * 2),
      createdAt: nowMs(),
      lastHitAt: nowMs()
    };
    state.surge.hubs.push(hub);
    return hub;
  }

  function ensureHubCoverage(extraHits, platform) {
    clearExpiredHubs();
    const desired = desiredHubCount(extraHits || 0);
    while (state.surge.hubs.length < desired) {
      spawnHub(platform);
    }
    return state.surge.hubs;
  }

  function pickSurgeHub() {
    clearExpiredHubs();
    ensureHubCoverage(0, state.surge.platform);
    const sorted = [...state.surge.hubs].sort((a, b) => {
      const as = (a.hits * 1.6) + (nowMs() - a.lastHitAt) / 350;
      const bs = (b.hits * 1.6) + (nowMs() - b.lastHitAt) / 350;
      return as - bs;
    });
    return sorted[0];
  }

  function maybeSpawnAdditionalHub(platform) {
    const desired = desiredHubCount(0);
    if (state.surge.hubs.length < desired) {
      return spawnHub(platform);
    }
    if (state.surge.hubs.length < (CFG.surge.hubMax || 6) && Math.random() < 0.12 + (100 - state.integrity) / 220) {
      return spawnHub(platform);
    }
    return null;
  }

  function surgeIntervalMs() {
    const pending = state.surge.pendingHits;
    if (pending > 250) return CFG.surge.ultraIntervalMs;
    if (pending > 100) return CFG.surge.fastIntervalMs;
    if (pending > 35) return CFG.surge.mediumIntervalMs;
    return CFG.surge.slowIntervalMs;
  }

  function updateSurgeUI() {
    if (!surgeStatus) return;
    if (!state.surge.active || state.surge.pendingHits <= 0) {
      surgeStatus.classList.add("hidden");
      return;
    }
    surgeStatus.classList.remove("hidden");
    surgeMain.textContent = `${(state.surge.platform || "viewer").toUpperCase()} SURGE`;
    surgeCount.textContent = `${state.surge.processed}/${state.surge.totalQueued} hits`;
  }

  function enqueueViewerSurge(event) {
    const delta = Math.max(1, Math.min(CFG.surge.maxQueuedHits, event.delta || 1));
    state.surge.pendingHits += delta;
    state.surge.totalQueued += delta;
    state.surge.platform = event.platform || state.surge.platform || "viewer";
    state.surge.active = true;
    ensureHubCoverage(delta, event.platform);
    updateSurgeUI();
    const pos = pickPlacement();
    showImpactTag({ text: `+${delta} viewers hitting the glass`, x: pos.x, y: pos.y, kind: "burst" });
  }

  function processOneSurgeHit(now) {
    if (!state.surge.pendingHits || state.shatterActive) return;
    state.surge.pendingHits--;
    state.surge.processed++;

    if ((state.surge.processed % (CFG.surge.newHubEveryHits || 6) === 0) || Math.random() < 0.1) {
      maybeSpawnAdditionalHub(state.surge.platform);
    }

    const hub = pickSurgeHub();
    if (state.bulletproof) {
      createDeflectStar(hub.x + rand(-28, 28), hub.y + rand(-28, 28));
    } else {
      const severity = clamp(0.18 + Math.min(0.66, Math.sqrt(hub.hits + 1) / 11) + (100 - state.integrity) / 240, 0.15, 0.95);
      createHubBranch({ hub, severity });
    }

    if (now - state.surge.lastSoundAt > 85) {
      playSound(state.bulletproof ? "deflect" : "join");
      state.surge.lastSoundAt = now;
    }

    if (state.surge.processed % CFG.surge.tagEveryHits === 0) {
      showImpactTag({ text: `${state.surge.processed}/${state.surge.totalQueued} viewer hits`, x: hub.x, y: hub.y, kind: "burst" });
    }

    applyDamage(joinDamage());
    updateSurgeUI();

    if (state.surge.pendingHits <= 0) {
      setTimeout(() => {
        if (state.surge.pendingHits <= 0) {
          state.surge.active = false;
          state.surge.totalQueued = 0;
          state.surge.processed = 0;
          updateSurgeUI();
        }
      }, 950);
    }
  }

  function processSurgeQueue(now) {
    if (!state.surge.pendingHits || state.shatterActive) return;
    if (now < state.surge.nextHitAt) return;
    let processedThisFrame = 0;
    while (state.surge.pendingHits > 0 && processedThisFrame < (CFG.surge.maxHitsPerFrame || 5) && now >= state.surge.nextHitAt) {
      processOneSurgeHit(now);
      state.surge.nextHitAt = now + surgeIntervalMs();
      processedThisFrame++;
      if (state.shatterActive) break;
    }
  }

  function sealOneCrack() {
    const now = nowMs();
    const candidate = [...state.cracks].reverse().find((c) => !c.isStar && !c.sealing);
    if (candidate) {
      candidate.sealing = true;
      candidate.sealStart = now;
    }
  }

  function sealRecentCracks(count) {
    const now = nowMs();
    const targets = [...state.cracks].reverse().filter((c) => !c.isStar && !c.sealing).slice(0, count);
    targets.forEach((c) => {
      c.sealing = true;
      c.sealStart = now;
    });
  }

  function triggerRepairSweep() {
    state.sweep = { startedAt: nowMs(), duration: 680, kind: "repair" };
    state.cracks.forEach((c) => { c.swept = false; });
  }

  function triggerFullWipe() {
    state.sweep = { startedAt: nowMs(), duration: 540, kind: "full" };
    const now = nowMs();
    state.cracks.forEach((c) => {
      if (!c.isStar && !c.sealing) {
        c.sealing = true;
        c.sealStart = now;
      }
    });
  }

  function repairGlass(amount, effect) {
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

  let bulletproofTickHandle = null;
  function activateBulletproof(durationMs) {
    state.bulletproof = true;
    state.bulletproofEndsAt = nowMs() + durationMs;
    state.integrity = state.maxIntegrity;
    updateIntegrityUI();
    const now = nowMs();
    state.cracks.forEach((c) => {
      if (!c.isStar) {
        c.sealing = true;
        c.sealStart = now;
      }
    });
    bulletproofBadge.classList.remove("hidden");
    playSound("bulletproof");
    if (bulletproofTickHandle) clearInterval(bulletproofTickHandle);
    bulletproofTickHandle = setInterval(() => {
      const remainMs = state.bulletproofEndsAt - nowMs();
      if (remainMs <= 0) {
        state.bulletproof = false;
        bulletproofBadge.classList.add("hidden");
        clearInterval(bulletproofTickHandle);
        bulletproofTickHandle = null;
        return;
      }
      const secs = Math.ceil(remainMs / 1000);
      bulletproofTimer.textContent = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
    }, 250);
  }

  function handleBulletproofImpact(source) {
    const pos = pickPlacement();
    createDeflectStar(pos.x, pos.y);
    playSound("deflect");
    showImpactTag({ text: source && source.username ? `@${source.username} deflected` : "viewer hit deflected", x: pos.x, y: pos.y });
  }

  function buildShatterNetwork() {
    const origins = [];
    const hubs = [...state.surge.hubs].sort((a, b) => b.hits - a.hits).slice(0, 4);
    hubs.forEach((h) => origins.push({ x: h.x, y: h.y }));

    const recentCracks = [...state.cracks].reverse().filter((c) => !c.isStar).slice(0, 4);
    recentCracks.forEach((c) => origins.push({ x: c.x, y: c.y }));

    if (!origins.length) {
      origins.push({ x: CFG.canvasWidth * 0.26, y: CFG.canvasHeight * 0.28 });
      origins.push({ x: CFG.canvasWidth * 0.75, y: CFG.canvasHeight * 0.32 });
      origins.push({ x: CFG.canvasWidth * 0.4, y: CFG.canvasHeight * 0.72 });
    }

    const deduped = [];
    origins.forEach((o) => {
      const exists = deduped.some((d) => Math.hypot(d.x - o.x, d.y - o.y) < 120);
      if (!exists) deduped.push(o);
    });

    const fullSpan = Math.hypot(CFG.canvasWidth, CFG.canvasHeight) * 1.1;
    const lines = [];

    deduped.forEach((origin, idx) => {
      const radial = 10 + idx * 2;
      for (let i = 0; i < radial; i++) {
        const baseAngle = (Math.PI * 2 * i) / radial + rand(-0.18, 0.18);
        const len = rand(fullSpan * 0.42, fullSpan * 0.88);
        lines.push(buildAbsoluteShatterLine(origin, baseAngle, len, Math.round(rand(6, 11)), 0.18));
        if (Math.random() < 0.55) {
          const main = lines[lines.length - 1];
          const branchOrigin = pointAtT(main, rand(0.18, 0.86));
          lines.push(buildAbsoluteShatterLine(branchOrigin, baseAngle + rand(-1.3, 1.3), len * rand(0.14, 0.32), Math.round(rand(2, 4)), 0.34));
        }
      }
    });

    for (let i = 0; i < deduped.length; i++) {
      for (let j = i + 1; j < deduped.length; j++) {
        const a = deduped[i], b = deduped[j];
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const len = Math.hypot(b.x - a.x, b.y - a.y) * rand(0.95, 1.08);
        lines.push(buildAbsoluteShatterLine(a, angle, len, Math.round(rand(5, 8)), 0.14));
      }
    }

    const corners = [
      { x: -120, y: -120 },
      { x: CFG.canvasWidth + 120, y: -120 },
      { x: -120, y: CFG.canvasHeight + 120 },
      { x: CFG.canvasWidth + 120, y: CFG.canvasHeight + 120 }
    ];
    corners.forEach((corner) => {
      const origin = choice(deduped);
      const angle = Math.atan2(corner.y - origin.y, corner.x - origin.x);
      const len = Math.hypot(corner.x - origin.x, corner.y - origin.y);
      lines.push(buildAbsoluteShatterLine(origin, angle, len, Math.round(rand(6, 10)), 0.12));
    });

    return {
      startedAt: nowMs(),
      duration: 1100,
      lines,
      vignette: true
    };
  }

  function triggerShatter() {
    if (state.shatterActive) return;
    state.shatterActive = true;
    state.surge.pendingHits = 0;
    state.surge.active = false;
    updateSurgeUI();
    playSound("shatter");
    triggerScreenShake(1.3);
    state.shatterBurst = buildShatterNetwork();
    shatterOverlay.classList.remove("hidden");
    setTimeout(() => shatterOverlay.classList.add("hidden"), 1700);
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
    state.surge.pendingHits = 0;
    state.surge.totalQueued = 0;
    state.surge.processed = 0;
    state.surge.active = false;
    state.surge.hubs = [];
    updateIntegrityUI();
    updateSurgeUI();
  }

  let shakeHandle = null;
  function triggerScreenShake(intensity) {
    const amp = 6 * clamp(intensity, 0, 2);
    const start = nowMs();
    const duration = 260;
    if (shakeHandle) cancelAnimationFrame(shakeHandle);
    function step() {
      const t = (nowMs() - start) / duration;
      if (t >= 1) {
        stage.style.transform = stage.dataset.baseTransform || "";
        return;
      }
      const dx = (Math.random() * 2 - 1) * amp * (1 - t);
      const dy = (Math.random() * 2 - 1) * amp * (1 - t);
      stage.style.transform = `${stage.dataset.baseTransform || ""} translate(${dx}px, ${dy}px)`;
      shakeHandle = requestAnimationFrame(step);
    }
    step();
  }

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
          tone(ac, { freq: rand(1350, 1800), start: now, duration: 0.085, type: "triangle", gainStart: 0.42 * vol });
          break;
        case "repair":
          tone(ac, { freq: 700, start: now, duration: 0.18, type: "sine", gainStart: 0.3 * vol });
          tone(ac, { freq: 1400, start: now + 0.08, duration: 0.22, type: "sine", gainStart: 0.25 * vol });
          break;
        case "bulletproof":
          tone(ac, { freq: 2000, start: now, duration: 0.05, type: "square", gainStart: 0.22 * vol });
          tone(ac, { freq: 2600, start: now + 0.05, duration: 0.06, type: "square", gainStart: 0.18 * vol });
          break;
        case "deflect":
          tone(ac, { freq: 2200, start: now, duration: 0.05, type: "square", gainStart: 0.25 * vol });
          break;
        case "shatter":
          noiseBurst(ac, { start: now, duration: 0.42, gainStart: 0.42 * vol });
          tone(ac, { freq: 360, start: now, duration: 0.36, type: "sawtooth", gainStart: 0.24 * vol });
          tone(ac, { freq: 620, start: now + 0.08, duration: 0.25, type: "triangle", gainStart: 0.18 * vol });
          break;
        default:
          break;
      }
    } catch (e) {}
  }

  function updateViewerCountBadge(count) {
    viewerCountValue.textContent = count;
  }

  function handleViewerJoin(event) {
    state.lastEventLabel = `viewer_join(${event.username || "anon"})`;
    const damage = joinDamage();
    if (state.bulletproof) {
      handleBulletproofImpact({ username: event.username });
      applyDamage(damage);
      return;
    }
    ensureHubCoverage(1, event.platform);
    if (Math.random() < 0.35 || state.surge.hubs.length < desiredHubCount(2)) {
      maybeSpawnAdditionalHub(event.platform);
    }
    const hub = pickSurgeHub();
    const severity = rand(0.22, 0.6) + (100 - state.integrity) / 300;
    createHubBranch({ hub, severity });
    playSound("join");
    showImpactTag({ text: event.username ? `@${event.username} cracked it` : "a viewer cracked it", x: hub.x + rand(-18, 18), y: hub.y + rand(-18, 18) });
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
    enqueueViewerSurge(event);
  }

  function handleViewerNameReveal(event) {
    const username = event.username || event.displayName;
    if (!username) return;
    state.lastEventLabel = `viewer_name_reveal(${username})`;
    updateRecentHitters(username);
    const pos = pickPlacement();
    showImpactTag({ text: `@${username} joined the glass`, x: pos.x, y: pos.y });
  }

  function resolveGiftTier(coins) {
    let matched = CFG.giftRepairTiers[0];
    for (const tier of CFG.giftRepairTiers) if (coins >= tier.minCoins) matched = tier;
    return matched;
  }

  function handleGift(event) {
    const coins = event.coins || 0;
    const tier = resolveGiftTier(coins);
    state.lastEventLabel = `gift(${event.username || "anon"}, ${coins}c, ${tier.name})`;
    const pos = pickPlacement();
    playSound(tier.effect === "bulletproof_mode" ? "bulletproof" : "repair");
    if (tier.effect === "bulletproof_mode") {
      showImpactTag({ text: event.username ? `@${event.username} activated bulletproof` : "bulletproof activated", x: pos.x, y: pos.y, kind: "repair" });
      activateBulletproof(CFG.bulletproofDurationMs);
      if (event.username) updateRecentRepairers(event.username);
      return;
    }
    repairGlass(tier.repairAmount, tier.effect);
    const verbs = {
      seal_one_crack: "sealed a crack",
      seal_recent_cracks: "patched the glass",
      repair_sweep: "swept a repair",
      major_repair: "repaired it",
      full_wipe: "fully wiped it"
    };
    const text = event.username ? `@${event.username} ${verbs[tier.effect] || "repaired it"}` : `A gift ${verbs[tier.effect] || "repaired it"}`;
    showImpactTag({ text, x: pos.x, y: pos.y, kind: "repair" });
    if (event.username) updateRecentRepairers(event.username);
  }

  function handleIncomingEvent(event) {
    if (!event || !event.type) return;
    const isLiveEvent = ["viewer_join", "viewer_delta", "viewer_name_reveal", "gift"].includes(event.type);
    if (!state.autoMode && isLiveEvent && event.source !== "manual") return;
    switch (event.type) {
      case "viewer_join": handleViewerJoin(event); break;
      case "viewer_delta": handleViewerDelta(event); break;
      case "viewer_name_reveal": handleViewerNameReveal(event); break;
      case "gift": handleGift(event); break;
      case "command": handleCommand(event.command); break;
      default: break;
    }
  }

  function handleCommand(command) {
    state.lastEventLabel = `command(${command})`;
    switch (command) {
      case "reset_glass": resetGlass(); break;
      case "force_shatter": triggerShatter(); break;
      case "activate_bulletproof": activateBulletproof(CFG.bulletproofDurationMs); break;
      case "break_small": handleViewerJoin({ type: "viewer_join", platform: "manual", username: null, source: "manual" }); break;
      case "break_big": simulateDelta(50, "manual"); break;
      case "repair_small": handleGift({ type: "gift", platform: "manual", username: null, coins: 75, source: "manual" }); break;
      case "repair_big": handleGift({ type: "gift", platform: "manual", username: null, coins: 6000, source: "manual" }); break;
      default: break;
    }
  }

  function connectWebSocket() {
    if (!CFG.websocketEnabled) { state.wsStatus = "disabled"; return; }
    try {
      const ws = new WebSocket(CFG.websocketUrl);
      state.ws = ws;
      state.wsStatus = "connecting";
      ws.onopen = () => { state.wsStatus = "connected"; };
      ws.onclose = () => { state.wsStatus = "disconnected"; setTimeout(connectWebSocket, CFG.websocketReconnectMs); };
      ws.onerror = () => { state.wsStatus = "error"; };
      ws.onmessage = (msg) => { try { handleIncomingEvent(JSON.parse(msg.data)); } catch (e) {} };
    } catch (e) {
      state.wsStatus = "error";
      setTimeout(connectWebSocket, CFG.websocketReconnectMs);
    }
  }

  const giftDedupes = new Map();
  function isDuplicateGift(signature) {
    const n = nowMs();
    for (const [k, t] of giftDedupes) {
      if (n - t > 1800) giftDedupes.delete(k);
    }
    if (giftDedupes.has(signature)) return true;
    giftDedupes.set(signature, n);
    return false;
  }

  const platformFromShortCode = (p) => p === "tt" ? "tiktok" : p === "yt" ? "youtube" : undefined;

  function handleMilkEvent(payload) {
    if (!payload || !payload.type || !state.autoMode) return;
    if (payload.type === "join") {
      handleViewerJoin({ type: "viewer_join", platform: platformFromShortCode(payload.platform), username: payload.username || null });
    } else if (payload.type === "tiktok_gift") {
      const username = payload.username || payload.gifterKey || null;
      const coins = payload.coins || 0;
      const signature = `tiktok:${payload.eventId || payload.msgId || `${username || "anon"}:${payload.giftName || "gift"}:${coins}`}`;
      if (!isDuplicateGift(signature)) handleGift({ type: "gift", platform: "tiktok", username, giftName: payload.giftName, coins });
    } else if (payload.type === "yt_superchat") {
      const username = payload.gifterKey || null;
      const coins = Math.round((payload.dollars || 0) * 100);
      const giftName = payload.isJewels ? "Jewels" : "Superchat";
      const signature = `youtube:${payload.eventId || payload.msgId || `${username || "anon"}:${giftName}:${coins}`}`;
      if (!isDuplicateGift(signature)) handleGift({ type: "gift", platform: "youtube", username, giftName, coins });
    }
  }

  function coinsFromGiftAlert(type, amount) {
    if (type === "tiktok_coins") return amount;
    if (type === "youtube_jewels") return amount * 0.5;
    return amount * 100;
  }

  function handleGiftAlert(payload) {
    if (!payload || !state.autoMode) return;
    const coins = Math.round(coinsFromGiftAlert(payload.type, payload.amount || 0));
    if (coins <= 0) return;
    const platform = payload.platform === "tiktok" ? "tiktok" : payload.platform === "youtube" ? "youtube" : undefined;
    const username = payload.name && payload.name !== "Anonymous" ? payload.name : null;
    const giftName = payload.giftTitle || payload.giftLabel || undefined;
    const signature = `${platform || "other"}:${payload.eventId || payload.id || payload.msgId || `${username || "anon"}:${giftName || "gift"}:${coins}`}`;
    if (!isDuplicateGift(signature)) handleGift({ type: "gift", platform, username, giftName, coins });
  }

  function handleAblyViewerCount(payload) {
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
    if (delta > 0) handleViewerDelta({ type: "viewer_delta", platform, delta, currentViewers: payload.count, timestamp: Date.now() });
    else state.lastViewerCounts[platform] = payload.count;
  }

  function handleAblyCommand(payload) {
    if (!payload || !payload.command) return;
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
          if (pos.scale != null) el.style.setProperty("--cg-scale", `${clamp(pos.scale, 0.35, 2.5)}`);
        }
      });
    }
    if (payload.cardScale != null && controlCard) controlCard.style.setProperty("--cg-scale", `${clamp(payload.cardScale, 0.35, 2.5)}`);
    if (payload.crackScale != null) state.crackScale = clamp(payload.crackScale, 0.3, 3);
    if (payload.damageMultiplier != null) {
      state.damageMultiplier = clamp(payload.damageMultiplier, 0.2, 5);
      updateIntegrityUI();
    }
  }

  function announceAlive() {
    if (state.ablyChannel) state.ablyChannel.publish("crowd-glass-alive", {}).catch(() => {});
  }

  function connectAbly() {
    if (!CFG.ablyEnabled || typeof Ably === "undefined") { state.ablyStatus = "disabled"; return; }
    try {
      const ably = new Ably.Realtime({ key: CFG.ablyKey });
      const channel = ably.channels.get(CFG.ablyChannel);
      state.ably = ably;
      state.ablyChannel = channel;
      state.ablyStatus = "connecting";

      channel.subscribe("milk-event", (m) => handleMilkEvent(m.data));
      channel.subscribe("gift-alert", (m) => handleGiftAlert(m.data));
      channel.subscribe("crowd-glass-viewer-count", (m) => handleAblyViewerCount(m.data));
      channel.subscribe("crowd-glass-cmd", (m) => handleAblyCommand(m.data));
      channel.subscribe("crowd-glass-layout", (m) => applyLayoutMessage(m.data));
      channel.subscribe("crowd-glass-ping", () => announceAlive());

      ably.connection.on((sc) => { state.ablyStatus = sc.current; });
      ably.connection.once("connected", () => {
        announceAlive();
        if (state._heartbeatTimer) clearInterval(state._heartbeatTimer);
        state._heartbeatTimer = setInterval(announceAlive, 10000);
      });
    } catch (e) {
      state.ablyStatus = "error";
    }
  }

  function updateDebugPanel() {
    if (!state.debug) return;
    dbgIntegrity.textContent = Math.round(state.integrity);
    dbgCracks.textContent = `${activeCrackCount()}`;
    if (dbgSurge) dbgSurge.textContent = `${state.surge.pendingHits} pending / ${state.surge.processed}-${state.surge.totalQueued}`;
    dbgBulletproof.textContent = state.bulletproof ? "on" : "off";
    dbgLastEvent.textContent = state.lastEventLabel;
    dbgWsStatus.textContent = state.wsStatus;
    if (dbgAblyStatus) dbgAblyStatus.textContent = `${state.ablyStatus} / ${state.autoMode ? "auto" : "manual"}`;
  }

  function render() {
    const now = nowMs();
    processSurgeQueue(now);
    ctx.clearRect(0, 0, CFG.canvasWidth, CFG.canvasHeight);
    state.cracks = state.cracks.filter((c) => c.isStar ? drawDeflectStar(c, now) : drawCrack(c, now));
    drawSweep(now);
    drawShatterBurst(now);
    updateDebugPanel();
    requestAnimationFrame(render);
  }

  const users = ["jessica23", "mike", "sarah96", "tyler_live", "jamieplays", "biggifter", "sam"];
  let userCursor = 0;
  const nextUser = () => users[userCursor++ % users.length];

  function simulateDelta(delta, platform) {
    const current = (state.lastViewerCounts[platform] || 500) + delta;
    handleViewerDelta({ type: "viewer_delta", platform, delta, currentViewers: current, source: "manual" });
  }

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "j") handleViewerJoin({ type: "viewer_join", platform: "tiktok", username: nextUser(), source: "manual" });
    else if (k === "y") simulateDelta(1, "youtube");
    else if (k === "1") simulateDelta(10, "tiktok");
    else if (k === "2") simulateDelta(50, "tiktok");
    else if (k === "3") simulateDelta(150, "youtube");
    else if (k === "4") simulateDelta(400, "youtube");
    else if (k === "g") handleGift({ type: "gift", platform: "tiktok", username: nextUser(), giftName: "Rose", coins: 75, source: "manual" });
    else if (k === "b") handleGift({ type: "gift", platform: "tiktok", username: nextUser(), giftName: "Lion", coins: 6000, source: "manual" });
    else if (k === "m") handleGift({ type: "gift", platform: "tiktok", username: nextUser(), giftName: "Universe", coins: 10000, source: "manual" });
    else if (k === "s") triggerShatter();
    else if (k === "r") resetGlass();
    else if (k === "d") {
      state.debug = !state.debug;
      debugPanel.classList.toggle("hidden", !state.debug);
    } else if (k === "a") {
      state.autoMode = !state.autoMode;
      state.lastEventLabel = `local toggle: ${state.autoMode ? "auto" : "manual"}`;
    }
  });

  function fitStage() {
    const iw = window.innerWidth;
    const ih = window.innerHeight;
    const scale = Math.min(iw / CFG.canvasWidth, ih / CFG.canvasHeight);
    if (!isFinite(scale) || scale <= 0) return;
    const x = (iw - CFG.canvasWidth * scale) / 2;
    const y = (ih - CFG.canvasHeight * scale) / 2;
    const base = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.dataset.baseTransform = base;
    stage.style.transform = base;
  }

  window.addEventListener("resize", fitStage);
  fitStage();
  updateIntegrityUI();
  updateSurgeUI();
  connectWebSocket();
  connectAbly();
  requestAnimationFrame(render);

  window.CrowdGlass = {
    state,
    resetGlass,
    triggerShatter,
    activateBulletproof,
    handleIncomingEvent,
    render,
    handleMilkEvent,
    handleGiftAlert,
    handleAblyViewerCount,
    applyLayoutMessage,
    handleAblyCommand
  };
})();
