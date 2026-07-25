// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx — timeline engine. Exports (on window): Stage, Sprite,
//   TextSprite, ImageSprite, RectSprite, VideoSprite, PlaybackBar,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <Sprite start={0} end={3}>
//       <TextSprite text="Hello" x={100} y={300} size={72} color="#111" />
//     </Sprite>
//     <Sprite start={2} end={8}>
//       <ImageSprite src="hero.png" x={200} y={120} width={640} height={360} kenBurns />
//     </Sprite>
//   </Stage>
//
// Stage({width,height,duration,background,fps,loop,autoplay}) — auto-scales to
//   viewport; scrubber + play/pause + ←/→ seek + space + 0-reset; persists
//   playhead. The canvas is an <svg><foreignObject>, export-ready: Share →
//   Export → Video (or the PlaybackBar's download button) renders it to .mp4.
//   Screenshot tools DOM-rerender (not pixel-capture) and unwrap this wrapper
//   so captures should work — but if one comes back black, that's a capture
//   artifact, not a render bug; trust the live preview.
// Sprite({start,end,keepMounted}) — mounts children only while playhead is in
//   [start,end]. Children read {localTime, progress, duration} via useSprite().
// useTime() → seconds; useTimeline() → {time,duration,playing,setTime,setPlaying}.
// TextSprite({text,x,y,size,color,font,weight,align,entryDur,exitDur}) — fades/scales in+out.
// ImageSprite({src,x,y,width,height,fit,radius,kenBurns,placeholder}) — same, with optional ken-burns.
// RectSprite({x,y,width,height,color,radius}) — solid box with entry/exit.
// VideoSprite({src,start,end,speed,style}) — looped <video> clip synced to the
//   timeline; its audio is mixed into the exported video.
// Easing.{linear,easeIn/Out/InOut Quad/Cubic/Quart/Quint/Expo/Back, …}
// interpolate([t0,t1,…],[v0,v1,…],ease?) → (t)=>v  — piecewise tween.
// animate({from,to,start,end,ease}) → (t)=>v  — single tween.
//
// Build scenes by composing Sprites inside Stage. Absolutely-position elements.
//
// In a .dc.html project, put your scene in a sibling my-scene.jsx (reading
// {Stage, Sprite, useTime, Easing, …} from window is safe) and mount BOTH:
//   <x-import component-from-global-scope="MyScene"
//             from="./animations.jsx ./my-scene.jsx"></x-import>
// The two files in from= load in order, so my-scene.jsx can use the globals
// animations.jsx set.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


// ── Font inlining ───────────────────────────────────────────────────────────
// Copy every @font-face rule from the page into a <style> inside the svg's
// foreignObject, with font URLs rewritten to data: URLs. Makes the svg
// self-describing so serializing it alone (video export fast path) still
// renders with the right fonts. Sets data-om-fonts-inlined on the svg when
// done so the exporter can wait for it.

