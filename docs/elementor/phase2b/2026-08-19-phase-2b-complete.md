# Phase 2B is complete: fifteen pages, and what the phase actually cost

Written 2026-08-19, after `education` landed. This is the state document; the
per-page reports and `bridge.css`'s numbered blocks are the detail.

## What is live

Fifteen pages converted, deployed and measured against the static build:

    final          podcast-a      what-we-do-a   solutions-b    capitol-a
    team-a         who-we-are-a   mail-a         amb-a          epic-a
    give-c         team-bio       safety         work           education

Fourteen are the signed-off chooser picks; `team-bio` is a companion page in the
order on Paolo's say-so of 2026-08-18.

**Gates, all measured on the day:** `node --test test.mjs` 228 pass, the static
build untouched throughout. `node --test test-elementor.mjs` with all fifteen
page URLs and `FIDELITY_REQUIRE_ALL=1`: **204 pass, 0 fail, 0 skipped**.
Fourteen pages are gated; `podcast-a` is deliberately excluded, because its Loop
Grid runs over 66 real episodes where the static build carries 9 placeholders.

`wp/empowerms-child/css/bridge.css` closes the phase at 41 numbered blocks.

## The price, and how wrong the estimates were

| Page | Priced | Cost |
| --- | --- | --- |
| `amb-a` | 3, then 2 | 1 |
| `epic-a` | 4 | 10 |
| `give-c` | 4 | 4, but not the same four |
| `team-bio` | 4 | 6, plus a missing asset absent for two phases |
| `safety` | 4 | 7 |
| `work` (fill) | 0 | 0, plus a site-wide defect it happened to find |
| `education` (fill) | 0 | **0, and `bridge.css` was not touched at all** |

The two fills are the phase's one clean prediction, and they are the argument for
the whole class-in-markup approach: repairs keyed on shared classes are paid once
and inherited. Seven blocks reached `education` without a line being written.

## The categories, six at the start and fifteen at the end

1. Structural pseudo-classes (`:last-child` family).
2. Photographs in fixed-ratio or fixed-height containers.
3. Native controls inside `<main>`.
4. Child combinators. Exhausted.
5. Tags Elementor cannot render (`Utils::validate_html_tag`).
6. `display:flex` with no `flex-direction`.
7. A widget wrapper's block size resolved as a flex base size.
8. `.elementor a{text-decoration:none}` removing the UA underline.
9. The `box-shadow` half of that same reset.
10. A FLEX-item property on an element that becomes an inner node.
11. A GRID-item property on an element that becomes an inner node.
12. A state selector whose state binds to a different element from the one
    carrying the class.
13. An Elementor reset keyed on a TAG, at a specificity the build cannot reach
    by accident: `figure{margin:0}` inside a non-text widget computes 0,4,1.
14. A loop grid's wrapper class, which is inert under `auto-fit` and NOT under
    `auto-fill`, because the second keeps empty tracks.
15. Source order itself: `bridge.css` is not always the last stylesheet, since
    Elementor enqueues per-widget CSS after the theme's.

Ten, eleven and twelve are one mechanism seen from three sides, and twelve is the
one that shipped a WCAG 2.4.7 failure: `link()` puts `.em-btn` on a wrapper,
`:focus-visible` binds to the anchor inside it, and sixteen buttons across ten
pages had no focus indicator of any kind. Blocks 40 and 41 repair all sixteen.

## The five rules worth keeping

1. **A new check must be shown to FAIL on a known defect before its green is
   trusted.** It caught a blind instrument twice this week.
2. **Key a comparison on the element that CARRIES the property, for rest and
   hover. Key FOCUS on the focused element.** The first half killed seven false
   positives; the missing second half hid the WCAG failure for a fortnight.
3. **A measurement that disagrees with a green gate is a claim about the
   measurement at least as often as about the page.** Two would-be defects died
   at that check on `safety` alone.
4. **Computed values are not always diagnostic.** An element that is no longer a
   grid item still reports the `grid-column` it was declared with.
5. **A corpus sweep over the register is a sweep over what is GATED, not what is
   LIVE.** `podcast-a` is excluded and carried two of the sixteen buttons.

## What is open, and whose it is

**Paolo's:**

1. **Ten alt-text sentences**, in `2026-08-18-alt-text-decisions.md`. Six rows in
   that document are now stale, and it says `pending` for pages that are live.
   `classroom-students` (20587) ships an alt naming one adult where the frame
   shows two, on three pages.
2. **Nothing is pushed.** The branch is 59 commits ahead of its remote and the
   repository is public.
3. **Form submissions.** Both form pages ship as blobs that submit nowhere, by
   his ruling, and are expected to ship twice.
4. **The `guest_type` taxonomy exists** and 9 of 66 episodes carry a term, so
   `podcast-a`'s empty pills are a tagging decision: tag the other 57 or drop the
   pill.
5. **Knox Academy (post 20354)** carries Education and Empower News but not
   Community Stories, while the static build labels it a community story. It is
   the one post that stops a single Loop Grid query serving all three solution
   pages, and it is why those feeds ship authored.
6. **Block 41 is the file's one deliberately general rule**, flagged in its own
   comment and one line to revert.

**Ours, recorded rather than done:**

1. `podcast-a` is still ungated.
2. `css/solution.css:276`'s `.sol-grid__closer-line{margin-bottom:0}` never
   applies, outranked by `:274` at 0,1,1. The static build is frozen, so it is a
   hand-off question rather than a fix.
3. `href="team-a.html"` still 404s, deliberately, as part of the hand-off remap.
4. `.tp-portrait` needs re-pricing when a real headshot arrives, because the
   ratio is on the container.
5. The item-property sweep covers two widths rather than the bands between them
   on the nine pages converted before the middle-band step existed.
