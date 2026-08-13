# Elementor Conversion, Phase 1: Tooling, Foundations and the Spike

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tooling and foundations for converting the signed-off static build into Elementor, then convert one page (`podcast-a`) end to end to prove the mechanism before the other fourteen are planned.

**Architecture:** Elementor stores each page as JSON in the `_elementor_data` postmeta. Rather than driving the builder UI, this repository gains a small factory library that emits that JSON, one mapping module per section, and a deploy path over SSH and WP-CLI. Fidelity is proved by a harness that runs the existing copy contracts against the live URL and drives a real browser for the behavioural checks.

**Tech Stack:** Plain ES modules, `node:test`, no dependencies. SSH and WP-CLI against WP Engine install `empv2`. Elementor 4.2.1 plus Elementor Pro. The existing `build.mjs` / `test.mjs` / `dist/` pipeline is untouched and remains the reference.

**Spec:** `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`

## Global Constraints

- **No em dashes in anything you write:** code, comments, copy, commit messages, documentation. Use commas, colons, parentheses or separate sentences. Hyphens in compound words and ranges are fine.
- **The static build is the reference and does not change.** `src/`, `css/`, `tokens/`, `components/`, `build.mjs` and the 228 assertions in `test.mjs` keep passing exactly as they do now. If a conversion task seems to require editing them, stop and raise it.
- **Elementor version is pinned at 4.2.1.** Record it in every captured fixture. The JSON schema is version-specific and undocumented; a fixture from another version is not evidence.
- **Elementor Pro is required** before Task 2. Loop Grid, Theme Builder, Form widget, per-element Custom CSS and Custom Attributes are all Pro, and the design does not work without them.
- **CSS lives in the child theme, in git, enqueued in the documented order:** the eight `tokens/*.css`, then `components/components.css`, then `css/site.css`, then the page's own stylesheets. Nothing goes in Elementor's per-widget custom CSS fields.
- **Native-first, with exactly three exceptions** (spec, "Native-first, and the three exceptions"): `mail-a/03-receive`, the two filter bars, and `epic-a/03-method`'s animation. Any fourth exception needs raising, not taking.
- **This repository is the source of truth for `_elementor_data` for the whole of Phase 1.** Overwriting a converted page is expected. That stops at the handover point named in the spec.
- **Brand copy uses U+2019 apostrophes and U+201C/U+201D quotes.** An existing sweep in `test.mjs` fails straight quotes in prose.
- **Never commit credentials.** The SSH key is at `~/.ssh/wpengine_ed25519` and is referenced by path, never copied into the repository.

## File Structure

| File | Responsibility |
| --- | --- |
| `wpe.mjs` | Run WP-CLI on `empv2` over SSH and return clean output. Owns the Elementor log-noise problem so nothing else has to. |
| `elementor/factory.mjs` | Pure functions that emit Elementor element JSON: `container()`, `heading()`, `text()`, `image()`, `link()`, `html()`. No I/O. |
| `elementor/pages/<page>/<section>.mjs` | One module per section. Imports the factories, exports a function returning that section's element tree. |
| `elementor/deploy.mjs` | Assemble a page's sections into `_elementor_data`, write it over `wpe.mjs`, flush Elementor's CSS cache. |
| `fidelity.mjs` | The harness: fetch a converted URL, run the copy contract and section inventory, report. |
| `fidelity-browser.mjs` | The browser half: filter behaviour, computed styles, no-JS check, screenshots. |
| `fixtures/elementor/*.json` | Captured reference JSON, one file per element shape, each recording the Elementor version it came from. |
| `docs/elementor/schema-4.2.1.md` | What the capture found: element shapes, where CSS classes land, whether Custom Attributes take dynamic tags. |
| `wp/empowerms-child/` | The UiCore child theme: `style.css`, `functions.php`, and copies of `tokens/`, `components/`, `css/`, `js/`, `assets/`. |
| `test-elementor.mjs` | `node:test` suite for everything above. Kept separate from `test.mjs` so the static build's 228 assertions stay a clean signal. |

---

### Task 1: `wpe.mjs`, a clean WP-CLI channel

Every WP-CLI call on this install returns Elementor deprecation notices interleaved with the data, sometimes appended mid-line to a value. Nothing else in this plan can parse output until that is solved once.

**Files:**
- Create: `wpe.mjs`
- Create: `test-elementor.mjs`

**Interfaces:**
- Produces: `stripNotices(raw: string) => string` and `async wpe(command: string) => string`. Every later task uses `wpe()` to reach the install.

- [x] **Step 1: Write the failing test**

Create `test-elementor.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripNotices } from './wpe.mjs';

/* Elementor's logger writes deprecation notices into WP-CLI's stdout. They
   arrive in two shapes and BOTH have been seen on this install: as their own
   block, and appended directly onto the end of a data line with no newline
   between the value and the notice. The second shape is why a line filter is
   not enough. */

test('strips a standalone notice block', () => {
  const raw = [
    'https://empv2.wpenginepowered.com',
    "PHP: 2026-08-12 19:54:58 [notice X 0][/nas/content/live/empv2/wp-content/plugins/elementor/x.php::410] Elementor\\Modules::get() deprecated [array (",
    "  'trace' => '",
    '#0: Elementor\\Core\\Logger\\Manager -> shutdown()',
    "',",
    ')]',
    'Empower Mississippi',
  ].join('\n');
  assert.equal(stripNotices(raw), 'https://empv2.wpenginepowered.com\nEmpower Mississippi');
});

test('strips a notice appended to the end of a data line', () => {
  const raw = 'published pages:          52PHP: 2026-08-12 20:03:26 [notice X 0][/nas/x.php::410] deprecated [array (\n)]';
  assert.equal(stripNotices(raw), 'published pages:          52');
});

test('leaves clean output untouched', () => {
  const raw = 'name,status,version\nelementor,active,4.2.1';
  assert.equal(stripNotices(raw), raw);
});

test('does not eat a legitimate line that merely mentions PHP', () => {
  const raw = 'PHP version is 8.4\nnext line';
  assert.equal(stripNotices(raw), raw);
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test test-elementor.mjs`
Expected: FAIL, `Cannot find module './wpe.mjs'`

