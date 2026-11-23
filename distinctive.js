/* The Distinctive Calendar: hung on a lit wall from morning to night, with a way in from year to week. */
(() => {
  'use strict';

  /* ───────────── data ───────────── */

  // Colour variants. Each live-drawn variant carries its print palette, relit at run time.
  // A variant that can't be redrawn in the DOM (the artwork print) sets render: 'image'
  // and its print file is shown on the sheet instead. Keep ready: false until the file arrives;
  // only ready variants get a button.
  const VARIANTS = [
    {
      id: 'green', label: 'green', swatch: '#303b20',
      palette: {
        paper: '#303b20', tint: '#404b33', void: '#27321c', line: '#4f5a40',
        title: '#f4f1e6', mark: '#c0c4b9', mnum: '#a3ad97', mname: '#f1efe5',
        hnum: '#d3d7c9', dnum: '#eef1e4', wday: '#b2bba5', note: '#f3efe2', 'mark-lime': '#c7ef4e',
      },
      dimA: 0.5,
      images: { horizontal: 'assets/distinctive/green-horizontal.webp', vertical: 'assets/distinctive/green-vertical.webp' },
    },
    {
      id: 'ivory', label: 'ivory', swatch: '#f7f6f0',
      palette: {
        paper: '#f7f6f0', tint: '#ece4d9', void: '#eceae4', line: '#d7d5cf',
        title: '#2e3a1d', mark: '#5f6551', mnum: '#6c6d64', mname: '#34362a',
        hnum: '#45483f', dnum: '#35392d', wday: '#5e6356', note: '#24331b', 'mark-lime': '#c7ef4e',
      },
      dimA: 0.55,
      images: { horizontal: 'assets/distinctive/ivory-horizontal.webp', vertical: 'assets/distinctive/ivory-vertical.webp' },
    },
    {
      id: 'artwork', label: 'artwork', swatch: '#b9a58a', render: 'image', ready: false,
      images: { horizontal: 'assets/distinctive/artwork-horizontal.webp', vertical: 'assets/distinctive/artwork-vertical.webp' },
    },
  ].filter((v) => v.ready !== false);

  // colours that carry words on the sheet; they must stay readable on paper and the weekend tint
  const TEXT_KEYS = ['wday', 'note', 'mnum', 'hnum', 'dnum', 'mname', 'title', 'mark'];

  const YEAR = 2027;
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const daysIn = (m) => new Date(Date.UTC(YEAR, m + 1, 0)).getUTCDate();
  const weekday = (m, d) => new Date(Date.UTC(YEAR, m, d)).getUTCDay();
  const isWeekend = (m, d) => { const w = weekday(m, d); return w === 0 || w === 6; };

  /* ───────────── the room, in image pixels ─────────────
     The photographs are 1344 × 752. The sideboard runs from x 43 to 1295, about 6.5 ft,
     so the wall is drawn at 16 px to the inch. Its top meets the wall at y 497. */
  const P = 16;
  const IMG_W = 1344, IMG_H = 752;
  const BOARD_TOP = 497;
  const GAP = 88;                  // 5.5 in of wall between the sheet and the sideboard
  const BOTTOM = BOARD_TOP - GAP;  // the sheet's bottom edge, both ways round
  const EXT_T = 760, EXT_B = 520;  // wall grown above the photo, floor grown below it
  const LR = 4;                    // the grown wall and the light maps are worked at quarter size
  const LW = IMG_W / LR, LH_T = EXT_T / LR, LH_I = IMG_H / LR, LH_B = EXT_B / LR, LH = LH_T + LH_I + LH_B;
  const SHIFT = [0, -1.75, 0, 0];  // the afternoon frame sits 1.75 px low against the others

  // The print files are 2000 × 1333 px for 36 × 24 in.
  const K = (36 * P) / 2000;

  const ORIENT = {
    horizontal: {
      wIn: 36, hIn: 24, size: '3 ft × 2 ft', W: 2000, H: 1333,
      grid: { x: 70, y: 250, w: 1860, h: 1007 }, head: 37, label: 121, small: 12,
    },
    vertical: {
      wIn: 24, hIn: 36, size: '2 ft × 3 ft', W: 1333, H: 2000,
      grid: { x: 70, y: 310, w: 1193, h: 1606 }, head: 64, small: 10,
    },
  };

  // A few believable notes for a week. Placed by weekday; the marked one gets the lime.
  const NOTE_SETS = [
    [{ wd: 2, text: 'team lunch' }, { wd: 4, text: 'launch day', mark: true }],
    [{ wd: 1, text: 'offsite' }, { wd: 5, text: 'review, 4pm' }],
    [{ wd: 3, text: 'client visit' }, { wd: 5, text: 'team lunch' }, { wd: 2, text: 'launch day', mark: true }],
  ];

  // Per frame of the day: the sheet's cast shadow [dx, dy, blur, opacity, colour] in image px.
  // Sun from the upper left by day, a soft sky at dusk, the lamp low on the right at night.
  const LIGHT = [
    { cast: [1.6, 2.2, 3.2, 0.24, [64, 72, 92]] },
    { cast: [2.6, 2.6, 2.4, 0.32, [118, 66, 26]] },
    { cast: [0.3, 1.6, 6, 0.2, [44, 34, 64]] },
    { cast: [-3.2, -0.6, 4.2, 0.42, [14, 9, 6]] },
  ];
  // The wall's own white, as it would read in plain daylight; the sheet is lit by wall ÷ this.
  const REF = [214, 215, 219];

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mix = (a, b, f) => (typeof a === 'number' ? a + (b - a) * f : a.map((v, i) => mix(v, b[i], f)));
  const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (c, a) => (a == null ? `rgb(${c.map((v) => Math.round(clamp(v, 0, 255))).join(',')})`
    : `rgba(${c.map((v) => Math.round(clamp(v, 0, 255))).join(',')},${a.toFixed(3)})`);
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(clamp(c[0], 0, 255)) + 0.7152 * lin(clamp(c[1], 0, 255)) + 0.0722 * lin(clamp(c[2], 0, 255));
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  /* ───────────── geometry, in design px of each face ───────────── */

  function dayRect(o, m, d) {
    const g = ORIENT[o];
    if (o === 'horizontal') {
      const dw = (g.grid.w - g.label) / 31;
      const rh = (g.grid.h - g.head) / 12;
      return { x: g.grid.x + g.label + (d - 1) * dw, y: g.grid.y + g.head + m * rh, w: dw, h: rh };
    }
    const cw = g.grid.w / 12;
    const rh = (g.grid.h - g.head) / 31;
    return { x: g.grid.x + m * cw, y: g.grid.y + g.head + (d - 1) * rh, w: cw, h: rh };
  }

  function monthRect(o, m) {
    const g = ORIENT[o];
    if (o === 'horizontal') {
      const rh = (g.grid.h - g.head) / 12;
      return { x: g.grid.x, y: g.grid.y + g.head + m * rh, w: g.grid.w, h: rh };
    }
    const cw = g.grid.w / 12;
    return { x: g.grid.x + m * cw, y: g.grid.y, w: cw, h: g.grid.h };
  }

  const union = (a, b) => {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  };

  // Monday-to-Sunday groups inside a month.
  function weeksOf(m) {
    const out = [];
    const n = daysIn(m);
    for (let d = 1; d <= n; d++) {
      if (d === 1 || weekday(m, d) === 1) out.push({ a: d, b: d });
      else out[out.length - 1].b = d;
    }
    return out;
  }

  // Seven days to frame for a group, kept inside the month.
  function windowOf(m, g) {
    const n = daysIn(m);
    if (g.b - g.a >= 6) return g;
    if (g.a === 1) return { a: 1, b: 7 };
    return { a: n - 6, b: n };
  }

  const defaultWeek = (m) => (weeksOf(m)[0].b - weeksOf(m)[0].a >= 6 ? 0 : 1);

  function weekLabel(m, g) {
    const mo = MONTHS[m].slice(0, 3);
    return g.a === g.b ? `${g.a} ${mo}` : `${g.a}–${g.b} ${mo}`;
  }

  // where the sheet hangs: centred over the sideboard on wide screens, nearer the lamp on a phone
  let hangX = 669;
  function sheetBox(o) {
    const g = ORIENT[o];
    const w = g.wIn * P, h = g.hIn * P;
    return { x: hangX - w / 2, y: BOTTOM - h, w, h };
  }

  function toWorld(o, r) {
    const b = sheetBox(o);
    return { x: b.x + r.x * K, y: b.y + r.y * K, w: r.w * K, h: r.h * K };
  }

  /* ───────────── elements ───────────── */

  const section = document.getElementById('distinctive');
  // a rectangle in this section's own pixels (the merged page scrolls it; standalone it sits at 0,0)
  const relRect = (n) => {
    const r = n.getBoundingClientRect(), s0 = section.getBoundingClientRect();
    return { left: r.left - s0.left, right: r.right - s0.left, top: r.top - s0.top, bottom: r.bottom - s0.top, width: r.width, height: r.height };
  };
  if (!section) return;
  const stage = section.querySelector('.dist__stage');
  const world = section.querySelector('.dist__world');
  const sheet = section.querySelector('.dist__sheet');
  const cast = section.querySelector('.dist__cast');
  const lightLayer = section.querySelector('.dist__light');
  const copy = section.querySelector('#dist-copy');
  const controls = section.querySelector('#dist-controls');
  const live = section.querySelector('#dist-live');
  const sizeLabel = section.querySelector('#dist-size');
  const zoomBtns = [...section.querySelectorAll('[data-zoom]')];
  const orientBtns = [...controls.querySelectorAll('[data-orient]')];
  const swatchWrap = section.querySelector('.dist__swatches');
  const pills = [...controls.querySelectorAll('.dist__pill')];
  const frames = [...section.querySelectorAll('.dist__frame')];
  const bgs = frames.map((f) => f.querySelector('.dist__bg'));
  const exts = frames.map((f) => f.querySelector('.dist__ext'));

  world.style.setProperty('--ext-t', `${EXT_T}px`);
  world.style.setProperty('--ext-b', `${EXT_B}px`);
  sheet.style.setProperty('--k', K.toFixed(5));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const st = {
    orient: 'horizontal',
    colour: VARIANTS[0].id,
    level: 0,        // 0 year, 1 month, 2 week
    month: null,
    week: null,      // index into weeksOf(month)
    focus: null,     // design px along the month's long axis, for small screens
    busy: false,
  };

  /* ───────────── build the two faces ───────────── */

  const SPARK = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0c.3 2.6 2.1 4.6 5 5-2.9.4-4.7 2.4-5 5-.3-2.6-2.1-4.6-5-5 2.9-.4 4.7-2.4 5-5z"/></svg>';

  function headHTML(o) {
    const title = o === 'horizontal' ? 'THE CALENDAR 2027' : '2027';
    return `<div class="dist-f-head" aria-hidden="true">
      <div class="dist-f-title">${title}</div>
      <div class="dist-f-tag"><span>to live,</span><span>is to experience</span></div>
      <div class="dist-f-mark">elmuse${SPARK}</div>
    </div>`;
  }

  function gridHTML(o) {
    let h = '';
    if (o === 'horizontal') {
      h += '<div class="dist-c"></div>';
      for (let d = 1; d <= 31; d++) h += `<div class="dist-c dist-c-dn">${d}</div>`;
      for (let m = 0; m < 12; m++) {
        h += `<div class="dist-c dist-c-mo"><b>${String(m + 1).padStart(2, '0')}</b><i>${MONTHS[m]}</i></div>`;
        const n = daysIn(m);
        for (let d = 1; d <= 31; d++) {
          if (d > n) { h += '<div class="dist-c is-void"></div>'; continue; }
          h += `<div class="dist-c dist-c-d${isWeekend(m, d) ? ' is-we' : ''}">${DAYS[weekday(m, d)]}</div>`;
        }
      }
    } else {
      for (let m = 0; m < 12; m++) {
        h += `<div class="dist-c dist-c-mo"><b>${String(m + 1).padStart(2, '0')}</b><i>${MONTHS[m]}</i></div>`;
      }
      for (let d = 1; d <= 31; d++) {
        for (let m = 0; m < 12; m++) {
          if (d > daysIn(m)) { h += '<div class="dist-c is-void"></div>'; continue; }
          h += `<div class="dist-c dist-c-d${isWeekend(m, d) ? ' is-we' : ''}"><b>${d}</b><span>${DAYS[weekday(m, d)]}</span></div>`;
        }
      }
    }
    return `<div class="dist-f-grid" aria-hidden="true">${h}</div>`;
  }

  const px = (r) => `left:${r.x.toFixed(2)}px;top:${r.y.toFixed(2)}px;width:${r.w.toFixed(2)}px;height:${r.h.toFixed(2)}px`;

  function hitsHTML(o) {
    let h = '';
    for (let m = 0; m < 12; m++) {
      h += `<button type="button" class="dist-hit dist-hit--month" data-m="${m}" tabindex="-1" aria-hidden="true" aria-label="look at ${MONTHS[m]}" style="${px(monthRect(o, m))}"></button>`;
    }
    for (let m = 0; m < 12; m++) {
      weeksOf(m).forEach((g, i) => {
        const r = union(dayRect(o, m, g.a), dayRect(o, m, g.b));
        h += `<button type="button" class="dist-hit dist-hit--week" data-m="${m}" data-w="${i}" tabindex="-1" aria-hidden="true" aria-label="look at the week of ${weekLabel(m, g).replace('–', ' to ')}" style="${px(r)}"></button>`;
      });
    }
    return `<div class="dist-f-hits">${h}</div>`;
  }

  const faces = {};
  for (const o of Object.keys(ORIENT)) {
    const f = document.createElement('div');
    f.className = `dist-face dist-face--${o[0]}`;
    f.dataset.orient = o;
    f.innerHTML = `${headHTML(o)}${gridHTML(o)}<img class="dist-f-img" alt="" decoding="async"><div class="dist-f-notes"></div>${hitsHTML(o)}`;
    sheet.insertBefore(f, lightLayer);
    faces[o] = {
      el: f,
      img: f.querySelector('.dist-f-img'),
      notes: f.querySelector('.dist-f-notes'),
      hitsLayer: f.querySelector('.dist-f-hits'),
      monthHits: [...f.querySelectorAll('.dist-hit--month')],
      weekHits: [...f.querySelectorAll('.dist-hit--week')],
    };
  }

  /* ───────────── sound, through one shared volume ───────────── */

  const sound = (() => {
    let ctx = null, out = null, noiseBuf = null, vol = 0;

    function init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      out.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    }

    function env(gain, t, peak, attack, release) {
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
    }

    function noise(t, dur) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.start(t, Math.random());
      s.stop(t + dur);
      return s;
    }

    function tone(t, freq, peak, release, type = 'sine') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      env(g, t, peak, 0.012, release);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + release + 0.05);
    }

    // a soft press: felt thump and a small click
    function tick() {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(95, t + 0.09);
      env(g, t, 0.13, 0.004, 0.11);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.16);
      const n = noise(t, 0.05);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 1.4;
      const ng = ctx.createGain();
      env(ng, t, 0.05, 0.002, 0.03);
      n.connect(bp).connect(ng).connect(out);
    }

    // paper turning on the wall
    function paper(dur) {
      const t = ctx.currentTime;
      const n = noise(t, dur + 0.1);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(1400, t);
      bp.frequency.linearRampToValueAtTime(3200, t + dur * 0.5);
      bp.frequency.linearRampToValueAtTime(1800, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(bp).connect(g).connect(out);
    }

    // air moving as we step in or out
    function whoosh(dir, dur) {
      const t = ctx.currentTime;
      const n = noise(t, dur + 0.1);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.Q.value = 0.6;
      const [a, b] = dir > 0 ? [350, 1900] : [1900, 350];
      lp.frequency.setValueAtTime(a, t);
      lp.frequency.exponentialRampToValueAtTime(b, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(lp).connect(g).connect(out);
    }

    function chime(freqs) {
      const t = ctx.currentTime;
      freqs.forEach((f, i) => tone(t + i * 0.07, f, 0.035, 1.1));
    }

    const guard = (fn) => (...a) => {
      if (!ctx || vol <= 0) return;
      try { if (ctx.state === 'suspended') ctx.resume(); fn(...a); } catch (e) { /* stay quiet */ }
    };

    return {
      volume(v) {
        vol = clamp(+v || 0, 0, 1);
        if (vol > 0 && !ctx && !init()) return;
        if (!ctx) return;
        if (vol > 0 && ctx.state === 'suspended') ctx.resume();
        out.gain.setTargetAtTime(vol * vol * 0.8, ctx.currentTime, 0.05);
      },
      wake() { if (ctx && vol > 0 && ctx.state === 'suspended') ctx.resume(); },
      tick: guard(tick),
      paper: guard(paper),
      whoosh: guard(whoosh),
      chime: guard(chime),
    };
  })();

  /* ───────────── camera ─────────────
     cam.cx, cam.cy is the world point shown at the focus: the middle of the screen
     between the top bar and the controls. */

  let vw = section.clientWidth;
  let vh = section.clientHeight;
  let topPad = 78, ctrlH = 80;
  let focus = { x: vw / 2, y: vh / 2 };
  let yearCams = {};
  let cam = { cx: 669, cy: 300, s: 1 };
  let raf = 0;
  let animToken = 0;
  let settle = null; // resolves the move in flight if it gets cut short

  function stopCam() {
    cancelAnimationFrame(raf);
    animToken++;
    if (settle) { settle(animToken); settle = null; }
  }

  const availH = () => Math.max(120, vh - topPad - ctrlH);

  function fit(r, fx, fy) {
    return { s: Math.min((vw * fx) / r.w, (availH() * fy) / r.h), cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
  }

  const clampMid = (v, a, b) => (a > b ? (a + b) / 2 : Math.min(b, Math.max(a, v)));

  // keep a zoomed view inside the room
  function inRoom(c) {
    const left = c.cx - focus.x / c.s, top = c.cy - focus.y / c.s;
    const nl = clampMid(left, 0, IMG_W - vw / c.s);
    const nt = clampMid(top, -EXT_T, IMG_H + EXT_B - vh / c.s);
    return { s: c.s, cx: nl + focus.x / c.s, cy: nt + focus.y / c.s };
  }

  function frameFor(s) {
    if (s.level === 0) return yearCams[s.orient];
    const o = s.orient;
    if (s.level === 1) {
      const r = toWorld(o, monthRect(o, s.month));
      const f = fit(r, 0.94, 0.9);
      // close enough that the smallest labels read at 10.5 px; drag to see the rest of a long month
      const minS = 10.5 / (ORIENT[o].small * K);
      if (f.s < minS) {
        f.s = minS;
        const b = sheetBox(o);
        if (o === 'horizontal') {
          const half = (vw * 0.94) / 2 / f.s;
          f.cx = clampMid(b.x + (s.focus ?? 0) * K, r.x + half, r.x + r.w - half);
        } else {
          const half = (availH() * 0.9) / 2 / f.s;
          f.cy = clampMid(b.y + (s.focus ?? 0) * K, r.y + half, r.y + r.h - half);
        }
      }
      return inRoom(f);
    }
    const g = weeksOf(s.month)[s.week];
    const w = windowOf(s.month, g);
    const r = toWorld(o, union(dayRect(o, s.month, w.a), dayRect(o, s.month, w.b)));
    return inRoom(fit(r, 0.9, 0.8));
  }

  let liftZ = -1;
  function applyCam() {
    const tx = focus.x - cam.cx * cam.s;
    const ty = focus.y - cam.cy * cam.s;
    world.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${cam.s.toFixed(5)})`;
    const dpx = (1 / (K * cam.s)).toFixed(3);
    faces[st.orient].hitsLayer.style.setProperty('--dpx', dpx);
    // looking closer brings the sheet up to reading light
    const y0 = yearCams[st.orient];
    const z = y0 ? smooth(Math.log(cam.s / y0.s) / Math.log(2)) : 0;
    if (Math.abs(z - liftZ) > 0.015 || (z !== liftZ && (z === 0 || z === 1))) { liftZ = z; relight(); }
  }

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function moveCam(to, dur) {
    stopCam();
    const token = animToken;
    if (reduceMotion.matches || dur <= 0) {
      cam = to;
      applyCam();
      return Promise.resolve(token);
    }
    const from = { ...cam };
    const l0 = Math.log(from.s), l1 = Math.log(to.s);
    const zooming = Math.abs(l1 - l0) > 1e-3;
    return new Promise((resolve) => {
      settle = resolve;
      const t0 = performance.now();
      const step = (now) => {
        if (token !== animToken) return resolve(token);
        const t = Math.min(1, (now - t0) / dur);
        const e = ease(t);
        const s = Math.exp(l0 + (l1 - l0) * e);
        // zoom about a fixed point: the centre moves in step with 1/scale
        const p = zooming ? (1 / s - 1 / from.s) / (1 / to.s - 1 / from.s) : e;
        cam = { s, cx: from.cx + (to.cx - from.cx) * p, cy: from.cy + (to.cy - from.cy) * p };
        applyCam();
        if (t < 1) raf = requestAnimationFrame(step);
        else { settle = null; resolve(token); }
      };
      raf = requestAnimationFrame(step);
    });
  }

  /* ───────────── layout: crop the room, hang the sheet, place the words ───────────── */

  const camFromView = (s, left, top) => ({ s, cx: left + focus.x / s, cy: top + focus.y / s });
  let mode = 'side';
  let copyTops = {};

  function setCopyBox(x, w) {
    section.style.setProperty('--copy-x', `${x.toFixed(1)}px`);
    section.style.setProperty('--copy-w', `${w.toFixed(1)}px`);
    return copy.offsetHeight;
  }

  // wide screens: the words on the wall to the left, the room cropped from the floor up
  function sideView(o, copyH) {
    const b = sheetBox(o);
    const sCover = vw / IMG_W;
    const sFit = (vh - topPad - 4) / (IMG_H - b.y);
    const sRoom = (vw / 2 - 330) / 288; // leave the words their room left of a 3 ft sheet
    let s = Math.max(sCover, Math.min(sFit, sRoom));
    let top;
    for (let i = 0; i < 40; i++) {
      top = s * (IMG_H - b.y) + topPad + 4 <= vh ? IMG_H - vh / s : b.y - topPad / s;
      const calBottom = (b.y + b.h - top) * s;
      if (calBottom <= vh - ctrlH - 10 || s <= sCover) break;
      s = Math.max(sCover, s * 0.97);
    }
    top = clamp(top, -EXT_T, IMG_H + EXT_B - vh / s);
    const left = clamp(hangX - vw / (2 * s), 0, IMG_W - vw / s);
    const cy = (b.y + b.h / 2 - top) * s;
    const booksTop = (430 - top) * s;
    copyTops[o] = clamp(cy - copyH / 2 - 10, topPad + 12, Math.max(topPad + 12, booksTop - copyH - 28));
    return camFromView(s, left, top);
  }

  // phones and narrow screens: words at the top, the sheet under them, the lamp at the edge
  function stackView(o, copyH) {
    const b = sheetBox(o);
    const viewMid = vw < 900 ? 753 : hangX;
    const sA = Math.min((vw - 32) / 576, vw / 740);
    const room = vh - topPad - copyH - 22 - ctrlH - 16;
    // the sheet, its gap and a band of the sideboard's top all fit above the controls
    const s = Math.max(vw / IMG_W, Math.min(sA, room / (BOARD_TOP + 26 - b.y)));
    let top = b.y - (topPad + copyH + 22) / s;
    top -= Math.max(0, room - (BOARD_TOP + 26 - b.y) * s) * 0.45 / s; // spare room goes between the words and the sheet
    top = clamp(top, -EXT_T, IMG_H + EXT_B - vh / s);
    const left = clamp(viewMid - vw / (2 * s), 0, IMG_W - vw / s);
    copyTops[o] = topPad + 2;
    return camFromView(s, left, top);
  }

  function layout() {
    vw = section.clientWidth; vh = section.clientHeight;
    if (!vw || !vh) return;
    const narrow = vw < 900;
    topPad = narrow ? 62 : 78;
    const sr = section.getBoundingClientRect(), cr = controls.getBoundingClientRect();
    ctrlH = sr.bottom - cr.top + 10;
    focus = { x: vw / 2, y: topPad + availH() / 2 };
    hangX = narrow ? 700 : 669;
    world.style.setProperty('--hx', `${sheetBox('horizontal').x}px`);
    world.style.setProperty('--hy', `${sheetBox('horizontal').y}px`);
    world.style.setProperty('--vx', `${sheetBox('vertical').x}px`);
    world.style.setProperty('--vy', `${sheetBox('vertical').y}px`);

    // side by side when the words fit left of the sheet, else stacked
    let side = false;
    if (!narrow) {
      const copyX = clamp(vw * 0.05, 40, 80);
      const trial = sideView('horizontal', 300);
      const calLeft = (sheetBox('horizontal').x - (trial.cx - focus.x / trial.s)) * trial.s;
      const w = Math.min(380, calLeft - copyX - 44);
      if (w >= 220) {
        side = true;
        const copyH = setCopyBox(copyX, w);
        yearCams = { horizontal: sideView('horizontal', copyH), vertical: sideView('vertical', copyH) };
      }
    }
    if (!side) {
      const x = narrow ? 16 : 40;
      const copyH = setCopyBox(x, Math.min(560, vw - 2 * x));
      yearCams = { horizontal: stackView('horizontal', copyH), vertical: stackView('vertical', copyH) };
    }
    mode = side ? 'side' : 'stack';
    section.dataset.mode = mode;
    placeCopy();

    stopCam();
    cam = frameFor(st);
    liftZ = -1;
    applyCam();
    buildLight();
    setTime(tod);
    if (st.level === 2 && !faces[st.orient].notes.children.length) showNotes();
  }

  function placeCopy() {
    section.style.setProperty('--copy-y', `${(copyTops[st.orient] ?? topPad).toFixed(1)}px`);
  }

  /* ───────────── the room's pictures: grown wall, light maps ───────────── */

  const frameData = [null, null, null, null]; // per frame: quarter-size room pixels, wall grown above, floor below

  function loadFrame(k) {
    const img = bgs[k];
    if (img.getAttribute('src')) return;
    img.addEventListener('load', () => buildFrame(k), { once: true });
    img.src = img.dataset.src;
  }

  // a running box blur along one row of rgb floats
  function hblur(row, r) {
    r = Math.max(0, Math.round(r));
    if (!r) return row;
    const out = new Float32Array(row.length);
    for (let c = 0; c < 3; c++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += row[clamp(i, 0, LW - 1) * 3 + c];
      for (let x = 0; x < LW; x++) {
        out[x * 3 + c] = acc / (2 * r + 1);
        acc += row[clamp(x + r + 1, 0, LW - 1) * 3 + c] - row[clamp(x - r, 0, LW - 1) * 3 + c];
      }
    }
    return out;
  }

  function buildFrame(k) {
    let src;
    try {
      const cv = document.createElement('canvas');
      cv.width = LW; cv.height = LH_I;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(bgs[k], 0, SHIFT[k] / LR, LW, LH_I);
      src = cx.getImageData(0, 0, LW, LH_I).data;
    } catch (e) { return; } // no pixels to read (opened from disk): the photo still shows, uncropped room stays plain

    const rowAt = (y) => {
      const r = new Float32Array(LW * 3);
      for (let x = 0; x < LW; x++) for (let c = 0; c < 3; c++) r[x * 3 + c] = src[(y * LW + x) * 4 + c];
      return r;
    };
    const avgRows = (ys) => {
      const r = new Float32Array(LW * 3);
      ys.forEach((y) => { const a = rowAt(y); for (let i = 0; i < r.length; i++) r[i] += a[i] / ys.length; });
      return r;
    };
    const data = new Uint8ClampedArray(LW * LH * 4);
    const put = (y, row, gain) => {
      for (let x = 0; x < LW; x++) {
        const p = (y * LW + x) * 4;
        data[p] = row[x * 3] * gain; data[p + 1] = row[x * 3 + 1] * gain; data[p + 2] = row[x * 3 + 2] * gain; data[p + 3] = 255;
      }
    };
    // the photograph itself (its last row can be short after the alignment nudge)
    const lastGood = LH_I - 2;
    for (let y = 0; y < LH_I; y++) put(LH_T + y, rowAt(Math.min(y, lastGood)), 1);

    // the wall above: the top band mirrored and softened, settling into the wall's own tone
    const flatTop = hblur(avgRows([0, 1, 2, 3]), 70);
    for (let d = 1; d <= LH_T; d++) {
      const m = hblur(rowAt(Math.min(d - 1, 44)), 2 + d * 0.3);
      const w = smooth(d / 64);
      const row = new Float32Array(LW * 3);
      for (let i = 0; i < row.length; i++) row[i] = m[i] + (flatTop[i] - m[i]) * w;
      put(LH_T - d, row, 1 - 0.08 * (d / LH_T));
    }
    // the floor below: its last rows softened into an out-of-focus foreground
    const flatBot = hblur(avgRows([lastGood - 3, lastGood - 2, lastGood - 1, lastGood]), 50);
    for (let d = 1; d <= LH_B; d++) {
      const m = hblur(rowAt(lastGood - Math.min(d - 1, 4)), 2 + d * 0.5);
      const w = smooth(d / 14);
      const row = new Float32Array(LW * 3);
      for (let i = 0; i < row.length; i++) row[i] = m[i] + (flatBot[i] - m[i]) * w;
      put(LH_T + LH_I - 1 + d, row, 1 - 0.16 * (d / LH_B));
    }

    const ext = exts[k];
    ext.width = LW; ext.height = LH;
    ext.getContext('2d').putImageData(new ImageData(data, LW, LH), 0, 0);
    frameData[k] = data;
    buildLight(k);
    setTime(tod);
  }

  // world point to the quarter-size room, bilinear
  function sampleWorld(data, wx, wy, out) {
    const fx = clamp(wx / LR - 0.5, 0, LW - 1.001), fy = clamp((wy + EXT_T) / LR - 0.5, 0, LH - 1.001);
    const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    for (let c = 0; c < 3; c++) {
      const p00 = data[(y0 * LW + x0) * 4 + c], p10 = data[(y0 * LW + x0 + 1) * 4 + c];
      const p01 = data[((y0 + 1) * LW + x0) * 4 + c], p11 = data[((y0 + 1) * LW + x0 + 1) * 4 + c];
      out[c] = (p00 * (1 - ax) + p10 * ax) * (1 - ay) + (p01 * (1 - ax) + p11 * ax) * ay;
    }
    return out;
  }

  // The wall's light where the sheet hangs, carried onto the paper: a matte sheet on a matte wall
  // takes the same light, so paper = print × (wall ÷ wall's white). The average goes into the
  // relit palette; how each spot differs from that average goes into two overlays on the sheet.
  const lights = [null, null, null, null]; // per frame: { mean, shade canvas, lift canvas, lowest }
  const lightCanvases = [0, 1, 2, 3].map(() => {
    const shade = document.createElement('canvas'); shade.className = 'is-shade';
    const lift = document.createElement('canvas'); lift.className = 'is-lift';
    lightLayer.append(shade, lift);
    return { shade, lift };
  });
  // the print's paper tooth, about as fine as the plaster's grain in the photograph
  const grain = document.createElement('div');
  grain.className = 'dist__grain';
  (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    const d = x.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 128 + (Math.random() + Math.random() - 1) * 24;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    grain.style.backgroundImage = `url(${c.toDataURL()})`;
  })();
  lightLayer.append(grain);

  function buildLight(only) {
    const b = sheetBox(st.orient);
    const cw = Math.round(b.w / LR), ch = Math.round(b.h / LR);
    for (let k = 0; k < 4; k++) {
      if (only != null && k !== only) continue;
      const data = frameData[k];
      if (!data) continue;
      const raw = new Float32Array(cw * ch * 3);
      const tmp = [0, 0, 0];
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        sampleWorld(data, b.x + (i + 0.5) * LR, b.y + (j + 0.5) * LR, tmp);
        raw.set(tmp, (j * cw + i) * 3);
      }
      // soften the plaster's grain so only the light comes through
      const sm = new Float32Array(raw.length);
      const mean = [0, 0, 0];
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        for (let c = 0; c < 3; c++) {
          let a = 0, n = 0;
          for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
            const jj = clamp(j + dj, 0, ch - 1), ii = clamp(i + di, 0, cw - 1);
            a += raw[(jj * cw + ii) * 3 + c]; n++;
          }
          sm[(j * cw + i) * 3 + c] = a / n;
          mean[c] += a / n / (cw * ch);
        }
      }
      const { shade, lift } = lightCanvases[k];
      shade.width = lift.width = cw; shade.height = lift.height = ch;
      const sd = new ImageData(cw, ch), ld = new ImageData(cw, ch);
      let lowest = 1;
      for (let p = 0; p < cw * ch; p++) {
        let rl = 0;
        for (let c = 0; c < 3; c++) {
          const r = sm[p * 3 + c] / Math.max(1, mean[c]);
          sd.data[p * 4 + c] = 255 * Math.min(1, r);
          ld.data[p * 4 + c] = 255 * Math.min(0.72, 1 - 1 / Math.max(1, r));
          rl += r / 3;
        }
        sd.data[p * 4 + 3] = ld.data[p * 4 + 3] = 255;
        lowest = Math.min(lowest, rl);
      }
      shade.getContext('2d').putImageData(sd, 0, 0);
      lift.getContext('2d').putImageData(ld, 0, 0);
      lights[k] = { mean, lowest };
    }
  }

  /* ───────────── time of day: blend the four frames and relight the sheet ───────────── */

  let tod = 1 / 3;
  let weights = [0, 1, 0, 0];

  function setTime(t) {
    tod = clamp(+t || 0, 0, 1);
    const seg = tod * 3, k = Math.min(2, Math.floor(seg)), f = seg - k;
    weights = [0, 0, 0, 0]; weights[k] = 1 - f; weights[k + 1] = f;
    frames.forEach((fr, i) => {
      if (i === k || i === k + 1) loadFrame(i);
      fr.style.opacity = i === k ? 1 : i === k + 1 ? f.toFixed(3) : 0;
    });
    const L = mix(LIGHT[k].cast, LIGHT[k + 1].cast, f);
    const c = world.style;
    c.setProperty('--cast-x', `${L[0].toFixed(2)}px`);
    c.setProperty('--cast-y', `${L[1].toFixed(2)}px`);
    c.setProperty('--cast-b', `${L[2].toFixed(2)}px`);
    c.setProperty('--cast-o', L[3].toFixed(3));
    c.setProperty('--cast-c', css(L[4]));
    relight();
    queueInk();
  }

  // the wall's average colour behind the sheet now, from whichever frames have been read
  function wallMean() {
    let ws = 0;
    const m = [0, 0, 0];
    weights.forEach((w, i) => {
      if (!w || !lights[i]) return;
      for (let c = 0; c < 3; c++) m[c] += w * lights[i].mean[c];
      ws += w;
    });
    return ws ? m.map((v) => v / ws) : null;
  }

  let litPaper = hexRGB('#303b20');

  function relight() {
    const v = VARIANTS.find((x) => x.id === st.colour);
    if (!v || !v.palette) return;
    const z = Math.max(0, liftZ);
    const wm = wallMean();
    let m = wm ? wm.map((x, i) => clamp(x / REF[i], 0.12, 1)) : [1, 1, 1];
    // reading light: the same hue, lifted and partly white-balanced, as you lean in
    const top = Math.max(...m);
    const read = m.map((x) => mix(x / top, 1, 0.55) * 0.97);
    m = mix(m, read, z);

    const pal = {};
    for (const [key, hex] of Object.entries(v.palette)) pal[key] = hexRGB(hex).map((x, i) => x * m[i]);
    // when zoomed in, every word on the sheet clears 5:1 against paper and weekend tint
    if (z > 0) {
      const bgL = [lum(pal.paper), lum(pal.tint)];
      const lightText = lum(pal.wday) > bgL[0];
      const extreme = lightText ? [255, 255, 255] : [0, 0, 0];
      for (const key of TEXT_KEYS) {
        let a = 0, col = pal[key];
        while (a < 1 && Math.min(...bgL.map((L) => contrast(lum(col), L))) < 8) {
          a += 0.04;
          col = mix(pal[key], extreme, a);
        }
        pal[key] = mix(pal[key], col, z);
      }
    }
    const s = sheet.style;
    for (const [key, c] of Object.entries(pal)) s.setProperty(`--${key}`, css(c));
    s.setProperty('--dim', css(pal.void, v.dimA));
    litPaper = pal.paper;

    // the wall's light and shade across the sheet: strong on the wall, faint when reading
    const alpha = mix(0.9, 0.32, z);
    lightCanvases.forEach((lc, i) => {
      const o = lights[i] ? (weights[i] * alpha).toFixed(3) : 0;
      lc.shade.style.opacity = o;
      lc.lift.style.opacity = o;
    });
    // on the wall the print is as soft as the photograph round it; leaning in, it is crisp
    grain.style.opacity = (0.6 * (1 - z)).toFixed(3);
    sheet.style.filter = z < 0.02 ? 'blur(.3px)' : '';
  }

  function clockToT(h) {
    const pts = [[0, 1], [5, 1], [6.5, 0], [10, 0.1], [13.5, 0.333], [16.5, 0.45], [18.5, 0.667], [20, 0.85], [21.5, 1], [24, 1]];
    for (let i = 1; i < pts.length; i++) {
      if (h <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (h - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
    }
    return 1;
  }

  /* ───────────── readable at every hour: measure the pixels behind each group ───────────── */

  // luminance behind a screen rectangle: the room's pixels, or the relit paper where the sheet is
  function behind(r) {
    if (!frameData.some(Boolean)) return null;
    const b = sheetBox(st.orient);
    const vals = [];
    const tmp = [0, 0, 0];
    const nx = 28, ny = 8;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const sx = r.left + (i + 0.5) * r.width / nx, sy = r.top + (j + 0.5) * r.height / ny;
      const wx = cam.cx + (sx - focus.x) / cam.s, wy = cam.cy + (sy - focus.y) / cam.s;
      if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) { vals.push(lum(litPaper)); continue; }
      let L = 0, ws = 0;
      for (let k = 0; k < 4; k++) {
        if (!weights[k] || !frameData[k]) continue;
        L += weights[k] * lum(sampleWorld(frameData[k], wx, wy, tmp)); ws += weights[k];
      }
      if (ws) vals.push(L / ws);
    }
    if (!vals.length) return null;
    vals.sort((a, c) => a - c);
    return { lo: vals[Math.floor(vals.length * 0.1)], hi: vals[Math.floor(vals.length * 0.9)] };
  }

  const DARK = [51, 56, 45], LIGHTC = [230, 223, 211]; // the weakest text colour in each set
  function needs(Lb, inkL, tintL, target) {
    // alpha of a tint over the backdrop so the ink reaches the target contrast
    for (let a = 0; a <= 0.95; a += 0.01) {
      if (contrast(Lb * (1 - a) + tintL * a, inkL) >= target) return a;
    }
    return 0.95;
  }
  function choose(Lb, target, minA, preferLight) {
    // dark ink must clear the darkest backdrop, light ink the brightest; pick whichever needs less tint
    const aDark = needs(Lb.lo, lum(DARK), 1, target);
    const aLight = needs(Lb.hi, lum(LIGHTC), lum([18, 16, 22]), target);
    const light = aLight < aDark + (preferLight || 0);
    return { light, a: Math.max(minA, light ? aLight : aDark) };
  }

  function updateInk() {
    if (!frameData.some(Boolean)) return;
    if (st.level === 0) {
      const cb = behind(relRect(copy));
      if (cb) {
        // in dim light a soft dark halo round light letters reads as shade; a pale patch would look like fog
        const c = choose(cb, 6, 0, 0.4);
        const s = copy.style;
        s.setProperty('--ui-fg', c.light ? '#f7f3ed' : '#141414');
        s.setProperty('--ui-fg-2', c.light ? '#e6dfd3' : '#33382d');
        s.setProperty('--ui-head', c.light ? '#f7f3ed' : 'var(--forest)');
        const tint = c.light ? '18,16,22,' : '250,246,238,';
        const sa = Math.min(0.85, c.a * 0.8), ha = Math.min(0.95, c.a * 1.6);
        s.setProperty('--copy-scrim', `rgba(${tint}${sa.toFixed(2)})`);
        s.setProperty('--copy-halo', c.a > 0 ? `0 0 3px rgba(${tint}${(ha * 0.7).toFixed(2)}), 0 0 14px rgba(${tint}${ha.toFixed(2)})` : 'none');
      }
    }
    pills.forEach((pill) => {
      const Lb = behind(relRect(pill));
      if (!Lb) return;
      const c = choose(Lb, 6.5, 0.26, tod > 0.55 ? 0.35 : 0); // after dark, keep the glass dark unless the lamp really demands otherwise
      pill.style.setProperty('--glass', c.light ? `rgba(18,16,22,${c.a.toFixed(2)})` : `rgba(255,253,248,${c.a.toFixed(2)})`);
      pill.style.setProperty('--glass-line', c.light ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.65)');
      pill.dataset.ink = c.light ? 'light' : 'dark';
    });
  }
  let inkQueued = false;
  function queueInk() {
    if (inkQueued) return;
    inkQueued = true;
    requestAnimationFrame(() => { inkQueued = false; updateInk(); });
  }

  /* ───────────── notes ───────────── */

  function clearNotes() {
    for (const o of Object.keys(faces)) {
      const layer = faces[o].notes;
      if (!layer.children.length) continue;
      if (reduceMotion.matches) { layer.textContent = ''; continue; }
      [...layer.children].forEach((n) => {
        n.classList.add('is-leaving');
        setTimeout(() => n.remove(), 260);
      });
    }
  }

  function showNotes() {
    const o = st.orient, m = st.month;
    const g = weeksOf(m)[st.week];
    const w = windowOf(m, g);
    const set = NOTE_SETS[(m * 5 + st.week) % NOTE_SETS.length];
    const days = [];
    for (let d = w.a; d <= w.b; d++) days.push(d);
    const used = new Set();
    const placed = [];
    for (const n of set) {
      const d = days.find((x) => weekday(m, x) === n.wd && !used.has(x));
      if (d) { used.add(d); placed.push({ ...n, d }); }
    }
    // a short month end can miss a weekday; keep at least two notes
    for (const n of set) {
      if (placed.length >= 2) break;
      if (placed.some((p) => p.text === n.text)) continue;
      const d = days.find((x) => !used.has(x) && !isWeekend(m, x));
      if (d) { used.add(d); placed.push({ ...n, d }); }
    }
    placed.sort((a, b) => a.d - b.d);

    const layer = faces[o].notes;
    layer.textContent = '';
    placed.forEach((n, i) => {
      const r = dayRect(o, m, n.d);
      const el = document.createElement('div');
      el.className = `dist-note${n.mark ? ' is-mark' : ''}`;
      if (o === 'horizontal') {
        el.style.cssText = `left:${r.x + 8}px;top:${r.y + 28}px;width:${r.w - 12}px;font-size:16px;`;
      } else {
        el.style.cssText = `left:${r.x + 10}px;top:${r.y + 25}px;width:${r.w - 16}px;font-size:17px;white-space:nowrap;`;
      }
      el.style.setProperty('--r', `${i % 2 ? 1.5 : -2.5}deg`);
      el.style.setProperty('--delay', `${0.15 + i * 0.35}s`);
      el.innerHTML = `<span>${n.text}</span>`;
      layer.append(el);
    });
  }

  /* ───────────── hits, controls, announcements ───────────── */

  function syncHits() {
    for (const o of Object.keys(faces)) {
      const f = faces[o];
      const active = o === st.orient;
      f.el.toggleAttribute('inert', !active);
      f.el.setAttribute('aria-hidden', active ? 'false' : 'true');
      f.monthHits.forEach((b, m) => {
        const tab = active && st.level === 0;
        const isLive = active && (st.level === 0 || m !== st.month);
        b.classList.toggle('is-live', isLive);
        b.classList.toggle('is-pan', st.level > 0);
        b.tabIndex = tab ? 0 : -1;
        b.setAttribute('aria-hidden', tab ? 'false' : 'true');
      });
      f.weekHits.forEach((b) => {
        const m = +b.dataset.m, w = +b.dataset.w;
        const here = active && st.level >= 1 && m === st.month;
        const tab = here && st.level === 1;
        b.classList.toggle('is-live', here && !(st.level === 2 && w === st.week));
        b.tabIndex = tab ? 0 : -1;
        b.setAttribute('aria-hidden', tab ? 'false' : 'true');
      });
    }
  }

  function syncControls() {
    zoomBtns.forEach((b) => {
      const z = +b.dataset.zoom;
      b.setAttribute('aria-pressed', String(z === st.level));
      if (z === 1) b.textContent = st.level >= 1 ? MONTHS[st.month] : 'month';
      if (z === 2) b.textContent = st.level === 2 ? weekLabel(st.month, weeksOf(st.month)[st.week]) : 'week';
    });
    zoomBtns[1].setAttribute('aria-label', st.level >= 1 ? `month: ${MONTHS[st.month]}` : 'month');
    zoomBtns[2].setAttribute('aria-label', st.level === 2 ? `week: ${weekLabel(st.month, weeksOf(st.month)[st.week]).replace('–', ' to ')}` : 'week');
    orientBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.orient === st.orient)));
    swatchWrap.querySelectorAll('.dist__swatch').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.colour === st.colour)));
    sizeLabel.textContent = ORIENT[st.orient].size;
    section.dataset.level = String(st.level);
    section.dataset.orient = st.orient;
  }

  function announce(text) {
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  }

  function placeName() {
    if (st.level === 0) return `the whole of ${YEAR}`;
    if (st.level === 1) return `${MONTHS[st.month]} ${YEAR}`;
    return `the week of ${weekLabel(st.month, weeksOf(st.month)[st.week]).replace('–', ' to ')}`;
  }

  /* ───────────── moving between year, month and week ───────────── */

  async function go(next, { kbd = false } = {}) {
    const prev = { ...st };
    Object.assign(st, next);
    if (st.level >= 1 && st.month == null) st.month = 0;
    if (st.level === 2 && st.week == null) st.week = defaultWeek(st.month);
    if (st.level >= 1 && st.focus == null) {
      const g = weeksOf(st.month)[st.week ?? defaultWeek(st.month)];
      const r = union(dayRect(st.orient, st.month, g.a), dayRect(st.orient, st.month, g.b));
      st.focus = st.orient === 'horizontal' ? r.x + r.w / 2 : r.y + r.h / 2;
    }

    const sameWeek = prev.level === 2 && st.level === 2 && prev.month === st.month && prev.week === st.week;
    if (prev.level === 2 && !sameWeek) clearNotes();
    syncHits();
    syncControls();

    const to = frameFor(st);
    const dir = Math.sign(Math.log(to.s / cam.s));
    if (Math.abs(to.s - cam.s) / cam.s > 0.05) sound.whoosh(dir, 0.9);
    else if (!sameWeek) sound.tick();

    const token = await moveCam(to, Math.abs(Math.log(to.s / cam.s)) > 0.05 ? 1050 : 650);
    if (token !== animToken) return;
    queueInk();

    if (st.level === 2 && !sameWeek) {
      showNotes();
      if (dir > 0) sound.chime([783.99]);
    }
    announce(placeName());

    if (kbd) {
      if (st.level === 1) {
        const first = faces[st.orient].weekHits.find((b) => +b.dataset.m === st.month);
        if (first) first.focus({ preventScroll: true });
      } else {
        zoomBtns[st.level].focus({ preventScroll: true });
      }
    }
  }

  const goUp = (kbd) => {
    if (st.level === 2) go({ level: 1 }, { kbd });
    else if (st.level === 1) go({ level: 0 }, { kbd });
  };

  // where along the month a click landed, so a phone frames the right part
  function focusFromEvent(e) {
    const box = faces[st.orient].el.getBoundingClientRect();
    const g = ORIENT[st.orient];
    if (e.clientX == null || (e.detail === 0)) return null;
    if (st.orient === 'horizontal') return ((e.clientX - box.left) / box.width) * g.W;
    return ((e.clientY - box.top) / box.height) * g.H;
  }

  // in a month, drag along it to see the rest
  let pan = null, swallowClick = false;
  function panLimits() {
    const o = st.orient, r = toWorld(o, monthRect(o, st.month));
    if (o === 'horizontal') {
      const half = (vw * 0.47) / cam.s;
      return { x0: r.x + half, x1: r.x + r.w - half, y0: cam.cy, y1: cam.cy };
    }
    const half = (availH() * 0.45) / cam.s;
    return { x0: cam.cx, x1: cam.cx, y0: r.y + half, y1: r.y + r.h - half };
  }
  stage.addEventListener('pointerdown', (e) => {
    if (st.level !== 1 || st.busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pan = { x: e.clientX, y: e.clientY, cx: cam.cx, cy: cam.cy, id: e.pointerId, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!pan || e.pointerId !== pan.id) return;
    const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
    if (!pan.moved && Math.hypot(dx, dy) < 8) return;
    if (!pan.moved) { pan.moved = true; stopCam(); stage.classList.add('is-panning'); }
    const lim = panLimits();
    cam = { s: cam.s, cx: clampMid(pan.cx - dx / cam.s, lim.x0, lim.x1), cy: clampMid(pan.cy - dy / cam.s, lim.y0, lim.y1) };
    applyCam();
  });
  const endPan = (e) => {
    if (!pan || (e && e.pointerId !== pan.id)) return;
    if (pan.moved) {
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 0);
      const b = sheetBox(st.orient);
      st.focus = st.orient === 'horizontal' ? (cam.cx - b.x) / K : (cam.cy - b.y) / K;
      stage.classList.remove('is-panning');
      queueInk();
    }
    pan = null;
  };
  window.addEventListener('pointerup', endPan);
  window.addEventListener('pointercancel', endPan);

  stage.addEventListener('click', (e) => {
    if (st.busy || swallowClick) return;
    const hit = e.target.closest('.dist-hit');
    const kbd = e.detail === 0;
    if (hit && hit.classList.contains('is-live')) {
      const m = +hit.dataset.m;
      if (hit.classList.contains('dist-hit--month')) {
        go({ level: 1, month: m, week: null, focus: focusFromEvent(e) }, { kbd });
      } else {
        go({ level: 2, month: m, week: +hit.dataset.w, focus: null }, { kbd });
      }
      return;
    }
    // a click on the wall steps back out
    if (!e.target.closest('.dist__sheet') && st.level > 0) goUp(false);
  });

  section.addEventListener('pointerdown', () => sound.wake());

  section.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && st.level > 0 && !st.busy) {
      e.preventDefault();
      goUp(true);
    }
  });

  zoomBtns.forEach((b) => b.addEventListener('click', () => {
    if (st.busy) return;
    const z = +b.dataset.zoom;
    if (z === st.level) return;
    if (z === 0) go({ level: 0 });
    else if (z === 1) go({ level: 1, month: st.month ?? 0, focus: st.level === 2 ? null : st.focus });
    else go({ level: 2, month: st.month ?? 0, week: st.week ?? defaultWeek(st.month ?? 0) });
  }));

  /* ───────────── orientation ───────────── */

  async function setOrient(o) {
    if (o === st.orient || st.busy) return;
    st.busy = true;
    sound.tick();
    if (st.level > 0) {
      clearNotes();
      st.level = 0;
      syncHits();
      syncControls();
      sound.whoosh(-1, 0.9);
      await moveCam(frameFor(st), 1000);
    }
    const from = faces[st.orient];
    const to = faces[o];
    const turn = o === 'vertical' ? 90 : -90;
    const a = sheetBox(st.orient), b = sheetBox(o);
    const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
    st.week = null; st.focus = null;

    // the room reframes for the new shape while the sheet turns
    section.style.setProperty('--copy-y', `${(copyTops[o] ?? topPad).toFixed(1)}px`);
    const camMove = moveCam(yearCams[o], 900);

    if (!reduceMotion.matches && sheet.animate) {
      sound.paper(0.9);
      from.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      cast.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 900 });
      await sheet.animate([
        { transform: 'translateY(0) rotate(0deg) scale(1)' },
        { transform: `translateY(${dy / 2}px) rotate(${turn / 2}deg) scale(1.035)`, offset: 0.5 },
        { transform: `translateY(${dy}px) rotate(${turn}deg) scale(1)` },
      ], { duration: 900, easing: 'cubic-bezier(.65,0,.35,1)' }).finished.catch(() => {});
      from.el.getAnimations().forEach((x) => x.cancel());
    }
    await camMove;

    st.orient = o;
    sheet.dataset.orient = o;
    cast.dataset.orient = o;
    from.el.hidden = true;
    to.el.hidden = false;
    setImage();
    syncHits();
    syncControls();
    cam = yearCams[o];
    liftZ = -1;
    applyCam();
    buildLight();
    setTime(tod);
    if (!reduceMotion.matches && to.el.animate) {
      to.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
      cast.animate([{ opacity: 0 }, { opacity: getComputedStyle(cast).opacity }], { duration: 450, easing: 'ease-out' });
    }
    announce(`${o}, ${ORIENT[o].size.replace('×', 'by')}`);
    st.busy = false;
  }

  orientBtns.forEach((b) => b.addEventListener('click', () => setOrient(b.dataset.orient)));

  /* ───────────── colour ───────────── */

  function setImage() {
    const v = VARIANTS.find((x) => x.id === st.colour);
    sheet.dataset.render = v.render === 'image' ? 'image' : 'live';
    const img = faces[st.orient].img;
    if (v.render === 'image') img.src = v.images[st.orient];
    else img.removeAttribute('src');
  }

  let recolourTimer = 0;
  function setColour(id) {
    if (id === st.colour) return;
    st.colour = id;
    if (!reduceMotion.matches) {
      sheet.classList.add('is-recolouring');
      clearTimeout(recolourTimer);
      recolourTimer = setTimeout(() => sheet.classList.remove('is-recolouring'), 560);
    }
    sheet.dataset.colour = id;
    setImage();
    relight();
    syncControls();
    queueInk();
    sound.tick();
    announce(VARIANTS.find((v) => v.id === id).label);
  }

  VARIANTS.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dist__swatch';
    b.dataset.colour = v.id;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="dist__dot" style="--dot:${v.swatch}" aria-hidden="true"></span>${v.label}`;
    b.addEventListener('click', () => setColour(v.id));
    swatchWrap.append(b);
  });

  /* ───────────── the shared bar talks to us through two events ───────────── */

  window.addEventListener('elmuse:time', (e) => { if (e.detail && e.detail.t != null) setTime(e.detail.t); });
  window.addEventListener('elmuse:volume', (e) => { if (e.detail && e.detail.v != null) sound.volume(e.detail.v); });
  window.distinctive = {
    setTime,
    setVolume: (v) => sound.volume(v),
    get time() { return tod; },
  };

  /* ───────────── start ───────────── */

  faces.vertical.el.hidden = true;
  sheet.dataset.colour = st.colour;
  setImage();
  syncHits();
  syncControls();
  const now = new Date();
  tod = clockToT(now.getHours() + now.getMinutes() / 60);
  layout();

  new ResizeObserver(() => {
    if (section.clientWidth === vw && section.clientHeight === vh) return;
    layout();
  }).observe(section);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // the other two frames load once the page has settled
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  window.addEventListener('load', () => idle(() => frames.forEach((_, i) => loadFrame(i))));
})();
