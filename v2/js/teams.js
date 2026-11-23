/* teams.html only. Needs config.js and site.js first. */
(function () {
  "use strict";
  const { validate, keepOrSend, contactWays } = window.Elmuse;
  const MAX_LOGO_BYTES = 10 * 1024 * 1024;
  const LOGO_TYPES = /\.(svg|pdf|ai|eps|png)$/i;
  const PLAN_LINES = {
    clients: "For clients, Sanctuary carries your logo on the birch board, so it sits on their desk all year.",
    team: "For your team, each month's QR can open your own messages.",
    both: "We can make one edition for your clients and another for your team."
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="img/icons/${name}.svg#i"></use></svg>`;
  const ways = contactWays();
  const otherWays = ways ? ` You can also reach us on ${ways}.` : "";

  const form = document.getElementById("enquiry-form");
  const status = document.getElementById("enquiry-status");
  const planLine = form.querySelector("[data-plan-line]");
  form.addEventListener("change", (e) => { if (e.target.name === "plan") planLine.textContent = PLAN_LINES[e.target.value] || ""; });

  const date = document.getElementById("q-date");
  const now = new Date();
  date.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const group = form.querySelector("[data-check-group]");
  const groupErr = document.getElementById("q-cal-err");
  const checks = [...group.querySelectorAll("input[type=checkbox]")];
  function checkGroup() {
    const ok = checks.some((c) => c.checked);
    group.setAttribute("aria-invalid", String(!ok));
    groupErr.textContent = ok ? "" : "Please pick at least one, or Not sure yet.";
    return ok;
  }
  group.addEventListener("change", () => { if (group.hasAttribute("aria-invalid")) checkGroup(); });

  const file = document.getElementById("q-logo");
  const fileName = form.querySelector("[data-file-name]");
  const fileClear = form.querySelector("[data-file-clear]");
  const fileErr = document.getElementById("q-logo-err");
  function checkFile() {
    const f = file.files[0];
    let msg = "";
    if (f && !LOGO_TYPES.test(f.name)) msg = "Please choose an SVG, PDF, AI, EPS or PNG file.";
    else if (f && f.size > MAX_LOGO_BYTES) msg = "That file is over 10 MB. Send a smaller one, or send it later by email.";
    fileErr.textContent = msg;
    file.setAttribute("aria-invalid", String(Boolean(msg)));
    return !msg;
  }
  function showFile() {
    const f = file.files[0];
    fileName.textContent = f ? f.name : "No file chosen";
    fileClear.hidden = !f;
    checkFile();
  }
  file.addEventListener("change", showFile);
  fileClear.addEventListener("click", () => { file.value = ""; showFile(); file.focus(); });

  function say(html, ok) {
    status.innerHTML = `<div class="notice${ok ? " notice--success" : ""}">${icon(ok ? "check" : "alert")}<p>${html}</p></div>`;
    status.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    const groupOk = checkGroup();
    const fileOk = checkFile();
    const fieldsOk = validate(form);
    if (!fieldsOk || !groupOk || !fileOk) {
      const bad = [!fieldsOk && document.activeElement, !groupOk && checks[0], !fileOk && file].filter(Boolean);
      bad.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))[0].focus();
      return;
    }

    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const { sent } = await keepOrSend(form, "enquiry");
      if (sent) say(`Thank you, ${esc(form.elements.name.value.trim())}. We'll write to ${esc(form.elements.email.value.trim())}.`, true);
      else say(`This form isn't connected yet, so nothing was sent. Your answers are kept on this device and still in the form.${otherWays}`);
    } catch {
      say(`That didn't send. Your answers are still in the form. Please try again.${otherWays}`);
    } finally {
      button.disabled = false;
    }
  });
})();
