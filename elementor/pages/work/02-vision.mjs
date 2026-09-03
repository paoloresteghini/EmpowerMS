import { container, text } from '../../factory.mjs';

/* Source of truth: dist/work.html, the <section class="sol-vision"> block
   (lines 182-190) and the comment above it (179-181). Every class, string and
   attribute below is read from that file, not typed from memory.

   THIS SECTION DEPENDS ON BRIDGE BLOCK 36, the inherited repair with the most
   conditions attached to it. Notes 3 and 4 state both conditions and why this
   module satisfies them.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.em-container` IS ITS OWN DIV, matching source's three nested elements
      (`section > div.em-container > div.sol-vision__inner`).

   3. THIS SECTION INHERITS BLOCK 36, AND THE INHERITANCE IS CONDITIONAL ON
      BUILDING IT THIS WAY. css/solution.css:86-88 makes `.sol-vision__inner` a
      two-column CSS grid, and :90, :95 and :100 place its three children BY
      NAME: `.sol-vision__inner h2{grid-column:1}`,
      `.sol-vision__lede{grid-column:2}`, `.sol-vision__body{grid-column:2}`.

      Every one of those three is a GRID-ITEM property, and converted, the grid
      item is the `.elementor-widget` wrapper rather than the heading or the
      paragraph inside it. All three declarations go inert on an element that
      is not a grid item, auto-placement takes over, and the third child lands
      in COLUMN 1 UNDER THE HEADING instead of in column 2 under the lede.
      That is the eleventh cost category, which `safety` found and named
      (bridge.css block 36).

      Block 36 is `.sol-vision__inner > .elementor-widget{display:contents}`,
      keyed on a class css/solution.css gives all three solution pages, so it
      reaches this page WITHOUT A NEW RULE, but only because the three children
      here are WIDGETS inside `.sol-vision__inner` exactly as they are on
      `safety`. An html() blob for the whole block, or a container around any
      of the three, would put a different element under that child combinator
      and the block would do nothing. Three text() widgets, direct children,
      and nothing between them.

   4. `data-reveal` IS AUTHORED IN THE MARKUP IN THIS SECTION, NOT ON THE
      WRAPPER, and that is forced by note 3 rather than chosen. A
      `display:contents` element generates no box, so opacity, transform and
      clip-path have no effect on it: css/motion.css's
      `[data-reveal="on"] [data-reveal]{opacity:0;transform:translateY(20px)}`
      would be silently ignored and js/reveal.js's IntersectionObserver would
      watch a box that does not exist. Authored on the real <h2> and the real
      <p>, which is where dist/work.html puts it, the reveal layer behaves
      exactly as it does in the static build.

      TWO OF THE THREE CHILDREN CARRY IT AND THE THIRD DOES NOT, read off
      dist/work.html:185-187 rather than assumed from the pattern: the <h2> and
      `.sol-vision__lede` carry `data-reveal="rise"` and `.sol-vision__body`
      carries nothing at all. `safety` is the same, and the third widget still
      needs `display:contents` for its `grid-column:2`, so block 36 has to
      reach all three regardless of which ones animate.

   5. `id="vision-title"` is authored in the markup, per 01-hero.mjs note 5.

   6. NO PROSE REPAIR HERE, walked before the page was built rather than after
      it was measured. css/solution.css gives this block no `p` rule and no
      structural pseudo-class at all: `.sol-vision__lede` (:95) and
      `.sol-vision__body` (:100) each declare their own margins by class, the
      lede's is a BOTTOM margin of `var(--space-6)` against a body whose top
      margin is 0, and the container is a grid on both sides, where margins do
      not collapse either way. Nothing collides, so block 28 is not in play in
      this section. */

const NOTE = '<!-- Still dark. The vision continues the hero rather than breaking from it: one\n'
  + '     belief stated on the same surface the page opened on, and what it means\n'
  + '     for people and businesses listed underneath it. -->';

const HEAD = 'What Does Meaningful Work Look Like?';
const LEDE = 'Every Mississippian should have the opportunity to earn success, provide for their family, '
  + 'and find purpose through meaningful work.';
const BODY = 'That means creating more pathways to good careers and an environment where people and '
  + 'businesses can thrive.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-vision',
      content_width: 'full',
      _attributes: 'aria-labelledby|vision-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-vision__inner', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `${NOTE}\n<h2 id="vision-title" data-reveal="rise">${HEAD}</h2>` }),
            text({ markup: `<p class="sol-vision__lede" data-reveal="rise">${LEDE}</p>` }),
            text({ markup: `<p class="sol-vision__body">${BODY}</p>` }),
          ],
        ),
      ]),
    ],
  );
}
