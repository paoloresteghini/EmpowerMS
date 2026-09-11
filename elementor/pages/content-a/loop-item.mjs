import { container, heading, image, text, elementId } from '../../factory.mjs';

/* ONE CARD DESIGN, FOUR DEPLOYED TEMPLATES.

   Source of truth: the <li class="cad-card"> shape in
   src/content-a/sections/02-browse.html, which is identical in all nineteen
   plain cards and all four lead cards apart from its `data-type`, its
   `data-topic` and the `cad-card--lead` / `cad-card__photo--whole` modifiers.

   WHY FOUR TEMPLATES AND NOT ONE. Each of the page's four bands is its own Loop
   Grid, and a Loop Item template is a single elementor_library post: whatever
   it emits, it emits for every item of every grid that points at it. `data-type`
   is per BAND, not per post, and the static build proves it: every card in the
   Articles band carries data-type="article", including the three bill summaries
   whose WordPress category is Bill Summaries, and the four cards in the
   Research & Reports band carry data-type="research" while carrying no research
   term at all (there is no such category on this install; see 02-browse.mjs's
   own note). So `data-type` cannot be derived from a post's terms without
   getting the research band wrong on every one of its cards.

   `data-topic` is the opposite: it IS per post, it IS derivable, and it is the
   one the filter actually reads on a card (css/content-a.css:335-338). It comes
   from wp/empowerms-child/inc/content-loop.php, for the reason that file's
   docblock gives.

   The cost of four templates is four elementor_library posts, and it is paid
   once: this module is the single source of the card's structure, and
   loopItem() is called four times with four literal `data-type` values. There
   is no copy of this tree anywhere.

   Structural decisions:

   1. THE CARD IS A CONTAINER, NOT AN <li>, and the list semantics are lost.
      Elementor's Container html_tag control offers div, header, footer, main,
      article, section, aside, nav and a; no `li` and no `ul`. Identical to
      podcast-a/03-library.mjs note 8, and `.cad-cards`'s own
      `list-style:none;margin:0;padding:0` are harmless no-ops on the loop
      grid's wrapper. What is lost is the "list of N items" a screen reader
      would otherwise announce. Reported, not fixed: no container option
      restores it. Elementor's own loop container does carry `role="list"`,
      which recovers part of it, and that was read off a real render rather
      than assumed.

   2. `_element_cache: 'yes'` ON THE CARD CONTAINER IS NOT OPTIONAL.
      inc/loop-attributes.php's docblock and podcast-a/03-library.mjs's own
      note carry the full account: Elementor's per-template element cache
      renders a loop item ONCE per page load and reuses that HTML for every
      subsequent iteration unless the element is deferred to a per-request
      [elementor-element] shortcode, which happens automatically only for
      elements already carrying a __dynamic__ setting. This container carries
      none of its own (data-topic comes from a PHP hook, not a tag), so without
      this control the hook fires once and every other card on the page serves
      the first post's data-topic. That is a page whose titles and dates vary
      correctly while its filter hides the wrong cards, which reads as correct
      at a glance and is not.

      Its CHILDREN need nothing extra. The cache is built by
      Document::print_elements() over the template's TOP-LEVEL elements only, so
      once this container is deferred its whole subtree renders fresh per
      request, the meta line's shortcode included.

   3. `data-type` IS A LITERAL `_attributes` VALUE, and `data-reveal="rise"`
      rides alongside it, both on the card container. That matches the source,
      where both sit on the <li> itself. The card is the reveal element and
      NOTHING inside it that animates on hover is one, which css/content-a.css's
      own header (:26-31) says is deliberate: motion.css replaces an element's
      own `transition`, so the hover work is done by ::after, by the photograph
      and by the link, none of which carries data-reveal.

   4. THE PHOTOGRAPH IS AN image() WIDGET WITH A DYNAMIC FEATURED IMAGE, which
      is what makes the Loop Grid decision cost no media imports and add nothing
      to the alt-text queue: every post in all four bands already has a featured
      image on this install (checked, 0 of 27 Community Stories, 0 of 33 Press
      Releases and 1 of 141 in the Articles band without one; the one exception
      is named in the task report). It stays an image() rather than markup for
      recipe section 3's reason: Empower must be able to change photographs
      through the media library, and the Image widget owns its own markup.

      IT COSTS THE SECOND COST CATEGORY. `image()` puts cssClass on the WRAPPER
      (factory.mjs, WIDGET_CSS_CLASS_KEY) and dist/content-a.html puts
      `cad-card__photo` on the <img>, so `aspect-ratio:3/2`, `object-fit:cover`
      and the hover transform all land on a div and the real <img> two levels
      inside takes Elementor's own `.elementor img{height:auto}`. Same family as
      `.lnd-pair__photo` (bridge block 43) and repaired the same way.

      AND `cad-card__photo--whole` IS DROPPED. Five of the twenty-three static
      cards carry it (`object-fit:contain` and padding, so a campaign card's own
      type is not cropped in half). It is a per-CARD modifier chosen by eye,
      which a Loop Grid cannot express and which nothing here should infer from
      an attachment's dimensions: which images are "cards rather than
      photographs" is an editorial judgement the source made by looking at them.
      A visible difference from the static build, recorded in the task report
      rather than buried here.

   5. THE TITLE IS A heading() WIDGET, THE PAGE'S ONLY ONE, and it is the named
      exemption podcast-a/03-library.mjs's own note 6 and bridge.css's R10 case
      establish. Two dynamic tags have to bind to one element (post-title into
      `title`, post-url into `link`), and a text() widget's single editor field
      cannot do that. `header_size: 'h3'` rather than podcast-a's 'span',
      because dist/content-a.html's card title IS an <h3> and the page's heading
      outline depends on it: the <h1> is the hero, the visually hidden "Browse
      all content" and the four band titles are <h2>s, and every card title is
      an <h3> under its band.

      `.cad-card__title` LANDS ON THE WRAPPER, which is the R10 trade-off this
      whole phase names: colour inherits down to the <a> and works, and
      font-size, line-height and margin do NOT, because the <h3> takes
      tokens/base.css's own `h3{font-size:var(--fs-h3);margin:0 0 var(--space-4)}`
      and Elementor's `.elementor-heading-title{line-height:1}` instead of
      `.cad-card__title`'s `--fs-h5`, `1.3` and `0`. Repaired in bridge.css,
      named to this class, exactly as `.pca-ep__title` is.

      `.cad-card__title a::before{inset:0}` (css/content-a.css:289), which makes
      the whole plate the click target, is a DESCENDANT selector, so it reaches
      the real <a> through the wrapper and the <h3>. Its containing block is the
      nearest positioned ancestor, and that is `.cad-card` itself
      (css/content-a.css:208 gives it `position:relative`), because Elementor
      positions no widget wrapper. Predicted to survive; measured.

   6. THE META LINE IS ONE text() WIDGET HOLDING ONE SHORTCODE, and that is the
      decision worth reading in this file. See
      wp/empowerms-child/inc/content-loop.php's docblock for the full argument;
      in short, no dynamic tag can produce it. post-terms renders the TERM's
      name for EVERY category the post carries, so card 20503 would read
      "Education Empower News" where the design asks for "Quality Education",
      and it wraps each term in a bare <span> with no class. The date needs a
      <time datetime> element that post-date does not emit at all.

      WHAT THIS BUYS BEYOND CORRECTNESS: `.cad-card__meta`, `.cad-card__topic`,
      `.cad-card__date` and `<time>` are all REAL elements carrying their own
      classes, inside one rendered string, so `.cad-card__meta`'s
      `display:flex` with no `flex-direction` (css/content-a.css:276) costs
      NOTHING. Built as a container it would have been the sixth cost category
      and one more bridge rule. That is recipe section 6's "target inside ONE
      authored markup string: no rule", arrived at from the other direction.

      THE WIDGET'S CONTENT IS THE BARE SHORTCODE, with even the outer
      `.cad-card__meta` span coming from PHP. parse_text_editor() runs the
      `widget_text` filters, then shortcode_unautop(), then do_shortcode(), and
      shortcode_unautop() only unwraps a shortcode STANDING ALONE. A shortcode
      nested inside an authored `<span>` is not that shape and risks coming back
      inside a <p> carrying tokens/base.css's paragraph margins. content-loop.php's
      own docblock records this from the other side.

      The class therefore travels in the shortcode's output rather than in this
      file, and the widget carries no cssClass either way, per the
      class-in-markup rule factory.mjs's text() enforces.

   7. `.cad-card__body` IS A CONTAINER AND COSTS NOTHING. css/content-a.css:218
      declares `display:flex` AND `flex-direction:column`, so Elementor's
      `.e-con-full.e-flex{flex-direction:var(--flex-direction)}` at 0,2,0 has
      nothing to take: the build's own declaration is on the same element and
      the direction it asks for is the one Elementor imposes anyway. The `gap`
      and `padding` are 0,1,0 against Elementor's own 0,1,0 and win on source
      order, this file's stylesheet loading after Elementor's.

   8. THE LEAD CARD IS NOT BUILT HERE AND CANNOT BE. `.cad-card--lead` is a
      per-item modifier on the first card of each band, and one template cannot
      vary per item. It is restored by position in bridge.css instead, named to
      `.cad-cards`. 02-browse.mjs's note 6 carries the decision and its
      reasoning; this note exists so that a reader of this file does not go
      looking for the modifier here. */

