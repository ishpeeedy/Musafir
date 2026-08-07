/**
 * Topographic contour renderer for the campground show page.
 *
 * Reads the cached elevation grid off #topo-container, upsamples it, contours
 * it, and injects an SVG into .topo-card__body.
 *
 * The grid is 10x10 because OpenTopoData accepts at most 100 locations per
 * request, so it cannot be made finer server-side. Contours drawn straight off
 * 10x10 are visibly polygonal, so we bilinear upsample to 40x40 first. That
 * costs nothing and is the whole difference between chunky and cartographic.
 *
 * Grid convention (set by utils/elevationService.js):
 *   index = row * gridSize + col, row 0 = south, col 0 = west.
 *
 * Everything here is enhancement, never critical path: any missing or malformed
 * input leaves the card empty and the page untouched.
 */

(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const OUT_SIZE = 40; // upsampled grid resolution
  const LAYERS = 12; // contour lines drawn
  const DRAW_MS = 900; // how long one contour takes to draw itself
  const STAGGER_MS = 70; // gap between successive contours starting

  const container = document.getElementById("topo-container");
  if (!container) return;

  const body = container.querySelector(".topo-card__body");
  if (!body) return;

  if (typeof d3 === "undefined" || !d3.contours || !d3.geoPath) return;

  const grid = parseGrid(container.dataset.elevationGrid);
  if (!grid) return;

  const upsampled = bilinearUpsample(grid.values, grid.size, OUT_SIZE);
  const min = Math.min.apply(null, upsampled);
  const max = Math.max.apply(null, upsampled);
  if (max - min < 1e-6) return; // perfectly flat, nothing to draw

  // Evenly spaced between the extremes but never touching them, so no contour
  // degenerates into the grid border.
  const thresholds = [];
  for (let i = 1; i <= LAYERS; i++) {
    thresholds.push(min + (i * (max - min)) / (LAYERS + 1));
  }

  const features = d3
    .contours()
    .size([OUT_SIZE, OUT_SIZE])
    .thresholds(thresholds)(upsampled);

  // Row 0 is the southern edge but SVG y grows downward, so reflect to put
  // north at the top. Coordinates stay in grid units; the viewBox does the
  // scaling, which keeps the SVG resolution independent.
  const path = d3.geoPath(
    d3.geoIdentity().reflectY(true).translate([0, OUT_SIZE]),
  );

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${OUT_SIZE} ${OUT_SIZE}`);
  // The sampled box is square on the ground. The card is a wide banner, so
  // crop to a band centred on the campground rather than stretching the
  // terrain to fit. Swap "slice" for "none" to fill the card instead.
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

  const delays = staggerFromElevation(thresholds, centreElevation(grid));
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const paths = features.map((feature, i) => {
    const el = document.createElementNS(SVG_NS, "path");
    el.setAttribute("d", path(feature) || "");
    el.setAttribute("fill", "none");
    // var() as an inline style, not a presentation attribute: Safari does not
    // substitute custom properties in presentation attributes.
    el.style.stroke = "var(--sage)";
    el.setAttribute("stroke-width", "1.2");
    el.setAttribute("vector-effect", "non-scaling-stroke");
    // Higher contours read stronger, but never so faint that a low line
    // disappears against the surface colour.
    el.setAttribute("opacity", (0.3 + (i / (LAYERS - 1)) * 0.45).toFixed(2));

    if (!reduceMotion) {
      // pathLength normalises every contour to a length of 1, so one dash of 1
      // covers the whole line whatever its real length, and an offset of 1
      // hides it completely.
      el.setAttribute("pathLength", "1");
      el.style.strokeDasharray = "1";
      el.style.strokeDashoffset = "1";
      el.style.transition = `stroke-dashoffset ${DRAW_MS}ms ease-out ${delays[i]}ms`;
    }

    svg.appendChild(el);
    return el;
  });

  body.appendChild(svg);

  if (reduceMotion) return;

  // One shot, on scroll into view.
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      // Next frame, so the hidden state is painted before the transition runs.
      requestAnimationFrame(() => {
        paths.forEach((el) => {
          el.style.strokeDashoffset = "0";
        });
      });
    },
    { threshold: 0.25 },
  );
  observer.observe(container);

  /**
   * @returns {{values: number[], size: number}|null} null if the attribute is
   *   missing, unparseable, not square, or contains anything but finite numbers
   */
  function parseGrid(raw) {
    if (!raw) return null;

    let values;
    try {
      values = JSON.parse(raw);
    } catch (e) {
      return null;
    }

    if (!Array.isArray(values) || values.length < 4) return null;
    if (values.some((v) => typeof v !== "number" || !Number.isFinite(v))) {
      return null;
    }

    const size = Math.sqrt(values.length);
    if (!Number.isInteger(size)) return null;

    return { values: values, size: size };
  }

  /**
   * Bilinear interpolation onto a denser square grid. Corners of the source
   * grid stay pinned to the corners of the output, so nothing is invented
   * beyond the sampled extent.
   */
  function bilinearUpsample(src, srcSize, outSize) {
    const out = new Array(outSize * outSize);
    const ratio = (srcSize - 1) / (outSize - 1);

    for (let row = 0; row < outSize; row++) {
      const y = row * ratio;
      const r0 = Math.min(Math.floor(y), srcSize - 2);
      const fy = y - r0;

      for (let col = 0; col < outSize; col++) {
        const x = col * ratio;
        const c0 = Math.min(Math.floor(x), srcSize - 2);
        const fx = x - c0;

        const topLeft = src[r0 * srcSize + c0];
        const topRight = src[r0 * srcSize + c0 + 1];
        const botLeft = src[(r0 + 1) * srcSize + c0];
        const botRight = src[(r0 + 1) * srcSize + c0 + 1];

        out[row * outSize + col] =
          topLeft * (1 - fx) * (1 - fy) +
          topRight * fx * (1 - fy) +
          botLeft * (1 - fx) * fy +
          botRight * fx * fy;
      }
    }

    return out;
  }

  /**
   * Elevation at the campground itself. An even-sided grid has no centre cell,
   * so average the four central ones (see PLAN.md, deviation 1).
   */
  function centreElevation(g) {
    const at = (row, col) => g.values[row * g.size + col];

    if (g.size % 2 === 1) {
      const m = (g.size - 1) / 2;
      return at(m, m);
    }

    const lo = g.size / 2 - 1;
    const hi = g.size / 2;
    return (at(lo, lo) + at(lo, hi) + at(hi, lo) + at(hi, hi)) / 4;
  }

  /**
   * Delay per contour, ordered by how close its threshold sits to the
   * campground's own elevation. Contours near that elevation pass near the
   * campground, so the reveal radiates outward from the pin instead of sweeping
   * bottom-up.
   */
  function staggerFromElevation(levels, elevation) {
    const order = levels
      .map((level, i) => ({ i: i, distance: Math.abs(level - elevation) }))
      .sort((a, b) => a.distance - b.distance);

    const delays = new Array(levels.length);
    order.forEach((entry, rank) => {
      delays[entry.i] = rank * STAGGER_MS;
    });

    return delays;
  }
})();
