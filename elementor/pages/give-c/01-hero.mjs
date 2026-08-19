import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/give-c.html, the <section class="gvc-hero"> block
   (lines 193-240). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason every prior section module
      records: a boxed container inserts div.e-con-inner between itself and its
      children, which would collapse `.gvc-hero__grid`'s own CSS grid
      (css/give-c.css:33-44) the moment it stopped seeing its real children
      directly. That matters more here than on most pages: the grid places its
      three children explicitly (`.gvc-hero__say` in column 1, `.gvc-give` in
      column 2 spanning both rows, `.gvc-hero__under` in column 1 row 2), so an
      inserted wrapper would leave one grid item holding all three.

   2. `.em-container` AND `.gvc-hero__grid` ARE ONE DIV, matching source
      (`<div class="em-container gvc-hero__grid">`), a single element carrying
      both classes in that order.

   3. THE THREE GRID CHILDREN ARE CONTAINERS, not widgets, and that is what
      keeps css/give-c.css:45-47 working: `grid-column`, `grid-row` and
      `align-self` are grid-ITEM properties, so the class has to sit on the real
      grid item, which a container is and a widget wrapper is not. The same
      three classes carry the `@media (max-width:900px)` reordering at :253-255,
      where `.gvc-give` takes `order:-1` and goes above the headline.

   4. THE CALL TO ACTION IS ONE html() WIDGET CARRYING THE WHOLE <p>, which is
      Route A of the two the brief priced. `amb-a/01-hero.mjs` note 1 took the
      same route for the same page shape; `epic-a/04-research.mjs` took Route B.
      The choice is recorded rather than inherited, and there are four reasons,
      in the order they were weighed:

      FIRST, css/give-c.css:154 is `.gvc-give__act .em-btn{width:100%}`. Under
      Route B the class lands on the widget WRAPPER
      (elementor/factory.mjs, WIDGET_CSS_CLASS_KEY), so that rule would size a
      div and the real clickable element would be Elementor's own
      `a.elementor-button` inside it, reached by bridge.css's
      `.em-btn .elementor-button{all:unset;position:absolute;inset:0}` group.
      Survivable, but this page's own declaration would stop describing the
      element the design wrote it for.

      SECOND, four comparison keys. Route A keeps `p|Donate Today` in census()
      and `a|Donate Today` in controlBoxes(), on this site and on
      03-next.mjs's, and this page has two of them. Recipe section 7 records the
      census half; the box half is that controlBoxes() skips any anchor inside
      `.elementor-widget-button` by design, which is the SILENT one.

      THIRD, layoutInvariants() keys every element by its own class tokens, so
      under Route B the key `em-btn.em-btn--lg.em-btn--primary` would name a
      <div> live and an <a> static, comparing two elements that are not the same
      element. That is the trap amb-a/01-hero.mjs note 1 records.

      FOURTH, neither <p> on this page contains prose. Both are bare layout
      wrappers around a single anchor, which is exactly the case where a blob
      loses nothing Empower would want to edit as text.

      WHAT IT COSTS, stated so the trade is legible: the link stops being
      retargetable from Elementor's own panel. That is the same cost
      `.mla-receive__back` (mail-a), `.wa-jump` (who-we-are-a), `.ta-jump`
      (team-a), `.sb-more` (solutions-b) and `.aba-hero__act` (amb-a) already
      accepted.

      AND WHAT IT DID NOT AVOID, which is this page's own finding: Route A makes
      this the FIRST anchor in the converted build to carry
      `.em-btn--primary` (every other one is a link() wrapper div or a native
      <button>), and `components.css:11` gives that class
      `box-shadow:var(--shadow-sm)` at 0,1,0 where Elementor's
      `.elementor a{box-shadow:none;text-decoration:none}` sits at 0,1,1.
      Repaired in bridge.css's `.gvc-give__act` block, WITH its :focus-visible
      companion, and the full argument is there. Route B would have dodged it by
      accident, by putting the class on a div; that is not a reason to prefer it,
      because the defect is in the reset rather than in this page.

   5. THE TWO LISTS ARE ONE html() WIDGET EACH, and that is what holds two cost
      categories at zero.

      css/give-c.css:115-124 and :135-144 give `.gvc-freq__opt` and
      `.gvc-amount` `display:flex;align-items:center;justify-content:center`
      with NO `flex-direction`. Both are anchors inside an authored string, so
      Elementor's `.e-con-full.e-flex{flex-direction:var(--flex-direction)}`
      can never reach either. Built as container trees instead, both would take
      Elementor's column default and every tile's contents would stack. Same
      reason nothing here can take Elementor's `flex-wrap:wrap` default.

      The <ul> and <li> reach the page exactly as written, so the
      `aria-labelledby` pairing with each `.gvc-field__label` keeps real list
      semantics with no `role` attribute needed. Elementor's container html_tag
      control offers no `ul` and no `li` at all
      (Utils::validate_html_tag's ALLOWED_HTML_WRAPPER_TAGS, read off the
      install and recorded at who-we-are-a/04-people.mjs), so a container tree
      could not produce this markup even if it were wanted.

   6. `.gvc-field` IS A REAL CONTAINER, because css/give-c.css:96 gives it
      `margin-bottom:clamp(20px,2.4vw,28px)` and that has to sit on the real
      flex item of `.gvc-give`, not inside a widget wrapper where it would be
      trapped.

   7. THE SECTION ID GOES ON `.gvc-give` THROUGH `_element_id`, NEVER
      `_attributes: 'id|give'`. Elementor's custom-attributes control silently
      refuses an `id` pair while accepting every other pair in the same string,
      which is what hid this on solutions-b. It must land on the DIV inside the
      hero section rather than on the section itself, because that is where
      dist/give-c.html:202 puts it and it is what 03-next.mjs's `href="#give"`
      points at. The same shape mail-a's `#signup` needed. Verified after deploy
      by fetching the live page and grepping for the id, not by the deploy's
      exit code.

      NOTE FOR HAND-OFF, not a conversion defect: css/give-c.css gives
      `.gvc-give` no `scroll-margin-top`, so following `#give` puts the panel
      under the sticky header. That is true of the static build too, identically,
      so it is not repaired here.

   8. `data-reveal` ON THE BLOB IS AUTHORED INSIDE IT, not passed as
      _attributes: the source puts nothing on this <p>, so nothing is added.
      `.gvc-hero__under` carries `data-reveal-group` on the container and its two
      paragraphs carry `data-reveal="rise"` on their widget wrappers, which is
      the established convention (js/reveal.js:23 resolves each element's group
      with `el.closest('[data-reveal-group]')`, and the wrapper is inside the
      container just as the paragraph is).

   9. THE TWO PARAGRAPHS OF `.gvc-hero__under` ARE TWO text() WIDGETS AND THE
      PAGE PAYS A BRIDGE RULE FOR IT. Paolo's ruling of 2026-08-18, recorded in
      docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md under
      "Prose blocks: keep paragraph widgets and pay the repairs": one text() per
      paragraph, because editability is the whole argument for class-in-markup
      and prose is what Empower will edit.

      WHAT IT COSTS. css/give-c.css:77 is
      `.gvc-hero__under p:last-child{margin-bottom:0}`, written for the last of
      two real siblings. Converted, each paragraph is the only child of its own
      widget wrapper, so both satisfy `p:last-child` (0,2,1), beat :72 (0,2,0)
      and take the zero, closing the block up by var(--space-5). Repaired in
      bridge.css's grouped `.gvc-hero__under` / `.gvc-matters__say` block, which
      is who-we-are-a's and epic-a's shape (the definite value on the PARAGRAPH,
      the widget set used only for the position test) rather than podcast-a's.

  10. A MARGIN THIS PAGE'S PRICE DID NOT CARRY, recorded here because the module
      is where the structure that causes it is chosen. `.gvc-give` declares no
      `display`, so Elementor makes it a flex column and adjacent siblings'
      margins stop collapsing. Walking its six children pairwise, exactly one
      pair collides: the second `.gvc-field`'s `margin-bottom` against
      `.gvc-give__act`'s `margin-top` (css/give-c.css:96 and :153). Repaired in
      bridge.css's own block, on the act's top margin rather than the field's
      bottom one, for the reason block A2 records. */