/* Elementor's Custom Attributes control always quotes every value
   (Utils::render_html_attributes()), so a valueless HTML attribute is written
   "key|" and reaches the markup as key="". Same convention every section
   module in this build uses. */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* The shortcode registered by wp/empowerms-child/inc/content-loop.php. It is
   the widget's ENTIRE content, on its own line and wrapped in nothing, which is
   what lets shortcode_unautop() strip the <p> wpautop may have put round it
   before do_shortcode() expands it. It emits the `.cad-card__meta` span itself.
   See note 6. */
const META_SHORTCODE = '[empower_content_a_meta]';

/* The four values `data-type` takes, and the four bands that carry them, read
   off src/content-a/sections/02-browse.html's four <section class="cad-band">
   elements in source order. Exported so 02-browse.mjs and the deploy path name
   the same four things rather than two lists that can drift. */
export const BAND_TYPES = ['article', 'story', 'research', 'press'];

/* The four elementor_library posts created on empv2 on 2026-08-19 to hold the
   four Loop Item templates, one per band. Created and termed with:

     wp post create --post_type=elementor_library --post_status=publish \
       --post_title='Content A card: <band>' --porcelain
     wp post term set <ID> elementor_library_type loop-item

   Keyed by band type so a reader can see which id belongs to which band without
   counting positions in an array, and so page.mjs's deploy loop cannot pair a
   template with the wrong band. */
