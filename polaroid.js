/* The Polaroid Calendar on an oak table seen from above: browse twelve stamp cards lying on the wood,
   slip one in behind a clear cover or into the MagSafe holder, pick the phone up a little.
   Time of day and volume come from the page's one shared bar (elmuse:time, elmuse:volume). */
(() => {
  const root = document.getElementById('polaroid');
  // a rectangle in this section's own pixels (the merged page scrolls it; standalone it sits at 0,0)
  const relRect = (n) => {
    const r = n.getBoundingClientRect(), s0 = root.getBoundingClientRect();
    return { left: r.left - s0.left, right: r.right - s0.left, top: r.top - s0.top, bottom: r.bottom - s0.top, width: r.width, height: r.height };
  };
  if (!root) return;

  const CARDS = [
    ['01-delhi', 'January', 'Delhi', 'India Gate'],
    ['02-agra', 'February', 'Agra', 'Taj Mahal'],
    ['03-jaipur', 'March', 'Jaipur', 'Hawa Mahal'],
    ['04-amritsar', 'April', 'Amritsar', 'Harmandir Sahib'],
    ['05-hyderabad', 'May', 'Hyderabad', 'Charminar'],
    ['06-mumbai', 'June', 'Mumbai', 'Gateway of India'],
    ['07-kochi', 'July', 'Kochi', 'Chinese Fishing Nets'],
    ['08-madurai', 'August', 'Madurai', 'Meenakshi Temple'],
    ['09-mysuru', 'September', 'Mysuru', 'Mysore Palace'],
    ['10-kolkata', 'October', 'Kolkata', 'Howrah Bridge'],
    ['11-varanasi', 'November', 'Varanasi', 'Dashashwamedh Ghat'],
    ['12-goa', 'December', 'Goa', 'Basilica of Bom Jesus'],
  ].map(([file, month, city, place]) => ({ src: `assets/polaroid/${file}.png`, month, city, place }));

  const $ = (id) => document.getElementById(id);
  const canvas = $('pol-canvas');
  const fan = $('pol-fan');
  const phone = $('pol-phone');
  const phoneShadow = $('pol-shadow');
  const slot = $('pol-slot');
  const holder = $('pol-holder');
  const lips = $('pol-lips');
  const copy = $('pol-copy');
  const controls = $('pol-controls');
  const slipBtn = $('pol-slip');
  const prevBtn = $('pol-prev');
  const nextBtn = $('pol-next');
  const live = $('pol-live');
  const matrix = $('pol-relight-m');
  const bgs = [...root.querySelectorAll('.pol__bg')];
  const modeBtns = [...root.querySelectorAll('.pol__mode [role="radio"]')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dur = (ms) => (reduce.matches ? 1 : ms);
  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = (d) => (d * Math.PI) / 180;

  let active = 1;     // the card brought forward on the table
  let inPhone = 0;    // the card behind the cover (January to start), or null
  let mode = 'cover';
  let inCardEl = null;

  /* ---------- sound: soft, synthesised, through the one shared volume ---------- */
  let vol = 0;
  let ac = null;
  let master = null;
  let noiseBuf = null;
  const audio = () => {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = vol * vol;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  const audible = () => vol > 0 && audio();
  const noise = (t, length, filterType, f0, f1, q, peak) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = filterType;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + length);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + length * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + length + 0.02);
  };
  const playSlide = (out = false) => {
    if (!audible()) return;
    const t = ac.currentTime + 0.01;
    // paper sliding on plastic: a soft band of noise that sweeps
    noise(t, 0.34, 'bandpass', out ? 900 : 2200, out ? 2000 : 1000, 0.9, 0.05);
    noise(t + 0.02, 0.26, 'lowpass', 700, 400, 0.5, 0.02);
  };
  const playPaper = () => {
    if (!audible()) return;
    // a card nudged across the wood: short, dry, low
    noise(ac.currentTime + 0.01, 0.12, 'bandpass', 1500, 900, 0.8, 0.025);
  };
  const playSnap = () => {
    if (!audible()) return;
    const t = ac.currentTime + 0.01;
    noise(t, 0.03, 'highpass', 3500, 2500, 0.7, 0.10);          // the click
    const o = ac.createOscillator();                            // the magnet's soft thump
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.16);
  };
  function setVolume(v) {
    vol = clamp(+v || 0, 0, 1);
    if (vol > 0) audio();
    if (master) master.gain.setTargetAtTime(vol * vol, ac.currentTime, 0.08);
  }

  /* ---------- the deck ---------- */
  const JITTER = [0.4, -0.7, 0.2, 0.9, -0.3, 0.6, -0.8, 0.1, 0.5, -0.5, 0.3, -0.2]; // degrees: loose, not machined
  const items = CARDS.map((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pol__card';
    const img = document.createElement('img');
    img.src = c.src;
    img.alt = '';
    img.width = 454;
    img.height = 642;
    img.draggable = false;
    img.decoding = 'async';
    img.loading = 'lazy';
    const lit = document.createElement('span');
    lit.className = 'pol__lit';
    lit.setAttribute('aria-hidden', 'true');
    b.append(img, lit);
    fan.append(b);
    return b;
  });

  const label = (i) => `${CARDS[i].month}, ${CARDS[i].city}, ${CARDS[i].place}`;
  const where = () => (mode === 'cover' ? 'behind the clear cover' : 'in the MagSafe holder');

  /* ---------- placement on the table, in image pixels ---------- */
  const IMG_W = 1344, IMG_H = 752;
  const MM_TRUE = 2.2;     // px per mm: the saucer (~318 px), cup (~210 px) and brass pen (~273 px) agree on 2.0 to 2.6
  const CARD_MAX = 220;    // css px: the card files are 454 px wide, so never wider than this on a 2x screen
  let view = { s: 1, ox: 0, oy: 0, narrow: false, mm: MM_TRUE };
  let place = { phone: { x: 840, y: 360, r: -7 }, deck: { x: 440, y: 520, a: 70, b: 22, vertical: false } };
  let poses = [];          // per card: centre x, y, rotation
  let phoneLift = 0;
  const useZoom = !!(window.CSS && CSS.supports && CSS.supports('zoom', '2'));

  function setObj(el, cx, cy, w, h, r) {
    el.style.setProperty('--pol-x', `${(cx - w / 2).toFixed(2)}px`);
    el.style.setProperty('--pol-y', `${(cy - h / 2).toFixed(2)}px`);
    el.style.setProperty('--pol-r', `${r.toFixed(2)}deg`);
  }

  function layout() {
    root.classList.add('is-instant');
    const W = root.clientWidth, H = root.clientHeight;
    const narrow = W < 860;
    const s = Math.max(W / IMG_W, H / (IMG_H - 2)); // 2 px spare: the frames are nudged up to 1 px
    // wide screens keep a little of the cup on the left and most of the pen on the right; phones look at the open wood
    const ox = clamp(W / 2 - (narrow ? 650 : 690) * s, W - IMG_W * s, 0);
    const oy = clamp(H / 2 - 376 * s, H - IMG_H * s, 0);
    if (useZoom) {
      canvas.style.zoom = s.toFixed(4);
      canvas.style.left = `${(ox / s).toFixed(2)}px`;
      canvas.style.top = `${(oy / s).toFixed(2)}px`;
    } else {
      canvas.style.transform = `translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    }
    const winL = -ox / s, winR = (W - ox) / s, winT = -oy / s;
    const toImgY = (y) => (y - oy) / s;

    // words and controls first, in screen pixels; the objects fill the table between them
    if (!narrow) {
      root.style.setProperty('--copy-x', `${Math.max(32, ox + 176 * s).toFixed(1)}px`);
      root.style.setProperty('--copy-w', `${Math.min(440, W * 0.34).toFixed(1)}px`);
      root.style.setProperty('--copy-y', `${Math.max(36, Math.min(80, H * 0.075)).toFixed(1)}px`);
      root.style.setProperty('--ctl-b', `${Math.max(18, H * 0.028).toFixed(1)}px`);
    } else {
      root.style.setProperty('--copy-x', '16px');
      root.style.setProperty('--copy-w', `${W - 32}px`);
      root.style.setProperty('--copy-y', document.getElementById('sanc-bar') ? '66px' : '18px'); // the merged page's fixed bar sits above
      root.style.setProperty('--ctl-b', 'calc(14px + env(safe-area-inset-bottom, 0px))');
    }
    const cr = relRect(copy);
    const kr = relRect(controls);
    const copyB = toImgY(cr.bottom), copyL = (cr.left - ox) / s, copyR = (cr.right - ox) / s;
    const ctlT = toImgY(kr.top);
    const g = 16 / s; // a 16 css px gutter, in table pixels

    let mm = Math.min(MM_TRUE, CARD_MAX / (60 * s));
    if (!narrow) {
      const pr = -7;
      const pw = 71 * Math.cos(rad(-pr)) + 147 * Math.sin(rad(-pr)), ph = 147 * Math.cos(rad(-pr)) + 71 * Math.sin(rad(-pr));
      mm = Math.min(mm, (ctlT - winT - 2 * g) / ph, (ctlT - copyB - 2.2 * g) / 92);
      const cx = Math.min(winL + 0.64 * (winR - winL), 950, winR - g - (pw * mm) / 2);
      const cy = clamp((winT + ctlT) / 2, winT + g + (ph * mm) / 2, ctlT - g - (ph * mm) / 2);
      const cw = 60 * mm, ch = 85 * mm;
      const left = Math.max(copyL - 10, winL + g), right = cx - (pw * mm) / 2 - 1.4 * g;
      const half = (right - left) / 2;
      const a = cw * 0.55;
      const b = clamp((half - cw / 2 - a - 8 - 6 * 1.6 * (cw / 132)) / 4, 6, cw * 0.17); // room for the pile past the fifth
      const dy = clamp((copyB + ctlT) / 2 + 6, copyB + g + ch / 2 + 6, ctlT - g - ch / 2 - 10);
      place = { phone: { x: cx, y: cy, r: pr }, deck: { x: left + half, y: dy, a, b, vertical: false } };
    } else {
      const pr = -3;
      const pw = 71 * Math.cos(rad(-pr)) + 147 * Math.sin(rad(-pr)), ph = 147 * Math.cos(rad(-pr)) + 71 * Math.sin(rad(-pr));
      const cwb = 60 * Math.cos(rad(3)) + 85 * Math.sin(rad(3));
      const top = copyB + 0.9 * g, bottom = ctlT - 0.9 * g;
      mm = Math.min(mm, (winR - winL - 2.4 * g) / (pw + cwb), (bottom - top) / (ph + 2));
      const cy = (top + bottom) / 2;
      const cx = winR - g - (pw * mm) / 2;
      const ch = 85 * mm;
      const half = (bottom - top) / 2;
      const a = ch * 0.27;
      const b = clamp((half - ch / 2 - a - 10 - 6 * 1.6 * (60 * mm / 132)) / 4, 3, ch * 0.12); // room for the pile and the turn
      place = { phone: { x: cx, y: cy, r: pr }, deck: { x: winL + g + (cwb * mm) / 2, y: cy, a, b, vertical: true } };
    }
    view = { s, ox, oy, narrow, mm };
    root.style.setProperty('--mm', `${mm.toFixed(4)}px`);
    placePhone();
    layoutFan();
    setTime(tod);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-instant')));
  }

  function placePhone() {
    const p = place.phone, mm = view.mm;
    const turn = reduce.matches ? 0 : phoneLift * 3;
    setObj(phone, p.x, p.y, 71 * mm, 147 * mm, p.r + turn);
    phone.style.setProperty('--pol-lift', String(phoneLift));
  }

  function layoutFan() {
    const d0 = place.deck, mm = view.mm;
    const cw = 60 * mm, ch = 85 * mm, k = cw / 132;
    poses = items.map((el, i) => {
      const d = i - active, ad = Math.abs(d), sg = Math.sign(d);
      const v = Math.min(ad, 5);
      // past the fifth, the rest wait in a neat pile under the end card
      const off = ad === 0 ? 0 : d0.a + (v - 1) * d0.b + Math.max(0, ad - 5) * 1.6 * k;
      let x, y, r;
      if (!d0.vertical) {
        x = d0.x + sg * off;
        y = d0.y + (ad === 0 ? -9 * k : (3 + v * v * 0.9) * k);
        r = sg * v * 2.2 + JITTER[i];
      } else {
        x = d0.x + sg * v * 1.4 * k + (ad === 0 ? 0 : JITTER[i] * 2 * k);
        y = d0.y + sg * off;
        r = sg * v * 1.3 + JITTER[i] * 0.8;
      }
      if (!el.classList.contains('is-dragging')) setObj(el, x, y, cw, ch, r);
      el.style.zIndex = String(40 - ad);
      el.classList.toggle('is-active', ad === 0);
      el.classList.toggle('is-empty', i === inPhone);
      el.tabIndex = ad === 0 ? 0 : -1;
      el.setAttribute('aria-current', ad === 0 ? 'true' : 'false');
      el.setAttribute('aria-label', i === inPhone ? `${label(i)}, ${where()}` : label(i));
      return { x, y, r };
    });
    prevBtn.disabled = active === 0;
    nextBtn.disabled = active === CARDS.length - 1;
    slipBtn.textContent = active === inPhone ? 'Take it out' : 'Slip it in';
    phone.setAttribute('aria-label',
      `A phone lying face down on the table ${mode === 'cover' ? 'in a clear cover' : 'with the MagSafe holder'}` +
      (inPhone === null ? ', no card in it' : `, holding the ${CARDS[inPhone].month} card`));
    shadows();
  }

  function setActive(i, focus = false) {
    const n = Math.max(0, Math.min(CARDS.length - 1, i));
    if (n !== active) playPaper();
    active = n;
    layoutFan();
    if (focus) items[active].focus({ preventScroll: true });
  }

  /* ---------- in and out of the phone ---------- */
  const below = () => view.mm * 100; // from its place to just past the bottom edge

  function slideOut(el) {
    const anim = el.animate(
      [{ transform: 'none' }, { transform: `translateY(${below()}px)` }],
      { duration: dur(380), easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    anim.onfinish = () => el.remove();
  }

  function slipIn(i, { dropped = false } = {}) {
    const old = inCardEl;
    if (old) { slideOut(old); playSlide(true); }
    const el = document.createElement('img');
    el.className = 'pol__incard';
    el.src = CARDS[i].src;
    el.alt = '';
    slot.append(el);
    inCardEl = el;
    inPhone = i;
    if (!dropped) {
      el.animate(
        [{ transform: `translateY(${below()}px)` }, { transform: 'none' }],
        { duration: dur(560), delay: old ? dur(200) : 0, easing: EASE, fill: 'backwards' });
      setTimeout(() => playSlide(false), old ? dur(200) : 0);
    } else {
      playSlide(false);
    }
    layoutFan();
    live.textContent = `${CARDS[i].month} is ${where()}.`;
  }

  function takeOut() {
    if (!inCardEl) return;
    const m = CARDS[inPhone].month;
    slideOut(inCardEl);
    playSlide(true);
    inCardEl = null;
    inPhone = null;
    layoutFan();
    live.textContent = `${m} is back on the table with the others.`;
  }

  const toggleSlip = () => (active === inPhone ? takeOut() : slipIn(active));
  slipBtn.addEventListener('click', toggleSlip);
  prevBtn.addEventListener('click', () => setActive(active - 1));
  nextBtn.addEventListener('click', () => setActive(active + 1));

  fan.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowUp') setActive(active - 1, true);
    else if (k === 'ArrowRight' || k === 'ArrowDown') setActive(active + 1, true);
    else if (k === 'Home') setActive(0, true);
    else if (k === 'End') setActive(CARDS.length - 1, true);
    else return;
    e.preventDefault();
  });

  /* ---------- pointer: tap, swipe, drag a card onto the phone ---------- */
  let drag = null;
  let suppressClick = false;

  const overPhone = (x, y) => {
    const r = phone.getBoundingClientRect();
    return x > r.left && x < r.right && y > r.top && y < r.bottom;
  };

  fan.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = e.target.closest('.pol__card');
    const i = el ? items.indexOf(el) : -1;
    const canLift = i === active && i !== inPhone;
    drag = { x: e.clientX, y: e.clientY, el, i, canLift, lifting: false, id: e.pointerId };
    if (canLift) el.setPointerCapture(e.pointerId);
  });

  fan.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (drag.canLift && !drag.lifting && Math.hypot(dx, dy) > 6) {
      drag.lifting = true;
      drag.el.classList.add('is-dragging');
      drag.el.style.zIndex = '100';
      drag.el.style.setProperty('--pol-lift', '1');
    }
    if (drag.lifting) {
      const p = poses[drag.i], mm = view.mm;
      // screen pixels back to table pixels
      setObj(drag.el, p.x + dx / view.s, p.y + dy / view.s, 60 * mm, 85 * mm, p.r * 0.5);
      phone.classList.toggle('is-target', overPhone(e.clientX, e.clientY));
      shadows();
    }
  });

  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    phone.classList.remove('is-target');
    if (d.lifting) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      if (e.type === 'pointerup' && overPhone(e.clientX, e.clientY)) {
        dropIn(d.el);
        return;
      }
      d.el.classList.remove('is-dragging');
      d.el.style.setProperty('--pol-lift', '0');
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) setActive(active + (dx < 0 ? 1 : -1));
      else layoutFan();
      return;
    }
    // a swipe across the cards browses them
    if (e.type === 'pointerup' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      setActive(active + (dx < 0 ? 1 : -1));
    }
  };
  fan.addEventListener('pointerup', endDrag);
  fan.addEventListener('pointercancel', endDrag);

  function dropIn(el) {
    // carry the card the rest of the way to its exact place on the phone, then hand it over
    const p = place.phone, mm = view.mm, pr = p.r + (reduce.matches ? 0 : phoneLift * 3);
    const off = 19 * mm; // the card's centre sits 19 mm below the phone's centre
    const tx = p.x - off * Math.sin(rad(pr)), ty = p.y + off * Math.cos(rad(pr));
    el.classList.remove('is-dragging');
    el.style.setProperty('--pol-lift', '0');
    setObj(el, tx, ty, 60 * mm, 85 * mm, pr);
    shadows();
    setTimeout(() => {
      root.classList.add('is-instant');
      slipIn(active, { dropped: true });
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-instant')));
    }, dur(300));
  }

  fan.addEventListener('click', (e) => {
    const el = e.target.closest('.pol__card');
    if (!el || suppressClick) return;
    const i = items.indexOf(el);
    if (i === active) toggleSlip();
    else setActive(i);
  });

  /* ---------- pick the phone up: a small lift and turn, then it settles back on the wood ---------- */
  function setLift(v) {
    if (v === phoneLift) return;
    phoneLift = v;
    placePhone();
    shadows();
  }
  phone.addEventListener('pointerdown', (e) => { if (e.button === 0) setLift(1); });
  window.addEventListener('pointerup', () => setLift(0));
  window.addEventListener('pointercancel', () => setLift(0));
  phone.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') setLift(0); });

  /* ---------- cover or MagSafe ---------- */
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    root.dataset.mode = m;
    modeBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
    if (m === 'magsafe') {
      // the holder comes down onto the back and the magnet takes it
      const k = [
        { transform: `translateY(${-view.mm * 6}px) scale(1.06)`, opacity: 0 },
        { transform: 'translateY(0) scale(1.012)', opacity: 1, offset: 0.72 },
        { transform: 'translateY(0) scale(.996)', offset: 0.86 },
        { transform: 'none', opacity: 1 },
      ];
      const opts = { duration: dur(480), easing: 'cubic-bezier(.55,0,.8,.2)' };
      holder.animate(k, opts);
      lips.animate(k, opts);
      if (inCardEl) inCardEl.animate(k.map(({ transform }) => ({ transform })), opts);
      setTimeout(playSnap, dur(345));
    } else {
      playSlide(false);
    }
    layoutFan();
    live.textContent = m === 'magsafe'
      ? 'The MagSafe holder, an optional add-on, is on the phone.'
      : 'The clear cover is on the phone.';
    requestAnimationFrame(updateInk);
  }
  modeBtns.forEach((b) => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
    b.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const other = modeBtns.find((x) => x !== b);
      setMode(other.dataset.mode);
      other.focus();
    });
  });
  const syncModeTab = () => modeBtns.forEach((b) => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; });
  new MutationObserver(syncModeTab).observe(root.querySelector('.pol__mode'), { attributes: true, subtree: true, attributeFilter: ['aria-checked'] });
  syncModeTab();

  /* ---------- light: the table's own pixels relight everything lying on it ----------
     For each frame, a small light map = that frame divided by the morning frame (the same wood, so the
     wood's own colour cancels and only the light is left), blurred past the grain, its colour toned down
     a little (generated wood goes more orange than paper would), times a base taken from the white saucer
     in the morning. It is laid over each object with multiply and turned back so it stays fixed to the
     table: the afternoon leaf shadows and the lamp's warm fall-off cross the cards and the phone exactly
     where they cross the wood. An SVG colour matrix adds the gain that multiply alone cannot. */
  const MW = 336, MH = 188;               // light maps at a quarter of the frame
  const GAIN = 1.3;                       // maps are stored as light / GAIN; the matrix multiplies it back
  const M0 = [0.93, 0.94, 0.97];          // white paper in the morning: a little above the curved saucer (~183,194,207 of ~240), which is partly in its own shade
  // before the maps are ready: one flat colour per frame, from the saucer in each
  const FLAT = [[0.93, 0.94, 0.97], [1.08, 0.88, 0.62], [0.52, 0.43, 0.50], [0.58, 0.45, 0.32]];
  // shadows: direction away from the light (or 'lamp'), length and softness per mm of height, strength, colour
  const SHADE = [
    { dir: [0.6, 0.8], len: 0.5, soft: 0.9, op: 0.34, col: [50, 52, 64], gx: 30, gloss: 1.0 },
    { dir: [0.76, 0.65], len: 1.0, soft: 0.35, op: 0.6, col: [70, 30, 4], gx: 26, gloss: 1.1 },
    { dir: [-0.86, 0.5], len: 0.45, soft: 1.2, op: 0.4, col: [28, 18, 36], gx: 66, gloss: 0.55 },
    { dir: 'lamp', len: 0.85, soft: 0.6, op: 0.62, col: [8, 5, 2], gx: 74, gloss: 0.7 },
  ];
  const LAMP = [1190, 270]; // centre of the night frame's warm pool, in table pixels

  let maps = [], tod = 0.333, weightsNow = [0, 1, 0, 0], kNow = -1, mapsReady = false;

  const loaded = (img) => (img.complete && img.naturalWidth ? Promise.resolve() : new Promise((res) => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  }));

  function readSmall(img, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    return x.getImageData(0, 0, w, h).data;
  }
  function toFloat(d) {
    const out = new Float32Array(MW * MH * 3);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { out[j] = d[i]; out[j + 1] = d[i + 1]; out[j + 2] = d[i + 2]; }
    return out;
  }
  function boxBlur(a, r) { // separable box blur, clamped at the edges, three channels
    const tmp = new Float32Array(a.length), n = 2 * r + 1;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += a[(y * MW + clamp(x + k, 0, MW - 1)) * 3 + c];
      tmp[(y * MW + x) * 3 + c] = s / n;
    }
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) for (let c = 0; c < 3; c++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[(clamp(y + k, 0, MH - 1) * MW + x) * 3 + c];
      a[(y * MW + x) * 3 + c] = s / n;
    }
    return a;
  }
  const Y = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

  async function buildMaps() {
    await Promise.all(bgs.map(loaded));
    let frames;
    try {
      frames = bgs.map((img) => { const f = toFloat(readSmall(img, MW, MH)); boxBlur(f, 1); return boxBlur(f, 1); });
    } catch (_) { return; } // opened from disk: the canvas is tainted, keep the flat light
    const m = frames[0];
    let meanL = 0;
    for (let j = 0; j < m.length; j += 3) meanL += Y(m[j], m[j + 1], m[j + 2]);
    meanL /= MW * MH;
    const urls = await Promise.all(frames.map((f, k) => {
      const c = document.createElement('canvas');
      c.width = MW; c.height = MH;
      const x = c.getContext('2d');
      const im = x.createImageData(MW, MH);
      for (let p = 0, j = 0; p < im.data.length; p += 4, j += 3) {
        const Lm = Y(m[j], m[j + 1], m[j + 2]) + 1;
        const base = Math.pow(Lm / meanL, 0.85);
        let g = [1, 1, 1];
        if (k > 0) {
          const r = [(f[j] + 2) / (m[j] + 2), (f[j + 1] + 2) / (m[j + 1] + 2), (f[j + 2] + 2) / (m[j + 2] + 2)];
          const Lr = (Y(f[j], f[j + 1], f[j + 2]) + 1) / Lm;
          g = r.map((v) => Math.pow(Lr, 0.85) * Math.pow(v / Lr, 0.55));
        }
        for (let c3 = 0; c3 < 3; c3++) im.data[p + c3] = clamp(Math.round((M0[c3] * base * g[c3] / GAIN) * 255), 8, 255);
        im.data[p + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      return new Promise((res) => c.toBlob((b) => res(b ? URL.createObjectURL(b) : c.toDataURL()), 'image/png'));
    }));
    maps = urls;
    mapsReady = true;
    kNow = -1;
    setTime(tod);
  }

  function mix(a, b, f) { return typeof a === 'number' ? a + (b - a) * f : a.map((v, i) => mix(v, b[i], f)); }

  function shadeAt(cx, cy) {
    // blend the four frames' shadow settings; the lamp's direction depends on where the object lies
    const out = { dir: [0, 0], len: 0, soft: 0, op: 0, col: [0, 0, 0] };
    weightsNow.forEach((w, i) => {
      if (!w) return;
      const S = SHADE[i];
      let dir = S.dir, len = S.len;
      if (dir === 'lamp') {
        const vx = cx - LAMP[0], vy = cy - LAMP[1], d = Math.hypot(vx, vy) || 1;
        dir = [vx / d, vy / d];
        len = S.len * clamp(d / 450, 0.4, 1.3);
      }
      out.dir = out.dir.map((v, j) => v + w * dir[j] * len);
      out.soft += w * S.soft; out.op += w * S.op;
      out.col = out.col.map((v, j) => v + w * S.col[j]);
    });
    return out;
  }
  let gainNow = [1, 1, 1];
  // shadows sit inside the relit objects, so the colour matrix would lift them: divide it back out
  const rgba = (c, a) => `rgba(${c.map((v, i) => Math.round(v / gainNow[i])).join(',')},${clamp(a, 0, 1).toFixed(3)})`;
  function local(v, r) { // a table-space vector into the object's turned frame
    const c = Math.cos(rad(-r)), s = Math.sin(rad(-r));
    return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
  }
  function shadows() {
    const mm = view.mm;
    items.forEach((el, i) => {
      const p = poses[i];
      if (!p) return;
      const lifted = el.classList.contains('is-dragging');
      const S = shadeAt(p.x, p.y);
      const h = lifted ? 22 : 0.8; // mm above the wood (a card never lies quite flat)
      const o = local(S.dir, p.r).map((v) => v * h * mm);
      const c = local(S.dir, p.r).map((v) => v * 0.35 * mm);
      el.style.setProperty('--sh',
        `${c[0].toFixed(2)}px ${c[1].toFixed(2)}px ${(0.5 * mm).toFixed(2)}px ${rgba(S.col, S.op * (lifted ? 0.5 : 1.15))}, ` +
        `${o[0].toFixed(2)}px ${o[1].toFixed(2)}px ${((1.6 + h * S.soft) * mm).toFixed(2)}px ${rgba(S.col, S.op * (lifted ? 0.7 : 0.55))}`);
    });
    const pp = place.phone, r = pp.r + (reduce.matches ? 0 : phoneLift * 3);
    const S = shadeAt(pp.x, pp.y);
    const h = 9 + phoneLift * 14;
    const o = local(S.dir, r).map((v) => v * h * mm);
    phoneShadow.style.setProperty('--sh',
      `0 0 ${(1.4 * mm).toFixed(2)}px ${rgba(S.col, S.op * (1.25 - phoneLift * 0.6))}, ` +
      `${o[0].toFixed(2)}px ${o[1].toFixed(2)}px ${((2 + h * S.soft) * mm).toFixed(2)}px ${rgba(S.col, S.op * (0.85 - phoneLift * 0.15))}`);
    const ho = local(S.dir, r).map((v) => v * 2.4 * mm);
    root.style.setProperty('--pol-hold-sh', `${ho[0].toFixed(2)}px ${ho[1].toFixed(2)}px ${(2.2 * mm).toFixed(2)}px ${rgba([0, 0, 0], 0.18 + S.op * 0.4)}`);
  }

  function setTime(t) {
    tod = clamp(+t || 0, 0, 1);
    const seg = tod * 3, k = Math.min(2, Math.floor(seg)), f = seg - k;
    weightsNow = [0, 0, 0, 0]; weightsNow[k] = 1 - f; weightsNow[k + 1] = f;
    bgs.forEach((img, i) => { img.style.opacity = i === k ? 1 : i === k + 1 ? f.toFixed(3) : 0; });
    let gain;
    if (mapsReady) {
      if (k !== kNow) {
        root.style.setProperty('--pol-map-a', `url("${maps[k]}")`);
        root.style.setProperty('--pol-map-b', `url("${maps[k + 1]}")`);
        kNow = k;
      }
      root.style.setProperty('--pol-map-f', f.toFixed(3));
      gain = [GAIN, GAIN, GAIN];
    } else {
      gain = mix(FLAT[k], FLAT[k + 1], f);
    }
    gainNow = gain;
    matrix.setAttribute('values', [gain[0], 0, 0, 0, 0, 0, gain[1], 0, 0, 0, 0, 0, gain[2], 0, 0, 0, 0, 0, 1, 0]
      .map((v) => (+v).toFixed(4)).join(' '));
    root.style.setProperty('--pol-gx', `${mix(SHADE[k].gx, SHADE[k + 1].gx, f).toFixed(1)}%`);
    root.style.setProperty('--pol-gloss', mix(SHADE[k].gloss, SHADE[k + 1].gloss, f).toFixed(3));
    shadows();
    updateInk();
  }

  function clockToT(h) {
    const P = [[0, 1], [5, 1], [6.5, 0], [10, 0.1], [13.5, 0.333], [16.5, 0.45], [18.5, 0.667], [20, 0.85], [21.5, 1], [24, 1]];
    for (let i = 1; i < P.length; i++) if (h <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (h - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
    return 1;
  }

  /* ---------- readable at every hour: measure the pixels behind each group ---------- */
  const SW = 168, SH = 94;
  const samples = [];
  bgs.forEach((img, i) => loaded(img).then(() => {
    try { samples[i] = readSmall(img, SW, SH); } catch (_) { samples[i] = null; }
    updateInk();
  }));
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  // luminance of the blended frames behind a screen rectangle: darkest and brightest tenth
  function behind(r) {
    const { s, ox, oy } = view;
    const x0 = clamp(Math.floor(((r.left - ox) / s) / 8), 0, SW - 1), x1 = clamp(Math.ceil(((r.right - ox) / s) / 8), x0 + 1, SW);
    const y0 = clamp(Math.floor(((r.top - oy) / s) / 8), 0, SH - 1), y1 = clamp(Math.ceil(((r.bottom - oy) / s) / 8), y0 + 1, SH);
    const vals = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const p = (y * SW + x) * 4;
      let L = 0, ws = 0;
      for (let i = 0; i < 4; i++) {
        const w = weightsNow[i], d = samples[i];
        if (!w || !d) continue;
        L += w * lum([d[p], d[p + 1], d[p + 2]]); ws += w;
      }
      if (ws) vals.push(L / ws);
    }
    if (!vals.length) return null;
    vals.sort((a, b) => a - b);
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
    const aDark = needs(Lb.lo, lum(DARK), 1, target), aLight = needs(Lb.hi, lum(LIGHTC), lum([18, 16, 22]), target);
    const light = aLight < aDark + (preferLight || 0);
    return { light, a: Math.max(minA, light ? aLight : aDark) };
  }
  function updateInk() {
    if (!samples.some(Boolean)) return;
    const cb = behind(relRect(copy));
    if (cb) {
      // in dim light a soft dark halo round light letters reads as shade; a pale patch would look like fog
      const c = choose(cb, 7.5, 0, 0.4); // aimed above 4.5: the blurred patch and halo do less than the sum assumes over dappled light
      copy.style.setProperty('--ui-fg', c.light ? '#f7f3ed' : '#141414');
      copy.style.setProperty('--ui-fg-2', c.light ? '#e6dfd3' : '#33382d');
      copy.style.setProperty('--ui-head', c.light ? '#f7f3ed' : 'var(--forest)');
      const tint = c.light ? '18,16,22,' : '250,246,238,', sa = Math.min(0.85, c.a), ha = Math.min(0.95, c.a * 1.6);
      copy.style.setProperty('--copy-scrim', `rgba(${tint}${sa.toFixed(2)})`);
      copy.style.setProperty('--copy-halo', c.a > 0 ? `0 0 3px rgba(${tint}${(ha * 0.7).toFixed(2)}), 0 0 14px rgba(${tint}${ha.toFixed(2)})` : 'none');
    }
    const kb = behind(relRect(controls));
    if (kb) {
      const c = choose(kb, 5.5, 0.22, tod > 0.55 ? 0.35 : 0); // after dark, keep the glass dark unless the light demands otherwise
      controls.style.setProperty('--glass', c.light ? `rgba(18,16,22,${c.a.toFixed(2)})` : `rgba(255,253,248,${c.a.toFixed(2)})`);
      controls.style.setProperty('--glass-line', c.light ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.65)');
      controls.style.setProperty('--ctl-fg', c.light ? '#f7f3ed' : '#141414');
      controls.setAttribute('data-ink', c.light ? 'light' : 'dark');
    }
    // the dashed place a card leaves, and the focus ring on the cards, take the ink the wood around them needs
    const fr = relRect(items[active]);
    const db = behind({ left: fr.left - 20, right: fr.right + 20, top: fr.top - 20, bottom: fr.bottom + 20 });
    if (db) {
      const darkWood = contrast((db.lo + db.hi) / 2, 1) < contrast((db.lo + db.hi) / 2, lum([40, 30, 20]));
      root.style.setProperty('--pol-empty', darkWood ? 'rgba(255,250,240,.78)' : 'rgba(40,28,16,.62)');
      root.style.setProperty('--pol-empty-fill', darkWood ? 'rgba(255,250,240,.07)' : 'rgba(40,28,16,.07)');
      root.style.setProperty('--pol-focus', darkWood ? '#f7f3ed' : '#141414');
    }
  }

  /* ---------- the shared bar's contract ---------- */
  window.addEventListener('elmuse:time', (e) => { if (e.detail && e.detail.t != null) setTime(e.detail.t); });
  window.addEventListener('elmuse:volume', (e) => { if (e.detail && e.detail.v != null) setVolume(e.detail.v); });
  window.polaroid = { setTime, setVolume };

  /* ---------- start ---------- */
  slipIn(inPhone, { dropped: true });
  live.textContent = '';
  const now = new Date();
  tod = clockToT(now.getHours() + now.getMinutes() / 60);
  layout();
  buildMaps();
  let rz = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  reduce.addEventListener?.('change', () => { placePhone(); shadows(); });
})();
