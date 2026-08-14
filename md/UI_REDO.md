# UI Redo — Parchment Chart

> Started 13 August 2026. This file supersedes the design system in
> `musafir_CLAUDE_CONTEXT.md` and overrides the rejection recorded in
> `HANDOVER.md` line 255. Read `PLAN.md` for what the product is; nothing about
> the thesis changes here, only the surface.

---

## The decision

The dark forest palette is retired. Sage `#6a9e72` and amber `#e8913a` are
retired with it. The whole site becomes a **hand-drawn chart on aged paper**:
one warm brown ink, no second hue anywhere.

This is deliberate and it front-runs Stage 5. Picking parchment cartography
*is* the identity decision. That is acceptable, because the terrain work already
taught us what the brand is: the product draws contour lines from real survey
data, so the brand should look like the thing it draws.

**Scope:** the campground show page first. Everything else follows once the show
page is real. `app.css` is 2145 lines and `home.css` is 375; this is not a
one-sitting port.

### What was rejected before, and why it stands now

`HANDOVER.md` rejected this direction on three grounds. Two are resolved, one is
accepted.

| Objection | Status |
|---|---|
| Incompatible with the palette | The palette is being replaced. Moot. |
| Trademark risk | Resolved by building from the *visual properties*, never the IP. No named quotes, no footprints, no wizarding references, no blackletter. What is left is public-domain 17th-century cartography, which is what the reference actually is. |
| Wrong for the thesis | Overruled. A decision tool that renders SRTM contours reads *more* credible as a survey chart than as a dark dashboard. |

The escape hatch that file left open is exactly what we are building: "index
contours with elevations lettered along the line, a scale bar, a north arrow,
hachures on steep cells, paper grain."

---

## Palette

Two inks on aged paper. Warm brown and deep aubergine. Nothing else.

**Revised 13 August 2026 after the first build.** The original ground `#bda291`
was too dark to read on: at 4.82:1 the body copy technically passed AA and was
still uncomfortable, and the two `-soft` tokens failed outright. The ground moved
up to what the map squares already were, `#cdb89d`, and every ink darkened. That
also answers "make the page the same colour as the contour card", because now it
is literally the same token.

```css
:root {
  /* the paper */
  --paper-hi:   #d8c5ac;   /* lifted: plates, cards, readouts                */
  --paper:      #cdb89d;   /* ground, and both map squares                    */
  --paper-lo:   #bda291;   /* recessed: inputs, wells                         */
  --edge:       #9b8365;   /* page vignette, sheet edges                      */

  /* first plate — THE LAND */
  --ink-soft:   #5a4032;   /* faint linework, labels, secondary text          */
  --ink:        #3f2a1e;   /* body text, primary linework, contours           */
  --ink-deep:   #291a12;   /* headings, index contours, the pin, heaviest     */
  --panel:      #4a2c22;   /* solid reversed blocks: CTAs, price              */
  --knockout:   #e2d2ba;   /* text sitting on any solid panel                 */

  /* second plate — THE SKY */
  --plum-soft:  #4c355c;   /* faint sky linework, secondary sky text          */
  --plum:       #34233d;   /* sky and time text, season strip strokes         */
  --plum-deep:  #23162b;   /* solid sky panels, the wordmark                  */
}
```

**Contrast, measured against `--paper` #cdb89d. Everything passes AA now,
including both `-soft` tokens, which previously did not:**

| Pair | Ratio | Was |
|---|---|---|
| `--ink-deep` on `--paper` | 8.75:1 | 6.36 |
| `--plum-deep` on `--paper` | 8.96:1 | 6.70 |
| `--knockout` on `--panel` | 8.45:1 | 6.71 |
| `--plum` on `--paper` | 7.53:1 | 5.39 |
| `--ink` on `--paper` | 7.01:1 | 4.82 |
| `--plum-soft` on `--paper` | 5.55:1 | **3.65, failed** |
| `--ink-soft` on `--paper` | 4.94:1 | **3.10, failed** |

**Type scale: 1.25x.** One declaration does it, because everything is sized in
rem and rem resolves against the root, not the body:
`html:has(.detail-page) { font-size: 20px }`. 18px below 720px.

### The two plates

Old charts were printed one ink per plate, each ink carrying a category: brown
for terrain, blue for water, red for roads. That convention is the whole reason
the second ink is allowed here, and it decides where it goes.

`PLAN.md` says the page answers two questions: **whether to go**, and **when**.
That is the split.

| Plate | Carries | On the show page |
|---|---|---|
| **Brown, the land** | Terrain, place, facts, everything structural | Contours, cross-section, the five terrain measures, elevation, title, location, price, description, chips, reviews, forms, nav, footer |
| **Purple, the sky** | Weather, light, time, season | Daylight, sunrise, sunset, the entire conditions panel, the entire WHEN TO GO strip and its key |

