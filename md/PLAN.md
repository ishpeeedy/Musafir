# Plan

What is left to build, and why. Edited in place as things ship. See `CLAUDE.md`
for current state, `md/DESIGN.md` for the visual system, `md/DATA.md` for where
numbers come from.

---

## The thesis

The project used to present as a campground **directory**: a list of places you
browse. Directories built on this stack are indistinguishable from thousands of
YelpCamp forks, and the recognition happens before anyone reads the code.

The data assembled here (weather, elevation, terrain, daylight, climate
normals) is not a directory's feature set. It is a **decision tool's** feature
set. A directory answers "what campgrounds exist near here." A decision tool
answers "should I go to this one, and when."

**Consequence:** the campground detail page is the product. It gets the depth.

The core insight that made it cheap: the elevation grid is 100 numbers fetched
once and cached forever, and it is raw material for **analysis**, not just for a
picture. Six derived properties at zero additional API cost produce sentences no
listing site produces: *"North-facing mid slope, 380m of relief within 10km."*
That is the differentiator, more than any visual treatment.

---

## Done

Stages 1 through 4 of the original build order, plus a full UI redo and the
climate work, which was not in the original plan at all.

- Schema, elevation service, terrain analysis, climate service, seasonality
- Lazy elevation fetch cached forever, cache invalidated on location change
- Live weather and daylight, never stored
- Topo card, cross-section, hover-to-read, twelve-month season strip
- Amenities and tags pickers on the forms
- Text search, price filter, sort, pagination on the explore page
- Photograph carousel
- The parchment design system across every page
- **45 real OpenStreetMap campgrounds** with real terrain and climate, replacing
  the stock YelpCamp census-cities seed. This was an open question in an earlier
  version of this plan and it is resolved.
- **Constraint-based discovery.** `utils/discovery.js` matches on elevation,
  aspect, position, ruggedness, slope, relief, season, amenities and tags, all
  in one in-memory pass. The explore page states the query back in prose, sets
  aside campgrounds it cannot judge rather than failing them, and on an empty
  result names which single condition to drop and what dropping it would find.
- **Frost is a modifier, not a state.** A month can be prime and still freeze
  overnight. Fixes the Shimla miss without breaking Dzongri's correct window.

`npm test` is 103 passing: `terrainAnalysis`, `seasonality`, `discovery`, and a
full render of the explore page in every shape.

---

## 0. Open a browser

The show page has been looked at and is right. **Everything else still has
not**, and the explore page changed substantially after that check: the sidebar
went from three controls to fourteen.

Load explore first, at full width and at 1100px and below. Then home, new, edit,
login, register. Test the mobile menu and the flash dismiss specifically; they
are the least proven things in the codebase.

---

## 1. Stylesheet cleanup

Two items, both worth doing on their own merits, and **neither of them needs
Bootstrap**. Do these before deciding anything about Bootstrap, because they are
most of the win and they carry no risk.

**Forms, element-first.** The biggest single win. There are roughly 55 form
rules across `.form-*`, `.check-*`, `.auth-*`, `.file-upload-*`, `.price-input-*`
and `.image-delete-*`, against 27 `<input>`, 37 `<label>`, 3 `<textarea>` and 1
`<select>` in the templates. Style the elements for defaults, keep only the
genuinely bespoke pieces (the amenity chip picker, the image-delete grid, the
upload dropzone). **Roughly 55 rules down to 15.**

One gotcha to design in from the start: a bare `input {}` also hits checkboxes,
radios and file inputs. Use
`input:not([type="checkbox"]):not([type="radio"]):not([type="file"])`, or wrap
it in `:where()` to keep specificity at zero.

**Collapse the label rules.** Fourteen rules are all "a label", differing only in
size and which plate they sit on: `.section-label`, `.stat-label`,
`.price-label`, `.filter-label`, `.sub-label`, `.runhead`, `.season-key`,
`.season-month__state`, `.scale-bar`, `.readings`, `.plate-viewer__count`,
`.chip`, `.check-chip span`, `.btn-musafir`. **Collapse to `.label`,
`.label--sm`, `.label--ruled`.** Name things by what they are, not where they
sit. The same move already worked for annotations: thirteen rules setting the
italic hand face became one grouped rule.

**Then `views/error.ejs`.** Nine `error-*` classes and zero rules. It renders
unstyled today. A bordered card, a rubric-ink warning mark, an engraved title,
and a monospaced stack trace behind the dev-only guard.

**Then fold `home.css` in.** 380 lines, the one place a second stylesheet still
exists. `home.ejs` is standalone with its own `<head>`, so this means either
converting it to use `boilerplate.ejs` or accepting the duplication permanently.

---

## 2. Decide about Bootstrap

Bootstrap 5.3.3 is loaded and **no markup uses it**. That is a deliberate
pause, not an unfinished migration.

The case for adopting it: 27 inputs and 37 labels, and form styling is tedious
work Bootstrap does competently. The agreed order, if it goes ahead, is forms
first, then the show page (112 distinct classes on one page; with Bootstrap
doing layout and spacing the honest bespoke set is about 35), then `/campgrounds`
last alongside the search overhaul, since that work replaces the filter sidebar
anyway.

**If it goes ahead: theme Bootstrap, do not override it.** 5.3 exposes
`--bs-body-bg`, `--bs-body-color`, `--bs-border-color`, `--bs-primary`,
`--bs-btn-*`, `--bs-card-*`, `--bs-navbar-*` and the rest. Map the palette onto
those and every component recolours with **no override rules at all**. Every
`!important` this project ever had came from fighting Bootstrap's selectors
instead of theming its tokens.

