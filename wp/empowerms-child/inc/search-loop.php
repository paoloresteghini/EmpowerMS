<?php
/**
 * The two things the search results card and archive band need that no
 * Elementor dynamic tag can produce: a post's own type label, and the
 * result count.
 *
 * A SIBLING OF inc/content-loop.php, NOT AN EXTENSION OF IT. That file's
 * shortcode is scoped to content-a's four categories and never reads the
 * main query. This one is search's own: it reads get_search_query() and
 * $wp_query->found_posts, which content-loop.php never touches, and search
 * is the only template in this build where the query is not one this file
 * builds but one WordPress already resolved before the template renders
 * (elementor/theme-parts/search-archive.mjs's own comment carries the full
 * argument for `post_query_post_type: 'current_query'`).
 *
 * WHY SHORTCODES AND NOT DYNAMIC TAGS. docs/elementor/schema-4.2.2.md:172-174
 * lists the dynamic tag names confirmed on this install: post-title,
 * post-date, post-terms, post-excerpt, post-url, post-featured-image,
 * post-id, post-custom-field, archive-title, author-name, site-title,
 * shortcode. None of them reads $wp_query->found_posts, and none of them
 * can express a post's OWN POST TYPE LABEL: "kind" is not a taxonomy term,
 * so post-terms cannot produce it, and there is no post-type tag in that
 * list. Both gaps are the same shape content-loop.php's own docblock
 * names: a small, named PHP helper for the one thing the widget tree
 * cannot express, everything else left native. The archive title itself
 * does not need a helper: `archive-title` (confirmed in the same list) is
 * a real dynamic tag, and WordPress's own get_the_archive_title() already
 * echoes the query on a search template ("Search Results for: %s"), so
 * search-archive.mjs binds that tag directly and this file does not
 * duplicate it.
 *
 * UNVERIFIED, RECORDED PLAINLY: this file was written under Task 5's
 * explicit no-install constraint and has not been run against empv2. Its
 * two shortcodes are ordinary WordPress (get_post_type_object(),
 * $wp_query->found_posts), not Elementor internals, so the risk is lower
 * than a guessed Elementor control key, but they are unverified all the
 * same and a later task with install access should confirm both render as
 * this file expects.
 *
 * @package EmpowerMS
 */

/**
 * The current post's own post type, in plain words: "Post", "Page",
 * whatever get_post_type_object() labels it for a custom post type. Used
 * on the search results card, which is deliberately type-agnostic (search
 * crosses pages, posts and any other public post type in one result set)
 * and otherwise has nothing that names what kind of thing a given result
 * is. See elementor/theme-parts/search-result-item.mjs for where this is
 * the whole content of one text-editor widget.
 *
 * @return string A `<span class="srs-card__kind">Label</span>`, or '' outside the loop.
 */
add_shortcode( 'empower_search_kind', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	$type_object = get_post_type_object( get_post_type( $post_id ) );
	if ( ! $type_object ) {
		return '';
	}

	$label = isset( $type_object->labels->singular_name )
		? $type_object->labels->singular_name
		: $type_object->label;

	return '<span class="srs-card__kind">' . esc_html( $label ) . '</span>';
} );

/**
 * "N results found." beneath the search results archive title. Reads
 * $wp_query->found_posts, which is main-query state no dynamic tag
 * exposes. Zero is a real, expected outcome on a search page rather than
 * an edge case, so this renders "0 results found." rather than nothing;
 * the loop-grid widget's own `nothing_found_message_text` setting (a real,
 * captured control, see docs/elementor/schema-4.2.2.md's loop-grid
 * fixture) carries the fuller empty-state message beneath the grid.
 *
 * @return string Plain text, e.g. "4 results found.", or '' outside the main query.
 */
add_shortcode( 'empower_search_count', function () {
	global $wp_query;
	if ( ! isset( $wp_query->found_posts ) ) {
		return '';
	}

	$found = (int) $wp_query->found_posts;
	$word  = ( 1 === $found ) ? 'result' : 'results';

	return esc_html( $found . ' ' . $word . ' found.' );
} );
