import { container, text } from '../../factory.mjs';

/* Source of truth: dist/work.html, the <section class="sol-caps"> block
   (lines 231-262) and the comment above it (222-230). Every class, string and
   attribute below is read from that file, not typed from memory.

   THIS SECTION DEPENDS ON BRIDGE BLOCK 38, and it is the one section of this
   page where the inherited repair is doing VISIBLE work rather than latent
   work. Note 5 records the measurement.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.em-container` HOLDS THE HEADING AND THE GRID DIRECTLY, matching source:
      `section > div.em-container > (h2.sol-caps__head + ol.sol-caps__grid)`.
      There is no third wrapper here, unlike the two sections above.

   3. THE `<ol>` AND ITS FOUR `<li>` BECOME `<div>`, AND THAT IS A SEMANTIC
      LOSS RATHER THAN A REPAIR. Elementor's ALLOWED_HTML_WRAPPER_TAGS
      (wp-content/plugins/elementor/includes/utils.php:28 on the install) is
      a, article, aside, button, form, div, footer, h1-h6, header, main, nav,
      p, section, span, and carries no list tag at all, so a container cannot
      render `<ol>` or `<li>`. The alternative that keeps them is one html()
      blob for the whole list, which is what 06-stories.mjs and 07-latest.mjs
      do for their two feeds, and it is rejected here for the reason note 4
      gives. It costs no bridge rule either way: a grep of css/solution.css for
      `ul`, `ol`, `li`, `figure`, `figcaption`, `blockquote` and `table` as
      selector tokens returns nothing, so no rule in this build addresses any
      of these elements by tag.

   4. THE FOUR CAPS ARE CONTAINERS WITH text() CHILDREN, NOT BLOBS, BECAUSE
      EVERY STRING IN THEM IS EDITABLE PROSE. Eight pieces of copy live here:
      four solution titles and four descriptions, and Paolo's ruling of
      2026-08-18 is that prose keeps its widget and the page pays the repair.
      A single html() blob for the `<ol>` would cost zero bridge rules and take
      all eight out of Elementor's reach, which is the wrong trade on the one
      section of this page whose content Empower is most likely to revise. The
      two feeds later in the page take the opposite decision for the opposite
      reason: their content is a CMS loop placeholder, not copy.

   5. `.sol-cap__body` IS A CONTAINER, WHICH IS THE CONDITION BLOCK 38 NEEDS,
      AND ON THIS PAGE THE BLOCK IS NOT LATENT. css/solution.css:184 is
      `.sol-cap__body{display:flex;flex-direction:column;flex:1;gap:var(--space-5);
      padding:clamp(...)}` and :174-175's comment states what `flex:1` is for
      in the file's own words: the cap is a fixed block at the top, the body
      stretches, and the four bottoms line up across four cards of unequal
      copy.

      As a CONTAINER this element IS the flex item, so the declaration lands on
      the right element and the failure is a specificity failure rather than a
      wrong-element one. Elementor's
      `.e-con.e-flex{--flex-grow:0;--flex-shrink:1;--flex-basis:auto;
      flex:var(--flex-grow) var(--flex-shrink) var(--flex-basis)}` is 0,2,0 and
      the build's `.sol-cap__body` is 0,1,0, so `flex:0 1 auto` wins and the
      body never grows. Block 38 restores it at 0,2,0 on `.sol-cap__body.e-con`,
      and it is keyed on the class css/solution.css gives all three pages, so
      it reaches this page unchanged. BUILT AS A WIDGET INSTEAD, the flex
      context would live on the widget's inner div, block 38 would match
      nothing, and the section would need its own rule; that is the specific
      divergence the fill brief warned about, and this module does not take it.

      WHAT `safety` COULD NOT SHOW AND THIS PAGE CAN. Block 38's comment says
      "AND NOT ONE BOX DIFFERS, which is why this block says latent", measured
      at 1440 and 390, where all four of `safety`'s descriptions happen to wrap
      to equal line counts. This page's copy is different. The counterfactual
      was run on dist/work.html before this page was deployed, injecting the
      value Elementor imposes (`flex:0 1 auto`) and reading the gap between
      each cap's bottom edge and its body's bottom edge:

          1440   [24, 0, 0, 24]       <- a REGISTER width
          1200   [24, 0, 24, 24]
           820   [24, 0, 0, 0]
           780   [7.11, 0, 0, 0]
           760   [7.11, 0, 0, 24]
           700   [0, 16.89, 16.89, 0]

      So on this page cards 1 and 4 would each sit 24px short of their row at
      the widest register width. The repair `safety` paid for a defect it could
      not see is doing visible work one page later, which is the justification
      for having written it.

      `flex-direction` needs nothing: the build declares `column` itself, which
      is what Elementor's container default already is. `gap` needs nothing
      either: bridge.css's own kit block zeroes `--widgets-spacing-row` and
      `--widgets-spacing-column`, so Elementor contributes `gap:0 0` at 0,1,0
      and the build's `gap:var(--space-5)` at 0,1,0 wins on source order,
      css/solution.css loading after frontend.min.css.

   6. `.sol-cap__title` IS A text() WIDGET carrying the real <p>. Its padding
      and its navy background sit on that <p>, and the wrapper around it is
      stretched to the cap's width by Elementor's column default, so the block
      spans the column on both sides.

   7. `id="solutions-title"` is authored in the markup, per 01-hero.mjs note 5,
      and the section's `aria-labelledby` names it.

   8. THE SOURCE COMMENT ABOVE THE SECTION (222-230) is carried at the top of
      the heading's markup, the first authorable point in the section, per
      01-hero.mjs note 7. It is byte for byte `safety`'s comment, because
      dist/work.html carries the same one: the caps layout is a decision about
      all three pages and the comment records it once per page. */

