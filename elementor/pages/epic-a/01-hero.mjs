import { container, text, html, image, link } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/epic-a.html, the <section class="epa-hero"> block
   (lines 174-212). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. `.em-container` AND `.epa-hero__inner` ARE ONE DIV, not two nested ones.
      Source: `<div class="em-container epa-hero__inner">`, a single element
      carrying both classes in that order. css/epic-a.css:28-33 makes it a
      two-column CSS grid whose tracks are placed by `grid-column` on the
      children, so all three children have to be its REAL children.

   2. CONTAINERS ARE 'full' THROUGHOUT, the reason every prior section module
      records: a boxed container inserts div.e-con-inner between itself and its
      children, which collapses the grid the moment it stops seeing its real
      children directly.

   3. THE HEADING IS ONE text() WIDGET CARRYING THE WHOLE <h1>, three <span>
      included, never a heading() widget. No heading() import above. This is
      also what makes css/epic-a.css:284-285's
      `.epa-hero__line:nth-child(2)` and `(3)` cost nothing: the three spans are
      real siblings inside one authored string, so nth-child counts what the
      design meant it to count. Built as three widgets each span would be the
      only child of its own wrapper, `nth-child(2)` and `(3)` would never match,
      and the two staggered animation delays would go inert SILENTLY.

      The id travels on the <h1> itself, so the section's
      aria-labelledby="epic-title" resolves to the heading element rather than
      to a div that merely contains it.

   4. THE `<nav class="epa-hero__areas">` IS A CONTAINER HOLDING ONE html()
      BLOB, NOT one blob for the whole <nav>, and this is a deliberate
      departure from what task-14-brief.md section 5 and pricing-epic-a.md
      section 5 both specify. The reason is a grid placement neither weighs.

      css/epic-a.css:35 is `.epa-hero__areas{grid-column:1 / -1}` and :90 is
      `.epa-hero__areas{width:100%;margin-top:clamp(40px,6vw,80px)}`. The <nav>
      is a GRID ITEM of `.epa-hero__inner`, and it is the only child of that
      grid that spans both columns. Authored inside one html() widget the grid
      item would be the widget WRAPPER, which carries no class: `grid-column:
      1 / -1` would land on the <nav> inside the wrapper, where it means
      nothing, and auto-placement would drop the wrapper into column 1 of row 2
      instead of spanning. The ruled row of areas would render at the width of
      the headline column rather than the width of the hero.

      It would also be very nearly INVISIBLE. layoutInvariants() compares
      absolute x and not width; the <nav> and the <ul> paint no background, so
      neither enters the painted set; the three <li> carry no class at all, so
      nothing about them is keyed. Only a main-height change from the row
      re-wrapping would show, and at 1440 three `flex:1 1 220px` items fit on
      one line either way.

      Everything the blob was priced to buy is kept by this form. The whole
      `<ul>` and its three `<li>` are still ONE authored string, so
      css/epic-a.css:96 (`.epa-hero__arealist li{flex:1 1 220px;border-bottom}`)
      and :341 (the same selector inside `@media (max-width:720px)`), both of
      which address `li` BY TAG, keep matching real `<li>` elements. Built as
      containers those two would go inert SILENTLY and the ruled row would lose
      its flex basis and its hairlines. `.epa-hero__arealist a::after` keeps its
      subject for the same reason.

      No cssClass is passed to html(): the real class sits on the `<ul>` tag in
      the markup string, and css/epic-a.css has no child-combinator rule between
      `.epa-hero__areas` and `.epa-hero__arealist`, so the widget wrapper
      Elementor inserts between them breaks nothing that expected a particular
      depth. Checked before choosing.

   5. `.epa-hero__actions` IS A CONTAINER holding a link() and an html(), the
      same shape team-a/01-hero.mjs uses for `.ta-hero__actions`.

      The primary CTA is a link() so it stays retargetable through Elementor's
      own panel, which is what every primary `.em-btn` in this build is. The
      aside is an html() blob carrying its real <a>, because link() would put
      `.epa-hero__aside` on the widget WRAPPER and hand the anchor Elementor's
      own `.elementor-button` chrome, which the existing
      `.elementor .em-btn a.elementor-button{all:unset}` group does not reach
      (that group is named to `.em-btn`, and this anchor is not one).

      THE COVERAGE COST, recorded as a cost rather than as a neutral
      restructure: `controlBoxes()` skips any anchor inside
      `.elementor-widget-button` by design, so the box key
      `a|Dive Into the Research` exists on the static side and not on the live
      one. No census key is lost here, because the wrapping element is a <div>
      and census() keys only h1-h5, p and blockquote. 03-research.mjs records
      the other, larger instance on this page.

      Shape C does NOT arise here and that is measured rather than assumed:
      css/epic-a.css:74 declares `align-items:center` on this row, which
      prevents the stretch above 420px, and :345 declares
      `flex-direction:column;align-items:stretch` at and below 420px, which is
      what Elementor gives by default anyway. Repairing it would be repairing a
      correct layout. What the row DOES need is its direction back; see
      bridge.css's `.epa-hero__actions` block and its `@media (max-width:420px)`
      counterpart, which are written as one pair for the reason recorded there.

   6. `.epa-hero__mark` IS A CONTAINER, NOT AN html() BLOB, for the same grid
      reason as note 4: css/epic-a.css:41-48 places it with `grid-column:2` and
      `justify-self:end`, and :324-328 re-places it with `order:-1` inside
      `@media (max-width:900px)`. All three are grid-item properties and all
      three need the class to be ON the grid item.

      `aria-hidden="true"` is on the container, matching source, and the plate
      is decoration next to a heading that already names the place.

   7. THIS PHOTOGRAPH NEEDS NO WRAPPER REPAIR. css/epic-a.css:49 is
      `.epa-hero__mark img{display:block;width:100%;height:auto}`, a DESCENDANT
      selector putting no ratio anywhere, so it keeps matching through
      Elementor's wrapper and never asks an ancestor for a height. The plate's
      own `width:clamp(200px,22vw,320px)` sits on the container, which keeps it.
      Do not widen 03-research.mjs's `.epa-area__photo` repair to reach it.

   8. THE LCP ELEMENT LOSES ITS PRIORITY HINTS, recorded rather than repaired.
      The static build gives this <img> `loading="eager"` and
      `fetchpriority="high"`; Elementor's image widget emits neither and has no
      control for either. Standing open item across the phase; no filter here.

   9. ALT TEXT NEEDS NOTHING ON THIS IMAGE AND MUST NOT BE GIVEN ANY. It was
      imported with empty alt deliberately; media.mjs's header records why. */

