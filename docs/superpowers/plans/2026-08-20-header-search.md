# Header Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the header's search icon open a working search overlay, and replace Beaver Builder's leftover search results page with an Elementor archive template this build owns.

**Architecture:** The overlay is authored inline in `elementor/theme-parts/header.mjs` as an `html()` widget carrying a native GET form, behaviour added by a new destination-only child-theme script, styling added as one numbered `bridge.css` block. The results page is a new Elementor `search-results` theme-builder document, deployed by a new `elementor/theme-parts/search-archive.mjs` and rendered through the `elementor_theme_do_location('archive')` call that `wp/empowerms-child/search.php` already makes. Beaver Themer's claim on search is released last, reversibly, once ours is proven to render.

**Tech Stack:** Node 25 ESM (no build step), `node --test`, WP-CLI over SSH via `wpe.mjs`, rsync via `wp/sync.mjs`, WordPress 7.0.4, Elementor 4.2.2, Elementor Pro 4.2.1.

**Spec:** `docs/superpowers/specs/2026-08-20-header-search-design.md`

## Global Constraints

- **No em dashes anywhere.** Code, comments, copy, commit messages. Commas, colons, parentheses or separate sentences instead. Hyphens in compound words and ranges are fine.
- **The static build is frozen.** Do not edit `src/`, `js/`, `css/`, `components/`, `tokens/`, `patterns/` or `assets/`. `functions.php:479` names `js/` as protected. Everything this plan adds to the front end goes in `wp/empowerms-child/` or `elementor/`.
- **The working tree is dirty with someone else's in-flight work.** As of 2026-08-20 13:14 the branch carries uncommitted team-a Loop Grid work: modified `elementor/pages/register.mjs`, four `elementor/pages/team-a/*.mjs`, `wp/empowerms-child/css/bridge.css` (blocks 56 to 60), `wp/empowerms-child/functions.php`, plus untracked `elementor/pages/team-a/loop-item.mjs`, `elementor/theme-parts/person-single.mjs`, `wp/empowerms-child/inc/person-loop.php` and `measure-tmp.mjs`. **Do not stash, revert or commit any of it.** Two files in this plan are seams that work also needs: `elementor/deploy.mjs:128` (`THEME_PART_LOCATIONS`) and the `trees` array in `test-elementor.mjs`. Read both immediately before editing, and if `person-single.mjs` has already extended them, extend what is there rather than replacing it.
- **Your `bridge.css` block numbers are 71 and 72, deliberately leaving a gap.** A parallel session in the main tree is adding blocks to the same file and has already taken 55 through 62, moving from 60 to 62 in under an hour. Numbering yours immediately after theirs would collide again the moment they add one more. 63 to 70 are left free as headroom for them, and the gap is deliberate: say so in your block comment so it never reads as an accident.
- **Cache-bust with `?nocache=<ts>`, never `?s=` or `?w=`.** Those are WordPress query vars and return a 200-shaped 404. See `empowerms-reserved-query-vars`. This plan searches with `?s=` deliberately, which makes the distinction load-bearing: a `?s=` fetch that returns the 404 page still returns 200 and still renders the real header and footer.
- **Exact Elementor values, read from Elementor Pro 4.2.1's own source, not guessed:** document type `search-results`, sub-type `search`, class `ElementorPro\Modules\ThemeBuilder\Documents\Search_Results` extending `Archive`, condition string `include/archive/search`, render location `archive`.
- **Commit after every task.** Never bundle two tasks into one commit.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `elementor/deploy.mjs` | Modify (line 128) | Add `'search-results'` to `THEME_PART_LOCATIONS` so `deployThemePart()` will accept the new document type |
| `elementor/theme-parts/header.mjs` | Modify | Add the overlay panel widget; record the static-build divergence in its comment |
| `elementor/theme-parts/search-archive.mjs` | Create | The search results tree, its post id and its condition |
| `elementor/theme-parts/search-result-item.mjs` | Create | The Loop Item template for one result card, and its post id |
| `elementor/theme-parts/deploy.mjs` | Modify | Add `search-archive` to the CLI so the new part can be redeployed |
| `wp/empowerms-child/theme-js/search.js` | Create | Overlay open/close behaviour, focus management, Escape and click-outside |
| `wp/empowerms-child/functions.php` | Modify | Enqueue the new script and add its handle to `empower_module_script_handles()` |
| `wp/empowerms-child/css/bridge.css` | Modify | Block 71 (overlay) and block 72 (results page) |
| `test-elementor.mjs` | Modify | New tests, plus the `trees` array entry `discoverTrees()` will demand |
| `docs/elementor/phase2b/2026-08-20-search.md` | Create | The task report: what was measured, what was moved aside, and the command that puts Beaver back |

---

## Task 1: Teach `deployThemePart()` about archive documents

`deployThemePart()` refuses any location outside `THEME_PART_LOCATIONS`, which today is `['header', 'footer']`. Nothing else in this plan can deploy until it accepts the search results document type.

> **CORRECTED 2026-08-20, after this task was first implemented.** The steps below as
> originally written said `'archive'`, and that was wrong. `deployElements()` writes its
> third argument verbatim into `_elementor_template_type`, so that argument is the
> Elementor DOCUMENT TYPE, not the render location, despite `deployThemePart()` naming
> its parameter `location`. Header and footer hide the distinction because their type
> and their location are the same string. Search results is the first case where they
> differ: `Search_Results::get_type()` is `search-results` and it inherits Archive's
> `archive` render location. **The value is `'search-results'`.** The condition
> (`include/archive/search`) and the render location (`archive`) never changed and were
> always right. The literal step text below is left as first written, so the record
> shows what was specified as well as what was corrected.

