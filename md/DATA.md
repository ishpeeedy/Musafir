# Data

> Where every number on a campground page comes from, what was done to it, and
> what it is worth. If a figure appears in the UI, it is described here.

The governing rule: **nothing is invented except price.** Where a source has a
gap, the gap is shown rather than filled with a plausible guess.

---

## Sources at a glance

| Source | What it gives | Key | Fetched | Stored |
|---|---|---|---|---|
| OpenStreetMap (Overpass) | Campground names, coordinates, amenities | No | Build time | In `seeds/campsites.json` |
| OpenTopoData (SRTM 30m) | 100 elevation samples per campground | No | Once, lazily | `campground.elevationGrid` |
| Open-Meteo (ERA5 archive) | 10 years of daily weather | No | Once, lazily | `campground.climate` |
| WeatherAPI.com | Current conditions, 3-day forecast, 7-day history | Yes | Every page view | Never |
| MapTiler | Basemap tiles, forward geocoding | Yes | Every page view | Coordinates only |

Two caching regimes, and the split is deliberate:

- **Facts about the place** (terrain, climate normals) are fetched once and kept
  forever. Ground does not move and ten-year normals do not shift.
- **Facts about right now** (weather, daylight) are never stored. They are
  fetched per request and are `null` on failure.

---

## 1. Which campgrounds exist — OpenStreetMap

**Query.** Overpass, every node or way in India tagged `tourism=camp_site` with
a name, plus `tourism=wilderness_hut`. Returns about 1,334 sites.

**Filtering,** in `seeds/buildCampsites.js`:

1. Junk names: soil-testing stations mistagged as campsites, numbered trek
   waypoints (`camp 4298 m`), test entries.
2. Not actually campgrounds: guest houses, hotels, lodges, service apartments,
   road segments, listing spam. One entry was literally named `church road`.
3. Length bounds, 4 to 60 characters.

1,334 down to 1,268.

**Selection.** Region quotas, because mapping density is wildly uneven and an
even spread pulled a service apartment into the Deccan to fill a slot:

```
Western Himalaya 15 | Western Ghats 12 | Northeast 7 | Eastern Himalaya 4
Thar and Aravalli 3 | Deccan 2         | Eastern Ghats 2        = 45
```

Within a region, sites are ranked by how much a mapper bothered to record
(amenity tags, website, description, operator, phone), then taken in order,
skipping any within roughly 3km of one already chosen so two tents on the same
meadow do not both get in.

**Reproducibility.** The raw Overpass response is cached locally at
`seeds/.osm-cache.json`, gitignored. Overpass is a free public instance and
does go down; during one outage the cache reproduced the identical 1,268-site
selection, which also demonstrates the selection is deterministic.

**Amenities** are read only from OSM tags, one to one:

```
drinking_water → Running Water     shower      → Showers
toilets        → Toilets           fireplace   → Firepit
power_supply   → Electricity       internet    → Wi-Fi
dog            → Pet Friendly      wheelchair  → Wheelchair Accessible
caravans       → Parking
```

**16 of 45 campgrounds have any amenities at all.** That is what mappers
recorded. The other 29 show "No amenities recorded for this site" rather than a
guess.

---

## 2. The shape of the ground — SRTM 30m

**Source.** OpenTopoData's public endpoint serving SRTM 30m, the radar survey
NASA flew in 2000. Free, no key, **1000 calls/day, 1 request/sec, maximum 100
locations per request**.

That 100-location ceiling is the single most important constraint in the
project. It is why the grid is 10x10 and cannot be made finer server-side.

**Sampling.** A 10x10 grid across a 10km by 10km box centred on the campground,
row-major, row 0 south, column 0 west.

The box is square **on the ground, not in degrees**. A fixed degree step gives a
box narrower east-west than north-south by `cos(latitude)`, a 13% horizontal
squash at 30°N that would distort every contour drawn from it. The longitude
step is divided by `cos(lat)`, with `cos(lat)` floored at 0.05 so a bad
coordinate near a pole cannot produce a request spanning half the planet.

Ocean and void-filled cells return `null` and are treated as sea level, because
contouring cannot handle holes.

**Caching is non-negotiable.** Fetched lazily on first show-page view, never on
creation, never on a list view, cached permanently, and cleared only when the
coordinates change. Bulk operations space requests 1100ms apart.

### Derived from those 100 numbers, at zero additional cost

All in `utils/terrainAnalysis.js`.

