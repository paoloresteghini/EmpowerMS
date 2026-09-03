import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/epic-a.html, the <section class="epa-work"> block
   (lines 220-238). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason every prior section module
      records: a boxed container inserts div.e-con-inner between itself and its
      children, which would collapse `.epa-work__body`'s own CSS grid
      (css/epic-a.css:122-127) the moment it stopped seeing its real children
      directly.

   2. THE THREE PARAGRAPHS ARE THREE text() WIDGETS AND THE PAGE PAYS A BRIDGE
      RULE FOR IT. This is Paolo's ruling of 2026-08-18, recorded in
      docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md under
      "Prose blocks: keep paragraph widgets and pay the repairs": one text() per
      paragraph, because editability is the whole argument for class-in-markup
      and prose is what Empower will edit. Three previous instances took the
      repair and switching now would leave the build with two conventions for
      one shape.

      WHAT IT COSTS AND WHAT THE FAILURE LOOKS LIKE. css/epic-a.css:139-142 is
      `.epa-work__prose p:first-child{font-size:var(--fs-lead);line-height:1.45;
      color:var(--text-strong);font-weight:var(--fw-semibold)}`, written for the
      first of three real siblings. Converted, every paragraph is the only child
      of its own widget wrapper, so every one satisfies `p:first-child` (0,2,1),
      beats `.epa-work__prose p` (0,2,0) and takes the lead treatment: three lead
      paragraphs, and the claim-then-evidence structure the section is built on
      gone. Repaired in bridge.css's `.epa-work__prose` block, which is the
      who-we-are-a shape (the definite value on the PARAGRAPH, the widget set
      used only for the position test) rather than podcast-a's.

   3. `.epa-work__prose` IS A REAL CONTAINER, so css/epic-a.css:133's
      `display:grid;gap:var(--space-6)` still has the three widget wrappers as
      its grid items, one paragraph each, with the same gap between them. The
      `<p>` themselves carry `margin:0` (:135), so nothing here relies on margin
      collapsing.

   4. <figure> BECOMES A DIV CONTAINER for `.epa-work__figure`. No <figcaption>
      in source, so a div loses no semantics, the same substitution every prior
      page in this build makes. `css/epic-a.css:128` is `margin:0` on the class
      and :330 gives it `order:2` inside `@media (max-width:900px)`, both
      grid-item properties, so the class has to be on the real grid item, which
      a container is and a widget wrapper is not.

   5. THIS PHOTOGRAPH NEEDS NO WRAPPER REPAIR AND `.epa-area__photo` DOES,
      which is the distinction the brief warns not to blur. css/epic-a.css:129-132
      is `.epa-work__figure img{display:block;width:100%;height:auto;
      aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius-card)}`: a
      DESCENDANT selector, with the ratio on the <img> and `height:auto`, so it
      keeps matching through Elementor's wrapper and never asks an ancestor for a
      height. 03-research.mjs's panels put the class ON the <img> instead, which
      is the family that needs a rule. Do not widen that repair to reach here.

   6. ALT TEXT IS AN OPEN EDITORIAL ITEM ON THIS IMAGE, and on this one the
      STATIC BUILD is the side that is wrong. media.mjs records it against
      docs/elementor/phase2b/2026-08-18-alt-text-decisions.md. Nothing is written
      to the install. */

const TITLE = 'We work with real people to understand real problems and craft real solutions.';

/* The curly apostrophes below are the source's, reproduced byte for byte rather
   than normalised: census() keys on the element's own text, so a straight quote
   would take the paragraph out of the shared set. */
const CLAIM = 'Mississippi’s biggest challenges require solutions built around our state’s people, data, and realities.';
const EVIDENCE = 'EPIC combines rigorous, credible, Mississippi-specific research with the experiences of the '
  + 'people most affected by public policy. We examine what is happening, why it is happening, and what could '
  + 'work better.';
const OUTCOME = 'We turn those insights into practical, Mississippi-made policy solutions that help leaders make '
  + 'better decisions and create more opportunity across our state.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'epa-work',
      content_width: 'full',
      _attributes: 'aria-labelledby|work-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        text({
          markup: `<h2 class="epa-work__title" id="work-title">${TITLE}</h2>`,
          _attributes: 'data-reveal|rise',
        }),
        container({ cssClass: 'epa-work__body', content_width: 'full' }, [
          container(
            { cssClass: 'epa-work__figure', content_width: 'full', _attributes: 'data-reveal|clip' },
            [image({ ...photo('worker-workshop-bw') })],
          ),
          container(
            { cssClass: 'epa-work__prose', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({ markup: `<p>${CLAIM}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${EVIDENCE}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${OUTCOME}</p>`, _attributes: 'data-reveal|rise' }),
            ],
          ),
        ]),
      ]),
    ],
  );
}
