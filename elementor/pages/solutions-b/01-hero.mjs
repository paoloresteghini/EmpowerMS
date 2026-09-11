import { container, text } from '../../factory.mjs';

/* Source of truth: dist/solutions-b.html, the <section class="sb-hero"> block
   (lines 168-183). Every class, string and attribute below is read from that
   file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the same reason every prior section
      module records: a boxed container inserts div.e-con-inner between
      itself and its children, which would collapse a build selector the
      moment it stopped seeing its real children directly.

   2. `.sb-hero__lead-in` IS A SIBLING OF `.em-container`, NOT A CHILD OF IT.
      Source: both are direct children of <section class="sb-hero">. It is a
      decorative, empty, CSS-only element (a gradient line, no content), so
      it is built the same way final/04-stories.mjs's `.em-rule` is: an empty
      container carrying its class and aria-hidden, no children.

   3. THE HEADING IS A text() WIDGET CARRYING A BARE <h1>, never a heading()
      widget. No `heading()` import above; the factory guard and the
      repo-wide sweep both enforce this. The inline <em>Stronger
      Mississippi</em> is passed through as part of the markup string exactly
      as authored.

   4. NEITHER PARAGRAPH CARRIES data-reveal ON ITS PARENT. Source has
      data-reveal="rise" on each <p> individually, not on `.sb-hero__copy`,
      so each text() widget carries its own _attributes rather than sharing
      one on the wrapping container.

   5. NO PHOTOGRAPH IN THIS SECTION. Unlike what-we-do-a's hero, sb-hero
      carries no <img>; the visual is the decorative line only. */

const HEADLINE = 'Practical Solutions for a <em>Stronger Mississippi</em>';
const LEDE = 'Opportunity is shaped by the things that affect everyday life: the education you receive, the work you can pursue, and the safety of the community you call home.';
const BODY = 'That’s why Empower Mississippi focuses on three areas where practical solutions can make a meaningful difference. Through research, community engagement, and policy solutions, we work to turn ideas into lasting change for people across our state.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sb-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|solutions-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sb-hero__inner', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h1 id="solutions-title">${HEADLINE}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'sb-hero__copy', content_width: 'full' }, [
              text({
                markup: `<p class="sb-hero__lede">${LEDE}</p>`,
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: `<p>${BODY}</p>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
          ],
        ),
      ]),
      container({ cssClass: 'sb-hero__lead-in', content_width: 'full', _attributes: 'aria-hidden|true' }),
    ],
  );
}
