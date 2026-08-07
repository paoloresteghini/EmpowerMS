# One solution template, three pages

**Date:** 2026-08-07
**Status:** approved, ready to plan
**Trigger:** Kienna Horn's email of 2026-08-07 recording Empower's selections.

## What Empower decided

1. **One template for all three solution pages** (Quality Education, Meaningful
   Work, Public Safety), based on **Public Safety B "The Streetlight"**.
2. **One change to it:** the content in the numbered section is to be drawn
   with the capped-column layout from **Public Safety A "The Neighbourhood"**.
3. **The Empower Podcast** uses **The Studio** (`podcast-a`).
   **Capitol Chat** uses **The Dome** (`capitol-a`).
4. **Filter by Topic is removed from both.** Capitol Chat keeps Legislative
   Session; the podcast keeps Guest. More guest categories to follow.

### The one ambiguity, and how it was resolved

Kienna's wording ("the number/statistics section") and her screenshot (the
work-areas section, capped columns) pointed at different sections. Resolved
with Paolo on 2026-08-07: she means **the numbered Practical Solutions
section**, and the capped columns are the layout to draw it with. The
work-areas section keeps Streetlight's navy cards.

Streetlight has no statistics anywhere. Its only numbers are the orange 1-4
discs on Practical Solutions, which is what fixes the reading.

## What "one template" means in this codebase

`build.mjs` resolves `<!--@include -->` against static files and has no
variables, so a template cannot be one HTML file filled three times. Here it
means:

- **One stylesheet, `css/solution.css`, linked by all three pages.**
- **One namespace, `sol-`**, replacing `psb-`.
- **Three page directories**, each with seven section files that use the same
  classes and differ only in copy.

This is the shape [[empowerms-elementor-conversion]] wants: one set of blocks
to build in Elementor, not three.

## Page structure

The roadmap gives all three tabs the same "Standard Solution Page Flow", so
the seven sections are identical in order and kind:

| # | Section | Block |
|---|---|---|
| 1 | Hero | `sol-hero` |
| 2 | The Vision | `sol-vision` |
| 3 | The Problem | `sol-problem` |
| 4 | The Solutions | `sol-caps` **(the changed one)** |
| 5 | Our Work / What We're Working Toward | `sol-grid` + `sol-lit` |
| 6 | Community Stories | `sol-stories` |
| 7 | Latest | `sol-latest` |

### Where the three pages differ

Only two axes, both absorbed by the CSS rather than by per-page overrides:

| | Education | Work | Safety |
|---|---|---|---|
| Solutions (§4) | 4 | 4 | 4 |
| Work areas (§5) | 4 | **5** | 4 |
| Closing block after §5 areas | **yes** | no | no |
| Article stubs (§7) | 3 | 3 | 3 |

- **§4 is always 4**, so the capped columns are a 4-up at desktop on every
  page. They must still degrade cleanly, because §5 needs the same column
  treatment at 5-up on Work if it is ever reused there.
- **§5 carries 4 or 5 areas.** Streetlight's navy cards are a 2x2; at 5 they
  become 3+2. Already true of `work-b` today.
- **Education's §5 ends with a closing statement** ("Real Choice for Every
  Family") that Work and Safety do not have. It is an optional trailing block,
  not a variant of the card.
- **§7 is always 3 stubs**, so it is not an axis at all. It is in the table
  because it looked like one: `.sol-stubs` is a three-column grid with a single
  breakpoint at 780px, and Work and Education shipped four stubs each on
  2026-08-07, leaving the fourth alone across a third of the width at every
  width above that. Corrected to 3 on both, and asserted, so the grid and the
  content cannot drift apart again.

## Section 4, the changed one

**Before:** four rows, each opened by a large outlined orange numeral, copy in
a narrow column, roughly half the row empty to its right.

**After:** four columns. Each column is a navy cap holding the solution title,
with the solution's sentence on white beneath it.

- **The cap holds the title**, decided 2026-08-07. Practical Solutions has no
  eyebrow label and no "What We're Working Toward" line, so the four-part
  column from §5 collapses to two parts here: cap and body.
