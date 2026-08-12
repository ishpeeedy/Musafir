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
  // The sampled box is square on the ground and the card is square to match,
  // so the whole 10km box shows at true proportions. "meet" rather than
  // "slice": if the card is ever not square, letterbox rather than crop.
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

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
  attachHover(svg, paths, thresholds, body);

  // Same terrain from the side. The map above answers "what shape is this
  // country", the profile answers "what am I standing on".
  const profile = buildProfile(upsampled, OUT_SIZE, reduceMotion, {
    boxKm: parseFloat(container.dataset.boxKm) || 10,
    // The direction the land falls away, from the server-side Horn's method
    // gradient. Absent on ground too flat to have a meaningful fall line.
    bearing:
      container.dataset.aspectBearing != null
        ? parseFloat(container.dataset.aspectBearing)
        : null,
    aspectName: container.dataset.aspectName || null,
  });
  container.appendChild(profile.el);

  const revealed = paths.concat(profile.line);

  if (reduceMotion) return;

  // One shot, on scroll into view.
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      // Next frame, so the hidden state is painted before the transition runs.
      requestAnimationFrame(() => {
        revealed.forEach((el) => {
          el.style.strokeDashoffset = "0";
        });
        profile.marker.style.opacity = "1";
      });
    },
    { threshold: 0.25 },
  );
  observer.observe(container);

  /**
   * Hovering a contour highlights it and reads out its elevation, which turns
   * the card from a picture into an instrument.
   *
   * Each visible line gets an invisible twin with a fat stroke: a 1.2px line is
   * near impossible to hit with a pointer, and widening the real one would
   * wreck the drawing. The twins go on top of every visible line so hit testing
   * does not depend on paint order.
   */
  function attachHover(svgEl, lines, levels, host) {
    const readout = document.createElement("div");
    readout.className = "topo-readout";
    host.appendChild(readout);

    const hits = document.createElementNS(SVG_NS, "g");
    let active = null;

    const clear = () => {
      if (!active) return;
      active.style.opacity = ""; // falls back to the opacity attribute
      active.setAttribute("stroke-width", "1.2");
      active = null;
    };

    lines.forEach((line, i) => {
      const hit = document.createElementNS(SVG_NS, "path");
      hit.setAttribute("d", line.getAttribute("d"));
      hit.setAttribute("fill", "none");
      hit.setAttribute("stroke", "transparent");
      hit.setAttribute("stroke-width", "10");
      hit.setAttribute("vector-effect", "non-scaling-stroke");
      hit.setAttribute("pointer-events", "stroke");

      hit.addEventListener("mouseenter", () => {
        clear();
        active = line;
        line.style.opacity = "1";
        line.setAttribute("stroke-width", "2.4");
        readout.textContent = `${Math.round(levels[i]).toLocaleString()} m`;
        readout.style.opacity = "1";
      });

      hits.appendChild(hit);
    });

    svgEl.appendChild(hits);

    svgEl.addEventListener("mousemove", (event) => {
      const rect = host.getBoundingClientRect();
      readout.style.left = `${event.clientX - rect.left}px`;
      readout.style.top = `${event.clientY - rect.top}px`;
    });

    svgEl.addEventListener("mouseleave", () => {
      clear();
      readout.style.opacity = "0";
    });
  }

  /**
   * The grid row running west to east through the campground, drawn side-on.
   *
   * Vertical scale is the profile's own range, not the whole grid's, so the
   * shape of the ground you are actually on stays readable even when a peak
   * elsewhere in the box dominates the map above. That is standard practice for
   * a cross-section and the reason real ones always quote their exaggeration.
   *
   * @returns {{el: Element, line: Element, marker: Element}}
   */
  function buildProfile(up, size, reduced, opts) {
    const VIEW_H = 100; // arbitrary units; the div stretches the svg to fit
    const PAD = 12; // headroom so the peak does not touch the edge
    const span = size - 1;

    const cut = sampleTransect(up, size, opts.bearing);
    const values = cut.values;
    const kmPerStep = opts.boxKm / span;
    const spanKm = (cut.halfLength * 2 * kmPerStep).toFixed(1);

    const lowest = Math.min.apply(null, values);
    const highest = Math.max.apply(null, values);
    const range = highest - lowest || 1;
    const y = (v) => PAD + ((highest - v) / range) * (VIEW_H - PAD * 2);

    let line = `M0,${y(values[0]).toFixed(2)}`;
    for (let col = 1; col < size; col++) {
      line += `L${col},${y(values[col]).toFixed(2)}`;
    }

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${span} ${VIEW_H}`);
    // A cross-section is a plot, not a map. Vertical exaggeration is expected,
    // so stretching to the panel is correct here in a way it is not above.
    svg.setAttribute("preserveAspectRatio", "none");

    const area = document.createElementNS(SVG_NS, "path");
    area.setAttribute("d", `${line}L${span},${VIEW_H}L0,${VIEW_H}Z`);
    area.style.fill = "var(--sage-dim)";
    area.setAttribute("stroke", "none");

    const ridge = document.createElementNS(SVG_NS, "path");
    ridge.setAttribute("d", line);
    ridge.setAttribute("fill", "none");
    ridge.style.stroke = "var(--sage)";
    ridge.setAttribute("stroke-width", "1.5");
    ridge.setAttribute("vector-effect", "non-scaling-stroke");
    ridge.setAttribute("stroke-linejoin", "round");

    if (!reduced) {
      ridge.setAttribute("pathLength", "1");
      ridge.style.strokeDasharray = "1";
      ridge.style.strokeDashoffset = "1";
      ridge.style.transition = `stroke-dashoffset ${DRAW_MS}ms ease-out ${LAYERS * STAGGER_MS}ms`;
    }

    svg.appendChild(area);
    svg.appendChild(ridge);

    // The marker and labels are HTML, not SVG: preserveAspectRatio="none" would
    // stretch a circle into an ellipse and the text with it.
    const standing = cut.centre;
    const marker = document.createElement("span");
    marker.className = "topo-profile__marker";
    marker.style.top = `${y(standing)}%`;
    if (!reduced) {
      marker.style.opacity = "0";
      marker.style.transition = `opacity 400ms ease-out ${LAYERS * STAGGER_MS + DRAW_MS}ms`;
    }

    // Without a vertical scale the section shows shape but not magnitude, and
    // the same drawing could be a dune or a headwall.
    const top = axisLabel(highest, "top");
    const bottom = axisLabel(lowest, "bottom");

    const label = document.createElement("span");
    label.className = "topo-profile__label";
    label.textContent = opts.aspectName
      ? `${Math.round(standing)}m at the pin · section down the ${opts.aspectName.toLowerCase()} fall line · ${spanKm}km`
      : `${Math.round(standing)}m at the pin · west to east section · ${spanKm}km`;

    const el = document.createElement("div");
    el.className = "topo-card__profile";
    el.appendChild(svg);
    el.appendChild(marker);
    el.appendChild(top);
    el.appendChild(bottom);
    el.appendChild(label);

    return { el: el, line: ridge, marker: marker };
  }

  function axisLabel(metres, where) {
    const el = document.createElement("span");
    el.className = `topo-profile__axis topo-profile__axis--${where}`;
    el.textContent = `${Math.round(metres).toLocaleString()}m`;
    return el;
  }

  /**
   * Elevations along a straight line through the campground.
   *
   * The line follows the fall line, the direction the ground actually drops.
   * A fixed west-to-east cut is arbitrary: on a north-facing slope it traverses
   * the hill and draws a nearly flat line, which says nothing about the ground
   * you would pitch on. Down the fall line it shows the real slope.
   *
   * Uphill ends up on the left, downhill on the right, because the bearing
   * points the way the land falls.
   */
  function sampleTransect(up, size, bearingDeg) {
    const half = (size - 1) / 2;
    const bearing = bearingDeg == null ? 90 : bearingDeg; // 90 = due east
    const rad = (bearing * Math.PI) / 180;

    // Compass bearing is clockwise from north. Row grows north, column east.
    const dRow = Math.cos(rad);
    const dCol = Math.sin(rad);

    // Longest line through the centre that stays inside the square
    const reach = (d) => (Math.abs(d) < 1e-9 ? Infinity : half / Math.abs(d));
    const halfLength = Math.min(reach(dRow), reach(dCol));

    const values = [];
    for (let i = 0; i < size; i++) {
      const t = -halfLength + (2 * halfLength * i) / (size - 1);
      values.push(bilinearAt(up, size, half + t * dRow, half + t * dCol));
    }

    return {
      values: values,
      halfLength: halfLength,
      centre: bilinearAt(up, size, half, half),
    };
  }

  /** Elevation at a fractional grid position. */
  function bilinearAt(grid, size, row, col) {
    const clamp = (v) => Math.max(0, Math.min(size - 1.0001, v));
    const r = clamp(row);
    const c = clamp(col);
    const r0 = Math.floor(r);
    const c0 = Math.floor(c);
    const fr = r - r0;
    const fc = c - c0;

    return (
      grid[r0 * size + c0] * (1 - fc) * (1 - fr) +
      grid[r0 * size + c0 + 1] * fc * (1 - fr) +
      grid[(r0 + 1) * size + c0] * (1 - fc) * fr +
      grid[(r0 + 1) * size + c0 + 1] * fc * fr
    );
  }

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
