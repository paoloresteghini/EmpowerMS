# Phase 2A: the foundations the other fourteen pages stand on

**Date:** 2026-08-14
**Status:** design agreed in conversation, awaiting written review
**Parent design:** `docs/superpowers/specs/2026-08-12-elementor-conversion-design.md`
**Evidence this is written from:** `docs/elementor/spike-report.md` (Phase 1's
findings), `docs/elementor/schema-4.2.2.md` (the captured schema), and the live
install, re-checked 2026-08-14.

This is a separate document rather than an amendment to the parent design,
deliberately. A document amended in place satisfies the reader while its
surrounding prose still encodes the superseded assumption, and Phase 1 lost a
task to exactly that. The parent design stands as written and struck through;
this document says what Phase 2A does.

## The job

The conversion's remaining work is fourteen pages, fifty-one distinct
compositions, ten Loop Grid slots. At the rates Phase 1 measured (30 to 35
minutes for a plain section, 4 to 5 hours for the library section) that is far
too large to plan as one unit, and its later tasks would be written furthest
from evidence, which is the condition under which every Phase 1 brief acquired
its defect.

So Phase 2 is sliced. **Phase 2A is the foundations every one of those fourteen
pages depends on, and it converts no pages.** Page batches are planned after
it, with the foundations' real costs known rather than estimated.

## Scope

| In | Out |
| --- | --- |
| Header and footer as Elementor Theme Builder parts, applied site-wide | Any of the fourteen remaining page conversions |
| Beaver Builder's Header and Footer layouts disabled, its Pre-footer decided on evidence | Its six post, archive, search and `person` templates, which stay exactly as they are. Removing Beaver Builder, or converting its 32 undesigned pages |
| The bridge stylesheet created, carrying what Site Settings cannot hold plus the header and footer's own wrapper fixes | The other eleven at-risk stylesheets, which belong to pages that do not exist yet |
| Enqueue widened so the site-wide chrome's CSS and JS load everywhere | The single post, archive, search and 404 templates, still deferred by the parent design |
| Harness checks the spike says every later page needs | The go-live gate |
| Four policies settled once (below) | Gaps 1 and 2, which are Empower's to answer |

`podcast-a` is the one converted page and it is the proving ground for all of
it: it currently renders UiCore's logo, a "Get a Quote" button, a breadcrumb and
a "© UiCore 2026" footer, evidenced at `docs/elementor/spike/1440.png`.

## Decisions taken

Four, all settled with Paolo on 2026-08-14.

| Decision | Chosen | Rejected, and what it would have cost |
| --- | --- | --- |
| Phase 2 slicing | Foundations alone, page batches planned after | Foundations plus the hardest three pages; all fourteen in one plan; pages first with foundations last. The last would verify every page against chrome that then changes under it |
| Theme part conditions | **Entire Site now, Beaver's layouts disabled in the same step** | Conditions naming only converted pages, widened at cutover. That was the recommendation; the site-wide choice tests the parts against real content immediately and is taken with the blast radius understood and a revert written first |
| Reaching a page under conversion | **Publish it**, under the install's own robots.txt disallow, linked from nothing | An authenticated Playwright session (verifies markup but no longer what an anonymous visitor gets, since preview bypasses the page cache); a post password (WordPress replaces the content with a form, which is exactly what the section and copy checks read) |
| How the header is built | **Native shell, nav as markup** | One verbatim HTML widget (cheapest, least editable); Elementor's Nav Menu widget (most editable, and it discards `header-2.css`, `js/dropdown.js`, `js/nav.js`, the split Solutions item and the no-JS contract) |

## Architecture

### The header part, element by element

`src/_shared/header-2.html` is the source of truth. All fifteen in-scope pages
include it; none of them uses the mega menu. Its behaviour is a contract, not
just markup: `aria-controls` ids bound by `js/dropdown.js` and `js/nav.js`, a
split link-plus-disclosure item Empower asked for on 2026-08-05, and
`aria-expanded="true"` defaults so every panel is open before JavaScript runs
and the script closes them. That last one is what satisfies the build's
"visible without JavaScript" rule.

| Part | Treatment | Why |
| --- | --- | --- |
| `<header class="em-header em-header--flat">` | Native container, `html_tag: header` | A container's class lands on the container itself (spike §1) |
| `.em-utility` strip and its two strings | Native container plus two text widgets | No behaviour attached |
| `.em-header__logo` and its image | Native image widget with a link | No behaviour attached. Alt text comes from the attachment, never from the JSON (spike §5.6) |
| `.em-header__nav` and its five dropdown panels | **HTML widget, verbatim** | Nothing native emits `aria-controls` pairs, `role="group"`, or the split item |
| `.em-header__actions` | **HTML widget, verbatim** | The hamburger is three `<span>` bars carrying `aria-controls="mobile-nav"`. A button widget cannot emit it. The Donate button inside it is native only if it can be lifted out without breaking the actions row's flex; decided by measurement, not in advance |
| `.em-mobilenav` | **HTML widget, verbatim** | Duplicates the whole tree with its own `aria-controls` pairs |

