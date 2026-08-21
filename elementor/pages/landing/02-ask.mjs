import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/landing.html, the <section class="lnd-ask"> block
   (lines 212-250). Every class, string and attribute below is read from that
   file, not typed from memory.

   BLOCK 2 OF SIX, INDEPENDENT OF THE OTHER FIVE. Nothing in this module reads
   from or is read by any other section module; page.mjs can drop it and the
   page still renders.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, per 01-hero.mjs note 1.

   2. `.lnd-ask__grid`'s TWO CHILDREN ARE THE COPY CONTAINER AND THE POINTS
      LIST'S WIDGET WRAPPER, and both are real grid items. css/landing.css:87-89
      is `grid-template-columns:minmax(0,1fr) minmax(0,.9fr)` with
      `align-items:start`, and neither child carries a grid-ITEM property of its
      own (no `grid-column`, no `grid-row`, no `align-self`), so auto-placement
      puts them in the two columns on both sides and there is nothing for the
      eleventh cost category to break. Checked against the stylesheet rather
      than assumed: `css/landing.css` declares no grid-item property anywhere
      except `order` on `.lnd-pair--flip`, which 03-pair.mjs note 5 walks.

   3. THE PROSE COSTS ONE REPAIR, AND IT JOINS BRIDGE BLOCK 28 RATHER THAN
      STARTING A BLOCK. css/landing.css:94-95 is
      `.lnd-ask__copy p{margin:0 0 var(--space-5);max-width:56ch;...}` and :96
      is `.lnd-ask__copy p:last-child{margin-bottom:0}`, written for the last of
      two real siblings. Converted, each paragraph is the only child of its own
      text-editor widget, so each satisfies `p:last-child` (0,2,1), beats the
      block rule (0,2,0) and takes the zero. That is the phase's FIRST cost
      category and the tenth instance of it.

      IT JOINS BLOCK 28 because block 28 already declares exactly this value,
      `var(--space-5)`, for `.gvc-hero__under`, `.gvc-matters__say`,
      `.sol-problem__copy` and `.sol-grid__intro`, and Task 17's brief set the
      precedent that one grouped block across pages beats a second block
      restating the same declaration. Read off css/landing.css:94 and :96
      rather than assumed from give-c's or solution's numbers.

      TWO TIERS, NOT THREE. Block 28's middle tier restores a NAMED lede rule
      that `p:last-child` also beats (`.sol-lede`, `.sol-grid__lede`); this
      block has no named paragraph rule at all, so `.lnd-ask__copy` appears in
      block 28's first and third selector groups and not its second.

      THE THIRD TIER USES `> .elementor-widget-text-editor:last-child p` AND
      NOT `:not(:last-child)` ON THE WRAPPERS, which is block 1's and block
      17's shape rather than podcast-a's. This install runs MailMunch, which
      injects `<div class='mailmunch-forms-in-post-middle' style='display: none
      !important;'></div>` INSIDE a text-editor widget, and block 28's own
      comment records that as the FOURTH time that div has changed what a
      selector matches here. Under podcast-a's shape the injected div would
      give a genuinely-last paragraph its own margin AND another on its wrapper.

      TWO PARAGRAPHS, AND ONLY THE FIRST IS A REPAIR. The second is genuinely
      the last of its block on both sides, so the static build zeroes it and the
      converted page should too; the third tier is what puts that zero back on
      the last WIDGET rather than on whatever happens to be the last node inside
      one.

   4. `.lnd-points` IS ONE html() WIDGET, and that is forced rather than chosen.
      Elementor's container html_tag control offers no `ul` and no `li` at all
      (Utils::validate_html_tag's ALLOWED_HTML_WRAPPER_TAGS holds a, article,
      aside, button, form, div, footer, h1 to h6, header, main, nav, p, section
      and span, read off the install on 2026-08-18 and recorded at
      who-we-are-a/04-people.mjs), so a container tree could not produce this
      markup even if it were wanted. Same route give-c's two ladders,
      epic-a's area list and education's stub and feed lists take.

      AND IT HOLDS TWO COST CATEGORIES AT ZERO. `.lnd-points{display:grid;
      gap:var(--space-5)}` (:98) and `.lnd-point`'s own padding, border and
      radius (:99-101) all land on real elements inside one authored string, so
      Elementor's container defaults can never reach them: no `flex-direction`
      fight, no `--gap` fallback, no widget wrapper between the list and its
      items. Built as a container tree, the three points would be widget
      wrappers rather than list items and `.lnd-points`'s grid would be laying
      out the wrappers.

      WHAT IT COSTS, stated so the trade is legible: the three points are
      campaign copy, and inside an html() widget they are edited in a code
      field rather than in a rich-text one. That is the same cost every list in
      this build has paid since podcast-a, and it is not avoidable here for the
      reason above.

   5. `id="ask-title"` IS AUTHORED IN THE MARKUP, on the real <h2>, per
      01-hero.mjs note 8.

   6. `data-reveal` RIDES ON THE WIDGET WRAPPERS AND CONTAINERS, per
      01-hero.mjs note 7, except inside the html() blob, where the source's own
      `data-reveal-group` on the <ul> and `data-reveal="rise"` on each <li>
      reach the page authored, exactly as the static build has them. The
      section itself carries no `data-reveal` attribute of any kind in the
      source, and none is added.

   7. NO MARGIN COLLAPSE IS PAID HERE, walked before the page was built rather
      than after it was measured. Elementor makes `.lnd-ask__copy` a flex
      column, and adjacent siblings' margins stop collapsing there, so any pair
      whose first child has a bottom margin and whose second has a top margin
      would be paid twice. `css/landing.css` declares NO top margin on any
      element on this page: every margin in the file is either `0`,
      `0 0 <value>` or `0 auto`. Nothing can collide, on this block or on any
      other, which is why this page pays none of the block-29 or block-37
      family. */

