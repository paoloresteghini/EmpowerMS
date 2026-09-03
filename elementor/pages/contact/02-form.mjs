import { container, text } from '../../factory.mjs';

/* THE ONE PAGE IN THIS BUILD THAT CARRIES A LIVE FORM.

   Source of truth for everything except the form itself: dist/contact.html,
   the <section class="ct-body"> block.

   1. THE FORM IS GRAVITY FORM 3 AND IT IS NOT REBUILT. It held 3,116 entries
      when this was written, most recent 2026-07-28, notifies the site admin and
      renders its own confirmation. Every other form-shaped page in this build
      is markup wired to nothing, which is safe because none of them replaces a
      working route; /contact is in the footer of all fourteen converted pages
      and this IS the working route. elementor/redirects.mjs states the cost of
      getting this wrong in its own words, about the ambassador form: pointing a
      live signup at a form-shaped design "would end ambassador signups and
      report success while doing it".

      So dist/contact.html's <form> is a review stand-in and never ships. This
      module drops it and puts the real shortcode in its place. test.mjs holds
      the stand-in to the live form field for field so the two cannot drift.

   2. THE SHORTCODE IS THE ENTIRE CONTENT OF ITS WIDGET, alone on its own line
      and wrapped in nothing. That is what lets Elementor's parse_text_editor()
      run shortcode_unautop() before do_shortcode() expands it; the archive head
      and inc/post-single.php's three shortcodes are the same arrangement, and
      it is why this is a text() rather than an html(). An html() widget echoes
      its markup raw and would print the shortcode as literal text on the page.

      `ajax="true"` matches what the page does today: the live markup carries
      gform_ajax_frame_3, so the form already submits without a reload and this
      preserves that rather than changing it. title and description are false
      because the page's own <h1> and lead already say what this is; leaving
      them on would print "Contact" and an empty description a second time.

   3. GRAVITY FORMS KEEPS ITS OWN STYLESHEET. It is tempting to strip it and
      dress the markup entirely from this build, and it would be a mistake: the
      form carries a honeypot field (gfield--type-honeypot) that GF's own CSS is
      what hides, plus validation and error states this build has no markup for.
      Disabling it would expose a "URL" input to every visitor and to every bot
      the honeypot exists to catch. bridge.css layers on top instead.

   4. NO STAND-IN NOTE HERE. dist/contact.html carries a visible note saying its
      form collects nothing; that sentence is true of the review copy and false
      of this one, so it is deliberately absent rather than carried over. */

const FORM_SHORTCODE = '[gravityform id="3" title="false" description="false" ajax="true"]';

export function section() {
  return container(
    { tag: 'section', cssClass: 'ct-body', content_width: 'full' },
    [
      container({ cssClass: 'em-container ct-body__grid', content_width: 'full' }, [
        container({ cssClass: 'ct-form', content_width: 'full' }, [
          text({ markup: FORM_SHORTCODE, cssClass: 'em-gform' }),
        ]),
        container(
          { cssClass: 'ct-details', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: '<h2 class="ct-details__title">Empower Mississippi</h2>',
              _attributes: 'data-reveal|rise',
            }),
            /* The footer on this same page carries this address, and so do the
               Phase 2A plan and both test files. The page this replaces gives a
               different street; Paolo chose the footer's on 2026-09-02 so the
               page and its own footer agree. The superseded one is not repeated
               here, not even in a comment. */
            text({
              markup: '<address class="ct-details__address">741 Avignon Dr., Suite C<br>Ridgeland, MS 39157</address>',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
      ]),
    ],
  );
}
