# Musafir

A campground **decision tool**, not a directory. A directory answers "what
campgrounds exist near here." This answers "should I go to this one, and when."
Everything else follows from that. Built by Anuj Sharma (ishpeeedy) as a
portfolio project. Live at musafir.ishpeeedy.dev.

Node, Express, MongoDB/Mongoose, Passport, EJS, vanilla JS. No React, no
bundler, no frontend npm.

---

## How the docs work

**This file is the only one you need at the start of a session.** Claude Code
loads it automatically.

| File | Job |
|---|---|
| `CLAUDE.md` (this file) | Current state, rules, traps. The entry point. |
| `md/DESIGN.md` | The parchment design system. Read before touching CSS. |
| `md/DATA.md` | Where every number comes from. Read before touching anything that produces a figure. |
| `md/PLAN.md` | What is left to build and why. |

**There is no precedence order, because nothing is allowed to disagree.** If two
files contradict each other, that is a bug in the docs. Fix it in place.

**The rule that keeps it that way: this file is overwritten, never appended,
never numbered.** No `HANDOVER_2.md`, no `_POST_ANYTHING.md`, no dated files.
Three handover files accumulated in two days once and made the whole set
unreadable, because each declared its own partial supersession of the others.
When a session ends, edit these four files. Do not add a fifth.

---

## Where things stand

**Branch `main`, 3 commits ahead of `origin/main`. Nothing pushed.**

```
80b33ec  add carousel                              <- HEAD
fdc7c51  redo the ui as a parchment chart, drop bootstrap
94ba54b  move docs into md/
```

The data layer is finished and has not been touched in three sessions. `npm
test` is 38 passing, covering `terrainAnalysis` and `seasonality` only.

**Working end to end:** lazy elevation grid cached forever, six derived terrain
measures plus a prose summary, the topo card (10x10 upsampled to 40x40,
contoured, drawn on scroll, hover to read), the fall-line cross-section, the
twelve-month season strip from ERA5, live weather and daylight, the photograph
carousel, amenities and tags pickers, 45 real OpenStreetMap campgrounds seeded
with real terrain and climate.

### Uncommitted right now

```
 M app.js                            CSP: jsdelivr added to styleSrc
 M public/stylesheets/app.css        Bootstrap compat, map scoping, current month, sun marker
 M views/layouts/boilerplate.ejs     Bootstrap 5.3 CSS + JS bundle
 M views/campgrounds/show.ejs        current-month marker, loads mapTheme.js
 M views/campgrounds/index.ejs       loads mapTheme.js
 M public/javascripts/showPageMap.js delegates to mapTheme.js
 M public/javascripts/clusterMap.js  now themed, was never recoloured at all
 M public/javascripts/topoMap.js     cross-section marker is a sun GIF
?? public/javascripts/mapTheme.js    new, shared map recolour
```

### Two things to know before trusting any of it

**Nothing in the last three sessions has been opened in a browser.** There is no
browser driver in this environment. Everything is verified by rendering
templates in Node, parsing CSS and JS, and diffing class and token usage. That
catches a great deal and has caught several real bugs, but it cannot tell you
whether a page looks right.

**Bootstrap 5.3.3 was added at the end of the last session and no markup uses
it.** It loads from jsdelivr in `boilerplate.ejs` *before* `app.css`, so our
rules win on equal specificity without `!important`. There are zero `!important`
declarations in the stylesheet and it should stay that way. The only concession
is a two-rule compatibility block at the top of `app.css` (`.navbar-nav`
flex-direction, `.navbar-collapse` flex-basis), covering the two cases where
Bootstrap sets a property we never declared. Delete each line as that component
converts to real Bootstrap markup. **That guard is predicted, not observed. Load
the navbar first.** No SRI hash on the CDN links; a wrong hash blocks the file
silently and could not be verified from here.

---

## Non-negotiables

1. **Elevation is fetched lazily on first show-page view and cached forever.**
   Never on creation, never on a list view. 1000 calls/day, 1 req/sec. Bulk
   operations space calls 1100ms.
