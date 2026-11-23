/* Distinctive product page. site.js runs the buy box, gallery, tabs and related cells; this file keeps the
   meta line, the drawn-to-scale view and the month crops in step with the chosen sheet. */
(function () {
  "use strict";
  const E = window.Elmuse;
  const ID = "distinctive";
  const form = document.querySelector(`[data-product-form="${ID}"]`);
  const images = E.config.products[ID].images;
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* Each orientation in one place. Room units are inches (viewBox 150 × 100, floor at y 94), the sheet centred
     57 in above the floor and 92 in from the left. Crops are pixel windows on the 2000 px print files, measured
     from the grid: horizontal months are rows 80.8 px tall from y 287, vertical months are columns 99.4 px wide
     from x 70 under a header from y 306. Each window holds the month with its neighbours, cut on the grid lines. */
  const SHEET = {
    horizontal: {
      meta: "Wall planner, 3 × 2 ft",
      inches: [36, 24],
      dims: ["3 ft · 91 cm", "2 ft · 61 cm"],
      crop: (i) => ({ x: 64, y: 287 + clamp(i - 1, 0, 8) * 80.8, w: 486, h: 323 })
    },
    vertical: {
      meta: "Wall planner, 2 × 3 ft",
      inches: [24, 36],
      dims: ["2 ft · 61 cm", "3 ft · 91 cm"],
      crop: (i) => ({ x: 70 + clamp(i - 1, 0, 9) * 99.4, y: 306, w: 299, h: 464 })
    }
  };
  const ROOM = { cx: 92, cy: 94 - 57, vw: 150, vh: 100 };
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  const chosen = () => {
    const opts = {};
    form.querySelectorAll("input[type=radio]:checked").forEach((r) => { opts[r.name] = r.value; });
    return E.normaliseOptions(ID, opts);
  };

  /* ---------- Drawn to scale ---------- */
  const scale = document.querySelector("[data-dx-scale]");
  function drawRoom(hang, src, label) {
    const [w, h] = SHEET[hang].inches;
    const x = ROOM.cx - w / 2, y = ROOM.cy - h / 2;
    const box = { x, y, width: w, height: h };
    ["[data-dx-room-sheet]", "[data-dx-room-frame]"].forEach((sel) => {
      const el = scale.querySelector(sel);
      Object.entries(box).forEach(([k, v]) => el.setAttribute(k, v));
    });
    scale.querySelector("[data-dx-room-sheet]").setAttribute("href", src);
    const top = y - 2.5, right = x + w + 2.5;
    scale.querySelector("[data-dx-room-w]").setAttribute("d", `M${x} ${top} H${x + w} M${x} ${top - 1} V${top + 1} M${x + w} ${top - 1} V${top + 1}`);
    scale.querySelector("[data-dx-room-h]").setAttribute("d", `M${right} ${y} V${y + h} M${right - 1} ${y} H${right + 1} M${right - 1} ${y + h} H${right + 1}`);
    const [dw, dh] = SHEET[hang].dims;
    const wl = scale.querySelector('[data-dx-dim="w"]'), hl = scale.querySelector('[data-dx-dim="h"]');
    wl.textContent = dw;
    hl.textContent = dh;
    Object.assign(wl.style, { left: `${(ROOM.cx / ROOM.vw) * 100}%`, top: `${((top - 1.5) / ROOM.vh) * 100}%` });
    Object.assign(hl.style, { left: `${((right + 2) / ROOM.vw) * 100}%`, top: `${(ROOM.cy / ROOM.vh) * 100}%` });
    scale.querySelector("[data-dx-room]").setAttribute("aria-label",
      `Drawn to scale: the ${label} sheet, ${dw.split(" · ")[0]} wide and ${dh.split(" · ")[0]} tall, hung over a desk 30 in high beside a door 6 ft 8 in tall`);
  }

  /* ---------- The months: twelve crops of the chosen print file ---------- */
  const monthsEl = document.querySelector("[data-dx-months]");
  monthsEl.innerHTML = MONTHS.map((m, i) => {
    const first = new Date(2027, i, 1).getDay();
    const days = new Date(2027, i + 1, 0).getDate();
    return `<figure class="sample"><img alt=""><div class="spec-row"><span>${m}</span><span>${days} days, starting on a ${WEEKDAYS[first]}</span></div></figure>`;
  }).join("");
  const sampleImgs = [...monthsEl.querySelectorAll("img")];
  let cropToken = 0;
  async function cropMonths(hang, src, label) {
    const token = ++cropToken;
    const sheet = new Image();
    sheet.src = src;
    try { await sheet.decode(); } catch { return; }
    if (token !== cropToken) return;
    sampleImgs.forEach((img, i) => {
      const c = SHEET[hang].crop(i);
      const canvas = document.createElement("canvas");
      canvas.width = c.w;
      canvas.height = c.h;
      canvas.getContext("2d").drawImage(sheet, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
      img.width = c.w;
      img.height = c.h;
      img.src = canvas.toDataURL("image/webp", 0.9);
      img.alt = `${MONTHS[i]} on the ${label} sheet, close up`;
    });
  }

  /* ---------- Keep everything on the chosen sheet ---------- */
  const helperFor = (group) => form.querySelector(`input[name="${group}"]`).closest(".option").querySelector(".helper");
  const colourHelper = helperFor("colour");
  const colourHelperText = colourHelper.textContent;
  let shown = "";
  function sync() {
    const opts = chosen();
    const hang = opts.orientation;
    // The artwork edition has no file yet: show the green sheet in the chosen orientation, and say so.
    const shownColour = images[`${hang}-${opts.colour}`] ? opts.colour : "green";
    const src = images[`${hang}-${shownColour}`];
    const label = E.optionLabels(ID, { ...opts, colour: shownColour }).slice().reverse().join(", ").toLowerCase();
    const lead = form.querySelector("img[data-product-image]");
    if (lead.getAttribute("src") !== src) {
      E.setImage(lead, src);
      const thumb = form.querySelector(".gallery__thumb img");
      if (thumb) thumb.src = src;
    }
    lead.alt = `The ${label} sheet`;
    form.querySelector("[data-dx-meta]").textContent = SHEET[hang].meta;
    colourHelper.textContent = opts.colour === "artwork" ? "There is no picture of the artwork edition yet." : colourHelperText;
    if (shown === src + hang) return;
    shown = src + hang;
    drawRoom(hang, src, label);
    cropMonths(hang, src, label);
  }
  // On document, so it runs after site.js has swapped the lead slide.
  document.addEventListener("change", (e) => { if (e.target.type === "radio" && form.contains(e.target)) sync(); });
  sync();
})();