**Files:**
- Modify: `elementor/deploy.mjs:128`
- Test: `test-elementor.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `deployThemePart(postId, elements, 'search-results')` no longer throws on its type check. `THEME_PART_LOCATIONS` becomes `['header', 'footer', 'search-results']`.

- [ ] **Step 1: Read the seam before touching it**

The in-flight `person-single.mjs` work may already have edited this line.

```bash
sed -n '118,150p' elementor/deploy.mjs
git diff elementor/deploy.mjs
```

If `THEME_PART_LOCATIONS` already contains entries beyond `header` and `footer`, add `'search-results'` to what is there. Do not replace the array.

- [ ] **Step 2: Write the failing test**

Add to `test-elementor.mjs`, near the other `deployThemePart` tests (search for `deployThemePart writes the header template type`):

```js
/* The search results template is the build's first theme part that is neither
   header nor footer. 'archive' here is Elementor Pro's own render LOCATION,
   which Search_Results inherits from Archive, and it is what
   wp/empowerms-child/search.php already asks for at line 12. The document
   TYPE is 'search-results' and the two are deliberately different strings;
   see search-archive.mjs for which is written where. */
test('deployThemePart accepts the archive location and still refuses an invented one', async () => {
  assert.ok(THEME_PART_LOCATIONS.includes('archive'),
    'THEME_PART_LOCATIONS does not include archive, so the search results part can never deploy');
  await assert.rejects(
    () => deployThemePart(1, [], 'sidebar'),
    /location must be one of/,
    'deployThemePart no longer refuses a location that is not a real document type');
});
```

Add `THEME_PART_LOCATIONS` to the existing import from `./elementor/deploy.mjs` at the top of `test-elementor.mjs`, and export it from `elementor/deploy.mjs` by changing `const THEME_PART_LOCATIONS` to `export const THEME_PART_LOCATIONS`.

- [ ] **Step 3: Run the test and watch it fail**

```bash
node --test --test-name-pattern='deployThemePart accepts the archive location' test-elementor.mjs
```

Expected: FAIL, `THEME_PART_LOCATIONS does not include archive`.

- [ ] **Step 4: Make it pass**

At `elementor/deploy.mjs:128`, extend the array and the comment above it. The existing comment explains that the value is the Elementor document type rather than a label, so it needs the new entry explained rather than just listed:

```js
/* ... existing comment, then: */
/* 'archive' is the third, added 2026-08-20 for the search results template.
   Unlike header and footer it is the RENDER LOCATION rather than the
   document type: Elementor Pro's Search_Results document
   (modules/theme-builder/documents/search-results.php) returns
   'search-results' from get_type() and 'search' from get_sub_type(), and
   inherits its location from Archive. wp/empowerms-child/search.php:12 asks
   for the 'archive' location, so that is the string this validation gate is
   about. search-archive.mjs writes the document type separately. */
export const THEME_PART_LOCATIONS = ['header', 'footer', 'archive'];
```

- [ ] **Step 5: Run the test and the whole suite**

```bash
node --test --test-name-pattern='deployThemePart' test-elementor.mjs
node --test test-elementor.mjs 2>&1 | tail -5
node --test test.mjs 2>&1 | tail -5
```

Expected: the new test passes, and no previously-passing test has gone red.

- [ ] **Step 6: Commit**

```bash
git add elementor/deploy.mjs test-elementor.mjs
git commit -m "feat(elementor): let deployThemePart write an archive-location part

THEME_PART_LOCATIONS has been ['header','footer'] since Phase 2A and the
gate exists so a wrong location cannot silently write a real document type
onto a library post Elementor then never renders. The search results
template is the first part that is neither, so the gate needs a third
entry rather than a way around it.

'archive' is the render location, not the document type, and the two are
different strings here: Elementor Pro's Search_Results document returns
'search-results' from get_type() and 'search' from get_sub_type() while
inheriting Archive's location. search.php already asks for 'archive'.
Both values read from the plugin's own source on empv2.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: The overlay panel in the header tree

The header's search button has been decoration since Phase 2A. This gives it a panel to control and a form that works without JavaScript.

**Files:**
- Modify: `elementor/theme-parts/header.mjs`
- Test: `test-elementor.mjs`

**Interfaces:**
- Consumes: `container`, `html` from `../factory.mjs` (already imported).
- Produces: `headerPart()` returns one more child inside the `.em-header` container. The panel's DOM id is `site-search`; the input's id is `site-search-input`. `wp/empowerms-child/theme-js/search.js` (Task 3) and `bridge.css` block 71 (Task 4) both key on `.em-search`, `.em-search__form`, `.em-search__input` and `.em-header__search`.

- [ ] **Step 1: Write the failing test**

Add to `test-elementor.mjs`, near the other header part tests:

```js
/* The overlay exists ONLY in the Elementor build. src/_shared/header-2.html
   still carries a decorative button with no form, because js/ and src/ are
   the protected static build (functions.php:479). That divergence is the
   whole reason this test is structural rather than a comparison against the
   static partial: there is nothing on the static side to compare to, and a
   fidelity-shaped test here would either fail forever or quietly stop
   checking anything. */
test('the header carries a search panel with a native GET form', () => {
  const widgets = [];
  (function walk(nodes) {
    for (const n of nodes) {
      if (n.elType === 'widget') widgets.push(n);
      if (n.elements?.length) walk(n.elements);
    }
  })(headerPart());

  const panel = widgets.find(w => w.widgetType === 'html' && /class="em-search"/.test(w.settings.html ?? ''));
  assert.ok(panel, 'no html widget in the header carries .em-search');

  const markup = panel.settings.html;
  assert.match(markup, /<form[^>]+method="get"/, 'the search panel form is not a GET form');
  assert.match(markup, /<form[^>]+action="\/"/, 'the search panel form does not post to the site root');
  assert.match(markup, /<form[^>]+role="search"/, 'the search panel form has no role="search"');
  assert.match(markup, /name="s"/, 'the search input is not named s, so WordPress will never see the query');
  assert.match(markup, /id="site-search"/, 'the panel has no id for aria-controls to point at');
  assert.match(markup, /<label[^>]+for="site-search-input"/, 'the search input has no label');
  assert.match(markup, /type="submit"/, 'the form has no submit control, so it cannot be used without JavaScript');
});

/* SearchWP Live Ajax Search is active and enabled on the install
   (searchwp_live_search_settings: enable-live-search true). Left alone it
   binds itself to any input[name="s"] and injects its own results pane, its
   own markup and its own stylesheet into our header. data-swplive="false"
   is the plugin's own opt-out, read from its shipped JavaScript
   (assets/javascript/dist/script.js) rather than from its documentation.
   This assertion is what stops the opt-out being lost in a later edit
   without anything reporting it: the failure mode is a third party's
   dropdown appearing in the most-seen component on the site. */
test('the header search input opts out of SearchWP Live Ajax Search', () => {
  const markup = JSON.stringify(headerPart());
  assert.match(markup, /data-swplive=\\"false\\"/,
    'the search input does not carry data-swplive="false"');
});

/* The button was <button type="button"> with an aria-label and nothing else
   from Phase 2A until 2026-08-20. A control that toggles a panel needs to
   say so, and the two attributes have to agree with the panel's real id or
   the relationship exists only in the markup's intention. */
test('the header search button is a real disclosure control', () => {
  const markup = JSON.stringify(headerPart());
  assert.match(markup, /class=\\"em-header__search\\"[^>]*aria-expanded=\\"false\\"/,
    'the search button has no aria-expanded, so it is still decoration');
  assert.match(markup, /aria-controls=\\"site-search\\"/,
    'the search button does not point at the panel it controls');
});
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
node --test --test-name-pattern='search' test-elementor.mjs
```

