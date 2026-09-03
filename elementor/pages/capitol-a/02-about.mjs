import { container, text } from '../../factory.mjs';

/* Source of truth: dist/capitol-a.html, the <section class="cca-about">
   block (lines 211-224). Every class, string and attribute below is read
   from that file, not typed from memory.

   THE EM DASH IN THE CLAIM PARAGRAPH IS APPROVED COPY, NOT SOMETHING THIS
   BUILD WRITES. "the action under the dome—all in under five minutes" is
   dist/capitol-a.html's own text; this repo's rule against em dashes governs
   what this build writes, not what already-approved copy says, the same
   distinction every earlier page's own sourced-copy comment records.

   WIL ERVIN IS NOT A LINK, matching dist/capitol-a.html's own comment at
   that file's line 201 and this build's standing rule (his bio page does
   not exist; only the CEO's is built). Nothing here adds one.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the same reason every prior section
      module records.

   2. `.cca-about__copy` HOLDS FOUR PARAGRAPHS, not three. This matters for
      the bridge cost: `css/capitol-a.css:115`'s `.cca-about__copy
      p:last-child{margin-bottom:0}` is the same defect podcast-a's
      `.pca-about__copy p:last-child` already hit (bridge.css, the
      `.pca-about__copy` block), but podcast-a's own group has three
      paragraphs with the NAMED one (`.pca-lede`) FIRST; this page's named
      one (`.cca-about__claim`, its own `margin-bottom:var(--space-6)`, 24px)
      sits SECOND of four, in the middle of the group, not at either end.
      Once converted, every paragraph here is the only child of its own
      text() widget wrapper, so `:last-child` is true of all four
      regardless of position, and `.cca-about__copy p:last-child` (0,2,1)
      outranks `.cca-about__copy .cca-about__claim` (0,2,0) the same way it
      outranked `.pca-about__copy .pca-lede` and `.sb-hero__copy
      .sb-hero__lede` before it. Not fixed here: this module only builds
      what the static page authors; the bridge repair, and how many rules
      it actually needs (podcast-a's own case needed more than the single
      `:not(:last-child)` wrapper rule, because its own named paragraph
      needed separate protection too), is measured and written after
      deploy, not guessed at in this comment. See the task report for the
      measured count.

   3. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never heading().
      No `heading()` import above. */

const HEADLINE = 'The Capitol Moves Fast. We Help You Keep Up.';
const P1 = 'Capitol Chat is Empower Mississippi’s weekly insider update on what’s happening at the Mississippi State Capitol during the legislative session.';
const CLAIM = 'Each week, Senior Vice President Wil Ervin breaks down the biggest developments and highlights the action under the dome—all in under five minutes.';
const P3 = 'Get the context you need to understand what’s happening, why it matters, and what to watch next.';
const WHERE = 'Listen and subscribe wherever you get your podcasts.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'cca-about',
      content_width: 'full',
      _attributes: 'aria-labelledby|about-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'cca-about__grid', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="about-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'cca-about__copy', content_width: 'full' }, [
              text({ markup: `<p>${P1}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p class="cca-about__claim">${CLAIM}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${P3}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p class="cca-about__where">${WHERE}</p>`, _attributes: 'data-reveal|rise' }),
            ]),
          ],
        ),
      ]),
    ],
  );
}
