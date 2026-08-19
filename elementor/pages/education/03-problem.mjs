import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/education.html, the <section class="sol-problem">
   block (lines 202-221) and the two comments around it (191-200 and 214-216).
   Every class, string and attribute below is read from that file, not typed
   from memory.

   THIS SECTION DEPENDS ON BRIDGE BLOCKS 28 AND 37, both inherited and both
   keyed on `.sol-problem__copy`, which css/solution.css gives all three
   solution pages. Note 3 states the two conditions and redoes both walks on
   THIS page's copy.

   IT IS ALSO THE FIRST OF THIS PAGE'S TWO PLACES WHERE THE COPY IS LONGER THAN
   ITS SIBLINGS': FOUR paragraphs here where `safety` and `work` have three.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.sol-problem__inner` IS A GRID AND NEEDS NOTHING, which is the opposite
      answer to 02-vision.mjs's grid and the difference is worth restating on
      this page because the two look identical in the stylesheet.
      css/solution.css:126 places `.sol-problem__media` explicitly
      (`grid-column:1;grid-row:2;align-self:start`) and that element is a
      CONTAINER here, so it IS the grid item and all three declarations land on
      it. The other two children carry no placement at all: the <h2>
      auto-places into column 1 row 1 and `.sol-problem__copy` into column 2
      row 1, on both sides, because auto-placement counts ITEMS and the widget
      wrapper is the item in exactly the position the heading occupied. The
      discriminator block 36's own comment records is "does a WIDGET carry a
      placement", and here none does.

   3. `.sol-problem__copy` IS A CONTAINER WITH FOUR text() CHILDREN, AND THAT
      SHAPE IS WHAT BLOCKS 28 AND 37 BOTH ASSUME. Four, not three: this page's
      copy carries a second plain <p> between the body and the turn
      (dist/education.html:209). Neither block counts paragraphs, so neither
      needed changing, but both walks were redone here rather than inherited.

      BLOCK 28's three tiers, applied to four widgets. Its third tier keys
      `> .elementor-widget-text-editor:last-child`, so it assumes each
      paragraph is its own text() widget and that the lede keeps its
      `.sol-lede` class in the markup. Both hold here.
      css/solution.css:135 is `.sol-problem__copy p:last-child{margin-bottom:0}`,
      written for the last of FOUR real siblings on this page; converted, every
      paragraph is the only child of its own widget, so every one satisfies
      `p:last-child` (0,2,1), beats `.sol-problem__copy p` (0,2,0) and takes
      the zero. `.sol-lede` loses its own 24px the same way, because :137's
      `.sol-problem__copy .sol-lede` is also 0,2,0. Block 28 hands back the
      paragraph value on the middle two, the named lede value on the first, and
      the zero on the last WIDGET.

      SO THIS PAGE LOSES 64px TO THAT DEFECT WHERE `safety` AND `work` LOSE 44,
      because there is one more 20px paragraph margin inside the block.
      Measured on the static build before this page was deployed: the copy
      block is 291.13 tall at 1440, and the three margins block 28 hands back
      are 24 + 20 + 20.

      BLOCK 37 assumes the same block and one specific collision, and the
      pairwise walk was redone on THIS page's four children rather than
      inherited as a conclusion (all four margin-tops read 0 except the turn's,
      read off the static build at 1440):

          p.sol-lede   mb var(--space-6) -> p          mt 0                 no
          p            mb var(--space-5) -> p          mt 0                 no
          p            mb var(--space-5) -> p.sol-turn mt var(--space-8)    YES

      ONE collision, the same one and the same arithmetic as on the other two
      pages: the extra paragraph is added on the safe side of the block, so it
      contributes another non-colliding join and nothing else. In the static
      build `.sol-problem__copy` declares no `display` at all (:132 gives it
      only `min-width:0`), so it is a plain block and those two margins collapse
      to the turn's 40; converted it is an Elementor flex column and the page
      pays 20 + 40 = 60. Both tokens are fixed, so the arithmetic does not vary
      with width. Block 37 takes the surplus off the TURN's top margin rather
      than off the paragraph's bottom one, which is block A2's ruling: the
      static build's 20px is real and merely collapsed away, so a repair that
      deletes it fixes the total by falsifying a term census() reads.

      THE TWO MUST BOTH REACH THIS PAGE OR NEITHER SHOULD. Block 28 alone hands
      back 64 and leaves the block 20px tall; block 37 alone takes 20px off a
      block that is already 44px short. Block 37 is written
      `.elementor .sol-problem__copy .sol-turn`, qualified with the copy block
      precisely so it cannot reach a `.sol-turn` another page puts somewhere
      else, and this page puts its `.sol-turn` last inside the copy.

   4. `.sol-problem__media` IS A CONTAINER, NOT AN html() BLOB, and the
      <figure> becomes a <div>. Elementor's ALLOWED_HTML_WRAPPER_TAGS
      (wp-content/plugins/elementor/includes/utils.php:28 on the install) has
      no `figure`, so a container cannot render one; and the photograph has to
      be an image() widget, because Empower must be able to change it through
      the media library. Nothing in css/solution.css addresses `figure` by tag,
      so the change costs no rule. Recorded as a semantic loss rather than a
      neutral restructure.

   5. THE PHOTOGRAPH'S RATIO COSTS NOTHING, checked rather than assumed.
      css/solution.css:129-130 puts `width:100%;height:auto;aspect-ratio:4/3;
      object-fit:cover;object-position:50% 38%` on the <img> ITSELF through a
      descendant selector, and asks no ancestor for a height. That is the safe
      shape: the selector keeps matching through the `.elementor-widget-image`
      wrapper, and the wrapper is stretched to the container's width by
      Elementor's own column default, so the img's `width:100%` resolves
      against the same box on both sides.

      THIS PAGE'S FILE IS NEITHER SIBLING'S. dist/education.html:317 is
      `classroom-students.jpg` (attachment 20587) where dist/safety.html:216 is
      `grandparents-grandchild.jpg` (20583) and dist/work.html:217 is
      `girl-writing-bw.jpg` (20584). The declared intrinsic size is 1242x1580,
      which changes nothing because the ratio is declared on the element and
      `object-fit:cover` crops to it.

   6. THE ALT TEXT IS THE ATTACHMENT'S, NOT THIS PAGE'S, and that is a
      constraint rather than a choice: Elementor's image widget has no alt
      control. media.mjs records the conflict in full, and it is a real one
      here rather than a wording preference: the live sentence says one adult
      where the decisions document, having opened the file, counts two. It is
      one of the ten sentences awaiting Paolo, `final` and `what-we-do-a` both
      ship the live sentence today, and no `wp post meta update` was run.

   7. BOTH SOURCE COMMENTS ARE CARRIED. The section-level one (191-200) goes at
      the top of the heading's markup, the first authorable point in the
      section; the figure's own (214-216) goes at the end of the last
      paragraph's markup, which is the authorable point immediately before the
      figure, because a container cannot carry a comment and the image widget
      has no markup string of its own. Both are byte for byte `work`'s, checked
      against both files: the section comment's second paragraph is the one
      about the photograph arriving with the light, which dist/safety.html
      words differently. */

