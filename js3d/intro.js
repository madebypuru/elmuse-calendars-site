// The owner's opening (Figma section 50:701): loader, then frames 1-4 as scroll keyframes,
// then the handover where the photo's calendar becomes the live 3D board.
// Design units: the 1920x1200 frame, scaled by one unit u = min(vw/1920, vh/1200).
import { fit, ease, clamp, lerp } from './engine.js';

// ---- the scene's image layers: the owner's hero (Figma 64:716, 3620 x 2715), each layer its own file ----
// rect: where the layer sits inside the scene, 0..1 of the scene (u0, v0, u1, v1), from the Figma frame.
// depth: pointer parallax (0 = far). Layers that touch the background (stems in its vase, the vase on its
// table) share its depth so they never slide off it. pivot: px in the layer's own image.
const HERO = 'assets/3d/figma/hero/';
const SW = 3620, SH = 2715, R = (x, y, w, h) => [x / SW, y / SH, (x + w) / SW, (y + h) / SH];
export const SCENE_ASPECT = SW / SH;
export const LAYERS = [
  { id: 'background', kind: 'gl', src: HERO + 'background.webp', srcSmall: HERO + 'background-1000.webp', depth: 0.12 },
  // stems from the vase mouth (64:725 short, 64:723 long): damped springs, tip lagging the base.
  // k, c: base spring stiffness and damping (per unit inertia); k2, c2: the tip's; joint: radius (px) where the tip segment starts
  { id: 'stem-short', file: 'stem-short', w: 332, h: 498, rect: R(0, 4, 332, 498), depth: 0.12, fade: [6, 26], drift: [-26, -18], stem: { pivot: [2, 496], joint: 250, k: 61.7, c: 2.36, k2: 174, c2: 5.3, lag: 0.55, gain: 0.5, idle: [0.17, 0.43, 1.07] } },
  { id: 'stem-long', file: 'stem-long', w: 1529, h: 971, rect: R(3, 110, 1529, 971), depth: 0.12, fade: [6, 28], drift: [-30, -14], stem: { pivot: [40, 968], joint: 640, k: 32, c: 1.36, k2: 101, c2: 3.6, lag: 0.6, gain: 0.2, idle: [0.21, 0.29, 0.83] } },
  // the vase on the right (64:721): rocks about the bottom centre of its foot when nudged
  { id: 'vase', file: 'vase-right', w: 347, h: 499, rect: R(2611, 1510, 347, 499), depth: 0.12, fade: [4, 22], drift: [34, 6], wobble: { pivot: [172.5, 496], k: 191, c: 7.7, kick: 21 } },
  // the board (64:717), on top; it does not react to the pointer, only the scale-in and the handover
  { id: 'calendar', file: 'board', w: 1031, h: 1328, rect: R(1180.04, 810.84, 1031, 1328), depth: 0.3, fade: [0, 40] },
];
// the board panel inside the scene (its wood, without the peg), scene-normalised: the handover target
export const BOARD_IN_PHOTO = [1188 / SW, 813.84 / SH, 2103 / SW, 2132.84 / SH];
const DEG = Math.PI / 180;

export const CONTACT = { whatsapp: '' }; // e.g. '919876543210' enables the WhatsApp pill

// Figma frames 1-4, frame-local px (desktop)
const F = {
  hero: { x: 129.26, y: [303.39, -186.61, -556.61, -556.61] },
  para: { x: 1352.07, y: [725.78, 235.78, -134.22, -134.22] },
  card1: { x: [1960, 1473.59, 129.26, 129.26], y: [1178, 743.66, 0, -1204.52], s: [1, 1, 0.8274, 0.8274], w: 639.73, h: 794.67 },
  card2: { x: [2338, 2338, 800, 800], y: [1131, 1131, 351.94, -852.58], s: [1, 1, 1, 1], w: 1017.66, h: 794.67 },
  cap: { x: 126.57, y: [709.27, 709.27, 679.27, -525.25], o: [0, 0, 0.8, 0.8], b: [3, 3, 0, 0] },
  dim: [0, 0.4, 0.7, 0],
};
const seg = (arr, q, fns) => { // value along the four states with an ease per segment
  const k = Math.min(2, Math.floor(q)), t = clamp(q - k);
  return lerp(arr[k], arr[k + 1], (fns[k] || ease.linear)(t));
};
const LIN = [ease.linear, ease.linear, ease.linear];
const CARD = [ease.cubicInOut, ease.cubicInOut, ease.linear];

