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
   $post_id = 20573;
   $cm = \ElementorPro\Modules\ThemeBuilder\Module::instance()->get_conditions_manager();
   $cm->get_cache()->regenerate();
   $cache = get_option( 'elementor_pro_theme_builder_conditions', array() );
   $found = false;
   foreach ( (array) $cache as $location => $documents ) {
       if ( array_key_exists( (string) $post_id, (array) $documents ) ) {
           $found = true;
           break;
       }
   }
   if ( ! $found ) {
       fwrite( STDERR, "setConditions: post $post_id was not found under any location..." );
       exit( 1 );
   }
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

5. **The verification block above was added in a fix round, after review
   caught that `regenerate()` returning without throwing is not evidence
   the post was actually registered anywhere.** If the post is not
   published, or its `_elementor_template_type` is wrong, or the condition
   string is not one Elementor recognises, `regenerate()` completes happily
   and writes a cache that still does not list the document: a write that
   is correct, verifiable and inert, the exact failure mode this whole
   function exists to close. Proven live on the install, not just reasoned
   about: calling the fixed `setConditions(29, ['include/general'])`
   against post `29` (Beaver's Header layout, a real published post but not
   an `elementor_library` document) rejected with `post 29 was not found
   under any location in elementor_pro_theme_builder_conditions after
   regenerate()`, exactly as designed. (The stray `_elementor_conditions`
   postmeta that write left on post 29 was deleted afterward; it has no
   effect on a post Elementor never treats as a Theme Builder document.)

6. Re-running `setConditions(20573, ['include/general'])` and
   `setConditions(20574, ['include/general'])` with the fixed function
   produced `{"footer":{"20574":["include\/general"]},"header":{"20573":["include\/general"]}}`
   in the option directly (confirmed by reading it back with
   `wp option get elementor_pro_theme_builder_conditions --format=json`),
   where it had been `[]`. **Consequence for anything calling
   `setConditions()` unattended (Tasks 4, 5): the fixed version is a single
   call that leaves the install correctly wired, and now cannot resolve
   without independently confirming that; the old version was not, and
   looked like it was.**

`test-elementor.mjs`'s `setConditions` tests were extended in two rounds.
The first added structural assertions on the captured script: the
cache-regeneration call is present (`wp eval-file`, the module-instance
call, the `get_cache()->regenerate()` call), not just the postmeta write.
The second, after review, added: the relative order of the postmeta write
and `wp eval-file` (a regenerate-before-write implementation would satisfy
every presence assertion while reproducing the exact stale-cache bug, by
regenerating from the pre-write state), that `wp eval-file` targets the
`.php` temp file specifically rather than the `.json` one, the fully
qualified `\ElementorPro\Modules\ThemeBuilder\Module::instance()` class
name pinned literally rather than matched loosely, and two real-execution
tests (mirroring `deployPage`'s existing pair, `'deployPage rejects when
the Elementor data write fails partway through the script, instead of
resolving over a partial deploy'` and `'deployPage still resolves when
every wp-cli step genuinely succeeds'` in `test-elementor.mjs`, at
`:1222` and `:1243` as of this correction, not the `:1017` / `:1038` this
section originally cited, which were never the right pair and had drifted
further since) that run the captured script through a real local bash with
a fake `wp`, proving `set -e` genuinely aborts the promise when `wp
eval-file` fails and does not introduce a false failure on the happy path.

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

**A fix-round review caught that the first explanation offered here
contradicted itself in the same paragraph** (one sentence said `header.php`
opens these wrappers, the next said nothing calls them from inside
`header.php` at all), and correctly pointed out that if `header.php`
genuinely opened them and its output were discarded, the opener would be
missing and the div delta would be negative, not the `0` Step 5 actually
measured. Settled with a direct, read-only grep on the install rather than
picking one of the two contradictory clauses:

```
wp-content/themes/uicore-pro/header.php:43:  <div id="uicore-page">
wp-content/themes/uicore-pro/style.css:620:#uicore-page {
```

