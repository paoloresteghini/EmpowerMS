<?php
/**
 * Tag and date archives, and whatever else WordPress routes here.
 *
 * Tries Elementor's `archive` location first for the same reason single.php
 * does, and as of 2026-08-27 that location answers for the ten category
 * archives, the posts page (/updates/) and the 21 author archives: one
 * Theme Builder document, three conditions
 * (elementor/theme-parts/category-archive.mjs).
 *
 * SO THE FALLBACK BELOW IS NO LONGER A STOPGAP FOR EVERYTHING -- it is what tag
 * and date archives actually render, and nothing else. That makes it more
 * important that it reads properly, not less. It stays a plain list of links
 * rather than a card grid: a card grid here would be a second design for post
 * listings competing with the one the converted archives use.
 *
 * @package EmpowerMississippi
 */

get_header();

if ( ! empower_do_elementor_location( 'archive' ) ) {
	echo '<div class="em-container em-section">';
	/* STRIPPED BEFORE ESCAPED. get_the_archive_title() returns MARKUP -- on a
	   date archive it is `Month: <span>May 2025</span>` -- so escaping it alone
	   printed the tags as visible text. Seen on /2025/05/ on the live install.
	   Stripping first gives the sentence WordPress meant; escaping after keeps
	   a term or author name safe. */
	echo '<h1>' . esc_html( wp_strip_all_tags( get_the_archive_title() ) ) . '</h1>';

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
