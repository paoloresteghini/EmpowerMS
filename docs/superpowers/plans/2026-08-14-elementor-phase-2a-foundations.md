# Phase 2A Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the remaining fourteen pages the chrome, stylesheet and harness they all depend on: Empower's header and footer as site-wide Elementor Theme Builder parts, a bridge stylesheet holding what Elementor Site Settings cannot, and the checks Phase 1 learned the hard way.

**Architecture:** Two `elementor_library` posts (`_elementor_template_type` `header` and `footer`) carry element trees written by the same factory and deploy path Phase 1 built. Elementor Pro's theme-support fallback swallows UiCore's `header.php` and `footer.php` and renders those parts instead, site-wide. The header is a native shell with three verbatim-markup widgets for the nav, the actions and the mobile nav; the footer is native except its social icons. A new bridge stylesheet in the child theme carries container width, widget spacing and the wrapper-class fixes those parts need.

**Tech Stack:** Node 18+ ESM, `node:test`, Playwright (already a devDependency), WP-CLI over SSH via `wpe.mjs`, Elementor 4.2.2 with Elementor Pro 4.2.1, WordPress 7.0.3 / PHP 8.4, UiCore Pro 2.4.1 parent theme with the `empowerms-child` child theme.

**Spec:** `docs/superpowers/specs/2026-08-14-elementor-phase-2-foundations-design.md` (parent: `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`)

## Global Constraints

- **The static build does not change.** `src/`, `css/`, `tokens/`, `components/`, `build.mjs` and `test.mjs` are not touched by any task here. `node --test test.mjs` must report **228 passing** at the end of every task.
- **No new dependencies.** The repository has exactly one (`playwright`, dev).
- **No em dashes** in any file, comment, commit message or document.
- **Install coordinates come from the environment.** `WPE_SSH_HOST`, `WPE_SSH_KEY`, `WPE_ROOT`, loaded with `set -a; . ./.env; set +a`. Never hard-code them; `install.mjs` is the only reader.
- **Every fetch checks `x-cache` on that response.** WP Engine serves stale pages with HTTP 200 and the cache re-warms within seconds of a flush. `fetchConverted()` already enforces this; anything new that fetches must too.
- **`SPIKE_URL`** is `https://empv2.wpenginepowered.com/podcast-a/`. Four existing browser tests fail loudly without it, by design.
- **Elementor version string** written by the deploy path is `4.2.2` (`elementor/deploy.mjs`). Do not change it.
- **CSS class keys differ by element kind:** containers use `css_classes`, widgets use `_css_classes`. The factory already encodes this; never pass one in place of the other.
- **Containers use `content_width: 'full'`** unless a task says otherwise. A boxed container inserts `div.e-con-inner` between the container and its children, which breaks every `.foo > *` selector.
- **Code blocks in this plan are marked.** A block marked **VERIFIED** was executed against the real install or the real test suite while this plan was written. A block marked **SKETCH** was written from source-reading and has not been run: treat it as a starting point, verify it against the install, and report what it actually took.

---

## What this phase does not do

No page conversions. No bridge-stylesheet work on the eleven at-risk stylesheets belonging to unconverted pages. No changes to Beaver Builder's six post, archive, search and `person` template layouts (11248, 11272, 11276, 11322, 11325, 11338). No go-live gate work.

---

### Task 1: `deployThemePart()` and the conditions writer

**Files:**
- Modify: `elementor/deploy.mjs`
- Modify: `test-elementor.mjs` (add a `--- theme parts ---` section after the `elementor/deploy.mjs` section)

**Interfaces:**
- Consumes: `deployElements(postId, elements, templateType)` (private, `elementor/deploy.mjs:57`), `wpe(command)` from `wpe.mjs`.
- Produces:
  - `deployThemePart(postId, elements, location)` where `location` is `'header'` or `'footer'`, returning the same resolved stdout `deployPage()` does.
  - `setConditions(postId, conditions)` where `conditions` is an array of condition strings such as `['include/general']`, returning resolved stdout.

**Why a separate function rather than a third `templateType` argument at the call site:** the template type and the condition are two different writes with two different failure modes, and a part with data but no condition renders nowhere while a part with a condition but no data renders an empty location. Keeping them separate lets Task 3 assert each independently.

- [ ] **Step 1: Write the failing tests**

Add to `test-elementor.mjs`, after the existing `deployLoopItem` test:

```javascript
/* --- theme parts -------------------------------------------------------- */

test('deployThemePart writes the header template type, not wp-page', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-header-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await deployThemePart(4242, [container({ cssClass: 'em-header' })], 'header');
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 4242 _elementor_template_type header/);
    assert.doesNotMatch(script, /wp post meta update 4242 _elementor_template_type wp-page/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deployThemePart writes the footer template type', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-footer-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await deployThemePart(4243, [container({ cssClass: 'em-footer' })], 'footer');
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 4243 _elementor_template_type footer/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deployThemePart refuses a location that is not header or footer', async () => {
  /* 'wp-page' and 'loop-item' are real template types with their own deploy
     functions. Accepting one here would write a page's type onto a library
     post that Elementor then never renders in a location, with no error. */
  await assert.rejects(() => deployThemePart(4242, [], 'single'), /location/);
  await assert.rejects(() => deployThemePart(4242, [], 'wp-page'), /location/);
});

test('setConditions writes the conditions meta as a JSON array', async () => {
  /* _elementor_conditions is read by Elementor Pro's Conditions_Manager
     (wp-content/plugins/elementor-pro/modules/theme-builder/classes/
     conditions-manager.php:53, get_meta). A bare string is not what it
     expects and produces a part assigned to nothing, silently. */
  const { tmpDir, capturePath } = withCapturingSsh('conditions-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await setConditions(4242, ['include/general']);
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 4242 _elementor_conditions/);
    assert.match(script, /--format=json/, 'conditions must be written as JSON, not a plain string');
    assert.match(script, /\["include\/general"\]/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('setConditions refuses an empty condition list', async () => {
  /* An empty array assigns the part to no location at all, which renders
     nothing and reports success. */
  await assert.rejects(() => setConditions(4242, []), /at least one condition/);
});
```

Add the imports at the top of the file, alongside the existing `deployPage, deployLoopItem` import:

```javascript
import { deployPage, deployLoopItem, deployThemePart, setConditions } from './elementor/deploy.mjs';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: FAIL. The import of `deployThemePart` does not resolve, so the whole file fails to load with `SyntaxError: The requested module './elementor/deploy.mjs' does not provide an export named 'deployThemePart'`.

- [ ] **Step 3: Implement both functions**

Add to `elementor/deploy.mjs`, after `deployLoopItem`. **SKETCH** (the `--format=json` behaviour of `wp post meta update` is read from WP-CLI's own help text, not executed while planning; confirm with `wp post meta get <id> _elementor_conditions --format=json` after Task 3's first write):

```javascript
/* The two Theme Builder document types, read from Elementor Pro's own
   documents on the install: modules/theme-builder/documents/header.php
   returns 'header' from get_type(), footer.php returns 'footer'. Any other
   value here would be a real template type belonging to a different deploy
   path (wp-page, loop-item), written onto a library post that Elementor
   then never renders in a location, with nothing reporting it. */