Expected: three failures, the first being `no html widget in the header carries .em-search`.

- [ ] **Step 3: Add the panel to `header.mjs`**

Two edits. First, the button. It currently arrives inside the actions block, which is lifted verbatim out of the frozen static partial by `extractBlock(PARTIAL, 'div', 'em-header__actions')`. The static partial cannot be edited, so the extracted markup is patched on the way through, and the patch is a single explicit replacement rather than a general rewrite:

```js
/* THE ONE PLACE THE ELEMENTOR HEADER DELIBERATELY DIVERGES FROM THE STATIC
   BUILD, 2026-08-20, on Paolo's decision.
 *
 * src/_shared/header-2.html:80 carries a search button with an aria-label, an
 * SVG and nothing else: no form, no handler, no panel. It has been decoration
 * since Phase 2A. Making it work needs markup and a script, and js/ and src/
 * are the protected static build (see functions.php:479, which records what
 * happened the last time js/ was edited). So the working search lives here
 * and in wp/empowerms-child/, and the static hand-off keeps an inert icon.
 *
 * That is a divergence, and the only thing that makes it safe rather than a
 * defect is that it is written down: here, in todo.md, and in
 * docs/superpowers/specs/2026-08-20-header-search-design.md. Anyone comparing
 * the two headers will find this difference; this comment is what tells them
 * it was chosen.
 *
 * The patch is a literal single replacement rather than a regex rewrite of
 * the button, because extractBlock() hands back the static markup verbatim
 * and the useful property of that is that it is verbatim. A targeted
 * replace that throws when its target is absent keeps the failure loud: if
 * the static partial ever changes shape, this stops rather than silently
 * emitting a button with no aria-expanded. */
const withSearchControl = (actions) => {
  const target = '<button class="em-header__search" type="button" aria-label="Search">';
  if (!actions.includes(target)) {
    throw new Error('header.mjs: the actions block no longer contains the search button this patch targets');
  }
  return actions.replace(
    target,
    '<button class="em-header__search" type="button" aria-label="Search" aria-expanded="false" aria-controls="site-search">'
  );
};
```

Then the panel itself, authored here rather than extracted, since there is nothing to extract:

```js
/* The panel. Authored in this file, not lifted from the static partial,
   because the static partial does not have one and cannot be given one.
 *
 * It is a plain GET form to the site root. /?s= is what the install already
 * answers correctly (measured 2026-08-20: /?s=education returns 200 and
 * twelve results), which means this markup works with JavaScript off. That
 * is the same contract js/nav.js and js/dropdown.js state for themselves:
 * the markup ships usable and the script adds the closed-by-default
 * behaviour. Without theme-js/search.js the panel is simply an open search
 * form under the header, which is worse-looking and still works.
 *
 * data-swplive="false" opts the input out of SearchWP Live Ajax Search,
 * which is active and enabled on this install and would otherwise attach a
 * typeahead pane of its own markup and CSS to it.
 *
 * The label is real and visible to screen readers. It is visually hidden by
 * bridge.css block 61 rather than by a placeholder attribute standing in for
 * it, because a placeholder is not an accessible name. */
const SEARCH_PANEL = `<div class="em-search" id="site-search" hidden>
  <div class="em-container">
    <form class="em-search__form" role="search" method="get" action="/">
      <label class="em-search__label" for="site-search-input">Search this site</label>
      <input class="em-search__input" id="site-search-input" type="search" name="s" data-swplive="false" autocomplete="off">
      <button class="em-search__submit em-btn em-btn--primary em-btn--sm" type="submit">Search</button>
    </form>
  </div>
</div>`;
```

Wire both into the returned tree. The actions widget changes from `extractBlock(...)` to `withSearchControl(extractBlock(...))`, and the panel becomes a new child of the `.em-header` container, placed after the `.em-container` holding the bar and before `.em-mobilenav`:

```js
        html({ markup: withSearchControl(extractBlock(PARTIAL, 'div', 'em-header__actions')) }),
```

```js
    html({ markup: SEARCH_PANEL }),

    html({ markup: extractBlock(PARTIAL, 'nav', 'em-mobilenav') }),
```

- [ ] **Step 4: Run the tests and the suite**

```bash
node --test --test-name-pattern='search' test-elementor.mjs
node --test test-elementor.mjs 2>&1 | tail -5
```

Expected: the three new tests pass. Watch specifically for the `content_width` walk and the `discoverTrees()` count, which both read `headerPart()`; adding widgets to an existing tree should not move either, and if one moves, read why before changing the test.

- [ ] **Step 5: Record the divergence in `todo.md`**

Append to `/Users/paolo/Code/Obsid/Projects/EmpowerMS/todo.md`:

```
- [ ] RECORDED DIVERGENCE 2026-08-20, not a defect: the header search overlay
      exists only in the Elementor build. src/_shared/header-2.html:80 keeps a
      decorative button with no form, because js/ and src/ are the protected
      static build. The static hand-off therefore ships a search icon that does
      nothing. Decided by Paolo; see elementor/theme-parts/header.mjs's own
      comment and docs/superpowers/specs/2026-08-20-header-search-design.md.
```

- [ ] **Step 6: Commit**

```bash
git add elementor/theme-parts/header.mjs test-elementor.mjs
git commit -m "feat(header): give the search button a panel to control

The button has had an aria-label and no form since Phase 2A. It now toggles
a real panel carrying a native GET form to /?s=, which is what the install
already answers correctly: /?s=education returned 200 and twelve results
when this was measured.

The panel is authored in header.mjs rather than extracted from
src/_shared/header-2.html, because the static partial has no panel and
cannot be given one: js/ and src/ are the protected static build. This is
the build's first deliberate divergence between the two headers, and it is
recorded in three places so nobody later reads it as an oversight.

The button's markup is patched on the way out of extractBlock() by a literal
replacement that throws when its target is missing, rather than by a regex
rewrite, so a change to the static partial stops the build loudly instead of
quietly emitting a button with no aria-expanded.

The input carries data-swplive=false. SearchWP Live Ajax Search is active and
enabled on this install and would otherwise bind itself to any input named s
and inject its own results pane into our header. The attribute is the
plugin's own opt-out, read from its shipped JavaScript.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: The overlay's behaviour

**Files:**
- Create: `wp/empowerms-child/theme-js/search.js`
- Modify: `wp/empowerms-child/functions.php`
- Test: `test-elementor.mjs`

> **CORRECTED 2026-08-20, after Task 2 was implemented.** This task's script was
> written assuming the panel ships closed (`hidden`, `aria-expanded="false"`). It does
> not. `test-elementor.mjs:2576` enforces that every header panel ships expanded and
> the script closes it at load, and Task 2 was implemented that way. The script below
> has been corrected to close at load rather than to un-hide. It also now sets a second
> root attribute, `data-search-open`, which is the state hook Task 4's CSS keys on.

**Interfaces:**
- Consumes: the DOM contract from Task 2: `.em-header__search` (the button, shipping `aria-expanded="true"`), `#site-search` (the panel, shipping open with no `hidden` attribute), `#site-search-input` (the input).
- Produces: the script sets `[data-search="on"]` on `document.documentElement` at load, which is the gate `bridge.css` block 71 (Task 4) keys its closed-by-default styles off, and toggles `[data-search-open]` on the same element, which is the open-state hook. Two attributes, both on the root, so no selector in block 71 depends on where the panel sits in the box tree. Enqueued as handle `empower-search`.

- [ ] **Step 1: Confirm `theme-js/` will actually reach the install**

This is the assumption the whole task rests on, and it is cheap to check rather than assume. `wp/sync.mjs`'s first rsync copies `wp/empowerms-child/` wholesale with `--delete`, excluding only the six `FROM_ROOT` directories, each anchored with a leading slash: `/tokens/ /components/ /css/ /js/ /assets/ /patterns/`. An anchored `/js/` matches a top-level directory named exactly `js`, and `theme-js` is not that.

```bash
grep -n "FROM_ROOT = " wp/sync.mjs
grep -n "excludes = FROM_ROOT" -A 2 wp/sync.mjs
```

Expected: `FROM_ROOT` does not contain `theme-js`, and the excludes are built as `/${dir}/`. So `wp/empowerms-child/theme-js/` syncs in pass one and **`wp/sync.mjs` needs no change at all.** The spec anticipated adding a pass; measurement says otherwise, so do not add one.

- [ ] **Step 2: Write the failing tests**

```js
/* theme-js/ is a DESTINATION-ONLY directory, the same shape as
   wp/empowerms-child/css/bridge.css: it exists under wp/empowerms-child/ and
   has no counterpart at the repository root. That is deliberate. The root
   js/ directory is synced into the theme by wp/sync.mjs and is the protected
   static build (functions.php:479 records what editing it cost last time);
   an Elementor-only script placed there would ship inside a static hand-off
   it is not part of, and would join the three-way fight over a top-level
   `const root` that this file's own comments describe.

   This test exists because the sync is the silent part. syncTheme() reports
   nothing on failure, and a script that never reaches the install produces a
   header whose panel is simply always open: wrong-looking, not broken, and
   therefore easy to miss. */
test('theme-js is not excluded from the theme sync', () => {
  assert.ok(!FROM_ROOT.includes('theme-js'),
    'theme-js is in FROM_ROOT, so the wp/empowerms-child pass will exclude it and nothing will ever upload it');
  assert.ok(fs.existsSync('wp/empowerms-child/theme-js/search.js'),
    'wp/empowerms-child/theme-js/search.js does not exist');
});

/* An ES module loaded as a classic script shares one global scope with every
   other classic script on the page, and the second file to declare an
   identifier the first already claimed throws a SyntaxError and never runs.
   That is not hypothetical here: it took down every desktop dropdown on the
   site once, and functions.php's own comment at :446 is the post-mortem.
   wp_script_add_data($handle,'type','module') looks like the fix and is not
   one; the script_loader_tag filter is, and it reads its handle list from
   empower_module_script_handles(). A handle missing from that list loads
   classic. */
test('the search script is enqueued and loads as a module', () => {
  const fn = themeFile('functions.php');
  assert.match(fn, /wp_enqueue_script\(\s*'empower-search',\s*\$dir \. '\/theme-js\/search\.js'/,
    'empower-search is not enqueued from theme-js/search.js');
  assert.match(fn, /empower_asset_ver\(\s*'theme-js\/search\.js'\s*\)/,
    'the search script is enqueued without a content-derived version, so a change will not bust the cache');
  assert.match(fn, /\$handles = array\([^)]*'empower-search'/,
    'empower-search is missing from empower_module_script_handles(), so it will load as a classic script and collide');
});

/* The panel ships open in the markup by design (Task 2's comment says why),
   and this attribute is what lets CSS close it. If the script never runs the
   attribute is never set, the closed-by-default rules never apply, and the
   form stays visible and usable. That is the intended degraded state and it
   is worth asserting the gate exists, because a script that closes the panel
   with inline styles instead would break the no-JavaScript contract silently. */
test('the search script gates its CSS on a root attribute rather than inline styles', () => {
  const js = fs.readFileSync('wp/empowerms-child/theme-js/search.js', 'utf8');
  assert.match(js, /setAttribute\(\s*['"]data-search['"]\s*,\s*['"]on['"]\s*\)/,
    'search.js never sets [data-search="on"], so bridge.css block 61 has no gate to key on');
  assert.doesNotMatch(js, /\.style\.(display|visibility|opacity)\s*=/,
    'search.js closes the panel with inline styles, which breaks the JavaScript-off contract');
});
```

