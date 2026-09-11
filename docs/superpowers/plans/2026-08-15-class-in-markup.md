# Class-in-markup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit the static build's classes on the real elements inside text widgets, so `css/` applies unaided, then delete the `bridge.css` rules that existed only to compensate, and convert the remaining pages this way from the start.

**Architecture:** `text()` widgets carry the build's markup verbatim, class included; headings become text widgets carrying real heading markup; images stay `image()` widgets and keep their existing repairs. A factory guard makes the proven-wrong "class in both places" form impossible to ship. The two measuring instruments stop being session scripts and become tests, so every migration is gated by a before/after measurement rather than by eye.

**Tech Stack:** Node's built-in test runner, Playwright (the project's only dependency), WP-CLI over SSH via `wpe.mjs`, Elementor 4.2.2 / Pro 4.2.1.

**Spec:** `docs/superpowers/specs/2026-08-15-class-in-markup-design.md`

## Global Constraints

- The static build does not change: `src/`, `css/`, `js/`, `tokens/`, `components/`, `build.mjs` and `test.mjs` stay untouched.
- `node --test test.mjs` stays at **228** passing.
- No new dependencies.
- No em dashes anywhere, commit messages included. Restructure with commas, colons, parentheses or separate sentences.
- Load credentials with `set -a; . ./.env; set +a`.
- Measuring a CSS or theme change needs BOTH flushes: `flushPageCache()` and `wp cdn-cache flush`. `bridge.css` is versioned by theme version, not mtime, so the CDN will serve the old file otherwise.
- `dist/index.html` is the register of what Empower signed off, not the memory notes.
- A converted page that looks wrong is fixed in `bridge.css`, but the first question is now whether its markup should have carried the class instead.

---

### Task 1: Land the two instruments as tests

The homepage's defects were found by two throwaway scripts. They are load-bearing for thirteen more pages and must not be lost again. A property census keyed on element text, and a box-property sweep over controls and images, find disjoint defect classes: the census cannot see a wrapper that changed the grid, and the sweep cannot see a colour.

**Files:**
- Modify: `fidelity-browser.mjs` (add two exported functions)
- Modify: `test-elementor.mjs` (add two tests)

**Interfaces:**
- Produces: `census(url, opts)` returning `{ [key]: {fontSize, lineHeight, fontFamily, color, background, marginBottom} }` keyed `tag|first 40 chars of text`, with duplicate keys suffixed `#2`, `#3`; and `controlBoxes(url)` returning `{ [key]: {w, h, padding, borderRadius, borderWidth, fontWeight, letterSpacing, fontSize} }` over `a, button, input, select, textarea, img`.
- Consumes: `serveRepoRoot()` and `requireSpikeUrl()`, both already in `test-elementor.mjs`.

- [ ] **Step 1: Write the failing test for the census**

Add to `test-elementor.mjs`:

```js
/* The 32 hand-picked probes reported 31 of 32 matching on a page the census
   found 40 differences on. A curated check set can only find the failures
   somebody already imagined; this enumerates both sides and compares on a key
   the conversion cannot move, which is the element's own text. */
test('every paragraph and heading on the converted homepage matches the static build', { concurrency: 1 }, async () => {
  const { census } = await import('./fidelity-browser.mjs');
  const url = process.env.HOME_URL;
  if (!url) throw new Error('HOME_URL is not set');
  const server = await serveRepoRoot();
  try {
    const live = await census(url);
    const stat = await census(`${server.url}/dist/final.html`);
    const shared = Object.keys(live).filter((k) => stat[k]);
    assert.ok(shared.length > 40, `only ${shared.length} elements matched by text on both sides; the key is not lining up`);
    const diffs = shared.filter((k) => JSON.stringify(live[k]) !== JSON.stringify(stat[k]))
      .map((k) => `${k}: live ${JSON.stringify(live[k])} static ${JSON.stringify(stat[k])}`);
    assert.deepEqual(diffs, [], `${diffs.length} computed-style differences:\n${diffs.join('\n')}`);
  } finally {
    await server.close();
  }
});
```

- [ ] **Step 2: Run it and watch it fail for the right reason**

