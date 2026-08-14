# The theme-part mechanism, proven on the install

Task 3's job was to answer one question with the smallest possible
artefact, deployed for real: does assigning an `elementor_library` header
and footer to `include/general` actually make Elementor Pro swallow
UiCore's own chrome and render Elementor's instead. The answer is yes, but
not from the postmeta write alone. What actually makes it work, and what
does not, is the content of this document.

## The two library post ids (Tasks 4 and 5 hard-code these)

- **Header = post 20573** (`elementor_library`, `elementor_library_type: header`)
- **Footer = post 20574** (`elementor_library`, `elementor_library_type: footer`)

Both are `publish`, both have `_elementor_template_type` set to `header` /
`footer`, both have `_elementor_edit_mode: builder`. At the time this
document was written the install is in the switched state: both carry
`_elementor_conditions: ["include/general"]` and the marker trees deployed
in Step 2 are still live. Step 9 deletes the throwaway marker module;
Tasks 4 and 5 overwrite these same two posts' `_elementor_data` with the
real header and footer trees, using the same ids.

## The centrepiece: postmeta is not what Elementor reads at render time

`setConditions()` in `elementor/deploy.mjs`, as Task 1 wrote it, did exactly
one thing: write `_elementor_conditions` on the document as a JSON array via
`wp post meta update ... --format=json`. Step 3 below confirms that write
is correct and was always correct. It is also not sufficient, and the gap
cost real time to find.

**What happened, in order:**

1. Steps 1-2 ran clean. Both library posts existed, both had correct
   `_elementor_template_type` / `_elementor_edit_mode`, both had marker
   `_elementor_data` (760 bytes each), both had `_elementor_conditions`
   written and confirmed as a real JSON array (Step 3, below). Every piece
   of postmeta looked exactly right.
2. Step 4 failed anyway. `https://empv2.wpenginepowered.com/podcast-a/`
   carried neither marker string and still carried `uicore-header`,
   `uicore-footer` and `id="uicore-page"`. Full output:

   ```
   EMPOWER HEADER MARKER        false
   EMPOWER FOOTER MARKER        false
   uicore-header                true
   uicore-footer                true
   id="uicore-page"             true
   ```

3. Diagnosis (done by the controller, team-lead, after taking the
   investigation over): Elementor Pro's `Conditions_Manager` does not
   resolve a location's assigned documents by scanning postmeta at render
   time. It resolves them from a **cached option**,
   `elementor_pro_theme_builder_conditions`
   (`wp-content/plugins/elementor-pro/modules/theme-builder/classes/conditions-cache.php:15`),
   read through `Conditions_Manager::get_location_templates()`
   (`conditions-manager.php:328`, called from `:518`) via
   `$this->cache->get_by_location()` (`:331`). Writing `_elementor_conditions`
   postmeta through WP-CLI never touches that option. At the moment Step 4
   failed, the option's actual value was `[]`, empty, while both posts'
   postmeta looked perfectly configured. No document was registered to
   either location, so Elementor Pro never hooked `get_header()` /
   `get_footer()`, and UiCore rendered its own chrome exactly as if nothing
   had been assigned. Nothing about this state reports an error anywhere.

4. The fix is Elementor's own mechanism, not a workaround: the editor
   itself, when a human saves a document's conditions in the browser, calls
   `Conditions_Cache::regenerate()` (`conditions-cache.php:94`) from inside
   `Conditions_Manager::save_conditions()` (`conditions-manager.php:323`).
   `setConditions()` now makes that same call, reached through the Theme
   Builder module instance, immediately after the postmeta write, in the
   same remote script:

   ```php
   $cm = \ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager();
   $cm->get_cache()->regenerate();
   ```

   Sent through `wp eval-file` against a heredoc'd temp file (the same
   pattern `deployElements()` already uses for `_elementor_data`), not
   `wp eval` with the PHP inline, for the same reason: inline PHP as a CLI
   argument goes through two levels of shell quoting. `set -e` still governs
   the whole script, so a failed regeneration cannot report success. Full
   diff is in `elementor/deploy.mjs`'s `setConditions()`, and its comment
   there also corrects an earlier version of itself that cited
   `conditions-manager.php:53` (the meta read the *editor* uses when
   loading a document to edit) as if it were the render-time read path. It
   is not; that citation is what let the incompleteness reach Task 3 before
   anything caught it.

5. Re-running `setConditions(20573, ['include/general'])` and
   `setConditions(20574, ['include/general'])` with the fixed function
   produced `{"footer":{"20574":["include\/general"]},"header":{"20573":["include\/general"]}}`
   in the option directly (confirmed by reading it back with
   `wp option get elementor_pro_theme_builder_conditions --format=json`),
   where it had been `[]`. **Consequence for anything calling
   `setConditions()` unattended (Tasks 4, 5): the fixed version is a single
   call that leaves the install correctly wired; the old version was not,
   and looked like it was.**