const SECTION_NOTE = '<!-- The first light break in the page, and it lands harder for having been\n'
  + '     withheld through two dark sections. That withholding is the template’s one\n'
  + '     structural device, which is why the hero and the vision above it carry no\n'
  + '     light and no photograph at all.\n'
  + '\n'
  + '     The first photograph on this page now arrives here rather than at the\n'
  + '     stories, under the heading in the left column. The original reading held\n'
  + '     every picture back until section 6; it reads better with the light and the\n'
  + '     photograph arriving together, and the hero and vision are still pure navy,\n'
  + '     so the withholding that the composition depends on is intact. -->';

const MEDIA_NOTE = '<!-- Last in the markup, placed back under the heading by CSS. Written\n'
  + '     before the copy it takes a grid row of its own and pushes the whole\n'
  + '     right-hand column down to clear it. -->';

const HEAD = 'One Size Doesn’t Fit Every Child';
const LEDE = 'Every child learns differently, but families don’t always have access to the '
  + 'educational opportunities that best meet their child’s needs.';
const BODY = 'Where a family lives, what they can afford, or the options available in their '
  + 'community can determine the education a child receives.';
/* The fourth paragraph, which `safety` and `work` do not have. */
const BODY_2 = 'Parents may find the right school or learning environment for their child, only '
  + 'to discover they can’t access it.';
const TURN = 'Mississippi can do better.';

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
              text({ markup: `<p>${BODY_2}</p>` }),
              text({
                markup: `<p class="sol-turn">${TURN}</p>\n${MEDIA_NOTE}`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            container(
              { cssClass: 'sol-problem__media', content_width: 'full', _attributes: 'data-reveal|clip' },
              [image({ ...photo('classroom-students') })],
            ),
          ],
        ),
      ]),
    ],
  );
}
