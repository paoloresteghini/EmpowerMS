# Handover: class-in-markup, after Tasks 5, 5.5, 6a and 6b

Written overnight, 2026-08-17 into 2026-08-18. Everything below is measured
unless it says otherwise.

## 1. Where things are

| Thing | State |
| --- | --- |
| Branch | `elementor-phase-2b-class-in-markup`, 31 commits ahead of master |
| `master` | Untouched, still unpushed |
| `node --test test.mjs` | 228 pass, 0 fail, unchanged all night |
| `node --test test-elementor.mjs` | 155 pass, 0 fail, 0 skipped, with credentials and `FIDELITY_REQUIRE_ALL=1` |
| Converted pages | `/final/` 20588, `/podcast-a/` 20568, `/what-we-do-a/` 20595 |

**The suite is fully green for the first time in this phase.** Both of the
failures the previous handover described as expected are gone, and neither was
what it was thought to be.

## 2. What landed

**Task 5, podcast-a.** Three headings migrated, the dynamic-tag exemption kept,
all eight of its class-on-wrapper bridge rules deleted in one batch. The
heading-widget sweep's offender list is now EMPTY, so the test that was red by
design since Task 2 is green.

**Task 5.5, inserted.** The box sweep's 390 red was diagnosed and fixed. It was
never `dist/final.html`: `controlBoxes` run against that file alone gave
settled, unsettled, unsettled, and a static file cannot fail intermittently. The
cause was a race in `settleReveal`'s final vertical pass, which stepped by a
viewport height and awaited one animation frame per step, giving the
IntersectionObserver a single chance per position. Repaired with a final catch
pass that scrolls only the still-unrevealed elements into view. Six failures in
eight runs before, five of five green after.

**Task 6a, inserted.** The deferred-image list and a page register the
instruments read. Coverage is DERIVED from `elementor/pages/*/page.mjs`, with an
explicit exclusion list beside it, so a converted page that nobody registers
fails the suite. Each register entry carries its own coverage floors, because
the homepage-calibrated floor of 40 would have rejected `what-we-do-a` (17
census elements against the homepage's 63) however faithful its conversion. This
took three fix rounds and every one of them found something real.

**Task 6b, `what-we-do-a`, the first page built the new way.**

## 3. THE NUMBER, and what it means for the rest

**One bridge rule.** Estimate was two. Plus four deferred photographs, all
triaged by measuring their containing blocks on both sides at both widths rather
than by reading the difference list.

**The rule that prices the remaining eleven, and it is not the one the plan
expected.** Moving classes into the markup fixes WHICH element carries the
class. It does not change HOW DEEP that element sits. Elementor still wraps
every widget in a `.elementor-widget-*` div, so a build selector written with a
child combinator can still fail to reach its target.

The discriminator, and it predicts the cost from the module source before
anything is deployed:

> A child combinator needs a bridge rule when its right-hand side is content the
> module builds as a WIDGET, because Elementor wraps every widget in a div the
> combinator was never written to see through. It needs none when the right-hand
> side is built as a CONTAINER, because a container IS the element and nothing
> is inserted above it.

`.da-door__body > p` matches a `text()` widget, so it broke. `.da-doors >
:nth-child(2)` matches a `container()`, so it did not. That is why counting a
page's child combinators does not price it: `what-we-do-a` has four and needed
one rule.

Two consequences for the estimate. The re-pricing's "new classes" column does
not measure this at all, so the cheapest page by that column is not necessarily
the cheapest page. And podcast-a has ZERO child combinators, which is why its
migration looked so cheap and why it should not be the baseline for what is
left.

## 4. What is next

`solutions-b`, then `capitol-a`, `team-a`, `who-we-are-a`, `mail-a`, `amb-a`,
`epic-a`, `safety`, `work`, `education`, `give-c`, and `team-bio`, which Paolo
put back in the order on 2026-08-18 ("there is only one page design").

The recipe is `task-6b-brief.md` plus `task-6-supplement.md`. Before dispatching
a page, grep its stylesheet for child combinators and classify each one by the
rule above; that is the page's likely bridge cost, and it is now knowable in
advance.

Re-price after three pages, as the plan asks.

## 5. Two things Paolo should know

**I committed the parallel session's `functions.php` as `27611b7`.** Task 5.5
had to add a test to `test-elementor.mjs`, git stages whole files, so that
session's asset-versioning test landed while its implementation did not, and
commit `7734e28` asserted a helper it did not contain. Their code, unchanged,
just committed, so the branch builds at every commit.

**Nothing was pushed and `master` was not touched.**

## 6. Open items carried forward

- The nine permanent box differences on podcast-a: 66 real episodes measured
  against 9 static placeholders. podcast-a is deliberately NOT in the register
  for that reason, recorded in the register itself. Gating it needs a
  content-independent key that nobody has designed.
- `.pca-ep__title`'s anchor is `display:inline` live against the static build's
  flex-blockified `display:block`, worth about a pixel per card and the hover
  underline. Deferred with a ruling.
- `.pca-about__where`'s 48px top margin and the preceding paragraph's 20px
  bottom margin collapse to 48 in the static build and sum to 68 under
  Elementor's flex container. Pre-existing, invisible to both instruments
  because the census reads `marginBottom` only.
- The homepage is still ~182px taller than the static build.
- Two Community Stories posts have no excerpt, so the mini cards render without
  a pull-quote. Content decision.
