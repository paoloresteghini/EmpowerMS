import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/mail-a.html, the <section class="mla-hero"> block
   (lines 178-220). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE WHOLE <form> IS ONE html() WIDGET. Paolo's ruling, 2026-08-18, and
      it is also the only thing Elementor can do. The container html_tag
      control offers no `form`, no `fieldset` and no `legend` (settled at
      elementor/pages/final/06-joinus.mjs:12), so a container tree cannot
      produce a <form> at all; the ruling settles the separate question of
      whether it becomes an Elementor Pro Form widget instead, and the answer
      is NOT YET.

      BLOB NOW, DECIDE LATER. Every class, `for`/`id` pair, `autocomplete`
      token, `aria-describedby`, `required` and `novalidate` reaches the page
      exactly as dist/mail-a.html has them, and `action="#signup"` stands.
      THE FORM SUBMITS NOWHERE, and that is accepted rather than overlooked:
      where submissions go is separate work with Empower alongside the donate
      page's Gravity Forms and Stripe setup, and the accepted cost is that
      this page ships twice. Nothing here is wired up and nothing here should
      be improved on.

      What the blob buys structurally, beyond being the only option: five of
      this page's seven Elementor-unrenderable tags are inside it (`form`,
      `label` x4, `input` x4, `button`, `strong` elsewhere), and
      `components/components.css:100`'s `.em-field{display:flex;
      flex-direction:column}` declares a flex direction that Elementor's
      `.e-con-full.e-flex` would otherwise fight if `.em-field` were a
      container. Inside one authored string neither can happen.

   2. `.mla-signup` IS A CONTAINER AND CARRIES THE PAGE'S ONE IN-PAGE ANCHOR,
      through `_element_id`, NEVER `_attributes: 'id|signup'`. Elementor's
      custom-attributes control silently refuses an `id` pair while accepting
      every other pair in the same string, which is what hid this on
      solutions-b; `_element_id` on a container works
      (elementor/pages/solutions-b/02-track.mjs:218,
      elementor/pages/who-we-are-a/03-story.mjs:122). Verified after deploy by
      fetching the live page and grepping for the id, not by the deploy's exit
      code.

      THE ID MUST LAND ON `.mla-signup` AND NOT ON `.mla-hero`, because the
      form's own `action="#signup"` points at it as well as the receive
      section's "Back to the sign-up form" link, and because
      css/mail-a.css:46's `.mla-signup{scroll-margin-top:110px}` is what stops
      the sticky header covering the form when either one is followed.

   3. `.em-container` AND `.mla-hero__grid` ARE ONE DIV, not two nested ones.
      Source: `<div class="em-container mla-hero__grid">`, a single element
      carrying both classes, in that order. Built as one container() call with
      a space-joined cssClass. css/mail-a.css:19-24 makes it a two-column CSS
      grid whose tracks are `.mla-hero__say` and `.mla-signup`, so both have
      to be its real children: containers, not widgets.

   4. CONTAINERS ARE 'full' THROUGHOUT, the same reason every prior section
      module records: a boxed container inserts div.e-con-inner between itself
      and its children, which would collapse `.mla-hero__grid`'s own grid the
      moment it stopped seeing its real children directly.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a heading()
      widget. No `heading()` import above. The id travels on the <h1> itself,
      so the section's aria-labelledby="mail-title" resolves to the heading
      element rather than to a div that merely contains it.

   6. `data-reveal` SITS WHERE THE SOURCE PUTS IT, which here is on the two
      paragraphs individually and on nothing else in this section. There is no
      `data-reveal-group` and no `data-reveal-entrance` in this section, and
      none is invented: the hero's h1 and the whole form plate ship visible,
      which is the point of a page whose one job is above the fold.

   7. `<strong>five minutes or less</strong>` stays inside the paragraph's own
      markup. css/mail-a.css:41 is `.mla-hero__sub strong{color:var(
      --text-strong)}`, a descendant selector on a real element, so it needs
      the <strong> to be a real DOM descendant of the paragraph, which is what
      carrying it in the text() markup gives. */

const HEADLINE = 'Stay Connected';
const LEAD = 'Get the latest from Empower Mississippi delivered straight to your inbox.';
/* The curly apostrophe is the source's, reproduced byte for byte rather than
   normalised: census() keys on the element's own text, so a straight quote
   here would take this paragraph out of the shared set entirely. */
const SUB = 'From monthly updates to important news from the Capitol, we’ll help you stay informed in '
  + '<strong>five minutes or less</strong>.';

/* THE LIVE FORM, NOT A COPY OF ONE, since 2026-09-02.

   GRAVITY FORM 2, "Become an Advocate", the live signup behind /join/. It held
   836 entries when this was written, the third busiest form on the install, and
   it notifies Joanna and Kienna. Chosen over form 43 ("Stay Informed", 24
   entries) on 2026-09-02 because it is the route people actually use.

   IT COLLECTS A NAME AND AN EMAIL AND NOTHING ELSE, so the County field this
   page was approved with is gone. The form never collected it, and a field that
   posts nowhere is worse than no field. The button says "Submit" because the
   live form does; the approved design said "Join Our Email List", and changing
   it is one edit in Gravity Forms and Empower's to make.

   The page this replaces went on collecting nothing while the legacy page kept
   the working route, which is the arrangement elementor/redirects.mjs warns
   about in its own words: pointing a live signup at a form-shaped design "would
   end ambassador signups and report success while doing it". The design is not
   the thing that has to survive here; the submissions are.

   THE SHORTCODE IS THE ENTIRE CONTENT OF ITS WIDGET, alone and wrapped in
   nothing, which is what lets Elementor's parse_text_editor() run
   shortcode_unautop() before do_shortcode() expands it. An html() widget, which
   is what carried the hand-written form here before, echoes its markup raw and
   would print the shortcode as literal text on the page.

   `em-gform` IS THE STYLING HOOK AND IT IS SHARED. bridge.css block 77 dresses
   Gravity Forms' own markup to match this build's fields, and it is keyed on
   this class so contact, newsletter and ambassador are paid for once rather
   than three times. Gravity Forms keeps its own stylesheet either way: it is
   what hides the honeypot field and what carries the validation states this
   build has no markup for. */
const FORM_SHORTCODE = '[gravityform id="2" title="false" description="false" ajax="true"]';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'mla-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|mail-title',
    },
    [
      container({ cssClass: 'em-container mla-hero__grid', content_width: 'full' }, [
        container({ cssClass: 'mla-hero__say', content_width: 'full' }, [
          text({ markup: `<h1 class="mla-hero__title" id="mail-title">${HEADLINE}</h1>` }),
          text({
            markup: `<p class="mla-hero__lead">${LEAD}</p>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="mla-hero__sub">${SUB}</p>`,
            _attributes: 'data-reveal|rise',
          }),
        ]),
        container({ cssClass: 'mla-signup', content_width: 'full', _element_id: 'signup' }, [
          text({ markup: FORM_SHORTCODE, cssClass: 'em-gform' }),
        ]),
      ]),
    ],
  );
}