function useInlineFontsInto(svgRef) {
  React.useEffect(() => {
    const svg = svgRef.current;
    const host = svg && svg.querySelector('foreignObject > div');
    if (!svg || !host) return;
    let cancelled = false;
    (async () => {
      const rules = [];
      for (const ss of document.styleSheets) {
        let cssRules;
        try { cssRules = ss.cssRules; } catch {
          // Cross-origin sheet without crossorigin attr (e.g. the standard
          // fonts.googleapis.com <link>) — fetch the CSS text directly and
          // regex-extract the @font-face blocks.
          if (ss.href) {
            try {
              const txt = await fetch(ss.href).then(r => { if (!r.ok) throw 0; return r.text(); });
              for (const ff of (txt.match(/@font-face\s*{[^}]*}/g) || []))
                rules.push({ css: ff, base: ss.href });
            } catch {}
          }
          continue;
        }
        if (!cssRules) continue;
        for (const r of cssRules) {
          if (r.type === CSSRule.FONT_FACE_RULE) {
            rules.push({ css: r.cssText, base: ss.href || location.href });
          }
        }
      }
      const toDataURL = (url) => fetch(url)
        .then(r => { if (!r.ok) throw 0; return r.blob(); })
        .then(b => new Promise(res => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.onerror = () => res(url);
          fr.readAsDataURL(b);
        }))
        .catch(() => url);
      const parts = await Promise.all(rules.map(async ({ css, base }) => {
        const re = /url\((['"]?)([^'")]+)\1\)/g;
        let out = css, m;
        while ((m = re.exec(css))) {
          const u = m[2];
          if (u.startsWith('data:')) continue;
          let abs; try { abs = new URL(u, base).href; } catch { continue; }
          out = out.split(m[0]).join(`url("${await toDataURL(abs)}")`);
        }
        return out;
      }));
      if (cancelled || !parts.length) {
        svg.setAttribute('data-om-fonts-inlined', 'true');
        return;
      }
      const style = document.createElement('style');
      style.textContent = parts.join('\n');
      host.insertBefore(style, host.firstChild);
      svg.setAttribute('data-om-fonts-inlined', 'true');
    })();
    return () => { cancelled = true; };
  }, []);
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  // Props arrive as strings when Stage is mounted via <x-import> (DC
  // projects) — coerce so style={{width}} gets a number React can px-ify.
  width = +width || 1280; height = +height || 720;
  duration = +duration || 10; fps = +fps || 60;
  if (typeof loop === 'string') loop = loop !== 'false';
  if (typeof autoplay === 'string') autoplay = autoplay !== 'false';

  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  // Video-export protocol: the exporter dispatches this event per frame;
  // pause + sync the playhead so the capture sees exactly that timestamp.
  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onSeek = (e) => {
      setPlaying(false);
      setTime(clamp(e.detail.time, 0, duration));
    };
    el.addEventListener('data-om-seek-to-time-frame', onSeek);
    return () => el.removeEventListener('data-om-seek-to-time-frame', onSeek);
  }, [duration]);

  // Inline @font-face rules into the svg's foreignObject so the svg is
  // self-describing — serializing it alone (for video export) then renders
  // with the right fonts. Sets data-om-fonts-inlined once done.
  useInlineFontsInto(canvasRef);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: 'transparent',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <svg
          ref={canvasRef}
          width={width} height={height}
          data-om-exportable-video-with-duration-secs={duration}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            display: 'block',
          }}
        >
          <foreignObject x="0" y="0" width="100%" height="100%">
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              style={{
                width, height,
                background,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <TimelineContext.Provider value={ctxValue}>
                {children}
              </TimelineContext.Provider>
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div data-omelette-chrome style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>

      {typeof VideoEncoder !== 'undefined' && (
        <IconButton
          title="Export video"
          onClick={() => window.parent.postMessage({ type: 'omelette:request-video-export' }, '*')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v7m0 0L4 6m3 3l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </IconButton>
      )}
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


// ── VideoSprite ─────────────────────────────────────────────────────────────
// Renders a <video> that loops within [start,end] of its source at `speed`,
// kept in sync with the Stage's playhead. Carries the
// data-om-exportable-video-play-* attrs so video export can mix its audio.
//
//   <VideoSprite src="clip.mp4" start={2} end={5} speed={1}
//     style={{ width: 640, height: 360 }} />

function VideoSprite({ src, start = 0, end, speed = 1, style, ...rest }) {
  start = +start || 0; speed = +speed || 1;
  if (end != null) end = +end || undefined;
  const t = useTime();
  const ref = React.useRef(null);
  const span = Math.max(0.001, ((end ?? start + 1) - start));
  React.useEffect(() => {
    const v = ref.current;
    if (!v || v.readyState < 1) return;
    const target = start + ((t * speed) % span);
    if (Math.abs(v.currentTime - target) > 0.05) v.currentTime = target;
  }, [t, start, span, speed]);
  return (
    <video
      ref={ref}
      src={src}
      muted playsInline preload="auto"
      data-om-exportable-video-play-start={start}
      data-om-exportable-video-play-end={end ?? start + span}
      data-om-exportable-video-play-speed={speed}
      style={{ display: 'block', objectFit: 'cover', ...style }}
      {...rest}
    />
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite, VideoSprite,
  Stage, PlaybackBar,
});



/* ===== Splatties scene (images baked in) ===== */

/* Splatties — Fan Level Up celebration. Scene for animations.jsx Stage.
   Everything is computed from the timeline clock (useTime) so it scrubs and
   exports frame-accurately. Reads globals set by animations.jsx. */


// ── constants ───────────────────────────────────────────────────────────────
const W = 1080, H = 1920, CX = 540;
const TAU = Math.PI * 2;

const PAL = {
  bg0: '#1b0729', bg1: '#350f52', bg2: '#120420',
  purple: '#a64dff', purpleHi: '#c98cff', purpleHot: '#b95cf7',
  magenta: '#e23bd6', cream: '#f4 ead6'.replace(' ', ''),
  lime: '#b6ff3a', blue: '#4ea8ff', pink: '#ff4da6', gold: '#ffd23e', red: '#e8231f',
};
const CONFETTI = [PAL.purple, PAL.magenta, PAL.lime, PAL.blue, PAL.pink, PAL.gold, PAL.cream, PAL.purpleHi];

// deterministic pseudo-random
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// timing anchors
const DROP = 9.0, CHORUS_END = 21.5, DUR = 23.76;

// chant phrase: 8 beats → "la · LEVEL · UP! · _ · la · la · LEVEL · UP!"
const PHRASE = [
  { lab: 'LA',    emph: 0.42 },
  { lab: 'LEVEL', emph: 0.62 },
  { lab: 'UP!',   emph: 1.0  },
  { lab: '',      emph: 0.12 },
  { lab: 'LA',    emph: 0.42 },
  { lab: 'LA',    emph: 0.52 },
  { lab: 'LEVEL', emph: 0.62 },
  { lab: 'UP!',   emph: 1.0  },
];

function useBeat() {
  const { bpm = 136, beatOffset = DROP } = useSceneCfg();
  const t = useTime();
  const beat = 60 / bpm;
  const p = (t - beatOffset) / beat;
  const idx = Math.floor(p);
  const frac = p - idx;
  const kick = Math.pow(1 - frac, 1.7);          // 1 at onset → 0
  const pb = ((idx % 8) + 8) % 8;
  return { t, beat, idx, frac, kick, pb, info: PHRASE[pb] };
}

// scene config via React context (set from props)
const CfgContext = React.createContext({ bpm: 136, beatOffset: DROP, transparent: true });
const useSceneCfg = () => React.useContext(CfgContext);

// ── goo splat (organic, crisp, scalable) ────────────────────────────────────
function GooSplat({ size = 300, color = PAL.purple, seed = 1, spread = 0.5, opacity = 1, rot = 0 }) {
  const blobs = [];
  blobs.push(<circle key="c" cx={50} cy={50} r={24 - spread * 3} />);
  const n = 6;
  for (let k = 0; k < n; k++) {
    const a = hash(seed + k) * TAU;
    const dist = 16 + hash(seed + k + 11) * 12 + spread * 18;
    const r = 9 + hash(seed + k + 23) * 9 - spread * 2.5;
    blobs.push(<circle key={'s' + k} cx={50 + Math.cos(a) * dist} cy={50 + Math.sin(a) * dist} r={Math.max(2, r)} />);
  }
  if (spread > 0.18) {
    for (let k = 0; k < 7; k++) {
      const a = hash(seed + k + 40) * TAU;
      const dist = 30 + spread * 26 + hash(seed + k + 50) * 8;
      const r = (1.4 + hash(seed + k + 60) * 3.2) * clamp(spread, 0, 1);
      blobs.push(<circle key={'d' + k} cx={50 + Math.cos(a) * dist} cy={50 + Math.sin(a) * dist} r={r} />);
    }
  }
  return (
    <svg width={size} height={size} viewBox="-30 -30 160 160"
      style={{ position: 'absolute', left: -size / 2, top: -size / 2, overflow: 'visible',
        transform: `rotate(${rot}deg)`, opacity, pointerEvents: 'none' }}>
      <g filter="url(#splatGoo)" fill={color}>{blobs}</g>
    </svg>
  );
}

// ── small doodle glyphs (simple icon polygons echoing the cover art) ─────────
const Glyph = {
  bolt:    <polygon points="13,2 4,14 11,14 9,22 20,9 13,9" />,
  star:    <polygon points="12,2 14.6,9.2 22,9.5 16.2,14.2 18.2,21.4 12,17.2 5.8,21.4 7.8,14.2 2,9.5 9.4,9.2" />,
  spark:   <polygon points="12,1 13.6,10.4 23,12 13.6,13.6 12,23 10.4,13.6 1,12 10.4,10.4" />,
  heart:   <path d="M12 21C5 16.6 2.5 12.9 2.5 9.3 2.5 6.6 4.6 5 6.9 5 9 5 12 7.8 12 7.8S15 5 17.1 5C19.4 5 21.5 6.6 21.5 9.3 21.5 12.9 19 16.6 12 21Z" />,
  crown:   <polygon points="2,19 4,7 9,12.5 12,5 15,12.5 20,7 22,19" />,
  cross:   <polygon points="9,2 15,2 15,9 22,9 22,15 15,15 15,22 9,22 9,15 2,15 2,9 9,9" />,
};
function Doodle({ kind, x, y, size, color, rot = 0, fill = false, opacity = 1 }) {
  const stroke = fill ? 'none' : color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      style={{ position: 'absolute', left: x - size / 2, top: y - size / 2,
        transform: `rotate(${rot}deg)`, opacity, overflow: 'visible', pointerEvents: 'none' }}
      fill={fill ? color : 'none'} stroke={stroke} strokeWidth={fill ? 0 : 2.6}
      strokeLinejoin="round" strokeLinecap="round">
      {Glyph[kind]}
    </svg>
  );
}

// fixed doodle layout around the edges (avoids centre + characters)
const DOODLES = [
  { kind: 'bolt',  x: 150, y: 300, size: 86, color: PAL.gold,    rot: -12 },
  { kind: 'crown', x: 880, y: 280, size: 100, color: PAL.magenta, rot: 10 },
  { kind: 'star',  x: 980, y: 560, size: 70, color: PAL.blue,    rot: 0  },
  { kind: 'heart', x: 120, y: 620, size: 78, color: PAL.pink,    rot: -8 },
  { kind: 'spark', x: 940, y: 980, size: 66, color: PAL.lime,    rot: 0  },
  { kind: 'bolt',  x: 110, y: 980, size: 78, color: PAL.lime,    rot: 16 },
  { kind: 'cross', x: 210, y: 1180, size: 54, color: PAL.blue,   rot: 0  },
  { kind: 'star',  x: 900, y: 1280, size: 72, color: PAL.gold,   rot: 12 },
  { kind: 'heart', x: 980, y: 720, size: 56, color: PAL.purpleHi, rot: 14 },
  { kind: 'spark', x: 160, y: 470, size: 54, color: PAL.cream,   rot: 0  },
  { kind: 'crown', x: 120, y: 1330, size: 70, color: PAL.gold,   rot: -10 },
  { kind: 'cross', x: 940, y: 1180, size: 46, color: PAL.pink,   rot: 0  },
];

function DoodleLayer() {
  const { t, kick, pb } = useBeat();
  if (t < 1.6) return null;
  return DOODLES.map((d, i) => {
    const appear = 1.6 + i * 0.12;
    const a = clamp((t - appear) / 0.4, 0, 1);
    // twinkle on beat, stronger after the drop
    const onBeat = t > DROP ? kick * (0.5 + 0.5 * (pb === ((i + 2) % 8) ? 1 : 0)) : kick * 0.4;
    const s = (0.7 + 0.3 * Easing.easeOutBack(a)) * (1 + onBeat * 0.22);
    const wob = Math.sin(t * 2 + i) * 5;
    return (
      <div key={i} style={{ position: 'absolute', left: 0, top: 0,
        transform: `translate(${wob}px, ${Math.cos(t * 1.7 + i) * 4}px) scale(${s})`,
        transformOrigin: `${d.x}px ${d.y}px`, opacity: a * (t > CHORUS_END ? clamp((DUR - t) / 1.2, 0.3, 1) : 1) }}>
        <Doodle {...d} />
      </div>
    );
  });
}

// ── background ──────────────────────────────────────────────────────────────
function Background() {
  const t = useTime();
  const { transparent } = useSceneCfg();
  const reveal = clamp((t - 0.7) / 1.0, 0, 1);
  const e = Easing.easeOutCubic(reveal);
  const drift = Math.sin(t * 0.25) * 40;
  // celebratory glow blooms that follow the action (screen-blend so they only
  // ever lighten whatever is behind — safe over a live stream).
  const after = clamp((t - DROP) / 0.6, 0, 1);
  const glowBoost = transparent ? (0.25 + after * 0.4) : 1;
  const glows = (
    <React.Fragment>
      <div style={{ position: 'absolute', left: 540 + drift, top: 620, width: 1100, height: 1100,
        marginLeft: -550, marginTop: -550, borderRadius: '50%', opacity: (transparent ? 0.4 : 0.5) * e * glowBoost,
        background: `radial-gradient(circle, ${PAL.purpleHot}66 0%, transparent 62%)`, filter: 'blur(30px)',
        mixBlendMode: transparent ? 'screen' : 'normal' }} />
      <div style={{ position: 'absolute', left: 760 - drift, top: 1300, width: 800, height: 800,
        marginLeft: -400, marginTop: -400, borderRadius: '50%', opacity: (transparent ? 0.32 : 0.4) * e * glowBoost,
        background: `radial-gradient(circle, ${PAL.magenta}55 0%, transparent 60%)`, filter: 'blur(30px)',
        mixBlendMode: transparent ? 'screen' : 'normal' }} />
    </React.Fragment>
  );
  if (transparent) {
    return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{glows}</div>;
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0,
        background: `radial-gradient(120% 80% at 50% 36%, ${PAL.bg1} 0%, ${PAL.bg0} 48%, ${PAL.bg2} 100%)` }} />
      {glows}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, mixBlendMode: 'overlay' }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 92% at 50% 46%, transparent 52%, rgba(8,2,16,0.66) 100%)' }} />
    </div>
  );
}