2. **Sunrise/sunset is never stored.** It changes daily. `null` on failure.
3. **Terrain failures are silent.** The topo card is enhancement. The page must
   render without it.
4. **Vanilla JS on the front end.** IIFE, no import/export, no bundler, no npm
   packages. d3 from CDN, and load order matters: `d3-array` first, because
   `d3-geo` and `d3-contour` both resolve it off the global.
5. **Never spread a Mongoose subdocument.** Copy fields explicitly. Spreading
   silently drops every field on a real document while passing every unit test
   that feeds plain objects.
6. **No colour outside the tokens, and no crossing the plates.** Purple never
   touches a contour, brown never touches the season strip. See `md/DESIGN.md`.

---

## Traps

Every one was a real bug. Most were silent.

1. **An undefined CSS custom property is not a no-op.** `topoMap.js` once set
   `fill: var(--sage-dim)` after that token was deleted; `fill` fell back to its
   *initial* value, solid black, and the cross-section filled in completely.
   **Custom properties referenced from JavaScript are invisible to every
   dead-code check.** Grep `var(--` in `public/javascripts/` after any token
   change. There are four, all in `topoMap.js`.
2. **`mix-blend-mode` blends against the backdrop inside the nearest stacking
   context.** The weather GIFs and the cross-section sun marker dissolve their
   white card into the paper with `multiply`. That only works because
   `.detail-page` paints an opaque background; it creates a stacking context, so
   with no background they multiply against transparency, which does nothing.
   **That declaration is load bearing and is commented as such.**
3. **Filters run before blends.** `sepia(1)` maps white to `(1, 1, 0.937)`, not
   white, so the card stays faintly visible until `brightness` pushes it back
   over the clip point.
4. **Percentages resolve against the padded box.** The cross-section marker is
   positioned with viewBox percentages; its parent carries padding for the axis
   figures and caption, so the marker once landed 26% too low and read as the
   pin sunk into the hill. It lives in `.topo-profile__plot`, which is exactly
   the drawing area. **If you add padding to a plot container, check the marker.**
5. **`img { max-width: 100% }` is global** and clamps against a fixed grid track,
   stretching the art. `.wx` and the marker opt out with `max-width: none` and
   guard with `object-fit: contain`.
6. **IM Fell English SC ships one weight.** `font-synthesis: none` on the body is
   what stops every `font-weight: 600` rendering as smeared synthetic bold.
   Bootstrap asks for 500 and 700 in a dozen places, so this matters more now.
7. **IM Fell SC has old-style figures that sit at x-height**, so its digits read
   a size small beside its own capitals. Every numeral is Garamond with
   `lining-nums tabular-nums`. See the Figures section at the bottom of
   `app.css`; a new numeric field has to be added there.
8. **Presentation attributes do not resolve `var()`.** Stroke colours on inline
   SVG must be set in CSS or an inline `style`, never `stroke="var(--x)"`. Bit us
   twice, on the home page contours and in `topoMap.js`.
9. **Never animate position with `left`/`top` over the contour SVG.** It forces
   layout and invalidates a paint rect over a large SVG; Chromium leaves the
   damage rects visible as dark blocks. The hover readout moves by `transform`
   only.
10. **`#map` is shared by both maps.** The show page's logo crop is scoped to
    `.plate #map` for exactly this reason. Unscoped it absolutely positions the
    cluster map, shoves it 34px left, takes it out of flow and collapses the
    listing hero. That bug shipped once already.
11. **The elevation API host is `api.opentopodata.org`.** `api.open-topo-data.com`
    has no DNS record. That wrong host sat in the spec for a whole stage while
    every fetch failed silently at the network layer. **If terrain stops
    appearing, check this first.**

---

## Verifying without a browser

The technique that has caught real regressions, including a deleted rule three
other pages depended on:

