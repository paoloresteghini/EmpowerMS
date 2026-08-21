import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/give-c.html, the <section class="gvc-next"> block
   (lines 286-297). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, for the reason 01-hero.mjs note 1
      records. `.gvc-next__plate` (css/give-c.css:215-222) is a two-track CSS
      grid whose tracks are `.gvc-next__say` and `.gvc-next__act`, so both have
      to be its real children.

   2. `.em-container` IS ITS OWN DIV HERE, not merged with anything, because
      source has three nested elements (`section > div.em-container >
      div.gvc-next__plate`) rather than the two-class single div the other two
      sections use. Read from the file rather than copied from 01-hero.mjs.

   3. THE CALL TO ACTION IS ONE html() WIDGET CARRYING THE WHOLE <p>, Route A,
      the same choice 01-hero.mjs note 4 argues in full for the other site. The
      site-specific half of the argument:

      `.gvc-next__act` is a GRID ITEM of `.gvc-next__plate`, in the `auto`
      track, under `align-items:end`. Under Route B the widget wrapper would be
      the grid item and the class would be on it, so css/give-c.css:238's
      `margin:0;white-space:nowrap` and :248's `white-space:normal` inside
      `@media (max-width:900px)` would land on the wrapper rather than on the
      <p>. Under Route A the <p> is inside the wrapper, both declarations reach
      the element the design wrote them for, and the `auto` track still sizes to
      the nowrap button's max-content because that is what the wrapper contains.

      It also keeps `p|Donate Today#2` in census() and `a|Donate Today#2` in
      controlBoxes(); with 01-hero.mjs's site that is four comparison keys this
      page would otherwise lose, two of them silently.

   4. THIS ANCHOR IS `.em-btn--inverse` AND IT NEEDS NOTHING, checked rather
      than assumed. bridge.css's "Native buttons carrying build classes" block
      restates the inverse variant for `.elementor button.em-btn--inverse`,
      because Elementor's KIT styles `button`, `input[type=button]`,
      `input[type=submit]` and `.elementor-button` and nothing else. This is an
      ANCHOR and none of those selectors reaches it, so components.css:19-20
      applies directly. Measured anyway, at rest and on hover, because colour is
      compared by no instrument in this project; the numbers are in this task's
      report.

      Unlike 01-hero.mjs's primary button, `.em-btn--inverse` declares no
      `box-shadow` at all, so Elementor's `.elementor a{box-shadow:none}` at
      0,1,1 has nothing here to take away. Confirmed by probe rather than by
      reading, for the same reason.

   5. `data-reveal="rise"` GOES ON THE PLATE CONTAINER through `_attributes`,
      matching source, which puts it on `.gvc-next__plate` itself
      (dist/give-c.html:288). The paragraphs inside carry none.

   6. NO PARAGRAPH REPAIR HERE. css/give-c.css gives `.gvc-next__say` no
      `p`-level rule at all: `.gvc-next__title` (:223), `.gvc-next__lead` (:230)
      and `.gvc-next__body` (:234) each declare their own margins by class, and
      every one of those margins is a TOP margin after a sibling whose bottom
      margin is zero, so nothing collides once the container stops collapsing
      margins. Walked pairwise before the page was built, not after it was
      measured. */

/* The curly apostrophes below are the source's, reproduced byte for byte rather
   than normalised: census() keys on the element's own text, so a straight quote
   would take the paragraph out of the shared set. */
const TITLE = 'Help Write Mississippi’s Next Chapter';
const LEAD = 'Mississippi’s story is changing, and you can help shape what comes next.';
const BODY = 'Together, we’re creating a future where more children can succeed, more families can thrive, '
  + 'and more communities can prosper.';

/* Copied from dist/give-c.html:294, attribute order included. The href is the
   in-page jump to `.gvc-give`, whose id 01-hero.mjs sets through _element_id. */
const ACT = '<p class="gvc-next__act">'
  + '<a class="em-btn em-btn--inverse em-btn--lg" href="#give">Donate Today</a>'
  + '</p>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'gvc-next',
      content_width: 'full',
      _attributes: 'aria-labelledby|next-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'gvc-next__plate', content_width: 'full', _attributes: 'data-reveal|rise' },
          [
            container({ cssClass: 'gvc-next__say', content_width: 'full' }, [
              text({ markup: `<h2 class="gvc-next__title" id="next-title">${TITLE}</h2>` }),
              text({ markup: `<p class="gvc-next__lead">${LEAD}</p>` }),
              text({ markup: `<p class="gvc-next__body">${BODY}</p>` }),
            ]),
            html({ markup: ACT }),
          ],
        ),
      ]),
    ],
  );
}
