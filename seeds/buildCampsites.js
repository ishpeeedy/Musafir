/**
 * Builds seeds/campsites.json from real data.
 *
 * Sources, in order of authority:
 *   1. OpenStreetMap, via Overpass. Names and coordinates of sites actually
 *      tagged tourism=camp_site in India. Nothing here is invented.
 *   2. OpenTopoData SRTM 30m, via utils/elevationService. The 100-point grid.
 *   3. utils/terrainAnalysis. Everything derived from that grid.
 *
 * Amenities come only from OSM tags, so a campground claims running water only
 * where a mapper recorded running water. Most sites therefore list nothing,
 * which is the truth about OSM coverage in India rather than a gap to paper
 * over.
 *
 * Prices are the one invented field. They are banded off amenity count and
 * region so the range is plausible, and they are the only thing in the output
 * a reader should not trust.
 *
 * Run:  node seeds/buildCampsites.js
 * This hits OpenTopoData once per site at 1.1s spacing, so it takes a couple of
 * minutes and spends one call per campground against the 1000/day budget. The
 * output is committed, so seeding itself needs no network.
 */

if (process.env.NODE_ENV !== "production") require("dotenv").config();

const fs = require("fs");
const path = require("path");
const getElevationGrid = require("../utils/elevationService");
const analyseTerrain = require("../utils/terrainAnalysis");
const getClimateNormals = require("../utils/climateService");

const OVERPASS = "https://overpass-api.de/api/interpreter";
const OUT = path.join(__dirname, "campsites.json");
const TARGET = 45;
const RATE_LIMIT_MS = 1100; // OpenTopoData allows 1 request/sec
// Open-Meteo's archive endpoint returns 429 well before its documented daily
// budget, since each call pulls ten years of dailies. Observed failures at
// 400ms spacing, comfortable at this.
const CLIMATE_RATE_LIMIT_MS = 2500;

// Junk in the OSM data: soil testing stations mistagged as camp sites, and
// numbered waypoints along trekking routes that are not places anyone books.
const JUNK = /soil\s*tes|^camp\s*\d|^\d+$|test|dummy|^site\s*\d/i;

// Tagged tourism=camp_site but plainly not a campground: guest houses, road
// segments, listing-spam titles. Real entries in OSM, wrong thing for us.
const NOT_A_CAMPGROUND =
  /guest\s*house|hotel|lodge|dhaba|resting place|home\b|road\b|church|book a camp|cafe\b|shop|school|apartment|bung[a]?low|^ground$|^camping ground$/i;

// Quotas, so the set spans real terrain rather than clustering in Ladakh where
// the mapping is densest. Contour maps of 45 identical valleys prove nothing.
// Quotas track where India actually has mapped campgrounds. Forcing an even
// spread pulled in a road and a service apartment to fill the Deccan.
const REGIONS = [
  // Names are noun phrases that read correctly after "in the"
  { name: "Western Himalaya", box: [30.0, 35.5, 74.0, 80.5], quota: 15 },
  { name: "Eastern Himalaya", box: [26.5, 29.5, 79.5, 89.5], quota: 4 },
  { name: "Northeast", box: [22.0, 29.5, 89.5, 97.5], quota: 7 },
  { name: "Western Ghats", box: [8.0, 21.0, 72.5, 78.0], quota: 12 },
  { name: "Thar and Aravalli", box: [23.0, 30.5, 69.5, 78.0], quota: 3 },
  { name: "Deccan", box: [15.0, 25.0, 74.0, 84.0], quota: 2 },
  { name: "Eastern Ghats", box: [8.0, 22.0, 78.0, 88.0], quota: 2 },
];

const AMENITY_FROM_TAG = [
  ["Running Water", (t) => yes(t.drinking_water)],
  ["Toilets", (t) => yes(t.toilets)],
  ["Showers", (t) => yes(t.shower) || yes(t.showers)],
  ["Firepit", (t) => yes(t.fireplace) || yes(t.firepit) || yes(t.bbq)],
  ["Electricity", (t) => yes(t.power_supply) || yes(t.electricity)],
  ["Wi-Fi", (t) => t.internet_access && t.internet_access !== "no"],
  ["Pet Friendly", (t) => yes(t.dog) || yes(t.dogs) || yes(t.pets)],
  ["Wheelchair Accessible", (t) => yes(t.wheelchair)],
  ["Parking", (t) => yes(t.parking) || yes(t.caravans) || yes(t.motorhome)],
];

const yes = (v) => v === "yes" || v === "designated" || v === "customers";
const has = (text, re) => re.test(text);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchOverpass = async () => {
  const query = `
    [out:json][timeout:180];
    area["ISO3166-1"="IN"][admin_level=2]->.in;
    (
      node["tourism"="camp_site"]["name"](area.in);
      way["tourism"="camp_site"]["name"](area.in);
      node["tourism"="wilderness_hut"]["name"](area.in);
    );
    out center tags;
  `;

  const res = await fetch(OVERPASS, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Overpass rejects requests without one
      "User-Agent": "Musafir/1.0 (seed data build; github.com/ishpeeedy/Musafir)",
    },
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);

  const { elements } = await res.json();
  // Returned unfiltered, so the cache below survives a change to the name
  // filters instead of baking today's rules into it permanently.
  return elements
    .map((e) => ({
      osmId: `${e.type}/${e.id}`,
      name: e.tags.name,
      lat: e.lat != null ? e.lat : e.center && e.center.lat,
      lng: e.lon != null ? e.lon : e.center && e.center.lon,
      tags: e.tags,
    }))
    .filter((r) => r.lat && r.lng && r.name);
};