export const LOOP_ITEM_POST_IDS = {
  article: 20614,
  story: 20615,
  research: 20616,
  press: 20617,
};

/* The element tree of one card, for one band.
 *
 * Returns the ARRAY a Loop Item template's _elementor_data is (a document's
 * top-level elements), which is the shape deployLoopItem() expects. */
export function loopItem(dataType) {
  if (!BAND_TYPES.includes(dataType)) {
    throw new Error(`loopItem: dataType must be one of ${BAND_TYPES.join(', ')}, got ${JSON.stringify(dataType)}`);
  }

  return [
    container(
      {
        cssClass: 'cad-card',
        content_width: 'full',
        _attributes: `data-type|${dataType}\ndata-reveal|rise`,
        _element_cache: 'yes',
      },
      [
        image({
          id: '',
          url: '',
          cssClass: 'cad-card__photo',
          __dynamic__: { image: dynamicTag('post-featured-image') },
        }),
        container({ cssClass: 'cad-card__body', content_width: 'full' }, [
          text({ markup: META_SHORTCODE }),
          heading({
            text: 'Add Your Heading Text Here',
            tag: 'h3',
            cssClass: 'cad-card__title',
            link: { url: '' },
            __dynamic__: {
              title: dynamicTag('post-title'),
              link: dynamicTag('post-url'),
            },
          }),
        ]),
      ],
    ),
  ];
}