Add `FROM_ROOT` to the imports from `./wp/sync.mjs` in `test-elementor.mjs` if it is not already imported.

- [ ] **Step 3: Run them and watch them fail**

```bash
node --test --test-name-pattern='search script|theme-js' test-elementor.mjs
```

Expected: FAIL, `wp/empowerms-child/theme-js/search.js does not exist`.

- [ ] **Step 4: Write the script**

```bash
mkdir -p wp/empowerms-child/theme-js
```

`wp/empowerms-child/theme-js/search.js`:

```js
// The header search overlay.
//
// DESTINATION-ONLY, and that is the point. Every other script this theme
// loads lives at the repository root in js/ and is synced here by
// wp/sync.mjs. That directory is the protected static build: functions.php's
// comment at :446 records the site-wide dropdown regression that came from
// three files there competing for a top-level `const root`, and :479 records
// that renaming those declarations is not available as a fix. This file is
// Elementor-only, so it lives where the Elementor-only bridge stylesheet
// lives, and it declares nothing at top level that js/ already claims.
//
// Progressive enhancement, the same contract js/nav.js and js/dropdown.js
// state for themselves: the panel ships OPEN in the markup
// (elementor/theme-parts/header.mjs) and this script sets
// [data-search="on"], which is the gate bridge.css block 61 keys its
// closed-by-default rules off. If this file never loads, the panel is an
// open search form under the header: not the design, still usable, and still
// submits to /?s= because the form is a native GET form and always was.

const doc = document.documentElement;
const button = document.querySelector('.em-header__search');
const panel = document.getElementById('site-search');
const input = document.getElementById('site-search-input');

if (button && panel && input) {
  doc.setAttribute('data-search', 'on');

  // The panel ships OPEN in the markup, with no `hidden` attribute and with
  // the button at aria-expanded="true", because that is this build's
  // no-JavaScript contract and test-elementor.mjs:2576 enforces it. So the
  // script's job at load is to CLOSE it, exactly as js/nav.js:12-13 does for
  // the mobile nav. Setting the attribute here rather than in the markup is
  // what keeps the panel reachable when this file fails to load.
  button.setAttribute('aria-expanded', 'false');

  const isOpen = () => button.getAttribute('aria-expanded') === 'true';

  const open = () => {
    button.setAttribute('aria-expanded', 'true');
    doc.setAttribute('data-search-open', '');
    // focus() after the attribute flip, not before: while the panel is still
    // closed it is display:none and focus() on a hidden element is a no-op
    // that reports no error.
    input.focus();
  };

  const close = ({ restoreFocus = true } = {}) => {
    button.setAttribute('aria-expanded', 'false');
    doc.removeAttribute('data-search-open');
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => {
    if (isOpen()) close(); else open();
  });

  // Escape closes and returns focus to the button, which is where the user
  // was before they opened it.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close();
  });

  // A click outside closes WITHOUT pulling focus back to the button: the
  // user is looking somewhere else and moving focus would be a jump they did
  // not ask for.
  document.addEventListener('click', (event) => {
    if (!isOpen()) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    close({ restoreFocus: false });
  });
}
```

- [ ] **Step 5: Enqueue it**

In `wp/empowerms-child/functions.php`, in the scripts `add_action` block, after the `empower-dropdown` line:

```php
	/* The header search overlay. Destination-only, under theme-js/ rather
	   than js/, because js/ is the protected static build and this script
	   has no static counterpart: the static build's search button is
	   decoration. See elementor/theme-parts/header.mjs for the divergence
	   and why it was chosen. */
	wp_enqueue_script( 'empower-search', $dir . '/theme-js/search.js', array(), empower_asset_ver( 'theme-js/search.js' ), array( 'strategy' => 'defer' ) );
```

And in `empower_module_script_handles()`, extend the array:

```php
	$handles = array( 'empower-nav', 'empower-reveal', 'empower-dropdown', 'empower-search' );
```

`empower_asset_ver()` resolves any path relative to the stylesheet directory and falls back to the theme version when the file is absent, so `'theme-js/search.js'` needs nothing special.

- [ ] **Step 6: Run the tests and the suite**

