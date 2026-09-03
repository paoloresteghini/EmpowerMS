import { container, text } from '../../factory.mjs';

/* Source of truth: dist/work.html, the <section class="sol-grid"> block
   (lines 272-319) and the comment above it (263-271). Every class, string and
   attribute below is read from that file, not typed from memory.

   THIS IS THE SECTION THAT CARRIES THE UNIT'S FIRST EXCEPTION, and this page
   is the exception. css/solution.css:16-19 states the contract and test.mjs
   asserts it at :3680: `work` carries FIVE `.sol-lit` cards where `safety` and
   `education` carry four. `safety`'s own 05-grid.mjs was built from a data
   array mapped over precisely so this fill would be a fifth entry and nothing
   else, and that is exactly what it turned out to be: a skeleton diff of
   everything inside <main> on the two pages returns ONE difference, this
   card, and no other element, class, id or data-reveal anywhere.

   THIS SECTION DEPENDS ON BRIDGE BLOCK 28, on its `.sol-grid__intro` half.
   Note 3 states the condition.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.sol-grid__head` IS A GRID AND NEEDS NOTHING, and the reason is the one
      03-problem.mjs note 2 gives rather than the one 02-vision.mjs note 3
      gives. css/solution.css:201-204 makes it a two-column grid, and neither
      of its two children carries a `grid-column`: the <h2> auto-places into
      column 1 and `.sol-grid__intro` into column 2, on both sides, because the
      widget wrapper occupies exactly the position the heading occupied. The
      900px media query at :258-260 collapses it to one column, which is a
      property of the container itself and travels untouched.

   3. `.sol-grid__intro` IS A CONTAINER WITH TWO text() CHILDREN, which is the
      shape block 28's third tier assumes: it keys
      `.sol-grid__intro > .elementor-widget-text-editor:last-child p`, so each
      paragraph must be its own widget and `.sol-grid__lede` must keep its
      class in the markup. Both hold. css/solution.css:212 is
      `.sol-grid__intro p:last-child{margin-bottom:0}`, written for the last of
      two real siblings; converted, each paragraph is the only child of its own
      widget, satisfies `p:last-child` at 0,2,1, beats `.sol-grid__intro p` at
      0,2,0 and takes the zero. `.sol-grid__lede` loses its own 24px the same
      way, because :213 is also 0,2,0. Block 28 is keyed on the class, not on
      the page, so it reaches this page without a new rule.

      NO MARGIN-COLLAPSING REPAIR HERE, walked pairwise on this page's own copy
      before it was deployed rather than inherited as a conclusion: the lede's
      24px bottom margin meets a second paragraph whose top margin is 0, so
      static pays max(24,0) = 24 and the converted flex column pays 24 + 0 =
      24. That is the check 03-problem.mjs's own copy block fails, and this one
      passes, on both pages for the same reason.

   4. THE `<ol>` AND ITS FIVE `<li>` BECOME `<div>`, the semantic loss
      04-caps.mjs note 3 records in full, and the five cards are CONTAINERS
      WITH text() CHILDREN for the reason 04-caps.mjs note 4 gives: TWENTY
      pieces of editable prose live in them here, where `safety` has sixteen.

   5. `.sol-lit` NEEDS NOTHING, checked against this page's five cards rather
      than assumed from `safety`'s four, and the check matters because block
      38 repairs an element one section earlier that looks the same in the
      stylesheet. `.sol-lit` (css/solution.css:230) declares
      `display:flex;flex-direction:column` and NO `flex` of its own, so
      Elementor's `.e-con.e-flex{flex:...}` has nothing of the build's to beat:
      block 38's family reaches only a container that declares `flex` on
      itself. It is a flex column on both sides by its own declaration, so
      margins were never collapsing inside it, and Elementor's container
      default agrees with the declared direction. None of its four children
      carries a flex-item property either: `.sol-lit__label` (:237),
      `.sol-lit h3` (:242), `.sol-lit__body` (:247) and `.sol-lit__toward`
      (:252) declare margins, padding and a border only. `.sol-lit__toward`
      is the one worth naming, because the comment above it at :250-251 says it
      is "pinned to the bottom of the card": it is NOT pinned with
      `margin-top:auto`, which would be a flex-item property and would be the
      tenth category, but with `margin:var(--space-6) 0 0`, which is not.

   6. THE FIFTH CARD COSTS NOTHING STRUCTURALLY, and this was measured rather
      than reasoned. `.sol-grid__list` is `repeat(2,minmax(0,1fr))` collapsing
      to one column at 720 (:218 and :261-263), so five cards put the fifth
      alone in row 3 column 1 above 720 and last in the single column below it,
      on both sides. The list is a CONTAINER rather than an html() blob, so its
      height is not resolved through a widget wrapper and the seventh cost
      category cannot arise here.

   7. `.sol-lit h3` IS ADDRESSED BY TAG THROUGH A DESCENDANT SELECTOR, not by
      class, so the heading has to stay an <h3> and it does: the markup string
      carries the real tag. The <strong> inside `.sol-lit__toward` is part of
      the same string for the same reason, :256 styling it as a descendant.

   8. `id="issues-title"` is authored in the markup, per 01-hero.mjs note 5.

   9. THE SOURCE COMMENT ABOVE THE SECTION (263-271) is carried at the top of
      the heading's markup, per 01-hero.mjs note 7. It is NOT `safety`'s: it
      counts five cards rather than four and says so twice, and its second
      paragraph describes the template's dark-light sequence rather than a
      comparison with variation A. */

