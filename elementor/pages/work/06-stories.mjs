import { container, text, image, link, html } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/work.html, the <section class="sol-stories"> block
   (lines 320-353). Every class, string and attribute below is read from that
   file, not typed from memory. This section carries no HTML comment in source.

   THIS SECTION DEPENDS ON BRIDGE BLOCK 39, and the dependency is on the ROUTE
   rather than on the class: block 39 is `.sol-stories__panel > .em-btn`, so it
   only matches if `.em-btn` lands on a direct child of the panel, which is
   what a link() widget does and what an html() blob does not. Note 3 records
   the route and why it is the same one `safety` took.

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

      THE PHOTOGRAPH IS `worker-workshop-bw` (20582), not `safety`'s
      `father-children-field` (20579), and it is the one image on this page
      whose live alt matches the static build's byte for byte. media.mjs
      records both.

   3. SHAPE C, SITE ONE OF TWO: `.sol-stories__panel` TAKES ROUTE B, A link()
      WIDGET, AND INHERITS BLOCK 39. The two Shape C sites on this page take
      DIFFERENT routes and the fork is recorded per site rather than per page;
      07-latest.mjs note 4 is the other one. Both answers are the same as
      `safety`'s, and both were re-derived from this page's own markup rather
      than carried over, because the fork is per SITE and a fill is where a
      site would quietly change shape.

      The site: `.sol-stories__panel` (dist/work.html:326) is a <div> with
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
      strings. Taking Route A here would ALSO make block 39 inert, because
      `.em-btn` would be on an anchor nested inside an html() widget rather
      than on a direct child of the panel, and it would bring the NINTH
      category with it (see below). So Route A on this site would turn a free
      inheritance into a new rule plus a new exposure.

      WHAT ROUTE B COSTS, stated rather than left to be discovered, and it is
      the same on this page as on `safety`. One comparison key: controlBoxes()
      skips any anchor inside `.elementor-widget-button` by design, so
      `a|See all community st` exists on the static side and not on the live
      one and drops out of the shared set, which is recipe section 7's coverage
      cost. And layoutInvariants() keys by class tokens, so
      `em-btn.em-btn--lg.em-btn--primary` names a <div> live and an <a> static;
      the two are the same painted box by construction, because link() renders
      the pill on the wrapper, but they are not the same element. Any
      comparison of this button must be keyed on `.sol-stories__panel .em-btn`,
      the element that CARRIES the class, and not on
      `.sol-stories__panel a`, which differs by design under this route.

      WHAT ROUTE B AVOIDS. The ninth cost category cannot bite here.
      Elementor's `.elementor a{box-shadow:none;text-decoration:none}` at 0,1,1
      beats `components/components.css:11`'s `.em-btn--primary{...
      box-shadow:var(--shadow-sm)}` at 0,1,0 only when an ANCHOR carries the
      class; under Route B the class is on the wrapper <div>, which that
      selector cannot reach. Probed by hand at rest and on hover, and the
      carrier matches the static anchor exactly on both.

      WHAT ROUTE B COSTS THAT NOBODY HAD MEASURED, AND IT IS A WCAG 2.4.7
      FAILURE: THE FOCUS RING. This is bridge.css block 40, and it is the one
      new block this fill needed. `components/components.css:7` is
      `.em-btn:focus-visible{outline:none;box-shadow:var(--shadow-focus)}`, and
      `:focus-visible` matches the element that HAS FOCUS. Under Route B that
      is the ANCHOR, which carries no `.em-btn` class, while the element that
      carries the class is the DIV, which is not focusable. The selector
      therefore matches neither, and the focused button shows no indicator at
      all: measured live, anchor `:focus-visible` true with box-shadow `none`
      and outline-style `none`, against a static anchor showing
      `rgba(230,90,40,.38) 0 0 0 3px`.

      THE PROBE KEY IS THE DIFFERENCE BETWEEN FINDING THIS AND NOT FINDING IT.
      Block 30's standing lesson is to key on the element that CARRIES the
      class, and that is right for rest and hover and wrong for focus: a focus
      state belongs to the focusable element, so keying the carrier tests an
      element that can never enter it. `safety` shipped this same defect and
      its own note here reports the focus state as clean for exactly that
      reason. Block 40 is NAMED to `.sol-stories__panel`, so it repairs both
      pages and will repair `education`; the same defect is live on twelve
      more buttons across seven other pages, which the task-18 report records
      as an open item rather than something this module closes.

   4. `.sol-stories__panel` NEEDS NO MARGIN-COLLAPSING REPAIR, walked pairwise
      on this page's own copy before it was deployed. Its <h2> carries a 20px
      bottom margin (:292) against a <p> whose top margin is 0, and that <p>
      carries a 32px bottom margin (:296) against an anchor with no margin at
      all, so static pays max(X,0) = X at both joins and the converted flex
      column pays X + 0 = X.

   5. THE FEED IS ONE html() BLOB, WHICH IS THE OPPOSITE DECISION TO
      05-grid.mjs's list AND IS MADE ON THE OPPOSITE GROUND. Three things turn
      on it, and the first is settled on this page by measurement.

      It is NOT a Loop Grid. This page's three cards ARE exactly the newest
      three of `category__and=9,28` on the install, ids 16378, 16337 and 15440
      in the same order, so a real loop would reproduce this page; the same is
      true of `safety` under `9,29`. But it is NOT true of `education`, whose
      Knox Academy story (post 20354) carries Education and Empower News and
      not Community Stories at all, so no single query definition serves all
      three pages of one template. podcast-a is the precedent for what happens
      when a real loop is pointed at content that does not match: it is the one
      converted page excluded from the register. Authoring all three keeps the
      unit consistent with itself.

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
      to the row, and the three dates would stop lining up. That is the tenth
      cost category, and this shape costs zero of it.

      WHAT THE BLOB IS WATCHED FOR INSTEAD is the SEVENTH category, blocks 14,
      16 and 24: `.sol-feed` is a three-column grid collapsing to one at 860
      (:299 and :326), so its height is a step function of its width, and a
      step-function box inside a widget wrapper is exactly the precondition for
      a wrapper resolved from a hypothetical inline size. It did not bite on
      `safety`; measured across this page's whole middle band rather than
      assumed to be settled, and the widths are in the task report.

      It also keeps the real `<ul>` and `<li>`, which no container can render
      (04-caps.mjs note 3), and keeps `data-cms` and `data-cms-note` on the
      real `<ul>` where the hand-off will look for them.

   6. `data-cms` AND `data-cms-note` ARE PRESERVED VERBATIM, attribute order
      included. They are the source's own instruction to whoever builds the
      real Loop Grid ("Community stories for this solution area, newest three")
      and they are the only place the query is written down. Stripping them
      would be an editorial decision beyond converting what is there.

   7. `id="stories-title"` is authored in the markup, per 01-hero.mjs note 5. */

const HEAD = 'Voices of Mississippi’s Workforce';

/* The em dash below is SOURCE COPY, reproduced byte for byte from
   dist/work.html:328. This repository's rule against em dashes governs what
   this build writes, not what an already approved page says; the same
   distinction elementor/pages/safety/05-grid.mjs makes about its fourth card's
   own em dash, and capitol-a/03-library.mjs about its data-cms-note. */
const LEDE = 'Hear from Mississippians navigating careers, building businesses, and pursuing better '
  + 'opportunities—and see what meaningful work can make possible.';
const CTA = 'See all community stories';

/* Verbatim from dist/work.html:332-351, attribute order included, curly
   quotation marks and apostrophes reproduced byte for byte. */
const FEED = '<ul class="sol-feed" data-cms="loop" data-cms-note="Community stories for this solution area, newest three. A Loop Grid over the Community Stories category, narrowed to this area." data-reveal-group>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/state-removes-regulation-entrepreneur-follows-her-dreams/">State removes regulation. Entrepreneur follows her dreams.</a>\n'
  + '    <p class="sol-feed__excerpt">“I never dreamed I would be here.” That’s how Karrece Stewart describes the feeling of owning her own makeup studio, Get Glam Beauty in Fulton.</p>\n'
  + '    <span class="sol-feed__date">August 22, 2022</span>\n'
  + '  </li>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/serving-their-local-communities/">Serving their local communities</a>\n'
  + '    <p class="sol-feed__excerpt">In the small town of Louisville, Cameron Whitehead knew nearly everyone who walked through the doors at lunchtime. She’s the town’s nurse practitioner.</p>\n'
  + '    <span class="sol-feed__date">August 9, 2022</span>\n'
  + '  </li>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/home-based-business-provides-new-career-for-entrepreneur/">Home-based business provides new career for entrepreneur</a>\n'
  + '    <p class="sol-feed__excerpt">Freedom in her career is what led Jolie Freeman to her house in Magee, where she works as a home-based travel agent for her company Southern Baggage Travel.</p>\n'
  + '    <span class="sol-feed__date">February 21, 2022</span>\n'
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
        [image({ ...photo('worker-workshop-bw') })],
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
