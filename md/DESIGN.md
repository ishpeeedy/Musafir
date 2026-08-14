# Design

The site is a **hand-drawn 17th-century topographic chart on aged paper**,
printed in two inks the way old charts were printed one ink per plate.

This front-ran the identity decision, deliberately. The terrain work had already
taught us what the brand is: the product draws contour lines from real survey
data, so the brand should look like the thing it draws.

The design system is `public/stylesheets/app.css`. It is the whole site. The one
exception is `home.css`, which the standalone home page loads on top of it.

---

## Palette

Two inks on aged paper, plus one rubric for destruction. Every token below is in
`:root` and every one is in use. No aliases, no colour defined twice.

```css
/* the paper */
--paper-hi:   #dccbb5;   /* lifted: plates, cards, readouts        */
--paper:      #d2bea5;   /* ground, and both map squares           */
--paper-lo:   #c2ad92;   /* recessed: inputs, wells                */

/* first plate — THE LAND */
--ink-soft:   #5a4032;   /* faint linework, labels, secondary text  */
--ink:        #3f2a1e;   /* body text, primary linework, contours   */
--ink-deep:   #291a12;   /* headings, index contours, the pin       */
--panel:      #4a2c22;   /* solid reversed blocks: CTAs, price      */
--knockout:   #e2d2ba;   /* text sitting on any solid panel         */

/* second plate — THE SKY */
--plum-soft:  #4c355c;   /* faint sky linework, secondary sky text  */
--plum:       #34233d;   /* sky and time text, season strip strokes */
--plum-deep:  #23162b;   /* solid sky panels, the wordmark          */

/* rubrication: the one colour besides the text ink a scribe was allowed */
--danger:     #7a2f1e;   /* destructive actions only                */

--rule:       rgba(63, 42, 30, 0.42);
--rule-faint: rgba(63, 42, 30, 0.22);
--rule-sky:   rgba(52, 35, 61, 0.42);
--wash:       rgba(63, 42, 30, 0.12);
--radius:     2px;
```

Those four alpha tokens replaced 28 inline `rgba()` literals. Three radius
tokens all holding `2px` collapsed into one.

**Contrast, measured against `--paper` #d2bea5. Everything passes AA:**

| Pair | Ratio |
|---|---|
| `--knockout` on `--plum-deep` | 11.60:1 |
| `--plum-deep` on `--paper` | 9.54:1 |
| `--ink-deep` on `--paper` | 9.31:1 |
| `--knockout` on `--panel` | 8.46:1 |
| `--plum` on `--paper` | 8.01:1 |
| `--ink` on `--paper` | 7.46:1 |
| `--plum-soft` on `--paper` | 5.91:1 |
| `--ink-soft` on `--paper` | 5.26:1 |
| `--danger` on `--paper` | 5.17:1 |

The ground was lifted twice. The first build used `#bda291`, where body copy sat
at 4.82:1 and both `-soft` tokens failed outright. It is now light enough that
the weakest pair on the page clears AA by a comfortable margin.

**Type scale is 1.25x**, and one declaration does it, because everything is
sized in rem and rem resolves against the root:
`html:has(.detail-page) { font-size: 20px }`. 18px below 720px. Still
page-scoped; see the loose end in `CLAUDE.md`.

---

## The two plates

Old charts were printed one ink per plate, each ink carrying a category: brown
for terrain, blue for water, red for roads. That convention is the whole reason
a second ink is allowed here, and it decides where it goes.

The product answers two questions, **whether to go** and **when**. That is the
split.

| Plate | Carries |
|---|---|
| **Brown, the land** | Terrain, place, facts, everything structural. Contours, cross-section, the five terrain measures, elevation, title, location, price, description, chips, reviews, forms, nav, footer. |
| **Purple, the sky** | Weather, light, time, season. Daylight, sunrise, sunset, the entire conditions panel, the entire WHEN TO GO strip and its key. |

**Purple is the minority plate, roughly a third of the ink.** It never touches
body copy outside its own sections, never touches terrain, never touches chrome.

**One exception:** the wordmark is `--plum-deep`. Identity sits outside the data
system, and it keeps the second ink present in the chrome so it does not read as
confined to one band of the page.

### The accent device

