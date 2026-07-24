/*
  jjx-core.js — shared foundation for JJxLive overlays & control pages.

  Extracted from the Follow Meter pair (the fifth hand-copy of these patterns);
  every overlay/control pair migrates onto this opportunistically when touched.
  Plain script, no modules, no build step: works from GitHub Pages and file://.
  Exposes ONE global: window.JJX.

  Reference it with a version query and bump it on every change, or TikTok
  Studio's browser-source cache can serve a stale copy against new page code:
      <script src="jjx-core.js?v=3"></script>

  What lives here (and why):
  - deepMerge / clone            config merging, identical semantics everywhere
  - createSender/createReceiver  the three-transport command bus
      (BroadcastChannel + localStorage for same-profile pages, mirrored by Ably
      for the isolated TikTok Studio/OBS browser source — one _mid per send,
      receivers dedupe so a command never fires twice)
  - createAssetSender/Receiver   chunked gif/audio transfer over Ably
      (dataURLs exceed Ably's per-message cap; localStorage can't cross browser
      engines — this is the production delivery path for uploaded media)
  - parseGIF / playGifOnce       play-once GIF rendering
      (a native <img> obeys the file's own loop count forever; this decodes and
      plays each frame exactly once on a canvas, freezing on the last frame)
  - isMirror                     ?mirror=1 detection for muted in-control previews
*/
(function () {
  'use strict';

  // Shared Ably key. NOTE: full-capability key, present in public files — the
  // plan of record is to swap overlays to a subscribe-only key once the
  // Producer Dock owns all publishing. Keep every consumer on this one constant
  // so that swap is a one-line change.
  var ABLY_KEY = '***ABLY_KEY_REMOVED***';
  var ABLY_MAIN_CHANNEL = 'splat-overlay';

  /* ── config helpers ─────────────────────────────────────────────── */

  function deepMerge(base, extra) {
    if (extra === null || typeof extra !== 'object' || Array.isArray(extra)) return base;
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    for (var i = 0, keys = Object.keys(extra); i < keys.length; i++) {
      var k = keys[i];
      var bv = out[k], ev = extra[k];
      if (bv && ev && typeof bv === 'object' && typeof ev === 'object' && !Array.isArray(bv) && !Array.isArray(ev)) {
        out[k] = deepMerge(bv, ev);
      } else if (ev !== undefined) {
        out[k] = ev;
      }
    }
    return out;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function newMid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  /* ── three-transport command bus ────────────────────────────────── */

  /*
    Control side. Every send() fires over BroadcastChannel + localStorage
    (instant, same browser profile — reaches a local overlay tab and the
    mirror iframe) and, unless opts.skipAbly, over Ably (reaches the isolated
    TikTok Studio/OBS browser source). getAblyChannel is a function so the
    channel can attach after connect without re-creating the sender.
  */
  function createSender(opts) {
    var bc = null;
    try { bc = new BroadcastChannel(opts.bcName); } catch (e) {}
    return function send(msg, sendOpts) {
      sendOpts = sendOpts || {};
      if (msg && typeof msg === 'object') msg._mid = newMid();
      try { if (bc) bc.postMessage(msg); } catch (e) {}
      if (!sendOpts.skipAbly) {
        try {
          var ch = opts.getAblyChannel && opts.getAblyChannel();
          if (ch) ch.publish(opts.ablyEventName, msg).catch(function () {});
        } catch (e) {}
      }
      try { localStorage.setItem(opts.lsMsgKey, JSON.stringify({ n: Math.random(), p: msg })); } catch (e) {}
    };
  }

  /*
    Overlay side. Wires BroadcastChannel + the storage event to `handler` and
    returns the dispatch function so the page can ALSO route its Ably
    subscription through the same dedupe:
        ch.subscribe('my-cmd', function (m) { dispatch(m.data); });
    A command that arrives on more than one transport fires exactly once.
  */
  function createReceiver(opts) {
    var seen = new Set();
    function dispatch(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg._mid) {
        if (seen.has(msg._mid)) return;
        seen.add(msg._mid);
        if (seen.size > 200) seen.clear();
      }
      opts.handler(msg);
    }
    try {
      var bc = new BroadcastChannel(opts.bcName);
      bc.onmessage = function (e) { dispatch(e.data); };
    } catch (e) {}
    window.addEventListener('storage', function (e) {
      if (e.key === opts.lsMsgKey && e.newValue) {
        try {
          var w = JSON.parse(e.newValue);
          if (w.p) dispatch(w.p);
        } catch (err) {}
      }
    });
    return dispatch;
  }

  /* ── chunked asset transfer (gif/audio over Ably) ───────────────── */

  /*
    Control side. All sends run through one queue/worker so "resend all"
    pushes chunks out one asset at a time instead of several parallel publish
    loops (which could spike past Ably's per-second rate limit). One-time cost
    per upload — never a per-event expense.
  */
  function createAssetSender(opts) {
    var chunkChars = opts.chunkChars || 12000; // ~12KB/message, under Ably's cap
    var delayMs = opts.delayMs || 20;
    var onStatus = opts.onStatus || function () {};
    var seq = 0;
    var queue = [];
    var busy = false;

    function pump() {
      if (busy || !queue.length) return;
      var ch = opts.getChannel && opts.getChannel();
      if (!ch) { onStatus('not connected — reconnect and try again'); return; }
      busy = true;
      var job = queue.shift();
      var assetId = job.slot + '-' + job.kind + '-' + Date.now() + '-' + (++seq);
      var total = Math.ceil(job.dataURL.length / chunkChars);
      var idx = 0;
      onStatus('sending ' + job.kind + ' to overlay… 0/' + total);
      (function sendNext() {
        if (idx >= total) {
          onStatus('✓ ' + job.kind + ' sent to overlay');
          busy = false;
          if (queue.length) pump(); else setTimeout(function () { onStatus('—'); }, 2500);
          return;
        }
        var chunk = job.dataURL.slice(idx * chunkChars, (idx + 1) * chunkChars);
        ch.publish('chunk', {
          assetId: assetId, slot: job.slot, kind: job.kind, mime: job.mime,
          idx: idx, total: total, chunk: chunk,
        }).catch(function () {});
        idx++;
        onStatus('sending ' + job.kind + ' to overlay… ' + idx + '/' + total);
        setTimeout(sendNext, delayMs);
      })();
    }

    return {
      send: function (slot, kind, mime, dataURL) {
        queue.push({ slot: slot, kind: kind, mime: mime, dataURL: dataURL });
        pump();
      },
      clear: function (slot, kind) {
        var ch = opts.getChannel && opts.getChannel();
        if (ch) ch.publish('chunk', { assetId: 'clear-' + Date.now(), slot: slot, kind: kind, clear: true }).catch(function () {});
      },
    };
  }

  /*
    Overlay side. Reassembles numbered chunks by assetId and calls
    onAsset({slot, kind, mime, dataURL}) — dataURL null on a clear command.
    isValid(slot, kind) rejects anything the page doesn't recognize.
  */
  function createAssetReceiver(opts) {
    var buffers = new Map(); // assetId -> { slot, kind, mime, total, parts: Map(idx->str) }
    return function handleChunk(d) {
      if (!d || !d.assetId) return;
      if (d.clear) { opts.onAsset({ slot: d.slot, kind: d.kind, mime: null, dataURL: null }); return; }
      if (opts.isValid && !opts.isValid(d.slot, d.kind)) return;
      var buf = buffers.get(d.assetId);
      if (!buf) {
        buf = { slot: d.slot, kind: d.kind, mime: d.mime, total: d.total, parts: new Map() };
        buffers.set(d.assetId, buf);
      }
      buf.parts.set(d.idx, d.chunk);
      if (buf.parts.size < buf.total) return;
      var dataURL = '';
      for (var i = 0; i < buf.total; i++) dataURL += buf.parts.get(i) || '';
      buffers.delete(d.assetId);
      opts.onAsset({ slot: buf.slot, kind: buf.kind, mime: buf.mime, dataURL: dataURL });
    };
  }

  /* ── GIF decoder / play-once player ─────────────────────────────── */
  // Standard GIF87a/89a + LZW. Self-contained on purpose: a CDN dependency
  // fetched at stream time is a single point of failure overlays can't afford
  // (and the obvious npm option ships no browser-loadable build anyway).

  function decodeLZW(bytes, minCodeSize, pixelCount) {
    var clearCode = 1 << minCodeSize;
    var endCode = clearCode + 1;
    var codeSize, dict, nextCode;
    function resetDict() {
      dict = [];
      for (var i = 0; i < clearCode; i++) dict[i] = [i];
      nextCode = endCode + 1;
      codeSize = minCodeSize + 1;
    }
    resetDict();
    var bitBuffer = 0, bitCount = 0, bytePos = 0;
    function readCode() {
      while (bitCount < codeSize) {
        if (bytePos >= bytes.length) return endCode;
        bitBuffer |= (bytes[bytePos++] << bitCount);
        bitCount += 8;
      }
      var code = bitBuffer & ((1 << codeSize) - 1);
      bitBuffer >>= codeSize;
      bitCount -= codeSize;
      return code;
    }
    var output = [];
    var prev = null;
    var code = readCode();
    while (code !== endCode && output.length < pixelCount + 8) {
      if (code === clearCode) {
        resetDict(); prev = null;
        code = readCode();
        if (code === endCode) break;
        output.push.apply(output, dict[code]); prev = dict[code];
        code = readCode();
        continue;
      }
      var entry;
      if (code < dict.length && dict[code]) entry = dict[code];
      else if (code === nextCode && prev) entry = prev.concat([prev[0]]);
      else break; // corrupt stream
      output.push.apply(output, entry);
      if (prev) {
        dict[nextCode] = prev.concat([entry[0]]);
        nextCode++;
        if (nextCode >= (1 << codeSize) && codeSize < 12) codeSize++;
      }
      prev = entry;
      code = readCode();
    }
    return output.slice(0, pixelCount);
  }

  function parseGIF(buffer) {
    var data = new Uint8Array(buffer);
    var pos = 6; // skip "GIF87a"/"GIF89a" signature
    function u8() { return data[pos++]; }
    function u16() { var v = data[pos] | (data[pos + 1] << 8); pos += 2; return v; }
    function readSubBlocks() {
      var bytes = [];
      var size;
      while ((size = u8()) !== 0) { for (var i = 0; i < size; i++) bytes.push(u8()); }
      return bytes;
    }
    function readColorTable(count) {
      var table = [];
      for (var i = 0; i < count; i++) table.push([u8(), u8(), u8()]);
      return table;
    }
    var width = u16(), height = u16();
    var packed = u8();
    var gctFlag = !!(packed & 0x80);
    var gctSize = gctFlag ? (2 << (packed & 0x07)) : 0;
    u8(); u8(); // bg color index, pixel aspect ratio — unused
    var gct = gctFlag ? readColorTable(gctSize) : null;
    var frames = [];
    var gceDelay = 10, gceDisposal = 0, gceTransparentFlag = false, gceTransparentIndex = -1;
    while (pos < data.length) {
      var blockType = u8();
      if (blockType === 0x21) { // extension
        var label = u8();
        if (label === 0xF9) { // graphic control extension
          u8(); // block size (always 4)
          var p = u8();
          gceDisposal = (p >> 2) & 0x07;
          gceTransparentFlag = !!(p & 0x01);
          gceDelay = u16();
          gceTransparentIndex = u8();
          u8(); // terminator
        } else {
          readSubBlocks(); // comment / plain text / application ext — not needed
        }
      } else if (blockType === 0x2C) { // image descriptor
        var left = u16(), top = u16(), w = u16(), h = u16();
        var p2 = u8();
        var lctFlag = !!(p2 & 0x80);
        var lctSize = lctFlag ? (2 << (p2 & 0x07)) : 0;
        var lct = lctFlag ? readColorTable(lctSize) : null;
        var minCodeSize = u8();
        var lzwBytes = readSubBlocks();
        var indices = decodeLZW(lzwBytes, minCodeSize, w * h);
        frames.push({
          left: left, top: top, width: w, height: h,
          colorTable: lct || gct, indices: indices,
          delay: gceDelay * 10, // centiseconds → ms
          disposal: gceDisposal,
          transparentIndex: gceTransparentFlag ? gceTransparentIndex : -1,
        });
        gceDelay = 10; gceDisposal = 0; gceTransparentFlag = false; gceTransparentIndex = -1;
      } else {
        break; // trailer (0x3B) or corrupt data — stop either way
      }
    }
    return { width: width, height: height, gct: gct, frames: frames };
  }

  // Plays every frame exactly once onto `canvas`, honoring each frame's own
  // disposal method, then freezes on the last frame (the final frame's own
  // disposal is skipped so it doesn't clear itself right after finishing).
  // Returns a stop() to cancel a still-running player early.
  function playGifOnce(canvas, gif) {
    var w = gif.width, h = gif.height;
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    var back = document.createElement('canvas');
    back.width = w; back.height = h;
    var bctx = back.getContext('2d');
    var i = 0, stopped = false, prevSnapshot = null;
    function drawFrameToBack(frame) {
      var imgData = bctx.createImageData(frame.width, frame.height);
      var ct = frame.colorTable || [];
      for (var p = 0; p < frame.indices.length; p++) {
        var idx = frame.indices[p];
        var rgb = ct[idx] || [0, 0, 0];
        var o = p * 4;
        if (idx === frame.transparentIndex) {
          imgData.data[o + 3] = 0;
        } else {
          imgData.data[o] = rgb[0]; imgData.data[o + 1] = rgb[1];
          imgData.data[o + 2] = rgb[2]; imgData.data[o + 3] = 255;
        }
      }
      var tmp = document.createElement('canvas');
      tmp.width = frame.width; tmp.height = frame.height;
      tmp.getContext('2d').putImageData(imgData, 0, 0);
      bctx.drawImage(tmp, frame.left, frame.top); // source-over keeps alpha=0 pixels
    }
    function renderFrame() {
      if (stopped || i >= gif.frames.length) return;
      var frame = gif.frames[i];
      if (frame.disposal === 3 && prevSnapshot === null) prevSnapshot = bctx.getImageData(0, 0, w, h);
      drawFrameToBack(frame);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(back, 0, 0);
      i++;
      var isLast = i >= gif.frames.length;
      setTimeout(function () {
        if (!isLast) {
          if (frame.disposal === 2) bctx.clearRect(frame.left, frame.top, frame.width, frame.height);
          else if (frame.disposal === 3 && prevSnapshot) { bctx.putImageData(prevSnapshot, 0, 0); prevSnapshot = null; }
        }
        renderFrame();
      }, Math.max(20, frame.delay || 100));
    }
    renderFrame();
    return function stop() { stopped = true; };
  }

  /* ── misc ───────────────────────────────────────────────────────── */

  /*
    Reads a setting from either the query string or the hash. Both are checked for
    the same reason isMirror() checks both: static hosts with clean-URL redirects
    (like `serve`) drop the query string, but a fragment always survives — so
    `?dock=http://…` silently becomes "use the default port" while `#dock=…` holds.
    Getting this wrong points a page at the WRONG dock rather than failing loudly.
  */
  function param(name) {
    var q = new URLSearchParams(location.search).get(name);
    if (q) return q;
    var m = location.hash.match(new RegExp('[#&]' + name + '=([^&]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  /*
    Where the Producer Dock lives, for pages that read config/media from it.
    Explicit ?dock=/#dock= always wins. Otherwise a page already served from a
    LOCAL origin is being served by the dock itself, so it talks to that same
    origin (which also makes its writes same-origin — no CORS at all). A page
    served from anywhere else is on public hosting and must reach the dock at the
    default local address.

    Detection is by ORIGIN, deliberately not by path: GitHub Pages serves this
    project at jjxlive-repo.github.io/overlays/, so a "/overlays/ means the dock
    is serving us" rule matches there too and points the live overlay at GitHub —
    where /overlay-public/… is a 404, leaving it with no config and no media.
  */
  function dockBase(fallback) {
    var explicit = param('dock');
    if (explicit) return explicit.replace(/\/$/, '');
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(location.origin)) return location.origin;
    return (fallback || 'http://127.0.0.1:4317').replace(/\/$/, '');
  }

  /*
    OVERLAY EVENT BUS — live events over the Producer Dock's local WebSocket, with
    Ably as an automatic fallback.

    Why: every overlay used to subscribe to Ably directly, so a single comment, like,
    follow or gift cost a metered message PER OVERLAY watching. The dock already
    produces all of those events (it is the bridge that publishes them), so taking
    them straight off a loopback socket costs nothing and arrives sooner — the Ably
    path is batched on a flush timer, this is not.

    Fallback is not optional. The socket depends on the overlay's browser being
    allowed to reach 127.0.0.1, and Chrome's Private Network Access rules are
    tightening — if that is ever refused, an overlay with no fallback goes silent
    mid-stream with nothing on screen to say why. So: try the socket, and if it
    cannot connect (or drops and cannot be regained) fall back to Ably.

    Usage mirrors an Ably subscription, so migrating an overlay is a one-line swap:
        var bus = JJX.createOverlayBus({ ably: ablyClient });   // ably optional
        bus.on('splat-chat', 'milk-event', function (d) { … });
  */
  function createOverlayBus(opts) {
    opts = opts || {};
    var base = (opts.dockBase || dockBase()).replace(/^http/, 'ws');
    var handlers = {};           // "channel/name" -> [fn]
    var ws = null;
    var usingAbly = false;
    var ablyChannels = {};
    var retries = 0;
    var closed = false;
    var onStatus = opts.onStatus || function () {};

    function key(channel, name) { return channel + '/' + name; }

    function emit(channel, name, data) {
      var list = handlers[key(channel, name)];
      if (!list) return;
      for (var i = 0; i < list.length; i++) {
        try { list[i](data); } catch (e) { /* one bad handler must not kill the feed */ }
      }
    }

    // Ably is only touched when the socket cannot serve us, so a healthy dock means
    // zero Ably messages. Subscriptions are attached lazily and per channel.
    function fallbackToAbly(why) {
      if (usingAbly || !opts.ably) { onStatus('socket-down', why); return; }
      usingAbly = true;
      onStatus('ably-fallback', why);
      Object.keys(handlers).forEach(function (k) {
        var parts = k.split('/');
        subscribeAbly(parts[0], parts.slice(1).join('/'));
      });
    }

    function subscribeAbly(channel, name) {
      if (!opts.ably) return;
      try {
        var ch = ablyChannels[channel] || (ablyChannels[channel] = opts.ably.channels.get(channel));
        ch.subscribe(name, function (m) { emit(channel, name, m.data); });
      } catch (e) { /* Ably unavailable too — nothing further we can do */ }
    }

    function connect() {
      if (closed) return;
      try {
        ws = new WebSocket(base + '/overlay-ws');
      } catch (e) {
        fallbackToAbly('websocket constructor threw');
        return;
      }
      ws.onopen = function () {
        retries = 0;
        // Reaching the dock again after a fallback does NOT tear the Ably
        // subscriptions down: they would then deliver the same event twice.
        // Ably-mode is sticky until reload; the socket simply idles.
        onStatus(usingAbly ? 'socket-up-but-ably-sticky' : 'socket', '');
      };
      ws.onmessage = function (ev) {
        var msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (!msg || msg.channel === '_meta') return;
        if (usingAbly) return;   // Ably owns delivery now — ignore, don't double-fire
        emit(msg.channel, msg.name, msg.data);
      };
      ws.onerror = function () { /* onclose always follows; handle it there */ };
      ws.onclose = function () {
        if (closed) return;
        retries++;
        // Fast on purpose: every second spent retrying is a second of alerts not
        // firing on a live stream. Three quick tries (~3.5s total, plus whatever the
        // connection attempts themselves cost) cover a dock restart; past that,
        // assume the socket isn't coming back and switch to Ably rather than keep
        // a dark overlay hoping.
        if (retries <= 3) setTimeout(connect, 500 * retries);
        else fallbackToAbly('socket unavailable after ' + retries + ' attempts');
      };
    }

    connect();

    return {
      on: function (channel, name, fn) {
        var k = key(channel, name);
        (handlers[k] || (handlers[k] = [])).push(fn);
        if (usingAbly) subscribeAbly(channel, name);
        return this;
      },
      isUsingAbly: function () { return usingAbly; },
      close: function () { closed = true; try { if (ws) ws.close(); } catch (e) {} },
    };
  }

  /*
    DOCK REALTIME — a drop-in replacement for `new Ably.Realtime({key})` that speaks
    the same API but carries everything over the Producer Dock's local WebSocket.

        const ably = JJX.dockRealtime({ fallbackKey: ABLY_KEY });

    Every existing call site keeps working unchanged: channels.get(x).publish(),
    .subscribe(), .attach(), .detach(), connection.on('connected'|'disconnected'|
    'failed'|'suspended'), .close(). That matters because the pages being migrated
    have ~140 publish and ~80 subscribe sites between them — rewriting each one by
    hand would be a far bigger diff, and a far bigger chance of breaking a stream.

    Subscribe callbacks receive {data}, the Ably message shape, because that is what
    every existing handler destructures.

    Ably stays as an automatic fallback (pass fallbackKey): if the socket cannot be
    reached, a real Ably client is constructed and every registered subscription is
    replayed onto it, so an overlay degrades instead of going dark. Once in fallback
    it stays there until reload — flipping back mid-stream would double-deliver
    anything both transports carry.
  */
  function dockRealtime(opts) {
    opts = opts || {};
    var httpBase = (opts.dockBase || dockBase()).replace(/\/$/, '');
    var wsUrl = httpBase.replace(/^http/, 'ws') + '/overlay-ws';
    var subs = [];                 // {channel, event, cb}
    var connListeners = { connected: [], disconnected: [], failed: [], suspended: [] };
    var ws = null, retries = 0, closed = false, everOpen = false;
    var realAbly = null;           // constructed only on fallback
    var realChannels = {};
    var onStatus = opts.onStatus || function () {};

    function fire(state, arg) {
      (connListeners[state] || []).forEach(function (f) { try { f(arg); } catch (e) {} });
    }

    function deliver(channel, event, data) {
      for (var i = 0; i < subs.length; i++) {
        var s = subs[i];
        if (s.channel !== channel) continue;
        if (s.event !== null && s.event !== event) continue;
        try { s.cb({ data: data, name: event }); } catch (e) {}
      }
    }

    /* ---- Ably fallback ---- */
    function goAbly(why) {
      if (realAbly || !opts.fallbackKey || typeof Ably === 'undefined') {
        onStatus('socket-down', why);
        fire('disconnected');
        return;
      }
      onStatus('ably-fallback', why);
      try {
        realAbly = new Ably.Realtime({ key: opts.fallbackKey });
        realAbly.connection.on('connected', function () { fire('connected'); });
        realAbly.connection.on('disconnected', function () { fire('disconnected'); });
        realAbly.connection.on('failed', function (e) { fire('failed', e); });
        realAbly.connection.on('suspended', function () { fire('suspended'); });
        subs.forEach(function (s) { attachRealSub(s); });
      } catch (e) {
        onStatus('socket-down', 'ably fallback failed: ' + e.message);
      }
    }
    function realChannel(name) {
      return realChannels[name] || (realChannels[name] = realAbly.channels.get(name));
    }
    function attachRealSub(s) {
      try {
        if (s.event === null) realChannel(s.channel).subscribe(s.cb);
        else realChannel(s.channel).subscribe(s.event, s.cb);
      } catch (e) {}
    }

    /* ---- socket ---- */
    function connect() {
      if (closed) return;
      try { ws = new WebSocket(wsUrl); } catch (e) { goAbly('websocket constructor threw'); return; }
      ws.onopen = function () {
        retries = 0; everOpen = true;
        if (!realAbly) { onStatus('socket', ''); fire('connected'); }
      };
      ws.onmessage = function (ev) {
        if (realAbly) return;                       // Ably owns delivery now
        var m;
        try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m || m.channel === '_meta') return;
        deliver(m.channel, m.name, m.data);
      };
      ws.onclose = function () {
        if (closed || realAbly) return;
        fire('disconnected');
        retries++;
        // Fast: every retry second is a second of a dark overlay.
        if (retries <= 3) setTimeout(connect, 500 * retries);
        else goAbly('socket unavailable after ' + retries + ' attempts');
      };
      ws.onerror = function () { /* onclose follows */ };
    }
    connect();

    function makeChannel(name) {
      return {
        name: name,
        publish: function (event, data) {
          if (realAbly) return realChannel(name).publish(event, data);
          // Ably's publish(msgObject) form isn't used by these pages, but be safe.
          if (typeof event === 'object' && event !== null) { data = event.data; event = event.name; }
          return fetch(httpBase + '/api/overlay-bus/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: name, name: event, data: data }),
          }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
          });
        },
        subscribe: function (event, cb) {
          if (typeof event === 'function') { cb = event; event = null; }
          var s = { channel: name, event: event, cb: cb };
          subs.push(s);
          if (realAbly) attachRealSub(s);
          return Promise.resolve();
        },
        unsubscribe: function () {
          subs = subs.filter(function (s) { return s.channel !== name; });
        },
        // Attach/detach were how pages avoided being billed for a channel while
        // hidden. Socket delivery is free, so they are no-ops that keep the old
        // call sites (and their .catch()) working.
        attach: function () { return Promise.resolve(); },
        detach: function () { return Promise.resolve(); },
      };
    }

    var channelCache = {};
    return {
      channels: {
        get: function (name) { return channelCache[name] || (channelCache[name] = makeChannel(name)); },
        release: function (name) { delete channelCache[name]; },
      },
      connection: {
        on: function (state, cb) {
          if (typeof state === 'function') return;      // "any state" form — unused here
          (connListeners[state] || (connListeners[state] = [])).push(cb);
          // Late listener for an already-open socket still gets its 'connected'.
          if (state === 'connected' && everOpen && !realAbly && ws && ws.readyState === 1) {
            setTimeout(function () { try { cb(); } catch (e) {} }, 0);
          }
        },
        once: function (state, cb) {
          var self = this;
          self.on(state, function once() { cb.apply(null, arguments); });
        },
        get state() { return realAbly ? realAbly.connection.state : (ws && ws.readyState === 1 ? 'connected' : 'disconnected'); },
      },
      close: function () {
        closed = true;
        try { if (ws) ws.close(); } catch (e) {}
        try { if (realAbly) realAbly.close(); } catch (e) {}
      },
      isUsingAbly: function () { return !!realAbly; },
    };
  }

  function isMirror() {
    // Both a query param and a hash: static hosts with clean-URL redirects
    // (like `serve`) drop the query string, but a fragment always survives.
    // Same dual-marker trick feed-jamie-control.html established. Missing this
    // is not cosmetic — a mirror that fails detection silently becomes a full
    // live overlay (Ably-connected, audio, double-processing real events).
    return new URLSearchParams(location.search).get('mirror') === '1'
      || location.hash.indexOf('mirror') !== -1;
  }

  window.JJX = {
    ABLY_KEY: ABLY_KEY,
    ABLY_MAIN_CHANNEL: ABLY_MAIN_CHANNEL,
    deepMerge: deepMerge,
    clone: clone,
    newMid: newMid,
    createSender: createSender,
    createReceiver: createReceiver,
    createAssetSender: createAssetSender,
    createAssetReceiver: createAssetReceiver,
    parseGIF: parseGIF,
    playGifOnce: playGifOnce,
    isMirror: isMirror,
    param: param,
    dockBase: dockBase,
    createOverlayBus: createOverlayBus,
    dockRealtime: dockRealtime,
  };
})();