export class Intro {
  constructor(opts) {
    this.opts = opts;
    this.el = document.getElementById('intro');
    this.hero = document.getElementById('hero');
    this.para = document.getElementById('para');
    this.cards = [document.getElementById('card1'), document.getElementById('card2')];
    // each card is a fixed window: the photo moves inside an inner clip, the frame's padding stays visible
    for (const c of this.cards) { const w = document.createElement('div'); w.className = 'card__win'; c.prepend(w); w.appendChild(c.querySelector('img')); }
    this.cap = document.getElementById('cap');
    this.dim = document.getElementById('dim');
    this.frame = document.getElementById('frame');
    this.layerRoot = document.getElementById('layers');
    this.ptr = { x: 0, y: 0, sx: 0, sy: 0 };
    window.addEventListener('pointermove', (e) => { this.ptr.x = e.clientX / innerWidth - 0.5; this.ptr.y = e.clientY / innerHeight - 0.5; }, { passive: true });
    const small = opts.phone;
    this.ptr.px = this.ptr.py = -1e4; this.ptr.vx = this.ptr.vy = 0; this.ptr.t = 0;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = performance.now(), dt = Math.max(8, t - this.ptr.t);
      if (this.ptr.t) { this.ptr.vx = (e.clientX - this.ptr.px) / dt * 1000; this.ptr.vy = (e.clientY - this.ptr.py) / dt * 1000; }
      this.ptr.px = e.clientX; this.ptr.py = e.clientY; this.ptr.t = t; this.ptr.moved = true;
    }, { passive: true });
    // touch: a tap gives the same nudge, once
    window.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') this.tap = { x: e.clientX, y: e.clientY }; }, { passive: true });
    this.layers = LAYERS.filter((l) => l.kind !== 'gl').map((l) => {
      const d = document.createElement('div');
      d.className = `layer layer--${l.id}`;
      const url = `url(${HERO}${l.file}${small ? '-1000' : ''}.webp)`;
      const L = { ...l, el: d, th: 0, om: 0, ph: 0, pm: 0, inside: false, mask: null, sx: 1 };
      if (l.stem) {
        // two copies of the stem: the base segment, and the tip segment rotating again about the joint
        const [px, py] = l.stem.pivot, r = l.stem.joint, f = 70;
        const pos = `${(px / l.w * 100).toFixed(2)}% ${(py / l.h * 100).toFixed(2)}%`;
        L.base = document.createElement('i'); L.tip = document.createElement('i');
        for (const [el, m] of [[L.base, `radial-gradient(circle at ${pos}, #000 ${r - f}px, transparent ${r + f}px)`], [L.tip, `radial-gradient(circle at ${pos}, transparent ${r - f}px, #000 ${r + f}px)`]]) {
          el.className = 'layer__seg'; el.style.backgroundImage = url;
          el.dataset.mask = m; d.appendChild(el);
        }
        d.style.transformOrigin = '0 0';
      } else d.style.backgroundImage = url;
      if (l.wobble || l.stem) this._alpha(L, `${HERO}${l.file}-1000.webp`);
      this.layerRoot.appendChild(d);
      return L;
    });
    this.photo = { x: 0, y: 0, w: 1, h: 1, cx: 0, cy: 0, cw: 1, ch: 1 };
  }

  // a coarse alpha map of a layer for hover and tap tests
  _alpha(L, src) {
    const im = new Image();
    im.onload = () => {
      const w = 64, h = Math.max(1, Math.round(64 * im.height / im.width));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
      const a = g.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) m[i] = a[i * 4 + 3] > 60 ? 1 : 0;
      L.mask = { w, h, m };
    };
    im.src = src;
  }
  // is a screen point on (or within `pad` mask cells of) the layer's art?
  _on(L, x, y, pad) {
    if (!L.mask || !L.box) return false;
    const { w, h, m } = L.mask, b = L.box;
    const u = Math.floor((x - b.x) / b.w * w), v = Math.floor((y - b.y) / b.h * h);
    for (let j = -pad; j <= pad; j++) for (let i = -pad; i <= pad; i++) {
      const uu = u + i, vv = v + j;
      if (uu >= 0 && vv >= 0 && uu < w && vv < h && m[vv * w + uu]) return true;
    }
    return false;
  }

  // stems and vase: mass-spring-damper, integrated in small steps; values in radians
  _physics(dt, now, live) {
    const P = this.ptr, n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    const speed = Math.hypot(P.vx, P.vy);
    for (const L of this.layers) {
      if (!L.box) continue;
      if (L.stem) {
        const s = L.stem, ox = L.box.x + s.pivot[0] * L.sx, oy = L.box.y + s.pivot[1] * L.sx;
        // a hand passing near: the pointer's own angular speed about the pivot is the kick (fast pass, bigger kick)
        if (live && P.moved && this._on(L, P.px, P.py, 2)) {
          const rx = P.px - ox, ry = P.py - oy, r2 = Math.max(400, rx * rx + ry * ry);
          const w = (rx * P.vy - ry * P.vx) / r2;   // rad/s of the pointer about the pivot (screen y down: + = clockwise)
          L.om += clamp(w * s.gain, -0.5, 0.5) * Math.min(1, speed / 900) * (dt * 10);
        }
        if (live && this.tap && this._on(L, this.tap.x, this.tap.y, 3)) L.om += (this.tap.x < ox + L.box.w * 0.3 ? -1 : 1) * 0.09;
        // idle: well under a degree, slow, never quite repeating
        const idle = live ? 0.3 * DEG * (Math.sin(now * s.idle[0] * 6.283) * 0.6 + Math.sin(now * s.idle[1] * 6.283 + 1.3) * 0.3 + Math.sin(now * s.idle[2] * 6.283 + 0.4) * 0.1) : 0;
        for (let i = 0; i < n; i++) {
          const acc = -s.k * (L.th - idle) - s.c * L.om;
          L.om += acc * h; L.th += L.om * h;
          // the tip lags: driven by the base's acceleration, its own softer spring
          const a2 = -s.k2 * L.ph - s.c2 * L.pm - s.lag * acc;
          L.pm += a2 * h; L.ph += L.pm * h;
        }
        L.th = clamp(L.th, -8 * DEG, 8 * DEG); L.ph = clamp(L.ph, -5 * DEG, 5 * DEG);
      } else if (L.wobble) {
        const s = L.wobble, on = live && P.moved && this._on(L, P.px, P.py, 0);
        if (on && !L.inside) L.om += (P.vx >= 0 ? 1 : -1) * s.kick * DEG * Math.min(1.3, 0.5 + speed / 1500);   // from the left, it tips right
        L.inside = on;
        if (live && this.tap && this._on(L, this.tap.x, this.tap.y, 1)) L.om += (this.tap.x < L.box.x + L.box.w / 2 ? 1 : -1) * s.kick * DEG;
        for (let i = 0; i < n; i++) { L.om += (-s.k * L.th - s.c * L.om) * h; L.th += L.om * h; }
        L.th = clamp(L.th, -2.2 * DEG, 2.2 * DEG);
      }
    }
    this.tap = null;
    P.vx *= Math.exp(-10 * dt); P.vy *= Math.exp(-10 * dt);
  }

  layout(vw, vh, phone, secH) {
    this.vw = vw; this.vh = vh; this.phone = phone; this.secH = secH || 3.6 * vh;
    const u = this.u = phone ? vw / 390 : Math.min(vw / 1920, vh / 1200);
    this.ox = phone ? 0 : (vw - 1920 * u) / 2;
    this.oy = phone ? 0 : (vh - 1200 * u) / 2;
    document.documentElement.style.setProperty('--u', `${u}px`);
    document.documentElement.style.setProperty('--ox', `${this.ox}px`);   // chapter copy aligns to the hero block's left edge
    if (!phone) {
      // the frame covers the viewport; the photo sits inside it at Figma's 116.81% x 105.18%, -8.4%, -5.18%
      // the 4:3 scene covers the 16:10 frame edge to edge; the spare height is taken a quarter from the
      // top, three quarters from the bottom (the stems keep their tips, the board clears the nav)
      const k = Math.max(vw / (1920 * u), vh / (1200 * u));
      const W = 1920 * u * k, H = 1200 * u * k, L = (vw - W) / 2, T = (vh - H) / 2;
      const ph = W / SCENE_ASPECT;
      this.base = { x: L, y: T - 0.25 * (ph - H), w: W, h: ph };
      this.cover = this.base;
    } else {
      // phones: the photo shrinks so the calendar fits (84% of the width), a soft cover copy fills around it
      const h = 0.45 * vh / (BOARD_IN_PHOTO[3] - BOARD_IN_PHOTO[1]), w = h * SCENE_ASPECT;
      const bcx = (BOARD_IN_PHOTO[0] + BOARD_IN_PHOTO[2]) / 2, bcy = (BOARD_IN_PHOTO[1] + BOARD_IN_PHOTO[3]) / 2;
      this.base = { x: vw / 2 - bcx * w, y: 0.5 * vh - bcy * h, w, h };
      const ch = Math.max(vh, vw / SCENE_ASPECT);
      this.cover = { x: (vw - ch * SCENE_ASPECT) / 2, y: (vh - ch) / 2, w: ch * SCENE_ASPECT, h: ch };
    }
    for (const c of this.cards) c.style.setProperty('--cw', c.dataset.w); // sizes in design px
  }

  // q: 0..3 across frames 1-4. f: the keyed 3D frame (handover 0..100). Returns the photo state for WebGL.
  update(q, f, dt, now) {
    const { u, ox, oy, phone, vw, vh } = this;
    const P = (x, y) => `translate3d(${(ox + x * u).toFixed(2)}px,${(oy + y * u).toFixed(2)}px,0)`;
    // pointer parallax, damped, fading out before the handover so the board can be matched
    const pk = 1 - fit(q, 2.4, 2.95);
    this.ptr.sx += (this.ptr.x * pk - this.ptr.sx) * (1 - Math.exp(-4 * dt));
    this.ptr.sy += (this.ptr.y * pk - this.ptr.sy) * (1 - Math.exp(-4 * dt));
    const par = (depth) => [-this.ptr.sx * depth * 28 * u * (phone ? 0.3 : 1), -this.ptr.sy * depth * 16 * u * (phone ? 0.3 : 1)];

    // the photo (and the calendar inside it) scales in a little across frames 1-3
    const sc = lerp(1, 1.035, ease.sineInOut(fit(q, 0, 2.2)));
    const b = this.base, bgp = par(LAYERS[0].depth);
    const ax = b.x + b.w * (BOARD_IN_PHOTO[0] + BOARD_IN_PHOTO[2]) / 2, ay = b.y + b.h * (BOARD_IN_PHOTO[1] + BOARD_IN_PHOTO[3]) / 2; // scale about the calendar
    const photo = { x: ax + (b.x - ax) * sc + bgp[0], y: ay + (b.y - ay) * sc + bgp[1], w: b.w * sc, h: b.h * sc };
    this.photo = photo;

    // the layers live as long as the photo does; their motion only runs while they are on screen
    const shown = 1 - fit(f, 10, 40, 0, 1, ease.sineInOut);
    const live = !this.opts.reduced && shown > 0.01 && (q < 2.2 || this.endMode);
    this.layerRoot.style.opacity = shown.toFixed(3);
    this.layerRoot.style.visibility = shown > 0.002 ? 'visible' : 'hidden';
    if (shown > 0.002) this._physics(Math.min(dt, 0.05), now, live);
    for (const l of this.layers) {
      if (shown <= 0.002) break;
      // each layer leaves as the live scene covers the part of the photo it sits on (the table goes first)
      const lo = this.endMode && l.id === 'calendar' ? 0 : 1 - fit(f, l.fade[0], l.fade[1], 0, 1, ease.sineInOut);
      if (lo !== l.lo) {
        l.el.style.opacity = lo.toFixed(3); l.el.style.visibility = lo > 0.002 ? 'visible' : 'hidden';
        // props leave first, softening and drifting a little away from the board (parallax), before the table goes
        if (l.drift) l.el.style.filter = lo < 0.999 ? `blur(${((1 - lo) * 5 * u).toFixed(2)}px)` : 'none';
        l.lo = lo;
      }
      const dk = l.drift ? ease.sineInOut(1 - lo) : 0;
      const p = par(l.depth);
      p[0] += l.drift ? l.drift[0] * dk * u * 2 : 0; p[1] += l.drift ? l.drift[1] * dk * u * 2 : 0;
      const r = l.rect;
      const x = photo.x + r[0] * photo.w + p[0] - bgp[0], y = photo.y + r[1] * photo.h + p[1] - bgp[1];
      const w = (r[2] - r[0]) * photo.w, h = (r[3] - r[1]) * photo.h;
      l.box = { x, y, w, h }; l.sx = w / l.w;
      if (l.el.dataset.w !== w.toFixed(1)) {
        l.el.dataset.w = w.toFixed(1);
        l.el.style.width = `${w.toFixed(1)}px`; l.el.style.height = `${h.toFixed(1)}px`;
        if (l.stem) for (const seg of [l.base, l.tip]) { seg.style.webkitMaskImage = seg.style.maskImage = seg.dataset.mask.replace(/(\d+)px/g, (m, v) => `${(v * l.sx).toFixed(1)}px`); }
      }
      if (l.stem) {
        // base segment rotates about the pivot; the tip rotates again about the joint (on the stem, along its length)
        const s = l.stem, ox = s.pivot[0] * l.sx, oy = s.pivot[1] * l.sx;
        const ja = Math.atan2(-(s.pivot[1]), l.w - s.pivot[0]);   // towards the stem's far corner
        const jx = ox + Math.cos(ja) * s.joint * l.sx, jy = oy + Math.sin(ja) * s.joint * l.sx;
        l.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
        l.base.style.transformOrigin = l.tip.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
        const th = 3 * DEG * Math.tanh(l.th / (3 * DEG)), tp = 2 * DEG * Math.tanh(l.ph / (2 * DEG));   // soft limit: a few degrees at most
        l.base.style.transform = `rotate(${th.toFixed(5)}rad)`;
        l.tip.style.transform = `rotate(${th.toFixed(5)}rad) translate(${(jx - ox).toFixed(1)}px,${(jy - oy).toFixed(1)}px) rotate(${tp.toFixed(5)}rad) translate(${(ox - jx).toFixed(1)}px,${(oy - jy).toFixed(1)}px)`;
      } else if (l.wobble) {
        l.el.style.transformOrigin = `${(l.wobble.pivot[0] * l.sx).toFixed(1)}px ${(l.wobble.pivot[1] * l.sx).toFixed(1)}px`;
        l.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${l.th.toFixed(5)}rad)`;
      } else l.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      if (l.id === 'calendar') {
        // the cross-over is a soft wipe from the top, like the light passing down the board
        const w = fit(f, 0, 14, 0, 1, ease.sineInOut);
        const m = w <= 0 ? 'none' : `linear-gradient(to bottom, transparent ${(w * 130 - 22).toFixed(1)}%, #000 ${(w * 130 + 8).toFixed(1)}%)`;
        l.el.style.webkitMaskImage = l.el.style.maskImage = m;
        l.el.style.visibility = w >= 1 ? 'hidden' : 'visible';
      }
    }

    this.dim.style.opacity = seg(F.dim, q, [ease.sineInOut, ease.sineInOut, ease.cubicInOut]).toFixed(3);
    const gone = f > 70;
    this.el.style.visibility = gone ? 'hidden' : 'visible';
    this.frame.style.opacity = (1 - fit(f, 10, 40)).toFixed(3);
    // a fast jump past the opening (damped scroll racing through it) must not leave a card showing:
    // the cards set their own visibility, which would override the hidden parent
    if (gone) { if (!this.hid) { this.cards.forEach((c) => { c.style.visibility = 'hidden'; }); this.hid = true; } return photo; }
    this.hid = false;

    if (!phone) {
      this.hero.style.transform = P(F.hero.x, seg(F.hero.y, q, LIN));
      this.para.style.transform = P(F.para.x, seg(F.para.y, q, LIN));
      this.cardsUp(q, [
        { x: ox + 129.26 * u, rest: oy + 0 * u, w: 529.28 * u, h: 657.48 * u, s: 0.8274 },
        { x: ox + 800 * u, rest: oy + 351.94 * u, w: 1017.66 * u, h: 794.67 * u, s: 1 },
      ], 21.8 * u);
    } else {
      // phones: hero at the top, paragraph above the nav, the photographs one at a time, rising
      const hy = lerp(0.075 * vh, -0.6 * vh, fit(q, 0, 1.2));
      this.hero.style.transform = `translate3d(${(20).toFixed(1)}px,${hy.toFixed(1)}px,0)`;
      const py = lerp(0.755 * vh, -0.5 * vh, fit(q, 0.05, 1.3));
      this.para.style.transform = `translate3d(20px,${py.toFixed(1)}px,0)`;
      const c1 = this.cards[0], c2 = this.cards[1];
      const w1 = c1.offsetWidth, h1 = c1.offsetHeight, w2 = c2.offsetWidth, h2 = c2.offsetHeight;
      const r1 = 0.08 * vh, r2 = r1 + h1 + 110;   // card 1 leads, its caption, then card 2
      this.cardsUp(q, [
        { x: (vw - w1) / 2, rest: r1, w: w1, h: h1, s: 1 },
        { x: (vw - w2) / 2, rest: r2, w: w2, h: h2, s: 1 },
      ], 14);
    }
    return photo;
  }

  // Cards travel straight up at the page's own (smoothed) scroll rate, resting where the Figma's frame 3
  // puts them at q = 2. Inside each fixed window the photo is zoomed ~1.2x and drifts the other way
  // (lower part on entry, upper part on exit). The caption hangs under card 1 and moves with it.
  cardsUp(q, cards, capGap) {
    const vh = this.vh, travel = (q - 2) * this.secH / 3;   // scroll px past the frame-3 rest
    cards.forEach((c, i) => {
      const el = this.cards[i], img = el.firstElementChild.firstElementChild;
      const y = c.rest - travel;
      el.style.transform = `translate3d(${c.x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${c.s})`;
      el.style.visibility = y > vh + 4 || y + c.h < -4 ? 'hidden' : 'visible';
      const p = clamp((vh - y) / (vh + c.h));                 // 0 entering at the bottom, 1 gone at the top
      const z = lerp(1.22, 1.17, p), ov = (z - 1) / 2 * 100;  // % of the window the image may slide
      img.style.transform = `translate3d(0,${lerp(-ov, ov, p) * 0.92}%,0) scale(${z.toFixed(4)})`;
      if (i === 0) {
        const t = ease.expoOut(fit(p, 0.08, 0.38));
        this.cap.style.transform = `translate3d(${c.x.toFixed(2)}px,${(y + c.h + capGap).toFixed(2)}px,0)`;
        this.cap.style.opacity = (0.8 * t).toFixed(3);
        this.cap.style.filter = t < 0.999 ? `blur(${(3 * (1 - t)).toFixed(2)}px)` : 'none';
      }
    });
  }

  // where the photo's board will be at frame 4 (scale finished, no pointer parallax): the handover target
  finalBoardRect() {
    const b = this.base, sc = 1.035, r = BOARD_IN_PHOTO;
    const ax = b.x + b.w * (r[0] + r[2]) / 2, ay = b.y + b.h * (r[1] + r[3]) / 2;
    const p = { x: ax + (b.x - ax) * sc, y: ay + (b.y - ay) * sc, w: b.w * sc, h: b.h * sc };
    return { x: p.x + r[0] * p.w, y: p.y + r[1] * p.h, w: (r[2] - r[0]) * p.w, h: (r[3] - r[1]) * p.h };
  }

  // the board's target rectangle on screen (px), from the photo's current placement
  boardRect() {
    const p = this.photo, r = BOARD_IN_PHOTO;
    return { x: p.x + r[0] * p.w, y: p.y + r[1] * p.h, w: (r[2] - r[0]) * p.w, h: (r[3] - r[1]) * p.h };
  }
}

