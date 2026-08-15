/**
 * Auto-hiding navbar.
 *
 * Not sticky in the usual sense: it goes away when you scroll down and comes
 * back the moment you scroll up, so the sheet gets the full window while you
 * are reading and the chrome is one flick away when you want it.
 *
 * The element stays `position: sticky`, so it keeps occupying its space in the
 * flow and hiding it is a transform. Nothing reflows, and there is no body
 * padding to keep in sync with the bar's height.
 */
(function () {
  var nav = document.querySelector("[data-autohide]");
  if (!nav) return;

  // A bar that slides in and out repeatedly is exactly the kind of motion
  // people turn this setting on to avoid, so the behaviour is dropped whole
  // rather than just having its transition removed.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Below this, a scroll is a jitter or a trackpad settling, not an intent.
  var THRESHOLD = 6;
  var lastY = window.scrollY;
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY;
    var delta = y - lastY;

    if (Math.abs(delta) < THRESHOLD) return;

    // Always visible at the top of the page, and never hidden while the
    // account menu is open, which would take the menu with it.
    var menuOpen = !!nav.querySelector("details[open]");
    var hide = delta > 0 && y > nav.offsetHeight && !menuOpen;

    nav.classList.toggle("navbar--hidden", hide);
    lastY = y;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    },
    { passive: true },
  );
})();
