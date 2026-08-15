<?php
/**
 * Search results. Same shape as archive.php, with the query echoed back so a
 * visitor can see what was searched for, and the search form repeated when
 * nothing matched.
 *
 * @package EmpowerMississippi
 */

get_header();

if ( ! empower_do_elementor_location( 'archive' ) ) {
	echo '<div class="em-container em-section">';
	printf(
		'<h1>%s</h1>',
		esc_html( sprintf( __( 'Search results for %s', 'empowerms' ), get_search_query() ) )
	);

	if ( have_posts() ) {
		echo '<ul>';
		while ( have_posts() ) {
			the_post();
			echo '<li><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></li>';
		}
		echo '</ul>';
		the_posts_pagination();
	} else {
		echo '<p>' . esc_html__( 'Nothing matched that search.', 'empowerms' ) . '</p>';
		get_search_form();
	}

	echo '</div>';
}

get_footer();
