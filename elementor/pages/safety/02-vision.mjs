import { container, text } from '../../factory.mjs';

/* Source of truth: dist/safety.html, the <section class="sol-vision"> block
   (lines 182-190) and the comment above it (179-181). Every class, string and
   attribute below is read from that file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.em-container` IS ITS OWN DIV, matching source's three nested elements
      (`section > div.em-container > div.sol-vision__inner`).

   3. THIS SECTION COSTS THE PAGE'S ELEVENTH COST CATEGORY, AND IT IS THE ONE
      NOBODY PRICED. css/solution.css:86-88 makes `.sol-vision__inner` a
      two-column CSS grid, and :90, :95 and :100 place its three children BY
      NAME: `.sol-vision__inner h2{grid-column:1}`,
      `.sol-vision__lede{grid-column:2}`, `.sol-vision__body{grid-column:2}`.

      Every one of those three is a GRID-ITEM property, and converted, the grid
      item is the `.elementor-widget` wrapper rather than the heading or the
      paragraph inside it. All three declarations go inert on an element that
      is not a grid item, auto-placement takes over, and the third child lands
      in COLUMN 1 UNDER THE HEADING instead of in column 2 under the lede.
      That is the same mechanism as the brief's tenth category (a flex-item
      property on an element that stops being the flex item) with a different
      property family and a different failure: it does not merely fail to
      stretch something, it puts content in the wrong cell.

      THE REPAIR IS `display:contents` ON THE THREE WIDGET WRAPPERS, one named
      rule (bridge.css block 36), and it is chosen over restating
      `grid-column` on the wrappers for a reason that is about the media query
      rather than about elegance. css/solution.css:103-108 collapses this grid
      to ONE column at 900 and resets all three children to `grid-column:1`,
      and those overrides sit on the real elements. A wrapper-level
      restatement would be inert below 900 while the wrappers kept a
      `grid-column:2` that now names a column the grid does not have, which
      creates an implicit second column and breaks the mobile layout; it would
      therefore need its own 900px counterpart, which is two rules and a
      second thing to keep in step. `display:contents` makes the real elements
      the grid items, so the base rules AND the 900px overrides both apply
      exactly as the static build wrote them, and no declaration of the
      build's is restated anywhere.

   4. `data-reveal` IS AUTHORED IN THE MARKUP IN THIS SECTION, NOT ON THE
      WRAPPER, and that is forced by note 3 rather than chosen. A
      `display:contents` element generates no box, so opacity, transform and
      clip-path have no effect on it: css/motion.css's
      `[data-reveal="on"] [data-reveal]{opacity:0;transform:translateY(20px)}`
      would be silently ignored and js/reveal.js's IntersectionObserver would
      watch a box that does not exist. Authored on the real <h2> and the real
      <p>, which is where dist/safety.html puts it, the reveal layer behaves
      exactly as it does in the static build. Verified on the live page by
      watching both elements animate, not by reading the specificity.

   5. `id="vision-title"` is authored in the markup, per 01-hero.mjs note 5.

   6. NO PROSE REPAIR HERE, walked before the page was built rather than after
      it was measured. css/solution.css gives this block no `p` rule and no
      structural pseudo-class at all: `.sol-vision__lede` (:95) and
      `.sol-vision__body` (:100) each declare their own margins by class, the
      lede's is a BOTTOM margin of `var(--space-6)` against a body whose top
      margin is 0, and the container is a grid on both sides, where margins do
      not collapse either way. Nothing collides. */

const NOTE = '<!-- Still dark. The vision continues the hero rather than breaking from it: one\n'
  + '     belief stated on the same surface the page opened on, and the four things it\n'
  + '     requires listed underneath it. -->';

const HEAD = 'What Do Safe Communities Look Like?';
const LEDE = 'Every Mississippian should feel safe in the community they call home.';
const BODY = 'That means preventing crime, supporting effective law enforcement, strengthening families, '
  + 'and ensuring our justice system promotes both safety and fairness.';

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
