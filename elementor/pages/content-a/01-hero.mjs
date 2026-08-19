import { container, text } from '../../factory.mjs';

/* Source of truth: src/content-a/sections/01-hero.html and its built form at
   dist/content-a.html:168-181. Every class, string and attribute below is read
   from those files, not typed from memory.

   THE SMALLEST SECTION ON THE PAGE, and the only one the Loop Grid decision
   does not touch: three strings, no photograph, no action. The page's whole
   cost is in 02-browse.mjs.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, for the reason every prior section
      module records: a boxed container inserts div.e-con-inner between itself
      and its children, and `.cad-hero__grid` (css/content-a.css:64-65) is a
      two-column CSS grid whose two items have to be its DIRECT children.

   2. THE GRID HAS TWO ITEMS AND ONE OF THEM IS A WIDGET WRAPPER.
      `.cad-hero__grid`'s children in the source are `<div class="cad-hero__copy">`
      and `<p class="cad-hero__lede">`. The first is a container; the second is a
      text() widget, so the element the grid places is
      `div.elementor-widget-text-editor` and the real `<p>` sits inside it. That
      is the tenth/eleventh cost category's shape and it is predicted to cost
      NOTHING here, for a reason specific to this grid: both tracks are sized
      with `fr` units (`minmax(0,1fr) minmax(0,.85fr)`), so the track width does
      not depend on the item's content, and `.cad-hero__lede`'s own
      `max-width:46ch` still applies to the real `<p>` inside the wrapper. The
      only property that could differ is the cross-axis alignment
      (`align-items:center`), and the wrapper's height IS the paragraph's
      height, so centring the wrapper and centring the paragraph land in the
      same place. Measured rather than assumed; the task report carries the
      numbers.

   3. `id="hero-title"` IS AUTHORED IN THE MARKUP, on the real <h1>, because
      that is where dist/content-a.html:173 puts it and it is what the section's
      own `aria-labelledby` points at. `_element_id` would put it on the widget
      wrapper, which is a different element from the one the label names. Same
      move landing/01-hero.mjs note 8 and podcast-a/03-library.mjs record.

   4. NO HEADING WIDGET. The <h1> ships inside a text() widget carrying the tag
      itself, which is what class-in-markup means here: css/content-a.css:74 is
      `.cad-hero h1{...}`, a DESCENDANT selector, so it reaches the real <h1>
      through both of the widget's wrapper divs and needs no repair, and
      Elementor's own `.elementor-heading-title{line-height:1}` never enters the
      cascade because no heading widget is built. The one heading widget on this
      page is the loop item's card title, and it is a named exemption for the
      reason loop-item.mjs's note 5 gives.

   5. `data-reveal` RIDES ON THE WIDGET WRAPPERS AND ON THE CONTAINERS through
      `_attributes`, this build's standing convention, read off the source
      element by element: the section carries `data-reveal-entrance`,
      `.cad-hero__grid` carries `data-reveal-group`, and the eyebrow, the <h1>
      and the lede each carry `data-reveal="rise"`.

   6. THE HERO'S MASK IS A ::before ON THE SECTION ITSELF
      (css/content-a.css:51-58), using `patterns/hex-lattice.svg`. It is not
      built here because a pseudo-element cannot be; what it needs is the file
      reaching the install, which wp/sync.mjs's FROM_ROOT now carries after two
      phases of it 404ing. Confirmed rendering on the deployed page rather than
      assumed, per recipe step 6. */

const EYEBROW = 'Empower Mississippi';
const TITLE = 'All Content';

/* dist/content-a.html:176-179, four source lines joined with single spaces,
   which is what census()'s whitespace normalisation reduces the static build's
   newlines and indentation to. */
const LEDE = 'Everything we publish, in one place: the arguments, the people '
  + 'behind them, the research underneath them and the record of what '
  + 'changed. Start with what you are looking for, then narrow it to the work '
  + 'it belongs to.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'cad-hero',
      content_width: 'full',
      _attributes: 'aria-labelledby|hero-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'cad-hero__grid', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            container({ cssClass: 'cad-hero__copy', content_width: 'full' }, [
              text({
                markup: `<p class="cad-eyebrow">${EYEBROW}</p>`,
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: `<h1 id="hero-title">${TITLE}</h1>`,
                _attributes: 'data-reveal|rise',
              }),
            ]),
            text({
              markup: `<p class="cad-hero__lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
      ]),
    ],
  );
}
