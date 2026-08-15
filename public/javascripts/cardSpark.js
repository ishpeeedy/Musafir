/**
 * Card sparkline
 *
 * Draws the fall-line cross-section on each explore card as a small inline SVG.
 * The elevations come down in a data attribute already sampled by the server
 * (utils/terrainAnalysis.js sampleFallLine), so this never fetches anything and
 * a card with no cached grid simply has no line.
 *
 * Deliberately no d3. Contours would need three CDN bundles and would be
 * illegible at 34px; a profile is a polyline through numbers we already hold.
 */
(function () {
  var SVG = "http://www.w3.org/2000/svg";
  var HEIGHT = 34;
  var WIDTH = 100; // viewBox units; the element scales to its container

  var nodes = document.querySelectorAll(".camp-spark[data-profile]");

  Array.prototype.forEach.call(nodes, function (node) {
    var values = node.dataset.profile
      .split(",")
      .map(Number)
      .filter(function (v) {
        return isFinite(v);
      });
    if (values.length < 2) return;

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = max - min;

    // Flat ground draws a flat line rather than amplifying noise to full height,
    // which is the same judgement terrainAnalysis makes about aspect below one
    // degree of slope.
    var pad = 3;
    var usable = HEIGHT - pad * 2;
    var y = function (v) {
      return span < 1 ? HEIGHT / 2 : pad + (1 - (v - min) / span) * usable;
    };

    var points = values
      .map(function (v, i) {
        return ((i / (values.length - 1)) * WIDTH).toFixed(1) + "," + y(v).toFixed(1);
      })
      .join(" ");

    var svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 " + WIDTH + " " + HEIGHT);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");

    // Filled body under the line, so the card reads as ground rather than as a
    // chart of something abstract.
    var area = document.createElementNS(SVG, "polygon");
    area.setAttribute("points", "0," + HEIGHT + " " + points + " " + WIDTH + "," + HEIGHT);
    area.setAttribute("class", "camp-spark__fill");
    svg.appendChild(area);

    var line = document.createElementNS(SVG, "polyline");
    line.setAttribute("points", points);
    line.setAttribute("class", "camp-spark__line");
    svg.appendChild(line);

    // Where you would stand: the centre of the cut is the campground itself.
    var mid = (values.length - 1) / 2;
    var midValue = values[Math.round(mid)];
    var pin = document.createElementNS(SVG, "circle");
    pin.setAttribute("cx", (WIDTH / 2).toFixed(1));
    pin.setAttribute("cy", y(midValue).toFixed(1));
    pin.setAttribute("r", "2");
    pin.setAttribute("class", "camp-spark__pin");
    svg.appendChild(pin);

    node.appendChild(svg);
  });
})();