Neither plate has a highlight colour. The reference does not use one; it uses an
**accent object**, a solid dark rectangle with paper-coloured knockout text.
That is the CTA, the price badge, and the hero title.

Anywhere you would reach for a highlight, reach for a solid panel with
`--knockout` text instead. `--panel` for land things, `--plum-deep` for sky
things. The knockout colour is the same on both.

**Links cannot signal by colour**, because one ink means `a` and `a:hover` would
be the same declaration. They underline instead, which is what ink on paper does
anyway.

---

## Type

All from Google Fonts, loaded in `boilerplate.ejs`.

| Role | Face |
|---|---|
| Display, page titles, section labels, map lettering | **IM Fell English SC**, all caps, generously letterspaced |
| Annotations, notes, italic asides | **IM Fell English Italic** |
| Body, dense data, **and every numeral** | **EB Garamond** |

IM Fell is unreadable below 15px. Keeping the period feel in headings and using
a legible Garamond for the season strip, the weather table and review bodies is
the honest tradeoff.

**Numerals are split out for a real reason.** IM Fell English SC carries
old-style figures that sit at x-height, so digits set beside its own capitals
read a size small and a shade light. That was the "the font is not consistent"
problem, and it was real: they were effectively two fonts. Every numeral is
Garamond with `font-variant-numeric: lining-nums tabular-nums`. See the Figures
section at the bottom of `app.css`. **A new numeric field has to be added
there.**

Cartographic lettering conventions, worth following because they are free
credibility:

- Region and place names: caps, letterspaced.
- Water features and valleys: italic.
- Spot elevations: small roman, no label, just the number.
- Contour elevations: lettered *along the contour curve itself*, with the line
  broken to make room. Not in a box, not on a leader line.

---

## Device inventory

Every device maps onto something the show page already renders.

| Device | Where it goes | State |
|---|---|---|
| Fine ink contour linework | Topo card, real d3 contours from SRTM | Done |
| Text lettered along a curve | Contour elevations, via `textPath` with a paper-coloured stroke painted under the fill so the line breaks to make room without splitting the path | Done |
| Solid panel, knockout text | Hero title block, price badge, primary CTA, the "prime" season state | Done |
| Scale bar | Topo card. The box is 10km across | Done |
| Compass rose / north arrow | Topo card. Data-true: we know the grid orientation | Done |
| Folio framing | Ruled margin, running header with region and plate number | Done |
| Matched plate pair | Geographic map left, contour card right, both true squares, one caption beneath | Done |
| Hachures on steep ground | Topo card, on cells above a slope threshold | **Not done.** Needs per-cell slope and ticks perpendicular to the contour. Done badly it would muddy a 40x40 render, so it was left out rather than faked |
| Radiating rhumb lines | Very faint page background behind everything, 4 to 6% opacity | Not done |
| Structure from repeated tiny text | Section dividers, topo card border | Not done |
| Angled hand-lettered labels | Amenity and tag chips, 1 to 2 degrees maximum or it becomes a costume | Not done |

### Motion

**Nothing loops.** Continuous motion on a data visualization reads as a
screensaver: impressive for two views, cheap forever after. Every animation is
one-shot on scroll into view, and `prefers-reduced-motion` jumps straight to the
final state.

Motion must be **data-true**, not decoration:

1. **The contour draw-on.** `pathLength="1"` plus animated `stroke-dashoffset`,
   ordered from the campground's own elevation outward to higher and lower.
   Because contours near the campground's elevation pass near the campground,
   this radiates outward from the pin both in elevation-space and visually.
2. **The dashed trail** walking the cross-section profile edge to edge. This is
   literally a route across the terrain, so a walking dashed line is honest.

### The season strip

The largest block of the second ink, and where the purple earns its place. Every
stroke is `--plum` or `--plum-deep`.

Five states cannot be five hues in a two-ink system, and the period-correct
answer is better than what it replaced: **engraved fill patterns, ordered by ink
density.**

| State | Fill | Why |
|---|---|---|
| Snowbound | Open stipple | Least ink. Empty, cold. |
| Cold | Sparse horizontal hatch | |
| Monsoon | Diagonal hatch, left-leaning | Parallel-line shading is how old charts render water. |
| Too hot | Dense cross-hatch | Oppressive, and solves the "no hot colour" problem. |
| Prime | **Solid `--plum-deep`** | The only solid. Reads as the answer at a glance. |

