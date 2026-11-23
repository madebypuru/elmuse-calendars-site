// Keyframes authored in Blender (calendar-refs/blender/keys.py), baked every
// `step` frames. Scrubbed by frame number with lerp / slerp between neighbours.
import * as THREE from 'three';

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
// Catmull-Rom through the baked samples: no velocity kinks at sample boundaries
const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

export class Keys {
  constructor(data) {
    this.d = data;
    this.step = data.step;
    this.last = (data.frames - 1) / data.step;
    this.t = data.tracks;
  }
  // index + fraction for a frame
  at(frame) {
    const x = Math.min(this.last, Math.max(0, frame / this.step));
    const i = Math.min(this.last - 1, Math.floor(x));
    return [i, x - i];
  }
  num(name, frame) {
    const v = this.t[name];
    if (!Array.isArray(v)) return v;
    const [i, f] = this.at(frame), n = v.length - 1;
    return cr(v[Math.max(0, i - 1)], v[i], v[i + 1], v[Math.min(n, i + 2)], f);
  }
  vec(name, frame, out) {
    const v = this.t[name];
    if (!Array.isArray(v[0])) return out.set(v[0], v[1], v[2]);
    const [i, f] = this.at(frame), n = v.length - 1;
    const a = v[Math.max(0, i - 1)], b = v[i], c = v[i + 1], d = v[Math.min(n, i + 2)];
    return out.set(cr(a[0], b[0], c[0], d[0], f), cr(a[1], b[1], c[1], d[1], f), cr(a[2], b[2], c[2], d[2], f));
  }
  quat(name, frame, out) {
    const v = this.t[name];
    if (!Array.isArray(v[0])) return out.set(v[3], v[4], v[5], v[6]);
    const [i, f] = this.at(frame);
    const a = v[i], b = v[i + 1];
    qa.set(a[3], a[4], a[5], a[6]);
    qb.set(b[3], b[4], b[5], b[6]);
    return out.slerpQuaternions(qa, qb, f);
  }
  // visibility switches are stepped, not blended
  flag(name, frame) {
    const v = this.t[name];
    if (!Array.isArray(v)) return !!v;
    const [i, f] = this.at(frame);
    return !!v[f < 0.5 ? i : i + 1];
  }
}
