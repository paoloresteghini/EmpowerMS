<?php
/**
 * Single posts. 490 of them, none converted yet.
 *
 * Tries Elementor's `single` location first, so a Theme Builder single-post
 * part can be built later and picked up here with no change to this file, the
 * same way the header and footer already were. Until then the fallback prints
 * the title, the date and the content, which is enough to read a post and
 * deliberately not an attempt to reproduce whatever UiCore was drawing.
 *
 * @package EmpowerMississippi
 */

get_header();

if ( ! empower_do_elementor_location( 'single' ) ) {
	echo '<div class="em-container em-section">';

	while ( have_posts() ) {
		the_post();
		echo '<article ' . get_post_class( '' ) . '>';
		echo '<h1>' . esc_html( get_the_title() ) . '</h1>';
		echo '<p class="em-eyebrow">' . esc_html( get_the_date() ) . '</p>';
		the_content();
		echo '</article>';
	}

	echo '</div>';
}

get_footer();
