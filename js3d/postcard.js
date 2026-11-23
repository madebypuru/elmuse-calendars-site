// Chapters 6-7: the months turning over (textures loaded progressively), and the postcard:
// the artwork strip tears off along its perforation, comes to the camera, turns over, is stamped
// or pinned, and joins eleven others on the wall. Everything is a pure function of the frame
// (plus the visitor's send/keep choice), so scrolling back reverses it.
import * as THREE from 'three';
import { fit, ease, clamp, lerp } from './engine.js';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// theme and the artwork's phrase, from sanctuary-story.js (the owner's data)
export const THEMES = [
  ['Open Skies', 'your sign to look up'], ['Slow Blooms', 'you’re allowed to take your time'], ['Colour Stories', 'run wild, run free'],
  ['Kitchen Stories', 'take a seat'], ['Mango Summers', 'the summer solace'], ['Starry Nights', 'make a wish'],
  ['Puddle Days', 'for the kid in you'], ['Tied Together', 'moh moh ke dhaage'], ['Shape It Slowly', 'the art of becoming'],
  ['Room for Light', 'the light within'], ['Soft Layers', 'romanticizing winter mornings'], ['The Way Home', 'and at the end it is all worth it'],
];
// two soft colours per month (light, dark), measured offline from each artwork strip (web fronts)
export const TINTS = [['#a57a65', '#655145'], ['#4a4a2a', '#1c2419'], ['#a7a696', '#57573f'], ['#8e6f52', '#51402c'], ['#8a7052', '#524430'], ['#151d22', '#0f161b'],
  ['#776552', '#484236'], ['#aa9176', '#715b49'], ['#675448', '#211915'], ['#785a3c', '#2c2117'], ['#a79079', '#645343'], ['#706e61', '#182123']];

// ch6 timeline: month k (1..11) turns over in [T0 + 20k, T0 + 20k + 14]; it has landed at the end
const T0 = 1286, STEP = 20, MOVE = 14;
export const monthHold = (m) => (m === 0 ? 1296 : T0 + STEP * m + MOVE + 3);   // a frame where month m rests
export function monthAt(f) {
  if (f < 1260) return { m: 0, p: 0, k: 0 };
  for (let k = 11; k >= 1; k--) { const a = T0 + STEP * k; if (f >= a) return { m: k - 1, p: clamp((f - a) / MOVE), k }; }
  return { m: 0, p: 0, k: 0 };
}
const W = 0.2383, SH = 0.326, STRIP_H = 0.1064, STRIP_Y = 0.2196, STRIP_V = 0.32636;
// a new texture (own GPU storage) with the same sampling as the model's page texture
export function like(src, img, aniso) {
  const t = new THREE.Texture(img);
  t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT; t.channel = src.channel;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}
const web = (n) => `assets/sanctuary/web/page-${String(n).padStart(2, '0')}.jpg`;

