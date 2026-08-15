const test = require("node:test");
const assert = require("node:assert");
const analyseTerrain = require("../utils/terrainAnalysis");

const GRID_SIZE = 10;

// Build a 10x10 grid from f(row, col). Row 0 is south, col 0 is west.
const grid = (f) => {
  const out = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) out.push(f(row, col));
  }
  return out;
};

test("the fall line is sampled down the slope, not across it", async (t) => {
  const { sampleFallLine } = analyseTerrain;

  await t.test("descends monotonically on a uniform slope", () => {
    // Rises 100m per row northward, so the land falls due south, bearing 180.
    const line = sampleFallLine(grid((row) => row * 100), 180, { samples: 10 });
    assert.strictEqual(line.length, 10);
    for (let i = 1; i < line.length; i++) {
      assert.ok(line[i] < line[i - 1], `sample ${i} should be lower than ${i - 1}`);
    }
  });

  await t.test("spans the real relief, unlike a cut across the hill", () => {
    const g = grid((row) => row * 100);
    const down = sampleFallLine(g, 180, { samples: 10 });
    const across = sampleFallLine(g, 90, { samples: 10 });
    assert.ok(Math.max(...down) - Math.min(...down) > 800, "fall line should span the slope");
    assert.ok(
      Math.max(...across) - Math.min(...across) < 1,
      "a cut across a uniform slope is flat, which is the reason not to use one",
    );
  });

  await t.test("the centre sample is the campground's own elevation", () => {
    const line = sampleFallLine(grid((row) => row * 100), 180, { samples: 11 });
    assert.strictEqual(Math.round(line[5]), 450);
  });

  await t.test("a null bearing falls back to west-east", () => {
    // Ground too flat to have a fall line still gets a cut, and the fallback is
    // the same west-east one the show page uses. Land rising eastward, so a
    // west-east cut spans the whole range.
    const line = sampleFallLine(grid((row, col) => col * 100), null, { samples: 10 });
    assert.strictEqual(line.length, 10);
    assert.ok(Math.max(...line) - Math.min(...line) > 800);
  });

  await t.test("a flat grid stays flat", () => {
    const line = sampleFallLine(grid(() => 500), null, { samples: 8 });
    assert.ok(line.every((v) => Math.abs(v - 500) < 1e-9));
  });

  await t.test("stays inside the grid on a diagonal", () => {
    const g = grid((row, col) => row * 10 + col);
    const line = sampleFallLine(g, 225, { samples: 12 });
    assert.ok(line.every((v) => v >= Math.min(...g) && v <= Math.max(...g)));
  });

  await t.test("rejects a grid it cannot use", () => {
    assert.strictEqual(sampleFallLine([1, 2, 3], 180), null);
    assert.strictEqual(sampleFallLine(grid(() => NaN), 180), null);
  });
});

test("aspect points downhill, not uphill", async (t) => {
  await t.test("land rising north faces south", () => {
    const r = analyseTerrain(grid((row) => row * 100));
    assert.strictEqual(r.aspectName, "South");
    assert.strictEqual(r.aspectBearing, 180);
  });

  await t.test("land rising east faces west", () => {
    const r = analyseTerrain(grid((row, col) => col * 100));
    assert.strictEqual(r.aspectName, "West");
    assert.strictEqual(r.aspectBearing, 270);
  });

  await t.test("land rising northeast faces southwest", () => {
    const r = analyseTerrain(grid((row, col) => (row + col) * 100));
    assert.strictEqual(r.aspectName, "Southwest");
  });
});

test("elevation is read at the true centre, not index 54", () => {
  // Rises 100m per row northward. The centre of a 10x10 grid sits between rows
  // 4 and 5, so the correct answer is 450. Cell 54 is row 5, giving 500.
  const r = analyseTerrain(grid((row) => row * 100));
  assert.strictEqual(r.elevation, 450);
});

test("position reflects where the campground sits in the local distribution", async (t) => {
  await t.test("peak at centre reads as a ridge", () => {
    const r = analyseTerrain(
      grid((row, col) => 2000 - 40 * Math.hypot(row - 4.5, col - 4.5)),
    );
    assert.strictEqual(r.positionLabel, "Ridge");
    assert.ok(r.percentile > 90, `expected high percentile, got ${r.percentile}`);
  });

  await t.test("bowl at centre reads as a valley floor", () => {
    const r = analyseTerrain(
      grid((row, col) => 800 + 50 * Math.hypot(row - 4.5, col - 4.5)),
    );
    assert.strictEqual(r.positionLabel, "Valley floor");
    assert.ok(r.percentile < 10, `expected low percentile, got ${r.percentile}`);
  });
});

test("flat ground reports no slope and no aspect", () => {
  const r = analyseTerrain(grid(() => 1500));
  assert.strictEqual(r.relief, 0);
  assert.strictEqual(r.slopeDegrees, 0);
  // A percentile rank over identical values is noise, so it must not be dressed
  // up as "mid slope". Aspect is meaningless without a downhill direction.
  assert.strictEqual(r.positionLabel, "Level ground");
  assert.strictEqual(r.aspectName, null);
  assert.strictEqual(r.aspectBearing, null);
  assert.ok(!r.summary.includes("facing"));
});

test("summary reads as prose", () => {
  const r = analyseTerrain(grid((row) => row * 100));
  assert.strictEqual(r.summary, "South-facing mid slope, 900m of relief within 10km");
});

test("slope steepens as the grid steepens", () => {
  const gentle = analyseTerrain(grid((row) => row * 10)).slopeDegrees;
  const steep = analyseTerrain(grid((row) => row * 200)).slopeDegrees;
  assert.ok(steep > gentle, `${steep} should exceed ${gentle}`);
});

test("ruggedness separates smooth slopes from broken ground", () => {
  const smooth = analyseTerrain(grid((row) => row * 100)).ruggedness;
  const broken = analyseTerrain(
    grid((row, col) => ((row + col) % 2 === 0 ? 1000 : 1400)),
  ).ruggedness;
  assert.ok(broken > smooth, `${broken} should exceed ${smooth}`);
});

test("rejects grids it cannot analyse", async (t) => {
  await t.test("wrong length", () => {
    assert.strictEqual(analyseTerrain([1, 2, 3]), null);
  });

  await t.test("not an array", () => {
    assert.strictEqual(analyseTerrain(null), null);
  });

  await t.test("non-finite values", () => {
    const bad = grid(() => 100);
    bad[42] = NaN;
    assert.strictEqual(analyseTerrain(bad), null);
  });
});
