import { container, text } from '../../factory.mjs';

/* Source of truth: dist/education.html, the <section class="sol-grid"> block
   (lines 276-324) and the comment above it (264-275). Every class, string and
   attribute below is read from that file, not typed from memory.

   THIS IS THE SECTION THAT CARRIES THE UNIT'S SECOND AND LAST EXCEPTION, and
   this page is the exception. css/solution.css:16-19 states the contract:
   "Meaningful Work carries five work areas where the other two carry four, and
   Quality Education alone closes that section with a statement
   (.sol-grid__closer)." test.mjs asserts both, the work-area count at :3680 and
   the closer at :3715, including that `work` and `safety` do NOT have one.

   THIS PAGE CARRIES FOUR WORK AREAS, which is `safety`'s number rather than
   `work`'s five, and the array below has four entries for that reason and not
   by carry-over.

   THIS SECTION DEPENDS ON BRIDGE BLOCK 28, on its `.sol-grid__intro` half.
   Note 3 states the condition and redoes the walk on this page's THREE
   paragraphs, where the other two pages have two. Note 10 walks the closer,
   which block 28 does NOT reach and does not need to.

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

   3. `.sol-grid__intro` IS A CONTAINER WITH THREE text() CHILDREN, which is the
      shape block 28's third tier assumes: it keys
      `.sol-grid__intro > .elementor-widget-text-editor:last-child p`, so each
      paragraph must be its own widget and `.sol-grid__lede` must keep its class
      in the markup. Both hold. THREE, not two: this page's intro carries a
      third paragraph ("That's the gap we're working to close.",
      dist/education.html:283) that neither sibling has. Block 28 counts no
      paragraphs, so it needed no change, but the walk was redone here.

      css/solution.css:212 is `.sol-grid__intro p:last-child{margin-bottom:0}`,
      written for the last of THREE real siblings on this page; converted, each
      paragraph is the only child of its own widget, satisfies `p:last-child` at
      0,2,1, beats `.sol-grid__intro p` at 0,2,0 and takes the zero.
      `.sol-grid__lede` loses its own 24px the same way, because :213 is also
      0,2,0. Block 28 is keyed on the class, not on the page, so it reaches this
      page without a new rule; it hands back 24 on the lede, 20 on the second
      paragraph, and the zero on the third, which is genuinely the last on both
      sides.

      NO MARGIN-COLLAPSING REPAIR HERE, walked pairwise on this page's own copy
      before it was deployed rather than inherited as a conclusion. Every top
      margin in the block reads 0 on the static build, so both joins are
      max(X,0) = X static against X + 0 = X converted:

          p.sol-grid__lede  mb 24 -> p  mt 0    no collision
          p                 mb 20 -> p  mt 0    no collision

      That is the check 03-problem.mjs's own copy block fails and this one
      passes, on all three pages for the same reason.

   4. THE `<ol>` AND ITS FOUR `<li>` BECOME `<div>`, the semantic loss
      04-caps.mjs note 3 records in full, and the four cards are CONTAINERS
      WITH text() CHILDREN for the reason 04-caps.mjs note 4 gives: SIXTEEN
      pieces of editable prose live in them here, where `work` has twenty.

   5. `.sol-lit` NEEDS NOTHING, checked against this page's four cards rather
      than assumed from either sibling, and the check matters because block 38
      repairs an element one section earlier that looks the same in the
      stylesheet. `.sol-lit` (css/solution.css:230) declares
      `display:flex;flex-direction:column` and NO `flex` of its own, so
      Elementor's `.e-con.e-flex{flex:...}` has nothing of the build's to beat:
      block 38's family reaches only a container that declares `flex` on
      itself. It is a flex column on both sides by its own declaration, so
      margins were never collapsing inside it, and Elementor's container
      default agrees with the declared direction. None of its four children
      carries a flex-item property either: `.sol-lit__label` (:237),
      `.sol-lit h3` (:242), `.sol-lit__body` (:247) and `.sol-lit__toward`
      (:252) declare margins, padding and a border only. `.sol-lit__toward` is
      the one worth naming, because the comment above it at :250-251 says it is
      "pinned to the bottom of the card": it is NOT pinned with
      `margin-top:auto`, which would be a flex-item property and would be the
      tenth category, but with `margin:var(--space-6) 0 0`, which is not.

   6. THE LIST IS A CONTAINER RATHER THAN AN html() BLOB, so its height is not
      resolved through a widget wrapper and the seventh cost category cannot
      arise here. `.sol-grid__list` is `repeat(2,minmax(0,1fr))` collapsing to
      one column at 720 (:218 and :261-263), so four cards make two full rows
      above 720 and one column below it, on both sides.

   7. `.sol-lit h3` IS ADDRESSED BY TAG THROUGH A DESCENDANT SELECTOR, not by
      class, so the heading has to stay an <h3> and it does: the markup string
      carries the real tag. The <strong> inside `.sol-lit__toward` is part of
      the same string for the same reason, :256 styling it as a descendant.

   8. `id="issues-title"` is authored in the markup, per 01-hero.mjs note 5.

   9. THE SOURCE COMMENT ABOVE THE SECTION (264-275) is carried at the top of
      the heading's markup, per 01-hero.mjs note 7. It is NOT `safety`'s and NOT
      `work`'s: it counts four cards, names Meaningful Work rather than Public
      Safety as the sibling, and adds a third paragraph that exists on no other
      page, explaining where the closer sits and why.

      IT ALSO CONTAINS THE LITERAL TEXT `</ol>`, inside the sentence "it sits
      inside .em-container after </ol> rather than inside .sol-grid__list".
      That is harmless in the page and worth recording anyway, because it broke
      a tool: a regex skeleton extractor used to compare this page's shape
      against `safety`'s counted that as a real closing tag, lost its nesting
      depth from that point on, and reported roughly eighty lines of structural
      divergence that do not exist. Strip comments before tokenising markup.

  10. THE CLOSER IS A CONTAINER WITH FOUR text() CHILDREN, AND IT COSTS
      NOTHING. This is the block no other page in the build has
      (css/solution.css:268-277), so nothing about it could be inherited and
      all of it was walked on the static build before this page was deployed.

      SHAPE: `<div class="sol-grid__closer" data-reveal="rise">` holding an
      <h3> and THREE <p>, the last carrying `.sol-grid__closer-line`. The brief
      for this task said two paragraphs; the file has three, counted off
      dist/education.html:317-322. It is prose, all four strings of it, so it
      takes 04-caps.mjs note 4's ruling and keeps a widget per string rather
      than becoming one blob.

      BLOCK 28 DOES NOT REACH IT AND MUST NOT. Both of that block's halves are
      keyed on `.sol-problem__copy` and `.sol-grid__intro`; the closer is
      neither, so its paragraphs are outside all three tiers. That is correct
      rather than an oversight, because the closer's paragraph margin is
      `var(--space-4)` (16px, :275) and not the `var(--space-5)` those two
      blocks declare. A tier reaching it would set 20px where the design draws
      16.

      AND IT NEEDS NO TIER OF ITS OWN, WHICH IS THE PART THAT HAD TO BE
      MEASURED RATHER THAN REASONED ABOUT. The closer has no `p:last-child`
      rule at all. What it has instead is `.sol-grid__closer-line{margin-bottom:0}`
      at :276, keyed on a CLASS, and that rule is already dead in the static
      build: `.sol-grid__closer p` (:274) is 0,1,1 and beats it at 0,1,0, so
      the last paragraph carries 16px on both sides. Read off the static build
      at 1440 rather than deduced: `.sol-grid__closer-line` computes
      `margin-bottom: 16px`. A defect that depends on `:last-child` becoming
      always-true cannot arise where no `:last-child` rule exists, so nothing
      here is in block 28's family.

      THE ONE THING THAT DOES CHANGE, AND WHY IT MOVES NOTHING. In the static
      build `.sol-grid__closer` declares no `display`, so it is a plain block
      and its last child's 16px bottom margin COLLAPSES THROUGH its bottom
      edge: the closer measures 250.31 at 1440, which is its four children plus
      the three margins between them and not the trailing one. Converted it is
      an Elementor flex container, where nothing collapses, so the same 16px
      falls INSIDE it and the box measures 266.31.

      That 16px does not disappear in the static build, it relocates: it sits
      between `.em-container`'s bottom edge and `.sol-grid`'s padding-bottom,
      because `.em-container` has no bottom padding or border to stop it and
      `.sol-grid` has both. So the section's content height is 1488.64 either
      way, `<main>` is the same height, and nothing below the closer moves.
      Measured on the static build before deploying and confirmed live
      afterwards; the numbers are in the task report.

      SO THE CORRECT ANSWER HERE IS TO WRITE NOTHING, and that is a decision
      rather than an omission. A rule zeroing the last paragraph's margin would
      make census() read 0 live against 16 static, which is block A2's ruling
      about falsifying a term the instrument reads; a negative margin on the
      container would move a box that is currently in the right place. The
      static build's own dead rule is left dead, because reproducing the static
      build includes reproducing what it actually renders rather than what it
      appears to intend. The intent is worth flagging to Empower and is in the
      task report; it is not this conversion's to change.

      `data-reveal="rise"` IS ON THE CONTAINER ITSELF, through `_attributes`,
      and that is safe here for the reason 02-vision.mjs note 4 makes it unsafe
      there: this element is a real box on both sides, nothing gives it
      `display:contents`, and it carries no `data-reveal-group`, so the whole
      block rises as one exactly as the static build has it. */

