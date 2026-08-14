# Handover — post carousel

> Written 14 August 2026, at the end of the UI session. Read this, then
> `UI_REDO.md` (the design system and why it is the way it is), then `PLAN.md`
> and `DATA.md`. Where they disagree: this file wins for anything about the UI,
> `PLAN.md` wins for everything else. The older `HANDOVER.md` is the terrain
> session and is still correct about the data layer.

**The whole front end was rebuilt this session.** The dark forest palette is
gone, Bootstrap is gone, and the show page is a different page. The data layer
was not touched: 38 tests still pass and no controller, model or service
changed.

---

## Read this first: nothing is committed and nothing is browser-verified

Two things are true at once and both matter.

**The carousel is uncommitted.** `git status`:

```
 M public/stylesheets/app.css      <- the .plate-viewer block
 M views/campgrounds/show.ejs      <- carousel markup, replaces the old mosaic
?? public/javascripts/gallery.js   <- new, 87 lines
 M package.json                    <- Volta pin, predates all of this, not mine
?? .claude/                        <- local settings, should be gitignored
?? public/images/Texturelabs_...   <- unused, see "loose ends"
```

**Nothing in this entire session has been opened in a browser.** There is no
browser driver in this environment. Everything below was verified by rendering
templates in Node, parsing the CSS and JS, and diffing class and token usage.
That catches a lot, and it caught several real bugs, but it cannot tell you
whether the page looks right. **Load every page before trusting any of it:**
home, explore, show, new, edit, login, register. Bootstrap came out from under
all of them.

`origin/main` is 2 commits behind local.

---

## Where the UI stands

The design system is `public/stylesheets/app.css`, 2687 lines, 11.6KB gzipped.
It is the whole site; there is no second stylesheet except `home.css`, which the
standalone home page loads on top of it.

**Two inks on aged paper.** Brown carries the land (terrain, place, facts, all
structure). Purple carries the sky (weather, light, time, season). A third,
`--danger`, appears only on destructive actions. 20 tokens, one name per colour,
all in use. The full palette, the contrast measurements and the reasoning are in
`UI_REDO.md` and are not repeated here.

**Working end to end on the show page:** folio framing with a running head, the
photograph carousel, a two-plate hero, the matched map pair (geographic left,
contour right, both true squares), the cross-section, five terrain measures, the
twelve month season strip encoded as engraved fill patterns, and field notes.

---

## Traps. Read these before touching anything

Every one of these was a real bug this session. Most were silent.

1. **An undefined CSS custom property is not a no-op.** `topoMap.js` set
   `fill: var(--sage-dim)` after that token was deleted. `fill` fell back to its
   *initial* value, which is solid black, and the cross-section filled in
   completely. **Custom properties referenced from JavaScript are invisible to
   every dead-code check.** There are four in `topoMap.js` and they are the
   easiest thing in the codebase to break. Grep `var(--` in
   `public/javascripts/` after any token change.

2. **`mix-blend-mode` blends against the backdrop inside the nearest stacking
   context.** The weather GIFs dissolve their white card into the paper with
   `multiply`. That only works because `.detail-page` paints an opaque
   background. It creates a stacking context, so with no background the icons
   multiply against transparency, which does nothing. **That one declaration is
   load bearing.**

3. **Filters run before blends.** `sepia(1)` maps white to `(1, 1, 0.937)`, not
   white, so the GIF card stayed faintly visible until `brightness` pushed it
   back over the clip point.

4. **Percentages resolve against the padded box.** The cross-section marker is
   positioned with viewBox percentages. Its parent carries padding for the axis
   figures and the caption, so the marker landed 26% too low and read as the pin
   sunk into the hill. It now lives in `.topo-profile__plot`, which is exactly
   the drawing area. **If you add padding to a plot container, check the marker.**

5. **`app.css` sets `img { max-width: 100% }` globally.** Inside a fixed grid
   track that resolves against the track, clamps the width and stretches the
   image. `.wx` opts out with `max-width: none` and guards with
   `object-fit: contain`.

6. **IM Fell English SC ships one weight.** `app.css` is full of
   `font-weight: 600`. `font-synthesis: none` on the body is what stops all of
   it rendering as smeared synthetic bold.

7. **IM Fell SC has old-style figures that sit at x-height**, so its digits read
   a size small beside its own capitals. Every numeral is set in Garamond with
   `lining-nums tabular-nums`. See the Figures section at the bottom of
   `app.css`. Adding a new numeric field means adding it there.

8. **Presentation attributes do not resolve `var()`.** Stroke colours on inline
   SVG have to be set in CSS or as an inline `style`, never as `stroke="..."`.
   Bit us twice, on the home page contours and in `topoMap.js`.

9. **Never animate position with `left`/`top` over the contour SVG.** Carried
   over from the previous session and still true. The hover readout moves by
   `transform` only.

---

## Bootstrap is gone

The site was loading ~240KB of Bootstrap CSS, Bootstrap JS and Popper to use
twelve classes. It was also the only reason for the 16 `!important` declarations
that used to be in `app.css`. There are now zero.

`public/javascripts/ui.js`, 32 lines, does the two things Bootstrap's bundle did:
the mobile nav toggle (bound off `aria-controls`, so the accessible attribute is
the hook) and dismissing a flash message (bound off `data-dismiss`). Both
delegated from the document.

