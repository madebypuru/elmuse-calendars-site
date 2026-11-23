/* questions.html only. The questions and answers are static HTML; site.js runs the tabs. A link to a topic or a question opens its tab. */
(function () {
  "use strict";
  function openFromHash() {
    const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const panel = target && target.closest(".panel");
    if (!panel) return;
    document.querySelector(`[data-tab="${CSS.escape(panel.id)}"]`).click();
    target.scrollIntoView();
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();
})();
