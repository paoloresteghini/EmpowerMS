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

---

# The middle-band extension, run 2026-08-20

Gap 1 above ("two widths, not the bands between them") is now closed for the
twelve pages that had only the two-width sweep.

## Method, and what differs from the run above

Same derivation: selectors read out of each page's own stylesheets rather than
listed by hand. Two things changed.

1. **The sheet list comes from `empower_page_styles()`** in the child theme
   rather than from the page name, so it cannot drift from what the install
   actually enqueues. This matters more than it did yesterday: after the slug
   rename, `/solutions/` loads `css/solutions-b.css` and the three solution
   pages share `css/solution.css`, so name and sheet no longer coincide.
2. **The widths are derived per page**: every `@media` breakpoint in that page's
   own sheets, then the MIDPOINT between each consecutive pair, plus 767 and 768
   because Elementor's own mobile breakpoint is 767 and the build ships nothing
   there. Between five and fourteen widths per page, none of them 1440 or 390
   except where a page's own breakpoints put one there.

The control was `final`, which the run above documents as carrying four
differences at 390. The probe reproduced them to the hundredth of a pixel
(`.em-stories__mini` 221.50 static against 200.78 and 165.59 live, which is
`CONTENT_HEIGHT_EXEMPTIONS`'s own entry), so it was measuring before it was
believed.

## Result: clean on every gated page, at every band

| Page | Widths swept | Differences |
| --- | --- | --- |
| `what-we-do-a` | 500, 680, 767, 768, 910, 1270 | 0 |
| `solutions-b` | 570, 767, 768, 890, 1220 | 0 |
| `capitol-a` | 540, 767, 768, 790, 880, 1170 | 0 |
| `team-a` | 420, 560, 767, 768, 770, 1000, 1270 | 0 |
| `who-we-are-a` | 500, 767, 768, 770, 1000, 1270 | 0 |
| `mail-a` | 440, 710, 767, 768, 1170 | 0 |
| `amb-a` | 460, 730, 767, 768, 950, 1220 | 0 |
| `epic-a` | 390, 570, 767, 768, 810, 1170 | 0 |
| `give-c` | 440, 710, 767, 768, 962, 1232 | 0 |
| `team-bio` | 440, 710, 767, 768, 1170 | 0 |
| `final` | fourteen widths | 10, all `.em-stories__mini` and the `.em-input` shift it propagates, at 390 and 510 |
| `podcast-a` | 630, 767, 768, 940, 1210 | 4, all `.pca-frame--tall` |

**Nothing new.** `final` and `podcast-a` are the same two pages the two-width run
flagged, for the same documented reason: their live content is not the static
build's. `podcast-a`'s difference is worth one extra line, because it is the kind
of thing a reader could mistake for a band-specific defect: the ratio between the
two sides is 1.453 at 940px and 1.439 at 1210px, near enough constant, so the
live frame is proportionally smaller at every width rather than breaking at one.
That is a content and ratio difference on an EXCLUDED page, not a band defect.

## What this still does not cover

Gaps 2 and 3 above are unchanged: a container declaring `flex` on ITSELF is
invisible to a geometric probe until content makes it visible, and a difference
that moves nothing is invisible to any instrument here.