const NOTE = '<!-- Back to the dark, and the four work areas as four lit cards on it: a soft\n'
  + '     highlight in the top corner of each, an orange rule across the top, the\n'
  + '     commitment in --orange-300 (5.44:1 on navy). Four lights in a dark street.\n'
  + '\n'
  + '     Second half of the template’s dark-light sequence: the page goes back to\n'
  + '     navy for the work areas, after the light of the problem and the approaches.\n'
  + '     Shared with Public Safety and Meaningful Work by design.\n'
  + '\n'
  + '     Education alone closes the section with a statement, the .sol-grid__closer\n'
  + '     block below the list. It is a trailing block on the same dark field, not a\n'
  + '     fifth card, so it sits inside .em-container after </ol> rather than inside\n'
  + '     .sol-grid__list. -->';

const HEAD = 'Every Family Deserves Meaningful Choices';
const LEDE = 'Every child is different, and families should have the freedom to choose the '
  + 'educational path that gives their child the best opportunity to succeed.';
const INTRO = 'Mississippi has several education options, but access often depends on where a '
  + 'family lives, what they can afford, or whether their child qualifies for a limited program.';
/* The third intro paragraph, which `safety` and `work` do not have. */
const INTRO_2 = 'That’s the gap we’re working to close.';

/* Verbatim from dist/education.html:287-314, in source order. `&amp;` is the
   source's own escaping and is reproduced rather than resolved: census() keys
   on the element's rendered text, which is the same either way, but the markup
   this build writes should be the markup the build wrote.

   FOUR ENTRIES. `work`'s array has five; this page and `safety` have four. */
