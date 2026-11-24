/* elmuse 2027 calendars, v2 home: the In use moodboard and The 1st signup. Prices and chrome come from site.js. */
(function () {
  "use strict";
  const { validate, keepOrSend } = window.Elmuse;

  /* The moodboard. To add a video, drop the file (and a poster still) into img/pages/home/moodboard/ and add
     { kind: "video", src: "img/pages/home/moodboard/name.mp4", poster: "img/pages/home/moodboard/name.webp", alt, r, d, m }.
     r is width / height. d and m are [left, top, width] on the desktop and phone boards, in units of the board's
     width (the desktop board is 62.5 units tall, the phone board 225). */
  const MOOD = [
    { kind: "image", src: "img/sanctuary/sanctuary-hand-sets-sheet-1200.webp", alt: "A hand setting the January sheet on the Sanctuary board", r: 0.8, d: [2, 3, 18], m: [2, 2, 44] },
    { kind: "image", src: "img/polaroid/polaroid-cards-scattered-1200.webp", alt: "Polaroid cards scattered on a table", r: 1.778, d: [23, 6, 26], m: [48, 6, 50] },
    { kind: "image", src: "img/shared/shared-peg-holds-stamp-card-1200.webp", alt: "The peg holding a Polaroid card on the Sanctuary board", r: 0.8, d: [52, 2, 16], m: [56, 38, 40] },
    { kind: "image", src: "img/sanctuary/sanctuary-sheets-golden-hour-1200.webp", alt: "Sanctuary sheets in golden-hour light", r: 1.778, d: [71, 8, 27], m: [2, 62, 50] },
    { kind: "image", src: "img/polaroid/polaroid-card-in-phone-cover-1200.webp", alt: "A Polaroid card behind a clear phone cover", r: 1.778, d: [4, 30, 24], m: [4, 94, 46] },
    { kind: "image", src: "img/sanctuary/sanctuary-peg-todo-note-1200.webp", alt: "A to-do note held by the peg on the board", r: 0.8, d: [31, 25, 15], m: [58, 92, 36] },
    { kind: "image", src: "img/sanctuary/sanctuary-postcard-qr-1200.webp", alt: "The tear-off postcard with its QR code", r: 1.5, d: [49, 27, 22], m: [2, 124, 50] },
    { kind: "image", src: "img/polaroid/polaroid-card-beside-phone-1200.webp", alt: "A Polaroid card beside a phone", r: 0.8, d: [74, 28, 15], m: [60, 141, 34] },
    { kind: "image", src: "img/sanctuary/sanctuary-hands-fan-sheets-1200.webp", alt: "Hands fanning the twelve Sanctuary sheets", r: 1.778, d: [20, 46, 26], m: [6, 160, 48] },
    { kind: "image", src: "img/sanctuary/sanctuary-journal-back-1200.webp", alt: "The journal page on the back of a sheet", r: 0.8, d: [58, 45, 12], m: [60, 188, 28] }
  ];
  const BOARD_H = { d: 62.5, m: 225 };
  const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>';

  const board = document.querySelector("[data-mood]");
  const phone = window.matchMedia("(max-width: 900px)");
  let top = MOOD.length;

  const items = MOOD.map((m) => {
    const el = document.createElement("figure");
    el.className = "mood__item";
    el.tabIndex = 0;
    el.setAttribute("aria-label", m.alt);
    el.style.aspectRatio = String(m.r);
    if (m.kind === "video") {
      el.innerHTML = '<video preload="metadata" playsinline></video><button type="button" class="mood__play" aria-label="Play video">' + PLAY + "</button>";
      const v = el.querySelector("video");
      v.src = m.src;
      if (m.poster) v.poster = m.poster;
      v.addEventListener("ended", () => setPlaying(el, false));
    } else {
      el.innerHTML = '<img alt="" loading="lazy" draggable="false">';
      el.querySelector("img").src = m.src;
    }
    board.appendChild(el);
    return { el, m };
  });

  function place() {
    const key = phone.matches ? "m" : "d";
    items.forEach(({ el, m }) => {
      const [x, y, w] = m[key];
      el.style.left = x + "%";
      el.style.top = (y / BOARD_H[key]) * 100 + "%";
      el.style.width = w + "%";
    });
  }
  place();
  phone.addEventListener("change", place);

  function moveTo(el, left, topPx) {
    const maxX = board.clientWidth - el.offsetWidth;
    const maxY = board.clientHeight - el.offsetHeight;
    el.style.left = (Math.min(Math.max(left, 0), maxX) / board.clientWidth) * 100 + "%";
    el.style.top = (Math.min(Math.max(topPx, 0), maxY) / board.clientHeight) * 100 + "%";
  }

  function setPlaying(el, on) {
    const v = el.querySelector("video");
    const b = el.querySelector(".mood__play");
    if (on) v.play(); else v.pause();
    el.classList.toggle("is-playing", on);
    b.innerHTML = on ? PAUSE : PLAY;
    b.setAttribute("aria-label", on ? "Pause video" : "Play video");
  }

  items.forEach(({ el, m }) => {
    let start = null;
    let dragged = false;

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, left: el.offsetLeft, top: el.offsetTop, id: e.pointerId };
      dragged = false;
    });
    el.addEventListener("pointermove", (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragged) {
        if (Math.hypot(dx, dy) < 4) return;
        dragged = true;
        el.setPointerCapture(e.pointerId);
        el.classList.add("is-dragging");
        el.style.zIndex = ++top;
      }
      moveTo(el, start.left + dx, start.top + dy);
    });
    const end = () => { start = null; el.classList.remove("is-dragging"); };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    el.addEventListener("click", (e) => {
      if (dragged) { dragged = false; e.preventDefault(); return; }
      if (m.kind === "video") setPlaying(el, el.querySelector("video").paused);
    });

    el.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 40 : 8;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      el.style.zIndex = ++top;
      moveTo(el, el.offsetLeft + d[0], el.offsetTop + d[1]);
    });
  });

  /* The 1st: signups are kept through keepOrSend until config.endpoints.waitlist is set. */
  const form = document.getElementById("letter-form");
  const status = document.getElementById("letter-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate(form)) return;
    if (!form.consent.checked) {
      status.textContent = "Tick the box to agree to receive the letter.";
      form.consent.focus();
      return;
    }
    try {
      const { sent } = await keepOrSend(form, "waitlist");
      status.textContent = sent
        ? "Thank you. The next letter will reach you on the 1st."
        : "The letter is not connected yet. Your email is saved on this device only, and nothing was sent.";
    } catch (err) {
      status.textContent = "That did not go through. Please try again.";
    }
    status.focus();
  });
})();