export class Months {
  constructor(stage) {
    this.stage = stage;
    this.top = []; this.stack = null; this.back = []; this.bodyBack = [];
    stage.parts.SheetTop.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { if (/^Sheet(Body|Strip)_Front$/.test(m.name)) this.top.push(m); if (m.name === 'SheetStrip_Back') this.back.push(m); if (m.name === 'SheetBody_Back') this.bodyBack.push(m); }); });
    stage.parts.SheetStack.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { if (m.name === 'SheetStack_Front') this.stack = m; }); });
    this.orig = { top: this.top[0].map, stack: this.stack.map, back: this.back[0].map };
    this.tex = {}; this.want = new Set();
    this.aniso = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
    this.cur = '';
  }
  // web-size pages, fetched when near; never awaited, so scrolling never waits
  get(n, full = false) {
    if (!full && n === 1) return this.orig.top;
    if (!full && n === 3) return this.orig.stack;
    const id = (full ? 'f' : 'w') + n;
    if (this.tex[id]) return this.tex[id].ready ? this.tex[id].t : null;
    const e = this.tex[id] = { ready: false, t: null };
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { e.t = like(this.orig.top, img, this.aniso); e.ready = true; };
    img.src = full ? `assets/sanctuary/full/page-${String(n).padStart(2, '0')}.webp` : web(n);
    return null;
  }
  // any pages: front of the top sheet, front of the stack, back of the top sheet (0 = leave), full size for close-ups
  setPages(front, stack, back, full = false) {
    const key = `p${front}|${stack}|${back}|${full}`;
    if (key === this.cur) return;
    const fr = this.get(front, full), st = this.get(stack), bk = back ? this.get(back, full) : null;
    if (fr) this.top.forEach((m) => { m.map = fr; });
    if (st) this.stack.map = st;
    if (bk) this.back.concat(this.bodyBack || []).forEach((m) => { m.map = bk; });
    if (fr && st && (bk || !back)) this.cur = key;
  }
  // which month faces the visitor on the top sheet, the stack and the strip's back
  set(topM, stackPage, backM) {
    const key = `${topM}|${stackPage}|${backM}`;
    if (key === this.cur) return;
    const top = this.get(2 * topM + 1), st = this.get(stackPage), bk = backM < 0 ? this.orig.back : this.get(2 * backM + 2);
    if (top) this.top.forEach((m) => { m.map = top; });
    if (st) this.stack.map = st;
    if (bk) this.back.forEach((m) => { m.map = bk; });
    if (top && st && bk) this.cur = key;   // retry next frame until all are in
  }
  prefetch(m) { for (const k of [m - 1, m, m + 1, m + 2]) if (k >= 0 && k <= 11) { this.get(2 * k + 1); } this.get(Math.min(25, 2 * m + 3)); }
}

// ---------- the postcard ----------
// the strip's faces rebuilt as a grid (the model has rows only) so the tear can peel from a corner
function gridFace(back, oldGeo) {
  const C = 48, R = 12, y0 = 0.0002, pos = [], nrm = [], uv = [], idx = [];
  for (let j = 0; j <= R; j++) for (let i = 0; i <= C; i++) {
    const u = i / C, y = y0 + (STRIP_H - y0) * j / R, x = -W / 2 + W * u;
    pos.push(x, y, back ? -0.0002 : 0.0002); nrm.push(0, 0, back ? -1 : 1);
    uv.push(back ? 1 - u : u, STRIP_V * (1 - y / STRIP_H));
  }
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    const a = j * (C + 1) + i, b = a + 1, c = a + C + 1, d = c + 1;
    if (back) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (oldGeo) oldGeo.dispose();
  return g;
}

