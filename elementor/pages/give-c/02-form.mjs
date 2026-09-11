import { container, text } from '../../factory.mjs';

/* THE FORM THAT TAKES THE MONEY.

   Source of truth for the frame: src/give-c/sections/02-form.html. Source of
   truth for the form: the install, form 4, unchanged.

   1. WHY THIS SECTION EXISTS AT ALL, and why it arrived after the rest of the
      page. give-c was built and signed off as the CHOICE: hero and gift panel
      on one screen, tiles carrying the donor's two answers into Empower's form
      in the query string. That was correct on 2026-08-12, when the form was
      understood to be somewhere the tiles could hand off TO.

      It is not somewhere else. The converted /donate/ IS this page, and form 4
      lives on the old Beaver page now sitting at /donate-old/. So from the
      slug rename until this section, /donate/ was the donate route in the nav,
      in the header button and at the end of every tile, and nobody arriving on
      it could give anything. The tiles pointed at the page they were already
      on.

   2. THE SHORTCODE IS THE ENTIRE CONTENT OF ITS WIDGET, alone on its own line
      and wrapped in nothing, and it is a text() rather than an html() for the
      reason contact/02-form.mjs sets out at length: Elementor's
      parse_text_editor() runs shortcode_unautop() before do_shortcode(), and
      an html() widget echoes its markup raw and would print the shortcode as
      literal text on the page.

      `ajax="true"` matches what /donate-old/ does today, so a donor's
      experience of submitting does not change with the route. title and
      description are false because this section's own <h2> already says what
      it is.

   3. THE STATIC FILE'S SLOT IS DROPPED HERE, exactly the way contact drops its
      stand-in <form>. dist/give-c.html carries a dashed marker describing what
      belongs in this space, because a hand-off file cannot run a shortcode and
      must never draw a payment surface with nothing behind it. That marker is
      a review device; this is the real thing, so the marker does not ship.

   4. NO STYLING OF THE CARD ROW, and this is not an omission. Field 11 is
      `stripe_creditcard` and its contents are an iframe served by Stripe: this
      build cannot reach inside it and should not try. bridge.css's `.em-gform`
      block dresses the fields around it, which is the same treatment contact,
      newsletter and ambassador already get, and the row itself will not match.
      That was recorded as a known cost when the form was first read on
      2026-08-12.

      `em-gform` GOES ON THE SECTION HERE, not on the widget as contact does.
      Every bridge selector reads `.em-gform .gform_wrapper ...`, so an ancestor
      serves identically, and the section is an element
      src/give-c/sections/02-form.html also has. contact is in EXCLUDED_PAGES
      and never measured; give-c is registered, and a build class that exists
      only on the live side reads to layoutInvariants() as an element the
      conversion invented.

   5. THE HEADING IS "Complete your gift", not "Donate". The panel above has
      already asked, and the roadmap's two Donate Today buttons are spent: the
      hero panel takes the orange one and the closing plate takes the inverse.
      A third button-shaped instruction here would be a third ask on a page
      whose whole argument is that giving takes fewer clicks than it used to. */

const FORM_SHORTCODE = '[gravityform id="4" title="false" description="false" ajax="true"]';

/* The gift panel's own heading, kept when the panel went: Empower signed off on
   these three words on 2026-08-12 and the thing they name has not changed. */
const CARD_TITLE = 'Make your gift';

/* A legal statement reproduced verbatim from the roadmap, not marketing copy.
   It lived in the gift panel until 2026-09-11 and moved into the card with it,
   rather than being deleted along with the panel that happened to hold it. */
const LEGAL = 'Empower Mississippi Foundation is a 501(c)(3) nonprofit organization. Contributions are '
  + 'tax-deductible to the fullest extent allowed by law.';

export function section() {
  return container(
    { tag: 'section', cssClass: 'gvc-form em-gform', content_width: 'full', _element_id: 'donate-form' },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        /* THE CARD IS A REAL CONTAINER, not a class on a widget wrapper. It
           carries the negative margin that lifts it into the navy band, plus a
           background, a radius and a shadow, so it has to be the element the
           browser lays out: a class on a widget wrapper would move the wrapper
           and leave the form where it was. */
        container({ cssClass: 'gvc-form__card', content_width: 'full' }, [
          text({ markup: `<h2 class="gvc-form__title" id="form-title">${CARD_TITLE}</h2>` }),
          text({ markup: FORM_SHORTCODE }),
          text({ markup: `<p class="gvc-form__legal">${LEGAL}</p>` }),
        ]),
      ]),
    ],
  );
}