/* THE SINGLE SPACES BETWEEN THE THREE SPANS ARE LOAD-BEARING and are not
   formatting. dist/epic-a.html:177-181 sets each span on its own source line,
   so the <h1>'s textContent carries whitespace between the three sentences,
   and census() keys on `tagName|textContent` normalised and sliced to 40
   characters. Built without them the live key reads
   "Better Data.Better Ideas.Better Solutions" against the static
   "Better Data. Better Ideas. Better Soluti", the h1 drops out of the shared
   set, and the page's largest heading silently stops being compared at all.
   Measured: shared was 29 of 31 before this, 30 of 31 after, and the missing
   key was exactly this one. A space rather than the source's newline because
   the string goes through Elementor's text-editor widget, where wpautop reads
   line breaks; the normalised text is identical either way. */
const HEADLINE = '<span class="epa-hero__line">Better Data.</span> '
  + '<span class="epa-hero__line">Better Ideas.</span> '
  + '<span class="epa-hero__line epa-hero__line--accent">Better Solutions.</span>';

/* The curly apostrophe below is the source's, reproduced byte for byte rather
   than normalised: census() keys on the element's own text, so a straight quote
   here would take the paragraph out of the shared set. */
const LEAD = 'The Empower Policy &amp; Innovation Center (EPIC) is the research arm of Empower Mississippi. '
  + 'EPIC identifies Mississippi’s biggest challenges and produces the research to develop innovative '
  + 'public policy solutions.';

/* Copied from dist/epic-a.html:196, attribute order included. */
const ASIDE = '<a class="epa-hero__aside" href="https://empowerms.org/introducing-epic-a-new-investment-in-solution-development/">'
  + 'Why Empower Mississippi created EPIC</a>';

/* Copied from dist/epic-a.html:205-209. The three <li> are real tags inside one
   string, per note 4. */
const AREALIST = '<ul class="epa-hero__arealist">'
  + '<li><a href="#area-education">Quality Education</a></li>'
  + '<li><a href="#area-work">Meaningful Work</a></li>'
  + '<li><a href="#area-safety">Public Safety</a></li>'
  + '</ul>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'epa-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|epic-title',
    },
    [
      container({ cssClass: 'em-container epa-hero__inner', content_width: 'full' }, [
        container({ cssClass: 'epa-hero__say', content_width: 'full' }, [
          text({
            markup: `<h1 class="epa-hero__title" id="epic-title">${HEADLINE}</h1>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="epa-hero__lead">${LEAD}</p>`,
            _attributes: 'data-reveal|rise',
          }),
          container(
            { cssClass: 'epa-hero__actions', content_width: 'full', _attributes: 'data-reveal|rise' },
            [
              link({
                label: 'Dive Into the Research',
                href: '#research',
                cssClass: 'em-btn em-btn--primary em-btn--lg',
              }),
              html({ markup: ASIDE }),
            ],
          ),
        ]),
        container(
          { cssClass: 'epa-hero__mark', content_width: 'full', _attributes: 'aria-hidden|true' },
          [image({ ...photo('epic-logo') })],
        ),
        container(
          {
            tag: 'nav',
            cssClass: 'epa-hero__areas',
            content_width: 'full',
            _attributes: 'aria-label|Research areas',
          },
          [html({ markup: AREALIST })],
        ),
      ]),
    ],
  );
}