// ── stadium light sweep (appears at the drop) ───────────────────────────────
function LightSweep() {
  const { t, kick } = useBeat();
  if (t < DROP - 0.1) return null;
  const a = clamp((t - DROP) / 0.5, 0, 1) * (t > CHORUS_END ? clamp((DUR - t) / 1.0, 0, 1) : 1);
  const rot = t * 26;
  return (
    <div style={{ position: 'absolute', left: CX, top: 560, width: 0, height: 0, opacity: 0.5 * a }}>
      {[0, 1].map(i => (
        <div key={i} style={{ position: 'absolute', left: -1100, top: -1100, width: 2200, height: 2200,
          transform: `rotate(${rot + i * 90}deg)`, transformOrigin: 'center',
          background: `conic-gradient(from 0deg, transparent 0deg, ${PAL.purpleHi}${i ? '22' : '33'} 6deg, transparent 16deg, transparent 180deg, ${PAL.magenta}22 186deg, transparent 196deg)`,
          opacity: 0.6 + kick * 0.4, mixBlendMode: 'screen' }} />
      ))}
    </div>
  );
}

// ── starburst rays behind the hero (drop + chorus) ──────────────────────────
function Starburst() {
  const { t, kick } = useBeat();
  if (t < DROP - 0.05) return null;
  const a = clamp((t - DROP) / 0.35, 0, 1) * (t > CHORUS_END ? clamp((DUR - t) / 1.0, 0, 1) : 1);
  const rays = 24;
  return (
    <div style={{ position: 'absolute', left: CX, top: 560, width: 0, height: 0,
      transform: `rotate(${t * 8}deg) scale(${a * (1 + kick * 0.06)})`, opacity: 0.32 * a }}>
      {Array.from({ length: rays }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: 90, height: 1500,
          marginLeft: -45, marginTop: -750, transform: `rotate(${(360 / rays) * i}deg)`, transformOrigin: 'center',
          background: `linear-gradient(${i % 2 ? PAL.purpleHi : PAL.magenta}, transparent 70%)`,
          opacity: i % 2 ? 0.5 : 0.32, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />
      ))}
    </div>
  );
}