// ---- loader: wordmark in, title in, then the line fills top to bottom with real progress ----
export function loader(opts) {
  const root = document.getElementById('pre');
  const fill = root.querySelector('.ld__fill'), pct = root.querySelector('.ld__pct');
  const t0 = performance.now();
  let want = 0, shown = 0, done = false, resolveOut;
  const out = new Promise((r) => { resolveOut = r; });
  root.classList.add('is-in');
  (function tick() {
    const el = (performance.now() - t0) / 1000;
    // the line only starts filling once the name is in (about 0.9 s)
    const gate = opts.reduced ? 1 : clamp((el - 0.9) / 0.4);
    shown += (Math.min(want, gate) - shown) * (opts.reduced ? 1 : 0.1);
    fill.style.transform = `scaleY(${shown.toFixed(4)})`;
    pct.textContent = String(Math.round(shown * 100)).padStart(2, '0');
    root.setAttribute('aria-valuenow', Math.round(shown * 100));
    if (done && shown > 0.995 && el > 1.4) { finish(); return; }
    requestAnimationFrame(tick);
  })();
  function finish() {
    root.classList.add('is-out');                       // the line becomes the seam: the page opens from it
    setTimeout(() => { root.style.display = 'none'; }, opts.reduced ? 0 : 1500);
    resolveOut();
  }
  return { set: (p) => { want = clamp(p); }, done: () => { want = 1; done = true; }, out };
}
