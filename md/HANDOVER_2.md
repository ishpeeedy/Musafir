# Handover 2 — parchment chart, Bootstrap just landed

> Written 14 August 2026. Read this first, then `UI_REDO.md` for the design
> system and the reasoning behind it, then `PLAN.md` and `DATA.md`.
> `HANDOVER.md` is the terrain session and is still correct about the data
> layer. `HANDOVER_POST_CAROUSEL.md` is superseded by this file.

The front end is a hand-drawn parchment chart. The data layer has not been
touched in two sessions: 38 tests pass, no controller, model or service has
changed.

**Bootstrap 5.3 was added at the very end of this session and nothing uses it
yet.** That is the single most important fact here.

---

## State right now

```
80b33ec  add carousel                              <- HEAD
fdc7c51  redo the ui as a parchment chart, drop bootstrap
94ba54b  move docs into md/
```

Uncommitted, and all of it verified as far as it can be without a browser:

```
 M app.js                            CSP: jsdelivr added to styleSrc
 M public/stylesheets/app.css        Bootstrap compat, map scoping, current month, sun marker
 M views/layouts/boilerplate.ejs     Bootstrap 5.3 CSS + JS bundle
 M views/campgrounds/show.ejs        current-month marker, loads mapTheme.js
 M views/campgrounds/index.ejs       loads mapTheme.js
 M public/javascripts/showPageMap.js now delegates to mapTheme.js
 M public/javascripts/clusterMap.js  now themed, was never recoloured at all
 M public/javascripts/topoMap.js     cross-section marker is a sun GIF
?? public/javascripts/mapTheme.js    new, shared map recolour
```

`origin/main` is 3 commits behind local.

**Nothing in the last three sessions has been opened in a browser.** There is no
browser driver here. Everything is verified by rendering templates in Node,
parsing CSS and JS, and diffing class and variable usage. That catches a great
deal and has caught several real bugs, but it cannot tell you whether a page
looks right. **Load every page before trusting any of it**, and the navbar
first: Bootstrap just landed underneath it and the compatibility guard below is
predicted, not observed.

---

## Bootstrap: read before touching the CSS

Bootstrap 5.3.3 loads from jsdelivr in `boilerplate.ejs`, **before** `app.css`,
so on equal specificity our rules win per property without needing
`!important`. There are zero `!important` declarations in the stylesheet and it
should stay that way.

**No markup uses Bootstrap yet.** The only concession is a two-rule
compatibility block near the top of `app.css`. Ten of our class names collide
with Bootstrap components (`.navbar` and its children, `.nav-link`, `.alert`
and variants, `.form-control`). For most, our declarations simply win. The two
in the guard are cases where Bootstrap sets a property we never declared, so
there was nothing of ours to beat it with:

- `.navbar-nav` would go `flex-direction: column` and stack the nav links
  vertically, because Bootstrap only makes it a row inside `.navbar-expand-*`.
- `.navbar-collapse` would take `flex-basis: 100%` and push the right-hand
  group onto its own line.

Delete each guard line as that component converts to real Bootstrap markup.

**No SRI hash on the CDN links.** A wrong hash blocks the file silently, and it
could not be verified from this environment. Add one from getbootstrap.com if
you want it.

### The agreed plan for adopting it

Decided with the user, in this order:

1. **Forms, element-first.** The biggest single win. There are ~55 form rules
   across `.form-*`, `.check-*`, `.auth-*`, `.file-upload-*`, `.price-input-*`
   and `.image-delete-*`, against 27 `<input>`, 37 `<label>`, 3 `<textarea>`
   and 1 `<select>` in the templates. Style the elements for defaults, let
   Bootstrap's `.form-control` and `.form-label` do the standard work, keep only
   the genuinely bespoke pieces (the amenity chip picker, the image-delete grid,
   the upload dropzone). **Roughly 55 rules down to 15.**
   One gotcha to design in from the start: a bare `input {}` also hits
   checkboxes, radios and file inputs. Use
   `input:not([type="checkbox"]):not([type="radio"]):not([type="file"])`, or
   wrap it in `:where()` to keep specificity at zero so Bootstrap can override.
2. **Collapse the label rules.** Fourteen rules are all "a label", differing
   only in size and which plate they sit on: `.section-label`, `.stat-label`,
   `.price-label`, `.filter-label`, `.sub-label`, `.runhead`, `.season-key`,
   `.season-month__state`, `.scale-bar`, `.readings`, `.plate-viewer__count`,
   `.chip`, `.check-chip span`, `.btn-musafir`. **Collapse to `.label`,
   `.label--sm`, `.label--ruled`.** Name things by what they are, not where they
   sit. The same move already worked for annotations: thirteen rules setting the
   italic hand face became one grouped rule.
