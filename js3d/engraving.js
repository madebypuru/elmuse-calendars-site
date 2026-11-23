// The engraving decal: a 1024x256 canvas (11.1 px/mm over 92 x 23 mm) drawn into the
// Engraving quad's colour, bump and ember (emissive) maps. Typed names burn in letter
// by letter with a short ember glow and a wisp of smoke.
import * as THREE from 'three';

const W = 1024, H = 256;
const BURN = 'rgba(38,20,8,0.95)';
const MAX = 40;

function canvas() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return [c, c.getContext('2d')];
}

export class Engraving {
  constructor(mesh, imgs, opts) {
    this.mesh = mesh;
    this.imgs = imgs; // { col, height }
    this.reduced = opts.reduced;
    this.onLetter = opts.onLetter || (() => {});
    [this.cc, this.cx] = canvas();
    [this.hc, this.hx] = canvas();
    [this.ec, this.ex] = canvas();
    const tex = (c, srgb) => {
      const t = new THREE.CanvasTexture(c);
      t.flipY = false;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    };
    this.colT = tex(this.cc, true);
    this.hT = tex(this.hc, false);
    this.eT = tex(this.ec, true);
    const old = mesh.material;
    this.mat = new THREE.MeshStandardMaterial({
      map: this.colT, bumpMap: this.hT, bumpScale: 3.6, emissiveMap: this.eT,
      emissive: new THREE.Color(1.0, 0.36, 0.08), emissiveIntensity: 0,
      roughness: 0.97, metalness: 0, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    mesh.material = this.mat;
    old.dispose();
    this.text = '';
    this.letters = []; // { ch, x, w, t0 }
    this.size = 120;
    this.wisps = this._wisps();
    this._sparks();
    this.drawDefault();
  }

  _wisps() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const map = new THREE.CanvasTexture(c);
    const list = [];
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0xd9d2c8, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false;
      s.userData = { t0: -1, ox: 0, oy: 0, dx: 0 };
      this.mesh.add(s);
      list.push(s);
    }
    this.wispI = 0;
    return list;
  }

  drawDefault() {
    const { cx, hx, ex } = this;
    cx.clearRect(0, 0, W, H); cx.drawImage(this.imgs.col, 0, 0, W, H);
    hx.fillStyle = '#fff'; hx.fillRect(0, 0, W, H); hx.drawImage(this.imgs.height, 0, 0, W, H);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
    this.colT.needsUpdate = this.hT.needsUpdate = this.eT.needsUpdate = true;
    this.mat.emissiveIntensity = 0;
  }

  // lay the name out: one line, shrink to fit 860 px (77 mm), centred
  setText(raw, now) {
    const text = raw.replace(/\s+/g, ' ').slice(0, MAX);
    const prev = this.text;
    this.text = text;
    if (!text.trim()) { this.letters = []; this.drawDefault(); return; }
    const g = this.cx;
    let size = 84;
    g.font = `500 ${size}px Figtree, Arial, sans-serif`;
    const full = g.measureText(text).width;
    if (full > 860) size = Math.max(26, Math.floor(size * 860 / full));
    this.size = size;
    g.font = `500 ${size}px Figtree, Arial, sans-serif`;
    const total = g.measureText(text).width;
    const x0 = (W - total) / 2;
    const old = this.letters;
    this.letters = [...text].map((ch, i) => {
      const x = x0 + g.measureText(text.slice(0, i)).width;
      const keep = i < prev.length && prev[i] === ch && old[i];
      const fresh = !keep && ch !== ' ';
      const t0 = keep ? old[i].t0 : (fresh && !this.reduced ? now + i * 0 : -1e9);
      return { ch, x, w: g.measureText(ch).width, t0 };
    });
    // letters that are new burn one after another
    let k = 0;
    for (const L of this.letters) if (L.t0 >= now - 1e-3 && L.t0 > -1e8) { L.t0 = now + k * 0.09; k++; }
    this.dirty = true;
  }

  // per-frame: redraw while letters are burning; returns true if anything changed
  tick(now) {
    const DUR = 0.55;
    let active = false;
    for (const L of this.letters) if (now - L.t0 < DUR + 0.2) active = true;
    if (!active && !this.dirty) { this._tickWisps(now); return; }
    this.dirty = false;
    const { cx, hx, ex } = this;
    const base = H * 0.5 + this.size * 0.36; // baseline so the x-height sits centred
    const font = `500 ${this.size}px Figtree, Arial, sans-serif`;
    cx.clearRect(0, 0, W, H);
    hx.fillStyle = '#fff'; hx.fillRect(0, 0, W, H);
    ex.fillStyle = '#000'; ex.fillRect(0, 0, W, H);
    cx.font = hx.font = ex.font = font;
    cx.textBaseline = hx.textBaseline = ex.textBaseline = 'alphabetic';
    let glow = 0;
    for (const L of this.letters) {
      if (L.ch === ' ') continue;
      const p = Math.min(1, Math.max(0, (now - L.t0) / DUR));
      if (p <= 0) continue;
      if (p > 0 && !L.fired) { L.fired = true; if (now - L.t0 < DUR) { this._spawn(L, now); this.onLetter(); } }
      // scorch halo, then the burn
      cx.save();
      cx.shadowColor = `rgba(105,55,20,${0.55 * p})`;
      cx.shadowBlur = 11;
      cx.fillStyle = BURN;
      cx.filter = 'blur(0.6px)';
      cx.globalAlpha = Math.pow(p, 0.7);
      cx.fillText(L.ch, L.x, base);
      cx.restore();
      hx.fillStyle = `rgba(0,0,0,${0.8 * p})`;
      hx.filter = 'blur(1.5px)';
      hx.fillText(L.ch, L.x, base);
      hx.filter = 'none';
      const e = Math.sin(Math.PI * Math.min(1, p * 1.05));
      if (e > 0.01) {
        ex.fillStyle = `rgba(255,170,90,${e})`;
        ex.filter = 'blur(2px)';
        ex.fillText(L.ch, L.x, base);
        ex.filter = 'none';
        glow = Math.max(glow, e);
      }
    }
    this.mat.emissiveIntensity = this.reduced ? 0 : 5 * glow;
    this.colT.needsUpdate = this.hT.needsUpdate = this.eT.needsUpdate = true;
    this._tickWisps(now);
  }

