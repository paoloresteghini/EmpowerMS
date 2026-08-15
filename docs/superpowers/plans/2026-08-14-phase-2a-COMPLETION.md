# Phase 2A completion record

Phase 2A executed end to end in subagent-driven mode on 2026-08-14. Eight tasks,
one unplanned harness fix, a whole-branch review and its fix wave. This document
replaces the SDD ledger, which was deleted with its workspace once the final
review came back clean, and it is the only place several of these decisions are
written down.

## State at completion

- Branch `elementor-phase-1`, head `863207e`, tree clean. **20 commits** of Phase
  2A on top of `a9a29db`, on top of Phase 1's 32.
- `node --test test.mjs`: **228 passing**, unchanged all phase. The static build
  was never touched: verified per-commit across all twenty, not just at the end.
- `node --test test-elementor.mjs`: **100 tests**, 64 at the start of the phase.
  Without `SPIKE_URL`, 92 pass and 8 fail by design, each naming the variable.
  With it, 100 pass. Five of the eight drive a real browser; three fetch directly.
- `npm test` runs both suites, so it fails without `SPIKE_URL`. That is the
  documented contract, not a defect.
- No new dependencies. The repository still has exactly one, `playwright`, dev.

## What is live on the install

`empv2` renders Empower's real header and footer site-wide as Elementor Theme
Builder parts. UiCore's own chrome is gone from every page.

| Thing | Value |
| --- | --- |
| Header part | `elementor_library` post **20573** |
| Footer part | `elementor_library` post **20574** |
| Primary logo attachment | **20578** |
| Reversed logo attachment | **20577** |
| Beaver layouts drafted | 29 (Header), 154 (Footer), 11365 (Pre-footer) |
| Beaver layouts untouched, still published | 11248, 11272, 11276, 11322, 11325, 11338 |

Redeploy either part with `node elementor/theme-parts/deploy.mjs [header|footer]`.
Before Phase 2A there was no committed way to do this and the README pointed at a
library file with nothing to run.

## The two findings that matter most to Phase 2B

Both are written into `README.md`'s hand-off section as well as here.

**1. Assigning a Theme Builder part is two writes, not one.** Writing
`_elementor_conditions` postmeta is necessary and completely insufficient.
Elementor Pro resolves a location's documents from a cached option,
`elementor_pro_theme_builder_conditions` (`conditions-cache.php:15`), read through
`Conditions_Manager::get_location_templates()` (`conditions-manager.php:328`,
called from `:518`). A direct meta write leaves that cache stale, so the part is
assigned to nothing, renders nowhere, and reports no error while every piece of
postmeta looks perfectly correct. `setConditions()` now regenerates the cache
through Elementor's own `Conditions_Cache::regenerate()` and verifies the document
appears in it afterwards. The plan and the spec both cited
`conditions-manager.php:53`, which is the meta read the editor uses, as if it were
the render path. It is not.

**2. A bridge rule overriding an Elementor container property needs two classes.**
Elementor resolves a full-width flex container's direction through
`.e-con-full.e-flex{flex-direction:var(--flex-direction)}` at specificity 0,2,0,
fed by `.e-con.e-flex{--flex-direction:column}` at the same. A bare `.your-class`
rule at 0,1,0 cannot win no matter where it loads, because loading last breaks
ties only. `.your-class.e-con` does win, because `bridge.css` is enqueued last.
Measured, not reasoned: a scratch general rule moved nothing, the two-class form
moved exactly the three named containers and left `.pca-ep` alone.

The corollary that shaped the fix: `container()` in `elementor/factory.mjs` never
passes `flex_direction`, so any container whose stylesheet says `display:flex`
without naming a direction gets Elementor's `column` rather than the CSS
specification's `row`. Eighteen rules across `css/` and `components/` are that
shape. A general reset was rejected because several other rules set
`flex-direction:column` explicitly on classes that become containers, `.pca-ep`
among them, and a general rule at matching specificity would silently flip them.