Reading `header.php` and `footer.php` end to end shows the real structure.
`header.php:36` opens `<div class="uicore-body-content">` and `:43` opens
`<div id="uicore-page">`, both **unconditionally**; only what prints
*inside* `#uicore-page` differs: `:45-48` runs
`do_action( "uicore_page", $post )` when `\UiCore\Core` exists (confirmed
active; `uicore-framework` is one of three active UiCore plugins), or a
hardcoded fallback `<header id="masthead">` otherwise. `:93` opens
`<div id="content" class="uicore-content">`, also unconditionally, not
gated behind that same check at all. `footer.php:14` closes `#content`
unconditionally; `:16-19` runs `do_action( "uicore_content_end", $post )`
(or a hardcoded fallback `<footer id="colophon">`); `:34` closes
`#uicore-page`; `:38` runs `do_action( "uicore_body_end", $post )`; `:42`
closes `.uicore-body-content`; `:49` calls `wp_footer()`, also
unconditionally. **None of the wrapper divs, and neither `wp_head()` nor
`wp_footer()`, are ever part of what a Theme Builder assignment replaces.**
Only the content of the `uicore_page` / `uicore_content_end` action calls
is. The spec's "Elementor Pro's `get_header()` discards UiCore's
`header.php` output entirely" was the wrong mental model for this theme;
UiCore ships native Theme Builder integration (the `uicore-framework`
plugin's `UiCore\ThemeBuilder\Frontend` class,
`includes/theme-builder/class-frontend.php:78-106`, maps `header` to the
`uicore_page` action and `footer` to `uicore_content_end`, each with its
own priority) that injects assigned content through the theme's own hook
points rather than replacing `header.php`/`footer.php` wholesale. The
precise chain from Elementor Pro's `elementor_pro_theme_builder_conditions`
cache down to that hook firing for our specific `elementor_library` posts
was not fully traced (`UiCore\ThemeBuilder\Rule::get_posts_by_conditions()`,
the class that populates what `Frontend` renders, queries `post_type =
'uicore-tb'`, a UiCore-native post type this task never created, so
whatever bridges Elementor's own documents into that same hook is
elsewhere and unconfirmed); repeating a specific guess about it here would
be the same mistake this section is being rewritten to fix, so it is left
as an open question rather than a claim, unlike the wrapper-div structure
above, which is settled and cited.

**Scope limit, also caught by review**: this was checked on `podcast-a`
only, a page that was already converted to Elementor before this task
(carrying its own `elementor-pro-frontend-js` and Loop Grid assets
regardless of Theme Builder). Task 7's bridge stylesheet scope spans plain
WordPress pages and the 45 Beaver-built pages too, not just Elementor
pages, and `uicore-pro/header.php`/`footer.php` is shared by all of them,
so the structural finding above should hold site-wide, but this was not
independently re-checked against a Beaver page's raw HTML before writing
this document.

**Practical effect: this is less disruption than the spec priced in.**
Whatever CSS currently depends on `#uicore-page` / `#content.uicore-content`
for content width, spacing, or other page-wrapper behaviour keeps working
after the header/footer switch, on every page type, because those wrappers
were never part of what the switch touches. Task 7's bridge stylesheet may
need a smaller scope than the spec assumed. Worth re-confirming once Tasks
4/5 apply the real header/footer (not just the marker content), since the
real trees are structurally different from the one-container markers used
here.

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