const NOTE = '<!-- Four capped columns, the layout Empower picked out of Public Safety A on\n'
  + '     2026-08-07. On Public Safety they replace four numbered rows that left half\n'
  + '     of every row empty; Meaningful Work and Quality Education were built on the\n'
  + '     capped columns from the start.\n'
  + '\n'
  + '     The cap carries the SOLUTION TITLE, not a numeral and not a label: this\n'
  + '     copy has neither an eyebrow nor a "What We’re Working Toward" line, so the\n'
  + '     four-part column from section 5 collapses to two parts. The numerals are\n'
  + '     gone from the build; Empower asked to move away from that treatment. -->';

const HEAD = 'Practical Solutions for Mississippi Workers';

/* Verbatim from dist/work.html:236-259, in source order. */
const CAPS = [
  {
    title: 'Understand What Keeps People From Work',
    body: 'Identify why Mississippians are disconnected from work and what can help them return.',
  },
  {
    title: 'Remove Obstacles to Opportunity',
    body: 'Ensure unnecessary requirements and outdated policies don’t stand between people and meaningful work.',
  },
  {
    title: 'Build Pathways to Good Careers',
    body: 'Create more ways for Mississippians to gain skills, enter the workforce, and build successful careers.',
  },
  {
    title: 'Create an Environment for Growth',
    body: 'Make Mississippi a place where businesses can grow, jobs are created, and opportunity expands.',
  },
];

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-caps',
      content_width: 'full',
      _attributes: 'aria-labelledby|solutions-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        text({
          markup: `${NOTE}\n<h2 class="sol-caps__head" id="solutions-title">${HEAD}</h2>`,
          _attributes: 'data-reveal|rise',
        }),
        container(
          { cssClass: 'sol-caps__grid', content_width: 'full', _attributes: 'data-reveal-group|' },
          CAPS.map((cap) => container(
            { cssClass: 'sol-cap', content_width: 'full', _attributes: 'data-reveal|rise' },
            [
              text({ markup: `<p class="sol-cap__title">${cap.title}</p>` }),
              container({ cssClass: 'sol-cap__body', content_width: 'full' }, [
                text({ markup: `<p>${cap.body}</p>` }),
              ]),
            ],
          )),
        ),
      ]),
    ],
  );
}
