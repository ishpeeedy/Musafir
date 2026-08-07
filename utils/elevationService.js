const axios = require("axios");

/**
 * Elevation Service — OpenTopoData (SRTM 30m)
 *
 * Free, no API key. Hard limits: 1000 calls/day, 1 request/sec, and a maximum of
 * 100 locations per request. That 100-location ceiling is why the grid is 10x10
 * and cannot simply be made finer. Render the contours smoother by upsampling on
 * the client instead (see public/javascripts/topoMap.js).
 *
 * Because of the daily budget, callers MUST fetch lazily and cache permanently.
 * Never call this on campground creation. See PLAN.md.
 */

const API_URL = "https://api.opentopodata.org/v1/srtm30m";
const KM_PER_DEGREE_LAT = 111.32;

/**
 * Fetch a square grid of elevation samples centred on a point.
 *
 * The box is square *on the ground*, not in degrees. A fixed degree step would
 * produce a box narrower east-west than north-south by cos(latitude), which
 * squashes every contour we later render (13% at 30°N, worse further from the
 * equator). Dividing the longitude step by cos(lat) corrects it.
 *
 * @param {number} lat        Latitude of the centre point
 * @param {number} lng        Longitude of the centre point
 * @param {number} radiusKm   Half the box width, in km. Default 5 (a 10km box).
 * @param {number} gridSize   Points per side. Keep gridSize^2 <= 100.
 * @returns {Promise<number[]>} Flat, row-major array of gridSize^2 elevations in
 *                              metres. Row 0 is the southern edge, column 0 the
 *                              western edge.
 */
const getElevationGrid = async (lat, lng, radiusKm = 5, gridSize = 10) => {
  if (gridSize * gridSize > 100) {
    throw new Error(
      `gridSize ${gridSize} needs ${gridSize * gridSize} samples; OpenTopoData allows 100 per request`,
    );
  }

  const latStepDeg = (radiusKm * 2) / KM_PER_DEGREE_LAT / (gridSize - 1);

  // Guard cos(lat) so latitudes near the poles cannot blow the longitude step up
  // to infinity. Nothing campable sits at 89°, but a bad coordinate shouldn't
  // produce a request spanning half the planet.
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.05);
  const lngStepDeg = latStepDeg / cosLat;

  const startLat = lat - ((gridSize - 1) / 2) * latStepDeg;
  const startLng = lng - ((gridSize - 1) / 2) * lngStepDeg;

  const locations = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const sampleLat = (startLat + row * latStepDeg).toFixed(6);
      const sampleLng = (startLng + col * lngStepDeg).toFixed(6);
      locations.push(`${sampleLat},${sampleLng}`);
    }
  }

  const { data } = await axios.get(API_URL, {
    params: { locations: locations.join("|") },
    timeout: 12000,
  });

  if (!data || !Array.isArray(data.results)) {
    throw new Error("Unexpected response shape from OpenTopoData");
  }

  // Ocean and void-filled cells come back null. Treat them as sea level so the
  // grid stays a dense numeric array — contouring cannot handle holes.
  const grid = data.results.map((r) =>
    typeof r.elevation === "number" ? r.elevation : 0,
  );

  if (grid.length !== gridSize * gridSize) {
    throw new Error(
      `Expected ${gridSize * gridSize} elevation samples, got ${grid.length}`,
    );
  }

  return grid;
};

module.exports = getElevationGrid;
