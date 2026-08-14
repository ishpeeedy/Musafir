# Handover

> Written at the end of the terrain session, 12 to 13 August 2026. Read this,
> then `DATA.md` (where every number comes from), `PLAN.md` (what we are
> building and why) and `musafir_CLAUDE_CONTEXT.md` (the original spec). Where
> they disagree: PLAN wins, then this file, then the context doc.

**Next session is a UI session.** The data layer is finished and verified. What
remains on the terrain side is presentation.

---

## Where the project stands

Stages 1 through 3 of PLAN are done. Stage 4 is half done. The campground detail
page is now a terrain instrument rather than a listing, and it answers both
halves of the question the project exists to ask: whether to go, and when.

**Working end to end:**

- Elevation grid fetched lazily on first show-page view, cached permanently on
  the campground document, never refetched unless coordinates change.
- Terrain derived from that grid at zero API cost: elevation, relief, position,
  aspect, slope, ruggedness, and a prose summary.
- Topo card: 10x10 grid bilinear upsampled to 40x40, contoured with d3, drawn on
  scroll into view with the reveal radiating outward from the campground's own
  elevation. Square, so nothing is cropped.
- Cross-section cut **down the fall line**, with a vertical scale and a marker at
  the pin.
- Hover any contour to highlight it and read its elevation.
- Terrain readout rendered as prose plus five derived measures.
- **Twelve-month season strip** from ten years of ERA5, classified into
  snowbound / monsoon / too hot / cold / prime, with a best-window verdict.
  Temperatures lapse-rate corrected from the ERA5 cell to the real SRTM
  elevation, so the terrain work makes the climate data more accurate.
- Amenities and tags pickers on the new and edit forms.
- 45 real campgrounds seeded from OpenStreetMap with real terrain and climate.

**Verify it still works:** `npm start`, open any campground. `npm test` is 38
passing. Nothing is pushed; `origin/main` is 14 commits behind local.

`DATA.md` documents every source, every transformation and every known
limitation. Read it before touching anything that produces a number.

---

## Things that were wrong and are now fixed

Recording these because two of them were silent, and a future session could
easily reintroduce either.

1. **The elevation API host was dead.** `api.open-topo-data.com` has no DNS
   record. The real host is `api.opentopodata.org`. Every fetch had been failing
   at the network layer since Stage 1, the controller caught it and logged
   quietly by design, so nothing surfaced and all 73 campgrounds sat with an
   empty grid. The wrong host came from `musafir_CLAUDE_CONTEXT.md`, which is
   also corrected now. **If terrain silently stops appearing, check this first.**

2. **The topo card label lied.** It read "10km radius", which describes a 20km
   box and four times the area actually sampled. `radiusKm` in
   `utils/elevationService.js` is *half the box width*. The box is 10km across.

3. **Hover-to-read smeared the contours.** The readout was positioned with
   `left`/`top` on every `mousemove`, forcing layout and invalidating a paint
   rect over a large SVG. Chromium left the damage rects visible as dark blocks.
   It now moves by `transform` on its own compositing layer. **Never animate
   position with left/top over the contour SVG.**

4. **The terrain section caused a horizontal scrollbar.** It was `width: 100vw`.
   `vw` includes the vertical scrollbar, so the block was always wider than the
   visible viewport by the scrollbar's width. Now `80vw`, centred with a margin
   calc rather than a transform, because a transformed ancestor would become the
   containing block for MapTiler's overlays.

5. **Reseeding orphaned every review.** `Campground.deleteMany({})` does not fire
   the `findOneAndDelete` hook that cascades reviews. The seed now clears both.
   The hardcoded author ObjectId is a username lookup that fails loudly.

6. **Spreading a Mongoose subdocument silently drops every field.** Seasonality
   rebuilt each month with `{...m, tMax: ...}`, which works on the plain object
   the service returns and loses `precip` and `snow` entirely on a real page
   render. Every wet month reported as prime, and nothing threw. The unit tests
   all passed because they pass plain objects. **Never spread a Mongoose
   subdocument.** Copy fields explicitly. There is a regression test that fakes
   the getter-only shape.

