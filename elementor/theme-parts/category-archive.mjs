import { container, text, loopGrid } from '../factory.mjs';
import { LOOP_ITEM_POST_IDS } from '../pages/content-a/loop-item.mjs';

/* THE CATEGORY ARCHIVE, ONCE, FOR EVERY TERM IN THE CATEGORY TAXONOMY.
 *
 * WHAT IT REPLACES. Category archives render through a Beaver Themer archive
 * layout, the last part of this site still doing so. wp/empowerms-child/
 * archive.php has asked Elementor for the `archive` location since it was
 * written and has never had a template assigned to find, so its plain-list
 * fallback is what a visitor sees today. Same state search.php was in before
 * the search archive was built, and the same fix.
 *
 * WHY IT MATTERS NOW. The post single conversion (theme-parts/post-single.mjs)
 * gave every one of the 490 posts an eyebrow that LINKS its primary category:
 *     <a class="ps-eyebrow__cat" href="/category/community-stories/">
 * so 490 converted pages currently hand visitors to a Beaver page.
 */

/* THE CONDITION IS TWO LEVELS, AND THE THREE-LEVEL FORM IS THE TRAP.
 *
 * Elementor Pro registers `Taxonomy` as a sub-condition of
 * `Post_Type_Archive`, which reads as a nesting and is not one.
 * Conditions_Manager::parse_condition() is
 *
 *     list($type,$name,$sub_name,$sub_id) = array_pad(explode('/',$c),4,'');
 *
 * and the match that follows is FLAT: `get_condition($name)->check([])`, then,
 * only if that passed, `get_condition($sub_name)->check(['id'=>$sub_id])`.
 * Names are looked up in one global registry, never by path.
 *
 * So the form the class hierarchy suggests, `include/archive/post_archive/
 * category`, parses as name=archive, sub_name=post_archive, sub_id=category,
 * and runs `Post_Type_Archive::check()`, which is
 * `is_post_type_archive('post') || is_home()` and FALSE on a category archive.
 * `Taxonomy::check()` never runs at all. The template would deploy, look
 * correct in the editor, and never appear on a page.
 *
 * The form below runs `Archive::check()` (`is_archive()`, true), then
 * `Taxonomy::check()`, which casts an absent sub_id to `(int) '' = 0`, and
 * `is_category(0)` is true for any category archive. Two levels, the same
 * shape as `include/archive/search` and `include/singular/post`.
 *
 * A sub_id would pin this to one term (`include/archive/category/9`). This
 * template serves all of them, so there is none. */
/* The elementor_library post that holds this template. Created on empv2 on
 * 2026-08-26 with, over SSH like everything else on this install:
 *
 *   wp post create --post_type=elementor_library --post_status=publish \
 *     --post_title='Category archive' --porcelain
 *
 * elementor/deploy-archive.mjs writes its `_elementor_template_type` as
 * 'archive'; the condition is set separately by setConditions(), because a
 * template with correct data and no location is resolved from a CACHED option
 * at render time and simply never appears.
 * docs/elementor/theme-part-mechanism.md records the hour that cost. */
export const CATEGORY_ARCHIVE_POST_ID = 20644;

/* TWO CONDITIONS, ONE DOCUMENT, since 2026-08-27. The second is the posts page
 * -- /updates/, titled "News", WordPress's own page_for_posts -- which was the
 * last listing still rendering through Beaver Themer's layout 11248.
 *
 * `post_archive` is the Post_Type_Archive condition's own name: get_name()
 * builds it as the post type plus '_archive'. Both of its checks pass on a
 * page_for_posts request, which is what makes the two-level form work here as
 * it does for `category`: Archive::check() is
 * `is_archive() || is_home() || is_search()`, and Post_Type_Archive::check() is
 * `is_post_type_archive('post') || is_home()`.
 *
 * ONE TEMPLATE RATHER THAN TWO, because the two pages differ in exactly one
 * string: what the head is titled. A category archive is titled by its term, the
 * posts page by its own page title, and inc/archive.php's title shortcode
 * answers both. Two templates differing in one string is two things to keep in
 * step, and this build has paid that bill more than once already. */