Strictly more legible than the amber-hatch fudge it replaced, and it survives
greyscale and colour blindness by construction, because the encoding is texture
rather than hue.

The bar carries two variables: fill **height** is the monthly mean temperature
normalised across the year, fill **texture** is the state. The state modifier
sits on **the month**, not on the bar, so one class drives both the bar fill and
the key swatch from a single rule.

---

## Hard rules

1. **No colour outside the tokens, and no plate crossing.** A two-ink system
   survives exactly as long as the two inks keep their jobs. Purple on a contour,
   or brown on the season strip, and it is just a theme again.
2. **No emoji.** Every symbol is a drawn ink glyph or inline SVG. The data
   labels became letterpress contractions (RH, Wind, Precip), which is how a
   chart labels anyway and reads better than a pictogram did. Only genuine
   symbols stayed: weather, trig point, star, raindrop, north arrow.
3. **Corner radius 0 to 2px.** Paper does not have rounded corners; sheets have
   edges.
4. **No drop shadows, no glass, no gradients as decoration.** Depth comes from
   overlapping sheets and hairline rules.
5. **Borders are hairline ink rules,** 0.5 to 1px in `--ink-soft` or `--ink`, not
   grey box-strokes.
6. **Zero `!important`.** All 16 that this project once had existed only to
   out-specify Bootstrap. Bootstrap is loaded again but loads *before* `app.css`,
   so equal specificity wins per property. Keep it at zero.

---

## Rejected, and why

Recorded so nobody re-proposes them.

| Proposal | Verdict |
|---|---|
| **The dark forest palette** (`--bg #0d1510`, `--amber #e8913a`, `--sage #6a9e72`, Syne + DM Sans) | Retired. It was the original design system and is gone from every file. Do not reintroduce sage, amber, or the dark ground. |
| **Marauder's Map UI** | Rejected on three grounds: incompatible with the palette (moot, the palette was replaced), trademark risk on a portfolio site, and wrong for the thesis. The good part of the instinct survived as hand-drawn cartographic craft, built from *visual properties* only. No named quotes, no footprints, no wizarding references, no blackletter. What is left is public-domain 17th-century cartography, which is what the reference actually was. |
| **Pulsing, drifting, looping, breathing contours** | Rejected. Screensaver. See Motion. |
| **`setTerrain` with `terrain-rgb`** (3D relief) | Dropped. 3D relief fights an engraved flat chart. It was Task 4 in the old spec. |
| **Bootstrap utilities as the layout layer** | Measured: only 27% of declarations are replaceable and the payload triples. Bootstrap was then removed entirely, then re-added with no markup using it yet. See `md/PLAN.md` for the current position. |
| **A full Bootstrap rewrite of the site** | Built and rolled back. The whole stylesheet was cut to a 739-line kit, `show.ejs` was rewritten in Bootstrap markup, the navbar and flash became Bootstrap components, `gallery.js` and `ui.js` were deleted. It rendered and tested clean, and was rejected on sight. **The lesson is pacing, not direction.** Do not cut the stylesheet down first and rebuild after; that leaves every page broken at once with nothing to compare against. |
| **Merging single-declaration rules** | Saves ~100 lines, costs locality. Not worth it. |
| **The paper texture system** (feTurbulence grain, foxing blotches, vignette) | Built, then scrapped for a flat ground. Two things learned if it ever comes back: atmosphere painted *behind* the content only reaches the body background, so anything atmospheric belongs on top of all of it with `pointer-events: none`; and grain must be `soft-light`, never `multiply`, because multiplied noise can only darken and drags the whole page below its own token value. |
| **Photographs treated to match** | Deferred deliberately. Full-colour photographs on an engraved page will fight the aesthetic. Options when it comes up: warm duotone in the ink and paper tones, a halftone or engraved-dot treatment, or heavy desaturation. |
| **Native CSS nesting** | Would take 10 to 15% off `app.css` with no payload change and no markup churn. Offered and not taken. Still available. |

---

## MapTiler

The SDK is MapLibre GL underneath, so the map is a **style JSON of sources and
layers**, and every paint property on every layer is yours. OUTDOOR is a fixed
remote style and cannot be recoloured, but it can be mutated or replaced.

