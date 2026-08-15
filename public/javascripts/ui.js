/**
 * Dismissing a flash message.
 *
 * This used to also carry the mobile nav toggle. The navbar no longer collapses
 * (it is small enough not to need to), so that half is gone along with the
 * hamburger, .navbar-collapse, and the aria-controls binding.
 *
 * Delegated from the document so nothing depends on script order or on the
 * element existing at parse time.
 */
(function () {
  document.addEventListener("click", function (event) {
    const dismiss = event.target.closest("[data-dismiss]");
    if (!dismiss) return;
    const alert = dismiss.closest(".alert");
    if (alert) alert.remove();
  });
})();
