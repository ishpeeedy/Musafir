/**
 * Renders the shared chrome: navbar, footer, and the mark partial.
 *
 * Same pattern as test/renderIndex.test.js, different subject. Worth having as
 * its own file because the navbar is on every page and nothing rendered it
 * before: the hamburger carried stroke="var(--ink)", which a presentation
 * attribute never resolves, so the icon was drawing nothing and no check
 * anywhere would have said so.
 */

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const ejs = require("ejs");

const VIEWS = path.join(__dirname, "..", "views");
/* Comments are stripped before either sweep below. Both of these checks are
   about what ships to the browser, and a rule named in an explanation of why
   it was deleted is not a rule. */
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const stripEjsScriptlets = (s) => s.replace(/<%[\s\S]*?%>/g, "");

const CSS = stripCssComments(
  fs.readFileSync(path.join(__dirname, "..", "public", "stylesheets", "app.css"), "utf8"),
);

const render = (file, locals = {}) => {
  const filename = path.join(VIEWS, file);
  return ejs.render(fs.readFileSync(filename, "utf8"), locals, { filename });
};

test("the navbar, logged out", async (t) => {
  const html = render("partials/navbar.ejs", { currentUser: null });

  await t.test("the mark is inlined, not an <img>", () => {
    // An <img src="x.svg"> is an isolated document and cannot inherit
    // currentColor, which is the entire reason the mark is an SVG.
    assert.ok(html.includes('<svg class="brand-mark'));
    assert.ok(html.includes('fill="currentColor"'));
    assert.ok(!html.includes("<img"));
  });

  await t.test("the wordmark is live text, so renaming is a string edit", () => {
    assert.ok(html.includes("</span>"));
    assert.match(html, /navbar-wordmark">[A-Za-z]+</);
  });

  await t.test("one auth entry point, not two competing ones", () => {
    assert.ok(html.includes("Sign in"));
    assert.ok(!html.includes("Register"), "register belongs on the sign-in page");
  });

  await t.test("browsing is the only thing the chrome offers", () => {
    assert.ok(html.includes('href="/campgrounds"'));
    assert.ok(!html.includes(">Home<"), "the logo already links home");
  });

  await t.test("no mobile menu at all", () => {
    assert.ok(!html.includes("navbar-toggler"));
    assert.ok(!html.includes("navbar-collapse"));
    assert.ok(!html.includes("aria-expanded"));
  });

  await t.test("carries the auto-hide hook", () => {
    assert.ok(html.includes("data-autohide"));
  });
});

test("the navbar, logged in", async (t) => {
  const html = render("partials/navbar.ejs", { currentUser: { username: "anuj" } });

  await t.test("the avatar is the menu trigger", () => {
    assert.ok(html.includes(">A</span>"));
  });

  await t.test("the menu is native <details>, so it needs no script", () => {
    assert.ok(html.includes('<details class="navbar-account"'));
    assert.ok(html.includes("<summary"));
  });

  await t.test("contributor actions live in the account", () => {
    assert.ok(html.includes("@anuj"));
    assert.ok(html.includes('href="/campgrounds/new"'));
    assert.ok(html.includes('action="/logout"'));
  });

  await t.test("and sign in is gone", () => {
    assert.ok(!html.includes("Sign in"));
  });
});

test("the footer carries the same brand", async (t) => {
  const html = render("partials/footer.ejs", {});

  await t.test("mark inlined, wordmark as text", () => {
    assert.ok(html.includes("brand-mark--footer"));
    assert.ok(!html.includes("<img"));
  });
});

test("no inline SVG anywhere sets a colour through a presentation attribute", () => {
  // Trap 8: presentation attributes do not resolve var(). An invalid stroke
  // falls back to its initial value, which is none, so the mark vanishes
  // silently. This is what the hamburger did.
  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );

  const offenders = [];
  for (const file of walk(VIEWS).filter((f) => f.endsWith(".ejs"))) {
    const src = stripEjsScriptlets(fs.readFileSync(file, "utf8"));
    for (const m of src.matchAll(/(stroke|fill)="var\(--[^"]*\)"/g)) {
      offenders.push(`${path.relative(VIEWS, file)}: ${m[0]}`);
    }
  }
  assert.deepStrictEqual(offenders, []);
});

test("no class of ours collides with a Bootstrap utility that paints", () => {
  /* Bootstrap 5.3 loads before app.css on every page except home, which has its
     own <head>. Where Bootstrap sets a property we never declare, it wins, and
     nothing in a CSS token sweep can see it.

     This bit us with `.mark`: Bootstrap styles `mark, .mark` as the
     text-highlight utility, so the logo carried a padded near-white box on
     every page that loads Bootstrap, and looked correct only on home.

     Names below are Bootstrap utilities that set a background, a border or
     padding, and would therefore be visible rather than merely inherited. */
  const BOOTSTRAP_PAINTS = [
    "mark", "badge", "alert", "card", "btn", "close", "toast", "popover",
    "tooltip", "spinner", "progress", "list-group", "page-link", "form-control",
    "form-select", "input-group", "dropdown-menu", "modal", "offcanvas",
  ];

  const walk = (dir) =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );

  const used = new Set();
  for (const file of walk(VIEWS).filter((f) => f.endsWith(".ejs"))) {
    const src = stripEjsScriptlets(fs.readFileSync(file, "utf8"));
    for (const m of src.matchAll(/class="([^"]*)"/g)) {
      for (const cls of m[1].split(/\s+/)) {
        if (cls && !cls.includes("<%")) used.add(cls);
      }
    }
  }

  const collisions = BOOTSTRAP_PAINTS.filter((b) => used.has(b));
  // .alert, .card, .btn and .form-control are pre-existing and known; this
  // guards against adding new ones without deciding to.
  const known = ["alert", "form-control"];
  assert.deepStrictEqual(
    collisions.filter((c) => !known.includes(c)),
    [],
    "a class name collides bare with a Bootstrap utility that paints",
  );
});

test("rules for the deleted navbar elements are gone with them", () => {
  const orphans = [
    "navbar-toggler",
    "navbar-collapse",
    "nav-link--register",
    "nav-link--logout",
    "navbar-nav--left",
    "navbar-nav--right",
    "navbar-user__name",
    "navbar-logo",
    "navbar-icon",
    "footer-logo",
    "footer-icon",
  ].filter((c) => new RegExp("\\." + c + "\\b").test(CSS));

  assert.deepStrictEqual(orphans, [], "dead rules left behind");
});
