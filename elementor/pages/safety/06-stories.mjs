import { container, text, image, link, html } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/safety.html, the <section class="sol-stories"> block
   (lines 309-342). Every class, string and attribute below is read from that
   file, not typed from memory. This section carries no HTML comment in source.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.sol-stories__band` IS A CONTAINER HOLDING AN image(), and the <figure>
      becomes a <div>, for the reason 03-problem.mjs note 4 gives. Its ratio is
      on the <img> itself (css/solution.css:287-288, `aspect-ratio:21/9`,
      restated as `4/3` at :327 inside `@media (max-width:860px)`, on the <img>
      again), so the media query travels with the element and the safe-shape
      argument of 03-problem.mjs note 5 applies unchanged. The band sits
      OUTSIDE `.em-container`, edge to edge, which is source order and is why
      it is a direct child of the section here.

   3. SHAPE C, SITE ONE OF TWO: `.sol-stories__panel` TAKES ROUTE B, A link()
      WIDGET, AND PAYS THE REPAIR. The two Shape C sites on this page take
      DIFFERENT routes and the fork is recorded per site rather than per page;
      07-latest.mjs note 4 is the other one.

      The site: `.sol-stories__panel` (dist/safety.html:315) is a <div> with
      THREE children, an <h2>, a <p> and
      `<a class="em-btn em-btn--primary em-btn--lg">`. css/solution.css:290-291
      gives it `max-width:64ch` and a padding and no `align-items`, so once it
      is an Elementor container its children are flex items taking the default
      `stretch` and the button's wrapper spans the full 64ch measure where the
      static build draws a shrink-wrapped pill.

      WHY ROUTE B HERE. Route A means one html() blob for the whole panel, and
      two of the three children are editable prose; Paolo's ruling of
      2026-08-18 is that prose keeps its widget and the page pays the repair,
      which is the same reason 04-caps.mjs note 4 gives for its own eight
      strings. A third shape was considered and rejected: keeping the prose as
      text() widgets and authoring only the anchor as an html() widget. It
      would keep one comparison key and cost no geometry rule, but it makes the
      call to action unretargetable from Elementor's panel on the one page
      whose CTA points at `/latest`, a route that does not exist on the install
      yet and will have to be repointed at hand-off. Eight converted pages
      already express a primary CTA as a link(); the hand-off is better served
      by nine that behave the same way than by one that is measured slightly
      more closely.

      WHAT ROUTE B COSTS, stated rather than left to be discovered. One bridge
      rule (block 39, `align-self:flex-start`, the shape epic-a's block 19
      establishes). One comparison key: controlBoxes() skips any anchor inside
      `.elementor-widget-button` by design, so `a|See all community stories`
      exists on the static side and not on the live one and drops out of the
      shared set, which is recipe section 7's coverage cost. And
      layoutInvariants() keys by class tokens, so `em-btn.em-btn--lg.em-btn--primary`
      names a <div> live and an <a> static; the two are the same painted box by
      construction, because link() renders the pill on the wrapper, but they
      are not the same element and the report says so.

      WHAT ROUTE B AVOIDS. The ninth cost category cannot bite here.
      Elementor's `.elementor a{box-shadow:none;text-decoration:none}` at 0,1,1
      beats `components/components.css:11`'s `.em-btn--primary{...
      box-shadow:var(--shadow-sm)}` at 0,1,0 only when an ANCHOR carries the
      class; under Route B the class is on the wrapper <div>, which that
      selector cannot reach. bridge.css block 30's corpus sweep measured
      exactly this on seven pages and found all seven false for the same
      reason. Probed by hand anyway, at rest, on hover and on real keyboard
      focus, because no instrument here compares box-shadow or colour.

   4. `.sol-stories__panel` NEEDS NO MARGIN-COLLAPSING REPAIR, walked pairwise
      before the page was deployed. Its <h2> carries a 20px bottom margin
      (:292) against a <p> whose top margin is 0, and that <p> carries a 32px
      bottom margin (:296) against an anchor with no margin at all, so static
      pays max(X,0) = X at both joins and the converted flex column pays
      X + 0 = X.

   5. THE FEED IS ONE html() BLOB, WHICH IS THE OPPOSITE DECISION TO
      04-caps.mjs's list AND IS MADE ON THE OPPOSITE GROUND. Three things turn
      on it.

      It is NOT a Loop Grid. The brief settles that: the three static cards are
      exactly the newest three of `category__and=9,29` on the install today,
      ids 19575, 18763 and 18413 in the same order, so a real loop would
      reproduce this page; but the same query definition does NOT reproduce
      `education`, whose Knox Academy story does not carry the Community
      Stories term at all, and podcast-a is the precedent for what happens when
      a real loop is pointed at content that does not match. It is the one
      converted page excluded from the register.

      It is not editable prose. `data-cms="loop"` says the whole list is a
      placeholder for a query, so nothing here is copy Empower would revise in
      the panel, and the argument that costs 04-caps.mjs a bridge rule does not
      apply.

      And the blob is what keeps the cards' own layout honest. `.sol-feed__card`
      is a flex column (css/solution.css:306) and `.sol-feed__date` is pushed to
      the bottom of it with `margin-top:auto` (:322), which is a FLEX-ITEM
      property: it only does anything while the date span is a real flex item
      of the card, and while the card itself is stretched to its grid row.
      Authored inside one blob, the whole subtree reaches the page unaltered
      and both conditions hold. Built the other way, with `.sol-feed` a
      container and each card a widget, the card would sit inside a wrapper
      that is the grid item, the card would size to its own content rather than
      to the row, and the three dates would stop lining up. That is the brief's
      tenth category, and this shape costs zero of it.

      WHAT THE BLOB IS WATCHED FOR INSTEAD is the SEVENTH category, blocks 14,
      16 and 24: `.sol-feed` is a three-column grid collapsing to one at 860
      (:299 and :326), so its height is a step function of its width, and a
      step-function box inside a widget wrapper is exactly the precondition for
      a wrapper resolved from a hypothetical inline size. Measured across this
      page's whole middle band rather than argued; the widths are in the task
      report.

      It also keeps the real `<ul>` and `<li>`, which no container can render
      (04-caps.mjs note 3), and keeps `data-cms` and `data-cms-note` on the
      real `<ul>` where the hand-off will look for them. capitol-a's own
      `<ol class="cca-eps">` is the precedent, for both reasons.

   6. `data-cms` AND `data-cms-note` ARE PRESERVED VERBATIM, attribute order
      included. They are the source's own instruction to whoever builds the
      real Loop Grid ("Community stories for this solution area, newest three")
      and they are the only place the query is written down. Stripping them
      would be an editorial decision beyond converting what is there.

   7. `id="stories-title"` is authored in the markup, per 01-hero.mjs note 5. */

const HEAD = 'Voices of Safer Communities';
const LEDE = 'Hear from Mississippians whose experiences with crime, justice, reentry, and community '
  + 'leadership show what it takes to build safer, stronger communities.';
const CTA = 'See all community stories';

/* Verbatim from dist/safety.html:321-341, attribute order included, curly
   quotation marks and apostrophes reproduced byte for byte. */
const FEED = '<ul class="sol-feed" data-cms="loop" data-cms-note="Community stories for this solution area, newest three. A Loop Grid over the Community Stories category, narrowed to this area." data-reveal-group>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/kyle-jackson-a-fathers-footsteps/">Kyle Jackson: A Father’s Footsteps</a>\n'
  + '    <p class="sol-feed__excerpt">Like most young boys, Kyle Jackson grew up wanting to be just like his father. He grew up in the Booneville area, and at the age of eight his parents divorced.</p>\n'
  + '    <span class="sol-feed__date">May 2, 2025</span>\n'
  + '  </li>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/kayla-hulett-finding-freedom-after-addiction/">Kayla Hulett: Finding Freedom After Addiction</a>\n'
  + '    <p class="sol-feed__excerpt">“Looking back, it feels like a dream. All the statistics were against me, and I should have died.” That’s how Kayla Hulett describes growing up in Tupelo before she got sober in 2012.</p>\n'
  + '    <span class="sol-feed__date">October 15, 2024</span>\n'
  + '  </li>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/tyler-wilsons-battle-for-hope/">Tyler Wilson’s Battle For Hope</a>\n'
  + '    <p class="sol-feed__excerpt">Tyler Wilson of Iuka has spent most of his 29 years on this earth in and out of prison. He was broken, addicted, and searching for fulfillment in his life.</p>\n'
  + '    <span class="sol-feed__date">August 8, 2024</span>\n'
  + '  </li>\n'
  + '</ul>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-stories',
      content_width: 'full',
      _attributes: 'aria-labelledby|stories-title',
    },
    [
      container(
        { cssClass: 'sol-stories__band', content_width: 'full', _attributes: 'data-reveal|clip' },
        [image({ ...photo('father-children-field') })],
      ),
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-stories__panel', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `<h2 id="stories-title">${HEAD}</h2>`, _attributes: 'data-reveal|rise' }),
            text({ markup: `<p>${LEDE}</p>`, _attributes: 'data-reveal|rise' }),
            link({
              label: CTA,
              href: '/latest',
              cssClass: 'em-btn em-btn--primary em-btn--lg',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        html({ markup: FEED }),
      ]),
    ],
  );
}