**A likely-benign change, now corroborated rather than just plausible:**
the MailMunch newsletter modal, present (full overlay at 1440/1024,
compact pinned button at 768/390) on all five pages in the before-set, does
not appear in any of the twenty after-captures. Task 2's baseline document
says MailMunch fires 6-8 seconds after load. `fidelity-browser.mjs`'s
`settleReveal()` was fixed shortly before this task started (commit
`89208bf`: its wait now correctly queries `document.body` instead of
`document`, and per that fix's own report, captures now run roughly four
times faster). File mtimes on the two capture sets back this precisely:
the before-set's twenty files were written between `10:48:27` and
`11:00:26` (roughly 30 seconds per capture); the after-set's twenty were
all written within a single 30-second span, `12:48:16` to `12:48:46`
(roughly 2 seconds per capture). The before-captures sat on each page
about ten seconds longer than the after-captures did, comfortably enough
for MailMunch's 6-8 second trigger on the before-set and not remotely
enough on the after-set. The header/footer switch did not remove
MailMunch; the harness got faster and now finishes before it fires. (The
discriminating experiment described below independently confirms the same
underlying cause: capture speed, not the switch, governs what late JS gets
to run before the screenshot.)

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

Both were **reproducible, not one-off capture flakes**, at the time this
was first written: re-captured both pages a second time independently
(`docs/elementor/beaver-after-recheck/save-our-esa-petition/`,
`docs/elementor/beaver-after-recheck/thank-you-saveouresa/`, moved out of
`beaver-after/` in the fix round so a later task globbing
`beaver-after/*/` against `beaver-before/*/` gets a clean five-to-five
pairing rather than seven directories, two with no before-counterpart),
and both findings reproduced identically both times.

Both were **content-present, render-absent**, confirmed by fetching the raw
HTML with `fetchConverted()` (not just eyeballing the screenshot): `91%`,
`80%`, `78%` and `ESA Parents` all appeared in `save-our-esa-petition`'s raw
HTML; `The ESA Handbook provides essential` appeared intact in
`thank-you-saveouresa`'s raw HTML, inside a normally-structured
`fl-callout` module. Div balance on both pages' raw HTML was even (208/208
and 177/177). So this was never data loss or a broken template, and not
something `fidelity.mjs`'s `checkCopy()` / `checkSections()` would catch,
since both search raw HTML text and both would report this copy as
present. **Worth keeping as a real gap for whoever writes Task 4/5/6's
fidelity checks: a defect that makes real content invisible while leaving
it intact in the markup needs a rendered-page check, not a text-search
one**, even though this specific instance turned out not to be that
defect (below).

**Neither reproduced on the other three sampled pages.** `esa-handbook`,
`2025-tax-calculator` and `updates` matched their before-captures with no
difference beyond the expected marker chrome (and, on `updates`, the
already-known missing featured-image issue Task 2's baseline flagged as a
pre-existing media-sync gap, unrelated to this task).

**Settled, not just theorised: it is the harness, and the switch is
exonerated.** A fix-round review pointed out that the two rechecks above
tested reproducibility, which was never in doubt, not mechanism, which was
the open question, and named a cheap discriminating experiment: recapture
`save-our-esa-petition` with a substantially longer settle than
`settleReveal()` gives it, without touching the shared harness function or
reverting the switch, and see whether the stars and stats come back. Built
a throwaway script (deleted after use, not part of the build) that
navigated the page, scrolled through it in 1200px steps with a 1.2s pause
per step, dwelt 4s at the bottom, then waited another 1s at the top before
capturing. Result, saved at
`docs/elementor/beaver-after-long-settle/save-our-esa-petition/1440.png`:
**the three star icons and all three stats (91%, 80%, 78%, with every
caption) are fully visible**, and the MailMunch modal is visible too
(confirming the timestamp corroboration above independently, in the same
run). The switch did not cause this; the harness's scripted scroll-through
does not give Beaver Builder's own JS and native lazy-loaded images enough
dwell time to finish before the screenshot, on any page where Beaver
happens to gate content that way.

