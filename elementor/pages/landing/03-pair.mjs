import { container, text, html, image } from '../../factory.mjs';
import { photo } from './media.mjs';

/* Source of truth: dist/landing.html, the <section class="lnd-pair"> block
   (lines 251-274). Every class, string and attribute below is read from that
   file, not typed from memory.

   BLOCK 3 OF SIX, INDEPENDENT OF THE OTHER FIVE, and the one the template's
   own comment calls "the workhorse block". It is also the block css/landing.css
   expects to be run TWICE on one page, with `.lnd-pair--flip` on the second
   instance, which is why note 5 measures the modifier even though it appears
   nowhere in dist/landing.html.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, per 01-hero.mjs note 1.
      `.lnd-pair__grid` is `grid-template-columns:minmax(0,1fr) minmax(0,1fr)`
      with `align-items:center` (css/landing.css:113-115), and its two children
      are the photograph's widget wrapper and the copy container, both real grid
      items.

   2. THE PHOTOGRAPH IS AN image() WIDGET, per the standing rule that Empower
      must be able to change photographs through the media library and the
      Image widget owns its own markup (recipe section 3).

   3. AND IT COSTS THE ONE REPAIR THIS PAGE WAS PRICED ON, because the class is
      on the <img> ITSELF in the static build and image() puts `cssClass` on the
      WRAPPER (factory.mjs, WIDGET_CSS_CLASS_KEY).

      css/landing.css:119-120 is `.lnd-pair__photo{display:block;width:100%;
      height:clamp(300px,32vw,460px);object-fit:cover;
      border-radius:var(--radius-media)}` and dist/landing.html:258 puts that
      class on the <img>. Converted, all five declarations land on
      `div.elementor-element...lnd-pair__photo`, and the real <img> two levels
      inside it takes Elementor's own `.elementor img{height:auto;
      max-width:100%;border-radius:0}` (0,1,1) instead. So the wrapper is the
      right height and the photograph is not: at 1243x1580 intrinsic in a
      half-width column it renders several hundred pixels taller than the box
      that is supposed to crop it, with `overflow` visible.

      COMPARE THE HERO'S PHOTOGRAPH, which has the SAME five declarations and
      costs nothing. css/landing.css:73-74 is `.lnd-hero__mark img{...}`, a
      DESCENDANT selector, so it reaches the real <img> straight through both
      wrapper divs. Same declarations, different carrier, and only one of them
      survives conversion. The tell is which element the class is on in the
      static build, not what the rule says. This is the SECOND cost category
      and the same family as `.c2-panel__bg` and `.em-join__wash`, whose repair
      also targets the <img> rather than the wrapper.

      THE REPAIR IS `height:100%` AND NOT THE CLAMP RESTATED, deliberately. The
      wrapper already carries the clamp, because it carries the class, and it is
      the grid item whose height the design is actually setting; the <img> only
      needs to fill it. Restating the clamp on the <img> would work today and
      would silently disable any future responsive override of it, which is the
      trap recipe section 5 records. `.elementor-widget-container` needs
      `height:100%` too, because it sits between the two and would otherwise
      shrink-wrap and give the <img>'s percentage nothing to resolve against.
      `border-radius` and `display:block` ARE restated on the <img>, because
      Elementor sets both on it directly (`border-radius:0`, and
      `display:inline-block` from widget-image.min.css) and a square photograph
      inside a rounded box is a visible difference.

      THE @media COUNTERPART WAS CHECKED IN THE SAME PASS and there is none:
      css/landing.css's `@media (max-width:820px)` block (:133-136) declares
      only `grid-template-columns`, `row-gap` and `.lnd-pair--flip`'s `order`.
      The hero's photograph DOES have one (:78, inside `@media (max-width:900px)`),
      and it is the same descendant selector, so it reaches the same element and
      needs nothing.

   4. `data-reveal="clip"` RIDES ON THE WIDGET WRAPPER through `_attributes`,
      per 01-hero.mjs note 7. The wrapper and the <img> are the same box once
      note 3's repair lands, so css/motion.css's `clip-path` and `transform`
      draw the same reveal on the same rectangle they draw in the static build.

   5. `.lnd-pair--flip` APPEARS NOWHERE IN dist/landing.html AND IS MEASURED
      ANYWAY, because it is the first thing a second instance of this block will
      use and it is the tenth cost category's exact shape.
      css/landing.css:117 is `.lnd-pair--flip .lnd-pair__photo{order:2}` and
      :135 is the same selector taking `order:0` below 820px. `order` is a
      GRID-ITEM property, and the tenth and eleventh categories are both "an
      item property on an element that becomes an inner node".

      IT SURVIVES, and it survives for the same reason note 3 breaks: the class
      landed on the wrapper, and the wrapper IS the grid item. The one accident
      costs the photograph its crop and saves the modifier. Verified in the
      browser by adding `lnd-pair--flip` to the section on both sides and
      reading the column each child lands in; the report records the numbers.

   6. `.lnd-pair__link` IS ONE html() WIDGET carrying the whole <p>, which is
      Route A. dist/landing.html:268-270 wraps a single anchor in a paragraph
      that holds no prose, which is recipe section 7's case exactly, and a
      link() would render Elementor's own `a.elementor-button` where
      css/landing.css:128 addresses `.lnd-pair__link a`.

      KEEPING THE <p> IS WHAT KEEPS THE MARGIN RIGHT, and the margin is not the
      one the file appears to set. `.lnd-pair__link{margin:0}` (:127) is
      0,1,0 and `.lnd-pair__copy p{margin:0 0 var(--space-5);max-width:52ch}`
      (:125-126) is 0,1,1, so the paragraph rule wins and `.lnd-pair__link`'s
      own `margin:0` NEVER APPLIES, in the static build as well as in the
      converted one. Recorded rather than repaired: the static build is frozen
      and fidelity means reproducing what it does, not what it meant. It is the
      same shape as the open item `css/solution.css:276` carries. Inside an
      html() widget the <p> is still a descendant of `.lnd-pair__copy`, so both
      rules keep matching in the same order and the live page pays the same
      20px the static one does.

      WHAT IT COSTS, per recipe section 7: nothing in census(), because the <p>
      survives as a <p> and keeps its key. The anchor stops being retargetable
      from Elementor's panel, the same cost `.mla-receive__back`, `.wa-jump`,
      `.ta-jump`, `.sb-more`, `.aba-hero__act` and `.gvc-give__act` accepted.

      AND ONE THING TO WATCH ON IT, predicted before deploying: css/landing.css
      :127-128 gives `.lnd-pair__link a` `text-underline-offset:4px` and NO
      `text-decoration`, so the design is relying on the UA underline and
      Elementor's `.elementor a{text-decoration:none}` at 0,1,1 removes it. The
      EIGHTH cost category, and the second instance of it on this page after
      `.lnd-hero__aside` (01-hero.mjs note 6). Repaired in one grouped bridge
      block for both, not two.

   7. `id="pair-title"` IS AUTHORED IN THE MARKUP, on the real <h2>, per
      01-hero.mjs note 8.

   8. THE SECTION COMMENT IS DISPLACED PAST THE PHOTOGRAPH, and that is
      recorded rather than hidden. dist/landing.html:251-254 sits above the
      <section>; the section's first child is the image widget, which has no
      markup string of its own, so the first authorable point inside the section
      is the copy column's <h2>. education/03-problem.mjs note 7 made the
      mirror-image trade in the same situation, carrying a figure's comment at
      the END of the preceding paragraph. Here there is no preceding widget, so
      the comment lands after the photograph rather than before it.

   9. NO PROSE REPAIR IN THIS BLOCK, walked rather than assumed.
      `.lnd-pair__copy p` (:125) has NO `:last-child` companion anywhere in
      css/landing.css, so every paragraph in the column, the link paragraph
      included, carries the same `var(--space-5)` on both sides and nothing
      over-matches. Block 28 is not in play here; it is in play in block 2 only.

  10. NO MARGIN COLLAPSE, per 02-ask.mjs note 7: nothing on this page declares
      a top margin, so no adjacent pair can collide when Elementor makes
      `.lnd-pair__copy` a flex column. */