const isCampground = (r) =>
  !JUNK.test(r.name) &&
  !NOT_A_CAMPGROUND.test(r.name) &&
  r.name.length > 3 &&
  r.name.length < 60;

/** Roughly 3km apart, so two tents on the same meadow do not both get in. */
const tooClose = (a, b) =>
  Math.abs(a.lat - b.lat) < 0.027 && Math.abs(a.lng - b.lng) < 0.027;

const select = (rows) => {
  // Prefer sites a mapper cared enough about to describe: a website, an
  // operator or an amenity tag means someone stood there.
  const richness = (r) =>
    AMENITY_FROM_TAG.filter(([, test]) => test(r.tags)).length * 2 +
    (r.tags.website ? 2 : 0) +
    (r.tags.description ? 2 : 0) +
    (r.tags.operator ? 1 : 0) +
    (r.tags.phone ? 1 : 0) +
    (r.tags["capacity:persons"] ? 1 : 0);

  const picked = [];
  for (const region of REGIONS) {
    const [s, n, w, e] = region.box;
    const candidates = rows
      .filter((r) => r.lat >= s && r.lat <= n && r.lng >= w && r.lng <= e)
      .sort((a, b) => richness(b) - richness(a));

    let taken = 0;
    for (const c of candidates) {
      if (taken >= region.quota) break;
      if (picked.some((p) => tooClose(p, c))) continue;
      picked.push({ ...c, region: region.name });
      taken++;
    }
  }
  return picked.slice(0, TARGET);
};

const deriveTags = (site, terrain) => {
  const text = `${site.name} ${site.tags.description || ""}`.toLowerCase();
  const tags = new Set();

  if (terrain && (terrain.relief >= 600 || terrain.elevation >= 2000)) tags.add("Mountain");
  if (has(text, /forest|jungle|wood|van\b|aranya/)) tags.add("Forest");
  if (has(text, /lake|tal\b|sagar|dam\b|backwater|pond/)) tags.add("Lakeside");
  if (has(text, /beach|shore|coast/)) tags.add("Beach");
  if (has(text, /desert|dune|thar|sam\b/)) tags.add("Desert");
  if (has(text, /trek|trail|base camp|hike|pass\b/) || yes(site.tags.backcountry)) {
    tags.add("Near Trail");
  }
  if (yes(site.tags.backcountry) || (terrain && terrain.elevation >= 3500)) tags.add("Remote");
  if (yes(site.tags.dog) || yes(site.tags.dogs)) tags.add("Dog Friendly");

  return [...tags];
};

/**
 * Prose assembled from measurements, not adjectives. Every clause traces to a
 * number in the grid, which is why no two read the same: the terrain differs.
 */
const describe = (site, terrain) => {
  const parts = [];
  const town = site.tags["addr:city"] || site.tags["addr:district"];
  const where = town || `the ${site.region}`;

  if (terrain) {
    parts.push(
      `${site.name} sits at ${Math.round(terrain.elevation).toLocaleString()}m in ${where}.`,
    );

    const position = terrain.positionLabel.toLowerCase();
    const facing = terrain.aspectName ? `${terrain.aspectName.toLowerCase()}-facing ` : "";
    const ground = position === "level ground" ? "level" : `a ${facing}${position}`;
    parts.push(
      `The ground is ${ground}, with ${terrain.relief.toLocaleString()}m of relief inside a 10km box and ${terrain.ruggednessLabel.toLowerCase()} country underfoot.`,
    );

    if (terrain.slopeDegrees >= 15) {
      parts.push(`At ${terrain.slopeDegrees}° it is steep enough that finding flat ground to pitch on is the first job.`);
    } else if (terrain.slopeDegrees >= 6) {
      parts.push(`A ${terrain.slopeDegrees}° grade means you will want to think about which way your head points.`);
    } else {
      parts.push(`At ${terrain.slopeDegrees}° it is flat enough to pitch anywhere.`);
    }

    if (terrain.aspectName && terrain.slopeDegrees >= 6) {
      const shaded = /North/.test(terrain.aspectName);
      const aspect = terrain.aspectName.toLowerCase();
      // Only promise snow where snow actually falls. A north aspect at 400m in
      // Andhra Pradesh holds shade, not a snowpack.
      if (shaded && terrain.elevation >= 2500) {
        parts.push(`The ${aspect} aspect holds shade and snow longer than the far side of the valley.`);
      } else if (shaded) {
        parts.push(`The ${aspect} aspect stays in shade longer and dries out slowly after rain.`);
      } else {
        parts.push(`The ${aspect} aspect takes the sun early and dries out first after rain.`);
      }
    }
  } else {
    parts.push(`${site.name}, in ${where}.`);
  }

  if (site.tags.description) parts.push(site.tags.description);
  parts.push(`Mapped in OpenStreetMap as ${site.osmId}.`);

  return parts.join(" ");
};

