// Scroll engine: one fit() helper, eases, damped scroll, cached section rects.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const ease = {
  linear: (t) => t,
  expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoIn: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  backOut: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

// Clamp v to [inA, inB], ease, map to [outA, outB]. Works with inA > inB too.
export function fit(v, inA, inB, outA = 0, outB = 1, fn = ease.linear) {
  const t = clamp((v - inA) / (inB - inA));
  return outA + (outB - outA) * fn(t);
}

// Damped scroll: displayed s chases the real scroll position.
export class Scroll {
  constructor() {
    this.target = window.scrollY;
    this.s = this.target;
    this.damped = true;
  }
  tick(dt) {
    this.target = window.scrollY;
    if (!this.damped) { this.s = this.target; return; }
    this.s += (this.target - this.s) * (1 - Math.exp(-12 * dt));
    if (Math.abs(this.target - this.s) < 0.05) this.s = this.target;
  }
}

// Section and block offsets inside the content wrapper (layout only, never read while scrolling).
const offsetIn = (el, root) => { let y = 0; for (let n = el; n && n !== root; n = n.offsetParent) y += n.offsetTop; return y; };
export function measure(sections, blocks, root) {
  for (const sec of sections) { sec.top = offsetIn(sec.el, root); sec.height = sec.el.offsetHeight; }
  for (const b of blocks) { b.top = offsetIn(b.el, root); b.height = b.el.offsetHeight; }
}
