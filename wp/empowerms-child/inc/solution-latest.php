<?php
/**
 * The "Latest on ..." band on each solution page, as a query.
 *
 * WHAT WAS THERE. Three solution pages (Quality Education, Meaningful Work,
 * Public Safety) each carried a hand-written list of three posts, and each list
 * had been frozen since the static build was written. Their own `data-cms` note
 * already described what they were supposed to be: "Latest articles and
 * research for this solution area, newest three, mixed types. A Loop Grid
 * narrowed to this area."
 *
 * IT BECAME URGENT ON 2026-09-10 rather than merely stale. EPIC's three report
 * slots became a real query that day, and two of its three answers changed;
 * these lists still named the posts EPIC had just dropped, so the solution
 * pages and the research page disagreed about what Empower's newest research
 * is. A frozen list is tolerable while it agrees with everything else.
 *
 * WHY A SHORTCODE AND NOT A LOOP GRID, the same argument as
 * inc/epic-research.php and worth repeating because the note above asks for a
 * Loop Grid by name. Two things Elementor's query control cannot produce:
 *
 *   1. THE KIND LABEL. `.sol-stub__kind` reads "Research" or "Article", and
 *      that is not a term on the post: it is whether the post carries Research
 *      & Reports at all. A post-terms tag renders EVERY category, which on this
 *      install means "Education Empower News" where the design wants one word.
 *   2. `.sol-stub__title` IS A BARE STYLED <a> and `.sol-stub__date` a bare
 *      <span>. A link() widget puts its class on the wrapper and hands the
 *      anchor Elementor's button chrome, which is the class-on-wrapper defect
 *      this phase exists to stop creating.
 *
 * MIXED TYPES, DELIBERATELY. The query is the area category and nothing else,
 * so a press release, a podcast episode and a report compete on date alone.
 * That is what "newest three, mixed types" asks for. Only the LABEL knows about
 * Research & Reports.
 *
 * ARCHIVED POSTS CANNOT APPEAR. `post_status` is `publish`, so the 413 posts
 * Empower archived stay out; inc/archived-redirects.php sends anyone arriving
 * at one to the very page this band sits on.
 *
 * @package EmpowerMS
 */

/**
 * Category slug per solution page. Keyed by the token the page passes, which is
 * the page's own name for itself; the value is Empower's category slug. They
 * differ for two of the three, which is the same renaming inc/content-loop.php
 * records.
 */
function empower_solution_area_slugs() {
	return array(
		'education' => 'education',
		'work'      => 'work',
		'safety'    => 'justice',
	);
}

const EMPOWER_SOLUTION_RESEARCH_SLUG = 'research-reports';
const EMPOWER_SOLUTION_STUB_COUNT    = 3;

/**
 * The newest published posts in one area, newest first.
 *
 * Read with $wpdb, following inc/person-loop.php and inc/epic-research.php.
 *
 * @param string $area One of the keys of empower_solution_area_slugs().
 * @param int    $count How many.
 * @return int[] Post ids.
 */
function empower_solution_latest_ids( $area, $count = EMPOWER_SOLUTION_STUB_COUNT ) {
	$slugs = empower_solution_area_slugs();
	if ( ! isset( $slugs[ $area ] ) ) {
		return array();
	}

	global $wpdb;

	$ids = $wpdb->get_col(
		$wpdb->prepare(
			"SELECT p.ID FROM {$wpdb->posts} p
			   JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
			   JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'category'
			   JOIN {$wpdb->terms} t ON t.term_id = tt.term_id AND t.slug = %s
			  WHERE p.post_type = 'post' AND p.post_status = 'publish'
			  ORDER BY p.post_date DESC
			  LIMIT %d",
			$slugs[ $area ],
			(int) $count
		)
	);

	return array_map( 'intval', (array) $ids );
}

/**
 * "Research" when the post carries Research & Reports, otherwise "Article".
 *
 * Two words rather than the post's own categories, because the design asks for
 * one label and this install gives a post several categories.
 */
function empower_solution_stub_kind( $post_id ) {
	$slugs = wp_get_post_terms( $post_id, 'category', array( 'fields' => 'slugs' ) );
	if ( is_wp_error( $slugs ) ) {
		$slugs = array();
	}
	return in_array( EMPOWER_SOLUTION_RESEARCH_SLUG, $slugs, true ) ? 'Research' : 'Article';
}

/**
 * Renders the whole <ul class="sol-stubs">, markup for markup with the static
 * build's, or nothing at all when the area has no posts.
 *
 * The `data-cms` attributes are carried through: they are the build's own
 * marker for content that comes from a query, and after this they are true.
 *
 * The DISPLAY date takes the install's own date_format ('F j, Y' on empv2),
 * which is the shape the static build carries. Same call and reason as
 * inc/content-loop.php.
 */
add_shortcode( 'empower_solution_latest', function ( $atts ) {
	$atts = shortcode_atts( array( 'area' => '' ), $atts, 'empower_solution_latest' );

	$ids = empower_solution_latest_ids( $atts['area'] );
	if ( empty( $ids ) ) {
		return '';
	}

	$note = 'Latest articles and research for this solution area, newest three, mixed types.';

	$out = '<ul class="sol-stubs" data-cms="loop" data-cms-note="' . esc_attr( $note ) . '" data-reveal-group>';
	foreach ( $ids as $id ) {
		$out .= '<li class="sol-stub" data-reveal="rise">'
			. '<span class="sol-stub__kind">' . esc_html( empower_solution_stub_kind( $id ) ) . '</span>'
			. '<a class="sol-stub__title" href="' . esc_url( get_permalink( $id ) ) . '">' . esc_html( get_the_title( $id ) ) . '</a>'
			. '<span class="sol-stub__date">' . esc_html( get_the_date( '', $id ) ) . '</span>'
			. '</li>';
	}
	$out .= '</ul>';

	return $out;
} );
