import { container, text } from '../../factory.mjs';

/* Source of truth: dist/who-we-are-a.html, the <section class="wa-status">
   block (lines 243-269). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. EACH `.wa-entity` IS A CONTAINER WITH tag 'article', NOT AN html() BLOB,
      and this is the one place on the page where the blob lever would have
      been actively wrong rather than merely a style choice.
      css/who-we-are-a.css:229 and :230 are `.wa-entity:nth-child(2)` and
      `:nth-child(3)`, which give the second card the blue-600 top border and
      the third the orange one. A container IS the nth child of
      `.wa-status__cards`, so both keep matching. Built as html() widgets the
      class would sit on `.wa-entity` INSIDE a `.elementor-widget-html`
      wrapper, the wrapper would be the nth child, and both selectors would go
      INERT: all three cards would render with the same `.wa-entity` base
      `border-top:4px solid var(--em-blue)` (:228) and nothing in either
      instrument would report it, because the census does not read borders and
      the box sweep does not measure an <article> at all. Under-matching is the
      silent half of this defect class, which is why it is checked by reading
      the live tree rather than by the sweeps passing.

      'article' is a real option, not a fallback: it is in Elementor's own
      ALLOWED_HTML_WRAPPER_TAGS (wp-content/plugins/elementor/includes/
      utils.php:28, read off the install on 2026-08-18), so the semantics of
      the source's `<article class="wa-entity">` survive intact. Contrast
      04-people.mjs note 4, where <figure> is NOT in that list and the same
      substitution costs six restated rules.

   2. `.wa-entity`'s OWN FLEX LAYOUT COSTS NOTHING. css/who-we-are-a.css:225
      declares `display:flex;flex-direction:column;gap:var(--space-3)`, and
      Elementor's container default is also a flex column, so the one property
      it would otherwise win on (`flex-direction`, resolved through
      `.e-con-full.e-flex` at 0,2,0) agrees with the build here. The `gap` is
      set by the build at 0,1,0 against Elementor's own var-driven
      declaration, which loses on source order because the page stylesheet is
      enqueued after Elementor's frontend.min.css. This is the case the hero's
      `.wa-hero__actions` is NOT (01-hero.mjs note 8): there the build asks for
      a row and declares no direction, so Elementor's column wins uncontested.

   3. THREE text() WIDGETS PER CARD, one each for the tag paragraph, the
      heading and the body. css/who-we-are-a.css:231-236 addresses all three
      by descendant selector (`.wa-entity__tag`, `.wa-entity h3`,
      `.wa-entity p`), so each reaches its real element with the widget wrapper
      only ever sitting ABOVE it, never between the selector's reference point
      and its target. Each is `margin:0`, and the 12px between them comes from
      the card's own `gap`, which applies to the wrappers. So no `:last-child`
      exposure and no repair, the same reason 02-why.mjs note 2 gives for
      `.wa-why__body`.

   4. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never a heading()
      widget. No `heading()` import above. The id travels on the <h2> itself,
      so the section's aria-labelledby="status-title" resolves to the heading
      element rather than to a div that merely contains it. The card headings
      are bare <h3> in text() widgets for the same reason.

   5. `.wa-status__head` CARRIES BOTH `wa-status__head` AND `wa-mark`, one
      element with two classes in source. `.wa-mark` (:38-40) is
      `position:relative` plus a `padding-top` and an absolutely positioned
      `::before` bar, all of which apply to a container unchanged: the
      pseudo-element is out of flow, so it never becomes a flex item of the
      container it decorates. */

const HEADLINE = 'Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.';

const ENTITIES = [
  {
    tag: '501(c)(3)',
    name: 'Empower Mississippi Foundation',
    body: 'Empower Mississippi Foundation is a 501(c)(3) nonprofit organization working to educate citizens. Contributions are tax deductible for federal income tax purposes.',
  },
  {
    tag: '501(c)(4)',
    name: 'Empower Mississippi',
    body: 'Empower Mississippi is a 501(c)(4) advocacy organization working to engage citizens in the public policy process. Contributions are not tax deductible for federal income tax purposes.',
  },
  {
    tag: 'State PAC',
    name: 'Empower PAC',
    body: 'Empower PAC is a state political action committee working to support candidates for the legislature who are committed to removing barriers to opportunity so all Mississippians can flourish.',
  },
];

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'wa-status',
      content_width: 'full',
      _attributes: 'aria-labelledby|status-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          {
            cssClass: 'wa-status__head wa-mark',
            content_width: 'full',
            _attributes: 'data-reveal-group|',
          },
          [
            text({
              markup: `<h2 id="status-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        container(
          {
            cssClass: 'wa-status__cards',
            content_width: 'full',
            _attributes: 'data-reveal-group|',
          },
          ENTITIES.map((entity) => container(
            {
              tag: 'article',
              cssClass: 'wa-entity',
              content_width: 'full',
              _attributes: 'data-reveal|rise',
            },
            [
              text({ markup: `<p class="wa-entity__tag">${entity.tag}</p>` }),
              text({ markup: `<h3>${entity.name}</h3>` }),
              text({ markup: `<p>${entity.body}</p>` }),
            ],
          )),
        ),
      ]),
    ],
  );
}
