<?php
/**
 * Category, tag, author and date archives.
 *
 * Tries Elementor's `archive` location first for the same reason single.php
 * does. The fallback is a plain list of links, not a card grid: a card grid
 * here would be a third design for post listings, competing with the Loop Grid
 * blocks the converted pages use and with whatever Empower eventually choose
 * for the blog.
 *
 * @package EmpowerMississippi
 */

get_header();

if ( ! empower_do_elementor_location( 'archive' ) ) {
	echo '<div class="em-container em-section">';
	echo '<h1>' . esc_html( get_the_archive_title() ) . '</h1>';

	if ( have_posts() ) {
		echo '<ul>';
		while ( have_posts() ) {
			the_post();
			echo '<li><a href="' . esc_url( get_permalink() ) . '">' . esc_html( get_the_title() ) . '</a></li>';
		}
		echo '</ul>';
		the_posts_pagination();
	} else {
		echo '<p>' . esc_html__( 'Nothing found.', 'empowerms' ) . '</p>';
	}

	echo '</div>';
}

get_footer();
