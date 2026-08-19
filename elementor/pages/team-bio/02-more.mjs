import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/team-bio.html, the <section class="tp-more"> block
   (lines 252-261). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-profile.mjs note 1
      records.

   2. `.em-container` IS ITS OWN DIV, not merged with `.tp-more__slab`,
      because source has three nested elements here (`section >
      div.em-container > div.tp-more__slab`) rather than the two-class single
      div section one uses. Read from the file rather than copied.

   3. `.tp-more__slab` IS A CONTAINER WITH TWO CHILDREN, AND THAT IS WHAT
      COSTS THE ROW RULE. css/team-bio.css:126-131 is
      `.tp-more__slab{display:flex;align-items:center;justify-content:
      space-between;gap:clamp(...);flex-wrap:wrap;...}`, which declares the
      display and NOT the direction, because in the static build `row` is the
      initial value and needs no declaring. Converted, the element is an
      Elementor container and `.e-con-full.e-flex{flex-direction:
      var(--flex-direction)}` (frontend.min.css, 0,2,0) is fed `column` by
      `.e-con.e-flex{--flex-direction:column}`, which the build's 0,1,0 rule
      cannot reach. The heading and the link stack and distribute down the
      slab instead of sitting at opposite ends. Repaired in bridge.css's
      `.tp-more__slab` block, WITH its `@media (max-width:520px)` counterpart
      in the same commit, because css/team-bio.css:147-149's own
      `flex-direction:column` is at 0,1,0 and cannot reach a 0,2,0 rule
      either. Without the counterpart the repair would pin this slab to a row
      at 390, a width the register samples.

      THE ALTERNATIVE WAS ONE html() BLOB FOR THE WHOLE SLAB, which would
      cost no rule at all and was rejected: the <h2> is the one piece of
      editable content in this section, and Paolo's ruling of 2026-08-18 is
      that prose keeps its widget and the page pays the repair. The blob
      would not even have saved a comparison key, because census() and
      controlBoxes() both read the live DOM and an <h2> authored inside an
      html() widget is still an <h2>; what it would have cost is Empower's
      ability to edit the line at all.

      `.tp-more__slab` DECLARES `flex-wrap:wrap` (:127), so it agrees with
      Elementor's own container default by construction and the flex-wrap
      category (bridge.css block 15) cannot bite here. `align-items` is not
      restated either: the build declares it at 0,1,0 in both the base rule
      and the 520 rule, and Elementor resolves its own through
      `.elementor-element:where(...)`, which `:where()` makes 0,1,0, so the
      build already wins on source order. That is block A1's finding, checked
      here rather than assumed, and confirmed by measurement afterwards.

   4. `.tp-more__link` IS ONE html() WIDGET, not a link(), for the reason
      01-profile.mjs note 3 gives for `.tp-back`: the anchor holds an inline
      <svg> that css/team-bio.css:136 sizes and :138 animates on `:hover`,
      and link() cannot put an element inside the anchor. It also keeps
      `a|Team, Board & Fellows#2` in controlBoxes(), which skips any anchor
      inside `.elementor-widget-button`.

      `href="team-a.html"` is preserved verbatim, per 01-profile.mjs note 4.

   5. THE COMMENT SOURCE PUTS ABOVE THIS SECTION (dist/team-bio.html:249-251)
      IS CARRIED IN 01-profile.mjs, at the end of that section's last html()
      widget. It sits between `</section>` and `<section class="tp-more">` in
      source, where nothing on this side is authorable: this section's first
      authorable point is inside `.tp-more__slab`, two containers in and
      after the heading, which is further from where the build puts it than
      the end of the section before. Recorded in both modules so neither
      reads as the place it went missing. */

const HEAD = 'Meet the rest of the team';

/* Verbatim from dist/team-bio.html:256-258, attribute order included. */
const LINK = '<a class="tp-more__link" href="team-a.html" data-reveal="rise">Team, Board &amp; Fellows\n'
  + '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>\n'
  + '</a>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'tp-more',
      content_width: 'full',
      _attributes: 'aria-labelledby|more-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'tp-more__slab', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: `<h2 id="more-title">${HEAD}</h2>`, _attributes: 'data-reveal|rise' }),
            html({ markup: LINK }),
          ],
        ),
      ]),
    ],
  );
}
