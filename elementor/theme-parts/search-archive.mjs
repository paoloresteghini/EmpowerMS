import { container, heading, text, html, loopGrid, elementId } from '../factory.mjs';
import { SEARCH_RESULT_ITEM_POST_ID } from './search-result-item.mjs';

/* THE ELEMENTOR REPLACEMENT FOR BEAVER'S SEARCH RESULTS PAGE.
 *
 * Empower's search results have been rendered by a Beaver Themer archive
 * layout (post 11325) with this build's header and footer around it, so the
 * page looked half-converted and wp/empowerms-child/search.php has in fact
 * never run: `empower_do_elementor_location('archive')` has had nothing
 * assigned to that location to find. This is the first page in the build
 * authored Elementor-first, with no static HTML stage: every other page went
 * static, sign-off, convert (docs/superpowers/specs/2026-08-20-header-search-
 * design.md), and no static reading of a search results page will ever be
 * commissioned, so the structure and copy below are this file's own design
 * rather than a conversion of anything.
 *
 * DOCUMENT TYPE, SUB-TYPE, AND LOCATION ARE THREE DIFFERENT STRINGS, read
 * from Elementor Pro's own Search_Results class rather than guessed:
 * get_type() returns 'search-results' (the value deployThemePart()'s third
 * argument needs, per elementor/deploy.mjs's own THEME_PART_LOCATIONS
 * comment), get_sub_type() returns 'search', and the document EXTENDS
 * Archive and inherits Archive's render location, which stays 'archive'.
 * wp/empowerms-child/search.php:12 asks for that location by name, and the
 * Theme Builder condition `include/archive/search` (SEARCH_ARCHIVE_CONDITIONS
 * below) is what targets a search template specifically rather than every
 * archive.
 *
 * `SEARCH_ARCHIVE_POST_ID = 20639` ("Empower Search Results", library type
 * search-results) is fixed by Task 5's brief, Step 1, corrected 2026-08-20:
 * already created on empv2 by the controller on Paolo's explicit approval.
 * This task does not create it, verify it, or reach the install.
 *
 * STRUCTURE, TOP TO BOTTOM, matching the brief's own ordering:
 *   1. A band echoing the query (the archive title) and the count, and
 *      carrying the search form again.
 *   2. The results grid, a Loop Grid over the query WordPress already
 *      resolved rather than one this file builds.
 *   3. Pagination, which is not a separate element in this tree: it is the
 *      Loop Grid widget's own built-in behaviour (see the loopGrid() call's
 *      own comment below for what is and is not verified about it here).
 *   4. The empty state, which Beaver's page never had: this build's own
 *      test comment names the gap directly ("Beaver's page has the first
 *      and not the second"), and search.php's PHP fallback already treats
 *      "nothing matched" as a routine outcome, calling get_search_form()
 *      again rather than treating it as an edge case. */
export const SEARCH_ARCHIVE_POST_ID = 20639;
export const SEARCH_ARCHIVE_CONDITIONS = ['include/archive/search'];

/* Verbatim in shape, not in class, from header.mjs's SEARCH_PANEL: same
 * label/input/submit trio, same accessibility contract (a real, visible-to-
 * screen-readers label; `data-swplive="false"` to opt the input out of
 * SearchWP Live Ajax Search, active on this install; no `hidden` attribute,
 * so the form works with JavaScript off). Reusing `.em-search__form`,
 * `.em-search__label` and `.em-search__input` literally, not just
 * copying their declarations, is deliberate: bridge.css block 71's rules for
 * those three classes are UNSCOPED (no `.em-search` ancestor qualifier), so
 * this form inherits the exact same layout, label-hiding and input styling
 * as the header's panel with no new CSS at all. The one class NOT reused is
 * `.em-search` itself: that class carries block 71's `:root[data-search=
 * "on"] .em-search{display:none}` visibility toggle, built for the header's
 * closed-by-default overlay, and wrapping this form in it would hide this
 * page's own search field by default. This form's own wrapper class is
 * `srs-head__form`, deliberately not `em-search`, for exactly that reason. */
const SEARCH_FORM = `<form class="em-search__form" role="search" method="get" action="/">
  <label class="em-search__label" for="srs-form-input">Search this site</label>
  <input class="em-search__input" id="srs-form-input" type="search" name="s" data-swplive="false" autocomplete="off">
  <button class="em-search__submit em-btn em-btn--primary em-btn--sm" type="submit">Search</button>
</form>`;

/* The heading is a heading() widget, not text() carrying a bare <h1>, for the
 * same R10 reason search-result-item.mjs's card title stays a heading()
 * widget: `archive-title` is a real dynamic tag (docs/elementor/
 * schema-4.2.2.md:172-174), but binding a dynamic tag to __dynamic__.title
 * REPLACES the widget's rendered content outright rather than filling a slot
 * inside authored markup (measured for post-date and post-excerpt elsewhere
 * in this build: the dynamic value renders bare, with no wrapping element of
 * its own). A text() widget's `markup: '<h1>...</h1>'` would therefore be
 * discarded the moment __dynamic__ is set, leaving no <h1> at all. Only
 * heading() supplies the wrapping h1 the page's own outline needs.
 *
 * `archive-title` on a Search_Results document resolves to WordPress core's
 * own get_the_archive_title(), which already echoes the query
 * ("Search Results for: %s", wrapped around get_search_query()), so this one
 * binding satisfies "echoes the query" without a second, custom mechanism. */
const dynamicTag = (name, tagSettings = {}) =>
  `[elementor-tag id="${elementId()}" name="${name}" settings="${encodeURIComponent(JSON.stringify(tagSettings))}"]`;

