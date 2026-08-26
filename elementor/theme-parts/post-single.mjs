import { container, text, html, loopGrid, elementId } from '../factory.mjs';
import { LOOP_ITEM_POST_IDS } from '../pages/content-a/loop-item.mjs';

/* THE ARTICLE PAGE, ONCE, FOR ALL 490 POSTS.
 *
 * WHAT IT REPLACES. Every published post on this install rendered through a
 * Beaver Themer layout, "Post Singular" (fl-theme-layout 11272), which owned
 * the whole page. This is an Elementor Theme Builder SINGLE template
 * (`single-post`, conditioned `include/singular/post`), so one tree serves all
 * 490 and 11272 goes to draft. Same move, and the same arithmetic, as the
 * person single that replaced eighteen hand-filled bios.
 *
 * THE SURVEY THAT JUSTIFIED DOING IT THIS WAY, counted on empv2 2026-08-23
 * rather than estimated:
 *
 *     561  published posts and pages outside the converted set
 *     490  of them posts
 *       2  of those 490 built in Beaver BUILDER
 *      45  Beaver Builder PAGES, which are the real per-page conversions
 *
 * So 488 of the 490 are plain editor content wearing one template. The whole
 * population is a template job. The only thing that varies across it is
 * length: median 2,811 characters, shortest 106, longest 25,362, none empty.
 *
 * THE DESIGN IS A PROPOSAL, NOT A TRANSCRIPTION. There is no signed-off design
 * for a post detail page. The roadmap lists "Article Template" under Templates
 * to Build, beside Research, Community Story and Press Release templates, and
 * specifies none of them. Paolo chose the build's own language over
 * reproducing the Beaver page on 2026-08-23, the reasoning being that the
 * header and footer are already ours, so a page keeping Beaver's centred
 * orange NEWS band would put the old site inside the new chrome. Every device
 * used here is already in the signed-off set: the 56x4 orange mark from
 * css/content-a.css:196, the display headline from css/team-bio.css:99, the
 * reading measure from css/team-bio.css:112, and content-a's own cards.
 *
 * FOUR TEMPLATES, NOT ONE, EVENTUALLY. The roadmap wants a different template
 * per content type, and this install already has four card designs to match
 * (content-a's article / story / research / press Loop Items). This is the
 * base: differentiating later is additional `single-post` documents with
 * narrower conditions (`include/singular/post/in_category/133`), not a rewrite
 * of this one. Nothing here is in the way of that.
 *
 * WHAT IS DYNAMIC. Four things vary per post: the eyebrow, the headline, the
 * photograph and the body. The body is Elementor's own theme-post-content
 * widget; the other three are shortcodes from
 * wp/empowerms-child/inc/post-single.php, and that file's docblock gives the
 * reason for each. The short version is that no dynamic tag can put an id on
 * an <h1>, pick ONE category from a taxonomy holding both types and topics, or
 * render nothing at all for the 95 posts with no featured image.
 *
 * THE 95 ARE THE REASON THE PHOTOGRAPH IS A SHORTCODE AND NOT AN image().
 * Elementor's Image widget fed a post-featured-image tag renders its own grey
 * placeholder when the post has none. That is 95 pages carrying a box where a
 * photograph is supposed to be, and no CSS can tell the two cases apart. It
 * also buys back `fetchpriority="high"` on the page's LCP element, which
 * person-single.mjs's note 5 records as an unrepairable cost on the bio pages
 * for exactly the opposite reason: there the portrait IS an Image widget.
 *
 * THE RELATED GRID IS A QUERY ID, not a term filter written into the widget.
 * `post_query_query_id: 'empower_post_related'` and the matching
 * `elementor/query/{id}` action in inc/post-single.php, which is the mechanism
 * the /team/ roster already uses. It has to be PHP: "related" here means same
 * PRIMARY category, and which category is primary is a decision that file
 * makes, not something Group_Control_Query can express. */

/* Elementor's Custom Attributes control always quotes every value, so a
   valueless HTML attribute is written "key|" and reaches the markup as key="".
   Same helper, same reason, as person-single.mjs. */

/* The elementor_library post that holds this template. Created on empv2 with:
 *
 *   wp post create --post_type=elementor_library --post_status=publish \
 *     --post_title='Post single' --porcelain
 *
 * deployThemePart() writes its `_elementor_template_type` as 'single-post';
 * the condition is set separately by setConditions(), because a template with
 * correct data and no location is resolved from a CACHED option at render time
 * and simply never appears. docs/elementor/theme-part-mechanism.md records the
 * hour that cost the first time. */
