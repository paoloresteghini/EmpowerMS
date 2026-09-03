import { container, text, link, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: src/final/sections/01-hero.html. Every class, string and
   attribute below is read from that partial, not typed from memory.

   This is the first converted section in the build that carries real
   photography, so most of what follows is about the two <img> elements rather
   than about the copy.

   1. CONTAINERS ARE 'full' THROUGHOUT, for the reason podcast-a's hero
      records: a boxed container inserts div.e-con-inner between itself and its
      children, so the real children stop being direct children and any grid or
      flex laid out on the parent collapses. .fp-hero__grid and
      .fp-hero__actions are both such parents. Unlike podcast-a's hero this
      section has NO .em-container: the source lays .fp-hero__grid directly
      inside the <section>, and adding one would change the page's width
      behaviour rather than preserve it.

   2. <figure> BECOMES A DIV CONTAINER. Elementor's container html_tag control
      offers div, header, footer, main, article, section, aside, nav and a; it
      does not offer figure. Both figures here (.fp-hero__media, .fp-hero__aside)
      are styling wrappers around a single image with no <figcaption>, so a div
      loses no semantics a screen reader was using: a <figure> without a caption
      is not exposed as a figure with an accessible name anyway. This is the
      same class of substitution podcast-a made for its <p> wrapper, recorded
      rather than silent.

   3. THE HERO IMAGE LOSES fetchpriority="high", AND THAT IS THE ONE REAL COST
      IN THIS SECTION. In the static build the hero photograph carries
      width, height, fetchpriority="high" and decoding="async"; it is the
      largest element in the first viewport, so it is the page's LCP element and
      that attribute exists to stop the browser discovering it late. The image
      widget has no control for it, and Custom Attributes land on the widget's
      WRAPPER div, not on the <img> inside, so there is no route to it through
      settings at all.

      Built with the native image widget anyway, deliberately, rather than
      reaching for an html() widget that would preserve the markup byte for
      byte. The reasons: this is the homepage's hero photograph, the single most
      likely image on the whole site for Empower to want to change, and an
      html() widget puts it out of reach of the editor and into this repository
      permanently. The four html() exceptions this build allows are for markup
      Elementor cannot express at all, not for markup it expresses slightly
      worse.

      The cost is real and must be MEASURED rather than assumed, on the live
      converted page, and recorded next to this comment: what the widget emits
      for width/height/decoding/loading, and what the LCP actually is against
      the static build's own. If the number is bad, the fallback is not an
      html() widget but a `wp_get_attachment_image_attributes` filter in the
      child theme keyed to this attachment id, which keeps the widget editable
      and puts the attribute back. That filter is not written yet, because
      writing it before the measurement would be guessing.

   4. THE ASIDE IMAGE IS DECORATIVE AND STAYS DECORATIVE. In source it carries
      alt="" and aria-hidden="true". Its attachment (20580) was imported with
      empty alt on purpose, so the widget emits alt="", and aria-hidden is set
      on the widget wrapper, which removes the whole subtree including the
      <img> from the accessibility tree. Both halves are needed: alt="" alone
      leaves the image in the tree as an unlabelled presentational node, and
      aria-hidden alone would be undone the day somebody writes alt text onto
      that attachment from the media library.

   5. THE <h1> KEEPS ITS ENTITY AND ITS INLINE <em>. Source reads
      `Your American&nbsp;Dream <em>Starts Here.</em>`. The non-breaking space
      is doing typographic work (it stops "American Dream" breaking across two
      lines mid-phrase) and the <em> carries the italic that the design turns
      on. Passed through verbatim as the heading's title. Whether Elementor's
      heading widget renders inline HTML in a title, rather than escaping it, is
      the second thing to measure on the live page; if it escapes, this heading
      becomes an html() widget and that IS one of the allowed exceptions,
      because escaped markup is Elementor failing to express the source at all.

   6. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, not a heading()
      widget with _element_id. Class-in-markup migration (2026-08-17): the
      id moves off the widget's wrapper div and onto the <h1> itself, so
      the section's aria-labelledby="hero-title" now resolves to the heading
      element rather than to a div that merely contains it, which is
      podcast-a's recorded risk 5 and this page no longer carries it. The
      same move also removes Elementor's own heading widget from the page,
      so its frontend.min.css line-height:1 default (the rule the bridge
      stylesheet was repairing for this element) stops applying and needs
      no repair at all. */

const TAGLINE = 'Real People. Real Problems. Real Solutions.';
const HEADLINE = 'Your American&nbsp;Dream <em>Starts Here.</em>';
const LEDE = 'You want to build a great life. Raise a family. Find meaningful work. Put down roots in a strong community. We work to expand opportunity so every Mississippian has the chance to achieve the American Dream right here at home.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'fp-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|hero-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'fp-hero__grid', content_width: 'full' }, [
        container(
          { cssClass: 'fp-hero__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<p class="fp-tagline">${TAGLINE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<h1 id="hero-title">${HEADLINE}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="fp-hero__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            container(
              { cssClass: 'fp-hero__actions', content_width: 'full', _attributes: 'data-reveal|rise' },
              [
                link({
                  label: 'Explore Our Work',
                  href: '/what-we-do',
                  cssClass: 'em-btn em-btn--primary em-btn--lg',
                }),
              ],
            ),
          ],
        ),
        container({ cssClass: 'fp-hero__stack', content_width: 'full' }, [
          container(
            { cssClass: 'fp-hero__media', content_width: 'full', _attributes: 'data-reveal|clip' },
            [image({ ...photo('father-children-field') })],
          ),
          container(
            {
              cssClass: 'fp-hero__aside',
              content_width: 'full',
              _attributes: 'data-reveal|rise\naria-hidden|true',
            },
            [image({ ...photo('children-running-parent') })],
          ),
        ]),
      ]),
    ],
  );
}
