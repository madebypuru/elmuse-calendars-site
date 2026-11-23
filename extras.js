/* Where enquiries go. Fill these in when they are known; until then the page says plainly that nothing was sent. */
const ELMUSE_CONFIG = { whatsappNumber: '', enquiryEndpoint: '', waitlistEndpoint: '' };

/* Opening (a parcel on the table), For your team (your name burnt into birch) and Enquire (a glass card on the wall). */
(function () {
  'use strict';

  var openSec = document.getElementById('opening');
  var teamSec = document.getElementById('team');
  var enqSec = document.getElementById('enquire');
  if (!openSec && !teamSec && !enqSec) return;

  var IMG_W = 1344, IMG_H = 752;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 400); };
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function mix(a, b, f) {
    if (typeof a === 'number') return a + (b - a) * f;
    return a.map(function (v, i) { return mix(v, b[i], f); });
  }
  function rgba(c, a) { return 'rgba(' + c.slice(0, 3).map(Math.round).join(',') + ',' + (+a).toFixed(3) + ')'; }
  function anim(node, frames, opts) {
    if (reduce.matches || !node || !node.animate) return Promise.resolve(null);
    var a = node.animate(frames, opts);
    return a.finished.then(function () { return a; }, function () { return null; });
  }
  function later(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------------- colour and contrast (as in the Sanctuary section) ---------------- */
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function contrast(a, b) { return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
  var DARK = [51, 56, 45], LIGHTC = [230, 223, 211], TINT_D = [18, 16, 22];
  // glass is composited in gamma-encoded sRGB, so mix there and judge in linear light
  function enc(L) { return L <= 0.0031308 ? 12.92 * L : 1.055 * Math.pow(L, 1 / 2.4) - 0.055; }
  function dec(e) { return e <= 0.04045 ? e / 12.92 : Math.pow((e + 0.055) / 1.055, 2.4); }
  function needs(Lb, inkL, tintL, target) {
    var eb = enc(Lb), et = enc(tintL);
    for (var a = 0; a <= 0.95; a += 0.01) {
      if (contrast(dec(eb * (1 - a) + et * a), inkL) >= target) return a;
    }
    return 0.95;
  }
  function choose(Lb, target, minA, preferLight) {
    var aDark = needs(Lb.lo, lum(DARK), 1, target), aLight = needs(Lb.hi, lum(LIGHTC), lum(TINT_D), target);
    var light = aLight < aDark + (preferLight || 0);
    return { light: light, a: Math.max(minA, light ? aLight : aDark) };
  }

  /* ---------------- a scene: four frames of one view, blended by the time of day ---------------- */
  var SW = 168, SH = 94, LW = 336, LH = 188;
  var tod = 0.33, volume = 0;
  var scenes = [];

  function makeScene(section, cfg) {
    var sc = {
      section: section, cfg: cfg,
      el: section.querySelector('.ex__scene'),
      canvas: section.querySelector('.ex__canvas'),
      bgs: Array.prototype.slice.call(section.querySelectorAll('.ex__bg')),
      inks: Array.prototype.slice.call(section.querySelectorAll('[data-ink]')),
      samples: [], lits: [], weights: [0, 1, 0, 0], k: 1, f: 0,
      s: 1, ox: 0, oy: 0, active: false
    };
    section.querySelectorAll('[data-lit]').forEach(function (host) {
      var lit = document.createElement('span');
      lit.className = 'ex__lit';
      for (var i = 0; i < 4; i++) lit.appendChild(document.createElement('i'));
      host.appendChild(lit);
      sc.lits.push(lit);
    });
    sc.bgs.forEach(function (img, i) {
      img.decoding = 'async';
      img.addEventListener('load', function () { analyse(sc, img, i); });
    });
    scenes.push(sc);
    return sc;
  }

  // read the frame twice: a small copy to judge text colour, and a blurred light map to lay over objects
  function analyse(sc, img, i) {
    try {
      var cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
      var cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, SW, SH);
      sc.samples[i] = cx.getImageData(0, 0, SW, SH).data;

      var lc = document.createElement('canvas'); lc.width = LW; lc.height = LH;
      var lx = lc.getContext('2d', { willReadFrequently: true });
      lx.imageSmoothingQuality = 'high';
      lx.drawImage(img, 0, 0, LW, LH);
      // blur away the wood grain but keep the shapes of the light (leaf shadows, the lamp's pool)
      if ('filter' in lx) { lx.filter = 'blur(1.6px)'; lx.drawImage(img, 0, 0, LW, LH); lx.filter = 'none'; }
      var d = lx.getImageData(0, 0, LW, LH), p = d.data, R = sc.cfg.ref, K = sc.cfg.gain, C = sc.cfg.chroma;
      // the colour of the light on something white in this frame (the saucer on the table), if known
      var Wt = sc.cfg.white ? sc.cfg.white[i] : null, mw = Wt ? 0.3 : 0;
      for (var j = 0; j < p.length; j += 4) {
        // light = frame / neutral morning surface, its colour softened towards what a white object shows
        var r = p[j] / R[0], g = p[j + 1] / R[1], b = p[j + 2] / R[2];
        var l = 0.2126 * r + 0.7152 * g + 0.0722 * b || 0.001;
        var cr = 1 + (r / l - 1) * C, cg = 1 + (g / l - 1) * C, cb = 1 + (b / l - 1) * C;
        if (mw) { cr += (Wt[0] - cr) * mw; cg += (Wt[1] - cg) * mw; cb += (Wt[2] - cb) * mw; }
        p[j] = Math.min(255, l * cr * K * 255);
        p[j + 1] = Math.min(255, l * cg * K * 255);
        p[j + 2] = Math.min(255, l * cb * K * 255);
      }
      lx.putImageData(d, 0, 0);
      var url = 'url("' + lc.toDataURL('image/jpeg', 0.9) + '")';
      sc.lits.forEach(function (lit) { lit.children[i].style.backgroundImage = url; });
    } catch (_) { sc.samples[i] = null; } // opened from disk: the canvas is tainted, objects keep plain light
    paint(sc);
  }

  function view(sc, s, ox, oy) {
    sc.s = s; sc.ox = ox; sc.oy = oy;
    var c = sc.canvas.style;
    if (CSS.supports && CSS.supports('zoom', '2')) {
      c.zoom = s.toFixed(4);
      c.left = (ox / s).toFixed(2) + 'px';
      c.top = (oy / s).toFixed(2) + 'px';
    } else {
      c.transform = 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    }
  }

  function paint(sc) {
    var seg = tod * 3, k = Math.min(2, Math.floor(seg)), f = seg - k;
    sc.k = k; sc.f = f;
    sc.weights = [0, 0, 0, 0]; sc.weights[k] = 1 - f; sc.weights[k + 1] = f;
    sc.bgs.forEach(function (img, i) {
      if (sc.active && (i === k || i === k + 1) && !img.getAttribute('src')) img.src = img.getAttribute('data-src');
      img.style.opacity = i === k ? 1 : i === k + 1 ? f.toFixed(3) : 0;
    });
    sc.lits.forEach(function (lit) {
      for (var i = 0; i < 4; i++) lit.children[i].style.opacity = i === k ? 1 : i === k + 1 ? f.toFixed(3) : 0;
    });
    if (sc.cfg.onTime) sc.cfg.onTime(sc, k, f);
    ink(sc);
  }

  // luminance behind a screen rectangle: the darkest and brightest tenth of the blended frames
  function behind(sc, r, q) {
    q = q || 0.1;
    if (!sc.samples.some(Boolean)) return null;
    var base = sc.el.getBoundingClientRect();
    var X = function (x) { return ((x - base.left - sc.ox) / sc.s) / 8; };
    var Y = function (y) { return ((y - base.top - sc.oy) / sc.s) / 8; };
    var x0 = clamp(Math.floor(X(r.left)), 0, SW - 1), x1 = clamp(Math.ceil(X(r.right)), x0 + 1, SW);
    var y0 = clamp(Math.floor(Y(r.top)), 0, SH - 1), y1 = clamp(Math.ceil(Y(r.bottom)), y0 + 1, SH);
    var vals = [];
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var p = (y * SW + x) * 4, L = 0, ws = 0;
      for (var i = 0; i < 4; i++) {
        var w = sc.weights[i], d = sc.samples[i];
        if (!w || !d) continue;
        L += w * (0.2126 * lin(d[p]) + 0.7152 * lin(d[p + 1]) + 0.0722 * lin(d[p + 2])); ws += w;
      }
      if (ws) vals.push(L / ws);
    }
    if (!vals.length) return null;
    vals.sort(function (a, b) { return a - b; });
    return { lo: vals[Math.floor(vals.length * q)], hi: vals[Math.min(vals.length - 1, Math.floor(vals.length * (1 - q)))] };
  }
  // average colour of the blended frames over an image rectangle
  function colourAt(sc, x0, y0, x1, y1) {
    if (!sc.samples.some(Boolean)) return null;
    var sx0 = clamp(Math.floor(x0 / 8), 0, SW - 1), sx1 = clamp(Math.ceil(x1 / 8), sx0 + 1, SW);
    var sy0 = clamp(Math.floor(y0 / 8), 0, SH - 1), sy1 = clamp(Math.ceil(y1 / 8), sy0 + 1, SH);
    var out = [0, 0, 0], wsum = 0;
    for (var i = 0; i < 4; i++) {
      var w = sc.weights[i], d = sc.samples[i];
      if (!w || !d) continue;
      var acc = [0, 0, 0], n = 0;
      for (var y = sy0; y < sy1; y++) for (var x = sx0; x < sx1; x++) {
        var p = (y * SW + x) * 4; acc[0] += d[p]; acc[1] += d[p + 1]; acc[2] += d[p + 2]; n++;
      }
      for (var c = 0; c < 3; c++) out[c] += w * acc[c] / n;
      wsum += w;
    }
    return wsum ? out.map(function (v) { return v / wsum; }) : null;
  }

  /* ---------------- readable at every hour ---------------- */
  var narrowTeam = window.matchMedia('(max-width: 1099px)');
  function ink(sc) {
    if (!sc.samples.some(Boolean)) return;
    // judge each group, and give siblings that belong together (the three labels) one shared answer
    var jobs = [], groups = {};
    sc.inks.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var kind = el.getAttribute('data-ink');
      if (el.hasAttribute('data-ink-narrow') && narrowTeam.matches) kind = el.getAttribute('data-ink-narrow');
      // big panels sit over darker and brighter parts of the room: judge them by their extremes
      var Lb = behind(sc, r, kind === 'copy' ? 0.08 : 0.015);
      if (!Lb) return;
      var g = el.getAttribute('data-ink-group');
      if (g) groups[g] = groups[g] ? { lo: Math.min(groups[g].lo, Lb.lo), hi: Math.max(groups[g].hi, Lb.hi) } : Lb;
      jobs.push({ el: el, kind: kind, Lb: Lb, g: g });
    });
    jobs.forEach(function (job) {
      var el = job.el, kind = job.kind, Lb = job.g ? groups[job.g] : job.Lb;
      var st = el.style, c;
      if (kind === 'copy') {
        // in dim light a soft dark halo round light letters reads as shade; a pale patch would look like fog
        c = choose(Lb, +el.getAttribute('data-ink-target') || 5.2, 0, tod > 0.55 ? 0.4 : 0);
        var tint = c.light ? '18,16,22,' : '250,246,238,';
        var ha = Math.min(0.95, c.a * 1.6), sa = Math.min(0.85, c.a * 0.85);
        st.setProperty('--ex-fg', c.light ? '#f7f3ed' : '#141414');
        st.setProperty('--ex-fg-2', c.light ? '#e6dfd3' : '#33382d');
        st.setProperty('--ex-head', c.light ? '#f7f3ed' : 'var(--forest)');
        st.setProperty('--ex-rule', c.light ? 'rgba(247,243,237,.3)' : 'rgba(20,20,20,.22)');
        st.setProperty('--ex-scrim', c.a > 0 ? 'rgba(' + tint + sa.toFixed(2) + ')' : 'transparent');
        st.setProperty('--ex-halo', c.a > 0 ? '0 0 3px rgba(' + tint + (ha * 0.7).toFixed(2) + '), 0 0 14px rgba(' + tint + ha.toFixed(2) + ')' : 'none');
        st.setProperty('--ex-glass', c.light ? 'rgba(18,16,22,.42)' : 'rgba(255,253,248,.55)');
        st.setProperty('--ex-glass-line', c.light ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.65)');
        st.setProperty('--ex-field', c.light ? 'rgba(18,16,22,.42)' : 'rgba(255,253,248,.55)');
        el.setAttribute('data-tone', c.light ? 'light' : 'dark');
      } else if (kind === 'glass' || kind === 'card') {
        var card = kind === 'card';
        // after dark keep the glass dark unless the lamp really demands otherwise
        c = choose(Lb, card ? 7 : 5.5, card ? 0.42 : 0.22, tod > 0.55 ? 0.35 : 0);
        st.setProperty('--ex-glass', c.light ? 'rgba(18,16,22,' + c.a.toFixed(2) + ')' : 'rgba(255,253,248,' + c.a.toFixed(2) + ')');
        st.setProperty('--ex-glass-line', c.light ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.65)');
        st.setProperty('--ex-fg', c.light ? '#f7f3ed' : '#141414');
        st.setProperty('--ex-fg-2', c.light ? '#e6dfd3' : '#33382d');
        st.setProperty('--ex-head', c.light ? '#f7f3ed' : 'var(--forest)');
        st.setProperty('--ex-halo', 'none');
        st.setProperty('--ex-scrim', 'transparent');
        st.setProperty('--ex-rule', c.light ? 'rgba(247,243,237,.3)' : 'rgba(20,20,20,.2)');
        if (card) {
          st.setProperty('--ex-field', c.light ? 'rgba(10,9,12,.38)' : 'rgba(255,255,255,.62)');
          st.setProperty('--ex-field-line', c.light ? 'rgba(247,243,237,.42)' : 'rgba(20,20,20,.34)');
          st.setProperty('--ex-scheme', c.light ? 'dark' : 'light');
          st.setProperty('--ex-bad', c.light ? '#ffbcae' : '#7a170b');
        }
        el.setAttribute('data-tone', c.light ? 'light' : 'dark');
      }
    });
  }

  /* ---------------- time and volume ---------------- */
  function setTime(t) {
    t = +t;
    if (!isFinite(t)) return;
    tod = clamp(t, 0, 1);
    scenes.forEach(paint);
  }
  function clockToT(h) {
    var P = [[0, 1], [5, 1], [6.5, 0], [10, 0.1], [13.5, 0.333], [16.5, 0.45], [18.5, 0.667], [20, 0.85], [21.5, 1], [24, 1]];
    for (var i = 1; i < P.length; i++) if (h <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (h - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
    return 1;
  }
  function setVolume(v) {
    v = +v;
    if (!isFinite(v)) return;
    volume = clamp(v, 0, 1);
    sound.volume(volume);
  }

  /* ---------------- sound: paper, string and wood, synthesised, through one volume ---------------- */
  var sound = (function () {
    var ctx = null, master = null, noise = null, vol = 0;
    function init() {
      if (ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      var len = ctx.sampleRate * 2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noise.getChannelData(0), b = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b = 0.6 * b + 0.4 * w; d[i] = b * 0.9 + w * 0.1; }
    }
    function live() { return ctx && vol > 0; }
    function src(at, dur) {
      var s = ctx.createBufferSource();
      s.buffer = noise;
      s.start(at, Math.random() * 1.2, dur + 0.05);
      return s;
    }
    function burst(at, dur, freq, q, peak, type) {
      var s = src(at, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.008, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      s.connect(f); f.connect(g); g.connect(master);
    }
    function swish(at, dur, f0, f1, peak) {
      var s = src(at, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(f0, at);
      f.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.7);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      s.connect(f); f.connect(g); g.connect(master);
    }
    return {
      volume: function (v) {
        vol = v;
        if (v > 0) { init(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume(); }
        if (master) master.gain.setTargetAtTime(v * v, ctx.currentTime, 0.08);
      },
      // the string slipping off, then the kraft opening: a long soft crinkle
      unwrap: function () {
        if (!live()) return;
        var t = ctx.currentTime + 0.02;
        swish(t, 0.26, 1600, 3600, 0.05);
        for (var i = 0; i < 30; i++) {
          var at = t + 0.28 + Math.pow(Math.random(), 0.8) * 0.9;
          burst(at, 0.02 + Math.random() * 0.03, 1400 + Math.random() * 3200, 1.1, 0.03 + Math.random() * 0.07);
        }
        swish(t + 0.3, 0.7, 500, 2200, 0.11);
        swish(t + 0.5, 0.6, 700, 1900, 0.08);
      },
      slide: function (delay) { if (live()) swish(ctx.currentTime + (delay || 0), 0.5, 2400, 900, 0.045); },
      tap: function (delay) { if (live()) burst(ctx.currentTime + (delay || 0), 0.08, 240, 0.8, 0.1, 'lowpass'); },
      // a faint crackle per letter, as the laser burns
      burn: function () {
        if (!live()) return;
        var t = ctx.currentTime;
        for (var i = 0; i < 3; i++) burst(t + i * 0.014 + Math.random() * 0.01, 0.012 + Math.random() * 0.012, 3800 + Math.random() * 2400, 2, 0.012 + Math.random() * 0.018);
      },
      sent: function () { if (live()) { swish(ctx.currentTime, 0.45, 900, 2600, 0.06); } }
    };
  })();

  /* ---------------- paper, made once: kraft outside, a paler kraft inside ---------------- */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function kraft(w, h, base, seed, inner) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d'), r = rng(seed);
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    var i, g, gx, gy, rad;
    for (i = 0; i < 60; i++) { // slow blotches in the pulp
      gx = r() * w; gy = r() * h; rad = 60 + r() * 200;
      g = x.createRadialGradient(gx, gy, 0, gx, gy, rad);
      g.addColorStop(0, r() < 0.5 ? 'rgba(255,236,204,.035)' : 'rgba(96,58,26,.035)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(gx - rad, gy - rad, rad * 2, rad * 2);
    }
    var n = Math.round(w * h / (inner ? 70 : 45));
    for (i = 0; i < n; i++) { // fibres
      var fx = r() * w, fy = r() * h, len = 2 + r() * (inner ? 7 : 11), a = (r() - 0.5) * Math.PI;
      x.strokeStyle = r() < 0.55 ? 'rgba(244,222,186,' + (0.05 + r() * 0.1).toFixed(3) + ')' : 'rgba(92,58,28,' + (0.04 + r() * (inner ? 0.06 : 0.1)).toFixed(3) + ')';
      x.lineWidth = 0.4 + r() * 0.7;
      x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len); x.stroke();
    }
    for (i = 0; i < w * h / 1100; i++) { // flecks of bark
      x.fillStyle = 'rgba(58,36,16,' + (0.12 + r() * 0.3).toFixed(3) + ')';
      var sz = 0.5 + r() * 1.3;
      x.fillRect(r() * w, r() * h, sz, sz * (0.5 + r() * 0.6));
    }
    if (!inner) { // a few soft creases from the wrapping, each a lit side and a shaded side
      for (i = 0; i < 6; i++) {
        var x0 = r() * w, y0 = r() * h, ang = r() * Math.PI, L = 60 + r() * 220;
        var x1 = x0 + Math.cos(ang) * L, y1 = y0 + Math.sin(ang) * L, bx = (x0 + x1) / 2 + (r() - 0.5) * 30, by = (y0 + y1) / 2 + (r() - 0.5) * 30;
        x.lineWidth = 1.6 + r() * 1.6;
        x.strokeStyle = 'rgba(255,240,214,.11)';
        x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(bx, by, x1, y1); x.stroke();
        x.strokeStyle = 'rgba(78,46,18,.11)';
        x.beginPath(); x.moveTo(x0 + 1.4, y0 + 1.4); x.quadraticCurveTo(bx + 1.4, by + 1.4, x1 + 1.4, y1 + 1.4); x.stroke();
      }
    }
    var d = x.getImageData(0, 0, w, h), p = d.data;
    for (i = 0; i < p.length; i += 4) { var e = (r() - 0.5) * (inner ? 10 : 15); p[i] += e; p[i + 1] += e; p[i + 2] += e * 0.9; }
    x.putImageData(d, 0, 0);
    return 'url("' + c.toDataURL('image/jpeg', 0.9) + '")';
  }

  /* ================================================================
     1. Opening: the parcel
     ================================================================ */
  var opening = null;
  if (openSec) (function () {
    var TABLE_SH = [ // shadow on the table per frame: x, y, blur, strength, colour
      [7, 9, 10, 0.34, [60, 48, 46]],
      [18, 15, 6, 0.5, [84, 38, 8]],
      [12, 3, 13, 0.36, [36, 18, 34]],
      [-15, 6, 9, 0.6, [8, 4, 2]]
    ];
    var parcelBox = [500, 300, 840, 520]; // image rect of the parcel, for the string's light
    opening = makeScene(openSec, {
      ref: [166, 153, 145], gain: 0.93, chroma: 0.78,
      // measured on the white saucer, per frame, relative to morning and normalised
      white: [[1, 1, 1], [1.23, 0.965, 0.664], [1.2, 0.94, 1.0], [1.2, 0.97, 0.75]],  // the morning table: neutral light
      onTime: function (sc, k, f) {
        var L = mix(TABLE_SH[k], TABLE_SH[k + 1], f), st = openSec.style;
        st.setProperty('--sh-x', L[0].toFixed(1) + 'px');
        st.setProperty('--sh-y', L[1].toFixed(1) + 'px');
        st.setProperty('--sh-b', L[2].toFixed(1) + 'px');
        st.setProperty('--sh-o', L[3].toFixed(3));
        st.setProperty('--sh-c', rgba(L[4], 1));
        var c = colourAt(sc, parcelBox[0], parcelBox[1], parcelBox[2], parcelBox[3]);
        var m = c ? c.map(function (v, i) { return clamp(v / sc.cfg.ref[i] * sc.cfg.gain, 0.12, 1.04); }) : [1, 1, 1];
        document.getElementById('ex-relight-table-m').setAttribute('values',
          [m[0], 0, 0, 0, 0, 0, m[1], 0, 0, 0, 0, 0, m[2], 0, 0, 0, 0, 0, 1, 0].map(function (v) { return (+v).toFixed(4); }).join(' '));
      }
    });

    openSec.style.setProperty('--ex-kraft', kraft(440, 600, '#c09868', 11, false));
    openSec.style.setProperty('--ex-kraft-in', kraft(440, 600, '#d6ba92', 29, true));

    var $ = function (s) { return openSec.querySelector(s); };
    var el = {
      head: $('.ex__head'), btn: $('#ex-open-btn'), picks: $('#ex-picks'),
      base: $('[data-obj="base"]'), wrap: $('[data-obj="wrap"]'),
      card: $('[data-obj="polaroid"]'), sheet: $('[data-obj="sanctuary"]'), roll: $('[data-obj="distinctive"]'),
      flapL: $('.ex__flap--l'), flapR: $('.ex__flap--r'), string: $('.ex__string'), tag: $('.ex__tag'), edges: $('.ex__edges')
    };
    var pickFor = {};
    openSec.querySelectorAll('.ex__pick').forEach(function (a) { pickFor[a.getAttribute('data-for')] = a; });
    var state = 'closed';
    el.picks.inert = true;

    // sizes in image pixels at full size; ar is height over width
    var OBJ = {
      polaroid: { el: el.card, w: 104, ar: 642 / 454 },
      sanctuary: { el: el.sheet, w: 168, ar: 1505 / 1100 },
      distinctive: { el: el.roll, w: 300, ar: 0.36 }
    };
    var PARCEL = { w: 330, ar: 225 / 330, r: -4 };
    // where each sits once out, around the group's centre; narrow screens use two rows
    var WIDE = { polaroid: [-268, 4, -6], sanctuary: [-78, -8, 2], distinctive: [182, 30, -3] };
    var NARROW = { polaroid: [-84, 0, -5], sanctuary: [80, 0, 2.5], distinctive: [0, 0, -2] };
    // packed inside the parcel, around its centre
    var INSIDE = { polaroid: [-62, -18, -9], sanctuary: [30, -4, 86], distinctive: [4, 36, -3] };

    var L = null; // last layout

    function place(o, cx, cy, w, h, r) {
      var s = o.style;
      s.left = (cx - w / 2).toFixed(2) + 'px';
      s.top = (cy - h / 2).toFixed(2) + 'px';
      s.width = w.toFixed(2) + 'px';
      s.height = h.toFixed(2) + 'px';
      s.transform = 'rotate(' + r + 'deg)';
      return { x: cx - w / 2, y: cy - h / 2, w: w, h: h };
    }
    function litAt(host, x, y) {
      var lit = host && host.querySelector(':scope > .ex__lit');
      if (!lit) return;
      lit.style.setProperty('--lx', (-x).toFixed(1) + 'px');
      lit.style.setProperty('--ly', (-y).toFixed(1) + 'px');
    }
    function lightObject(name, b) {
      var o = OBJ[name].el;
      if (name === 'distinctive') {
        litAt(o.querySelector('.ex__roll-flat'), b.x + b.w * 0.02, b.y);
        litAt(o.querySelector('.ex__roll-tube'), b.x, b.y + b.h * 0.74);
      } else {
        litAt(o.querySelector('.ex__body'), b.x, b.y);
      }
    }

    function layout() {
      var sc = opening, W = sc.el.clientWidth, H = sc.el.clientHeight;
      var s = Math.max(W / IMG_W, H / IMG_H), ox = (W - IMG_W * s) / 2, oy = (H - IMG_H * s) / 2;
      view(sc, s, ox, oy);
      var narrow = W < 900;
      var headY = clamp(H * 0.1, 80, 112);
      openSec.style.setProperty('--head-y', headY + 'px');
      var headB = headY + el.head.offsetHeight;
      var top = headB + (narrow ? 22 : 30), bottom = H - (narrow ? 22 : 30), avail = bottom - top;
      var pickH = 0;
      Object.keys(pickFor).forEach(function (n) {
        pickFor[n].style.setProperty('--pw', (narrow ? Math.min(186, W / 2 - 12) : 230) + 'px');
        pickH = Math.max(pickH, pickFor[n].offsetHeight);
      });
      var gap = narrow ? 10 : 16, btnH = el.btn.offsetHeight;
      var u, groupH, Lout = {};
      function hOf(n) { return OBJ[n].w * OBJ[n].ar; }

      if (!narrow) {
        var t0 = Infinity, b0 = -Infinity;
        Object.keys(WIDE).forEach(function (n) { var hh = hOf(n) / 2; t0 = Math.min(t0, WIDE[n][1] - hh); b0 = Math.max(b0, WIDE[n][1] + hh); });
        u = Math.min(1.3, (avail - gap - pickH) / ((b0 - t0) * s), (W - 64) / (700 * s));
        // the parcel and its button must fit too
        u = Math.min(u, (avail - 24 - btnH) / (PARCEL.w * PARCEL.ar * s), (W - 48) / (PARCEL.w * s));
        groupH = (b0 - t0) * s * u + gap + pickH;
        var gy = top + Math.max(0, (avail - groupH) * 0.42);
        var cx = (W / 2 - ox) / s, cy = (gy - oy) / s - t0 * u;
        Object.keys(WIDE).forEach(function (n) { Lout[n] = [cx + WIDE[n][0] * u, cy + WIDE[n][1] * u, WIDE[n][2]]; });
        var pickY = gy + (b0 - t0) * s * u + gap;
        Object.keys(WIDE).forEach(function (n) { Lout[n].pick = [ox + Lout[n][0] * s, pickY]; });
      } else {
        var r1t = Math.min(-hOf('polaroid') / 2, -hOf('sanctuary') / 2), r1b = -r1t;
        var rollH = hOf('distinctive');
        var fixed = gap + pickH + 18 + gap + pickH;
        u = Math.min(1.15, (avail - fixed) / ((r1b - r1t + rollH) * s), (W - 36) / (OBJ.distinctive.w * s), (W - 24) / (340 * s));
        u = Math.min(u, (avail - 24 - btnH) / (PARCEL.w * PARCEL.ar * s), (W - 40) / (PARCEL.w * s));
        groupH = (r1b - r1t + rollH) * s * u + fixed;
        var gy2 = top + Math.max(0, (avail - groupH) / 2);
        var cx2 = (W / 2 - ox) / s;
        var row1 = (gy2 - oy) / s + (r1b * u);
        Lout.polaroid = [cx2 + NARROW.polaroid[0] * u, row1, NARROW.polaroid[2]];
        Lout.sanctuary = [cx2 + NARROW.sanctuary[0] * u, row1, NARROW.sanctuary[2]];
        var p1 = gy2 + (r1b - r1t) * s * u + gap;
        Lout.polaroid.pick = [ox + Lout.polaroid[0] * s, p1];
        Lout.sanctuary.pick = [ox + Lout.sanctuary[0] * s, p1];
        var rollTop = p1 + pickH + 18;
        Lout.distinctive = [cx2, (rollTop - oy) / s + rollH * u / 2, NARROW.distinctive[2]];
        Lout.distinctive.pick = [W / 2, rollTop + rollH * s * u + gap];
      }

      openSec.style.setProperty('--u', u.toFixed(3));
      // the parcel: centred in the space under the headline, its button below it
      var ph = PARCEL.w * PARCEL.ar * u, pw = PARCEL.w * u;
      var blockH = ph * s + 24 + btnH;
      var pTop = top + Math.max(0, (avail - blockH) / 2);
      var pcx = (W / 2 - ox) / s, pcy = (pTop - oy) / s + ph / 2;
      openSec.style.setProperty('--btn-x', (W / 2) + 'px');
      openSec.style.setProperty('--btn-y', (pTop + ph * s + 24) + 'px');

      var bb = place(el.wrap, pcx, pcy, pw, ph, PARCEL.r);
      var b0 = place(el.base, pcx, pcy, pw * 0.96, ph * 0.95, PARCEL.r);
      litAt(el.base.querySelector('.ex__body'), b0.x, b0.y);
      litAt(el.flapL.querySelector('.ex__face--out'), bb.x, bb.y);
      litAt(el.flapL.querySelector('.ex__face--in'), bb.x, bb.y);
      litAt(el.flapR.querySelector('.ex__face--out'), bb.x + pw * 0.47, bb.y);
      litAt(el.flapR.querySelector('.ex__face--in'), bb.x + pw * 0.47, bb.y);
      litAt(el.tag, bb.x + pw * 0.705, bb.y + ph * 0.64);
      parcelBox = [bb.x, bb.y, bb.x + pw, bb.y + ph];

      L = { s: s, ox: ox, oy: oy, u: u, pcx: pcx, pcy: pcy, out: Lout, narrow: narrow };
      Object.keys(OBJ).forEach(function (n) {
        var w = OBJ[n].w * u, h = w * OBJ[n].ar, b;
        if (state === 'open') b = place(OBJ[n].el, Lout[n][0], Lout[n][1], w, h, Lout[n][2]);
        else b = place(OBJ[n].el, pcx + INSIDE[n][0] * u, pcy + INSIDE[n][1] * u, w, h, INSIDE[n][2] + PARCEL.r);
        lightObject(n, state === 'open' ? b : { x: Lout[n][0] - w / 2, y: Lout[n][1] - h / 2, w: w, h: h });
      });
      // labels never touch each other or the edges
      var wid = {};
      Object.keys(OBJ).forEach(function (n) { wid[n] = pickFor[n].offsetWidth; });
      if (narrow) {
        Lout.polaroid.pick[0] = Math.min(Lout.polaroid.pick[0], W / 2 - 5 - wid.polaroid / 2);
        Lout.sanctuary.pick[0] = Math.max(Lout.sanctuary.pick[0], W / 2 + 5 + wid.sanctuary / 2);
      }
      Object.keys(OBJ).forEach(function (n) {
        var a = pickFor[n], x = clamp(Lout[n].pick[0], wid[n] / 2 + 8, W - wid[n] / 2 - 8);
        a.style.setProperty('--px', x.toFixed(1) + 'px');
        a.style.setProperty('--py', Lout[n].pick[1].toFixed(1) + 'px');
      });
      paint(opening);
    }

    function openParcel() {
      if (state !== 'closed') return;
      // opening the parcel is the first gesture: ask for gentle sound if it is off
      if (volume === 0) {
        window.dispatchEvent(new CustomEvent('elmuse:volume-request', { detail: { v: 0.4 } }));
        if (volume === 0) setVolume(0.4);
      }
      sound.unwrap();
      if (reduce.matches || !el.wrap.animate) { finish(); return; }
      state = 'opening';
      openSec.setAttribute('data-state', 'opening');

      var ease = 'cubic-bezier(.45,.05,.25,1)';
      anim(el.string, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate(14px, 8px)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
      anim(el.tag, [{ opacity: 1, transform: 'rotate(16deg)' }, { opacity: 0, transform: 'translate(38px, 26px) rotate(30deg)' }], { duration: 460, easing: 'ease-in', fill: 'forwards' });
      anim(el.edges, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 200, fill: 'forwards' });
      anim(el.flapR, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(178deg)' }], { duration: 950, delay: 260, easing: ease, fill: 'forwards' });
      anim(el.flapL, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-178deg)' }], { duration: 950, delay: 400, easing: ease, fill: 'forwards' });

      // the wrapping stays on top until it is open, then the contents lift over the opened paper
      el.wrap.style.zIndex = '10';
      later(1060).then(function () { el.wrap.style.zIndex = '1'; });
      // out they come, one by one, to their places on the table
      var order = ['distinctive', 'sanctuary', 'polaroid'], u = L.u;
      order.forEach(function (n, i) {
        var o = OBJ[n].el, w = OBJ[n].w * u, h = w * OBJ[n].ar, out = L.out[n];
        var b = place(o, out[0], out[1], w, h, out[2]);
        lightObject(n, b);
        var dx = L.pcx + INSIDE[n][0] * u - out[0], dy = L.pcy + INSIDE[n][1] * u - out[1], r0 = INSIDE[n][2] + PARCEL.r;
        var delay = 1080 + i * 150, dur = 980;
        o.style.zIndex = String(3 + i);
        anim(o, [
          { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + r0 + 'deg)' },
          { transform: 'translate(' + (dx * 0.35).toFixed(1) + 'px,' + (dy * 0.35 - 6).toFixed(1) + 'px) rotate(' + ((r0 + out[2]) / 2) + 'deg) scale(1.025)', offset: 0.55 },
          { transform: 'rotate(' + out[2] + 'deg)' }
        ], { duration: dur, delay: delay, easing: 'cubic-bezier(.25,.6,.2,1)', fill: 'backwards' });
        sound.slide(delay / 1000);
        sound.tap((delay + dur * 0.92) / 1000);
      });
      // the wrapping, emptied, folds away
      [el.base, el.wrap].forEach(function (o) {
        anim(o, [{ opacity: 1, transform: 'rotate(' + PARCEL.r + 'deg)' }, { opacity: 0, transform: 'rotate(' + PARCEL.r + 'deg) scale(.96)' }],
          { duration: 700, delay: 1250, easing: 'ease-in', fill: 'forwards' });
      });
      later(1080 + 2 * 150 + 980 + 40).then(finish);
    }

    function finish() {
      state = 'open';
      openSec.setAttribute('data-state', 'open');
      [el.string, el.tag, el.edges, el.flapL, el.flapR, el.base, el.wrap].forEach(function (n) {
        if (n.getAnimations) n.getAnimations().forEach(function (a) { a.cancel(); });
      });
      layout();
      el.picks.inert = false;
      anim(el.picks, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: 'ease-out' });
      ink(opening);
      pickFor.polaroid.focus({ preventScroll: true });
    }

    el.btn.addEventListener('click', openParcel);
    el.wrap.addEventListener('click', openParcel);
    Object.keys(OBJ).forEach(function (n) {
      OBJ[n].el.addEventListener('click', function () { if (state === 'open') pickFor[n].click(); });
    });

    opening.layout = layout;
  })();

  /* ================================================================
     2. For your team: the engraving
     ================================================================ */
  var team = null;
  // shadow on the wall per frame (from the Sanctuary board): x, y, blur, strength, colour, contact
  var WALL_SH = [
    [10, 6, 12, 0.22, [70, 80, 100], 0.38],
    [16, 8, 5, 0.32, [110, 60, 20], 0.5],
    [-6, 2, 16, 0.26, [30, 20, 50], 0.45],
    [-22, -2, 12, 0.5, [10, 6, 4], 0.62]
  ];
  if (teamSec) (function () {
    var FOOT_Y = 622, PLANK_AR = 0.26;
    var $ = function (s) { return teamSec.querySelector(s); };
    var el = {
      plank: $('.ex__plank'), face: $('.ex__plank-face'), band: $('.ex__plank-band'), burn: $('#ex-burn'),
      cast: $('.ex__wallcast'), contact: $('.ex__contact'), slot: $('.ex__plank-slot'), copy: $('.ex__team-copy'),
      input: $('#ex-company'), phone: $('.ex__phone'), cos: teamSec.querySelectorAll('.ex__co')
    };
    $('.ex__custom-wrap').setAttribute('data-ink-narrow', 'glass');

    team = makeScene(teamSec, {
      ref: [195, 197, 203], gain: 0.98, chroma: 0.8,  // the morning wall: neutral light
      onTime: function (sc, k, f) {
        var L = mix(WALL_SH[k], WALL_SH[k + 1], f), st = teamSec.style;
        st.setProperty('--sh-x', L[0].toFixed(1) + 'px');
        st.setProperty('--sh-y', L[1].toFixed(1) + 'px');
        st.setProperty('--sh-b', L[2].toFixed(1) + 'px');
        st.setProperty('--sh-o', L[3].toFixed(3));
        st.setProperty('--sh-c', rgba(L[4], 1));
        st.setProperty('--sh-k', (L[0] * -0.25).toFixed(2) + 'deg');
        st.setProperty('--contact-o', L[5].toFixed(3));
        st.setProperty('--contact-x', (L[0] * 0.25).toFixed(1) + 'px');
        st.setProperty('--phone-sh', (L[0] * 0.7).toFixed(1) + 'px ' + (8 + L[1]).toFixed(1) + 'px ' + (14 + L[2] * 1.4).toFixed(1) + 'px ' + rgba(L[4], Math.min(0.6, L[3] * 1.3)));
      }
    });

    var plank = { bx: 670, w: 380 };
    function layout() {
      var sc = team, W = sc.el.clientWidth, H = sc.el.clientHeight;
      var narrow = narrowTeam.matches;
      var s = Math.max(W / IMG_W, H / 749), oy = H - IMG_H * s, ox, bx, pw;
      var secTop = teamSec.getBoundingClientRect().top;
      if (!narrow) {
        ox = clamp(W / 2 - 672 * s, W - IMG_W * s, 0);
        // keep the lamp clear: it is the light at night
        teamSec.style.setProperty('--ui-r', clamp(W - (ox + 1036 * s), 32, W * 0.3) + 'px');
        var r = el.slot.getBoundingClientRect();
        bx = ((r.left + r.width / 2) - ox) / s;
        pw = Math.min(400, (r.width + 40) / s);
        teamSec.style.setProperty('--desk-gap', Math.max(24, H - (oy + (FOOT_Y + 2) * s)) + 'px');
      } else {
        // keep part of the lamp at the right edge; the board stands left of it
        ox = clamp(W - 30 - 1062 * s, W - IMG_W * s, 0);
        var left = -ox / s, right = Math.min(1052, (W - ox) / s);
        bx = (left + right) / 2;
        pw = Math.min(360, right - left - 28 / s);
        var copyB = el.copy.getBoundingClientRect().bottom - secTop;
        teamSec.style.setProperty('--slot-h', Math.max(24, oy + 700 * s - copyB) + 'px');
      }
      view(sc, s, ox, oy);
      var ph = pw * PLANK_AR;
      plank = { bx: bx, w: pw };
      var ps = el.plank.style;
      ps.left = (bx - pw / 2).toFixed(1) + 'px';
      ps.top = (FOOT_Y - ph).toFixed(1) + 'px';
      ps.width = pw.toFixed(1) + 'px';
      ps.height = ph.toFixed(1) + 'px';
      // the light on the board is the light on the wall just above it
      var lit = el.face.querySelector(':scope > .ex__lit');
      lit.style.setProperty('--lx', (-(bx - pw / 2)).toFixed(1) + 'px');
      lit.style.setProperty('--ly', (-(FOOT_Y - ph * 2)).toFixed(1) + 'px');
      var cs = el.cast.style;
      cs.left = (bx - pw * 0.52).toFixed(1) + 'px'; cs.width = (pw * 1.04).toFixed(1) + 'px';
      cs.top = (FOOT_Y - ph - 2).toFixed(1) + 'px'; cs.height = (ph * 1.02).toFixed(1) + 'px';
      var ct = el.contact.style;
      ct.left = (bx - pw * 0.6).toFixed(1) + 'px'; ct.width = (pw * 1.2).toFixed(1) + 'px';
      ct.top = (FOOT_Y - 9).toFixed(1) + 'px';
      teamSec.style.setProperty('--burn-size', (ph * 0.36).toFixed(2) + 'px');
      fit();
      paint(team);
    }

    function fit() {
      var t = el.burn;
      var base = plank.w * PLANK_AR * 0.36;
      t.style.fontSize = base.toFixed(2) + 'px';
      var avail = el.band.clientWidth * 0.84, w = t.scrollWidth;
      if (w > avail && w > 0) t.style.fontSize = (base * avail / w).toFixed(2) + 'px';
    }

    var mirror = document.getElementById('ex-f-company'), mirrored = true;
    if (mirror) mirror.addEventListener('input', function () { mirrored = mirror.value === '' || mirror.value === clean(el.input.value); });
    function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 40); }

    function engrave(fromUser) {
      var v = clean(el.input.value), name = v || 'elmuse';
      el.burn.textContent = name;
      if (!v) { var star = document.createElement('sup'); star.textContent = '✦'; el.burn.appendChild(star); }
      el.cos.forEach(function (n) { n.textContent = name; });
      fit();
      if (fromUser) {
        sound.burn();
        if (typeof window.setEngraving === 'function') window.setEngraving(v || 'elmuse');
        if (mirror && mirrored) mirror.value = v;
      }
    }
    el.input.addEventListener('input', function () { engrave(true); });
    team.layout = layout;
    team.engrave = engrave;
    engrave(false);
  })();

  /* ================================================================
     3. Enquire: the form
     ================================================================ */
  var enquire = null;
  if (enqSec) (function () {
    enquire = makeScene(enqSec, {
      ref: [193, 195, 201], gain: 0.98, chroma: 0.8,
      onTime: function (sc, k, f) {
        var L = mix(WALL_SH[k], WALL_SH[k + 1], f);
        enqSec.style.setProperty('--card-sh', (L[0] * 0.8).toFixed(1) + 'px ' + (10 + L[1]).toFixed(1) + 'px ' + (24 + L[2] * 1.6).toFixed(1) + 'px ' + rgba(L[4], Math.min(0.5, L[3] * 1.1)));
      }
    });
    enquire.layout = function () {
      var sc = enquire, W = sc.el.clientWidth, H = sc.el.clientHeight;
      var s = Math.max(W / IMG_W, H / 749), oy = H - IMG_H * s;
      var ox = W < 900 ? clamp(W / 2 - 560 * s, W - IMG_W * s, 0) : clamp(W / 2 - 672 * s, W - IMG_W * s, 0);
      view(sc, s, ox, oy);
      paint(enquire);
    };

    var form = document.getElementById('ex-enq-form');
    var status = document.getElementById('ex-enq-status');
    var thanks = document.getElementById('ex-enq-thanks');
    var again = document.getElementById('ex-enq-again');
    var wa = document.getElementById('ex-wa');
    var waWrap = document.getElementById('ex-wa-wrap');
    var f = form.elements;
    var dateIn = document.getElementById('ex-f-date');
    function today() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
    dateIn.min = today();

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var RULES = {
      company: function (v) { return v ? '' : 'please add your company name.'; },
      contact: function (v) { return v ? '' : 'who should we speak to?'; },
      email: function (v) { return !v ? 'please add an email address.' : EMAIL.test(v) ? '' : 'that email address does not look complete.'; },
      phone: function (v) {
        if (!v) return 'please add a phone number.';
        var digits = v.replace(/\D/g, '');
        return /^[+\d\s().-]+$/.test(v) && digits.length >= 7 && digits.length <= 15 ? '' : 'that number does not look right.';
      },
      quantity: function (v) {
        if (!v) return 'how many do you need?';
        var n = Number(v);
        return Number.isInteger(n) && n >= 1 ? '' : 'a whole number, 1 or more.';
      },
      neededBy: function (v) {
        if (!v) return 'when do you need them by?';
        return v < today() ? 'that date has passed.' : '';
      }
    };
    var ERR = { company: 'ex-e-company', contact: 'ex-e-contact', email: 'ex-e-email', phone: 'ex-e-phone', quantity: 'ex-e-qty', neededBy: 'ex-e-date' };
    function value(name) { return String(f[name].value || '').trim(); }
    function cals() { return Array.prototype.filter.call(form.querySelectorAll('input[name="calendars"]'), function (c) { return c.checked; }).map(function (c) { return c.value; }); }
    function show(name, msg) {
      var input = f[name], out = document.getElementById(ERR[name]);
      out.textContent = msg;
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
    function check(name) {
      // a date field that the browser cannot parse reports an empty value with badInput
      var msg = RULES[name](value(name));
      if (!msg && f[name].validity && f[name].validity.badInput) msg = name === 'quantity' ? 'a whole number, 1 or more.' : 'that date does not look right.';
      show(name, msg);
      return !msg;
    }
    function checkCals() {
      var ok = cals().length > 0;
      document.getElementById('ex-e-cals').textContent = ok ? '' : 'pick at least one.';
      form.querySelector('.ex__checks').setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    var touched = {};
    Object.keys(RULES).forEach(function (name) {
      f[name].addEventListener('blur', function () { if (touched[name] || value(name)) { touched[name] = true; check(name); } });
      f[name].addEventListener('input', function () { touched[name] = true; if (f[name].getAttribute('aria-invalid') === 'true') check(name); status.textContent = ''; });
    });
    form.querySelectorAll('input[name="calendars"]').forEach(function (c) {
      c.addEventListener('change', function () { if (document.getElementById('ex-e-cals').textContent) checkCals(); });
    });

    function data() {
      return {
        company: value('company'), contact: value('contact'), email: value('email'), phone: value('phone'),
        calendars: cals(), quantity: Number(value('quantity')) || null, neededBy: value('neededBy'),
        notes: value('notes'), source: 'elmuse 2027 calendars'
      };
    }
    function post(url, body) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r; });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      Object.keys(RULES).forEach(function (name) { if (!check(name) && !first) first = f[name]; });
      if (!checkCals() && !first) first = form.querySelector('input[name="calendars"]');
      if (first) { status.textContent = ''; first.focus(); return; }
      var endpoint = String(ELMUSE_CONFIG.enquiryEndpoint || '').trim();
      if (!endpoint) {
        status.textContent = 'the enquiry form is not connected yet, so nothing was sent. your details are still here.';
        return;
      }
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      status.textContent = 'sending…';
      post(endpoint, data()).then(function () {
        sound.sent();
        status.textContent = '';
        document.getElementById('ex-thanks-name').textContent = value('contact') ? ', ' + value('contact').split(' ')[0] : '';
        form.hidden = true;
        thanks.hidden = false;
        thanks.focus();
      }).catch(function () {
        status.textContent = 'that did not go through. your details are still here; please try again in a moment.';
      }).then(function () { btn.disabled = false; ink(enquire); });
    });
    again.addEventListener('click', function () { thanks.hidden = true; form.hidden = false; f.company.focus(); ink(enquire); });

    // WhatsApp: a summary of whatever has been filled in
    var number = String(ELMUSE_CONFIG.whatsappNumber || '').replace(/\D/g, '');
    if (!number) {
      wa.disabled = true;
      wa.title = 'the WhatsApp number is not set yet';
      waWrap.title = 'the WhatsApp number is not set yet';
    }
    wa.addEventListener('click', function () {
      if (!number) return;
      var d = data(), lines = ['Hello elmuse, I would like to talk about 2027 calendars.'];
      if (d.company) lines.push('Company: ' + d.company);
      if (d.contact) lines.push('Name: ' + d.contact);
      if (d.calendars.length) lines.push('Calendars: ' + d.calendars.join(', '));
      if (d.quantity) lines.push('Quantity: ' + d.quantity);
      if (d.neededBy) lines.push('Needed by: ' + d.neededBy);
      if (d.notes) lines.push(d.notes);
      window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    });

    // the waitlist for single buyers
    var wait = document.getElementById('ex-wait-form'), waitIn = document.getElementById('ex-wait-email'), waitStatus = document.getElementById('ex-wait-status');
    wait.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = waitIn.value.trim();
      if (!EMAIL.test(v)) {
        waitIn.setAttribute('aria-invalid', 'true');
        waitStatus.textContent = v ? 'that email address does not look complete.' : 'please add your email address.';
        waitIn.focus();
        return;
      }
      waitIn.removeAttribute('aria-invalid');
      var endpoint = String(ELMUSE_CONFIG.waitlistEndpoint || '').trim();
      if (!endpoint) { waitStatus.textContent = 'the waitlist is not connected yet, so nothing was sent.'; return; }
      waitStatus.textContent = 'adding you…';
      post(endpoint, { email: v, source: 'elmuse 2027 calendars' }).then(function () {
        sound.sent();
        waitStatus.textContent = 'you are on the list. we will write when single calendars open.';
      }).catch(function () { waitStatus.textContent = 'that did not go through; please try again in a moment.'; });
    });
    waitIn.addEventListener('input', function () { if (waitIn.getAttribute('aria-invalid')) { waitIn.removeAttribute('aria-invalid'); waitStatus.textContent = ''; } });
  })();

  /* ---------------- layout, scrolling, loading ---------------- */
  function layoutAll() {
    scenes.forEach(function (sc) { if (sc.layout) sc.layout(); });
  }
  var rz = 0;
  window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(layoutAll); });
  // the scene stays put while cards slide over it, so the ink is judged again as they move
  var sf = 0;
  window.addEventListener('scroll', function () {
    if (sf) return;
    sf = requestAnimationFrame(function () {
      sf = 0;
      var vh = window.innerHeight;
      scenes.forEach(function (sc) {
        var r = sc.section.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh && r.height > vh + 4) ink(sc);
      });
    });
  }, { passive: true });

  // frames load when a section comes near; the rest of each set once the page is quiet
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var sc = scenes.filter(function (x) { return x.section === en.target; })[0];
        if (sc && !sc.active) { sc.active = true; paint(sc); }
      });
    }, { rootMargin: '100% 0px' });
    scenes.forEach(function (sc) { io.observe(sc.section); });
  } else {
    scenes.forEach(function (sc) { sc.active = true; });
  }
  window.addEventListener('load', function () {
    idle(function () {
      scenes.forEach(function (sc) {
        sc.active = true;
        sc.bgs.forEach(function (img) { if (!img.getAttribute('src')) img.src = img.getAttribute('data-src'); });
      });
    });
  });

  /* ---------------- the shared bar talks to this page through events ---------------- */
  window.addEventListener('elmuse:time', function (e) { if (e.detail) setTime(e.detail.t); });
  window.addEventListener('elmuse:volume', function (e) { if (e.detail) setVolume(e.detail.v); });
  window.extras = { setTime: setTime, setVolume: setVolume };

  var now = new Date();
  tod = clockToT(now.getHours() + now.getMinutes() / 60);
  layoutAll();
  setTime(tod);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutAll);

  /* ---------------- temporary bar for this page on its own (removed with [data-dev-bar] on merge) ---------------- */
  var dev = document.querySelector('[data-dev-bar]');
  if (dev) {
    var dt = dev.querySelector('#ex-dev-time'), dv = dev.querySelector('#ex-dev-vol');
    dt.value = Math.round(tod * 100);
    dv.value = 0;
    dt.addEventListener('input', function () { window.dispatchEvent(new CustomEvent('elmuse:time', { detail: { t: dt.value / 100 } })); });
    dv.addEventListener('input', function () { window.dispatchEvent(new CustomEvent('elmuse:volume', { detail: { v: dv.value / 100 } })); });
    window.addEventListener('elmuse:volume-request', function (e) {
      if (!e.detail) return;
      dv.value = Math.round(e.detail.v * 100);
      window.dispatchEvent(new CustomEvent('elmuse:volume', { detail: { v: e.detail.v } }));
    });
  }
})();