Run: `set -a; . ./.env; set +a; HOME_URL=https://empv2.wpenginepowered.com/final/ node --test --test-name-pattern='paragraph and heading' test-elementor.mjs`
Expected: FAIL with `Cannot find module` or `census is not a function`, not with a style difference.

- [ ] **Step 3: Implement `census()` in `fidelity-browser.mjs`**

```js
/* Keyed on the element's own text, never on a selector: the conversion moves
   classes onto wrapper divs, so a selector-keyed comparison silently matches
   nothing on one side and scores that as agreement. Scrolls the whole page
   first, because js/reveal.js only reveals on intersection and a lazily loaded
   image settles at a different height before and after. */
export async function census(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    await settle(page);
    return page.evaluate(() => {
      const out = {}; const seen = {};
      for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,p,blockquote')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        let key = `${el.tagName.toLowerCase()}|${text}`;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) key = `${key}#${seen[key]}`;
        /* The margin a converted page renders can legitimately sit on a
           wrapper the static build does not have, so charge the element and
           every widget wrapper around it, stopping at the first container. */
        let mb = parseFloat(cs.marginBottom) || 0;
        let node = el.parentElement;
        while (node && node.matches('.elementor-widget, .elementor-widget-container') && !node.matches('.e-con')) {
          mb += parseFloat(getComputedStyle(node).marginBottom) || 0;
          node = node.parentElement;
        }
        out[key] = {
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          color: cs.color,
          background: cs.backgroundColor,
          marginBottom: `${mb}px`,
        };
      }
      return out;
    });
  } finally {
    await browser.close();
  }
}

async function settle(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: the command from Step 2.
Expected: PASS. If it fails on a real difference, that is a defect on the live page and belongs in its own commit, not this one.

- [ ] **Step 5: Write the failing test for the box sweep**

```js
/* The census compares values. This compares boxes, and the two find disjoint
   defects: a Loop Grid wrapper cost 222px of card height with every property on
   both sides agreeing, and a kit padding pushed the nav 258px wide while no
   colour moved. Anchors inside Elementor's button widget are skipped: link()
   renders the pill on the WRAPPER and the anchor fills it, which is by design
   and measured correct against the static build's own anchor. */
test('every control and image on the converted homepage matches the static build box for box', { concurrency: 1 }, async () => {
  const { controlBoxes } = await import('./fidelity-browser.mjs');
  const url = process.env.HOME_URL;
  if (!url) throw new Error('HOME_URL is not set');
  const server = await serveRepoRoot();
  try {
    for (const width of [1440, 390]) {
      const live = await controlBoxes(url, { width });
      const stat = await controlBoxes(`${server.url}/dist/final.html`, { width });
      const shared = Object.keys(live).filter((k) => stat[k]);
      const diffs = shared.filter((k) => JSON.stringify(live[k]) !== JSON.stringify(stat[k]))
        .map((k) => `@${width} ${k}: live ${JSON.stringify(live[k])} static ${JSON.stringify(stat[k])}`);
      assert.deepEqual(diffs, [], `${diffs.length} box differences at ${width}px:\n${diffs.join('\n')}`);
    }
  } finally {
    await server.close();
  }
});
```

- [ ] **Step 6: Run it and watch it fail**

Run: `set -a; . ./.env; set +a; HOME_URL=https://empv2.wpenginepowered.com/final/ node --test --test-name-pattern='box for box' test-elementor.mjs`
Expected: FAIL with `controlBoxes is not a function`.

- [ ] **Step 7: Implement `controlBoxes()` in `fidelity-browser.mjs`**

```js
export async function controlBoxes(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    await settle(page);
    return page.evaluate(() => {
      const out = {}; const seen = {};
      for (const el of document.querySelectorAll('a,button,input,select,textarea,img')) {
        if (el.closest('.elementor-widget-button')) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        let key = `${el.tagName.toLowerCase()}|${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20)
          || el.getAttribute('alt') || '?'}`;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) key = `${key}#${seen[key]}`;
        out[key] = {
          w: Math.round(r.width), h: Math.round(r.height),
          padding: cs.padding, borderRadius: cs.borderRadius, borderWidth: cs.borderWidth,
          fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize,
        };
      }
      return out;
    });
  } finally {
    await browser.close();
  }
}
```

- [ ] **Step 8: Run the whole suite**

Run: `set -a; . ./.env; set +a; SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ HOME_URL=https://empv2.wpenginepowered.com/final/ npm test`
Expected: 228 static, 127 Elementor, 0 failures.

