import { container, heading, text, elementId } from '../factory.mjs';

/* ONE CARD, EVERY POST TYPE THE SEARCH CAN RETURN.
 *
 * Beaver's search results page (post 11325) rendered an archive layout with
 * this build's header and footer wrapped around it: a Beaver card, not one of
 * this build's own. This is the replacement card, the first Loop Item in the
 * build with no static HTML partial behind it. There is no src/ page for
 * search: docs/superpowers/specs/2026-08-20-header-search-design.md is the
 * only source of truth, and it specifies the card's fields (title, kind
 * label, date, excerpt) and one constraint (no photograph), not markup to
 * copy byte for byte. Everything below is this file's own design, built to
 * read like the rest of the build rather than to match a partial that does
 * not exist.
 *
 * NO PHOTOGRAPH, AND THIS IS THE ONE CARD IN THE BUILD WHERE THAT IS NOT A
 * FIDELITY GAP. `empowerms-all-content-pages`'s own rule is that a stock
 * photograph must never sit beside a named person's headline. content-a's
 * four Loop Item templates (elementor/pages/content-a/loop-item.mjs) hold
 * that line by knowing each band's post type in advance and choosing
 * per-band whether a photograph is safe. A search result set is not known in
 * advance: one query can return a person's own page beside an ordinary post,
 * and the same template renders both. A card that sometimes carries a
 * featured image and sometimes does not would need to know, per result,
 * whether that image sits beside a person's own name, which nothing here can
 * determine. The only shape that holds the line without a branch is the one
 * that never carries a photograph at all, which is also the shape a results
 * list of mixed content usually takes anyway.
 *
 * ONE CARD FOR EVERY TYPE MEANS THE CARD MUST NAME THE TYPE. Nothing else on
 * the page does: the query itself does not filter by type, and a card with a
 * title, a date and an excerpt but no kind label would leave a visitor unable
 * to tell a page from a podcast episode from an ordinary post. That label is
 * the one field with no Elementor dynamic tag behind it; see the shortcode
 * note below.
 *
 * `SEARCH_RESULT_ITEM_POST_ID = 20640` ("Search result card", library type
 * loop-item) is fixed by Task 5's brief, Step 1, corrected 2026-08-20: the
 * post already exists on empv2, created by the controller on Paolo's
 * explicit approval, and this task does not create it, verify it, or reach
 * the install at all. */
export const SEARCH_RESULT_ITEM_POST_ID = 20640;

/* Same shape and same convention every Loop Item module in this build uses
 * (content-a/loop-item.mjs, podcast-a/03-library.mjs, final/04-stories.mjs):
 * a per-file local helper, not a shared import, because each file's own
 * dynamic tags need their own unique element ids and nothing else about the
 * helper is shared state. */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

/* The kind label ("Post", "Page", whatever a custom post type's own labels
 * name it) has no Elementor dynamic tag behind it. docs/elementor/
 * schema-4.2.2.md:172-174 lists every dynamic tag name confirmed on this
 * install (post-title, post-date, post-terms, post-excerpt, post-url,
 * post-featured-image, post-id, post-custom-field, archive-title,
 * author-name, site-title, shortcode); none of them reads a post's own post
 * type, because "kind" is not a taxonomy term for post-terms to read. Same
 * category of gap as content-loop.php's own meta line, and the same answer:
 * a small, named PHP shortcode (wp/empowerms-child/inc/search-loop.php,
 * `empower_search_kind`) for the one thing the widget tree cannot express.
 * It is the bare content of a text() widget, exactly the shape
 * content-a/loop-item.mjs's META_SHORTCODE uses, so shortcode_unautop()
 * unwraps it before do_shortcode() expands it. The class travels in the
 * shortcode's own output (`<span class="srs-card__kind">`), not in this
 * file, per the class-in-markup rule factory.mjs's text() enforces. */
const KIND_SHORTCODE = '[empower_search_kind]';

/* The card, as a Loop Item template's top-level elements array, the shape
 * deployLoopItem() expects.
 *
 * `_element_cache: 'yes'` ON THE CARD CONTAINER IS NOT OPTIONAL, for the
 * identical reason podcast-a/03-library.mjs's loopItem() and
 * content-a/loop-item.mjs's note 2 both give in full: Elementor's own
 * per-template element cache renders a Loop Item's TOP-LEVEL elements once
 * per page load and reuses that render for every subsequent iteration,
 * unless an element already carries a __dynamic__ setting of its own. This
 * container carries none (the kind label is a static shortcode string, not
 * a dynamic tag), so without this control every card after the first would
 * serve the first result's cached wrapper, which reads as correct at a
 * glance (titles and dates still vary, because THEY carry __dynamic__) and
 * is not. The children need nothing extra: once the container is deferred,
 * its whole subtree, shortcode included, renders fresh per request.
 *
 * THE TITLE IS A heading() WIDGET, THE NAMED R10 EXEMPTION content-a's and
 * podcast-a's own cards establish: two dynamic tags (post-title into
 * `title`, post-url into `link`) have to bind to one element, and a text()
 * widget's single editor field cannot do that, so this stays a heading()
 * widget with its class on the wrapper rather than moving to markup like
 * every other heading in this build's class-in-markup migration.
 * `header_size: 'h3'`, matching content-a's card title level: the archive
 * page's own <h1> is the query, its results region has an <h2>
 * (search-archive.mjs), and each card title sits one level under that. */
export function searchResultItem() {
  return [
    container(
      {
        cssClass: 'srs-card',
        content_width: 'full',
        _attributes: 'data-reveal|rise',
        _element_cache: 'yes',
      },
      [
        text({ markup: KIND_SHORTCODE }),
        heading({
          text: 'Add Your Heading Text Here',
          tag: 'h3',
          cssClass: 'srs-card__title',
          link: { url: '' },
          __dynamic__: {
            title: dynamicTag('post-title'),
            link: dynamicTag('post-url'),
          },
        }),
        /* Bare dynamic text, no wrapping element: podcast-a/03-library.mjs's
         * own note 7 measured this directly for post-date ("a post-date tag
         * renders bare text with no element of any kind"), and post-excerpt
         * is used the same bare way at final/04-stories.mjs. cssClass lands
         * on the WIDGET wrapper (factory.mjs, WIDGET_CSS_CLASS_KEY), which is
         * the only place either class can land once the content itself is
         * dynamic. */
        text({
          cssClass: 'srs-card__date',
          markup: '',
          __dynamic__: { editor: dynamicTag('post-date', { format: 'default' }) },
        }),
        text({
          cssClass: 'srs-card__excerpt',
          markup: '',
          __dynamic__: { editor: dynamicTag('post-excerpt') },
        }),
      ],
    ),
  ];
}
