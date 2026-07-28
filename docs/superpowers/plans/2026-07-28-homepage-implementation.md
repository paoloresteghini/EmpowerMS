# Empower Mississippi Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Empower Mississippi homepage as static HTML + CSS, rendering in both a grayscale wireframe skin and a branded skin from one set of markup, structured for hand-off to WordPress + Elementor.

**Architecture:** Eight self-contained HTML section partials assembled into `dist/index.html` by a zero-dependency Node script. Styling comes from the Claude Design project's own token and component CSS, copied down verbatim, plus two local stylesheets: `homepage.css` (layout wrappers the design system doesn't ship) and `wireframe.css` (the wire skin). Skin and layout variants are driven by `data-*` attributes on `<html>`.

**Tech Stack:** HTML5, CSS custom properties, vanilla ES modules. Node ≥18 for the build script and `node:test` for the test suite. No runtime dependencies, no package manager, no framework.

**Spec:** `docs/superpowers/specs/2026-07-28-homepage-wireframe-design.md`

**Source of truth for assets:** Claude Design project `90d5c4ff-6ad8-4c31-bede-e44a6a862e96` ("Empower Mississippi Design System"), read via the `DesignSync` MCP tool (`method: "get_file"`).

## Global Constraints

- **Zero runtime dependencies.** No `package.json`, no `npm install`. Node standard library only.
- **Directory layout mirrors the design system root.** `tokens/`, `components/`, and `assets/` sit at repo root — NOT nested under `css/`. This is mandatory: `tokens/fonts.css` and `tokens/base.css` contain `url('../assets/...')` references that only resolve from a sibling `tokens/` directory. Do not "tidy" this.
- **`tokens/*.css` and `components/components.css` are upstream files — copy verbatim, never edit.** All local CSS goes in `homepage.css` and `wireframe.css`.
- **Exactly one `em-btn--primary` on the page.** Brand rule: one orange filled action per view. It belongs to the hero's "Explore Our Work". Enforced by test.
- **Skins differ in colour, imagery and ornament only — never in layout geometry.** Anything that moves a box belongs in `homepage.css`, not `wireframe.css`.
- **Section partials contain no `<html>`, `<head>`, `<body>`, or wrapper chrome** — each is a fragment pasteable into an Elementor HTML widget.
- **The control bar lives only in `src/index.html`**, never in a section partial.
- **Copy is verbatim from the wireframe.** Do not rewrite, shorten, or "improve" it. Strings containing "auto-populated" stay as-is; they are CMS slots.
- **Semantic HTML:** landmark elements, one `h1`, ordered headings, `<a>` for navigation and `<button>` for actions, `alt` on every content image.
- Use curly apostrophes (`’`) in copy, matching the source.

## File Structure

```
EmpowerMS/
├── tokens/                     ← copied verbatim from design project
│   ├── fonts.css  colors.css  typography.css  spacing.css
│   └── radius.css  elevation.css  motion.css  base.css
├── components/
│   └── components.css          ← copied verbatim
├── assets/                     ← copied verbatim (fonts, logos, photography, patterns, illos)
├── css/
│   ├── homepage.css            NEW — layout wrappers only
│   └── wireframe.css           NEW — wire skin only
├── src/
│   ├── index.html              shell + control bar + include markers
│   └── sections/
│       ├── 00-header.html  01-hero.html  02-solutions.html  03-foundations.html
│       └── 04-stories.html  05-insights.html  06-joinus.html  07-footer.html
├── js/controls.js              toggle wiring
├── build.mjs                   include resolver
├── test.mjs                    node:test suite
└── dist/index.html             generated, gitignored
```

Responsibilities:
- `build.mjs` — resolve `<!--@include -->` markers. Nothing else.
- `test.mjs` — assert structural invariants on built output.
- `css/homepage.css` — the seven layout wrappers the design system lacks, plus responsive rules.
- `css/wireframe.css` — token overrides and wire-only ornament. Never geometry.
- `js/controls.js` — read/write `data-*` on `<html>`, persist to `localStorage`.

---

### Task 1: Build script and test harness

**Files:**
- Create: `build.mjs`
- Create: `test.mjs`
- Create: `.gitignore` (already exists — verify `dist/` is listed)
- Create: `src/index.html` (minimal placeholder shell for this task)
- Create: `src/sections/00-header.html` (single-line stub for this task)

**Interfaces:**
- Consumes: nothing.
- Produces: `build.mjs` exports nothing; run as `node build.mjs`. Writes `dist/index.html`. `test.mjs` runs as `node --test test.mjs` and imports nothing from `build.mjs` — it shells out to the build first.
- Include marker syntax, relied on by every later task: `<!--@include sections/NN-name.html-->` — no spaces inside the parens of the comment, path relative to `src/`.

- [ ] **Step 1: Write the failing test**

Create `test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

execFileSync('node', ['build.mjs'], { stdio: 'inherit' });
const html = readFileSync('dist/index.html', 'utf8');

test('build resolves every include marker', () => {
  assert.ok(!html.includes('@include'), 'unresolved @include marker in output');
});

test('build inlines section content', () => {
  assert.match(html, /data-section="header"/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — `build.mjs` does not exist, `execFileSync` throws ENOENT.

- [ ] **Step 3: Write the minimal build script**

Create `build.mjs`:

```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'src';
const OUT = 'dist/index.html';
const MARKER = /<!--@include\s+([^\s>]+?)\s*-->/g;

function resolve(html, depth = 0) {
  if (depth > 5) throw new Error('include nesting too deep — cycle?');
  return html.replace(MARKER, (_, path) => {
    const file = join(SRC, path);
    let part;
    try {
      part = readFileSync(file, 'utf8');
    } catch {
      throw new Error(`include not found: ${file}`);
    }
    return resolve(part.trimEnd(), depth + 1);
  });
}