```bash
node --test --test-name-pattern='search script|theme-js' test-elementor.mjs
node --test test-elementor.mjs 2>&1 | tail -5
node --test test.mjs 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add wp/empowerms-child/theme-js/search.js wp/empowerms-child/functions.php test-elementor.mjs
git commit -m "feat(header): the search overlay's behaviour, in a destination-only script

theme-js/ is new and destination-only, the same shape as css/bridge.css. The
root js/ directory is synced into this theme and is the protected static
build; an Elementor-only script placed there would ship inside a hand-off it
is not part of, and would join the top-level const fight that functions.php
:446 documents as having taken down every dropdown on the site once.

Checked rather than assumed: wp/sync.mjs's first pass copies
wp/empowerms-child/ wholesale and excludes FROM_ROOT anchored as /js/, which
matches a top-level directory named js and not theme-js. So theme-js/ syncs
already and sync.mjs needs no change. The design document expected to add a
pass; measurement says otherwise.

The script is on empower_module_script_handles(), without which the
script_loader_tag filter would not give it type=module and it would load as
a classic script into the same shared global scope as the other three.

It closes the panel by setting [data-search=on] on the root and letting CSS
own the closed state, never by writing inline styles, so the panel stays
open and usable when the script does not load. A test asserts both halves.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Block 71, the overlay's styling

**Files:**
- Modify: `wp/empowerms-child/css/bridge.css`
- Test: `test-elementor.mjs` (the existing citation validator covers this; no new unit test)

**Interfaces:**
- Consumes: `[data-search="on"]` from Task 3, and the class contract from Task 2.
- Produces: nothing other tasks read.

- [ ] **Step 1: Find the real next block number**

```bash
grep -n "^/\* ---------- [0-9]" wp/empowerms-child/css/bridge.css | tail -1
```

The in-flight team-a work has been adding blocks; take the number after whatever this prints. The plan says 61 and that was true at 13:14 on 2026-08-20.

- [ ] **Step 2: Check the two traps before writing a line of CSS**

`css/motion.css`'s reveal selector silently deletes an element's own `transition`. It has caused three "it snaps" bugs and shipped one. Establish whether it reaches `.em-search`:

```bash
grep -n "transition" css/motion.css
grep -n "data-reveal" css/motion.css | head
```

The panel carries no `data-reveal` attribute, so it should be out of reach, but confirm it rather than assume it, and record the answer in the block's comment.

Second, the 400px rule:

```bash
sed -n '225,245p' css/site.css
```

`.em-header__search{display:none}` under 400px would make the overlay unreachable on a small phone. It cannot simply be deleted (it is in the frozen static build, and it exists because the header row overflows at 320px). Block 61 overrides it for the Elementor build only, and the row must still fit at 320px after the override. Measure that before believing it.

- [ ] **Step 3: Write the block**

Follow the file's own conventions exactly: a `/* ---------- N. TITLE ---------- */`
header, prose explaining what was measured and why the selector is shaped as it is, and
file:line citations that land on real lines.

**The state hooks are settled and are both on the root element**, decided when Task 2
landed so that no selector here depends on where the panel sits in the Elementor box
tree. `wp/empowerms-child/theme-js/search.js` sets `data-search="on"` on
`document.documentElement` at load, and adds or removes `data-search-open` on the same
element as the panel opens and closes. So:

```css
:root[data-search="on"] .em-search{ /* closed */ }
:root[data-search="on"][data-search-open] .em-search{ /* open */ }
```

Do NOT reach for the button's `aria-expanded` in a selector that has to travel from the
button to the panel. They are not siblings in the Elementor box tree and will not
become siblings. An earlier draft of this plan printed
`.em-header__search[aria-expanded="true"] ~ * .em-search` as an example of what NOT to
write; it is unusable and is recorded here only so nobody reinvents it.

`>` is not banned: block 60 uses a child combinator deliberately. What is banned is
depending on sibling POSITION, which is what breaks when a target is a widget rather
than a container.

The block needs to cover: the panel closed by default once `[data-search="on"]` is set;
the panel open under `[data-search-open]`; the visually-hidden label; the input and
submit sizing; and the 400px override that keeps the button reachable.

**Note the flash, and say so in the comment.** Because the panel ships open for the
no-JavaScript contract, there is a brief moment on every page load before the script
sets `data-search="on"` where the panel is visible. That is the same cost
`js/dropdown.js` and `js/nav.js` already pay, and it is the price of the contract that
`test-elementor.mjs:2576` enforces. It is a known consequence, not a defect to design
around by hiding the panel unconditionally, which would make it unreachable without
JavaScript.

- [ ] **Step 3b: Correct the three forward references to this block**

Tasks 2 and 3 each wrote a comment pointing forward at "bridge.css block 61", which was
the reserved number at the time. It is not any more: a parallel session took 61 and 62
while this plan was running, and this block is 71. Three committed sites carry the stale
number and this task owns the correction, because this task is what makes the number
real:

- `elementor/theme-parts/header.mjs:88`
- `wp/empowerms-child/theme-js/search.js:15`
- `test-elementor.mjs:1426`

Change each to 71 and re-read the surrounding sentence to confirm it still says
something true. Do this in the SAME commit as the block itself, so the citation and its
target land together and the tree is never in a state where the reference is wrong.

- [ ] **Step 4: Verify the citations**

```bash
node --test --test-name-pattern='citation' test-elementor.mjs
```

Expected: PASS. This test exists because a commit once added sixteen lines to this file's header and broke all six of its self-citations at once.

- [ ] **Step 5: Run the suite and commit**

```bash
node --test test-elementor.mjs 2>&1 | tail -5
git add wp/empowerms-child/css/bridge.css
git commit -m "style(bridge): block 71, the header search overlay

Closed-by-default keyed on [data-search=on], which theme-js/search.js sets,
so the panel is open and usable when the script does not load.

Two traps cleared rather than hoped past. motion.css's reveal selector
deletes an element's own transition and has caused three snapping bugs; the
panel carries no data-reveal and was checked rather than assumed. And
css/site.css:232 hides the search button under 400px, which would make the
overlay unreachable on a phone; overridden here for the Elementor build
only, with the 320px row re-measured afterwards.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: The search results template

**Files:**
- Create: `elementor/theme-parts/search-archive.mjs`
- Create: `elementor/theme-parts/search-result-item.mjs`
- Modify: `elementor/theme-parts/deploy.mjs`
- Modify: `test-elementor.mjs`
- Modify: `wp/empowerms-child/css/bridge.css` (block 72)

**Interfaces:**
- Consumes: `deployThemePart(postId, elements, 'search-results')` from Task 1; `container`, `text`, `html`, `loopGrid` from `../factory.mjs`.
- Produces: `searchArchivePart()` returning the tree; `SEARCH_ARCHIVE_POST_ID` (integer); `SEARCH_ARCHIVE_CONDITIONS = ['include/archive/search']`; `searchResultItem()` and `SEARCH_RESULT_ITEM_POST_ID`.

- [ ] **Step 1: Create the two library posts on the install**

Neither post exists yet. Read the ids back rather than assuming them, the same discipline `header.mjs` used for attachment 20578.

