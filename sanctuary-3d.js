// Sanctuary 3D: preloader, then one render loop that maps the damped scroll to
// Blender-authored keyframes, the scene float, text, part tags and the engraving.
import * as THREE from 'three';
import { fit, ease, clamp, lerp, Scroll, measure } from './js3d/engine.js';
import { Keys } from './js3d/keys.js';
import { Stage } from './js3d/stage.js';
import { Engraving } from './js3d/engraving.js';
import { setupBlocks, updateBlock } from './js3d/text.js';
import { Sound } from './js3d/sound.js';
import { Sheet } from './js3d/sheet.js';
import { Months, Postcard, monthAt, monthHold, MONTHS, THEMES, TINTS } from './js3d/postcard.js';
import { Intro, loader, CONTACT } from './js3d/intro.js';
import { SplitText } from 'gsap/SplitText.js';

const $ = (s, r = document) => r.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = matchMedia('(max-width: 760px), (pointer: coarse) and (max-width: 1024px)').matches;
const opts = { reduced, phone, blur: !phone && !reduced };
const KEY_POSES = [-50, 70, 262, 740, 935, [1015, 1084, 1154, 1276], 1480, [1550, 1600, 1620, 1680], 1790, 1890, 2000]; // still pose per section for reduced motion (a list: split the section)
// 0 = lit to match the owner's photo, 1 = the studio (the engraving macro setting is no longer used)
const SCENE_FOR = (f) => (f < 14 ? 0 : f < 70 ? fit(f, 14, 70, 0, 1, ease.cubicInOut) : 1);
// the end: the studio gives way to the owner's hero table again, the opening's handover run backwards
const END0 = 1400, END1 = 1460;
// the frame the camera, light and photo use: the handover backwards to the table (END0-END1), then held there;
// for 'made for your team' the handover runs forwards to a three-quarter studio view (key 150), then back for 'begin'
const hfOf = (f) => (f < END0 ? f : f < 1820 ? lerp(100, 0, fit(f, END0, END1, 0, 1, ease.sineInOut))
  : f < 1920 ? lerp(0, 150, fit(f, 1820, 1862, 0, 1, ease.sineInOut)) : lerp(150, 0, fit(f, 1920, 1962, 0, 1, ease.sineInOut)));
// the postcard section (1500-1720) drives the postcard's own timeline (1560-1900)
// piecewise, so the send-or-keep moment holds for about a screen
const PMAP = [[1500, 1560], [1600, 1726], [1640, 1744], [1720, 1900]];
const pmap = (x, a, b) => { for (let i = 1; i < PMAP.length; i++) if (x <= PMAP[i][a] || i === PMAP.length - 1) return lerp(PMAP[i - 1][b], PMAP[i][b], clamp((x - PMAP[i - 1][a]) / (PMAP[i][a] - PMAP[i - 1][a]))); };
const fpOf = (f) => pmap(f, 0, 1), fOfP = (fp) => pmap(fp, 1, 0);
// the sweep per chapter: warm stone (the parts), soft sage (one sheet, two sides), warm clay (the journal)
const SWEEP = [[0, '#e9e1d5', '#d8d1c6'], [520, '#e9e1d5', '#d8d1c6'], [760, '#e3e4d9', '#cfd3c6'], [960, '#e3e4d9', '#cfd3c6'], [1010, '#ecdccd', '#d9c8b9'], [1400, '#ecdccd', '#d9c8b9']];
const _s1 = new THREE.Color(), _s2 = new THREE.Color(), _s3 = new THREE.Color(), _s4 = new THREE.Color();
const sweepAt = (f) => { for (let i = 1; i < SWEEP.length; i++) if (f <= SWEEP[i][0]) { const [a, b1, t1] = SWEEP[i - 1], [b, b2, t2] = SWEEP[i], t = fit(f, a, b, 0, 1, ease.sineInOut); return [_s1.set(b1).lerp(_s2.set(b2), t).getHex(), _s3.set(t1).lerp(_s4.set(t2), t).getHex()]; } const l = SWEEP[SWEEP.length - 1]; return [_s1.set(l[1]).getHex(), _s3.set(l[2]).getHex()]; };
const MOVES = [158, 166, 176, 340, 352, 385, 412, 494, 506];
// chapters 4-5 sit on the desk in afternoon light (a second weight over the scene float)
const AFT_FOR = (f) => (f < 1259 ? fit(f, 744, 800, 0, 1, ease.sineInOut) * fit(f, 1196, 1258, 1, 0, ease.sineInOut) : 0);
// chapters 6-7: golden hour moving to dusk over the months, dusk on the wall, back to the studio at 1900
const DUSK_FOR = (f) => 0.18 * fit(f, 1722, 1745, 0, 1, ease.sineInOut) * fit(f, 1806, 1820, 1, 0, ease.sineInOut);   // the year closes at dusk
// a month's move (p 0..1, board-local metres): up off the ledge, out, up over the board's top edge,
// back behind it and down: a quick card move that tucks it away (clear of stack, ledge, peg, board)
const tuck = (p) => ({
  y: fit(p, 0, 0.2, 0, 0.02) + fit(p, 0.2, 0.6, 0, 0.35, ease.sineInOut) - fit(p, 0.8, 1, 0, 0.17, ease.sineInOut),
  z: fit(p, 0, 0.2, 0, 0.04) + fit(p, 0.2, 0.5, 0, 0.02) - fit(p, 0.6, 0.8, 0, 0.072, ease.sineInOut),
  tilt: -0.22 * Math.sin(Math.PI * fit(p, 0.25, 0.85)),
  flex: 0.7 * Math.sin(Math.PI * p),
});
// chapter 5 close-ups: phones frame each journal block to the screen width instead of pulling back
// [frame, pull-back, sideways nudge of the block (m)]: the ritual is framed tighter, its box centred
const JOURNAL = [[965, 0, 0], [1000, 1.22, 0], [1032, 1.22, 0], [1068, 1.62, 0], [1100, 1.62, 0], [1138, 1.55, 0.0036], [1170, 1.44, 0.0155], [1196, 1.5, 0], [1296, 1.5, 0], [1324, 0, 0]];
// chapter 7 on phones: the strip, the card in the hand and the wall each framed to the width
const POST = [[1570, 0, 0], [1592, 2.0, 0], [1646, 2.0, 0], [1698, 1.9, 0], [1742, 1.9, 0], [1778, 1.3, 0], [1858, 1.3, 0], [1890, 0, 0]];
const tableK = (TB) => (f) => { for (let i = 1; i < TB.length; i++) if (f <= TB[i][0]) { const [a, ka, da] = TB[i - 1], [b, kb, db] = TB[i], t = fit(f, a, b, 0, 1, ease.sineInOut); return [lerp(ka || kb, kb || ka, t), lerp(da, db, t)]; } return [1, 0]; };
const postK = tableK(POST);
const journalK = (f) => { for (let i = 1; i < JOURNAL.length; i++) if (f <= JOURNAL[i][0]) { const [a, ka, da] = JOURNAL[i - 1], [b, kb, db] = JOURNAL[i], t = fit(f, a, b, 0, 1, ease.sineInOut); return [lerp(ka || kb, kb || ka, t), lerp(da, db, t)]; } return [1, 0]; };
const SHEET_OUT = new THREE.Vector3(0, 0.022, 0.15);   // keys.py S_OUT in glTF axes: up the board, out toward the viewer
const TURN_RANGE = [796, 930];                          // where the sheet can be turned by hand (lifted clear, peg open)
const TURN_TO = [798, 930];                             // scroll positions that show the front / the back