- [x] **Step 3: Write the implementation**

> **Correction, found in execution 2026-08-13.** The `wpe()` code below does not
> work and was not used. Node's asynchronous `execFile` has no `input` option:
> that belongs to `execFileSync` and `spawnSync`. So `{ input: script }` is
> silently ignored, the script never reaches the remote `bash -s`, and the call
> blocks on an open stdin pipe forever. Proven by running exactly this code
> against the install and watching it hang until killed at 180 seconds. The
> shipped `wpe.mjs` uses `spawn()` instead, keeping the 32 MiB cap, attaching
> `stdout` / `stderr` / `code` to rejections, and listening for errors on
> `child.stdin`. `stripNotices` below is correct and shipped verbatim.

Create `wpe.mjs`:

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const HOST = 'empv2@empv2.ssh.wpengine.net';
const KEY = `${process.env.HOME}/.ssh/wpengine_ed25519`;
const ROOT = '/nas/content/live/empv2';

/* A notice starts at the literal "PHP: " followed by a timestamp, and runs to
   the line that closes its array dump. Matched with the "PHP: " allowed to
   appear mid-line, because WP-CLI values arrive with the notice glued onto the
   end of them. The timestamp in the pattern is what keeps a legitimate line
   that merely says "PHP" from being eaten. */
const NOTICE = /PHP: \d{4}-\d{2}-\d{2} [\s\S]*?\n\)\]/g;