**Ratio: purple is the minority plate, roughly a third of the ink.** It never
touches body copy outside its own sections, never touches terrain, never
touches chrome.

**One exception:** the wordmark is `--plum-deep`. Identity sits outside the data
system, and it keeps the second ink present in the chrome so it does not read as
confined to one band of the page.

### The accent device

Neither plate has a highlight colour. The reference does not use one; it uses an
**accent object**, a solid dark rectangle with paper-coloured knockout text (the
school title block). That is the CTA, the price badge, and the hero title.

Anywhere the old design reached for amber, reach for a solid panel with
`--knockout` text instead. `--panel` for land things, `--plum-deep` for sky
things. The knockout colour is the same on both.

### Paper texture

Three layers, all CSS, no image assets if avoidable:

1. Fibrous grain: tiled `feTurbulence` SVG as a data URI, 3 to 5% opacity.
2. Foxing: four or five soft radial-gradient blotches in `--edge`, low opacity,
   at fixed odd positions. Not random, not animated.
3. Vignette: a large radial gradient darkening toward the viewport edges.

**CSP: checked, nothing to do.** `imgSrc` in `app.js` already carries `data:`, so
the texture layer works as-is. `fonts.gstatic.com` and `fonts.googleapis.com` are
already whitelisted too, so IM Fell English and EB Garamond load without a config
change.

---

## Type

All from Google Fonts, all free.

| Role | Face | Notes |
|---|---|---|
| Display, page titles | **IM Fell English SC** | Real 17th-century type with ink bleed built into the glyphs. Small caps. Letterspace it. |
| Map lettering, section labels | **IM Fell English SC** | All caps, wide tracking, for feature and region names. |
| Annotations, notes, italic asides | **IM Fell English Italic** | Cartographic convention: italic for water and for commentary. |
| Body and dense data | **EB Garamond** | IM Fell is unreadable below 15px. This is the honest tradeoff: keep the period feel in headings, use a legible Garamond for the season strip, the weather table and review bodies. |

Syne and DM Sans are retired.

**Cartographic lettering conventions, worth following because they are free
credibility:**

- Region and place names: caps, letterspaced.
- Water features and valleys: italic.
- Spot elevations: small roman, no label, just the number.
- Contour elevations: lettered *along the contour curve itself*, with the line
  broken to make room. Not in a box, not on a leader line.

---

## Device inventory

Every device below is visible in the reference and maps onto something the show
page already renders. This table is the brief.

| Reference device | Where it goes |
|---|---|
| Fine ink contour linework | The topo card. Already real d3 contours from SRTM. Zero change to the data, change the strokes to `--ink`, index contours to `--ink-deep`. |
| Text lettered along a curve | Contour elevations, lettered along the line. Already on the wishlist in `HANDOVER.md`. |
| Radiating rhumb lines from a compass rose | Very faint `--ink-soft` page background, behind everything, 4 to 6% opacity. |
| Compass rose / star | North arrow on the topo card. Data-true: we know the grid orientation. |
| Solid panel, knockout text | Hero title block, price badge, primary CTA in `--panel`. The "prime" season state in `--plum-deep`. |
| Structure built from repeated tiny text | Section dividers, and the topo card border. Repeat the campground name or the terrain summary at 6px. |
| Foxing, blotches, edge darkening | Page texture layer. |
| Fold and panel seams | Section separators, and the vertical gutter between the identity column and the conditions sidebar. |
| Hachures on steep ground | The topo card, on cells above a slope threshold. We compute slope already. |
| Scale bar | The topo card. We know the box is 10km across. |
| Angled hand-lettered labels | Amenity and tag chips. Use sparingly, 1 to 2 degrees maximum, or it becomes a costume. |

### The animated dashed trail

The one motion element that stays. It must be **data-true**, not decoration:

1. **The fall-line cross-section.** A dashed path walking the profile from one
   edge to the other, drawing once on scroll into view. This is literally a
   route across the terrain, so a walking dashed line is honest.
