import { container, text, image, link } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/solutions-b.html, the <section class="sb-stories">
   block (lines 258-270). Every class, string and attribute below is read
   from that file, not typed from memory.

   Structural decisions:

   1. `.sb-stories__band` IS A <figure> WITH NO <figcaption>, so it becomes a
      div container, the same substitution this build makes everywhere a
      <figure> carries no caption. It sits OUTSIDE `.em-container` in
      source (full-bleed band above the boxed panel), so it is built as a
      sibling of the `.em-container` call below, not nested inside it,
      matching the DOM exactly.

   2. THE BAND PHOTOGRAPH IS MEANINGFUL, NOT DECORATIVE. Source: a real alt
      on the <img>, no aria-hidden. See media.mjs for the id and the
      confirmed alt text (video-still-man-outdoors, 20597).

   3. data-reveal="clip" IS ON THE FIGURE ITSELF, not on a child, matching
      what-we-do-a's own `.da-hero__media` (01-hero.mjs), which carries the
      same reveal value on its own container for the same reason: the whole
      photograph clips in as one motion unit.

   4. NO CHILD-COMBINATOR EXPOSURE. css/solutions-b.css has no child-
      combinator rule anywhere in the file (see 02-track.mjs's own note), so
      nothing in this section needs a bridge rule. */

const HEADLINE = 'Behind every policy is a person.';
const BODY = 'Across Mississippi, students, parents, workers, employers, and community members are experiencing what becomes possible when people have greater opportunity to shape their own futures.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sb-stories',
      content_width: 'full',
      _attributes: 'aria-labelledby|stories-title',
    },
    [
      container(
        { cssClass: 'sb-stories__band', content_width: 'full', _attributes: 'data-reveal|clip' },
        [image({ ...photo('video-still-man-outdoors') })],
      ),
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sb-stories__panel', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="stories-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p>${BODY}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            link({
              label: 'Read Community Stories',
              href: '/latest',
              cssClass: 'em-btn em-btn--primary em-btn--lg',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
      ]),
    ],
  );
}
