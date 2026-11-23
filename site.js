/* The merged page: routes the shared time to the sections that are near the viewport, applies the first
   time and volume once, marks far sections so their animations pause, and keeps the section index. */
(function () {
  'use strict';
  var ORDER = ['opening', 'polaroid', 'sanctuary', 'distinctive', 'team', 'enquire'];
  var secs = ORDER.map(function (id) { return document.getElementById(id); });

  // Sanctuary relights itself (it owns the bar). The other three take time through their setTime, only when near.
  var units = [
    { api: 'extras', ids: ['opening', 'team', 'enquire'] },
    { api: 'polaroid', ids: ['polaroid'] },
    { api: 'distinctive', ids: ['distinctive'] }
  ].map(function (u) { u.near = {}; u.ids.forEach(function (id) { u.near[id] = true; }); u.pending = null; return u; }); // near until an observer says otherwise
  function apply(u, t) { var a = window[u.api]; if (a && a.setTime) a.setTime(t); u.pending = null; }
  function isNear(u) { return u.ids.some(function (id) { return u.near[id]; }); }

  // registered before every section script: this one handler takes the time event, so no section relights off screen
  window.addEventListener('elmuse:time', function (e) {
    var d = e.detail;
    e.stopImmediatePropagation();
    if (!d || d.t == null) return;
    units.forEach(function (u) { if (isNear(u)) apply(u, d.t); else u.pending = d.t; });
  });

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.id;
        units.forEach(function (u) {
          if (u.ids.indexOf(id) < 0) return;
          u.near[id] = en.isIntersecting;
          if (en.isIntersecting && u.pending != null) apply(u, u.pending);
        });
      });
    }, { rootMargin: '50% 0px' });
    secs.forEach(function (s) { if (s) io.observe(s); });
    var far = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-far', !en.isIntersecting); });
    }, { rootMargin: '25% 0px' });
    secs.forEach(function (s) { if (s) far.observe(s); });
  } else {
    units.forEach(function (u) { u.ids.forEach(function (id) { u.near[id] = true; }); });
  }

  // first time (the visitor's clock, read by Sanctuary) and volume 0, applied to every section once
  document.addEventListener('DOMContentLoaded', function () {
    var t = window.sanctuary && window.sanctuary.getTime ? window.sanctuary.getTime() : 0.33;
    units.forEach(function (u) { apply(u, t); });
    window.dispatchEvent(new CustomEvent('elmuse:volume', { detail: { v: 0, src: 'site' } }));
  });

  /* ---------- section index ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('#site-index a'));
  var tick = 0;
  function mark() {
    tick = 0;
    var mid = window.innerHeight * 0.5, cur = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= mid) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }
  function queue() { if (!tick) tick = requestAnimationFrame(mark); }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  document.addEventListener('DOMContentLoaded', mark);
})();