2. **The contour draw-on** already exists (`pathLength` + `stroke-dashoffset`,
   radiating from the campground's own elevation). Keep it. It is already the
   right idea in the wrong colours.
3. Nothing loops. `PLAN.md` rejected continuous motion and that stands. Every
   animation is one-shot on scroll into view, and `prefers-reduced-motion` jumps
   to the final state.

### The season strip, on the purple plate

This is the largest block of the second ink on the page, and it is where the
purple earns its place. Every stroke here is `--plum` or `--plum-deep`.

The strip currently encodes five states in five colours. Five hues are gone, so
this needs solving, and the period-correct answer is better than what it
replaces: **engraved fill patterns**, ordered by ink density.

| State | Fill | Why |
|---|---|---|
| Snowbound | Open stipple | Least ink. Empty, cold. |
| Cold | Sparse horizontal hatch | |
| Monsoon | Diagonal hatch, left-leaning | Parallel-line shading is how old charts render water. |
| Too hot | Dense cross-hatch | Oppressive. Solves the "no hot colour" problem from `HANDOVER.md`. |
| Prime | **Solid `--plum-deep`** | The only solid. Reads as the answer at a glance. |

Strictly more legible than the current amber-hatch fudge, and it survives
greyscale and colour blindness by construction, because the encoding is texture
rather than hue.

---

## Hard rules

1. **No colour outside the tokens above, and no plate crossing.** A two-ink
   system survives exactly as long as the two inks keep their jobs. Purple on a
   contour, or brown on the season strip, and it is just a theme again.
2. **No emoji.** The show page currently uses 💧 💨 🌧️ 🥾 🌲 🏔 📍 ⛺ ★. Every one
   is replaced with a drawn ink glyph or an inline SVG symbol. This is a real
   work item, not a detail.
3. **The animated weather GIFs in `/images/weather/` must go.** Ten cartoon GIFs
   in a 17th-century engraving is the single loudest thing that would break the
   illusion. They need ink-drawn replacements.
4. **Corner radius 0 to 2px.** The current system uses 12px. Paper does not have
   rounded corners; sheets have edges.
5. **No drop shadows, no glass, no gradients as decoration.** Depth comes from
   overlapping sheets and hairline rules. Vignettes and foxing are the only
   gradients.
6. **Borders are hairline ink rules,** 0.5 to 1px in `--ink-soft` or `--ink`, not
   grey box-strokes.
7. Everything from `PLAN.md` still holds: vanilla JS, IIFE, no bundler, no
   frontend npm, d3 from CDN, terrain failures silent.

---

## What the generators must not invent

Both Stitch and Figma emit code we cannot use. EJS templates, Bootstrap 5 alpha
utilities and one hand-written stylesheet. **Their output is a visual reference
to port by hand, never code to paste.** Prompts are written accordingly.

More importantly, they will happily draw terrain we cannot render. Constrain
them:

- Contours must be **simple closed concentric loops from a coarse grid**. We
  upsample 10x10 to 40x40. No shaded relief, no satellite imagery, no
  hypsometric colour ramps, no 3D.
- The season strip is **exactly twelve columns**, dropping to six then three.
- The geographic map is MapTiler and needs its own custom style built in MapTiler
  Cloud. Generators cannot produce that; they can only show where it sits.

---

## Prompts

### Stitch — master

```
Design a desktop web page for a campground survey tool. The visual language is a
hand-drawn 17th-century topographic chart on aged paper, printed in exactly two
inks the way old maps were printed one ink per plate.

PALETTE, use exactly these and nothing else:
  parchment ground     #bda291
  lifted paper         #cdb89d
  recessed paper       #a68d76
  page edge shadow     #8a7259

  FIRST INK, warm brown, used for THE LAND:
  faint linework       #6b4f3e
  body text and lines  #4a3428
  heaviest ink         #33211a
  solid panel fill     #543329
  knockout text        #d9c6ac

  SECOND INK, deep aubergine purple, used for THE SKY:
  faint sky linework   #5a4168
  sky text and strokes #3d2a47
  solid sky panel      #2a1b33

THE TWO INKS HAVE STRICT JOBS. Brown carries the land: terrain, contours,
elevation, the place name, the location, the price, the description, the chips,
the reviews, the navigation, all structure. Purple carries the sky: weather,
daylight, sunrise, sunset, and everything about season and time. Nothing
crosses. Purple is the minority ink, roughly a third of the page.

There is no highlight or accent colour. Emphasis comes from ink weight and from
solid dark panels with paper-coloured knockout text. Use a solid brown panel for
the price and the primary button, and a solid purple panel for the strongest
state in the seasonal chart.

TYPE: IM Fell English SC for titles, section labels and map lettering, all caps,
generously letterspaced. IM Fell English Italic for annotations. EB Garamond for
body copy and dense numeric tables.

TEXTURE: subtle paper fibre grain, a few soft foxing blotches, darkening toward
the page edges, and a very faint web of straight radiating survey lines across
the background at about 5 percent opacity.

PAGE CONTENT, in order:
1. A photo strip: one large image and two smaller, with hairline ink borders and
   a slight desaturated warm tone so they sit on the paper.
2. Two columns. Left, in brown ink: campground name as a large letterspaced
   small-caps title, a location line, a price shown as a solid dark brown panel
   with knockout text, a paragraph of description, and two rows of small labelled
   chips for amenities and tags. Also a row of four small measures, where the
   first, elevation, is in brown, and the other three, daylight, sunrise and
   sunset, are in purple because they belong to the sky. That colour break inside
   one row is deliberate; make it read as intentional.
   Right, narrower, entirely in purple ink: a live conditions panel with current
   temperature, a 3-day forecast in three columns, and a 7-day history table of
   dates and temperatures.
3. A full-width terrain section, labelled LOCATION AND TERRAIN. It holds one
   sentence of prose, a wide geographic map, and a large square topographic card.
   The topo card shows simple concentric closed contour loops drawn in fine brown
   ink on parchment, with every fifth contour heavier and its elevation number
   lettered along the curve itself with the line broken to make room. Add
   hachures on the steepest slopes, a scale bar reading 10 km, a north arrow, and
   a single marked point for the campground. Below it, a side-on cross-section
   profile of the same terrain with a marker where the campground sits. Below
   that, five measures in a row: relief, position, slope, aspect, ground.
4. A section labelled WHEN TO GO, drawn entirely in the purple ink: twelve equal
   columns, one per month, each with the month abbreviation, a vertical bar, a
   state word, a high and low temperature and a rainfall figure. Encode the five
   states as engraved fill patterns rather than colours: open stipple, sparse
   horizontal hatch, diagonal hatch, dense cross-hatch, and solid purple. A key
   sits below. This is the largest block of the second ink and should feel like a
   separate plate of the same chart.
5. A reviews section, back in brown ink: a heading, cards with a star rating
   drawn as ink stars, a quoted body, and an author line. Then a form with a
   rating control and a textarea.

CONSTRAINTS: corner radius 0 to 2px. Borders are hairline ink rules, not grey
strokes. No drop shadows, no gradients except the paper vignette, no glass
effects, no rounded pill buttons, no emoji, no icon-font pictograms. Every symbol
is a drawn ink mark. No satellite imagery, no shaded relief, no colour ramps, no
3D terrain. The purple must stay deep and desaturated like an aged ink; never
bright, never violet, never lavender, and never used as a gradient or a glow.
```

### Stitch — divergence runs

Run each of these **after** the master, as a follow-up, to get compositions we
would not have reached ourselves. One axis each.

```
A. Same style and content. Now make the topographic chart the page itself: the
   contours run full-bleed edge to edge behind everything, and the text sections
   sit directly on the terrain as annotated callouts with hairline leader lines
   pointing to features, the way a surveyor annotates a field sheet. No cards.
```

```
B. Same style and content. Now present it as separate sheets of paper laid on a
   desk: each section is a physically distinct sheet with visible torn or cut
   edges, slight rotation of half a degree, and overlap. Depth from overlapping
   paper only, no shadows beyond the contact edge.
```

```
C. Same style and content. Now place the geographic map and the topographic
   contour card side by side as two equal squares, matched in scale and
   orientation, like a plate pair in an atlas, with a shared caption beneath.
   Rebalance the rest of the page around that pair.
```

```
D. Same style and content. Now design it as a single bound folio page: a ruled
   margin, a running header with the region name and a folio number, marginal
   annotations in italic set in the outer margin, and the data tables set as
   letterpress tables with rules rather than as cards.
```

```
E. Same style and content. Now push the two-ink printing idea as far as it goes:
   make the page look like two plates that were printed slightly out of
   registration, with the purple sky plate offset from the brown land plate by
   about one pixel in places, faint ink overlap where they cross, and a small
   registration mark in one corner. Show me how the two plates can interlock
   rather than sit in separate bands.
```

### Figma Make — motion study

Figma Make produces running code, so use it for the thing Stitch cannot show:
the motion. Do not use it for layout.

```
Build a single interactive component: a topographic contour card in the style of
a hand-drawn 17th-century survey chart. Parchment ground #bda291, ink #4a3428,
heaviest ink #33211a, faint linework #6b4f3e. No other colour. Type is IM Fell
English SC, all caps, letterspaced, for all lettering.

The card is square. It contains 12 concentric closed contour loops derived from a
coarse elevation grid, so the shapes are soft and rounded, not jagged. Every
fifth loop is heavier and carries its elevation number lettered along the curve
with the line broken to make room for the digits. A scale bar reads 10 km. A
north arrow sits in one corner. A single point marks a campground.

Beneath the card, a side-on cross-section profile of the same terrain, drawn as a
single line with a marker where the campground sits.

MOTION, all one-shot on scroll into view, nothing loops:
1. The contours draw themselves on, stroke by stroke, starting from the loop
   nearest the campground's own elevation and spreading outward to higher and
   lower loops. Use pathLength and stroke-dashoffset. About 1.2 seconds total.
2. A dashed line then walks the cross-section profile from left to right, like a
   route being traced, and stops at the campground marker.
3. Hovering any contour raises its weight and reveals its elevation. The readout
   follows the cursor using transform only, never left or top.
4. Under prefers-reduced-motion, everything jumps straight to the final state.

Show me three different treatments of the dashed trail: one where the dashes are
uniform, one where they are hand-drawn and irregular in length, and one where the
trail leaves faint tick marks behind at intervals like distance markers.
```

### Figma Make — hatch study

The second thing Stitch cannot really show. Engraved fill patterns are easy to
describe and hard to get right, and this is the block the purple ink lives in.

```
Build a single component: a twelve-column seasonal chart in the style of an
engraved 17th-century chart plate. Parchment ground #bda291. All ink is deep
aubergine purple: #3d2a47 for strokes and text, #2a1b33 for solids, #5a4168 for
faint rules. No other colour. Type is IM Fell English SC, all caps, letterspaced,
for the month names and state words; EB Garamond for the numbers.

Each column is one month and carries: the three-letter month abbreviation, a tall
vertical bar, a state word, a high and low temperature, and a rainfall figure.

The bar is filled with an engraved pattern, not a colour, and there are five
states ordered by ink density:
  snowbound  open stipple, sparse dots
  cold       sparse horizontal hatch
  monsoon    diagonal hatch leaning left
  too hot    dense cross-hatch
  prime      solid #2a1b33

Render the patterns as real SVG patterns with hand-drawn irregularity in the
stroke, not as flat CSS repeating gradients. A key sits below the columns.

Show me three versions: one where the patterns are fine and dense, one where they
are coarse and openly hand-cut, and one where the bars are replaced by the
pattern filling the entire column cell behind the text. Also show the chart at
1100px wide dropping to six columns and at 620px dropping to three.
```

**If "Figma Animate" meant the new animation features in Figma Design rather
than Figma Make:** both prompts still work as written briefs, but the build is by
hand. The three dashed-trail treatments are the part worth prototyping there.

### Why the prompts never name the reference

Naming the franchise produces generic wizard output: purple, gold, stars, wands.
Describing the visual properties produces the actual look. The reference image is
17th-century cartographic engraving, which is what the prompts describe directly.
Feed the screenshot alongside the text where the tool accepts an image; it will
outperform any amount of prose.

---

## MapTiler: what is actually controllable

The MapTiler SDK is MapLibre GL underneath, so the map is a **style JSON of
sources and layers**, and every paint property on every layer is yours. The
OUTDOOR style currently used cannot be recoloured because it is a fixed remote
style, but it can be replaced or mutated.

Four options, least to most control.

### 1. Recolour at runtime, from `showPageMap.js`

Zero MapTiler Cloud work. After `map.on('load')`, walk `map.getStyle().layers`
and rewrite paint properties by layer type.

```js
map.getStyle().layers.forEach(l => {
  if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', '#bda291');
  if (l.type === 'fill')       map.setPaintProperty(l.id, 'fill-color', '#b39c85');
  if (l.type === 'line')       map.setPaintProperty(l.id, 'line-color', '#6b4f3e');
  if (l.type === 'symbol')     map.removeLayer(l.id);   // kill all labels
});
```

About thirty lines gets a parchment map. Downsides: a visible flash of the
original style before the recolour lands, and it breaks silently if MapTiler
changes the base style's layer set. Good for a same-day prototype, wrong as the
final answer. Fits the vanilla-JS constraint exactly.

### 2. A custom style in MapTiler Cloud Customize

The proper baseline. Fork a style in the Customize editor, edit every layer's
colour, delete the clutter, save, and point `showPageMap.js` at the new style
URL. No code change beyond the URL.

**Start from a neutral base, not OUTDOOR.** MapTiler publishes styles built to be
recoloured; check your account's style list for the current names, but the
monochrome and neutral ones are the right starting point rather than anything
already carrying terrain colour. Delete POIs, transit, building fills, and most
road classes. A survey chart shows landform, water, and a very few routes.

**Labels are the one real limitation.** `text-font` can only reference fonts
served from the style's glyph endpoint, which is MapTiler's hosted set. IM Fell
English is almost certainly not in it, and whether you can upload a custom font
depends on your plan. Verify before designing around it. Two honest ways out:
pick the closest hosted serif, or **turn map labels off entirely and letter the
map yourself in an SVG overlay**, which is more work but gives you the real
typeface and matches the topo card.

### 3. Add MapTiler's contour tileset

This is the one worth the trip. MapTiler publishes a **vector contour tileset**
alongside the basemap tiles. Add it as a source and you get real contour lines at
every zoom, with an elevation attribute per line and a flag marking index
contours.

That means the geographic map can be styled as the same kind of chart as the topo
card:

```js
map.addSource('contours', { type: 'vector', url: `https://api.maptiler.com/tiles/contours/tiles.json?key=${maptilerApiKey}` });

map.addLayer({
  id: 'contour-line', type: 'line', source: 'contours', 'source-layer': 'contour',
  paint: { 'line-color': '#4a3428', 'line-width': ['case', ['>', ['get','nth_line'], 0], 1.1, 0.5] }
});

map.addLayer({
  id: 'contour-label', type: 'symbol', source: 'contours', 'source-layer': 'contour',
  filter: ['>', ['get','nth_line'], 0],
  layout: {
    'symbol-placement': 'line',          // lettering ALONG the curve, natively
    'text-field': ['concat', ['get','ele'], 'm'],
    'text-size': 10, 'text-letter-spacing': 0.1
  },
  paint: { 'text-color': '#33211a', 'text-halo-color': '#bda291', 'text-halo-width': 2 }
});
```

`symbol-placement: 'line'` gives you contour elevations lettered along the
contour, with a paper-coloured halo breaking the line to make room. That is the
exact cartographic device from the device inventory, for free, on the geographic
map. Getting the same effect on the SVG topo card is hand-written `textPath`
work.

**Verify the tileset id and the attribute names** (`ele`, `nth_line`) against
your account's tile list before building on them; those are from the
OpenMapTiles schema and MapTiler's naming may differ.

**Strategic consequence:** if the geographic map is also a contour chart, then
divergence run C stops being a layout idea and becomes the obvious answer. Two
matched squares, same visual language, two scales: the 10km SRTM survey card on
one side, the regional chart on the other. That is a page nobody else has, and it
uses data already inside your MapTiler key.

### 4. Other paint properties worth knowing

| Property | Use |
|---|---|
| `hillshade-shadow-color`, `hillshade-highlight-color`, `hillshade-accent-color` | Three values turn a `raster-dem` hillshade into engraved brown relief on parchment. Cheapest big win after recolouring. |
| `line-dasharray` | Dashed linework natively, including animated one-shot draw by stepping the array in `requestAnimationFrame`. Extends the dashed-trail idea onto the geographic map. |
| `setTerrain` with `terrain-rgb` | Already Task 4 in the context doc. Reconsider it: 3D relief fights an engraved flat chart. Probably drop. |
| `fill-pattern` / `line-pattern` | Takes an image added with `map.addImage()`. This is how you get hatching and stipple onto map polygons, matching the season strip. |

### 5. The cheap unifier, regardless of the above

A paper texture overlay on top of the canvas with `mix-blend-mode: multiply`,
plus a filter on the canvas itself:

```css
#map canvas { filter: sepia(0.35) saturate(0.55) contrast(1.05); }
#map::after  { content:''; position:absolute; inset:0; pointer-events:none;
               background: var(--paper-grain); mix-blend-mode: multiply; }
