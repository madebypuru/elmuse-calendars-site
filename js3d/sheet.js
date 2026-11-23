// The top sheet as card: the turn (0 front .. 1 back) is a rotation about the sheet's own
// vertical centre line; while it turns the sheet twists (the top lags the bottom) and bows a
// little, like card. Bend peaks mid-turn and is zero at rest, so the mesh is untouched there.
// CPU deformation of ~2.3k vertices: shadows and raycasts follow without custom depth shaders.
import * as THREE from 'three';
import { like } from './postcard.js';

const H = 0.326;          // sheet height (m), pivot at its bottom edge
const TWIST = 0.2;        // rad of lag at the top edge, mid-turn
const BOW = 0.011;        // m of bow at the top edge, mid-turn
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _n = new THREE.Vector3();

export class Sheet {
  constructor(stage, opts) {
    this.stage = stage;
    this.opts = opts;
    this.obj = stage.parts.SheetTop;
    this.q0 = this.obj.quaternion.clone();
    this.meshes = [];
    this.obj.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(this.obj.matrixWorld).invert();
    this.obj.traverse((o) => {
      if (!o.isMesh) return;
      const rel = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);   // mesh local -> sheet space
      const g = o.geometry;
      const p = g.attributes.position, n = g.attributes.normal;
      const P = new Float32Array(p.count * 3), N = n ? new Float32Array(n.count * 3) : null;
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i).applyMatrix4(rel); P.set([_v.x, _v.y, _v.z], i * 3);
        if (N) { _n.fromBufferAttribute(n, i).transformDirection(rel); N.set([_n.x, _n.y, _n.z], i * 3); }
      }
      g.computeBoundingSphere();
      g.boundingSphere.radius += 0.06;   // room for the bend
      this.meshes.push({ o, g, P, N, inv: new THREE.Matrix4().copy(rel).invert() });
    });
    this.bent = false;
    this.dir = 1;
    this.last = 0;
    this.turn = 0;
    this.hiRes = null;
  }

  // turn: 0 front, 1 back (any real number; integers are flat). dt for the direction of travel.
  // flex 0..1: extra bow with no turn (a sheet carried over the top of the board)
  set(turn, flex = 0) {
    const v = turn - this.last;
    if (Math.abs(v) > 1e-4) this.dir = Math.sign(v);
    this.last = turn;
    this.turn = turn;
    const ang = Math.PI * turn;
    this.obj.quaternion.copy(this.q0).multiply(new THREE.Quaternion().setFromAxisAngle(_n.set(0, 1, 0), ang));
    const s = Math.abs(Math.sin(ang));
    const tamt = this.opts.reduced ? 0 : s * s * (3 - 2 * s);   // smooth peak mid-turn
    const amt = Math.max(tamt, this.opts.reduced ? 0 : flex);
    if (amt < 1e-4 && !this.bent) return;
    this.bent = amt >= 1e-4;
    const tw = -TWIST * tamt * this.dir, bw = BOW * amt;
    for (const m of this.meshes) {
      const pos = m.g.attributes.position, nrm = m.g.attributes.normal;
      const e = m.inv.elements;
      for (let i = 0; i < pos.count; i++) {
        const x = m.P[i * 3], y = m.P[i * 3 + 1], z = m.P[i * 3 + 2];
        const k = Math.max(0, y / H);
        const a = tw * k, c = Math.cos(a), sn = Math.sin(a);
        const zb = z - bw * k * k;                 // the top bows back from the face
        _v.set(c * x + sn * zb, y, -sn * x + c * zb).applyMatrix4(m.inv);
        pos.setXYZ(i, _v.x, _v.y, _v.z);
        if (nrm) {
          const nx = m.N[i * 3], nz = m.N[i * 3 + 2];
          const ny = m.N[i * 3 + 1] + 2 * bw * k / H * nz;   // tilt from the bow's slope
          _n.set(c * nx + sn * nz, ny, -sn * nx + c * nz);
          // directions only: rotate by the inverse's linear part
          const X = e[0] * _n.x + e[4] * _n.y + e[8] * _n.z, Y = e[1] * _n.x + e[5] * _n.y + e[9] * _n.z, Z = e[2] * _n.x + e[6] * _n.y + e[10] * _n.z;
          const L = Math.hypot(X, Y, Z) || 1;
          nrm.setXYZ(i, X / L, Y / L, Z / L);
        }
      }
      pos.needsUpdate = true;
      if (nrm) nrm.needsUpdate = true;
    }
  }

  // the front at full print resolution (the month grid at the standing pose)
  loadFront(url) { return this.loadBack(url, /^Sheet(Body|Strip)_Front$/, 'hiFront'); }
  // the journal side at full resolution, fetched just before it is needed
  loadBack(url, re = /^Sheet(Body|Strip)_Back$/, key = 'hiRes') {
    if (this[key]) return;
    this[key] = 'loading';
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const max = this.stage.renderer.capabilities.getMaxAnisotropy();
      const done = new Set();
      this.obj.traverse((o) => {
        if (!o.isMesh) return;
        for (const mat of [].concat(o.material)) {
          if (!re.test(mat.name) || !mat.map) continue;
          if (!done.has(mat.map)) { done.add(mat.map); done[mat.map.uuid] = like(mat.map, img, max); }
          mat.map = done[mat.map.uuid];
          mat.needsUpdate = true;
        }
      });
      this[key] = 'ready'; this[key + 'Tex'] = [...done].length ? done[[...done][0].uuid] : null;
    };
    img.onerror = () => { this[key] = null; };
    img.src = url;
  }

  // does a screen point (CSS px) land on the sheet?
  hit(x, y, w, h, ray) {
    ray.setFromCamera({ x: x / w * 2 - 1, y: -(y / h) * 2 + 1 }, this.stage.camera);
    return ray.intersectObject(this.obj, true).length > 0;
  }
}