const CARDS = [
  {
    label: 'Public School Choice',
    head: 'Limited by Where You Live',
    body: 'Most Mississippi students attend a public school based on where they live. Transfers to other districts are restricted, and public charter schools are only available in a small number of communities.',
    toward: 'Expanding open enrollment and access to high-quality charter schools so more families can choose the public school that works best for their child.',
  },
  {
    label: 'Private Education &amp; Education Scholarship Accounts',
    head: 'Limited by Cost and Eligibility',
    body: 'Families can choose private education, but cost puts that option out of reach for many. Education Scholarship Accounts (ESAs) can help families pay for educational expenses, but Mississippi’s current program is limited to eligible students with special needs.',
    toward: 'Expanding ESAs so more families have the resources and flexibility to choose an education that meets their child’s needs.',
  },
  {
    label: 'Options for Unique Learning Needs',
    head: 'Available to Eligible Students',
    body: 'Mississippi offers programs including the Special Needs ESA, Nate Rogers Scholarship, and Dyslexia Therapy Scholarship to help eligible students access specialized education. However, eligibility and availability remain limited.',
    toward: 'Protecting and strengthening these programs while expanding access to educational opportunities that meet students’ individual needs.',
  },
  {
    label: 'Homeschooling &amp; Innovative Education',
    head: 'Available, but Access Varies',
    body: 'Homeschooling gives families flexibility to personalize their child’s education, while growing models like microschools create new ways for students to learn. But these options may not be practical or available for every family.',
    toward: 'Supporting educational innovation so more families have access to learning environments that work for their children.',
  },
];

const TOWARD_LABEL = 'What We’re Working Toward:';

/* Verbatim from dist/education.html:318-322. */
const CLOSER_HEAD = 'Real Choice for Every Family';
const CLOSER_1 = 'Education freedom should mean more than having options on paper.';
const CLOSER_2 = 'A family’s choices shouldn’t be determined by their ZIP code, income, or '
  + 'eligibility for a limited program. We’re working to ensure more Mississippi families have '
  + 'meaningful access to an education that works for their child.';
const CLOSER_LINE = 'We don’t tell families which school to choose. We work to make sure they '
  + 'have a choice.';

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
              text({ markup: `<p>${INTRO_2}</p>` }),
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
        container(
          { cssClass: 'sol-grid__closer', content_width: 'full', _attributes: 'data-reveal|rise' },
          [
            text({ markup: `<h3>${CLOSER_HEAD}</h3>` }),
            text({ markup: `<p>${CLOSER_1}</p>` }),
            text({ markup: `<p>${CLOSER_2}</p>` }),
            text({ markup: `<p class="sol-grid__closer-line">${CLOSER_LINE}</p>` }),
          ],
        ),
      ]),
    ],
  );
}