| Value | Method |
|---|---|
| Elevation | Mean of the four central cells (44, 45, 54, 55). A 10x10 grid has no centre cell; the obvious `grid[54]` is half a step off in both axes, roughly 550m away on a 10km box |
| Relief | `max - min` across the grid |
| Position | Percentile rank of the centre within the grid, labelled valley floor through ridge. Below 20m of relief it reports "level ground", because ranking noise is not information |
| Aspect | Horn's method gradient, the standard GIS slope kernel, averaged over the four cells around the true centre. Reported as the compass bearing the land **falls toward**. Suppressed below 1° of slope, where a fall line would be noise dressed as fact |
| Slope | `atan(hypot(dz/dE, dz/dN))` in degrees |
| Ruggedness | Terrain Ruggedness Index: mean absolute difference between each interior cell and its eight neighbours |

### Presentation

`public/javascripts/topoMap.js`, entirely client side.

- **Bilinear upsample 10x10 to 40x40** before contouring. Contours drawn
  straight off a 10x10 grid are visibly polygonal. This is free, invents nothing
  beyond the sampled extent, and is the whole difference between chunky and
  cartographic.
- `d3.contours` at 12 thresholds evenly spaced strictly inside min and max.
- Rendered square, because the sampled ground is square. A wide banner could
  only show it by cropping roughly 80% away or stretching the terrain.
- **Cross-section cut down the fall line**, sampled along the aspect bearing
  through the centre. A fixed west-east cut is arbitrary: on a north-facing
  slope it traverses the hill and draws a nearly flat line that says nothing
  about the ground you would pitch on. Falls back to west-east where the ground
  is too flat to have a fall line.

---

## 3. When to go — ERA5 reanalysis

**Source.** Open-Meteo's archive API serving ERA5, the ECMWF reanalysis. Free,
no key. Ten years of daily maximum temperature, minimum temperature,
precipitation and snowfall. About 120KB per campground.

Ten years rather than the WMO standard thirty: the payload triples and the
monthly means barely move for the purpose here, which is deciding whether a
month is campable, not publishing a climatology.

**Aggregation** (`utils/climateService.js`). Whole calendar years only, so every
month gets the same number of samples and a part-finished year cannot skew one
month against the others. Days with missing temperature are skipped rather than
counted as zero. Result is 12 months of mean daily max, mean daily min, total
monthly precipitation and total monthly snowfall.

**Rate limiting.** Open-Meteo's archive endpoint returns 429 well before its
documented daily budget, since each call pulls ten years. Bulk builds space
requests 2500ms and retry once; filling all 45 took three passes.

### The elevation correction

ERA5 is a roughly 9km grid, so each cell carries its own elevation which can sit
far from the campground's real one. At Dzongri the cell is 3,974m against a true
3,895m. In steeper country the gap reaches over 1,000m, which is 6 or 7°C of
error.

Temperatures are corrected from the cell's elevation to the SRTM elevation using
the standard environmental lapse rate, **6.5°C per km**. The page states the
correction it applied.

**Only temperature is corrected.** Precipitation does have an elevation
relationship, but it is neither linear nor consistent, so adjusting it would be
inventing numbers rather than correcting them.

This is the one place where two independent datasets combine: the terrain work
makes the climate data more accurate.

### Classification

`utils/seasonality.js`. Thresholds are named constants so the judgement is
arguable rather than buried:

```
snowbound   monthly snowfall >= 20cm, or a day that never gets above freezing
monsoon     >= 200mm in a month, about 6.7mm a day
too hot     mean daily max >= 35C
cold        mean daily min <= -5C
prime       none of the above
```

Precedence runs top to bottom: a snowbound month is snowbound whatever else is
true of it. The best window is the longest run of prime months, wrapping
December into January, and equally good spells either side of a monsoon are both
named.

Seasonality is **derived per request, not stored**, so these thresholds can be
argued with and changed without a refetch or a migration.

---

## 4. Right now — WeatherAPI and daylight

**Weather** (`utils/weatherService.js`). Current conditions, a 3-day forecast,
and 7 days of history, one request per historical day, issued in parallel.
Fetched on every page view, never stored.

**Daylight** (`utils/sunService.js`) costs no network call at all: sunrise and
sunset arrive in WeatherAPI's astro block alongside the forecast, in the
campground's local timezone rather than UTC. Parsed from 12-hour clock strings,
returning `null` for the sentinels emitted inside polar circles where the sun
may not rise or set. Never persisted, since it changes daily.

---

## 5. What is written, and by what

**Descriptions are assembled from measurements**, not adjectives. Every clause
traces to a number, which is why no two read alike: the terrain differs.