export function searchArchivePart() {
  return [
    container(
      {
        tag: 'section',
        cssClass: 'srs-head em-section',
        content_width: 'full',
        _attributes: 'aria-labelledby|srs-head-title',
      },
      [
        container({ cssClass: 'em-container', content_width: 'full' }, [
          text({ markup: '<p class="em-eyebrow">Search</p>' }),
          heading({
            text: 'Add Your Heading Text Here',
            tag: 'h1',
            cssClass: 'srs-head__title',
            _element_id: 'srs-head-title',
            __dynamic__: { title: dynamicTag('archive-title') },
          }),
          /* No dynamic tag reads $wp_query->found_posts (see
           * search-result-item.mjs's own note on the dynamic tag catalogue);
           * `empower_search_count` (wp/empowerms-child/inc/search-loop.php)
           * is the PHP shortcode for the one thing the widget tree cannot
           * express, the same category of gap as content-loop.php's meta
           * line. Bare shortcode content, same shortcode_unautop() shape as
           * every other bare-shortcode text() widget in this build. */
          text({ cssClass: 'srs-head__count', markup: '[empower_search_count]' }),
          html({ markup: SEARCH_FORM, cssClass: 'srs-head__form' }),
        ]),
      ],
    ),

    container(
      {
        tag: 'section',
        cssClass: 'srs-results em-section',
        content_width: 'full',
        _attributes: 'aria-labelledby|srs-results-title',
      },
      [
        container({ cssClass: 'em-container', content_width: 'full' }, [
          /* Bare <h2>, class-in-markup, visually hidden: same technique
           * podcast-a/03-library.mjs uses for its own section heading
           * (`text() carrying a bare <h2>`), needed here only for the page's
           * own heading outline (h1 query, h2 results region, h3 card
           * titles) and not for anything visible, since the head band above
           * already names the page in full. `.em-visually-hidden` is
           * css/site.css:46's build-wide utility, loaded on every page via
           * the `empower-site` handle (functions.php), so it reaches this
           * page with no new CSS. */
          text({ markup: '<h2 id="srs-results-title" class="em-visually-hidden">Search results</h2>' }),

          /* THE INSTRUMENT: loop-grid, not archive-posts. Corrected
           * 2026-08-20, before this task was dispatched: archive-posts
           * registers exactly three skins (Classic, Cards, Full Content;
           * register_skins() in modules/theme-builder/widgets/
           * archive-posts.php) with no custom skin and no template_id, so it
           * cannot render a Loop Item template at all. loop-grid can:
           * `current_query` is a valid value of the query group's post_type
           * field (modules/query-control/controls/group-control-query.php:
           * 45), so factory.mjs's existing loopGrid() applies unchanged,
           * exactly as podcast-a/03-library.mjs:348 uses it, with one
           * difference: `post_query_post_type: 'current_query'` in place of
           * an explicit post type and term filters. podcast-a builds its own
           * query (post type 'post', category 133); this grid defers
           * entirely to whatever query WordPress already resolved before
           * the template rendered, which on a search results template is
           * the search itself. No posts_per_page override for the same
           * reason: the site's own Reading-settings page size and the
           * search's own `?paged=` pagination already govern the inherited
           * query, and setting a second, competing page size here would be
           * the query this file builds fighting the query WordPress
           * already built.
           *
           * PAGINATION is not a separate element in this tree; it is part of
           * the loop-grid widget's own rendered output. `pagination_page_
           * limit` and a load-more button `text` are both REAL, captured
           * loop-grid settings (docs/elementor/schema-4.2.2.md's own loop-
           * grid fixture), present in that capture with no `pagination_type`
           * override, which is what a caller gets by leaving pagination
           * untouched. This grid does the same: no pagination_type is set
           * here, deliberately, because the fixture is the only measured
           * evidence this task has for what loop-grid's pagination looks
           * like, and it is evidence for the DEFAULT, not for any other
           * named value. UNVERIFIED, STATED PLAINLY: whether that default
           * behaves correctly when the query is `current_query` rather than
           * an explicitly built one, on a real search with more results than
           * one page, has not been measured. Task 5 was built under an
           * explicit no-install constraint; a later task with install
           * access should measure this directly, per the brief's own
           * instruction to verify by measurement rather than assumption.
           *
           * THE EMPTY STATE: `nothing_found_message_text` is the other real,
           * captured setting from that same fixture (default: "It seems we
           * can't find what you're looking for."). Overridden here with
           * search-specific copy, plain text rather than a dynamic tag: the
           * setting is a literal string field in the one fixture this build
           * has captured of it, with no __dynamic__ shown against it, so
           * binding the query into it would be an unverified assumption
           * about a control this task cannot reach the install to check.
           * This is what search.php's own PHP fallback already does for the
           * same case ("Nothing matched that search.") and what the test
           * comment names as the exact thing Beaver's page never had. */
          loopGrid({
            templateId: SEARCH_RESULT_ITEM_POST_ID,
            cssClass: 'srs-grid',
            columns: 1,
            post_query_post_type: 'current_query',
            /* THE SWITCH, NOT JUST THE TEXT. Added 2026-08-26: Elementor Pro
               gates the whole empty-state block on
               `'yes' === $settings['enable_nothing_found_message']`
               (loop-builder/skins/skin-loop-base.php), and that control is
               registered with NO default, so the message below rendered
               nowhere from the day it was written until this line existed.
               `nothing_found_message_text` is itself conditioned on this
               switch. Found while building the category archive. */
            enable_nothing_found_message: 'yes',
            nothing_found_message_text: 'No results found. Try different search terms, or use the search box above.',
            _attributes: 'data-reveal-group|',
          }),
        ]),
      ],
    ),
  ];
}
