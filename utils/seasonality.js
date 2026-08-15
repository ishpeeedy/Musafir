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
/**
 * Frost is a modifier, not a state.
 *
 * Moving `cold` up to freezing nights would be the obvious fix for Shimla,
 * which at 2,200m reports January as prime when reality is near-freezing nights
 * and regular snow. It also breaks Dzongri, whose correct October to December
 * window would vanish, because frosty nights at altitude are normal and do not
 * disqualify a month. So a month can stay prime and carry the warning instead.
 */
const FROST_MIN_C = 0;

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
    // Modifier, not a state. A prime month can still freeze at night.
    frost: m.tMin <= FROST_MIN_C,
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
  // Frost inside the best window is the Shimla case: months that genuinely are
  // the right time to go and will still freeze overnight. Saying "Best December
  // to February" and stopping there is the part that was wrong.
  const frostInBest = best
    ? Array.from({ length: best.length }, (_, i) => months[(best.start + i) % 12]).filter(
        (m) => m.frost,
      )
    : [];
  if (frostInBest.length) {
    sentences.push(
      frostInBest.length === best.length
        ? "Freezing nights throughout."
        : `Freezing nights in ${frostInBest.map((m) => m.name).join(", ")}.`,
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

/**
 * Where this place stands today, and when it next comes good.
 *
 * The list page's whole job is "should I go, and when", and a twelve-month
 * strip does not answer it at a glance. This does.
 *
 * Deliberately reports the *next* prime month rather than the start of the
 * longest window: in October, a place whose best run is April to June but which
 * is also prime in November should say November. The longest window is the
 * right answer to "when is it best", not to "when can I go".
 *
 * @param {object|null} analysis   output of analyseSeasonality
 * @param {number} monthIndex      0-11, passed in rather than read from the
 *                                 clock so this stays testable
 * @returns {{good: boolean, label: string, frost: boolean, next: string|null}|null}
 */
const verdictFor = (analysis, monthIndex) => {
  if (!analysis || !analysis.months || !analysis.months[monthIndex]) return null;
  const here = analysis.months[monthIndex];

  if (here.state === "prime") {
    return { good: true, label: here.label, frost: here.frost, next: null };
  }

  for (let i = 1; i <= 11; i++) {
    const m = analysis.months[(monthIndex + i) % 12];
    if (m.state === "prime") {
      return { good: false, label: here.label, frost: here.frost, next: m.name };
    }
  }
  return { good: false, label: here.label, frost: here.frost, next: null };
};

module.exports = analyseSeasonality;
module.exports.MONTHS = MONTHS;
module.exports.STATES = STATES;
module.exports.verdictFor = verdictFor;
