import { container, text, link, html, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/team-a.html, the <section class="ta-hero"> block
   (lines 168-189). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `.ta-hero__grid` AND `.em-container` ARE ONE DIV, not two nested ones.
      Source: `<div class="ta-hero__grid em-container">`, a single element
      carrying both classes, the same shape solutions-b's own hero grid
      uses. Built as one container() call with a space-joined cssClass.

   2. CONTAINERS ARE 'full' THROUGHOUT, for the reason every prior section
      module records: a boxed container inserts div.e-con-inner between
      itself and its children, which would collapse `.ta-hero__grid`'s own
      CSS grid the moment it stopped seeing its real children directly.

   3. <figure> BECOMES A DIV CONTAINER for `.ta-hero__media`. No
      <figcaption> in source, so a div loses no semantics, the same
      substitution every prior hero in this build already makes.

   4. THE HERO PHOTOGRAPH IS MEANINGFUL, NOT DECORATIVE, so this section
      carries no aria-hidden anywhere. Source:
      `alt="A parent playing football with two children in a field at
      sunset"`, no aria-hidden on the <img>. See media.mjs for the alt-text
      state: the attachment (children-running-parent, 20580) currently
      ships with EMPTY alt, not this page's text, an open item this
      session could not close (see media.mjs's own note); nothing about
      that changes how this widget is built, since the image widget has no
      alt control of its own regardless.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a
      heading() widget. No `heading()` import above. `<em>Committed to its
      Future.</em>` is passed through as part of the markup string exactly
      as authored.

   6. `.ta-jump` IS AN html() WIDGET CARRYING A REAL <a href>, the same
      shape and the same reason as solutions-b's `.sb-more`: it is the
      hero's only in-page anchor, a real navigation target
      (`#staff`, see 02-staff.mjs for the `_element_id` that makes the
      target exist), carrying an inline <svg> that css/team-a.css animates
      on hover (`.ta-jump svg{transition:transform...}`,
      `.ta-jump:hover svg{transform:translateY(3px)}`), which needs the SVG
      to be a real DOM descendant of the hovered `.ta-jump` element. No
      cssClass passed to html(): the real class sits on the `<a>` tag
      directly in the markup string, so css/team-a.css's `.ta-jump` and
      `.ta-jump svg` rules reach the real elements with nothing in between.
      Checked before choosing: css/team-a.css has no child-combinator rule
      involving `.ta-jump`, so wrapping it in html()'s own widget wrapper
      breaks nothing that expected it at a particular DOM depth.

   7. `data-reveal="rise"` SITS ON `.ta-hero__actions` ITSELF, not on its
      two children individually. Source has one `data-reveal` on the
      wrapping div; both the button and the jump link reveal together as
      one unit. */

const KICKER = 'Team, Board &amp; Fellows';
const HEADLINE = 'Rooted in Mississippi. <em>Committed to its Future.</em>';
const LEDE = 'We know the promise of Mississippi because we’ve built our lives here. And we know the challenges, because our state only truly thrives when hard work leads to earned success for every family in every neighborhood.';
const BODY = 'Our staff, board members, and fellows are committed to creating a path to generational prosperity for Mississippi’s children, workers, and families. Together, we’ve built the state’s leading public policy organization by advancing practical solutions that expand opportunity and help Mississippi reach its full potential.';

const JUMP_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" '
  + 'stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13M6 13l6 6 6-6"/></svg>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ta-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|team-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'ta-hero__grid em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-hero__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<p class="ta-kicker">${KICKER}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<h1 id="team-title">${HEADLINE}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="ta-hero__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="ta-hero__body">${BODY}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            container(
              { cssClass: 'ta-hero__actions', content_width: 'full', _attributes: 'data-reveal|rise' },
              [
                link({ label: 'Support Our Work', href: '/donate', cssClass: 'em-btn em-btn--primary em-btn--lg' }),
                html({
                  markup: `<a class="ta-jump" href="#staff">Meet the staff
          ${JUMP_SVG}
        </a>`,
                }),
              ],
            ),
          ],
        ),
        container({ cssClass: 'ta-hero__aside', content_width: 'full' }, [
          container(
            { cssClass: 'ta-hero__media', content_width: 'full', _attributes: 'data-reveal|clip' },
            [image({ ...photo('children-running-parent') })],
          ),
        ]),
      ]),
    ],
  );
}
