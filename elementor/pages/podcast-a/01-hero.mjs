import { container, text, link } from '../../factory.mjs';

/* Source of truth: src/podcast-a/sections/01-hero.html. Every class, string
   and attribute below is read from that partial, not typed from memory.

   Structural decisions this module makes and why:

   1. Every container that is a CSS grid or flex parent for its OWN direct
      children (.pca-hero__grid, .pca-hero__frames, .pca-hero__actions) is
      built with content_width: 'full'. A boxed container (Elementor's
      default) inserts div.e-con-inner between itself and its children, so
      the real children stop being direct children and the grid/flex
      collapses. Confirmed against wp-content/plugins/elementor/includes/
      elements/container.php on empv2: before_render() only prints
      div.e-con-inner when is_boxed_container(), so content_width: 'full'
      is what removes it. Every other container here is also set to 'full'
      for consistency, since nothing in this section wants Elementor's own
      boxed max-width: .em-container already supplies the width constraint
      from tokens/base.css.

   2. .pca-hero__actions was a <p> in source, wrapping two <a> buttons. The
      container element's html_tag control (read from container.php) offers
      div, header, footer, main, article, section, aside, nav, a: no 'p'.
      It renders as a div, which is a safe substitute for a paragraph used
      purely as a flex wrapper for two links, and is a container/html_tag
      choice, not one of the spec's three HTML-widget exceptions.

   3. .pca-frame was a <span> in source. Per the brief's risk 2, the CSS
      makes it act as a grid box (display:grid;place-items:center), so a div
      container is correct with no HTML-widget exception needed.

   4. The frame's inner caption text ("Behind-the-scenes photography to
      come") was a plain inner <span> in source, styled by .pca-frame span.
      Under Elementor this becomes a text-editor widget's wrapper div plus a
      <p>, so that descendant selector will not match post-conversion. This
      is risk 4 in the brief: reported, not fixed here (fixing it is a
      Phase 2 concern).

   5. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, not a heading()
      widget with _element_id. Class-in-markup migration (2026-08-17): the
      id moves off the widget's wrapper div and onto the <h1> itself, so
      the section's aria-labelledby="hero-title" now resolves to the
      heading element rather than to a div that merely contains it, which
      was risk 5 in the brief and this page no longer carries it. The same
      move also removes Elementor's own heading widget from this section,
      so its frontend.min.css line-height:1 default needs no repair here.

   6. data-reveal-entrance and data-reveal-group are valueless in source.
      Elementor's Custom Attributes control (ElementorPro\Modules\
      CustomAttributes\Module::render_attributes) always calls
      Utils::render_html_attributes(), which does
      sprintf('%1$s="%2$s"', $key, esc_attr($value)) unconditionally, so a
      bare HTML5 boolean attribute cannot be produced: every attribute is
      quoted, even with an empty value. Written here as "key|" (empty
      value), which parses through Utils::parse_custom_attributes() to
      value '', and renders as data-reveal-entrance="". That satisfies every
      selector this build's motion layer actually uses
      ([data-reveal-entrance], [data-reveal-group], [data-reveal] in
      js/reveal.js and css/motion.css), because CSS attribute-presence
      selectors and Element.hasAttribute() both match on presence, not on a
      specific value. */

const CAPTION = 'Behind-the-scenes photography to come';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'pca-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|hero-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'pca-hero__grid', content_width: 'full' }, [
          container(
            { cssClass: 'pca-hero__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({
                markup: '<p class="pca-eyebrow">The Empower Podcast</p>',
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: '<h1 id="hero-title">Mississippi’s Biggest Challenges. Biggest Opportunities. Real Conversations.</h1>',
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: '<p class="pca-hero__lede">Join Grant Callen for thoughtful conversations with lawmakers, policy experts, and community leaders about the ideas and solutions that can help every Mississippian rise.</p>',
                _attributes: 'data-reveal|rise',
              }),
              container(
                { cssClass: 'pca-hero__actions', content_width: 'full', _attributes: 'data-reveal|rise' },
                [
                  link({ label: 'Watch on YouTube', href: '/podcast', cssClass: 'em-btn em-btn--primary em-btn--lg' }),
                  link({ label: 'Listen Now', href: '/podcast', cssClass: 'em-btn em-btn--inverse-outline em-btn--lg' }),
                ],
              ),
            ],
          ),
          container(
            { cssClass: 'pca-hero__frames', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              container(
                {
                  cssClass: 'pca-frame pca-frame--tall',
                  content_width: 'full',
                  _attributes: 'data-placeholder|photo\ndata-reveal|rise',
                },
                [text({ markup: `<p>${CAPTION}</p>` })],
              ),
              container({
                cssClass: 'pca-frame',
                content_width: 'full',
                _attributes: 'data-placeholder|photo\ndata-reveal|rise\naria-hidden|true',
              }),
              container({
                cssClass: 'pca-frame',
                content_width: 'full',
                _attributes: 'data-placeholder|photo\ndata-reveal|rise\naria-hidden|true',
              }),
            ],
          ),
        ]),
      ]),
    ],
  );
}
