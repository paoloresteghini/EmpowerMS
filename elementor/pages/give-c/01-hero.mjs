import { container, text } from '../../factory.mjs';

/* Source of truth: dist/give-c.html, the <section class="gvc-hero"> block.
   Every class, string and attribute below is read from that file, not typed
   from memory.

   REWRITTEN 2026-09-11, WHEN THE GIFT PANEL WAS REMOVED. Most of what this
   header used to argue was about that panel: an html() blob for its call to
   action, two more for its tile lists, a real container for each `.gvc-field`,
   an `_element_id` for its `#give` anchor, and four separate repairs in
   bridge.css that its structure cost. None of it survives, and it is not
   reproduced here: the notes that remain are the ones that still describe
   something in this file.

   What replaced it is in elementor/pages/give-c/02-form.mjs: Gravity Form 4
   itself, in a card overlapping this band. The reasoning for the swap is in
   src/give-c/sections/01-hero.html.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason every prior section module
      records: a boxed container inserts div.e-con-inner between itself and its
      children, which would collapse `.gvc-hero__grid`'s own CSS grid the moment
      it stopped seeing its real children directly.

   2. `.em-container` AND `.gvc-hero__grid` ARE ONE DIV, matching source
      (`<div class="em-container gvc-hero__grid">`), a single element carrying
      both classes in that order.

   3. THE HEADLINE IS A WIDGET AND THE WORDS COLUMN IS A CONTAINER, which is
      what the source says and is also what the grid needs. The grid places its
      two children by source order into a 5fr/7fr pair with no explicit
      `grid-column` on either, so an extra widget wrapper around the <h1> is
      harmless: the wrapper becomes grid item one and the <h1> fills it. That
      is only true BECAUSE the placement is automatic now. It was not true of
      the panel layout this replaces, whose three children were placed
      explicitly and needed the class on the real grid item; if anyone puts
      `grid-column` back on either child, the headline has to become a
      container too.

   4. `data-reveal` ON THE PARAGRAPHS, `data-reveal-group` ON THEIR CONTAINER,
      which is the established convention (js/reveal.js resolves each element's
      group with `el.closest('[data-reveal-group]')`, and the widget wrapper is
      inside the container just as the paragraph is).

   5. FOUR PARAGRAPHS, FOUR text() WIDGETS, AND THE PAGE PAYS A BRIDGE RULE FOR
      IT. Paolo's ruling of 2026-08-18, recorded in
      docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md under
      "Prose blocks: keep paragraph widgets and pay the repairs": one text() per
      paragraph, because editability is the whole argument for class-in-markup
      and prose is what Empower will edit.

      WHAT IT COSTS, and it is the same debt `.gvc-hero__under` carried under
      the old name: css/give-c.css has
      `.gvc-hero__words p:last-child{margin-bottom:0}`, written for the last of
      four real siblings. Converted, each paragraph is the only child of its own
      widget wrapper, so all four satisfy `p:last-child` (0,2,1), beat the
      preceding rule (0,2,0) and take the zero, closing the block up by
      var(--space-5) three times over. Repaired in bridge.css's grouped
      `.gvc-hero__under` / `.gvc-matters__say` block, which this rename has to
      follow: see the note on that block.

   6. NO SECTION ID ANY MORE. The hero carried `#give` on the panel until
      2026-09-11 and the closing plate's button pointed at it. Both moved to
      `#donate-form`, which 02-form.mjs puts on the form section. A fragment
      naming nothing fails silently, so test.mjs now sweeps every fragment on
      all four Donate readings against the ids that exist. */

/* The curly apostrophes below are the source's, reproduced byte for byte rather
   than normalised: census() keys on the element's own text, so a straight quote
   would take the paragraph out of the shared set. */
const TITLE = 'Help Build a Mississippi Where Opportunity Is Within Reach';
const YOU = 'You want Mississippi to be a place where children can succeed, families can thrive, and '
  + 'opportunity is within reach.';
const SO = 'So do we.';
const UNDER_1 = 'That’s why we’re working every day to advance practical solutions that expand educational '
  + 'opportunity, strengthen our workforce, and build safer communities.';
const UNDER_2 = 'When you give, you become part of creating a path to generational prosperity for '
  + 'Mississippi’s children, workers, and families.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'gvc-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|give-title',
    },
    [
      container({ cssClass: 'em-container gvc-hero__grid', content_width: 'full' }, [
        text({ markup: `<h1 class="gvc-hero__title" id="give-title">${TITLE}</h1>` }),
        container(
          { cssClass: 'gvc-hero__words', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `<p class="gvc-hero__you">${YOU}</p>`, _attributes: 'data-reveal|rise' }),
            text({ markup: `<p class="gvc-hero__so">${SO}</p>`, _attributes: 'data-reveal|rise' }),
            text({ markup: `<p>${UNDER_1}</p>`, _attributes: 'data-reveal|rise' }),
            text({ markup: `<p>${UNDER_2}</p>`, _attributes: 'data-reveal|rise' }),
          ],
        ),
      ]),
    ],
  );
}