const NOTE = '<!-- Back to the dark, and the five work areas as five lit cards on it: a soft\n'
  + '     highlight in the top corner of each, an orange rule across the top, the\n'
  + '     commitment in --orange-300 (5.44:1 on navy). Five lights in a dark street,\n'
  + '     one more than Public Safety carries.\n'
  + '\n'
  + '     Second half of the template’s dark-light sequence: the page goes back to\n'
  + '     navy for the work areas, after the light of the problem and the approaches.\n'
  + '     Shared with Public Safety and Quality Education by design; the only thing\n'
  + '     that differs here is that there are five cards rather than four. -->';

const HEAD = 'More Pathways to Meaningful Work';
const LEDE = 'Too many Mississippians remain disconnected from work for different and often complex reasons.';
const INTRO = 'We’re working to understand those challenges and advance practical solutions that help '
  + 'more people enter the workforce, build careers, and move toward greater opportunity.';

/* Verbatim from dist/work.html:283-316, in source order. `&amp;` is the
   source's own escaping and is reproduced rather than resolved: census() keys
   on the element's rendered text, which is the same either way, but the
   markup this build writes should be the markup the build wrote.

   FIVE ENTRIES. `safety`'s array has four and `education`'s will have four;
   this is the unit's first exception and it lives entirely in this array. */
const CARDS = [
  {
    label: 'Workforce Participation',
    head: 'Too Many Mississippians Remain on the Sidelines',
    body: 'Mississippi has one of the nation’s lowest workforce participation rates, leaving people disconnected from opportunity and employers without the workers they need.',
    toward: 'Understanding why people aren’t working and advancing solutions that help more Mississippians enter or return to the workforce.',
  },
  {
    label: 'Skills &amp; Career Pathways',
    head: 'There’s More Than One Path to Success',
    body: 'A four-year degree isn’t the only path to a good career. Skills, experience, training, and alternative credentials can all open doors.',
    toward: 'Expanding pathways that connect people with the skills and opportunities they need to build meaningful careers.',
  },
  {
    label: 'Requirements to Work',
    head: 'Opportunity Shouldn’t Be Harder Than Necessary',
    body: 'Unnecessary licensing, degree, and other requirements can make it harder for qualified people to enter a profession or put their skills to work.',
    toward: 'Ensuring requirements are reasonable and opening more pathways to work.',
  },
  {
    label: 'The Benefits Cliff',
    head: 'Moving Up Should Always Pay',
    body: 'For some families, earning more can mean suddenly losing benefits before they can afford to make up the difference.',
    toward: 'Creating a smoother path from public assistance to financial independence so earning more always moves families forward.',
  },
  {
    label: 'Economic Opportunity',
    head: 'Mississippi Should Be a Place Where Opportunity Grows',
    body: 'When businesses and entrepreneurs can grow, they create jobs and more opportunities for Mississippians to succeed.',
    toward: 'Creating an environment where businesses can thrive, jobs can grow, and more people can build a better future through work.',
  },
];

const TOWARD_LABEL = 'What We’re Working Toward:';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-grid',
      content_width: 'full',
      _attributes: 'aria-labelledby|issues-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-grid__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `${NOTE}\n<h2 id="issues-title">${HEAD}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'sol-grid__intro', content_width: 'full' }, [
              text({ markup: `<p class="sol-grid__lede">${LEDE}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${INTRO}</p>` }),
            ]),
          ],
        ),
        container(
          { cssClass: 'sol-grid__list', content_width: 'full', _attributes: 'data-reveal-group|' },
          CARDS.map((card) => container(
            { cssClass: 'sol-lit', content_width: 'full', _attributes: 'data-reveal|rise' },
            [
              text({ markup: `<p class="sol-lit__label">${card.label}</p>` }),
              text({ markup: `<h3>${card.head}</h3>` }),
              text({ markup: `<p class="sol-lit__body">${card.body}</p>` }),
              text({ markup: `<p class="sol-lit__toward"><strong>${TOWARD_LABEL}</strong> ${card.toward}</p>` }),
            ],
          )),
        ),
      ]),
    ],
  );
}