// part tags: anchor in the part's local space, which side the tag sits, frames shown
const TAGS = [
  { part: 'Board', at: [0.108, 0.16, 0.003], side: 1, dy: -10, f: [206, 330], fp: [206, 237], t: 'birch board', s: '10 × 15 in · 4 mm' },
  { part: 'LedgePlate_Table', at: [-0.11, 0.0, 0.02], side: -1, dy: 34, f: [220, 330], fp: [237, 268], t: 'ledge plate', s: 'slots in: ledge in front, foot behind', img: 'ledge-joint' },
  { part: 'Peg', at: [0.012, 0.0, 0.007], side: 1, dy: -30, f: [234, 330], fp: [268, 299], t: 'peg', s: 'holds the month, or a note', img: 'peg-note' },
  { part: 'SheetTop', at: [-0.08, 0.15, 0.001], side: -1, dy: -40, f: [248, 330], fp: [299, 330], t: 'sheets', s: 'a month to a sheet' },
  { part: 'LedgePlate_Wall', at: [-0.1, 0.0, 0.016], side: -1, dy: 30, f: [418, 488], fp: [418, 456], t: 'wall plate', s: 'swaps in when it hangs' },
  { part: 'HangPlate', at: [0.0, 0.0, -0.003], side: 1, dy: -34, f: [456, 494], fp: [456, 494], t: 'brass plate', s: 'hangs it flat on the wall' },   // its photo showed the engraved mark: no longer featured
  // chapter 5, on the journal side (the sheet is turned, so these sit on its back face); atp/dyp: phones, label below the block
  // (wide screens only: on phones the block fills the width and the copy below names it)
  // chapter 5 leaders: from the copy panel (lead = its index among the chapter's blocks) to the block on the page
  { part: 'SheetTop', at: [0.1074, 0.1728, -0.0004], lead: 0, f: [994, 1040] },
  { part: 'SheetTop', at: [0.0154, 0.2, -0.0004], lead: 1, f: [1062, 1108] },
  { part: 'SheetTop', at: [0.1074, 0.0522, -0.0004], lead: 2, f: [1132, 1178] },
];

// ---------- loader (Figma 50:702) ----------
const nameEl = document.querySelector('.ld__name');
await Promise.race([document.fonts.load('400 52px Regie'), new Promise((r) => setTimeout(r, 1500))]);
if (!reduced) new SplitText(nameEl, { type: 'chars', charsClass: 'c' }).chars.forEach((c, i) => { c.style.transitionDelay = `${0.35 + i * 0.028}s`; });
const ld = loader(opts);
const prog = { glb: 0, rest: 0, compile: 0 };
const setWant = () => ld.set(prog.glb * 0.72 + prog.rest * 0.13 + prog.compile * 0.15);
const t0 = performance.now();