The case against: the stylesheet audit found it is not actually bloated (344
rules, 11.6KB gzipped), Bootstrap's defaults are a modern flat UI fighting a
hand-drawn chart, and a full conversion was already built and rejected on sight.

**Do step 1 first, then look at the diff and decide.** If the stylesheet is down
40 rules and reads clean, pull the CDN tags and reclaim the CSP entry. If forms
are still fighting you, keep it and convert one page. Either path is reversible
from here; neither is once markup starts depending on it.

---

## 3. Finish or delete the three stubs

Each of these has a schema field or markup but no code behind it. Half-built
reads worse than not started.

| Stub | What exists | What is missing |
|---|---|---|
| **Bookmarking** | `savedCampgrounds` on the User schema | Everything else. Zero references anywhere in controllers, routes or views. |
| **Distance from user** | `.distance-badge` in `index.ejs`, styled in `app.css` | No `distance.js`. The span is `display:none` forever. |
| **Region** | The `region` field, cleared on location change | No `geocodeRegion.js`. The field is only ever set to `undefined`, never populated. |

**Bookmarking is the one to do.** Highest value per line, and it is the only
thing that makes having an account mean anything. One route file, one view, one
button. Toggle on `POST /campgrounds/:id/bookmark` returning JSON, list on
`GET /saved`.

**Distance is cheap** and the markup is already waiting: one IIFE reading
`data-lat`/`data-lng` off the cards, `navigator.geolocation`, haversine.

**Region only earns its place if search uses it as a facet.** Do it with the
search overhaul below, or drop the field.

---

## 4. Finish discovery

The matching layer is built. Three things are still open.

**Distance from the user is the missing constraint.** It is the one that needs
the browser: geolocation resolves client-side, caches in `sessionStorage`, and
appends `near=lat,lng` to the query string. Then it is a haversine inside
`matchCampground` like any other constraint. No `2dsphere` index needed, because
`$geoNear` has to be the first stage of an aggregation pipeline and so could
never compose with the in-memory season filter anyway. **If the user declines
the permission, that control must say it is unavailable rather than silently
returning a wrong count.**

**Sort by fit.** With constraints active, "newest first" is noise. Sort by
distance when known, otherwise by the length of the prime window. Deliberately
left out of the first pass rather than guessed at.

**A saved query.** Constraints already live in the URL, so a bookmark is a
saved search rather than a saved campground. That makes item 3 above worth more
than it was.

**Store weather on a periodic fetch.** Decided, not yet built. The explore
cards currently call WeatherAPI once per card with a 30 minute in-process cache
in `utils/weatherService.js`, which is fine for one user and wrong for more: the
list page costs more API calls than a detail page, and the cache dies with the
process.

The intended end state is a background job that refreshes current conditions for
every campground on a fixed interval and writes them to the document, so page
views cost nothing. Roughly:

- `campground.weather: { temp_c, condition, fetchedAt }` on the schema.
- One scheduled pass over all campgrounds, spaced to respect the rate limit,
  writing `fetchedAt` each time.
- Reads render whatever is stored and show the age when it is stale, rather than
  falling back to a live fetch. A figure with its age attached is honest; a
  silent live fetch reintroduces the per-view cost.

This does not contradict "weather is never stored" in `md/DATA.md`. That rule
exists so nothing stale is ever presented as current, which a visible
`fetchedAt` satisfies. **Sunrise and sunset stay unstored regardless**, since
they are derived per day and cost no call.

---

## 5. The rest, ranked

**Sun and shade on the actual slope.** Aspect, slope, sunrise and sunset are all
present. That is enough to say "this slope loses the sun at 15:40 in December".
That single line is the kind of detail that makes someone stop scrolling.

**Compare two campgrounds.** Decision tools compare. Two topo cards, two
profiles, two terrain readouts, side by side.

**Terrain on the explore cards.** Every card is text right now. A 40px contour
sparkline per card, rendered only where a grid is already cached, would make the
index page unmistakable at a glance. Must not trigger a fetch.

**Extend the render harness to the other pages.** `test/renderIndex.test.js`
does the explore page. The show page, the forms and the auth pages still have
none, and the `vm`-based topo harness still does not exist, so nothing
client-side is tested. Extend that file rather than starting a new pattern.

**One data loose end:**

- **`utils/climateService.js` has no tests.** The aggregation from 3,650 daily
  readings to 12 monthly means is unverified: leap years, the year boundary, gaps
  in the reanalysis, the divide-by-years for totals. Arithmetic that could be
  quietly off by a few percent with nobody noticing.

**A backfill script** for campgrounds without cached grids was offered and never
needed, since the seed bakes grids and climate in. It will be needed once users
start adding campgrounds.

---

## Identity

Deliberately last, because the terrain work teaches us what the brand is. The
parchment redo already front-ran the visual half of this.

**The name.** Code stays on `Musafir` until this is decided.

| Name | Case |
|---|---|
| **Cairn** | A stack of stones marking a route for whoever comes next. Exactly what the product is. Short, ownable, and the logo doubles as contour rings edge-on. |
| **Relief** | The terrain term for elevation range, the literal number we compute. Also means escape from the city. Sharpest concept, hardest to own as a common word. |
| **Padav** (पड़ाव) | Hindi for a halt or campsite on a journey. Keeps the cultural root, more precise than Musafir. |
| **Treeline** | The elevation where forest stops. Evocative, self-explanatory. |
| **Groundtruth** | Surveying term for data verified on site. Fits the positioning; reads tech rather than outdoors. |

Then: contour line as a repeating brand motif across dividers, empty states, 404
and loading states; a voice pass on the copy; a wordmark.

---

## Not building at all

Chat, payments, admin dashboard, follower feeds, notifications. Standard resume
padding, zero signal.
