import { container, text, html, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/mail-a.html, the <section class="mla-receive"> block
   (lines 257-291). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE WHOLE <ul> IS ONE html() WIDGET, and it is exception 1 of the four
      the conversion spec names by name
      (docs/superpowers/specs/2026-08-12-elementor-conversion-design.md,
      "Native-first, and the four exceptions": "mail-a/03-receive. The four
      ticks are inline SVG animated by the page's CSS ... Inline SVG in an
      HTML widget"). Three separate things make it required rather than
      merely convenient, and each one costs a repair if the list is built as
      containers instead:

      a. css/mail-a.css:125 is `.mla-item:first-child{border-top:1px solid
         var(--blue-200)}` over four `<li class="mla-item">`, each of which
         also carries `border-bottom` from :120. Built as containers every row
         becomes its own wrapper's only child, so every row is
         `:first-child`, every row takes the top border, and the list draws a
         doubled rule between every pair. This is the recipe's LOUD
         over-matching failure, and it is the page's only hit on grep 2.

      b. `ul` and `li` are both outside Elementor's allowed container tags, so
         built as containers they render as `div` and every rule addressing
         them by tag goes inert. That is the category that cost who-we-are-a
         six rules.

      c. css/mail-a.css:150-157 animates `.mla-item__tick path` inside a
         `@media (prefers-reduced-motion: no-preference)` and
         `@supports (animation-timeline: view())` pair, which needs the
         <svg> and its <path> to be real DOM descendants of the <li>. No icon
         widget and no <img> can produce that.

      Each <li> holds one inline <svg> and a text node, so nothing inside it
      needs to be a widget and no editability is lost that Elementor could
      have given.

      `data-reveal-group` on the <ul> and `data-reveal="rise"` on each <li>
      are authored inside the same string, so js/reveal.js sees exactly the
      DOM the static build has, one wrapper further down.

   2. `.mla-receive__back` IS ALSO AN html() WIDGET, AND THIS DEPARTS FROM THE
      BRIEF, which specified a container holding a link() under recipe
      section 7. Measured against the cascade before choosing, and the brief's
      shape costs a repair that this one does not:

      Source is `<p class="mla-receive__back"><a href="#signup">Back to the
      sign-up form</a></p>`, an anchor with NO CLASS of its own, styled only
      by css/mail-a.css:132-137's `.mla-receive__back a` at 0,1,1. Built as a
      link(), the anchor becomes `<a class="elementor-button ...">`, and the
      kit (wp-content/uploads/elementor/css/post-20547.css) styles
      `.elementor-kit-20547 .elementor-button` at 0,2,0 with a background
      colour, white text, `border-radius:6px`, `padding:17px 40px`, Inter
      15px and `text-transform:None`. 0,2,0 beats 0,1,1, so a plain text link
      would render as a filled pill.

      bridge.css already neutralises that chrome, with `all:unset`, but only
      for `.elementor .em-skip a.elementor-button` and
      `.elementor .em-btn a.elementor-button`. Checked every link() in the
      build before concluding: all fourteen carry either `em-btn ...` or
      `em-skip`, so those two scopes are exhaustive today and this would be
      the first CLASSLESS link() anywhere in the conversion.

      So the container-plus-link() shape would have cost a third bridge block
      on a page priced at one repair. The html() shape costs nothing, and it
      is the same shape three earlier pages already chose for the same kind of
      element: `.wa-jump` (who-we-are-a), `.ta-jump` (team-a) and `.sb-more`
      (solutions-b) are each a plain in-page anchor built as an html() widget
      carrying a real <a>.

      IT ALSO KEEPS TWO COVERAGE KEYS THE BRIEF EXPECTED TO LOSE. Recipe
      section 7's cost is that `p|Back to the sign-up form` stops being
      compared by census(); a second, unrecorded cost would have been
      `a|Back to the sign-up form` leaving the box sweep, because
      controlBoxes() skips any anchor inside `.elementor-widget-button` by
      design. As an html() blob the <p> and the <a> are both real, so both
      keys stay in the comparison. That matters here specifically: this is
      the tightest page in the build on census headroom, 13 elements of its
      own against who-we-are-a's 24.

      What it costs instead, stated so the trade is legible: the link stops
      being retargetable through Elementor's own panel, which is the thing
      link() buys. That is the same cost `.wa-jump`, `.ta-jump` and
      `.sb-more` already accepted, and this anchor is an in-page jump to
      `#signup` on the same page rather than a destination anybody will edit.

      Checked for the wrapper-descender defect that `.wa-jump`, `.ta-jump` and
      `.em-join__way` each paid a bridge rule for: it does not apply.
      `.mla-receive__back a` IS `display:inline-flex` (:133), the same
      declaration that caused it, but the anchor's parent here is a
      `<p>` inside the SAME authored string, not a flex container. The <p> is
      a block box on both sides, so the anchor is never a flex item on either
      side, the flex spec never blockifies it on either side, and there is
      nothing for the wrapper to change. Measured after deploy rather than
      left at that; the numbers are in this task's report.

   3. `.em-container` AND `.mla-receive__grid` ARE ONE DIV, matching source.
      css/mail-a.css:105-108 makes it a two-column grid whose tracks are
      `.mla-receive__list-wrap` and `.mla-receive__figure`.

   4. <figure> BECOMES A DIV CONTAINER for `.mla-receive__figure`, no
      <figcaption> in source. Its <img> carries `aspect-ratio:3/4` with
      `height:auto` (css/mail-a.css:140-144), the same untested shape
      02-about.mjs's note 4 records; measured, not assumed.

   5. ALT TEXT. Attachment 20580 (children-running-parent) carries EMPTY alt
      where the static build gives this <img> a real sentence, so the
      converted page emits no alt for a meaningful photograph. Paolo's
      decision on that attachment, recorded in media.mjs, not fixed here. No
      aria-hidden is set: the static build does not set one, and hiding a
      meaningful photograph would be a second wrong answer rather than a
      repair for the first. */

const HEADLINE = 'What You’ll Receive';

const ITEMS = [
  'Monthly news and updates',
  'Legislative highlights during the session',
  'New articles, research, and podcasts',
  'Opportunities to get involved',
];

/* One <svg> per row, identical in source. `pathLength="1"` is what makes
   css/mail-a.css:159-162's keyframes work in ratio rather than in user units,
   so it is not decoration and is copied exactly. */
const TICK = `<svg class="mla-item__tick" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="M4 12.5 L9.5 18 L20 6.5" pathLength="1"/>
          </svg>`;

const LIST = `<ul class="mla-receive__list" data-reveal-group>
${ITEMS.map((label) => `        <li class="mla-item" data-reveal="rise">
          ${TICK}
          ${label}
        </li>`).join('\n')}
      </ul>`;

const BACK = '<p class="mla-receive__back"><a href="#signup">Back to the sign-up form</a></p>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'mla-receive',
      content_width: 'full',
      _attributes: 'aria-labelledby|receive-title',
    },
    [
      container({ cssClass: 'em-container mla-receive__grid', content_width: 'full' }, [
        container({ cssClass: 'mla-receive__list-wrap', content_width: 'full' }, [
          text({
            markup: `<h2 class="mla-receive__title" id="receive-title">${HEADLINE}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          html({ markup: LIST }),
          html({ markup: BACK }),
        ]),
        container(
          { cssClass: 'mla-receive__figure', content_width: 'full', _attributes: 'data-reveal|clip' },
          [image({ ...photo('children-running-parent') })],
        ),
      ]),
    ],
  );
}
