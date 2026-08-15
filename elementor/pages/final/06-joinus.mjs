import { container, heading, text, image, html } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: src/sections/06-joinus.html.

   THE FORM QUESTION, ANSWERED FOR THIS PAGE, AND NOT FOR THE OTHER THREE.

   README leaves this as "Form widget, or HTML widget keeping the markup as
   authored" in four places. For this section it is not actually a choice, and
   the thing that settles it is structural rather than a preference:

   **Elementor's container html_tag control offers no `form`.** It offers div,
   header, footer, main, article, section, aside, nav and a. So `<form
   class="em-newsletter__form" action="#" method="post">` cannot be a container
   at all. The only two candidates were Elementor Pro's Form widget and an
   html() widget.

   Elementor Pro's Form widget was rejected on measurement of what it costs, not
   on taste. It emits its own markup and its own class vocabulary
   (.elementor-field-group, .elementor-field, .elementor-button and the rest),
   and every rule styling this block is written against the build's own:
   .em-newsletter, .em-newsletter__form, .em-input, .em-input--lg,
   .em-btn--inverse, .em-newsletter__note. Converting to the Form widget
   therefore does not cost a bridge rule or two, it costs a translation of the
   whole component, and it would have to be repeated for every form in the
   build. The accessibility contract the static build already holds (a real
   <label for>, autocomplete="email", type="email", native required) is
   reproducible in the Form widget, so that is not the deciding factor either
   way; the class vocabulary is.

   WHAT THIS DOES NOT SETTLE, and the reason this comment is longer than the
   decision: the other three form-shaped blocks are not this one. This is a
   single-field newsletter signup embedded in a homepage section, where the
   value of Empower being able to edit it is low and the styling cost of the
   Form widget is high. `mail-a` and `amb-a` are pages whose entire purpose is
   their form, where Empower genuinely needs the submissions to go somewhere and
   an unmanaged <form action="#"> is not a hand-off, it is a placeholder. Those
   two should be judged on their own and are likely to go the other way, with
   the class translation paid once. `give-c` is different again: its amounts are
   links carrying a figure into Empower's existing Gravity Forms and Stripe
   setup, so it has no form of its own to convert.

   THE ACTION IS STILL A PLACEHOLDER. `action="#"` is what the static build
   carries and what is deployed here. At hand-off it becomes the real WordPress
   or Mailchimp endpoint, and because this is an html() widget that is a one-line
   edit in this file followed by a redeploy, rather than an edit in the editor
   that the next deploy would overwrite.

   THE TWO WAYS BELOW ARE NATIVE. .em-join__way is a div with a decorative wash
   photograph, a heading, a paragraph and a link, all of which Elementor
   expresses directly. The link is the one thing to note: source is
   `<a class="em-join__action"><span class="em-join__action-label">…</span><span
   class="em-join__arrow" aria-hidden="true">→</span></a>`, an anchor with two
   spans inside it, and link() emits a button widget whose label is plain text.
   Two spans inside an anchor is markup Elementor's button cannot express, and
   the arrow is aria-hidden decoration that has to stay hidden, so these are
   html() widgets too, for the same reason as the form: not expressible, rather
   than expressible differently. */

const PITCH_HEADLINE = 'This is where you come in.';
const PITCH_LEAD = 'Opportunity moves when more people push. Start with the newsletter: what changed this month, who it changed things for, and what happens next.';
const NOTE = 'Once a month. Unsubscribe in one click.';

const FORM_MARKUP = `<form class="em-newsletter__form" action="#" method="post">
            <label class="em-visually-hidden" for="join-email">Email address</label>
            <input class="em-input em-input--lg" id="join-email" name="email" type="email" placeholder="Email address" autocomplete="email" required>
            <button class="em-btn em-btn--inverse em-btn--md" type="submit">Subscribe</button>
          </form>`;

const WAYS = [
  {
    photo: 'children-running-parent',
    wash: 'em-join__wash--community',
    title: 'Bring it home',
    body: 'Take the conversation about opportunity to the place you already know best — your school board, your church, your street. We hand you what you need to start it.',
    href: '/ambassadors',
    label: 'Become an ambassador',
  },
  {
    photo: 'worker-workshop-bw',
    wash: 'em-join__wash--work',
    title: 'Fund the work',
    body: 'Your support puts research, advocacy and follow-through behind the solutions on this page — and keeps them in front of the people who decide.',
    href: '/donate',
    label: 'Support the work',
  },
];

const way = (w) =>
  container(
    { cssClass: 'em-join__way', content_width: 'full', _attributes: 'data-reveal|rise' },
    [
      image({
        ...photo(w.photo),
        cssClass: `em-join__wash ${w.wash}`,
        _attributes: 'aria-hidden|true',
      }),
      heading({ text: w.title, tag: 'h3' }),
      text({ markup: `<p>${w.body}</p>` }),
      html({
        markup: `<a class="em-join__action" href="${w.href}"><span class="em-join__action-label">${w.label}</span><span class="em-join__arrow" aria-hidden="true">→</span></a>`,
      }),
    ],
  );

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'em-section em-join-wrap',
      content_width: 'full',
      _attributes: 'aria-labelledby|join-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'em-join', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container(
              { cssClass: 'em-join__slab', content_width: 'full', _attributes: 'data-reveal|rise' },
              [
                container({ cssClass: 'em-join__pitch', content_width: 'full' }, [
                  heading({ text: PITCH_HEADLINE, tag: 'h2', _element_id: 'join-title' }),
                  text({ markup: `<p>${PITCH_LEAD}</p>`, cssClass: 'em-join__lead' }),
                ]),
                container(
                  { cssClass: 'em-newsletter em-newsletter--light em-join__signup', content_width: 'full' },
                  [
                    html({ markup: FORM_MARKUP }),
                    text({ markup: `<p>${NOTE}</p>`, cssClass: 'em-newsletter__note' }),
                  ],
                ),
              ],
            ),
            container({ cssClass: 'em-join__ways', content_width: 'full' }, WAYS.map(way)),
          ],
        ),
      ]),
    ],
  );
}