> The Bagicha sits at 1,392m in the Western Himalaya. The ground is a
> southwest-facing mid slope, with 2,025m of relief inside a 10km box and highly
> broken country underfoot. A 7.1° grade means you will want to think about
> which way your head points. The southwest aspect takes the sun early and dries
> out first after rain.

Claims are gated on the data supporting them. The snow clause only fires above
2,500m, so a north-facing slope at 400m in Andhra Pradesh is told it holds shade
rather than a snowpack.

**Tags** are derived only where defensible: `Mountain` from relief or elevation,
`Near Trail` from OSM's `backcountry` tag or a name containing trek or base
camp, `Dog Friendly` only from the `dog` tag.

**Price is the one invented field.** Banded off amenity count, elevation and
relief so the range is coherent, and documented in the seed file as the only
thing in the output a reader should not trust.

---

## Known limitations

1. **ERA5 is a 9km grid.** The lapse-rate correction fixes temperature but
   cannot recover local rain shadow, valley inversion or aspect-driven
   microclimate.
2. **Shimla-class misses.** At 2,200m the strip reports January as prime;
   reality is near-freezing nights and regular snow. ERA5's smoothed monthly
   snowfall stays under the 20cm threshold and the `cold` threshold of -5°C is
   too permissive. Making frost a modifier rather than a state would fix it
   without breaking correct high-altitude windows.
3. **`cold` fires almost never**, once across 45 campgrounds. Freezing nights
   nearly always arrive with snow or sub-zero days, so `snowbound` claims the
   month first.
4. **SRTM is a 30m surface model**, not bare earth. Over dense canopy it reads
   the treetops.
5. **A 10km box is the whole horizon.** Relief and ruggedness describe that box
   and nothing outside it, so a campground 11km from a 3,000m wall is told it
   sits in gentle country.
6. **OSM coverage is thin and uneven** in India. 991 of the mapped sites sit in
   the Western Himalaya, which is why quotas exist.
7. **`climateService` has no unit tests.** The aggregation from 3,650 daily
   readings to 12 monthly means is unverified: leap years, the year boundary,
   gaps in the reanalysis, the divide-by-years for totals.

---

## Budgets

| API | Limit | Usage |
|---|---|---|
| OpenTopoData | 1000/day, 1/sec, 100 locations/request | 1 per campground, ever |
| Open-Meteo | 429s early on the archive endpoint | 1 per campground, ever |
| WeatherAPI | Per the account plan | 8 per page view, uncached |
| Overpass | Fair use | Build time only, cached locally |

The first two are one-time costs per campground and are already paid for all 45
seeded ones. Neither runs on the index page, on creation, or on any list view.

WeatherAPI's free tier is 1,000,000 calls/month. At 8 per view that is about
125,000 campground views. A 1 to 2 hour cache would cut it by 90% if that ever
becomes the constraint.

---

## Appendix: the `weather` local

What `utils/weatherService.js` hands the view. `null` if the fetch failed, so
every reference is guarded.

**`weather.current`** — `temp_c`, `temp_f`, `feelslike_c`, `feelslike_f`,
`condition` (text), `icon` (URL), `humidity`, `wind_kph`, `wind_mph`,
`precip_mm`, `precip_in`, `uv`, `last_updated`.

**`weather.forecast`** — array of 3 days, index 0 is today. Each carries `date`,
`maxtemp_c`, `maxtemp_f`, `mintemp_c`, `mintemp_f`, `avgtemp_c`, `avgtemp_f`,
`condition`, `icon`, `daily_chance_of_rain`, `daily_chance_of_snow`,
`maxwind_kph`, `totalprecip_mm`, `avghumidity`, `uv`.

**`weather.history`** — array of 7 past days. `date`, `maxtemp_c`, `mintemp_c`,
`avgtemp_c`, `condition`, `icon`, `totalprecip_mm`, `avghumidity`.

**`weather.historicalAverage`** — `avgtemp_c`, `avgtemp_f`, `total_precip_mm`,
`total_precip_in`, `avg_humidity`. All strings, already rounded.

**`weather.location`** — `name`, `region`, `country`, `lat`, `lon`, `tz_id`,
`localtime`.

**`weather.alerts`** — array, usually empty. Each has `headline`, `event`,
`desc`.

Note that `weather.location.region` is WeatherAPI's idea of the region and is
unrelated to `campground.region`, which is a separate field that nothing
currently populates.

**The `icon` URLs are WeatherAPI's own cartoon PNGs and are not used on the show
page.** The show page draws its own ink symbols in an inline SVG sprite. Do not
reintroduce the remote icons; see the no-emoji rule in `md/DESIGN.md`.
