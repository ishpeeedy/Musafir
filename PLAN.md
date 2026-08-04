# Plan — Terrain Depth Pass

> Companion to `musafir_CLAUDE_CONTEXT.md`. That file describes the system as designed.
> This file describes what we are building now and why. Read both.

---

## The reframe

The project currently presents as a campground **directory**: a list of places you browse.
Directories built on this stack are indistinguishable from thousands of YelpCamp forks, and
the recognition happens before anyone reads the code.

The data sources already assembled here (weather, elevation, terrain, daylight) are not a
directory's feature set. They are a **decision tool's** feature set. A directory answers
"what campgrounds exist near here." A decision tool answers "should I go to this one, and
when."

Everything below follows from committing to that second question.

**Consequence:** the campground detail page is the product. It gets the depth. Discovery,
filtering, and search are downstream of it and are explicitly deferred.

---

## The core insight driving this pass

The elevation grid is 100 numbers fetched once and cached forever. It is currently treated
as raw material for a picture. It is also raw material for **analysis**, and that analysis
costs zero additional API calls.

From those 100 numbers we derive:

| Property | Meaning | How |
|---|---|---|
| **Elevation** | Height at the campground | Bilinear centre of the grid |
| **Relief** | How dramatic the country is | `max - min` across the grid |
| **Position** | Valley floor / mid slope / ridge | Percentile rank of centre within the grid |
| **Aspect** | Which way the land faces | Horn's method gradient at centre, as compass bearing |
| **Slope** | How steep it is underfoot | `atan(hypot(dz/dE, dz/dN))` |
| **Ruggedness** | How broken the ground is | Terrain Ruggedness Index over interior cells |

This produces sentences no listing site produces: *"North-facing mid slope, 380m of relief
within 10km."* That is the differentiator, more than any visual treatment.

---

## Visual treatment: the topo card

### Rejected

Pulsing, drifting, looping, or breathing contours. Continuous motion on a data visualization
reads as a screensaver. Impressive for two views, cheap forever after.

### Building

1. **Draw-on reveal, ordered from the campground's own elevation outward.**
   Contours nearest the campground's elevation draw first, spreading to higher and lower.
   Because contours near the campground's elevation pass near the campground, this radiates
   outward from the pin both in elevation-space and visually. One-shot, on scroll into view.
   Technique: `pathLength="1"` + `stroke-dasharray` + animated `stroke-dashoffset`.

2. **Cross-section profile.** The grid row through the campground, drawn side-on as an
   elevation profile with a dot marking where you would stand. Two views of the same data,
   one from above and one from the side. Real cartography does this; web projects almost
   never do. Cheap, because the data is already in memory.

3. **Hover to read.** Hovering a contour highlights it and surfaces its elevation. Turns the
   card from an image into an instrument.

4. **`prefers-reduced-motion`** jumps straight to the final state.

### Two technical requirements that decide whether this looks good

- **The grid is capped at 10x10 by the API.** OpenTopoData's public endpoint accepts a
  maximum of 100 locations per request. That is *why* the grid is 10x10, and it cannot be
  raised by asking for more points without multiplying requests against a 1000/day budget.
  Contours from a 10x10 grid are visibly polygonal. **Fix: bilinear upsample to 40x40 on the
  client before contouring.** Free, instant, and it is the whole difference between "chunky"
  and "looks like a real map."

- **Sample a square box on the ground, not in degrees.** A fixed degree step produces a box
  that is narrower east-west than north-south by `cos(latitude)`. At 30°N that is a 13%
  horizontal squash in every rendered contour. Divide the longitude step by `cos(lat)`.

---

## Deviations from `musafir_CLAUDE_CONTEXT.md`

The context doc is the spec, but three things in it are wrong or will not work as written.
Recording them here so the divergence is deliberate.

1. **`grid[54]` is not the centre.** On a 10x10 grid there is no exact centre cell; index 54
   is `(row 5, col 4)`, offset half a step, roughly 550m away at a 10km box width. We take
   the mean of the four central cells (44, 45, 54, 55) instead. Same zero cost, correct
   position.