**Two classes is the container case. Widget wrappers need four.** Elementor
inflates its own specificity deliberately: `.elementor.elementor .e-con >
.elementor-widget{max-width:100%}` in `frontend.min.css` is 0,4,0, with the class
name repeated to get there. So a `text()`-produced widget wrapper fighting
Elementor's own `max-width` or `margin` defaults cannot be reached by a bare class
or by two. `bridge.css` uses real ancestor classes already in the tree, as in
`.em-footer .em-container .em-footer__mission.elementor-widget`, to reach 0,4,0 and
win on source order. That is the pattern for every later page, not an exception,
and it is why the footer's `max-width` and `margin-block-end` repairs look
disproportionately long.

## An operational trap that will waste an afternoon otherwise

**Cloudflare caches static assets by URL for about a year, independently of
`flushPageCache()`.** `wp page-cache flush` does nothing to it. So a change to
`bridge.css`, or to anything else under the theme, can be synced and deployed and
still not be what the browser receives, with every WP-side check saying the deploy
succeeded. Task 7 found this while measuring the cascade and used `wp cdn-cache
flush` before every measurement. Any later phase that measures a CSS change against
the live install needs both flushes, not one.

## The regression this phase shipped and caught

Moving `js/dropdown.js` to the site-wide enqueue made it collide with
`js/reveal.js`: both declare `const root = document.documentElement` at top level,
which is harmless in ES modules and fatal in classic scripts. They were classic,
because `wp_script_add_data( $handle, 'type', 'module' )` has never emitted
anything: `WP_Scripts::do_item()` builds a tag's attributes from src, id, loading
strategy and fetchpriority only. So `dropdown.js` threw, `data-dropdown` was never
set, and five dropdown panels sat open on every page of the install while every
test passed.

Fixed with a `script_loader_tag` filter, and the three inert `wp_script_add_data`
calls were removed rather than left beside it. A browser test now asserts five
panels visible without JavaScript and zero with it. The blast radius was confined
to the dropdowns: `js/nav.js` does not declare `root`, so `js/reveal.js` claimed it
and ran, and the motion layer was never inert.

## Rulings I made on Paolo's behalf

Recorded because they were decisions taken without asking, and each is reversible.

1. **F1.** The plan's `socialMarkup()` sliced to the partial's last `</a>`, twenty
   lines past the social block, swallowing the Follow and More columns; its own
   test could not catch it. Replaced with a shared nesting-aware `extractBlock()`
   in `elementor/theme-parts/extract.mjs`, created in Task 4 and imported by Task 5.
2. **F2 / D, and I was wrong.** I ruled the logo could stay a native widget because
   its accessible name would fall back to the image's alt text. Measured: attachment
   20578 has no alt text, so the logo link has no accessible name at all. Retracted
   in the code comment and routed to the go-live editorial list.
3. **F3, and I was wrong in a way that cost a regression.** I ruled Task 6 must
   carry `wp_script_add_data(..., 'type', 'module')` and assert it, reasoning that
   it preserved current behaviour. It preserved a false belief instead, and the
   instruction to assert it is what let a green suite sit over a site-wide breakage.
   The lesson is worth more than the fix: a ruling that asserts what the current
   code does must cite the code, not the intent.
4. **F7.** `link()` emits a button widget, so the skip link's `em-skip` class landed
   on a wrapper div while `css/site.css:56`'s `.em-skip:focus` could never match: a
   WCAG 2.4.1 failure invisible to every test in the plan. Kept native per the spec
   and repaired in `bridge.css` with `:focus-within` plus a reset of the inner button
   chrome, with a required test.
5. **F8.** Neither logo was on the install, out of 2,527 attachments. Imported both
   from the synced theme assets rather than hunting.
6. **settleReveal.** Its wait queried `document` where `js/reveal.js` scopes to
   `document.body`, so `<html>` was always in the set and the wait could never
   resolve. Fixed in its own dispatch before Task 3, because four later tasks
   capture screenshots and the failure is silent. Capture time went from 2:33 per
   page to 37 seconds.