**Currently in place: option 1**, the runtime recolour, in
`public/javascripts/mapTheme.js`. About 60 lines walking `map.getStyle().layers`
and rewriting paint properties by layer type, per property inside a `try` so a
layer that rejects one value still gets the rest. Both maps call `themeMap()`.
Costs no MapTiler Cloud work, but there is a visible flash of the original style
before it lands, and it breaks silently if MapTiler changes the base style's
layer set.

Labels stay in MapTiler's own glyph set, because IM Fell is not in it. A
different type for the map lettering is honest anyway: on a real sheet the
engraver and the foundry were never the same shop. The pictograms do go, because
those are unambiguously modern.

**The recommended end state, in order of value:**

1. **A custom style in MapTiler Cloud Customize.** Fork a style, edit every
   layer, delete POIs, transit, building fills and most road classes, save, point
   at the new URL. **Start from a neutral or monochrome base, not OUTDOOR.** A
   survey chart shows landform, water, and very few routes. The one real
   limitation is labels: `text-font` can only reference fonts served from the
   style's glyph endpoint, and whether you can upload a custom face depends on
   your plan. Verify before designing around it. The way out is to turn map
   labels off entirely and letter the map yourself in an SVG overlay.
2. **MapTiler's vector contour tileset.** This is the one worth the trip. Real
   contour lines at every zoom, with an elevation attribute per line and a flag
   marking index contours. `symbol-placement: 'line'` gives you contour
   elevations lettered along the curve with a paper-coloured halo breaking the
   line, natively, on the geographic map. Getting the same effect on the SVG topo
   card is hand-written `textPath` work.

   ```js
   map.addSource('contours', { type: 'vector',
     url: `https://api.maptiler.com/tiles/contours/tiles.json?key=${maptilerApiKey}` });
   map.addLayer({ id: 'contour-line', type: 'line', source: 'contours',
     'source-layer': 'contour',
     paint: { 'line-color': '#3f2a1e',
       'line-width': ['case', ['>', ['get','nth_line'], 0], 1.1, 0.5] } });
   ```

   **Verify the tileset id and the attribute names (`ele`, `nth_line`) against
   your account's tile list first.** Those are from the OpenMapTiles schema and
   MapTiler's naming may differ.

   **Strategic consequence:** if the geographic map is also a contour chart, the
   matched plate pair stops being a layout idea and becomes the obvious answer.
   Two matched squares, same visual language, two scales: the 10km SRTM survey
   card on one side, the regional chart on the other. That is a page nobody else
   has, and it uses data already inside your MapTiler key.
3. **Always, regardless:** a filter on the canvas plus a texture overlay with
   `mix-blend-mode: multiply`. Five lines, and any basemap starts to read as
   printed on the same sheet.

Other paint properties worth knowing: the three `hillshade-*` colours turn a
`raster-dem` hillshade into engraved brown relief, `line-dasharray` gives dashed
linework natively including an animated one-shot draw, and `fill-pattern` takes
an image from `map.addImage()`, which is how hatching and stipple get onto map
polygons to match the season strip.

---

## Open questions

- **Does the purple plate hold at a third of the page, or does it want more?** If
  it reads as too little, the next thing to hand it is interactive state: links,
  focus rings, active nav. That would be a second meaning for the ink and it
  weakens the system, so only do it if the page genuinely looks lopsided.
- **Does the geographic map survive on the show page?** With a parchment topo
  card doing the cartography, a second map may be redundant. The contour tileset
  makes the argument for keeping it much stronger than it was.
- **`--gif-mat` includes `hue-rotate(232deg)`**, which lands the art on the
  purple plate. Correct for weather, but the cross-section marker is a sun on a
  brown land plate, so there is currently a purple sun on a brown chart. If it
  reads wrong the fix is a second token at `hue-rotate(0deg)`.
- **The cross-section has no label** while every other block on the page does.
  The reader has no way to know what the chart is called.
- **The name.** Still `Musafir` in code. Candidates ranked in `md/PLAN.md`, with
  Cairn leading. Parchment cartography does not settle it, but it narrows the
  wordmark to something that could be cut as a woodblock.