/* The curly apostrophes below are the source's, reproduced byte for byte rather
   than normalised: census() keys on the element's own text, so a straight quote
   would take the paragraph out of the shared set. */
const TITLE = 'Help Build a Mississippi Where Opportunity Is Within Reach';
const YOU = 'You want Mississippi to be a place where children can succeed, families can thrive, and '
  + 'opportunity is within reach.';
const SO = 'So do we.';

const GIVE_TITLE = 'Make your gift';
const HAND = 'Your choice carries into Empower’s donation form. Nothing to fill in twice.';
const LEGAL = 'Empower Mississippi Foundation is a 501(c)(3) nonprofit organization. Contributions are '
  + 'tax-deductible to the fullest extent allowed by law.';

const UNDER_1 = 'That’s why we’re working every day to advance practical solutions that expand educational '
  + 'opportunity, strengthen our workforce, and build safer communities.';
const UNDER_2 = 'When you give, you become part of creating a path to generational prosperity for '
  + 'Mississippi’s children, workers, and families.';

/* Copied from dist/give-c.html:207-211, attribute order included. The `<ul>`
   keeps its own aria-labelledby rather than taking one from a container: it is
   the list, not its wrapper, that the label describes. */
const FREQ = '<ul class="gvc-freq" aria-labelledby="freq-label">'
  + '<li><a class="gvc-freq__opt" href="/donate/?gift_type=one-time">One time</a></li>'
  + '<li><a class="gvc-freq__opt" href="/donate/?gift_type=monthly">Monthly</a></li>'
  + '<li><a class="gvc-freq__opt" href="/donate/?gift_type=annual">Annually</a></li>'
  + '</ul>';