/* Copied from dist/landing.html:212-220, indentation included. The middot and
   the curly apostrophe are the source's, per 00-note.mjs note 5. */
const BLOCK_NOTE = '<!-- BLOCK 2 · THE ASK\n'
  + '     A rich-text slot and a three-point row. The three points are the block a\n'
  + '     campaign page always needs and never has a name for: what is happening,\n'
  + '     what it costs, what would fix it. Each is a heading and two lines, so it\n'
  + '     stays a summary rather than becoming a second essay.\n'
  + '\n'
  + '     NO NUMBERS. This build does not invent statistics, and a campaign’s numbers\n'
  + '     are the thing most likely to be wrong six months later. Where a figure\n'
  + '     belongs, the point says so in words and the real one is dropped in. -->';

const HEAD = 'What we asked for';

/* dist/landing.html:226-229, four source lines joined with single spaces. The
   em dash and both curly apostrophes are the source's. */
const ASK_1 = 'The Education Scholarship Account gives a child with special needs the '
  + 'option their family judges best. It was funded for fewer children than '
  + 'qualified for it, so the state kept a waiting list — and a waiting list '
  + 'for a child’s education is a year of that child’s schooling.';

/* dist/landing.html:230-231. */
const ASK_2 = 'We asked lawmakers for one thing: fund the accounts every eligible '
  + 'family had already been told they qualified for.';

/* Copied from dist/landing.html:234-247, attribute order and indentation
   included. The three <li> are real tags inside one string, per note 4. */
const POINTS = '<ul class="lnd-points" data-reveal-group>\n'
  + '  <li class="lnd-point" data-reveal="rise">\n'
  + '    <h3>What is happening</h3>\n'
  + '    <p>Eligible families are approved, then told to wait for a place to open.</p>\n'
  + '  </li>\n'
  + '  <li class="lnd-point" data-reveal="rise">\n'
  + '    <h3>What it costs</h3>\n'
  + '    <p>A school year a child does not get back, in the years that matter most.</p>\n'
  + '  </li>\n'
  + '  <li class="lnd-point" data-reveal="rise">\n'
  + '    <h3>What would fix it</h3>\n'
  + '    <p>Funding that follows eligibility, so the list stops existing.</p>\n'
  + '  </li>\n'
  + '</ul>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lnd-ask',
      content_width: 'full',
      _attributes: 'aria-labelledby|ask-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'lnd-ask__grid', content_width: 'full' }, [
          container(
            { cssClass: 'lnd-ask__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({
                markup: `${BLOCK_NOTE}\n<h2 id="ask-title">${HEAD}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
              text({ markup: `<p>${ASK_1}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${ASK_2}</p>`, _attributes: 'data-reveal|rise' }),
            ],
          ),
          html({ markup: POINTS }),
        ]),
      ]),
    ],
  );
}