  _spawn(L, now) {
    if (this.reduced) return;
    this._spawnSparks(L);
    for (let k = 0; k < 1; k++) {
      const s = this.wisps[this.wispI++ % this.wisps.length];
      const u = (L.x + L.w * (0.3 + 0.4 * Math.random())) / W;
      s.userData = { t0: now + k * 0.12, ox: (u - 0.5) * 0.092, oy: -0.001, dx: (Math.random() - 0.5) * 0.004 };
      s.visible = true;
    }
  }

  // embers as sparks: tiny hot points flung off the burn, falling back and cooling
  _sparks() {
    const N = 90;
    this.sp = { n: N, i: 0, pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), t0: new Float32Array(N).fill(-9), life: new Float32Array(N), heat: new Float32Array(N) };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.sp.pos, 3));
    g.setAttribute('heat', new THREE.BufferAttribute(this.sp.heat, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { size: { value: 3.0 * Math.min(2, window.devicePixelRatio || 1) } },
      vertexShader: 'attribute float heat; varying float vH; uniform float size; void main(){ vH = heat; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * (0.4 + heat) * (0.35 / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying float vH; void main(){ float d = length(gl_PointCoord - 0.5); if (vH <= 0.0 || d > 0.5) discard; float a = smoothstep(0.5, 0.0, d) * vH; vec3 c = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.85, 0.5), vH); gl_FragColor = vec4(c * 3.0 * a, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.sparkPts = new THREE.Points(g, m);
    this.sparkPts.frustumCulled = false;
    this.mesh.add(this.sparkPts);
  }

  _spawnSparks(L) {
    const s = this.sp;
    for (let k = 0; k < 7; k++) {
      const i = s.i++ % s.n;
      const u = (L.x + L.w * Math.random()) / W;
      s.pos[i * 3] = (u - 0.5) * 0.092; s.pos[i * 3 + 1] = (Math.random() - 0.5) * 0.008; s.pos[i * 3 + 2] = 0.0008;
      s.vel[i * 3] = (Math.random() - 0.5) * 0.05; s.vel[i * 3 + 1] = 0.02 + Math.random() * 0.05; s.vel[i * 3 + 2] = 0.01 + Math.random() * 0.04;
      s.t0[i] = this.now || 0; s.life[i] = 0.35 + Math.random() * 0.5;
    }
  }

  _tickSparks(now) {
    const s = this.sp; if (!s) return;
    const dt = Math.min(0.05, now - (this.lastSpark || now)); this.lastSpark = now;
    let any = false;
    for (let i = 0; i < s.n; i++) {
      const a = (now - s.t0[i]) / s.life[i];
      if (a < 0 || a > 1) { s.heat[i] = 0; continue; }
      any = true;
      s.vel[i * 3 + 1] -= 0.12 * dt;
      for (let k = 0; k < 3; k++) s.pos[i * 3 + k] += s.vel[i * 3 + k] * dt;
      s.heat[i] = (1 - a) * (0.7 + 0.3 * Math.sin(now * 60 + i));
    }
    this.sparkPts.geometry.attributes.position.needsUpdate = true;
    this.sparkPts.geometry.attributes.heat.needsUpdate = true;
    this.sparkPts.visible = any;
  }

  _tickWisps(now) {
    this.now = now;
    this._tickSparks(now);
    for (const s of this.wisps) {
      const d = s.userData;
      if (!s.visible) continue;
      const a = (now - d.t0) / 1.6;
      if (a < 0) { s.material.opacity = 0; continue; }
      if (a > 1) { s.visible = false; continue; }
      // local quad space: +y up the board, +z out of the face
      s.position.set(d.ox + d.dx * a + Math.sin(a * 6 + d.ox * 90) * 0.0015, d.oy + a * 0.022, 0.002 + a * 0.012);
      const sc = 0.006 + a * 0.016;
      s.scale.set(sc, sc, sc);
      s.material.opacity = 0.16 * Math.sin(Math.PI * a) * (1 - a * 0.4);
    }
  }
}
