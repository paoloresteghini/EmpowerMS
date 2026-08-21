import { container, text, link, html, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/who-we-are-a.html, the <section class="wa-hero">
   block (lines 168-191). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `.wa-hero__grid` AND `.em-container` ARE ONE DIV, not two nested ones.
      Source: `<div class="wa-hero__grid em-container">`, a single element
      carrying both classes, the same shape solutions-b's and team-a's own
      hero grids use. Built as one container() call with a space-joined
      cssClass.

   2. CONTAINERS ARE 'full' THROUGHOUT, for the reason every prior section
      module records: a boxed container inserts div.e-con-inner between
      itself and its children, which would collapse `.wa-hero__grid`'s own
      CSS grid (css/who-we-are-a.css:50) the moment it stopped seeing its
      real children directly.

   3. <figure> BECOMES A DIV CONTAINER for both `.wa-hero__media` figures. No
      <figcaption> in source, so a div loses no semantics, the same
      substitution every prior hero in this build already makes.

      CONTAINERS, NOT html() BLOBS, AND THAT IS LOAD-BEARING HERE.
      css/who-we-are-a.css:86 is `.wa-hero__media:first-child{aspect-ratio:
      3/2}` and :87 is the same selector's `img{object-position:center 38%}`,
      so the FIRST of the two figures must be the real first child of
      `.wa-hero__stack`. A container IS that element (nothing of Elementor's
      is inserted above it), so the selector keeps working. Had the figures
      been built as html() widgets, `.wa-hero__media` would sit inside a
      `.elementor-widget-html` wrapper and `:first-child` would match the
      WRAPPER instead, leaving the landscape frame at the tall frame's 3/4
      ratio with nothing reporting it. Verified structurally on the live DOM
      rather than inferred from the sweeps passing; see the report.

   4. THE FIRST HERO PHOTOGRAPH IS MEANINGFUL, the second is DECORATIVE, and
      the two are built differently because of it. Source:
      `alt="Two adults and a child smiling together outdoors in a park"` with
      no aria-hidden on the first <img>, and `alt="" aria-hidden="true"` on
      the second. So the first image() carries no aria-hidden and relies on
      attachment 20583's own alt, which media.mjs confirms already reads that
      exact sentence; the second sets aria-hidden="true" on the widget, which
      hides the whole subtree.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a heading()
      widget. No `heading()` import above. The id travels on the <h1> itself,
      so the section's aria-labelledby="who-title" resolves to the heading
      element rather than to a div that merely contains it.

      `Who We&nbsp;Are` keeps its non-breaking space exactly as authored. The
      census normalises whitespace before keying, so this does not change the
      key ("h1|Who We Are" on both sides), but it does change where the line
      breaks, which is the reason the build wrote it.

   6. `.wa-jump` IS AN html() WIDGET CARRYING A REAL <a href>, the same shape
      and the same reason as team-a's `.ta-jump` and solutions-b's
      `.sb-more`: it is the hero's only in-page anchor, a real navigation
      target (`#our-story`, see 03-story.mjs for the `_element_id` that makes
      the target exist), carrying an inline <svg> that css/who-we-are-a.css
      animates on hover (:75 `.wa-jump svg{transition:transform ...}`, :77
      `.wa-jump:hover svg{transform:translateY(3px)}`), which needs the SVG
      to be a real DOM descendant of the hovered `.wa-jump` element. No
      cssClass passed to html(): the real class sits on the `<a>` tag
      directly in the markup string, so css/who-we-are-a.css:72-77 reach the
      real elements with nothing in between. Checked before choosing:
      css/who-we-are-a.css has no child-combinator rule at all (the whole
      file scores zero on that grep), so wrapping the anchor in html()'s own
      widget wrapper breaks nothing that expected it at a particular DOM
      depth.

      IT DOES COST A BRIDGE RULE, THOUGH, and this one was predicted by
      nobody. `.wa-jump` is `display:inline-flex` (:72). In the static build
      it is a DIRECT child of `.wa-hero__actions`, a flex container, so the
      flex spec blockifies it and its box is exactly its own 24px.
      Converted, html()'s wrapper stands between them, the anchor stops
      being a flex item, the blockification never happens, and the wrapper's
      line box is 3.2px taller than the anchor by the strut's descender.
      Measured: the anchor is 130.9x24 on both sides at both widths, the
      wrapper 130.9x27.2. Invisible at 1440, where the row's height comes
      from the taller button, and visible at 390, where the two actions wrap
      onto separate lines. Repaired with
      `.wa-hero__actions > .elementor-widget-html{display:contents}`, the
      same rule `.em-join__way`'s own html widget already carries in
      bridge.css.

   7. `data-reveal="rise"` SITS ON `.wa-hero__actions` ITSELF, not on its two
      children individually. Source has one `data-reveal` on the wrapping
      div; the button and the jump link reveal together as one unit.

   8. `.wa-hero__actions` NEEDS A BRIDGE RULE, and it is one this page's own
      brief did not price. css/who-we-are-a.css:67 declares `display:flex`
      and no `flex-direction`, so Elementor's `.e-con-full.e-flex{
      flex-direction:var(--flex-direction)}` (0,2,0, fed `column` by
      `.e-con.e-flex`) wins uncontested and the button stacks ABOVE the jump
      link instead of sitting beside it. The repair is
      `.wa-hero__actions.e-con{flex-direction:row}` in bridge.css, the same
      shape `.fp-hero__actions.e-con` already uses there. Neither instrument
      can see this: controlBoxes() skips anchors inside
      `.elementor-widget-button`, and `.wa-jump` is `display:inline-flex`
      (:72) so its own box is identical either way. See the report for the
      same defect measured, unrepaired, on the live team-a page. */

const KICKER = 'About Empower';
const HEADLINE = 'Who We&nbsp;Are';
const LEDE = 'Empower exists because we want every Mississippian to have the opportunity to achieve the American Dream right here at home.';

const JUMP_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" '
  + 'stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13M6 13l6 6 6-6"/></svg>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'wa-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|who-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'wa-hero__grid em-container', content_width: 'full' }, [
        container(
          { cssClass: 'wa-hero__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<p class="wa-kicker">${KICKER}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<h1 id="who-title">${HEADLINE}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="wa-hero__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            container(
              { cssClass: 'wa-hero__actions', content_width: 'full', _attributes: 'data-reveal|rise' },
              [
                link({ label: 'Meet Our Team', href: '/about/team', cssClass: 'em-btn em-btn--primary em-btn--lg' }),
                html({
                  markup: `<a class="wa-jump" href="#our-story">Read our story
          ${JUMP_SVG}
        </a>`,
                }),
              ],
            ),
          ],
        ),
        container({ cssClass: 'wa-hero__stack', content_width: 'full' }, [
          container(
            { cssClass: 'wa-hero__media', content_width: 'full', _attributes: 'data-reveal|clip' },
            [image({ ...photo('grandparents-grandchild') })],
          ),
          container(
            {
              cssClass: 'wa-hero__media wa-hero__media--tall',
              content_width: 'full',
              _attributes: 'data-reveal|clip',
            },
            [image({ ...photo('student-library'), _attributes: 'aria-hidden|true' })],
          ),
        ]),
      ]),
    ],
  );
}
