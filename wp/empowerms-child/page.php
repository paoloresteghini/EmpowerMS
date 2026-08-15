<?php
/**
 * Pages, which is what every converted page is.
 *
 * the_content() is the whole template, and that is not laziness: it is the one
 * call BOTH builders render through. Elementor replaces the content of a
 * document it owns, and Beaver Builder filters the content of a layout it owns,
 * so a page.php that prints the content and nothing else serves a converted
 * Elementor page and an unconverted Beaver page identically without knowing
 * which it has.
 *
 * No page title is printed. The build's own designs carry their headline inside
 * the content, and printing a second one above it is exactly the UiCore
 * behaviour that put a duplicate <h1> on every converted page until 2026-08-14.
 *
 * @package EmpowerMississippi
 */

get_header();

if ( ! empower_do_elementor_location( 'single' ) ) {
	while ( have_posts() ) {
		the_post();
		the_content();
	}
}

get_footer();
