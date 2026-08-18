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
| `amb-a` | 0 | PRE-PRICED 2026-08-18: 2 repairs, 3 blocks. One shared submit button, one mosaic image wrapper. Its ten native controls cost ONE repair, not ten |
| `team-a` | 1 | |
| `mail-a` | 1 | PRE-PRICED 2026-08-18: 1 repair, 2 blocks, and it is the SAME submit-button repair as `amb-a`, so whichever converts second pays nothing for it. Its structural hit costs nothing if the list is one `html()` blob |
| `capitol-a` | 2 | CONVERTED 2026-08-18: 4 REPAIRS, 5 rule blocks (3 structural, 1 native-control needing a base and a `:hover`) |
| `team-bio` | 2 | back in the order, Paolo 2026-08-18 |
| `epic-a` | 4 | |
| `give-c` | 4 | |
| `who-we-are-a` | 10 | PRE-PRICED 2026-08-18: 4 repairs. NOT the expensive one on this axis: nine of the ten hits target containers, so grep 2 costs ONE repair. The other three are photographs in fixed-ratio containers, which this table cannot see |
| `safety` / `work` / `education` | 2, shared | all three load `css/solution.css`; the structural cost is paid ONCE |

## Counting convention, stated because two documents disagreed

A REPAIR is one defect closed. A RULE BLOCK is one selector-plus-declarations in
`bridge.css`. They usually match and sometimes do not: a native-control repair
typically needs a base block and a `:hover` block, and that is ONE repair in two
blocks. `capitol-a` is 4 repairs in 5 blocks. Quote repairs when pricing effort
and blocks when measuring how much CSS the bridge has grown; say which you mean.

## How to read those numbers, because hits are NOT rules

A hit costs a rule only where a widget boundary intervenes. On `solutions-b`,
six structural hits produced ONE rule: five targeted containers or sat inside a
single authored markup string, and only one crossed a wrapper. On
`what-we-do-a`, four child combinators produced one rule for the same reason.

**So treat the hit count as an UPPER BOUND, roughly one rule per three to six
hits.** On that basis the eleven remaining pages should cost in the region of
ten bridge rules in total.

The two sentences that used to follow this one, ranking `who-we-are-a` as the
largest share and `amb-a` as likely zero, were BOTH WRONG, and in opposite
directions. Pre-pricing on 2026-08-18 put `who-we-are-a` at four repairs of
which only one is structural, and `amb-a` at two. A ranking built on grep 2
alone ranks pages by one term of a four-term price.

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

SCOPE CORRECTED 2026-08-18 by measurement, after this paragraph re-ranked
`amb-a` on a premise that is false. The kit does not style every native control.
Fetched whole, `wp-content/uploads/elementor/css/post-20547.css` is 2698 bytes
and its only control rule is:

    .elementor-kit-20547 button,
    .elementor-kit-20547 input[type="button"],
    .elementor-kit-20547 input[type="submit"],
    .elementor-kit-20547 .elementor-button { ... }

plus its `:hover,:focus` twin and two `@media` restatements of `font-size` and
`padding`. There is NO rule for `input[type=text]`, `input[type=email]`,
`input[type=checkbox]`, `textarea` or `select` anywhere in the file. Re-derive
this rather than trusting it: fetch the kit and read it, since it is regenerated
whenever Site Settings change.

So the category is real but narrow: it is BUTTONS, plus anything carrying
`.elementor-button`. Any native control the build styles itself needs a named
bridge rule only where something actually competes with it. `bridge.css` already
carries a group of these, and
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
(`.aba-check input{...accent-color:var(--em-orange)...}` at 0,1,1, plus its
`:focus-visible` at 0,2,1, since a pseudo-class counts as a class). Those are
the specificities the kit's own input selectors WOULD outrank if the kit had
any, and it has none. Counting inside `<main>` also drops the shared header and
footer chrome automatically, which is what the twelve-per-page figure was doing
by hand.