7. **Sweeps, not instances.** Twice a review named one example of a mechanism the
   work had already diagnosed, and twice I dispatched an enumeration over the whole
   candidate set rather than the named fix. The footer sweep took the defect list
   from two entries to five and surfaced the flex-direction root cause; the header
   sweep found two defects nobody would catch by eye.
8. **11365.** Drafted on evidence that it renders nowhere. Flagged for Paolo rather
   than presented as settled, because unlike 29 and 154 its content is not being
   taken over by anything in this phase. **This is the one item still awaiting an
   answer.**

Smaller rulings, all recorded in the commits and reports: escalating two reviews and
one implementer above the tier the handover budgeted; writing Task 4's report
attribution myself when two agents produced incompatible accounts of who did what;
folding several minors into fix rounds where they armed traps for later tasks.

## Corrections made to the plan and the spec

- The plan's Step 3 sketch showed a bare single-class bridge selector. Its two
  actual selectors hold; a pattern generalised from them would have shipped inert.
- The spec predicted UiCore's page wrappers would disappear with its chrome.
  `id="uicore-page"` survives, verified twice, so Task 7's scope was smaller than
  priced. Corrected in place with a marked note.
- The spec and plan both cited the wrong Elementor source line for the conditions
  read path. Corrected.
- Phase 1's unconditional enqueue had already changed the body typeface on all 45
  Beaver pages, from the licensed Whitney to the stand-in Source Sans 3, by
  inheritance from `tokens/base.css:3`. Nobody had looked. Recorded in
  `docs/elementor/beaver-baseline.md`.

## What still needs doing

**Immediately, and it is Paolo's call, not mine:**

1. **The branch is unmerged and unpushed.** `finishing-a-development-branch` was
   invoked and stopped at the menu: merge to `master` locally, push and open a PR,
   or keep as-is. Phase 1's 32 commits are in the same branch and equally unmerged.
2. **Run `SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ npm test` once
   before integrating.** I was interrupted before doing it. The fix wave's
   re-reviewer ran it and reported 100 of 100, but that was one commit earlier.
3. **Confirm or reverse the 11365 draft.** One command:
   `wp post update 11365 --post_status=publish`. Its content is quoted verbatim in
   `docs/elementor/theme-part-mechanism.md`.

**Editorial, not code:**

4. Attachment 20578 has no alt text, so the logo link has no accessible name.
   `wp post meta update 20578 _wp_attachment_image_alt 'Empower Mississippi'`.
5. Roughly 42 media-library photographs need alt text before go-live.

**To tell people:**

6. Elementor should hear about the kit-save bug in Pro 4.2.1. It stops anyone,
   Empower included, saving Site Settings on this install, which is the only reason
   container width and widget spacing live in `bridge.css`.
7. Empower cannot save Site Settings, and a nav change means editing
   `src/_shared/header-2.html` and redeploying, not editing in Elementor.
8. MailMunch's popup blocks the episode filter for mouse users site-wide.

**Deferred, triaged by the final review as able to stand:**

9. `README.md` carries 174 em dashes, all pre-existing on `master`, none added by
   this branch. Breaks the project rule and wants its own pass.
10. Both temp files in `setConditions()` leak on the `set -e` failure path, and
    `deployElements()` has the same property. Worth a `trap ... EXIT` in both before
    Phase 2B runs the path fourteen more times.
11. Seven further minors, each recorded in its own task report at the time and none
    of them load-bearing.

## Not started, deliberately

Phase 2B: the fourteen remaining page conversions, fifty-one compositions, ten Loop
Grid slots. Plan it with the foundations' real costs known. Nothing in Phase 2A
converted a page.

## Addendum, the evening of 2026-08-14: what has since been closed

Everything above is the record as Phase 2A left it and has not been rewritten.
This section is what happened afterwards, in a session that started by running
the verification the list above asks for. Numbering follows "What still needs
doing".