export function stripNotices(raw) {
  return raw
    .replace(NOTICE, '')
    .split('\n')
    .filter(line => !/^PHP: \d{4}-\d{2}-\d{2} /.test(line))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* One WP-CLI command on the install. The command is piped over stdin as a
   shell script rather than passed as an argument, because inline $(...) and
   parentheses get mangled by the gateway's argument handling. */
export async function wpe(command) {
  const script = `cd ${ROOT} || exit 1\n${command}\n`;
  const { stdout } = await run(
    'ssh',
    ['-i', KEY, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', HOST, 'bash -s'],
    { input: script, maxBuffer: 32 * 1024 * 1024 },
  );
  return stripNotices(stdout);
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `node --test test-elementor.mjs`
Expected: PASS, 4 tests

- [x] **Step 5: Verify against the real install**

Run: `node -e "import('./wpe.mjs').then(m => m.wpe('wp option get siteurl; wp plugin get elementor --field=version')).then(console.log)"`
Expected: exactly two lines, `https://empv2.wpenginepowered.com` and `4.2.1`, with no `PHP:` anywhere.

If a notice survives, add the shape that leaked to the tests in Step 1 first, then widen the pattern. Do not widen the pattern without a test for it.

- [x] **Step 6: Commit**

```bash
git add wpe.mjs test-elementor.mjs
git commit -m "feat: wpe.mjs, a WP-CLI channel with Elementor's log noise stripped"
```

---

### Task 2: Capture the Elementor 4.2.1 JSON schema

**Prerequisite: Elementor Pro must be installed and licensed on `empv2` before this task.**

The factory library cannot be written against a guess. This task builds one reference section by hand in the Elementor editor, dumps its JSON, and turns that into the fixtures every later task is tested against. It also answers the two questions the spike exists for.

**Files:**
- Create: `fixtures/elementor/reference-section.json`
- Create: `fixtures/elementor/loop-item.json`
- Create: `docs/elementor/schema-4.2.1.md`

**Interfaces:**
- Produces: the fixture files and the documented answers to the class-placement and Custom Attributes questions. Task 3 is written against `reference-section.json`; Task 7 against `loop-item.json`.

- [ ] **Step 1: Confirm Pro is present**

Run: `node -e "import('./wpe.mjs').then(m=>m.wpe('wp plugin list --format=csv --fields=name,status,version | grep -i elementor')).then(console.log)"`
Expected: two rows, `elementor,active,4.2.1` and `elementor-pro,active,<version>`.

Stop here if `elementor-pro` is absent. Nothing after this point works without it.

- [ ] **Step 2: Create a scratch page to build the reference in**

```bash
node -e "import('./wpe.mjs').then(m=>m.wpe(\"wp post create --post_type=page --post_status=draft --post_title='ZZ Schema Reference' --porcelain\")).then(console.log)"
```

Record the returned post ID. It is referenced below as `<REF_ID>`.

- [ ] **Step 3: Build the reference section by hand in the editor**

Open `https://empv2.wpenginepowered.com/wp-admin/post.php?post=<REF_ID>&action=elementor` and build exactly this, once:

- One Container, tag set to `section`, CSS Classes set to `zz-probe`
- Inside it, one nested Container, CSS Classes set to `em-container`
- Inside that: one Heading widget (H2, text `Probe heading`, CSS Classes `zz-probe__title`), one Text Editor widget (one paragraph, CSS Classes `zz-probe__body`), one Image widget (any media item, CSS Classes `zz-probe__photo`), and one HTML widget containing `<svg width="10" height="10"></svg>`

Save the page. Do not publish it.

- [ ] **Step 4: Dump the JSON to a fixture**

```bash
node -e "
import('./wpe.mjs').then(async m => {
  const json = await m.wpe('wp post meta get <REF_ID> _elementor_data --format=json');
  const fs = await import('node:fs');
  fs.mkdirSync('fixtures/elementor', { recursive: true });
  fs.writeFileSync('fixtures/elementor/reference-section.json', JSON.stringify(JSON.parse(JSON.parse(json)), null, 2) + '\n');
  console.log('captured');
});
"
```

`_elementor_data` is stored as a JSON string, so it is parsed twice: once out of WP-CLI's JSON envelope, once out of the meta value itself.

- [ ] **Step 5: Answer the class-placement question from the rendered page**

```bash
curl -s "https://empv2.wpenginepowered.com/?p=<REF_ID>&preview=true" > /tmp/probe.html
grep -o '<[a-z0-9]*[^>]*zz-probe__title[^>]*>' /tmp/probe.html
```

Record in `docs/elementor/schema-4.2.1.md` whether `zz-probe__title` landed on the `<h2>` itself or on a wrapper `<div>`, quoting the tag verbatim. This is the finding that decides whether a bridge stylesheet is needed, so record what you saw, not what you expected.

- [ ] **Step 6: Answer the Custom Attributes question**

Still in the editor, on the Heading widget: Advanced, Attributes, enter `data-probe|static-value`. Save. Then try a dynamic value: set the same field using the dynamic tag picker if it is offered.

```bash
curl -s "https://empv2.wpenginepowered.com/?p=<REF_ID>&preview=true" | grep -o 'data-probe="[^"]*"'
```

Record in `docs/elementor/schema-4.2.1.md`: whether a static custom attribute reaches the markup, and whether the Attributes field accepts a dynamic tag at all. If it does not, note that the loop item attributes need the child-theme filter fallback named in the spec, and that Task 7 will build it.

- [ ] **Step 7: Build and capture a loop item**

In Elementor, create a Loop Item template (Templates, Theme Builder, Loop Item) containing one Heading bound to the post title and one Text bound to the post date. On the container of that template, set a custom attribute `data-guest` with a dynamic value if Step 6 showed that is possible, or leave it plain if not.

```bash
node -e "
import('./wpe.mjs').then(async m => {
  const id = (await m.wpe(\"wp post list --post_type=elementor_library --format=ids --posts_per_page=1 --orderby=date --order=DESC\")).trim();
  const json = await m.wpe('wp post meta get ' + id + ' _elementor_data --format=json');
  const fs = await import('node:fs');
  fs.writeFileSync('fixtures/elementor/loop-item.json', JSON.stringify(JSON.parse(JSON.parse(json)), null, 2) + '\n');
  console.log('captured loop item from post ' + id);
});
"
```

- [ ] **Step 8: Write the schema notes**

Create `docs/elementor/schema-4.2.1.md` covering, with a JSON excerpt for each: the shape of a container element, the shape of a widget element, which `settings` key carries CSS classes, which carries the HTML tag, which carries custom attributes, and the two answers from Steps 5 and 6. State the Elementor and Elementor Pro versions at the top. Every claim must be backed by an excerpt from the captured fixtures, not from memory or documentation.

- [ ] **Step 9: Commit**

```bash
git add fixtures/elementor docs/elementor/schema-4.2.1.md
git commit -m "docs: capture the Elementor 4.2.1 element schema from a built reference"
```

---

### Task 3: The element factory library

**Files:**
- Create: `elementor/factory.mjs`
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: `fixtures/elementor/reference-section.json` from Task 2.
- Produces: `container(opts, children)`, `heading(opts)`, `text(opts)`, `image(opts)`, `link(opts)`, `html(opts)`, each returning one Elementor element object, and `elementId()` returning a fresh 7-character hex id. Task 6 and Task 7 build sections from these.

- [ ] **Step 1: Write the failing tests**

Append to `test-elementor.mjs`:

```js
import { readFileSync, existsSync } from 'node:fs';
import { container, heading, html, elementId } from './elementor/factory.mjs';

const REF = JSON.parse(readFileSync('fixtures/elementor/reference-section.json', 'utf8'));

/* The factories are tested against the captured reference rather than against
   a shape we invented. If Elementor changes its schema, recapture the fixture
   and these tests fail loudly instead of the conversion failing quietly. */

const findByClass = (nodes, cls) => {
  for (const n of nodes) {
    if ((n.settings?._css_classes || '').split(/\s+/).includes(cls)) return n;
    const hit = n.elements?.length ? findByClass(n.elements, cls) : null;
    if (hit) return hit;
  }
  return null;
};

test('every element carries a unique 7-character hex id', () => {
  const ids = new Set(Array.from({ length: 500 }, () => elementId()));
  assert.equal(ids.size, 500, 'element ids collided');
  for (const id of ids) assert.match(id, /^[0-9a-f]{7}$/);
});

test('container() matches the captured container shape', () => {
  const ref = findByClass(REF, 'zz-probe');
  assert.ok(ref, 'fixture has no .zz-probe container; recapture it');
  const made = container({ cssClass: 'zz-probe', tag: 'section' }, []);
  assert.equal(made.elType, ref.elType);
  assert.equal(made.settings._css_classes, 'zz-probe');
  for (const key of ['_css_classes']) {
    assert.ok(key in ref.settings, `captured container has no ${key}; the schema notes are wrong`);
  }
});

test('heading() matches the captured heading shape', () => {
  const ref = findByClass(REF, 'zz-probe__title');
  assert.ok(ref, 'fixture has no .zz-probe__title heading; recapture it');
  const made = heading({ text: 'Probe heading', tag: 'h2', cssClass: 'zz-probe__title' });
  assert.equal(made.elType, 'widget');
  assert.equal(made.widgetType, ref.widgetType);
  assert.equal(made.settings._css_classes, 'zz-probe__title');
});

test('html() carries markup through unaltered', () => {
  const svg = '<svg width="10" height="10"></svg>';
  assert.equal(html({ markup: svg }).settings.html, svg);
});

test('container() nests its children', () => {
  const made = container({ cssClass: 'outer' }, [heading({ text: 'x', tag: 'h2' })]);
  assert.equal(made.elements.length, 1);
  assert.equal(made.elements[0].settings.title ?? made.elements[0].settings.heading_title, 'x');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs`
Expected: FAIL, `Cannot find module './elementor/factory.mjs'`

- [ ] **Step 3: Write the implementation**

Create `elementor/factory.mjs` on this skeleton. **The settings key names marked below must be read out of `fixtures/elementor/reference-section.json`, not taken from here**: Elementor's key names are version-specific and undocumented, and the ones written from memory in the test above are a guess. If the fixture disagrees with the test, the fixture wins and you narrow the test.

```js
import { randomBytes } from 'node:crypto';

/* Elementor identifies every element by a 7-character hex id and will silently
   merge two elements that share one. Generated rather than sequential so that
   two section modules built independently cannot collide. */
export const elementId = () => randomBytes(4).toString('hex').slice(0, 7);

const el = (elType, settings, extra = {}) => ({
  id: elementId(),
  elType,
  settings,
  elements: [],
  isInner: false,
  ...extra,
});

/* CONFIRM AGAINST THE FIXTURE: the key Elementor uses for CSS classes. It is
   read by every factory below, so getting it wrong loses every stylesheet hook
   on every page at once. */
const CSS_CLASS_KEY = '_css_classes';

export const container = ({ cssClass = '', tag = 'div', ...rest } = {}, children = []) => ({
  ...el('container', { [CSS_CLASS_KEY]: cssClass, html_tag: tag, ...rest }),
  elements: children,
});

/* CONFIRM AGAINST THE FIXTURE: widgetType, and the settings keys for the text
   and the heading level. */
export const heading = ({ text, tag = 'h2', cssClass = '', ...rest } = {}) =>
  el('widget', { title: text, header_size: tag, [CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'heading' });

export const text = ({ markup, cssClass = '', ...rest } = {}) =>
  el('widget', { editor: markup, [CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'text-editor' });

export const image = ({ id, url, alt = '', cssClass = '', ...rest } = {}) =>
  el('widget', { image: { id, url, alt }, [CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'image' });

export const link = ({ label, href, cssClass = '', ...rest } = {}) =>
  el('widget', { text: label, link: { url: href }, [CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'button' });

/* The escape hatch for the three named exceptions in the spec, and for nothing
   else. Markup goes through unaltered. */
export const html = ({ markup, cssClass = '' } = {}) =>
  el('widget', { html: markup, [CSS_CLASS_KEY]: cssClass }, { widgetType: 'html' });
```

The module must contain no I/O.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add elementor/factory.mjs test-elementor.mjs
git commit -m "feat: Elementor element factories, tested against the captured schema"
```

---

### Task 4: The child theme and the enqueue order

**Files:**
- Create: `wp/empowerms-child/style.css`
- Create: `wp/empowerms-child/functions.php`
- Create: `wp/sync.mjs`
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: `wpe()` from Task 1.
- Produces: a child theme deployed to the install, and `syncTheme()` in `wp/sync.mjs` which pushes `wp/empowerms-child/` plus `tokens/`, `components/`, `css/`, `js/` and `assets/` to the install over rsync.

- [ ] **Step 1: Write the failing test**

Append to `test-elementor.mjs`:

```js
/* The enqueue order IS the design. site.css carries every local WCAG override,
   and a build that loads it before components.css loses them. The order is
   asserted here rather than trusted to a hand-written list in the README. */
test('the child theme enqueues every token, in cascade order, before components and site', () => {
  const fn = readFileSync('wp/empowerms-child/functions.php', 'utf8');

  /* The token paths are BUILT from an array in functions.php, so asserting the
     literal string "tokens/base.css" would test a file that never contains it.
     Assert the array's contents and order instead, which is the real contract. */
  const arr = fn.match(/EMPOWER_TOKENS\s*=\s*array\(([\s\S]*?)\)/);
  assert.ok(arr, 'functions.php has no EMPOWER_TOKENS array');
  const tokens = [...arr[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(
    tokens,
    ['base', 'colors', 'elevation', 'fonts', 'motion', 'radius', 'spacing', 'typography'],
    'the token cascade is incomplete or out of order',
  );

  /* Every one of the eight must exist on disk, or the enqueue 404s silently. */
  for (const t of tokens) assert.ok(existsSync(`tokens/${t}.css`), `tokens/${t}.css does not exist`);

  /* site.css carries the shared chrome and every local WCAG override, so it
     must come after components.css. Getting this backwards drops the contrast
     fixes and nothing errors. */
  const components = fn.indexOf('components/components.css');
  const site = fn.indexOf('css/site.css');
  assert.ok(components > -1, 'functions.php never enqueues components.css');
  assert.ok(site > components, 'site.css is enqueued before components.css');
  assert.match(fn, /wp_enqueue_style\(\s*'empower-site'[^)]*array\(\s*'empower-components'/,
    'site.css does not declare components.css as a dependency, so the order is not guaranteed');
});

test('the motion layer ships as a pair or not at all', () => {
  /* css/motion.css hides every [data-reveal] element and js/reveal.js is what
     reveals them. Enqueueing the stylesheet without the script leaves the page
     blank below the fold, which this build has already shipped once. */
  const fn = readFileSync('wp/empowerms-child/functions.php', 'utf8');
  if (fn.includes('motion')) {
    assert.ok(fn.includes('js/reveal.js'), 'motion.css is reachable but reveal.js is never enqueued');
  }
});

test('the child theme declares UiCore as its parent', () => {
  const style = readFileSync('wp/empowerms-child/style.css', 'utf8');
  assert.match(style, /Template:\s*uicore-pro/, 'child theme does not declare uicore-pro as parent');
});

test('no stylesheet is duplicated into the child theme by hand', () => {
  /* tokens/, components/, css/ and js/ are SYNCED from the repository root at
     deploy time, never copied into wp/. A second copy drifts from the first and
     the drift is invisible until a page renders wrong. */
  const fs = readFileSync('wp/sync.mjs', 'utf8');
  for (const dir of ['tokens', 'components', 'css', 'js', 'assets']) {
    assert.ok(fs.includes(`'${dir}'`), `wp/sync.mjs does not sync ${dir}/`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs`
Expected: FAIL, ENOENT on `wp/empowerms-child/functions.php`

- [ ] **Step 3: Write the child theme**

Create `wp/empowerms-child/style.css`:

```css
/*
Theme Name: Empower Mississippi child
Template: uicore-pro
Version: 1.0.0
Description: Carries the Empower design tokens and page stylesheets. All styling lives in enqueued files under this theme, never in Elementor's per-widget custom CSS.
*/
```

Create `wp/empowerms-child/functions.php`:

```php
<?php
/**
 * The cascade IS the design.
 *
 * site.css carries the shared chrome and every local WCAG override, so it must
 * load after components.css and before any page stylesheet. A build that gets
 * this order wrong loses the accessibility work silently: nothing errors, the
 * contrast just drops. test-elementor.mjs asserts the order in this file.
 */

const EMPOWER_TOKENS = array(
	'base', 'colors', 'elevation', 'fonts', 'motion', 'radius', 'spacing', 'typography',
);

/**
 * Page stylesheets beyond the shared cascade, keyed by page slug.
 *
 * Taken from the "Per page" table in README.md. Confirm each against the page's
 * own <head> in dist/ before trusting it: the older rows in that table were
 * written for dist/current.html and do not describe the pages that ship.
 */
function empower_page_styles() {
	return array(
		'podcast-a' => array( 'motion', 'podcast-a' ),
	);
}

add_action( 'wp_enqueue_scripts', function () {
	$dir = get_stylesheet_directory_uri();
	$ver = wp_get_theme()->get( 'Version' );
	$prev = null;

	foreach ( EMPOWER_TOKENS as $token ) {
		$handle = 'empower-token-' . $token;
		wp_enqueue_style( $handle, $dir . '/tokens/' . $token . '.css', $prev ? array( $prev ) : array(), $ver );
		$prev = $handle;
	}

	wp_enqueue_style( 'empower-components', $dir . '/components/components.css', array( $prev ), $ver );
	wp_enqueue_style( 'empower-site', $dir . '/css/site.css', array( 'empower-components' ), $ver );

	$slug = is_singular() ? get_post_field( 'post_name', get_queried_object_id() ) : '';
	$prev = 'empower-site';
	foreach ( empower_page_styles()[ $slug ] ?? array() as $sheet ) {
		$handle = 'empower-page-' . $sheet;
		wp_enqueue_style( $handle, $dir . '/css/' . $sheet . '.css', array( $prev ), $ver );
		$prev = $handle;
	}
}, 20 );

/**
 * The motion layer. Both files ship together or neither does: css/motion.css
 * hides every [data-reveal] element, and js/reveal.js is what reveals them.
 * Enqueueing the stylesheet without the script leaves the page blank below the
 * fold, which this build has already shipped once.
 */
add_action( 'wp_enqueue_scripts', function () {
	$dir = get_stylesheet_directory_uri();
	$ver = wp_get_theme()->get( 'Version' );
	wp_enqueue_script( 'empower-nav', $dir . '/js/nav.js', array(), $ver, array( 'strategy' => 'defer' ) );
	wp_enqueue_script( 'empower-reveal', $dir . '/js/reveal.js', array(), $ver, array( 'strategy' => 'defer' ) );
	wp_script_add_data( 'empower-nav', 'type', 'module' );
	wp_script_add_data( 'empower-reveal', 'type', 'module' );
}, 20 );
```

Create `wp/sync.mjs`:

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const HOST = 'empv2@empv2.ssh.wpengine.net';
const KEY = `${process.env.HOME}/.ssh/wpengine_ed25519`;
const DEST = '/nas/content/live/empv2/wp-content/themes/empowerms-child';

/* tokens/, components/, css/, js/ and assets/ are SYNCED from the repository
   root, never copied into wp/. A second copy in the tree drifts from the first
   and the drift is invisible until a page renders wrong. */
const FROM_ROOT = ['tokens', 'components', 'css', 'js', 'assets'];

export async function syncTheme() {
  const ssh = `ssh -i ${KEY} -o BatchMode=yes`;
  await run('rsync', ['-az', '--delete', '-e', ssh, 'wp/empowerms-child/', `${HOST}:${DEST}/`]);
  for (const dir of FROM_ROOT) {
    await run('rsync', ['-az', '--delete', '-e', ssh, `${dir}/`, `${HOST}:${DEST}/${dir}/`]);
  }
  return DEST;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs`
Expected: PASS

- [ ] **Step 5: Deploy and activate**

```bash
node -e "import('./wp/sync.mjs').then(m => m.syncTheme()).then(() => console.log('synced'))"
node -e "import('./wpe.mjs').then(m => m.wpe('wp theme activate empowerms-child')).then(console.log)"
```

- [ ] **Step 6: Verify the cascade actually landed**

```bash
curl -s https://empv2.wpenginepowered.com/ | grep -o 'empowerms-child/[a-z/]*\.css' | head -20
```
Expected: the ten files, in the order asserted above. If UiCore's own stylesheet loads after `css/site.css`, that is the cascade trap from the spec: raise it before continuing, because it changes the foundations.

- [ ] **Step 7: Configure Elementor Site Settings**

In the Elementor editor, Site Settings: set Global Colors from `tokens/colors.css` (Primary `#003C50`, Secondary `#E65A28`, Text `#4A4A4A`, Accent `#64A0B4`), Global Fonts from `tokens/typography.css` (`--font-display` for headings, `--font-body` for body), Content Width from `--container-max` in `tokens/spacing.css`, and Widgets Space to `0`. This is safe: zero pages on this install are built in Elementor.

- [ ] **Step 8: Commit**

```bash
git add wp/ test-elementor.mjs
git commit -m "feat: UiCore child theme carrying the documented token cascade"
```

---

### Task 5: The fidelity harness, static half

**Files:**
- Create: `fidelity.mjs`
- Modify: `test-elementor.mjs`

**Interfaces:**
- Produces: `async fetchConverted(url) => string` and `checkCopy(liveHtml, deck) => string[]` returning the missing strings, and `checkSections(liveHtml, slugs) => string[]` returning the missing or out-of-order section classes. Task 6 and Task 7 gate on both returning empty.

- [ ] **Step 1: Write the failing tests**

Append to `test-elementor.mjs`:

```js
import { checkCopy, checkSections } from './fidelity.mjs';

test('checkCopy reports every approved string the page is missing', () => {
  const live = '<h1>Real Solutions</h1><p>For Mississippi</p>';
  assert.deepEqual(checkCopy(live, ['Real Solutions', 'For Mississippi']), []);
  assert.deepEqual(checkCopy(live, ['Real Solutions', 'Not present']), ['Not present']);
});

test('checkCopy sees through markup split inside a string', () => {
  /* Elementor wraps and splits text far more than the static build does. A
     copy check that only does indexOf on the raw HTML reports false failures
     the moment a heading gains a wrapper mid-sentence. */
  const live = '<h1>Real <span>Solutions</span> For All</h1>';
  assert.deepEqual(checkCopy(live, ['Real Solutions For All']), []);
});

test('checkSections reports missing and out-of-order sections', () => {
  const live = '<div class="pca-hero"></div><div class="pca-about"></div><div class="pca-library"></div>';
  assert.deepEqual(checkSections(live, ['pca-hero', 'pca-about', 'pca-library']), []);
  assert.deepEqual(checkSections(live, ['pca-hero', 'pca-missing']), ['pca-missing']);
  assert.deepEqual(
    checkSections(live, ['pca-library', 'pca-hero']),
    ['pca-hero is out of order'],
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs`
Expected: FAIL, `Cannot find module './fidelity.mjs'`

- [ ] **Step 3: Write the implementation**

Create `fidelity.mjs`:

```js
/* The converted DOM is NOT class-for-class identical to dist/. Approach A
   rebuilds each section as native Elementor containers and widgets, so the
   markup differs by design. These checks therefore compare content, structure
   and order, never exact markup. */

export async function fetchConverted(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

/* Elementor wraps and splits text far more than the static build does, so a
   raw indexOf reports false failures the moment a heading gains a wrapper
   mid-sentence. Compare against the page's text, not its markup. */
const asText = html => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export function checkCopy(liveHtml, deck) {
  const text = asText(liveHtml);
  return deck.filter(s => !text.includes(s.replace(/\s+/g, ' ').trim()));
}

/* Sections are found by the build's OWN class, which every converted container
   carries. Absence and order are reported separately because they have
   different causes: absence means a section was not built, order means the
   sections were assembled in the wrong sequence. */
export function checkSections(liveHtml, slugs) {
  const problems = [];
  let last = -1;
  for (const slug of slugs) {
    const at = liveHtml.search(new RegExp(`class="[^"]*\\b${slug}\\b`));
    if (at === -1) { problems.push(slug); continue; }
    if (at < last) problems.push(`${slug} is out of order`);
    else last = at;
  }
  return problems;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs`
Expected: PASS

- [ ] **Step 5: Prove it against a page that already exists**

```bash
node -e "
import('./fidelity.mjs').then(async m => {
  const live = await m.fetchConverted('https://empv2.wpenginepowered.com/the-empower-podcast/');
  console.log('fetched', live.length, 'bytes');
  console.log('missing:', m.checkCopy(live, ['Empower']));
});
"
```
Expected: a byte count and `missing: []`. This proves the fetch path before any converted page exists to point it at.

- [ ] **Step 6: Commit**

```bash
git add fidelity.mjs test-elementor.mjs
git commit -m "feat: fidelity harness, copy contract and section inventory"
```

---

### Task 6: Spike A, convert `podcast-a/01-hero`

The simplest section of the spike page, done first to prove the write-and-verify loop before the hard section relies on it.

**Files:**
- Create: `elementor/pages/podcast-a/01-hero.mjs`
- Create: `elementor/deploy.mjs`
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: the factories from Task 3, `wpe()` from Task 1, `checkCopy` and `checkSections` from Task 5.
- Produces: `section()` from the hero module returning one element tree, and `deployPage(postId, sections)` in `elementor/deploy.mjs`.

- [ ] **Step 1: Read the source section**

Read `src/podcast-a/sections/01-hero.html` in full. Every class, every string and every attribute in it is what the mapping module must reproduce. Read `css/podcast-a.css` for the `pca-hero` rules so you know which elements the CSS actually targets.

- [ ] **Step 2: Write the failing test**

Append to `test-elementor.mjs`:

```js
import { section as podcastHero } from './elementor/pages/podcast-a/01-hero.mjs';

test('the podcast hero mapping carries the section class and its copy', () => {
  const tree = podcastHero();
  const flat = JSON.stringify(tree);
  const source = readFileSync('src/podcast-a/sections/01-hero.html', 'utf8');

  /* Derived from the source partial, never typed by hand: a copy deck typed
     from memory is a second source of truth and drifts from the first. */
  const strings = [...source.matchAll(/>([^<>{}]{12,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `hero mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('pca-hero'), 'hero mapping does not carry the pca-hero class');
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test test-elementor.mjs`
Expected: FAIL, module not found

- [ ] **Step 4: Write the mapping module**

Create `elementor/pages/podcast-a/01-hero.mjs` exporting `section()`, composed entirely from the Task 3 factories, reproducing the source partial's structure, classes and copy. Native containers and widgets throughout: this section has no inline SVG and is not one of the three exceptions.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test test-elementor.mjs`
Expected: PASS

- [ ] **Step 6: Write the deploy module**

Create `elementor/deploy.mjs` exporting `deployPage(postId, sections)`, which JSON-encodes the assembled array, writes it with `wp post meta update <id> _elementor_data`, sets `_elementor_edit_mode` to `builder`, `_elementor_template_type` to `wp-page` and `_elementor_version` to the value captured in Task 2, then runs `wp elementor flush-css`. Write the JSON via a temporary file on the install rather than as a shell argument: the payload is large and contains quotes.

- [ ] **Step 7: Deploy to a draft page**

```bash
node -e "
import('./wpe.mjs').then(async w => {
  const id = (await w.wpe(\"wp post create --post_type=page --post_status=draft --post_title='Spike Podcast' --porcelain\")).trim();
  console.log('SPIKE_ID', id);
});
"
```

Then deploy the hero to that id with `deployPage`.

- [ ] **Step 8: Verify with the harness**

Fetch the draft's preview URL and run `checkCopy` against the strings derived from the source partial, and `checkSections` against `['pca-hero']`. Both must return empty.

- [ ] **Step 9: Open it in the editor**

Open the page in Elementor. Confirm the hero is a tree of editable containers and widgets, not one opaque HTML block. This is the whole point of approach A; if it is opaque, stop and report.

- [ ] **Step 10: Commit**

```bash
git add elementor/ test-elementor.mjs
git commit -m "feat: convert podcast-a hero, proving the JSON write and verify loop"
```

---

### Task 7: Spike B, convert `podcast-a/03-library`

The hard section, and the reason `podcast-a` is the spike page. It is a Loop Grid, nine inline SVGs and a `<form>` in one section, and it carries the item-attribute contract.

**Files:**
- Create: `elementor/pages/podcast-a/02-about.mjs`
- Create: `elementor/pages/podcast-a/03-library.mjs`
- Create: `fidelity-browser.mjs`
- Modify: `test-elementor.mjs`
- Possibly create: `wp/empowerms-child/inc/loop-attributes.php`

**Interfaces:**
- Consumes: everything from Tasks 1 to 6.
- Produces: `async checkFilter(url, opts) => {before, after, restored, kinds}` in `fidelity-browser.mjs`.

- [ ] **Step 1: Convert `02-about` first**

Same pattern as Task 6: read `src/podcast-a/sections/02-about.html`, write the mapping module, test it against strings derived from the source, deploy, verify. It is a plain layout section and should be quick. Commit it separately.

- [ ] **Step 2: Build the filter bar as an HTML widget**

The filter controls are exception 2 of the three named in the spec. Reproduce `src/podcast-a/sections/03-library.html`'s `<form>` and its Guest fieldset verbatim inside one `html()` widget. The ids (`pa-g-lawmaker`, `pa-g-expert`, `pa-g-leader`) must be preserved exactly, because `css/podcast-a.css` selects on them by id.

- [ ] **Step 3: Create the guest taxonomy and give the spike something to filter**

**Read this before building the loop.** The survey found no guest taxonomy on the install: podcast posts carry category `133` and nothing else. So there is nothing for a loop item to emit, and the filter test in Step 5 could never pass. Empower owe the editorial back-fill across the archive, but the spike must not wait for it, and it must not fake it either.

Register the taxonomy properly in the child theme, because it is needed permanently, then term a handful of real episodes as spike data.

Create `wp/empowerms-child/inc/guest-taxonomy.php`:

```php
<?php
/**
 * The Empower Podcast's guest taxonomy.
 *
 * The page filters by guest and nothing else: Empower removed Filter by Topic
 * on 2026-08-07. The three terms are the ones the approved design names. The
 * archive still has to be back-filled by Empower; this only creates the shelf
 * to put it on.
 */
add_action( 'init', function () {
	register_taxonomy( 'guest_type', array( 'post' ), array(
		'label'             => 'Guest type',
		'public'            => true,
		'hierarchical'      => false,
		'show_admin_column' => true,
		'rewrite'           => array( 'slug' => 'guest' ),
	) );
} );
```

Require it from `functions.php`, sync the theme, then create the terms and apply them to the nine episodes the static build shows:

```bash
node -e "
import('./wpe.mjs').then(async w => {
  for (const t of ['lawmaker', 'expert', 'leader']) {
    await w.wpe('wp term create guest_type ' + t + ' --slug=' + t + ' || true');
  }
  console.log(await w.wpe('wp term list guest_type --format=csv --fields=slug,count'));
});
"
```

Then read the nine `<li class="pca-ep">` entries in `src/podcast-a/sections/03-library.html`, and for each one apply its `data-guest` value to the matching live post, found by the URL in its `pca-ep__title` link. Those nine are real published episodes, so this is classifying real content, not inventing it.

Record in the spike report exactly which nine posts were termed and by whom, so Empower can see the sample is ours and the rest of the archive is theirs.

- [ ] **Step 4: Build the episode list as a Loop Grid**

The list is `data-cms="loop"`, querying the show's posts (category 133), newest first. Read the `data-cms-note` on `<ul class="pca-eps">` in the source partial for the full contract before building it.

- [ ] **Step 5: Make the loop items carry `data-guest`**

This is the contract from `data-cms-item-attrs`. Take the route Task 2 Step 6 established, now that Step 3 has given the terms something to point at:

- If Custom Attributes accept a dynamic tag, set `data-guest` on the loop item container from the episode's guest term.
- If they do not, create `wp/empowerms-child/inc/loop-attributes.php` adding a filter that stamps `data-guest` onto each loop item from its term, require it from `functions.php`, and sync the theme.

**`data-topic` is not built.** It is scaffolding for the static sample only, per the block's own `data-cms-note` and the spec.

- [ ] **Step 6: Write the failing browser test**

This needs a real browser, because the filter is CSS over `:checked` and no static parse can tell you whether it works. That makes Playwright this repository's first dependency. Confine it: the static build, `build.mjs` and `test.mjs` stay dependency-free, and Playwright is a dev dependency used only by the harness.

```bash
npm init -y
npm pkg set scripts.test="node --test test.mjs && node --test test-elementor.mjs"
npm install --save-dev playwright
npx playwright install chromium
printf 'node_modules/\n' >> .gitignore
```

Create `fidelity-browser.mjs`:

```js
import { chromium } from 'playwright';

/* The check that no static parse can make. A Loop Grid whose item template
   does not emit its filter attribute produces a page where every control still
   moves, no card ever hides, and nothing anywhere reports an error. Proven
   against dist/content-b.html on 2026-08-12: 23 items, 6 after ticking
   Community Stories, 23 restored. */
export async function checkFilter(url, { toggleSelector, itemSelector, attribute = 'data-guest' }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });

    const visible = () => page.$$eval(itemSelector, els =>
      els.filter(e => getComputedStyle(e).display !== 'none').length);
    const shownKinds = attr => page.$$eval(itemSelector, (els, a) =>
      [...new Set(els.filter(e => getComputedStyle(e).display !== 'none')
        .map(e => e.getAttribute(a)))].filter(Boolean).sort(), attr);

    const before = await visible();
    await page.check(toggleSelector);
    const after = await visible();
    const kinds = await shownKinds(attribute);
    await page.uncheck(toggleSelector);
    const restored = await visible();

    return { before, after, restored, kinds };
  } finally {
    await browser.close();
  }
}

/* Elementor's entrance animations, and css/motion.css without js/reveal.js,
   both leave content hidden waiting for a trigger. The build's rule is that
   nothing is. This build has shipped that defect once already. */
export async function checkVisibleWithoutJs(url, selector) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    return page.$$eval(selector, els =>
      els.filter(e => getComputedStyle(e).opacity !== '0' && getComputedStyle(e).display !== 'none').length);
  } finally {
    await browser.close();
  }
}

/* Check 5 of the spec's harness. Catches the two silent infrastructure
   failures: a stylesheet that never enqueued, and Elementor's Theme Style or
   UiCore's own globals winning over css/site.css. Compared against the same
   property on the same selector in the static build, not against a number
   typed into this file. */
export async function computedStyles(url, probes) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });
    const out = {};
    for (const { name, selector, property } of probes) {
      out[name] = await page.$eval(
        selector,
        (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
        property,
      ).catch(() => null);
    }
    return out;
  } finally {
    await browser.close();
  }
}

export async function screenshots(url, dir) {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `${dir}/${width}.png`, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
```

Then append to `test-elementor.mjs`:

```js
/* The check that matters most and that nothing static can make. A Loop Grid
   whose item template does not emit data-guest produces a page where every
   control still moves, no card ever hides, and nothing reports an error. */
test('the podcast guest filter actually filters', { concurrency: 1 }, async () => {
  const { checkFilter } = await import('./fidelity-browser.mjs');
  const r = await checkFilter(process.env.SPIKE_URL, {
    toggleSelector: '#pa-g-lawmaker',
    itemSelector: '.pca-ep',
  });
  assert.ok(r.before > 0, 'no episodes rendered at all');
  assert.ok(r.after < r.before, 'ticking a guest hid nothing: the loop is not emitting data-guest');
  assert.deepEqual(r.kinds, ['lawmaker'], `filtered view still shows ${r.kinds.join(', ')}`);
  assert.equal(r.restored, r.before, 'unticking did not restore the full list');
});
```

- [ ] **Step 7: Run it and watch it fail for the right reason**

Run: `SPIKE_URL=<draft preview url> node --test test-elementor.mjs`
Expected: FAIL on `ticking a guest hid nothing` if the attributes are not yet reaching the markup. That failure is the point of the test: confirm you can see it before you fix it.

- [ ] **Step 8: Make it pass**

Deploy the corrected loop item, flush Elementor's CSS, rerun. Expected: PASS.

- [ ] **Step 9: Check the page survives without JavaScript**

Load the page with JavaScript disabled and confirm the episodes and headings are visible. `data-reveal` elements start hidden if `reveal.js` does not ship, and Elementor's entrance animations break the same rule. This build has shipped that defect once.

- [ ] **Step 10: Spot-check computed styles against the static build**

Run `computedStyles` against the converted page and against `dist/podcast-a.html` served locally, on the same four probes, and compare:

```js
const PROBES = [
  { name: 'heroTitle',  selector: '.pca-hero__title', property: 'font-size' },
  { name: 'heroBg',     selector: '.pca-hero',        property: 'background-color' },
  { name: 'container',  selector: '.em-container',    property: 'max-width' },
  { name: 'action',     selector: '.em-btn--primary', property: 'background-color' },
];
```

A mismatch on `heroTitle` means Elementor's Theme Style or UiCore's globals are beating `css/site.css`. A mismatch on `container` means the Site Settings content width was not taken from `--container-max`. Both are the cascade traps named in the spec, and both are invisible in a screenshot at a glance.

- [ ] **Step 11: Screenshot at four widths**

Capture 390, 768, 1024 and 1440 and save them under `docs/elementor/spike/`. Compare each against the same width of `dist/podcast-a.html` by eye.

- [ ] **Step 12: Commit**

```bash
git add elementor/ fidelity-browser.mjs test-elementor.mjs wp/ docs/elementor/spike
git commit -m "feat: convert podcast-a library, with the loop item attribute contract proved"
```

---

### Task 8: The spike report and the go decision

**Files:**
- Create: `docs/elementor/spike-report.md`
- Modify: `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`

- [ ] **Step 1: Write the report**

Create `docs/elementor/spike-report.md` answering, each with evidence from what was actually built:

1. Where do CSS classes land, and is a bridge stylesheet needed? If yes, how many of the 47 stylesheets are affected, measured rather than estimated.
2. Do Custom Attributes take dynamic tags, or was the child-theme filter needed?
3. How long did one plain section take, and how long did the library section take? These two numbers size Plan 2.
4. Is the converted page genuinely editable in Elementor, or effectively opaque?
5. What broke that this plan did not predict?

- [ ] **Step 2: Update the spec**

Mark the resolved open questions in the spec, in the same struck-through style the earlier answers use, and revise any risk the spike settled or disproved.

- [ ] **Step 3: Run the full suite**

Run: `node --test test.mjs && node --test test-elementor.mjs`
Expected: 228 passing in the first, all passing in the second. The static build's assertions must be untouched.

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: spike report, and the questions it settled"
```

- [ ] **Step 5: Stop and hand back**

Phase 1 is complete. Do not begin converting the remaining fourteen pages. Plan 2 is written from this report, because the answers in it decide how those pages are built.

---

## What Phase 1 deliberately leaves out

- The other fourteen pages. Planned in Phase 2, from the spike report.
- The header and footer as Theme Builder parts. They are site-wide and would change all 45 Beaver Builder pages; they belong at the start of Phase 2, once the spike has shown the chrome converts cleanly.
- Retiring Beaver Builder. A separate phase, gated on the landing page template being signed off, because 32 Beaver pages have no new design.
- The single-`person` template for staff bios. A Phase 2 task, though the spike report should note whether Loop Grid behaved well enough to make it straightforward.
- Everything on the go-live gate. Those block cutover, not the build.
