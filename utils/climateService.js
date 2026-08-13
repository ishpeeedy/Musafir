const axios = require("axios");

/**
 * Climate Service — Open-Meteo ERA5 archive
 *
 * Free, no API key. Ten years of daily reanalysis for a point, aggregated here
 * into twelve monthly normals. Roughly 120KB on the wire per campground, which
 * is why it is fetched once and cached permanently exactly like the elevation
 * grid. Everything downstream is arithmetic on the ~50 stored numbers.
 *
 * Ten years rather than the WMO standard thirty: the payload triples and the
 * monthly means barely move for the purpose here, which is deciding whether a
 * month is campable, not publishing a climatology.
 *
 * ERA5 is a ~9km reanalysis grid, so the cell has its own elevation which can
 * sit hundreds of metres from the campground in steep country. The cell's
 * elevation is returned alongside the data so callers can correct for it. See
 * utils/seasonality.js.
 */

const API_URL = "https://archive-api.open-meteo.com/v1/archive";
const YEARS = 10;

/**
 * Monthly climate normals for a point.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{modelElevation: number, years: number, from: string,
 *   to: string, monthly: Array<{tMax:number,tMin:number,precip:number,snow:number}>}>}
 *   monthly is twelve entries, January first. Temperatures are degrees C at the
 *   model cell's elevation, uncorrected. precip is total mm in an average month,
 *   snow is total cm.
 */
const getClimateNormals = async (lat, lng) => {
  // Whole calendar years only, so every month gets the same number of samples
  // and a part-finished year cannot skew one month against the others.
  const lastYear = new Date().getUTCFullYear() - 1;
  const firstYear = lastYear - (YEARS - 1);
  const from = `${firstYear}-01-01`;
  const to = `${lastYear}-12-31`;

  const { data } = await axios.get(API_URL, {
    params: {
      latitude: lat,
      longitude: lng,
      start_date: from,
      end_date: to,
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum",
      timezone: "auto",
    },
    timeout: 30000,
  });

  const daily = data && data.daily;
  if (!daily || !Array.isArray(daily.time) || !daily.time.length) {
    throw new Error("Unexpected response shape from Open-Meteo");
  }

  const buckets = Array.from({ length: 12 }, () => ({
    tMax: 0,
    tMin: 0,
    precip: 0,
    snow: 0,
    days: 0,
  }));

  for (let i = 0; i < daily.time.length; i++) {
    const tMax = daily.temperature_2m_max[i];
    const tMin = daily.temperature_2m_min[i];
    // A gap in the reanalysis would otherwise drag a month's mean toward zero.
    if (typeof tMax !== "number" || typeof tMin !== "number") continue;

    const month = Number(daily.time[i].slice(5, 7)) - 1;
    const bucket = buckets[month];
    bucket.tMax += tMax;
    bucket.tMin += tMin;
    bucket.precip += daily.precipitation_sum[i] || 0;
    bucket.snow += daily.snowfall_sum[i] || 0;
    bucket.days++;
  }

  if (buckets.some((b) => !b.days)) {
    throw new Error("Open-Meteo returned no usable data for at least one month");
  }

  const round = (v, places) => Math.round(v * 10 ** places) / 10 ** places;

  return {
    modelElevation: typeof data.elevation === "number" ? data.elevation : null,
    years: lastYear - firstYear + 1,
    from,
    to,
    monthly: buckets.map((b) => ({
      tMax: round(b.tMax / b.days, 1),
      tMin: round(b.tMin / b.days, 1),
      // Totals are across every sampled year, so divide back to one month
      precip: round(b.precip / YEARS, 0),
      snow: round(b.snow / YEARS, 0),
    })),
  };
};

module.exports = getClimateNormals;