1. **Render every template in Node.** `ejs.render` with mock locals, passing
   `layout: () => {}`. Cover `show.ejs` in three shapes (fully populated with
   the owner logged in; nothing populated and logged out; one image with no
   cached grid) plus error, login, register, new, edit, and index in both
   results and empty states. `index` needs `pagination`, `filters` and
   `clusterMapData`; the forms need `AMENITIES` and `TAGS`. Assert on the output,
   not just that it did not throw.
2. **Diff class usage against class definitions, both directions.** One finds
   classes with no styles, the other finds rules nothing uses.
3. **Diff `var(--x)` against `:root`** across the stylesheets *and the
   JavaScript*. See trap 1.
4. **Count braces.** A mismatched brace silently kills everything after it.

For the topo renderer specifically: run `topoMap.js` verbatim in a Node `vm`
context with the three d3 UMD bundles on a shared global and about 40 lines of
DOM stubs. That confirmed the fall-line maths against live SRTM data.

**These live in a scratchpad and are gone each session. Worth building as real
files under `test/`.** Three handovers have now said this and it still has not
happened. The black-fill bug is exactly what it would have caught.

**Unit tests are not enough on their own.** The worst bug of the terrain session
passed every unit test and only appeared on a real page render, because the
tests fed plain objects where production feeds Mongoose documents. After any
data change: run the analysis over every campground straight from the database,
compare against places whose seasons are common knowledge (Leh, Cherrapunji,
Goa, Jaisalmer, Shimla, Munnar), and strip a cached field from one document to
exercise the lazy-fetch path, which never runs otherwise.

---

## Working agreements

- **Commit straight to `main`.** No feature branches, asked for explicitly.
- **Never commit without being asked.** Approval step by step.
- **No `Co-Authored-By` trailer.** Ever.
- **Commit messages: one line, lowercase, terse, no body.** Match `git log`.
  "add carousel", "clear cached climate when a campground moves". Long
  structured messages with rationale paragraphs read as machine written and were
  rewritten out of this history once already.
- Prose in chat: direct, opinionated, no filler, no em dashes.
- **Surgical diffs.** Do not improve adjacent code. Clean up only the orphans
  your own change created, and say so.
- **Show work before scaling it.** A full Bootstrap rewrite of the whole site
  landed at once, rendered clean, and was rejected on sight. The lesson is
  pacing, not direction. Convert one page at a time and look at each before
  moving on.

---

## Loose ends

- **`views/error.ejs` is unstyled.** Nine `error-*` classes, zero rules in any
  stylesheet. It was styled mid-session, never committed, and the backup it
  survived in was deleted. **Needs rewriting from scratch**, and it is cheap: a
  bordered card, a rubric-ink warning mark, an engraved title, and a monospaced
  stack trace behind the dev-only guard.
- **`home.css` is a separate 380-line file** for the standalone home page, which
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
- **`.claude/settings.json` is committed** and probably should be gitignored.
- **The mobile nav toggle and flash dismiss are the least proven things here.**
  They live in `ui.js` (32 lines, bound off `aria-controls` and `data-dismiss`,
  delegated from the document). Before that, the markup carried Bootstrap 4
  attributes while the page loaded Bootstrap 5, which renamed them all to
  `data-bs-*`, so they may never have worked at all.
- **`public/images/weather/*.gif`** are still used by the cross-section marker
  and the forecast, but the show page's own weather symbols are inline SVG now.
- **`stars.css` is still loaded elsewhere**, so do not delete it, even though the
  show page's rating is now 12 lines of CSS using `:has()`.
- **`refs/original/refs/heads/main`** is a `filter-branch` backup from the commit
  message rewrite. Delete with `git update-ref -d refs/original/refs/heads/main`
  once you are happy.
- **`package.json` carries an uncommitted Volta pin** that predates all of this.
- **The stylesheet's size is what the user reacted badly to.** `app.css` is 2355
  lines. The audit found it is not actually bloated: 1222 declarations across
  344 rules, 40% of the line count being braces and blank lines, 11.6KB gzipped.
  The discomfort was real anyway. The label collapse in `md/PLAN.md` is the
  answer, not a rewrite.
