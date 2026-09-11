import { container, text } from '../../factory.mjs';

/* Source of truth: dist/work.html, the <section class="sol-hero"> block
   (lines 171-178) and the comment above it (168-170). Every class, string and
   attribute below is read from that file, not typed from memory and not copied
   from elementor/pages/safety/01-hero.mjs: the two sections are the same SHAPE
   and none of the same words.

   THIS PAGE IS A FILL, NOT A CONVERSION. css/solution.css is shared by
   `safety`, `work` and `education`, `safety` converted it first (Task 17), and
   every bridge repair it paid is keyed on a class this stylesheet gives all
   three pages. That inheritance is conditional on this page being built in the
   same shape, which is why each module below states which of the five
   inherited blocks its own section depends on rather than assuming they arrive.

   THIS SECTION DEPENDS ON NONE OF THEM, and that is checked rather than
   assumed: no `p:last-child` rule reaches `.sol-hero__inner`, it is not a
   grid, it declares no `flex` of its own, and it holds no anchor.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT. The build supplies its own
      `.em-container` measure (css/site.css) and Elementor's boxed container
      would insert a second, narrower one inside it. Same choice every earlier
      page.mjs and section module in this build makes.

   2. `.em-container` IS ITS OWN DIV, not merged with `.sol-hero__inner`,
      because source has three nested elements here (`section >
      div.em-container > div.sol-hero__inner`) rather than the two-class single
      div some other pages use. Read from dist/work.html rather than copied.

   3. `.sol-hero__inner` IS A CONTAINER AND IT NEEDS NOTHING, checked rather
      than assumed. css/solution.css:64-66 is
      `display:flex;flex-direction:column;justify-content:center;min-height:
      clamp(420px,48vw,620px);padding:...`. The direction is DECLARED, so this
      is not the missing-direction shape bridge.css's header block repairs, and
      Elementor's own container default (`column`) agrees with it by
      construction. `justify-content` is the one property Elementor also
      resolves, through
      `.elementor-element:where(.e-con-full,.elementor-widget){justify-content:
      var(--justify-content)}`, which `:where()` makes 0,1,0; the build's rule
      is also 0,1,0 and css/solution.css loads after Elementor's
      frontend.min.css, so the build wins on source order.

      NOTE THAT `flex` IS NOT DECLARED HERE, which is the property block 38
      repairs one section away on `.sol-cap__body`. An element that declares
      `display:flex` but no `flex` is not in that family: what Elementor's
      `.e-con.e-flex` overrides at 0,2,0 is the `flex` shorthand, and there is
      nothing here for it to beat.

   4. THE <em> IS PART OF THE HEADING'S OWN MARKUP STRING. css/solution.css:76
      is `.sol-hero h1 em{font-style:normal;display:block;color:var(--orange-300)}`,
      a descendant selector, so nothing of Elementor's can fall between the
      <h1> and the <em> as long as both are authored in one markup string. It
      is what puts the orange half of the sentence on its own line.

   5. `id="hero-title"` IS AUTHORED IN THE MARKUP, not passed through
      `_element_id` or `_attributes`. The id belongs to the <h1> itself
      (the section's `aria-labelledby` names it), and a text() widget's markup
      reaches the page unaltered, so the id lands on the real element. The id
      SET is identical across the three solution pages, which means the strings
      are the same, not that they can be carried over without reading them off
      this page's own markup; they were read off it.

   6. `data-reveal` RIDES ON THE WIDGET WRAPPER HERE, through `_attributes`,
      which is this build's standing convention and is safe in this section
      because nothing in it is `display:contents`. 02-vision.mjs note 3 records
      the one section on this page where that convention had to be abandoned,
      and why.

   7. THE SOURCE COMMENT ABOVE THE SECTION (dist/work.html:168-170) is carried
      at the top of the eyebrow's own markup string, the first authorable point
      inside <main>. A comment cannot ride on a container, because Elementor
      renders container markup itself; it can ride inside a widget's own markup,
      which reaches the page unaltered. THIS PAGE'S COMMENT IS NOT `safety`'s:
      it says "The template's whole idea" where safety says "This variation's
      whole idea", and it is reproduced as this file has it. */

const NOTE = '<!-- Dark hero, no photograph. The template’s whole idea is that the page starts\n'
  + '     dark and the light arrives in sections, so the first screen is the headline\n'
  + '     and nothing else. The glow behind it is a CSS gradient, not an image. -->';

/* The curly apostrophe in the comment above is the source's, reproduced byte
   for byte rather than normalised, the same rule every string in this module
   follows: census() keys on the element's own text, so a straight quote would
   take an element out of the shared set. */
const EYEBROW = 'Meaningful Work';
const HEAD = 'Work Should Open Doors to <em>Opportunity</em>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|hero-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-hero__inner', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `${NOTE}\n<p class="sol-eyebrow">${EYEBROW}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<h1 id="hero-title">${HEAD}</h1>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
      ]),
    ],
  );
}
