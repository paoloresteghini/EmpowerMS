import { container, text } from '../../factory.mjs';

/* Source of truth: dist/safety.html, the <section class="sol-caps"> block
   (lines 230-261) and the comment above it (221-229). Every class, string and
   attribute below is read from that file, not typed from memory.

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

   5. `.sol-cap__body` IS A CONTAINER AND IT COSTS THE PAGE'S TENTH CATEGORY,
      the repair the brief predicted and the reason this shape was priced
      before it was built. css/solution.css:184 is
      `.sol-cap__body{display:flex;flex-direction:column;flex:1;gap:var(--space-5);
      padding:clamp(...)}` and :174-175's comment states what `flex:1` is for
      in the file's own words: the cap is a fixed block at the top, the body
      stretches, and the four bottoms line up across four cards of unequal
      copy.

      As a CONTAINER this element really is the flex item, so the failure is
      not the brief's "the property lands on an inner node" one. It is the
      specificity failure recipe section 5 names instead: Elementor's
      `.e-con.e-flex{--flex-grow:0;--flex-shrink:1;--flex-basis:auto;
      flex:var(--flex-grow) var(--flex-shrink) var(--flex-basis)}` is 0,2,0 and
      the build's `.sol-cap__body` is 0,1,0, so `flex:0 1 auto` wins and the
      body never grows. Read out of the install's own
      wp-content/plugins/elementor/assets/css/frontend.min.css rather than
      quoted from an earlier block. Repaired at 0,2,0 in bridge.css block 38.

      The html()-blob alternative would cost nothing here, and it is the same
      trade note 4 rejects: it would take all eight strings out of Elementor's
      reach to save one rule.

      `flex-direction` needs nothing: the build declares `column` itself, which
      is what Elementor's container default already is. `gap` needs nothing
      either: bridge.css's own kit block zeroes `--widgets-spacing-row` and
      `--widgets-spacing-column`, so Elementor contributes `gap:0 0` at 0,1,0
      and the build's `gap:var(--space-5)` at 0,1,0 wins on source order,
      css/solution.css loading after frontend.min.css. Both were measured after
      deploying rather than left to the arithmetic.

   6. `.sol-cap__title` IS A text() WIDGET carrying the real <p>. Its padding
      and its navy background sit on that <p>, and the wrapper around it is
      stretched to the cap's width by Elementor's column default, so the block
      spans the column on both sides. Measured.

   7. `id="solutions-title"` is authored in the markup, per 01-hero.mjs note 5,
      and the section's `aria-labelledby` names it.

   8. THE SOURCE COMMENT ABOVE THE SECTION (221-229) is carried at the top of
      the heading's markup, the first authorable point in the section, per
      01-hero.mjs note 7. */

const NOTE = '<!-- Four capped columns, the layout Empower picked out of Public Safety A on\n'
  + '     2026-08-07. On Public Safety they replace four numbered rows that left half\n'
  + '     of every row empty; Meaningful Work and Quality Education were built on the\n'
  + '     capped columns from the start.\n'
  + '\n'
  + '     The cap carries the SOLUTION TITLE, not a numeral and not a label: this\n'
  + '     copy has neither an eyebrow nor a "What We’re Working Toward" line, so the\n'
  + '     four-part column from section 5 collapses to two parts. The numerals are\n'
  + '     gone from the build; Empower asked to move away from that treatment. -->';

const HEAD = 'Practical Solutions for a Safer Mississippi';

/* Verbatim from dist/safety.html:235-259, in source order. */
const CAPS = [
  {
    title: 'Understand What Drives Crime',
    body: 'Use research and real-world data to better understand crime and identify solutions that improve public safety.',
  },
  {
    title: 'Support Effective Public Safety',
    body: 'Work alongside law enforcement and community leaders to advance strategies that prevent crime and keep communities safe.',
  },
  {
    title: 'Strengthen Justice and Accountability',
    body: 'Promote a justice system that protects the public, ensures fairness, and holds people accountable.',
  },
  {
    title: 'Create Pathways to a Better Future',
    body: 'Help people successfully reenter their communities, find meaningful work, and build stable lives after serving their sentence.',
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