const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function boot() {
  const canvas = $('#gl');
  const stage = new Stage(canvas, opts);
  stage.composer();
  const restP = Promise.all([
    fetch('assets/3d/sanctuary-keys.json').then((r) => r.json()),
    loadImg('assets/3d/engraving-elmuse.png'),
    loadImg('assets/3d/engraving-elmuse-height.png'),
    document.fonts.load('400 40px Regie'), document.fonts.load('500 40px Figtree'), document.fonts.load('400 12px "IBM Plex Mono"'),
  ]).then((v) => { prog.rest = 1; setWant(); return v; });
  await stage.load('assets/3d/sanctuary.glb', (p) => { prog.glb = p; setWant(); });
  prog.glb = 1; setWant();
  const [keyData, engCol, engH] = await restP;
  const keys = new Keys(keyData);
  const sound = new Sound();
  const eng = new Engraving(stage.engravingMesh, { col: engCol, height: engH }, { reduced });   // the default elmuse burn only (the name chapter was removed)

  // ---------- DOM ----------
  const sections = [...document.querySelectorAll('.ch')].map((el) => ({ el, frames: el.dataset.frames.split(',').map(Number), tail: el.hasAttribute('data-tail'), top: 0, height: 0 }));
  document.querySelectorAll('[data-at-phone]').forEach((el) => el.style.setProperty('--at-phone', el.dataset.atPhone));
  await document.fonts.ready;
  const intro = new Intro(opts);
  await document.fonts.load('400 44px Regie');
  const heroTitle = $('.hero__title');
  if (!reduced) new SplitText(heroTitle, { type: 'words,chars', charsClass: 'c', wordsClass: 'w' }).chars.forEach((c, i) => { c.style.transitionDelay = `${0.15 + i * 0.022}s`; });
  const wa = $('#wa');
  if (CONTACT.whatsapp) { wa.href = `https://wa.me/${CONTACT.whatsapp}`; wa.removeAttribute('aria-disabled'); wa.setAttribute('aria-label', 'Message us on WhatsApp'); wa.target = '_blank'; wa.rel = 'noopener'; }
  $('.nav__menu').addEventListener('click', (e) => e.preventDefault()); // menu behaviour comes later
  const blocks = setupBlocks([...document.querySelectorAll('.blk')], opts);
  blocks.forEach((b) => { if (b.el.dataset.pin) b.pinVh = +b.el.dataset.pin; });
  const tagsEl = $('#tags'), svg = $('#tag-lines');
  const NS = 'http://www.w3.org/2000/svg';
  const tags = TAGS.map((t) => {
    const el = document.createElement('div');
    el.className = 'tag';
    if (t.lead !== undefined) el.style.display = 'none';
    el.innerHTML = (t.img ? `<img class="tag__img" src="assets/3d/img/${t.img}.webp" alt="" loading="lazy" decoding="async">` : '') + `<b>${t.t}</b>${t.s}`;
    tagsEl.appendChild(el);
    const line = document.createElementNS(NS, 'line');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '2.5');
    svg.append(line, dot);
    return { ...t, el, line, dot, v: new THREE.Vector3(...t.at), w: 0, h: 0 };
  });
  const btn = $('#sound'), btnLabel = $('#sound-label');
  btn.addEventListener('click', () => {
    const on = sound.toggle();
    btn.setAttribute('aria-pressed', String(on));
    btnLabel.textContent = on ? 'sound on' : 'sound off';
  });

  const tiles = [...document.querySelectorAll('.tile')].map((el) => ({ el, img: $('img', el), top: 0, height: 0, last: -1 }));
  const turnBtn = $('#turn'), chip = $('#chip');
  const leadBlocks = blocks.filter((b) => b.el.closest('#ch5')).map((b) => ({ b, rx: 0, ry: 0 }));
  // chapters 06-07 are parked (calendar-refs/wip): their code stays inert unless their sections are on the page
  const hasPost = !!$('#ch7');
  const postcard = hasPost ? new Postcard(stage, opts) : null;   // rebuilds the strip's faces first, so the sheet deformer sees them
  const months = hasPost ? new Months(stage) : null;
  const pc = hasPost ? null : new Postcard(stage, opts);   // the postcard on the owner's table (its strip faces rebuilt before the sheet deformer reads them)
  const sheet = new Sheet(stage, opts);
  const BOARD_Q = stage.parts.Board.quaternion.clone();
  const SHEET_Q0 = stage.parts.SheetTop.quaternion.clone(), QX = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0);

  // ---------- layout ----------
  let vw = 0, vh = 0, maxScroll = 1, focused = false;
  const mainEl = $('main'), spacer = $('#spacer');
  // keyboard focus inside the fixed content: bring it into view by scrolling the document
  mainEl.addEventListener('focusin', (e) => {
    const r = e.target.getBoundingClientRect();
    if (r.top < 60 || r.bottom > vh - 20) window.scrollTo(0, window.scrollY + r.top - vh * 0.55);
  });
  function layout(force) {
    const w = window.innerWidth;
    if (!force && w === vw) return;              // height-only changes (URL bar, keyboard) keep the layout
    vw = w; vh = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${vh / 100}px`);
    measure(sections, blocks, mainEl);
    blocks.forEach((b) => { if (b.pinVh) b.pinLen = b.pinVh * vh; });
    spacer.style.height = `${mainEl.offsetHeight}px`;   // the document keeps the content's height: native scrollbar, wheel, keys
    maxScroll = Math.max(1, mainEl.offsetHeight - vh);
    tags.forEach((t) => { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; });
    tiles.forEach((t) => { const sec = sections.find((x) => x.el === t.el.parentElement); t.top = sec.top + t.el.offsetTop; t.height = t.el.offsetHeight; });
    chipW = chip.offsetWidth; chipH = chip.offsetHeight;
    leadBlocks.forEach((pb) => { const st = pb.b.el.querySelector('.blk__statement'); pb.rx = pb.b.el.offsetLeft + pb.b.el.offsetWidth + 10; pb.ry = pb.b.top + st.offsetTop + st.offsetHeight / 2; });
    const ch = canvas.clientHeight;
    stage.resize(w, ch);
    canvasH = ch;
    intro.layout(w, vh, phone, sections[0].height);
    if (keysReady) computeMatch();
  }
  let canvasH = 1, keysReady = false, chipH = 0, chipW = 0, chipText = '';
  window.addEventListener('resize', () => {
    if (focused) return;
    if (canvas.clientHeight !== canvasH && window.innerWidth === vw) { stage.resize(vw, canvas.clientHeight); canvasH = canvas.clientHeight; }
    layout(false);
  });
  layout(true);
  document.fonts.ready.then(() => layout(true));

  // ---------- state ----------
  const scroll = new Scroll();
  scroll.damped = !reduced;
  const M4 = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  const P = new THREE.Vector3(), T = new THREE.Vector3(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), V2 = new THREE.Vector3();
  // hand turn: ov.t is the turn the hand (or the button) asks for, ov.w how much it overrides the keys
  const ov = { w: 0, t: 0, settle: null, rate: 9, since: 0, release: false };
  const drag = { on: false, id: -1, x: 0, base: 0, vx: 0, lx: 0, lt: 0 };
  let realF = 0, shownTurn = 0, keyTurn = 0, lastTurn = 0, monthShown = 0, lastMonth = 0, tearKey = 0, lastTear = 0;
  const th = { w: 0, t: 0, settle: null, on: false, y: 0, base: 0 };   // the tear by hand
  const _c1 = new THREE.Color(), _c2 = new THREE.Color();
  let clock = 0, last = performance.now(), introStart = -1, lastFrame = 0, running = true;

  function frameFor(s) {
    if (reduced) {
      const mid = s + vh * 0.5;
      let k = 0;
      sections.forEach((sec, i) => { if (mid >= sec.top) k = i; });
      const p = KEY_POSES[k];
      if (p === 'months') return monthHold(Math.round(clamp((mid - sections[k].top) / (sections[k].height - vh * 0.5)) * 11));
      if (!Array.isArray(p)) return p;
      // a list of poses: one per copy block in the section, the last block whose top has reached mid-screen
      const own = blocks.filter((b) => sections[k].el.contains(b.el));
      return p[clamp(own.filter((b) => b.top - vh * 0.3 <= mid).length - 1, 0, p.length - 1)];
    }
    let f = 0;
    sections.forEach((sec, i) => {
      if (s < sec.top) return;
      const span = i === sections.length - 1 || sec.tail ? sec.height - vh : sec.height;
      f = lerp(sec.frames[0], sec.frames[1], clamp((s - sec.top) / span));
    });
    return f;
  }

  // the chapter-1 key image is projected from the canonical wide-screen first key, so it is
  // fixed in the world whatever the screen; phones just see it from further back
  // Handover: at f = 0 the live board must sit exactly over the calendar in the photo. Project the
  // board's panel at the f = 0 key (no shift, no zoom), then solve the zoom and screen shift that put it
  // on the photo's board rectangle (which intro.js knows for this screen).
  const match = { zoom: 1, x: 0, y: 0, err: 0 };
  let panel = null;
  function computeMatch() {
    if (!panel) stage.model.traverse((o) => { if (!panel && o.isMesh && [].concat(o.material).some((m) => m.name === 'Birch_Board')) panel = o; });
    apply(0, true);
    stage.viewShift.x = stage.viewShift.y = 0;
    stage.setCamera(P, Q, keys.num('fov', 0), 1);
    stage.model.updateMatrixWorld(true);
    stage.camera.updateMatrixWorld(true);
    const bb = panel.geometry.boundingBox || (panel.geometry.computeBoundingBox(), panel.geometry.boundingBox);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) {
      V.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(panel.matrixWorld).project(stage.camera);
      const x = (V.x + 1) / 2 * vw, y = (1 - V.y) / 2 * canvasH;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const t = intro.finalBoardRect();
    match.zoom = t.h / (y1 - y0);
    const bcx = vw / 2 + ((x0 + x1) / 2 - vw / 2) * match.zoom, bcy = canvasH / 2 + ((y0 + y1) / 2 - canvasH / 2) * match.zoom;
    match.x = (t.x + t.w / 2 - bcx) / vw;
    match.y = -(t.y + t.h / 2 - bcy) / canvasH;
    match.err = Math.abs((x1 - x0) * match.zoom - t.w);   // width left over (perspective/aspect), px
    window.__s3d && (window.__s3d.match = { ...match, target: t, board: { w: (x1 - x0) * match.zoom, h: (y1 - y0) * match.zoom } });
  }

  function apply(f, raw = false) {
    // camera from the keys, then pulled back on narrow screens so the subject still fits
    keys.vec('cam', f, P); keys.quat('cam', f, Q); keys.vec('target', f, T);
    const focus = keys.num('focus', f);
    const aspect = vw / canvasH;
    let jx = 0;
    const jw = fit(f, 965, 1000) * fit(f, 1300, 1324, 1, 0);   // journal close-ups, through the QR
    const hw = raw ? 1 : fit(f, 26, 88, 1, 0, ease.cubicInOut);   // 1 = still matched to the photo
    if (aspect < 1) {
      let k = lerp(1.45, 2.5, fit(focus, 0.9, 0.4)) * lerp(1, 0.82, fit(aspect, 0.45, 0.95));
      if (f > 965 && f < 1324) {
        const [jk, jd] = journalK(f);
        k = lerp(k, jk, jw);
        jx = jw * jd / (2 * P.distanceTo(T) * lerp(k, 1, hw) * Math.tan(keys.num("fov", f) * Math.PI / 360) * aspect);
      }
      if (f > 1570 && f < 1890) k = lerp(k, postK(f)[0], fit(f, 1570, 1592) * fit(f, 1876, 1890, 1, 0));
      P.sub(T).multiplyScalar(lerp(k, 1, hw)).add(T);
    }
    // subject shift: right of the text column on wide screens, up on phones
    const macro = fit(focus, 0.9, 0.4);
    stage.viewShift.x = lerp(aspect >= 1 ? lerp(0.15, 0.17, macro) * fit(aspect, 1.0, 1.4) : jx, match.x, hw);
    stage.viewShift.y = lerp(aspect < 1 ? 0.16 + 0.06 * jw : 0, match.y, hw);
    // aim from the (smooth) position at the (smooth) target, as Blender's Track To does;
    // slerping the baked rotation separately drifted off-aim between samples (a sawtooth shake)
    Q.setFromRotationMatrix(M4.lookAt(P, T, UP));
    if (raw) { stage.model.visible = true; return; }
    stage.setCamera(P, Q, keys.num('fov', f), lerp(1, match.zoom, hw));
    stage.model.visible = f > -1;
    // ch3 focus pull: the live board starts soft as the real macro photo dissolves, then sharpens
    stage.setFocus(aspect < 1 ? focus * 2 : focus, fit(f, 960, 1000) * fit(f, 1300, 1324, 1, 0));
    // in the studio the key travels with the camera (front-left of it), so wood and paper keep showing their surface
    const az = Math.atan2(P.x - T.x, P.z - T.z) - 0.95;
    const kw = stage.studioW || 0;
    stage.key.position.set(lerp(-1.7, Math.sin(az) * 2.0, kw), 1.25, lerp(1.0, Math.cos(az) * 2.0, kw));
    const fz = az + 0.95 + 1.1;   // the fill: to the camera's right, low
    stage.sfill.position.set(Math.sin(fz) * 2.4, 0.75, Math.cos(fz) * 2.4);
    // parts
    for (const n in stage.parts) {
      const o = stage.parts[n];
      if (n === 'Board') { keys.vec(n, f, o.position); keys.quat(n, f, o.quaternion); }
      else o.position.copy(stage.rest[n]).add(keys.vec(n, f, V));
      o.visible = keys.flag(n + '.vis', f);
    }
    // the top sheet: turned by the keys, or by hand (ov), lifted clear of the board while it turns
    const kt = keys.num('SheetTop.turn', f);
    let t = kt;
    if (ov.w > 0) {
      const off = keys.vec('SheetTop', f, V);
      // by hand: up off the ledge first, then out from the stack (out always beats the edge's swing back)
      const L = clamp(1.7 * Math.abs(Math.sin(Math.PI * ov.t)));
      V2.set(0, Math.max(off.y, SHEET_OUT.y * clamp(L * 4)), Math.max(off.z, SHEET_OUT.z * L));
      t = lerp(kt, ov.t, ov.w);
      stage.parts.SheetTop.position.copy(stage.rest.SheetTop).add(off.lerp(V2, ov.w));
    }
    // chapter 6: the months turn over (the stack already shows the next one before the top sheet leaves)
    const mo = monthAt(f), inMonths = f >= 1260 && f < 1560;
    let flex = 0;
    if (inMonths && mo.k > 0 && mo.p < 1) {
      const tp = tuck(mo.p);
      stage.parts.SheetTop.position.copy(stage.rest.SheetTop).add(V2.set(0, tp.y, tp.z));
      flex = tp.flex;
    }
    sheet.set(t, flex);
    if (inMonths && mo.k > 0 && mo.p < 1) stage.parts.SheetTop.quaternion.premultiply(QX.identity()).multiply(QX.setFromAxisAngle(AX, tuck(mo.p).tilt));
    shownTurn = t; keyTurn = kt;
    const shownM = inMonths ? (mo.p >= 1 ? mo.k : Math.max(0, mo.k - 1)) : f >= 1560 && f < 1900 ? 11 : 0;
    const lands = inMonths ? (mo.p >= 0.55 ? mo.k : Math.max(0, mo.k - 1)) : shownM;
    if (!hasPost) { /* parked */ } else if (f >= 1260 && f < 1900) {
      const topM = inMonths && mo.p < 1 && mo.k > 0 ? mo.k - 1 : shownM;
      months.set(topM, Math.min(25, 2 * topM + 3), f >= 1560 ? shownM : -1);   // the stack shows the month after the top sheet
      months.prefetch(lands);
    } else months.set(0, 3, -1);
    if (hasPost) {
    monthShown = lands;
    // the postcard: tear (keys, or by hand), card in the hand, wall of twelve
    const kTear = fit(f, 1598, 1640);
    tearKey = kTear;
    postcard.update(f, th.w > 0 ? lerp(kTear, th.t, th.w) : kTear, shownM, clock);
    if (f > 1700) postcard.loadCards();
    }
    // contact blob only while the foot is on the floor
    stage.blob.material.opacity = (stage.blobLevel ?? 0.22) * fit(stage.parts.Board.position.y, 0.01, 0.002) * (1 - fit(stage.parts.Board.quaternion.x, -0.12, -0.02));
    stage.setScene(SCENE_FOR(f), AFT_FOR(f), DUSK_FOR(realF));   // dusk follows the real frame (the camera may be on a mapped one)
    const [sb, st] = sweepAt(f > END0 ? END0 : f);
    stage.setSweep(sb, st, stage.studioW || 0);
    stage.setGobo(0.95 * (stage.studioW || 0), reduced ? 0 : clock, reduced ? 0 : f * 0.0012);   // reduced motion: the same light, still
    // the studio environment turns with the camera, as the key does; the baked contact shadow shows at rest
    stage.scene.environmentRotation.y = Math.atan2(P.x - T.x, P.z - T.z) - stage.envAz0;
    // board pose (upright, lifted, swapped) switches the bake off; the parts pulling apart blend rest -> apart
    let dev = Math.abs(stage.parts.Board.position.y - stage.rest.Board.y) + 2 * Math.abs(stage.parts.Board.quaternion.angleTo(BOARD_Q));
    if (!stage.parts.LedgePlate_Table.visible) dev += 1;
    dev += Math.abs(keys.vec('LedgePlate_Table', f, V).x);          // the plate sliding out sideways
    const apart = clamp(keys.vec('SheetTop', f, V).length() / 0.15) * fit(f, 140, 150) * fit(f, 340, 360, 1, 0);
    const sheetOff = f > 700 ? stage.parts.SheetTop.position.distanceTo(stage.rest.SheetTop) : 0;   // ch4: the turning sheet casts its own
    stage.aoMat.uniforms.apart.value = apart;
    stage.aoMat.uniforms.amt.value = (stage.model.visible ? 1 : 0) * Math.max(stage.studioW || 0, 1 - clamp(stage.sceneF)) * fit(dev, 0.03, 0.004)   // never over the owner's hero itself * (1 - 0.5 * fit(sheetOff, 0.01, 0.1));   // the table too
    // the backdrop takes a soft colour from the month's artwork
    if (f > 1262 && f < 1900) {
      const a = TINTS[Math.max(0, mo.k - 1)], b = TINTS[Math.min(11, mo.k)], tt = inMonths ? ease.sineInOut(mo.p) : 1;
      const c1 = _c1.set(a[0]).lerp(_c2.set(b[0]), tt).getHex(), c2 = _c1.set(a[1]).lerp(_c2.set(b[1]), tt).getHex();
      stage.setTint(c1, c2, 0.3 * fit(f, 1262, 1300) * fit(f, 1560, 1600, 1, 0.55) * fit(f, 1878, 1900, 1, 0));
    }
  }

  function updateTags(f) {
    const cam = stage.camera, w = vw, h = canvasH;
    const cx = w * (0.5 + stage.viewShift.x);
    for (const t of tags) {
      const tf = phone && t.fp ? t.fp : t.f;   // phones: one label at a time, so they never cover the board
      let a = reduced ? (f >= tf[0] && f <= tf[1] ? 1 : 0)
        : fit(f, tf[0], tf[0] + 8) * fit(f, tf[1] - 6, tf[1], 1, 0);
      const o = stage.parts[t.part];
      if (!o.visible || (t.lead !== undefined && phone)) a = 0;
      if (a <= 0) { if (t.on !== false) { t.el.style.opacity = 0; t.line.style.opacity = 0; t.dot.style.opacity = 0; t.on = false; } continue; }
      t.on = true;
      V.copy(t.v); o.localToWorld(V); V.project(cam);
      const x = (V.x + 1) / 2 * w, y = (1 - V.y) / 2 * h;
      if (t.lead !== undefined) {
        // a thin leader from the panel's right edge (at its statement) to the block
        const pb = leadBlocks[t.lead], dpr = window.devicePixelRatio || 1;
        const ex = pb.rx, ey = pb.ry - Math.round(scroll.s * dpr) / dpr;
        const lineP = reduced ? 1 : ease.cubicOut(clamp(a * 1.4));
        t.line.setAttribute('x1', ex); t.line.setAttribute('y1', ey);
        t.line.setAttribute('x2', ex + (x - ex) * lineP); t.line.setAttribute('y2', ey + (y - ey) * lineP);
        t.dot.setAttribute('cx', x); t.dot.setAttribute('cy', y);
        t.line.style.opacity = t.dot.style.opacity = Math.min(a, pb.b.el.style.opacity === '' ? 1 : +pb.b.el.style.opacity);
        continue;
      }
      const side = phone ? (x < cx ? -1 : 1) : t.side;
      const len = phone ? 26 : 70;
      const ex = x + side * len, ey = y + t.dy * (phone ? 0.7 : 1);
      const lineP = reduced ? 1 : ease.cubicOut(clamp(a * 1.4));
      t.line.setAttribute('x1', x); t.line.setAttribute('y1', y);
      t.line.setAttribute('x2', x + (ex - x) * lineP); t.line.setAttribute('y2', y + (ey - y) * lineP);
      t.line.style.opacity = a; t.dot.style.opacity = a;
      t.dot.setAttribute('cx', x); t.dot.setAttribute('cy', y);
      const pop = reduced ? 1 : ease.backOut(fit(a, 0.35, 1));
      let lx = side < 0 ? ex - t.w - 6 : ex + 6;
      lx = clamp(lx, 8, w - t.w - 34);
      const ly = clamp(ey - t.h / 2, 64, h - t.h - 10);
      t.el.style.opacity = Math.min(1, pop * a).toFixed(3);
      t.el.style.transform = `translate3d(${lx.toFixed(1)}px,${(ly + (1 - pop) * 8).toFixed(1)}px,0)`;
    }
  }

  function updateText(s, now) {
    const intro = reduced ? 1 : introStart < 0 ? 0 : clamp((now - introStart) / 1.5);
    const enterA = phone ? 1.0 : 0.98, enterB = phone ? 0.78 : 0.62;
    const exitA = phone ? 0.42 : 0.4, exitB = phone ? 0.26 : 0.08;
    const dpr = window.devicePixelRatio || 1;
    for (const b of blocks) {
      // a pinned block (chapter 6) holds still on screen for its pin length, moved by the same damped value
      let off = 0;
      if (b.pinLen) {
        const s0 = b.top - (phone ? vh * 0.5 : vh * 0.5 - b.height / 2);
        off = Math.round(clamp(s - s0, 0, b.pinLen) * dpr) / dpr;
        if (off !== b.pinOff) { b.el.style.transform = off ? `translate3d(0,${off}px,0)` : ''; b.pinOff = off; }
      }
      // phones read the block's top (text lives in the lower half), wide screens its centre
      const c = (b.top + off + (phone ? 0 : b.height / 2) - s) / vh;
      const enter = Math.min(intro, fit(c, enterA, enterB));
      const exit = b.el.hasAttribute('data-noexit') ? 0 : fit(c, exitA, exitB);   // the page's last panel stays
      updateBlock(b, enter, exit, opts);
    }
  }

  // framed photo tiles ride with the content; a scroll-scrubbed reveal like the macro plate
  function updateTiles(s) {
    if (reduced) return;
    for (const t of tiles) {
      const c = (t.top + t.height / 2 - s) / vh;
      const e = fit(c, 1.02, 0.6, 0, 1, ease.expoOut), x = fit(c, 0.3, -0.05);
      const key = Math.round(e * 1000) * 1001 + Math.round(x * 1000);
      if (key === t.last) continue;
      t.last = key;
      const on = e > 0 && x < 1;
      t.el.style.visibility = on ? 'visible' : 'hidden';
      if (!on) continue;
      t.el.style.clipPath = `inset(${((1 - e) * 100).toFixed(2)}% 0 0 0 round 6px)`;
      t.el.style.opacity = (1 - x).toFixed(3);
      t.img.style.transform = `scale(${(1.1 - 0.1 * e).toFixed(4)})`;
    }
  }

  // ---------- turning the sheet by hand ----------
  const ray = new THREE.Raycaster();
  const inTurn = (f) => f >= TURN_RANGE[0] && f <= TURN_RANGE[1];
  const scrollForFrame = (fr) => {
    for (const sec of sections) {
      const [a, b] = sec.frames;
      if (fr >= a && fr <= b) { const last = sec === sections[sections.length - 1] || sec.tail; return sec.top + (fr - a) / (b - a) * (last ? sec.height - vh : sec.height); }
    }
    return window.scrollY;
  };
  function settleTo(n, rate) {
    ov.settle = n; ov.rate = rate; ov.release = false; ov.since = clock;
    const parity = ((n % 2) + 2) % 2;
    // the page follows the hand: scroll to where the keys show the same side, at rest
    if (parity !== Math.round(clamp(keyTurn))) window.scrollTo(0, Math.round(scrollForFrame(TURN_TO[parity])));
  }
  const skip = (e) => e.target.closest && e.target.closest('a, button, input, label, .nav, .blk, .tile');
  window.addEventListener('pointerdown', (e) => {
    if (drag.on || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const f = frameFor(scroll.s);
    if (!inTurn(f) || skip(e) || !sheet.hit(e.clientX, e.clientY, vw, canvasH, ray)) return;
    e.preventDefault();
    drag.on = true; drag.id = e.pointerId; drag.x = drag.lx = e.clientX; drag.lt = performance.now(); drag.vx = 0;
    drag.base = shownTurn; ov.t = shownTurn; ov.w = 1; ov.settle = null;
    try { e.target.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    document.documentElement.classList.add('is-grabbing');
  });
  window.addEventListener('pointermove', (e) => {
    if (drag.on && e.pointerId === drag.id) {
      const now = performance.now();
      drag.vx = lerp(drag.vx, (e.clientX - drag.lx) / Math.max(1, now - drag.lt), 0.5);
      drag.lx = e.clientX; drag.lt = now;
      ov.t = drag.base + (e.clientX - drag.x) / (phone ? vw * 0.7 : Math.min(vw * 0.36, 520));
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const over = inTurn(frameFor(scroll.s)) && !skip(e) && sheet.hit(e.clientX, e.clientY, vw, canvasH, ray);
    document.documentElement.classList.toggle('is-grab', over);
  }, { passive: true });
  const end = (e) => {
    if (!drag.on || e.pointerId !== drag.id) return;
    drag.on = false;
    document.documentElement.classList.remove('is-grabbing');
    const fling = performance.now() - drag.lt > 120 ? 0 : clamp(drag.vx * 1000 / (phone ? vw * 0.7 : Math.min(vw * 0.36, 520)) * 0.12, -0.5, 0.5);
    settleTo(Math.round(ov.t + fling), 9);
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  document.querySelectorAll('.tab[data-go]').forEach((b) => b.addEventListener('click', () => window.scrollTo(0, Math.round(scrollForFrame(+b.dataset.go)))));
  turnBtn.addEventListener('click', () => { ov.t = shownTurn; ov.w = 1; settleTo(Math.round(shownTurn) + 1, 3.2); });

  function updateTurn(f, dt) {
    if (!drag.on && ov.settle !== null) {
      ov.t = reduced ? ov.settle : ov.t + (ov.settle - ov.t) * (1 - Math.exp(-ov.rate * dt));
      if (Math.abs(ov.settle - ov.t) < 0.002) { ov.t = ((ov.settle % 2) + 2) % 2; ov.settle = null; ov.release = true; }
    }
    // hand the sheet back to the keys once they agree (or the visitor scrolled on)
    if (ov.release && (Math.abs(keyTurn - ov.t) < 0.02 || clock - ov.since > 2.5 || !inTurn(f))) ov.w = Math.max(0, ov.w - dt * 4);
    if (ov.w === 0) ov.release = false;
    if (!inTurn(f) && !drag.on && ov.settle === null) ov.w = Math.max(0, ov.w - dt * 4);
    // paper sound as the sheet passes edge-on
    if (Math.floor(lastTurn + 0.5) !== Math.floor(shownTurn + 0.5) && Math.abs(shownTurn - lastTurn) < 0.5) sound.paper(Math.abs(shownTurn - lastTurn) * 30);
    lastTurn = shownTurn;
    // the side chip (story page): above the sheet, says which side is showing
    const a = fit(f, TURN_RANGE[0], TURN_RANGE[0] + 10) * fit(f, 948, 958, 1, 0);
    if (a <= 0.01) { if (chip.style.visibility !== 'hidden') { chip.style.visibility = 'hidden'; chip.style.opacity = 0; } return; }
    const txt = ((Math.round(shownTurn) % 2) + 2) % 2 ? 'Back · the journal' : 'Front · the month';
    if (txt !== chipText) { chip.textContent = chipText = txt; chipW = chip.offsetWidth; chipH = chip.offsetHeight; }
    V.set(0, 0.326 + 0.045, 0).add(stage.parts.SheetTop.position); stage.parts.Board.localToWorld(V); V.project(stage.camera);   // above the sheet, wherever it is
    const x = (V.x + 1) / 2 * vw, y = (1 - V.y) / 2 * canvasH;
    chip.style.visibility = 'visible';
    chip.style.opacity = a.toFixed(3);
    chip.style.transform = `translate3d(${clamp(x - chipW / 2, 12, vw - chipW - 12).toFixed(1)}px,${clamp(y - chipH, 62, canvasH - chipH - 90).toFixed(1)}px,0)`;
  }

  // ---------- chapter 6: the month controls (synced both ways with the scroll) ----------
  const themeEls = hasPost ? { count: $('#theme-count'), month: $('#theme-month'), title: $('#theme-title'), phrase: $('#theme-phrase'), range: $('#month-range') } : null;
  let shownCopy = -1;
  if (hasPost) setupPost();
  function setupPost() {
  const goMonth = (m) => window.scrollTo(0, Math.round(scrollForFrame(monthHold(clamp(m, 0, 11)))));
  themeEls.range.addEventListener('input', () => goMonth(+themeEls.range.value));
  $('#month-prev').addEventListener('click', () => goMonth(monthShown - 1));
  $('#month-next').addEventListener('click', () => goMonth(monthShown + 1));
  }
  function updateMonths(f) {
    if (!hasPost) return;
    if (monthShown !== lastMonth && Math.abs(f - lastFrame) < 40 && f > 1262 && f < 1560) sound.paper(0.5);
    lastMonth = monthShown;
    if (monthShown === shownCopy) return;
    shownCopy = monthShown;
    const m = monthShown, d = THEMES[m];
    themeEls.count.textContent = `${String(m + 1).padStart(2, '0')} / 12`;
    themeEls.month.textContent = MONTHS[m];
    themeEls.title.textContent = d[0];
    themeEls.phrase.textContent = `“${d[1]}”`;
    if (document.activeElement !== themeEls.range) themeEls.range.value = m;
    themeEls.range.setAttribute('aria-valuetext', `${MONTHS[m]}: ${d[0]}`);
  }

  // ---------- chapter 7: the postcard's controls; the tear by hand (drag the strip up) ----------
  const TEAR_RANGE = [1588, 1646];
  if (hasPost) setupTear();
  function setupTear() {
  document.querySelectorAll('#ch7 [data-go]').forEach((b) => b.addEventListener('click', () => window.scrollTo(0, Math.round(scrollForFrame(+b.dataset.go)))));
  const fateEl = $('#fate'), sendBtn = $('#send-btn'), keepBtn = $('#keep-btn');
  const choose = (fate) => {
    postcard.choose(fate, clock);
    sendBtn.setAttribute('aria-pressed', String(fate === 'sent')); keepBtn.setAttribute('aria-pressed', String(fate === 'kept'));
    fateEl.textContent = fate === 'sent' ? 'Stamped and on its way.' : 'Kept, and pinned for the wall.';
    if (fate === 'sent') sound.stamp(); else sound.move();
  };
  sendBtn.addEventListener('click', () => choose('sent'));
  keepBtn.addEventListener('click', () => choose('kept'));
  window.addEventListener('pointerdown', (e) => {
    if (th.on || !e.isPrimary || e.pointerType !== 'mouse' || e.button !== 0) return;   // on touch the drag up is the scroll itself
    const f = frameFor(scroll.s);
    if (f < TEAR_RANGE[0] || f > TEAR_RANGE[1] || skip(e) || !postcard.hitStrip(e.clientX, e.clientY, vw, canvasH, ray)) return;
    e.preventDefault();
    th.on = true; th.y = e.clientY; th.base = tearKey; th.t = tearKey; th.w = 1; th.settle = null;
    document.documentElement.classList.add('is-grabbing');
  });
  window.addEventListener('pointermove', (e) => { if (th.on) th.t = clamp(th.base + (th.y - e.clientY) / (vh * 0.3)); }, { passive: true });
  window.addEventListener('pointerup', () => {
    if (!th.on) return;
    th.on = false; document.documentElement.classList.remove('is-grabbing');
    if (th.t > 0.55) { th.settle = 1; window.scrollTo(0, Math.round(scrollForFrame(1642))); } else th.settle = 0;   // early: it springs back
  });
  }
  function updateTear(f, dt) {
    if (!hasPost) return;
    if (!th.on && th.settle !== null) {
      th.t = reduced ? th.settle : th.t + (th.settle - th.t) * (1 - Math.exp(-(th.settle ? 8 : 12) * dt));
      if (Math.abs(th.t - th.settle) < 0.003) { th.t = th.settle; th.settle = null; th.since = clock; }
    }
    if (!th.on && th.settle === null && th.w > 0 && (Math.abs(th.t - tearKey) < 0.02 || clock - (th.since || 0) > 1.5)) th.w = Math.max(0, th.w - dt * 5);
    const shown = th.w > 0 ? lerp(tearKey, th.t, th.w) : tearKey;
    if (shown - lastTear > 0.02 && Math.abs(f - lastFrame) < 40) { sound.tear(shown - lastTear); lastTear = shown; }
    if (shown < lastTear) lastTear = shown;
    if (!th.on && f >= TEAR_RANGE[0] && f <= TEAR_RANGE[1] && !th.w) {
      // cursor: the strip is grabbable while it can be torn
    }
  }

  // ---------- the QR: a phone rises, scans the code, shows what it opens (scroll-driven, reversible) ----------
  const phoneEl = $('#phone'), camEl = $('.phone__cam', phoneEl), pageEl = $('.phone__page', phoneEl);
  const vfs = [...phoneEl.querySelectorAll('.vf')], scanEl = $('.scanline', phoneEl), tickEl = $('.tick', phoneEl);
  let phoneKey = -1, lastScan = 0;
  function updatePhone(f) {
    const rise = fit(f, 1204, 1232, 0, 1, ease.cubicOut), drop = fit(f, 1298, 1318, 0, 1, ease.cubicInOut);
    const lock = fit(f, 1232, 1244, 0, 1, ease.cubicOut), scan = fit(f, 1240, 1254), done = fit(f, 1252, 1258, 0, 1, ease.backOut), page = fit(f, 1258, 1274, 0, 1, ease.cubicInOut);
    const k = Math.round(f * 4);
    if (k === phoneKey) return;
    phoneKey = k;
    const on = rise > 0 && drop < 1;
    phoneEl.style.visibility = on ? 'visible' : 'hidden';
    if (!on) return;
    phoneEl.style.transform = `translate3d(0,${((1 - rise + drop) * 105).toFixed(2)}%,0)`;
    vfs.forEach((v, i) => { v.style.transform = `rotate(${i === 0 ? 0 : i === 1 ? 90 : i === 3 ? 180 : 270}deg) scale(${(1.35 - 0.35 * lock).toFixed(3)})`; v.style.opacity = (0.4 + 0.6 * lock).toFixed(3); });
    scanEl.style.opacity = (scan > 0 && scan < 1 ? 1 : 0).toString();
    scanEl.style.transform = `translate3d(0,${(scan * 140).toFixed(1)}px,0)`;
    tickEl.style.opacity = done.toFixed(3); tickEl.style.transform = `scale(${(0.6 + 0.4 * Math.min(1.1, done)).toFixed(3)})`;
    pageEl.style.transform = `translate3d(0,${((1 - page) * 100).toFixed(2)}%,0)`;
    if (done > 0.5 && lastScan <= 0.5) sound.stamp();
    lastScan = done;
  }
  $('#scan-btn').addEventListener('click', () => window.scrollTo(0, Math.round(scrollForFrame(1276))));
  window.addEventListener('pointerdown', (e) => {   // a tap on the code (or the sheet) at the QR stop scans it
    const f = frameFor(scroll.s);
    if (f < 1190 || f > 1300 || skip(e) || !sheet.hit(e.clientX, e.clientY, vw, canvasH, ray)) return;
    window.scrollTo(0, Math.round(scrollForFrame(1276)));
  });

  // ---------- back on the table: one month at a time ----------
  // The calendar stands on the owner's hero table; next takes the top sheet up and over to the back while the
  // following month, waiting with the others as ghosted sheets queued at the left, slides onto the ledge.
  const cm = new Months(stage);
  { const g0 = cm.get.bind(cm); cm.get = (n) => (n === 1 && sheet.hiFrontTex ? sheet.hiFrontTex : g0(n)); }
  const ghostGeo = new THREE.PlaneGeometry(0.2383, 0.326); ghostGeo.translate(0, 0.163, 0);
  { const uv = ghostGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); }   // page textures are glTF-oriented (no flipY)
  // the queue: three small sheets standing on the table in the clear space left of the board, an even overlapping
  // row leaning like the board, opacity stepping down with distance; phones: a short row peeking in at the left edge
  const GSLOT = (phone ? [[-0.155, 0.004, 0.55], [-0.2, 0, 0.35], [-0.245, -0.004, 0.2]] : [[-0.178, 0.004, 0.55], [-0.236, 0, 0.35], [-0.294, -0.004, 0.2]])
    .map(([x, z, op]) => [x, 0, z, op, phone ? 0.36 : 0.4]);   // board-local x, y (the table), z, opacity, scale
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 16, 2, 64, 16, 60); gr.addColorStop(0, 'rgba(0,0,0,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.setTransform(1, 0, 0, 0.25, 0, 12); g.fillStyle = gr; g.fillRect(0, -64, 128, 128); return new THREE.CanvasTexture(c); })();
  const ghosts = [0, 1, 2, 3].map(() => {
    const m = new THREE.Mesh(ghostGeo, new THREE.MeshStandardMaterial({ transparent: true, opacity: 0, depthWrite: false, roughness: 1, metalness: 0 }));
    m.visible = false; m.renderOrder = 3; stage.parts.Board.add(m);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.04), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x2a1a0c, transparent: true, opacity: 0, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.visible = false; stage.scene.add(sh); m.userData.shadow = sh;
    return m;
  });
  const car = { m: 0, lo: 0, t: 0, dir: 0, shown: -1 };
  const carLive = (f) => f >= END1 - 12 && f < 1500;
  const step = (d) => {
    if (car.dir) return;
    if (d > 0 && car.m < 11) { car.lo = car.m; car.t = 0; car.dir = 1; sound.paper(0.7); }
    if (d < 0 && car.m > 0) { car.lo = car.m - 1; car.t = 1; car.dir = -1; sound.paper(0.7); }
  };
  $('#month-next').addEventListener('click', () => step(1));
  $('#month-prev').addEventListener('click', () => step(-1));
  window.addEventListener('keydown', (e) => { if (!carLive(frameFor(scroll.s)) || /input|textarea/i.test(e.target.tagName)) return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  let sw = null;
  window.addEventListener('pointerdown', (e) => { if (carLive(frameFor(scroll.s)) && !skip(e)) sw = { x: e.clientX, y: e.clientY }; }, { passive: true });
  window.addEventListener('pointerup', (e) => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1); });
  const monthEls = { count: $('#theme-count'), month: $('#theme-month'), title: $('#theme-title'), phrase: $('#theme-phrase'), live: $('#month-live'), prev: $('#month-prev'), next: $('#month-next') };
  const V3 = new THREE.Vector3(), carctl = $('#carctl');
  function updateCarousel(f, dt) {
    const live = carLive(f);
    if (car.dir) {
      car.t = clamp(car.t + car.dir * dt / (reduced ? 0.01 : 0.95));
      if ((car.dir > 0 && car.t >= 1) || (car.dir < 0 && car.t <= 0)) { car.m = car.dir > 0 ? car.lo + 1 : car.lo; car.dir = 0; car.t = 0; }
    }
    const animating = !!car.dir, lo = animating ? car.lo : car.m, t = animating ? car.t : 0;
    const show = live ? fit(f, END1 - 12, END1) : 0;
    // copy: the month that is landing
    const mm = animating ? (car.dir > 0 ? (t >= 0.97 ? lo + 1 : lo) : (t <= 0.03 ? lo : lo + 1)) : car.m;   // changes the moment the new sheet lands
    if (mm !== car.shown) {
      car.shown = mm; const d = THEMES[mm];
      monthEls.count.textContent = `${String(mm + 1).padStart(2, '0')} / 12`; monthEls.month.textContent = MONTHS[mm];
      monthEls.title.textContent = d[0]; monthEls.phrase.textContent = `“${d[1]}”`; monthEls.live.textContent = `${MONTHS[mm]}: ${d[0]}, ${d[1]}`;
      monthEls.prev.disabled = mm === 0; monthEls.next.disabled = mm === 11;
    }
    if (!live) { if (f < END0) { /* the journal chapters own the sheet */ } else if (f >= 1820 || f < 1440) cm.set(car.m, Math.min(25, 2 * car.m + 3), -1); ghosts.forEach((g) => { g.visible = false; g.userData.shadow.visible = false; }); return; }
    // the top sheet: month lo, tucking away over the board's top with the turn of t
    const p = animating ? fit(t, 0, 0.7) : 0;
    const topM = animating ? lo : car.m;
    cm.set(topM, Math.min(25, 2 * topM + 3), -1);   // the stack shows the month after the top sheet
    const o = stage.parts.SheetTop;
    if (p > 0 && p < 1) {
      const tp = tuck(p);
      o.position.copy(stage.rest.SheetTop).add(V3.set(0, tp.y, tp.z));
      sheet.set(0, tp.flex); o.quaternion.multiply(QX.setFromAxisAngle(AX, tp.tilt));
    }
    o.visible = !(p >= 1);
    // the queue: ghost 0 is the next month; it rises on a clean arc over the ledge plate and sets down on the ledge
    const sl = animating ? ease.cubicInOut(fit(t, 0.4, 1)) : 0;
    for (let i = 0; i < 4; i++) {
      const g = ghosts[i], month = lo + 1 + i, sh = g.userData.shadow;
      const tex = month <= 11 ? cm.get(2 * month + 1) : null;
      if (!tex) { g.visible = false; sh.visible = false; continue; }
      if (g.material.map !== tex) { g.material.map = tex; g.material.needsUpdate = true; }
      let x, y, z, op, sc;
      if (i === 0) {
        const A = GSLOT[0], R = stage.rest.SheetTop, arc = Math.sin(Math.PI * sl);
        x = lerp(A[0], 0, sl); y = lerp(A[1], R.y, sl) + 0.09 * arc; z = lerp(A[2], R.z + 0.0002, sl) + 0.035 * arc;
        op = lerp(A[3], 1, sl); sc = lerp(A[4], 1, sl);
      } else if (i === 3) { const A = GSLOT[2]; x = A[0]; y = A[1]; z = A[2]; op = A[3] * sl; sc = A[4]; }
      else { const A = GSLOT[i], B = GSLOT[i - 1]; x = lerp(A[0], B[0], sl); y = lerp(A[1], B[1], sl); z = lerp(A[2], B[2], sl); op = lerp(A[3], B[3], sl); sc = lerp(A[4], B[4], sl); }
      g.position.set(x, y, z); g.scale.setScalar(sc); g.material.opacity = op * show; g.visible = op * show > 0.01;
      // a soft contact shadow on the table under each waiting sheet (it lifts away with the sheet)
      V3.set(x, 0, z); stage.parts.Board.localToWorld(V3);
      sh.position.set(V3.x, 0.0006, V3.z + 0.01); sh.scale.set(sc / 0.4, 1, 1);
      sh.material.opacity = 0.32 * op * show * (1 - fit(y, 0.0, 0.05)); sh.visible = sh.material.opacity > 0.01;
    }
    if (animating && t > 0.995) ghosts[0].visible = false;
  }

  // ---------- the postcard on the table: tear, turn, send or keep, the wall of twelve ----------
  const pth = { w: 0, t: 0, settle: null, on: false, y: 0, base: 0, since: 0 };
  let tearKeyP = 0, lastTearP = 0;
  document.querySelectorAll('#post [data-gp]').forEach((b) => b.addEventListener('click', () => window.scrollTo(0, Math.round(scrollForFrame(fOfP(+b.dataset.gp))))));
  const fateEl = $('#fate'), sendBtn = $('#send-btn'), keepBtn = $('#keep-btn');
  const choose = (fate) => {
    pc.choose(fate, clock);
    sendBtn.setAttribute('aria-pressed', String(fate === 'sent')); keepBtn.setAttribute('aria-pressed', String(fate === 'kept'));
    fateEl.textContent = fate === 'sent' ? 'Stamped and on its way.' : 'Kept, and pinned for the wall.';
    if (fate === 'sent') sound.stamp(); else sound.move();
  };
  sendBtn.addEventListener('click', () => choose('sent'));
  keepBtn.addEventListener('click', () => choose('kept'));
  const PTEAR = [fOfP(1588), fOfP(1646)];
  window.addEventListener('pointerdown', (e) => {   // drag the strip up to tear it (mouse; on touch the drag up is the scroll itself)
    if (pth.on || !e.isPrimary || e.pointerType !== 'mouse' || e.button !== 0) return;
    const f = frameFor(scroll.s);
    if (f < PTEAR[0] || f > PTEAR[1] || skip(e) || !pc.hitStrip(e.clientX, e.clientY, vw, canvasH, ray)) return;
    e.preventDefault();
    Object.assign(pth, { on: true, y: e.clientY, base: tearKeyP, t: tearKeyP, w: 1, settle: null });
    document.documentElement.classList.add('is-grabbing');
  });
  window.addEventListener('pointermove', (e) => { if (pth.on) pth.t = clamp(pth.base + (pth.y - e.clientY) / (vh * 0.3)); }, { passive: true });
  window.addEventListener('pointerup', () => {
    if (!pth.on) return;
    pth.on = false; document.documentElement.classList.remove('is-grabbing');
    if (pth.t > 0.55) { pth.settle = 1; window.scrollTo(0, Math.round(scrollForFrame(fOfP(1642)))); } else pth.settle = 0;   // released early: it springs back
  });
  const yr = { q: new THREE.Quaternion(), p: new THREE.Vector3(), m: new THREE.Matrix4(), A: new THREE.Vector3(), qA: new THREE.Quaternion(), sc: new THREE.Vector3() };
  let engMode = '', backDirty = false;
  function updateLater(f, fa, dt) {
    const o = stage.parts.SheetTop;
    // the back of the top sheet is the journal everywhere before the table
    if (f < END0 && backDirty) {   // leaving the later chapters backwards: the journal back and January front again
      cm.back.concat(cm.bodyBack).forEach((m) => { m.map = sheet.hiResTex || cm.orig.back; });
      cm.top.forEach((m) => { m.map = sheet.hiFrontTex || cm.orig.top; }); cm.stack.map = cm.orig.stack; cm.cur = ''; backDirty = false;
    }
    if (f >= 1500 && f < 1820) backDirty = true;
    // postcard: its own month (the one the carousel was left on)
    const inPost = f >= 1500 && f < 1720;
    if (inPost) {
      const fp = fpOf(f);
      tearKeyP = fit(fp, 1598, 1640);
      if (!pth.on && pth.settle !== null) { pth.t = reduced ? pth.settle : pth.t + (pth.settle - pth.t) * (1 - Math.exp(-(pth.settle ? 8 : 12) * dt)); if (Math.abs(pth.t - pth.settle) < 0.003) { pth.t = pth.settle; pth.settle = null; pth.since = clock; } }
      if (!pth.on && pth.settle === null && pth.w > 0 && (Math.abs(pth.t - tearKeyP) < 0.02 || clock - pth.since > 1.5)) pth.w = Math.max(0, pth.w - dt * 5);
      const tear = pth.w > 0 ? lerp(tearKeyP, pth.t, pth.w) : tearKeyP;
      if (tear - lastTearP > 0.02) { sound.tear(tear - lastTearP); lastTearP = tear; } if (tear < lastTearP) lastTearP = tear;
      cm.setPages(2 * car.m + 1, Math.min(25, 2 * car.m + 3), 2 * car.m + 2, true);   // the strip's postcard back at full print size
      pc.update(fp, tear, car.m, clock);
      if (fp > 1700) pc.loadCards();
    } else pc.update(0, 0, car.m, clock);
    // the year closes: the last sheet comes up to the camera (twelve frames), then turns to its letter; dusk light
    const inYear = f >= 1720 && f < 1820;
    const up = fit(f, 1726, 1752, 0, 1, ease.sineInOut) * fit(f, 1804, 1818, 1, 0, ease.sineInOut), flip = fit(f, 1770, 1790, 0, 1, ease.cubicInOut);
    stage.setDuskPlate(inYear ? fit(f, 1722, 1745) * fit(f, 1806, 1820, 1, 0) : 0);
    if (inYear) {
      cm.setPages(25, 25, 26, true);
      if (up > 0) {
        o.parent.updateWorldMatrix(true, false);
        o.position.copy(stage.rest.SheetTop); o.quaternion.copy(SHEET_Q0); o.updateMatrixWorld(true);
        o.matrixWorld.decompose(yr.A, yr.qA, yr.sc);
        // held up in front of the camera, square to it, a little below the eye; turned by flip
        const cam = stage.camera, dir = yr.p.set(0, 0, -1).applyQuaternion(cam.quaternion);
        const target = cam.position.clone().addScaledVector(dir, 0.82).add(new THREE.Vector3(0, -0.17, 0));
        const qT = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(target, cam.position, new THREE.Vector3(0, 1, 0)));
        qT.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (1 + flip)));
        const P = yr.A.clone().lerp(target, up); P.y += Math.sin(Math.PI * up) * 0.04;
        const Q = yr.qA.clone().slerp(qT, up);
        yr.m.compose(P, Q, yr.sc);
        o.matrixAutoUpdate = false; o.matrix.copy(o.parent.matrixWorld).invert().multiply(yr.m); o.matrixWorldNeedsUpdate = true;
        sheet.set(0, 0.25 * Math.sin(Math.PI * flip));
      } else o.matrixAutoUpdate = true;
    } else o.matrixAutoUpdate = true;
    // made for your team: a neutral placeholder wordmark engraved, only here
    const want = f >= 1830 && f < 1915 ? 'your company' : '';
    if (want !== engMode) { eng.setText(want, -100); engMode = want; }
  }

  function tick(nowMs) {
    if (!running) return;
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    clock += dt;
    scroll.tick(dt);
    const s = scroll.s;
    // the DOM moves with the same damped value as the canvas, snapped to device pixels
    const dpr = window.devicePixelRatio || 1;
    mainEl.style.transform = `translate3d(0,${(-Math.round(s * dpr) / dpr).toFixed(2)}px,0)`;
    const f = frameFor(s);
    for (const m of MOVES) if ((lastFrame < m) !== (f < m) && Math.abs(f - lastFrame) < 40) sound.move();
    lastFrame = f;
    realF = f;
    const fa = hfOf(f);   // after END0 the camera, light and photo run the opening's handover backwards
    apply(fa);
    updateCarousel(f, dt);
    updateLater(f, fa, dt);
    updatePhone(f);
    updateTags(fa);
    updateText(s, clock);
    updateTiles(s);
    updateTurn(f, dt);
    updateMonths(f);
    updateTear(f, dt);
    if (f > 700) sheet.loadFront('assets/sanctuary/full/page-01.webp');   // the print files at full size (2740 px): month grid
    if (f > 760) sheet.loadBack('assets/sanctuary/full/page-02.webp');    // and the journal, ahead of the turn
    stage.setBoost(f > 770 && f < END0);   // printed text needs every pixel
    // the owner's frames 1-4 run over the first section (f -100..0); then the photo gives way
    const q = f >= END0 ? 3 : clamp((f + 100) / 100 * 3, 0, 3);
    intro.endMode = f >= END0;   // the photo's own board stays hidden: the live board stands on the table
    intro.update(reduced ? Math.round(q) : q, fa, dt, clock);
    V.set(0, 0.19, 0); stage.parts.Board.localToWorld(V); V.project(stage.camera);
    stage.setRevealCentre((V.x + 1) / 2 * vw, (1 - V.y) / 2 * canvasH);
    stage.setPlate(intro.photo, intro.cover, 1 - fit(fa, 8, 46, 0, 1, ease.sineInOut), intro.boardRect(), 0);   // the new background has no board baked in: nothing to melt
    eng.tick(clock);
    stage.render(clock);
    if (perf.push(dt) > 600) perf.shift();
    requestAnimationFrame(tick);
  }
  const perf = [];
  window.__s3d = { car: () => ({ m: car.m, dir: car.dir, panel: monthEls.month.textContent, count: monthEls.count.textContent, top: cm.cur }), stage, keys, perf, intro, match, sheet, frameFor: () => frameFor(scroll.s), s: () => scroll.s, scrollFor: (fr) => scrollForFrame(fr) };

  // ---------- warm up, then reveal ----------
  keysReady = true;
  computeMatch();
  apply(frameFor(window.scrollY));
  intro.update(0, frameFor(window.scrollY), 0, 0);
  stage.setPlate(intro.photo, intro.cover, 1);
  const hidden = [];
  stage.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  await stage.renderer.compileAsync(stage.scene, stage.camera);
  stage.render(0);
  hidden.forEach((o) => { o.visible = false; });
  apply(frameFor(window.scrollY));
  prog.compile = 1; setWant();
  stage.render(0);
  requestAnimationFrame(tick);
  ld.done();
  await ld.out;
  setTimeout(() => intro.el.classList.add('is-in'), reduced ? 0 : 700);
  introStart = clock;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; return; }
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); }
  });
}

boot().catch((e) => {
  console.error(e);
  document.querySelector('.ld__pct').textContent = 'could not load the 3D view';
});
