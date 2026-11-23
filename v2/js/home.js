/* elmuse 2027 calendars, v2 home: the studio letter form. Prices and chrome come from site.js. */
(function () {
  "use strict";
  const { validate, keepOrSend } = window.Elmuse;
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
        ? "Thank you. The next letter will reach you."
        : "The letter is not connected yet. Your email is saved on this device only, and nothing was sent.";
    } catch (err) {
      status.textContent = "That did not go through. Please try again.";
    }
    status.focus();
  });
})();