- [ ] **Step 9: Commit**

```bash
git add fidelity-browser.mjs test-elementor.mjs
git commit -m "test: the two instruments that found the homepage's defects become tests

A property census keyed on element text, and a box sweep over controls and
images at two widths. They find disjoint defect classes: the census cannot see
a wrapper that changed a grid row, and the sweep cannot see a colour. Both were
session scripts, which is how the same defects went unnoticed for a week."
```

---

### Task 2: Make the wrong form impossible to ship

The spike proved that carrying the class in the markup AND on the widget is worse than either alone: the widget class makes `bridge.css`'s class-on-wrapper repair match and zero the inner element. A reviewer will not catch that reliably.

**Files:**
- Modify: `elementor/factory.mjs` (`text()`)
- Modify: `test-elementor.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `text()` throws `Error` when `cssClass` names a class that the markup already carries.

- [ ] **Step 1: Write the failing tests**

```js
test('text() refuses a cssClass the markup already carries', () => {
  assert.throws(
    () => text({ markup: '<p class="em-eyebrow">x</p>', cssClass: 'em-eyebrow' }),
    /em-eyebrow/,
    'the belt-and-braces form measured WORSE than either alone and must not be constructible',
  );
});

test('text() still accepts a cssClass the markup does not carry', () => {
  const made = text({ markup: '<p class="em-eyebrow">x</p>', cssClass: 'zz-layout-hook' });
  assert.equal(made.settings._css_classes, 'zz-layout-hook');
});

