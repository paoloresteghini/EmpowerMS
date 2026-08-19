# The item-property corpus sweep, and what it found

Run 2026-08-19, after the fifteenth page landed. Read-only against the live
install and the static build. Nothing was deployed or repaired as a result.

## What it was looking for

The tenth and eleventh cost categories are one mechanism: **an ITEM property
declared on an element that becomes an inner node instead of the item goes
inert.** The tenth is the flex half (`flex`, `margin:auto`, `align-self`), found
by reading `css/solution.css` before `safety` was built. The eleventh is the grid
half (`grid-column`, `grid-row`, `justify-self`), found during that build when
`.sol-vision__body` rendered in column 1 under its heading instead of column 2,
x 144 against 718.31.

Both were found on one page. The question this sweep answers is whether the
other fourteen carry the same defect unnoticed, because no gate looks for it
directly.

## Method

Selectors were derived from the stylesheets rather than listed by hand: every
rule in each converted page's own sheet whose body declares `grid-column`,
`grid-row`, `grid-area`, `justify-self`, `place-self`, `order`, `flex-grow`,
`flex-basis` or `flex`, reduced to the class the rule addresses. 51 selectors
across fifteen pages. Each page was compared static against live at 1440 and
390, keyed on the element that CARRIES the declaration, with the reveal
neutralised by the site's own `is-revealed` class.

**The probe's first version compared computed item properties and was BLIND.**
Its control run reported `grid-column-start: 2` against `2` across a defect worth
574px, because computed style keeps the SPECIFIED value: an element that is no
longer a grid item still reports the placement it was declared with, and only the
USED placement changes. **Geometry is the only witness to this category.** The
probe was rewritten to compare the carrier's box, and its control then read

    .sol-vision__body x   repaired 718.31   block 36 reverted 144   RED

which is R46 satisfied: the check was shown to fail on a known defect before its
green was trusted anywhere.

## Result: clean on all thirteen gated pages

Twelve differences in total, all on the two pages whose LIVE CONTENT is not the
static build's, and every one of them already documented:

| Page | Differences | What they are |
| --- | --- | --- |
| `final` | 4 at 390 | The two `.em-stories__mini` cards are a Loop Grid over two real posts against two identical placeholders. Heights 200.78 and 165.59 live against 221.50 and 221.50 static, which is `CONTENT_HEIGHT_EXEMPTIONS`'s own entry to the hundredth of a pixel, plus the `.em-input` shift it propagates |
| `podcast-a` | 8 | `.pca-frame--tall` and the facet controls below it. `podcast-a` is deliberately excluded from `PAGE_REGISTER`: 66 real episodes against 9 static placeholders |
| every other page | 0 | including all five that carry `order` or `grid-column` inside a `@media` block |

So the category is real, it cost one repair, and it is confined to the one page
that was already repaired for it. That is a genuine result rather than an
absence: the sweep goes red on the defect it was built to find.

## What it does NOT cover, stated so the next reader does not overtrust it

1. **Two widths, not the bands between them.** Six of the 51 declarations exist
   only inside a `@media` block, and 1440 and 390 straddle rather than enter
   several of those bands. The per-page middle-band sweeps in each task report
   cover this for the five solution-unit and fill pages; the older pages are
   covered only at the two widths.
2. **The third member of the family is invisible to it.** A container that
   declares `flex` on ITSELF still loses to Elementor's
   `.e-con.e-flex{flex:var(--flex-grow) var(--flex-shrink) var(--flex-basis)}` at
   0,2,0, and that defect changes a box only when the content makes it visible.
   `bridge.css` block 38 records it; on `safety` it was latent, on `work` two
   cards were short, on `education` three were.
3. **It compares boxes, so a difference that moves nothing is invisible to it**,
   which is the same limit every geometric instrument here has.