```

Five lines, and any basemap starts to read as printed on the same sheet as the
rest of the page. Do this whichever option you pick.

### Recommendation

Option 2 as the base, plus option 3 for the contours, plus option 5 always.
Option 1 only if you want to see it working this afternoon.

---

## Built, 13 August 2026

Stitch produced mediocre engraving and Figma ran out of tokens, so the show page
was built directly from this spec.

**Files touched:**

- `public/stylesheets/chart.css` — new. The whole treatment, scoped to
  `body:has(.detail-page)`. **`app.css` is untouched and no other page changes.**
- `views/campgrounds/show.ejs` — rewritten.
- `public/javascripts/topoMap.js` — ink colours, index contours, contour
  lettering, dashed trail, profile moved to its own slot.
- `public/javascripts/showPageMap.js` — runtime recolour, trig marker.

**The one technique worth remembering:** rather than fight `app.css`, the old
design tokens are *remapped in place* on the show page scope. `--sage` becomes
`--ink`, `--amber` becomes `--ink-deep`, `--white` becomes the dark ink,
`--blue-dot` becomes `--plum`. Every existing rule for the navbar, footer and
flash messages then renders in parchment with no edits to `app.css` at all. New
page content uses `ch-` prefixed classes, so there is nothing to override.

**Layout:** divergence run C inside run D's framing. Ruled folio margin and a
running header with region and plate number; the terrain section is the matched
plate pair, geographic left and contour right, both true squares, one caption
beneath. That also resolves the non-square topo card in `HANDOVER.md`, because
the header and the cross-section now live outside the frame.

**Season strip:** engraved fills as specified, and the bar now carries two
variables. Fill *height* is the monthly mean temperature normalised across the
year, fill *texture* is the state.

**Verified:** 38 tests still pass. `show.ejs` renders in three shapes (full page
with owner logged in; no weather, no sun, no seasonality, logged out; single
image with no cached grid), with no emoji and no weather GIF paths left in the
output. **Not verified:** anything client side. `topoMap.js` and
`showPageMap.js` parse but have not run. `npm start` and a browser is the check.

### Three things that were wrong on the first pass

Recording these because two are non-obvious and would be easy to reintroduce.

1. **Atmosphere painted behind the content only reaches the body background.**
   The grain and vignette were on `body::after` at `z-index: 0` while
   `.detail-page` sits at `z-index: 1`, so everything with its own background,
   both map squares included, floated on top undarkened and the page read
   several shades deeper than they did. Both layers moved above the content
   (`z-index: 8` and `9`, `pointer-events: none`). **The sheet is one sheet;
   anything atmospheric belongs on top of all of it.**

2. **Grain must not be `multiply`.** Multiplied noise can only darken, so at any
   strength worth seeing it drags the whole page below its own token value. The
   grain is `soft-light`, which lays light and dark in equal measure and leaves
   the paper where it started. That is the only reason the ground can match the
   squares exactly and still be visibly grainy. The noise is also desaturated
   with `feColorMatrix` first, because raw `feTurbulence` is coloured and tints
   the sheet.

3. **`mix-blend-mode` blends against the backdrop inside the nearest stacking
   context, and filters run before the blend.** The weather GIFs sit on a white
   card and were meant to dissolve into the paper under `multiply`. Two things
   stopped it. `.detail-page` creates a stacking context and painted no
   background, so they were multiplying against transparency, which is a no-op:
   it now carries `background: var(--paper)` and **that declaration is load
   bearing.** And `sepia(1)` maps white to `(1, 1, 0.937)`, not white, so even a
   working multiply left a faint box; `brightness(1.12)` pushes it back over the
   clip point and `contrast(1.18)` restores the artwork.

**Figures.** IM Fell English SC carries old-style figures that sit at x-height,
so digits set beside its own capitals read a size small and a shade light. That
was the "font is not consistent" problem, and it was real: they were effectively
two fonts. Labels stay engraved, every numeral moved to Garamond with
`font-variant-numeric: lining-nums tabular-nums`.

**Not done:** hachures on steep cells. Doing it properly needs per-cell slope
and ticks drawn perpendicular to the contour, and done badly it would muddy a
40x40 render. Left out rather than faked.

---

## Merged into the design system, 14 August 2026

`chart.css` is gone. The parchment system now lives in `app.css` as the design
system itself, so it applies to every page rather than to the show page only.

**What the merge did:**

- `:root` replaced with the two-plate palette. Every existing rule in the file
  was already written against `--bg`, `--surface`, `--sage`, `--amber` and so
  on, so redefining those roles converted the whole site in one edit.
- **77 hardcoded colour literals** swapped. The old palette's channels map one
  for one onto the new inks: sage to `--ink`, muted to `--ink-soft`, amber and
  the dark background to `--ink-deep`, white to `--knockout`. One more was
  URL-encoded inside an SVG data URI (`%238fa898`, the select chevron) and had
  to be caught separately.
- **1066 lines of orphaned CSS deleted** — the old detail-page rules that the
  show.ejs rewrite abandoned.
- The show page moved **off the `ch-` prefix** and onto the project's existing
  vocabulary: `.stat-card`, `.chip`, `.btn-musafir`, `.season-month`,
  `.review-card`, `.forecast-grid` and the rest. Those names were all in the
  orphaned set, so the parchment definitions simply took their place.
- `stars.css` deleted. The rating is now a dozen lines of CSS using `:has()`
  instead of a library painting gold PNG sprites that cannot be recoloured.
- Fonts moved into `boilerplate.ejs`, so every page gets IM Fell and Garamond.

**Two things worth remembering:**

`font-synthesis: none` on the body is not cosmetic. IM Fell English SC ships a
single weight, and `app.css` is full of `font-weight: 600`. Without that line
every label renders as a smeared synthetic bold.

The state modifier for a season month sits on **the month**, not on the bar, so
one class drives both the bar fill and the key swatch from a single rule.

**Still page-scoped, deliberately:** `html:has(.detail-page) { font-size: 20px }`.
Everything is sized in rem, so that one line is the 1.25x scale. The explore and
form pages were laid out against a 16px root and have not been re-checked at
20px, so they keep it. Widen the selector once they have been.

**Not converted: the home page.** `views/home.ejs` is standalone, with its own
`<head>`, its own `home.css` (375 lines), its own Syne and DM Sans links, and
inline SVG contour paths hardcoded to `#6a9e72`. Nothing in the merge reaches
it, so it is currently the one page still in the dark palette.