test('no page module or theme part builds a heading widget', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  const dirs = ['elementor/pages/final', 'elementor/pages/podcast-a', 'elementor/theme-parts'];
  const offenders = [];
  for (const dir of dirs) {
    for (const f of await readdir(dir)) {
      if (!f.endsWith('.mjs')) continue;
      const src = await readFile(`${dir}/${f}`, 'utf8');
      if (/(^|[^a-zA-Z_$.])heading\s*\(/m.test(src.replace(/\/\*[\s\S]*?\*\//g, ''))) offenders.push(`${dir}/${f}`);
    }
  }
  assert.deepEqual(offenders, [],
    'heading() cannot put a class on the heading element, and Elementor sets line-height:1 on heading widgets at 0,2,0; use text() with real heading markup');
});
```

- [ ] **Step 2: Run and watch all three fail**

Run: `node --test --test-name-pattern='text\(\) refuses|text\(\) still accepts|heading widget' test-elementor.mjs`
Expected: first two FAIL (no throw / no guard), third FAILS listing the current `heading()` callers.

- [ ] **Step 3: Implement the guard in `elementor/factory.mjs`**

```js
/* The class travels in the MARKUP now (see
   docs/superpowers/specs/2026-08-15-class-in-markup-design.md). Passing the
   same class both ways is not redundancy, it is a conflict: the widget class
   makes bridge.css's class-on-wrapper repair match the wrapper and zero the
   real element, which the spike on post 20591 measured directly. cssClass
   stays available for a class the markup does NOT carry, which is how a
   layout hook on the wrapper is still expressed. */
export const text = ({ markup, cssClass = '', ...rest } = {}) => {
  for (const c of cssClass.split(/\s+/).filter(Boolean)) {
    if (new RegExp(`class="[^"]*\\b${c}\\b`).test(markup)) {
      throw new Error(`text(): cssClass "${c}" is already carried by the markup. The class belongs in one place, and measurement says that place is the markup.`);
    }
  }
  return el('widget', { editor: markup, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'text-editor' });
};
```

- [ ] **Step 4: Run the first two tests and watch them pass**

Run: `node --test --test-name-pattern='text\(\) refuses|text\(\) still accepts' test-elementor.mjs`
Expected: PASS. The heading test stays red until Tasks 3 to 5 land; that is correct and is the point.

- [ ] **Step 5: Commit**

```bash
git add elementor/factory.mjs test-elementor.mjs
git commit -m "feat: text() refuses a cssClass the markup already carries

The spike measured the both-places form as worse than either alone: the widget
class makes bridge.css's class-on-wrapper repair match and zero the real
element. A reviewer will not catch that reliably, so the factory does.

The heading-widget test lands red on purpose and goes green as the three
migration tasks land."
```

---

### Task 3: Migrate the theme parts

Smallest surface (7 `text()`, 2 `heading()`), highest leverage, since the header and footer are on every page. Both currently measure exactly against the static build, so any regression is unambiguous.

**Files:**
- Modify: `elementor/theme-parts/header.mjs`, `elementor/theme-parts/footer.mjs`
- Modify: `wp/empowerms-child/css/bridge.css` (delete the repairs this makes redundant)

**Interfaces:**
- Consumes: `text()` from Task 2.
- Produces: nothing other tasks import.

- [ ] **Step 1: Record the before state**

Run: `set -a; . ./.env; set +a; HOME_URL=https://empv2.wpenginepowered.com/final/ node --test --test-name-pattern='paragraph and heading|box for box' test-elementor.mjs`
Expected: PASS. Write the pass into the commit message later; a migration that starts from a failing measurement cannot prove anything.

- [ ] **Step 2: Move each class into the markup**

In `header.mjs` and `footer.mjs`, for every `text({ markup, cssClass })` call, move the class onto the markup's root element and drop `cssClass`. Replace each `heading({ text, tag, cssClass })` with `text({ markup: '<hN class="...">...</hN>' })`, reading the tag and class from the matching element in `src/_shared/header-2.html` or the footer partial. Example, from `.em-utility__note`:

```js
// before
text({ markup: '<p>A non-profit working to expand opportunity in Mississippi</p>', cssClass: 'em-utility__note' })
// after
text({ markup: '<p class="em-utility__note">A non-profit working to expand opportunity in Mississippi</p>' })
```

- [ ] **Step 3: Deploy the parts and flush both caches**

```bash
set -a; . ./.env; set +a
node -e "import('./elementor/theme-parts/deploy.mjs').then(m => m.main())"
node -e "import('./wpe.mjs').then(async m => { await m.wpe('wp cdn-cache flush'); await m.wpe('wp page-cache flush'); })"
```

- [ ] **Step 4: Measure, and expect the header and footer to be unchanged**

Run the Step 1 command again.
Expected: PASS, with the same numbers. The classes now arrive from the markup rather than from `bridge.css`, so nothing should move.

- [ ] **Step 5: Delete the repairs this makes redundant, one at a time**

Delete from `bridge.css`, re-measuring after each: `.em-utility__note p`, `.em-footer .em-container .em-footer__mission.elementor-widget`, `.em-footer .em-container .em-footer__legal.elementor-widget`, and `.elementor .em-footer__top h3` from the heading line-height group. Keep `.em-utility__link a`, `.em-header__bar > .elementor-widget-html`, `.em-footer__logo .elementor-widget-image`, the skip link, and everything in the button group: none of those are class-on-wrapper.

Sync and flush after each deletion:

```bash
set -a; . ./.env; set +a
node -e "import('./wp/sync.mjs').then(m => m.syncTheme())"
node -e "import('./wpe.mjs').then(async m => { await m.wpe('wp cdn-cache flush'); await m.wpe('wp page-cache flush'); })"
```

- [ ] **Step 6: Run the whole suite**

Run: `set -a; . ./.env; set +a; SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ HOME_URL=https://empv2.wpenginepowered.com/final/ npm test`
Expected: 228 static, 127 Elementor, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add elementor/theme-parts wp/empowerms-child/css/bridge.css
git commit -m "refactor: the header and footer carry their classes in the markup

Nine widgets, and four bridge rules deleted with them. Both parts measured
identical to the static build before and after, which is the point: the classes
now arrive from the markup instead of from a repair, and nothing moved."
```

---

### Task 4: Migrate the homepage and delete what it makes redundant

29 widgets (20 `text()`, 9 `heading()`) and the largest block of rules in `bridge.css`.

**Files:**
- Modify: `elementor/pages/final/01-hero.mjs` through `06-joinus.mjs`
- Modify: `wp/empowerms-child/css/bridge.css`

- [ ] **Step 1: Record the before state**

Run: `set -a; . ./.env; set +a; HOME_URL=https://empv2.wpenginepowered.com/final/ node --test --test-name-pattern='paragraph and heading|box for box' test-elementor.mjs`
Expected: PASS.

- [ ] **Step 2: Move the classes into the markup, one section module at a time**

For each of the six modules: every `text({ markup, cssClass })` becomes `text({ markup })` with the class on the markup's root element, and every `heading({ text, tag, cssClass })` becomes `text({ markup: '<hN class="...">...</hN>' })`. Read the tag, the class and the copy from the matching element in `dist/final.html`, never from memory. A heading with no class in the static build still becomes a text widget carrying the bare `<hN>`, because that is what removes Elementor's `line-height:1`.

- [ ] **Step 3: Deploy and flush**

```bash
set -a; . ./.env; set +a
node -e "import('./elementor/pages/final/page.mjs').then(async p => { const d = await import('./elementor/deploy.mjs'); console.log(await d.deployPage(p.POST_ID, p.sections())); })"
node -e "import('./wpe.mjs').then(async m => { await m.wpe('wp cdn-cache flush'); await m.wpe('wp page-cache flush'); })"
```

- [ ] **Step 4: Measure**

Run the Step 1 command.
Expected: PASS. Any failure here is the migration's own defect and is fixed before proceeding, not papered over in `bridge.css`.

- [ ] **Step 5: Delete the class-on-wrapper group, re-measuring before each deletion**

From `bridge.css`, delete: the fourteen-selector `margin:0` group, the six `margin-block-end` wrapper rules, `.elementor .em-article__title h3`, and the four-selector heading line-height rule. Re-measure between each. **Keep** every image rule, the Loop Grid `display:contents` group, the container group, the button group, the flex-container margin rule, and the two positional rules (`.em-join__way > .elementor-widget-text-editor`, `.pca-about__copy > ...`), which are about position among siblings rather than about a class.

- [ ] **Step 6: Run the whole suite and screenshot the page**

Run the full suite as in Task 3 Step 6, then capture the homepage at 1440 and 390 and look at it. The instruments do not see everything; a person still has to look.

- [ ] **Step 7: Commit**

```bash
git add elementor/pages/final wp/empowerms-child/css/bridge.css
git commit -m "refactor: the homepage carries its classes in the markup

Twenty-nine widgets, and the whole class-on-wrapper group deleted from
bridge.css with them: fourteen selectors of margin repair, six wrapper margins,
the article-title size repair and the heading line-heights. Every one of those
was a copy of a declaration in css/ that would have gone stale the day somebody
edited the stylesheet.

Measured identical to the static build before and after, on both instruments."
```

---

### Task 5: Migrate podcast-a

14 widgets (10 `text()`, 4 `heading()`). Same shape as Task 4, against `dist/podcast-a.html` and `SPIKE_URL`.

**Files:**
- Modify: `elementor/pages/podcast-a/01-hero.mjs`, `02-about.mjs`, `03-library.mjs`
- Modify: `wp/empowerms-child/css/bridge.css`

- [ ] **Step 1: Record the before state**

Run: `set -a; . ./.env; set +a; SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ npm test`
Expected: 228 and 127, 0 failures.

- [ ] **Step 2: Move the classes into the markup**

As Task 4 Step 2, reading from `dist/podcast-a.html`.

- [ ] **Step 3: Deploy and flush**

```bash
set -a; . ./.env; set +a
node -e "import('./elementor/pages/podcast-a/page.mjs').then(async p => { const d = await import('./elementor/deploy.mjs'); console.log(await d.deployPage(p.POST_ID, p.sections())); })"
node -e "import('./wpe.mjs').then(async m => { await m.wpe('wp cdn-cache flush'); await m.wpe('wp page-cache flush'); })"
```

- [ ] **Step 4: Delete podcast-a's class-on-wrapper repairs, re-measuring before each**

Delete the four-selector `margin:0` group (`.pca-eyebrow p`, `.pca-hero__lede p`, `.pca-about__copy .pca-lede p`, `.pca-about__where p`), the three `margin-block-end` wrapper rules, and `.elementor .pca-about__where p` with its three `inherit` declarations. Keep `.elementor .pca-about__copy > .elementor-widget-text-editor:not(:last-child)`, which is positional.

- [ ] **Step 5: Run the whole suite**

Expected: 228 and 127, 0 failures, and the heading-widget test from Task 2 now passes because no module builds one.

- [ ] **Step 6: Commit**

```bash
git add elementor/pages/podcast-a wp/empowerms-child/css/bridge.css
git commit -m "refactor: podcast-a carries its classes in the markup

Fourteen widgets and eight bridge rules. The heading-widget guard from the
factory task goes green with this commit: no page module or theme part builds
one any more."
```

---

### Task 6: Convert `what-we-do-a`, the first page built this way

The cheapest page in the re-priced order at two new classes, so it measures the real per-page cost of the new pattern rather than an optimistic one.

**Files:**
- Create: `elementor/pages/what-we-do-a/01-*.mjs` through `NN-*.mjs`, one per section of `dist/what-we-do-a.html`
- Create: `elementor/pages/what-we-do-a/media.mjs`, `page.mjs`
- Modify: `wp/empowerms-child/functions.php` (add the slug to `empower_page_styles()` if its stylesheet is not already mapped)

**Interfaces:**
- Consumes: `container()`, `text()`, `image()`, `link()` from `elementor/factory.mjs`; `deployPage()` from `elementor/deploy.mjs`.
- Produces: `POST_ID` and `sections()` from `page.mjs`, the same contract `final/page.mjs` and `podcast-a/page.mjs` expose.

- [ ] **Step 1: Create the page and record its id**

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(async m => console.log(await m.wpe('wp post create --post_type=page --post_title=\"What We Do\" --post_name=what-we-do-a --post_status=publish --porcelain')))"
```

- [ ] **Step 2: Import the page's photographs and record their attachment ids in `media.mjs`**

Follow `elementor/pages/final/media.mjs`, which documents the shape and the alt-text rule: alt text is a media-library property, not a widget setting, so it is set on the attachment.

- [ ] **Step 3: Build the section modules, reading markup from `dist/what-we-do-a.html`**

Every paragraph and heading is a `text()` carrying the static build's own element and class. Every photograph is an `image()`. Containers mirror the static build's block structure.

- [ ] **Step 4: Deploy, flush both caches, and measure**

Run the census and box sweep against the new URL and `dist/what-we-do-a.html`, by setting `HOME_URL` to the new page and pointing the test's static path at it. Record how many `bridge.css` rules the page needs. **That number is the deliverable of this task**, because it re-prices the remaining twelve.

- [ ] **Step 5: Commit**

```bash
git add elementor/pages/what-we-do-a wp/empowerms-child
git commit -m "feat: what-we-do-a converted, the first page built class-in-markup

Records the real per-page cost of the new pattern, which is what prices the
remaining twelve."
```

---

### Remaining twelve pages

Task 6 is the recipe. Repeat it per page in the re-priced order from
`docs/elementor/phase2b/2026-08-15-uicore-removal-and-repricing.md` section 6:
`team-bio`, `solutions-b`, `capitol-a`, `team-a`, `who-we-are-a`, `mail-a`,
`amb-a`, `epic-a`, `safety`, `work`, `education`, `give-c`.

Two notes carried from the re-pricing, both of which change what a page costs
and neither of which is visible in the class count:

- `safety`, `work` and `education` are one conversion and two fills, measured at 13 new classes then 0 then 1.
- The second column of that table, unclassed paragraphs and headings, is where the slow work is: those cannot be repaired by naming a class and need the positional or structural rules that took longest on the homepage. `education` (26), `work` (22), `safety` (21) and `who-we-are-a` (18) are the pages that carry it.

Re-price again after three pages are done. The first estimate was built from
one page and was wrong in both directions.
