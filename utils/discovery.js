/**
 * Discovery
 *
 * Constraint matching for the explore page: the queries only this project can
 * answer, because only this project stores the terrain and climate to answer
 * them with. "Above 2000m, south-facing, prime in December" is the whole point.
 *
 * Everything runs in memory over the whole collection. That is deliberate and
 * it is not a compromise. Seasonality is derived per request rather than stored
 * (see utils/seasonality.js) so no Mongo query can filter on it, and $geoNear
 * must be the first stage of an aggregation pipeline so it could not compose
 * with an in-memory filter either. The index route already loads every
 * campground for the cluster map, so this is one pass over an array we were
 * holding anyway.
 *
 * Revisit above a few thousand campgrounds. The seam is filterCampgrounds:
 * cache the classification on the document with a version stamp, and push the
 * stored constraints back down into Mongo.
 */

const analyseSeasonality = require("./seasonality");
const { AMENITIES, TAGS } = require("../schemas");

const MONTHS = analyseSeasonality.MONTHS;

// Overlapping on purpose: a southeast slope takes the morning sun and is
// south-facing enough to matter.
const ASPECT_GROUPS = {
  north: ["NW", "N", "NE"],
  east: ["NE", "E", "SE"],
  south: ["SE", "S", "SW"],
  west: ["SW", "W", "NW"],
};

// Ordered scales, so "at most undulating" is expressible. Must match the labels
// produced by utils/terrainAnalysis.js.
const RUGGEDNESS = ["Smooth", "Undulating", "Broken", "Highly broken"];
const SLOPE = ["Level", "Gentle", "Moderate", "Steep", "Very steep"];
const POSITIONS = [
  "Level ground",
  "Valley floor",
  "Lower slope",
  "Mid slope",
  "Upper slope",
  "Ridge",
];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};

const oneOf = (v, allowed) => (allowed.includes(v) ? v : undefined);

const someOf = (v, allowed) => {
  if (v === undefined || v === null) return undefined;
  const list = (Array.isArray(v) ? v : String(v).split(","))
    .map((s) => String(s).trim())
    .filter((s) => allowed.includes(s));
  return list.length ? list : undefined;
};

const month = (v) => {
  const n = parseInt(v, 10);
  return n >= 1 && n <= 12 ? n : undefined;
};

const flag = (v) => (v === "1" || v === "true" || v === "on" ? true : undefined);

const metres = (n) => `${n.toLocaleString("en-IN")} m`;

/**
 * Every constraint in one table, because three things need to agree about it:
 * whether a campground passes, how to say it in prose, and what data it needs
 * before it can be judged at all. Splitting those into parallel switches is how
 * they drift.
 *
 *   needs     "terrain" | "climate" | null   what must be cached to judge this
 *   parse     raw query value -> normalised value, or undefined to drop it
 *   test      (campground, value, season) -> boolean
 *   describe  value -> phrase for the summary line
 */
const CONSTRAINTS = {
  elevMin: {
    needs: "terrain",
    parse: num,
    test: (cg, v) => cg.elevation >= v,
    describe: (v) => `above ${metres(v)}`,
  },
  elevMax: {
    needs: "terrain",
    parse: num,
    test: (cg, v) => cg.elevation <= v,
    describe: (v) => `below ${metres(v)}`,
  },
  aspect: {
    needs: "terrain",
    parse: (v) => oneOf(v, Object.keys(ASPECT_GROUPS)),
    test: (cg, v) => ASPECT_GROUPS[v].includes(cg.terrain.aspectCompass),
    describe: (v) => `facing ${v}`,
  },
  position: {
    needs: "terrain",
    parse: (v) => someOf(v, POSITIONS),
    test: (cg, v) => v.includes(cg.terrain.positionLabel),
    describe: (v) => v.map((p) => p.toLowerCase()).join(" or "),
  },
  ruggedMax: {
    needs: "terrain",
    parse: (v) => oneOf(v, RUGGEDNESS),
    test: (cg, v) =>
      RUGGEDNESS.indexOf(cg.terrain.ruggednessLabel) <= RUGGEDNESS.indexOf(v),
    describe: (v) => `ground no rougher than ${v.toLowerCase()}`,
  },
  slopeMax: {
    needs: "terrain",
    parse: (v) => oneOf(v, SLOPE),
    test: (cg, v) => SLOPE.indexOf(cg.terrain.slopeLabel) <= SLOPE.indexOf(v),
    describe: (v) => `slope no steeper than ${v.toLowerCase()}`,
  },
  reliefMin: {
    needs: "terrain",
    parse: num,
    test: (cg, v) => cg.terrain.relief >= v,
    describe: (v) => `at least ${metres(v)} of relief`,
  },
  primeIn: {
    needs: "climate",
    parse: month,
    test: (cg, v, season) => season.months[v - 1].state === "prime",
    describe: (v) => `prime in ${MONTHS[v - 1]}`,
  },
  primeMin: {
    needs: "climate",
    parse: num,
    test: (cg, v, season) => (season.bestWindow?.length || 0) >= v,
    describe: (v) => `at least ${v} good months in a row`,
  },
  noSnow: {
    needs: "climate",
    parse: flag,
    test: (cg, v, season) => !season.months.some((m) => m.state === "snowbound"),
    describe: () => "never snowbound",
  },
  // Checked against whichever months the query already cares about: the month
  // asked for, or the best window when none was.
  noFrost: {
    needs: "climate",
    parse: flag,
    test: (cg, v, season, all) => {
      if (all.primeIn) return !season.months[all.primeIn - 1].frost;
      const w = season.bestWindow;
      if (!w) return false;
      for (let i = 0; i < w.length; i++) {
        if (season.months[(w.from - 1 + i) % 12].frost) return false;
      }
      return true;
    },
    describe: () => "no freezing nights",
  },
  amenities: {
    needs: null,
    parse: (v) => someOf(v, AMENITIES),
    test: (cg, v) => v.every((a) => cg.amenities.includes(a)),
    describe: (v) => `with ${v.join(" and ").toLowerCase()}`,
  },
  tags: {
    needs: null,
    parse: (v) => someOf(v, TAGS),
    test: (cg, v) => v.every((t) => cg.tags.includes(t)),
    describe: (v) => v.join(" and ").toLowerCase(),
  },
};