`test-elementor.mjs`'s `setConditions` test was extended in the same
change to assert the cache-regeneration call is actually present in the
captured script (`wp eval-file`, the module-instance call, the
`get_cache()->regenerate()` call), not just that the postmeta write is
correct, so this gap cannot silently reopen.

## Step 3: the postmeta write itself, confirmed correct

```
wp post meta get 20573 _elementor_conditions --format=json
->  ["include\/general"]
```

A real JSON array, not a bare quoted string. Task 1's `--format=json` /
STDIN route (transcribed from WP-CLI's help text, never executed before
this) was correct as written. No fix was needed to that half of
`setConditions()`; only the missing cache regeneration needed adding.

## Step 4, re-run against the fixed `setConditions()`

```
EMPOWER HEADER MARKER        true
EMPOWER FOOTER MARKER        true
uicore-header                false
uicore-footer                false
id="uicore-page"             true
```

Both markers present, both UiCore chrome classes gone. Confirmed
independently by both the controller and this run.

## Step 5: div balance

`524` `<div` open, `524` `</div>` close, delta `0`. Balanced. Matches the
controller's own number exactly. No orphaned closing tags from UiCore's
`footer.php`, which is what the both-parts-get-a-condition rule (Step 2's
note) exists to prevent.

## `id="uicore-page"` survived, contrary to the spec's prediction

