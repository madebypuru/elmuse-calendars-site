/* The Sanctuary Calendar, one pinned stage: the calendar stays at the centre while the scroll
   changes its setting and its pose. Every step also reads as a still pose plus words. */
(function () {
  'use strict';

  // Set the WhatsApp number (digits with country code) to turn the button on; empty leaves it off.
  var CONFIG = { whatsappNumber: '' };

  var DIR = 'assets/sanctuary/';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var ICONS = {
    playlist: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 14.5V4.5l8-1.5v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="6" cy="14.5" r="2" fill="currentColor"/><circle cx="14" cy="13" r="2" fill="currentColor"/></svg>',
    recipe: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h14a7 7 0 0 1-14 0zM7 7c0-1.3 1-1.7 1-3M11 7c0-1.3 1-1.7 1-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    read: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5.5C8.5 4.3 6 4 3 4.5v10c3-.5 5.5-.2 7 1 1.5-1.2 4-1.5 7-1v-10c-3-.5-5.5-.2-7 1zM10 5.5v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    place: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.5s5.5-5 5.5-9.3a5.5 5.5 0 0 0-11 0c0 4.3 5.5 9.3 5.5 9.3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="10" cy="8.2" r="1.9" fill="currentColor"/></svg>',
    film: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8.5 8 3.5 2-3.5 2z" fill="currentColor"/></svg>',
    note: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4h12v9l-4 4H4z M12 17v-4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  };
  var KIND = { playlist: 'Playlist', recipe: 'Recipe', read: 'Reading list', place: 'A place', film: 'Watch list', note: 'A note' };

  // the monthly themes and what each month's QR opens (the same entries as the Sanctuary section)
  var DATA = [
    ['Open Skies', 'your sign to look up', [['playlist', 'Uttarayan terrace'], ['recipe', 'Til-gud laddoo'], ['read', 'Beginning lightly'], ['place', 'The pols of old Ahmedabad']]],
    ['Slow Blooms', 'you’re allowed to take your time', [['playlist', 'Mustard fields'], ['recipe', 'Kesari sheera'], ['read', 'In its own season'], ['place', 'Mustard fields of Punjab']]],
    ['Colour Stories', 'run wild, run free', [['playlist', 'Gulaal'], ['recipe', 'Thandai'], ['read', 'Outside the lines'], ['place', 'Palash in Shantiniketan']]],
    ['Kitchen Stories', 'take a seat', [['playlist', 'Sunday kitchen'], ['recipe', 'Nani’s kadhi'], ['read', 'The taste of home'], ['place', 'The spice lanes of old Jaipur']]],
    ['Mango Summers', 'the summer solace', [['playlist', 'After lunch'], ['recipe', 'Aam panna'], ['read', 'Lazy-day reads'], ['place', 'Ratnagiri orchards']]],
    ['Starry Nights', 'make a wish', [['playlist', 'Terrace sky'], ['recipe', 'Nimbu shikanji'], ['read', 'Bedtime reads'], ['place', 'Hanle, Ladakh']]],
    ['Puddle Days', 'for the kid in you', [['playlist', 'Monsoon window'], ['recipe', 'Pakoras and adrak chai'], ['read', 'Childhood reads'], ['place', 'Malshej Ghat']]],
    ['Tied Together', 'moh moh ke dhaage', [['playlist', 'Long calls'], ['recipe', 'Ghevar'], ['read', 'The people who stay'], ['place', 'Teej in Jaipur']]],
    ['Shape It Slowly', 'the art of becoming', [['playlist', 'Potter’s wheel'], ['recipe', 'Handi dal'], ['read', 'Made by hand'], ['place', 'Blue pottery studios, Jaipur']]],
    ['Room for Light', 'the light within', [['playlist', 'Diya evenings'], ['recipe', 'Besan laddoo'], ['read', 'Making room'], ['place', 'Johari Bazaar at Diwali']]],
    ['Soft Layers', 'romanticizing winter mornings', [['playlist', 'Razai season'], ['recipe', 'Tomato shorba'], ['read', 'Under the blanket'], ['place', 'Winter sun in Pushkar']]],
    ['The Way Home', 'and at the end it is all worth it', [['film', 'Comfort films'], ['playlist', 'Homecoming'], ['recipe', 'Hot chocolate, the thick kind'], ['place', 'Wherever home is']]]
  ];

  // the steps: setting, ink tone, scroll length (in screens)
  var STEPS = [
    { bd: 'desk', tone: 'light', len: 1.2, scrim: 1 },   // 0  the object
    { bd: 'grid', tone: 'light', len: 1.7 },             // 1  the board, exploded
    { bd: 'macro', tone: 'dark', len: 1.7, scrim: 1 },   // 2  engraving
    { bd: 'studio', tone: 'light', len: 1.6 },           // 3  two sides
    { bd: 'paper', tone: 'light', len: 1.2, scrim: 1 }, // 4  reflection
    { bd: 'paper', tone: 'light', len: 1.2, scrim: 1 }, // 5  prompt
    { bd: 'paper', tone: 'light', len: 1.2, scrim: 1 }, // 6  ritual
    { bd: 'night', tone: 'dark', len: 1.8, scrim: 1 },   // 7  QR at midnight
    { bd: 'night', tone: 'dark', len: 1.5, scrim: 1 },   // 8  the company's QR
    { bd: 'art', tone: 'dark', len: 3.2, scrim: 1 },     // 9  twelve themes
    { bd: 'sage', tone: 'light', len: 1.6 },             // 10 tear
    { bd: 'sage', tone: 'light', len: 1.3 },             // 11 turn the card
    { bd: 'sage', tone: 'light', len: 1.3 },             // 12 send or keep
    { bd: 'wall', tone: 'light', len: 1.8 },             // 13 wall of twelve
    { bd: 'dusk', tone: 'dark', len: 1.8, scrim: 1 },    // 14 year end
    { bd: 'hands', tone: 'dark', len: 1.6, scrim: 1 },   // 15 for teams
    { bd: 'forest', tone: 'dark', len: 1.3 }             // 16 ask
  ];
  var N = STEPS.length;
  // where on the back page each journal close-up looks: x, y, w, h as fractions of the page
  var CROPS = { 4: [0.03, 0.33, 0.39, 0.27], 5: [0.41, 0.36, 0.56, 0.25], 6: [0.03, 0.795, 0.94, 0.13] };
  var TEAR_F = 718 / 2200, RATIO = 2200 / 1608;

  var $ = function (id) { return document.getElementById(id); };
  var story = $('story'), stage = $('stage'), obj = $('obj'), sheet = $('obj-sheet'), strip = $('obj-strip'), card = $('obj-card');
  var parts = { stack: $('obj-stack'), wrap: $('obj-sheetwrap'), base: $('obj-base'), peg: $('obj-peg') };
  var faces = { sf: $('f-strip-front'), sb: $('f-strip-back'), bf: $('f-body-front'), bb: $('f-body-back') };
  var beats = Array.prototype.slice.call(document.querySelectorAll('#copy .beat'));
  var pins = Array.prototype.slice.call(document.querySelectorAll('.obj .pin'));
  var partItems = Array.prototype.slice.call(document.querySelectorAll('#parts li'));
  var bds = {};
  Array.prototype.forEach.call(document.querySelectorAll('.bd'), function (n) { bds[n.getAttribute('data-bd')] = n; });
  var phone = $('phone'), chip = $('chip'), cue = $('cue'), scrim = $('scrim'), qrPath = $('qr-path'), qrPathD = $('qr-path-d');
  var wall = $('wall');

  var reduceQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = reduceQ.matches;
  if (reduceQ.addEventListener) reduceQ.addEventListener('change', function (e) { reduce = e.matches; frame(true); });

  var state = {
    b: -1, t: 0, month: 0, name: 'elmuse', burnt: '',
    over: {}, // overrides set by buttons, cleared when the step changes
    dragLift: 0, dragTorn: false, lastFlip: 0, lastTorn: false, lastOpen: false, lastSent: ''
  };

  /* ---------------- helpers ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function mix(a, b, f) { return a + (b - a) * f; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function page(n) { return 'page-' + pad2(n) + '.jpg'; }
  function full(n) { return DIR + page(n); }
  function web(n) { return DIR + 'web/' + page(n); }
  var loaded = {};
  function load(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise(function (res) {
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () { im.ok = true; res(true); };
        im.onerror = function () { res(false); };
        im.src = src;
      });
    }
    return loaded[src];
  }
  var done = {};
  function bg(node, src) {
    if (node._src === src) return;
    node._src = src;
    node.style.backgroundImage = 'url("' + src + '")';
  }
  // show a page: the light web copy at once if it is ready, the full-size file once it arrives
  function setPage(nodes, n) {
    var w = web(n), f = full(n);
    var want = n;
    nodes.forEach(function (nd) { nd._want = want; });
    if (done[f]) { nodes.forEach(function (nd) { bg(nd, f); }); return; }
    if (done[w]) nodes.forEach(function (nd) { bg(nd, w); });
    load(f).then(function (ok) {
      if (!ok) return;
      done[f] = true;
      nodes.forEach(function (nd) { if (nd._want === want) bg(nd, f); });
    });
  }
  function preloadWeb(list) { list.forEach(function (n) { load(web(n)).then(function (ok) { if (ok) done[web(n)] = true; }); }); }

  /* ---------------- sound: soft paper, synthesised; off until asked for ---------------- */
  var sound = (function () {
    var ctx = null, noise = null, master = null, on = false;
    function init() {
      if (ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      var len = ctx.sampleRate * 2;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noise.getChannelData(0), b = 0;
      for (var i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b = 0.6 * b + 0.4 * w; d[i] = b * 0.9 + w * 0.1; }
    }
    function src(at, dur) { var s = ctx.createBufferSource(); s.buffer = noise; s.start(at, Math.random() * 1.2, dur + 0.05); return s; }
    function chain(nodes) { for (var i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); nodes[nodes.length - 1].connect(master); }
    function burst(at, dur, freq, q, peak, type) {
      var s = src(at, dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.008, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      chain([s, f, g]);
    }
    function live() { return on && ctx; }
    return {
      set: function (v) { on = v; if (v) { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); } },
      flip: function (k) {
        if (!live()) return;
        k = k || 1;
        var t = ctx.currentTime, s = src(t, 0.6), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.Q.value = 0.7;
        f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.3); f.frequency.exponentialRampToValueAtTime(900, t + 0.55);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * k, t + 0.12);
        g.gain.exponentialRampToValueAtTime(0.05 * k, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.58);
        chain([s, f, g]);
      },
      slide: function () { if (live()) burst(ctx.currentTime, 0.28, 1500, 0.5, 0.06); },
      tick: function () { if (live()) burst(ctx.currentTime, 0.05, 2200, 2, 0.05); },
      crackle: function (amt) {
        if (!live()) return;
        var t = ctx.currentTime, n = 2 + Math.round(Math.random() * 2);
        for (var i = 0; i < n; i++) burst(t + i * 0.012 + Math.random() * 0.01, 0.018 + Math.random() * 0.02, 2600 + Math.random() * 2600, 1.4, 0.05 + 0.08 * amt * Math.random());
      },
      rip: function () {
        if (!live()) return;
        var t = ctx.currentTime;
        for (var i = 0; i < 16; i++) burst(t + i * 0.018 + Math.random() * 0.008, 0.03, 2000 + Math.random() * 3500, 1.2, 0.06 + Math.random() * 0.1);
      },
      burn: function () { if (live()) { burst(ctx.currentTime, 0.12, 5200, 0.8, 0.035, 'highpass'); burst(ctx.currentTime + 0.02, 0.03, 3000, 2, 0.05); } },
      chime: function () {
        if (!live()) return;
        var t = ctx.currentTime;
        [880, 1318.5].forEach(function (fq, i) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = fq;
          g.gain.setValueAtTime(0.0001, t + i * 0.12);
          g.gain.exponentialRampToValueAtTime(0.06, t + i * 0.12 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.9);
          o.connect(g); g.connect(master); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 1);
        });
      }
    };
  })();
  var soundBtn = $('sound');
  soundBtn.addEventListener('click', function () {
    var on = soundBtn.getAttribute('aria-pressed') !== 'true';
    soundBtn.setAttribute('aria-pressed', String(on));
    $('sound-label').textContent = on ? 'Sound on' : 'Sound off';
    sound.set(on);
    if (on) sound.tick();
  });

  /* ---------------- layout: sizes, poses, settings ---------------- */
  var L = {}, P = [], cum = [], total = 0, Wb = 0, lastW = 0, lastH = 0;
  STEPS.forEach(function (s, i) { cum[i] = total; total += s.len; });

  function layout() {
    var W = stage.clientWidth, H = stage.clientHeight, bar = 56;
    var mobile = W < 900;
    var vl, vr, vt, vb, copyTop = 0;
    if (!mobile) {
      var copyX = Math.round(Math.max(32, W * 0.045)), copyW = Math.round(Math.min(420, W * 0.32));
      stage.style.setProperty('--copy-x', copyX + 'px');
      stage.style.setProperty('--copy-w', copyW + 'px');
      vl = copyX + copyW + 32; vr = W - 32; vt = bar + 24; vb = H - 52;
    } else {
      copyTop = Math.round(H * (H < 720 ? 0.5 : 0.55));
      stage.style.setProperty('--copy-top', copyTop + 'px');
      stage.style.setProperty('--copy-top-px', copyTop + 'px');
      vl = 12; vr = W - 12; vt = bar + 14; vb = copyTop - 34;
    }
    var vw = vr - vl, vh = vb - vt, cx = (vl + vr) / 2, cy = (vt + vb) / 2;
    var fit = Math.min(vh * 0.9 / 1.62, vw * 0.84 / 1.22);
    L = { W: W, H: H, mobile: mobile, vl: vl, vr: vr, vt: vt, vb: vb, vw: vw, vh: vh, cx: cx, cy: cy, fit: fit, copyTop: copyTop };

    // the desk: the board stands on it at true scale beside the lamp
    var deskBottom = mobile ? vb + 34 : H;
    var s = Math.max(W / 1344, deskBottom / 752, 0.72 * fit / 203);
    var ix = mobile ? 921 : 670;
    var ox = clamp(cx - ix * s, W - 1344 * s, 0), oy = deskBottom - 752 * s;
    var desk = bds.desk.querySelector('img');
    desk.style.width = (1344 * s).toFixed(1) + 'px';
    desk.style.height = (752 * s).toFixed(1) + 'px';
    desk.style.left = ox.toFixed(1) + 'px';
    desk.style.top = oy.toFixed(1) + 'px';
    bds.desk.style.bottom = mobile ? (H - deskBottom) + 'px' : '0';

    var whole = function (k, extra) {
      var p = { cx: cx, cy: cy, fx: 0.55, fy: 0.77, w: fit * (k || 1), rx: 0, ry: 0, flip: 0, ex: 0 };
      for (var key in extra) p[key] = extra[key];
      return p;
    };
    var crop = function (c, want) {
      var target = Math.min(vw * 0.9, mobile ? 380 : want);
      var w = Math.min(target / c[2], vh * 0.84 / (c[3] * RATIO), mobile ? 820 : 1250);
      return { cx: cx, cy: cy, fx: c[0] + c[2] / 2, fy: (c[1] + c[3] / 2) * RATIO, w: w, rx: 0, ry: 0, flip: 180, ex: 0 };
    };
    var band = Math.min(vw * 0.94 / 1.075, mobile ? 420 : 900);
    var qrX = mobile ? cx - vw * 0.2 : cx - vw * 0.17;
    P = [
      { cx: ox + ix * s, cy: oy + 622 * s, fx: 0.5, fy: 1.566, w: 203 * s, rx: 0, ry: 0, flip: 0, ex: 0 },
      whole(0.78, { rx: 10, ry: -28, ex: 1, cx: cx + vw * 0.02 }),
      { cx: cx, cy: cy + vh * 0.1, fx: 0.5, fy: 1.47, w: band, rx: 22, ry: 0, flip: 0, ex: 0 },
      whole(1, { flip: 180 }),
      crop(CROPS[4], 560), crop(CROPS[5], 520), crop(CROPS[6], 860),
      whole(mobile ? 0.62 : 0.8, { flip: 180, cx: qrX }),
      whole(mobile ? 0.62 : 0.8, { flip: 180, cx: qrX }),
      whole(1, { flip: 0 }),
      whole(0.98, { flip: 0 }),
      whole(1.12, { fy: 0.42, cy: cy + vh * 0.04 }),
      whole(1.12, { fy: 0.42, cy: cy + vh * 0.04 }),
      whole(0.62, { cy: cy + vh * 0.14 }),
      whole(1, { flip: 180 }),
      whole(0.96, { ry: -24, rx: 4 }),
      whole(0.86, {})
    ];

    // the phone sits to the right of the calendar
    var pw = mobile ? Math.min(150, vh * 0.86 / 2.05, vw * 0.4) : Math.min(260, vh * 0.8 / 2.05);
    L.pw = pw;
    L.phoneX = mobile ? vr - pw - 6 : Math.min(vr - pw, cx + vw * 0.12);
    L.phoneY = cy - pw * 1.025;
    phone.style.setProperty('--pw', pw.toFixed(1) + 'px');
    qrPath.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    layoutWall();
    drawGridArt();

    // scroll length: one screen per unit of step length, plus the pinned screen itself
    if (W !== lastW || Math.abs(H - lastH) > 120) {
      story.style.height = Math.round(total * H + H) + 'px';
      lastW = W; lastH = H;
    }
    L.sh = lastH;
    L.top = story.offsetTop;
    L.docH = document.documentElement.scrollHeight - window.innerHeight;
    state.b = -1;
  }

  function drawGridArt() {
    var p = P[1], g = $('grid-art');
    g.setAttribute('viewBox', '0 0 ' + L.W + ' ' + L.H);
    var r = p.w * 0.95;
    g.innerHTML = '<line x1="' + p.cx + '" y1="0" x2="' + p.cx + '" y2="' + L.H + '"/>' +
      '<line x1="0" y1="' + p.cy + '" x2="' + L.W + '" y2="' + p.cy + '"/>' +
      '<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + r.toFixed(1) + '"/>' +
      '<circle cx="' + p.cx + '" cy="' + p.cy + '" r="' + (r * 0.55).toFixed(1) + '"/>';
  }

  /* ---------------- the wall of twelve ---------------- */
  var wallCards = [];
  function buildWall() {
    for (var k = 0; k < 12; k++) {
      var li = document.createElement('li');
      li.setAttribute('aria-label', MONTHS[k] + ' postcard');
      wall.appendChild(li);
      // a loose, repeatable scatter for each card before it is pinned
      var a = Math.sin(k * 12.9898) * 43758.5453; a -= Math.floor(a);
      var b = Math.sin(k * 78.233) * 12543.123; b -= Math.floor(b);
      wallCards.push({ li: li, sx: (a - 0.5) * 1.4, sy: 0.6 + b * 0.6, sr: (a - 0.5) * 40 });
    }
  }
  function layoutWall() {
    var cols = L.mobile ? 3 : 4, rows = 12 / cols, gap = L.mobile ? 8 : 16, ar = 1608 / 718;
    var cw = Math.min((L.vw - gap * (cols - 1)) / cols, ((L.vh - gap * (rows - 1)) / rows) * ar);
    var ch = cw / ar, gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap;
    var x0 = L.cx - gw / 2, y0 = L.cy - gh / 2;
    wallCards.forEach(function (c, k) {
      c.x = x0 + (k % cols) * (cw + gap);
      c.y = y0 + Math.floor(k / cols) * (ch + gap);
      c.w = cw; c.h = ch;
      c.li.style.width = cw.toFixed(1) + 'px';
      c.li.style.height = ch.toFixed(1) + 'px';
    });
  }
  function wallFrame(k) {
    wallCards.forEach(function (c, i) {
      var hide = i === state.month && state.b === 13;
      var x = c.x + c.sx * L.vw * (1 - k), y = c.y + c.sy * L.vh * (1 - k), r = c.sr * (1 - k) + (i % 3 - 1) * 0.8;
      c.li.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + r.toFixed(2) + 'deg)';
      c.li.style.opacity = hide ? '0' : String(clamp(k * 1.6, 0, 1));
    });
  }

  /* ---------------- the engraving: burnt in letter by letter ---------------- */
  var engraveEl = $('engrave'), burnTimers = [];
  function setEngraveText(text, burnIt) {
    burnTimers.forEach(clearTimeout); burnTimers = [];
    engraveEl.textContent = '';
    engraveEl.style.transform = '';
    var spans = [];
    Array.prototype.forEach.call(text, function (ch) {
      var sp = document.createElement('span');
      sp.textContent = ch;
      engraveEl.appendChild(sp);
      spans.push(sp);
    });
    if (text === 'elmuse') { var star = document.createElement('sup'); star.textContent = '✦'; engraveEl.appendChild(star); }
    engraveEl.setAttribute('aria-label', text);
    // keep the name inside the band
    var band = engraveEl.parentElement, avail = band.clientWidth * 0.82, w = engraveEl.scrollWidth;
    if (w > avail && w > 0) engraveEl.style.transform = 'scale(' + (avail / w).toFixed(3) + ')';
    if (!burnIt || reduce) { spans.forEach(function (s) { s.className = 'done'; }); return; }
    var step = Math.min(110, 1500 / Math.max(1, spans.length));
    spans.forEach(function (s, i) {
      burnTimers.push(setTimeout(function () { s.className = 'lit'; if (s.textContent.trim()) sound.burn(); }, 250 + i * step));
      burnTimers.push(setTimeout(function () { s.className = 'done'; }, 250 + i * step + 420));
    });
  }
  function burn() { state.burnt = state.name; setEngraveText(state.name, true); }
  var form = $('engrave-form'), input = $('engrave-input'), typeTimer = null;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(typeTimer);
    state.name = input.value.trim() || 'elmuse';
    burn();
    renderPhone();
  });
  input.addEventListener('input', function () {
    clearTimeout(typeTimer);
    typeTimer = setTimeout(function () {
      var v = input.value.trim();
      if (!v || v === state.burnt) return;
      state.name = v; burn(); renderPhone();
    }, 900);
  });

  /* ---------------- months ---------------- */
  var themeEls = { count: $('theme-count'), month: $('theme-month'), title: $('theme-title'), phrase: $('theme-phrase'), range: $('month-range') };
  var jm = Array.prototype.slice.call(document.querySelectorAll('.jm'));
  function setMonth(m, quiet) {
    m = clamp(m, 0, 11);
    if (m === state.month && !quiet) return;
    var changed = m !== state.month;
    state.month = m;
    var d = DATA[m];
    themeEls.count.textContent = pad2(m + 1) + ' / 12';
    themeEls.month.textContent = MONTHS[m];
    themeEls.title.textContent = d[0];
    themeEls.phrase.textContent = '“' + d[1] + '”';
    themeEls.range.value = m;
    themeEls.range.setAttribute('aria-valuetext', MONTHS[m] + ': ' + d[0]);
    jm.forEach(function (n) { n.textContent = MONTHS[m]; });
    $('pm-date').textContent = '1 · ' + ROMAN[m] + ' · 2027';
    var art = $('art-img');
    if (done[web(2 * m + 1)] || state.b >= 8) art.src = web(2 * m + 1);
    faces.sf._want = faces.bf._want = null;
    applyFaces();
    renderPhone();
    if (changed) sound.tick();
  }
  function applyFaces() {
    var closing = state.b >= 14;
    var f = closing ? 25 : 2 * state.month + 1, b = closing ? 26 : 2 * state.month + 2;
    if (faces.sf._page !== f) { faces.sf._page = faces.bf._page = f; setPage([faces.sf, faces.bf], f); }
    if (faces.sb._page !== b && state.b >= 1) { faces.sb._page = faces.bb._page = b; setPage([faces.sb, faces.bb], b); }
    var under = closing ? 0 : 2 * state.month + 3;
    var u = parts.stack.lastElementChild;
    u.style.backgroundImage = under && under <= 23 && done[web(under)] ? 'url("' + web(under) + '")' : 'none';
  }
  var monthOverride = null, lastScrollMonth = -1;
  function userMonth(m) { monthOverride = clamp(m, 0, 11); setMonth(monthOverride); }
  themeEls.range.addEventListener('input', function () { userMonth(+themeEls.range.value); });
  $('month-prev').addEventListener('click', function () { userMonth(state.month - 1); });
  $('month-next').addEventListener('click', function () { userMonth(state.month + 1); });

  /* ---------------- the phone ---------------- */
  var phoneEls = { lock: $('phone-lock'), date: $('phone-date'), time: $('phone-time'), hint: $('phone-hint'), kicker: $('phone-kicker'), title: $('phone-title'), unlock: $('phone-unlock'), list: $('phone-list') };
  function item(kind, title) {
    return '<li><span class="ico">' + ICONS[kind] + '</span><span><span class="k">' + KIND[kind] + '</span><span class="t">' + title + '</span></span></li>';
  }
  function renderPhone() {
    var m = state.month, d = DATA[m], yours = phone.classList.contains('is-yours');
    var who = state.name && state.name !== 'elmuse' ? state.name : 'Your company';
    if (yours) {
      phoneEls.kicker.textContent = who + ' · ' + MONTHS[m];
      phoneEls.title.textContent = 'From all of us';
      phoneEls.unlock.textContent = 'An example of your own page';
      phoneEls.list.innerHTML = item('note', 'A note from the founders') + item('playlist', 'The team’s ' + MONTHS[m] + ' playlist') +
        item('read', 'What we’re reading') + item('place', 'Where we meet this month');
    } else {
      phoneEls.kicker.textContent = 'elmuse · ' + MONTHS[m];
      phoneEls.title.textContent = d[0];
      phoneEls.unlock.textContent = 'Unlocked 1 ' + MONTHS[m] + ' 2027';
      phoneEls.list.innerHTML = d[2].map(function (it) { return item(it[0], it[1]); }).join('');
    }
  }
  function clockFor(t) {
    var m = state.month, eve = new Date(2027, m, 0), first = new Date(2027, m, 1);
    var sec = Math.min(60, 52 + Math.floor(clamp(t / 0.55, 0, 1) * 8.999));
    if (sec >= 60) {
      phoneEls.date.textContent = DAYS[first.getDay()] + ', 1 ' + MONTHS[m];
      phoneEls.time.textContent = '00:00';
      phoneEls.hint.textContent = MONTHS[m] + ' is open';
      return true;
    }
    phoneEls.date.textContent = DAYS[eve.getDay()] + ', ' + eve.getDate() + ' ' + MONTHS[eve.getMonth()];
    phoneEls.time.textContent = '23:59';
    phoneEls.hint.textContent = MONTHS[m] + ' opens in ' + (60 - sec) + ' s';
    return false;
  }
  function setYours(v) {
    phone.classList.toggle('is-yours', v);
    $('qr-yours').setAttribute('aria-pressed', String(v));
    $('qr-ours').setAttribute('aria-pressed', String(!v));
    renderPhone();
  }
  $('qr-yours').addEventListener('click', function () { state.over.yours = true; setYours(true); });
  $('qr-ours').addEventListener('click', function () { state.over.yours = false; setYours(false); });
  $('qr-spot').addEventListener('click', function () { goTo(state.b === 7 ? 7 : 8, 0.8); });

  /* ---------------- the postcard: tear, turn, send or keep ---------------- */
  $('card-flip').addEventListener('click', function () {
    var cur = state.over.back != null ? state.over.back : state.t > 0.35;
    state.over.back = !cur; frame(true);
  });
  $('send-btn').addEventListener('click', function () { state.over.fate = 'sent'; frame(true); });
  $('keep-btn').addEventListener('click', function () { state.over.fate = 'kept'; frame(true); });

  var drag = null;
  strip.addEventListener('pointerdown', function (e) {
    if (state.b !== 10 || isTorn() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { y: e.clientY, id: e.pointerId, last: 0 };
    try { strip.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  strip.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var h = strip.getBoundingClientRect().height || 100;
    var p = clamp((drag.y - e.clientY) / (h * 0.7), 0, 1);
    state.dragLift = p;
    if (p - drag.last > 0.06) { sound.crackle(0.4 + p * 0.6); drag.last = p; }
    if (p >= 1) { state.dragTorn = true; drag = null; }
    frame(true);
  });
  function endDrag() { if (!drag) return; drag = null; if (!state.dragTorn) { state.dragLift = 0; strip.classList.add('is-moving'); setTimeout(function () { strip.classList.remove('is-moving'); }, 360); } frame(true); }
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);
  strip.addEventListener('dragstart', function (e) { e.preventDefault(); });

  function isTorn() { return state.b >= 10 && state.b <= 13 && (state.dragTorn || state.b > 10 || state.t >= (reduce ? 0.3 : 0.62)); }

  /* ---------------- scroll position helpers ---------------- */
  function goTo(b, t) {
    var y = L.top + (cum[b] + t * STEPS[b].len) * L.sh;
    window.scrollTo({ top: Math.round(y), behavior: reduce ? 'auto' : 'smooth' });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-go]'), function (bt) {
    bt.addEventListener('click', function () { var a = bt.getAttribute('data-go').split(':'); goTo(+a[0], +a[1]); });
  });
  var navBtns = Array.prototype.slice.call(document.querySelectorAll('[data-jump]'));
  navBtns.forEach(function (bt) { bt.addEventListener('click', function () { goTo(+bt.getAttribute('data-jump'), 0.4); }); });

  /* ---------------- each frame ---------------- */
  var lastBd = {}, lastOpacity = {};
  function setOp(node, key, v) {
    v = Math.round(v * 1000) / 1000;
    if (lastOpacity[key] === v) return;
    lastOpacity[key] = v;
    node.style.opacity = v;
  }
  function lazyBd(key) {
    var n = bds[key]; if (!n || lastBd[key]) return;
    var im = n.querySelector('img[data-src]');
    if (im) im.src = im.getAttribute('data-src');
    lastBd[key] = true;
  }

  function enterStep(b) {
    var prev = state.b;
    state.b = b;
    state.over = {};
    if (b < 10) { state.dragTorn = false; state.dragLift = 0; }
    stage.setAttribute('data-step', b);
    stage.setAttribute('data-tone', STEPS[b].tone);
    beats.forEach(function (bt, i) {
      var on = i === b;
      bt.classList.toggle('is-on', on);
      if (on) { bt.removeAttribute('aria-hidden'); bt.inert = false; } else { bt.setAttribute('aria-hidden', 'true'); bt.inert = true; }
    });
    $('count-n').textContent = pad2(b + 1);
    var tone = STEPS[b].tone === 'dark' ? '16,14,12' : '247,243,237';
    scrim.style.background = 'linear-gradient(90deg, rgba(' + tone + ',.86) 0, rgba(' + tone + ',.6) ' + (parseFloat(stage.style.getPropertyValue('--copy-w')) || 400) + 'px, rgba(' + tone + ',0) ' + ((parseFloat(stage.style.getPropertyValue('--copy-w')) || 400) + 260) + 'px)';
    scrim.style.opacity = !L.mobile && STEPS[b].scrim ? 1 : 0;
    // only the settings close to this step are fetched
    for (var k = Math.max(0, b - 1); k <= Math.min(N - 1, b + 1); k++) lazyBd(STEPS[k].bd);
    if (b >= 6) preloadWeb(DATA.map(function (_, m) { return 2 * m + 1; }));
    if (b >= 8 && !wall._filled) {
      wall._filled = true;
      wallCards.forEach(function (c, i) { c.li.style.backgroundImage = 'url("' + web(2 * i + 1) + '")'; });
    }
    if (b >= 8) $('art-img').src = web(2 * state.month + 1);
    if (b === 2 && state.burnt !== state.name) burn();
    if (b === 8) setYours(true);
    if (b === 7) setYours(false);
    // the base width follows the largest pose in view, so the calendar is never enlarged past its pixels
    var need = Math.max(P[b].w, prev >= 0 && P[prev] ? 0 : 0, b > 0 ? P[b - 1].w : 0, b < N - 1 ? P[b + 1].w : 0);
    var nw = Math.ceil(need);
    if (nw !== Wb) { Wb = nw; obj.style.setProperty('--w', Wb + 'px'); setEngraveText(state.burnt || state.name, false); }
    navBtns.forEach(function (bt) {
      var j = +bt.getAttribute('data-jump'), next = navBtns[navBtns.indexOf(bt) + 1];
      var end = next ? +next.getAttribute('data-jump') : N;
      bt.classList.toggle('is-on', b >= j && b < end);
    });
    applyFaces();
  }

  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; frame(false); }); } }

  function frame(force) {
    var y = window.scrollY || window.pageYOffset;
    var u = clamp((y - L.top) / L.sh, 0, total - 0.0001);
    var b = 0;
    while (b < N - 1 && u >= cum[b + 1]) b++;
    var t = clamp((u - cum[b]) / STEPS[b].len, 0, 1);
    var docH = L.docH;
    $('progress').style.transform = 'scaleX(' + (docH > 0 ? clamp(y / docH, 0, 1) : 0).toFixed(4) + ')';
    if (b !== state.b) enterStep(b);
    state.t = t;

    var k = reduce ? 1 : ease(t / 0.35);
    var A = P[Math.max(0, b - 1)], B = P[b];
    if (b === 0) A = B;
    var p = {};
    for (var key in B) p[key] = mix(A[key], B[key], k);

    // the sheet turns over in its own window for the steps that are about turning
    var win = b === 3 ? [0.3, 0.75] : b === 14 ? [0.4, 0.8] : [0, 0.35];
    var fk = reduce ? (t >= (win[0] + win[1]) / 2 ? 1 : 0) : ease((t - win[0]) / (win[1] - win[0]));
    var fromFlip = b === 14 ? 0 : A.flip;
    p.flip = mix(fromFlip, B.flip, fk);

    // settings
    var cur = STEPS[b].bd, prevBd = STEPS[Math.max(0, b - 1)].bd;
    for (var name in bds) {
      var v = name === cur ? (prevBd === cur ? 1 : k) : name === prevBd && b > 0 ? 1 - k : 0;
      setOp(bds[name], 'bd-' + name, v);
    }

    // the calendar
    var s = p.w / Wb, persp = Math.max(600, p.w * 3.2);
    obj.style.transformOrigin = (p.fx * Wb).toFixed(1) + 'px ' + (p.fy * Wb).toFixed(1) + 'px';
    obj.style.transform = 'translate3d(' + (p.cx - p.fx * Wb).toFixed(1) + 'px,' + (p.cy - p.fy * Wb).toFixed(1) + 'px,0) perspective(' + persp.toFixed(0) + 'px) rotateX(' + p.rx.toFixed(2) + 'deg) rotateY(' + p.ry.toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
    var e = p.ex, lift = Math.sin(p.flip / 180 * Math.PI) * 0.1 * Wb;
    parts.stack.style.transform = 'translate3d(0,' + (-0.02 * Wb * e).toFixed(1) + 'px,' + (0.07 * Wb * e).toFixed(1) + 'px)';
    parts.wrap.style.transform = 'translate3d(0,' + (-0.06 * Wb * e).toFixed(1) + 'px,' + (1 + 0.17 * Wb * e).toFixed(1) + 'px)';
    parts.base.style.transform = 'translate3d(0,' + (0.07 * Wb * e).toFixed(1) + 'px,' + (2 + 0.05 * Wb * e).toFixed(1) + 'px)';
    parts.peg.style.transform = 'translate3d(' + (0.16 * Wb * e).toFixed(1) + 'px,0,' + (3 + 0.26 * Wb * e).toFixed(1) + 'px)';
    sheet.style.transform = 'translateZ(' + lift.toFixed(1) + 'px) rotateY(' + p.flip.toFixed(2) + 'deg)';
    if ((state.lastFlip < 90) !== (p.flip < 90) && !force) sound.flip();
    state.lastFlip = p.flip;
    obj.setAttribute('aria-label', describe(b, p.flip >= 90));

    // numbered parts in the exploded view
    var pinOn = b === 1 && (reduce || t > 0.2), hot = b === 1 ? clamp(Math.floor((t - 0.25) / 0.17), 0, 3) : -1;
    if (reduce && b === 1) hot = -1;
    pins.forEach(function (pn) { var i = +pn.getAttribute('data-pin'); pn.classList.toggle('is-on', pinOn); pn.classList.toggle('is-hot', pinOn && i === hot); });
    partItems.forEach(function (li, i) { li.classList.toggle('is-on', b === 1 && (reduce || i <= hot)); });

    // months follow the scroll through the themes step, unless picked by hand
    if (b === 9) {
      var mi = reduce ? Math.floor(t * 11.999) : clamp(Math.floor(clamp((t - 0.22) / 0.74, 0, 0.9999) * 12), 0, 11);
      if (mi !== lastScrollMonth) { lastScrollMonth = mi; monthOverride = null; setMonth(mi); }
    } else lastScrollMonth = -1;

    // the phone
    var phoneOn = b === 7 || b === 8 ? (b === 7 ? k : 1) : b === 9 ? 1 - k : 0;
    if (b === 6) phoneOn = 0;
    setOp(phone, 'phone', phoneOn);
    setOp(qrPath, 'path', phoneOn);
    if (phoneOn > 0) {
      var px = L.phoneX + (1 - phoneOn) * 30;
      phone.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + L.phoneY.toFixed(1) + 'px,0)';
      var open = b === 8 || b === 9 || clockFor(t);
      if (b !== 7) clockFor(1);
      if (open !== state.lastOpen) { phone.classList.toggle('is-open', open); if (open && !force) sound.chime(); state.lastOpen = open; }
      if (b === 8 && state.over.yours == null && !phone.classList.contains('is-yours')) setYours(true);
      // the dotted path from the printed QR to the phone
      var qx = p.cx + (0.878 * Wb - p.fx * Wb) * s, qy = p.cy + (1.18 * Wb - p.fy * Wb) * s;
      var ex2 = L.phoneX + (L.mobile ? L.pw * 0.5 : 0), ey2 = L.mobile ? L.phoneY + L.pw * 2.05 : L.phoneY + L.pw * 1.1;
      var midx = (qx + ex2) / 2;
      qrPathD.setAttribute('d', 'M' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' C ' + midx.toFixed(1) + ' ' + (qy + 60).toFixed(1) + ', ' + midx.toFixed(1) + ' ' + (ey2 + 40).toFixed(1) + ', ' + ex2.toFixed(1) + ' ' + ey2.toFixed(1));
    }

    // the postcard
    postcard(b, t, p, s);

    // the wall
    if (b === 13 || (b === 14 && k < 1) || (b === 12 && k < 1)) wallFrame(b === 13 ? (reduce ? 1 : ease(t / 0.5)) : b === 14 ? 1 : 0);

    // labels on the stage
    var chipText = '';
    if (b === 3) chipText = p.flip < 90 ? 'Front · the month' : 'Back · the journal';
    if (b === 14) chipText = p.flip < 90 ? 'Front · twelve frames' : 'Back · a letter to 2027';
    if (chip.textContent !== chipText) chip.textContent = chipText;
    setOp(chip, 'chip', chipText ? 1 : 0);
    if (chipText) {
      var topY = p.cy + (-0.03 * Wb - p.fy * Wb) * s - 46;
      chip.style.transform = 'translate3d(calc(' + p.cx.toFixed(1) + 'px - 50%),' + Math.max(68, topY).toFixed(1) + 'px,0)';
    }
    setOp(cue, 'cue', b === 0 && t < 0.5 ? 1 : 0);
  }

  function postcard(b, t, p, s) {
    var torn = isTorn();
    sheet.classList.toggle('is-torn', torn);
    if (torn !== state.lastTorn) {
      if (torn) sound.rip();
      state.lastTorn = torn;
      strip.classList.add('is-moving');
      clearTimeout(strip._t); strip._t = setTimeout(function () { strip.classList.remove('is-moving'); }, 650);
    }
    var tf = 'none', back = false, fate = '', stripH = TEAR_F * RATIO * Wb;
    if (b === 10 && !torn) {
      var lift = Math.max(state.dragLift, reduce ? 0 : clamp((t - 0.12) / 0.5, 0, 1));
      tf = 'rotate(' + (lift * 7).toFixed(2) + 'deg) translateY(' + (-lift * 0.02 * Wb).toFixed(1) + 'px)';
      if (lift - (state._lift || 0) > 0.07) { sound.crackle(0.4 + lift * 0.6); state._lift = lift; }
      if (lift < (state._lift || 0) - 0.1) state._lift = lift;
    } else if (torn && b <= 12) {
      tf = 'translate3d(' + (-0.03 * Wb).toFixed(1) + 'px,' + (-0.42 * stripH).toFixed(1) + 'px,' + (0.12 * Wb).toFixed(1) + 'px) rotate(-2deg)';
      if (b >= 11) back = state.over.back != null ? state.over.back : (b > 11 || t > (reduce ? 0.3 : 0.35));
      if (b === 12) {
        fate = state.over.fate || '';
        if (fate === 'kept') back = false;
        if (fate === 'sent') tf = 'translate3d(' + (0.04 * Wb).toFixed(1) + 'px,' + (-0.5 * stripH).toFixed(1) + 'px,' + (0.16 * Wb).toFixed(1) + 'px) rotate(3deg)';
      }
    } else if (torn && b === 13) {
      // fly to its place on the wall
      var slot = wallCards[state.month], q = P[13], qs = q.w / Wb;
      var lx = q.fx * Wb + (slot.x - q.cx) / qs, ly = q.fy * Wb + (slot.y - q.cy) / qs, kk = slot.w / Wb;
      var wk = reduce ? 1 : ease((t - 0.2) / 0.5);
      var hx = -0.03 * Wb, hy = -0.42 * stripH;
      var tx = mix(hx, lx - Wb * (1 - kk), wk), ty = mix(hy, ly - stripH * (1 - kk), wk), sc = mix(1, kk, wk);
      tf = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,' + (0.12 * Wb * (1 - wk) + 4).toFixed(1) + 'px) rotate(' + (-2 * (1 - wk)).toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      fate = 'kept';
    }
    strip.style.transform = tf;
    card.style.transform = back ? 'rotateY(180deg)' : '';
    if ((card._back || false) !== back) { card._back = back; sound.flip(0.7); }
    obj.classList.toggle('is-sent', fate === 'sent');
    obj.classList.toggle('is-kept', fate === 'kept');
    if (fate !== state.lastSent) {
      state.lastSent = fate;
      $('fate').textContent = fate === 'sent' ? 'Stamped and on its way.' : fate === 'kept' ? 'Kept, and pinned for the wall.' : '';
      if (fate) sound.slide();
    }
    if (b === 14 && faces.sf._page !== 25) applyFaces();
    if (b === 13 && faces.sf._page === 25) applyFaces();
  }

  function describe(b, back) {
    var m = MONTHS[state.month];
    if (b >= 14) return back ? 'The closing sheet: a letter to the year 2027.' : 'The year-end sheet: twelve photo frames, “moments that felt like a sanctuary”, on the birch board.';
    if (b === 2) return 'The birch band below the ledge, laser-engraved with ' + (state.name || 'elmuse') + '.';
    if (back) return m + ', journal side: a reflection, a reflect prompt with lines, the month’s ritual and a QR code.';
    return m + ', calendar side: the month artwork with its phrase on a perforated postcard strip, above the month grid, on the birch board.';
  }

  /* ---------------- WhatsApp: off until a number is set ---------------- */
  var wa = $('wa'), number = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
  if (!number) {
    wa.disabled = true;
    $('wa-wrap').title = 'The WhatsApp number is not set yet';
    $('wa-note').textContent = 'WhatsApp chat is coming soon. Until then, the enquiry form reaches us directly.';
  }
  wa.addEventListener('click', function () {
    if (!number) return;
    var msg = 'Hello elmuse, I would like to talk about the Sanctuary Calendar for 2027.' + (state.name && state.name !== 'elmuse' ? '\nCompany: ' + state.name : '');
    window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });

  /* ---------------- start ---------------- */
  buildWall();
  setEngraveText('elmuse', false);
  state.burnt = 'elmuse';
  setMonth(0, true);
  renderPhone();
  layout();
  frame(true);
  window.addEventListener('scroll', onScroll, { passive: true });
  var rz = null;
  window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(function () { layout(); frame(true); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setEngraveText(state.burnt || 'elmuse', false); });
})();