// ── confetti rain (continuous through chorus) ───────────────────────────────
function ConfettiRain({ count = 64 }) {
  const t = useTime();
  if (t < DROP - 0.2) return null;
  const fade = t > CHORUS_END ? clamp((DUR - t) / 1.6, 0, 1) : 1;
  const pieces = [];
  for (let i = 0; i < count; i++) {
    const speed = 240 + hash(i) * 320;
    const x0 = hash(i + 7) * W;
    const range = H + 360;
    const y = (((t - DROP) * speed + hash(i + 3) * range) % range) - 200;
    const sway = Math.sin(t * (1.4 + hash(i + 5)) + i) * 36;
    const rot = (t * (120 + hash(i + 9) * 360)) + i * 33;
    const col = CONFETTI[i % CONFETTI.length];
    const type = i % 4;
    const sz = 16 + hash(i + 11) * 18;
    let style = { position: 'absolute', left: x0 + sway, top: y,
      transform: `rotate(${rot}deg)`, opacity: 0.9 * fade, willChange: 'transform' };
    if (type === 0) Object.assign(style, { width: sz, height: sz * 1.7, background: col, borderRadius: 2 });
    else if (type === 1) Object.assign(style, { width: sz, height: sz, background: col, borderRadius: '50%' });
    else if (type === 2) Object.assign(style, { width: sz * 1.4, height: sz * 0.5, background: col, borderRadius: 3 });
    else { // mini splat
      pieces.push(<img key={i} src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEcAAABGCAYAAACe7Im6AAAQAElEQVR4AdxaC5RdRZXdp+59n+5OQgcSQD4aQoSIShwZEdcCQYPKBEK+3fkAosYEBhFlqcgsxIkOs5Ao6IjDkjEwLFEYkpjudDoJMQkI+MFgZIAMCAGJJER++XXSn/fevffMPnVfd7qTTgjdr13EenXqnFNV91TVvqfq1q37HA6hcPvYNXr3Jx/TBec/pfeMX6c/unC5DmT3DwlwrjjnPwf99zl/1MEyDLmgCpkwiyH5Wrx70Hux/OKN+o0Jt507ECC5gTBaaZsfjM7cFSJE4EIPTDYbIpvLIFOVQXVVHh8dOn4VBiC87cG5fuw9NwVqwGQQBqQM5YAUBshkAmSrmUfQbp+0puJT7G0PzvDomGucOHpNAOcCBLAgTARJoii1l5BECQ7DkcyrbHRvZu6eSeu1YcpL2jh5E/kmbZyyWRdNeUFvmdzc/mbXVqI8Fw8mMGZJ4KBQJTAEJSnFKHXEKLRFKHZEcKUQlQ77BeeHE1drAwGpllpIEkDYtYD3LeDdywXVOCk8Lb+obkPFXRl7hTCugoqwfSBma+YtSQJEpQSlAoGh5xQ7ErSUWva6sv+q683EXROf0He60RB1npwECDmvMzbPgwBZ49kAQ7K1aJ6xiV3GgAUxywQjIWkMxKSoSK8pxPSYGIVCQh5ho6z/PCoc3N72fjhptda6IwAVAmPkONcdgkAQGCi5ANl8Bvl8iGxViEFV1VjCxykGKCih5yxCEieISKViQo/hWkNQCu0Eh7Q92oob7p91R6W74PY2eLw7eQ8wnErOERgnCPmEyIQOIYkigRJkQpA71OYPw831jS+jwuHqT91yuAcnMY9RRBFB4eJbLEX0mBgFetCueAcue+AMqXDT3lwPcOZNaHxGzGM4w8WAMRKHwLEaoxAkFwDei7KsQTKghGWjqz5wDCocwmTwGYkm/qkU0X1KJUWRgBTpPR2cVi8HGzZf9qvTpcLNdpnjsLpkDHPHjfbTycDhIghyR7LWvQr6OBVxCo+XA0DAhGxQcBjTykY2k4kJSpzEXGsS2LSK6Dmtuhuf++0pcu2a8cdXtsWe1mx4XTlVqCYUpnK45kHEgswg4VTz0SfKTPaX6wDVOK2vLsG3pt11g2mVoptWz16iqikoXJEjRHh+8Np/vuI3H2IHK9XK/u30AKeAQrkmUaGk5i4JATBiFj3cA5Jw7sclrgOkhM9XI1bHu/InXWe8kvRs7QNH76rZkmwY+puzL3/0VPnOqs/+uJL2D2SrBzg79DVo1z1RPq0UBghvnp/3/lHqgeHdLCpirgGx6XyKiAjeVXPi/tvqY8l/rPnyq19/+Lzg5l9e/nAfTfT5sh7gvIHN3CsojREUkIRE1U+hiJ5iXmKclBgwRkUgKYnVRj6Tx7wZC/7mg2CHByT2AOeGxll3RFpAYkMlMCA3Mo/pAqgMTETup5Z5jk2vEk3R685+xz+ddWP9fSsGpLd/Y6McUc8WpzacKJxPXJjpNUJohAsOq3iAPAjKrTvoLSk3gBIChYjeQ0r4NPlwzdjzfjblCb3mwh9w08SLD9G4Dzg2jvXJb5sTgpKkPgSlbPl+7eHTycCIbSoRLCUgBpzf1nM9j2yaxYLDdDjOzE79U1PdRm2se0Ebpj2ni6Y9rQvqn9QF05/Qe+sf13vq/6A/rVurP5n6a77INm2/fuKdV1o7A0Xfv/B+XT5hmy7ztFWXTHhFb7vwES4cvbfYKzjfaKwfP3HxcVKQdqQgxVAYddoRelanQaEgqSfxLTlqF2gxQKA5BEkGLs6Sk+I8Mkk1chiEbDwIVToENRiKIRiGI+VYjHJjak/PfOLW5vot2li/Sb8/dVlnY7Tf/7h4wmY9WT7sDUk5zWWyGFVzClZfsk1vrFu4z1rpfL39JPWLR8qEhnfIBvyhdatsQewK4GQDUuvAHgExPajYISi2J/4pJhrAJTk4zcMlRjmClCvLeQSayiF5oAQPJJdFSKoJBuF92Y9izcW79MfTHuo3SPdNeJ69qEEa2HnGMAeEVYJMlUOmWnDm8HPPurrulmPRLbhu8n7FrzReMOjSxg8QqGPlgiXD5KFkwSefl8ehoik8tBJzzsWcZhGfYLZ4w5cIl68AzgZPgAIjHkGE7GpATwoMPFIAguXyCOlXoeT4emInfQLHl92Tq07Dsku3KPoYvnNhw7q8Dgb32PBdAuCByRGYHAiOIEtwjKYc8+nNLO6Krkt6C8K8pstXXdU4Vs5vPFxKEvlzFsIAG4HwmAOdvUAarMyTeZORTTcC5kET85YcPSZDUDJwoQAERUgucBDqg7KH4cFZO818avAtpCN0zAcTjaAaQ/mTDLxNnriCTgrjQZZ5AZDlScO/zrjzGpSDK/M+sw26DuDOMe051xuYlHIhSEb7GhdmCcQZOXJAgjIxzxkwLtW9TD3MZPDA7G1mHAcbvnz+bSNdYueHvotMQNwFQtsQcghADvYfDMqlISe5MRR9tGpe6GvylSXnCeeOb0M4tahAaMz5HlDoipbbSYAVGzm+XToCIiRnAIUCF5B4NOKoO5ONQiCXy2PVnK0HDdDpcu4LIsL+0B5TR5kuBEl48+yFlpvamDv9qENRagNKXC+3F96Yi3LoNzhmp0Xf8HeF7ZuaUtcQhLoRWTlaH62jHpSAXQgARyYGgvFOIiCOZWJEsMQJanLVuH/2li7rZZP7sNsmPqKhrV8S8uAgJbbC1yDw4QE+XckLgqgDKLal4BQJ0Hd/8aUNncbYjU6x7/x1/AXCy6XsniZTZewpCWsZwVoNWUwungT0d1i+ECAjx3K/5hgwRqIQ46QhVUNx/6xXlRZ6jT+d9KQeIyOR8etZljxD07yQtZXTzF59oqIgJjAlA6Y1Bei5XetZY09k1/YofZVeSV4cKxy4RWcJuwLP09SXmS6AZ/QALwpri4CRZFzK5WSsw8ccBfQMrMLKGFw1GA/M2aE/v+hJnT/jUb2j/ve6aPqfdfn0N/SI8GgCkiflkCVA4DSKuXMv2RcLI04lm0LFdoXty0rtQHtbAZf/4iyz3tWe65L6IcRx8WkRgXgbaWpiKjFlLBeC1SD8gYMXegPYA5/Htcd04gXTYWVmpBcSnyfIBDkcP2gURlW/DydUvQe14TCEkqMT5iBJiJje0cZPN238QtHeHqHATWqBn3EKPEUsEaCIXzASnii06nZMWHJ0atbbThOXsv6lGrXtMstiI0UaBALYKMnQFSR9MLBVy/ZAWJnVg0AMMHKIAIzYT7D5pOpTgK9+wnYFAUQclIusLbAd7UV6QxEdbSVShA4CVCBAdsQa8Zg1imK0xNvwv7q6sW7JyF5bYzfR7+Dyg98DpPYtFZMF3YIpRgDHD98oAdDOegJQBRTl0CWU9W6MRconjYA/W+OoG0D2Pcs+7nV0lAhKAW0dBbS67XgjvxGv1DyNlwave27D4Ifv/OPgxrN/U33f8XVrjpRLVr5brmuun9TNeg/R97NHTh8UzuvT7DKxhJ226EUvdOV6DUzVBoVysMGR1KgzizKsTnppOZeM+coXX3ANUXpMQlLWMy9o7yjitY4tWJes/G7d6qPk4oeOk1kPjparVp8hX101Vq5bOf7kb62cNuvm5Zc/fOuKq3rshGm511gRcALk3pmOgykjfEgFS41AUFJiygxGCAdGDRaEAzdA/HSxQdM7wE2Z5Xkw+KZvwCQGDKeOgWMeFPFrxOsdr+OChYfLpUtPkW83z+za4Zrd/lBFwAkR8HyUw2VMO5MKaWo5eyTDICEodsdtQ2alYGanbgAo9YRg2FRJeJiWGBj0mIQEkw08ynZM+0zrOkxf2Pua4W33I6kIOIlqi3cM35EUiD1pKvkiq8R9hm/UEPA6lxqCYap5Aww4AuNB4CGaB8tzVqInWR1leUzQNrQ+iSsXn929gbSZCqW+n/21FbviptRG2s/uaZpvqRgUnpBwoAQpMQ/wJEjz+DSjR9h0sbKEUyghEOo5q/A69QApWorbcdmij/BCsz0wVBFwWlzrzzu7l/Y2TTvzQEg6c9Q8Q9NmbZ0xXVRhACjLQLBAQPx6Q6BAUlLiQSFAXgbWFpbPxACHtJf9bOQHi6/4MwgAeg3iS+grLC3LVGzhVXqPByhmN+gdyunjPcXAMZ1AKGXLF4KmdjRrnHn//ovZ99LggEb2qnL2xZtKUy8SFtOIhZdM7spPAroBUo/xA2YJAQFJqduZtAGTEKCUylOOepDZY4lXDVisGDib9Gl2snunhYAwi1EklZUc3MU6ligRUxV+QRWAnqAGCj3HvCShbnmeOJ14PgvLR9nTXKi48zOP0gKND2B0lbK9UZ+6fI8tgUinRoEgWIbAfp358PscISgJSekRSo8x8qAQIO89lmdl1BNy4dmGOMHoQWNw/cz5A/q1Yr/g/Mvkn0y9aeri9bfXP6J3THtU50/7nd45/VG9++LH9OaZi1/EXuGGJZ+7vUeW3VcitAcO6VYs3WASvnxTp1dobO9G7BK9xRZgRNRJxs17DDQ7tnA81gAcxg6edOtPPrPGWsJABPZkj9nbJ/1efzl9J6lFP5adtvAfwnPfe4I7Fce70RiZPwWjat+PE4aegn8c+vERX6279YQ9V6bS47r6L+oBSXVRsW0LhK1ImtUDFCtM8y0VX2bX+HxeK/Qa6T50giLCdcryYoHEOZwQjEbznKf0tosr/292djvt9c8mPq8jwvfQ1QOS6yLHO5QflEP14dWoGpJDEISwXev3Fn5xH+/5euOFI2LlJwhvksCQi9hgmJjM4cOIAweDiOUbUektdpWndUwVXmvrjx1HoJiFtB6OXMs7MQofwspLXtW7pq016Hqz9pbznF1x+/nrtFaPgkjAkTCLXwjAvYjwlmcHZRDmLR8otJbQvrMDG3ast8t6pV/h7lMAG4wRaE8ILxhMJ1nXycTqmMwSUPY6uclGXu8qL+fE4I0h8Zwm4Sle7D8ghpBiFYLCEASlWrzLjcGDMzr0R3X9n25EAhiuI+F4WwSuy2OEADme79pCWWqL0baNxwBbizxzTTDnvrME+wnzGr7wzDqserlrnL7enupshm2kusmwigRBSZbbSVQh0qnBB6XX2FoU8+OhB4ZggVWCrIDnXsjmgCBPqhKcWnMmFs980cygr8F9bdz88wwIpRlRBxAUeO6Q8A4VdyuKuxLEBVZgK89Ea5keOF7bMP64zfos+y2e0tom07wpAuabTAGAYWCEckhbKiueCcRzXhNxuhoo1IW5QRYwyuQcPdxIEOZSGl59DO6auW5fczi44EKXPQm8I0b2SBUCY4RynrADKFMBbfjSwk8JDiJ8tuFUacUO7B3E2+Iguxf47gtzUhLWMWIGDDShoGCqFBjVZHLJAP4gntyOis17wjyBITnzIm4WT6x6H+aeMzdk9bcc3Y3Nn/5hnNAzeDfsaCC1ICnrSpWS4pG2RT2+JTPzgHHC4iO9IUuMuleWzgGa6bLcvTyVhSiS0ggRCqzPFGDi6OgenFDgZ2xQjgAABkxJREFUCITj9PLg0HNsF+0CwLHO6GOnldCHwEuBbeFGJHGCiLuuKImhsGeokcK+h1tH/pI8jXlNX9zyVtvYiPVQGlB/oXCwJnBqkFEDOGBGWDC9k0zvIl5sjtylm+AE4pQEknoQghAI6EU8Tkb3cHSwz66je/F+ZQ/OnOVjpEPbCU6CKIoQJSUOKIbaRoNA7dRX8fmFH5b9WjlAAcG5ToWD0LSSGekklPPKrFP1Fa2OF5hYuT/G4PY5MZ0LpC/3CTOQCizmFweA3Yc9SOway+MQrNJ+ad6EFe33TfqrNtZt07un/sma83U9OCZNX3mkvCovoEhwCvy2Y1Si/FL0LKYu6PtJWxtaVrG76cCtWUm9xtr0Y7I8r6RJp9rJeZCG2KY9R9nJE8rm6XRyvrgiBYKHX/bQiPjgMG6nhAaS7ck4IVLjvaR3TFyvI+X0fE1Yg5qwGiNqT8Tqz+/wzXeBY9ddtmyMTFoxRJ6Rh7dtSB7DuMWDZdbiD6a3xSr0gY7Ecffy/QDCaeDBoDXGMliUGBMbPEdgXluKI5T42SQmAEYeCHqKr8M84xHrG5UMEPvLC3nEJ2ts/yyz/Y8HCIiKihQkP9Zeez8oGY5MECAbZpCvccgOVgyprcJPL31ce4CDcrh26bgjrl76MSmr/WIj3PtP9AbYku0xbYHkdsrjZAM3MKKkhF26E69hE7Ymm7FDt6I1bkWxVCRQEWK6iAEV8yTQeEKwYgOIH+UiLrVREdxqJCSCQWDsu1VUSJBYPqkQd/gu7J3MnXDvj4SdCcQhdIG/gRIqbN06rupElmDgwty6udmhwVFwbDzgEyWwJwoXTAMp4ToUcYCv4EV8qikvk5qOkIuaRsqMpSdI3dKjZELTEBnXXCXbsQUlelXMB0bsQVGClYCXcjopDISIgMQEoVQQlIiD/TnA8LB84opXdZ83HT/o1uy2G6TsAkrnMjCjVuG+TtDasRu8n77egCSnu6sKBozLOITcrIXcewjBcQGgnCLPB3/Ap5ecVO4eeg0XNY+UJ8LlC+xPUn6dISqJEa83D7JFN6YHJZxSfq2hxxhPIprjgJliVmPvS8N3F37hlUhLSGgrJooJN5jFFofCTofHdq/5twEB59apa3TltBYNNUf0HUIDpwoIuK0PCI5C0aYt+ELDRwQHEb7ZVDdtyrLDJJJS6jW8JuGt9kRbRBqx5ywoA0L4qQBP6IPtXthPMqPpGNmd7ECB89OoqAX8qn3R/G8vuuSbFQXnmsm3nbGofqOe5E6H8DUk4PwJwwB+e18jCPOAOIE64OH4vq5/UMGHN0/qVgzl5qKYAsS7bVeogZQKMNClCxxwBXsWX2scV23FB6KZDSNk/KIhsraw4qFP/rxG5i6aPtvqs5vG+k/zJi/969jgkt8N0WEQHlwZOQJkYDjbnNmUop/YYArxbnyv6Yon+9Jq/cphsiPc7C81W0SETqKcGj7LqyV0YE30s7Gfa/gAW0zzDya9vmHyOd3rVQycMfj40eJP7QK4OPAA+UeSdS8B7D8wUTsHwbXg5VLvC2T3jh1Inr3svTKZW45N7insxOvYJlvwkvwf1iXL/7gC808e11Ar31k6+4ED2TiYMncwld6sTvOkrSoQViMxEgveQfo3I/j5NuY+pNSq/kmScO/RkrzGuv2PVzZ/RC5qHiEXLRklcxpOk2sbJ512S8OVz/Xfcmqh3+B8e+KCBRlwMeHcT00qYVIvmtvzIeD3H+Y19hThphu7decyX+FtnvQbnOE4tq5zjCkk1CQl/5jlxs02aX63WkygfAy3xtv/izXe9rHf4FRjCOgqsOAIilARTjJHUqHGoxAlQPaPK+LCjRtwY9OcJqv/dqd+g7MdWwEuMgozJXAGCAkkl4CeAli5kDmI/1E8JKLrby93Ra83qW1c7MMcH+G2/TAInMEgTAmS6aAOhu34K9NDI7r+dvP65roJJb44KsFJuOgkBCgx2byGxg0YEZ8SHsGUxccLsw+J2G9wbJS/xv+MM2CUH9oSFSQEJiFASjKeUOd7I57VNz+cN3tvF6oIODctnbNirTTMjzXxwBgQcaKIuMeJiEzMt+on9QFctvjg3qX+rsCxwcxdOn32Bcvy8hpPE1u4a21NdmGbvIyn8Wt8YklWrm74xCEznWw8Rv8PAAD//zI7nWwAAAAGSURBVAMAPMb1C2ekCvUAAAAASUVORK5CYII=" style={{ ...style, width: sz * 2.1, height: sz * 2.1 }} />);
      continue;
    }
    pieces.push(<div key={i} style={style} />);
  }
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{pieces}</div>;
}

// ── radial confetti burst at the drop + on each "UP!" beat ───────────────────
function bursts(t, beatOffset, beat) {
  // returns array of {time} burst origins active recently
  const list = [{ time: DROP, big: true }];
  for (let k = 0; k < 16; k++) {
    const idx = k;
    const bt = beatOffset + idx * beat;
    const pb = ((idx % 8) + 8) % 8;
    if ((pb === 2 || pb === 7) && bt > DROP + 0.1 && bt < CHORUS_END) list.push({ time: bt, big: false });
  }
  return list;
}
function ConfettiBurst() {
  const { t, beat } = useBeat();
  const { beatOffset = DROP } = useSceneCfg();
  if (t < DROP - 0.05 || t > CHORUS_END + 1) return null;
  const out = [];
  for (const b of bursts(t, beatOffset, beat)) {
    const age = t - b.time;
    if (age < 0 || age > 1.1) continue;
    const n = b.big ? 46 : 20;
    const life = b.big ? 1.1 : 0.8;
    const fade = clamp(1 - age / life, 0, 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + hash(i + b.time) * 0.6;
      const v = (b.big ? 760 : 480) * (0.55 + hash(i + b.time + 5) * 0.7);
      const dx = Math.cos(a) * v * age;
      const dy = Math.sin(a) * v * age + 420 * age * age; // gravity
      const sz = 14 + hash(i + b.time + 9) * 16;
      const col = CONFETTI[(i + Math.round(b.time)) % CONFETTI.length];
      out.push(<div key={b.time + '-' + i} style={{ position: 'absolute', left: CX + dx, top: 560 + dy,
        width: sz, height: sz * (i % 2 ? 1 : 1.6), background: col, borderRadius: i % 3 ? 2 : '50%',
        transform: `rotate(${age * 600 + i * 30}deg)`, opacity: 0.95 * fade }} />);
    }
  }
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{out}</div>;
}

// ── splat decals splatting onto the screen on the beat (chorus) ──────────────
function SplatDecals() {
  const { t, beat } = useBeat();
  const { beatOffset = DROP } = useSceneCfg();
  if (t < DROP || t > DUR) return null;
  const out = [];
  const startIdx = 0, endIdx = Math.ceil((CHORUS_END - beatOffset) / beat);
  for (let idx = startIdx; idx <= endIdx; idx++) {
    const bt = beatOffset + idx * beat;
    const pb = ((idx % 8) + 8) % 8;
    if (pb === 3) continue;              // skip the rest beat
    const age = t - bt;
    if (age < 0 || age > 1.4) continue;
    const seed = idx * 3.7 + 5;
    const x = 120 + hash(seed) * (W - 240);
    const y = 240 + hash(seed + 1) * (H - 520);
    const baseSize = 150 + hash(seed + 2) * 200 + (pb === 2 || pb === 7 ? 90 : 0);
    const grow = Easing.easeOutBack(clamp(age / 0.22, 0, 1));
    const squashT = clamp(age / 0.22, 0, 1);
    const sx = grow * (1 + (1 - squashT) * 0.4);
    const sy = grow * (1 - (1 - squashT) * 0.3);
    const fade = age < 1.0 ? 1 : 1 - (age - 1.0) / 0.4;
    const col = [PAL.purple, PAL.purpleHot, PAL.magenta, PAL.purpleHi][idx % 4];
    out.push(
      <div key={idx} style={{ position: 'absolute', left: x, top: y,
        transform: `scale(${sx}, ${sy})`, opacity: clamp(fade, 0, 1) * 0.92 }}>
        <GooSplat size={baseSize} color={col} seed={seed} spread={0.5 + grow * 0.4} rot={hash(seed + 4) * 360} />
      </div>
    );
  }
  return <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{out}</div>;
}

// ── build-up: ink drop + "LEVELING UP" hype meter ───────────────────────────
function BuildUp() {
  const t = useTime();
  if (t > DROP + 0.2) return null;
  const meterIn = clamp((t - 2.4) / 0.5, 0, 1);
  const fill = clamp((t - 2.8) / (DROP - 3.0), 0, 1);
  const fe = Easing.easeInOutCubic(fill);
  const near = clamp((t - 8.0) / 1.0, 0, 1);           // anticipation shimmer
  const out = clamp((t - (DROP - 0.12)) / 0.25, 0, 1); // flash out at drop
  const op = meterIn * (1 - out);
  const barW = 760, barH = 46;
  return (
    <div style={{ position: 'absolute', left: CX, top: 560, width: 0, height: 0, opacity: op,
      transform: `translateY(${(1 - meterIn) * 20}px) scale(${1 + near * 0.04 + out * 0.5})` }}>
      <div style={{ position: 'absolute', left: 0, top: -150, transform: 'translateX(-50%)', width: 'max-content',
        fontFamily: 'Luckiest Guy, cursive', fontSize: 64, color: PAL.cream, letterSpacing: '0.02em',
        textShadow: `3px 3px 0 #43117a, 0 6px 16px rgba(0,0,0,.5)`,
        opacity: 1 }}>
        LEVELING&nbsp;UP
      </div>
      <div style={{ position: 'absolute', left: -barW / 2, top: -barH / 2, width: barW, height: barH,
        borderRadius: barH, background: 'rgba(10,2,20,0.6)', border: `4px solid ${PAL.purpleHi}`,
        boxShadow: `0 0 ${20 + near * 40}px ${PAL.purpleHot}`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${fe * 100}%`,
          background: `linear-gradient(90deg, ${PAL.purple}, ${PAL.magenta}, ${PAL.lime})`,
          boxShadow: `0 0 24px ${PAL.lime}` }} />
        {/* shimmer */}
        <div style={{ position: 'absolute', left: `${fe * 100}%`, top: 0, width: 60, height: '100%',
          marginLeft: -30, background: 'rgba(255,255,255,0.5)', filter: 'blur(8px)', opacity: near }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: barH / 2 + 18, transform: 'translateX(-50%)',
        fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 30, letterSpacing: '0.34em',
        color: PAL.purpleHi, opacity: 0.85, whiteSpace: 'nowrap' }}>
        FAN&nbsp;HYPE&nbsp;METER
      </div>
    </div>
  );
}

// ── the hero "LEVEL UP!" lockup (drop → end) ────────────────────────────────
function Hero() {
  const { t, kick, info, pb } = useBeat();
  if (t < DROP - 0.05) return null;
  const intro = Easing.easeOutBack(clamp((t - DROP) / 0.4, 0, 1));
  const emph = info ? info.emph : 0.5;
  const isUp = pb === 2 || pb === 7;
  const pump = t < CHORUS_END ? kick * emph : 0;
  const outro = t > CHORUS_END ? clamp((t - CHORUS_END) / 0.8, 0, 1) : 0;
  const scale = intro * (1 + pump * 0.16) * (1 - outro * 0.12);
  const rot = Math.sin(t * 6) * (1.2 + pump * 2.2);
  const splatPump = 0.5 + (t < CHORUS_END ? kick * emph * 0.45 : 0);
  const stroke = (px, c) => `${px}px ${px}px 0 ${c}`;
  const txtShadow = `4px 5px 0 #3d0f6b, -3px 3px 0 #3d0f6b, 3px -2px 0 #3d0f6b, 0 10px 26px rgba(0,0,0,.55), 0 0 40px ${PAL.purpleHot}88`;
  return (
    <div style={{ position: 'absolute', left: CX, top: 560, width: 0, height: 0,
      transform: `scale(${scale}) rotate(${rot}deg)`, transformOrigin: 'center' }}>
      {/* ink backing */}
      <GooSplat size={900} color={PAL.purpleHot} seed={2} spread={splatPump} opacity={0.95} />
      <GooSplat size={760} color={PAL.purple} seed={9} spread={splatPump * 0.8} opacity={0.9} rot={40} />
      {/* flash on UP beats */}
      {isUp && t < CHORUS_END && (
        <div style={{ position: 'absolute', left: -500, top: -360, width: 1000, height: 720,
          background: 'radial-gradient(circle, rgba(255,255,255,0.55), transparent 55%)', opacity: kick * 0.8 }} />
      )}
      <div style={{ position: 'absolute', left: 0, top: -210, transform: 'translateX(-50%)', textAlign: 'center',
        fontFamily: 'Luckiest Guy, cursive', color: PAL.cream, lineHeight: 0.92,
        WebkitTextStroke: `3px #2a0a45`, textShadow: txtShadow, whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 168, letterSpacing: '0.01em' }}>LEVEL</div>
        <div style={{ fontSize: 232, letterSpacing: '0.01em',
          transform: `scale(${1 + (isUp ? pump : 0) * 0.12})`, transformOrigin: 'center top' }}>UP!</div>
      </div>
    </div>
  );
}

// ── chant ticker (current syllable, under the hero) ─────────────────────────
function ChantTicker() {
  const { t, kick, info, pb } = useBeat();
  if (t < DROP + 0.1 || t > CHORUS_END) return null;
  if (!info || !info.lab) return null;
  const pop = Easing.easeOutBack(clamp(kick + 0.15, 0, 1));
  const col = (pb === 2 || pb === 7) ? PAL.lime : PAL.purpleHi;
  return (
    <div style={{ position: 'absolute', left: CX, top: 920, transform: `translateX(-50%) scale(${0.8 + pop * 0.35})`,
      fontFamily: 'Luckiest Guy, cursive', fontSize: 92, color: col,
      WebkitTextStroke: '2px #2a0a45', textShadow: `2px 3px 0 #3d0f6b, 0 0 26px ${col}`, opacity: 0.5 + kick * 0.5,
      whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
      {info.lab}
    </div>
  );
}

// ── the characters (duo) ────────────────────────────────────────────────────
function Characters() {
  const { t, kick, info, pb } = useBeat();
  const inAt = 1.3;
  if (t < inAt) return null;
  const cw = 540, ch = cw * (2100 / 1620);
  const slide = Easing.easeOutBack(clamp((t - inAt) / 0.7, 0, 1));
  const baseY = 1905 - ch;             // feet near bottom
  let y = baseY + (1 - slide) * 520;
  let sx = 1, sy = 1, rot = 0;
  // drop leap
  const leap = t > DROP && t < DROP + 0.6 ? Math.sin(((t - DROP) / 0.6) * Math.PI) : 0;
  y -= leap * 90;
  sy += leap * 0.06; sx -= leap * 0.03;
  // chorus bounce on beat
  if (t > DROP && t < CHORUS_END) {
    const emph = info ? info.emph : 0.4;
    const b = kick * emph;
    y -= b * 34;
    sy += b * 0.05; sx -= b * 0.04;
    rot = Math.sin(t * 5) * 2.2 * (0.4 + emph);
  }
  // outro settle
  const outro = t > CHORUS_END ? clamp((t - CHORUS_END) / 0.6, 0, 1) : 0;
  rot += Math.sin(t * 1.5) * 1.0 * (1 - outro);
  return (
    <div style={{ position: 'absolute', left: CX - cw / 2, top: y, width: cw, height: ch,
      transform: `scale(${sx}, ${sy}) rotate(${rot}deg)`, transformOrigin: 'bottom center',
      filter: 'drop-shadow(0 18px 26px rgba(0,0,0,0.55))' }}>
      {/* contact shadow */}
      <div style={{ position: 'absolute', left: '8%', bottom: -10, width: '84%', height: 40,
        background: 'radial-gradient(ellipse, rgba(0,0,0,0.5), transparent 70%)' }} />
      <img src="data:image/webp;base64,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" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
  );
}

// ── brand lockup: SPLATTIES wordmark (top, persistent) ──────────────────────
function BrandMark() {
  const { t, kick } = useBeat();
  const a = clamp((t - 1.0) / 0.6, 0, 1);
  const pump = t > DROP && t < CHORUS_END ? kick * 0.06 : 0;
  return (
    <div style={{ position: 'absolute', left: CX, top: 150, transform: `translateX(-50%) scale(${(0.7 + 0.3 * Easing.easeOutBack(a)) * (1 + pump)})`,
      opacity: a, textAlign: 'center' }}>
      <GooSplat size={300} color={PAL.purpleHot} seed={14} spread={0.55} opacity={0.9} />
      <div style={{ position: 'relative', fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 96,
        color: PAL.cream, letterSpacing: '0.01em', lineHeight: 1,
        WebkitTextStroke: '2px #2a0a45', textShadow: '3px 4px 0 #3d0f6b, 0 6px 18px rgba(0,0,0,.5)' }}>
        SPLATTIES
      </div>
    </div>
  );
}

// ── lower-third welcome banner (mid-chorus) ─────────────────────────────────
function WelcomeBanner() {
  const t = useTime();
  const s = 14.2, e = 18.0;
  if (t < s || t > e) return null;
  const inA = Easing.easeOutBack(clamp((t - s) / 0.45, 0, 1));
  const outA = clamp((e - t) / 0.45, 0, 1);
  const a = Math.min(inA, outA);
  return (
    <div style={{ position: 'absolute', left: CX, top: 1740, transform: `translateX(-50%) translateY(${(1 - a) * 20}px)`,
      opacity: clamp(a, 0, 1), display: 'flex', alignItems: 'center', gap: 18,
      padding: '16px 40px', background: 'rgba(14,3,26,0.72)', border: `3px solid ${PAL.purpleHi}`,
      borderRadius: 60, boxShadow: `0 0 30px ${PAL.purpleHot}66`, backdropFilter: 'blur(2px)', whiteSpace: 'nowrap' }}>
      <img src="data:image/png;base64,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" style={{ width: 46, height: 46 }} />
      <span style={{ fontFamily: 'Fredoka, sans-serif', fontWeight: 700, fontSize: 44, color: PAL.cream, letterSpacing: '0.04em' }}>
        NEW&nbsp;FAN&nbsp;LEVEL&nbsp;UNLOCKED
      </span>
      <img src="data:image/png;base64,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" style={{ width: 46, height: 46 }} />
    </div>
  );
}

// ── full-screen flashes (ink reveal + drop) ─────────────────────────────────
function Flashes() {
  const t = useTime();
  const { transparent } = useSceneCfg();
  let op = 0, col = '#fff';
  // ink-reveal black wipe at very start (only when there's a scene to reveal)
  if (!transparent && t < 0.7) op = 1 - clamp(t / 0.7, 0, 1), col = PAL.bg2;
  // drop white flash
  const d = t - DROP;
  if (d > 0 && d < 0.35) op = Math.max(op, (1 - d / 0.35) * (transparent ? 0.55 : 0.85)), col = '#fff';
  if (op <= 0) return null;
  return <div style={{ position: 'absolute', inset: 0, background: col, opacity: op, pointerEvents: 'none' }} />;
}

// ── ink-drop intro splat (falls in and splats to reveal) ────────────────────
function IntroInk() {
  const t = useTime();
  if (t > 1.7) return null;
  const fall = clamp(t / 0.7, 0, 1);
  const y = -200 + Easing.easeInQuad(fall) * (560 + 200);
  const splat = clamp((t - 0.6) / 0.5, 0, 1);
  const size = 120 + Easing.easeOutBack(splat) * 760;
  const op = 1 - clamp((t - 1.2) / 0.5, 0, 1);
  return (
    <div style={{ position: 'absolute', left: CX, top: t < 0.7 ? y : 560, opacity: op }}>
      <GooSplat size={size} color={PAL.purpleHot} seed={3} spread={splat} />
    </div>
  );
}

// ── camera shake + punch wrapper ────────────────────────────────────────────
function useCamera() {
  const { t, kick, pb } = useBeat();
  let amp = 0, punch = 0;
  const d = t - DROP;
  if (d > 0 && d < 0.75) { amp += 26 * (1 - d / 0.75); punch += Easing.easeOutCubic(clamp(d / 0.12, 0, 1)) > 0 ? (1 - clamp(d / 0.45, 0, 1)) * 0.08 : 0; }
  if (t > DROP && t < CHORUS_END && (pb === 2 || pb === 7)) amp += 11 * kick;
  if (t > DROP && t < CHORUS_END) punch += kick * 0.012;
  const x = Math.sin(t * 92) * amp, y = Math.cos(t * 77) * amp;
  return { x, y, scale: 1 + punch };
}

// ── audio synced to the timeline ────────────────────────────────────────────
function AudioTrack({ src }) {
  const { time, playing } = useTimeline();
  const ownRef = React.useRef(null);
  const playingRef = React.useRef(playing);
  playingRef.current = playing;
  // prefer a pre-existing <audio id="splatties-audio"> (lets the offline overlay
  // bundle inline the audio in HTML instead of through the JS transpiler).
  const getA = () => (typeof document !== 'undefined' && document.getElementById('splatties-audio')) || ownRef.current;
  React.useEffect(() => {
    const a = getA(); if (!a) return;
    if (playing) { a.play().catch(() => {}); } else { a.pause(); }
  }, [playing]);
  React.useEffect(() => {
    const a = getA(); if (!a) return;
    if (Math.abs(a.currentTime - time) > 0.2) { try { a.currentTime = time; } catch (e) {} }
  }, [time]);
  // resume on first user gesture (autoplay-with-sound is gated)
  React.useEffect(() => {
    const kick = () => { const a = getA(); if (a && playingRef.current && a.paused) a.play().catch(() => {}); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    return () => { window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
  }, []);
  const external = typeof document !== 'undefined' && !!document.getElementById('splatties-audio');
  return external ? null : React.createElement('audio', { ref: ownRef, src, preload: 'auto' });
}

// ── scene root ──────────────────────────────────────────────────────────────
function Scene() {
  const cam = useCamera();
  return (
    <React.Fragment>
      {/* goo filter defs (global) */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="splatGoo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" />
          </filter>
        </defs>
      </svg>

      <Background />
      <LightSweep />
      <Starburst />
      <SplatDecals />
      <DoodleLayer />

      {/* shake + punch wrapper for the foreground beats */}
      <div style={{ position: 'absolute', inset: 0,
        transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`, transformOrigin: 'center 560px' }}>
        <Characters />
        <BuildUp />
        <Hero />
        <ChantTicker />
        <BrandMark />
        <ConfettiRain />
        <ConfettiBurst />
        <WelcomeBanner />
      </div>

      <IntroInk />
      <Flashes />
    </React.Fragment>
  );
}

function SplattiesLevelUp(props) {
  const transparent = (props.transparent === false || props.transparent === 'false') ? false : true;
  const cfg = {
    bpm: +props.bpm || 136,
    beatOffset: props.beatOffset != null ? +props.beatOffset : DROP,
    transparent,
  };
  return (
    <Stage width={W} height={H} duration={DUR} background={transparent ? 'transparent' : PAL.bg2} loop={false} autoplay={true} persistKey="splatties-lvl">
      <CfgContext.Provider value={cfg}>
        <AudioTrack src={props.audioSrc || 'assets/level-up.mp3'} />
        <Scene />
      </CfgContext.Provider>
    </Stage>
  );
}

window.SplattiesLevelUp = SplattiesLevelUp;
