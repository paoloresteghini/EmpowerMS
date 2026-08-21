import {
  container, text, image, html,
} from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/what-we-do-a.html, the <section class="da-solutions">
   block. Every class, string and attribute below is read from that file, not
   typed from memory.

   Three "door" panels stepped down a diagonal (css/what-we-do-a.css's own
   `.da-doors>:nth-child(2)`/`:nth-child(3)` margin-top rules do the stepping;
   nothing here needs to know about that, the grid and the margins are the
   static build's own CSS reaching a converted DOM that keeps the same
   sibling order).

   Structural decisions:

   1. `.da-door` IS AN <article> CONTAINER, matching final/03-foundations.mjs's
      `.c2-panel` choice for the same shape of card: Elementor's container
      html_tag control offers article, and each door is a genuinely
      independent, syndicatable piece of content (a link to one solution
      page), which is what <article> is for.

   2. <figure> BECOMES A DIV CONTAINER for `.da-door__media`, the same
      substitution as this page's own hero (see 01-hero.mjs note 3): no
      <figcaption> in source, so a div loses no semantics.

   3. EVERY DOOR PHOTOGRAPH IS DECORATIVE. Source: `alt="" aria-hidden="true"`
      on all three <img>. Two of the three attachments (worker-workshop-bw,
      grandparents-grandchild) were imported with empty alt for exactly this
      kind of use; the third (child-classroom-tablet) carries a real alt text
      because it is meaningful elsewhere in this build (final/05-insights),
      so this door cannot rely on the attachment being empty and sets
      aria-hidden on the widget explicitly, the same split
      final/03-foundations.mjs already recorded for this same attachment.
      aria-hidden is set on the image WIDGET (lands on its wrapper per
      factory.mjs), not on the surrounding `.da-door__media` container,
      matching where aria-hidden actually sits in the source markup (on the
      <img>, not on the <figure>).

   4. THE HEADING IS A text() WIDGET CARRYING <h3><a>…</a></h3>, never a
      heading() widget with a link control. text()'s markup passes the anchor
      through exactly as authored, the same choice final/03-foundations.mjs
      made for its own `<h3><a>` panel titles, and for the same reason: no
      heading() widgets on this page, full stop, and the anchor is a real,
      retargetable href either way.

   5. THE BODY PARAGRAPH CARRIES NO CLASS. Source: `<p>Helping every child…
      </p>`, styled entirely by `.da-door__body>p` (css/what-we-do-a.css), a
      child-combinator selector with nothing of its own to hook a converted
      selector to. Built as a plain text() widget with no cssClass, matching
      the source markup exactly; whether the child-combinator selector still
      reaches it once Elementor's own widget wrapper sits between
      `.da-door__body` and the `<p>` is a measurement question, not a build
      one, and is left to the fidelity pass rather than guessed at here.

   6. `.da-door__cue` IS AN html() WIDGET, for the inline SVG it carries
      (`<svg>`), the spec's original html() exception. Source has the class
      and `aria-hidden="true"` on the <span> itself, with no separate
      wrapping element, so cssClass and _attributes both go on the html()
      call directly rather than embedded in the markup string: the widget's
      own wrapper becomes the styled, hidden element (a div rather than a
      span, the same tag substitution this build already accepts for
      figure/p elsewhere), and the markup passed to it is only the cue's
      inner content ("Learn More" plus the arrow icon). */

const HEADLINE = 'Our Solutions';

const CUE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

const DOORS = [
  {
    photo: 'child-classroom-tablet',
    href: '/quality-education',
    title: 'Quality Education',
    body: 'Helping every child access the education they need to reach their full potential.',
  },
  {
    photo: 'worker-workshop-bw',
    href: '/meaningful-work',
    title: 'Meaningful Work',
    body: 'Removing barriers so more Mississippians can find meaningful work and build lasting prosperity.',
  },
  {
    photo: 'grandparents-grandchild',
    href: '/public-safety',
    title: 'Public Safety',
    body: 'Creating safer communities where families and opportunity can thrive.',
  },
];

const door = (d) =>
  container(
    { tag: 'article', cssClass: 'da-door', content_width: 'full', _attributes: 'data-reveal|rise' },
    [
      container({ cssClass: 'da-door__media', content_width: 'full' }, [
        image({ ...photo(d.photo), _attributes: 'aria-hidden|true' }),
      ]),
      container({ cssClass: 'da-door__body', content_width: 'full' }, [
        text({ markup: `<h3><a href="${d.href}">${d.title}</a></h3>` }),
        text({ markup: `<p>${d.body}</p>` }),
        html({
          cssClass: 'da-door__cue',
          _attributes: 'aria-hidden|true',
          markup: `Learn More
            ${CUE_SVG}`,
        }),
      ]),
    ],
  );

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'da-solutions',
      content_width: 'full',
      _attributes: 'aria-labelledby|solutions-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'da-solutions__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="solutions-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        container(
          { cssClass: 'da-doors', content_width: 'full', _attributes: 'data-reveal-group|' },
          DOORS.map(door),
        ),
      ]),
    ],
  );
}
