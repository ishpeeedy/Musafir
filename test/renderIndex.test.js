/**
 * Renders views/campgrounds/index.ejs in every shape the discovery work created.
 *
 * There is no browser driver here, so this is the check that catches a dangling
 * class, a local the controller stopped passing, or a form that silently fails
 * to repopulate. It asserts on the output rather than only that it did not
 * throw. Three handovers asked for this to stop being a scratchpad script.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const {
  parseConstraints,
  describeConstraints,
  ASPECT_GROUPS,
  RUGGEDNESS,
  SLOPE,
  POSITIONS,
  MONTHS,
} = require("../utils/discovery");
const { AMENITIES, TAGS } = require("../schemas");

const TEMPLATE = path.join(__dirname, "..", "views", "campgrounds", "index.ejs");
const source = fs.readFileSync(TEMPLATE, "utf8");

process.env.MAPTILER_API_KEY = "test-key";

const campground = (i, over = {}) => ({
  _id: `id${i}`,
  title: `Camp ${i}`,
  location: "Somewhere",
  description: "x".repeat(200),
  price: 500 + i,
  images: [],
  geometry: { coordinates: [78 + i, 30 + i] },
  elevation: 1392,
  terrain: { summary: "Southwest-facing mid slope, 2,025m of relief within 10km" },
  amenities: [],
  tags: [],
  ...over,
});

const analyseSeasonality = require("../utils/seasonality");

const MILD = { tMax: 24, tMin: 12, precip: 40, snow: 0 };
const climate = (overrides = {}) => ({
  monthly: Array.from({ length: 12 }, (_, i) => ({ ...MILD, ...(overrides[i] || {}) })),
  modelElevation: 1000,
  years: 10,
});

/** Mirrors what controllers/campgrounds.js index passes. */
const render = ({
  query = {},
  docs = [],
  total = 45,
  skipped = 0,
  relaxations = [],
  cards,
  weather = new Map(),
} = {}) => {
  const constraints = parseConstraints(query);
  return ejs.render(
    source,
    {
      layout: () => {},
      campgrounds: docs,
      cards:
        cards ||
        new Map(
          docs.map((d) => {
            const season = analyseSeasonality(climate(), { elevation: 1000 });
            return [
              String(d._id),
              {
                season,
                verdict: analyseSeasonality.verdictFor(season, new Date().getMonth()),
                profile: [100, 140, 190, 240, 300, 250, 200, 160],
                reviews: null,
              },
            ];
          }),
        ),
      weather,
      pagination: {
        page: 1,
        totalPages: Math.max(1, Math.ceil(docs.length / 10)),
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: 2,
        prevPage: 0,
        totalDocs: docs.length,
        base: new URLSearchParams(query).toString(),
      },
      filters: {},
      discovery: {
        constraints,
        summary: describeConstraints(constraints),
        skipped,
        surveyed: total - skipped,
        total,
        relaxations,
        options: {
          aspects: Object.keys(ASPECT_GROUPS),
          ruggedness: RUGGEDNESS,
          slope: SLOPE,
          positions: POSITIONS,
          months: MONTHS,
          amenities: AMENITIES,
          tags: TAGS,
        },
      },
      clusterMapData: { type: "FeatureCollection", features: [] },
    },
    { filename: TEMPLATE },
  );
};

test("the unconstrained page says nothing about constraints", async (t) => {
  const html = render({ docs: [campground(1), campground(2)] });

  await t.test("no summary line", () => {
    assert.ok(!html.includes("survey-summary"));
  });

  await t.test("no survey-data note", () => {
    assert.ok(!html.includes("survey-note"));
  });

  await t.test("still lists the campgrounds", () => {
    assert.ok(html.includes("Camp 1") && html.includes("Camp 2"));
  });
});

test("the sidebar offers only values that can match", async (t) => {
  const html = render({ docs: [campground(1)] });

  await t.test("every aspect group", () => {
    for (const a of Object.keys(ASPECT_GROUPS)) {
      const label = a.charAt(0).toUpperCase() + a.slice(1);
      assert.ok(html.includes(`${label}-facing`), `${a} missing`);
    }
  });

  await t.test("every terrain scale, from the same tables discovery matches on", () => {
    for (const r of RUGGEDNESS) assert.ok(html.includes(`>${r}<`), `${r} missing`);
    for (const s of SLOPE) assert.ok(html.includes(`>${s}<`), `${s} missing`);
    for (const p of POSITIONS) assert.ok(html.includes(`>${p}<`), `${p} missing`);
  });

  await t.test("all twelve months", () => {
    for (const m of MONTHS) assert.ok(html.includes(`>${m}<`), `${m} missing`);
  });

  await t.test("season controls are lettered in the second ink", () => {
    assert.ok(html.includes("filter-label--sky"));
    assert.ok(html.includes("filter-select--sky"));
  });
});

