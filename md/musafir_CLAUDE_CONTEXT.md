# Musafir — Claude VS Code Context Document

> Feed this file to Claude in VS Code at the start of every session. It contains everything Claude needs to work on this project without re-explaining context.

---

## What this project is

**Musafir** is a full-stack campground discovery and sharing platform — essentially Colt Steele's YelpCamp project, significantly extended. It is a portfolio project built by Anuj Sharma (ishpeeedy), a fresher full-stack developer based in Indore, India, targeting product-based companies.

**Live at:** musafir.ishpeeedy.dev  
**GitHub:** github.com/ishpeeedy/Musafir

---

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), Passport.js (local strategy auth)
- **Frontend:** EJS templates + vanilla JS — NO React, NO Vue, NO frontend bundler
- **Styling:** Bootstrap 5.0.0-alpha1 (utility layer only) + custom `app.css` design system
- **Maps:** MapTiler SDK (`maptilersdk`) — cluster map on index, single pin on show page
- **Weather:** WeatherAPI.com — already integrated in `utils/weatherService.js`
- **Images:** Cloudinary — upload, storage, URL transforms
- **Deployment:** Render (backend), Cloudinary (media)
- **Key constraint:** All client-side JS is plain vanilla JS in `public/javascripts/`. No import/export syntax. No npm packages on the frontend — use CDN script tags only.

---

## Project File Structure

```
app.js                          ← main entry, express setup, CSP (Helmet), session (connect-mongo v6)
middleware.js                   ← isLoggedIn, isAuthor, isReviewAuthor
schemas.js                      ← Joi validation schemas
controllers/
  campgrounds.js                ← all campground route handlers
  reviews.js
  users.js
models/
  campground.js                 ← Campground schema
  review.js
  user.js                       ← User schema (passport-local-mongoose)
public/
  javascripts/
    clusterMap.js               ← MapTiler cluster map for index page (OUTDOOR style)
    showPageMap.js              ← MapTiler single pin map for show page (OUTDOOR style)
    validateForms.js            ← Bootstrap form validation
  stylesheets/
    app.css                     ← ENTIRE design system + all page styles
    home.css                    ← Home page only (standalone, loaded by home.ejs directly)
    stars.css                   ← starability star rating library
routes/
  campgrounds.js
  reviews.js
  users.js
  health.js
utils/
  catchAsync.js
  ExpressError.js
  weatherService.js             ← WeatherAPI.com integration (already built)
views/
  home.ejs                      ← standalone full HTML (has own <head>, loads home.css)
  error.ejs
  campgrounds/
    index.ejs                   ← explore page
    show.ejs                    ← campground detail page
    new.ejs
    edit.ejs
  users/
    login.ejs
    register.ejs
  layouts/
    boilerplate.ejs             ← shared layout (Syne + DM Sans fonts, Bootstrap, app.css)
  partials/
    navbar.ejs
    footer.ejs
    flash.ejs
seeds/
  index.js
  cities.js
  seedHelpers.js
```

---

## Design System

The entire UI was overhauled from an old ivory/dusty-rose Bootstrap palette to a dark rugged outdoor aesthetic. **Do not revert to old colours or introduce new ones not in this palette.**

```css
:root {
  --bg:           #0d1510;   /* page background — very dark forest */
  --surface:      #1a2a1e;   /* cards, panels, sidebars */
  --surface-alt:  #1f3024;   /* input focus backgrounds */
  --amber:        #e8913a;   /* PRIMARY accent — CTAs, prices, stars, active states, wordmark */
  --amber-dim:    rgba(232, 145, 58, 0.15);
  --amber-border: rgba(232, 145, 58, 0.25);
  --sage:         #6a9e72;   /* SECONDARY accent — locations, tags, topo strokes */
  --sage-dim:     rgba(106, 158, 114, 0.15);
  --white:        #ffffff;   /* primary text */
  --muted:        #8fa898;   /* secondary text, labels, placeholders */
  --muted-dim:    rgba(143, 168, 152, 0.08);
  --blue-dot:     #5b9bd6;   /* rain indicator on weather history rows */
  --radius-card:  12px;
  --radius-input: 8px;
  --radius-chip:  20px;
  --font-display: 'Syne', system-ui, sans-serif;   /* headings, titles, values */
  --font-body:    'DM Sans', system-ui, sans-serif; /* all body text */
}
```

