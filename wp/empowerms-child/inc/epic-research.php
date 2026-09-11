<?php
/**
 * The newest research report in one focus area, for EPIC's three panels.
 *
 * WHY THIS IS PHP AT ALL. The question each panel asks is "the newest post that
 * is in Research & Reports AND in this focus area", and Elementor Pro cannot
 * express it. Read off the install rather than assumed:
 * Elementor_Post_Query::insert_tax_query() (query-control/classes/
 * elementor-post-query.php:266-281) groups every selected term BY TAXONOMY and
 * emits ONE clause per taxonomy with the default `IN` operator. Research &
 * Reports and Quality Education are both `category`, so selecting the two in a
 * Loop Grid asks for research OR education, which on this install is 262 posts
 * rather than one. The relation AND that would fix it is only ever inserted
 * BETWEEN taxonomies, never within one.
 *
 * WHY NOT A LOOP GRID WITH A `post_query_query_id` FILTER, which is the shape
 * /team/ and the related-posts grid both use. That fixes the query and leaves
 * the markup wrong. `.epa-area__latest` is a bare styled <a> (css/epic-a.css:
 * 276) and `.epa-area__date` a bare <p> (:284); a link() widget renders
 * Elementor's button markup and puts the cssClass on the WIDGET WRAPPER, which
 * is the class-on-wrapper defect this phase exists to stop creating. So a Loop
 * Grid would need a shortcode or a bridge rule for the anchor anyway, and would
 * add its own four wrappers (widget, container, .elementor-loop-container,
 * .e-loop-item) inside a flex column whose gaps are set in css/epic-a.css, plus
 * a fourth Loop Item template to create on production at cutover. It buys
 * nothing this file does not.
 *
 * WHAT THE PANEL KEEPS: the photograph and the area name stay authored widgets,
 * because they are design, not data. Only the three elements below move.
 *
 * THE LABEL IS EMITTED HERE, not left as an authored widget above the
 * shortcode, so that a focus area with no tagged report renders NOTHING rather
 * than "Most recent report" followed by a gap. All three areas have one today
 * (Education 1, Work 3, Justice 1, counted 2026-09-09), and the empty case is
 * one untick away in wp-admin.
 *
 * TERMS ARE RESOLVED BY SLUG, never by id. elementor/terms.mjs carries the full
 * argument: a term id belongs to one install, and production numbers its
 * taxonomy differently from empv2. inc/content-loop.php's map still holds ids
 * and is the older shape; this file does not copy it.
 *
 * READ WITH $wpdb, following inc/person-loop.php. Here it is a cost decision
 * rather than a correctness one -- no Elementor query hook is in play, so a
 * WP_Query would not re-enter anything -- but the AND across two categories is
 * one join in SQL and a tax_query with a relation in WP_Query, and the theme
 * already reads posts this way in two other files.
 *
 * WHERE IT IS USED: as the entire content of one text-editor widget per panel
 * (elementor/pages/epic-a/04-research.mjs). Elementor's Widget_Text_Editor::
 * render() runs shortcode_unautop() then do_shortcode(), so a shortcode alone
 * on its own line comes back unwrapped and expanded; the HTML widget would NOT
 * work, because Widget_Html::render() prints its setting with no shortcode pass
 * at all. inc/content-loop.php's docblock carries that evidence in full.
 *
 * @package EmpowerMS
 */

/**
 * The category slug behind each of EPIC's three focus areas.
 *
 * The KEY is the area token the page uses; the VALUE is the category slug on
 * the install. They differ for one of the three: the panel is "Public Safety"
 * and the category is `justice`, which is the same renaming inc/content-loop.php
 * records (Empower's WordPress and the roadmap disagree about three of four
 * topic names, deliberately).
 */
function empower_epic_area_slugs() {
	return array(
		'education' => 'education',
		'work'      => 'work',
		'safety'    => 'justice',
	);
}

/**
 * The category the reports themselves carry.
 *
 * Created 2026-09-09 from the list Kienna Horn settled by email, and seeded by
 * elementor/apply-research-category.mjs. It exists on empv2 and must exist on
 * production before this page is deployed there: with the category absent every
 * panel below renders nothing, silently, which is exactly what
 * docs/staging-to-prod-database.md lists as the cutover's first command.
 */