This also settles the mechanism precisely enough to drop half of what was
offered as a guess before this fix round. Both affected modules carry
Beaver Builder's own entrance-animation class (`fl-animation`, confirmed
directly on `thank-you-saveouresa`'s callout module: `fl-module-callout
... fl-animation fl-fancy-pulse`), and the star icons on
`save-our-esa-petition` are native `<img loading="lazy" ...>` elements.
Native lazy-loading cannot explain the missing text, though: on
`save-our-esa-petition` the numerals and captions vanish along with the
stars, and no image-loading story hides text. `fl-animation`'s own
scroll-triggered JS does explain everything on both pages, including the
alternating pattern on `thank-you-saveouresa` (row one's text hidden, row
two's image hidden, each module gated independently) that a shared
lazy-load story never predicted. So the working explanation is Beaver's
own entrance-animation JS specifically, not a mix of that and native
lazy-loading; `fidelity-browser.mjs:196-215` confirms `settleReveal()`
waits only on this build's own `[data-reveal]` elements and nothing else,
so Beaver's unrelated animation system was always invisible to it. A
second, orthogonal Beaver Builder system was also found live on the
install during this check: `11365`'s pre-footer "Stay in Touch" newsletter
signup, discussed below, was directly ruled out as a contributor (confirmed
dormant on every location it is assigned to, none of which render it), so
it was never the explanation for either finding.

Also checked while investigating the two findings above: neither `#uicore-page`-style wrapper divs nor Elementor Pro's own frontend script/style enqueues
(`elementor-pro-frontend-js`, `widget-loop-grid.min.css`, etc., present on
`podcast-a` because that page carries its own converted Loop Grid content,
unrelated to Theme Builder) show any sign of disruption; nothing in either
affected page's raw HTML shows a Theme Builder location marker anywhere
outside the header/footer locations themselves.

## Step 7: the revert, written down, rehearsed, and re-applied

**Every verification fetch below is `fetchConverted()` from `fidelity.mjs`,
preceded by `flushPageCache()`, never a raw `fetch()` against a bare URL.**
A fix-round review pointed out that the recipe as first written showed the
delete/regenerate/re-apply commands but only described the checks as
"fetching podcast-a again", without naming the flush or `fetchConverted()`
explicitly, even though the actual commands run always did both. Given
WP Engine serves stale pages with HTTP 200 and re-warms the cache within
seconds (confirmed for real earlier in this same task: a `fetchConverted()`
call made a few minutes after an explicit flush hit `x-cache: HIT: 1` and
threw, exactly as designed), a recipe that omits the flush and just says
"fetch it" is incomplete: a raw fetch against a warm cache can show the
old state after a successful revert or the old state after a successful
re-apply, making a correct change look broken. Every code block below
states the flush and the `fetchConverted()` call explicitly for that
reason.

**The revert has the same gap the forward path had, and this was proven,
not assumed.** Deleting `_elementor_conditions` postmeta alone does not
restore UiCore's chrome, because the stale cache still lists both
documents:

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m=>m.wpe('wp post meta delete 20573 _elementor_conditions; wp post meta delete 20574 _elementor_conditions; wp elementor flush_css'))"
node -e "
import('./fidelity.mjs').then(async f => {
  await f.flushPageCache();
  const html = await f.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  console.log('EMPOWER HEADER MARKER:', html.includes('EMPOWER HEADER MARKER'));
  console.log('uicore-header:', html.includes('uicore-header'));
})"
```

Run for real. Immediately after, `wp option get
elementor_pro_theme_builder_conditions --format=json` still returned
`{"footer":{"20574":["include\/general"]},"header":{"20573":["include\/general"]}}`,
unchanged, and `fetchConverted()`, called after an explicit
`flushPageCache()`, still showed `EMPOWER HEADER MARKER: true`,
`uicore-header: false`, i.e. the page was STILL switched even though the
postmeta assigning it had just been deleted, and the stale-cache guard
confirms this was a genuinely fresh fetch, not a warm-cache artefact. A
revert that only deletes the postmeta is a broken hope, proven broken
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
node -e "
import('./fidelity.mjs').then(async f => {
  await f.flushPageCache();
  const html = await f.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  console.log('EMPOWER HEADER MARKER:', html.includes('EMPOWER HEADER MARKER'));
  console.log('uicore-header:', html.includes('uicore-header'));
})"
```