An earlier version of this paragraph called those four checkboxes "if anything,
the highest-risk controls on that page, because the kit's field styling reaches
unclassed inputs." That is exactly backwards and it is what re-ranked `amb-a` as
a top cost driver. Measured 2026-08-18 by injecting each control into a live
converted page inside `div.elementor .e-con` with the page's own sheet applied,
and comparing computed styles against the same markup in the static build at
1440: `input.em-input`, `textarea.em-textarea` and the unclassed checkboxes show
ZERO differences, because nothing competes with them. Only the submit button
differs, on five properties.

So NINE of these two pages' fifteen controls cost nothing, and the counting
method the paragraph above introduced is what makes that checkable. What the
count measures is exposure, not price: a control is only a cost where something
outranks the build.

Those are the two form-shaped pages in the build, and this category lands on
their submit buttons and nowhere else. On bridge cost they are now among the
CHEAPER remaining pages, not the dearer ones. Two things do make them expensive,
and neither is a bridge rule: the build's first native `.em-btn--primary` is not
restated in `bridge.css` at all (`:814-844` restates base, `--md`, `--lg` and
`--inverse` only, deliberately, with the reason written at `:811-813`: those
were the only ones a native button used at the time), and Elementor's container `html_tag` control offers no
`form`, `fieldset` or `legend`, so how these two forms get built is an open
decision rather than a conversion step. See `elementor/pages/final/06-joinus.mjs:12`.

## A FOURTH category, added after `team-a`: images in fixed-ratio containers

No stylesheet grep can see this one either, and it has now cost a rule on two of
the five pages built the new way.

Where the build puts a photograph in a container with a fixed `aspect-ratio` (or
a fixed height) and sizes the `<img>` with `height:100%;object-fit:cover`, the
converted page needs one named rule. Elementor's containers are COLUMN flex, so
a widget wrapper stretches to its parent's WIDTH for free and never to its
HEIGHT, and the `<img>`'s percentage height then resolves against an
auto-height wrapper and falls back to the photograph's intrinsic ratio.

