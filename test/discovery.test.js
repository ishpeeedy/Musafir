const test = require("node:test");
const assert = require("node:assert");
const {
  parseConstraints,
  matchCampground,
  filterCampgrounds,
  suggestRelaxations,
  describeConstraints,
} = require("../utils/discovery");

/** Twelve identical months, overridden per index. */
const climate = (base, overrides = {}) => ({
  monthly: Array.from({ length: 12 }, (_, i) => ({ ...base, ...(overrides[i] || {}) })),
  modelElevation: 1000,
  years: 10,
});

const MILD = { tMax: 24, tMin: 12, precip: 40, snow: 0 };

// A campground with everything cached. elevation matches modelElevation so the
// lapse-rate correction is a no-op and the thresholds stay readable.
const camp = (over = {}) => ({
  title: "Test",
  elevation: 1000,
  amenities: [],
  tags: [],
  terrain: {
    relief: 400,
    positionLabel: "Mid slope",
    aspectCompass: "S",
    slopeLabel: "Gentle",
    ruggednessLabel: "Undulating",
  },
  climate: climate(MILD),
  ...over,
});

test("parseConstraints keeps what it understands and drops the rest", async (t) => {
  await t.test("reads numbers, months, groups and flags", () => {
    const c = parseConstraints({
      elevMin: "2000",
      primeIn: "12",
      aspect: "south",
      noSnow: "1",
    });
    assert.deepStrictEqual(c, {
      elevMin: 2000,
      primeIn: 12,
      aspect: "south",
      noSnow: true,
    });
  });

  await t.test("drops junk rather than throwing", () => {
    const c = parseConstraints({
      elevMin: "not a number",
      primeIn: "13",
      aspect: "sideways",
      ruggedMax: "Fluffy",
    });
    assert.deepStrictEqual(c, {});
  });

  await t.test("ignores empty strings, which is what a blank form field sends", () => {
    assert.deepStrictEqual(parseConstraints({ elevMin: "", aspect: "" }), {});
  });

  await t.test("takes a comma list or a repeated field for multi-value keys", () => {
    assert.deepStrictEqual(parseConstraints({ amenities: "Toilets,Showers" }).amenities, [
      "Toilets",
      "Showers",
    ]);
    assert.deepStrictEqual(parseConstraints({ amenities: ["Toilets", "Firepit"] }).amenities, [
      "Toilets",
      "Firepit",
    ]);
  });

  await t.test("drops values outside the shared enums", () => {
    assert.deepStrictEqual(parseConstraints({ amenities: "Toilets,Helipad" }).amenities, [
      "Toilets",
    ]);
    assert.strictEqual(parseConstraints({ tags: "Nonsense" }).tags, undefined);
  });
});

test("terrain constraints", async (t) => {
  await t.test("elevation bounds are inclusive", () => {
    assert.strictEqual(matchCampground(camp(), { elevMin: 1000 }), "match");
    assert.strictEqual(matchCampground(camp(), { elevMax: 1000 }), "match");
    assert.strictEqual(matchCampground(camp(), { elevMin: 1001 }), "miss");
  });

  await t.test("aspect groups overlap at the diagonals", () => {
    const se = camp({ terrain: { ...camp().terrain, aspectCompass: "SE" } });
    assert.strictEqual(matchCampground(se, { aspect: "south" }), "match");
    assert.strictEqual(matchCampground(se, { aspect: "east" }), "match");
    assert.strictEqual(matchCampground(se, { aspect: "north" }), "miss");
  });

  await t.test("a flat campground has no aspect and cannot satisfy one", () => {
    const flat = camp({ terrain: { ...camp().terrain, aspectCompass: null } });
    assert.strictEqual(matchCampground(flat, { aspect: "south" }), "miss");
  });

  await t.test("ruggedness and slope bound a scale rather than match a value", () => {
    assert.strictEqual(matchCampground(camp(), { ruggedMax: "Undulating" }), "match");
    assert.strictEqual(matchCampground(camp(), { ruggedMax: "Highly broken" }), "match");
    assert.strictEqual(matchCampground(camp(), { ruggedMax: "Smooth" }), "miss");
    assert.strictEqual(matchCampground(camp(), { slopeMax: "Very steep" }), "match");
    assert.strictEqual(matchCampground(camp(), { slopeMax: "Level" }), "miss");
  });

  await t.test("position takes a set", () => {
    assert.strictEqual(
      matchCampground(camp(), { position: ["Mid slope", "Ridge"] }),
      "match",
    );
    assert.strictEqual(matchCampground(camp(), { position: ["Ridge"] }), "miss");
  });

  await t.test("constraints compose, and all must hold", () => {
    const c = { elevMin: 500, aspect: "south", ruggedMax: "Broken" };
    assert.strictEqual(matchCampground(camp(), c), "match");
    assert.strictEqual(matchCampground(camp(), { ...c, elevMin: 3000 }), "miss");
  });
});

