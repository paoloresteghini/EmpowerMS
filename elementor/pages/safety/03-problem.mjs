import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/safety.html, the <section class="sol-problem"> block
   (lines 201-220) and the two comments around it (191-200 and 210-214). Every
   class, string and attribute below is read from that file, not typed from
   memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.sol-problem__inner` IS A GRID AND NEEDS NOTHING, which is the opposite
      answer to 02-vision.mjs's grid and the difference is worth stating
      because the two look identical in the stylesheet. css/solution.css:126
      places `.sol-problem__media` explicitly (`grid-column:1;grid-row:2;
      align-self:start`) and that element is a CONTAINER here, so it IS the
      grid item and all three declarations land on it. The other two children
      carry no placement at all: the <h2> auto-places into column 1 row 1 and
      `.sol-problem__copy` into column 2 row 1, on both sides, because
      auto-placement counts ITEMS and the widget wrapper is the item in
      exactly the position the heading occupied. Confirmed by reading the live
      DOM as well as by measurement.

   3. `.sol-problem__copy` IS A CONTAINER WITH THREE text() CHILDREN, and it
      costs TWO repairs, one of them unpriced.

      The priced one is css/solution.css:135,
      `.sol-problem__copy p:last-child{margin-bottom:0}`, written for the last
      of three real siblings. Converted, every paragraph is the only child of
      its own widget, so every one satisfies `p:last-child` (0,2,1), beats
      `.sol-problem__copy p` (0,2,0) and takes the zero. `.sol-lede` loses its
      own 24px the same way, because :137's `.sol-problem__copy .sol-lede` is
      also 0,2,0. Repaired in bridge.css block 28, the grouped prose block
      give-c opened, which this page JOINS rather than duplicates: the value
      goes back on the PARAGRAPH and the position test moves to the WIDGET.

      The UNPRICED one is margin collapsing, block 29's family. In the static
      build `.sol-problem__copy` is a plain block, so the second paragraph's
      20px bottom margin and `.sol-turn`'s 40px top margin (:143) collapse into
      one 40px gap. Converted it is a flex column, margins stop collapsing, and
      the page pays 20 + 40 = 60. Walked pairwise before the page was
      deployed: the lede's 24px bottom against the second paragraph's 0 top is
      max(24,0) = 24 + 0 and does not collide, and this is the only pair that
      does. Repaired in bridge.css block 37 by taking the surplus off the
      TURN's top margin rather than off the paragraph's bottom one, which is
      block A2's ruling: the static build's 20px is real and merely collapsed
      away, so a repair that deletes it fixes the total by falsifying a term
      census() reads.

   4. `.sol-problem__media` IS A CONTAINER, NOT AN html() BLOB, and the
      <figure> becomes a <div>. Elementor's ALLOWED_HTML_WRAPPER_TAGS
      (wp-content/plugins/elementor/includes/utils.php:28 on the install) has
      no `figure`, so a container cannot render one; and the photograph has to
      be an image() widget, because Empower must be able to change it through
      the media library. Nothing in css/solution.css addresses `figure` by
      tag, so the change costs no rule. Recorded as a semantic loss rather
      than a neutral restructure.

   5. THE PHOTOGRAPH'S RATIO COSTS NOTHING, checked rather than assumed.
      css/solution.css:129-130 puts `width:100%;height:auto;aspect-ratio:4/3;
      object-fit:cover;object-position:50% 38%` on the <img> ITSELF through a
      descendant selector, and asks no ancestor for a height. That is the safe
      shape: the selector keeps matching through the `.elementor-widget-image`
      wrapper, and the wrapper is stretched to the container's width by
      Elementor's own column default, so the img's `width:100%` resolves
      against the same box on both sides. It is NOT the fixed-ratio-container
      shape that cost a rule on who-we-are-a, team-a and team-bio, where the
      ratio sits on the wrapper and the img asks for `height:100%`.

   6. THE ALT TEXT IS THE ATTACHMENT'S, NOT THIS PAGE'S, and that is a
      constraint rather than a choice: Elementor's image widget has no alt
      control. media.mjs records the conflict in full, including the decisions
      document's ruling that this page's own sentence should NOT be adopted
      because it asserts a family relationship the photograph cannot
      establish. No `wp post meta update` was run.

   7. BOTH SOURCE COMMENTS ARE CARRIED. The section-level one (191-200) goes
      at the top of the heading's markup, the first authorable point in the
      section; the figure's own (210-214) goes at the end of the last
      paragraph's markup, which is the authorable point immediately before the
      figure, because a container cannot carry a comment and the image widget
      has no markup string of its own. Both confirmed present in the fetched
      live page. */

const SECTION_NOTE = '<!-- The first light break in the page, and it lands harder for having been\n'
  + '     withheld through two dark sections. That is the point of showing this\n'
  + '     variation next to A, which is light throughout.\n'
  + '\n'
  + '     The first photograph on this page now arrives here rather than at the\n'
  + '     stories, under the heading in the left column. The original reading held\n'
  + '     every picture back until section 6; it reads better with the light and the\n'
  + '     photograph arriving together, and the hero and vision are still pure navy,\n'
  + '     so the withholding that the composition depends on is intact. -->';

const MEDIA_NOTE = '<!-- Last in the markup, placed back under the heading by CSS. Written\n'
  + '     before the copy it takes a grid row of its own and pushes the whole\n'
  + '     right-hand column down to clear it. -->';

const HEAD = 'Safe Communities Are the Foundation for Opportunity';
const LEDE = 'When crime and instability take hold, families suffer, neighborhoods struggle, '
  + 'and opportunity becomes harder to reach.';
const BODY = 'Creating safer communities requires understanding what drives crime, supporting '
  + 'solutions that work, and ensuring our justice system holds people accountable while '
  + 'creating pathways to a better future.';
const TURN = 'Mississippi can build safer, stronger communities.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-problem',
      content_width: 'full',
      _attributes: 'aria-labelledby|problem-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-problem__inner', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `${SECTION_NOTE}\n<h2 id="problem-title">${HEAD}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'sol-problem__copy', content_width: 'full' }, [
              text({ markup: `<p class="sol-lede">${LEDE}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${BODY}</p>` }),
              text({
                markup: `<p class="sol-turn">${TURN}</p>\n${MEDIA_NOTE}`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            container(
              { cssClass: 'sol-problem__media', content_width: 'full', _attributes: 'data-reveal|clip' },
              [image({ ...photo('grandparents-grandchild') })],
            ),
          ],
        ),
      ]),
    ],
  );
}