2. **`updateCampground` cannot host the location-change check as written.**
   `controllers/campgrounds.js` calls `findByIdAndUpdate` without `{ new: true }`, so the
   returned document is pre-update while the database write has already happened. The route
   also early-returns on geocode failure *after* the location column was already mutated,
   leaving the record inconsistent. This route gets restructured, not patched.

3. **Joi will reject the new fields.** `schemas.js` defines a strict `Joi.object()`, which
   errors on unknown keys. `amenities` and `tags` must be declared there or every form
   submission carrying them fails validation.

Also worth noting: the show page currently serves **hardcoded fake sunrise/sunset**
(`mockSunData` in the show controller). That gets replaced with the live fetch.

---

## Build order

Each stage leaves the app working.

### Stage 1 — Data foundation
- `models/campground.js`: `elevation`, `elevationGrid`, `terrain`, `amenities`, `tags`, `region`
- `models/user.js`: `savedCampgrounds`
- `schemas.js`: allow `amenities` and `tags`
- `utils/elevationService.js`: grid fetch, square-on-ground sampling
- `utils/terrainAnalysis.js`: the derivation table above

### Stage 2 — Route wiring
- Show controller: lazy elevation fetch, cache permanently, derive terrain once, store it
- Show controller: replace `mockSunData` with live sunrise-sunset.org
- Update controller: restructure, invalidate cached grid on location change

### Stage 3 — Visualization
- `public/javascripts/topoMap.js`: upsample, contour, animate, cross-section, hover
- d3 CDN tags in `show.ejs` (`cdn.jsdelivr.net` is already CSP-whitelisted)
- Topo card CSS

### Stage 4 — Composition
- Restructure the show page around three ideas: **the land**, **the sky**, **the practicalities**
- Surface the derived terrain readout as prose, not just numbers
- Amenities and tags checkbox grids on `new.ejs` / `edit.ejs`

### Stage 5 — Identity
- Name decision (see below)
- Contour line as repeating brand motif: dividers, empty states, 404, loading states
- Voice pass on copy
- Wordmark

Deliberately after the terrain work, because the terrain work teaches us what the brand is.

---

## Deferred, on purpose

Filtering and constraint-based discovery, bookmarking, distance-from-user, region reverse
geocoding. All are cheap once the foundation exists. None of them change how the project
reads. They come after Stage 4.

**Not building at all:** chat, payments, admin dashboard, follower feeds, notifications.
Standard resume padding, zero signal.

---

## Open decisions

**Name.** Current: Musafir (traveller). Candidates, ranked:

| Name | Case |
|---|---|
| **Cairn** | A stack of stones marking a route for whoever comes next. Exactly what the product is. Short, ownable, gives a logo for free that doubles as contour rings edge-on. |
| **Relief** | The terrain term for elevation range, the literal number we compute. Also means escape from the city. Sharpest concept; hardest to own as a common word. |
| **Padav** (पड़ाव) | Hindi for a halt or campsite on a journey. Keeps the cultural root, more precise than Musafir. |
| **Treeline** | The elevation where forest stops. Evocative, self-explanatory. |
| **Groundtruth** | Surveying term for data verified on site. Fits the real-places positioning; reads tech rather than outdoors. |

Not blocking. Code stays on `Musafir` until Stage 5.

**Seed data.** Fake seeded campgrounds with placeholder descriptions are the loudest
remaining tutorial signal. Replacing them with real, verified places would change a
reviewer's read of this project more than any single feature. Scope and timing undecided.

---

## Rules carried over from the context doc

1. Elevation grid is fetched **lazily on first show-page view**, never on creation, and
   cached permanently. OpenTopoData allows 1000 calls/day at 1 req/sec. Non-negotiable.
2. Sunrise/sunset is **never stored**. It changes daily. Fetched live, `null` on failure.
3. Terrain failures are **silent**. The topo card is enhancement, not critical path. The page
   renders without it.
4. No frontend framework. Vanilla JS, IIFE pattern, CDN script tags, no import/export.
5. Design system is fixed. Only `var(--bg)`, `var(--surface)`, `var(--amber)`, `var(--sage)`,
   `var(--muted)`, `var(--white)`. No new colours.