3. **Show page.** 112 distinct classes on one page. With Bootstrap doing layout
   and spacing the honest bespoke set is about 35.
4. **`/campgrounds` last, with the search overhaul**, since that work replaces
   the filter sidebar anyway. Do not restyle it before then.

### Theme Bootstrap, do not override it

Bootstrap 5.3 exposes `--bs-body-bg`, `--bs-body-color`, `--bs-border-color`,
`--bs-primary`, `--bs-btn-*`, `--bs-card-*`, `--bs-navbar-*` and the rest. Map
the palette onto those and every component recolours with **no override rules
at all**. Every `!important` this project ever had came from fighting
Bootstrap's selectors instead.

### A full Bootstrap rewrite was attempted and rolled back

Within this session the whole stylesheet was cut to a 739-line "kit" (tokens
plus a `--bs-*` theme layer plus the bespoke pieces), `show.ejs` was rewritten
in Bootstrap markup, the navbar and flash became Bootstrap components, and
`gallery.js` and `ui.js` were deleted in favour of the Bootstrap bundle. It all
rendered and tested clean, and the user rejected it on sight and asked to roll
back. `git checkout .` restored `80b33ec`.

**The lesson is pacing, not direction.** Bootstrap is still the plan. Convert
one page at a time and look at each before moving on. Do not cut the stylesheet
down first and rebuild after; that leaves every page broken at once with nothing
to compare against.

---

## Traps

Every one of these was a real bug. Most were silent.

1. **An undefined CSS custom property is not a no-op.** `topoMap.js` once set
   `fill: var(--sage-dim)` after that token was deleted; `fill` fell back to its
   *initial* value, solid black, and the cross-section filled in completely.
   **Custom properties referenced from JavaScript are invisible to every
   dead-code check.** Grep `var(--` in `public/javascripts/` after any token
   change.
2. **`mix-blend-mode` blends against the backdrop inside the nearest stacking
   context.** The weather GIFs and the new sun marker dissolve their white card
   into the paper with `multiply`. That only works because `.detail-page` paints
   an opaque background; it creates a stacking context, so with no background
   they multiply against transparency, which does nothing. **That declaration is
   load bearing and is commented as such.**
3. **Filters run before blends.** `sepia(1)` maps white to `(1, 1, 0.937)`, not
   white, so the card stays faintly visible until `brightness` pushes it back
   over the clip point.
4. **Percentages resolve against the padded box.** The cross-section marker is
   positioned with viewBox percentages; its parent carries padding for the axis
   figures and caption, so the marker once landed 26% too low and read as the
   pin sunk into the hill. It lives in `.topo-profile__plot`, which is exactly
   the drawing area. **If you add padding to a plot container, check the marker.**
5. **`img { max-width: 100% }`** clamps against a fixed grid track and stretches
   the art. `.wx` and the marker opt out with `max-width: none` and guard with
   `object-fit: contain`.
6. **IM Fell English SC ships one weight.** `font-synthesis: none` on the body
   is what stops every `font-weight: 600` rendering as smeared synthetic bold.
   Bootstrap asks for 500 and 700 in a dozen places, so this matters more now.
7. **IM Fell SC has old-style figures that sit at x-height**, so its digits read
   a size small beside its own capitals. Every numeral is Garamond with
   `lining-nums tabular-nums`. See the Figures section at the bottom of
   `app.css`; a new numeric field has to be added there.
8. **Presentation attributes do not resolve `var()`.** Stroke colours on inline
   SVG must be set in CSS or an inline `style`, never `stroke="var(--x)"`.
9. **Never animate position with `left`/`top` over the contour SVG.** The hover
   readout moves by `transform` only.
10. **`#map` is shared by both maps.** The show page's logo crop is scoped to
    `.plate #map` for exactly this reason. Unscoped it absolutely positions the
    cluster map, shoves it 34px left, takes it out of flow and collapses the
    listing hero. That bug shipped once already.

---

## What changed this session

- **`mapTheme.js`** extracts the MapTiler layer recolour that used to live
  inside `showPageMap.js`. Both maps call it. The listing map had never been
  recoloured at all, so it was full-colour OUTDOOR with only a sepia canvas
  filter over the top.