7. **Moving a campground kept its old climate.** The update controller cleared
   the elevation grid, terrain and region but not `climate`, so a campground
   moved from Ladakh to Goa would report a Himalayan winter for a beach forever.

---

## The seed data

`seeds/campsites.json` holds 45 campgrounds. Every one is a real site tagged
`tourism=camp_site` in OpenStreetMap. `seeds/buildCampsites.js` regenerates it
and documents where each field comes from:

| Field | Source |
|---|---|
| name, coordinates, amenities | OpenStreetMap via Overpass |
| elevation, elevationGrid, terrain | SRTM 30m via the existing services |
| description | assembled from those measurements |
| **price** | **invented**, the only untrustworthy field |

Only 16 of 45 have amenities, because that is what mappers actually recorded.
That gap is deliberate and honest. Do not fill it with plausible guesses.

`node seeds/buildCampsites.js` reuses grids from the previous build, so
rerunning costs no API calls. `node seeds/index.js` seeds from the JSON and
makes no network calls at all.

The old `seeds/cities.js` (1000 US census cities) and `seeds/seedHelpers.js` are
deleted. They were the stock YelpCamp seed and the loudest tutorial signal left
in the repo. They also actively fought the terrain feature, since census cities
are flat.

---

## Non-negotiables

1. **Elevation is fetched lazily and cached forever.** 1000 calls/day, 1 req/sec.
   Never on creation, never on a list view. Bulk operations space calls 1100ms.
2. **Sunrise/sunset is never stored.** Fetched live, `null` on failure.
3. **Terrain failures are silent.** The topo card is enhancement. The page must
   render without it.
4. **Vanilla JS only on the front end.** IIFE, no import/export, no bundler, no
   npm packages. d3 comes from CDN script tags. Load order matters:
   `d3-array` first, since `d3-geo` and `d3-contour` both resolve it off the
   global.
5. **The palette is fixed.** Only the CSS variables in the context doc. Sage for
   terrain strokes, amber for the pin and active states.

---

## Working agreements

- **Never commit without being asked.** Get approval step by step.
- **No `Co-Authored-By` trailer.** Ever.
- **Commit messages: one line, lowercase, terse, no body.** Match
  `git log`. "home page overhaul", "add favicon", "fix the elevation api host".
  Long structured messages with rationale paragraphs read as machine written and
  were rewritten out of this history once already.
- Prose in chat: direct, opinionated, no filler, no em dashes.
- Surgical diffs. Do not improve adjacent code.

---

## How to verify front-end work without a browser

There is no browser driver here, and the topo renderer is pure client-side JS.
The technique that worked: run `public/javascripts/topoMap.js` verbatim in Node
inside a `vm` context, with the three d3 UMD bundles loaded into a shared global
and about 40 lines of DOM stubs (`document.createElementNS`, `createElement`,
`addEventListener`, `getBoundingClientRect`, `IntersectionObserver`,
`matchMedia`, `requestAnimationFrame`).

That caught real bugs and confirmed the fall-line maths against live SRTM data.
The harness lived in a scratchpad directory and is gone. **Worth rebuilding as
`test/topoMap.test.js` so it stops being throwaway.** The 38 passing tests cover
`terrainAnalysis` and `seasonality` only; nothing client-side is tested.

**Unit tests are not enough on their own.** The worst bug of the session passed
every unit test and only appeared on a real page render, because the tests fed
plain objects where production feeds Mongoose documents. Three checks caught
things nothing else did, and are worth repeating after any data change:

1. Run the analysis over every campground straight from the database, not from
   fixtures, so it sees the real document shape.
2. Compare output against places whose seasons are common knowledge: Leh,
   Cherrapunji, Goa, Jaisalmer, Shimla, Munnar.
3. Exercise the lazy-fetch path by stripping the cached field from one document
   and loading the page. It never runs otherwise, because seeded campgrounds
   arrive with everything already populated.

---

## What is left

### 0. Two loose ends on the season strip, both small

