import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/amb-a.html, the <section class="aba-join"> block
   (lines 270-333). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. THE WHOLE <form> IS ONE html() WIDGET. Paolo's standing ruling,
      2026-08-18, the same one mail-a shipped under, and it is also the only
      thing Elementor can do. The container html_tag control offers no `form`,
      no `fieldset` and no `legend` (settled at
      elementor/pages/final/06-joinus.mjs:12), so a container tree cannot
      produce a <form> at all; the ruling settles the separate question of
      whether it becomes an Elementor Pro Form widget instead, and the answer
      is NOT YET.

      BLOB NOW, DECIDE LATER. Every class, `for`/`id` pair, `autocomplete`
      token, `required`, `novalidate` and `action="#join"` reaches the page
      exactly as dist/amb-a.html has them. THE FORM SUBMITS NOWHERE, and that
      is accepted rather than overlooked: where submissions go is separate
      work with Empower alongside the donate page's Gravity Forms and Stripe
      setup, and the accepted cost is that this page ships twice. Nothing here
      is wired up and nothing here should be improved on.

      TWO OF THE SIX COST CATEGORIES GO TO ZERO BECAUSE OF THIS ONE DECISION,
      which is why it is a build decision and not a formality:

      a. Category 5, tags Elementor cannot render. The <fieldset> at
         dist/amb-a.html:302, the <legend> at :303 and all six <label>
         elements reach the page as written, because an authored string is not
         a container tree.
      b. Category 6, `display:flex` with no `flex-direction`.
         css/amb-a.css:158's `.aba-check{display:flex;align-items:center}` is
         this page's only such rule, and
         components/components.css:100's `.em-field` is the same case. Both
         are <div>s inside this blob, so neither is ever an Elementor
         container and `.e-con-full.e-flex{flex-direction:var(--flex-direction)}`
         cannot reach either one.

   2. THE SUBMIT BUTTON COSTS NOTHING, AND THAT IS INHERITANCE FROM mail-a
      RATHER THAN LUCK. Source ends the form with `<button class="em-btn
      em-btn--primary em-btn--lg" type="submit">`, which is mail-a's class set
      minus --block. bridge.css's block headed "mail-a: the build's FIRST
      native .em-btn--primary" already restates the background, the :hover and
      the 19px for `.elementor button.em-btn--primary`, so this page inherits
      all three and writes nothing.

      Its :focus needs no block of its own either, and the reason is worth
      carrying rather than re-deriving: the kit's state rule
      (`.elementor-kit-20547 button:hover, ...:focus`) is 0,2,1 and that base
      repair is 0,3,1. Specificity is compared before anything about states,
      so a base repair at higher specificity already governs every state the
      kit only reaches through that group. A state needs its own block only
      when the build itself declares that state.

      MEASURED ON THIS PAGE AFTER DEPLOY ANYWAY, at both widths and including
      the background colour, because colour is the property no instrument in
      this project compares on a control, which is exactly how mail-a shipped
      a green button that reported as a 3px height difference.

   3. THE FOUR `input.em-input`, THE FOUR CHECKBOXES AND THE `textarea` COST
      NOTHING, and this is read from the kit rather than assumed. The kit
      (wp-content/uploads/elementor/css/post-20547.css, cached at
      .snapshots/who-we-are-a/elementor/post-20547.css) has exactly two
      control selector groups plus @media restatements of font-size and
      padding at 1024 and 767: `button`, `input[type="button"]`,
      `input[type="submit"]`, `.elementor-button`, and the same list with
      `:hover,:focus`. It styles NO fields, so nothing competes with them.

   4. `.em-container` AND `.aba-join__grid` ARE ONE DIV, matching source
      (`<div class="em-container aba-join__grid">`). css/amb-a.css:126-129
      makes it a two-column grid whose tracks are `.aba-join__say` and the
      <form> itself, so the form's html() wrapper becomes the second track.

   5. THE SECTION ID GOES ON THE CONTAINER THROUGH `_element_id`, NEVER
      `_attributes: 'id|join'`. Elementor's custom-attributes control silently
      refuses an `id` pair while accepting every other pair in the same
      string, which is what hid this on solutions-b. It must land on
      `.aba-join` and nowhere else: the hero CTA's `href="#join"` and the
      form's own `action="#join"` both point at it, and css/amb-a.css:124's
      `scroll-margin-top:100px` is what stops the sticky header covering the
      form when either is followed. Verified after deploy by fetching the live
      page and grepping for the id, not by the deploy's exit code.

   6. `.aba-join__first` CARRIES `!important` ON FOUR PROPERTIES
      (css/amb-a.css:141-145), the second of this page's two such paragraphs.
      Nothing is done about it and nothing needs to be, for the reason
      02-who.mjs's note 6 gives; measured rather than assumed.

   7. THE TWO UNCLASSED PARAGRAPHS STAY UNCLASSED, styled entirely by
      css/amb-a.css:137-140's `.aba-join__say p`, a DESCENDANT selector that
      keeps matching through Elementor's text-editor wrapper.

   8. ASHLEY GREEN IS NAMED AND IS NOT A LINK, and that is deliberate rather
      than an omission: the static build does not link her, only the CEO's bio
      page exists, and Empower's note on 2026-08-05 was about exactly this, a
      name that opens somebody else's bio. Nothing here adds one. */