```bash
set -a && . ./.env && set +a
```

Then, over `wpe()`:

```
wp post create --post_type=elementor_library --post_status=publish \
  --post_title='Empower Search Results' --porcelain
wp post create --post_type=elementor_library --post_status=publish \
  --post_title='Search result card' --porcelain
```

Set the library type terms. The archive document's type is `search-results` and the card's is `loop-item`:

```
wp post term set <ARCHIVE_ID> elementor_library_type search-results
wp post term set <ITEM_ID> elementor_library_type loop-item
```

Record both ids and both commands in `docs/elementor/phase2b/2026-08-20-search.md`.

- [ ] **Step 2: Write the failing test**

```js
/* discoverTrees() counts tree-shaped exports in elementor/theme-parts/ and
   fails when the hard-coded trees array below has drifted from what actually
   exists. It exists because that array was once hand-written and silently
   left the header and footer out entirely, fourteen containers, while a
   comment claimed it covered every container in the build. Adding a new
   theme part is exactly the drift it watches for, so it goes red here by
   design and the fix is to add the tree to the walk, never to the skip list. */
test('the search results part is a real archive document with a search condition', () => {
  assert.ok(Number.isInteger(SEARCH_ARCHIVE_POST_ID),
    'SEARCH_ARCHIVE_POST_ID is not an integer post id');
  assert.deepEqual(SEARCH_ARCHIVE_CONDITIONS, ['include/archive/search'],
    'the search results condition is not include/archive/search');
  assert.ok(Number.isInteger(SEARCH_RESULT_ITEM_POST_ID),
    'SEARCH_RESULT_ITEM_POST_ID is not an integer post id');
  assert.notEqual(SEARCH_ARCHIVE_POST_ID, SEARCH_RESULT_ITEM_POST_ID,
    'the archive template and its loop item point at the same post');
});

/* The page has to say what was searched for and it has to have an empty
   state. Beaver's page has the first and not the second, and "nothing
   matched" is a routine outcome rather than an edge case: it is the reason
   search.php's own fallback calls get_search_form() again. */
test('the search results page echoes the query, offers a form, and has an empty state', () => {
  const markup = JSON.stringify(searchArchivePart());
  assert.match(markup, /name=\\"s\\"/,
    'the results page carries no search input, so a visitor cannot refine in place');
  assert.match(markup, /data-swplive=\\"false\\"/,
    'the results page search input does not opt out of SearchWP Live Ajax Search');
});
```

Import the new symbols at the top of `test-elementor.mjs`, and add `searchArchivePart()` and `searchResultItem()` to the `trees` array in the `content_width` test.

- [ ] **Step 3: Run it and watch it fail**

```bash
node --test --test-name-pattern='search results' test-elementor.mjs
```

Expected: FAIL on the import, since the module does not exist.

- [ ] **Step 4: Write `search-result-item.mjs`**

One card, type-agnostic: title, kind label, date, excerpt. No photograph. `empowerms-all-content-pages` records that a stock photograph must never sit beside a named person's headline, and a search result set is not known in advance, so the card carrying no image is the only shape that holds that line without a branch. Write that reason into the module's comment.

Use Elementor's dynamic-tag widgets the way `elementor/pages/content-a/loop-item.mjs` does. Read that file first and follow it; do not invent a second convention.

- [ ] **Step 5: Write `search-archive.mjs`**

Structure, top to bottom: a band echoing the query and the count and carrying the search form again; the results grid; pagination; the empty state.

> **CORRECTED 2026-08-20, before this task was dispatched.** This step first said to use
> the `archive-posts` widget with `_skin: 'custom'` and a `template_id`, and claimed
> `loop-grid` was the wrong instrument. Both halves are wrong, measured against Elementor
> Pro 4.2.1 on the install:
>
> - `archive-posts` registers exactly three skins (`register_skins()` in
>   `modules/theme-builder/widgets/archive-posts.php`): Classic, Cards and Full Content.
>   There is no custom skin and no `template_id`, so it CANNOT render a Loop Item
>   template at all.
> - `loop-grid` CAN read the current query. `current_query` is a valid value of the query
>   group's `post_type` field, defined in
>   `modules/query-control/controls/group-control-query.php:45`.
>
> So the instrument is `loop-grid`, `factory.mjs`'s existing `loopGrid()` applies
> unchanged, and NO new factory is needed. The earlier ruling to add an `archivePosts()`
> factory is withdrawn.

Use `loopGrid()` from `../factory.mjs` exactly as `elementor/pages/podcast-a/03-library.mjs:348` does, with `templateId: SEARCH_RESULT_ITEM_POST_ID` and `post_query_post_type: 'current_query'`. That last key is the whole difference between this grid and podcast-a's: podcast-a passes `'post'` plus term filters, and this one defers to whatever query WordPress already resolved, which on a search results template is the search.

Verify by measurement, not by assumption, that the grid paginates on a search results page and that `posts_per_page` behaves as expected when the query is inherited rather than built. Record what you measured.

- [ ] **Step 6: Add it to the theme-parts CLI**

In `elementor/theme-parts/deploy.mjs`, `PARTS` gains an entry. `CONDITIONS` is currently a single module-level constant `['include/general']` shared by both parts, which is no longer true once a third part has its own condition; move the condition into each `PARTS` entry rather than adding a branch.

- [ ] **Step 7: Run the suite and commit**

