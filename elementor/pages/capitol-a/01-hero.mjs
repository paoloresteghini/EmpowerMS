import { container, text, link, html } from '../../factory.mjs';

/* Source of truth: dist/capitol-a.html, the <section class="cca-hero"> block
   (lines 181-200). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the same reason every prior section
      module records: a boxed container inserts div.e-con-inner between
      itself and its children, which would collapse a build selector the
      moment it stopped seeing its real children directly.

   2. TWO SEPARATE `.em-container` DIVS, matching source exactly: the copy
      block and the triptych sit in two different `<div class="em-container">`
      elements, both direct children of `.cca-hero`, not nested inside one
      shared wrapper.

   3. `.cca-hero__action` IS A `<p>` IN SOURCE, BUILT AS A CONTAINER. A
      link() widget's own wrapper always renders as a div (widgets have no
      html_tag control, only containers do), so the `<p>` cannot be
      reproduced literally either way; built as a container (default tag
      div) rather than embedding the `<a>` in a text() widget's markup, so
      the CTA stays a real, retargetable link() through Elementor's own
      panel, the same choice every other page's primary CTA in this build
      makes (precedent: podcast-a/01-hero.mjs:91-97, the identical `<p>`-
      wrapping-a-CTA shape). Semantically cheap: css/capitol-a.css's own
      `.cca-hero__action{margin:0}` is a bare class selector, not `p.cca-
      hero__action`, so nothing depends on the wrapping element being a
      `<p>` specifically.

      THE COST THIS CARRIES, review round 1: converting the `<p>` to a
      container means `p|Listen Now` exists on the static side and not on
      the live side (a link() widget's wrapper is a div, and its own anchor
      is skipped by controlBoxes() by design), so that key drops out of
      census()'s own `shared` set entirely rather than being compared and
      passing. Measured: this page's own census shared is 15 of 16, one
      short of the full census() count, and the missing key is exactly this
      one. No consequence here, since the floor (minShared: 9) has ample
      headroom below 15, but the same trade recurs on every page whose
      static build wraps a CTA in a `<p>` or other heading/paragraph tag,
      and it silently narrows census coverage each time: a page with a
      small census count to begin with should watch for this before
      assuming a clean pass means nothing was lost.

   4. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a heading()
      widget. No `heading()` import above; the factory guard and the
      repo-wide sweep both enforce this.

   5. `.cca-triptych` IS AN <ul> OF THREE <li>, BUILT AS ONE html() WIDGET,
      matching what-we-do-a's `.da-years` and final's `.tl-line`: nothing
      inside any plate needs to be a widget (no images anywhere on this
      page; the first plate's caption is a plain <span>), so the whole list
      is authored as one markup string, real `<ul>`/`<li>` intact, no
      role="list" workaround needed. This is also what makes
      `css/capitol-a.css:96`'s `.cca-plate:not(:first-child){display:none}`
      (inside the 720px media query) need no bridge rule at all: the
      selector's reference point (`.cca-triptych`) and its target (each
      `.cca-plate`) both sit inside this SAME markup string, so nothing
      Elementor inserts can ever fall between them. Checked before choosing:
      had this been built as a container tree instead, each `<li>` would
      become the only child of its own widget wrapper, `:first-child` would
      become ALWAYS true and `:not(:first-child)` ALWAYS false, the rule
      would go inert, and all three plates would render at 720px where the
      design shows one, silently (this is the UNDER-match half of the
      recipe's own asymmetry, which restating at raised specificity cannot
      repair). No cssClass passed to html(): the real class sits on the
      `<ul>` tag directly in the markup string, matching `.da-years`/
      `.tl-line`'s own choice, so `css/capitol-a.css`'s `.cca-triptych` and
      `.cca-plate` rules reach the real elements with nothing in between. */

const HEADLINE = 'What’s Happening Under the Dome?';
const EYEBROW = 'Capitol Chat';
const LEDE = 'Get quick, straightforward updates on the legislation, debates, and decisions shaping Mississippi during the legislative session.';

const TRIPTYCH = `<ul class="cca-triptych" data-reveal-group>
      <li class="cca-plate" data-placeholder="photo" data-reveal="rise"><span>Capitol photography to come</span></li>
      <li class="cca-plate" data-placeholder="photo" data-reveal="rise" aria-hidden="true"></li>
      <li class="cca-plate" data-placeholder="photo" data-reveal="rise" aria-hidden="true"></li>
    </ul>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'cca-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|hero-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'cca-hero__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<p class="cca-eyebrow">${EYEBROW}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<h1 id="hero-title">${HEADLINE}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="cca-hero__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            container(
              { cssClass: 'cca-hero__action', content_width: 'full', _attributes: 'data-reveal|rise' },
              [link({ label: 'Listen Now', href: '/podcast', cssClass: 'em-btn em-btn--primary em-btn--lg' })],
            ),
          ],
        ),
      ]),
      container({ cssClass: 'em-container', content_width: 'full' }, [
        html({ markup: TRIPTYCH }),
      ]),
    ],
  );
}
