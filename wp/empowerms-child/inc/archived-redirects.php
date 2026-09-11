<?php
/**
 * The 413 archived posts, and where a reader who follows an old link lands.
 *
 * WHAT THEY ARE. Empower archived 413 posts by giving them the custom status
 * `archived`. The posts are still in wp_posts with their slugs intact, and
 * because `archived` is not a public status, every one of those URLs returns a
 * 404 today. 413 dead ends, several of them with inbound links and years of
 * search history behind them.
 *
 * WHY THIS IS ONE RULE AND NOT 413 REDIRECT ROWS, which is the decision worth
 * arguing. elementor/redirects.mjs is this build's redirect mechanism and it
 * writes rows into the Redirection plugin's table; that is right for the nine
 * legacy pages it handles, because each of those nine is a separate JUDGEMENT
 * about one URL. These 413 are not judgements, they are one rule applied 413
 * times: an archived post goes to the page covering its subject. Writing them
 * as rows would put 413 entries into a screen Empower have to scroll, would
 * need re-running every time they archive another post, and would say nothing
 * about WHY any given row exists.
 *
 * As a rule it also covers the 414th. Empower archive a post next month and it
 * redirects without anybody deploying anything.
 *
 * THE MAPPING IS KIENNA HORN'S, agreed 2026-09-07: category-level 301s to the
 * matching solution page, with All Content as the catch-all. Measured on the
 * install before it was written: all 413 carry at least one category, so no
 * post falls through for want of one. The spread is education 199, justice 108,
 * work 92, community-stories 63, news 46, empower 9, which sums past 413
 * because posts carry more than one.
 *
 * ISSUE AREA WINS OVER TYPE, and the order below is the tie-break. A post in
 * both Education and Community Stories is about education; sending it to
 * /all-content/ would be throwing away the better answer. A post with only a
 * type (Community Stories, Press Releases, Empower News) has no subject page to
 * go to, so it gets the catch-all, which is the honest destination rather than
 * a guess.
 *
 * 301 AND NOT 302. These posts are not coming back; Empower archived them. A
 * 302 would tell search engines to keep the old URL indexed and keep sending
 * people to a page that no longer exists.
 *
 * IT ONLY EVER ACTS ON A 404. If WordPress resolved the request to anything at
 * all, this does nothing: a live post, page or archive that happens to share a
 * slug with an archived post keeps working, and this cannot shadow it. That is
 * also why it is `template_redirect` and not `parse_request`.
 *
 * TO REVERSE: remove the require in functions.php. Nothing is written to the
 * database, no post is modified, and the archived posts are exactly as they
 * were.
 *
 * @package EmpowerMS
 */

/**
 * Category slug -> where a post in that category should land, in priority
 * order. The FIRST match wins, so the three issue areas sit above the types.
 *
 * Keyed by slug rather than term id, so this file is not coupled to one
 * install: docs/staging-to-prod-database.md records what term ids cost.
 * `justice` is the category behind the page called Public Safety, and `news` is
 * the slug of Press Releases; both disagreements between Empower's taxonomy and
 * their own display names are recorded in inc/content-loop.php.
 */
function empower_archived_destinations() {
	return array(
		'education'        => '/quality-education/',
		'work'             => '/meaningful-work/',
		'justice'          => '/safe-communities/',
		'community-stories' => '/all-content/',
		'news'             => '/all-content/',
		'empower'          => '/all-content/',
	);
}

const EMPOWER_ARCHIVED_FALLBACK = '/all-content/';

/**
 * The archived post matching a slug, or 0.
 *
 * Read with $wpdb rather than get_posts(): a WP_Query for a non-public status
 * during template_redirect is more machinery than a lookup needs, and this runs
 * on every 404 the site serves.
 *
 * @param string $slug Post slug from the request.
 * @return int Post id, or 0.
 */
function empower_archived_post_id( $slug ) {
	global $wpdb;
	if ( '' === $slug ) {
		return 0;
	}
	$id = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT ID FROM {$wpdb->posts} WHERE post_name = %s AND post_type = 'post' AND post_status = 'archived' LIMIT 1",
			$slug
		)
	);
	return $id ? (int) $id : 0;
}

/**
 * Where one archived post goes.
 *
 * @param int $post_id Archived post.
 * @return string Path, always with a leading and trailing slash.
 */
function empower_archived_destination( $post_id ) {
	$slugs = wp_get_post_terms( $post_id, 'category', array( 'fields' => 'slugs' ) );
	if ( is_wp_error( $slugs ) ) {
		$slugs = array();
	}
	foreach ( empower_archived_destinations() as $category => $path ) {
		if ( in_array( $category, $slugs, true ) ) {
			return $path;
		}
	}
	return EMPOWER_ARCHIVED_FALLBACK;
}

/**
 * The slug a request is asking for, or ''.
 *
 * Takes the LAST non-empty path segment, so both /slug/ and a dated permalink
 * shape like /2019/08/slug/ resolve. Query strings never reach here: WordPress
 * has already parsed the request by template_redirect.
 */
function empower_archived_request_slug() {
	$path = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH );
	if ( ! is_string( $path ) || '' === $path ) {
		return '';
	}
	$parts = array_values( array_filter( explode( '/', $path ), 'strlen' ) );
	if ( empty( $parts ) ) {
		return '';
	}
	return sanitize_title( rawurldecode( end( $parts ) ) );
}

add_action( 'template_redirect', function () {
	/* The whole guard. Anything WordPress could resolve is left alone. */
	if ( ! is_404() ) {
		return;
	}

	$post_id = empower_archived_post_id( empower_archived_request_slug() );
	if ( ! $post_id ) {
		return;
	}

	wp_safe_redirect( home_url( empower_archived_destination( $post_id ) ), 301 );
	exit;
}, 5 );