---

## The palette has one name per colour

The first merge left a compatibility block mapping the old names onto the new
ones: `--sage` to `--ink`, `--amber` and `--white` both to `--ink-deep`,
`--muted` to `--ink-soft`. It worked, but it meant the primary text colour was
reachable by three different names and four tokens were defined and never used.
That is a migration left half-finished, and it reads like one.

The aliases are gone. **30 tokens down to 20**, every one used, nothing defined
twice. Three radius tokens all holding `2px` collapsed into `--radius`, and the
seven near-identical ink alphas scattered as literals collapsed onto `--wash`,
`--rule-faint` and `--rule`, which took 28 inline `rgba()` values down to one.

Two things fell out of that worth knowing:

- **Links lost their hover state.** With `--amber` and `--white` both resolving
  to `--ink-deep`, `a` and `a:hover` became the same declaration. One ink means
  a link cannot signal itself by changing colour, so it underlines instead,
  which is what ink on paper does anyway.
- The atmosphere layers are gone entirely. The ground is flat `#d2bea5`.

---

## Bootstrap is gone

The site loaded ~240KB of Bootstrap CSS, Bootstrap JS and Popper to use twelve
classes: `container`, `mt-5`, `d-flex`, `flex-column`, `vh-100`, `sticky-top`,
`navbar-expand-lg`, `collapse`, `fade`, `show`, `close`, `alert`. It was also
the reason for all **16 `!important` declarations** in `app.css`, which existed
only to out-specify it. Those are now zero.

