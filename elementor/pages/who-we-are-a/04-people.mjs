import { container, text, link, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/who-we-are-a.html, the <section class="wa-people">
   block (lines 224-242). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `.wa-people__grid` AND `.em-container` ARE ONE DIV, carrying
      `data-reveal-group` between them. Source:
      `<div class="wa-people__grid em-container" data-reveal-group>`.
      css/who-we-are-a.css:187 makes it a two-column grid over
      `.wa-people__copy` and `.wa-people__frames`, so both must be real
      children: containers.

   2. THE THREE-ITEM LIST IS ONE text() WIDGET CARRYING THE WHOLE <ul>.
      css/who-we-are-a.css:195 makes `.wa-people__list` a grid and :196-199
      style `li` and `li::before`. Authored as one markup string, the <ul> and
      its three <li> reach the page unaltered, so the <li> stay the real grid
      items and nothing of Elementor's falls between them. This is the
      "anything authored inside a single text() string costs nothing" half of
      the standing rule, and it is why a list needs no bridge rule at all.
      Source puts `data-reveal="rise"` on the <ul>; converted it rides on the
      widget wrapper, as every other `data-reveal` on this page does.

   3. THE CTA IS A link() WIDGET AND IT NEEDS A BRIDGE RULE. Source:
      `<a class="em-btn em-btn--outline em-btn--md" href="/about/team"
      data-reveal="rise">Team, Board &amp; Fellows</a>`. link() puts the
      class on the widget's own WRAPPER and renders the anchor inside it
      (elementor/factory.mjs, WIDGET_CSS_CLASS_KEY), so `.em-btn`'s
      `display:inline-flex` (components/components.css:4) lands on the
      wrapper. In the static build that anchor is an inline-level child of a
      BLOCK `.wa-people__copy` and shrink-wraps to its label. Converted,
      `.wa-people__copy` is an Elementor container, so it is a flex column,
      the wrapper is a flex ITEM, `align-items` resolves to `normal` (stretch)
      and the inline-flex is blockified and stretched to the full column
      width. The button renders as a full-width outline bar where the design
      draws a pill.

      Repaired with `.wa-people__copy > .em-btn{align-self:flex-start}` in
      bridge.css, named to this page's own class. `align-self` rather than
      `display:block` on the parent, because the parent measured 486x332 on
      both sides and its other two children were exact: the button's width
      was the only wrong property, and changing the parent's display would
      have been a larger change than the defect. Neither
      instrument can see this defect: controlBoxes() skips anchors inside
      `.elementor-widget-button` outright, and the wrapper carrying the class
      is a <div>, which is not in its a,button,input,select,textarea,img
      selector list. Measured, unrepaired, on the already-shipped solutions-b:
      see the report.

      `&amp;` is kept as an entity in the label. Elementor's button widget
      prints this setting unescaped, so the entity resolves to a literal
      ampersand on the page, matching the static build's own
      `Team, Board &amp; Fellows`. Verified against the live markup after
      deploy rather than assumed.

   4. THE THREE <figure> FRAMES ARE THE ONE PLACE ON THIS PAGE WHERE A
      CONTAINER CANNOT CARRY THE BUILD'S OWN SELECTOR, and it is the page's
      largest single cost. Source gives each frame `<figure data-reveal="clip">`
      with NO CLASS AT ALL, and css/who-we-are-a.css addresses them by TAG:
      :205-206 `.wa-people__frames figure`, :207 and :208 the `:nth-child(1|3)`
      margins, :210 `:nth-child(2) img`, and inside `@media (max-width:640px)`
      :260 and :261 again.

      Elementor cannot render a <figure> container. `Utils::validate_html_tag`
      (wp-content/plugins/elementor/includes/utils.php:786) falls back to
      'div' for any tag outside ALLOWED_HTML_WRAPPER_TAGS (:28), and that list
      holds a, article, aside, button, form, div, footer, h1 to h6, header,
      main, nav, p, section, span, and no figure. Read off the install on
      2026-08-18 rather than assumed. So `html_tag: 'figure'` would deploy
      cleanly, render a <div>, and take all six of those rules with it.

      Every other way out was checked and rejected:
        - html() blobs per figure would restore the tag but move it inside a
          `.elementor-widget-html` wrapper, so `:nth-child(n)` for n above 1
          would go INERT rather than over-match. That is the silent half of
          the failure: the stagger would flatten and the third frame would
          keep rendering below 640px with nothing in either sweep reporting
          it.
        - one html() blob for the whole `.wa-people__frames` group would be
          structurally perfect and is forbidden anyway, because it would put
          three photographs into raw markup where Empower cannot change them
          through the media library (the conversion recipe's section 3).
        - an invented class on each frame would not help: the build's
          stylesheet does not name it, so the rules still would not match.

      So the frames are plain containers and bridge.css restates those six
      blocks against `.wa-people__frames > .e-con`, which names this page's
      own class and reaches nothing else. Both media-query blocks are
      restated with them, because a restatement that does not bring its media
      query along silently disables the responsive half.

   5. ALL THREE FRAME PHOTOGRAPHS ARE DECORATIVE. Source gives every one of
      the three <img> `alt="" aria-hidden="true"`, so each image() carries
      `aria-hidden="true"` on its own widget, which hides the whole subtree
      whatever alt its attachment holds. That matters for two of them:
      20585 and 20584 both carry real alt text on the install (media.mjs
      records both sentences), and neither describes what this page is using
      the photograph for.

   6. THE FRAMES ALSO NEED THE IMAGE-WRAPPER RULE. The restated
      `aspect-ratio:3/4` from note 4 gives each frame a definite height, and
      :209's `.wa-people__frames img{height:100%}` is a descendant selector so
      it keeps matching untouched, but the `.elementor-widget-image` wrapper
      Elementor inserts between them does not stretch to that height: a
      container is column flex, so a widget wrapper takes its parent's WIDTH
      for free and never its HEIGHT. One selector covers all three frames and
      it is grouped with this page's two other instances in one bridge.css
      rule. The ORDER of the two repairs on this container matters and both
      were measured separately: the restated `aspect-ratio` from note 4 is what
      gives the frame a definite height at all, and only then does the
      wrapper's `height:100%` have anything to resolve against.

   7. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never a heading()
      widget. No `heading()` import above. The id travels on the <h2> itself,
      so the section's aria-labelledby="people-title" resolves to the heading
      element. */

const HEADLINE = 'Meet the people behind Empower Mississippi.';

const LIST = `<ul class="wa-people__list">
        <li>Staff headshots &amp; bios</li>
        <li>Board headshots</li>
        <li>Fellow headshots</li>
      </ul>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'wa-people',
      content_width: 'full',
      _attributes: 'aria-labelledby|people-title',
    },
    [
      container(
        {
          cssClass: 'wa-people__grid em-container',
          content_width: 'full',
          _attributes: 'data-reveal-group|',
        },
        [
          container({ cssClass: 'wa-people__copy wa-mark', content_width: 'full' }, [
            text({
              markup: `<h2 id="people-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            text({ markup: LIST, _attributes: 'data-reveal|rise' }),
            link({
              label: 'Team, Board &amp; Fellows',
              href: '/about/team',
              cssClass: 'em-btn em-btn--outline em-btn--md',
              _attributes: 'data-reveal|rise',
            }),
          ]),
          container({ cssClass: 'wa-people__frames', content_width: 'full' }, [
            container({ content_width: 'full', _attributes: 'data-reveal|clip' }, [
              image({ ...photo('young-man-portrait-bw'), _attributes: 'aria-hidden|true' }),
            ]),
            container({ content_width: 'full', _attributes: 'data-reveal|clip' }, [
              image({ ...photo('girl-writing-bw'), _attributes: 'aria-hidden|true' }),
            ]),
            container({ content_width: 'full', _attributes: 'data-reveal|clip' }, [
              image({ ...photo('student-library'), _attributes: 'aria-hidden|true' }),
            ]),
          ]),
        ],
      ),
    ],
  );
}
