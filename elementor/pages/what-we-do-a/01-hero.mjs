import { container, text, link, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/what-we-do-a.html, the <section class="da-hero"> block.
   Every class, string and attribute below is read from that file, not typed
   from memory.

   This is the first page in the class-in-markup phase built from scratch by
   this recipe rather than migrated to it, so nothing here carries a "before"
   comment; there is no earlier heading()/cssClass-on-wrapper version to
   contrast against.

   Structural decisions:

   1. `.da-hero__grid` AND `.em-container` ARE ONE DIV, not two nested ones.
      Source: `<div class="da-hero__grid em-container">`, a single element
      carrying both classes. Built as one container() call with a
      space-joined cssClass, matching the markup rather than inventing a
      wrapper level the static build does not have.

   2. CONTAINERS ARE 'full' THROUGHOUT, for the reason every prior section
      module records: a boxed container inserts div.e-con-inner between
      itself and its children, which would collapse `.da-hero__grid`'s own
      CSS grid the moment it stopped seeing its real children directly.

   3. <figure> BECOMES A DIV CONTAINER. `.da-hero__media` is a <figure> in
      source with no <figcaption>; Elementor's container html_tag control
      offers div, header, footer, main, article, section, aside, nav and a,
      not figure. A <figure> with no caption is not exposed to a screen
      reader as a figure with an accessible name anyway, so a div loses no
      semantics, the same substitution podcast-a's hero and final's hero
      both already made for their own <figure>/<p> wrappers.

   4. THE HERO PHOTOGRAPH IS MEANINGFUL, NOT DECORATIVE, so this section
      carries no aria-hidden anywhere. Source: `alt="An adult and a child
      walking hand in hand across grass"`, no aria-hidden on the <img>. The
      attachment (classroom-students, 20587) already carries that exact alt
      text, read directly off the install before this file was written; see
      media.mjs for the check. The widget has no alt control of its own
      (factory.mjs documents why), so nothing needs setting here beyond the
      photo() lookup.

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a heading()
      widget. No `heading()` import above; the factory guard and the
      repo-wide sweep both enforce this, and this page has no dynamic-tag
      binding that would need the one exemption. `<em>We’re here to help.</em>`
      is passed through as part of the markup string exactly as authored,
      the same way final's hero passes its own inline <em> through.

   6. THE LEDE KEEPS ITS EM DASHES. "the privilege—and the responsibility—of"
      is the approved copy in dist/what-we-do-a.html, not something written
      here. This repo's own rule against em dashes governs what this build
      writes, not what already-approved copy says (the same distinction
      final/02-solutions.mjs records for its own sourced copy).

   7. THIS HERO PHOTOGRAPH ALSO LOSES fetchpriority="high", THE SAME KNOWN
      COST final/01-hero.mjs note 3 names and does not yet fix. Source
      (`dist/what-we-do-a.html:181`) carries `fetchpriority="high"` on this
      exact photograph; the image widget has no control for it and Custom
      Attributes land on the wrapper, not the <img>, so there is no route to
      it through settings. It is the largest element in this page's own
      first viewport and therefore also its likely LCP element, added here
      unmeasured rather than left silent, per review round 1: the fallback,
      if the number turns out bad, is the same `wp_get_attachment_image_
      attributes` filter final/01-hero.mjs note 3 describes, keyed to this
      attachment id (20587), not written here for the same reason it is not
      written there yet, that writing it before measuring would be
      guessing. */

const KICKER = 'What we do';
const HEADLINE = 'You want to build a great life. <em>We’re here to help.</em>';
const LEDE = 'Each of us has been entrusted with the privilege—and the responsibility—of helping to leave Mississippi better than we found it.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'da-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|do-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'da-hero__grid em-container', content_width: 'full' }, [
        container(
          { cssClass: 'da-hero__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<p class="da-kicker">${KICKER}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<h1 id="do-title">${HEADLINE}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="da-hero__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            container(
              { cssClass: 'da-hero__actions', content_width: 'full', _attributes: 'data-reveal|rise' },
              [
                link({ label: 'See Our Solutions', href: '/solutions', cssClass: 'em-btn em-btn--primary em-btn--lg' }),
              ],
            ),
          ],
        ),
        container({ cssClass: 'da-hero__stack', content_width: 'full' }, [
          container(
            { cssClass: 'da-hero__media', content_width: 'full', _attributes: 'data-reveal|clip' },
            [image({ ...photo('classroom-students') })],
          ),
        ]),
      ]),
    ],
  );
}