**The two behaviours it provided are `public/javascripts/ui.js`, 30 lines.** The
mobile nav toggle binds off `aria-controls`, so the accessible attribute is the
hook and there is no second source of truth; dismissal binds off `data-dismiss`.
Both are delegated from the document, so nothing depends on script order.

**Worth knowing: those two controls may never have worked.** The markup carried
Bootstrap 4 attributes (`data-toggle`, `data-dismiss`) while the page loaded
Bootstrap 5, which renamed them to `data-bs-*`. Whether they bound at all
depended on the exact alpha in the CDN URL.

Two things Bootstrap's reboot was quietly providing had to be replaced: form
controls inheriting the page font (without it every input falls back to the
system UI face, very obvious on a page set in Garamond), and the `.alert` box
itself — only its colours were ever ours.

`app.js` CSP dropped `stackpath.bootstrapcdn.com` and the Font Awesome hosts.
Only jsdelivr (d3) and maptiler remain.

## The home page is converted

`home.css` referenced six tokens the merge deleted (`--bg`, `--surface`,
`--amber`, `--sage`, `--white`, `--muted`), so it was rendering with unresolved
variables. Same alias migration applied, literals collapsed onto `--wash` and
`--rule-faint`, fonts swapped in `home.ejs`, and the hero's decorative contour
paths moved their stroke from an inline attribute into a rule, because
presentation attributes do not resolve custom properties.

