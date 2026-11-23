/* The Sanctuary Calendar: month sheets, page turn, tear-off postcard, QR panel, sound. */
(function () {
  'use strict';

  var root = document.getElementById('sanctuary');
  if (!root) return;

  var DIR = 'assets/sanctuary/';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // What each month's QR opens, written from the page's own "more for you" box and reflection.
  var ICONS = {
    playlist: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M8 14.5V4.5l8-1.5v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="14.5" r="2" fill="currentColor"/><circle cx="14" cy="13" r="2" fill="currentColor"/></svg>',
    recipe: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M3 10h14a7 7 0 0 1-14 0zM7 7c0-1.3 1-1.7 1-3M11 7c0-1.3 1-1.7 1-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    read: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 5.5C8.5 4.3 6 4 3 4.5v10c3-.5 5.5-.2 7 1 1.5-1.2 4-1.5 7-1v-10c-3-.5-5.5-.2-7 1zM10 5.5v10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    place: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 17.5s5.5-5 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.3 5.5 9.3 5.5 9.3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="8.2" r="1.9" fill="currentColor"/></svg>',
    film: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><rect x="3" y="5" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m8.5 8 3.5 2-3.5 2z" fill="currentColor"/></svg>',
    frame: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m5.5 14 3.5-4 2.5 2.5 1.5-1.5 2 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'
  };
  var KIND = { playlist: 'Playlist', recipe: 'Recipe', read: 'Reading list', place: 'A place', film: 'Watch list', frame: 'Template' };

  var DATA = [
    { title: 'Open Skies', art: 'kites over hazy rooftops at sunset, “your sign to look up”', items: [
      ['playlist', 'Uttarayan terrace', 'Sixteen songs for a windy rooftop'],
      ['recipe', 'Til-gud laddoo', 'Sesame and jaggery, rolled while warm'],
      ['read', 'Beginning lightly', 'Four slim books for the first weeks'],
      ['place', 'The pols of old Ahmedabad', 'Rooftops on 14 January, strings humming']] },
    { title: 'Slow Blooms', art: 'a golden hillside meadow with birds, “you’re allowed to take your time”', items: [
      ['playlist', 'Mustard fields', 'Unhurried songs for slow mornings'],
      ['recipe', 'Kesari sheera', 'Saffron semolina for Vasant Panchami'],
      ['read', 'In its own season', 'Spring reads on patience and seeds'],
      ['place', 'Mustard fields of Punjab', 'Brightest in the second week']] },
    { title: 'Colour Stories', art: 'horses running through a blur of flowers, “run wild, run free”', items: [
      ['playlist', 'Gulaal', 'Songs for a long Holi afternoon'],
      ['recipe', 'Thandai', 'Rose, fennel and almond, served cold'],
      ['read', 'Outside the lines', 'Art books to leave open on the table'],
      ['place', 'Palash in Shantiniketan', 'Basanta Utsav under the flame trees']] },
    { title: 'Kitchen Stories', art: 'a candlelit table laid with sweets, “take a seat”', items: [
      ['playlist', 'Sunday kitchen', 'Songs to cook slowly to'],
      ['recipe', 'Nani’s kadhi', 'With a blank card to write down yours'],
      ['read', 'The taste of home', 'Essays on food and memory'],
      ['place', 'The spice lanes of old Jaipur', 'Where the recipes begin']] },
    { title: 'Mango Summers', art: 'hands washing mangoes in a stone basin, “the summer solace”', items: [
      ['playlist', 'After lunch', 'Slow songs for the long, lazy nap'],
      ['recipe', 'Aam panna', 'Raw mango cooler, salted and smoky'],
      ['read', 'Lazy-day reads', 'Short novels for hot afternoons'],
      ['place', 'Ratnagiri orchards', 'Alphonso season, straight from the tree']] },
    { title: 'Starry Nights', art: 'two hands reaching into a starry sky, “make a wish”', items: [
      ['playlist', 'Terrace sky', 'Night songs for the rooftop'],
      ['recipe', 'Nimbu shikanji', 'For a warm night under the open sky'],
      ['read', 'Bedtime reads', 'Stories to read aloud under the stars'],
      ['place', 'Hanle, Ladakh', 'India’s dark-sky reserve, with a stargazing guide']] },
    { title: 'Puddle Days', art: 'a yellow rain boot and a paper boat in a puddle, “for the kid in you”', items: [
      ['playlist', 'Monsoon window', 'Rain songs, old and new'],
      ['recipe', 'Pakoras and adrak chai', 'The rainy-day classic'],
      ['read', 'Childhood reads', 'The comics and stories we grew up on'],
      ['place', 'Malshej Ghat', 'Waterfalls along the road in July']] },
    { title: 'Tied Together', art: 'two hands in wool sleeves joined by a thread, “moh moh ke dhaage”', items: [
      ['playlist', 'Long calls', 'Songs for a friend a city away'],
      ['recipe', 'Ghevar', 'The Teej and Rakhi sweet, made at home'],
      ['read', 'The people who stay', 'Novels about friendship and siblings'],
      ['place', 'Teej in Jaipur', 'Swings, henna and the evening procession']] },
    { title: 'Shape It Slowly', art: 'hands shaping clay on a potter’s wheel, “the art of becoming”', items: [
      ['playlist', 'Potter’s wheel', 'Steady songs for slow craft'],
      ['recipe', 'Handi dal', 'Cooked low and slow in a clay pot'],
      ['read', 'Made by hand', 'Books on craft and patience'],
      ['place', 'Blue pottery studios, Jaipur', 'Weekend wheel and glaze classes']] },
    { title: 'Room for Light', art: 'a shaft of light through a dark doorway, “the light within”', items: [
      ['playlist', 'Diya evenings', 'Festive songs for cleaning and lighting up'],
      ['recipe', 'Besan laddoo', 'The first sweet in the Diwali tin'],
      ['read', 'Making room', 'Gentle guides to clearing out'],
      ['place', 'Johari Bazaar at Diwali', 'The old market, lit end to end']] },
    { title: 'Soft Layers', art: 'coffee and a book on soft sheets, “romanticizing winter mornings”', items: [
      ['playlist', 'Razai season', 'Slow songs for early evenings'],
      ['recipe', 'Tomato shorba', 'A soup for the first cold night'],
      ['read', 'Under the blanket', 'Cosy reads for long nights'],
      ['place', 'Winter sun in Pushkar', 'Lakeside ghats on a November morning']] },
    { title: 'The Way Home', art: 'blurred lights of a night journey, “and at the end it is all worth it”', items: [
      ['film', 'Comfort films', 'Five to watch with everyone home'],
      ['playlist', 'Homecoming', 'Songs for late trains and long drives'],
      ['recipe', 'Hot chocolate, the thick kind', 'For the porch-light evenings'],
      ['place', 'Wherever home is', 'A year-end ritual to close 2027']] },
    { title: 'Your Year in Frames', art: 'twelve empty frames, “moments that felt like a sanctuary”', closing: true, items: [
      ['frame', 'Year-end collage', 'An editable template for your twelve frames'],
      ['read', 'Print and frame', 'How to print it to fit the base'],
      ['playlist', 'Goodbye 2027', 'Songs for writing your letter to the year']] }
  ];

  var SHEETS = DATA.map(function (d, k) {
    return {
      name: k < 12 ? MONTHS[k] : 'Year end',
      front: pad(2 * k + 1),
      back: pad(2 * k + 2),
      data: d,
      closing: !!d.closing
    };
  });

  function pad(n) { return 'page-' + (n < 10 ? '0' + n : n) + '.jpg'; }
  function web(file) { return DIR + 'web/' + file; }
  function full(file) { return DIR + file; }

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    sheet: $('sanc-sheet'), wrap: root.querySelector('.sanc__sheet-wrap'), strip: $('sanc-strip'), body: $('sanc-body'),
    shade: root.querySelector('.sanc__shade'), qr: $('sanc-qr'), card: $('sanc-postcard'), cardIn: root.querySelector('.sanc__postcard-in'),
    month: $('sanc-month'), prev: $('sanc-prev'), next: $('sanc-next'), flip: $('sanc-flip'), tear: $('sanc-tear'), zoom: $('sanc-zoom'),
    actions: $('sanc-actions'), cardActions: $('sanc-card-actions'), cardFlip: $('sanc-card-flip'), cardKeep: $('sanc-card-keep'), cardBack: $('sanc-card-back'),
    hint: $('sanc-hint'), slots: $('sanc-slots'), reset: $('sanc-reset'), engrave: $('sanc-engrave'),
    canvas: $('sanc-canvas'), object: $('sanc-object'), copy: $('sanc-copy'), bar: $('sanc-bar'), controls: $('sanc-controls'),
    time: $('sanc-time'), vol: $('sanc-vol'), mute: $('sanc-mute'), orb: $('sanc-orb'), matrix: $('sanc-relight-m'),
    phone: $('sanc-phone'), phoneClose: $('sanc-phone-close'), phoneKicker: $('sanc-phone-kicker'), phoneTitle: $('sanc-phone-title'),
    phoneUnlock: $('sanc-phone-unlock'), phoneList: $('sanc-phone-list'),
    stack: root.querySelector('.sanc__stack'), under: root.querySelector('.sanc__stack i:last-child'),
    zoomer: $('sanc-zoomer'), zoomClose: $('sanc-zoom-close'), zoomImg: $('sanc-zoom-img'), zoomTitle: $('sanc-zoom-title')
  };
  var parts = {};
  root.querySelectorAll('[data-part]').forEach(function (n) { parts[n.getAttribute('data-part')] = n; });

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var state = { i: 0, back: false, torn: new Set(), kept: new Set(), holding: null, cardBack: false, busy: false };

  /* ---------------- images: only what is on screen, then neighbours when idle ---------------- */
  var loaded = {};
  function load(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (res) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = im.onerror = function () { res(); };
        im.src = src;
      });
    }
    return loaded[src];
  }
  function loadSheet(k) { var s = SHEETS[k]; return Promise.all([load(web(s.front)), load(web(s.back))]); }
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 400); };
  function warmNeighbours() {
    idle(function () {
      [state.i + 1, state.i - 1].forEach(function (k) { if (k >= 0 && k < SHEETS.length) loadSheet(k); });
    });
  }
  function bg(node, src) { node.style.backgroundImage = 'url("' + src + '")'; }

  /* ---------------- render ---------------- */
  function render() {
    var s = SHEETS[state.i];
    bg(parts['strip-front'], web(s.front)); bg(parts['body-front'], web(s.front));
    bg(parts['strip-back'], web(s.back)); bg(parts['body-back'], web(s.back));

    // the loose sheet underneath shows through once the postcard is torn off
    var under = SHEETS[state.i + 1];
    el.under.style.backgroundImage = under ? 'url("' + web(under.front) + '")' : 'none';
    el.stack.hidden = !under;

    var torn = state.torn.has(state.i);
    var holdingHere = state.holding === state.i;
    el.sheet.classList.toggle('is-back', state.back);
    el.sheet.classList.toggle('is-torn', torn);
    el.sheet.classList.toggle('is-closing', s.closing);
    el.sheet.setAttribute('aria-label', describe(s, torn));

    el.month.textContent = s.name;
    el.prev.disabled = state.i === 0;
    el.next.disabled = state.i === SHEETS.length - 1;

    el.qr.hidden = !state.back;
    el.qr.classList.toggle('is-closing', s.closing);
    el.qr.setAttribute('aria-label', 'Scan the QR code: see what ' + (s.closing ? 'the year-end page' : s.name) + ' unlocks');

    el.actions.hidden = holdingHere;
    el.cardActions.hidden = !holdingHere;
    el.flip.textContent = state.back ? 'Turn to front' : 'Turn over';
    if (s.closing) {
      el.tear.hidden = true;
    } else {
      el.tear.hidden = false;
      el.tear.textContent = torn ? 'Put postcard back' : 'Tear off postcard';
    }
    el.hint.textContent = hint(s, torn, holdingHere);

    renderSlots();
    el.reset.hidden = state.torn.size === 0;
    warmNeighbours();
  }

  function describe(s, torn) {
    if (s.closing) {
      return state.back ? 'The closing page: a letter to say goodbye to 2027, with a QR code for a year-end collage template.'
        : 'The year-end page: twelve empty frames, “moments that felt like a sanctuary”.';
    }
    if (state.back) {
      return s.name + ' 2027, journal side: ' + (torn ? '' : 'the back of the postcard at the top, then ') +
        'the month’s reflection, a reflect prompt with ruled lines, the ' + s.name + ' ritual and a QR code.';
    }
    return s.name + ' 2027, calendar side: ' + (torn ? 'the postcard has been torn off, leaving the month grid.' :
      s.data.art + ', above the month grid with holidays.');
  }

  function hint(s, torn, holding) {
    if (holding) return 'Turn it over, or pin it to the wall.';
    if (s.closing) return state.back ? 'Tap the QR code to see what it opens.' : 'The last sheet. Turn it over for the letter.';
    if (state.back) return 'Tap the QR code to see what it unlocks.';
    if (torn) return 'Tap the sheet to turn it over.';
    return 'Pull the picture up to tear it off. Tap to turn.';
  }

  function renderSlots() {
    if (!el.slots.children.length) {
      for (var k = 0; k < 12; k++) {
        var li = document.createElement('li');
        li.className = 'sanc__slot';
        li.setAttribute('aria-hidden', 'true');
        el.slots.appendChild(li);
      }
    }
    for (var m = 0; m < 12; m++) {
      var slot = el.slots.children[m];
      var has = state.kept.has(m);
      slot.classList.toggle('is-filled', has);
      if (has && !slot.firstChild) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', MONTHS[m] + ' postcard: pick it up again');
        b.style.backgroundImage = 'url("' + web(SHEETS[m].front) + '")';
        b.addEventListener('click', pickUp.bind(null, m));
        slot.appendChild(b);
        slot.removeAttribute('aria-hidden');
      } else if (!has && slot.firstChild) {
        slot.textContent = '';
        slot.setAttribute('aria-hidden', 'true');
      }
    }
  }

  /* ---------------- motion helpers ---------------- */
  function anim(node, frames, opts) {
    if (reduce.matches || !node.animate) return Promise.resolve();
    var a = node.animate(frames, opts);
    return a.finished.then(function () { a.cancel(); }, function () {});
  }
  function wait(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(r, ms); })]); }

  /* ---------------- month change ---------------- */
  function go(k) {
    if (state.busy || k < 0 || k >= SHEETS.length || k === state.i) return Promise.resolve();
    var dir = k > state.i ? 1 : -1;
    state.busy = true;
    var before = state.holding !== null ? setAside(true) : Promise.resolve();
    return before.then(function () {
      state.busy = true;
      sound.slide();
      return anim(el.wrap, [
        { transform: 'translate(0,0)', opacity: 1 },
        { transform: 'translate(' + (-dir * 3) + '%, -7%)', opacity: 0 }
      ], { duration: 260, easing: 'cubic-bezier(.4,0,.7,.4)', fill: 'forwards' });
    }).then(function () {
      el.wrap.style.opacity = '0';
      state.i = k;
      state.back = false;
      return wait(loadSheet(k), 2500);
    }).then(function () {
      render();
      return anim(el.wrap, [
        { transform: 'translate(' + (dir * 3) + '%, -7%)', opacity: 0 },
        { transform: 'translate(0,0)', opacity: 1 }
      ], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }).then(function () {
      el.wrap.style.opacity = '';
      state.busy = false;
    });
  }

  /* ---------------- page turn ---------------- */
  function flip() {
    if (state.busy) return;
    state.busy = true;
    var from = state.back ? 180 : 0;
    var to = state.back ? 0 : 180;
    state.back = !state.back;
    el.qr.hidden = true;
    sound.flip();
    el.sheet.classList.toggle('is-back', state.back);
    var easing = 'cubic-bezier(.45,.05,.25,1)';
    Promise.all([
      anim(el.sheet, [
        { transform: 'translateY(0) rotateY(' + from + 'deg)' },
        { transform: 'translateY(-3.5%) rotateY(' + (from + to) / 2 + 'deg)', offset: 0.5 },
        { transform: 'translateY(0) rotateY(' + to + 'deg)' }
      ], { duration: 900, easing: easing }),
      anim(el.shade, [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: 900, easing: easing })
    ]).then(function () {
      state.busy = false;
      render();
    });
  }

  /* ---------------- tearing ---------------- */
  var TILT = 7; // degrees the strip lifts before it lets go
  function stripPose(p) {
    return 'rotate(' + (p * TILT).toFixed(2) + 'deg) translateY(' + (-p * 6).toFixed(1) + 'px)';
  }

  function tearByButton() {
    var s = SHEETS[state.i];
    if (state.busy || s.closing) return;
    if (state.torn.has(state.i)) { restore(); return; }
    state.busy = true;
    if (reduce.matches) { completeTear(1, true); return; }
    var t0 = performance.now(), D = 520, last = 0;
    (function step(now) {
      var p = Math.min(1, (now - t0) / D);
      p = p * p * (3 - 2 * p);
      el.strip.style.transform = stripPose(p);
      if (p - last > 0.06) { sound.crackle(0.6); last = p; }
      if (p < 1) requestAnimationFrame(step); else completeTear(1, true);
    })(t0);
  }

  function completeTear(p, viaButton) {
    state.busy = true;
    var k = state.i;
    state.torn.add(k);
    state.holding = k;
    state.cardBack = state.back;
    sound.rip();

    bg(parts['card-front'], web(SHEETS[k].front));
    bg(parts['card-back'], web(SHEETS[k].back));
    el.card.classList.toggle('is-back', state.cardBack);
    el.cardIn.style.transition = 'none';
    el.card.hidden = false;
    // start where the strip let go (mirrored when the sheet shows its back)
    el.card.style.transformOrigin = state.back ? '0% 100%' : '100% 100%';
    var start = 'rotate(' + (state.back ? -TILT : TILT) * p + 'deg) translateY(' + (-6 * p) + 'px)';
    el.strip.style.transform = '';
    render();
    void el.card.offsetWidth;
    el.cardIn.style.transition = '';
    var lift = el.card.offsetHeight * 0.22;
    var end = 'translateY(' + (-lift).toFixed(1) + 'px) rotate(-1.4deg)';
    anim(el.card, [
      { transform: start },
      { transform: 'translateY(' + (-lift * 1.25).toFixed(1) + 'px) rotate(' + (state.back ? -3 : 3) + 'deg)', offset: 0.55 },
      { transform: end }
    ], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' }).then(function () {
      el.card.style.transform = end;
      state.busy = false;
      if (viaButton) el.cardFlip.focus({ preventScroll: true });
    });
    el.card.style.transform = end;
  }

  function flipCard() {
    if (state.holding === null) return;
    state.cardBack = !state.cardBack;
    el.card.classList.toggle('is-back', state.cardBack);
    sound.flip(0.7);
  }

  function setAside(silent) {
    if (state.holding === null) return Promise.resolve();
    var k = state.holding;
    state.busy = true;
    var slot = el.slots.children[k];
    var a = el.card.getBoundingClientRect();
    var b = slot.getBoundingClientRect();
    var sc = b.width / a.width;
    // the card lives inside the scaled scene, so screen distances are divided by the scene scale
    var dx = ((b.left + b.width / 2) - (a.left + a.width / 2)) / view.s;
    var dy = ((b.top + b.height / 2) - (a.top + a.height / 2)) / view.s;
    var cur = el.card.style.transform || 'none';
    state.cardBack = false;
    el.card.classList.remove('is-back');
    if (!silent) sound.slide();
    var gone = slot.getBoundingClientRect().bottom < 0 || b.top > window.innerHeight;
    return anim(el.card, [
      { transform: cur, opacity: 1 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ')', opacity: gone ? 0 : 1 }
    ], { duration: 640, easing: 'cubic-bezier(.5,0,.2,1)' }).then(function () {
      el.card.hidden = true;
      el.card.style.transform = '';
      state.kept.add(k);
      state.holding = null;
      state.busy = false;
      render();
      if (!silent && document.activeElement && el.cardActions.contains(document.activeElement)) el.tear.focus({ preventScroll: true });
    });
  }

  function putBack() {
    if (state.holding === null || state.busy) return;
    state.busy = true;
    var k = state.holding;
    if (state.cardBack !== state.back) { state.cardBack = state.back; el.card.classList.toggle('is-back', state.back); }
    anim(el.card, [{ transform: el.card.style.transform || 'none' }, { transform: 'none' }],
      { duration: 480, easing: 'cubic-bezier(.3,.6,.2,1)' }).then(function () {
      el.card.hidden = true;
      el.card.style.transform = '';
      state.torn.delete(k);
      state.holding = null;
      state.busy = false;
      render();
      el.tear.focus({ preventScroll: true });
    });
  }

  function restore() {
    var k = state.i;
    state.kept.delete(k);
    state.torn.delete(k);
    render();
    anim(el.strip, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: 'ease-out' });
  }

  function pickUp(k) {
    if (state.busy) return;
    var then = function () {
      state.kept.delete(k);
      state.holding = k;
      state.cardBack = false;
      bg(parts['card-front'], web(SHEETS[k].front));
      bg(parts['card-back'], web(SHEETS[k].back));
      el.card.classList.remove('is-back');
      el.card.style.transformOrigin = '100% 100%';
      el.card.hidden = false;
      var lift = el.card.offsetHeight * 0.22;
      var end = 'translateY(' + (-lift).toFixed(1) + 'px) rotate(-1.4deg)';
      el.card.style.transform = end;
      render();
      anim(el.card, [{ opacity: 0, transform: 'translateY(' + (-lift - 14) + 'px) rotate(-1.4deg)' }, { opacity: 1, transform: end }], { duration: 380, easing: 'ease-out' });
      el.cardFlip.focus({ preventScroll: true });
    };
    if (k === state.i) then(); else go(k).then(then);
  }

  function resetAll() {
    if (state.busy) return;
    state.torn.clear();
    state.kept.clear();
    state.holding = null;
    el.card.hidden = true;
    el.card.style.transform = '';
    render();
    el.tear.focus({ preventScroll: true });
  }

  /* ---------------- pointer gestures on the sheet ---------------- */
  var drag = null;
  function onDown(e) {
    if (state.busy || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var onStrip = el.strip.contains(e.target) && !state.torn.has(state.i) && !SHEETS[state.i].closing;
    drag = { x: e.clientX, y: e.clientY, mode: null, strip: onStrip, p: 0, lastP: 0, id: e.pointerId };
    if (onStrip) { try { el.strip.setPointerCapture(e.pointerId); } catch (_) {} }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.mode && Math.hypot(dx, dy) > 8) {
      if (Math.abs(dx) > Math.abs(dy) * 1.2) drag.mode = 'swipe';
      else if (drag.strip && dy < 0) { drag.mode = 'tear'; el.strip.classList.add('is-dragging'); }
      else drag.mode = 'none';
    }
    if (drag.mode === 'tear') {
      e.preventDefault();
      var h = el.strip.getBoundingClientRect().height;
      drag.p = Math.max(0, Math.min(1, -dy / (h * 0.55)));
      el.strip.style.transform = stripPose(drag.p);
      if (drag.p - drag.lastP > 0.05) { sound.crackle(0.4 + drag.p * 0.6); drag.lastP = drag.p; }
      if (drag.p < drag.lastP - 0.1) drag.lastP = drag.p;
      if (drag.p >= 1) {
        el.strip.classList.remove('is-dragging');
        drag = null;
        completeTear(1, false);
      }
    }
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    el.strip.classList.remove('is-dragging');
    var dx = e.clientX - d.x;
    if (d.mode === 'tear') {
      var from = el.strip.style.transform;
      el.strip.style.transform = '';
      anim(el.strip, [{ transform: from }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    } else if (d.mode === 'swipe') {
      if (Math.abs(dx) > 48) go(state.i + (dx < 0 ? 1 : -1));
    } else if (!d.mode) {
      flip();
    }
  }
  function onCancel() {
    if (!drag) return;
    drag = null;
    el.strip.classList.remove('is-dragging');
    el.strip.style.transform = '';
  }
  el.sheet.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  el.sheet.addEventListener('dragstart', function (e) { e.preventDefault(); });
  el.card.addEventListener('click', flipCard);

  /* ---------------- QR phone panel ---------------- */
  function openPhone() {
    var s = SHEETS[state.i];
    var monthIdx = s.closing ? 11 : state.i;
    el.phoneKicker.textContent = 'elmuse · ' + (s.closing ? 'Year end' : s.name);
    el.phoneTitle.textContent = s.data.title;
    el.phoneUnlock.textContent = 'Unlocks at midnight on 1 ' + MONTHS[monthIdx] + ' 2027.';
    el.phoneList.innerHTML = s.data.items.map(function (it) {
      return '<li><span class="sanc__phone-ico">' + ICONS[it[0]] + '</span><span><span class="k">' + KIND[it[0]] +
        '</span><span class="t">' + it[1] + '</span><span class="d">' + it[2] + '</span></span></li>';
    }).join('');
    showDialog(el.phone);
    el.phoneClose.focus();
  }
  function showDialog(d) {
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    if (!reduce.matches && d.animate) d.animate([{ opacity: 0, transform: 'translateY(12px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }
  function closeDialog(d, back) {
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
    if (back) back.focus({ preventScroll: true });
  }
  el.qr.addEventListener('click', function (e) { e.stopPropagation(); openPhone(); });
  el.qr.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  el.phoneClose.addEventListener('click', function () { closeDialog(el.phone, el.qr); });
  el.phone.addEventListener('click', function (e) { if (e.target === el.phone) closeDialog(el.phone, el.qr); });

  /* ---------------- look closer ---------------- */
  function openZoom() {
    var s = SHEETS[state.i];
    el.zoomImg.src = full(state.back ? s.back : s.front);
    el.zoomImg.alt = el.sheet.getAttribute('aria-label');
    el.zoomTitle.textContent = (s.closing ? 'Year end' : s.name) + (state.back ? ', journal side' : ', calendar side');
    showDialog(el.zoomer);
    el.zoomer.querySelector('.sanc__zoom-scroll').scrollTo(0, 0);
    el.zoomClose.focus();
  }
  el.zoomClose.addEventListener('click', function () { closeDialog(el.zoomer, el.zoom); });
  el.zoomer.addEventListener('click', function (e) { if (e.target === el.zoomer) closeDialog(el.zoomer, el.zoom); });

  /* ---------------- buttons and keys ---------------- */
  el.prev.addEventListener('click', function () { go(state.i - 1); });
  el.next.addEventListener('click', function () { go(state.i + 1); });
  el.flip.addEventListener('click', flip);
  el.tear.addEventListener('click', tearByButton);
  el.zoom.addEventListener('click', openZoom);
  el.cardFlip.addEventListener('click', flipCard);
  el.cardKeep.addEventListener('click', function () { if (!state.busy) setAside(false); });
  el.cardBack.addEventListener('click', putBack);
  el.reset.addEventListener('click', resetAll);
  root.addEventListener('keydown', function (e) {
    if (e.target.closest('dialog') || e.target.closest('[role="slider"]') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowRight') { go(state.i + 1); }
    else if (e.key === 'ArrowLeft') { go(state.i - 1); }
  });

  /* ---------------- sound: soft paper and a quiet room, synthesised, through one volume ---------------- */
  var sound = (function () {
    var ctx = null, noise = null, master = null, vol = 0, tod = 0.33;
    var day = null, night = null, timer = null;
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
    function src(at, dur) {
      var s = ctx.createBufferSource();
      s.buffer = noise;
      s.start(at, Math.random() * 1.2, dur + 0.05);
      return s;
    }
    function chain(nodes, out) { for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(out || master); }
    function burst(at, dur, freq, q, peak, type) {
      var s = src(at, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.008, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      chain([s, f, g]);
    }
    function live() { return ctx && vol > 0; }

    // the room: a faint airy bed by day, a lower, stiller one at night
    function bed(lo, hi, type) {
      var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      var f1 = ctx.createBiquadFilter(); f1.type = 'highpass'; f1.frequency.value = lo;
      var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = hi;
      var g = ctx.createGain(); g.gain.value = 0;
      chain([s, f1, f2, g]); s.start();
      return g;
    }
    function weights() {
      var dayW = Math.max(0, Math.min(1, 1 - (tod - 0.4) * 2.4));
      var nightW = Math.max(0, Math.min(1, (tod - 0.55) * 2.2));
      return [dayW, nightW];
    }
    function chirp(at, w) {
      var n = 2 + Math.floor(Math.random() * 3), f0 = 3000 + Math.random() * 1400;
      for (var i = 0; i < n; i++) {
        var t = at + i * (0.09 + Math.random() * 0.05);
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f0 * (1.18 + Math.random() * 0.2), t + 0.06);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.01 * w, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.1);
      }
    }
    function cricket(at, w) {
      for (var i = 0; i < 3; i++) burst(at + i * 0.045, 0.016, 4700, 18, 0.03 * w);
    }
    function tick() {
      if (!live()) return;
      var w = weights(), t = ctx.currentTime + 0.05;
      if (Math.random() < 0.07 * w[0]) chirp(t, w[0]);
      if (Math.random() < 0.18 * w[1]) cricket(t, w[1]);
    }
    function ambience() {
      if (!ctx) return;
      if (!day) { day = bed(220, 1500); night = bed(40, 300); }
      var w = weights(), now = ctx.currentTime;
      day.gain.setTargetAtTime(0.022 * w[0], now, 0.6);
      night.gain.setTargetAtTime(0.05 * w[1], now, 0.6);
      if (!timer) timer = setInterval(tick, 380);
    }
    return {
      volume: function (v) {
        vol = v;
        if (v > 0) { init(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume(); ambience(); }
        if (master) master.gain.setTargetAtTime(v * v, ctx.currentTime, 0.08);
      },
      time: function (t) { tod = t; if (live()) ambience(); },
      flip: function (scale) {
        if (!live()) return;
        var k = scale || 1, t = ctx.currentTime;
        var s = src(t, 0.6), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.Q.value = 0.7;
        f.frequency.setValueAtTime(500, t);
        f.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
        f.frequency.exponentialRampToValueAtTime(900, t + 0.55);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16 * k, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.05 * k, t + 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.58);
        chain([s, f, g]);
        burst(t + 0.82, 0.07, 260, 0.8, 0.12 * k, 'lowpass'); // the card settling back on the ledge
      },
      slide: function () { if (live()) burst(ctx.currentTime, 0.28, 1500, 0.5, 0.06); },
      crackle: function (amt) {
        if (!live()) return;
        var t = ctx.currentTime, n = 2 + Math.round(Math.random() * 2);
        for (var i = 0; i < n; i++) burst(t + i * 0.012 + Math.random() * 0.01, 0.018 + Math.random() * 0.02, 2600 + Math.random() * 2600, 1.4, 0.05 + 0.08 * amt * Math.random());
      },
      rip: function () {
        if (!live()) return;
        var t = ctx.currentTime;
        for (var i = 0; i < 16; i++) burst(t + i * 0.018 + Math.random() * 0.008, 0.03, 2000 + Math.random() * 3500, 1.2, 0.06 + Math.random() * 0.1);
        var s = src(t, 0.34), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.Q.value = 0.9;
        f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.3);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        chain([s, f, g]);
      }
    };
  })();

  /* ---------------- the room: scale, crop and placement ---------------- */
  var IMG_W = 1344, IMG_H = 752, FOOT_Y = 622, SHEET_W = 203, BOARD_HALF = SHEET_W * 1.075 / 2;
  var view = { s: 1, ox: 0, oy: 0, narrow: false, bx: 670 };
  var bgs = Array.prototype.slice.call(root.querySelectorAll('.sanc__bg'));

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // a rectangle in this section's own pixels (the merged page scrolls it; standalone it sits at 0,0)
  function relRect(n) {
    var r = n.getBoundingClientRect(), s0 = root.getBoundingClientRect();
    return { left: r.left - s0.left, right: r.right - s0.left, top: r.top - s0.top, bottom: r.bottom - s0.top, width: r.width, height: r.height };
  }
  // on the merged page the control bar is one fixed bar outside this section
  var barOut = !root.contains(el.bar);

  var useZoom = !!(window.CSS && CSS.supports && CSS.supports('zoom', '2'));
  function layout() {
    var W = root.clientWidth, H = root.clientHeight;
    var narrow = W < 900;
    var s = Math.max(W / IMG_W, H / (IMG_H - 3)); // 3 px spare: the frames are nudged up to 2 px
    var oy = H - IMG_H * s; // keep the desk; crop plaster off the top on wide screens
    var ox, bx;
    if (!narrow) {
      ox = clamp(W / 2 - 672 * s, W - IMG_W * s, 0);
      bx = 670;
    } else {
      // keep part of the lamp at the right edge; the board stands just left of it
      ox = clamp(W - 30 - 1062 * s, W - IMG_W * s, 0);
      bx = 1030 - BOARD_HALF;
    }
    view = { s: s, ox: ox, oy: oy, narrow: narrow, bx: bx };
    if (useZoom) {
      // zoom lays the room out at full resolution; a scale transform would rasterise the 3D sheet small and blur it
      el.canvas.style.zoom = s.toFixed(4);
      el.canvas.style.left = (ox / s).toFixed(2) + 'px';
      el.canvas.style.top = (oy / s).toFixed(2) + 'px';
    } else {
      el.canvas.style.transform = 'translate(' + ox.toFixed(1) + 'px,' + oy.toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
    }
    el.canvas.style.setProperty('--bx', bx + 'px');

    var boardH = el.object.offsetHeight + SHEET_W * 0.03;
    var sx = function (x) { return ox + x * s; }, sy = function (y) { return oy + y * s; };
    var bl = sx(bx - BOARD_HALF), bt = sy(FOOT_Y - boardH), bb = sy(FOOT_Y);
    var barBottom = barOut ? el.bar.getBoundingClientRect().bottom : relRect(el.bar).bottom;

    // words on the wall
    if (!narrow) {
      var cw = Math.min(420, bl - 72 - 56);
      root.style.setProperty('--copy-x', Math.max(40, Math.min(80, W * 0.05)) + 'px');
      root.style.setProperty('--copy-w', cw + 'px');
      var ch = el.copy.offsetHeight;
      root.style.setProperty('--copy-y', Math.max(barBottom + 40, (bt + sy(560)) / 2 - ch / 2 - 20) + 'px');
    } else {
      root.style.setProperty('--copy-x', '16px');
      root.style.setProperty('--copy-w', (W - 32) + 'px');
      root.style.setProperty('--copy-y', (barBottom + 14) + 'px');
    }

    // controls on the desk, under the calendar
    var cwid = el.controls.offsetWidth;
    root.style.setProperty('--ctl-x', clamp(sx(bx), cwid / 2 + 12, W - cwid / 2 - 12) + 'px');
    root.style.setProperty('--ctl-y', (bb + (narrow ? 6 : 12)) + 'px');

    // the wall where kept postcards are pinned
    var winL = -ox / s, winR = (W - ox) / s, rect;
    if (!narrow) {
      var x1 = Math.min(winR - 28 / s, 1300);
      rect = [bx + 150, (barBottom - oy) / s + 22, x1, x1 > 1050 ? 300 : 560];
    } else {
      var copyB = relRect(el.copy).bottom;
      rect = [winL + 14 / s, (copyB - oy) / s + 12 / s, bx - BOARD_HALF - 12, 596];
    }
    placeWall(rect);
    fitEngraving();
    setTime(tod);
  }

  var wallRect = null;
  function placeWall(r) {
    var w = r[2] - r[0], h = r[3] - r[1], g = 7, ar = 1608 / 718, best = null;
    for (var cols = 1; cols <= 4; cols++) {
      var cw = Math.min((w - (cols - 1) * g) / cols, 122), rows = Math.ceil(12 / cols), chh = cw / ar;
      if (rows * chh + (rows - 1) * g > h) cw = Math.min(cw, ((h - (rows - 1) * g) / rows) * ar);
      if (cw > 0 && (!best || cw > best.cw)) best = { cols: cols, cw: cw, rows: rows };
    }
    if (!best) return;
    var chh2 = best.cw / ar;
    var gw = best.cols * best.cw + (best.cols - 1) * g, gh = best.rows * chh2 + (best.rows - 1) * g;
    var x0 = r[0] + (w - gw) / 2, y0 = view.narrow ? r[1] + (h - gh) / 2 : r[1];
    wallRect = [x0, y0, x0 + gw, y0 + gh];
    renderSlots();
    for (var k = 0; k < 12; k++) {
      var li = el.slots.children[k], c = k % best.cols, row = Math.floor(k / best.cols);
      li.style.left = (x0 + c * (best.cw + g)).toFixed(1) + 'px';
      li.style.top = (y0 + row * (chh2 + g)).toFixed(1) + 'px';
      li.style.width = best.cw.toFixed(1) + 'px';
      li.style.height = chh2.toFixed(1) + 'px';
    }
  }

  /* ---------------- time of day: blend the four frames and relight the calendar ---------------- */
  // per frame: colour multiply/add for the whole object, light across the board, shadows
  var LIGHT = [
    { m: [0.90, 0.93, 0.99], a: [0, 0, 0.01], dir: [[255, 255, 255, 0], [210, 214, 226, 0.1], [160, 168, 190, 0.32]], glow: [[255, 255, 255, 0.12], [255, 255, 255, 0.03], [255, 255, 255, 0]],
      blind: 0.06, cast: [10, 6, 12, 0.22, [70, 80, 100]], contact: 0.38 },
    { m: [1.02, 0.90, 0.76], a: [0, 0, 0], dir: [[255, 255, 255, 0], [220, 160, 110, 0.12], [180, 110, 60, 0.32]], glow: [[255, 214, 150, 0.22], [255, 214, 150, 0.06], [255, 214, 150, 0]],
      blind: 0.3, cast: [16, 8, 5, 0.32, [110, 60, 20]], contact: 0.5 },
    { m: [0.58, 0.50, 0.62], a: [0.02, 0.01, 0.03], dir: [[80, 64, 120, 0.28], [140, 120, 170, 0.1], [255, 255, 255, 0]], glow: [[255, 170, 100, 0], [255, 170, 100, 0.06], [255, 170, 100, 0.24]],
      blind: 0, cast: [-6, 2, 16, 0.26, [30, 20, 50]], contact: 0.45 },
    { m: [0.50, 0.39, 0.30], a: [0, 0, 0], dir: [[12, 10, 22, 0.55], [30, 22, 26, 0.18], [255, 255, 255, 0]], glow: [[255, 160, 70, 0], [255, 150, 70, 0.12], [255, 160, 70, 0.48]],
      blind: 0, cast: [-22, -2, 12, 0.5, [10, 6, 4]], contact: 0.62 }
  ];
  function mix(a, b, f) {
    if (typeof a === 'number') return a + (b - a) * f;
    return a.map(function (v, i) { return mix(v, b[i], f); });
  }
  function rgba(c) { return 'rgba(' + c.slice(0, 3).map(Math.round).join(',') + ',' + c[3].toFixed(3) + ')'; }
  function grad(st) { return 'linear-gradient(90deg,' + rgba(st[0]) + ' 0%,' + rgba(st[1]) + ' 55%,' + rgba(st[2]) + ' 100%)'; }

  var tod = 0.33, weightsNow = [0, 1, 0, 0];
  function setTime(t, fromUser) {
    tod = clamp(t, 0, 1);
    var seg = tod * 3, k = Math.min(2, Math.floor(seg)), f = seg - k;
    weightsNow = [0, 0, 0, 0]; weightsNow[k] = 1 - f; weightsNow[k + 1] = f;
    bgs.forEach(function (img, i) {
      if ((i === k || i === k + 1) && !img.src) img.src = img.getAttribute('data-src');
      img.style.opacity = i === k ? 1 : i === k + 1 ? f.toFixed(3) : 0;
    });
    var L = {}, A = LIGHT[k], B = LIGHT[k + 1];
    Object.keys(A).forEach(function (key) { L[key] = mix(A[key], B[key], f); });
    // light the board like the wall it stands against: measure the wall where the board is, on its dim and bright side
    var wl = wallAt(view.bx - BOARD_HALF, view.bx - BOARD_HALF / 3), wr = wallAt(view.bx + BOARD_HALF / 3, view.bx + BOARD_HALF);
    if (wl && wr) {
      var REF = [236, 230, 220], K = 1.16, lo = lum(wl) <= lum(wr) ? wl : wr, hi = lo === wl ? wr : wl;
      L.m = lo.map(function (v, i) { return clamp(v / REF[i] * K, 0.22, 1.08); });
      L.a = [0, 0, 0];
      var ratio = lum(hi) / Math.max(0.002, lum(lo)), ga = clamp((ratio - 1) * 0.45, 0, 0.65);
      var mx = Math.max(hi[0], hi[1], hi[2]), gc = hi.map(function (v) { return v / mx * 255; });
      var glow = [gc.concat([ga]), gc.concat([ga * 0.25]), gc.concat([0])];
      L.glow = hi === wr ? glow.slice().reverse() : glow;
      // keep only a soft hint of the frame's own directional shading on top of the measured light
      L.dir = L.dir.map(function (c) { return c.slice(0, 3).concat([c[3] * 0.5]); });
    }
    el.matrix.setAttribute('values', [
      L.m[0], 0, 0, 0, L.a[0], 0, L.m[1], 0, 0, L.a[1], 0, 0, L.m[2], 0, L.a[2], 0, 0, 0, 1, 0
    ].map(function (v) { return (+v).toFixed(4); }).join(' '));
    // postcards on the wall take the light of the wall where they hang
    var wm = L.m;
    if (wallRect) {
      var ww = wallAt(wallRect[0], wallRect[2], wallRect[1], wallRect[3]);
      if (ww) wm = ww.map(function (v, i) { return clamp(v / [236, 230, 220][i] * 1.12, 0.2, 1.08); });
    }
    $('sanc-relight-w').setAttribute('values', [wm[0], 0, 0, 0, 0, 0, wm[1], 0, 0, 0, 0, 0, wm[2], 0, 0, 0, 0, 0, 1, 0].map(function (v) { return (+v).toFixed(4); }).join(' '));
    var c = el.canvas.style;
    c.setProperty('--light-dir', grad(L.dir));
    c.setProperty('--light-glow', grad(L.glow));
    c.setProperty('--blind-o', L.blind.toFixed(3));
    c.setProperty('--cast-x', L.cast[0].toFixed(1) + 'px');
    c.setProperty('--cast-y', L.cast[1].toFixed(1) + 'px');
    c.setProperty('--cast-b', L.cast[2].toFixed(1) + 'px');
    c.setProperty('--cast-o', L.cast[3].toFixed(3));
    c.setProperty('--cast-c', rgba(L.cast[4].concat([1])));
    c.setProperty('--cast-k', (L.cast[0] * -0.25).toFixed(2) + 'deg');
    c.setProperty('--contact-o', L.contact.toFixed(3));
    c.setProperty('--contact-x', (L.cast[0] * 0.25).toFixed(1) + 'px');
    c.setProperty('--card-shadow', (L.cast[0] * 0.12).toFixed(1) + 'px ' + (2 + L.cast[1] * 0.12).toFixed(1) + 'px ' + (2 + L.cast[2] * 0.25).toFixed(1) + 'px ' + rgba(L.cast[4].concat([Math.min(0.6, L.cast[3] * 1.4)])));

    barUI(tod);
    sound.time(tod);
    updateInk();
  }
  function barUI(t) {
    var v = Math.round(t * 100);
    el.time.setAttribute('aria-valuenow', v);
    el.time.setAttribute('aria-valuetext', t < 0.17 ? 'Morning' : t < 0.5 ? 'Afternoon' : t < 0.84 ? 'Dusk' : 'Night');
    el.time.style.setProperty('--fill', v + '%');
    var isNight = t >= 0.6;
    el.orb.classList.toggle('is-night', isNight);
    el.orb.setAttribute('aria-label', isNight ? 'Go to daytime' : 'Go to night');
  }

  function clockToT(h) {
    var P = [[0, 1], [5, 1], [6.5, 0], [10, 0.1], [13.5, 0.333], [16.5, 0.45], [18.5, 0.667], [20, 0.85], [21.5, 1], [24, 1]];
    for (var i = 1; i < P.length; i++) if (h <= P[i][0]) return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * (h - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
    return 1;
  }

  /* ---------------- readable at every hour: measure the pixels behind each group ---------------- */
  var samples = [];
  var SW = 168, SH = 94;
  function sampleImage(img, i) {
    try {
      var cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
      var cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, SW, SH);
      samples[i] = cx.getImageData(0, 0, SW, SH).data;
    } catch (_) { samples[i] = null; }
    setTime(tod);
  }
  bgs.forEach(function (img, i) {
    img.addEventListener('load', function () { sampleImage(img, i); });
  });
  function lin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
  function contrast(a, b) { return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
  // luminance of the blended frames behind a screen rectangle: darkest and brightest tenth
  function behind(r) {
    var x0 = clamp(Math.floor(((r.left - view.ox) / view.s) / 8), 0, SW - 1), x1 = clamp(Math.ceil(((r.right - view.ox) / view.s) / 8), x0 + 1, SW);
    var y0 = clamp(Math.floor(((r.top - view.oy) / view.s) / 8), 0, SH - 1), y1 = clamp(Math.ceil(((r.bottom - view.oy) / view.s) / 8), y0 + 1, SH);
    var vals = [];
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var p = (y * SW + x) * 4, L = 0, ws = 0;
      for (var i = 0; i < 4; i++) {
        var w = weightsNow[i], d = samples[i];
        if (!w || !d) continue;
        L += w * (0.2126 * lin(d[p]) + 0.7152 * lin(d[p + 1]) + 0.0722 * lin(d[p + 2])); ws += w;
      }
      if (ws) vals.push(L / ws);
    }
    if (!vals.length) return null;
    vals.sort(function (a, b) { return a - b; });
    return { lo: vals[Math.floor(vals.length * 0.1)], hi: vals[Math.floor(vals.length * 0.9)] };
  }
  // average colour of the blended frames over a band of wall, image x0..x1, y 300..590
  function wallAt(x0, x1, y0i, y1i) {
    if (!samples.some(Boolean)) return null;
    var sx0 = clamp(Math.floor(x0 / 8), 0, SW - 1), sx1 = clamp(Math.ceil(x1 / 8), sx0 + 1, SW), out = [0, 0, 0], wsum = 0;
    var sy0 = y0i == null ? 38 : clamp(Math.floor(y0i / 8), 0, SH - 1), sy1 = y1i == null ? 74 : clamp(Math.ceil(y1i / 8), sy0 + 1, SH);
    for (var i = 0; i < 4; i++) {
      var w = weightsNow[i], d = samples[i];
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
  var DARK = [51, 56, 45], LIGHTC = [230, 223, 211]; // the weakest text colour in each set
  function needs(Lb, inkL, tintL, target) {
    // alpha of a tint over the backdrop so the ink reaches the target contrast
    for (var a = 0; a <= 0.95; a += 0.01) {
      var L = Lb * (1 - a) + tintL * a;
      if (contrast(L, inkL) >= target) return a;
    }
    return 0.95;
  }
  function choose(Lb, target, minA, preferLight) {
    // dark ink must clear the darkest backdrop, light ink the brightest; pick whichever needs less tint
    var aDark = needs(Lb.lo, lum(DARK), 1, target), aLight = needs(Lb.hi, lum(LIGHTC), lum([18, 16, 22]), target);
    var light = aLight < aDark + (preferLight || 0);
    return { light: light, a: Math.max(minA, light ? aLight : aDark) };
  }
  function updateInk() {
    if (!samples.some(Boolean)) return;
    var cb = behind(relRect(el.copy));
    if (cb != null) {
      // in dim light a soft dark halo round light letters reads as shade; a pale patch would look like fog
      var c = choose(cb, 6, 0, 0.4);
      el.copy.style.setProperty('--ui-fg', c.light ? '#f7f3ed' : '#141414');
      el.copy.style.setProperty('--ui-fg-2', c.light ? '#e6dfd3' : '#33382d');
      el.copy.style.setProperty('--ui-head', c.light ? '#f7f3ed' : 'var(--forest)');
      var tint = c.light ? '18,16,22,' : '250,246,238,', sa = Math.min(0.85, c.a * 0.8), ha = Math.min(0.95, c.a * 1.6);
      el.copy.style.setProperty('--copy-scrim', 'rgba(' + tint + sa.toFixed(2) + ')');
      el.copy.style.setProperty('--copy-halo', c.a > 0 ? '0 0 3px rgba(' + tint + (ha * 0.7).toFixed(2) + '), 0 0 14px rgba(' + tint + ha.toFixed(2) + ')' : 'none');
    }
    [[el.bar, '--glass', '--glass-line', 'color'], [el.controls, '--ctl-glass', '--ctl-glass-line', 'color']].forEach(function (g) {
      if (g[0] === el.bar && barOut) return; // the page-level bar keeps its own fixed dark glass
      var Lb = behind(relRect(g[0]));
      if (Lb == null) return;
      var c = choose(Lb, 5.5, 0.22, tod > 0.55 ? 0.35 : 0); // after dark, keep the glass dark unless the lamp really demands otherwise
      g[0].style.setProperty(g[1], c.light ? 'rgba(18,16,22,' + c.a.toFixed(2) + ')' : 'rgba(255,253,248,' + c.a.toFixed(2) + ')');
      g[0].style.setProperty(g[2], c.light ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.65)');
      g[0].style.color = c.light ? '#f7f3ed' : '#141414';
      g[0].setAttribute('data-ink', c.light ? 'light' : 'dark');
    });
  }

  /* ---------------- sliders: time of day and volume ---------------- */
  function slider(node, onChange, step) {
    function fromX(x) {
      var r = node.getBoundingClientRect();
      return clamp((x - r.left) / r.width, 0, 1) * 100;
    }
    var dragging = false;
    node.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { node.setPointerCapture(e.pointerId); } catch (_) {}
      onChange(fromX(e.clientX));
      e.preventDefault();
    });
    node.addEventListener('pointermove', function (e) { if (dragging) onChange(fromX(e.clientX)); });
    node.addEventListener('pointerup', function () { dragging = false; });
    node.addEventListener('pointercancel', function () { dragging = false; });
    node.addEventListener('keydown', function (e) {
      var v = +node.getAttribute('aria-valuenow'), nv = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nv = v + step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nv = v - step;
      else if (e.key === 'PageUp') nv = v + 10;
      else if (e.key === 'PageDown') nv = v - 10;
      else if (e.key === 'Home') nv = 0;
      else if (e.key === 'End') nv = 100;
      if (nv !== null) { e.preventDefault(); e.stopPropagation(); onChange(clamp(nv, 0, 100)); }
    });
  }
  /* The bar speaks to the whole page: elmuse:time / elmuse:volume on window (detail.src marks this section's own). Off screen,
     this section only relights when it comes near; the bar and the sound follow at once. */
  var near = true, pendingT = null, wantT = 0.33;
  function barTime(t) {
    wantT = clamp(t, 0, 1);
    if (near) { pendingT = null; setTime(wantT, true); }
    else { pendingT = wantT; barUI(wantT); sound.time(wantT); }
    window.dispatchEvent(new CustomEvent('elmuse:time', { detail: { t: wantT, src: 'sanc' } }));
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      near = en[0].isIntersecting;
      if (near && pendingT != null) { var t = pendingT; pendingT = null; setTime(t); }
    }, { rootMargin: '50% 0px' }).observe(root);
  }
  slider(el.time, function (v) { stopTween(); barTime(v / 100); }, 2);

  var volume = 0, lastVolume = 50;
  function setVolume(v, quiet) {
    volume = Math.round(clamp(v, 0, 100));
    if (volume > 0) lastVolume = volume;
    el.vol.setAttribute('aria-valuenow', volume);
    el.vol.setAttribute('aria-valuetext', volume === 0 ? 'Muted' : volume + '%');
    el.vol.style.setProperty('--fill', volume + '%');
    el.mute.setAttribute('aria-pressed', String(volume === 0));
    el.mute.setAttribute('aria-label', volume === 0 ? 'Sound off. Turn sound on' : 'Sound on. Mute');
    sound.volume(volume / 100);
    if (!quiet) window.dispatchEvent(new CustomEvent('elmuse:volume', { detail: { v: volume / 100, src: 'sanc' } }));
  }
  slider(el.vol, function (v) { setVolume(v); }, 5);
  el.mute.addEventListener('click', function () { setVolume(volume > 0 ? 0 : lastVolume); });
  // other parts of the page can ask for sound (the parcel does) or set the time/volume themselves
  window.addEventListener('elmuse:volume', function (e) {
    if (e.detail && e.detail.src !== 'sanc' && e.detail.v != null) setVolume(e.detail.v * 100, true);
  });
  window.addEventListener('elmuse:volume-request', function (e) {
    if (e.detail && e.detail.v != null) setVolume(e.detail.v * 100);
  });
  window.addEventListener('elmuse:time', function (e) {
    if (e.detail && e.detail.src !== 'sanc' && e.detail.t != null) { stopTween(); wantT = e.detail.t; if (near) setTime(wantT); else { pendingT = wantT; barUI(wantT); sound.time(wantT); } }
  });

  // the orb jumps between afternoon and night
  var tween = null;
  function stopTween() { if (tween) { cancelAnimationFrame(tween); tween = null; } }
  el.orb.addEventListener('click', function () {
    var target = wantT >= 0.6 ? 0.333 : 1, from = wantT;
    stopTween();
    if (reduce.matches) { barTime(target); return; }
    var t0 = performance.now(), D = 1600;
    (function step(now) {
      var p = Math.min(1, (now - t0) / D); p = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      barTime(from + (target - from) * p);
      tween = p < 1 ? requestAnimationFrame(step) : null;
    })(t0);
  });

  /* ---------------- engraving on the birch base ---------------- */
  function fitEngraving() {
    var t = el.engrave, box = t.parentElement;
    t.style.transform = '';
    var avail = box.clientWidth * 0.84, w = t.scrollWidth;
    if (w > avail && w > 0) t.style.transform = 'scale(' + (avail / w).toFixed(3) + ')';
  }
  function setEngraving(text) {
    var v = (text == null ? '' : String(text)).trim().slice(0, 40) || 'elmuse';
    el.engrave.textContent = v;
    if (v === 'elmuse') { // elmuse's own mark carries its small star
      var star = document.createElement('sup');
      star.textContent = '✦';
      el.engrave.appendChild(star);
    }
    fitEngraving();
  }
  window.setEngraving = setEngraving;
  window.sanctuary = { setEngraving: setEngraving, goTo: go, flip: flip };

  
  /* ---------------- start ---------------- */
  render();
  loadSheet(0);
  setEngraving('elmuse');
  var now = new Date();
  wantT = clockToT(now.getHours() + now.getMinutes() / 60);
  setTime(wantT);
  setVolume(0, true);
  layout();
  var rz = null;
  window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  // the other two frames load once the page has settled
  window.addEventListener('load', function () {
    idle(function () { bgs.forEach(function (img) { if (!img.src) img.src = img.getAttribute('data-src'); }); });
  });
  window.sanctuary.setTime = setTime;
  window.sanctuary.getTime = function () { return wantT; };
})();