export const POST_SINGLE_POST_ID = 20642;

/* `singular` is the condition group and `post` the post type's own
   sub-condition, so this means "every single Post". Not 'include/general',
   which is Entire Site. */
export const POST_SINGLE_CONDITIONS = ['include/singular/post'];

/* The Beaver Themer layout this replaces. Recorded here as well as in the
   deploy script so that turning the conversion off is one documented command
   rather than an archaeology exercise:
   `wp post update 11272 --post_status=publish`. */
export const BEAVER_POST_SINGULAR_ID = 11272;

/* Registered by wp/empowerms-child/inc/post-single.php. Each is the ENTIRE
   content of its widget, alone on its own line and wrapped in nothing, which
   is what lets Elementor's parse_text_editor() run shortcode_unautop() over it
   before do_shortcode() expands it. */
const EYEBROW_SHORTCODE = '[empower_post_eyebrow]';
const TITLE_SHORTCODE = '[empower_post_title]';
const FIGURE_SHORTCODE = '[empower_post_figure]';

const RELATED_QUERY_ID = 'empower_post_related';
const RELATED_COUNT = 3;

const MORE_HEAD = 'More on this';

export function postSingle() {
  return [
    container(
      {
        tag: 'article',
        cssClass: 'ps-article',
        content_width: 'full',
        _attributes: 'aria-labelledby|article-title\ndata-reveal-entrance|',
      },
      [
        container(
          {
            cssClass: 'ps-article__inner em-container',
            content_width: 'full',
            _attributes: 'data-reveal-group|',
          },
          [
            container({ cssClass: 'ps-head', content_width: 'full' }, [
              text({ markup: EYEBROW_SHORTCODE, _attributes: 'data-reveal|rise' }),
              text({ markup: TITLE_SHORTCODE, _attributes: 'data-reveal|rise' }),
            ]),

            /* html(), not text(): the shortcode returns a <figure> and
               Elementor's Text Editor widget runs wpautop over its output,
               which would wrap the figure in a stray <p>. The html() widget
               prints the setting unescaped with a shortcode pass and no
               autop, which is what inc/content-loop.php's own docblock
               records about the difference between the two widgets. */
            html({ markup: FIGURE_SHORTCODE }),

            /* Elementor's own Post Content widget, which is the widget the
               Single document type is built around. `.ps-body` lands on its
               wrapper; every rule beneath it in css/post-single.css is a
               descendant selector that reaches the real elements through that
               wrapper, which is the arrangement `.tp-bio` already uses.

               ONE REVEAL ON THE BLOCK, not one per paragraph: the paragraphs
               are the post's own content and no widget can put an attribute
               inside it. person-single.mjs's note 3 makes the same call for
               the same reason. */
            {
              id: elementId(),
              elType: 'widget',
              widgetType: 'theme-post-content',
              settings: { _css_classes: 'ps-body', _attributes: 'data-reveal|rise' },
              elements: [],
              isInner: false,
            },
          ],
        ),
      ],
    ),

    container(
      {
        tag: 'section',
        cssClass: 'ps-more',
        content_width: 'full',
        _attributes: 'aria-labelledby|more-title',
      },
      [
        container({ cssClass: 'em-container', content_width: 'full' }, [
          container(
            { cssClass: 'ps-more__head', content_width: 'full', _attributes: 'data-reveal-group|' },
            [
              text({
                markup: `<h2 class="ps-more__title" id="more-title">${MORE_HEAD}</h2>`,
                _attributes: 'data-reveal|rise',
              }),
            ],
          ),
          loopGrid({
            /* content-a's ARTICLE card, reused rather than reproduced. The
               four card designs differ in what they emphasise, and article is
               the right default for a mixed related set: it is the only one of
               the four that carries a photograph, a topic and a date without
               assuming the post is a story about a named person. */
            templateId: LOOP_ITEM_POST_IDS.article,
            cssClass: 'cad-cards',
            columns: 3,
            columns_tablet: 2,
            columns_mobile: 1,
            posts_per_page: RELATED_COUNT,
            post_query_post_type: 'post',
            post_query_query_id: RELATED_QUERY_ID,
            _attributes: 'data-cms|loop\ndata-cms-item-attrs|data-topic\n'
              + 'data-reveal-group|',
          }),
        ]),
      ],
    ),
  ];
}
