(function () {
  "use strict";
  const CFG = window.CROWD_GLASS_CONFIG;

  const state = {
    integrity: 100,
    cracks: [],
    tags: [],
    recentHitters: [],
    recentRepairers: [],
    bulletproof: false,
    bulletproofEndsAt: 0,
    shatterActive: false,
    sweep: null,
    shatterBurst: null,
    surge: { pendingHits: 0, totalQueued: 0, processed: 0, platform: null, hubs: [], nextHitAt: 0, lastSoundAt: 0, active: false },
    lastViewerCounts: { tiktok: null, youtube: null, total: null },
    autoMode: CFG.autoMode,
    crackScale: CFG.crackScale || 1,
    damageMultiplier: CFG.damageMultiplier || 1,
    wsStatus: "disabled",
    ablyStatus: "disabled",
    lastEventLabel: "none",
    debug: false,
    _crackId: 0,
    _tagId: 0
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

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const choice = (a) => a[Math.floor(Math.random() * a.length)];
  const nowMs = () => performance.now();

  function inCenterBox(x, y) { const c = CFG.placement.centerBox; return x >= c.x1 && x <= c.x2 && y >= c.y1 && y <= c.y2; }
  function pickPlacement() {
    const p = CFG.placement, critical = state.integrity <= p.criticalIntegrityThreshold;
    const zones = [
      {x1:p.minX,y1:p.minY,x2:400,y2:600}, {x1:680,y1:p.minY,x2:p.maxX,y2:600},
      {x1:p.minX,y1:650,x2:380,y2:1150}, {x1:700,y1:650,x2:p.maxX,y2:1150},
      {x1:p.minX,y1:1200,x2:420,y2:p.maxY}, {x1:660,y1:1200,x2:p.maxX,y2:p.maxY}
    ];
    let z = choice(zones), x, y, tries = 0;
    do { x = rand(z.x1, z.x2); y = rand(z.y1, z.y2); tries++; } while (!critical && tries < 6 && inCenterBox(x, y));
    return { x, y: Math.min(y, p.avoidBelowY - 20) };
  }

  function buildJaggedLine(x0, y0, angle, length, segments) {
    const pts = [{x:x0,y:y0}]; let x=x0, y=y0, a=angle, seg=length/segments;
    for (let i=0;i<segments;i++){ a+=rand(-.35,.35); x+=Math.cos(a)*seg; y+=Math.sin(a)*seg; pts.push({x,y}); }
    return pts;
  }
  function pathLength(pts){ let total=0; for(let i=1;i<pts.length;i++) total+=Math.hypot(pts[i].x-pts[i-1].x, pts[i].y-pts[i-1].y); return total; }
  function pointAtT(pts,t){ const idx=clamp(Math.floor(t*(pts.length-1)),0,pts.length-2); const lt=t*(pts.length-1)-idx; return {x:lerp(pts[idx].x,pts[idx+1].x,lt),y:lerp(pts[idx].y,pts[idx+1].y,lt)}; }

  function generateCrackShape(sev){
    const size=lerp(38,86,sev)*state.crackScale, angle0=rand(0,Math.PI*2), main=buildJaggedLine(0,0,angle0,size*rand(.55,.9),4);
    const branches=[main], count=Math.round(lerp(3,7,sev));
    for(let i=0;i<count-1;i++){ const o=pointAtT(main,rand(.15,.9)); branches.push(buildJaggedLine(o.x,o.y,angle0+rand(-1,1)*Math.PI/3,size*rand(.22,.5),Math.round(rand(2,3)))); }
    return { branches };
  }
  function generateHubBranchShape(hub){
    const hit=hub.hits||0, grow=clamp(Math.sqrt(hit+1)/7,0,.75), radius=(42+grow*72)*state.crackScale, golden=Math.PI*(3-Math.sqrt(5));
    const angle=(hub.baseAngle+hit*golden+rand(-.32,.32))%(Math.PI*2), len=radius*rand(.55,1.05);
    const main=buildJaggedLine(0,0,angle,len,Math.round(rand(3,5))), branches=[main];
    if(hit%3===0 || hit>18){ const o=pointAtT(main,rand(.35,.8)); branches.push(buildJaggedLine(o.x,o.y,angle+rand(-1,1),len*rand(.18,.34),2)); }
    return { branches };
  }

  function pushCrack(c){ state.cracks.push(c); if(state.cracks.length>CFG.maxCracksOnScreen) state.cracks.splice(0,state.cracks.length-CFG.maxCracksOnScreen); return c; }
  function createSmallCrack({x,y,severity}){ return pushCrack({id:++state._crackId,x,y,shape:generateCrackShape(clamp(severity,0,1)),createdAt:nowMs(),sealing:false,sealStart:null,swept:false}); }
  function createHubBranch({hub,severity}){ hub.hits=(hub.hits||0)+1; hub.lastHitAt=nowMs(); return pushCrack({id:++state._crackId,x:hub.x,y:hub.y,shape:generateHubBranchShape(hub),createdAt:nowMs(),sealing:false,sealStart:null,swept:false,hubId:hub.id}); }
  function createDeflectStar(x,y){ return pushCrack({id:++state._crackId,x,y,isStar:true,points:Math.round(rand(5,8)),radius:rand(16,27),createdAt:nowMs()}); }

  function partialStroke(ctx, pts, fraction, ox, oy){
    if(fraction<=0) return; const total=pathLength(pts), target=total*clamp(fraction,0,1); let travelled=0;
    ctx.beginPath(); ctx.moveTo(pts[0].x+ox,pts[0].y+oy);
    for(let i=1;i<pts.length;i++){ const seg=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y); if(travelled+seg<=target){ctx.lineTo(pts[i].x+ox,pts[i].y+oy); travelled+=seg;} else { const r=(target-travelled)/seg; ctx.lineTo(lerp(pts[i-1].x,pts[i].x,r)+ox,lerp(pts[i-1].y,pts[i].y,r)+oy); break; } }
    ctx.stroke();
  }
  function drawCrack(c, now){
    const age=now-c.createdAt; let alpha=1;
    if(c.sealing){ const sealAge=now-c.sealStart; alpha=clamp(1-sealAge/420,0,1); if(sealAge>420) return false; }
    const mainF=clamp((age-80)/220,0,1), branchF=clamp((age-300)/250,0,1), dotA=age<150 ? 1-age/150 : 0;
    ctx.save(); ctx.translate(c.x,c.y);
    if(dotA>0){ ctx.beginPath(); ctx.fillStyle=`rgba(255,255,255,${.9*dotA*alpha})`; ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); }
    c.shape.branches.forEach((pts,i)=>{ const f=i===0?mainF:branchF; if(f<=0)return; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=i===0?3.1:2.25; ctx.strokeStyle=`rgba(0,0,0,${.28*alpha})`; partialStroke(ctx,pts,f,1.5,1.5); ctx.lineWidth=i===0?2.45:1.75; ctx.strokeStyle=`rgba(255,255,255,${.82*alpha})`; partialStroke(ctx,pts,f,0,0); ctx.lineWidth=i===0?.95:.75; ctx.strokeStyle=`rgba(255,255,255,${.96*alpha})`; partialStroke(ctx,pts,f,0,0); });
    ctx.restore(); return true;
  }
  function drawDeflectStar(s, now){
    const t=clamp((now-s.createdAt)/550,0,1); if(t>=1)return false; const a=1-t, r=s.radius*(.4+.6*t); ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(t*.6); ctx.beginPath(); for(let i=0;i<s.points*2;i++){ const rad=i%2===0?r:r*.42, ang=(Math.PI/s.points)*i, x=Math.cos(ang)*rad, y=Math.sin(ang)*rad; if(i===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.closePath(); ctx.strokeStyle=`rgba(0,0,0,${.25*a})`; ctx.lineWidth=3; ctx.stroke(); ctx.strokeStyle=`rgba(255,255,255,${.9*a})`; ctx.lineWidth=1.6; ctx.stroke(); ctx.restore(); return true;
  }
  function drawSweep(now){ if(!state.sweep)return; const t=clamp((now-state.sweep.startedAt)/state.sweep.duration,0,1); if(t>=1){state.sweep=null;return;} const x=lerp(-300,CFG.canvasWidth+300,t); const grad=ctx.createLinearGradient(x-140,0,x+140,0); grad.addColorStop(0,'rgba(255,255,255,0)'); grad.addColorStop(.5,'rgba(255,255,255,.35)'); grad.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=grad; ctx.fillRect(0,0,CFG.canvasWidth,CFG.canvasHeight); state.cracks.forEach(c=>{ if(!c.swept && c.x<x+140){ c.swept=true; if(!c.sealing){c.sealing=true;c.sealStart=now;} } }); }
  function drawShatterBurst(now){ if(!state.shatterBurst)return; const t=clamp((now-state.shatterBurst.startedAt)/state.shatterBurst.duration,0,1); if(t>=1){state.shatterBurst=null;return;} const a=1-t; state.shatterBurst.lines.forEach(pts=>{ ctx.lineWidth=3; ctx.strokeStyle=`rgba(0,0,0,${.25*a})`; partialStroke(ctx,pts,1,1.5,1.5); ctx.lineWidth=2; ctx.strokeStyle=`rgba(255,255,255,${.9*a})`; partialStroke(ctx,pts,1,0,0); }); }

  function showImpactTag({text,x,y,kind}){ const el=document.createElement('div'); el.className='impact-tag'+(kind?` ${kind}`:''); el.textContent=text; el.style.left=x+'px'; el.style.top=y+'px'; tagsLayer.appendChild(el); const id=++state._tagId; state.tags.push({id,el}); if(state.tags.length>CFG.maxImpactLabels){ const old=state.tags.shift(); old.el.remove(); } setTimeout(()=>{ el.remove(); state.tags=state.tags.filter(t=>t.id!==id); },2100); }
  function renderList(el, items, cls){ if(!el)return; el.innerHTML=''; items.forEach(u=>{ const row=document.createElement('div'); row.className=cls; row.textContent='@'+u; el.appendChild(row); }); }
  function updateRecentHitters(u){ if(!u)return; state.recentHitters=state.recentHitters.filter(x=>x!==u); state.recentHitters.unshift(u); state.recentHitters=state.recentHitters.slice(0,CFG.maxRecentHitters); renderList(recentHittersList,state.recentHitters,'recent-hitter'); }
  function updateRecentRepairers(u){ if(!u)return; state.recentRepairers=state.recentRepairers.filter(x=>x!==u); state.recentRepairers.unshift(u); state.recentRepairers=state.recentRepairers.slice(0,CFG.maxRecentRepairers); renderList(recentRepairersList,state.recentRepairers,'recent-repairer'); }

  function activeCrackCount(){ return state.cracks.filter(c=>!c.isStar&&!c.sealing).length; }
  function joinDamage(){ return rand(CFG.singleJoinDamageMin,CFG.singleJoinDamageMax)*(state.damageMultiplier||1)*(state.bulletproof?CFG.bulletproofDamageMultiplier:1); }
  function applyDamage(amount){ if(state.shatterActive)return; state.integrity=clamp(state.integrity-amount,0,100); updateIntegrityUI(); if(state.integrity<=CFG.shatterAtIntegrity) triggerShatter(); }
  function updateIntegrityUI(){ const pct=Math.round(state.integrity); integrityValue.textContent=pct; integrityFill.style.width=pct+'%'; const avg=((CFG.singleJoinDamageMin+CFG.singleJoinDamageMax)/2)*(state.damageMultiplier||1); const hits=Math.max(1,Math.ceil(state.integrity/Math.max(.01,avg))); if(pct<=25) hitsRemainingText.textContent=`${hits} more hits shatters it`; else if(pct<=65) hitsRemainingText.textContent='viewer hits are spreading the cracks'; else hitsRemainingText.textContent='each new viewer adds a crack'; }

  function clearExpiredHubs(){ const n=nowMs(), life=CFG.surge.hubLifetimeMs; state.surge.hubs=state.surge.hubs.filter(h=>n-h.lastHitAt<life); }
  function createSurgeHubs(delta, platform){ clearExpiredHubs(); const desired=clamp(Math.ceil(Math.log10(delta+1))+1,CFG.surge.hubMin,CFG.surge.hubMax); while(state.surge.hubs.length<desired){ const p=pickPlacement(); state.surge.hubs.push({id:`hub_${Date.now()}_${Math.random().toString(16).slice(2)}`,x:p.x,y:p.y,platform,hits:0,baseAngle:rand(0,Math.PI*2),createdAt:nowMs(),lastHitAt:nowMs()}); } }
  function pickSurgeHub(){ clearExpiredHubs(); if(!state.surge.hubs.length) createSurgeHubs(1,state.surge.platform); return [...state.surge.hubs].sort((a,b)=>a.hits-b.hits)[0]; }
  function surgeIntervalMs(){ const p=state.surge.pendingHits; if(p>250)return CFG.surge.ultraIntervalMs; if(p>100)return CFG.surge.fastIntervalMs; if(p>35)return CFG.surge.mediumIntervalMs; return CFG.surge.slowIntervalMs; }
  function updateSurgeUI(){ if(!surgeStatus)return; if(!state.surge.active||state.surge.pendingHits<=0){surgeStatus.classList.add('hidden');return;} surgeStatus.classList.remove('hidden'); surgeMain.textContent=`${(state.surge.platform||'viewer').toUpperCase()} SURGE`; surgeCount.textContent=`${state.surge.processed}/${state.surge.totalQueued} hits`; }
  function enqueueViewerSurge(e){ const delta=Math.max(1,Math.min(CFG.surge.maxQueuedHits,e.delta||1)); state.surge.pendingHits+=delta; state.surge.totalQueued+=delta; state.surge.platform=e.platform||state.surge.platform||'viewer'; state.surge.active=true; createSurgeHubs(delta,e.platform); updateSurgeUI(); const p=pickPlacement(); showImpactTag({text:`+${delta} viewers hitting the glass`,x:p.x,y:p.y,kind:'burst'}); }
  function processOneSurgeHit(now){ if(!state.surge.pendingHits||state.shatterActive)return; state.surge.pendingHits--; state.surge.processed++; const hub=pickSurgeHub(); if(state.bulletproof) createDeflectStar(hub.x+rand(-28,28),hub.y+rand(-28,28)); else createHubBranch({hub,severity:clamp(.12+Math.min(.55,Math.sqrt((hub.hits||0)+1)/17),.1,.7)}); if(now-state.surge.lastSoundAt>95){ playSound(state.bulletproof?'deflect':'join'); state.surge.lastSoundAt=now; } if(state.surge.processed%CFG.surge.tagEveryHits===0) showImpactTag({text:`${state.surge.processed}/${state.surge.totalQueued} viewer hits`,x:hub.x,y:hub.y,kind:'burst'}); applyDamage(joinDamage()); updateSurgeUI(); if(state.surge.pendingHits<=0){ setTimeout(()=>{ if(state.surge.pendingHits<=0){ state.surge.active=false; state.surge.totalQueued=0; state.surge.processed=0; updateSurgeUI(); } },900); } }
  function processSurgeQueue(now){ if(!state.surge.pendingHits||state.shatterActive||now<state.surge.nextHitAt)return; let n=0; while(state.surge.pendingHits>0&&n<CFG.surge.maxHitsPerFrame&&now>=state.surge.nextHitAt){ processOneSurgeHit(now); state.surge.nextHitAt=now+surgeIntervalMs(); n++; if(state.shatterActive)break; } }

  function repairGlass(amount,effect){ state.integrity=clamp(state.integrity+amount,0,100); updateIntegrityUI(); if(effect==='seal_one_crack') sealRecentCracks(1); else if(effect==='seal_recent_cracks') sealRecentCracks(3); else if(effect==='repair_sweep') triggerRepairSweep(); else if(effect==='major_repair') sealRecentCracks(6); else if(effect==='full_wipe') triggerFullWipe(); }
  function sealRecentCracks(count){ const n=nowMs(); [...state.cracks].reverse().filter(c=>!c.sealing&&!c.isStar).slice(0,count).forEach(c=>{c.sealing=true;c.sealStart=n;}); }
  function triggerRepairSweep(){ state.sweep={startedAt:nowMs(),duration:650,kind:'repair'}; state.cracks.forEach(c=>c.swept=false); }
  function triggerFullWipe(){ state.sweep={startedAt:nowMs(),duration:550,kind:'full'}; const n=nowMs(); state.cracks.forEach(c=>{if(!c.isStar&&!c.sealing){c.sealing=true;c.sealStart=n;}}); }
  let bulletproofTickHandle=null;
  function activateBulletproof(ms){ state.bulletproof=true; state.bulletproofEndsAt=nowMs()+ms; state.integrity=100; updateIntegrityUI(); triggerFullWipe(); bulletproofBadge.classList.remove('hidden'); playSound('bulletproof'); if(bulletproofTickHandle)clearInterval(bulletproofTickHandle); bulletproofTickHandle=setInterval(()=>{ const rem=state.bulletproofEndsAt-nowMs(); if(rem<=0){state.bulletproof=false; bulletproofBadge.classList.add('hidden'); clearInterval(bulletproofTickHandle); bulletproofTickHandle=null; return;} const sec=Math.ceil(rem/1000); bulletproofTimer.textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0'); },250); }

  function triggerShatter(){ if(state.shatterActive)return; state.shatterActive=true; state.surge.pendingHits=0; state.surge.active=false; updateSurgeUI(); playSound('shatter'); triggerScreenShake(1); const lines=[],cx=CFG.canvasWidth/2,cy=CFG.canvasHeight*.42,n=Math.round(rand(6,9)); for(let i=0;i<n;i++) lines.push(buildJaggedLine(cx,cy,(Math.PI*2*i)/n+rand(-.2,.2),rand(160,320),5)); state.shatterBurst={startedAt:nowMs(),duration:700,lines}; shatterOverlay.classList.remove('hidden'); setTimeout(()=>shatterOverlay.classList.add('hidden'),1500); setTimeout(resetGlass,CFG.autoResetAfterShatterMs); }
  function resetGlass(){ state.cracks=[]; state.tags.forEach(t=>t.el.remove()); state.tags=[]; state.integrity=100; state.shatterActive=false; state.shatterBurst=null; state.sweep=null; state.surge={pendingHits:0,totalQueued:0,processed:0,platform:null,hubs:[],nextHitAt:0,lastSoundAt:0,active:false}; updateSurgeUI(); updateIntegrityUI(); }

  let shakeHandle=null; function triggerScreenShake(intensity){ const amp=6*clamp(intensity,0,1), start=nowMs(), dur=260; if(shakeHandle)cancelAnimationFrame(shakeHandle); function step(){ const t=(nowMs()-start)/dur; if(t>=1){stage.style.transform=stage.dataset.baseTransform||''; return;} stage.style.transform=`${stage.dataset.baseTransform||''} translate(${(Math.random()*2-1)*amp*(1-t)}px,${(Math.random()*2-1)*amp*(1-t)}px)`; shakeHandle=requestAnimationFrame(step); } step(); }
  let audioCtx=null; function getAudioCtx(){ if(!audioCtx){ const AC=window.AudioContext||window.webkitAudioContext; audioCtx=new AC(); } return audioCtx; }
  function tone(ac,{freq,start,duration,type='sine',gainStart=.3,gainEnd=.0001}){ const osc=ac.createOscillator(), gain=ac.createGain(); osc.type=type; osc.frequency.setValueAtTime(freq,start); gain.gain.setValueAtTime(gainStart,start); gain.gain.exponentialRampToValueAtTime(gainEnd,start+duration); osc.connect(gain); gain.connect(ac.destination); osc.start(start); osc.stop(start+duration+.02); }
  function noiseBurst(ac,{start,duration,gainStart=.2}){ const len=Math.floor(ac.sampleRate*duration), b=ac.createBuffer(1,len,ac.sampleRate), d=b.getChannelData(0); for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len); const src=ac.createBufferSource(), gain=ac.createGain(); src.buffer=b; gain.gain.setValueAtTime(gainStart,start); gain.gain.exponentialRampToValueAtTime(.0001,start+duration); src.connect(gain); gain.connect(ac.destination); src.start(start); }
  function playSound(name){ if(!CFG.soundEnabled)return; try{ const ac=getAudioCtx(); if(ac.state==='suspended')ac.resume(); const n=ac.currentTime,v=clamp(CFG.soundVolume,0,1); if(name==='join')tone(ac,{freq:rand(1400,1800),start:n,duration:.075,type:'triangle',gainStart:.42*v}); else if(name==='repair'){tone(ac,{freq:700,start:n,duration:.18,gainStart:.3*v});tone(ac,{freq:1400,start:n+.08,duration:.22,gainStart:.25*v});} else if(name==='bulletproof'){tone(ac,{freq:2000,start:n,duration:.05,type:'square',gainStart:.22*v});tone(ac,{freq:2600,start:n+.05,duration:.06,type:'square',gainStart:.18*v});} else if(name==='deflect')tone(ac,{freq:2200,start:n,duration:.05,type:'square',gainStart:.25*v}); else if(name==='shatter'){noiseBurst(ac,{start:n,duration:.35,gainStart:.36*v});tone(ac,{freq:400,start:n,duration:.3,type:'sawtooth',gainStart:.22*v});} }catch(e){} }

  function handleViewerJoin(e){ state.lastEventLabel=`viewer_join(${e.username||'anon'})`; const dmg=joinDamage(); if(state.bulletproof){ const p=pickPlacement(); createDeflectStar(p.x,p.y); showImpactTag({text:e.username?`@${e.username} deflected`:'viewer hit deflected',x:p.x,y:p.y}); playSound('deflect'); applyDamage(dmg); return; } createSurgeHubs(1,e.platform); const hub=pickSurgeHub(); createHubBranch({hub,severity:rand(.12,.42)}); playSound('join'); showImpactTag({text:e.username?`@${e.username} cracked it`:'a viewer cracked it',x:hub.x+rand(-18,18),y:hub.y+rand(-18,18)}); if(e.username)updateRecentHitters(e.username); applyDamage(dmg); }
  function handleViewerDelta(e){ const delta=Math.max(1,e.delta||1); state.lastEventLabel=`viewer_delta(+${delta}, ${e.platform})`; if(e.platform&&e.currentViewers!=null){ state.lastViewerCounts[e.platform]=e.currentViewers; updateViewerCountBadge(e.currentViewers); } enqueueViewerSurge(e); }
  function handleViewerNameReveal(e){ const u=e.username||e.displayName; if(!u)return; state.lastEventLabel=`viewer_name_reveal(${u})`; updateRecentHitters(u); const p=pickPlacement(); showImpactTag({text:`@${u} joined the glass`,x:p.x,y:p.y}); }
  function resolveGiftTier(coins){ let m=CFG.giftRepairTiers[0]; CFG.giftRepairTiers.forEach(t=>{if(coins>=t.minCoins)m=t;}); return m; }
  function handleGift(e){ const coins=e.coins||0,t=resolveGiftTier(coins),p=pickPlacement(); state.lastEventLabel=`gift(${e.username||'anon'}, ${coins}c, ${t.name})`; playSound(t.effect==='bulletproof_mode'?'bulletproof':'repair'); if(t.effect==='bulletproof_mode'){ showImpactTag({text:e.username?`@${e.username} activated bulletproof`:'bulletproof activated',x:p.x,y:p.y,kind:'repair'}); activateBulletproof(CFG.bulletproofDurationMs); if(e.username)updateRecentRepairers(e.username); return; } repairGlass(t.repairAmount,t.effect); const copy={seal_one_crack:'sealed a crack',seal_recent_cracks:'patched the glass',repair_sweep:'swept a repair',major_repair:'repaired it',full_wipe:'fully wiped it'}; showImpactTag({text:e.username?`@${e.username} ${copy[t.effect]||'repaired it'}`:`A gift ${copy[t.effect]||'repaired it'}`,x:p.x,y:p.y,kind:'repair'}); if(e.username)updateRecentRepairers(e.username); }
  function updateViewerCountBadge(count){ viewerCountValue.textContent=count; }
  function handleIncomingEvent(e){ if(!e||!e.type)return; const live=['viewer_join','viewer_delta','viewer_name_reveal','gift'].includes(e.type); if(!state.autoMode&&live&&e.source!=='manual')return; if(e.type==='viewer_join')handleViewerJoin(e); else if(e.type==='viewer_delta')handleViewerDelta(e); else if(e.type==='viewer_name_reveal')handleViewerNameReveal(e); else if(e.type==='gift')handleGift(e); else if(e.type==='command')handleCommand(e.command); }
  function handleCommand(c){ state.lastEventLabel=`command(${c})`; if(c==='reset_glass')resetGlass(); else if(c==='force_shatter')triggerShatter(); else if(c==='activate_bulletproof')activateBulletproof(CFG.bulletproofDurationMs); else if(c==='break_small')handleViewerJoin({type:'viewer_join',platform:'manual',username:null,source:'manual'}); else if(c==='break_big')simulateDelta(50,'manual'); else if(c==='repair_small')handleGift({type:'gift',platform:'manual',username:null,coins:75,source:'manual'}); else if(c==='repair_big')handleGift({type:'gift',platform:'manual',username:null,coins:6000,source:'manual'}); }

  function connectWebSocket(){ if(!CFG.websocketEnabled){state.wsStatus='disabled';return;} try{ const ws=new WebSocket(CFG.websocketUrl); state.wsStatus='connecting'; ws.onopen=()=>state.wsStatus='connected'; ws.onclose=()=>{state.wsStatus='disconnected'; setTimeout(connectWebSocket,CFG.websocketReconnectMs);}; ws.onerror=()=>state.wsStatus='error'; ws.onmessage=m=>{try{handleIncomingEvent(JSON.parse(m.data));}catch(e){}}; }catch(e){state.wsStatus='error'; setTimeout(connectWebSocket,CFG.websocketReconnectMs);} }
  const gifts=new Map(); function dupe(sig){ const n=nowMs(); for(const [k,t] of gifts){if(n-t>1800)gifts.delete(k);} if(gifts.has(sig))return true; gifts.set(sig,n); return false; }
  const platformFromShortCode=p=>p==='tt'?'tiktok':p==='yt'?'youtube':undefined;
  function handleMilkEvent(p){ if(!p||!p.type||!state.autoMode)return; if(p.type==='join')handleViewerJoin({type:'viewer_join',platform:platformFromShortCode(p.platform),username:p.username||null}); else if(p.type==='tiktok_gift'){ const u=p.username||p.gifterKey||null, coins=p.coins||0, sig=`tiktok:${p.eventId||p.msgId||u+':'+(p.giftName||'gift')+':'+coins}`; if(!dupe(sig))handleGift({type:'gift',platform:'tiktok',username:u,giftName:p.giftName,coins}); } else if(p.type==='yt_superchat'){ const u=p.gifterKey||null, coins=Math.round((p.dollars||0)*100), giftName=p.isJewels?'Jewels':'Superchat', sig=`youtube:${p.eventId||p.msgId||u+':'+giftName+':'+coins}`; if(!dupe(sig))handleGift({type:'gift',platform:'youtube',username:u,giftName,coins}); } }
  function coinsFromGiftAlert(type, amount){ if(type==='tiktok_coins')return amount; if(type==='youtube_jewels')return amount*.5; return amount*100; }
  function handleGiftAlert(p){ if(!p||!state.autoMode)return; const coins=Math.round(coinsFromGiftAlert(p.type,p.amount||0)); if(coins<=0)return; const platform=p.platform==='tiktok'?'tiktok':p.platform==='youtube'?'youtube':undefined, username=p.name&&p.name!=='Anonymous'?p.name:null, giftName=p.giftTitle||p.giftLabel||undefined, sig=`${platform||'other'}:${p.eventId||p.id||p.msgId||username+':'+(giftName||'gift')+':'+coins}`; if(!dupe(sig))handleGift({type:'gift',platform,username,giftName,coins}); }
  function handleAblyViewerCount(p){ if(!p||p.count==null)return; const platform=p.platform==='tiktok'?'tiktok':p.platform==='youtube'?'youtube':null; if(!platform)return; const prev=state.lastViewerCounts[platform]; updateViewerCountBadge(p.count); if(!state.autoMode||prev==null){state.lastViewerCounts[platform]=p.count; return;} const delta=p.count-prev; if(delta>0)handleViewerDelta({type:'viewer_delta',platform,delta,currentViewers:p.count,timestamp:Date.now()}); else state.lastViewerCounts[platform]=p.count; }
  function handleAblyCommand(p){ if(!p||!p.command)return; if(p.command==='set_auto'){state.autoMode=!!p.value; return;} handleCommand(p.command); }
  function applyLayoutMessage(p){ if(!p)return; if(p.positions){ Object.keys(p.positions).forEach(id=>{ const pos=p.positions[id], el=document.querySelector(`[data-layout-id="${id}"]`); if(el&&pos){el.style.setProperty('--cg-ox',`${pos.x||0}px`); el.style.setProperty('--cg-oy',`${pos.y||0}px`); if(pos.scale!=null)el.style.setProperty('--cg-scale',`${clamp(pos.scale,.35,2.5)}`);} }); } if(p.cardScale!=null&&controlCard)controlCard.style.setProperty('--cg-scale',`${clamp(p.cardScale,.35,2.5)}`); if(p.crackScale!=null)state.crackScale=clamp(p.crackScale,.3,3); if(p.damageMultiplier!=null){state.damageMultiplier=clamp(p.damageMultiplier,.2,5); updateIntegrityUI();} }
  function announceAlive(){ if(state.ablyChannel)state.ablyChannel.publish('crowd-glass-alive',{}).catch(()=>{}); }
  function connectAbly(){ if(!CFG.ablyEnabled||typeof Ably==='undefined'){state.ablyStatus='disabled';return;} try{ const ably=new Ably.Realtime({key:CFG.ablyKey}), ch=ably.channels.get(CFG.ablyChannel); state.ably=ably; state.ablyChannel=ch; state.ablyStatus='connecting'; ch.subscribe('milk-event',m=>handleMilkEvent(m.data)); ch.subscribe('gift-alert',m=>handleGiftAlert(m.data)); ch.subscribe('crowd-glass-viewer-count',m=>handleAblyViewerCount(m.data)); ch.subscribe('crowd-glass-cmd',m=>handleAblyCommand(m.data)); ch.subscribe('crowd-glass-layout',m=>applyLayoutMessage(m.data)); ch.subscribe('crowd-glass-ping',()=>announceAlive()); ably.connection.on(sc=>state.ablyStatus=sc.current); ably.connection.once('connected',()=>{announceAlive(); setInterval(announceAlive,10000);}); }catch(e){state.ablyStatus='error';} }

  function updateDebugPanel(){ if(!state.debug)return; dbgIntegrity.textContent=Math.round(state.integrity); dbgCracks.textContent=activeCrackCount(); if(dbgSurge)dbgSurge.textContent=`${state.surge.pendingHits} pending / ${state.surge.processed}-${state.surge.totalQueued}`; dbgBulletproof.textContent=state.bulletproof?'on':'off'; dbgLastEvent.textContent=state.lastEventLabel; dbgWsStatus.textContent=state.wsStatus; if(dbgAblyStatus)dbgAblyStatus.textContent=`${state.ablyStatus} / ${state.autoMode?'auto':'manual'}`; }
  function render(){ const now=nowMs(); processSurgeQueue(now); ctx.clearRect(0,0,CFG.canvasWidth,CFG.canvasHeight); state.cracks=state.cracks.filter(c=>c.isStar?drawDeflectStar(c,now):drawCrack(c,now)); drawSweep(now); drawShatterBurst(now); updateDebugPanel(); requestAnimationFrame(render); }
  const users=['jessica23','mike','sarah96','tyler_live','jamieplays','biggifter','sam']; let userCursor=0; const nextUser=()=>users[userCursor++%users.length]; function simulateDelta(delta,platform){ const cur=(state.lastViewerCounts[platform]||500)+delta; handleViewerDelta({type:'viewer_delta',platform,delta,currentViewers:cur,source:'manual'}); }
  window.addEventListener('keydown',e=>{ if(e.repeat)return; const k=e.key.toLowerCase(); if(k==='j')handleViewerJoin({type:'viewer_join',platform:'tiktok',username:nextUser(),source:'manual'}); else if(k==='y')simulateDelta(1,'youtube'); else if(k==='1')simulateDelta(10,'tiktok'); else if(k==='2')simulateDelta(50,'tiktok'); else if(k==='3')simulateDelta(150,'youtube'); else if(k==='4')simulateDelta(400,'youtube'); else if(k==='g')handleGift({type:'gift',platform:'tiktok',username:nextUser(),giftName:'Rose',coins:75,source:'manual'}); else if(k==='b')handleGift({type:'gift',platform:'tiktok',username:nextUser(),giftName:'Lion',coins:6000,source:'manual'}); else if(k==='m')handleGift({type:'gift',platform:'tiktok',username:nextUser(),giftName:'Universe',coins:10000,source:'manual'}); else if(k==='s')triggerShatter(); else if(k==='r')resetGlass(); else if(k==='d'){state.debug=!state.debug; debugPanel.classList.toggle('hidden',!state.debug);} else if(k==='a'){state.autoMode=!state.autoMode; state.lastEventLabel=`local toggle: ${state.autoMode?'auto':'manual'}`;} });
  function fitStage(){ const iw=window.innerWidth, ih=window.innerHeight, scale=Math.min(iw/CFG.canvasWidth, ih/CFG.canvasHeight); if(!isFinite(scale)||scale<=0)return; const x=(iw-CFG.canvasWidth*scale)/2, y=(ih-CFG.canvasHeight*scale)/2, base=`translate(${x}px, ${y}px) scale(${scale})`; stage.dataset.baseTransform=base; stage.style.transform=base; }
  window.addEventListener('resize',fitStage); fitStage(); updateIntegrityUI(); updateSurgeUI(); connectWebSocket(); connectAbly(); requestAnimationFrame(render);
  window.CrowdGlass={state,resetGlass,triggerShatter,activateBulletproof,handleIncomingEvent,render,handleMilkEvent,handleGiftAlert,handleAblyViewerCount,applyLayoutMessage,handleAblyCommand};
})();