test("season constraints", async (t) => {
  await t.test("prime in a named month", () => {
    // December is monsoon-grade wet, everything else is mild.
    const wetDec = camp({ climate: climate(MILD, { 11: { ...MILD, precip: 300 } }) });
    assert.strictEqual(matchCampground(wetDec, { primeIn: 1 }), "match");
    assert.strictEqual(matchCampground(wetDec, { primeIn: 12 }), "miss");
  });

  await t.test("minimum length of the best window", () => {
    const halfWet = camp({
      climate: climate(MILD, Object.fromEntries(
        [6, 7, 8].map((i) => [i, { ...MILD, precip: 300 }]),
      )),
    });
    assert.strictEqual(matchCampground(halfWet, { primeMin: 9 }), "match");
    assert.strictEqual(matchCampground(halfWet, { primeMin: 10 }), "miss");
  });

  await t.test("never snowbound", () => {
    const snowy = camp({ climate: climate(MILD, { 0: { ...MILD, snow: 40 } }) });
    assert.strictEqual(matchCampground(camp(), { noSnow: true }), "match");
    assert.strictEqual(matchCampground(snowy, { noSnow: true }), "miss");
  });
});

test("frost is a modifier, not a state", async (t) => {
  // The Shimla case: comfortable days, freezing nights, not enough snow to trip
  // the snowbound threshold. Must stay prime and carry the warning.
  const shimla = camp({
    climate: climate(MILD, {
      0: { tMax: 12, tMin: -2, precip: 60, snow: 5 },
      1: { tMax: 14, tMin: -1, precip: 60, snow: 2 },
    }),
  });

  await t.test("a frosty month is still prime", () => {
    assert.strictEqual(matchCampground(shimla, { primeIn: 1 }), "match");
  });

  await t.test("but noFrost rules it out", () => {
    assert.strictEqual(matchCampground(shimla, { primeIn: 1, noFrost: true }), "miss");
    assert.strictEqual(matchCampground(shimla, { primeIn: 6, noFrost: true }), "match");
  });

  await t.test("without a named month, noFrost tests the best window", () => {
    assert.strictEqual(matchCampground(shimla, { noFrost: true }), "miss");
    assert.strictEqual(matchCampground(camp(), { noFrost: true }), "match");
  });

  await t.test("the summary says so out loud", () => {
    const analyse = require("../utils/seasonality");
    const s = analyse(shimla.climate, { elevation: shimla.elevation });
    assert.match(s.summary, /Freezing nights in January, February\./);
    assert.strictEqual(s.months[0].frost, true);
    assert.strictEqual(s.months[5].frost, false);
    assert.strictEqual(s.months[0].state, "prime", "frost must not steal the state");
  });
});

test("the verdict says where a place stands today", async (t) => {
  const analyse = require("../utils/seasonality");
  const seasonOf = (over) => analyse(climate(MILD, over), { elevation: 1000 });

  await t.test("prime today reads as good now", () => {
    const v = analyse.verdictFor(seasonOf({}), 0);
    assert.strictEqual(v.good, true);
    assert.strictEqual(v.next, null);
  });

  await t.test("otherwise it names the next good month, not the best window", () => {
    // Best run is April to June (3 months). November is also prime. Standing in
    // October, the useful answer is November, not April.
    const wet = { ...MILD, precip: 300 };
    const v = analyse.verdictFor(
      seasonOf({ 0: wet, 1: wet, 2: wet, 6: wet, 7: wet, 8: wet, 9: wet, 11: wet }),
      9,
    );
    assert.strictEqual(v.good, false);
    assert.strictEqual(v.label, "Monsoon");
    assert.strictEqual(v.next, "November");
  });

  await t.test("wraps into next year", () => {
    const wet = { ...MILD, precip: 300 };
    const v = analyse.verdictFor(seasonOf({ 10: wet, 11: wet }), 11);
    assert.strictEqual(v.next, "January");
  });

  await t.test("says so when nothing is ever comfortable", () => {
    const v = analyse.verdictFor(
      seasonOf(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, { ...MILD, precip: 300 }]))),
      5,
    );
    assert.strictEqual(v.good, false);
    assert.strictEqual(v.next, null);
  });

  await t.test("carries frost through, since a good month can still freeze", () => {
    const v = analyse.verdictFor(
      seasonOf({ 0: { tMax: 12, tMin: -2, precip: 40, snow: 0 } }),
      0,
    );
    assert.strictEqual(v.good, true);
    assert.strictEqual(v.frost, true);
  });

  await t.test("no climate means no verdict, not a wrong one", () => {
    assert.strictEqual(analyse.verdictFor(null, 0), null);
  });
});