const EMPOWER_RESEARCH_CATEGORY_SLUG = 'research-reports';

/**
 * The note the review build shows against a CMS-driven field.
 *
 * Byte-identical to src/epic-a/sections/04-research.html, which repeats it on
 * both elements of all three panels. Held once here for the same reason it is
 * held once in the page module: six identical strings that must stay identical
 * are six chances to drift.
 */
const EMPOWER_EPIC_CMS_NOTE = 'The newest report in this focus area. The area name and photograph beside it are authored; only this title, its href and the date below it come from a query.';

/**
 * The newest published report in one focus area.
 *
 * @param string $area One of the keys of empower_epic_area_slugs().
 * @return int Post id, or 0 when the area has no tagged report.
 */
function empower_epic_latest_report_id( $area ) {
	$slugs = empower_epic_area_slugs();
	if ( ! isset( $slugs[ $area ] ) ) {
		return 0;
	}

	global $wpdb;

	/* TWO JOINS, ONE PER CATEGORY, which is what makes this an AND rather than
	   the IN list Elementor would have built. `tt.taxonomy = 'category'` is on
	   both joins: a slug is unique per taxonomy, not globally, and this install
	   carries a `guest_type` taxonomy of its own. */
	$id = $wpdb->get_var(
		$wpdb->prepare(
			"SELECT p.ID FROM {$wpdb->posts} p
			   JOIN {$wpdb->term_relationships} tr_r ON tr_r.object_id = p.ID
			   JOIN {$wpdb->term_taxonomy} tt_r ON tt_r.term_taxonomy_id = tr_r.term_taxonomy_id AND tt_r.taxonomy = 'category'
			   JOIN {$wpdb->terms} t_r ON t_r.term_id = tt_r.term_id AND t_r.slug = %s
			   JOIN {$wpdb->term_relationships} tr_a ON tr_a.object_id = p.ID
			   JOIN {$wpdb->term_taxonomy} tt_a ON tt_a.term_taxonomy_id = tr_a.term_taxonomy_id AND tt_a.taxonomy = 'category'
			   JOIN {$wpdb->terms} t_a ON t_a.term_id = tt_a.term_id AND t_a.slug = %s
			  WHERE p.post_type = 'post' AND p.post_status = 'publish'
			  ORDER BY p.post_date DESC
			  LIMIT 1",
			EMPOWER_RESEARCH_CATEGORY_SLUG,
			$slugs[ $area ]
		)
	);

	return $id ? (int) $id : 0;
}

/**
 * Renders one panel's label, report link and date, or nothing.
 *
 * Output is src/epic-a/sections/04-research.html's markup exactly, one element
 * per line, so the static build and the install can be diffed by eye.
 *
 * The DISPLAY date uses get_the_date() with no format argument, so it takes the
 * install's own date_format option ('F j, Y' on empv2), which is the shape the
 * static build carries. Same call and same reason as inc/content-loop.php.
 *
 * NO <time> ELEMENT, unlike content-a's card: the source does not carry one
 * here, and adding one would be this file inventing markup the design did not
 * ask for.
 */
add_shortcode( 'empower_epic_latest_report', function ( $atts ) {
	$atts = shortcode_atts( array( 'area' => '' ), $atts, 'empower_epic_latest_report' );

	$post_id = empower_epic_latest_report_id( $atts['area'] );
	if ( ! $post_id ) {
		return '';
	}

	$note = esc_attr( EMPOWER_EPIC_CMS_NOTE );

	return '<p class="epa-area__latest-label">Most recent report</p>' . "\n"
		. '<a class="epa-area__latest" data-cms="field" data-cms-note="' . $note . '" href="'
		. esc_url( get_permalink( $post_id ) ) . '">' . esc_html( get_the_title( $post_id ) ) . '</a>' . "\n"
		. '<p class="epa-area__date" data-cms="field" data-cms-note="' . $note . '">'
		. esc_html( get_the_date( '', $post_id ) ) . '</p>';
} );
