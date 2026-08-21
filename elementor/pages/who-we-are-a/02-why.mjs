import { container, text } from '../../factory.mjs';

/* Source of truth: dist/who-we-are-a.html, the <section class="wa-why">
   block (lines 192-205). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. THE SLAB IS A CONTAINER, NOT AN html() BLOB, even though nothing inside
      it needs to be a widget and the blob lever was explicitly available for
      this section. Two reasons, in order of weight.

      css/who-we-are-a.css:100-107 makes `.wa-why__slab` a two-column CSS
      grid whose tracks are `.wa-why__head` and `.wa-why__body`, and :122
      makes `.wa-why__body` a grid of its own with `gap:var(--space-6)`
      between the three paragraphs. Built as containers, the head, the body
      and each paragraph's own widget wrapper are the real grid items those
      two rules were written for. Built as one html() blob the layout would
      also be exact, because everything inside a single authored string
      reaches the page unaltered, so this is a choice rather than a forced
      move. It is made this way because the alternative gives Empower one
      opaque HTML box in the editor where the design has a heading and three
      paragraphs, which is the editability the whole native-first decision
      exists to buy (see the four named exceptions in
      docs/superpowers/specs/2026-08-12-elementor-conversion-design.md; this
      section is not one of them).

   2. NO `:last-child` EXPOSURE HERE, which is what makes the container form
      free. `.wa-why__body p{margin:0}` (css/who-we-are-a.css:123) sets the
      same margin on every paragraph and the spacing comes from the grid's
      own `gap`, so there is no "the last one is different" rule to break
      when each paragraph becomes the only child of its own wrapper. That is
      the difference between this section and `.wa-story__copy` in
      03-story.mjs, which carries exactly such a rule and costs the page its
      one structural repair.

   3. `.wa-why__slab::before` (css/who-we-are-a.css:112-117) is the honeycomb
      texture, and it needs nothing. It is `position:absolute;inset:0`, so it
      is out of flow and never becomes a flex or grid ITEM of the container it
      sits on, which is the trap a `::before` on a converted container would
      otherwise be. `--pattern-ink` is set on `.wa-why__slab` itself (:107)
      and inherits down normally.

   4. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never a heading()
      widget. No `heading()` import above. The id travels on the <h2> itself,
      so the section's aria-labelledby="why-title" resolves to the heading
      element rather than to a div that merely contains it.

   5. THE CLOSING LINE IS A PARAGRAPH, not a separate block. Source gives it
      `class="wa-why__close"` on the third <p> inside `.wa-why__body`, and
      css/who-we-are-a.css:128-130 styles it as one of the body's three grid
      items with a top border. Kept as the third text() in the same container
      so it stays the third grid item.

   6. THE TYPOGRAPHIC APOSTROPHES ARE THE BUILD'S OWN. "Mississippi’s",
      "aren’t", "politics’", "We’re", "people’s" all use U+2019 in
      dist/who-we-are-a.html and are reproduced byte for byte. The census
      keys on element text, so a straight apostrophe here would silently drop
      two of this section's four keys out of the comparison rather than
      report a difference. */

const HEADLINE = 'Every Mississippian deserves the opportunity to build a good life, raise a family, find meaningful work, and pursue their dreams.';
const BODY_1 = 'Too often, outdated policies and unnecessary barriers stand in the way. We believe government policy should create opportunity, not limit it.';
const BODY_2 = 'Empower Mississippi exists to create a path to generational prosperity for Mississippi’s children, workers, and families. We believe lasting change begins with the conditions that shape everyday life: a quality education, meaningful work, strong families, safe communities, and public policies that empower earned success.';
const CLOSE = 'We aren’t interested in politics for politics’ sake. We’re interested in results that improve people’s lives.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'wa-why',
      content_width: 'full',
      _attributes: 'aria-labelledby|why-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'wa-why__slab', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'wa-why__head', content_width: 'full' }, [
              text({
                markup: `<h2 id="why-title">${HEADLINE}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            container({ cssClass: 'wa-why__body', content_width: 'full' }, [
              text({ markup: `<p>${BODY_1}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${BODY_2}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p class="wa-why__close">${CLOSE}</p>`, _attributes: 'data-reveal|rise' }),
            ]),
          ],
        ),
      ]),
    ],
  );
}
