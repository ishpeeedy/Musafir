/**
 * The two behaviours the site used to load Bootstrap's JS bundle for: the
 * mobile nav toggle and dismissing a flash message.
 *
 * Worth noting why this exists. The markup carried Bootstrap 4 attributes
 * (`data-toggle`, `data-dismiss`) while the page loaded Bootstrap 5, which
 * renamed them to `data-bs-*`. Whether either control actually did anything
 * depended on the exact alpha in the CDN URL. Binding it here removes the
 * question.
 *
 * Delegated from the document so nothing depends on script order or on the
 * elements existing at parse time.
 */
(function () {
  document.addEventListener("click", function (event) {
    const toggle = event.target.closest("[aria-controls]");
    if (toggle && toggle.hasAttribute("aria-expanded")) {
      const panel = document.getElementById(toggle.getAttribute("aria-controls"));
      if (panel) {
        const open = panel.classList.toggle("show");
        toggle.setAttribute("aria-expanded", String(open));
        return;
      }
    }

    const dismiss = event.target.closest("[data-dismiss]");
    if (dismiss) {
      const alert = dismiss.closest(".alert");
      if (alert) alert.remove();
    }
  });
})();
