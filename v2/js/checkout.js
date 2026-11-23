/* Checkout page only: Sigma's cart page with our details form. Guest checkout that ends honestly: payments are not connected yet. */
(function () {
  "use strict";
  const { config, cart, money, photo, imageFor, normaliseOptions, validate, keepOrSend, stepperHTML } = window.Elmuse;
  const form = document.getElementById("checkout-form");
  const status = document.getElementById("checkout-status");
  const rows = document.querySelector("[data-cart-rows]");
  const summary = document.querySelector("[data-summary]");
  const estimate = document.querySelector("[data-estimate]");
  const state = document.getElementById("co-state");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  document.querySelector("[data-price-notice]").hidden = config.pricesConfirmed;

  function rowsHTML(t) {
    if (!t.count) return '<div class="cart-row"><p class="ui bold">You have no items in your cart.</p></div>';
    return t.lines.map((l) => {
      const p = config.products[l.productId];
      const opts = normaliseOptions(l.productId, l.options);
      const ref = imageFor(l.productId, l.options);
      return `<div class="cart-row" data-line="${esc(l.key)}">
        <div class="cart-row__item">
          <div class="cart-row__img"><img src="${photo(ref).src}" alt="" style="object-fit: ${ref.includes("/") ? "contain" : "cover"}"></div>
          <div class="cart-row__info">
            <p class="cart-row__name">${esc(p.name)}</p><p>2027 calendar</p>
            ${p.options.map((g) => `<p>${esc(g.label)}:</p><p>${esc(g.choices.find((c) => c.value === opts[g.group]).label)}</p>`).join("")}
            <button type="button" class="cart-row__remove ui" data-remove-line aria-label="Remove ${esc(p.name)}">Remove</button>
          </div>
        </div>
        <p>${money(l.unit)}</p>
        <div>${stepperHTML(l.qty, `Quantity of ${p.name}`, "stepper--compact")}</div>
        <p>${money(l.total)}</p>
      </div>`;
    }).join("");
  }

  const summaryHTML = (t) => `
    <div class="summary__row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
    <div class="summary__row"><span>Delivery ${t.region === "india" ? "in India" : "abroad"}</span><span>${t.count ? (t.shipping ? money(t.shipping) : "Free") : money(0)}</span></div>
    <div class="summary__row"><span>Order total</span><span>${money(t.total)}</span></div>`;

  function applyRegion(region) {
    document.querySelectorAll("input[name=cart-region]").forEach((r) => { r.checked = r.value === region; });
    form.querySelectorAll("[data-region-only]").forEach((el) => { el.hidden = el.dataset.regionOnly !== region; });
    state.required = region === "india";
    estimate.textContent = `${config.delivery.line}. ${region === "india" ? config.delivery.india : config.delivery.international}.`;
  }

  cart.subscribe((s, t) => {
    // Re-render rows only when the lines change, so a focused stepper keeps its focus while you step.
    const sig = t.lines.map((l) => `${l.key}:${l.qty}`).join(",");
    if (rows.dataset.sig !== sig) { rows.innerHTML = rowsHTML(t); rows.dataset.sig = sig; }
    summary.innerHTML = summaryHTML(t);
    applyRegion(s.region);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    const t = cart.totals();
    if (!t.count) {
      status.innerHTML = 'Your cart is empty. <a class="link" href="calendars.html">Choose a calendar</a> first.';
      status.focus();
      return;
    }
    if (!validate(form)) return;
    if (!config.endpoints.checkout) {
      await keepOrSend(form, "checkout");
      status.innerHTML = '<div class="notice notice--success"><p>Payments are not connected yet. Nothing was charged. Your details and this order are saved on this device only, so you will not need to type them again.</p></div>';
      status.focus();
    }
  });
})();