The spec predicted UiCore's page wrappers (`#uicore-page`,
`#content.uicore-content`, `.uicore-body-content`) would disappear along
with UiCore's chrome, and warned that any UiCore rule scoped to those
selectors would stop applying to page content once the switch happened.
Checked directly on the switched `podcast-a` page: `id="uicore-page"` is
still present (`true`, both in the controller's check and this one).
`Elementor Pro's get_header()` only discards UiCore's `header.php`'s own
markup (nav, logo, the visible chrome), not the wrapper divs that
`header.php` opens and `footer.php` closes; those wrappers persist because
nothing in the theme's own template hierarchy calls them from inside
`header.php`/`footer.php` at all once the Theme Builder document owns the
location; they are printed elsewhere in the page template and untouched.

**Practical effect: this is less disruption than the spec priced in.**
Whatever CSS currently depends on `#uicore-page` / `#content.uicore-content`
for content width, spacing, or other page-wrapper behaviour keeps working
after the header/footer switch. Task 7's bridge stylesheet may need a
smaller scope than the spec assumed. Worth re-confirming once Tasks 4/5
apply the real header/footer (not just the marker content), since the real
trees are structurally different from the one-container markers used here.

## Step 6: the after-set, and what moved beyond marker chrome

Captured with the same `screenshots(url, dir)` call Task 2 used, same five
slugs, into `docs/elementor/beaver-after/<slug>/`. All 20 PNGs (5 pages x 4
widths) captured cleanly on the first pass, no retries needed (Task 2
needed one retry on `2025-tax-calculator`; not needed this time).

Read every 1440 capture side by side against
`docs/elementor/beaver-before/<slug>/1440.png`.

**Expected and correct on all five:** `EMPOWER HEADER MARKER` /
`EMPOWER FOOTER MARKER` banners in place of UiCore's real chrome. This is
the switch working, not a defect.

**Not a change, already known:** `docs/elementor/beaver-baseline.md`
documents the Source Sans 3 body typeface (a Phase 1 effect, inherited from
`tokens/base.css:3`, present in the before-set too) and this is unchanged
in the after-set.

**A likely-benign change, worth naming rather than silently accepting:**
the MailMunch newsletter modal, present (full overlay at 1440/1024,
compact pinned button at 768/390) on all five pages in the before-set, does
not appear in any of the twenty after-captures. Task 2's baseline document
says MailMunch fires 6-8 seconds after load. `fidelity-browser.mjs`'s
`settleReveal()` was fixed shortly before this task started (commit
`89208bf`: its wait now correctly queries `document.body` instead of
`document`, and per that fix's own report, captures now run roughly four
times faster). The simplest explanation is that captures now finish and
the screenshot is taken before MailMunch's own delayed trigger fires, not
that the header/footer switch removed it. This was not independently
timed to confirm; flagged as the likely explanation, not a certainty, for
whoever next touches this harness or compares before/after sets again.

**Two real, reproducible findings, confined to two of the five pages:**

- `save-our-esa-petition`: the orange "THE ESA IMPACT" band's three star
  icons and their stat text (91%, 80%, 78%, and each stat's description)
  are visually absent in the after-capture. The heading and the "Sign the
  Petition" button in the same band render fine.
- `thank-you-saveouresa`: in the "FREE RESOURCES" section, the ESA
  Handbook image renders but its paired description text/button
  ("Download the ESA Handbook" and the paragraph beneath it) does not; the
  Campaign Guide row below it shows the opposite pattern, its text and
  button render but its paired thumbnail image does not, and the whole
  block sits far lower on the page than the layout implies it should.

Both are **reproducible, not one-off capture flakes**: re-captured both
pages a second time independently
(`docs/elementor/beaver-after/save-our-esa-petition-recheck/`,
`docs/elementor/beaver-after/thank-you-saveouresa-recheck/`), and both
findings reproduced identically both times.

Both are **content-present, render-absent**, confirmed by fetching the raw
HTML with `fetchConverted()` (not just eyeballing the screenshot): `91%`,
`80%`, `78%` and `ESA Parents` all appear in `save-our-esa-petition`'s raw
HTML; `The ESA Handbook provides essential` appears intact in
`thank-you-saveouresa`'s raw HTML, inside a normally-structured
`fl-callout` module. Div balance on both pages' raw HTML is even (208/208
and 177/177). So this is not data loss, not a broken template, and not
something `fidelity.mjs`'s `checkCopy()` / `checkSections()` would catch,
since both search raw HTML text and both would report this copy as
present. **Worth naming as a real gap for whoever writes Task 4/5/6's
fidelity checks: a defect that makes real content invisible while leaving
it intact in the markup needs a rendered-page check, not a text-search
one.**

**Neither reproduces on the other three sampled pages.** `esa-handbook`,
`2025-tax-calculator` and `updates` match their before-captures with no
difference beyond the expected marker chrome (and, on `updates`, the
already-known missing featured-image issue Task 2's baseline flagged as a
pre-existing media-sync gap, unrelated to this task).

**A plausible mechanism, not confirmed, offered for whoever investigates
next:** the two affected modules on both pages carry Beaver Builder's own
entrance-animation class (`fl-animation`, confirmed directly on
`thank-you-saveouresa`'s callout module: `fl-module-callout ... fl-animation
fl-fancy-pulse`), and the star icons on `save-our-esa-petition` are native
`<img loading="lazy" ...>` elements, not an icon font. Both classes of
content depend on either a scroll-triggered JS handler (entrance animation)
or the browser's native lazy-load scheduling (the images) actually
completing before the screenshot is taken. `settleReveal()`'s scripted
scroll-through is fast (roughly one `requestAnimationFrame` per
viewport-height step, then an immediate reset to the top), and was written
for this build's own `[data-reveal]` elements, not for Beaver Builder's
unrelated animation/lazy-load system running on the same pages. This reads
more like a harness-timing gap than a genuine effect of the header/footer
switch, but it was not fully root-caused here: Task 3's scope is to
document what moved, and this is squarely that. **Recommend confirming
before Tasks 4/5/6 treat these two pages as clean**, since if it is
genuinely tied to the switch (rather than to the harness) it is a real,
user-facing content-visibility regression, not a documentation curiosity.
A second, orthogonal Beaver Builder system was also found live on the
install during this check: `11365`'s pre-footer "Stay in Touch" newsletter
signup, discussed below, was directly ruled out as a contributor (confirmed
dormant on every location it is assigned to, none of which render it), so
it is not the explanation for either finding.

Also checked while investigating the two findings above: neither `#uicore-page`-style wrapper divs nor Elementor Pro's own frontend script/style enqueues
(`elementor-pro-frontend-js`, `widget-loop-grid.min.css`, etc., present on
`podcast-a` because that page carries its own converted Loop Grid content,
unrelated to Theme Builder) show any sign of disruption; nothing in either
affected page's raw HTML shows a Theme Builder location marker anywhere
outside the header/footer locations themselves.

## Step 7: the revert, written down, rehearsed, and re-applied

**The revert has the same gap the forward path had, and this was proven,
not assumed.** Deleting `_elementor_conditions` postmeta alone does not
restore UiCore's chrome, because the stale cache still lists both
documents:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post meta delete 20573 _elementor_conditions; wp post meta delete 20574 _elementor_conditions; wp elementor flush_css'))"
```

Run for real. Immediately after, `wp option get
elementor_pro_theme_builder_conditions --format=json` still returned
`{"footer":{"20574":["include\/general"]},"header":{"20573":["include\/general"]}}`,
unchanged, and fetching `podcast-a` again still showed
`EMPOWER HEADER MARKER: true`, `uicore-header: false`, i.e. the page was
STILL switched even though the postmeta assigning it had just been deleted.
A revert that only deletes the postmeta is a broken hope, proven broken
here, not just predicted.

**The actual, working revert** regenerates the cache after deleting the
meta, the same call `setConditions()` now makes internally:

```bash
set -a; . ./.env; set +a
node -e "
import('./wpe.mjs').then(m => m.wpe(\`
cat > /tmp/elementor-revert-cache-regen.php <<'PHP_REGEN'
<?php
\\\$cm = \\\\ElementorPro\\\\Modules\\\\ThemeBuilder\\\\Module::instance()->get_conditions_manager();
\\\$cm->get_cache()->regenerate();
PHP_REGEN
wp eval-file /tmp/elementor-revert-cache-regen.php
rm -f /tmp/elementor-revert-cache-regen.php
\`))"
```

Run for real, immediately after the postmeta delete above. The option read
back as `[]`. Fetching `podcast-a` again: `EMPOWER HEADER MARKER: false`,
`EMPOWER FOOTER MARKER: false`, `uicore-header: true`, `uicore-footer:
true`. UiCore's chrome genuinely back.

**Then re-applied**, via the fixed `setConditions()` (which now does both
steps in one call):

```bash
set -a; . ./.env; set +a
node -e "
import('./elementor/deploy.mjs').then(async d => {
  await d.setConditions(20573, ['include/general']);
  await d.setConditions(20574, ['include/general']);
})"
```

Fetching `podcast-a` a final time: `EMPOWER HEADER MARKER: true`,
`EMPOWER FOOTER MARKER: true`, `uicore-header: false`, `uicore-footer:
false`. Switched state restored, install left in the same state Steps 4-6
tested against.

## Step 8: retiring Beaver's chrome layouts, and the pre-footer decision

Beaver Builder's Header (`29`) and Footer (`154`) `fl-theme-layout` records
were drafted. Both are dormant: UiCore renders its own chrome and never
calls Beaver Builder's `fl_header`/`fl_footer` hooks, so drafting them is
hygiene against a later theme change waking them, not a behaviour change.
Confirmed no effect: fetched `podcast-a` again after drafting both and the
marker chrome was unchanged (still switched, still correct).

**`11365` ("Pre-footer") was investigated before deciding, not drafted on
assumption.** Its content:

```
<!-- wp:fl-builder/layout -->
    <h2>Stay in Touch</h2>[gravityform id=1 title=false description=false ajax=true tabindex=49]
<!-- /wp:fl-builder/layout -->
```

A real "Stay in Touch" heading plus an embedded Gravity Form (id 1), hooked
to `fl_before_footer` (`_fl_theme_layout_hook` postmeta) and assigned via
`_fl_theme_builder_locations` to five specific pages: `33` (About Empower),
`11` (Home), `13` (News, slug `updates`, one of this task's own five
sampled pages), `35` (Education - Old version, private), `37`
(Justice - Old version, private). Not a site-wide assignment; a real, if
narrow, on-purpose promo module.

Checked the front end directly rather than assuming Beaver's own dormancy
extends to it: fetched `updates` (page 13, in the location list AND
already one of the five pages this task has raw HTML for), `/` (Home,
page 11) and `/about/` (page 33). None of the three contain `Stay in
Touch` or `gform_wrapper` anywhere in the raw HTML. **11365 renders
nothing on the front end on every location it is assigned to that was
checked**, for the same underlying reason 29 and 154 are dormant: nothing
in UiCore's own template calls `do_action('fl_before_footer')`, so Beaver
Builder's own Theme Builder system never fires there regardless of what
it's configured to show. Drafted, alongside 29 and 154, for the same
reason. Fetched `podcast-a` once more afterward to confirm no unrelated
effect: unchanged, still correctly switched.

Final state of all nine `fl-theme-layout` records, confirmed by direct
query after all three drafts:

| id | title | status |
| --- | --- | --- |
| 29 | Header | draft |
| 154 | Footer | draft |
| 11365 | Pre-footer | draft |
| 11248 | Posts Archive | publish (untouched, out of scope) |
| 11272 | Post Singular | publish (untouched, out of scope) |
| 11276 | Posts Category Archive | publish (untouched, out of scope) |
| 11322 | Post Author Archive | publish (untouched, out of scope) |
| 11325 | Search Results | publish (untouched, out of scope) |
| 11338 | Person Singular | publish (untouched, out of scope) |

The six templates this phase explicitly defers were checked against by id
before running anything and are unchanged.

## What the brief got wrong

The forward path (`deployThemePart` + `setConditions`) and the revert both
described in the brief as a two-command sequence were both missing the
conditions-cache regeneration step; see the centrepiece section above.
Everything else in the brief (the marker tree shape, the deploy ordering
note about both parts needing their condition, the div-balance check, the
five before-set slugs and their real paths) held exactly as written.
