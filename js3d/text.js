// Text blocks: statements split into characters, body into lines. Every value is a
// pure function of the block's position in the viewport, so scrolling back reverses it.
import { SplitText } from 'gsap/SplitText.js';
import { fit, ease } from './engine.js';

export function setupBlocks(els, opts) {
  return els.map((el) => {
    const b = { el, top: 0, height: 0, chars: [], lines: [], pops: [], last: -1 };
    if (!opts.reduced) {
      const st = el.querySelector('[data-split]');
      if (st) b.chars = new SplitText(st, { type: 'words,chars', charsClass: 'c', wordsClass: 'w' }).chars;
      el.querySelectorAll('[data-lines]').forEach((p) => {
        b.lines.push(...new SplitText(p, { type: 'lines', linesClass: 'ln' }).lines);
      });
      const num = el.querySelector('.blk__num');
      if (num) b.lines.push(num);
      b.pops = [...el.querySelectorAll('[data-pop]')];
      b.rule = el.querySelector('.blk__rule');
    }
    return b;
  });
}

const set = (el, o, y, blur) => {
  el.style.opacity = o.toFixed(3);
  el.style.transform = y ? `translate3d(0,${y.toFixed(3)}em,0)` : 'none';
  if (blur !== undefined) el.style.filter = blur > 0.004 ? `blur(${blur.toFixed(3)}em)` : 'none';
};

// enter/exit are 0..1. Characters run over staggered slices of each with an exponential ease.
export function updateBlock(b, enter, exit, opts) {
  if (opts.reduced) return;
  const key = Math.round(enter * 1000) * 1001 + Math.round(exit * 1000);
  if (key === b.last) return;
  b.last = key;
  const vis = enter > 0 && exit < 1;
  b.el.style.visibility = vis ? 'visible' : 'hidden';
  b.el.classList.toggle('is-on', enter > 0.5 && exit < 0.5);
  b.el.style.opacity = (fit(enter, 0, 0.3) * (1 - fit(exit, 0.35, 0.75))).toFixed(3);
  if (opts.reduced || !vis) return;
  const n = b.chars.length;
  b.chars.forEach((c, i) => {
    const k = n > 1 ? i / (n - 1) : 0;
    const p = fit(enter, k * 0.5, k * 0.5 + 0.5, 0, 1, ease.expoOut);
    const q = fit(exit, k * 0.5, k * 0.5 + 0.5, 0, 1, ease.expoOut);
    set(c, p * (1 - q), (1 - p) * 0.35 - q * 0.35, opts.blur ? (1 - p + q) * 0.25 : undefined);
  });
  const m = b.lines.length;
  b.lines.forEach((l, i) => {
    const k = m > 1 ? i / (m - 1) : 0;
    const p = fit(enter, 0.25 + k * 0.15, 0.75 + k * 0.15, 0, 1, ease.expoOut);
    const q = fit(exit, k * 0.15, 0.5 + k * 0.15, 0, 1, ease.expoOut);
    set(l, p * (1 - q), (1 - p) * 0.8 - q * 0.6);
  });
  b.pops.forEach((el, i) => {
    const p = fit(enter, 0.45 + i * 0.1, 0.8 + i * 0.1, 0, 1, ease.backOut);
    const q = fit(exit, 0, 0.5, 0, 1, ease.cubicOut);
    el.style.opacity = (Math.min(1, p) * (1 - q)).toFixed(3);
    el.style.transform = `translate3d(0,${((1 - p) * 10 - q * 8).toFixed(2)}px,0) scale(${(0.94 + 0.06 * p).toFixed(4)})`;
  });
  if (b.rule) b.rule.style.transform = `scaleX(${(fit(enter, 0, 0.6, 0, 1, ease.cubicOut) * (1 - fit(exit, 0, 0.5))).toFixed(4)})`;
}
