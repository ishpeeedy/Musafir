/**
 * Seasonality
 *
 * Turns twelve monthly normals into an answer to the second half of the
 * question this project exists to ask: not just "should I go here" but "when".
 *
 * Every input is a measurement from utils/climateService.js. The only thing
 * added is judgement about what those measurements mean for sleeping outside,
 * and the thresholds for that judgement are named constants below so the
 * judgement is arguable rather than buried.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/**
 * Standard environmental lapse rate, degrees C per metre of ascent. Used to
 * carry ERA5's ~9km cell temperature to the campground's real elevation.
 */
const LAPSE_RATE = 0.0065;

// Thresholds. Deliberately blunt, and deliberately visible.
const SNOW_CM = 20; // monthly snowfall that means lying snow, not a flurry
const FREEZING_DAY_MAX = 0; // a day that never gets above freezing
const MONSOON_MM = 200; // ~6.7mm a day, unambiguously monsoon-grade
const HOT_MAX_C = 35;
const COLD_MIN_C = -5;

const STATES = {
  snowbound: { label: "Snowbound", rank: 0 },
  wet: { label: "Monsoon", rank: 1 },
  hot: { label: "Too hot", rank: 2 },
  cold: { label: "Cold", rank: 3 },
  prime: { label: "Prime", rank: 4 },
};

/**
 * Temperatures corrected from the model cell's elevation to the real one.
 *
 * Only temperature is corrected. Precipitation does have an elevation
 * relationship but it is neither linear nor consistent, so adjusting it would
 * be inventing numbers rather than correcting them.
 */
const correctForElevation = (monthly, modelElevation, trueElevation) => {
  if (typeof modelElevation !== "number" || typeof trueElevation !== "number") {
    return { monthly, correctionC: 0, correctedFrom: null };
  }

  const rise = trueElevation - modelElevation;
  const delta = rise * LAPSE_RATE;

  return {
    correctionC: Math.round(delta * 10) / 10,
    correctedFrom: Math.round(modelElevation),
    // Fields are copied out one by one rather than spread. Spreading works on
    // the plain object the service returns but silently drops every field when
    // the input is a Mongoose subdocument, which is what it is on a page
    // render: precip and snow vanish, every wet month reads as prime, and
    // nothing throws.
    monthly: monthly.map((m) => ({
      tMax: Math.round((m.tMax - delta) * 10) / 10,
      tMin: Math.round((m.tMin - delta) * 10) / 10,
      precip: m.precip,
      snow: m.snow,
    })),
  };
};

/** Precedence matters: a snowbound month is snowbound whatever else is true. */
const classify = (m) => {
  if (m.snow >= SNOW_CM || m.tMax <= FREEZING_DAY_MAX) return "snowbound";
  if (m.precip >= MONSOON_MM) return "wet";
  if (m.tMax >= HOT_MAX_C) return "hot";
  if (m.tMin <= COLD_MIN_C) return "cold";
  return "prime";
};

/**
 * Every run of consecutive months in a given state, longest first, wrapping
 * December into January so a winter window is not reported as two stubs.
 *
 * @returns {Array<{start: number, end: number, length: number}>}
 */
const runsOf = (states, wanted) => {
  const hits = states.map((s) => s === wanted);
  if (hits.every(Boolean)) return [{ start: 0, end: 11, length: 12 }];

  const runs = [];
  for (let start = 0; start < 12; start++) {
    if (!hits[start] || hits[(start + 11) % 12]) continue; // must be a run's start
    let length = 0;
    while (hits[(start + length) % 12] && length < 12) length++;
    runs.push({ start, end: (start + length - 1) % 12, length });
  }
  return runs.sort((a, b) => b.length - a.length);
};

const longestRun = (states, wanted) => runsOf(states, wanted)[0] || null;

const runPhrase = (run) => {
  if (!run) return null;
  if (run.length === 12) return "all year";
  if (run.length === 1) return MONTHS[run.start];
  return `${MONTHS[run.start]} to ${MONTHS[run.end]}`;
};

/**
 * @param {object} climate  Output of utils/climateService.js
 * @param {object} [opts]
 * @param {number} [opts.elevation]  True elevation at the pin, from SRTM
 * @returns {object|null} null if the input is unusable
 */
const analyseSeasonality = (climate, opts = {}) => {
  if (!climate || !Array.isArray(climate.monthly) || climate.monthly.length !== 12) {
    return null;
  }
  if (
    climate.monthly.some(
      (m) =>
        !m ||
        ["tMax", "tMin", "precip", "snow"].some(
          (k) => typeof m[k] !== "number" || !Number.isFinite(m[k]),
        ),
    )
  ) {
    return null;
  }

  const { monthly, correctionC, correctedFrom } = correctForElevation(
    climate.monthly,
    climate.modelElevation,
    opts.elevation,
  );

  const states = monthly.map(classify);

  const months = monthly.map((m, i) => ({
    month: i + 1,
    name: MONTHS[i],
    short: SHORT[i],
    state: states[i],
    label: STATES[states[i]].label,
    tMax: m.tMax,
    tMin: m.tMin,
    precip: m.precip,
    snow: m.snow,
  }));

  const primeRuns = runsOf(states, "prime");
  const best = primeRuns[0] || null;
  // Two separate spells can be equally good, either side of a monsoon. Naming
  // only the first would hide half the answer.
  const alsoBest = best ? primeRuns.filter((r) => r.length === best.length).slice(1) : [];

  const snow = longestRun(states, "snowbound");
  const wet = longestRun(states, "wet");
  const hot = longestRun(states, "hot");

  // With no comfortable month at all, name the least bad rather than shrug.
  let fallback = null;
  if (!best) {
    const ranked = months
      .slice()
      .sort((a, b) => STATES[b.state].rank - STATES[a.state].rank);
    fallback = ranked[0];
  }

  const sentences = [];
  if (best) {
    const also = alsoBest.map(runPhrase);
    sentences.push(
      also.length
        ? `Best ${runPhrase(best)}, and again ${also.join(" and ")}.`
        : `Best ${runPhrase(best)}.`,
    );
  } else if (fallback) {
    sentences.push(
      `No comfortable window. ${fallback.name} is the least hostile month, and it is ${fallback.label.toLowerCase()}.`,
    );
  }
  if (snow) sentences.push(`Snowbound ${runPhrase(snow)}.`);
  if (wet) sentences.push(`Under monsoon ${runPhrase(wet)}.`);
  if (hot && !wet) sentences.push(`Too hot ${runPhrase(hot)}.`);

  return {
    months,
    bestWindow: best
      ? { from: best.start + 1, to: best.end + 1, length: best.length, phrase: runPhrase(best) }
      : null,
    primeCount: states.filter((s) => s === "prime").length,
    summary: sentences.join(" "),
    // Provenance, so the page can say where the numbers came from
    years: climate.years,
    elevationCorrectionC: correctionC,
    modelElevation: correctedFrom,
  };
};

module.exports = analyseSeasonality;
module.exports.MONTHS = MONTHS;
module.exports.STATES = STATES;
