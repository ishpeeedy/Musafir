/**
 * Terrain Analysis
 *
 * Derives the character of a place from the elevation grid we already fetched.
 * Every value here costs zero additional API calls — it is all arithmetic over
 * the 100 numbers cached on the campground document.
 *
 * Grid convention (set by utils/elevationService.js):
 *   index = row * gridSize + col
 *   row 0 = southern edge, increasing north
 *   col 0 = western edge,  increasing east
 */

const COMPASS_SHORT = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const COMPASS_LONG = [
  "North",
  "Northeast",
  "East",
  "Southeast",
  "South",
  "Southwest",
  "West",
  "Northwest",
];

const at = (grid, gridSize, row, col) => grid[row * gridSize + col];

/**
 * Elevation at the exact centre of the grid.
 *
 * A 10x10 grid has no centre cell. The context doc used index 54, which is
 * (row 5, col 4) — half a step off in both axes, roughly 550m away on a 10km
 * box. Averaging the four central cells lands on the true centre for the same
 * zero cost.
 */
const centreElevation = (grid, gridSize) => {
  if (gridSize % 2 === 1) {
    const m = (gridSize - 1) / 2;
    return at(grid, gridSize, m, m);
  }
  const lo = gridSize / 2 - 1;
  const hi = gridSize / 2;
  return (
    (at(grid, gridSize, lo, lo) +
      at(grid, gridSize, lo, hi) +
      at(grid, gridSize, hi, lo) +
      at(grid, gridSize, hi, hi)) /
    4
  );
};

/**
 * Horn's method gradient at one cell. This is the standard slope/aspect kernel
 * used by GIS software. Requires a full 3x3 neighbourhood.
 * @returns {{dzdE: number, dzdN: number}} metres of rise per metre travelled
 */
const hornGradient = (grid, gridSize, row, col, cellMeters) => {
  const g = (r, c) => at(grid, gridSize, r, c);

  const NW = g(row + 1, col - 1);
  const N = g(row + 1, col);
  const NE = g(row + 1, col + 1);
  const W = g(row, col - 1);
  const E = g(row, col + 1);
  const SW = g(row - 1, col - 1);
  const S = g(row - 1, col);
  const SE = g(row - 1, col + 1);

  return {
    dzdE: (NE + 2 * E + SE - (NW + 2 * W + SW)) / (8 * cellMeters),
    dzdN: (NW + 2 * N + NE - (SW + 2 * S + SE)) / (8 * cellMeters),
  };
};

/**
 * Terrain Ruggedness Index — mean absolute elevation difference between each
 * interior cell and its eight neighbours, averaged over the grid. High values
 * mean broken, chopped-up ground rather than smooth slopes.
 */
const ruggednessIndex = (grid, gridSize) => {
  let total = 0;
  let cells = 0;

  for (let row = 1; row < gridSize - 1; row++) {
    for (let col = 1; col < gridSize - 1; col++) {
      const centre = at(grid, gridSize, row, col);
      let diff = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          diff += Math.abs(centre - at(grid, gridSize, row + dr, col + dc));
        }
      }
      total += diff / 8;
      cells++;
    }
  }

  return cells ? total / cells : 0;
};

const positionLabel = (percentile, relief) => {
  // Below ~20m of relief across the whole box there is no slope to be partway
  // up, so a percentile rank would be ranking noise.
  if (relief < 20) return "Level ground";
  if (percentile < 15) return "Valley floor";
  if (percentile < 35) return "Lower slope";
  if (percentile < 65) return "Mid slope";
  if (percentile < 85) return "Upper slope";
  return "Ridge";
};

const slopeLabel = (degrees) => {
  if (degrees < 2) return "Level";
  if (degrees < 6) return "Gentle";
  if (degrees < 15) return "Moderate";
  if (degrees < 30) return "Steep";
  return "Very steep";
};

const ruggednessLabel = (tri) => {
  if (tri < 15) return "Smooth";
  if (tri < 50) return "Undulating";
  if (tri < 120) return "Broken";
  return "Highly broken";
};