**Those two controls may never have worked before.** The markup carried
Bootstrap 4 attributes while the page loaded Bootstrap 5, which renamed them all
to `data-bs-*`. **Test the mobile menu and the flash dismiss**, they are the
least proven things in the session.

Two things Bootstrap's reboot was quietly providing had to be replaced by hand:
form controls inheriting the page font, and the `.alert` box itself. If
something looks subtly wrong on a form, suspect the reboot before suspecting the
rule you are reading.

`app.js` CSP now allows only jsdelivr (d3) and maptiler.

---

## The carousel

`public/javascripts/gallery.js`, plus the `.plate-viewer` block in `app.css` and
the markup at the top of `show.ejs`. It replaced the old one-large-plus-two
mosaic, which advertised a `+N more` badge for photographs you could not reach.

One plate at a time, ink chevrons, a thumbnail filmstrip, a counter, arrow keys,
and pointer events covering drag and swipe in one path.

- **It does not loop.** The arrows disable at the ends. A folio has a first
  plate and a last one, and a disabled arrow says where you are.
- **It degrades.** The markup is a plain `<ul>`. `gallery.js` adds `is-live`,
  and only then does `.plate-viewer__frame:has(.is-live)` become a clipping
  window. With no JS you get a readable column of every photograph.
- The drag threshold is 40px and was picked blind. Adjust after using it.

---

## Verifying without a browser

There is no browser driver. The technique that worked, and that caught the
`.check-chip` regression and both dangling-class bugs:

1. **Render the templates in Node.** `ejs.render` on `show.ejs` with a mock
   campground, passing `layout: () => {}` as a local. Do it in three shapes:
   everything populated with the owner logged in; nothing populated and logged
   out; a single image with no cached elevation grid. Assert on the output, not
   just that it did not throw.
2. **Diff class usage against class definitions.** Extract `class="..."` from
   every template plus the JS, extract `.selectors` from the stylesheets, and
   `comm` the two lists both ways. One direction finds classes with no styles,
   the other finds rules nothing uses.
3. **Diff `var(--x)` against the `:root` block** across the stylesheets *and the
   JavaScript*. See trap 1.
4. **Count braces.** A mismatched brace silently kills everything after it.

**These lived in a scratchpad and are gone. Worth rebuilding as real files under
`test/`,** the same note the previous handover made about the topo harness, which
also never got done and which the black-fill bug would have caught.

`npm test` is 38 passing and covers `terrainAnalysis` and `seasonality` only.
Nothing client-side is tested.

---

## Non-negotiables

Carried forward, all still true:

1. Elevation is fetched lazily and cached forever. Never on creation, never on a
   list view. 1000 calls/day, 1 req/sec.
2. Sunrise/sunset is never stored.
3. Terrain failures are silent. The page must render without the topo card.
4. Vanilla JS only on the front end. IIFE, no import/export, no bundler, no npm
   packages. d3 from CDN, and load order matters: `d3-array` first.
5. **Never spread a Mongoose subdocument.** Copy fields explicitly.
6. The palette is the 20 tokens in `:root`. No new colours, and no crossing the
   plates: purple never touches a contour, brown never touches the season strip.

---

## Working agreements

- **Commit straight to `main`.** No feature branches, this was asked for
  explicitly.
- **Never commit without being asked.** Approval step by step.
- **No `Co-Authored-By` trailer.** Ever.
- **Commit messages: one line, lowercase, terse, no body.**
- Prose in chat: direct, opinionated, no filler, no em dashes.
- Surgical diffs. Do not improve adjacent code. Clean up only orphans your own
  change created, and say so.

---

## Loose ends

- **`views/error.ejs` has never been styled.** Ten `error-*` classes exist in
  the markup and in no stylesheet. Predates this session.
- **`public/images/Texturelabs_Paper_151M.jpg` is unused.** It was a scanned
  paper background, then the whole texture system was scrapped for a flat
  `#d2bea5`. Delete it or use it.
- **`.claude/` is untracked and not in `.gitignore`.** It should be.
- **`package.json` carries an uncommitted Volta pin** that predates all of this.
- **`show.ejs` has one `<center>` tag** around a forecast icon. `.wx` already
  centres itself with `margin: 0 auto`, so it is redundant and deprecated. Left
  because it was a deliberate hand edit.
- **The cross-section has no label** while every other block on the page does.
  The reader has no way to know what the chart is called. Offered and not taken.
- **Native CSS nesting** would take 10 to 15% off `app.css` with no payload
  change and no markup churn. Offered and not taken. Rejected alternatives:
  Bootstrap utilities (measured, only 27% of declarations are replaceable and
  the payload triples) and merging single-declaration rules (saves ~100 lines,
  costs locality).
- **`html:has(.detail-page) { font-size: 20px }`** is the only page-scoped rule
  left. It is the 1.25x type scale. Explore and the forms were laid out against
  a 16px root and have not been checked at 20px. Widen the selector once they
  have been.
- **`home.css` is still a separate 442-line file** for the standalone home page.
  It is converted and correct, but it is the one place a second stylesheet still
  exists.