**Colour rules (strict):**
- Amber: primary buttons, active nav links, prices, star ratings, the "Musafir" wordmark. Not decorative.
- Sage: location text, tag chips, topo line strokes, secondary borders.
- Never introduce dusty-rose, powder-blue, ivory, or charcoal-brown — those are from the old design and must not reappear.

**Component classes available in `app.css`:**
- `.btn-musafir` with modifiers: `--primary`, `--outline`, `--ghost`, `--danger`, `--sm`, `--full`
- `.chip` with modifiers: `--amenity`, `--tag`, `--terrain`
- `.stat-card`, `.stat-label`, `.stat-value`, `.stat-icon`
- `.section-label` (all-caps muted label)
- `.form-control`, `.textarea-musafir`, `.form-label-musafir`
- `.conditions-card`, `.forecast-grid`, `.history-table`
- All navbar, footer, auth, form, explore, and detail page classes

---

## What Has Been Built (Phase 1 — COMPLETE)

All UI pages have been redesigned. Do not touch these unless fixing a bug:

| Page | File | Status |
|------|------|--------|
| Home | `views/home.ejs` + `public/stylesheets/home.css` | ✅ Complete |
| Explore/Index | `views/campgrounds/index.ejs` | ✅ Complete |
| Campground Detail | `views/campgrounds/show.ejs` | ✅ Complete |
| Add Campground | `views/campgrounds/new.ejs` | ✅ Complete |
| Edit Campground | `views/campgrounds/edit.ejs` | ✅ Complete |
| Login | `views/users/login.ejs` | ✅ Complete |
| Register | `views/users/register.ejs` | ✅ Complete |
| Error | `views/error.ejs` | ✅ Complete |
| Navbar | `views/partials/navbar.ejs` | ✅ Complete |
| Footer | `views/partials/footer.ejs` | ✅ Complete |
| MapTiler outdoor style | `showPageMap.js`, `clusterMap.js` | ✅ Complete |

---

## What Needs Building (Phase 2 — IN PROGRESS)

These are the remaining tasks in priority order. Work through them sequentially.

### Task 1 — Schema additions (`models/campground.js`)

Add these fields to the Campground schema:

```js
elevation: Number,
elevationGrid: {
  data: [Number],          // flat array, 100 floats, row-major 10×10 grid
  gridSize: { type: Number, default: 10 },
  cachedAt: Date
},
amenities: {
  type: [String],
  enum: ['Firepit', 'Toilets', 'Running Water', 'Electricity',
         'Wi-Fi', 'Pet Friendly', 'Wheelchair Accessible', 'Parking', 'Showers'],
  default: []
},
tags: {
  type: [String],
  enum: ['Remote', 'Family Friendly', 'Dog Friendly', 'Near Trail',
         'Lakeside', 'Forest', 'Desert', 'Mountain', 'Beach'],
  default: []
},
region: String
```

Add to User schema (`models/user.js`):

```js
savedCampgrounds: [{
  type: Schema.Types.ObjectId,
  ref: 'Campground'
}]
```

### Task 2 — Elevation service (`utils/elevationService.js`)

Create this file. It fetches a 10×10 grid of elevation points from OpenTopoData API (free, no key, 1000 calls/day, 1 req/sec).

```js
const axios = require('axios');

const getElevationGrid = async (lat, lng, radiusKm = 5, gridSize = 10) => {
  const degPerKm = 1 / 111;
  const step = (radiusKm * 2 * degPerKm) / (gridSize - 1);
  const startLat = lat - radiusKm * degPerKm;
  const startLng = lng - radiusKm * degPerKm;

  const locations = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      locations.push(`${startLat + row * step},${startLng + col * step}`);
    }
  }

  const { data } = await axios.get(
    `https://api.opentopodata.org/v1/srtm30m?locations=${locations.join('|')}`
  );

  return data.results.map(r => r.elevation);
  // flat array of 100 floats, row-major. Centre point index 54 = campground elevation.
};

