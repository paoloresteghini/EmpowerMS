<?php
/**
 * The fallback template. WordPress requires exactly one template file and this
 * is it; everything else in this theme is a more specific route that WordPress
 * chooses first.
 *
 * Deliberately plain. Every page this site actually shows people is either an
 * Elementor document or a Beaver Builder layout, and both render through
 * the_content(). This file exists so that a route nobody anticipated still
 * produces a readable page rather than a blank one.
 *
 * @package EmpowerMississippi
 */

get_header();

if ( ! empower_do_elementor_location( 'archive' ) ) {
	echo '<div class="em-container em-section">';

	if ( have_posts() ) {
		while ( have_posts() ) {
			the_post();
			echo '<article ' . get_post_class( '' ) . '>';
			echo '<h2><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></h2>';
			the_excerpt();
			echo '</article>';
		}
		the_posts_pagination();
	} else {
		echo '<p>' . esc_html__( 'Nothing found.', 'empowerms' ) . '</p>';
	}

	echo '</div>';
}

get_footer();