**1. The branch is merged.** Paolo chose merge to `master` locally, out of
merge / push and open a PR / leave it. `master` was a strict ancestor, so this
was a fast-forward, not a merge commit: all 55 commits of Phases 1 and 2A are
on `master` with their history intact. **Nothing was pushed**, so `origin/master`
is still at the old head and the GitHub Pages review site is unchanged. The
branch `elementor-phase-1` still exists and now points at the same commit.

**2. The full suite was run and is green.** `SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ npm test`
returned **228 of 228** in `test.mjs` and **100 of 100** in `test-elementor.mjs`,
exit 0, at `104c138` with a clean tree. Both suites were run again after each
change below.

**3. 11365 is published again.** Paolo chose to reverse the draft. `wp post
update 11365 --post_status=publish` ran, and the layout table is now 29 and 154
draft, everything else including 11365 published. Verified inert rather than
assumed: after a `flushPageCache()`, Home, `/about/` and `/updates/`, its three
assigned locations, contain neither `Stay in Touch` nor `gform_wrapper`, and all
three still render Empower's header (`em-header` present, `uicore-header`
absent). Republishing restored the dormant intent and changed nothing visible,
which is exactly what the evidence predicted.

**4. Both logos have alt text.** `_wp_attachment_image_alt` is now
`Empower Mississippi` on 20578 (primary) and on 20577 (reversed), which was not
on the original list and had the same problem. The logo link has an accessible
name. Note for anyone repeating this: two `wp post meta update` calls against
this install took over three minutes to return. They succeeded; they are just
slow.

**5. The photograph count was wrong, by a lot.** Counted on the install rather
than estimated: **2,372 images, 2,343 with no alt text**. Restricted to images
actually in use (attached to a post, or a featured image) it is **1,341 of
1,355**. The "roughly 42" figure is the new build's own photography, not the
library. This is not a pre-go-live task at 1,341 items; the recommendation,
written into README's hand-off section, is to scope it to the images that appear
on the fourteen pages being converted and treat the rest as a separate backlog.

**6. The Elementor bug report is drafted, not sent.** `docs/elementor/pro-kit-save-bug-report.md`
carries a complete report with the reproduction, the three independent routes
that fail, what was ruled out, the suggested fix and the exact environment
(WordPress 7.0.4, PHP 8.4.23, Elementor 4.2.2, Elementor Pro 4.2.1, both
reporting `update: none`). Sending it is outward-facing and Paolo's call. It
goes to Elementor Pro support at `my.elementor.com`, not the public
`elementor/elementor` tracker, which is the free plugin only.

**9. The README em dashes are gone.** 187 em dash characters across 174 lines,
now zero, each rewritten individually rather than swept, because the correct
replacement is not uniform. Sixteen lines gained a connective word; the other
158 differ by punctuation alone, verified by comparing each changed line's word
multiset against the original rather than by eye. No heading was renamed, which
matters because `test.mjs` asserts README content by substring.

**10. The temp files no longer leak.** `deployElements()` and `setConditions()`
now register a `trap ... EXIT` before the heredoc that creates each file, and
the mid-script `rm -f` lines that `set -e` never reached are gone rather than
left beside the trap. Three tests, written first and watched fail: each runs the
real script through real bash and reads `/tmp` afterwards. This was not
theoretical, and the evidence is worth keeping: the development machine's own
`/tmp` held **168** leaked files from local test runs alone. `test-elementor.mjs`
is now **103** tests, not 100.

**Still open from that list:** 7 and 8, which are things to tell Empower rather
than tasks, and 11, the seven minors in the task reports. Item 5 is open but
reframed. Phase 2B is still not started.

## Reading order for whoever picks this up

1. This document.
2. `docs/elementor/theme-part-mechanism.md`, the conditions-cache finding, the
   rehearsed revert, and the Beaver layout final state.
3. `wp/empowerms-child/css/bridge.css`, which carries the cascade reasoning inline.
4. `README.md`'s hand-off section, which carries the policies.
5. `docs/elementor/beaver-baseline.md` for what Phase 1 had already changed.
6. `docs/superpowers/specs/2026-08-14-elementor-phase-2-foundations-design.md`, now
   carrying its own corrections.