Three HTML widgets, not one. That is the cost of the native-shell choice, taken
knowingly: what becomes editable in Elementor is the utility strip, the logo and
possibly the Donate button, and the nav, which is the thing anyone would
actually want to edit, stays as markup either way.

**This is a fourth sanctioned exception** to the parent design's three
(`mail-a/03-receive`, the two filter bars, `epic-a/03-method`). It is recorded
here as an exception with its reason, not left as drift, and the "no fourth
HTML-widget exception was needed" line in the spike report describes Phase 1
only.

**A consequence to measure, not assume:** `.em-header__bar` is a bare class rule
carrying the header's flex layout, and under Elementor that class sits on a
wrapper div rather than on the element the stylesheet was written against. Bare
class rules are exactly the shape the spike's grep cannot find (spike §1, the
`.em-btn` case), so the header bar's layout is checked against a rendered page
and whatever it needs goes in the bridge stylesheet.

### The footer part

`src/_shared/footer.html`, 39 lines. Native throughout except the four social
icons, which stay as one markup block, matching how the spike treated inline
SVG. Its three columns carry `data-reveal="fade"` inside a `data-reveal-group`;
those attributes must survive, since `css/motion.css` hides what
`js/reveal.js` then reveals, and a page that gets one without the other ships
blank below the fold. Valueless attributes convert correctly (spike, "What Task
6 also confirmed").

### The site-wide switch, and its real blast radius

Both parts get an Entire Site display condition, and Beaver Builder's chrome
layouts are disabled in the same step. Two headers rendering at once is the
failure this ordering exists to prevent.

**"Disable Beaver's 9 theme layouts" is wrong, and the install says so.** Read
2026-08-14, the nine `fl-theme-layout` records are not nine pieces of chrome:

| ID | Title | Disable in this phase? |
| --- | --- | --- |
| 29 | Header | Yes. Our header part replaces it |
| 154 | Footer | Yes. Our footer part replaces it |
| 11365 | Pre-footer | **Measure first.** Nothing in this build corresponds to it. Disabling it removes a band from 45 pages; leaving it leaves a Beaver-styled band above an Elementor footer |
| 11248 | Posts Archive | **No** |
| 11272 | Post Singular | **No** |
| 11276 | Posts Category Archive | **No** |
| 11322 | Post Author Archive | **No** |
| 11325 | Search Results | **No** |
| 11338 | Person Singular | **No** |

The last six are the single post, archive and search templates the parent design
explicitly defers to a later phase. Disabling them strips the template from every
post, category, author, search and `person` URL on the install, which is a
larger and quieter break than the one this switch is trying to avoid. Only 29 and
154 are disabled here; 11365 is looked at first and decided on evidence.

### Corrected during planning, 2026-08-14: the chrome being replaced is UiCore's, not Beaver's

Established by fetching the install's own homepage and by reading Elementor
Pro's and UiCore's source on the install, not from the survey's inventory:

- **UiCore renders the chrome on every page.** The homepage carries
  `uicore-header`, `uicore-footer`, `uicore-body-content` and `id="uicore-page"`,
  and no `fl-theme-layout` markup. UiCore's `header.php` prints it through
  `do_action('uicore_page')`.
- **Beaver's Header (29) and Footer (154) layouts are dormant.** `bb-theme` is
  inactive and the active theme renders its own chrome, so those two records are
  not what a visitor sees. Disabling them is hygiene, not the switch. The switch
  is the Elementor one below. This does not change the ruling on the other six
  layouts: they stay, and they are still the post, archive, search and `person`
  templates.
- **Elementor Pro replaces UiCore's chrome through its theme-support fallback.**
  UiCore registers no Elementor theme locations, so
  `ElementorPro\Modules\ThemeBuilder\Classes\Theme_Support::after_register_locations()`
  registers the core `header` and `footer` locations with `overwrite => true`,
  and then hooks `get_header` and `get_footer` **only if at least one document is
  assigned to those locations**. ~~Its `get_header()` buffers the theme's
  `header.php` and discards the output, printing
  `views/theme-support-header.php` instead, which emits its own doctype, `head`,
  `wp_head()` and `wp_body_open()` and then calls `do_location('header')`.~~
  **Corrected 2026-08-14, Task 3 (`docs/elementor/theme-part-mechanism.md`,
  "`id="uicore-page"` survived, contrary to the spec's prediction"):** this
  was the wrong mental model for this theme. UiCore ships its own native
  Theme Builder integration (`uicore-framework`'s
  `UiCore\ThemeBuilder\Frontend` class), which injects assigned content
  through the theme's own `uicore_page` / `uicore_content_end` action hooks
  inside `header.php`/`footer.php`, rather than Elementor Pro's generic
  fallback replacing those files' output wholesale. `header.php` and
  `footer.php` both run in full, unconditionally, on a switched page.

Three consequences the implementation must respect:

1. ~~**Both parts ship together or neither does.** Swallowing `header.php`
   discards UiCore's opening `<div class="uicore-body-content">`,
   `<div id="uicore-page">` and `<div id="content" class="uicore-content">`,
   while `footer.php` still prints their closing tags unless the footer location
   is also filled. A header part with no footer part leaves the document
   unbalanced.~~ **Corrected below (point 2): the wrapper divs are never
   discarded either way, so this specific mechanism is not why both parts
   must ship together.** They still should, for the more direct reason that
   a header with no footer condition leaves whichever one IS assigned
   inconsistent with the site's actual chrome; verified as still true in
   practice (Step 5 of the div-balance check: 524 open, 524 close, delta 0)
   without needing the discarded-`header.php` premise.
2. ~~**UiCore's page wrappers disappear**, so any UiCore rule scoped to
   `#uicore-page` or `#content.uicore-content` stops applying to page content,
   not just to chrome. Nothing in this build depends on those wrappers, but the
   page body's inherited padding and max-width may move, which is why
   `podcast-a` is re-read at four widths after the switch rather than only its
   header and footer.~~ **Disproved 2026-08-14, Task 3.** Checked directly on
   the switched `podcast-a` page: `id="uicore-page"` is still present, and
   `#content.uicore-content` still closes correctly (div balance 0, not
   negative). None of UiCore's wrapper divs, `wp_head()` or `wp_footer()` are
   ever part of what a Theme Builder assignment replaces; only the content
   inside the `uicore_page` / `uicore_content_end` action calls is. This is
   **less disruption than priced in here**, not more: CSS depending on those
   wrappers keeps working unchanged. Full account:
   `docs/elementor/theme-part-mechanism.md`, same section as above.
3. **The mechanism is verified from source, not yet observed.** A capability
   being present and it producing the output you need are different claims, and
   the second is the one that matters. The plan's first live task proves it with
   marker content before anything real is built on it.

**A finding that resizes this, established 2026-08-14 by reading
`wp/empowerms-child/functions.php`:** `tokens/*.css`, `components/components.css`,
`css/site.css`, `js/nav.js` and `js/reveal.js` are enqueued unconditionally and
already load on every page of the install, the 45 Beaver Builder pages
included, and have since Task 4. `css/site.css` styles bare `h1`, `h2`, `h3` and
`p`. So those pages are already being restyled today, by Phase 1, and nobody has
looked at one. The switch itself adds only `css/header-2.css` and
`js/dropdown.js` to that site-wide set.

That makes two distinct pieces of work, and they must not be conflated:

1. **Look at a Beaver page now**, against its live equivalent on
   empowerms.org, and record what Phase 1's unconditional enqueue already did to
   it. This is a Phase 1 consequence no test covers.
2. **Screenshot a sample of Beaver pages before and after the switch**, and read
   them side by side. The sample is chosen to span the shapes that exist
   (a campaign page, a thank-you page, a resource page, a calculator, a content
   index), not the first five in a list.

**The revert is written and rehearsed before the switch is made**, not after: one
command re-enabling the Beaver layouts, one removing the Elementor conditions.

### The bridge stylesheet

New file in the child theme, additive, in git, with its own tests. The 50
existing stylesheets stay untouched and stay under `test.mjs`'s 228 assertions.
It carries exactly three things in this phase:

1. **What Elementor Site Settings cannot hold.** Container width, Empower's
   `--container-max` of 1200px against UiCore's 1170, and zero widget spacing
   against UiCore's 20. There is no other home for these: Site Settings cannot be
   saved on this install at all, an Elementor Pro 4.2.1 bug reproduced three ways
   (spike §5.2).
2. **The header and footer's own wrapper fixes**, measured against a rendered
   page rather than derived from the selector grep.
3. **`podcast-a`'s known `.em-btn` case**, where the wrapper is styled correctly
   by class and the `<a>` inside still wears Elementor's default chrome.

The remaining eleven at-risk stylesheets are explicitly out. They belong to
pages that do not exist yet, and their real scope is "read section by section
against a rendered page", which cannot be done before the page renders.

## Policies settled once

Named here so no later page reinvents them:

- **Pages are published during conversion.** The install's `robots.txt`
  disallows everything (re-verified 2026-08-14: `User-agent: *` / `Disallow: /`),
  the pages are linked from nothing, and unpublishing is one command. If that
  `robots.txt` ever stops saying that, this policy stops being safe, so the
  harness checks it rather than trusting it.
- **`_element_cache: 'yes'` by rote** on every Loop Grid container that takes an
  attribute from PHP rather than from a dynamic tag. A Loop Item's top-level
  element is baked once per page load and reused for every iteration otherwise
  (spike §5.1), which produces no error and no symptom beyond a wrong attribute.
  The harness asserts per-item variation rather than trusting one card.
- **Every fetch checks `x-cache` on that specific response.** WP Engine serves
  stale pages with HTTP 200, and the cache re-warms within seconds of a flush
  (spike §5.3).
- **The handover point** after which no more `_elementor_data` is written gets
  named in the implementation plan. Until it, this repository is the source of
  truth and the JSON is overwritten freely; after it, a rebuild would destroy
  Empower's own edits.

## The fidelity harness in this phase

The harness gates pages, and in this phase the artefact under test is chrome
rather than a page body, so three checks are added to `test-elementor.mjs`:

1. **The chrome renders on a converted page**: the header and footer's own
   section classes present, in the right order, on the live `podcast-a`.
2. **The no-JS contract holds**: every dropdown panel's `aria-expanded` default
   and `aria-controls` target resolve, and no nav content is hidden behind a
   trigger before JavaScript runs.
3. **Per-item variation on a Loop Grid**, the element-cache check above, written
   once here so every later loop inherits it rather than rediscovering §5.1 by
   symptom.

## Verification, and what done means

- `node --test test.mjs`: 228 passing, unchanged. `src/`, `css/`, `tokens/`,
  `components/`, `build.mjs` and `test.mjs` are not touched by this phase.
- `node --test test-elementor.mjs`: green, including the three new checks.
- The converted `podcast-a` renders Empower's header and footer at four widths,
  captured and read by eye against `docs/elementor/spike/static-reference/`.
- The Beaver sample compared before and after the switch, and the separate
  pre-existing-restyle finding recorded with evidence.
- Every deviation from this document recorded in the plan's ledger with the
  evidence that caused it.

## Risks

| Risk | Handling |
| --- | --- |
| The site-wide switch changes 45 live-shaped pages at once | Sample screenshotted before and after, spanning page shapes rather than the first five found. Revert written and rehearsed before the switch |
| Disabling the wrong Beaver layouts strips the template from every post, archive, search and `person` URL | Only Header (29) and Footer (154) are disabled. The six template layouts are named in this document precisely so a brief cannot say "disable the nine" |
| Beaver's layouts and Elementor's parts both render, giving two headers | Established 2026-08-14 that Beaver's chrome layouts are dormant and UiCore renders the chrome. The after-screenshots are still what prove it |
| A header part ships without a footer part, leaving UiCore's opening wrappers discarded and their closing tags printed | Both parts are created and assigned in the same task, marker content first. Never one location filled alone |
| `.em-header__bar` and other bare class rules are wrong once their class sits on a wrapper, and the selector grep cannot find them | Checked against a rendered page at four widths, not by grep. Whatever it needs goes in the bridge stylesheet |
| The three header HTML widgets make the header un-editable in practice | Accepted with the trade-off stated. The handover documents that a nav change means editing `src/_shared/header-2.html` and redeploying |
| Phase 1's unconditional enqueue has already changed the 45 Beaver pages | Its own task, separate from the switch, so the two causes cannot be confused |
| Elementor Site Settings still cannot be saved | Container width and widget spacing live in the bridge stylesheet. Empower must be told they cannot save Site Settings either |
| A brief in this plan is wrong | The normal case in Phase 1, not the exception (spike §5.11). Briefs are written expecting verification against the real install, and any code block a task transcribes verbatim is either run during planning or marked as an unverified sketch |

## Open questions

1. Whether the clone will be re-synced from live before cutover. It is behind on
   Gravity Forms and Stripe, and a re-sync would overwrite converted pages.
   Unanswered since 2026-08-12 and it now guards more work than it did then.
2. Empower's answer on the podcast guest taxonomy, and on a Reports category.
   Neither blocks this phase; both block pages in the phases after it.
3. Whether the Donate button can be lifted out of the actions block as a native
   widget without breaking that row's layout. Decided by measurement during the
   work, recorded either way.
