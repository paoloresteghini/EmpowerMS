import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/give-c.html, the <section class="gvc-matters"> block
   (lines 249-271). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, for the reason 01-hero.mjs note 1
      records: a boxed container inserts div.e-con-inner and would collapse
      `.gvc-matters__grid` (css/give-c.css:173-176) and
      `.gvc-matters__figures` (:195-198), both CSS grids whose tracks are their
      real children.

   2. `.em-container` AND `.gvc-matters__grid` ARE ONE DIV, matching source.

   3. THE FOUR PARAGRAPHS AND THE HEADING ARE FIVE text() WIDGETS AND THE PAGE
      PAYS A BRIDGE RULE FOR IT, the same ruling 01-hero.mjs note 9 cites.

      WHAT IT COSTS. css/give-c.css:188 is
      `.gvc-matters__say p:last-child{margin-bottom:0}`, written for the last of
      three real siblings. Converted, each paragraph is the only child of its
      own widget wrapper, so all three satisfy `p:last-child` (0,2,1), beat :184
      (0,2,0) and take the zero, closing the block up by var(--space-5) twice.
      Repaired in bridge.css's grouped `.gvc-hero__under` / `.gvc-matters__say`
      block. ONE property is restated and not four, which is the difference from
      epic-a's block 17: the losing rule (:184) and the winning rule (:188) here
      agree on every declaration except `margin-bottom`, so nothing else is at
      risk. `.gvc-matters__say .gvc-matters__lead` (:189-192) is a third rule at
      0,2,0 that the `:last-child` rule never contests, because it declares no
      margin at all.

      The <h2> is untouched by both repair rules, because both name `p`, which
      is what keeps css/give-c.css:177-183's own `margin:0 0 clamp(...)` on the
      heading intact.

   4. <figure> BECOMES A DIV CONTAINER for both `.gvc-figure`. Elementor cannot
      render a <figure> container at all: Utils::validate_html_tag falls back to
      'div' for any tag outside ALLOWED_HTML_WRAPPER_TAGS, and that list holds
      no `figure` (read off the install on 2026-08-18 and recorded at
      who-we-are-a/04-people.mjs:67-73). There is no <figcaption> in source, so
      a div loses no semantics, and the same substitution every prior page in
      this build makes.

      THE CLASS HAS TO BE ON A CONTAINER RATHER THAN ON THE IMAGE WIDGET, and
      that is what keeps css/give-c.css:199-200 working. `.gvc-figure{margin:0}`
      and `.gvc-figure:last-child{margin-top:clamp(24px,4vw,56px)}` are grid-ITEM
      properties on the two tracks of `.gvc-matters__figures`, and :265 zeroes
      the offset again below 520px. With both figures built as containers,
      nothing of Elementor's falls between the grid and its items and
      `:last-child` still picks the second figure only, exactly as
      `.sb-station:nth-child(2)` does on solutions-b. Confirmed on the live DOM
      by reading the tree rather than only by measuring, because the failure
      would be SILENT: the second figure would simply lose the offset that
      exists to break the seam a pair of equal rectangles makes.

   5. NEITHER PHOTOGRAPH NEEDS A WRAPPER REPAIR, and the reason is the selector
      rather than the picture. css/give-c.css:201-205 is
      `.gvc-figure img{display:block;width:100%;height:auto;aspect-ratio:4/5;
      object-fit:cover;border-radius:var(--radius-media)}`: a DESCENDANT
      selector, with the ratio on the <img> and `height:auto`, so it keeps
      matching through Elementor's wrapper and never asks an ancestor for a
      height. That is the safe shape; the family that needs a rule is the one
      that puts the class ON the <img> (bridge.css blocks 2, 13 and 18). Do not
      widen those repairs to reach here.

      Checked against the one Elementor rule that could contest it:
      frontend.min.css carries `.elementor img{border:none;border-radius:0;
      box-shadow:none;height:auto;max-width:100%}` at 0,1,1, and
      `.gvc-figure img` is also 0,1,1. css/give-c.css is enqueued after
      Elementor's frontend stylesheet, so the build wins the tie on source
      order, which is what keeps `border-radius:var(--radius-media)` on the
      photographs.

      Block 25's srcset shape cannot bite here either: that defect is a
      container sized from the image's INTRINSIC ratio, and this build declares
      the ratio, so which srcset candidate WordPress picks cannot change the
      box.

   6. ALT TEXT IS AN OPEN EDITORIAL ITEM ON BOTH IMAGES, and on one of them the
      live attachment has no alt at all. media.mjs records both against
      docs/elementor/phase2b/2026-08-18-alt-text-decisions.md. Nothing is
      written to the install. */

/* The curly apostrophes below are the source's, reproduced byte for byte rather
   than normalised: census() keys on the element's own text, so a straight quote
   would take the paragraph out of the shared set. */
const TITLE = 'You’re Investing in Mississippi’s Future';
const LEAD = 'A stronger Mississippi isn’t built overnight. It’s built one opportunity, one family, and '
  + 'one generation at a time.';
const SAY_1 = 'Your generosity helps create the conditions that allow people to flourish: a quality '
  + 'education, meaningful work, strong families, and safe communities.';
const SAY_2 = 'Together, we’re helping ensure the next generation has even greater opportunities than the '
  + 'one before it.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'gvc-matters',
      content_width: 'full',
      _attributes: 'aria-labelledby|matters-title',
    },
    [
      container({ cssClass: 'em-container gvc-matters__grid', content_width: 'full' }, [
        container({ cssClass: 'gvc-matters__say', content_width: 'full' }, [
          text({
            markup: `<h2 class="gvc-matters__title" id="matters-title">${TITLE}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="gvc-matters__lead">${LEAD}</p>`,
            _attributes: 'data-reveal|rise',
          }),
          text({ markup: `<p>${SAY_1}</p>`, _attributes: 'data-reveal|rise' }),
          text({ markup: `<p>${SAY_2}</p>`, _attributes: 'data-reveal|rise' }),
        ]),
        container({ cssClass: 'gvc-matters__figures', content_width: 'full' }, [
          container({ cssClass: 'gvc-figure', content_width: 'full' }, [
            image({ ...photo('child-classroom-tablet') }),
          ]),
          container({ cssClass: 'gvc-figure', content_width: 'full' }, [
            image({ ...photo('children-running-parent') }),
          ]),
        ]),
      ]),
    ],
  );
}