test("an active query is stated back and repopulates the form", async (t) => {
  const html = render({
    query: { elevMin: "2000", aspect: "south", primeIn: "12" },
    docs: [campground(1)],
    skipped: 3,
  });

  await t.test("in prose", () => {
    assert.ok(
      html.includes("Above 2,000 m, facing south and prime in December."),
      "summary line missing or wrong",
    );
  });

  await t.test("with the count it could not judge", () => {
    assert.ok(html.includes("3 of 45 campgrounds have no survey data"));
  });

  await t.test("and every control comes back set", () => {
    assert.ok(html.includes('value="2000"'), "elevMin not repopulated");
    assert.ok(/value="south"\s+selected/.test(html), "aspect not reselected");
    assert.ok(/value="12"\s+selected/.test(html), "primeIn not reselected");
  });
});

test("checkbox constraints round-trip", async (t) => {
  const html = render({
    query: { amenities: ["Toilets", "Showers"], noSnow: "1" },
    docs: [campground(1)],
  });

  await t.test("ticked boxes come back ticked", () => {
    assert.ok(/value="Toilets"\s+checked/.test(html));
    assert.ok(/value="Showers"\s+checked/.test(html));
  });

  await t.test("unticked ones do not", () => {
    assert.ok(!/value="Wi-Fi"\s+checked/.test(html));
  });

  await t.test("flags too", () => {
    assert.ok(/name="noSnow" value="1" checked/.test(html));
  });
});

test("an empty result offers a way out instead of shrugging", async (t) => {
  const html = render({
    query: { elevMin: "9000", aspect: "south" },
    docs: [],
    relaxations: [
      { key: "elevMin", phrase: "above 9,000 m", count: 12, href: "/campgrounds?aspect=south" },
      { key: "aspect", phrase: "facing south", count: 2, href: "/campgrounds?elevMin=9000" },
    ],
  });

  await t.test("names each condition and what dropping it would find", () => {
    assert.ok(html.includes("Nothing matches"));
    assert.ok(html.includes("Without <em>above 9,000 m</em>"));
    assert.ok(html.includes(">12</span>"));
  });

  await t.test("links drop exactly one condition", () => {
    assert.ok(html.includes('href="/campgrounds?aspect=south"'));
    assert.ok(html.includes('href="/campgrounds?elevMin=9000"'));
  });

  await t.test("falls back to clear-all when no single drop helps", () => {
    const bare = render({ query: { elevMin: "9000" }, docs: [] });
    assert.ok(bare.includes('href="/campgrounds"'));
    assert.ok(!bare.includes("relax-list"));
  });
});