/* Copied from dist/landing.html:251-254, indentation included. The middot is
   the source's, per 00-note.mjs note 5. Carried at the copy column's heading
   per note 8. */
const BLOCK_NOTE = '<!-- BLOCK 3 · IMAGE AND TEXT PAIR\n'
  + '     The workhorse block. Photograph one side, a short passage the other, and a\n'
  + '     modifier that flips the sides so two of these can sit on one page without\n'
  + '     reading as a repeat. Nothing in it is campaign-specific except the words. -->';

const HEAD = 'Why it mattered';

/* dist/landing.html:263-265, three source lines joined with single spaces. */
const PAIR_1 = 'Every family on that list had already been told their child qualified. '
  + 'What they were waiting on was money, and the wait was measured in '
  + 'school years.';

/* dist/landing.html:266-267. */
const PAIR_2 = 'Mississippi families told us what that meant in their own words, and '
  + 'those stories did more to move this than any argument we made.';

/* Copied from dist/landing.html:268-270, attribute order and the curly
   apostrophe included. */
const LINK = '<p class="lnd-pair__link">\n'
  + '          <a href="https://empowerms.org/lauren-washington-a-hopeless-fight-for-an-esa/">'
  + 'Lauren Washington’s fight for an ESA</a>\n'
  + '        </p>';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'lnd-pair',
      content_width: 'full',
      _attributes: 'aria-labelledby|pair-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container({ cssClass: 'lnd-pair__grid', content_width: 'full' }, [
          image({
            ...photo('family-outdoors-park'),
            cssClass: 'lnd-pair__photo',
            _attributes: 'data-reveal|clip',
          }),
          container(
            { cssClass: 'lnd-pair__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({
                markup: `${BLOCK_NOTE}\n<h2 id="pair-title">${HEAD}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
              text({ markup: `<p>${PAIR_1}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${PAIR_2}</p>`, _attributes: 'data-reveal|rise' }),
              html({ markup: LINK, _attributes: 'data-reveal|rise' }),
            ],
          ),
        ]),
      ]),
    ],
  );
}