- **`.plate #map`** scoping, fixing the collapsed listing hero described above.
- **`.season-month--now`** marks the current month with the same wash the
  forecast uses for today. The strip previously had no "you are here" at all,
  which was odd for a chart whose job is *when to go*.
- **The cross-section marker is `sunny.gif`**, matted with the same filter as
  the weather art. The filter is now a `--gif-mat` token used by both so they
  cannot drift.

**Open question on that last one:** `--gif-mat` includes `hue-rotate(232deg)`,
which lands the art on the **purple** plate. Correct for weather, but the
cross-section is a brown land plate, so there is a purple sun on a brown chart.
If it reads wrong the fix is a second token at `hue-rotate(0deg)`. Left matching
what was asked for rather than pre-empting it.

---

## Non-negotiables

1. Elevation is fetched lazily on first show-page view and cached forever. Never
   on creation, never on a list view. 1000 calls/day, 1 req/sec.
2. Sunrise/sunset is never stored.
3. Terrain failures are silent. The page must render without the topo card.
4. Vanilla JS on the front end. IIFE, no import/export, no bundler, no npm
   packages. d3 from CDN, and load order matters: `d3-array` first.
5. **Never spread a Mongoose subdocument.** Copy fields explicitly.
6. No crossing the plates: purple never touches a contour, brown never touches
   the season strip.

---

## Working agreements

- **Commit straight to `main`.** No feature branches, asked for explicitly.
- **Never commit without being asked.** Approval step by step.
- **No `Co-Authored-By` trailer.** Ever.
- **Commit messages: one line, lowercase, terse, no body.**
- Prose in chat: direct, opinionated, no filler, no em dashes.
- Surgical diffs. Do not improve adjacent code. Clean up only the orphans your
  own change created, and say so.
- **Show work before scaling it.** The rollback happened because a whole-site
  rewrite landed at once.

---

## Verifying without a browser

The technique that has caught real regressions, including a deleted rule three
other pages depended on:

1. **Render every template in Node.** `ejs.render` with mock locals, passing
   `layout: () => {}`. Cover `show.ejs` in three shapes (fully populated with
   the owner logged in; nothing populated and logged out; one image with no
   cached grid) plus error, login, register, new, edit, and index in both
   results and empty states. `index` needs `pagination`, `filters` and
   `clusterMapData`; the forms need `AMENITIES` and `TAGS`.
2. **Diff class usage against class definitions, both directions.** One finds
   classes with no styles, the other finds rules nothing uses.
3. **Diff `var(--x)` against `:root`** across the stylesheets *and the
   JavaScript*. See trap 1.
4. **Count braces.** A mismatched brace silently kills everything after it.

**These live in a scratchpad and are gone each session. Worth building as real
files under `test/`.** Two previous handovers have said this; it still has not
happened, and the black-fill bug is exactly what it would have caught.

`npm test` is 38 passing and covers `terrainAnalysis` and `seasonality` only.
Nothing client-side is tested.

---

## Loose ends

- **`views/error.ejs` is unstyled.** Nine `error-*` classes, zero rules. It was
  styled mid-session, that work was never committed, and the backup it survived
  in (`app copy.css`) has since been deleted. **It needs rewriting from
  scratch**, and it is cheap: a bordered card, a rubric-ink warning mark, an
  engraved title, and a monospaced stack trace behind the dev-only guard.
- **`home.css` is a separate 442-line file** for the standalone home page, which
  has its own `<head>` and does not use `boilerplate.ejs`. It is converted and
  correct, but it is the one place a second stylesheet still exists, and the
  user wants exactly one.
- **`html:has(.detail-page) { font-size: 20px }`** is the only page-scoped rule.
  It is the 1.25x type scale, and because it sets the *root* the navbar is
  physically larger on the show page than elsewhere. Making it sitewide is an
  unverifiable layout change: there are fixed-pixel containers (`auth-card`
  420px, `form-page` 680px, `page-main` 1200px) and px-based media queries, so
  scaling the root is equivalent to zooming to 125% and would trip breakpoints
  early. Needs eyes, not a guess.
- **`show.ejs` has one `<center>` tag** around a forecast icon. `.wx` already
  centres itself; it is redundant and deprecated. Left because it was a hand
  edit.
- **`.claude/` is committed** and probably should be gitignored instead.
- **The 2777-line stylesheet is what the user reacted badly to.** The audit
  found it was not actually bloated: 1222 declarations across 344 rules, with
  40% of the line count being braces and blank lines, and 11.6KB gzipped. The
  discomfort was real anyway. The label collapse and the Bootstrap migration are
  the answer, not a rewrite.
