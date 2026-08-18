import { container, text, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/mail-a.html, the <section class="mla-about"> block
   (lines 228-249). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. `.em-container` AND `.mla-about__grid` ARE ONE DIV, matching source
      (`<div class="em-container mla-about__grid">`). css/mail-a.css:71-74
      makes it a two-column grid whose tracks are `.mla-about__say` and
      `.mla-about__mock`, so both are containers rather than widgets.

   2. <figure> BECOMES A DIV CONTAINER for `.mla-about__mock`. No <figcaption>
      in source, so a div loses no semantics, the same substitution every
      prior page in this build already makes.

   3. THE THREE BODY PARAGRAPHS ARE text() WIDGETS AND THE SELECTOR THAT
      STYLES TWO OF THEM SURVIVES, which was checked rather than assumed.
      css/mail-a.css:87 is `.mla-about__say p:not(.mla-about__claim)`, a
      DESCENDANT selector with a negation, not a child combinator and not a
      structural pseudo-class, so Elementor's text-editor wrapper standing
      between `.mla-about__say` and each <p> changes nothing about whether it
      matches. The recipe's two greps both score this section zero, and this
      is the selector that would have been the near miss.

      The third paragraph carries no class in source (`<p data-reveal="rise">`)
      and is not given one here. Its styling comes entirely from that
      `:not()` selector, so adding a class would be inventing markup the
      build does not have.

   4. THE PHOTOGRAPH'S RATIO SITS ON THE <img>, NOT ON THIS CONTAINER, and
      that is the one thing on this page worth measuring rather than
      assuming. css/mail-a.css:96-101 is `.mla-about__mock img{display:block;
      width:100%;height:auto;aspect-ratio:4/5;object-fit:cover;...}`, a
      descendant selector, so it keeps matching through Elementor's
      `.elementor-widget-image` wrapper and border-radius and box-shadow ride
      along with it. What it does NOT settle is what height the WRAPPER takes:
      the wrapper is a flex item of this column container, and Task 11b
      measured Chromium taking such an item's flex base size from its
      max-content block size, with an aspect-ratio element's intrinsic block
      size resolving against its intrinsic INLINE size rather than its
      rendered width. That is what left capitol-a's triptych overflowing its
      own wrapper by 36.85px. Every converted page before this one puts the
      ratio on the CONTAINER, so this shape is untested in this build.
      Measured on the live page rather than predicted; the result is in this
      task's report.

   5. ALT TEXT IS AN OPEN EDITORIAL ITEM ON THIS IMAGE, not a clean pass.
      Attachment 20586 carries "Research report cover" where the static build
      asks for a sentence describing a campaign email. media.mjs records it
      and the reason nothing is written to the install. */

const HEADLINE = 'Stay Informed, Not Overwhelmed';
/* Curly apostrophes and the em dash in BODY_1 are the source's own copy,
   reproduced byte for byte. census() keys on each element's text, so
   normalising any of them would drop the paragraph out of the shared set. */
const CLAIM = 'Keeping up with what’s happening shouldn’t feel like another full-time job.';
const BODY_1 = 'Our emails bring you the highlights—clear, concise, and easy to read in just a few minutes.';
const BODY_2 = 'No clutter. No inbox overload. Just practical updates when they matter most.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'mla-about',
      content_width: 'full',
      _attributes: 'aria-labelledby|about-title',
    },
    [
      container({ cssClass: 'em-container mla-about__grid', content_width: 'full' }, [
        container({ cssClass: 'mla-about__say', content_width: 'full' }, [
          text({
            markup: `<h2 class="mla-about__title" id="about-title">${HEADLINE}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="mla-about__claim">${CLAIM}</p>`,
            _attributes: 'data-reveal|rise',
          }),
          text({ markup: `<p>${BODY_1}</p>`, _attributes: 'data-reveal|rise' }),
          text({ markup: `<p>${BODY_2}</p>`, _attributes: 'data-reveal|rise' }),
        ]),
        container(
          { cssClass: 'mla-about__mock', content_width: 'full', _attributes: 'data-reveal|clip' },
          [image({ ...photo('esa-email-mockup') })],
        ),
      ]),
    ],
  );
}