test("the card carries both plates", async (t) => {
  const html = render({
    docs: [campground(1)],
    weather: new Map([["id1", { temp_c: 24, condition: "Sunny", icon: "/images/weather/sunny.gif" }]]),
  });

  await t.test("the land: sparkline, terrain prose, elevation", () => {
    assert.ok(html.includes('data-profile="100,140,190,240,300,250,200,160"'));
    assert.ok(html.includes("Southwest-facing mid slope"));
    assert.ok(html.includes("1,392 m"));
  });

  await t.test("the sky: twelve months, temperatures, initials, best window", () => {
    assert.strictEqual((html.match(/camp-strip__m /g) || []).length, 12);
    assert.strictEqual((html.match(/camp-strip__t"/g) || []).length, 12);
    assert.ok(html.includes("camp-strip__scale"), "months need initials to be readable");
    assert.ok(html.includes("Best all year"));
    // MILD is 24/12 every month, so both figures must appear per column.
    assert.ok(html.includes("<b>24</b><i>12</i>"));
  });

  await t.test("current conditions sit under the price, not in the sky column", () => {
    const identity = html.slice(
      html.indexOf("camp-card__cost"),
      html.indexOf("camp-card__land"),
    );
    assert.ok(identity.includes("/images/weather/sunny.gif"), "weather art belongs under the price");
    assert.ok(identity.includes("24°"));
  });

  await t.test("the title is held to one line", () => {
    assert.ok(!html.includes("camp-card__head"), "the title/weather row is gone");
  });

  await t.test("both plates are labelled", () => {
    assert.ok(html.includes("The land"));
    assert.ok(html.includes("When to go"));
  });

  await t.test("exactly one month is marked as now", () => {
    assert.strictEqual((html.match(/camp-strip__m--now/g) || []).length, 1);
  });

  await t.test("the verdict answers the question at a glance", () => {
    // Twelve mild months, so every month is prime whatever today's date is.
    assert.ok(html.includes("Good now"));
  });

  await t.test("price is text, not the accent panel", () => {
    assert.ok(html.includes("camp-card__cost"));
    assert.ok(!html.includes("camp-card__price"));
  });

  await t.test("the description excerpt is gone, it duplicated the terrain line", () => {
    assert.ok(!html.includes("camp-card__desc"));
  });

  await t.test("the legend appears once for the list, not once per row", () => {
    const many = render({ docs: [campground(1), campground(2), campground(3)] });
    assert.strictEqual((many.match(/results-key"/g) || []).length, 1);
  });
});

test("tags and amenities are on the row", async (t) => {
  await t.test("both render as chips", () => {
    const html = render({
      docs: [campground(1, { tags: ["Mountain", "Remote"], amenities: ["Toilets"] })],
    });
    assert.ok(html.includes(">Mountain<"));
    assert.ok(html.includes(">Remote<"));
    assert.ok(html.includes(">Toilets<"));
    assert.ok(html.includes("camp-chip--tag"), "tags are weighted apart from amenities");
  });

  await t.test("absence is stated, not filled in with a guess", () => {
    const html = render({ docs: [campground(1)] });
    assert.ok(html.includes("No amenities recorded"));
    assert.ok(!html.includes("camp-chips"));
  });
});

test("review signal", async (t) => {
  const season = analyseSeasonality(climate(), { elevation: 1000 });

  await t.test("shows the mean and the count", () => {
    const html = render({
      docs: [campground(1)],
      cards: new Map([
        ["id1", { season, verdict: null, profile: null, reviews: { count: 3, mean: 4.3 } }],
      ]),
    });
    assert.ok(html.includes("4.3"));
    assert.ok(html.includes("3 notes"));
  });

  await t.test("singular for one", () => {
    const html = render({
      docs: [campground(1)],
      cards: new Map([
        ["id1", { season, verdict: null, profile: null, reviews: { count: 1, mean: 5 } }],
      ]),
    });
    assert.ok(html.includes("1 note<"));
  });

  await t.test("says nothing at all when there are none", () => {
    const html = render({ docs: [campground(1)] });
    assert.ok(!html.includes("camp-card__reviews"));
  });
});

test("a card degrades when the survey data is not cached", async (t) => {
  const bare = campground(2, { elevation: undefined, terrain: undefined });
  const html = render({
    docs: [bare],
    cards: new Map([["id2", { season: null, profile: null }]]),
  });

  await t.test("says so rather than rendering an empty slot", () => {
    assert.ok(html.includes("No survey data yet."));
  });

  await t.test("draws no sparkline and no strip", () => {
    assert.ok(!html.includes("camp-spark"));
    assert.ok(!html.includes("camp-strip"));
  });

  await t.test("and still renders the card", () => {
    assert.ok(html.includes("Camp 2"));
  });
});

test("the constraint band folds", async (t) => {
  await t.test("secondary conditions are closed when unused", () => {
    const html = render({ docs: [campground(1)] });
    assert.ok(html.includes("More conditions"));
    assert.ok(!/<details class="filter-fold" open>/.test(html));
  });

  await t.test("but open themselves when something inside is active", () => {
    const html = render({ query: { ruggedMax: "Smooth" }, docs: [campground(1)] });
    assert.ok(/<details class="filter-fold" open>/.test(html));
  });

  await t.test("amenities fold carries a count when active", () => {
    const html = render({ query: { amenities: ["Toilets", "Showers"] }, docs: [campground(1)] });
    assert.ok(html.includes('<span class="filter-fold__count">2</span>'));
  });

  await t.test("the sidebar is gone", () => {
    const html = render({ docs: [campground(1)] });
    assert.ok(!html.includes("explore-sidebar"));
    assert.ok(!html.includes("sidebar-add-cta"));
    assert.ok(html.includes("+ Add Campground"), "the add CTA must survive the move");
  });
});

test("pagination carries the whole query, not just the old four fields", () => {
  const html = render({
    query: { elevMin: "2000", aspect: "south", primeIn: "12" },
    docs: Array.from({ length: 25 }, (_, i) => campground(i)),
  });
  // The bug this guards: qBase was assembled from named fields, so paging past
  // page 1 silently dropped every terrain and season constraint.
  assert.ok(html.includes("elevMin=2000"), "elevMin lost from pagination links");
  assert.ok(html.includes("aspect=south"), "aspect lost from pagination links");
  assert.ok(html.includes("primeIn=12"), "primeIn lost from pagination links");
});
