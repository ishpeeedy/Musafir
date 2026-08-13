const test = require("node:test");
const assert = require("node:assert");
const analyseSeasonality = require("../utils/seasonality");

// A benign month: warm enough, dry enough, no snow.
const MILD = { tMax: 24, tMin: 12, precip: 30, snow: 0 };

/** Twelve mild months, with overrides applied by zero-based month index. */
const year = (overrides = {}) => ({
  modelElevation: 1000,
  years: 10,
  monthly: Array.from({ length: 12 }, (_, i) => ({ ...MILD, ...overrides[i] })),
});

const statesOf = (result) => result.months.map((m) => m.state);

test("classifies months by what would actually stop you camping", async (t) => {
  await t.test("a mild year is prime throughout", () => {
    const r = analyseSeasonality(year(), { elevation: 1000 });
    assert.deepStrictEqual(new Set(statesOf(r)), new Set(["prime"]));
    assert.strictEqual(r.bestWindow.length, 12);
    assert.match(r.summary, /Best all year/);
  });

  await t.test("lying snow outranks everything else", () => {
    // Both snowbound and monsoon-wet: snow must win.
    const r = analyseSeasonality(year({ 0: { snow: 60, precip: 400 } }), {
      elevation: 1000,
    });
    assert.strictEqual(r.months[0].state, "snowbound");
  });

  await t.test("a day that never gets above freezing is snowbound", () => {
    const r = analyseSeasonality(year({ 0: { tMax: -1, snow: 0 } }), {
      elevation: 1000,
    });
    assert.strictEqual(r.months[0].state, "snowbound");
  });

  await t.test("monsoon rain outranks heat", () => {
    const r = analyseSeasonality(year({ 6: { precip: 400, tMax: 38 } }), {
      elevation: 1000,
    });
    assert.strictEqual(r.months[6].state, "wet");
  });

  await t.test("heat and cold are recognised", () => {
    const r = analyseSeasonality(
      year({ 4: { tMax: 41 }, 11: { tMin: -12 } }),
      { elevation: 1000 },
    );
    assert.strictEqual(r.months[4].state, "hot");
    assert.strictEqual(r.months[11].state, "cold");
  });
});

test("temperatures are corrected to the real elevation", async (t) => {
  await t.test("higher than the model cell reads colder", () => {
    // 1000m above the cell at 6.5C/km is 6.5C colder.
    const r = analyseSeasonality(year(), { elevation: 2000 });
    assert.strictEqual(r.months[0].tMax, 24 - 6.5);
    assert.strictEqual(r.months[0].tMin, 12 - 6.5);
    assert.strictEqual(r.elevationCorrectionC, 6.5);
  });

  await t.test("lower than the model cell reads warmer", () => {
    // 500m below the cell is 3.25C warmer, rounded to one decimal for display
    const r = analyseSeasonality(year(), { elevation: 500 });
    assert.strictEqual(r.months[0].tMax, 27.3);
  });

  await t.test("the correction can change a verdict", () => {
    // Mild at the cell. 3000m higher the nights are freezing but the days are
    // not, so it is cold rather than snowbound.
    const cold = analyseSeasonality(year(), { elevation: 4000 });
    assert.strictEqual(cold.months[0].state, "cold");
    assert.strictEqual(cold.months[0].tMax, 4.5);

    // 4000m higher and the day never gets above freezing.
    const frozen = analyseSeasonality(year(), { elevation: 5000 });
    assert.strictEqual(frozen.months[0].state, "snowbound");
  });

  await t.test("rainfall survives the temperature correction", () => {
    // Regression: the correction used to rebuild each month by spreading it,
    // which drops every field when the input is a Mongoose subdocument rather
    // than a plain object. precip and snow went undefined, so wet and
    // snowbound months silently reported as prime on the live page while every
    // unit test still passed.
    const wet = year({ 6: { precip: 400, snow: 30 } });
    const r = analyseSeasonality(wet, { elevation: 2000 });
    assert.strictEqual(r.months[6].precip, 400);
    assert.strictEqual(r.months[6].snow, 30);
    assert.strictEqual(r.months[6].state, "snowbound");
  });

  await t.test("reads fields through getters, not own properties", () => {
    // Stand-in for a Mongoose document: values only reachable via the
    // prototype, exactly the shape that broke this before.
    const asDoc = (o) => Object.create({ ...o }, { _internal: { value: 1 } });
    const climate = year({ 6: { precip: 400 } });
    climate.monthly = climate.monthly.map(asDoc);
    const r = analyseSeasonality(climate, { elevation: 2000 });
    assert.strictEqual(r.months[6].state, "wet");
  });

  await t.test("no elevation means no correction, not a crash", () => {
    const r = analyseSeasonality(year());
    assert.strictEqual(r.months[0].tMax, 24);
    assert.strictEqual(r.elevationCorrectionC, 0);
  });
});

test("finds the best window", async (t) => {
  await t.test("picks the longest run of prime months", () => {
    const wet = { precip: 400 };
    // Monsoon June to September, prime the rest.
    const r = analyseSeasonality(year({ 5: wet, 6: wet, 7: wet, 8: wet }), {
      elevation: 1000,
    });
    assert.strictEqual(r.primeCount, 8);
    assert.match(r.summary, /Under monsoon June to September/);
  });

  await t.test("a window wrapping December into January is one run", () => {
    const hot = { tMax: 42 };
    // Too hot April to September: the good spell runs October to March.
    const overrides = {};
    for (let i = 3; i <= 8; i++) overrides[i] = hot;
    const r = analyseSeasonality(year(overrides), { elevation: 1000 });
    assert.strictEqual(r.bestWindow.length, 6);
    assert.strictEqual(r.bestWindow.from, 10); // October
    assert.strictEqual(r.bestWindow.to, 3); // March
    assert.match(r.summary, /Best October to March/);
  });

  await t.test("names both spells when two are equally good", () => {
    // Snowbound winter, monsoon summer, leaving a good month either side.
    const overrides = {};
    for (const i of [0, 1, 2, 3, 4]) overrides[i] = { snow: 60 };
    for (const i of [6, 7]) overrides[i] = { precip: 400 };
    for (const i of [9, 10, 11]) overrides[i] = { snow: 60 };
    // June and September are the only prime months, one each side of monsoon.
    const r = analyseSeasonality(year(overrides), { elevation: 1000 });
    assert.strictEqual(r.primeCount, 2);
    assert.match(r.summary, /Best June, and again September\./);
  });

  await t.test("names the least hostile month when nothing is comfortable", () => {
    const overrides = {};
    for (let i = 0; i < 12; i++) overrides[i] = { snow: 80 };
    overrides[6] = { tMin: -9, snow: 0, tMax: 5 }; // cold, but the best on offer
    const r = analyseSeasonality(year(overrides), { elevation: 1000 });
    assert.strictEqual(r.bestWindow, null);
    assert.match(r.summary, /No comfortable window/);
    assert.match(r.summary, /July is the least hostile/);
  });
});

test("rejects input it cannot use", async (t) => {
  await t.test("missing climate", () => {
    assert.strictEqual(analyseSeasonality(null), null);
    assert.strictEqual(analyseSeasonality({}), null);
  });

  await t.test("wrong number of months", () => {
    assert.strictEqual(analyseSeasonality({ monthly: [MILD, MILD] }), null);
  });

  await t.test("a non-finite reading", () => {
    const bad = year();
    bad.monthly[3].precip = NaN;
    assert.strictEqual(analyseSeasonality(bad), null);
  });
});