Instances so far, corrected 2026-08-18 by Task 9's review, which found this
list naming the wrong precedents while arriving at the right count:
`.fp-hero__media` and `.fp-hero__aside` (homepage, `bridge.css:403-419`),
`.sb-station__media` and `.sb-stories__band` (`solutions-b`,
`bridge.css:1999-2000`), `.ta-hero__media` (`team-a`, `bridge.css:2164`). Five,
and `team-a`'s is the fifth. Derive this count rather than copying it: `grep -n
'> .elementor-widget-image' wp/empowerms-child/css/bridge.css`.

`.c2-panel__bg` and `.em-join__wash` are NOT instances of this category, even
though their symptom reads the same in the sweep. Their own comment at
`bridge.css:481-486` says why: both wrappers ARE the positioned box
(`position:absolute;inset:0`), so each already had a definite height and the
percentage had something to resolve against. Their defect was
CLASS-ON-WRAPPER, `image()` moving `cssClass` off the `<img>`, and their repair
targets the `<img>`, not the wrapper. Following that precedent for a
fixed-ratio container would not fix this defect at all.

TWO repair techniques are on record for this category and the choice is not
arbitrary:

- `display:contents` on the wrapper, the homepage's technique
  (`bridge.css:413-417`), which removes the wrapper from the box tree so the
  build's own rules reach the `<img>` unchanged. Its argument, written there:
  a restatement is a copy that goes stale the day somebody edits the
  stylesheet. Unavailable when the wrapper is load-bearing, which is exactly
  why `.c2-panel__bg` could not use it.
- `height:100%` on the wrapper, the technique `solutions-b` and `team-a` use.
  Not a value copy, so the staleness argument does not bite, and it leaves the
  wrapper in the box tree.

Repair each one NAMED: `.your-container > .elementor-widget-image
{height:100%}`. Do not generalise it across containers; this file records four
separate occasions where a rule broad enough to cover its siblings also beat
something it should not have.

**The check, which takes one grep of the page's own stylesheet:** does any
selector combine `aspect-ratio` or a fixed `height` on a container with
`height:100%` on an `<img>` inside it? If yes, expect one rule per such
container.

## So a page's price is four things, not two

1. Structural pseudo-classes (grep 2), classified widget-or-container.
2. Photographs in fixed-ratio containers (the check just above).
3. Native controls inside `<main>` (only `amb-a` at 10 and `mail-a` at 5).
4. Child combinators (grep 1), which are exhausted: zero on every remaining page.

**Both of the controller's per-page misses came from categories 2 and 3**, never
from the greps, which have not yet been wrong about a structural hit. The greps
are sound for what they cover and cannot price a page on their own, because two
of the four categories are invisible to a stylesheet search by construction: one
depends on Elementor's kit meeting an authored control at render time, the other
on flex defaults meeting an image widget.

## THE WHOLE REMAINING ORDER, priced page by page 2026-08-18

Every remaining page has now been priced against all four categories before
being built, rather than estimated from grep 2. The working is in
`.superpowers/sdd/2026-08-15-class-in-markup/pricing-mail-a-and-amb-a.md` and
`pricing-remaining-five.md`.

| Unit | Repairs | Blocks | What it is |
| --- | --- | --- | --- |
| `who-we-are-a` | 4 | 2 to 4 | 1 structural, 3 photographs in fixed-ratio containers. IN FLIGHT |
| `mail-a` | 1 | 2 | the shared submit button |
| `amb-a` | 2 | 3 | the shared submit button, plus the mosaic image wrapper |
| `epic-a` | 2 | 2 | |
| `give-c` | 2 | 1 | |
| `team-bio` | 2 | 2 | not a chooser pick; in the order on Paolo's say-so |
| `safety` + `work` + `education` | 2 | 2 | paid ONCE in `css/solution.css`; the other two pages cost ZERO |
| **remaining order excluding `who-we-are-a`** | **10** | **10** | 9 blocks if one grouped rule closes the four selectors wanting an identical declaration |

**Three sharings decide the order**, and none is visible in a per-page count:

1. `css/solution.css`'s two repairs cover all three solution pages, so convert
   them consecutively: one page's bridge work and two fills.
2. One `--space-5` block closes four repairs across `give-c` and the solution
   pages, so converting `give-c` adjacent to them saves a block.
3. The submit-button repair is shared by `mail-a` and `amb-a`, so whichever
   converts second pays nothing for it.

### Two rulings that set these numbers, both Paolo's, 2026-08-18

**Forms: blob now, decide later.** Elementor's container `html_tag` control
offers no `form`, `fieldset` or `legend` (settled at
`elementor/pages/final/06-joinus.mjs:12`), so neither form page can be a
container tree. Both forms are built as one `html()` widget each, which keeps
every class, `<label for>`, `autocomplete` and `required` intact, and both
continue to submit nowhere. Where submissions go becomes separate work with
Empower, alongside the donate page's Gravity Forms plus Stripe setup. Accepted
cost, stated so nobody re-opens it as a defect: the two form pages ship twice.

**Prose blocks: keep paragraph widgets and pay the repairs.** Six of the eight
repairs in the last batch are one mechanism, a structural pseudo-class over a
block of prose, and every one of them would disappear if the copy block were
built as a single widget, taking that batch from 8 repairs to 2. The ruling is
to keep one `text()` widget per paragraph and pay the six, because editability
is the whole argument for class-in-markup `text()` widgets and prose is the
content Empower is most likely to edit, because all four previous instances of
this shape took the repair and switching now would leave the build with two
conventions for one shape, and because four of the six group into a single
block, which makes consistency cheaper than the count suggests.

The `html()`-blob lever is NOT withdrawn by this ruling. It stays available, and
has now paid three times, where nothing inside the block needs to be a widget
and the block is not prose Empower will edit: `team-a`'s ledger, `mail-a`'s
list and `epic-a`'s method rows.