- **The numerals are removed from the build entirely.** Empower asked to move
  away from the numbered treatment; keeping the digit in the cap would read as
  not having done it.
- Caps are set from the title, so they rag to different heights. The cap row
  must be a single grid row with the caps stretched to a common height, or the
  four columns will not line up.

Section 5 keeps the navy cards. The result is a light 4-across block above a
dark 2x2 block: two different objects, not the same grid twice.

## Podcast and Capitol Chat

Independent of the template work and much smaller.

- **`podcast-a`:** delete the Topic `<fieldset>` and its three hide rules.
  Keep Guest. Nine episodes, three per guest, so no combination of ticks can
  return an empty grid. The guest chip stays on the cards.
- **`capitol-a`:** delete the Topic `<fieldset>` and its three hide rules.
  Keep Legislative Session. Six rows, three per session, same guarantee.
- **The Capitol Chat topic chip is removed from the rows too.** Those labels
  were ours; Capitol Chat carries no topic taxonomy upstream. With the filter
  gone they would be unsourced decoration. See
  [[empowerms-wp-rest-content-source]].
- The guest facet must stay a data change, not a structural one, so the extra
  categories Kienna is sending drop in without touching the mechanism.

The AND-across-groups rule shape survives: with one group left it is trivially
correct, but the rules must keep the "group in use and this value not ticked"
form so adding a group back does not silently become an OR. See
[[empowerms-podcast-pages]].

## Content

- Copy is the roadmap's three tabs verbatim, its Standard Solution Page Flow
  order, as the existing pages already do. Quality Education's copy is at
  roadmap PDF lines 625-800; the "Current Content" block that follows it is the
  live site's existing copy and is **not** the source.
- Section 6 and 7 feeds keep the real posts from
  [[empowerms-wp-rest-content-source]], and every headline stays an anchor
  whose href is the post it names. Education needs its own three community
  stories and its own tagged articles, from category 7.
- Photography for all three pages is still owed by Empower. Existing marked
  placeholders carry over at the size the real images will be.

## Tests

The suite encodes the old "six distinct compositions" contract and has to be
turned around to encode the new one.

- `SIGNATURE` (two of them, at roughly test.mjs:1721 and :1951) asserts each
  reading keeps a composition the others do not have. For the three template
  pages this inverts: they must now share their blocks, and the assertion
  becomes "all three use `sol-` and none carries a `psb-`/`psa-` remnant".
- `UNDECIDED = ['work', 'safety', 'podcast', 'capitol']` at test.mjs:1294 loses
  all four entries: Empower have chosen every one of them.
- `WORK_COPY` and `SAFETY_COPY` keep working; a `EDUCATION_COPY` list joins
  them.
- New assertions: §4 renders four caps and no numerals on all three pages; §5
  renders the right number of areas per page; Education alone has the closing
  block; neither podcast nor Capitol Chat page has a topic facet or a topic
  chip; each remaining facet still cannot produce an empty result.

## Out of scope

Stated so the boundary is explicit rather than assumed:

- **The unpicked variations** (`work-a/b/c`, `safety-a/c`, `podcast-b`,
  `capitol-b`) are not touched, not deleted, and not un-built in this change.
  Retiring them is a separate decision.
- **The `/justice` URL question** is unresolved. The roadmap gives both the
  Meaningful Work and the Public Safety tabs `Url: /justice`, which cannot be
  right for the work page. Pages stay on `/solutions/work`,
  `/solutions/safety`, `/solutions/education` until Kienna confirms.
- **Guest categories** beyond the current three, pending Kienna's list.

## Risks

1. **The chooser stops being a chooser for these sets.** It currently presents
   variations to pick between. Three of its sets now have a decision, and a
   fourth pair does too. The review index has to present three real pages
   rather than a set of options, and the tests that count picks per set change
   with it.
2. **The rename is wide.** Moving `psb-` to `sol-` touches every section file,
   the stylesheet, and every test that names a class. It is mechanical but
   large, and a missed selector shows as an unstyled block rather than an
   error.
3. **Education is new copy, not a re-skin.** It is the one page whose content
   has never been through review, so its section 5 is the most likely to need
   a second pass.
