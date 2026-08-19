import { container, text, image, link, html } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/education.html, the <section class="sol-stories">
   block (lines 325-358). Every class, string and attribute below is read from
   that file, not typed from memory. This section carries no HTML comment in
   source.

   THIS SECTION DEPENDS ON BRIDGE BLOCKS 39 AND 40, and both dependencies are
   on the ROUTE rather than on the class: both are keyed
   `.sol-stories__panel > .em-btn`, so they only match if `.em-btn` lands on a
   direct child of the panel, which is what a link() widget does and what an
   html() blob does not. Note 3 records the route and why it is the same one
   both siblings took.

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

      THE PHOTOGRAPH IS `family-outdoors-park` (20610), THE ONE FILE THIS UNIT
      HAD TO IMPORT. It was not in the media library when this task started;
      media.mjs records the import command, the three-way md5 check and the
      settled alt sentence it was imported with. Neither `safety` nor `work`
      needed an import.

   3. SHAPE C, SITE ONE OF TWO: `.sol-stories__panel` TAKES ROUTE B, A link()
      WIDGET, AND INHERITS BLOCKS 39 AND 40. The two Shape C sites on this page
      take DIFFERENT routes and the fork is recorded per site rather than per
      page; 07-latest.mjs note 4 is the other one. Both answers are the same as
      `safety`'s and `work`'s, and both were re-derived from this page's own
      markup rather than carried over, because the fork is per SITE and a fill
      is where a site would quietly change shape.

      The site: `.sol-stories__panel` (dist/education.html:330) is a <div> with
      THREE children, an <h2>, a <p> and
      `<a class="em-btn em-btn--primary em-btn--lg">`. css/solution.css:290-291
      gives it `max-width:64ch` and a padding and no `align-items`, so once it
      is an Elementor container its children are flex items taking the default
      `stretch` and the button's wrapper spans the full 64ch measure where the
      static build draws a shrink-wrapped pill. That is what block 39 repairs
      with `align-self:flex-start`.

      WHY ROUTE B HERE. Route A means one html() blob for the whole panel, and
      two of the three children are editable prose; Paolo's ruling of
      2026-08-18 is that prose keeps its widget and the page pays the repair,
      which is the same reason 04-caps.mjs note 4 gives for its own eight
      strings. Taking Route A here would ALSO make blocks 39 and 40 inert,
      because `.em-btn` would be on an anchor nested inside an html() widget
      rather than on a direct child of the panel, and it would bring the NINTH
      category with it (see below). So Route A on this site would turn two free
      inheritances into new rules plus a new exposure.

      WHAT ROUTE B COSTS, stated rather than left to be discovered, and it is
      the same on all three pages. One comparison key: controlBoxes() skips any
      anchor inside `.elementor-widget-button` by design, so
      `a|See all community stories` exists on the static side and not on the
      live one and drops out of the shared set, which is recipe section 7's
      coverage cost and one of this page's four unachievable box keys. And
      layoutInvariants() keys by class tokens, so
      `em-btn.em-btn--lg.em-btn--primary` names a <div> live and an <a> static;
      the two are the same painted box by construction, because link() renders
      the pill on the wrapper, but they are not the same element. Any
      comparison of this button AT REST OR ON HOVER must be keyed on
      `.sol-stories__panel .em-btn`, the element that CARRIES the class, and
      not on `.sol-stories__panel a`, which differs by design under this route.

      AND ANY COMPARISON OF ITS FOCUS STATE MUST BE KEYED THE OTHER WAY, which
      is the correction `work` paid for and this module states rather than
      repeats. `:focus-visible` binds to the element that HAS focus, and under
      Route B that is the ANCHOR inside the wrapper, never the carrier. Keying
      the carrier tests an element that can never enter the state, which is how
      `safety`'s own note here came to report a focus ring that was not there.
      Rest and hover: key the carrier. Focus: key the focused element. Probed
      both ways on this page; the numbers are in the task report.

      WHAT ROUTE B AVOIDS. The ninth cost category cannot bite here.
      Elementor's `.elementor a{box-shadow:none;text-decoration:none}` at 0,1,1
      beats `components/components.css:11`'s `.em-btn--primary{...
      box-shadow:var(--shadow-sm)}` at 0,1,0 only when an ANCHOR carries the
      class; under Route B the class is on the wrapper <div>, which that
      selector cannot reach. Probed by hand at rest and on hover, and the
      carrier matches the static anchor exactly on both.

      WHAT ROUTE B USED TO COST AND NO LONGER DOES: the focus ring itself.
      `components/components.css:7` is
      `.em-btn:focus-visible{outline:none;box-shadow:var(--shadow-focus)}`, and
      with the class on the wrapper and the focus on the anchor that selector
      matched neither element, so the button had no focus indicator of any kind
      (WCAG 2.4.7). Bridge blocks 40 and 41 both repair it and both were
      written during Task 18, block 40 named to this panel and block 41 keyed
      component-wide on `.elementor-widget-button.em-btn`. This page inherits
      both without a new rule; block 40 is the narrower and is what fires here.

   4. `.sol-stories__panel` NEEDS NO MARGIN-COLLAPSING REPAIR, walked pairwise
      on this page's own copy before it was deployed. Its <h2> carries a 20px
      bottom margin (:292) against a <p> whose top margin is 0, and that <p>
      carries a 32px bottom margin (:296) against an anchor with no margin at
      all, so static pays max(X,0) = X at both joins and the converted flex
      column pays X + 0 = X.

   5. THE FEED IS ONE html() BLOB, WHICH IS THE OPPOSITE DECISION TO
      05-grid.mjs's list AND IS MADE ON THE OPPOSITE GROUND. Three things turn
      on it, and THIS PAGE IS THE ONE THAT SETTLED THE FIRST FOR ALL THREE.

      It is NOT a Loop Grid, and this page is the reason. `work`'s three cards
      are exactly the newest three of `category__and=9,28` on the install and
      `safety`'s are exactly the newest three of `9,29`, so on those two pages a
      real loop would reproduce the static build. It is NOT true here. This
      page's first card, "From a Mother's Struggle to a Thriving Academy: The
      Story of Knox Academy", is post 20354 on the install and carries
      categories 7 (Education) and 48 (Empower News); it does NOT carry 9
      (Community Stories) at all, yet the static build labels it a community
      story. Read off the install on 2026-08-19 with `wp post term list 20354
      category`, not inferred. So no single query definition serves all three
      pages of one template, and podcast-a is the precedent for what happens
      when a real loop is pointed at content that does not match: it is the one
      converted page excluded from the register. Authoring all three keeps the
      unit consistent with itself and leaves the question where it belongs.

      THAT MISMATCH IS AN EMPOWER CONTENT QUESTION AND IS NOT FIXED HERE.
      Either Knox Academy joins Community Stories or this feed is curated by
      hand at hand-off. Changing the card, the label or the query in this
      module would be a decision about Empower's taxonomy dressed up as a
      conversion.

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
      `safety` or `work`; measured across this page's whole middle band rather
      than assumed to be settled, and the widths are in the task report.

      It also keeps the real `<ul>` and `<li>`, which no container can render
      (04-caps.mjs note 3), and keeps `data-cms` and `data-cms-note` on the
      real `<ul>` where the hand-off will look for them.

   6. `data-cms` AND `data-cms-note` ARE PRESERVED VERBATIM, attribute order
      included. They are the source's own instruction to whoever builds the
      real Loop Grid ("Community stories for this solution area, newest three")
      and they are the only place the query is written down. Stripping them
      would be an editorial decision beyond converting what is there, and on
      this page they are also the record of a query that does not currently
      return what the page shows.

   7. `id="stories-title"` is authored in the markup, per 01-hero.mjs note 5. */

const HEAD = 'Voices of Education';
const LEDE = 'Behind every policy are students, parents, and educators with real experiences. '
  + 'Hear from Mississippians about the challenges they’ve faced, the opportunities that made a '
  + 'difference, and what they want for the future of education.';
const CTA = 'See all community stories';

/* Verbatim from dist/education.html:336-356, attribute order included, curly
   quotation marks and apostrophes reproduced byte for byte. */
const FEED = '<ul class="sol-feed" data-cms="loop" data-cms-note="Community stories for this solution area, newest three. A Loop Grid over the Community Stories category, narrowed to this area." data-reveal-group>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/from-a-mothers-struggle-to-a-thriving-academy-the-story-of-knox-academy/">From a Mother’s Struggle to a Thriving Academy: The Story of Knox Academy</a>\n'
  + '    <p class="sol-feed__excerpt">When Julie Gilliland first sat in doctors’ offices years ago, hearing predictions about her son John Knox, the words felt heavy and discouraging.</p>\n'
  + '    <span class="sol-feed__date">January 31, 2026</span>\n'
  + '  </li>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/unlimited-dreams-gives-laurel-students-another-education-option-hope/">Unlimited Dreams Gives Laurel Students Another Education Option, Hope</a>\n'
  + '    <p class="sol-feed__excerpt">Dr. Amanda Cooley set out on a mission to meet the education needs of the children in her hometown of Laurel, Mississippi.</p>\n'
  + '    <span class="sol-feed__date">January 27, 2025</span>\n'
  + '  </li>\n'
  + '  <li class="sol-feed__card" data-reveal="rise">\n'
  + '    <span class="sol-feed__kind">Community story</span>\n'
  + '    <a class="sol-feed__title" href="https://empowerms.org/rocket-learning-launches-new-options-in-southwest-mississippi/">Rocket Learning Launches New Education Option in Southwest Mississippi</a>\n'
  + '    <p class="sol-feed__excerpt">Deep in the heart of Southwest Mississippi, in the sleepy community of Silver Creek, lies an innovative thriving new school founded by a veteran teacher who was looking for freedom in her own classroom.</p>\n'
  + '    <span class="sol-feed__date">September 9, 2024</span>\n'
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
        [image({ ...photo('family-outdoors-park') })],
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