/* Copied from dist/give-c.html:216-223. The `&amp;` entities are the source's
   and are kept as entities: they are what separates the two query parameters,
   and a bare `&` here would be markup this build does not ship. */
const LADDER = '<ul class="gvc-ladder" aria-labelledby="amount-label">'
  + '<li><a class="gvc-amount" href="/donate/?gift_type=one-time&amp;amount=25"><span class="gvc-amount__figure">$25</span></a></li>'
  + '<li><a class="gvc-amount" href="/donate/?gift_type=one-time&amp;amount=50"><span class="gvc-amount__figure">$50</span></a></li>'
  + '<li><a class="gvc-amount" href="/donate/?gift_type=one-time&amp;amount=100"><span class="gvc-amount__figure">$100</span></a></li>'
  + '<li><a class="gvc-amount" href="/donate/?gift_type=one-time&amp;amount=250"><span class="gvc-amount__figure">$250</span></a></li>'
  + '<li><a class="gvc-amount" href="/donate/?gift_type=one-time&amp;amount=500"><span class="gvc-amount__figure">$500</span></a></li>'
  + '<li><a class="gvc-amount gvc-amount--other" href="/donate/?gift_type=one-time"><span class="gvc-amount__figure">Other</span></a></li>'
  + '</ul>';

/* Copied from dist/give-c.html:226, attribute order included. */
const ACT = '<p class="gvc-give__act">'
  + '<a class="em-btn em-btn--primary em-btn--lg" href="/donate/">Donate Today</a>'
  + '</p>';

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
        container({ cssClass: 'gvc-hero__say', content_width: 'full' }, [
          text({ markup: `<h1 class="gvc-hero__title" id="give-title">${TITLE}</h1>` }),
          text({ markup: `<p class="gvc-hero__you">${YOU}</p>` }),
          text({ markup: `<p class="gvc-hero__so">${SO}</p>` }),
        ]),
        container({ cssClass: 'gvc-give', content_width: 'full', _element_id: 'give' }, [
          text({ markup: `<h2 class="gvc-give__title">${GIVE_TITLE}</h2>` }),
          container({ cssClass: 'gvc-field', content_width: 'full' }, [
            text({ markup: '<h3 class="gvc-field__label" id="freq-label">How often</h3>' }),
            html({ markup: FREQ }),
          ]),
          container({ cssClass: 'gvc-field', content_width: 'full' }, [
            text({ markup: '<h3 class="gvc-field__label" id="amount-label">How much</h3>' }),
            html({ markup: LADDER }),
          ]),
          html({ markup: ACT }),
          text({ markup: `<p class="gvc-give__hand">${HAND}</p>` }),
          text({ markup: `<p class="gvc-give__legal">${LEGAL}</p>` }),
        ]),
        container(
          { cssClass: 'gvc-hero__under', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `<p>${UNDER_1}</p>`, _attributes: 'data-reveal|rise' }),
            text({ markup: `<p>${UNDER_2}</p>`, _attributes: 'data-reveal|rise' }),
          ],
        ),
      ]),
    ],
  );
}