const out = resolve(readFileSync(join(SRC, 'index.html'), 'utf8'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log(`built ${OUT} (${out.length} bytes)`);
```

Create `src/sections/00-header.html`:

```html
<div data-section="header">placeholder</div>
```

Create `src/index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-skin="brand">
<head>
<meta charset="utf-8">
<title>Empower Mississippi</title>
</head>
<body>
<!--@include sections/00-header.html-->
</body>
</html>
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS, 2/2. Console shows `built dist/index.html (N bytes)`.

- [ ] **Step 5: Verify the failure path**

Temporarily change the marker in `src/index.html` to `sections/99-nope.html`, run `node build.mjs`, confirm it exits non-zero with `include not found: src/sections/99-nope.html`. Revert the change.

- [ ] **Step 6: Commit**

```bash
git add build.mjs test.mjs src/ .gitignore
git commit -m "feat: add include-resolving build script and test harness"
```

---

### Task 2: Import design system files verbatim

**Files:**
- Create: `tokens/fonts.css`, `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`, `tokens/radius.css`, `tokens/elevation.css`, `tokens/motion.css`, `tokens/base.css`
- Create: `components/components.css`
- Create: `assets/**` (fonts, logos, patterns, illustrations, photography)
- Modify: `test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the full `em-*` class vocabulary and token custom properties used by every later task. Key tokens later tasks reference by name: `--em-blue` `#003C50`, `--em-orange` `#E65A28`, `--surface-navy`, `--surface-tint`, `--text-strong`, `--text-body`, `--text-muted`, `--text-inverse-muted`, `--border-subtle`, `--border-inverse`, `--radius-card` 20px, `--radius-media` 16px, `--radius-panel` 28px, `--radius-pill`, `--space-1`…`--space-15`, `--section-y` 80px, `--section-y-lg` 120px, `--container-max` 1200px, `--gutter` 24px, `--fs-h1`…`--fs-h5`, `--fs-lead`, `--fs-body`, `--fs-small`, `--fs-caption`, `--fs-eyebrow`, `--fw-medium/semibold/bold/black`, `--ls-hero` `-.03em`, `--ls-heading` `-.02em`, `--ls-eyebrow` `.14em`, `--ls-caps` `.06em`, `--dur` 200ms, `--dur-slow` 400ms, `--ease-out` `cubic-bezier(.2,.7,.3,1)`, `--lift-hover` `-2px`, `--shadow-sm/md/lg`, `--shadow-focus`, `--overlay-protect`, `--overlay-protect-left`.
- Utility classes from `base.css` later tasks use: `.em-container`, `.em-container-narrow`, `.em-section`, `.em-rule`, `.em-eyebrow`, `.em-lead`, `.em-pattern-blue`.

- [ ] **Step 1: Pull the CSS files**

Use the `DesignSync` tool, `method: "get_file"`, `projectId: "90d5c4ff-6ad8-4c31-bede-e44a6a862e96"`, once per path, and write each result's `content` field to the matching local path **byte-for-byte unmodified**:

| Remote path | Local path |
| --- | --- |
| `tokens/fonts.css` | `tokens/fonts.css` |
| `tokens/colors.css` | `tokens/colors.css` |
| `tokens/typography.css` | `tokens/typography.css` |
| `tokens/spacing.css` | `tokens/spacing.css` |
| `tokens/radius.css` | `tokens/radius.css` |
| `tokens/elevation.css` | `tokens/elevation.css` |
| `tokens/motion.css` | `tokens/motion.css` |
| `tokens/base.css` | `tokens/base.css` |
| `components/components.css` | `components/components.css` |

Do not reformat, minify, or reorder. These are upstream files.

- [ ] **Step 2: Pull the binary assets**

`get_file` returns binary files with `isBase64: true`. Decode and write each to the matching local path. Required files:

Fonts (`assets/fonts/`): `figtree-500.woff2`, `figtree-600.woff2`, `figtree-700.woff2`, `figtree-800.woff2`, `source-sans-3-400.woff2`, `source-sans-3-400-italic.woff2`, `source-sans-3-600.woff2`, `source-sans-3-700.woff2`

Logos (`assets/`): `logo-primary.png`, `logo-primary-reversed.png`

Patterns (`assets/`): `pattern-blue.png`

Illustrations (`assets/`): `illo-star.png`, `illo-work-briefcase.png`, `illo-check.png`, `illo-quote-open.png`

Photography (`assets/photography/`): `family-outdoors-park.jpg`, `children-running-parent.jpg`, `student-library.jpg`, `worker-workshop-bw.jpg`, `video-still-man-outdoors.jpg`, `classroom-students.jpg`, `grandparents-grandchild.jpg`, `girl-writing-bw.jpg`, `young-man-portrait-bw.jpg`, `father-children-field.jpg`, `child-classroom-tablet.jpg`, `esa-email-mockup.jpg`

- [ ] **Step 3: Write the failing test**

Append to `test.mjs`:

```js
import { existsSync, statSync } from 'node:fs';

test('design system files imported at root level', () => {
  for (const f of [
    'tokens/base.css', 'tokens/colors.css', 'tokens/fonts.css',
    'components/components.css',
  ]) assert.ok(existsSync(f), `missing ${f}`);
});

test('asset paths referenced by tokens actually resolve', () => {
  // tokens/*.css use url('../assets/...') — only correct if tokens/ is a
  // sibling of assets/. Guard the layout constraint.
  for (const f of [
    'assets/fonts/figtree-700.woff2',
    'assets/pattern-blue.png',
    'assets/logo-primary.png',
    'assets/logo-primary-reversed.png',
  ]) assert.ok(existsSync(f), `missing ${f}`);
});

test('imported binaries are not empty or HTML error pages', () => {
  for (const f of ['assets/fonts/figtree-700.woff2', 'assets/logo-primary.png']) {
    assert.ok(statSync(f).size > 1000, `${f} looks truncated`);
  }
});
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS. If the binary size assertion fails, the base64 decode step was skipped or wrote the JSON envelope instead of the decoded bytes.

- [ ] **Step 5: Commit**

```bash
git add tokens/ components/ assets/ test.mjs
git commit -m "feat: import design system tokens, component CSS and assets"
```

---

### Task 3: Page shell, control bar and skin wiring

**Files:**
- Modify: `src/index.html`
- Create: `js/controls.js`
- Create: `css/homepage.css`
- Create: `css/wireframe.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: token custom properties and `.em-container` from Task 2.
- Produces: the `data-*` contract every later section relies on. Attributes live on `<html>`:
  - `data-skin` — `"brand"` (default) | `"wire"`
  - `data-annotations` — `"on"` | `"off"` (default)
  - `data-foundations` — `"bento"` (default) | `"equal"`
  - `data-stories` — `"feature"` (default) | `"carousel"`
  - Variant markup is hidden with `[data-foundations="equal"] .em-bento { display: none }` style rules — see Task 7 and Task 8.
  - Annotation pills use class `em-annotate` and are hidden unless `data-annotations="on"`.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('shell declares default skin and variant state', () => {
  assert.match(html, /<html lang="en"[^>]*data-skin="brand"/);
  assert.match(html, /data-annotations="off"/);
  assert.match(html, /data-foundations="bento"/);
  assert.match(html, /data-stories="feature"/);
});

test('shell links stylesheets in cascade order', () => {
  const order = ['tokens/fonts.css', 'tokens/colors.css', 'tokens/base.css',
                 'components/components.css', 'css/homepage.css', 'css/wireframe.css'];
  let cursor = -1;
  for (const href of order) {
    const at = html.indexOf(href);
    assert.ok(at > cursor, `${href} out of cascade order`);
    cursor = at;
  }
});

test('control bar exists in the shell only', () => {
  assert.match(html, /id="controls"/);
  const partial = readFileSync('src/sections/00-header.html', 'utf8');
  assert.ok(!partial.includes('id="controls"'), 'control bar leaked into a partial');
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — shell has no `data-annotations`, no stylesheet links, no control bar.

- [ ] **Step 3: Write the shell**

Replace `src/index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-skin="brand" data-annotations="off" data-foundations="bento" data-stories="feature">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Empower Mississippi — Your American Dream starts here.</title>
<meta name="description" content="We work to expand opportunity so every Mississippian has the chance to achieve the American Dream right here at home.">
<link rel="stylesheet" href="../tokens/fonts.css">
<link rel="stylesheet" href="../tokens/colors.css">
<link rel="stylesheet" href="../tokens/typography.css">
<link rel="stylesheet" href="../tokens/spacing.css">
<link rel="stylesheet" href="../tokens/radius.css">
<link rel="stylesheet" href="../tokens/elevation.css">
<link rel="stylesheet" href="../tokens/motion.css">
<link rel="stylesheet" href="../tokens/base.css">
<link rel="stylesheet" href="../components/components.css">
<link rel="stylesheet" href="../css/homepage.css">
<link rel="stylesheet" href="../css/wireframe.css">
</head>
<body>

<div id="controls" class="ctl">
  <span class="ctl__brand">Homepage</span>
  <label class="ctl__f">Skin
    <select data-ctl="skin"><option value="brand">Branded</option><option value="wire">Wireframe</option></select>
  </label>
  <label class="ctl__f">Foundations
    <select data-ctl="foundations"><option value="bento">Bento</option><option value="equal">Three equal</option></select>
  </label>
  <label class="ctl__f">Stories
    <select data-ctl="stories"><option value="feature">Feature + stacked</option><option value="carousel">Carousel</option></select>
  </label>
  <label class="ctl__f ctl__f--check">
    <input type="checkbox" data-ctl="annotations"> Funnel notes
  </label>
</div>

<!--@include sections/00-header.html-->
<main>
<!--@include sections/01-hero.html-->
<!--@include sections/02-solutions.html-->
<!--@include sections/03-foundations.html-->
<!--@include sections/04-stories.html-->
<!--@include sections/05-insights.html-->
<!--@include sections/06-joinus.html-->
</main>
<!--@include sections/07-footer.html-->

<script type="module" src="../js/controls.js"></script>
</body>
</html>
```

Create stub partials so the build resolves — each a single comment line, replaced in later tasks:

`src/sections/01-hero.html` … `src/sections/07-footer.html`, each containing:

```html
<!-- placeholder -->
```

Replace `src/sections/00-header.html` with `<div data-section="header"></div>` for now (Task 4 fills it).

- [ ] **Step 4: Write the control bar styles**

Create `css/homepage.css`:

```css
/* Empower Mississippi homepage — layout wrappers.
   Upstream tokens/ and components/ are never edited; local layout lives here. */

/* ---------- Preview control bar (never ships to WordPress) ---------- */
.ctl{position:sticky;top:0;z-index:100;display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-5);
  padding:10px var(--space-6);background:var(--blue-900);color:var(--white);
  font-family:var(--font-display);font-size:var(--fs-caption);font-weight:var(--fw-semibold)}
.ctl__brand{letter-spacing:var(--ls-eyebrow);text-transform:uppercase;color:var(--orange-300);margin-right:auto}
.ctl__f{display:flex;align-items:center;gap:var(--space-2);text-transform:uppercase;letter-spacing:var(--ls-caps)}
.ctl__f select{font:inherit;padding:5px 9px;border-radius:var(--radius-sm);
  border:1px solid var(--border-inverse);background:var(--blue-800);color:var(--white)}
.ctl__f--check{gap:var(--space-2)}

/* ---------- Funnel annotations ---------- */
.em-annotate{display:none}
[data-annotations="on"] .em-annotate{display:inline-block;margin:0 0 var(--space-5);
  padding:5px 13px;border:1px solid var(--border-default);border-radius:var(--radius-pill);
  font-family:var(--font-display);font-weight:var(--fw-semibold);font-size:11px;
  letter-spacing:var(--ls-eyebrow);text-transform:uppercase;color:var(--text-muted)}
[data-annotations="on"] .em-annotate--light{border-color:var(--border-inverse);color:var(--text-inverse-muted)}
[data-annotations="on"] .em-annotate--note{display:block;margin:var(--space-5) 0 0;border:0;padding:0;
  text-transform:none;letter-spacing:0;font-size:var(--fs-small);font-weight:var(--fw-regular)}
```

Create `css/wireframe.css` with only the header comment for now:

```css
/* Wireframe skin. Colour, imagery and ornament ONLY — never layout geometry.
   Anything that moves a box belongs in homepage.css. */
```

- [ ] **Step 5: Write the controls script**

Create `js/controls.js`:

```js
const KEYS = ['skin', 'foundations', 'stories', 'annotations'];
const root = document.documentElement;

function attr(key) {
  return 'data-' + key;
}

function read(key) {
  return localStorage.getItem('em:' + key);
}

for (const key of KEYS) {
  const saved = read(key);
  if (saved !== null) root.setAttribute(attr(key), saved);
}

for (const el of document.querySelectorAll('[data-ctl]')) {
  const key = el.dataset.ctl;
  const isCheck = el.type === 'checkbox';
  const current = root.getAttribute(attr(key));

  if (isCheck) el.checked = current === 'on';
  else el.value = current;

  el.addEventListener('change', () => {
    const value = isCheck ? (el.checked ? 'on' : 'off') : el.value;
    root.setAttribute(attr(key), value);
    localStorage.setItem('em:' + key, value);
  });
}
```

- [ ] **Step 6: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS, all tests.

- [ ] **Step 7: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: control bar renders as a dark sticky strip. Changing each dropdown updates the corresponding `data-*` attribute on `<html>` (check in devtools) and survives a reload.

- [ ] **Step 8: Commit**

```bash
git add src/ js/ css/ test.mjs
git commit -m "feat: add page shell, control bar and skin state wiring"
```

---

### Task 4: Site header

**Files:**
- Modify: `src/sections/00-header.html`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `em-header`, `em-header__bar`, `__logo`, `__nav`, `__item`, `__link`, `__caret`, `__actions` from `components/components.css`; `.em-container` from `tokens/base.css`; `em-btn--secondary`, `em-btn--sm`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('header is a landmark with a nav and six links', () => {
  assert.match(html, /<header class="em-header">/);
  assert.match(html, /<nav class="em-header__nav" aria-label="Primary">/);
  for (const label of ['Home', 'About', 'Solutions', 'All Content', 'Podcast', 'Join Us']) {
    assert.ok(html.includes(`>${label}<`) || html.includes(`>${label} `), `nav missing ${label}`);
  }
});

test('header Donate is navy, not the orange primary', () => {
  assert.match(html, /class="em-btn em-btn--secondary em-btn--sm"[^>]*>[\s\S]{0,40}Donate/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — `00-header.html` is an empty div.

- [ ] **Step 3: Write the header partial**

Replace `src/sections/00-header.html`:

```html
<header class="em-header">
  <div class="em-container">
    <div class="em-header__bar">
      <a class="em-header__logo" href="/" aria-label="Empower Mississippi home">
        <img src="../assets/logo-primary.png" alt="Empower Mississippi">
      </a>
      <nav class="em-header__nav" aria-label="Primary">
        <div class="em-header__item"><a class="em-header__link" href="/" aria-current="page">Home</a></div>
        <div class="em-header__item"><button class="em-header__link" type="button" aria-expanded="false">About <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" aria-expanded="false">Solutions <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" aria-expanded="false">All Content <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" aria-expanded="false">Podcast <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" aria-expanded="false">Join Us <span class="em-header__caret" aria-hidden="true"></span></button></div>
      </nav>
      <div class="em-header__actions">
        <button class="em-header__search" type="button" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
        <a class="em-btn em-btn--secondary em-btn--sm" href="/donate">Donate</a>
      </div>
    </div>
  </div>
</header>
```

- [ ] **Step 4: Add the search button style**

Append to `css/homepage.css`:

```css
/* ---------- Header search ---------- */
.em-header__search{width:38px;height:38px;flex:0 0 auto;display:grid;place-items:center;
  padding:0;border:1px solid var(--border-default);border-radius:var(--radius-pill);
  background:none;color:var(--em-blue);cursor:pointer;
  transition:background var(--dur) var(--ease-out),border-color var(--dur) var(--ease-out)}
.em-header__search:hover{background:var(--blue-100);border-color:var(--blue-400)}
.em-header__search svg{width:17px;height:17px}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: logo renders (confirms the `../assets/` path from `dist/` resolves), six nav items, search circle, navy Donate pill. Fonts render as Figtree — if they fall back to Helvetica, `tokens/fonts.css` or `assets/fonts/` is wrong.

- [ ] **Step 7: Commit**

```bash
git add src/sections/00-header.html css/homepage.css test.mjs
git commit -m "feat: add site header section"
```

---

### Task 5: Hero section

**Files:**
- Modify: `src/sections/01-hero.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `.em-container`, `em-btn--primary`, `em-annotate` (Task 3).
- Produces: `.em-hero`, `.em-hero__copy`, `.em-hero__media`, `.em-hero__northstar` — referenced by Task 12 (wireframe skin) and Task 13 (responsive).

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('hero holds the single h1', () => {
  const h1s = html.match(/<h1[\s>]/g) || [];
  assert.equal(h1s.length, 1, `expected exactly one h1, found ${h1s.length}`);
  assert.match(html, /Your American Dream starts here\./);
});

test('exactly one orange primary button on the page', () => {
  const primaries = html.match(/em-btn--primary/g) || [];
  assert.equal(primaries.length, 1, `brand rule: one orange action per view, found ${primaries.length}`);
  const at = html.indexOf('em-btn--primary');
  assert.match(html.slice(at, at + 200), /Explore Our Work/);
});

test('hero image has alt text', () => {
  assert.match(html, /class="em-hero__media"[\s\S]{0,300}?alt="[^"]+"/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — no `h1`, no `em-btn--primary`.

- [ ] **Step 3: Write the hero partial**

Replace `src/sections/01-hero.html`:

```html
<section class="em-hero" aria-labelledby="hero-title">
  <div class="em-hero__copy">
    <p class="em-annotate">1 · Awareness</p>
    <p class="em-eyebrow">Real people. Real problems. Real solutions.</p>
    <h1 id="hero-title">Your American Dream starts here.</h1>
    <p class="em-hero__lede">You want to build a great life. Raise a family. Find meaningful work. Put down roots in a strong community. We work to expand opportunity so every Mississippian has the chance to achieve the American Dream right here at home.</p>
    <div class="em-hero__actions">
      <a class="em-btn em-btn--primary em-btn--lg" href="/what-we-do">Explore Our Work</a>
      <a class="em-hero__link" href="/join-us">Sign up →</a>
    </div>
  </div>
  <div class="em-hero__media">
    <img src="../assets/photography/family-outdoors-park.jpg" alt="A family walking together outdoors in a Mississippi park">
    <figure class="em-hero__northstar">
      <figcaption class="em-hero__northstar-label">Our north star</figcaption>
      <p>We want every Mississippian to have the opportunity to achieve the American Dream right here at home.</p>
    </figure>
  </div>
</section>
```

- [ ] **Step 4: Write the hero styles**

Append to `css/homepage.css`:

```css
/* ---------- Hero ---------- */
.em-hero{display:grid;grid-template-columns:minmax(0,680px) 1fr;align-items:stretch;
  background:var(--surface-page)}
.em-hero__copy{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;
  padding:var(--section-y-lg) var(--space-11) var(--section-y-lg) max(var(--gutter),calc((100vw - var(--container-max)) / 2 + var(--gutter)))}
.em-hero__copy .em-annotate{align-self:flex-start}
.em-hero__lede{font-size:var(--fs-lead);line-height:1.5;color:var(--text-body);max-width:46ch;
  margin:0 0 var(--space-9)}
.em-hero h1{margin:0 0 var(--space-6);font-size:var(--fs-hero)}
.em-hero__actions{display:flex;align-items:center;gap:var(--space-7);flex-wrap:wrap}
.em-hero__link{font-family:var(--font-display);font-weight:var(--fw-semibold);font-size:var(--fs-small);
  text-decoration:none;color:var(--em-blue)}
.em-hero__link:hover{color:var(--em-orange)}

.em-hero__media{position:relative;min-height:640px}
.em-hero__media>img{width:100%;height:100%;object-fit:cover}
.em-hero__northstar{position:absolute;left:-96px;bottom:76px;width:320px;margin:0;
  background:var(--surface-card);border-radius:var(--radius-card);padding:var(--space-6) var(--space-7);
  box-shadow:var(--shadow-lg)}
.em-hero__northstar-label{font-family:var(--font-display);font-weight:var(--fw-bold);
  font-size:var(--fs-eyebrow);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;
  color:var(--em-orange);margin:0 0 var(--space-3)}
.em-hero__northstar p{margin:0;font-family:var(--font-display);font-weight:var(--fw-semibold);
  font-size:var(--fs-h5);line-height:1.4;letter-spacing:var(--ls-heading);color:var(--text-strong)}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: copy left with the hero photograph bleeding to the right edge, the north-star card overlapping the seam, orange Explore Our Work pill. Copy column's left edge aligns with the header logo.

- [ ] **Step 7: Commit**

```bash
git add src/sections/01-hero.html css/homepage.css test.mjs
git commit -m "feat: add hero section"
```

---

### Task 6: Solutions model — five-step chevron

**Files:**
- Modify: `src/sections/02-solutions.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `.em-container`, `.em-section`, `.em-eyebrow`, `.em-rule`, `em-annotate`.
- Produces: `.em-process`, `.em-process__step`, `__scrim`, `__mark`, `__num`, `__detail` — referenced by Task 12 and Task 13.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('process has five steps in order', () => {
  const steps = ['Define the problem', 'Conduct research', 'Craft policy solution',
                 'Advocate for change', 'Policy implementation'];
  let cursor = -1;
  for (const s of steps) {
    const at = html.indexOf(s);
    assert.ok(at > cursor, `step out of order or missing: ${s}`);
    cursor = at;
  }
});

test('process detail is in the DOM, not hover-only content', () => {
  assert.match(html, /class="em-process__detail"[\s\S]{0,400}?Learn more/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — placeholder partial.

- [ ] **Step 3: Write the solutions partial**

Replace `src/sections/02-solutions.html`:

```html
<section class="em-section em-solutions" aria-labelledby="solutions-title">
  <div class="em-container">
    <div class="em-solutions__head">
      <div>
        <p class="em-annotate">2 · Interest</p>
        <p class="em-eyebrow">How change happens</p>
        <h2 id="solutions-title">The future you want starts with opportunity.</h2>
        <span class="em-rule" aria-hidden="true"></span>
      </div>
      <p class="em-lead">Every family, worker, and community faces unique challenges, but lasting progress begins with practical solutions. We listen to the people affected, research what works, and partner with communities and leaders to create more opportunity across Mississippi.</p>
    </div>

    <p class="em-solutions__label">Empower solutions model</p>

    <ol class="em-process">
      <li class="em-process__step">
        <img class="em-process__bg" src="../assets/photography/children-running-parent.jpg" alt="">
        <span class="em-process__scrim" aria-hidden="true"></span>
        <div class="em-process__inner">
          <img class="em-process__mark" src="../assets/illo-quote-open.png" alt="">
          <p class="em-process__num">01</p>
          <h3 class="em-process__title">Define the problem</h3>
          <div class="em-process__detail">
            <p>We start with the people affected, so the problem we set out to solve is the one Mississippians actually face.</p>
            <a href="/what-we-do">Learn more →</a>
          </div>
        </div>
      </li>
      <li class="em-process__step">
        <img class="em-process__bg" src="../assets/photography/student-library.jpg" alt="">
        <span class="em-process__scrim" aria-hidden="true"></span>
        <div class="em-process__inner">
          <img class="em-process__mark" src="../assets/illo-check.png" alt="">
          <p class="em-process__num">02</p>
          <h3 class="em-process__title">Conduct research</h3>
          <div class="em-process__detail">
            <p>We research what works — here in Mississippi and in states that have already moved.</p>
            <a href="/research">Learn more →</a>
          </div>
        </div>
      </li>
      <li class="em-process__step">
        <img class="em-process__bg" src="../assets/photography/worker-workshop-bw.jpg" alt="">
        <span class="em-process__scrim" aria-hidden="true"></span>
        <div class="em-process__inner">
          <img class="em-process__mark" src="../assets/illo-star.png" alt="">
          <p class="em-process__num">03</p>
          <h3 class="em-process__title">Craft policy solution</h3>
          <div class="em-process__detail">
            <p>We turn that research into a practical solution that can pass and can work.</p>
            <a href="/solutions">Learn more →</a>
          </div>
        </div>
      </li>
      <li class="em-process__step">
        <img class="em-process__bg" src="../assets/photography/video-still-man-outdoors.jpg" alt="">
        <span class="em-process__scrim" aria-hidden="true"></span>
        <div class="em-process__inner">
          <img class="em-process__mark" src="../assets/illo-work-briefcase.png" alt="">
          <p class="em-process__num">04</p>
          <h3 class="em-process__title">Advocate for change</h3>
          <div class="em-process__detail">
            <p>We partner with communities and leaders to build support and move the idea forward.</p>
            <a href="/join-us">Learn more →</a>
          </div>
        </div>
      </li>
      <li class="em-process__step">
        <img class="em-process__bg" src="../assets/photography/classroom-students.jpg" alt="">
        <span class="em-process__scrim" aria-hidden="true"></span>
        <div class="em-process__inner">
          <img class="em-process__mark" src="../assets/illo-check.png" alt="">
          <p class="em-process__num">05</p>
          <h3 class="em-process__title">Policy implementation</h3>
          <div class="em-process__detail">
            <p>We stay with it through implementation, then measure what changed for families.</p>
            <a href="/what-we-do">Learn more →</a>
          </div>
        </div>
      </li>
    </ol>

    <p class="em-annotate em-annotate--note">Five-step chevron from the roadmap. Each panel is a background image with a scrim; on hover it expands, the scrim lightens and the description + link fade in.</p>
  </div>
</section>
```

- [ ] **Step 4: Write the process styles**

Append to `css/homepage.css`:

```css
/* ---------- Solutions model ---------- */
.em-solutions{background:var(--surface-tint)}
.em-solutions__head{display:grid;grid-template-columns:1fr minmax(0,400px);gap:var(--space-11);
  align-items:end;margin-bottom:var(--space-9)}
.em-solutions__head h2{margin:0}
.em-solutions__head .em-rule{margin:var(--space-5) 0 0}
.em-solutions__label{font-family:var(--font-display);font-weight:var(--fw-semibold);
  font-size:var(--fs-eyebrow);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;
  color:var(--text-muted);margin:0 0 var(--space-5)}

.em-process{display:flex;align-items:stretch;height:440px;margin:0;padding:0;list-style:none}
.em-process__step{position:relative;flex:1 1 0;min-width:238px;overflow:hidden;
  clip-path:polygon(0 0,calc(100% - 34px) 0,100% 50%,calc(100% - 34px) 100%,0 100%,34px 50%);
  transition:flex var(--dur-slow) var(--ease-out)}
.em-process__step:first-child{clip-path:polygon(0 0,calc(100% - 34px) 0,100% 50%,calc(100% - 34px) 100%,0 100%,0 100%)}
.em-process__step + .em-process__step{margin-left:-34px}
.em-process__step:hover,.em-process__step:focus-within{flex:2.7 1 0}

.em-process__bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.em-process__scrim{position:absolute;inset:0;background:rgba(0,41,53,.74);
  transition:background var(--dur-slow) var(--ease-out)}
.em-process__step:hover .em-process__scrim,
.em-process__step:focus-within .em-process__scrim{background:rgba(0,41,53,.5)}

.em-process__inner{position:relative;height:100%;display:flex;flex-direction:column;
  justify-content:flex-end;padding:var(--space-7) var(--space-8) 152px}
.em-process__mark{width:46px;height:46px;object-fit:contain;margin-bottom:auto}
.em-process__num{margin:0 0 var(--space-3);font-family:var(--font-display);font-weight:var(--fw-semibold);
  font-size:var(--fs-caption);letter-spacing:var(--ls-eyebrow);color:var(--white);opacity:.55;
  transition:opacity var(--dur-slow) var(--ease-out)}
.em-process__step:hover .em-process__num,
.em-process__step:focus-within .em-process__num{opacity:1}
.em-process__title{margin:0;font-family:var(--font-display);font-weight:var(--fw-bold);
  font-size:var(--fs-h5);line-height:1.22;letter-spacing:var(--ls-caps);text-transform:uppercase;
  color:var(--white);overflow-wrap:break-word}
.em-process__detail{position:absolute;left:var(--space-8);right:var(--space-8);bottom:var(--space-7);
  width:290px;opacity:0;transform:translateY(10px);pointer-events:none;
  transition:opacity var(--dur-slow) var(--ease-out) 80ms,transform var(--dur-slow) var(--ease-out) 80ms}
.em-process__step:hover .em-process__detail,
.em-process__step:focus-within .em-process__detail{opacity:1;transform:none;pointer-events:auto}
.em-process__detail p{margin:0 0 var(--space-4);font-size:var(--fs-small);line-height:1.55;
  color:var(--text-inverse-muted)}
.em-process__detail a{font-family:var(--font-display);font-weight:var(--fw-bold);
  font-size:var(--fs-caption);letter-spacing:var(--ls-caps);text-transform:uppercase;
  color:var(--white);text-decoration:none}
.em-process__detail a:hover{color:var(--orange-300)}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: five overlapping chevrons over navy-scrimmed photographs. Hovering one expands it, lightens the scrim, fades in the description. **Tab through the "Learn more" links** — `:focus-within` must expand the focused step, so keyboard users reach the same content.

- [ ] **Step 7: Commit**

```bash
git add src/sections/02-solutions.html css/homepage.css test.mjs
git commit -m "feat: add solutions model chevron section"
```

---

### Task 7: Foundations — bento and three-equal variants

**Files:**
- Modify: `src/sections/03-foundations.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `em-solution`, `em-solution__icon/__title/__promise/__body/__more`, `em-btn--outline`, `.em-container`, `.em-section`.
- Produces: `.em-bento`, `.em-bento__col`, `.em-bento__tall`, `.em-bento__media`, `.em-equal` — referenced by Tasks 12 and 13.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('both foundations layouts ship in the markup', () => {
  assert.match(html, /class="em-bento"/);
  assert.match(html, /class="em-equal"/);
});

test('foundations names all three pillars in both layouts', () => {
  for (const pillar of ['Quality Education', 'Meaningful Work', 'Public Safety']) {
    const hits = html.split(pillar).length - 1;
    assert.ok(hits >= 2, `${pillar} should appear in both layouts, found ${hits}`);
  }
});

test('foundations uses the house Real solution: label', () => {
  assert.match(html, /<strong>Real solution:<\/strong>/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — placeholder partial.

- [ ] **Step 3: Write the foundations partial**

Replace `src/sections/03-foundations.html`:

```html
<section class="em-section em-foundations" aria-labelledby="foundations-title">
  <div class="em-container">
    <div class="em-foundations__head">
      <div>
        <p class="em-annotate">3 · Consideration</p>
        <p class="em-eyebrow">Foundations</p>
        <h2 id="foundations-title">Three foundations of opportunity</h2>
        <span class="em-rule" aria-hidden="true"></span>
      </div>
      <p class="em-lead">The American Dream is built on opportunity, but it isn’t always within reach. That’s why we turn research into action, partnering with communities and leaders to advance practical solutions that help more Mississippians succeed.</p>
    </div>

    <div class="em-bento">
      <div class="em-bento__col">
        <article class="em-solution">
          <img class="em-solution__icon" src="../assets/illo-star.png" alt="">
          <h3 class="em-solution__title">Quality Education</h3>
          <p class="em-solution__promise">You want to know your child has every opportunity to succeed</p>
          <p class="em-solution__body"><strong>Real solution:</strong> We’re advancing practical education solutions that expand educational opportunity, empower parents, and help every child reach their full potential.</p>
          <a class="em-btn em-btn--outline em-btn--sm" href="/quality-education">Learn more</a>
        </article>
        <article class="em-solution">
          <img class="em-solution__icon" src="../assets/illo-work-briefcase.png" alt="">
          <h3 class="em-solution__title">Meaningful Work</h3>
          <p class="em-solution__promise">Working hard should open doors, not leave you struggling</p>
          <p class="em-solution__body"><strong>Real solution:</strong> We’re advancing workforce solutions that connect more Mississippians to meaningful careers, strengthen our workforce, and create more opportunities to succeed.</p>
          <a class="em-btn em-btn--outline em-btn--sm" href="/meaningful-work">Learn more</a>
        </article>
      </div>
      <article class="em-solution em-bento__tall">
        <img class="em-solution__icon" src="../assets/illo-check.png" alt="">
        <h3 class="em-solution__title">Public Safety</h3>
        <p class="em-solution__promise">You should feel safe in the community you call home</p>
        <p class="em-solution__body"><strong>Real solution:</strong> We’re advancing practical public safety solutions that strengthen communities, promote accountability, and create safer neighborhoods where opportunity can thrive.</p>
        <a class="em-btn em-btn--outline em-btn--sm" href="/public-safety">Learn more</a>
        <img class="em-bento__media" src="../assets/photography/grandparents-grandchild.jpg" alt="Grandparents walking with their grandchild in their neighbourhood">
      </article>
    </div>

    <div class="em-equal">
      <article class="em-solution">
        <img class="em-solution__icon" src="../assets/illo-star.png" alt="">
        <h3 class="em-solution__title">Quality Education</h3>
        <p class="em-solution__body">You want to know your child has every opportunity to succeed.</p>
        <a class="em-solution__more" href="/quality-education">Learn more →</a>
      </article>
      <article class="em-solution">
        <img class="em-solution__icon" src="../assets/illo-work-briefcase.png" alt="">
        <h3 class="em-solution__title">Meaningful Work</h3>
        <p class="em-solution__body">Working hard should open doors, not leave you struggling to get ahead.</p>
        <a class="em-solution__more" href="/meaningful-work">Learn more →</a>
      </article>
      <article class="em-solution">
        <img class="em-solution__icon" src="../assets/illo-check.png" alt="">
        <h3 class="em-solution__title">Public Safety</h3>
        <p class="em-solution__body">You should feel safe in the community you call home.</p>
        <a class="em-solution__more" href="/public-safety">Learn more →</a>
      </article>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Write the foundations styles**

Append to `css/homepage.css`:

```css
/* ---------- Foundations ---------- */
.em-foundations__head{display:grid;grid-template-columns:1fr minmax(0,380px);gap:var(--space-11);
  align-items:end;margin-bottom:var(--space-9)}
.em-foundations__head h2{margin:0}
.em-foundations__head .em-rule{margin:var(--space-5) 0 0}

.em-bento{display:grid;grid-template-columns:1fr 1.06fr;gap:var(--space-6);align-items:stretch}
.em-bento__col{display:grid;grid-template-rows:1fr 1fr;gap:var(--space-6)}
.em-bento__tall{padding-bottom:0;overflow:hidden}
.em-bento__media{width:calc(100% + var(--space-8) * 2);max-width:none;margin:var(--space-7) calc(var(--space-8) * -1) 0;
  height:236px;object-fit:cover}
.em-bento .em-btn{align-self:flex-start;margin-top:var(--space-2)}

.em-equal{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6);align-items:start}
.em-equal .em-solution__more{text-decoration:none}

/* Variant switching — both layouts ship, CSS reveals one */
[data-foundations="bento"] .em-equal{display:none}
[data-foundations="equal"] .em-bento{display:none}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: bento by default — two stacked cards left, tall Public Safety card right with a photograph filling its lower portion edge-to-edge. Switching the Foundations control to "Three equal" swaps to three cards and hides the bento. Only one layout visible at a time.

- [ ] **Step 7: Commit**

```bash
git add src/sections/03-foundations.html css/homepage.css test.mjs
git commit -m "feat: add foundations section with bento and equal-card variants"
```

---

### Task 8: Stories — feature and carousel variants

**Files:**
- Modify: `src/sections/04-stories.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `em-quote`, `em-quote__portrait/__text/__attr`, `em-quote--light`, `em-btn--inverse-outline`, `.em-container`, `.em-section`.
- Produces: `.em-stories`, `.em-stories__feature`, `.em-stories__carousel`, `.em-stories__nav`, `.em-stories__dots` — referenced by Tasks 12 and 13.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('both stories layouts ship in the markup', () => {
  assert.match(html, /class="em-stories__feature"/);
  assert.match(html, /class="em-stories__carousel"/);
});

test('stories attributes Jodi Berry with city', () => {
  assert.match(html, /Jodi Berry/);
  assert.match(html, /Sumrall, MS/);
});

test('carousel controls are inert and marked as such', () => {
  assert.match(html, /class="em-stories__nav"[^>]*disabled/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — placeholder partial.

- [ ] **Step 3: Write the stories partial**

Replace `src/sections/04-stories.html`:

```html
<section class="em-section em-stories" aria-labelledby="stories-title">
  <div class="em-container">
    <div class="em-stories__head">
      <div>
        <p class="em-annotate em-annotate--light">4 · Trust</p>
        <p class="em-eyebrow">Mississippi stories</p>
        <h2 id="stories-title">Behind every solution is a real person.</h2>
        <p class="em-lead">The American Dream is lived one story at a time. Discover how expanding opportunity is helping Mississippians build stronger families, meaningful careers, and brighter futures.</p>
      </div>
      <a class="em-btn em-btn--inverse-outline em-btn--md" href="/community-stories">Read Community Stories</a>
    </div>

    <div class="em-stories__feature">
      <article class="em-stories__lead-card">
        <img src="../assets/photography/girl-writing-bw.jpg" alt="A student writing at her desk">
        <div class="em-stories__lead-body">
          <p class="em-eyebrow">Featured story</p>
          <blockquote>
            <p>“I have felt devastated more times than I should have when it comes to my son’s education. We just want him to succeed.”</p>
          </blockquote>
          <p class="em-stories__attr">Jodi Berry<span>Sumrall, MS</span></p>
        </div>
      </article>
      <div class="em-stories__col">
        <article class="em-stories__mini">
          <img src="../assets/photography/young-man-portrait-bw.jpg" alt="Portrait of a young Mississippian">
          <div>
            <p>“Community story pull-quote — auto-populated from the latest Community Stories.”</p>
            <p class="em-stories__attr em-stories__attr--sm">Name · Jackson, MS</p>
          </div>
        </article>
        <article class="em-stories__mini">
          <img src="../assets/photography/father-children-field.jpg" alt="A father with his children in a field">
          <div>
            <p>“Community story pull-quote — auto-populated from the latest Community Stories.”</p>
            <p class="em-stories__attr em-stories__attr--sm">Name · Tupelo, MS</p>
          </div>
        </article>
      </div>
    </div>

    <div class="em-stories__carousel">
      <button class="em-stories__nav" type="button" aria-label="Previous story" disabled>←</button>
      <article class="em-stories__slide">
        <img src="../assets/photography/girl-writing-bw.jpg" alt="A student writing at her desk">
        <div>
          <blockquote>
            <p>“I have felt devastated more times than I should have when it comes to my son’s education. We just want him to succeed.”</p>
          </blockquote>
          <p class="em-stories__attr em-stories__attr--sm">Jodi Berry · Sumrall, MS</p>
        </div>
      </article>
      <button class="em-stories__nav" type="button" aria-label="Next story" disabled>→</button>
      <div class="em-stories__dots" aria-hidden="true">
        <span class="is-active"></span><span></span><span></span>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Write the stories styles**

Append to `css/homepage.css`:

```css
/* ---------- Stories ---------- */
.em-stories{background:var(--surface-navy)}
.em-stories__head{display:grid;grid-template-columns:1fr auto;gap:var(--space-8);align-items:end;
  margin-bottom:var(--space-9)}
.em-stories__head h2{color:var(--text-inverse);margin:0 0 var(--space-4)}
.em-stories__head .em-eyebrow{color:var(--orange-300)}
.em-stories__head .em-lead{color:var(--text-inverse-muted);max-width:62ch;margin:0}

.em-stories__feature{display:grid;grid-template-columns:1.35fr 1fr;gap:var(--space-6);align-items:stretch}
.em-stories__lead-card{display:grid;grid-template-columns:256px 1fr;background:var(--surface-card);
  border-radius:var(--radius-card);overflow:hidden}
.em-stories__lead-card>img{width:100%;height:100%;object-fit:cover;min-height:336px}
.em-stories__lead-body{padding:var(--space-9) var(--space-8);display:flex;flex-direction:column;
  justify-content:center}
.em-stories__lead-body blockquote{margin:0 0 var(--space-6)}
.em-stories__lead-body blockquote p{margin:0;font-family:var(--font-display);
  font-weight:var(--fw-semibold);font-size:var(--fs-h3);line-height:1.4;
  letter-spacing:var(--ls-heading);color:var(--text-strong)}

.em-stories__attr{margin:0;font-family:var(--font-display);font-weight:var(--fw-bold);
  font-size:var(--fs-caption);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;
  color:var(--em-orange)}
.em-stories__attr span{display:block;font-weight:var(--fw-medium);letter-spacing:var(--ls-caps);
  color:var(--text-muted)}
.em-stories__attr--sm{font-size:11px}

.em-stories__col{display:grid;grid-template-rows:1fr 1fr;gap:var(--space-6)}
.em-stories__mini{display:flex;align-items:center;gap:var(--space-5);background:var(--surface-card);
  border-radius:var(--radius-card);padding:var(--space-6)}
.em-stories__mini>img{width:80px;height:80px;flex:0 0 auto;border-radius:var(--radius-pill);
  object-fit:cover}
.em-stories__mini p{margin:0 0 var(--space-3);font-size:var(--fs-small);line-height:1.5;
  color:var(--text-body)}
.em-stories__mini .em-stories__attr{margin:0}

.em-stories__carousel{display:grid;grid-template-columns:auto 1fr auto;gap:var(--space-6);
  align-items:center}
.em-stories__nav{width:48px;height:48px;border-radius:var(--radius-pill);
  border:1px solid var(--border-inverse);background:none;color:var(--white);font-size:18px;
  display:grid;place-items:center;cursor:pointer}
.em-stories__nav[disabled]{opacity:.5;cursor:default}
.em-stories__slide{display:grid;grid-template-columns:150px 1fr;gap:var(--space-9);align-items:center;
  background:var(--surface-card);border-radius:var(--radius-card);padding:var(--space-11)}
.em-stories__slide>img{width:150px;height:150px;border-radius:var(--radius-pill);object-fit:cover}
.em-stories__slide blockquote{margin:0 0 var(--space-6)}
.em-stories__slide blockquote p{margin:0;font-family:var(--font-display);font-weight:var(--fw-semibold);
  font-size:var(--fs-h3);line-height:1.45;letter-spacing:var(--ls-heading);color:var(--text-strong)}
.em-stories__dots{grid-column:1 / -1;display:flex;gap:9px;justify-content:center;margin-top:var(--space-2)}
.em-stories__dots span{width:9px;height:9px;border-radius:var(--radius-pill);
  border:1px solid var(--border-inverse)}
.em-stories__dots .is-active{background:var(--white);border-color:var(--white)}

/* Variant switching */
[data-stories="feature"] .em-stories__carousel{display:none}
[data-stories="carousel"] .em-stories__feature{display:none}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: navy band, feature card with the b&w portrait and Jodi Berry quote beside two small quote cards. Switching Stories to "Carousel" shows the single centred slide with greyed-out arrows and three dots.

- [ ] **Step 7: Commit**

```bash
git add src/sections/04-stories.html css/homepage.css test.mjs
git commit -m "feat: add stories section with feature and carousel variants"
```

---

### Task 9: Insights section

**Files:**
- Modify: `src/sections/05-insights.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `em-badge--outline`, `em-article__meta/__title/__excerpt/__more`, `em-podcast` family, `em-btn--outline`.
- Produces: `.em-insights`, `.em-insights__aside`, `.em-insights__rows`, `.em-insights__row` — referenced by Tasks 12 and 13.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('insights lists three content rows', () => {
  const rows = html.match(/class="em-insights__row"/g) || [];
  assert.equal(rows.length, 3);
});

test('insights preserves CMS placeholder copy verbatim', () => {
  assert.match(html, /Article headline — auto-populated from the blog/);
  assert.match(html, /Research title — auto-populated from EPIC/);
  assert.match(html, /Community story title — auto-populated/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — placeholder partial.

- [ ] **Step 3: Write the insights partial**

Replace `src/sections/05-insights.html`:

```html
<section class="em-section em-insights-wrap" aria-labelledby="insights-title">
  <div class="em-container em-insights">
    <div class="em-insights__aside">
      <p class="em-annotate">5 · Authority</p>
      <p class="em-eyebrow">Insights</p>
      <h2 id="insights-title">Latest insights and research</h2>
      <span class="em-rule" aria-hidden="true"></span>
      <p class="em-insights__lede">Stay connected with the latest research, conversations, and stories driving opportunity across Mississippi.</p>
      <a class="em-btn em-btn--outline em-btn--sm" href="/all-content">See all</a>

      <a class="em-podcast em-insights__podcast" href="/podcast">
        <span class="em-podcast__play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </span>
        <span>
          <span class="em-podcast__show">The Empower Podcast</span>
          <span class="em-podcast__title">Capitol Chat</span>
          <span class="em-podcast__meta">New episodes on the ideas, people, and policy shaping opportunity in Mississippi.</span>
        </span>
      </a>
    </div>

    <div class="em-insights__rows">
      <article class="em-insights__row">
        <img src="../assets/photography/child-classroom-tablet.jpg" alt="A child working on a tablet in a classroom">
        <div>
          <p class="em-article__meta"><span class="em-badge em-badge--outline em-badge--sm">Article</span> 4 min read</p>
          <h3 class="em-article__title">Article headline — auto-populated from the blog</h3>
          <p class="em-article__excerpt">Excerpt pulled from the article. Tagged by issue area so it can feed the solution pages too.</p>
          <a class="em-article__more" href="/all-content">Read more →</a>
        </div>
      </article>
      <article class="em-insights__row">
        <img src="../assets/photography/esa-email-mockup.jpg" alt="Research report cover">
        <div>
          <p class="em-article__meta"><span class="em-badge em-badge--outline em-badge--sm">Research</span> 6 min read</p>
          <h3 class="em-article__title">Research title — auto-populated from EPIC</h3>
          <p class="em-article__excerpt">Summary of the report, with a link through to the full research page.</p>
          <a class="em-article__more" href="/research">Read more →</a>
        </div>
      </article>
      <article class="em-insights__row">
        <img src="../assets/photography/classroom-students.jpg" alt="Students working together in a classroom">
        <div>
          <p class="em-article__meta"><span class="em-badge em-badge--outline em-badge--sm">Community Story</span> 3 min read</p>
          <h3 class="em-article__title">Community story title — auto-populated</h3>
          <p class="em-article__excerpt">A Mississippian in their own words, tagged to the solution their story speaks to.</p>
          <a class="em-article__more" href="/community-stories">Read more →</a>
        </div>
      </article>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Write the insights styles**

Append to `css/homepage.css`:

```css
/* ---------- Insights ---------- */
.em-insights{display:grid;grid-template-columns:minmax(0,340px) 1fr;gap:var(--space-13);
  align-items:start}
.em-insights__aside h2{margin:0}
.em-insights__aside .em-rule{margin:var(--space-5) 0 var(--space-5)}
.em-insights__lede{font-size:var(--fs-lead);line-height:1.55;color:var(--text-body);
  margin:0 0 var(--space-7)}
.em-insights__podcast{margin-top:var(--space-9);grid-template-columns:auto 1fr;
  background:var(--surface-subtle)}
.em-insights__podcast .em-podcast__show,
.em-insights__podcast .em-podcast__title,
.em-insights__podcast .em-podcast__meta{display:block}
.em-insights__podcast .em-podcast__meta{margin-top:var(--space-3);font-size:var(--fs-small);
  line-height:1.55;color:var(--text-muted)}

.em-insights__rows{display:flex;flex-direction:column}
.em-insights__row{display:grid;grid-template-columns:184px 1fr;gap:var(--space-8);
  padding:var(--space-7) 0;border-bottom:1px solid var(--border-subtle)}
.em-insights__row:first-child{padding-top:0}
.em-insights__row:last-child{border-bottom:0;padding-bottom:0}
.em-insights__row>img{width:184px;height:172px;object-fit:cover;border-radius:var(--radius-media)}
.em-insights__row .em-article__meta{margin:0 0 var(--space-4);gap:var(--space-4)}
.em-insights__row .em-article__title{margin:0 0 var(--space-3);max-width:26ch}
.em-insights__row .em-article__excerpt{margin:0 0 var(--space-4);max-width:52ch}
.em-insights__row .em-article__more{text-decoration:none}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: narrow left column with heading, orange rule, See all button and the podcast card; three article rows on the right separated by hairlines, no rule under the last.

- [ ] **Step 7: Commit**

```bash
git add src/sections/05-insights.html css/homepage.css test.mjs
git commit -m "feat: add insights section"
```

---

### Task 10: Join Us section

**Files:**
- Modify: `src/sections/06-joinus.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `em-newsletter`, `em-newsletter__form`, `em-input`, `em-btn--secondary`, `em-btn--outline`, `em-card`.
- Produces: `.em-join`, `.em-join__panel`, `.em-join__col` — referenced by Task 13.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('join us newsletter is a real form with a labelled input', () => {
  assert.match(html, /<form class="em-newsletter__form"/);
  assert.match(html, /<label[^>]*for="join-email"/);
  assert.match(html, /id="join-email"[^>]*type="email"/);
});

test('join us actions are navy, not orange', () => {
  const start = html.indexOf('id="join-title"');
  assert.ok(start > -1, 'join us section missing');
  const end = html.indexOf('<footer', start);
  assert.ok(end > start, 'footer should follow join us');
  const section = html.slice(start, end);
  assert.ok(!section.includes('em-btn--primary'), 'orange button outside the hero');
  assert.ok(section.includes('em-btn--secondary'), 'expected navy actions in join us');
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — placeholder partial.

- [ ] **Step 3: Write the Join Us partial**

Replace `src/sections/06-joinus.html`:

```html
<section class="em-section em-join-wrap" aria-labelledby="join-title">
  <div class="em-container">
    <div class="em-join__head">
      <div>
        <p class="em-annotate">6 · Action</p>
        <h2 id="join-title">Join us</h2>
        <span class="em-rule" aria-hidden="true"></span>
      </div>
      <p class="em-lead">Stay connected, bring the conversation to your community, or support the work directly.</p>
    </div>

    <div class="em-join">
      <div class="em-join__panel">
        <p class="em-eyebrow">Newsletter</p>
        <h3>Stay Connected</h3>
        <p class="em-join__body">Sign up for our newsletter to receive the latest stories, research, and updates.</p>
        <div class="em-newsletter">
          <form class="em-newsletter__form" action="#" method="post">
            <label class="em-visually-hidden" for="join-email">Email address</label>
            <input class="em-input" id="join-email" name="email" type="email" placeholder="Email address" required>
            <button class="em-btn em-btn--secondary em-btn--md" type="submit">Subscribe</button>
          </form>
        </div>
      </div>

      <div class="em-join__col">
        <article class="em-card em-card--pad-md em-join__card">
          <h3>Become an Ambassador</h3>
          <p>Help bring the conversation about opportunity to your community and inspire others to get involved.</p>
          <a class="em-btn em-btn--outline em-btn--sm" href="/ambassadors">Become an Ambassador</a>
        </article>
        <article class="em-card em-card--pad-md em-join__card">
          <h3>Donate</h3>
          <p>Your support helps advance practical solutions that create more opportunities across Mississippi.</p>
          <a class="em-btn em-btn--secondary em-btn--sm" href="/donate">Support Our Work</a>
        </article>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 4: Write the Join Us styles**

Append to `css/homepage.css`:

```css
/* ---------- Join Us ---------- */
.em-join-wrap{background:var(--surface-tint)}
.em-join__head{display:grid;grid-template-columns:1fr auto;gap:var(--space-9);align-items:end;
  margin-bottom:var(--space-9)}
.em-join__head h2{margin:0}
.em-join__head .em-rule{margin:var(--space-5) 0 0}
.em-join__head .em-lead{max-width:360px;margin:0}

.em-join{display:grid;grid-template-columns:1.45fr 1fr;gap:var(--space-6);align-items:stretch}
.em-join__panel{display:flex;flex-direction:column;justify-content:center;
  background:var(--surface-card);border:1px solid var(--border-subtle);
  border-radius:var(--radius-panel);padding:var(--space-11) var(--space-9)}
.em-join__panel h3{margin:0 0 var(--space-4);font-size:var(--fs-h2)}
.em-join__body{font-size:var(--fs-lead);line-height:1.6;color:var(--text-body);max-width:46ch;
  margin:0 0 var(--space-8)}
.em-join__panel .em-newsletter__form{max-width:520px;flex-wrap:nowrap}

.em-join__col{display:grid;grid-template-rows:1fr 1fr;gap:var(--space-6)}
.em-join__card{justify-content:flex-start}
.em-join__card h3{margin:0 0 var(--space-3);font-size:var(--fs-h4)}
.em-join__card p{margin:0 0 auto;font-size:var(--fs-small);line-height:1.55;color:var(--text-body)}
.em-join__card .em-btn{align-self:flex-start;margin-top:var(--space-6)}

.em-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0 0 0 0);white-space:nowrap;border:0}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: tinted band, wide newsletter panel with pill input and navy Subscribe, two stacked cards right with buttons bottom-aligned.

- [ ] **Step 7: Commit**

```bash
git add src/sections/06-joinus.html css/homepage.css test.mjs
git commit -m "feat: add join us section"
```

---

### Task 11: Site footer

**Files:**
- Modify: `src/sections/07-footer.html`
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: `em-footer`, `em-footer__top/__logo/__links/__social/__bottom/__legal`, `em-btn--inverse`, `em-input`.
- Produces: nothing consumed by later tasks except the wireframe skin's rounded-panel override (Task 12).

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('footer is a landmark with four social links', () => {
  assert.match(html, /<footer class="em-footer">/);
  const socials = html.match(/class="em-footer__social"[\s\S]*?<\/div>/);
  assert.ok(socials, 'no social block');
  assert.equal((socials[0].match(/<a /g) || []).length, 4);
});

test('footer carries the registered address', () => {
  assert.match(html, /741 Avignon Dr\., Suite C/);
  assert.match(html, /Ridgeland, MS 39157/);
});

test('footer newsletter input is labelled', () => {
  assert.match(html, /<label[^>]*for="footer-email"/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — placeholder partial.

- [ ] **Step 3: Write the footer partial**

Replace `src/sections/07-footer.html`. The four SVG paths are copied verbatim from `components/navigation/SiteFooter.jsx`:

```html
<footer class="em-footer">
  <div class="em-container">
    <div class="em-footer__top">
      <div>
        <div class="em-footer__logo"><img src="../assets/logo-primary-reversed.png" alt="Empower Mississippi"></div>
        <p class="em-footer__mission">Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.</p>
        <form class="em-footer__form" action="#" method="post">
          <label class="em-visually-hidden" for="footer-email">Email address</label>
          <input class="em-input" id="footer-email" name="email" type="email" placeholder="Email address" required>
          <button class="em-btn em-btn--inverse em-btn--sm" type="submit">Subscribe</button>
        </form>
        <div class="em-footer__social">
          <a href="https://facebook.com/empowerms" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V11H8v3h2v7h3v-7h2.2l.5-3H13v-1.2c0-.5.2-.8.5-.8Z"/></svg></a>
          <a href="https://instagram.com/empowerms" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 0 0 12 8.2Zm0 6.1a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6ZM17 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1.5 13a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 17V7A1.5 1.5 0 0 1 7 5.5h10A1.5 1.5 0 0 1 18.5 7v10Zm-1.75-9.4a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0Z"/></svg></a>
          <a href="https://x.com/empowerms" aria-label="X"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 4h2.7l-5.9 6.7L21 20h-5.3l-4.1-5.4L6.8 20H4.1l6.3-7.1L3.5 4h5.4l3.8 5 4.9-5Zm-.9 14.3h1.5L8.2 5.6H6.6l10.1 12.7Z"/></svg></a>
          <a href="https://youtube.com/@empowerms" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.9a2.5 2.5 0 0 0-1.8-1.8C18.2 5.7 12 5.7 12 5.7s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.9C2 9.5 2 12 2 12s0 2.5.4 4.1a2.5 2.5 0 0 0 1.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.1.4-4.1s0-2.5-.4-4.1ZM10 15.1V8.9l5.2 3.1-5.2 3.1Z"/></svg></a>
        </div>
      </div>
      <div>
        <h4>Follow</h4>
        <ul class="em-footer__links">
          <li><a href="https://facebook.com/empowerms">Facebook</a></li>
          <li><a href="https://instagram.com/empowerms">Instagram</a></li>
          <li><a href="https://x.com/empowerms">X</a></li>
          <li><a href="https://youtube.com/@empowerms">YouTube</a></li>
        </ul>
      </div>
      <div>
        <h4>More</h4>
        <ul class="em-footer__links">
          <li><a href="/contact">Contact Us</a></li>
          <li><a href="/privacy">Privacy Policy &amp; Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div class="em-footer__bottom">
      <p class="em-footer__legal">© Empower Mississippi</p>
      <p>741 Avignon Dr., Suite C &nbsp;|&nbsp; Ridgeland, MS 39157</p>
    </div>
  </div>
</footer>
```

- [ ] **Step 4: Write the footer overrides**

The shipped `em-footer__top` is a four-column grid; this footer has three groups. Append to `css/homepage.css`:

```css
/* ---------- Footer ---------- */
/* Shipped em-footer__top is 1.4fr repeat(3,1fr); the homepage has three groups. */
.em-footer__top{grid-template-columns:1.5fr 1fr 1fr}
.em-footer__mission{font-size:var(--fs-small);line-height:1.6;color:var(--text-inverse-muted);
  max-width:40ch;margin:0 0 var(--space-6)}
.em-footer__form{display:flex;gap:var(--space-3);max-width:440px;margin:0 0 var(--space-2)}
.em-footer__form .em-input{flex:1 1 auto;background:transparent;border-color:var(--border-inverse);
  border-radius:var(--radius-pill);color:var(--white);padding:14px 22px}
.em-footer__form .em-input::placeholder{color:var(--text-inverse-muted)}
.em-footer__bottom p{margin:0}
```

- [ ] **Step 5: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: navy footer, reversed logo legible, three columns, four social circles that turn orange on hover, legal row.

- [ ] **Step 7: Commit**

```bash
git add src/sections/07-footer.html css/homepage.css test.mjs
git commit -m "feat: add site footer section"
```

---

### Task 12: Wireframe skin

**Files:**
- Modify: `css/wireframe.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: every class produced by Tasks 4–11.
- Produces: nothing consumed by later tasks.

**Reminder of the constraint:** colour, imagery and ornament only. If a rule changes width, height, padding, margin, grid or flex sizing, it belongs in `homepage.css` instead. The one permitted exception is the footer's rounded inset panel, which the wireframe explicitly shows — implemented with `border-radius` and `margin`, and called out below.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
const wire = readFileSync('css/wireframe.css', 'utf8');

test('wire skin scopes every rule under data-skin="wire"', () => {
  const selectors = wire
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .map(b => b.split('{')[0].trim())
    .filter(Boolean);
  for (const sel of selectors) {
    assert.ok(sel.includes('[data-skin="wire"]'), `unscoped wireframe rule: ${sel}`);
  }
});

test('wire skin keeps the focus ring orange', () => {
  assert.match(wire, /--focus-ring:\s*#E65A28/i);
});

test('wire skin does not touch layout geometry', () => {
  const banned = /(^|[;{\s])(width|height|padding|margin|gap|grid-template|flex)\s*:/;
  const blocks = wire.replace(/\/\*[\s\S]*?\*\//g, '').split('}');
  for (const b of blocks) {
    const body = b.split('{')[1];
    if (!body) continue;
    if (b.includes('em-footer')) continue; // documented exception
    assert.ok(!banned.test(body), `geometry in wireframe.css: ${b.trim().slice(0, 80)}`);
  }
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — `wireframe.css` has no `--focus-ring` rule.

- [ ] **Step 3: Write the wireframe skin**

Replace `css/wireframe.css`:

```css
/* Wireframe skin. Colour, imagery and ornament ONLY — never layout geometry.
   Anything that moves a box belongs in homepage.css.
   Exception: the footer's rounded inset panel, which the wireframe explicitly shows. */

[data-skin="wire"]{
  --text-strong:#1f2427;
  --text-body:#7a7a7a;
  --text-muted:#a8a8a8;
  --text-inverse-muted:rgba(255,255,255,.8);
  --surface-page:#fff;
  --surface-subtle:#f6f6f5;
  --surface-tint:#f6f6f5;
  --surface-navy:#2c2f31;
  --surface-card:#fff;
  --border-subtle:#e2e2e2;
  --border-default:#cfcfcf;
  --border-inverse:#6b6f71;
  --em-blue:#2c2f31;
  --em-orange:#2c2f31;
  --blue-100:#f4f4f4;
  --orange-300:#a8a8a8;
  /* --em-orange is a primitive driving eleven component rules. Neutralising it
     greys the filled buttons as intended, but would also grey the focus ring —
     an accessibility regression for a cosmetic toggle. Re-assert it. */
  --focus-ring:#E65A28;
  --shadow-focus:0 0 0 3px rgba(230,90,40,.38);
}

/* Eyebrows: the blanket --em-orange override would render these near-black.
   The wireframe shows them mid-grey. */
[data-skin="wire"] .em-eyebrow,
[data-skin="wire"] .em-heading__eyebrow,
[data-skin="wire"] .em-podcast__show{color:#9a9a9a}

/* The 88x6 orange rule has no wireframe equivalent. */
[data-skin="wire"] .em-rule,
[data-skin="wire"] .em-heading__rule{visibility:hidden}

/* Photography becomes diagonal-cross placeholder boxes. */
[data-skin="wire"] .em-hero__media>img,
[data-skin="wire"] .em-process__bg,
[data-skin="wire"] .em-bento__media,
[data-skin="wire"] .em-stories__lead-card>img,
[data-skin="wire"] .em-stories__mini>img,
[data-skin="wire"] .em-stories__slide>img,
[data-skin="wire"] .em-insights__row>img{
  opacity:0}
[data-skin="wire"] .em-hero__media,
[data-skin="wire"] .em-process__step,
[data-skin="wire"] .em-stories__lead-card>img,
[data-skin="wire"] .em-stories__mini>img,
[data-skin="wire"] .em-stories__slide>img,
[data-skin="wire"] .em-insights__row>img,
[data-skin="wire"] .em-bento__media{
  background-color:#f4f4f4;
  background-image:linear-gradient(to top right,transparent calc(50% - .5px),#e6e6e6 50%,transparent calc(50% + .5px)),
                   linear-gradient(to bottom right,transparent calc(50% - .5px),#e6e6e6 50%,transparent calc(50% + .5px))}

/* Illustration marks become empty outlined squares. */
[data-skin="wire"] .em-solution__icon,
[data-skin="wire"] .em-process__mark{
  opacity:0;
  border:1px solid #e0e0e0;
  border-radius:10px;
  background-color:#f4f4f4}
[data-skin="wire"] .em-process__mark{border-color:rgba(255,255,255,.45)}

/* Logos become LOGO outline boxes. */
[data-skin="wire"] .em-header__logo img,
[data-skin="wire"] .em-footer__logo img{visibility:hidden}
[data-skin="wire"] .em-header__logo,
[data-skin="wire"] .em-footer__logo{position:relative}
[data-skin="wire"] .em-header__logo::after,
[data-skin="wire"] .em-footer__logo::after{
  content:"LOGO";position:absolute;inset:0;display:grid;place-items:center;
  border:1px solid #d2d2d2;border-radius:8px;
  font-family:var(--font-display);font-weight:600;font-size:11px;letter-spacing:.18em;color:#9a9a9a}
[data-skin="wire"] .em-footer__logo::after{border-color:#4e5254;color:#8a8a8a}

/* The wireframe presents the footer as a rounded inset panel.
   Documented geometry exception — ornament, not layout. */
[data-skin="wire"] .em-footer{border-radius:24px;margin:30px;border:1px solid #2f3538}

/* Card corners are tighter in the wireframe. */
[data-skin="wire"]{--radius-card:14px;--radius-panel:16px;--radius-media:10px}

/* Process scrims are neutral, not navy. */
[data-skin="wire"] .em-process__scrim{background:rgba(31,36,39,.74)}
[data-skin="wire"] .em-process__step:hover .em-process__scrim,
[data-skin="wire"] .em-process__step:focus-within .em-process__scrim{background:rgba(31,36,39,.5)}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS. If the geometry test flags a rule, move it to `homepage.css` or add it to the documented exception — do not weaken the test.

- [ ] **Step 5: Verify both skins in a browser**

Run: `node build.mjs && open dist/index.html`
Expected: switching Skin to "Wireframe" turns the whole page grayscale — placeholder boxes with diagonal crosses, LOGO boxes, no orange rules, neutral pills, rounded inset footer panel. **Switch back and forth: nothing should shift position.** Any reflow means a geometry rule leaked into `wireframe.css`.

- [ ] **Step 6: Verify focus ring survives**

In wireframe skin, tab to the Donate button. Expected: orange focus ring, not grey.

- [ ] **Step 7: Commit**

```bash
git add css/wireframe.css test.mjs
git commit -m "feat: add wireframe skin as token overrides"
```

---

### Task 13: Responsive pass

**Files:**
- Modify: `css/homepage.css`
- Modify: `test.mjs`

**Interfaces:**
- Consumes: every layout class from Tasks 4–11.
- Produces: nothing.

**Note:** the spec flags these breakpoints as an assumption — the source wireframe is desktop-1440 only. If the user has since specified different behaviour, follow that instead and update the spec.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
const homepage = readFileSync('css/homepage.css', 'utf8');

test('responsive rules exist at the four documented breakpoints', () => {
  for (const bp of ['1200px', '900px', '600px']) {
    assert.ok(homepage.includes(`max-width:${bp}`), `no breakpoint at ${bp}`);
  }
});

test('chevron becomes a vertical stack on small screens', () => {
  const at = homepage.indexOf('max-width:900px');
  assert.ok(at > -1);
  assert.match(homepage.slice(at), /em-process\{[^}]*flex-direction:column/);
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node --test test.mjs`
Expected: FAIL — no media queries yet.

- [ ] **Step 3: Write the responsive rules**

Append to `css/homepage.css`:

```css
/* ---------- Responsive ---------- */
@media (max-width:1200px){
  .em-hero{grid-template-columns:1fr 1fr}
  .em-hero__copy{padding:var(--section-y) var(--space-8)}
  .em-hero__northstar{left:auto;right:var(--space-6);bottom:var(--space-6);width:280px}
  .em-insights{grid-template-columns:minmax(0,300px) 1fr;gap:var(--space-11)}
}

@media (max-width:900px){
  .em-solutions__head,.em-foundations__head,.em-stories__head,.em-join__head{
    grid-template-columns:1fr;gap:var(--space-6)}
  .em-join__head .em-lead{max-width:none}

  .em-hero{grid-template-columns:1fr}
  .em-hero__copy{padding:var(--section-y) var(--gutter);order:1}
  .em-hero__media{order:2;min-height:380px}
  .em-hero__northstar{position:static;width:auto;margin:var(--space-6) var(--gutter) 0}

  /* Five-across chevrons cannot survive here. Deliberate substitution:
     a vertical numbered stack with the detail always visible. */
  .em-process{flex-direction:column;height:auto}
  .em-process__step,.em-process__step:first-child{clip-path:none;min-height:200px;min-width:0}
  .em-process__step + .em-process__step{margin-left:0;margin-top:var(--space-3)}
  .em-process__step:hover,.em-process__step:focus-within{flex:1 1 auto}
  .em-process__inner{padding:var(--space-6) var(--space-6) var(--space-6)}
  .em-process__detail{position:static;width:auto;opacity:1;transform:none;pointer-events:auto;
    margin-top:var(--space-4)}
  .em-process__num{opacity:1}

  .em-bento{grid-template-columns:1fr}
  .em-bento__col{grid-template-rows:auto auto}
  .em-equal{grid-template-columns:1fr}
  .em-stories__feature{grid-template-columns:1fr}
  .em-stories__col{grid-template-rows:auto auto}
  .em-insights{grid-template-columns:1fr;gap:var(--space-9)}
  .em-join{grid-template-columns:1fr}
  .em-footer__top{grid-template-columns:1fr 1fr}
}

@media (max-width:600px){
  .em-header__nav{display:none}
  .em-hero h1{font-size:var(--fs-h1)}
  .em-stories__lead-card{grid-template-columns:1fr}
  .em-stories__lead-card>img{min-height:220px}
  .em-stories__mini{flex-direction:column;align-items:flex-start}
  .em-stories__carousel{grid-template-columns:1fr}
  .em-stories__nav{display:none}
  .em-stories__slide{grid-template-columns:1fr;gap:var(--space-6);padding:var(--space-8)}
  .em-insights__row{grid-template-columns:1fr;gap:var(--space-5)}
  .em-insights__row>img{width:100%}
  .em-footer__top{grid-template-columns:1fr}
  .em-footer__form{flex-direction:column}
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify at each breakpoint**

Run: `node build.mjs && open dist/index.html`. In devtools responsive mode check 1440, 1100, 820, 480.
Expected: no horizontal scrollbar at any width; chevron is a readable vertical stack below 900; hero image sits below the copy below 900; nothing overlaps.

- [ ] **Step 6: Verify both skins stay aligned**

At 820px wide, toggle Skin between branded and wireframe. Expected: no layout shift — the responsive rules live in `homepage.css` so both skins inherit them.

- [ ] **Step 7: Commit**

```bash
git add css/homepage.css test.mjs
git commit -m "feat: add responsive breakpoints"
```

---

### Task 14: Accessibility and hand-off readiness

**Files:**
- Modify: `test.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: the complete built page.
- Produces: `README.md` — the hand-off instructions for the WordPress/Elementor developer.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('heading order never skips a level', () => {
  const levels = [...html.matchAll(/<h([1-5])[\s>]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] <= levels[i - 1] + 1,
      `heading jumps from h${levels[i - 1]} to h${levels[i]} at index ${i}`);
  }
});

test('every content image has an alt attribute', () => {
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    assert.match(tag, /\salt="/, `img without alt: ${tag.slice(0, 90)}`);
  }
});

test('section partials carry no page chrome', () => {
  for (const f of readdirSync('src/sections')) {
    const s = readFileSync(`src/sections/${f}`, 'utf8');
    for (const bad of ['<html', '<head', '<body', 'id="controls"']) {
      assert.ok(!s.includes(bad), `${f} contains ${bad}`);
    }
  }
});

test('no inline style attributes — Elementor hand-off hygiene', () => {
  assert.ok(!/\sstyle="/.test(html), 'inline style attribute found; move it to CSS');
});
```

Add `readdirSync` to the `node:fs` import at the top of `test.mjs`.

- [ ] **Step 2: Run it to make sure it fails or passes**

Run: `node --test test.mjs`
Expected: these may already pass if earlier tasks were done correctly. If any fail, fix the offending markup — do not weaken the assertion. A heading-order failure most likely means a section used `h3` before its `h2`.

- [ ] **Step 3: Write the hand-off README**

Create `README.md`:

````markdown
# Empower Mississippi — homepage reference implementation

Static HTML + CSS build of the Empower Mississippi homepage, generated from the
`HomepageWireframe.dc.html` template in the Claude Design project
"Empower Mississippi Design System".

This is a **reference implementation for hand-off to WordPress + Elementor**, not a
production runtime.

## Build and view

```bash
node build.mjs && open dist/index.html
```

Requires Node ≥18. No dependencies, no install step.

## Test

```bash
node --test test.mjs
```

## Preview controls

The dark bar at the top of the page is a preview tool and never ships. It toggles
`data-*` attributes on `<html>`:

| Control | Attribute | Values |
| --- | --- | --- |
| Skin | `data-skin` | `brand`, `wire` |
| Foundations | `data-foundations` | `bento`, `equal` |
| Stories | `data-stories` | `feature`, `carousel` |
| Funnel notes | `data-annotations` | `on`, `off` |

Both layout variants ship in the markup; CSS reveals one. Pick the one you want and
delete the other when building in Elementor.

## Hand-off to WordPress + Elementor

1. Copy `tokens/`, `components/` and `assets/` into the child theme. **Keep them as
   siblings** — `tokens/*.css` references `url('../assets/…')`.
2. Enqueue in this order: the eight `tokens/*.css` files, then
   `components/components.css`, then `css/homepage.css`.
   Do **not** enqueue `css/wireframe.css` — it is a review aid.
3. Each file in `src/sections/` is a standalone fragment. Paste one into an Elementor
   HTML widget, or use it as the reference for a native Elementor section.
4. Fix up asset paths: partials use `../assets/…` relative to `dist/`. In WordPress
   these become theme URLs.
5. Replace the "auto-populated" placeholder strings with dynamic content —
   they mark CMS slots (blog posts, EPIC research, Community Stories).

## Known substitutions

- **Fonts** — Gotham and Whitney are licensed and were not supplied. Figtree and
  Source Sans 3 stand in. To swap, change the `src` URLs in `tokens/fonts.css`;
  nothing else changes.
- **Photography** — extracted from the brand guide PDF at roughly 900–1250px on the
  long edge. Stand-in material, not a licensed library. `classroom-students.jpg` is
  reused in two places.
- **Icons** — the brand defines no icon system. The search and play glyphs are
  single inline paths; social glyphs come from the design system's `SiteFooter.jsx`.

## Deliberate deviations from the wireframe

- Header is 92px, per `components.css`, not the wireframe's 88px placeholder metric.
- Footer is full-bleed navy in the branded skin; the wireframe's rounded inset panel
  appears only in the wireframe skin.
- The 88×6 orange rule is added under section headings — a brand motif the grayscale
  wireframe could not express.
- Exactly one orange filled button on the page (hero "Explore Our Work"), per the
  brand's one-action-per-view rule. The wireframe drew four solid pills.
- The chevron becomes a vertical numbered stack below 900px. The source specifies no
  responsive behaviour; see the spec's Open Questions.

## Not built

The four other pages in the design project's `ui_kits/website/` (Solutions Center,
Quality Education, The Latest, Join Us), working carousel motion, and header dropdown
menu contents.
````

- [ ] **Step 4: Run the full suite**

Run: `node --test test.mjs`
Expected: PASS, all tests.

- [ ] **Step 5: Final visual check in both skins**

Run: `node build.mjs && open dist/index.html`
Walk the page top to bottom in branded skin, then wireframe skin, at 1440px. Then tab
through the entire page from the top: focus must be visible at every stop, and the
chevron steps must expand when their links receive focus.

- [ ] **Step 6: Commit**

```bash
git add test.mjs README.md
git commit -m "feat: add accessibility tests and hand-off documentation"
```

---

## Self-Review

**Spec coverage**

| Spec section | Task |
| --- | --- |
| Repo layout | 1, 2 |
| Build (`build.mjs`) | 1 |
| Skin and variant system | 3, 7, 8, 12 |
| 00 Site header | 4 |
| 01 Hero · Awareness | 5 |
| 02 Solutions model · Interest | 6 |
| 03 Foundations · Consideration | 7 |
| 04 Stories · Trust | 8 |
| 05 Insights · Authority | 9 |
| 06 Join Us · Action | 10 |
| 07 Site footer | 11 |
| Brand mapping | 5–11 (applied), 12 (inverted for wire skin) |
| CTA hierarchy | 5 (test enforces one `em-btn--primary`) |
| Semantics | 4–11 (applied), 14 (tested) |
| Responsive | 13 |
| Out of scope | 14 (documented in README) |
| Open questions | 14 (carried into README) |

**Deviation from the spec, applied deliberately:** the spec's file structure nested
`tokens/` and `components/` under `css/`. That would break the `url('../assets/…')`
references inside `tokens/fonts.css` and `tokens/base.css`, which resolve relative to
the stylesheet. The plan places them at repo root instead and guards the constraint
with a test in Task 2. The spec should be amended to match.

**Placeholder scan:** no TBD/TODO. Every code step contains complete, runnable
content. Stub partials in Tasks 1 and 3 are explicitly temporary and each is replaced
by a named later task.

**Type consistency:** class names cross-checked between producing and consuming
tasks — `em-hero__media` (5→12, 13), `em-process__step/__scrim/__detail/__bg/__mark`
(6→12, 13), `em-bento`/`em-bento__media`/`em-equal` (7→12, 13),
`em-stories__feature`/`__carousel`/`__lead-card`/`__mini`/`__slide`/`__nav`/`__dots`
(8→12, 13), `em-insights__row` (9→12, 13), `em-join__panel`/`__col`/`__card` (10→13),
`em-visually-hidden` (defined in Task 10, reused in Task 11), `em-annotate` and its
`--light`/`--note` modifiers (3→5, 6, 7, 8, 9, 10). The `data-*` attribute contract is
defined once in Task 3 and consumed identically in Tasks 7, 8 and 12.