test("amenities and tags require all of what was asked for", async (t) => {
  const kitted = camp({ amenities: ["Toilets", "Showers", "Firepit"], tags: ["Forest"] });

  await t.test("matches when every requested value is present", () => {
    assert.strictEqual(
      matchCampground(kitted, { amenities: ["Toilets", "Showers"] }),
      "match",
    );
  });

  await t.test("misses when one is absent", () => {
    assert.strictEqual(matchCampground(kitted, { amenities: ["Wi-Fi"] }), "miss");
  });

  await t.test("needs no survey data, so an unsurveyed campground can still match", () => {
    const bare = { amenities: ["Toilets"], tags: [] };
    assert.strictEqual(matchCampground(bare, { amenities: ["Toilets"] }), "match");
  });
});

test("campgrounds that cannot be judged are set aside, not failed", async (t) => {
  await t.test("no cached grid means no terrain answer", () => {
    const bare = camp({ elevation: undefined, terrain: undefined });
    assert.strictEqual(matchCampground(bare, { elevMin: 500 }), "nodata");
  });

  await t.test("no cached climate means no season answer", () => {
    const bare = camp({ climate: undefined });
    assert.strictEqual(matchCampground(bare, { primeIn: 1 }), "nodata");
  });

  await t.test("unusable climate is nodata, not a miss", () => {
    const broken = camp({ climate: { monthly: [], modelElevation: 1000, years: 10 } });
    assert.strictEqual(matchCampground(broken, { primeIn: 1 }), "nodata");
  });

  await t.test("only the data a constraint actually needs is required", () => {
    const noClimate = camp({ climate: undefined });
    assert.strictEqual(matchCampground(noClimate, { elevMin: 500 }), "match");
  });

  await t.test("filterCampgrounds counts them separately from misses", () => {
    const list = [
      camp({ elevation: 3000 }),
      camp({ elevation: 100 }),
      camp({ elevation: undefined, terrain: undefined }),
    ];
    const { matched, skipped } = filterCampgrounds(list, { elevMin: 1000 });
    assert.strictEqual(matched.length, 1);
    assert.strictEqual(skipped, 1);
  });
});

test("with no constraints everything passes through untouched", () => {
  const list = [camp(), camp()];
  const { matched, skipped } = filterCampgrounds(list, {});
  assert.strictEqual(matched, list, "should not copy the array when there is nothing to do");
  assert.strictEqual(skipped, 0);
});

test("relaxation suggestions name the constraint doing the damage", async (t) => {
  const list = [
    camp({ elevation: 3000, terrain: { ...camp().terrain, aspectCompass: "N" } }),
    camp({ elevation: 300 }),
    camp({ elevation: 400 }),
  ];

  await t.test("ranks by how many results dropping each constraint would find", () => {
    const out = suggestRelaxations(list, { elevMin: 2000, aspect: "south" });
    assert.strictEqual(out.length, 2);
    assert.strictEqual(out[0].key, "elevMin", "dropping elevation finds the most");
    assert.strictEqual(out[0].count, 2);
    assert.strictEqual(out[1].key, "aspect");
    assert.strictEqual(out[1].count, 1);
  });

  await t.test("carries the phrase so the page can say it", () => {
    const out = suggestRelaxations(list, { elevMin: 2000, aspect: "south" });
    assert.strictEqual(out[0].phrase, "above 2,000 m");
  });

  await t.test("says nothing useful about a single constraint", () => {
    assert.deepStrictEqual(suggestRelaxations(list, { elevMin: 2000 }), []);
  });

  await t.test("omits constraints whose removal still finds nothing", () => {
    // Nothing in the list is smooth and nothing is that high, so dropping
    // either one on its own still leaves an empty result. Suggesting it would
    // be worse than saying nothing.
    const out = suggestRelaxations(list, { elevMin: 9000, ruggedMax: "Smooth" });
    assert.deepStrictEqual(out, []);
  });
});

test("describeConstraints states the query back in prose", async (t) => {
  await t.test("one constraint", () => {
    assert.strictEqual(describeConstraints({ elevMin: 2000 }), "Above 2,000 m");
  });

  await t.test("two are joined with and", () => {
    assert.strictEqual(
      describeConstraints({ elevMin: 2000, aspect: "south" }),
      "Above 2,000 m and facing south",
    );
  });

  await t.test("three or more take commas then a final and", () => {
    assert.strictEqual(
      describeConstraints({ elevMin: 2000, aspect: "south", primeIn: 12 }),
      "Above 2,000 m, facing south and prime in December",
    );
  });

  await t.test("nothing constrained says nothing", () => {
    assert.strictEqual(describeConstraints({}), "");
  });
});