/**
 * Pull the constraints out of a query string, dropping anything unparseable
 * rather than erroring. A hand-edited URL should degrade, not 500.
 *
 * @returns {object} normalised constraints, only the keys actually given
 */
const parseConstraints = (query = {}) => {
  const out = {};
  for (const [key, spec] of Object.entries(CONSTRAINTS)) {
    if (query[key] === undefined || query[key] === "") continue;
    const value = spec.parse(query[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
};

const needsOf = (constraints) => {
  const needs = new Set();
  for (const key of Object.keys(constraints)) {
    if (CONSTRAINTS[key].needs) needs.add(CONSTRAINTS[key].needs);
  }
  return needs;
};

const hasTerrain = (cg) =>
  typeof cg.elevation === "number" && !!cg.terrain && !!cg.terrain.positionLabel;

/**
 * Seasonality for one campground, or null if its climate is not cached.
 * Same call the show controller makes, so the two cannot disagree.
 */
const seasonOf = (cg) =>
  cg.climate ? analyseSeasonality(cg.climate, { elevation: cg.elevation }) : null;

/**
 * @returns {"match"|"miss"|"nodata"} nodata means we could not judge it, which
 *   is not the same as failing and must not be reported as one.
 */
const matchCampground = (cg, constraints) => {
  const needs = needsOf(constraints);

  if (needs.has("terrain") && !hasTerrain(cg)) return "nodata";

  let season = null;
  if (needs.has("climate")) {
    season = seasonOf(cg);
    if (!season) return "nodata";
  }

  for (const [key, value] of Object.entries(constraints)) {
    if (!CONSTRAINTS[key].test(cg, value, season, constraints)) return "miss";
  }
  return "match";
};

/**
 * @returns {{matched: object[], skipped: number}} skipped counts campgrounds
 *   that could not be judged for want of cached survey data.
 */
const filterCampgrounds = (campgrounds, constraints) => {
  if (!Object.keys(constraints).length) {
    return { matched: campgrounds, skipped: 0 };
  }

  const matched = [];
  let skipped = 0;

  for (const cg of campgrounds) {
    const result = matchCampground(cg, constraints);
    if (result === "match") matched.push(cg);
    else if (result === "nodata") skipped++;
  }

  return { matched, skipped };
};

/**
 * When nothing matched, work out which single constraint is doing the killing.
 * Cheap because we are already holding every campground: drop each constraint
 * in turn and re-count.
 *
 * @returns {Array<{key: string, phrase: string, count: number}>} most results
 *   first, only constraints whose removal actually finds something.
 */
const suggestRelaxations = (campgrounds, constraints) => {
  const keys = Object.keys(constraints);
  if (keys.length < 2) return [];

  return keys
    .map((key) => {
      const without = { ...constraints };
      delete without[key];
      return {
        key,
        phrase: CONSTRAINTS[key].describe(constraints[key]),
        count: filterCampgrounds(campgrounds, without).matched.length,
      };
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
};

/**
 * The query stated back in prose, so the page can say what it just asked for.
 * @returns {string} empty when nothing is constrained
 */
const describeConstraints = (constraints) => {
  const parts = Object.entries(constraints).map(([key, value]) =>
    CONSTRAINTS[key].describe(value),
  );
  if (!parts.length) return "";
  const sentence =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

module.exports = {
  parseConstraints,
  matchCampground,
  filterCampgrounds,
  suggestRelaxations,
  describeConstraints,
  ASPECT_GROUPS,
  RUGGEDNESS,
  SLOPE,
  POSITIONS,
  MONTHS,
};
