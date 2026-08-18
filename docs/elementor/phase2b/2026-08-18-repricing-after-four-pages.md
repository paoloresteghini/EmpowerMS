# Re-pricing the remaining pages, after four conversions

The plan asks for a re-price after three pages. Four are done: the homepage and
`podcast-a` (converted the old way, then migrated) and `what-we-do-a` and
`solutions-b` (built class-in-markup from the start). This replaces the estimate
in `2026-08-15-uicore-removal-and-repricing.md` section 6, which counted new
CSS classes, a quantity that turns out not to predict cost at all.

## What a page actually costs

| Page | Bridge rules | Deferrals |
| --- | --- | --- |
| `what-we-do-a` | 1 | 4 |
| `solutions-b` | 2 | 0 |

Both came in at or under their old estimates. The class-in-markup change did
what it was for: the build's own CSS applies unaided, so what remains is not
about classes.

## What the cost IS about

Every rule either page needed was a POSITION-DEPENDENT SELECTOR repair. Moving
a class into the markup fixes which element carries it; it does not change where
that element sits, and Elementor wraps every widget in its own div.

The rule, stated precisely (see the conversion recipe section 6 for the
derivation and the corrections it went through):

> A position-dependent selector needs a bridge rule when the widget wrapper
> falls BETWEEN the selector's reference point and its target.

## The measured counts, and the one that matters

Two greps per page, over its own stylesheet plus any shared sheet it loads.

**Grep 1, child combinators (`>`), is effectively DONE.** Counted across every
remaining signed-off page: **zero**, on all of them. The homepage's six were the
outlier and they are already paid. `what-we-do-a`'s four were the last of them.
This grep can be skipped from here, and its absence is why the remaining pages
look cheaper than the first two.

**Grep 2, structural pseudo-classes, is the whole remaining cost:**

| Page | Structural hits | Notes |
| --- | --- | --- |
| `amb-a` | 0 | but see the third category below: NOT a zero-cost page |
| `team-a` | 1 | |
| `mail-a` | 1 | |
| `capitol-a` | 2 | CONVERTED 2026-08-18, cost 4 rules (3 structural, 1 native-control) |
| `team-bio` | 2 | back in the order, Paolo 2026-08-18 |
| `epic-a` | 4 | |
| `give-c` | 4 | |
| `who-we-are-a` | 10 | the expensive one |
| `safety` / `work` / `education` | 2, shared | all three load `css/solution.css`; the structural cost is paid ONCE |

## How to read those numbers, because hits are NOT rules

A hit costs a rule only where a widget boundary intervenes. On `solutions-b`,
six structural hits produced ONE rule: five targeted containers or sat inside a
single authored markup string, and only one crossed a wrapper. On
`what-we-do-a`, four child combinators produced one rule for the same reason.

**So treat the hit count as an UPPER BOUND, roughly one rule per three to six
hits.** On that basis the eleven remaining pages should cost in the region of
ten bridge rules in total, with `who-we-are-a` carrying the largest share and
`amb-a` likely costing nothing.

## The cheapest lever, and it is a build decision rather than a repair

A structural pseudo-class over a list costs nothing if the whole list is built
as ONE `html()` widget, because then no wrapper falls inside it. That is only
available when nothing inside the list needs to be a widget: no photographs, no
per-item dynamic content. `capitol-a`'s triptych qualifies and is being built
that way; `solutions-b`'s station list did not, because its items hold real
`image()` widgets, so it took `role="list"` on a container tree instead.

Check that first on every remaining page. It converts a predicted rule into no
rule, and it preserves real `<ul>`/`<li>` semantics into the bargain.

## Two things the count does not capture

**Images.** `what-we-do-a` deferred four photographs and `solutions-b` deferred
none, because four differences that looked like placeholder crops turned out to
be a widget wrapper failing to stretch. See the recipe's section 1 third
question. A page with photographs in fixed-ratio containers should expect one
rule of that shape, and it is not visible in either grep.

**Section-level ids.** `_attributes` silently refuses `id`; `_element_id` works
on a container (measured on `solutions-b`, 2026-08-18). Six remaining pages
carry in-page anchors onto section ids and every one needs the working route.
No bridge rules, but it is real work and it fails invisibly if done the obvious
way.

## A THIRD cost category, added after `capitol-a`: native controls

Neither grep sees it, and it corrects this document's own first draft, which
called `amb-a` a likely-zero page on the strength of its zero structural hits.

Elementor's kit styles every native `<button>`, `<input>`, `<select>` and
`<textarea>` on the page, so any native control the build styles itself needs a
named bridge rule. `bridge.css` already carries a group of these, and
`capitol-a` added one more for a `<button type="reset">` in its filter form,
the same shape as `podcast-a`'s `.pca-facets__clear`.

Counted across the remaining pages. Most carry exactly TWELVE native controls
and all twelve are header chrome (four `.em-header__link`, one
`.em-header__disclosure`, one `.em-header__toggle`, one `.em-header__search`,
five `.em-mobilenav__trigger`), already bridged site-wide by the theme-part
work, the disclosure included (`bridge.css:1538`). Only two pages carry page-specific ones:

| Page | Page-specific native controls |
| --- | --- |
| `amb-a` | **10**: four `.em-input`, FOUR unclassed checkboxes, one `.em-textarea`, one submit button |
| `mail-a` | 5: four `.em-input`, one submit button |
| `capitol-a` | 3: two checkboxes and the `<button type="reset">` that surfaced this category (converted, 1 rule) |
| every other remaining page | 0 |

**Count them INSIDE `<main>`, not by class.** This table's first version said
`amb-a` carried six, and it was wrong because it counted controls that have a
`class` attribute. `amb-a`'s four checkboxes carry none: the build styles them
by descendant selector at `css/amb-a.css:159-162`
(`.aba-check input{...accent-color:var(--em-orange)...}` plus its
`:focus-visible`), both at 0,1,1, which is the specificity every build button
rule sits at and which the kit's own input selectors outrank. They are, if
anything, the highest-risk controls on that page, because the kit's field
styling reaches unclassed inputs. Counting inside `<main>` also drops the shared
header and footer chrome automatically, which is what the twelve-per-page figure
was doing by hand.

Those are the two form-shaped pages in the build, and they are where this
category lands. Expect `amb-a` and `mail-a` to cost more than their structural
hit counts suggest, and every other page to cost nothing on this axis.