module.exports = getElevationGrid;
```

**Critical:** The grid is fetched LAZILY — only on first show page view. Never on campground creation. Once cached in MongoDB, never fetched again (unless location changes). This is non-negotiable due to the 1000/day rate limit.

### Task 3 — Show route wiring (`controllers/campgrounds.js`)

In the `showCampground` controller, after fetching the campground, add:

```js
const [lng, lat] = campground.geometry.coordinates;

// Lazy elevation grid — fetch once, cache forever
if (!campground.elevationGrid?.data?.length) {
  try {
    const getElevationGrid = require('../utils/elevationService');
    const grid = await getElevationGrid(lat, lng);
    campground.elevationGrid = { data: grid, gridSize: 10, cachedAt: new Date() };
    campground.elevation = grid[54]; // centre point = campground elevation, zero extra cost
    await campground.save();
  } catch (e) {
    console.error('Elevation fetch failed:', e.message);
    // fail silently — topo is decorative, not critical
  }
}

// Sunrise/sunset — live daily, never stored
let sunData = null;
try {
  const axios = require('axios');
  const { data } = await axios.get(
    `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`
  );
  const { sunrise, sunset } = data.results;
  const dayLengthMs = new Date(sunset) - new Date(sunrise);
  const h = Math.floor(dayLengthMs / 3600000);
  const m = Math.round((dayLengthMs % 3600000) / 60000);
  sunData = {
    sunrise: new Date(sunrise).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
    sunset: new Date(sunset).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
    daylight: `${h}h ${m}m`
  };
} catch (e) {
  console.error('Sunrise/sunset fetch failed:', e.message);
}

res.render('campgrounds/show', { campground, sunData });
```

In the `updateCampground` controller, add location change detection to invalidate the cached grid:

```js
const locationChanged =
  newLng !== campground.geometry.coordinates[0] ||
  newLat !== campground.geometry.coordinates[1];