**Still unstyled, and it predates all of this:** `views/error.ejs` uses ten
`error-*` classes that have never existed in any stylesheet.

---

## Work items this redo creates

Beyond restyling, these are new and non-trivial:

1. ~~Replace ten animated weather GIFs~~ Done. Ten stroked ink symbols in an
   inline sprite in `show.ejs`. **`public/images/weather/*.gif` are now unused
   by the show page and can be deleted once the other pages stop using them.**
2. ~~Replace every emoji~~ Done. The data ones became letterpress contractions
   (RH, Wind, Precip), which is how a chart labels anyway and reads better than
   a pictogram did. Only genuine symbols stayed: weather, trig point, star,
   raindrop, north arrow.
3. **Build a custom MapTiler style** and wire the contour tileset. Runtime
   recolour is in place as the interim; see the MapTiler section above.
4. ~~Rework the season strip~~ Done, plus bar height now encodes the mean.
5. ~~Restyle the starability library~~ Done by dropping it. `stars.css` is no
   longer loaded on the show page: the result stars are inline SVG and the input
   is 12 lines of CSS using `:has()`. **`stars.css` is still loaded elsewhere,
   so do not delete it.**
6. ~~Restyle the topo renderer~~ Done except hachures. Index contours are every
   third line, heavier and in `--ink-deep`, and they carry their elevation
   lettered along the curve via `textPath` with a paper-coloured stroke painted
   under the fill, so the contour breaks to make room without splitting a path.
7. ~~CSP check for `img-src data:`~~ Done. Already present, along with the Google
   Fonts hosts. No change needed.
8. **Port `app.css`** (2145 lines) and `home.css` (375) once the show page proves
   the direction.

---

## Open questions

- **Does the purple plate hold at a third of the page, or does it want more?**
  Built as specified it carries the conditions panel, three of the four hero
  measures, and the whole season strip. If that reads as too little, the next
  thing to hand it is interactive state: links, focus rings, active nav. That
  would be a second meaning for the ink and it weakens the system, so only do it
  if the page genuinely looks lopsided.
- **Does the geographic MapTiler map survive on the show page?** With a parchment
  topo card doing the cartography, a second map may be redundant. Divergence run
  C tests the alternative, and MapTiler's contour tileset makes the argument for
  keeping it much stronger than it was.
- **Photos: deferred, deliberately.** Full-colour photographs on an engraved page
  will fight the aesthetic. Leaving them as they are for now and treating them
  later. Options when it comes up: warm duotone in the ink and paper tones, a
  halftone or engraved-dot treatment, or heavy desaturation.
- **The name.** `PLAN.md` had Cairn leading. Parchment cartography does not
  settle it, but it does narrow the wordmark to something that can be cut as a
  woodblock.