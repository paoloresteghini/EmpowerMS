# The unmeasured middle step, measured

2026-08-18. Read-only measurement against the live install and the static build,
taken while Task 13 was in flight. Nothing was repaired and no stylesheet was
edited. It closes open item 4 of the session 4 handover
(`docs/superpowers/plans/2026-08-18-CONTINUATION-PROMPT-session-4.md`), which
named `final` at 1200 and `team-a` at 900 as three-step grid ladders whose middle
step neither sampled width renders.

## What was run

`layoutInvariants()` from `fidelity-browser.mjs`, unmodified, against both sides
of each page at ten widths: 1180, 1080, 980, 930, 880, 780, 660, 560, 480, 410.
The static side was served from this repo over a local file server, the same
distinction the suite's own computed-style test makes. Compared: `mainHeight`,
every keyed element's `x` and `flex-direction`, and every painted box's `top` and
`height`. A difference counts at more than 1px.

**The comparison was shown to go red before it was trusted to pass**, per R46.
Control: `final` static at 1200 against `final` live at 1440 reports 123 `x`
differences. The matched-width runs below report zero on pages where they report
zero.

## Result 1: `team-a` is clean at every width

Ten widths, 133 of 133 keys shared at each, zero axis differences, zero painted
box differences, and `mainHeight` identical to two decimal places at all ten.
Open item 4 is closed for this page.

## Result 2: `final` is clean from 1180 to 780 and WRONG from 700 to about 600

| Width | mainHeight static / live | axis diffs | painted diffs |
| --- | --- | --- | --- |
| 1180 | 5211.98 / 5211.98 | 0 | 0 |
| 1080 | 5128.13 / 5128.13 | 0 | 0 |
| 980 | 5231.06 / 5231.06 | 0 | 0 |
| 930 | 5874.47 / 5874.47 | 0 | 0 |
| 880 | 6920.39 / 6920.39 | 0 | 0 |
| 780 | 6889.22 / 6889.22 | 0 | 0 |
| **660** | 6806.05 / **6941.23** | **2** | 12 |
| 560 | 7801.88 / 7707.66 | 0 | 12 |
| 480 | 7805.55 / 7711.33 | 0 | 12 |
| 410 | 7966.70 / 7890.08 | 0 | 12 |

The 560, 480 and 410 rows are the known content residue: the live page carries
real Community Stories posts against the static build's placeholders, the
negative delta is the same shape as the registered `final` at 390 exemption, and
`em-stories` is where it starts every time.

**The 660 row is a different signature and it is a real defect.** The delta is
POSITIVE, the live page is 135.18px TALLER, and two elements move horizontally:

    em-stories__attr.em-stories__attr--sm    x 148 static / 48 live
    em-stories__attr.em-stories__attr--sm#2  x 148 static / 48 live

## Root cause: an Elementor container default the build never declares

`.em-stories__mini` is `display:flex` with `align-items:center` and no
`flex-wrap` (`css/homepage.css:277-278`), so it takes the initial value,
`nowrap`. Elementor's container sets `flex-wrap:wrap`. The build never contests
it, so the converted card wraps and the static one does not.

Measured on the card itself, both sides, six widths:

| Width | static wrap / height | live wrap / height |
| --- | --- | --- |
| 780 | nowrap / 128 | wrap / 128 |
| 700 | nowrap / 128 | wrap / **166** |
| 680 | nowrap / 128 | wrap / **166** |
| 660 | nowrap / 128 | wrap / **166** |
| 640 | nowrap / 128 | wrap / **183** |
| 620 | nowrap / 128 | wrap / **183** |

**`flex-wrap` differs at EVERY width, including the two the suite samples.** It
is inert at 780 and above because the row still fits. From about 700 down the
80px photograph and the text block stop fitting on one line, the text wraps
underneath, the card grows by 38 to 55px, the attribution moves 100px left, and
every painted box below the stories section shifts down by 76 to 135px. Below
600 the static build's own `@media (max-width:600px)` turns the card into a
column (`css/homepage.css:535`, already bridged at `bridge.css` block A1), the
two shapes converge again, and the difference goes back to being content.

So the biting band is roughly 601 to 700, and both sampled widths sit outside it.

## Why no instrument reports this

- `controlBoxes()` sweeps `a,button,input,select,textarea,img` and never a
  container's own box.
- `census()` keys on element text, and no text changed.
- `layoutInvariants()` compares `flex-direction` but deliberately NOT
  `flex-wrap`: R45 recorded 120 flex-wrap differences against 0 real defects and
  ruled that widening a shared gate for them would cost more than it caught.