export const CATEGORY_ARCHIVE_CONDITIONS = [
  'include/archive/category',
  'include/archive/post_archive',
];

/* HOW MANY POSTS PER PAGE, and why a number rather than the site default.
   The terms this serves run from 27 posts (Community Stories) to 147
   (Education), counted with `wp term list category`, so pagination is not an
   edge case on any of them: at 12 the smallest term is 3 pages and the largest
   13. Twelve is four rows of the three-column grid content-a uses and two rows
   of its two-column tablet layout, so no page ends on a short row at either
   breakpoint. Pagination itself is the Loop Grid widget's own behaviour, not a
   separate element, exactly as on the search archive. */
const PER_PAGE = 12;

/* Registered by wp/empowerms-child/inc/archive.php. Each is the ENTIRE content
   of its widget, alone on its own line and wrapped in nothing, which is what
   lets Elementor's parse_text_editor() run shortcode_unautop() over it before
   do_shortcode() expands it. Same arrangement as inc/post-single.php's three. */
const TITLE_SHORTCODE = '[empower_archive_title]';
const COUNT_SHORTCODE = '[empower_archive_count]';

export function categoryArchive() {
  return [
    /* THE HEAD CARRIES NO DESCRIPTION, and that is a finding rather than a
       preference: all ten category descriptions are empty on the install
       (`wp term list category --fields=slug,description`, 2026-08-26). Writing
       ten lines here would be invented copy reading as approved copy, which is
       the pattern already logged against the "Our north star" statement. The
       descriptions are Empower's to supply; when they arrive this band gains a
       third shortcode and nothing else changes. */
    container(
      {
        tag: 'section',
        cssClass: 'ca-head',
        content_width: 'full',
        _attributes: 'aria-labelledby|archive-title\ndata-reveal-entrance|',
      },
      [
        container(
          { cssClass: 'em-container', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: TITLE_SHORTCODE, _attributes: 'data-reveal|rise' }),
            text({ markup: COUNT_SHORTCODE, _attributes: 'data-reveal|rise' }),
          ],
        ),
      ],
    ),

    container({ tag: 'section', cssClass: 'ca-list', content_width: 'full' }, [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        loopGrid({
          /* content-a's ARTICLE card, by post id. See the gate for why this is
             an id and not a copied tree. */
          templateId: LOOP_ITEM_POST_IDS.article,
          cssClass: 'cad-cards',
          columns: 3,
          columns_tablet: 2,
          columns_mobile: 1,
          posts_per_page: PER_PAGE,
          /* THE EMPTY STATE, AND THE SWITCH THAT MAKES IT EXIST. These terms
             and these posts are Empower's, and a category can empty out
             between one deploy and the next; `uncategorized` sits at 0 today.
             Without this the page renders a heading above a blank band, which
             is the listing failing silently.

             BOTH SETTINGS OR NEITHER: `enable_nothing_found_message` is a
             switcher registered with no default, and the text control is
             conditioned on it, so text alone renders nothing. That is not a
             hypothetical; it is what search-archive.mjs shipped. */
          /* PAGINATION IS A SETTING, NOT A BEHAVIOUR YOU GET. Elementor's
             pagination trait is `! empty( $settings['pagination_type'] )`, no
             default, so a grid that omits this key renders its first page and
             silently drops the rest. /category/education/ holds 147 posts; at
             12 a missing key hides 135 of them.

             PAGE RELOAD, NOT AJAX. Page two gets a real URL
             (/category/education/page/2/) that can be linked and indexed, and
             the listing keeps working with JavaScript off, which is the same
             reason this build's filters are CSS. */
          pagination_type: 'numbers_and_prev_next',
          pagination_load_type: 'page_reload',
          enable_nothing_found_message: 'yes',
          nothing_found_message_text: 'Nothing in this category yet.',
          /* No post_query_* overrides. An archive template renders the query
             WordPress already resolved for the term; naming a query here would
             replace it and show the same posts on every category. */
          _attributes: 'data-cms|loop\ndata-cms-item-attrs|data-topic\ndata-reveal-group|',
        }),
      ]),
    ]),
  ];
}