const HEADLINE = 'Join Our Ambassador Network';
const FIRST = 'Every great movement begins with people who are willing to take the first step.';
const SAY_1 = 'Join a growing network of Mississippians committed to creating more opportunity across our '
  + 'state. Whether you share your story, attend an event, or connect others with our work, your voice can '
  + 'make a difference.';
const SAY_2 = 'Getting started is easy. Complete the short interest form below, and Ashley Green, our '
  + 'Director of Outreach, will reach out to answer your questions and help you get connected.';

/* THE LIVE FORM, NOT A COPY OF ONE, since 2026-09-02.

   GRAVITY FORM 37, "I'm Interested in Becoming An Ambassador", the live form
   behind /become-an-ambassador/. 25 entries, notifying Ashley Green, who is
   still on the roster (checked, not assumed). Chosen over form 41 on
   2026-09-02: the two are duplicates with identical fields, and 37 is the one
   on the nav-level page and the more used. Which of the two Empower keep is an
   operational question that outlives this build.

   IT ASKS DIFFERENT QUESTIONS FROM THE APPROVED DESIGN. The design asked for a
   county, four "how would you like to get involved" ticks and a note to Ashley.
   The live form asks for a phone number, a city and ZIP, and one issue area.
   None of the approved extras exists on it. Adding them back is a Gravity Forms
   edit, where the entries and the notification live, not a change here.

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
const FORM_SHORTCODE = '[gravityform id="37" title="false" description="false" ajax="true"]';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'aba-join',
      content_width: 'full',
      _element_id: 'join',
      _attributes: 'aria-labelledby|join-title',
    },
    [
      container({ cssClass: 'em-container aba-join__grid', content_width: 'full' }, [
        container({ cssClass: 'aba-join__say', content_width: 'full' }, [
          text({
            markup: `<h2 class="aba-join__title" id="join-title">${HEADLINE}</h2>`,
            _attributes: 'data-reveal|rise',
          }),
          text({
            markup: `<p class="aba-join__first">${FIRST}</p>`,
            _attributes: 'data-reveal|rise',
          }),
          text({ markup: `<p>${SAY_1}</p>`, _attributes: 'data-reveal|rise' }),
          text({ markup: `<p>${SAY_2}</p>`, _attributes: 'data-reveal|rise' }),
        ]),
        text({ markup: FORM_SHORTCODE, cssClass: 'em-gform' }),
      ]),
    ],
  );
}
