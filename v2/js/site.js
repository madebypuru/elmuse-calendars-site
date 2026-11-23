/* elmuse 2027 calendars, v2 shared behaviour. Shared file: page builders read, never edit.
   Load after config.js. Exposes window.Elmuse. Page code goes in js/<page>.js. */
(function () {
  "use strict";
  const config = window.ELMUSE_CONFIG;
  const root = document.documentElement;
  const KEYS = { cart: "elmuse.cart.v1", kept: "elmuse.kept." };

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: state lives for this page only */ } }
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: config.currency, maximumFractionDigits: 0 });
  const money = (n) => inr.format(n);
  const PRICE_NOTE = "Prices are placeholders until the studio confirms them.";

  /* ---------- Images ----------
     A manifest id maps to img/<first word of id>/<id>-<size>.webp by convention. Anything with a "/" is a path.
     The "-1200"/"-2400" names are the long side, so a 4:5 file is 960/1920 wide. Real widths come from
     img/manifest.json; until it loads, the long side is assumed, and every srcset is corrected once it arrives. */
  const widths = new Map(); // id -> width of the large file
  const srcsetFor = (base, w) => `${base}-1200.webp ${Math.round(w / 2)}w, ${base}-2400.webp ${w}w`;
  function photo(ref) {
    if (ref.includes("/")) return { src: ref, srcset: "" };
    const dir = ref.split("-")[0];
    const base = `img/${dir}/${ref}`;
    return { src: `${base}-1200.webp`, srcset: srcsetFor(base, widths.get(ref) || 2400) };
  }
  fetch("img/manifest.json").then((r) => r.json()).then((m) => {
    (m.images || []).forEach((im) => widths.set(im.id, im.width));
    document.querySelectorAll("img[srcset]").forEach((img) => {
      const hit = img.getAttribute("srcset").match(/img\/[a-z]+\/([a-z0-9-]+)-1200\.webp/);
      if (!hit || !widths.has(hit[1])) return;
      const base = img.getAttribute("srcset").match(/(\S*img\/[a-z]+\/[a-z0-9-]+)-1200\.webp/)[1];
      img.srcset = srcsetFor(base, widths.get(hit[1]));
    });
  }).catch(() => { /* no manifest: the long-side widths stand */ });
  function setImage(img, ref) {
    const p = photo(ref);
    if (p.srcset) img.srcset = p.srcset; else img.removeAttribute("srcset");
    img.src = p.src;
  }

  /* ---------- Products ---------- */
  const product = (id) => {
    const p = config.products[id];
    if (!p) throw new Error(`Unknown product "${id}" (see js/config.js)`);
    return p;
  };
  // Complete an option map with each group's first choice, in config order.
  function normaliseOptions(id, options = {}) {
    const out = {};
    for (const g of product(id).options) {
      const valid = g.choices.some((c) => c.value === options[g.group]);
      out[g.group] = valid ? options[g.group] : g.choices[0].value;
    }
    return out;
  }
  function price(id, options) {
    const p = product(id);
    const opts = normaliseOptions(id, options);
    return p.price + p.options.reduce((sum, g) => sum + (g.choices.find((c) => c.value === opts[g.group]).priceDelta || 0), 0);
  }
  function imageFor(id, options) {
    const p = product(id);
    const opts = normaliseOptions(id, options);
    const combo = p.options.map((g) => opts[g.group]).join("-");
    const single = p.options.map((g) => opts[g.group]).find((v) => p.images[v]);
    return p.images[combo] || (single && p.images[single]) || p.images.default;
  }
  function optionLabels(id, options) {
    const opts = normaliseOptions(id, options);
    return product(id).options.map((g) => g.choices.find((c) => c.value === opts[g.group]).label);
  }

  /* ---------- Cart: one state object, changed only through reduce() ---------- */
  const lineKey = (id, opts) => [id, ...Object.keys(opts).sort().map((k) => `${k}=${opts[k]}`)].join("|");
  const clampQty = (n) => Math.max(1, Math.min(99, Math.round(Number(n)) || 1));
  const emptyCart = () => ({ v: 1, region: "india", lines: [] });

  function reduce(state, action) {
    switch (action.type) {
      case "add": {
        const options = normaliseOptions(action.productId, action.options);
        const key = lineKey(action.productId, options);
        const qty = clampQty(action.qty || 1);
        const found = state.lines.find((l) => l.key === key);
        const lines = found
          ? state.lines.map((l) => (l.key === key ? { ...l, qty: clampQty(l.qty + qty) } : l))
          : [...state.lines, { key, productId: action.productId, options, qty }];
        return { ...state, lines };
      }
      case "setQty": return { ...state, lines: state.lines.map((l) => (l.key === action.key ? { ...l, qty: clampQty(action.qty) } : l)) };
      case "remove": return { ...state, lines: state.lines.filter((l) => l.key !== action.key) };
      case "region": return { ...state, region: action.region === "international" ? "international" : "india" };
      case "clear": return { ...emptyCart(), region: state.region };
      default: return state;
    }
  }
  function loadCart() {
    const s = store.get(KEYS.cart, null);
    if (!s || s.v !== 1 || !Array.isArray(s.lines)) return emptyCart();
    return { ...s, lines: s.lines.filter((l) => config.products[l.productId]) };
  }
  function totals(state) {
    const lines = state.lines.map((l) => ({ ...l, unit: price(l.productId, l.options), total: price(l.productId, l.options) * l.qty }));
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const sh = config.shipping;
    let shipping = 0;
    if (count) shipping = state.region === "international" ? sh.international : (sh.freeIndiaOver && subtotal >= sh.freeIndiaOver ? 0 : sh.india);
    return { lines, subtotal, shipping, total: subtotal + shipping, count, region: state.region };
  }

  let cartState = loadCart();
  const listeners = new Set();
  function dispatch(action) {
    cartState = reduce(cartState, action);
    store.set(KEYS.cart, cartState);
    emit();
  }
  function emit() {
    const t = totals(cartState);
    listeners.forEach((fn) => fn(cartState, t));
    document.dispatchEvent(new CustomEvent("elmuse:cart", { detail: { state: cartState, totals: t } }));
  }
  window.addEventListener("storage", (e) => { if (e.key === KEYS.cart) { cartState = loadCart(); emit(); } });


  /* ---------- Mode: page code may read it; the UI has no switch (Sigma has none) ---------- */
  const mode = document.body.dataset.mode === "teams" ? "teams" : "personal";

  /* ---------- Icons: one SVG file per symbol in img/icons, drawn with currentColor ---------- */
  const icon = (name, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="img/icons/${name}.svg#i"></use></svg>`;

  /* ---------- Promo bar, header, dropdown, phone menu, product sub-bar, footer (Sigma's, measured) ---------- */
  const here = location.pathname.split("/").pop() || "index.html";
  const current = (href) => (href === here ? ' aria-current="page"' : "");
  const CALENDARS = Object.values(config.products);
  const NAV = [
    { label: "Calendars", href: "calendars.html", panel: [...CALENDARS.map((p) => [p.name, p.page]), ["All calendars", "calendars.html"]] },
    { label: "Stories", href: "stories.html" },
    { label: "Questions", href: "questions.html" },
    { label: "For teams", href: "teams.html" }
  ];
  const wordmark = (w, h) => `<img src="img/brand/elmuse-wordmark.svg" alt="" width="${w}" height="${h}">`;
  const pageProduct = config.products[document.body.dataset.page] || null;

  function renderPromo(header) {
    const bar = document.createElement("div");
    bar.className = "promo";
    bar.innerHTML = `<p class="promo__text">${esc(config.delivery.line)}</p><a class="promo__link" href="calendars.html">See the calendars</a>`;
    header.before(bar);
  }

  function renderHeader(el) {
    el.classList.add("site-header");
    el.innerHTML = `
      <div class="site-header__bar">
        <nav class="site-nav desk-only" aria-label="Main">${NAV.map((n) => `<a class="nav-item" href="${n.href}"${current(n.href)}${n.panel ? ' data-mega aria-controls="mega" aria-expanded="false"' : ""}>${n.label}</a>`).join("")}</nav>
        <div class="phone-only"><button type="button" class="nav-item" data-menu-open aria-controls="site-menu" aria-expanded="false">Menu</button></div>
        <a class="logo" href="index.html" aria-label="elmuse, home">${wordmark(95, 20)}</a>
        <div class="site-utils"><button type="button" class="nav-item" data-open-cart aria-haspopup="dialog">Cart (<span data-cart-count>0</span>)</button></div>
      </div>
      <div class="mega desk-only" id="mega"><ul class="mega__list">${NAV[0].panel.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>`;
    bindMega(el.querySelector("[data-mega]"), el.querySelector(".mega"));
  }

  // Hover or focus opens the panel; leaving both the item and the panel closes it (the delay is in the CSS).
  function bindMega(trigger, panel) {
    let timer;
    const set = (open) => {
      clearTimeout(timer);
      panel.classList.toggle("is-open", open);
      trigger.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    };
    const later = () => { timer = setTimeout(() => set(false), 50); };
    [trigger, panel].forEach((n) => {
      n.addEventListener("mouseenter", () => set(true));
      n.addEventListener("mouseleave", later);
      n.addEventListener("focusin", () => set(true));
      n.addEventListener("focusout", (e) => { if (!trigger.contains(e.relatedTarget) && !panel.contains(e.relatedTarget)) set(false); });
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) { set(false); trigger.focus(); } });
  }

  const sheet = document.createElement("div");
  function renderSheet() {
    sheet.className = "sheet";
    sheet.id = "site-menu";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "Menu");
    sheet.innerHTML = `
      <div class="sheet__bar"><span class="nav-item" aria-hidden="true">Menu</span><button type="button" class="nav-item" data-menu-close>Close</button></div>
      <nav class="sheet__body" aria-label="Main"><ul class="sheet__l1">${NAV.map((n, i) => n.panel
        ? `<li><div class="sheet__row"><a href="${n.href}">${n.label}</a><button type="button" class="sheet__toggle" aria-expanded="false" aria-controls="sheet-l2-${i}" aria-label="Show the ${n.label.toLowerCase()}"></button></div>
           <div class="sheet__l2" id="sheet-l2-${i}"><ul>${n.panel.map(([t, h]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul></div></li>`
        : `<li><a href="${n.href}">${n.label}</a></li>`).join("")}</ul></nav>`;
    document.body.append(sheet);
    sheet.querySelectorAll(".sheet__toggle").forEach((b) => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      const l2 = document.getElementById(b.getAttribute("aria-controls"));
      b.setAttribute("aria-expanded", String(open));
      l2.style.height = open ? `${l2.scrollHeight}px` : "0px";
    }));
  }

  // Sigma's sub-bar hides while the spec band (#details) sits under it, where the band's own sticky tabs take over.
  function renderSubbar(header) {
    if (!pageProduct) return;
    const bar = document.createElement("div");
    bar.className = "subbar";
    bar.innerHTML = `<p>${esc(pageProduct.name)} | 2027</p><nav class="subbar__links" aria-label="On this page"><a href="#details">Details</a><a href="#buy-now">Buy now</a></nav>`;
    header.after(bar);
    const band = document.getElementById("details");
    if (!band) return;
    const sync = () => { const r = band.getBoundingClientRect(); bar.classList.toggle("is-hidden", r.top < 96 && r.bottom > 48); };
    addEventListener("scroll", sync, { passive: true });
    sync();
  }

  function renderFooter(el) {
    el.classList.add("site-footer");
    const cols = [
      ["Calendars", `${CALENDARS.map((p) => `<a href="${p.page}">${esc(p.name)}</a>`).join("")}<a href="calendars.html">All calendars</a>`],
      ["Help", '<a href="questions.html">Questions</a><button type="button" class="link" data-open-cart aria-haspopup="dialog">Cart</button><a href="checkout.html">Checkout</a>'],
      ["Studio", '<a href="stories.html">Stories</a><a href="teams.html">For teams</a>'],
      ["Contact", `<a data-whatsapp="Hi elmuse, I have a question about the 2027 calendars.">WhatsApp</a><p data-email></p><p class="site-footer__line">${esc(config.contact.address)}</p>`]
    ];
    el.innerHTML = `
      <a class="site-footer__mark" href="index.html" aria-label="elmuse, home">${wordmark(160, 33)}</a>
      <div class="site-footer__cols">${cols.map(([h, links]) => `<nav class="site-footer__col" aria-label="${h}"><h2 class="site-footer__head">${h}</h2><div>${links}</div></nav>`).join("")}</div>
      <p class="site-footer__copy">© ${new Date().getFullYear()} elmuse. All rights reserved.</p>`;
  }

  /* ---------- Cart drawer (Sigma minicart) ---------- */
  const cartEl = document.createElement("aside");
  const scrim = document.createElement("div");
  function renderCartShell() {
    scrim.className = "scrim";
    scrim.dataset.closeCart = "";
    cartEl.className = "drawer";
    cartEl.id = "cart";
    cartEl.setAttribute("role", "dialog");
    cartEl.setAttribute("aria-modal", "true");
    cartEl.setAttribute("aria-labelledby", "cart-title");
    cartEl.innerHTML = `
      <div class="drawer__head"><h2 id="cart-title">Cart</h2><button type="button" class="drawer__close" data-close-cart>Close</button></div>
      <div class="drawer__body" data-cart-body></div>
      <div class="drawer__foot" data-cart-foot></div>`;
    document.body.append(scrim, cartEl);
  }

  // A manifest id is a photograph (cover); a path is a cut-out or print file (contain).
  const fits = (ref) => (ref.includes("/") ? "contain" : "cover");

  function renderCart(state, t) {
    const body = cartEl.querySelector("[data-cart-body]");
    const foot = cartEl.querySelector("[data-cart-foot]");
    body.innerHTML = t.count ? t.lines.map((l) => {
      const p = product(l.productId);
      const opts = normaliseOptions(l.productId, l.options);
      const optLines = p.options.map((g) => `<span>${esc(g.label)}:</span><span>${esc(g.choices.find((c) => c.value === opts[g.group]).label)}</span>`).join("");
      const ref = imageFor(l.productId, l.options);
      return `<div class="mini-line" data-line="${esc(l.key)}">
        <div class="mini-line__img"><img src="${photo(ref).src}" alt="" style="object-fit: ${fits(ref)}" loading="lazy"></div>
        <div class="mini-line__info">
          <span class="mini-line__name">${esc(p.name)}</span><span>2027 calendar</span>${optLines}
          <div class="mini-line__row">${stepperHTML(l.qty, `Quantity of ${p.name}`, "stepper--compact")}<span class="mini-line__price">${money(l.total)}</span></div>
          <div class="mini-line__actions"><a href="${p.page}">Edit</a><button type="button" data-remove-line aria-label="Remove ${esc(p.name)}">Remove</button></div>
        </div>
      </div>`;
    }).join("") : '<p class="drawer__empty">You have no items in your cart.</p>';
    foot.innerHTML = t.count ? `
      ${config.pricesConfirmed ? "" : `<p class="drawer__note price-note">${PRICE_NOTE}</p>`}
      <div class="drawer__total"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      <a class="btn btn--block" href="checkout.html">Proceed to checkout</a>` : "";
  }

  function stepperHTML(qty, label, extra = "") {
    return `<div class="stepper ${extra}" data-stepper>
      <button type="button" class="stepper__btn" data-step="-1" aria-label="One fewer">${icon("minus")}</button>
      <input class="stepper__input" type="number" inputmode="numeric" min="1" max="99" value="${qty}" aria-label="${esc(label)}">
      <button type="button" class="stepper__btn" data-step="1" aria-label="One more"${qty >= 99 ? " disabled" : ""}>${icon("plus")}</button>
    </div>`;
  }

  function updateCounts(state, t) {
    document.querySelectorAll("[data-cart-count]").forEach((el) => { el.textContent = String(t.count); });
  }

  /* ---------- Drawer and menu: open, close, focus kept inside ---------- */
  let lastFocus = null;
  const openLayer = () => (root.classList.contains("cart-is-open") ? cartEl : sheet.classList.contains("is-open") ? sheet : null);
  function openCart() {
    lastFocus = document.activeElement;
    root.classList.add("cart-is-open");
    cartEl.querySelector(".drawer__close").focus({ preventScroll: true });
  }
  function closeCart() {
    root.classList.remove("cart-is-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function setMenu(open) {
    if (open) lastFocus = document.activeElement;
    sheet.classList.toggle("is-open", open);
    document.querySelectorAll("[data-menu-open]").forEach((b) => b.setAttribute("aria-expanded", String(open)));
    if (open) sheet.querySelector("[data-menu-close]").focus({ preventScroll: true });
    else if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", (e) => {
    const layer = openLayer();
    if (!layer) return;
    if (e.key === "Escape") { e.preventDefault(); if (layer === cartEl) closeCart(); else setMenu(false); return; }
    if (e.key !== "Tab") return;
    const f = [...layer.querySelectorAll("a[href], button:not([disabled]), input:not([disabled])")].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* ---------- Gallery (Sigma Fotorama: 4:5 stage, arrows, thumbs; dots on phones) ----------
     <div class="gallery" data-gallery><div class="gallery__track"><div class="gallery__slide"><img …></div>…</div></div>
     site.js adds the stage, arrows, thumbnails and dots. A slide holding a print file or cut-out adds gallery__slide--file. */
  function bindGallery(g) {
    const track = g.querySelector(".gallery__track");
    if (!track) return; // older page markup without a track: leave it alone
    const slides = [...track.children];
    const stage = document.createElement("div");
    stage.className = "gallery__stage";
    track.before(stage);
    stage.append(track);
    stage.insertAdjacentHTML("beforeend", `<button type="button" class="gallery__arrow gallery__arrow--prev" aria-label="Previous picture">${icon("chevron-left")}</button><button type="button" class="gallery__arrow gallery__arrow--next" aria-label="Next picture">${icon("chevron-right")}</button>`);
    const label = (i) => `Picture ${i + 1} of ${slides.length}`;
    g.insertAdjacentHTML("beforeend", `
      <div class="gallery__thumbs">${slides.map((s, i) => `<button type="button" class="gallery__thumb${s.classList.contains("gallery__slide--file") ? " gallery__thumb--file" : ""}" aria-label="${label(i)}"><img src="${s.querySelector("img").getAttribute("src")}" alt="" loading="lazy"></button>`).join("")}</div>
      <div class="gallery__dots">${slides.map((s, i) => `<button type="button" class="gallery__dot" aria-label="${label(i)}"></button>`).join("")}</div>`);
    const thumbs = [...g.querySelectorAll(".gallery__thumb")];
    const dots = [...g.querySelectorAll(".gallery__dot")];
    const [prev, next] = stage.querySelectorAll(".gallery__arrow");
    const index = () => Math.round(track.scrollLeft / (track.clientWidth || 1));
    const go = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    const sync = () => {
      const i = index();
      [thumbs, dots].forEach((set) => set.forEach((b, k) => { b.classList.toggle("is-active", k === i); b.toggleAttribute("aria-current", k === i); }));
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    };
    prev.addEventListener("click", () => go(index() - 1));
    next.addEventListener("click", () => go(index() + 1));
    [thumbs, dots].forEach((set) => set.forEach((b, k) => b.addEventListener("click", () => go(k))));
    track.addEventListener("scroll", sync, { passive: true });
    sync();
    g.elmuseGo = go;
  }

  /* ---------- Vertical tabs (Sigma spec band) ----------
     <div class="tabs" role="tablist" aria-orientation="vertical" data-tabs><button class="tab" role="tab" data-tab="panel-id">…</button>…</div>
     and <div class="panel" role="tabpanel" id="panel-id">…</div> for each. */
  function bindTabs(list) {
    const tabs = [...list.querySelectorAll("[data-tab]")];
    const select = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute("aria-selected", String(on));
        x.setAttribute("aria-controls", x.dataset.tab);
        x.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(x.dataset.tab);
        if (panel) panel.hidden = !on;
      });
      if (focus) t.focus();
    };
    tabs.forEach((t) => t.addEventListener("click", () => select(t)));
    list.addEventListener("keydown", (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      const i = tabs.indexOf(document.activeElement);
      select(tabs[(i + step + tabs.length) % tabs.length], true);
    });
    select(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
  }

  /* ---------- Product forms: options, swap, price, add ----------
     A [data-product-form="<id>"] wraps radios named by option group, an optional quantity stepper,
     [data-product-image] (img that swaps), [data-price] (text that updates in place) and [data-add-to-cart]. */
  function readOptions(form) {
    const opts = {};
    form.querySelectorAll("input[type=radio]:checked").forEach((r) => { opts[r.name] = r.value; });
    return opts;
  }
  function syncProductForm(form, fromChange) {
    const id = form.dataset.productForm;
    const opts = readOptions(form);
    form.querySelectorAll("[data-price]").forEach((el) => { el.textContent = money(price(id, opts)); });
    form.querySelectorAll("img[data-product-image]").forEach((img) => {
      const ref = imageFor(id, opts);
      setImage(img, ref);
      const slide = img.closest(".gallery__slide");
      const g = img.closest("[data-gallery]");
      if (!slide || !g) return;
      slide.classList.toggle("gallery__slide--file", ref.includes("/"));
      const k = [...slide.parentElement.children].indexOf(slide);
      const thumb = g.querySelectorAll(".gallery__thumb")[k];
      if (thumb) { thumb.querySelector("img").src = photo(ref).src; thumb.classList.toggle("gallery__thumb--file", ref.includes("/")); }
      if (fromChange && g.elmuseGo) g.elmuseGo(k);
    });
  }
  function preloadChoices(form) {
    if (form.dataset.preloaded) return;
    form.dataset.preloaded = "1";
    Object.values(product(form.dataset.productForm).images).forEach((ref) => { const im = new Image(); im.src = photo(ref).src; });
  }

  /* Display-only swaps (e.g. preview a month): <fieldset data-swap="#target"> with radios carrying data-image. */
  function syncSwap(fieldset) {
    const target = document.querySelector(fieldset.dataset.swap);
    const checked = fieldset.querySelector("input:checked");
    if (target && checked && checked.dataset.image) setImage(target, checked.dataset.image);
  }

  // Text radios for a product's options, from config. Sigma shows no price in the label; the price updates in place.
  function choicesHTML(id) {
    return product(id).options.map((g) => `<fieldset class="option">
      <legend class="option__label">${esc(g.label)}</legend>
      <div class="radios">${g.choices.map((c, ci) => `<label class="radio"><input type="radio" name="${esc(g.group)}" value="${esc(c.value)}"${ci === 0 ? " checked" : ""}><span class="radio__ring" aria-hidden="true"></span><span>${esc(c.label)}</span></label>`).join("")}</div>
      ${g.helper ? `<p class="helper">${esc(g.helper)}</p>` : ""}
    </fieldset>`).join("");
  }

  // Related products (Sigma "compatible accessories"): <section class="related" data-more="<this page's product id>">
  function moreHTML(currentId) {
    const others = CALENDARS.filter((p) => p.id !== currentId);
    return `<h2 class="related__title">The other calendars</h2>
      <div class="related__cells">${others.map((p) => {
        const ref = p.cutout || p.image;
        return `<a class="related__cell" href="${p.page}"><div class="related__img${ref.includes("/") ? "" : " related__img--photo"}"><img src="${photo(ref).src}" alt="" loading="lazy"></div><p>${esc(p.name)}</p><p>${money(price(p.id, {}))}</p></a>`;
      }).join("")}</div>
      <a class="btn btn--outline" href="calendars.html">View all calendars</a>`;
  }

  function bindPage() {
    document.querySelectorAll("[data-gallery]").forEach(bindGallery);
    document.querySelectorAll("[data-tabs]").forEach(bindTabs);
    document.querySelectorAll("[data-more]").forEach((el) => { el.innerHTML = moreHTML(el.dataset.more); });
    document.querySelectorAll("[data-choices]").forEach((el) => { el.innerHTML = choicesHTML(el.dataset.choices); });
    document.querySelectorAll("[data-price]").forEach((el) => {
      if (!el.closest("[data-product-form]")) el.textContent = money(price(el.dataset.price, {}));
    });
    document.querySelectorAll("[data-product-form]").forEach((f) => syncProductForm(f, false));
    document.querySelectorAll("[data-delivery]").forEach((el) => { el.textContent = config.delivery.line; });
    document.querySelectorAll("[data-price-note]").forEach((el) => { el.hidden = config.pricesConfirmed; el.textContent = PRICE_NOTE; });
    bindContact();
  }

  // "WhatsApp or email", "WhatsApp", "email" or "", from the routes config actually has.
  function contactWays() {
    return [config.contact.whatsapp.replace(/\D/g, "") && "WhatsApp", config.contact.email && "email"].filter(Boolean).join(" or ");
  }

  // Only routes that exist are shown: an empty number or address in config hides its control entirely.
  // Copy that only makes sense with a route carries [data-if-contact]; its stand-in carries [data-if-no-contact].
  function bindContact() {
    const wa = config.contact.whatsapp.replace(/\D/g, "");
    const email = config.contact.email;
    const ways = contactWays();
    document.querySelectorAll("[data-if-contact]").forEach((el) => { el.hidden = !ways; });
    document.querySelectorAll("[data-if-no-contact]").forEach((el) => { el.hidden = Boolean(ways); });
    document.querySelectorAll("[data-contact-ways]").forEach((el) => { el.textContent = ways; });
    document.querySelectorAll("[data-whatsapp]").forEach((a) => {
      a.hidden = !wa;
      if (wa) { a.href = `https://wa.me/${wa}?text=${encodeURIComponent(a.dataset.whatsapp || "")}`; a.target = "_blank"; a.rel = "noopener"; }
      else a.removeAttribute("href");
    });
    document.querySelectorAll("[data-email]").forEach((el) => {
      el.hidden = !email;
      el.innerHTML = email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : "";
    });
  }

  /* ---------- Steppers (product forms and cart lines) ---------- */
  function stepperSet(stepper, qty) {
    const q = clampQty(qty);
    const input = stepper.querySelector(".stepper__input");
    input.value = q;
    stepper.querySelector('[data-step="1"]').disabled = q >= 99;
    const line = stepper.closest("[data-line]");
    if (line) dispatch({ type: "setQty", key: line.dataset.line, qty: q });
  }

  /* ---------- Event delegation ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-cart], [data-close-cart], [data-add-to-cart], [data-step], [data-remove-line], [data-menu-open], [data-menu-close]");
    if (!t) return;
    if (t.matches("[data-menu-open]")) setMenu(true);
    else if (t.matches("[data-menu-close]")) setMenu(false);
    else if (t.matches("[data-open-cart]")) { if (sheet.classList.contains("is-open")) setMenu(false); openCart(); }
    else if (t.matches("[data-close-cart]")) closeCart();
    else if (t.matches("[data-add-to-cart]")) {
      const form = t.closest("[data-product-form]");
      const qtyInput = form && form.querySelector(".stepper__input");
      dispatch({ type: "add", productId: t.dataset.addToCart, options: form ? readOptions(form) : {}, qty: qtyInput ? qtyInput.value : 1 });
      if (!root.classList.contains("cart-is-open")) openCart();
    }
    else if (t.matches("[data-step]")) {
      const s = t.closest("[data-stepper]");
      const line = s.closest("[data-line]");
      stepperSet(s, Number(s.querySelector(".stepper__input").value) + Number(t.dataset.step));
      if (line) {
        const again = document.querySelector(`[data-line="${CSS.escape(line.dataset.line)}"] [data-step="${t.dataset.step}"]`);
        (again && !again.disabled ? again : cartEl.querySelector(".drawer__close")).focus();
      }
    }
    else if (t.matches("[data-remove-line]")) { dispatch({ type: "remove", key: t.closest("[data-line]").dataset.line }); if (openLayer() === cartEl) cartEl.querySelector(".drawer__close").focus(); }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches(".stepper__input")) stepperSet(t.closest("[data-stepper]"), t.value);
    else if (t.name === "cart-region") dispatch({ type: "region", region: t.value });
    const form = t.closest("[data-product-form]");
    if (form && t.type === "radio") syncProductForm(form, true);
    const swap = t.closest("[data-swap]");
    if (swap) syncSwap(swap);
  });
  ["pointerover", "focusin"].forEach((type) => document.addEventListener(type, (e) => {
    const form = e.target.closest && e.target.closest("[data-product-form]");
    if (form) preloadChoices(form);
  }, { passive: true }));

  /* ---------- Forms: validation and honest submission ---------- */
  const MESSAGES = {
    valueMissing: "Please fill this in.",
    typeMismatch: { email: "That email doesn't look right. Check for an @ and a dot.", tel: "Please check the number.", default: "Please check this." },
    patternMismatch: "Please check the format.",
    tooShort: "This looks a little short.",
    rangeUnderflow: "That's below the minimum.",
    rangeOverflow: "That's above the maximum."
  };
  function messageFor(input) {
    const v = input.validity;
    if (v.valid) return "";
    if (input.dataset.error) return input.dataset.error;
    for (const k of Object.keys(MESSAGES)) {
      if (v[k]) return typeof MESSAGES[k] === "string" ? MESSAGES[k] : (MESSAGES[k][input.type] || MESSAGES[k].default);
    }
    return "Please check this.";
  }
  function showFieldError(input) {
    const field = input.closest(".field");
    const err = field && field.querySelector(".field__error");
    const msg = messageFor(input);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg;
    return !msg;
  }
  function validate(form) {
    let first = null;
    form.querySelectorAll(".field__input").forEach((input) => {
      if (input.disabled || input.closest("[hidden]")) { input.setAttribute("aria-invalid", "false"); return; }
      input.dataset.touched = "1";
      if (!showFieldError(input) && !first) first = input;
    });
    if (first) first.focus();
    return !first;
  }
  document.addEventListener("focusout", (e) => { if (e.target.matches && e.target.matches(".field__input") && e.target.value) { e.target.dataset.touched = "1"; showFieldError(e.target); } });
  document.addEventListener("input", (e) => { if (e.target.matches && e.target.matches(".field__input[data-touched]")) showFieldError(e.target); });

  // Sends to config.endpoints[key]; with no endpoint, keeps the data on this device. Returns { sent, kept }.
  async function keepOrSend(form, key) {
    const fd = new FormData(form);
    // Every value of a repeated name (a checkbox group) is kept; a file is recorded by name, size and type.
    const data = {};
    for (const name of new Set(fd.keys())) {
      const values = fd.getAll(name)
        .map((v) => (v instanceof File ? (v.name ? { name: v.name, size: v.size, type: v.type } : null) : v))
        .filter((v) => v !== null);
      data[name] = values.length > 1 ? values : (values[0] ?? "");
    }
    const url = config.endpoints[key];
    if (!url) {
      const kept = store.get(KEYS.kept + key, []);
      kept.push({ at: new Date().toISOString(), data });
      store.set(KEYS.kept + key, kept);
      return { sent: false, kept: true };
    }
    const hasFile = Boolean(form.querySelector("input[type=file]"));
    const res = await fetch(url, hasFile ? { method: "POST", body: fd } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error(`Send failed (${res.status})`);
    return { sent: true, kept: false };
  }

  /* ---------- Boot ---------- */
  root.dataset.prices = config.pricesConfirmed ? "confirmed" : "placeholder";
  const header = document.querySelector("[data-site-header]");
  const footer = document.querySelector("[data-site-footer]");
  if (header) { renderPromo(header); renderHeader(header); renderSubbar(header); renderSheet(); }
  if (footer) renderFooter(footer);
  renderCartShell();
  listeners.add(renderCart);
  listeners.add(updateCounts);
  bindPage();
  emit();

  window.Elmuse = {
    config, mode, money, photo, setImage,
    price, imageFor, optionLabels, normaliseOptions,
    cart: { get: () => cartState, totals: () => totals(cartState), dispatch, open: openCart, close: closeCart, subscribe: (fn) => { listeners.add(fn); fn(cartState, totals(cartState)); return () => listeners.delete(fn); } },
    validate, keepOrSend, stepperHTML, choicesHTML, icon, contactWays
  };
})();