/**
 * @param {number[]} grid       Flat row-major elevation array from elevationService
 * @param {object}   [opts]
 * @param {number}   [opts.gridSize=10]
 * @param {number}   [opts.radiusKm=5]  Half the box width, must match the fetch
 * @returns {object|null} Terrain character, or null if the grid is unusable
 */
const analyseTerrain = (grid, opts = {}) => {
  const gridSize = opts.gridSize || 10;
  const radiusKm = opts.radiusKm || 5;

  if (!Array.isArray(grid) || grid.length !== gridSize * gridSize) return null;
  if (grid.some((v) => typeof v !== "number" || !Number.isFinite(v))) return null;
  if (gridSize < 4) return null;

  const cellMeters = (radiusKm * 2 * 1000) / (gridSize - 1);

  const elevation = centreElevation(grid, gridSize);
  const minElevation = Math.min(...grid);
  const maxElevation = Math.max(...grid);
  const relief = maxElevation - minElevation;

  // Where the campground sits within the local elevation distribution. Ties are
  // split so a perfectly flat grid reports the middle rather than 0 or 100.
  const below = grid.filter((v) => v < elevation).length;
  const equal = grid.filter((v) => v === elevation).length;
  const percentile = ((below + equal / 2) / grid.length) * 100;

  // Average Horn's gradient across the cells surrounding the true centre, so the
  // reading is centred on the campground rather than on one arbitrary cell.
  const lo = gridSize % 2 === 1 ? (gridSize - 1) / 2 : gridSize / 2 - 1;
  const hi = gridSize % 2 === 1 ? (gridSize - 1) / 2 : gridSize / 2;
  const samples = [];
  for (const r of new Set([lo, hi])) {
    for (const c of new Set([lo, hi])) {
      samples.push(hornGradient(grid, gridSize, r, c, cellMeters));
    }
  }
  const dzdE = samples.reduce((s, g) => s + g.dzdE, 0) / samples.length;
  const dzdN = samples.reduce((s, g) => s + g.dzdN, 0) / samples.length;

  const slopeDegrees = (Math.atan(Math.hypot(dzdE, dzdN)) * 180) / Math.PI;

  // Aspect is the compass direction the land falls away toward: the downhill
  // vector is (-dzdE east, -dzdN north), and bearing runs clockwise from north.
  let aspectBearing =
    (Math.atan2(-dzdE, -dzdN) * 180) / Math.PI;
  if (aspectBearing < 0) aspectBearing += 360;

  const compassIdx = Math.round(aspectBearing / 45) % 8;
  const aspectCompass = COMPASS_SHORT[compassIdx];
  const aspectName = COMPASS_LONG[compassIdx];

  const tri = ruggednessIndex(grid, gridSize);

  // Below roughly a degree of slope there is no meaningful downhill direction,
  // so quoting an aspect would be noise dressed up as a fact.
  const aspectIsMeaningful = slopeDegrees >= 1;

  const position = positionLabel(percentile, relief);
  const boxKm = radiusKm * 2;

  const summary = aspectIsMeaningful
    ? `${aspectName}-facing ${position.toLowerCase()}, ${Math.round(relief)}m of relief within ${boxKm}km`
    : `${position}, ${Math.round(relief)}m of relief within ${boxKm}km`;

  return {
    elevation: Math.round(elevation * 10) / 10,
    minElevation,
    maxElevation,
    relief: Math.round(relief),
    percentile: Math.round(percentile),
    positionLabel: position,
    aspectBearing: aspectIsMeaningful ? Math.round(aspectBearing) : null,
    aspectCompass: aspectIsMeaningful ? aspectCompass : null,
    aspectName: aspectIsMeaningful ? aspectName : null,
    slopeDegrees: Math.round(slopeDegrees * 10) / 10,
    slopeLabel: slopeLabel(slopeDegrees),
    ruggedness: Math.round(tri * 10) / 10,
    ruggednessLabel: ruggednessLabel(tri),
    summary,
  };
};

module.exports = analyseTerrain;