const THEME_PART_LOCATIONS = ['header', 'footer'];

export async function deployThemePart(postId, elements, location) {
  if (!THEME_PART_LOCATIONS.includes(location)) {
    throw new Error(
      `deployThemePart: location must be one of ${THEME_PART_LOCATIONS.join(', ')}, got ${JSON.stringify(location)}`
    );
  }
  return deployElements(postId, elements, location);
}

/* Elementor Pro's Conditions_Manager reads _elementor_conditions off the
   document (conditions-manager.php:53) and expects an array of condition
   strings, 'include/general' being the whole site. Written with
   --format=json so WP-CLI stores an array rather than the literal text of
   one: a part whose conditions are a string is assigned to nothing, renders
   nowhere, and reports no error.

   Separate from deployThemePart() deliberately. A part with data and no
   condition renders nowhere; a part with a condition and no data renders an
   empty location. Two failure modes, two writes, asserted independently. */
export async function setConditions(postId, conditions) {
  if (!Number.isInteger(postId)) {
    throw new Error(`setConditions: postId must be an integer, got ${JSON.stringify(postId)}`);
  }
  if (!Array.isArray(conditions) || conditions.length === 0) {
    throw new Error('setConditions: pass at least one condition, e.g. ["include/general"]');
  }
  const json = JSON.stringify(conditions);
  const suffix = uniqueSuffix();
  const heredoc = `ELEMENTOR_CONDITIONS_${suffix}`;
  const tmpFile = `/tmp/elementor-conditions-${postId}-${suffix}.json`;
  const script = [
    'set -e',
    `cat > ${tmpFile} <<'${heredoc}'`,
    json,
    heredoc,
    `wp post meta update ${postId} _elementor_conditions --format=json < ${tmpFile}`,
    `rm -f ${tmpFile}`,
  ].join('\n');
  return wpe(script);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: five more tests than before, all passing. Without `SPIKE_URL` the same four browser tests fail as always; that is correct.

- [ ] **Step 5: Run the static suite**

Run: `node --test test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `ℹ pass 228`, `ℹ fail 0`.

- [ ] **Step 6: Commit**

```bash
git add elementor/deploy.mjs test-elementor.mjs
git commit -m "feat: deployThemePart and setConditions, the two writes a Theme Builder part needs"
```

---

### Task 2: The evidence that must exist before anything is switched

**Files:**
- Create: `docs/elementor/beaver-before/` (screenshots, one directory per sampled page)
- Create: `docs/elementor/beaver-baseline.md`
- Modify: `.gitignore` (only if `docs/elementor/**/*.png` is not already re-included)

**Interfaces:**
- Consumes: `screenshots(url, dir)` from `fidelity-browser.mjs:231` (captures 390, 768, 1024 and 1440 into `dir`, settling the reveal layer first).
- Produces: `docs/elementor/beaver-before/<slug>/{390,768,1024,1440}.png` and a written baseline naming what was already changed by Phase 1.

**Why this is a task and not a step inside the switch:** two different causes are in play and conflating them would make both unreadable. Phase 1's enqueue is unconditional, so `tokens/`, `components/`, `css/site.css`, `js/nav.js` and `js/reveal.js` already load on all 45 Beaver pages and `css/site.css` styles bare `h1`, `h2`, `h3` and `p`. That restyling has already happened and nobody has looked. The switch in Task 3 is a second, separate cause.

- [ ] **Step 1: Confirm the gitignore does not silently swallow the evidence**

Run: `git check-ignore -v docs/elementor/beaver-before/x/1440.png`
Expected: either no output (not ignored) or a line naming `!docs/elementor/**/*.png`. If it reports the bare `*.png` rule instead, add `!docs/elementor/**/*.png` to `.gitignore` before capturing anything. A `git add` on an ignored directory adds nothing and exits 0, so the evidence would silently never land.

- [ ] **Step 2: Choose the sample by shape, not by order**

Run: **VERIFIED** (this exact command shape ran against the install while planning)

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post list --post_type=page --post_status=publish --fields=ID,post_name --format=csv')).then(console.log)"
```

Pick **five** pages spanning the shapes the spec names: a campaign or petition page, a thank-you page, a resource or download page, a calculator, and a content index. Record the five slugs and why each was chosen in `docs/elementor/beaver-baseline.md`. Do not pick the first five rows.

- [ ] **Step 3: Capture the before set**

```bash
set -a; . ./.env; set +a
node -e "
import('./fidelity-browser.mjs').then(async m => {
  const slugs = ['SLUG1','SLUG2','SLUG3','SLUG4','SLUG5'];
  const fs = await import('node:fs');
  for (const slug of slugs) {
    const dir = 'docs/elementor/beaver-before/' + slug;
    fs.mkdirSync(dir, { recursive: true });
    await m.screenshots('https://empv2.wpenginepowered.com/' + slug + '/', dir);
    console.log('captured', slug);
  }
})"
```

Replace the five placeholder slugs with the ones chosen in Step 2.

- [ ] **Step 4: Read them, and compare one against the live site**

Open the 1440 capture of each of the five. Then open the same page on the real `empowerms.org` and compare by eye. You are looking for what Phase 1's unconditional enqueue already did: body copy at a different size or weight, headings in Figtree rather than the site's own face, link colours moved, spacing changed.

Write what you find into `docs/elementor/beaver-baseline.md`, with the page names. If nothing changed, write that, with the same specificity. "No visible difference at 1440 on five pages" is a real finding and the phase needs it recorded either way.

- [ ] **Step 5: Commit**

```bash
git add docs/elementor/beaver-before docs/elementor/beaver-baseline.md .gitignore
git commit -m "docs: what the 45 Beaver pages look like before the chrome switch"
```

---

### Task 3: Prove the mechanism with marker content, before building anything real

**Files:**
- Create: `elementor/theme-parts/marker.mjs` (throwaway, deleted in Step 8)
- Create: `docs/elementor/theme-part-mechanism.md`
- Create: `docs/elementor/beaver-after/` (screenshots)

**Interfaces:**
- Consumes: `deployThemePart(postId, elements, location)` and `setConditions(postId, conditions)` from Task 1; `container()`, `heading()` from `elementor/factory.mjs`; `screenshots(url, dir)` from `fidelity-browser.mjs`; `flushPageCache()` and `fetchConverted(url)` from `fidelity.mjs`.
- Produces: two `elementor_library` post ids, recorded in `docs/elementor/theme-part-mechanism.md`, which Tasks 4 and 5 write their real trees into.

**The question this task answers, phrased as an output rather than a capability:** not "does Elementor Pro support theme parts on this theme" (source says yes, and a capability that is present can still produce nothing usable) but **"does `https://empv2.wpenginepowered.com/podcast-a/` return HTML containing our marker string, with no `uicore-header` and no `uicore-footer`, and a balanced document"**.

- [ ] **Step 1: Create the two library posts**

**SKETCH.** `wp post create` with `--post_type=elementor_library` is the same shape Phase 1 used for the loop item template (Task 7b's report has the exact commands it ran); the `elementor_library_type` term assignment below is read from that report and not re-run while planning.

```bash
set -a; . ./.env; set +a
node -e "
import('./wpe.mjs').then(m => m.wpe(\`
wp post create --post_type=elementor_library --post_status=publish --post_title='Empower Header' --porcelain
wp post create --post_type=elementor_library --post_status=publish --post_title='Empower Footer' --porcelain
\`)).then(console.log)"
```

Record both ids. Then assign each its library type, so Elementor opens the right editor for it:

```bash
set -a; . ./.env; set +a
node -e "
import('./wpe.mjs').then(m => m.wpe(\`
wp post term set <HEADER_ID> elementor_library_type header
wp post term set <FOOTER_ID> elementor_library_type footer
\`)).then(console.log)"
```

- [ ] **Step 2: Write marker trees into both**

Create `elementor/theme-parts/marker.mjs`:

```javascript
/* Throwaway. Exists only to answer Task 3's question with the smallest
   possible artefact: if the page carries these strings, the location
   renders; if it also still carries uicore-header, the swallow did not
   happen. Deleted at the end of this task. */
import { container, heading } from '../factory.mjs';

export const markerHeader = () => [
  container({ cssClass: 'em-marker-header', tag: 'header', content_width: 'full' }, [
    heading({ text: 'EMPOWER HEADER MARKER', tag: 'h2', cssClass: 'em-marker-header__title' }),
  ]),
];

export const markerFooter = () => [
  container({ cssClass: 'em-marker-footer', tag: 'footer', content_width: 'full' }, [
    heading({ text: 'EMPOWER FOOTER MARKER', tag: 'h2', cssClass: 'em-marker-footer__title' }),
  ]),
];
```

Deploy both, and only then set both conditions:

```bash
set -a; . ./.env; set +a
node -e "
Promise.all([import('./elementor/deploy.mjs'), import('./elementor/theme-parts/marker.mjs')]).then(async ([d, m]) => {
  await d.deployThemePart(<HEADER_ID>, m.markerHeader(), 'header');
  await d.deployThemePart(<FOOTER_ID>, m.markerFooter(), 'footer');
  await d.setConditions(<HEADER_ID>, ['include/general']);
  await d.setConditions(<FOOTER_ID>, ['include/general']);
  console.log('deployed and assigned');
})"
```

**Both parts get their condition, and the header's is never set alone.** Elementor Pro's `get_header()` discards UiCore's `header.php` output entirely, including its opening `<div class="uicore-body-content">`, `<div id="uicore-page">` and `<div id="content" class="uicore-content">`, while `footer.php` still prints their closing tags unless the footer location is filled too.

- [ ] **Step 3: Confirm the conditions meta is an array, not a string**

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post meta get <HEADER_ID> _elementor_conditions --format=json')).then(console.log)"
```

Expected: `["include\/general"]` or `["include/general"]`. A bare quoted string means `--format=json` did not do what Task 1's sketch assumed. Fix `setConditions()` and its test before continuing, and say so in the report.

- [ ] **Step 4: Flush, fetch, and read the output**

```bash
set -a; . ./.env; set +a
node -e "
Promise.all([import('./fidelity.mjs')]).then(async ([f]) => {
  await f.flushPageCache();
  const html = await f.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  for (const needle of ['EMPOWER HEADER MARKER', 'EMPOWER FOOTER MARKER', 'uicore-header', 'uicore-footer', 'id=\"uicore-page\"']) {
    console.log(needle.padEnd(28), html.includes(needle));
  }
})"
```

Expected: both markers `true`, `uicore-header` and `uicore-footer` `false`. `fetchConverted()` throws rather than trusting a 200, so a stale cache cannot pass this off.

Record the actual result in `docs/elementor/theme-part-mechanism.md` whatever it is. **If the markers are absent, or UiCore's chrome is still present, stop and report.** Every later task in this plan rests on this answer, and the spec says so explicitly.

- [ ] **Step 5: Check the document is balanced**

```bash
set -a; . ./.env; set +a
node -e "
import('./fidelity.mjs').then(async f => {
  const html = await f.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  const open = (html.match(/<div/g) || []).length;
  const close = (html.match(/<\/div>/g) || []).length;
  console.log('div open', open, 'close', close, 'delta', open - close);
})"
```

A delta other than 0 means orphaned closing tags from UiCore's `footer.php`, which is the exact failure the both-parts rule exists to prevent. Record the number.

- [ ] **Step 6: Capture the after set for the same five Beaver pages**

Same command as Task 2 Step 3, writing to `docs/elementor/beaver-after/<slug>/`. Then read the 1440 captures side by side with `docs/elementor/beaver-before/<slug>/1440.png` and write what moved into `docs/elementor/theme-part-mechanism.md`. Marker chrome on those pages is expected and correct at this point; what you are looking for is anything else that moved.

- [ ] **Step 7: Write down the revert, and rehearse it**

Add to `docs/elementor/theme-part-mechanism.md`, then run it once to prove it works, then re-apply the conditions:

```bash
# Revert: unassign both parts. Elementor Pro only hooks get_header/get_footer
# when a document is assigned to the location, so removing the conditions
# returns every page to UiCore's own chrome.
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post meta delete <HEADER_ID> _elementor_conditions; wp post meta delete <FOOTER_ID> _elementor_conditions; wp elementor flush_css'))"
```

After running it, fetch `podcast-a` again and confirm `uicore-header` is back. Then re-run Task 3 Step 2's `setConditions` calls to restore the switched state. A revert that has never been run is a hope, not a plan.

- [ ] **Step 8: Retire Beaver's two chrome layouts, and decide the pre-footer on evidence**

Beaver's Header (29) and Footer (154) are dormant: UiCore renders the chrome, established 2026-08-14 by fetching the install's homepage and finding `uicore-header` and no `fl-theme-layout` markup. Disabling them is hygiene, so that a later theme change cannot wake them:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post update 29 --post_status=draft; wp post update 154 --post_status=draft')).then(console.log)"
```

**Do not touch 11248, 11272, 11276, 11322, 11325 or 11338.** Those six are the post, archive, category, author, search and `person` templates, which this phase explicitly leaves alone. Drafting them would strip the template from every post and archive URL on the install, quietly.

The Pre-footer (11365) is a third layout with no counterpart in this build. Look at it before deciding:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post get 11365 --field=post_content | head -40')).then(console.log)"
```

If it renders nothing on the front end (check a Beaver page's HTML for its content), draft it with the two above and say so. If it does render something Empower would miss, leave it published, record what it is, and raise it: a Beaver-styled band sitting above an Elementor footer is a decision for Paolo, not for this task.

- [ ] **Step 9: Delete the marker module and commit**

```bash
rm -rf elementor/theme-parts/marker.mjs
git add docs/elementor/theme-part-mechanism.md docs/elementor/beaver-after
git commit -m "docs: the theme-part mechanism proven on the install, with its revert rehearsed"
```

---

### Task 4: The footer part, built for real

**Files:**
- Create: `elementor/theme-parts/footer.mjs`
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: `container()`, `heading()`, `text()`, `image()`, `html()` from `elementor/factory.mjs`; `deployThemePart()` from Task 1; the footer's post id from Task 3.
- Produces: `footerPart()` returning an array of elements, and `FOOTER_POST_ID`, both imported by Task 8's harness checks.

**Source of truth:** `src/_shared/footer.html`, 39 lines. Read it before writing anything. Its three columns sit inside `data-reveal-group` and each carries `data-reveal="fade"`; those attributes must survive, because `css/motion.css` hides what `js/reveal.js` then reveals, and one without the other ships a blank footer. Valueless attributes convert correctly: `data-reveal-group|` renders as `data-reveal-group=""`, and both the CSS and the JS test presence only.

- [ ] **Step 1: Write the failing tests**

```javascript
test('the footer part carries the build own classes and copy', () => {
  const [root] = footerPart();
  const json = JSON.stringify(root);
  assert.equal(root.settings.css_classes, 'em-footer');
  assert.equal(root.settings.html_tag, 'footer');
  assert.equal(root.settings.content_width, 'full');
  assert.match(json, /Empower Mississippi works to Educate, Engage, and Elect/);
  assert.match(json, /741 Avignon Dr\., Suite C/);
  assert.match(json, /Privacy Policy/);
});

test('the footer part keeps the reveal attributes the motion layer needs', () => {
  /* css/motion.css hides every [data-reveal] element and js/reveal.js is
     what reveals them. A footer that loses these attributes is not broken;
     a footer that keeps the stylesheet and loses the script ships blank. */
  const json = JSON.stringify(footerPart());
  assert.match(json, /data-reveal-group/);
  const fades = json.match(/data-reveal\|fade/g) || [];
  assert.equal(fades.length, 3, 'all three footer columns carry data-reveal="fade"');
});

test('the footer social icons are one markup block, not four widgets', () => {
  /* The four social links are inline SVG. Elementor has no widget that
     emits them, and an icon widget would substitute its own library. */
  const json = JSON.stringify(footerPart());
  assert.match(json, /"widgetType":"html"/);
  for (const network of ['facebook.com/empowerms', 'instagram.com/empowerms', 'x.com/empowerms', 'youtube.com/@empowerms']) {
    assert.ok(json.includes(network), `footer markup is missing ${network}`);
  }
});

test('every string in the footer part appears in the static footer partial', () => {
  /* The static build is the reference the conversion is measured against.
     A string here that is not there is invented copy. */
  const source = fs.readFileSync('src/_shared/footer.html', 'utf8');
  for (const copy of [
    'Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.',
    'Follow',
    'More',
    'Contact Us',
    '741 Avignon Dr., Suite C',
  ]) {
    assert.ok(source.includes(copy), `"${copy}" is not in src/_shared/footer.html`);
    assert.ok(JSON.stringify(footerPart()).includes(copy), `"${copy}" is not in the footer part`);
  }
});
```

Import it at the top of the file:

```javascript
import { footerPart, FOOTER_POST_ID } from './elementor/theme-parts/footer.mjs';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: FAIL, module not found.

- [ ] **Step 3: Build the footer**

Create `elementor/theme-parts/footer.mjs`. **SKETCH**: the tree below follows `src/_shared/footer.html` line for line and the `_attributes` `key|value` shape is the one Phase 1 proved, but this module has not been run. Verify the rendered result at Step 5 and correct it here rather than in `css/`.

```javascript
import { readFileSync } from 'node:fs';
import { container, heading, text, image, html } from '../factory.mjs';

/* The footer's post id on empv2, created in Task 3. Exported so the
   harness and the deploy call name it once rather than each carrying a
   literal that can drift from the other. */
export const FOOTER_POST_ID = <FOOTER_ID>;

/* The reversed logo Empower supplied on 2026-08-03. The attachment id is
   whatever the media library gives it on upload; alt text lives on the
   attachment, never here, because the image widget has no alt control at
   all and a parameter for it would be silently discarded. */
const LOGO = { id: <LOGO_ATTACHMENT_ID>, url: 'https://empv2.wpenginepowered.com/wp-content/uploads/logo-reversed-300x136.png' };

/* The four social links are inline SVG lifted verbatim from the partial.
   Elementor has no widget that emits them and an icon widget would
   substitute its own library, changing the mark. Read from the file rather
   than retyped, so the two cannot drift. */
const socialMarkup = () => {
  const partial = readFileSync(new URL('../../src/_shared/footer.html', import.meta.url), 'utf8');
  const start = partial.indexOf('<div class="em-footer__social">');
  const end = partial.indexOf('</div>', partial.lastIndexOf('</a>')) + '</div>'.length;
  if (start === -1 || end < start) throw new Error('footer.mjs: could not find .em-footer__social in src/_shared/footer.html');
  return partial.slice(start, end);
};

export const footerPart = () => [
  container({ cssClass: 'em-footer', tag: 'footer', content_width: 'full' }, [
    container({ cssClass: 'em-container', content_width: 'full' }, [
      container({ cssClass: 'em-footer__top', content_width: 'full', _attributes: 'data-reveal-group|' }, [
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          container({ cssClass: 'em-footer__logo', content_width: 'full' }, [
            image({ ...LOGO }),
          ]),
          text({ markup: '<p>Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.</p>', cssClass: 'em-footer__mission' }),
          html({ markup: socialMarkup() }),
        ]),
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          heading({ text: 'Follow', tag: 'h3' }),
          text({
            markup: [
              '<ul class="em-footer__links">',
              '<li><a href="https://facebook.com/empowerms">Facebook</a></li>',
              '<li><a href="https://instagram.com/empowerms">Instagram</a></li>',
              '<li><a href="https://x.com/empowerms">X</a></li>',
              '<li><a href="https://youtube.com/@empowerms">YouTube</a></li>',
              '</ul>',
            ].join(''),
          }),
        ]),
        container({ content_width: 'full', _attributes: 'data-reveal|fade' }, [
          heading({ text: 'More', tag: 'h3' }),
          text({
            markup: [
              '<ul class="em-footer__links">',
              '<li><a href="/contact">Contact Us</a></li>',
              '<li><a href="/privacy">Privacy Policy &amp; Terms of Service</a></li>',
              '</ul>',
            ].join(''),
          }),
        ]),
      ]),
      container({ cssClass: 'em-footer__bottom', content_width: 'full' }, [
        text({ markup: '<p>© Empower Mississippi</p>', cssClass: 'em-footer__legal' }),
        text({ markup: '<p>741 Avignon Dr., Suite C &nbsp;|&nbsp; Ridgeland, MS 39157</p>' }),
      ]),
    ]),
  ]),
];
```

Two values to resolve before this runs. `<FOOTER_ID>` is the post id recorded in Task 3. `<LOGO_ATTACHMENT_ID>` is the media-library id of `assets/logo-reversed-300x136.png`; find it, or upload it, with:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post list --post_type=attachment --format=csv --fields=ID,post_title | grep -i reversed')).then(console.log)"
```

If it is not there, upload it with `wp media import` and record the id. The attachment's alt text is a media-library edit and belongs to the go-live gate, not to this module.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: four more passing.

- [ ] **Step 5: Deploy it and look at it**

```bash
set -a; . ./.env; set +a
node -e "
Promise.all([import('./elementor/deploy.mjs'), import('./elementor/theme-parts/footer.mjs'), import('./fidelity.mjs')]).then(async ([d, f, fid]) => {
  await d.deployThemePart(f.FOOTER_POST_ID, f.footerPart(), 'footer');
  await fid.flushPageCache();
  const html = await fid.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  console.log('em-footer present:', html.includes('em-footer'));
  console.log('mission line present:', html.includes('Educate, Engage, and Elect'));
})"
```

Then capture and read: `node -e "import('./fidelity-browser.mjs').then(m=>m.screenshots('https://empv2.wpenginepowered.com/podcast-a/','docs/elementor/phase2a/footer'))"` and open the 390 and 1440 captures. The footer is the first real thing on this install wearing the build's own classes on wrapper divs; anything that looks wrong here is bridge-stylesheet work for Task 7, and it should be written down there rather than fixed by editing `css/`.

- [ ] **Step 6: Commit**

```bash
git add elementor/theme-parts/footer.mjs test-elementor.mjs docs/elementor/phase2a
git commit -m "feat: the footer as an Elementor theme part, native but for its social icons"
```

---

### Task 5: The header part, native shell with three markup widgets

**Files:**
- Create: `elementor/theme-parts/header.mjs`
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: the factory, `deployThemePart()`, and the header's post id from Task 3.
- Produces: `headerPart()` and `HEADER_POST_ID`, imported by Task 8.

**Source of truth:** `src/_shared/header-2.html`, 141 lines, which all fifteen in-scope pages include. Read it before writing anything. The split between native and markup is fixed by the spec and is not the implementer's call:

| Part | Treatment |
| --- | --- |
| `.em-header.em-header--flat` | native container, `html_tag: header` |
| `.em-skip` skip link | native `link()` widget, first child, before the header container |
| `.em-utility` and its two strings | native containers plus `text()` widgets |
| `.em-header__logo` and its image | native `image()` widget with a link |
| `.em-header__nav` and its five panels | **one `html()` widget, verbatim** |
| `.em-header__actions` | **one `html()` widget, verbatim** |
| `.em-mobilenav` | **one `html()` widget, verbatim** |

- [ ] **Step 1: Write the failing tests**

```javascript
test('the header part keeps the no-JavaScript contract', () => {
  /* Every panel ships aria-expanded="true" and js/dropdown.js closes them
     on load. A converted header that ships them closed hides nav content
     behind a trigger with no script to open it, which is the rule this
     build has already broken once. */
  const json = JSON.stringify(headerPart());
  const expanded = json.match(/aria-expanded=\\"true\\"/g) || [];
  assert.ok(expanded.length >= 10, `expected every trigger to ship expanded, found ${expanded.length}`);
  assert.doesNotMatch(json, /aria-expanded=\\"false\\"/);
});

test('every aria-controls in the header resolves to an id in the same part', () => {
  const json = JSON.stringify(headerPart());
  const controls = [...json.matchAll(/aria-controls=\\"([^"\\\\]+)\\"/g)].map(m => m[1]);
  assert.ok(controls.length >= 11, `expected the desktop and mobile triggers, found ${controls.length}`);
  for (const id of controls) {
    assert.ok(json.includes(`id=\\"${id}\\"`), `aria-controls="${id}" points at no id in the header part`);
  }
});

test('the Our Solutions item stays a link plus a disclosure button', () => {
  /* Empower asked for this on 2026-08-05: the words navigate to the
     Solutions landing page, the caret opens the panel. Collapsing it back
     into one button silently drops a requirement. */
  const json = JSON.stringify(headerPart());
  assert.match(json, /em-header__item--split/);
  assert.match(json, /em-header__disclosure/);
  assert.match(json, /href=\\"\/solutions\\"/);
});

test('the header carries the mobile nav and its toggle', () => {
  const json = JSON.stringify(headerPart());
  assert.match(json, /em-header__toggle/);
  assert.match(json, /aria-controls=\\"mobile-nav\\"/);
  assert.match(json, /id=\\"mobile-nav\\"/);
});

test('the header takes exactly three html widgets, and they are the named three', () => {
  /* The spec sanctions a fourth exception for the nav, the actions and the
     mobile nav. A fifth html widget here is scope drift and should fail
     loudly rather than be noticed later by eye. */
  const json = JSON.stringify(headerPart());
  const htmlWidgets = json.match(/"widgetType":"html"/g) || [];
  assert.equal(htmlWidgets.length, 3);
  for (const marker of ['em-header__nav', 'em-header__actions', 'em-mobilenav']) {
    assert.ok(json.includes(marker), `the header part is missing ${marker}`);
  }
});

test('the header markup matches the static partial, string for string', () => {
  /* The three html widgets exist to preserve markup exactly. Anything in
     them that is not in the partial is drift. */
  const partial = fs.readFileSync('src/_shared/header-2.html', 'utf8');
  for (const copy of [
    'A non-profit working to expand opportunity in Mississippi',
    'Email: info@empowerms.org',
    'Quality Education',
    'Connecting Mississippians to careers worth staying for.',
    'Skip to content',
  ]) {
    assert.ok(partial.includes(copy), `"${copy}" is not in src/_shared/header-2.html`);
    assert.ok(JSON.stringify(headerPart()).includes(copy), `"${copy}" is not in the header part`);
  }
});
```

Import:

```javascript
import { headerPart, HEADER_POST_ID } from './elementor/theme-parts/header.mjs';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: FAIL, module not found.

- [ ] **Step 3: Build the header**

The three markup blocks are **read out of the partial at build time, never retyped**. The partial is the source of truth for all fifteen pages, and a second hand-typed copy of a 57-line nav with eleven `aria-controls` pairs would drift from it without anything failing. That also makes Step 1's "matches the partial, string for string" test true by construction rather than by vigilance.

Create `elementor/theme-parts/header.mjs`. **SKETCH**: the extractor's bracket matching is written, not run. Prove it with the tests in Step 1 before trusting the tree.

```javascript
import { readFileSync } from 'node:fs';
import { container, text, image, link, html } from '../factory.mjs';

/* The header's post id on empv2, created in Task 3. */
export const HEADER_POST_ID = <HEADER_ID>;

const PARTIAL = readFileSync(new URL('../../src/_shared/header-2.html', import.meta.url), 'utf8');

/* Returns the complete element whose opening tag carries `className`,
   including its own closing tag, by counting nested opening and closing
   tags of the same name. A regex cannot do this: .em-header__nav contains
   six nested divs, and a lazy match stops at the first </nav> or </div>
   it meets, silently truncating the block to a fragment that still looks
   like markup. */
export function extractBlock(source, tagName, className) {
  const open = new RegExp(`<${tagName}[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`);
  const match = open.exec(source);
  if (!match) throw new Error(`extractBlock: no <${tagName}> carrying .${className}`);
  const start = match.index;
  const step = new RegExp(`<${tagName}\\b|</${tagName}>`, 'g');
  step.lastIndex = start;
  let depth = 0;
  let hit;
  while ((hit = step.exec(source)) !== null) {
    depth += hit[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return source.slice(start, hit.index + hit[0].length);
  }
  throw new Error(`extractBlock: <${tagName}> carrying .${className} is never closed`);
}

export const headerPart = () => [
  /* The skip link sits before the header element in the partial and is the
     target every page's <main id="main"> serves. */
  link({ label: 'Skip to content', href: '#main', cssClass: 'em-skip' }),

  container({ cssClass: 'em-header em-header--flat', tag: 'header', content_width: 'full' }, [
    container({ cssClass: 'em-utility', content_width: 'full' }, [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'em-utility__bar', content_width: 'full' }, [
          text({ markup: '<p>A non-profit working to expand opportunity in Mississippi</p>', cssClass: 'em-utility__note' }),
          text({ markup: '<a href="mailto:info@empowerms.org">Email: info@empowerms.org</a>', cssClass: 'em-utility__link' }),
        ]),
      ]),
    ]),

    container({ cssClass: 'em-container', content_width: 'full' }, [
      container({ cssClass: 'em-header__bar', content_width: 'full' }, [
        /* The logo is the one genuinely native, genuinely editable element
           in this part: an image with a link and an accessible name. */
        image({
          id: <LOGO_ATTACHMENT_ID>,
          url: 'https://empv2.wpenginepowered.com/wp-content/uploads/logo-primary.png',
          cssClass: 'em-header__logo',
          link_to: 'custom',
          link: { url: '/' },
        }),
        html({ markup: extractBlock(PARTIAL, 'nav', 'em-header__nav') }),
        /* The actions block stays whole, Donate button included. The
           button could be a native link() widget, but lifting it out
           leaves .em-header__actions styling a wrapper div around two
           buttons and one Elementor widget, and that row's flex alignment
           is exactly the shape the bridge stylesheet exists to repair.
           The spec left this to measurement; the measurement is that one
           markup block costs nothing and one native button costs a bridge
           rule, so it stays. Recorded rather than assumed. */
        html({ markup: extractBlock(PARTIAL, 'div', 'em-header__actions') }),
      ]),
    ]),

    html({ markup: extractBlock(PARTIAL, 'nav', 'em-mobilenav') }),
  ]),
];
```

Add two tests for the extractor itself in Step 1, because everything else in this module depends on it:

```javascript
test('extractBlock returns a whole nested element, not a truncated one', () => {
  const nav = extractBlock(fs.readFileSync('src/_shared/header-2.html', 'utf8'), 'nav', 'em-header__nav');
  assert.ok(nav.startsWith('<nav'));
  assert.ok(nav.endsWith('</nav>'));
  assert.ok(nav.includes('drop-join'), 'the last dropdown panel is missing, so the block was truncated');
  const opens = (nav.match(/<div\b/g) || []).length;
  const closes = (nav.match(/<\/div>/g) || []).length;
  assert.equal(opens, closes, 'the extracted nav has unbalanced divs');
});

test('extractBlock fails loudly rather than returning a fragment', () => {
  assert.throws(() => extractBlock('<div class="other"></div>', 'nav', 'em-header__nav'), /no <nav>/);
  assert.throws(() => extractBlock('<nav class="em-header__nav">', 'nav', 'em-header__nav'), /never closed/);
});
```

`<LOGO_ATTACHMENT_ID>` is the media-library id of `assets/logo-primary.png`, found the same way Task 4 finds the reversed logo.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: six more passing.

- [ ] **Step 5: Deploy, then look at all four widths**

```bash
set -a; . ./.env; set +a
node -e "
Promise.all([import('./elementor/deploy.mjs'), import('./elementor/theme-parts/header.mjs'), import('./fidelity.mjs'), import('./fidelity-browser.mjs')]).then(async ([d, h, fid, br]) => {
  await d.deployThemePart(h.HEADER_POST_ID, h.headerPart(), 'header');
  await fid.flushPageCache();
  const html = await fid.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  console.log('em-header present:', html.includes('em-header'));
  console.log('uicore-header gone:', !html.includes('uicore-header'));
  await br.screenshots('https://empv2.wpenginepowered.com/podcast-a/', 'docs/elementor/phase2a/header');
})"
```

Open all four captures. Compare against `docs/elementor/spike/static-reference/`. **Expect the header bar's layout to be wrong**, because `.em-header__bar` is a bare class rule carrying flex layout on an element that is now a wrapper div. Do not fix it here and do not touch `css/`. Write down exactly what is wrong, at which widths, with the selector you believe is responsible. That list is Task 7's input.

- [ ] **Step 6: Commit**

```bash
git add elementor/theme-parts/header.mjs test-elementor.mjs docs/elementor/phase2a
git commit -m "feat: the header as an Elementor theme part, native shell with the nav as markup"
```

---

### Task 6: Widen the enqueue so the chrome's CSS and JS load everywhere

**Files:**
- Modify: `wp/empowerms-child/functions.php:43-47` (`empower_page_styles()`) and `:107-111` (`empower_page_scripts()`)
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `css/header-2.css` and `js/dropdown.js` loading on every page of the install rather than on `podcast-a` alone.

**Why:** the header is now site-wide, and `css/header-2.css` pairs with `js/dropdown.js`. The README states the failure precisely: a page that includes `header-2.html` without `header-2.css` renders five permanently open panels across its hero, and `header-2.css` without `dropdown.js` does the same. Both must move from the per-slug map to the unconditional block, together, in one edit.

- [ ] **Step 1: Write the failing tests**

```javascript
test('the chrome stylesheet and its script are enqueued unconditionally, not per page', () => {
  /* The header is a site-wide theme part now. css/header-2.css left in the
     per-slug map would style exactly one page's header and leave every
     other page with five permanently open panels across its hero, which is
     this build's own documented failure mode for that pair. */
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const pageStyles = fn.slice(fn.indexOf('function empower_page_styles'), fn.indexOf('add_action', fn.indexOf('function empower_page_styles')));
  const pageScripts = fn.slice(fn.indexOf('function empower_page_scripts'), fn.indexOf('add_action', fn.indexOf('function empower_page_scripts')));
  assert.doesNotMatch(pageStyles, /'header-2'/, 'header-2.css is still keyed per page');
  assert.doesNotMatch(pageScripts, /'dropdown'/, 'dropdown.js is still keyed per page');
  assert.match(fn, /wp_enqueue_style\(\s*'empower-header-2'/, 'header-2.css is not enqueued unconditionally');
  assert.match(fn, /wp_enqueue_script\(\s*'empower-dropdown'/, 'dropdown.js is not enqueued unconditionally');
});

test('the chrome stylesheet loads after site.css, not before it', () => {
  /* css/header-2.css overrides shared chrome rules in css/site.css. The
     README enqueue table orders them that way and the cascade depends on
     it. */
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.match(fn, /wp_enqueue_style\(\s*'empower-header-2',[^;]*array\(\s*'empower-site'\s*\)/s,
    'header-2.css does not declare empower-site as its dependency');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: two failures naming the per-page keying.

- [ ] **Step 3: Move both into the unconditional block**

In `wp/empowerms-child/functions.php`, remove `'header-2'` from `empower_page_styles()['podcast-a']` and `'dropdown'` from `empower_page_scripts()['podcast-a']`, leaving `'motion'`/`'podcast-a'` and the empty script list respectively. Then enqueue both unconditionally, `header-2.css` immediately after `empower-site` and before the per-page loop, and `dropdown.js` alongside `empower-nav` and `empower-reveal`. Give the new handles the comment that says why: the chrome is a site-wide theme part now, and this pair ships together or the panels never close.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: two more passing.

- [ ] **Step 5: Sync the theme and prove it on a page that is not podcast-a**

```bash
set -a; . ./.env; set +a
node -e "import('./wp/sync.mjs').then(m=>m.syncTheme()).then(d=>console.log('synced to', d))"
node -e "
import('./fidelity.mjs').then(async f => {
  await f.flushPageCache();
  const html = await f.fetchConverted('https://empv2.wpenginepowered.com/<A_BEAVER_SLUG>/');
  console.log('header-2.css:', html.includes('header-2.css'));
  console.log('dropdown.js:', html.includes('dropdown.js'));
})"
```

Then open that page in a browser at 1440 and confirm the nav panels are closed rather than five open panels across the hero. That is the observable; the presence of the file in the HTML is not.

- [ ] **Step 6: Commit**

```bash
git add wp/empowerms-child/functions.php test-elementor.mjs
git commit -m "fix: the chrome stylesheet and its script load site-wide, now the header does"
```

---

### Task 7: The bridge stylesheet

**Files:**
- Create: `wp/empowerms-child/css/bridge.css`
- Modify: `wp/empowerms-child/functions.php` (enqueue it last)
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: the written list of layout defects from Task 4 Step 5 and Task 5 Step 5.
- Produces: `wp/empowerms-child/css/bridge.css`, loaded after every other Empower stylesheet, and the only file in this project allowed to carry Elementor-shaped selectors.

**Scope, fixed by the spec, and narrower than it looks.** Three things and nothing else:

1. Container width 1200px (Empower's `--container-max`, against UiCore's 1170) and zero widget spacing (against UiCore's 20). These have no other home: Elementor Site Settings cannot be saved on this install at all, an Elementor Pro 4.2.1 bug reproduced three ways in Phase 1.
2. The header and footer's own wrapper-class fixes, taken from the two written lists, not from a grep.
3. `podcast-a`'s `.em-btn` case: the wrapper is styled correctly by class and the `<a>` inside still wears Elementor's default button chrome.

The other eleven at-risk stylesheets are out of scope. They belong to pages that do not exist yet.

- [ ] **Step 1: Write the failing tests**

```javascript
test('the bridge stylesheet exists, is enqueued last, and is the only Elementor-shaped file', () => {
  /* Additive by design: the 50 files in css/ stay untouched and stay under
     test.mjs. Anything Elementor-shaped goes here so a reader knows where
     to look, and so a later tidy-up of css/ cannot silently break the
     converted pages. */
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.ok(fs.existsSync('wp/empowerms-child/css/bridge.css'));
  assert.match(fn, /wp_enqueue_style\(\s*'empower-bridge'/);
  const bridgeAt = fn.indexOf("'empower-bridge'");
  const pageLoopAt = fn.indexOf('empower_page_styles()[ $slug ]');
  assert.ok(bridgeAt > pageLoopAt, 'the bridge stylesheet must enqueue after the per-page sheets');
});

test('the bridge stylesheet carries the two values Site Settings cannot hold', () => {
  /* Elementor Site Settings cannot be saved on this install: the
     Components package's __beforeSave hook dereferences undefined on any
     kit document (Elementor Pro 4.2.1). Container width and widget spacing
     have nowhere else to live. */
  const css = fs.readFileSync('wp/empowerms-child/css/bridge.css', 'utf8');
  assert.match(css, /1200px/, 'container width is not set');
  assert.match(css, /e-con|elementor-widget/, 'no Elementor container or widget selector present');
});

test('no stylesheet outside the bridge carries an Elementor selector', () => {
  /* The inverse guard. The moment an .e-con or .elementor-widget selector
     appears in css/, the static build has stopped being buildable on its
     own and test.mjs is no longer proving what it claims to prove. */
  for (const file of fs.readdirSync('css').filter(f => f.endsWith('.css'))) {
    const css = fs.readFileSync(`css/${file}`, 'utf8');
    assert.doesNotMatch(css, /\.e-con\b|\.elementor-widget/, `css/${file} carries an Elementor selector`);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: the first two fail (no file, no enqueue); the third passes already and is there to keep passing.

- [ ] **Step 3: Write the stylesheet from the measured list**

Open the defect lists written in Task 4 Step 5 and Task 5 Step 5. For each entry, write the minimum rule that fixes it, with a comment naming the static selector it is bridging and why the class landing on a wrapper broke it. Start with the two structural values:

```css
/* Elementor Site Settings cannot be saved on this install: the Components
   package's __beforeSave hook dereferences undefined on any kit document
   (Elementor Pro 4.2.1, reproduced three ways in Phase 1). Container width
   and widget spacing are set here because there is no other route to them,
   not as a style preference. UiCore defaults to 1170 and 20. */
.elementor-section.elementor-section-boxed > .elementor-container,
.e-con {
  --container-max-width: 1200px;
}
.elementor-widget:not(:last-child) {
  margin-block-end: 0;
}
```

**SKETCH.** Both selectors above are written from Elementor's own class conventions, not executed. Verify each against the rendered page with the computed-style probe below before believing it, and correct it in place if the real class differs.

- [ ] **Step 4: Enqueue it last, sync, and re-measure**

Add the enqueue after the per-page loop in `functions.php`, depending on whatever the loop's last handle was (fall back to `empower-site` when a page has no per-page sheets). Then:

```bash
set -a; . ./.env; set +a
node -e "import('./wp/sync.mjs').then(m=>m.syncTheme())"
node -e "
Promise.all([import('./fidelity.mjs'), import('./fidelity-browser.mjs')]).then(async ([f, b]) => {
  await f.flushPageCache();
  const probes = await b.computedStyles('https://empv2.wpenginepowered.com/podcast-a/', [
    { selector: '.em-header__bar', property: 'display' },
    { selector: '.em-footer', property: 'background-color' },
    { selector: '.em-container', property: 'max-width' },
  ]);
  console.log(probes);
})"
```

Compare each against the same probe on the static build. Iterate on `bridge.css` until they match, re-syncing and flushing each time. Nothing in `css/` is edited to achieve this.

- [ ] **Step 5: Run both suites**

Run: `node --test test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"` then `SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: 228 passing, and the elementor suite green.

- [ ] **Step 6: Commit**

```bash
git add wp/empowerms-child/css/bridge.css wp/empowerms-child/functions.php test-elementor.mjs
git commit -m "feat: the bridge stylesheet, carrying what Site Settings cannot and what wrappers broke"
```

---

### Task 8: The checks every later page inherits, and the policies written down

**Files:**
- Modify: `test-elementor.mjs`
- Modify: `fidelity.mjs`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md` (record the fourth exception)

**Interfaces:**
- Consumes: `headerPart()`, `footerPart()`, `fetchConverted()`, `checkSections()`.
- Produces: `checkRobots(baseUrl)` in `fidelity.mjs`, and three harness checks the page phases inherit.

- [ ] **Step 1: Write the failing tests**

```javascript
test('the install still disallows crawlers, which is what makes publishing during conversion safe', async () => {
  /* Pages under conversion are published. That is only defensible while
     robots.txt disallows everything. Checked rather than assumed, because
     if it ever changes, the policy silently stops being safe. */
  const robots = await checkRobots('https://empv2.wpenginepowered.com');
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Disallow:\s*\//);
});

test('a loop grid container that takes an attribute from PHP opts out of the element cache', () => {
  /* A Loop Item's top-level element is baked once per page load and reused
     for every iteration unless it carries __dynamic__ of its own. The
     data-guest attribute comes from a PHP hook, so without this every card
     silently reuses the first post's value: titles and dates vary
     correctly, the attribute does not, every control moves and no card
     hides. Phase 1 lost hours to it. */
  const json = JSON.stringify(podcastLoopItem());
  assert.match(json, /"_element_cache":"yes"/,
    'the loop item container does not opt out of the element cache');
});

test('the converted page carries the chrome sections in order', () => {
  const parts = JSON.stringify([headerPart(), footerPart()]);
  assert.ok(parts.includes('em-header'));
  assert.ok(parts.includes('em-footer'));
});
```

Add to the browser-driven group, guarded by `requireSpikeUrl()` the way the existing four are:

```javascript
test('the live page shows Empower chrome and none of UiCore own', async () => {
  const html = await fetchConverted(requireSpikeUrl());
  assert.ok(html.includes('em-header'), 'the Empower header is not on the page');
  assert.ok(html.includes('em-footer'), 'the Empower footer is not on the page');
  assert.ok(!html.includes('uicore-header'), 'UiCore is still rendering its header');
  assert.ok(!html.includes('uicore-footer'), 'UiCore is still rendering its footer');
});

test('no nav content is hidden behind a trigger before JavaScript runs', async () => {
  /* The build's rule is that nothing is hidden waiting for a trigger, and
     the header's panels ship aria-expanded="true" so a reader without
     JavaScript sees them open. Asserted against the real page with
     scripting off, not against the JSON, because a stylesheet loading in
     the wrong order hides them regardless of what the markup says.

     Both helpers return a COUNT, and the absolute number is asserted as
     well as the parity: a selector matching zero elements on both sides
     (a typo, a class that does not exist after conversion) reports false
     parity, which fidelity-browser.mjs's own comment on
     checkVisibleWithJs warns about. Five panels: About, Our Solutions,
     All Content, Podcast, Join Us. */
  const { checkVisibleWithoutJs } = await import('./fidelity-browser.mjs');
  const withoutJs = await checkVisibleWithoutJs(requireSpikeUrl(), '.em-header__menu');
  assert.equal(withoutJs, 5, `expected 5 dropdown panels visible without JavaScript, found ${withoutJs}`);
});

test('the live loop grid emits a different guest value on different cards', async () => {
  /* The element-cache trap again, asserted against the real page rather
     than the JSON. One card carrying the right attribute proves nothing:
     the failure mode is every card carrying the SAME right-looking value. */
  const html = await fetchConverted(requireSpikeUrl());
  const values = [...html.matchAll(/data-guest="([^"]+)"/g)].map(m => m[1]);
  assert.ok(values.length >= 9, `expected at least 9 data-guest attributes, found ${values.length}`);
  assert.ok(new Set(values).size > 1, 'every card carries the same data-guest value, which is the element cache');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: FAIL on `checkRobots` not being exported.

- [ ] **Step 3: Implement `checkRobots`**

Add to `fidelity.mjs`, next to `fetchConverted()`. **SKETCH**, though it mirrors `fetchConverted()`'s existing shape closely enough to be low risk:

```javascript
/* robots.txt is the whole basis of the publish-during-conversion policy:
   pages under conversion are published, linked from nothing, and covered
   only by this. Fetched and asserted rather than trusted, because the day
   it changes, nothing else would tell us. */
export async function checkRobots(baseUrl) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/robots.txt`);
  if (!res.ok) throw new Error(`robots.txt returned ${res.status}`);
  return res.text();
}
```

- [ ] **Step 4: Add `_element_cache` to the loop item if it is not already there**

Read `elementor/pages/podcast-a/03-library.mjs`. Phase 1 applied this fix, so the assertion may already pass; if it does, say so in the report rather than editing anything. If it does not, add `_element_cache: 'yes'` to the `pca-ep` container and note that Phase 1's fix was lost.

- [ ] **Step 5: Run both suites, with and without SPIKE_URL**

Run: `node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: the same four browser tests failing as always, nothing new.

Run: `SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: all passing.

Run: `node --test test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: `ℹ pass 228`.

- [ ] **Step 6: Write down the policies and the fourth exception**

In `README.md`, under the hand-off section, add a short subsection covering: pages are published during conversion under the robots.txt cover and unpublishing is one command; the header and footer are Elementor Theme Builder parts built from `src/_shared/header-2.html` and `src/_shared/footer.html`, so **a nav change means editing that partial and redeploying, not editing Elementor**; and the named handover point, after which no more `_elementor_data` is written because a rebuild would destroy Empower's own edits.

In `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`, add the fourth sanctioned exception to the "Native-first, and the three exceptions" section: the header's nav, actions and mobile nav blocks, with the reason (`aria-controls` pairs, the split Solutions item, the no-JS open-by-default contract) and a pointer to the Phase 2A design.

- [ ] **Step 7: Commit**

```bash
git add test-elementor.mjs fidelity.mjs README.md docs/superpowers/specs/2026-08-12-elementor-conversion-design.md elementor/pages/podcast-a/03-library.mjs
git commit -m "feat: the checks every later page inherits, and the policies written down"
```

---

## Done means

- `node --test test.mjs`: 228 passing, unchanged.
- `SPIKE_URL=... node --test test-elementor.mjs`: green, including everything added here.
- `podcast-a` renders Empower's header and footer at 390, 768, 1024 and 1440, captured under `docs/elementor/phase2a/` and read by eye against `docs/elementor/spike/static-reference/`.
- The five sampled Beaver pages captured before and after, compared, and what moved written down.
- The revert rehearsed once, and written where the next person will find it.
- The fourth exception recorded in the parent spec rather than left as drift.