/** The one synthetic field. Banded, not random, so it is at least coherent. */
const price = (amenities, terrain) => {
  let base = 600;
  base += amenities.length * 320;
  if (terrain && terrain.elevation >= 3000) base += 700;
  if (terrain && terrain.relief >= 1200) base += 400;
  return Math.round(base / 50) * 50;
};

/**
 * Overpass is a free public instance and goes down. The site selection is
 * deterministic given the same input, so a local copy of the raw response keeps
 * builds reproducible and lets us re-derive downstream fields during an outage.
 * Not committed: it is a megabyte of upstream data we do not own.
 */
const loadSites = async () => {
  const cache = path.join(__dirname, ".osm-cache.json");

  try {
    const rows = await fetchOverpass();
    fs.writeFileSync(cache, JSON.stringify(rows));
    return { rows, source: "OpenStreetMap" };
  } catch (e) {
    if (!fs.existsSync(cache)) throw e;
    const rows = JSON.parse(fs.readFileSync(cache, "utf8"));
    console.log(`  Overpass unavailable (${e.message}), using the cached response`);
    return { rows, source: "cached OpenStreetMap response" };
  }
};

const main = async () => {
  console.log("Fetching camp sites from OpenStreetMap...");
  const { rows, source } = await loadSites();
  const all = rows.filter(isCampground);
  console.log(`  ${all.length} campgrounds from ${source}, ${rows.length - all.length} junk names dropped`);

  const selected = select(all);
  console.log(`  ${selected.length} selected across ${REGIONS.length} regions\n`);

  // Reuse grids from a previous build. Elevation does not move, and the daily
  // budget is the reason this project caches everything in the first place.
  const cached = new Map();
  const cachedClimate = new Map();
  if (fs.existsSync(OUT)) {
    for (const c of JSON.parse(fs.readFileSync(OUT, "utf8"))) {
      if (c.osmId && c.elevationGrid) cached.set(c.osmId, c.elevationGrid);
      if (c.osmId && c.climate?.monthly?.length) cachedClimate.set(c.osmId, c.climate);
    }
    console.log(
      `  reusable from the previous build: ${cached.size} grids, ${cachedClimate.size} climate records\n`,
    );
  }

  const out = [];
  let fetched = 0;
  for (let i = 0; i < selected.length; i++) {
    const site = selected[i];
    const label = `[${String(i + 1).padStart(2)}/${selected.length}] ${site.name}`;

    let grid = cached.has(site.osmId) ? cached.get(site.osmId).data : null;
    let terrain = null;
    try {
      if (!grid) {
        if (fetched++) await sleep(RATE_LIMIT_MS);
        grid = await getElevationGrid(site.lat, site.lng, 5, 10);
      }
      terrain = analyseTerrain(grid, { gridSize: 10, radiusKm: 5 });
    } catch (e) {
      console.log(`${label} — elevation failed (${e.message}), keeping without terrain`);
    }

    // Ten-year monthly normals, so a seeded page can answer "when" with no
    // cold fetch. Retried once, because the archive endpoint rate limits hard.
    let climate = cachedClimate.get(site.osmId) || null;
    if (!climate) {
      for (let attempt = 0; attempt < 2 && !climate; attempt++) {
        try {
          await sleep(CLIMATE_RATE_LIMIT_MS * (attempt + 1));
          climate = await getClimateNormals(site.lat, site.lng);
        } catch (e) {
          if (attempt) console.log(`${label} — climate failed (${e.message})`);
        }
      }
    }

    const amenities = AMENITY_FROM_TAG.filter(([, test]) => test(site.tags)).map(([a]) => a);

    out.push({
      title: site.name,
      location: [site.tags["addr:city"], site.tags["addr:district"], site.region]
        .filter(Boolean)
        .join(", "),
      region: site.region,
      osmId: site.osmId,
      geometry: { type: "Point", coordinates: [site.lng, site.lat] },
      elevation: terrain ? terrain.elevation : undefined,
      elevationGrid: grid
        ? { data: grid, gridSize: 10, radiusKm: 5, cachedAt: new Date().toISOString() }
        : undefined,
      terrain: terrain || undefined,
      climate: climate
        ? { ...climate, cachedAt: new Date().toISOString() }
        : undefined,
      amenities,
      tags: deriveTags(site, terrain),
      description: describe(site, terrain),
      price: price(amenities, terrain),
    });

    if (terrain) console.log(`${label} — ${terrain.summary}`);
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length} campgrounds to ${path.relative(process.cwd(), OUT)}`);
  console.log(`  ${out.filter((c) => c.terrain).length} with terrain`);
  console.log(`  ${out.filter((c) => c.climate).length} with climate normals`);
  console.log(`  ${out.filter((c) => c.amenities.length).length} with real amenity tags`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