**Frost should be a modifier, not a state.** Testing against places with known
seasons got 5 of 6 right and missed Shimla: at 2,200m it reports January as
prime when reality is near-freezing nights and regular snow. The obvious fix,
moving `cold` to freezing nights, breaks Dzongri, whose correct October to
December window would vanish, because frosty nights at altitude are normal and
do not disqualify. Let a month stay prime and carry a "freezing nights" note
instead. This also rescues `cold`, which currently fires once across all 45.

**`utils/climateService.js` has no tests.** The aggregation from 3,650 daily
readings to 12 monthly means is unverified: leap years, the year boundary, gaps
in the reanalysis, the divide-by-years for totals. Arithmetic that could be
quietly off by a few percent with nobody noticing.

### 1. UI work on what already exists

The next session is a UI session. Candidates, in rough order:

- The topo card is square but the card around it is not, because it also carries
  a 44px header and a 92px section panel. Move the section out or overlay the
  header if that bothers you.
- Two maps side by side, geographic left and topo right, both square. Proposed,
  explicitly deferred, still the strongest layout idea open.
- The season strip is twelve columns. Check it at 1100px and 620px, where it
  drops to six and three.
- "Too hot" is a hatched amber bar, because the palette has no hot colour and
  solid amber means prime. Verify it reads as distinct.

### 2. Constraint-based discovery

PLAN defers this and it is now the biggest gap. There are terrain properties
nobody else has, and the only way to find anything is text search. "Above 2000m,
south-facing, under 300km, low ruggedness" is a query no competitor can answer.
This is where the data stops being decoration and becomes a product.

Now more valuable than before: with `climate` on every document, a query can ask
"prime in December" as well as "above 2000m, south-facing".

### 3. Sun and shade on the actual slope

Aspect, slope, sunrise and sunset are all present. That is enough to say "this
slope loses the sun at 15:40 in December". That single line is the kind of
detail that makes an interviewer stop scrolling.

### 4. Compare two campgrounds

Decision tools compare. Two topo cards, two profiles, two terrain readouts, side
by side.

### 5. Terrain on the explore cards

Every card is text right now. A 40px contour sparkline per card, rendered only
where a grid is cached, would make the index page unmistakable at a glance.

### Then Stage 5, identity

Name decision (Cairn leads), contour motif as branding, voice pass, wordmark.
PLAN puts it last on purpose: the terrain work teaches us what the brand is.

---

## Open questions and loose ends

- **The topo card is not square, the map inside it is.** The body is a true
  square, but the card also carries a 44px header and a 92px section panel, so
  it is roughly 708 by 842. Options if this keeps bothering: move the section
  into its own card, or overlay the header on the map.
- **`82vh` caps the topo card,** so it shrinks on short windows. Deliberate: at
  80% width a square would be taller than the screen. Change if you disagree.
- **The two maps side by side** (geographic left, topo right, both square) was
  proposed and explicitly deferred. It is still the strongest layout idea open.
- **The show page reorder was built and reverted.** Identity, the land, the sky,
  the practicalities, community. The current hero layout was preferred. If it
  comes up again, it is commit `651dd31`, revert of `a7e7da9`.
- **Marauder's Map UI was considered and rejected.** Wrong for the thesis,
  trademark risk on a portfolio site, incompatible with the palette. The good
  part of that instinct is hand-drawn cartographic craft: index contours with
  elevations lettered along the line, a scale bar, a north arrow, hachures on
  steep cells, paper grain. All derivable from data already present, all
  compatible with Stage 5.
- **A backfill script** for campgrounds without cached grids was offered and
  never needed, since the seed bakes grids and climate in. Will be needed if
  users start adding campgrounds.
- **Overpass goes down.** The raw response is cached at `seeds/.osm-cache.json`,
  gitignored, and the build falls back to it. During one 504 outage the cache
  reproduced the identical 1,268-site selection.
- **Open-Meteo rate limits harder than documented.** Filling all 45 climate
  records took three passes at 2500ms spacing. The build reuses cached climate,
  so reruns are cheap.
- `refs/original/refs/heads/main` is a `filter-branch` backup from the message
  rewrite. Delete with
  `git update-ref -d refs/original/refs/heads/main` once you are happy.
- `package.json` has an uncommitted Volta pin. It predates this work.
