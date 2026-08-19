import { container, text, html, link, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/landing.html, the <section class="lnd-hero"> block
   (lines 178-211). Every class, string and attribute below is read from that
   file, not typed from memory.

   BLOCK 1 OF SIX, AND EVERY ONE OF THE SIX IS INDEPENDENT. css/landing.css's
   header states the property this page exists to have: "Delete block 4,
   reorder 3 and 5, run block 3 twice with the photograph on alternating sides
   - nothing here depends on what sits above or below it." Nothing in this
   module reads from, or is read by, any other section module: no selector it
   builds crosses a section boundary, and page.mjs can drop any entry from its
   array without this one changing.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason every prior section module
      records: a boxed container inserts div.e-con-inner between itself and its
      children, which would collapse `.lnd-hero__grid`'s own CSS grid
      (css/landing.css:61-63) the moment it stopped seeing its real children
      directly.

   2. `.lnd-hero__grid`'s TWO CHILDREN ARE CONTAINERS, not widgets, because
      they are the real grid items. `.lnd-hero__grid` is
      `grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr)` with
      `align-items:center`, so the copy column and the mark column have to be
      the elements the grid places.

   3. `display:grid` SURVIVES AND `flex-direction` DOES NOT, and the difference
      is a specificity fact rather than a guess. Elementor's own
      `.e-con,.e-con>.e-con-inner{display:var(--display)}` is 0,1,0 and
      `frontend.min.css` loads BEFORE `css/landing.css` on this install (read
      off the served <head> on 2026-08-19, Elementor's sheets then
      /css/style.css, /css/site.css, /css/header-2.css, /css/motion.css, the
      page sheet, /css/bridge.css), so the build's own 0,1,0 `display:grid`
      wins on source order. `flex-direction` is different: it also comes from
      `.e-con-full.e-flex{flex-direction:var(--flex-direction)}` at 0,2,0,
      which no 0,1,0 declaration can reach. That is why note 4 costs a bridge
      rule and this note costs nothing.

   4. `.lnd-hero__actions` IS A CONTAINER AND IT COSTS ONE BRIDGE RULE.
      css/landing.css:65-66 is
      `.lnd-hero__actions{display:flex;flex-wrap:wrap;align-items:center;
      gap:var(--space-4) var(--space-7);margin:0}`, which declares the display
      and NOT the direction, because in the static build `row` is the initial
      value and needs no declaring. Converted, the element is an Elementor
      container carrying `e-con-full e-flex`, and by note 3 Elementor's 0,2,0
      rule feeds it `column`. Identical in mechanism to `.epa-hero__actions`
      (bridge block 20), `.ta-hero__actions`, `.wa-hero__actions`,
      `.pca-hero__actions` and `.da-hero__actions` before it. Repaired in
      bridge.css's own block for this page, with the cross-check bridge block
      21 demands re-run: `css/landing.css` has no `@media` rule naming
      `.lnd-hero__actions` at all, so the unconditional row is correct at every
      width, unlike epic-a's, which needed a 420px companion.

      IT IS A <div> LIVE AND A <p> STATIC, AND THAT COSTS A COMPARISON KEY.
      dist/landing.html:194 is `<p class="lnd-hero__actions">`, a layout
      wrapper around two anchors rather than prose, which recipe section 7
      converts to a container. A container CAN carry `html_tag:'p'` (`p` is in
      Elementor's ALLOWED_HTML_WRAPPER_TAGS), and it must not: the container's
      children are widget <div>s, and an HTML parser closes an open `<p>` at
      the first block-level start tag, so the paragraph would end up empty with
      both actions rendered as its siblings. So the tag is `div` by necessity,
      and the cost is recipe section 7's: census() keys on each element's own
      text, so `p|Contact your legislator Read what th` exists on the static
      side and no longer exists on the live side. One key, recorded here as a
      coverage cost rather than as a neutral restructure.

   5. THE BUTTON IS A link() WIDGET, WHICH IS ROUTE B, and the choice is
      recorded rather than inherited. epic-a/01-hero.mjs builds the identical
      shape the identical way: a `.epa-hero__actions` container holding a
      link() and an html() aside. Three reasons, in the order they were
      weighed:

      FIRST, THIS IS A TEMPLATE. The one thing every campaign changes about
      this button is where it points, and a link() widget puts the href in
      Elementor's own panel where Kienna can change it. Route A, the whole <p>
      as one html() blob, would put it in a code field. On give-c that trade
      went the other way because that page's CTA points at one permanent
      donation form; here it is the slot.

      SECOND, Route A would move the class onto a real anchor and re-open the
      NINTH cost category, `.elementor a{box-shadow:none}` beating
      `.em-btn--primary{box-shadow:var(--shadow-sm)}` at 0,1,1 against 0,1,0.
      That is bridge block 30's finding, and give-c is the only page that has
      paid it, precisely because it is the only page whose `.em-btn--primary`
      carrier is an <a> on both sides.

      THIRD, it is what lets this page inherit bridge block 41 rather than need
      a rule of its own, and inheritance is the argument for the whole
      class-in-markup approach. Block 41 is keyed on
      `.elementor-widget-button.em-btn`, which is exactly what link() renders.

      WHAT IT COSTS, stated so the trade is legible: `.em-btn` lands on the
      widget WRAPPER (factory.mjs, WIDGET_CSS_CLASS_KEY) rather than on the
      anchor, so every comparison of this button must be keyed on the carrier
      for rest and hover and on the ANCHOR for focus. That distinction is
      bridge block 40's, and getting it wrong is what hid a WCAG 2.4.7 failure
      across sixteen buttons for a fortnight.

   6. THE SUPPORTING LINK IS AN html() BLOB, matching epic-a's `.epa-hero__aside`
      exactly. A link() would put `.lnd-hero__aside` on a wrapper div and render
      Elementor's own `a.elementor-button` inside it, which is the wrong
      element for a rule that sets font-weight, colour and
      `text-underline-offset` on the anchor itself. A text() would send a bare
      anchor through wpautop and come back wrapped in a <p> this page does not
      have.

      TWO THINGS TO WATCH ON IT, both predicted before deploying and both
      measured after. FIRST, `css/landing.css:66-67` gives it
      `text-underline-offset:4px` and NO `text-decoration`, which is the design
      saying there IS an underline and leaving the UA to draw it; Elementor's
      `.elementor a{text-decoration:none}` at 0,1,1 takes it away. That is the
      EIGHTH cost category and the same shape bridge.css already repairs for
      `.epa-hero__aside` and `.mla-receive__back`. SECOND, an html() wrapper
      stops the anchor being a flex item of `.lnd-hero__actions`; on
      `.epa-hero__aside` that cost 3.19px of strut descender and its width at
      390 (bridge block 22, repaired with `display:contents`). This anchor
      declares no `display` at all where epic-a's declares `inline-flex` with a
      `min-height`, so the same defect is not predicted here, and it was
      measured rather than assumed.

   7. `data-reveal` RIDES ON THE WIDGET WRAPPERS AND ON THE CONTAINERS through
      `_attributes`, which is this build's standing convention
      (education/01-hero.mjs note 6). Nothing in this section is
      `display:contents`, which is the one condition that forces the other
      convention (education/02-vision.mjs note 4). Read off the source
      element by element rather than applied by pattern: the section carries
      `data-reveal-entrance`, `.lnd-hero__grid` carries `data-reveal-group`,
      the eyebrow, the h1, the lede and `.lnd-hero__actions` each carry
      `data-reveal="rise"`, `.lnd-hero__mark` carries `data-reveal="clip"`, and
      the <img> inside it carries nothing.

   8. `id="hero-title"` IS AUTHORED IN THE MARKUP, on the real <h1>, because
      that is where dist/landing.html:190 puts it and it is what the section's
      own `aria-labelledby` points at. `_element_id` would put it on the widget
      wrapper, which is a different element from the one the label names.

   9. THE HERO PHOTOGRAPH COSTS NOTHING, and that is a property of the SELECTOR
      rather than of the photograph. css/landing.css:73-74 is
      `.lnd-hero__mark img{display:block;width:100%;height:clamp(280px,30vw,420px);
      object-fit:cover;border-radius:var(--radius-media)}`, a DESCENDANT
      selector at 0,1,1, so it reaches the real <img> straight through
      `.elementor-widget-image`'s two wrapper divs and asks no ancestor for a
      height. It ties with Elementor's own `.elementor img{height:auto}` at
      0,1,1 and wins on source order by note 3. Its `@media (max-width:900px)`
      counterpart at :78 is the same selector and reaches the same element, so
      the responsive height comes with it.

      THE PAIR BLOCK'S PHOTOGRAPH HAS THE SAME DECLARATIONS AND A DIFFERENT
      CARRIER, and only one of the two survives conversion. 03-pair.mjs note 3
      walks it. The tell is which element the class is on in the static build,
      not what the rule says.

  10. THE LCP ELEMENT LOSES ITS PRIORITY HINTS, recorded rather than repaired.
      dist/landing.html:207 gives this <img> `fetchpriority="high"` and
      `decoding="async"`; Elementor's image widget emits neither and has no
      control for either. Standing open item across the phase
      (epic-a/01-hero.mjs note 8); no filter here.

  11. THE ALT TEXT IS THE ATTACHMENT'S, NOT THIS PAGE'S, and it is disputed.
      media.mjs records it in full: the live sentence names a tablet that is
      not in the frame. No `wp post meta update` was run. */

/* Copied from dist/landing.html:178-184, indentation included. The middot and
   the em dash are the source's, per 00-note.mjs note 5. */
const BLOCK_NOTE = '<!-- BLOCK 1 · CAMPAIGN HERO\n'
  + '     Slots: eyebrow, headline, one paragraph, one action, one supporting link,\n'
  + '     one image — a photograph, a badge or a poster, whichever the campaign has.\n'
  + '     A campaign with no image deletes the column and the copy runs full width.\n'
  + '\n'
  + '     ONE ORANGE ACTION. A landing page exists to be acted on, so unlike the All\n'
  + '     Content readings this one has a filled button, and only one. -->';

/* Copied from dist/landing.html:200-203. It sits immediately before
   `.lnd-hero__mark` in the source, and the authorable point immediately before
   that container is the end of the aside's own markup string, per
   education/03-problem.mjs note 7. */
const MARK_NOTE = '<!-- A photograph, not the campaign’s own badge. Empower’s Save Our ESA\n'
  + '           artwork in the media library is an email mock-up whose body text is\n'
  + '           lorem ipsum, and a page carrying lorem ipsum in front of a client is\n'
  + '           not a template, it is an unfinished page. -->';

const EYEBROW = 'Campaign';
const TITLE = 'Save Our ESA';

/* dist/landing.html:191-193, three source lines joined with single spaces,
   which is what census()'s whitespace normalisation reduces the static build's
   newlines and indentation to. */
const LEDE = 'Mississippi families with children who have special needs were being '
  + 'put on a waiting list for the education their child needed now. '
  + 'Not next year, not when a place opened up. Now.';

/* Copied from dist/landing.html:196, attribute order included. */
const ASIDE = '<a class="lnd-hero__aside" href="https://empowerms.org/waitlisted-again/">'
  + 'Read what the waitlist meant</a>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lnd-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|hero-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'lnd-hero__grid', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'lnd-hero__copy', content_width: 'full' }, [
              text({
                markup: `${BLOCK_NOTE}\n<p class="lnd-eyebrow">${EYEBROW}</p>`,
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: `<h1 id="hero-title">${TITLE}</h1>`,
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: `<p class="lnd-hero__lede">${LEDE}</p>`,
                _attributes: 'data-reveal|rise',
              }),
              container(
                {
                  cssClass: 'lnd-hero__actions',
                  content_width: 'full',
                  _attributes: 'data-reveal|rise',
                },
                [
                  link({
                    label: 'Contact your legislator',
                    href: '#act',
                    cssClass: 'em-btn em-btn--primary em-btn--lg',
                  }),
                  html({ markup: `${ASIDE}\n${MARK_NOTE}` }),
                ],
              ),
            ]),
            container(
              { cssClass: 'lnd-hero__mark', content_width: 'full', _attributes: 'data-reveal|clip' },
              [image({ ...photo('child-classroom-tablet') })],
            ),
          ],
        ),
      ]),
    ],
  );
}
