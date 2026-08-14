/**
 * Photograph carousel on the campground show page.
 *
 * Progressive enhancement: the markup is a plain list of images. Without this
 * script you get a readable column of photographs, which is why the frame does
 * not clip anything until the script says it may.
 *
 * Deliberately not looping. Leafing through a folio has a first plate and a
 * last one, and disabled arrows say where you are more honestly than wrapping
 * silently back to the start.
 */
(function () {
  const viewer = document.querySelector(".plate-viewer");
  if (!viewer) return;

  const track = viewer.querySelector(".plate-viewer__track");
  const slides = viewer.querySelectorAll(".plate-viewer__slide");
  if (!track || slides.length < 2) {
    if (track) track.classList.add("is-live");
    return;
  }

  const prev = viewer.querySelector(".plate-viewer__nav--prev");
  const next = viewer.querySelector(".plate-viewer__nav--next");
  const thumbs = Array.prototype.slice.call(
    viewer.querySelectorAll(".plate-viewer__thumb"),
  );
  const count = viewer.querySelector(".plate-viewer__count");
  const last = slides.length - 1;
  let index = 0;

  // Only now does the track become a single-file strip. Before this the list
  // is stacked, so a failed script leaves every photograph reachable.
  track.classList.add("is-live");

  function show(next_) {
    index = Math.max(0, Math.min(last, next_));
    track.style.transform = `translateX(${-index * 100}%)`;

    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === last;
    if (count) count.textContent = `${index + 1} of ${slides.length}`;

    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle("is-current", i === index);
      // aria-current rather than aria-selected: these are buttons, not tabs.
      if (i === index) thumb.setAttribute("aria-current", "true");
      else thumb.removeAttribute("aria-current");
    });

    // Keep the active thumbnail in view once the strip is long enough to
    // scroll, without yanking the page around it.
    const current = thumbs[index];
    if (current && current.scrollIntoView) {
      current.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  if (prev) prev.addEventListener("click", () => show(index - 1));
  if (next) next.addEventListener("click", () => show(index + 1));
  thumbs.forEach((thumb, i) => thumb.addEventListener("click", () => show(i)));

  viewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    else if (event.key === "ArrowRight") show(index + 1);
    else return;
    event.preventDefault();
  });

  // Swipe. Pointer events cover touch and mouse drag in one path; the
  // threshold is generous enough that a vertical scroll never registers.
  let startX = null;
  track.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
  });
  track.addEventListener("pointerup", (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
  });
  track.addEventListener("pointercancel", () => {
    startX = null;
  });

  show(0);
})();