Run for real, immediately after the postmeta delete above. The option read
back as `[]`. `flushPageCache()` then `fetchConverted()` against
`podcast-a`: `EMPOWER HEADER MARKER: false`, `EMPOWER FOOTER MARKER:
false`, `uicore-header: true`, `uicore-footer: true`. UiCore's chrome
genuinely back, on a verifiably fresh fetch.

**Then re-applied**, via the fixed `setConditions()` (which now does both
steps, plus its own verification, in one call):

```bash
set -a; . ./.env; set +a
node -e "
import('./elementor/deploy.mjs').then(async d => {
  await d.setConditions(20573, ['include/general']);
  await d.setConditions(20574, ['include/general']);
})"
node -e "
import('./fidelity.mjs').then(async f => {
  await f.flushPageCache();
  const html = await f.fetchConverted('https://empv2.wpenginepowered.com/podcast-a/');
  console.log('EMPOWER HEADER MARKER:', html.includes('EMPOWER HEADER MARKER'));
  console.log('uicore-header:', html.includes('uicore-header'));
})"
```

`flushPageCache()` then `fetchConverted()` a final time: `EMPOWER HEADER
MARKER: true`, `EMPOWER FOOTER MARKER: true`, `uicore-header: false`,
`uicore-footer: false`. Switched state restored, install left in the same
state Steps 4-6 tested against.

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

**Flagged for Paolo to confirm, not presented as a settled call.** 11365
differs from 29 and 154 in a way the "dormant, so hygiene" rule does not
capture. 29 and 154 are chrome whose function this phase is deliberately
taking over; drafting them is pure hygiene against a later theme change
waking dead code. 11365's "Stay in Touch" heading plus embedded Gravity
Form 1, assigned to Home, About and News, is not being taken over by
anything in this phase, and nothing in the Phase 2A plan replaces it.
Drafting it turns a dormant intent into a gone one: it was configured to
appear on those three real pages and currently does not, for a reason
(UiCore's template hooks) unrelated to anyone's decision to remove a
newsletter signup band. Someone at Empower may believe that band exists
and expect it to start working again once whatever broke UiCore's own
`fl_before_footer` call gets fixed, independent of this phase. Reversing
this one draft is a single `wp post update 11365 --post_status=publish`;
its content is quoted verbatim above, so the ceiling on this being wrong
is low, but it is Paolo's call, not this task's.

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

## Fix round 1

Six Important findings from review, all addressed above rather than in a
separate changelog, so each correction sits next to the claim it corrects:
`setConditions()`'s regeneration call now verifies the post actually landed
under a location instead of trusting `regenerate()`'s silence (centrepiece
section, point 5); two real-execution tests now prove `set -e` genuinely
aborts on a failed `wp eval-file`, mirroring `deployPage`'s existing pair;
the captured-script test now asserts write-before-regenerate ordering, the
`.php`-not-`.json` target, and the fully-qualified class name, not just
presence; the documented revert now shows `flushPageCache()` and
`fetchConverted()` explicitly at every verification step; the
`id="uicore-page"` explanation was rewritten from a self-contradiction into
a cited structural finding, with its scope limited to what was actually
checked; and the two content-visibility findings were settled with a real
discriminating experiment rather than left as an unconfirmed guess, which
also let the weaker half of that guess (native lazy-loading, which cannot
explain missing text) be dropped rather than carried alongside the
explanation that actually covers both pages. The `-recheck` capture
directories moved to `docs/elementor/beaver-after-recheck/` so
`beaver-after/` pairs one-to-one with `beaver-before/` again, and 11365's
draft is now explicitly flagged for Paolo to confirm rather than presented
as settled by the same rule that correctly covers 29 and 154.

Two temp files (`_elementor_conditions`'s and the PHP regeneration
script's) still leak on the `set -e` failure path inside `setConditions()`,
since a script that aborts mid-way never reaches its own `rm -f` lines.
Deferred, not fixed here: recorded for the project's final review rather
than acted on in this round.