function postmarkTexture(month) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), ink = 'rgba(36, 44, 58, 0.86)';
  g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 9;
  g.beginPath(); g.arc(200, 256, 150, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(200, 256, 122, 0, Math.PI * 2); g.stroke();
  g.font = '600 34px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const arc = (t, r, a0, dir) => { const n = t.length; for (let i = 0; i < n; i++) { const a = a0 + dir * (i - (n - 1) / 2) * 0.17; g.save(); g.translate(200 + Math.cos(a) * r, 256 + Math.sin(a) * r); g.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2)); g.fillText(t[i], 0, 0); g.restore(); } };
  arc('ELMUSE POST', 136, -Math.PI / 2, 1);
  arc('2027', 136, Math.PI / 2, -1);
  g.font = '600 46px "IBM Plex Mono", monospace'; g.fillText(month.slice(0, 3).toUpperCase(), 200, 236);
  g.font = '500 30px "IBM Plex Mono", monospace'; g.fillText('1 · 2027', 200, 286);
  // cancel lines running out to the right
  g.lineWidth = 7;
  for (let k = 0; k < 4; k++) { g.beginPath(); for (let x = 340; x <= 508; x += 4) { const y = 200 + k * 38 + Math.sin(x / 16) * 7; if (x === 340) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  // worn ink: knock out speckles
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { g.globalAlpha = Math.random() * 0.6; g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _p2 = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class Postcard {
  constructor(stage, opts) {
    this.stage = stage; this.opts = opts;
    const top = stage.parts.SheetTop;
    this.strip = top.getObjectByName('SheetTop_Strip');
    this.restLocal = this.strip.matrix.clone();
    this.meshes = [];
    this.strip.traverse((o) => {
      if (!o.isMesh) return;
      const name = [].concat(o.material)[0].name;
      if (name === 'SheetStrip_Front') o.geometry = gridFace(false, o.geometry);
      if (name === 'SheetStrip_Back') o.geometry = gridFace(true, o.geometry);
      o.geometry.computeBoundingSphere(); o.geometry.boundingSphere.radius += 0.08;
      o.frustumCulled = false;
      const p = o.geometry.attributes.position;
      this.meshes.push({ o, g: o.geometry, P: Float32Array.from(p.array), N: o.geometry.attributes.normal ? Float32Array.from(o.geometry.attributes.normal.array) : null, rel: o.matrix.clone(), inv: o.matrix.clone().invert() });
    });
    this.deformed = false;
    // brass, shared by the pins
    let brass = null;
    stage.model.traverse((o) => { if (!brass && o.isMesh) [].concat(o.material).forEach((m) => { if (m.name === 'Brass') brass = m; }); });
    this.brass = brass;
    const pinGeo = new THREE.SphereGeometry(0.0034, 16, 8); pinGeo.scale(1, 1, 0.55);
    // the visitor's postmark and pin ride on the strip, never on its surface (decal 0.5 mm off, offset in depth)
    this.pmMat = new THREE.MeshStandardMaterial({ map: null, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.9, opacity: 0 });
    this.pm = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), this.pmMat);
    this.pm.rotation.y = Math.PI; this.pm.position.set(-0.088, 0.077, -0.0007); this.pm.renderOrder = 2;
    this.strip.add(this.pm);
    this.pin = new THREE.Mesh(pinGeo, brass); this.pin.position.set(0, 0.094, 0.0025); this.pin.castShadow = true;
    this.pinBack = new THREE.Mesh(new THREE.ConeGeometry(0.0008, 0.003, 8), brass); this.pinBack.rotation.x = -Math.PI / 2; this.pinBack.position.set(0, 0.094, -0.0017);
    this.strip.add(this.pin, this.pinBack);
    this.fate = null; this.fateT = 0; this.pmMonth = -1;
    // the wall and the other eleven cards
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0xcdb497, roughness: 0.95, transparent: true, opacity: 0 });
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.2), this.wallMat);
    this.wall.position.set(0, 1.1, -0.35); this.wall.receiveShadow = true; this.wall.visible = false;
    stage.scene.add(this.wall);
    // on the owner's hero table the wall is the photo's own: the cards hang in front of it and only their
    // shadows are drawn (a shadow catcher just behind the grid), lit by the photo's window (the sun)
    this.heroWall = true;
    this.wallAt = opts.phone ? { x: 0, y: 0.7, z: -3.4 } : { x: 0.05, y: 0.57, z: -3.0 };   // above the board, clear of it and of the copy (measured)
    this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.ShadowMaterial({ opacity: 0.22, color: 0x3a2416, depthWrite: false }));
    this.catcher.receiveShadow = true; this.catcher.visible = false;
    stage.scene.add(this.catcher);
    this.cards = [];
    const tl = new THREE.TextureLoader();
    const cardGeo = new THREE.BoxGeometry(W, STRIP_H, 0.0004);
    const edge = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.9 });
    for (let k = 0; k < 12; k++) {
      const face = new THREE.MeshStandardMaterial({ color: 0xe6dbc2, roughness: 0.88 });
      const back = new THREE.MeshStandardMaterial({ color: 0xe9e1d2, roughness: 0.9 });
      const mesh = new THREE.Mesh(cardGeo, [edge, edge, edge, edge, face, back]);
      mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false;
      const pin = new THREE.Mesh(pinGeo, brass); pin.position.set(0, 0.094 - STRIP_H / 2, 0.0024); pin.castShadow = true; mesh.add(pin);
      stage.scene.add(mesh);
      this.cards.push({ mesh, face, src: `assets/3d/cards/card-${String(k + 1).padStart(2, '0')}.webp`, loaded: false });
    }
    this.tl = tl;
  }

  loadCards() {
    for (const c of this.cards) {
      if (c.loaded) continue;
      c.loaded = true;
      this.tl.load(c.src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; c.face.map = t; c.face.color.set(0xffffff); c.face.needsUpdate = true; });
    }
  }

  // slot centre on the wall for month k (4 x 3 on wide screens, 3 x 4 on phones), true grid, even 3 cm gaps
  slot(k, out) {
    const cols = this.opts.phone ? 3 : 4, rows = 12 / cols, gx = 0.03, gy = 0.03;
    const c = k % cols, r = Math.floor(k / cols), A = this.heroWall ? this.wallAt : { x: 0, y: 0.6, z: -0.342 };
    return out.set(A.x + (c - (cols - 1) / 2) * (W + gx), A.y + ((rows - 1) / 2 - r) * (STRIP_H + gy), A.z);
  }

  // tear: t 0..1. The separation runs from the left end of the perforation to the right; what has come
  // free lifts off the body and curls back a little, most at the lower edge
  _deform(t, flat) {
    const amt = t * (1 - flat);
    if (amt < 1e-4 && !this.deformed) return;
    this.deformed = amt >= 1e-4;
    const s = t * 1.4 - 0.15;
    for (const m of this.meshes) {
      const pos = m.g.attributes.position, nrm = m.g.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        _v.set(m.P[i * 3], m.P[i * 3 + 1], m.P[i * 3 + 2]).applyMatrix4(m.rel);   // strip space
        const u = (_v.x + W / 2) / W, yy = clamp(_v.y / STRIP_H);
        const d = u * 0.85 + yy * 0.15;
        const pe = clamp((s - d) / 0.35); const peel = pe * pe * (3 - 2 * pe);
        const low = 1 - yy * 0.7;
        const lift = (0.006 + 0.03 * peel) * peel * low * (1 - flat);
        const ang = 0.5 * peel * low * (1 - flat);             // curl: the freed edge rolls up and away from the body
        const zz = _v.z, yv = _v.y;
        _v.z = zz + lift + Math.sin(ang) * (STRIP_H - yv) * 0.18;
        _v.y = yv + peel * 0.009 * low * (1 - flat);           // a gap opens along the perforation
        _v.applyMatrix4(m.inv);
        pos.setXYZ(i, _v.x, _v.y, _v.z);
        if (nrm && m.N) { const nz = m.N[i * 3 + 2]; nrm.setXYZ(i, m.N[i * 3], m.N[i * 3 + 1] - Math.sin(ang) * 0.6 * Math.sign(nz || 1), nz); }
      }
      pos.needsUpdate = true; if (nrm) nrm.needsUpdate = true;
    }
  }

  // drive everything from the frame. tear: 0..1 (keys or hand); month: the visitor's month
  update(f, tear, month, clock) {
    const top = this.stage.parts.SheetTop;
    const inCh = f > 1560 && f < 1900;
    this.wall.visible = !this.heroWall && inCh && f > 1566;
    this.catcher.visible = this.heroWall && inCh && f > 1740;
    if (this.catcher.visible) { this.catcher.position.set(this.wallAt.x, this.wallAt.y, this.wallAt.z - 0.012); this.catcher.material.opacity = 0.22 * fit(f, 1740, 1770) * fit(f, 1862, 1880, 1, 0); }
    this.wallMat.opacity = fit(f, 1566, 1600) * fit(f, 1872, 1896, 1, 0);
    this.wallMat.transparent = this.wallMat.opacity < 0.999;
    // the card's journey: A attached (deformed by the tear), B held up to the camera, C its slot on the wall
    const fly = fit(f, 1650, 1694, 0, 1, ease.sineInOut);        // A -> B
    const flip = fit(f, 1700, 1726, 0, 1, ease.cubicInOut);      // B turns to its back
    const go = fit(f, 1744, 1776, 0, 1, ease.sineInOut);         // B -> C, turning back to the front
    const home = fit(f, 1862, 1894, 0, 1, ease.sineInOut);       // C -> A, re-attached
    const flat = Math.max(fly, home);
    this._deform(inCh ? clamp(tear) * (1 - home) : 0, inCh ? flat : 0);
    this.strip.matrixAutoUpdate = false;
    if (!inCh || (fly <= 0 && home <= 0) || home >= 1) { this.strip.matrix.copy(this.restLocal); this.strip.matrixWorldNeedsUpdate = true; }
    else {
      top.updateWorldMatrix(true, false);
      _m.multiplyMatrices(top.matrixWorld, this.restLocal);
      const A = new THREE.Vector3(), qA = new THREE.Quaternion(); _m.decompose(A, qA, _v);
      A.add(_p.set(0, 0.012, 0.03).applyQuaternion(qA).multiplyScalar(Math.min(1, tear)));   // freed: just off the body
      const B = _p.set(this.heroWall && !this.opts.phone ? -0.07 : 0, (this.heroWall ? 0.3 : 0.33) - STRIP_H / 2, 0.62), qB = _q.setFromAxisAngle(Y, Math.PI * flip * (1 - go));
      const C = this.slot(month, _p2).sub(_v.set(0, STRIP_H / 2, 0));
      let P, Q = new THREE.Quaternion();
      if (home > 0) {            // from the wall back to the sheet, over the board's top
        P = C.clone().lerp(A, home); P.y += Math.sin(Math.PI * home) * 0.22; P.z += Math.sin(Math.PI * home) * 0.12;
        Q.identity().slerp(qA, home);
      } else if (go > 0) {       // up and over the board to its slot, front out
        P = B.clone().lerp(C, go); P.y += Math.sin(Math.PI * go) * 0.24;
        Q.copy(qB);
      } else {
        P = A.clone().lerp(B, fly); P.y += Math.sin(Math.PI * fly) * 0.05;
        Q.copy(qA).slerp(qB, fly);
      }
      _m.compose(P, Q, _s);
      this.strip.matrix.copy(top.matrixWorld).invert().multiply(_m);
      this.strip.matrixWorldNeedsUpdate = true;
    }
    // send: a postmark inked on over 0.35 s; keep: a brass pin. They stay with the card.
    if (this.fate === 'sent' && this.pmMonth !== month) { this.pmMat.map = postmarkTexture(MONTHS[month]); this.pmMat.needsUpdate = true; this.pmMonth = month; }
    const fk = clamp((clock - this.fateT) / 0.35);
    const shownFate = inCh && f > 1700 && f < 1880 ? this.fate : null;
    this.pmMat.opacity = shownFate === 'sent' ? ease.cubicOut(fk) : 0;
    this.pm.visible = this.pmMat.opacity > 0.01;
    this.pm.scale.setScalar(shownFate === 'sent' ? lerp(1.25, 1, ease.expoOut(fk)) : 1);
    this.pin.visible = this.pinBack.visible = shownFate === 'kept';
    if (this.pin.visible) this.pin.position.z = lerp(0.012, 0.0025, ease.expoOut(fk));
    // the other eleven arrive one by one from above, and leave the same way
    const show = inCh && f > 1760;
    for (let k = 0; k < 12; k++) {
      const c = this.cards[k];
      c.mesh.visible = show && k !== month;
      if (!c.mesh.visible) continue;
      const order = (k * 7) % 12;
      const inA = fit(f, 1772 + order * 3.2, 1790 + order * 3.2, 0, 1, ease.cubicOut);
      const outA = fit(f, 1860 + order * 1.2, 1874 + order * 1.2, 0, 1, ease.cubicInOut);
      this.slot(k, c.mesh.position);
      c.mesh.position.y += (1 - inA) * 0.9 + outA * 0.9;
      c.mesh.position.z += (1 - inA) * 0.06;
      c.mesh.rotation.z = (1 - inA) * (k % 2 ? 0.08 : -0.06);
      c.mesh.visible = inA > 0 && outA < 1;
    }
  }

  choose(fate, clock) { this.fate = fate; this.fateT = clock; }
  hitStrip(x, y, w, h, ray) {
    ray.setFromCamera({ x: x / w * 2 - 1, y: -(y / h) * 2 + 1 }, this.stage.camera);
    return ray.intersectObject(this.strip, true).length > 0;
  }
}