**That ruling was made on evidence gathered at 1440 and 390 only, and this is the
counter-example.** A `flex-wrap` difference is by definition content-width
dependent: it changes nothing until the line is too narrow to hold its items.
Width-sampling can therefore never establish that a `flex-wrap` difference is
inert; it can only establish that it is inert AT THE SAMPLED WIDTHS. The 120
hits were not noise, they were 120 unevaluated cases, and at least one of them is
a live defect on the homepage.

## What is NOT claimed here

Only `final` and `team-a` were measured, and only against the three properties
`layoutInvariants()` carries. Nothing is claimed about the other six converted
pages, and nothing is claimed about colour, which no instrument in this project
compares. Per R41: this is what was measured and where, not a statement that
anything else is fine.

## Recommended, in order

1. **Repair `final`.** One named rule, `.em-stories__mini.e-con{flex-wrap:nowrap}`,
   belongs with the existing `flex-direction:row` block that already names this
   class (`bridge.css`, the block whose comment begins "The mobile scroll rail"
   sits directly after it). Deliberately NOT written yet: Task 13 is editing
   `bridge.css` in the same working copy, and a second writer is how the sync
   hazard recorded in R40 gets reopened. Write it after Task 13 lands, measure the
   result at 660 and at both register widths, and check the 600 block still wins
   below 600.
2. **Re-open the 120 flex-wrap hits as unevaluated rather than inert.** Not by
   widening the shared gate, which R45 is still right about, but as a one-off
   sweep: for each converted page, list the elements whose `flex-wrap` differs,
   and measure only those elements at the widths between their own breakpoints.
3. **Add a middle-step measurement to the per-page recipe.** `team-a` came back
   clean at ten widths, so this is cheap insurance rather than a new gate: one
   read-only run per page, recorded in the page's report, with no register change
   and no new tolerance to widen.

## Amendment, same day: both repairs written, and a second defect underneath

Recommendation 1 above is done, and doing it found a second defect that this
document's own measurement had been reporting all along without anybody reading
it as separate.

**`bridge.css` block 15, `.em-stories__mini.e-con{flex-wrap:nowrap}`.** Deployed
and measured: the mini cards match on every property at 700, 660 and 640, and
`.em-stories__attr--sm` is back at x 148.

**`bridge.css` block 16, `.em-join__signup > .elementor-widget-html{width:100%}`.**
With the cards no longer moving, a 60px residue on `.em-join__slab` was left at
700, 660 and 640, and it is visible in this document's own tables above: the
`em-join-wrap` and `em-join__slab` rows differ by 60 in the height column at
every one of those widths, where the rows below them differ only in `top`. It is
not the flex-wrap mechanism. It is the OTHER one found the same day, on `amb-a`,
and recorded as the phase's seventh cost category in `task-13-report.md` section
4: a widget wrapper's block size resolved as a flex base size from a
hypothetical inline size, around content whose height is a step function of its
own width.

At 660: `.em-newsletter__form` is 58px on both sides, its `.elementor-widget-html`
wrapper is 118px live, and 118 is 58 + 12 + 48, the form laid out as two rows.
The form is correct on the page; only the box around it is wrong.

**The repair is a new one.** Task 13 measured five candidates on `amb-a` and
repaired at the parent with `display:block`; all five behave the same way here
and the parent repair is WRONG here, because `.em-newsletter` is a flex column by
the build's own declaration and its 16px gap goes with the formatting context
(measured: 78.8 against static's 94.8). `width:100%` on the wrapper is exact at
eight widths. So the category now has two repair shapes and a discriminator:
repair at the parent where the static parent is a plain block, at the wrapper
where the build declares the flex column itself.

**After both, measured live against static at 1440, 900, 780, 700, 660 and 640:
zero differences on all three instruments at every one.** 560 and 390 still carry
the known content residue, which is real post copy against static placeholders
and is the registered exemption at 390.

### An operational trap this exposed, worth more than either repair

The first measurement after deploying block 16 reported the defect UNCHANGED at
all three widths. The rule was on the server, verified by md5 over a direct
`ssh`, and both caches had been flushed. What was stale was the HTML at WP
Engine's edge: it carried `bridge.css?ver=1787082557` while the file's mtime was
`1787083262`, and that older versioned URL served the older file. Fetching the
same page with a unique query string returned the current `?ver=` immediately.

So `wp cache flush` and `wp elementor flush_css` are not sufficient to make a
live measurement trustworthy, and an md5 over `ssh` proves only that the file
reached the disk. **A measurement taken straight after a deploy can report the
PREVIOUS stylesheet's behaviour, which reads exactly like a repair that does not
work.** Measure with a cache-busting query string, or wait out the edge.
