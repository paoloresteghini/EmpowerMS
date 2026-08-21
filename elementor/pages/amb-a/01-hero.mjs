import { container, text, html, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/amb-a.html, the <section class="aba-hero"> block
   (lines 176-191). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE HERO CALL TO ACTION IS ONE html() WIDGET CARRYING THE WHOLE <p>,
      which is Route A of the two the brief priced, and the reason is
      coverage and the layout instrument rather than only the bridge cost.

      Source is `<p class="aba-hero__act" data-reveal="rise"><a class="em-btn
      em-btn--secondary em-btn--lg" href="#join">...</a></p>`. Built this way
      the anchor reaches the page as a real <a> carrying its own three
      classes, never acquires `.elementor-button`, and stays an inline-level
      box inside a real <p>, so it shrink-wraps to its label exactly as the
      static build draws it.

      THE ALTERNATIVE WAS NOT MERELY MORE EXPENSIVE, IT WAS RED. A container
      with html_tag 'p' holding a link() puts the class on the widget WRAPPER
      (elementor/factory.mjs, WIDGET_CSS_CLASS_KEY), so the key
      `em-btn.em-btn--lg.em-btn--secondary` would name a <div> live and an <a>
      static. layoutInvariants() in fidelity-browser.mjs compares absolute x
      for every keyed element, and the whole predicted defect is that the
      wrapper is a full-width flex item where the anchor shrink-wraps. That is
      the capitol-a finding the instrument's own comment records (live x 144
      against static 619.94 at 1440). So Route B costs a bridge rule the
      SUITE demands, not one measurement discovers.

      IT ALSO KEEPS TWO COMPARISON KEYS. Recipe section 7's cost is that
      `p|Join Our Ambassador Network` leaves census(); a second, recorded on
      mail-a, is that `a|Join Our Ambassador Network` leaves the box sweep,
      because controlBoxes() skips any anchor inside
      `.elementor-widget-button` by design. Both stay here.

      What it costs, stated so the trade is legible: the link stops being
      retargetable from Elementor's own panel. That is the same cost
      `.mla-receive__back` (mail-a), `.wa-jump` (who-we-are-a), `.ta-jump`
      (team-a) and `.sb-more` (solutions-b) already accepted, and this anchor
      is an in-page jump to #join on the same page.

      THIS IS THE BUILD'S FIRST CONVERSION USE OF `.em-btn--secondary`. Every
      converted .em-btn so far is --primary, --outline, --inverse or
      --inverse-outline, and a first use is exactly what cost mail-a its one
      repair. Measured after deploy at both widths, background and :hover
      background included; the numbers are in this task's report.

   2. `data-reveal` IS AUTHORED INSIDE THE BLOB, not passed as _attributes.
      The source puts it on the <p> itself, and inside an authored string the
      real <p> carries it, which is one wrapper closer to the static DOM than
      the wrapper-level attribute a text() widget has to use. Same choice
      mail-a/03-receive.mjs makes for its own list blob.

   3. `.em-container` AND `.aba-hero__grid` ARE ONE DIV, not two nested ones.
      Source: `<div class="em-container aba-hero__grid">`, a single element
      carrying both classes in that order. css/amb-a.css:16-19 makes it a
      two-column CSS grid whose tracks are `.aba-hero__say` and
      `.aba-hero__figure`, so both have to be its real children: containers,
      not widgets.

   4. CONTAINERS ARE 'full' THROUGHOUT, the reason every prior section module
      records: a boxed container inserts div.e-con-inner between itself and
      its children, which collapses the grid the moment it stops seeing its
      real children directly.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a heading()
      widget. No heading() import above. The id travels on the <h1> itself, so
      the section's aria-labelledby="amb-title" resolves to the heading
      element rather than to a div that merely contains it.

   6. <figure> BECOMES A DIV CONTAINER for `.aba-hero__figure`. No
      <figcaption> in source, so a div loses no semantics, the same
      substitution every prior page in this build makes.

   7. THIS PHOTOGRAPH NEEDS NO WRAPPER REPAIR AND THE MOSAIC'S FOUR DO, which
      is the distinction the brief warns not to blur. css/amb-a.css:40-44 puts
      `aspect-ratio:4/5` on the <img> itself with `height:auto`, so it sizes
      from its own width and never asks an ancestor for a height. The mosaic
      cells put the ratio on the CONTAINER and ask the <img> for
      `height:100%`, which is the category-4 defect. Do not widen the mosaic's
      repair to reach this figure.

   8. THE LCP ELEMENT LOSES ITS PRIORITY HINTS, recorded rather than repaired.
      The static build gives this <img> `loading="eager"` and
      `fetchpriority="high"`; Elementor's image widget emits neither and has
      no control for either. That is a standing open item across the phase
      (measure before fixing) and no filter is written here.

   9. ALT TEXT IS AN OPEN EDITORIAL ITEM ON THIS IMAGE. media.mjs records it
      and points at docs/elementor/phase2b/2026-08-18-alt-text-decisions.md.
      Nothing is written to the install. */

const HEADLINE = 'Be Part of the Solution';
/* The curly apostrophes below are the source's, reproduced byte for byte
   rather than normalised: census() keys on the element's own text, so a
   straight quote here would take the paragraph out of the shared set. */
const TURN = 'You’ve seen the challenges. You’ve seen the potential. Now you can be part of the solution.';
const LEAD = 'Whether you’ve experienced these issues firsthand or simply care about Mississippi’s future, '
  + 'your voice matters. Join a community of Mississippians working together to advance practical solutions '
  + 'that expand opportunity through better education, meaningful work, and safer communities.';

/* Copied from dist/amb-a.html:182, attribute order included. */
const ACT = '<p class="aba-hero__act" data-reveal="rise">'
  + '<a class="em-btn em-btn--secondary em-btn--lg" href="#join">Join Our Ambassador Network</a>'
  + '</p>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'aba-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|amb-title',
    },
    [
      container({ cssClass: 'em-container aba-hero__grid', content_width: 'full' }, [
        container({ cssClass: 'aba-hero__say', content_width: 'full' }, [
          text({ markup: `<h1 class="aba-hero__title" id="amb-title">${HEADLINE}</h1>` }),
          text({ markup: `<p class="aba-hero__turn">${TURN}</p>`, _attributes: 'data-reveal|rise' }),
          text({ markup: `<p class="aba-hero__lead">${LEAD}</p>`, _attributes: 'data-reveal|rise' }),
          html({ markup: ACT }),
        ]),
        container(
          { cssClass: 'aba-hero__figure', content_width: 'full', _attributes: 'data-reveal|clip' },
          [image({ ...photo('father-children-field') })],
        ),
      ]),
    ],
  );
}