if (locationChanged) {
  campground.elevationGrid = undefined;
  campground.elevation = undefined;
}
```

### Task 4 — Terrain relief layer (`public/javascripts/showPageMap.js`)

Inside the existing `map.on('load', ...)` callback, add:

```js
map.addSource('maptiler-dem', {
  type: 'raster-dem',
  url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${maptilerApiKey}`,
});

map.setTerrain({
  source: 'maptiler-dem',
  exaggeration: 1.5,
});
```

Uses the existing `maptilerApiKey` variable. No new env vars.

### Task 5 — d3-contour topo renderer (`public/javascripts/topoMap.js`)

Create this file. It reads the elevation grid from a `data-elevation-grid` attribute on `#topo-container` and injects a real topographic contour SVG.

**Important:** This is vanilla JS. No import/export. Use an IIFE.

```js
(function () {
  const container = document.getElementById('topo-container');
  if (!container) return;

  const raw = container.dataset.elevationGrid;
  if (!raw) return;

  let elevationData;
  try { elevationData = JSON.parse(raw); } catch (e) { return; }
  if (!elevationData || !elevationData.length) return;

  const gridSize = 10;
  const width = container.clientWidth || 600;
  const height = 220;
  const minElev = Math.min(...elevationData);
  const maxElev = Math.max(...elevationData);
  const numLayers = 12;

  const thresholds = Array.from({ length: numLayers }, (_, i) =>
    minElev + (i + 1) * ((maxElev - minElev) / (numLayers + 1))
  );

  const contourFeatures = d3.contours()
    .size([gridSize, gridSize])
    .thresholds(thresholds)(elevationData);

  const projection = d3.geoIdentity()
    .scale(width / gridSize)
    .reflectY(true)
    .translate([0, height]);

  const pathGen = d3.geoPath(projection);

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svgEl.style.cssText = 'width:100%;height:100%;display:block;';

  contourFeatures.forEach((feature, i) => {
    const opacity = (0.08 + (i / numLayers) * 0.45).toFixed(2);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathGen(feature));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#6a9e72');
    path.setAttribute('stroke-width', '1.2');
    path.setAttribute('opacity', opacity);
    svgEl.appendChild(path);
  });

  const body = container.querySelector('.topo-card__body');
  if (body) body.appendChild(svgEl);
})();
```

Add d3 CDN script tags to the bottom of `show.ejs` before `showPageMap.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-contour@4"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-geo@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-array@3"></script>
<script src="/javascripts/topoMap.js"></script>
```

### Task 6 — Amenities & Tags on forms

Add checkbox grids to `new.ejs` and `edit.ejs` after the description field. In `edit.ejs` pre-check boxes that are already saved on the campground.

In `controllers/campgrounds.js` POST and PUT routes:
```js
campground.amenities = req.body.campground.amenities || [];
campground.tags = req.body.campground.tags || [];
```

### Task 7 — Reverse geocoding for region name (`utils/geocodeRegion.js`)

```js
const axios = require('axios');

const getRegion = async (lat, lng) => {
  const { data } = await axios.get(
    `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${process.env.MAPTILER_API_KEY}`
  );
  const feature = data.features?.find(f =>
    f.place_type?.includes('region') || f.place_type?.includes('park')
  );
  return feature?.place_name || null;
};

module.exports = getRegion;
```

Call on campground creation, store as `campground.region`. Clear on location change.

### Task 8 — Bookmarking

Routes in `routes/users.js`:
```js
router.post('/campgrounds/:id/bookmark', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id);
  const idx = user.savedCampgrounds.indexOf(req.params.id);
  if (idx === -1) { user.savedCampgrounds.push(req.params.id); }
  else { user.savedCampgrounds.splice(idx, 1); }
  await user.save();
  res.json({ saved: idx === -1 });
});

router.get('/saved', isLoggedIn, async (req, res) => {
  const user = await User.findById(req.user._id).populate('savedCampgrounds');
  res.render('users/saved', { campgrounds: user.savedCampgrounds });
});
```

### Task 9 — Distance from user (`public/javascripts/distance.js`)

Vanilla JS, IIFE pattern. Reads `data-lat` and `data-lng` from campground card elements on the index page. Populates `.distance-badge` spans (already in the HTML, hidden by default).

---

## Key Architectural Rules

**Never break these:**

1. **Topo only on show page.** The elevation grid is fetched lazily on first show page view, cached permanently on the campground document. It is NEVER fetched on campground creation, NEVER shown on the index/explore page, NEVER shown on campground cards. Only on `show.ejs` topo card.

2. **Elevation is free.** `grid[54]` is the centre point of the 10×10 grid. This IS the campground's elevation. No separate API call needed.

3. **Sunrise/sunset is never stored.** It changes daily. Always fetched live in the show route. `sunData` is `null` if the fetch fails — all template references use `sunData?.sunrise` style optional chaining.

4. **No frontend framework.** All JS in `public/javascripts/` is plain vanilla JS. No import/export. No npm packages on the frontend. Use IIFE pattern. Use CDN script tags for libraries like d3.

5. **Design system is sacred.** Never introduce colours outside the CSS variable palette. Never revert to the old dusty-rose/ivory palette. Every new UI element must use `var(--bg)`, `var(--surface)`, `var(--amber)`, `var(--sage)`, `var(--muted)`, `var(--white)`.

6. **Rate limit is real.** OpenTopoData: 1000 calls/day, 1 req/sec. The lazy-fetch + permanent cache strategy is the only acceptable approach. If you need to bulk-populate existing campgrounds, add a 1100ms delay between calls.

---

## Environment Variables

```
DB_URL=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_KEY=...
CLOUDINARY_SECRET=...
MAPTILER_API_KEY=...
SECRET=...
WEATHER_API=...
```

All present in `.env`. No new env vars needed for any Phase 2 feature — elevation and sunrise/sunset APIs are free with no key required.

---

## Working Style Preferences

- Be direct and opinionated. Don't ask clarifying questions when the answer is obvious from context.
- Give the most reliable solution first, flag alternatives clearly.
- Flag uncertainty explicitly rather than guessing.
- Concise responses — no filler, no preamble.
- When modifying existing files, show only the changed lines with enough context to locate them — not the entire file.
- When creating new files, give the complete file.
- No em dashes in prose.