```bash
node --test test-elementor.mjs 2>&1 | tail -5
git add elementor/theme-parts/ test-elementor.mjs
git commit -m "feat(search): an Elementor search results template this build owns

Empower's search results have been rendered by a Beaver Themer archive
layout (post 11325) with our header and footer around it, so the page looks
half-converted and wp/empowerms-child/search.php has in fact never run.

This is the replacement, and it is the first page in the build authored
Elementor-first with no static HTML stage. Every page so far went static,
sign-off, convert. Beaver is being retired, this page has to exist, and no
static reading of it will ever be commissioned.

Document type search-results, sub-type search, condition
include/archive/search, render location archive. All four read from
Elementor Pro 4.2.1's own Search_Results class on empv2 rather than guessed,
because the type and the location are different strings and search.php asks
for the location.

The card is type-agnostic and carries no photograph: search crosses pages,
posts, person records and podcast episodes at once, and a result set that is
not known in advance is exactly where a stock photograph could end up beside
a named person's headline.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Deploy, take search over from Beaver, verify live

This is the only task that changes what visitors see. Everything before it is inert.

**Files:**
- Create: `docs/elementor/phase2b/2026-08-20-search.md`
- Modify: nothing in the repository beyond the report

- [ ] **Step 1: Sync and deploy ours first, while Beaver still owns search**

```bash
set -a && . ./.env && set +a
node -e "import('./wp/sync.mjs').then(m => m.syncTheme()).then(d => console.log('synced to', d))"
node elementor/theme-parts/deploy.mjs header
node elementor/theme-parts/deploy.mjs search-archive
```

Ours is now deployed and conditioned, and Beaver is still winning, so `/?s=` is unchanged. That ordering is deliberate: it means the risky step is reversible by itself.

Verify the header overlay right now, on any page, before touching Beaver at all.

- [ ] **Step 2: Read Beaver's claim, and record it verbatim**

```bash
wp post meta get 11325 _fl_theme_builder_locations --format=json
wp post meta get 11325 _fl_theme_builder_exclusions --format=json
wp post meta get 11325 _fl_theme_builder_user_rules --format=json
```

Paste all three outputs into the report file before writing anything. These are the restore values.

- [ ] **Step 3: Release the claim, on the branch the spec sets out**

If `_fl_theme_builder_locations` claims search and nothing else:

```bash
wp post update 11325 --post_status=draft
```

If it claims search alongside other locations, leave `post_status` alone and remove only the search entry from `_fl_theme_builder_locations`. Drafting the post in that case would take down layouts this work never intended to touch.

Record the exact command that reverses whichever branch was taken.

- [ ] **Step 4: Flush and verify live**

```bash
node -e "import('./fidelity.mjs').then(m => m.flushPageCache())"
```

Then check, in this order:

```bash
curl -s -o /tmp/s1.html -w "%{http_code}\n" "https://empv2.wpenginepowered.com/?s=education"
grep -c "fl-builder-content" /tmp/s1.html    # expect 0
grep -c "elementor" /tmp/s1.html             # expect > 0
```

- Real query returns 200, our template, and results.
- A query matching nothing returns the **empty state**, not the 404 page. Check for the empty-state copy specifically. This is not optional: `empowerms-reserved-query-vars` records that `?s=` on this install can return a 200-shaped 404 that renders the real header, footer and nav, so a status code alone proves nothing and a "looks fine" glance proves less.
- The overlay opens, takes focus, closes on Escape with focus returned, closes on outside click without focus moving, and submits. At 1440 and at 320.
- The form still submits with JavaScript disabled.
- The other six Beaver layouts still render: check one singular post and one category archive.

- [ ] **Step 5: Write the report and commit**

`docs/elementor/phase2b/2026-08-20-search.md`: the post ids created and the commands that created them, Beaver's three recorded meta values, the branch taken and its exact reversal command, and every measurement above with its actual number.

```bash
git add docs/elementor/phase2b/2026-08-20-search.md
git commit -m "docs(search): the search results handover, and the command that reverses it

Ours was deployed and conditioned first, while Beaver still owned search, so
the risky step could be taken and undone on its own.

Beaver layout 11325's three location meta values are recorded here verbatim
before anything was written, and the branch taken is recorded with the exact
command that puts it back. The other six Beaver Themer layouts are untouched
and two of them were checked afterwards.

The empty state was verified as an empty state and not as a 404: ?s= on this
install can return a 200-shaped 404 that renders the real header, footer and
nav, so the status code alone proves nothing.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Close the loops

**Files:**
- Modify: `/Users/paolo/Code/Obsid/Projects/EmpowerMS/log.md`, `decisions.md`
- Modify: memory at `/Users/paolo/.claude/projects/-Users-paolo-Code-EmpowerMS/memory/`

- [ ] **Step 1: Vault**

Append to `decisions.md` under a dated heading: the Elementor-first departure from the static pipeline, the SearchWP opt-out, and the destination-only `theme-js/` precedent. One line each.

Append session bullets to `log.md` under `## 2026-08-20`.

- [ ] **Step 2: Memory**

Write `empowerms-search.md`: that search results are ours as of 2026-08-20, the post ids, the Beaver restore command, that `theme-js/` is the destination-only home for Elementor-only scripts, and that SearchWP Live Ajax Search is active and deliberately opted out of. Add its pointer line to `MEMORY.md`.

Update `empowerms-class-in-markup-phase.md` if the divergence changes what that memory says about the two builds tracking each other.

- [ ] **Step 3: Commit**

```bash
git add -A docs/
git commit -m "docs: close the loops on the header search work

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Spec coverage.** Overlay (spec A) is Tasks 2, 3, 4. Results template (spec B) is Tasks 1 and 5. Handover (spec C) is Task 6. The spec's verification list maps to Task 6 step 4 and Task 4 step 4. The spec's four "does not do" items are respected: no other Beaver layout is touched, no mobile-drawer entry is added, no type-specific card is built, nothing in the frozen static build is edited.

**One correction to the spec, found while planning.** The spec says `wp/sync.mjs` gains a pass for `theme-js/`. It does not need one: the first rsync already copies `wp/empowerms-child/` wholesale and its excludes are anchored (`/js/`), which does not match `theme-js`. Task 3 step 1 checks this rather than assuming it, and Task 3 asserts it in a test, because `syncTheme()` is silent on failure and a script that never uploads produces a permanently-open panel rather than an error.

**Deliberately left open for the implementer.** Block 61's exact open-state selector (Task 4 step 3) and the `archive-posts` widget's settings shape (Task 5 step 5) are both specified by their requirements and their reasons, not by their literal text, because both depend on a rendered Elementor box tree that cannot be read until the part is deployed. Each step says what must be true and what must not be used. Everything else in this plan is literal.
