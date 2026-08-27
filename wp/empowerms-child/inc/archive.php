<?php
/**
 * The two things the category archive template needs that no Elementor control
 * can give it.
 *
 * Same division of labour as inc/post-single.php and inc/person-loop.php, and
 * for the same reasons: where Elementor's own widgets and dynamic tags produce
 * the value, the template uses them; where they produce the wrong markup, or
 * cannot answer the question at all, a shortcode renders the element and the
 * template holds only the shortcode.
 *
 * 1. THE HEADING NEEDS A REAL id AND THE WRONG PREFIX REMOVED. The section is
 *    labelled `aria-labelledby="archive-title"`, so something must emit
 *    `<h1 id="archive-title">`; Elementor's Heading widget writes its own
 *    wrapper and offers no id control on the heading element itself. Its
 *    Archive Title dynamic tag would also render WordPress's own
 *    `get_the_archive_title()`, which on this install prefixes "Category: " —
 *    a label nobody approved, in a colon-joined form that reads as debug
 *    output. `single_term_title()` is the name alone.
 *
 * 2. THERE IS NO COUNT CONTROL, TAG OR WIDGET. The number is
 *    `$wp_query->found_posts`, which only PHP can reach. It is read from the
 *    query the archive actually resolved rather than from `$term->count`,
 *    because the two disagree: `count` is the term's own cached total across
 *    every post status, and `found_posts` is what this request will paginate.
 *
 * Both render NOTHING rather than something wrong when there is nothing to say,
 * which is the rule inc/post-single.php's figure already follows for the 95
 * posts with no featured image.
 *
 * @package EmpowerMS
 */

/**
 * The archive's h1, carrying the id its section is labelled by.
 *
 * Returns an empty string off a category archive rather than guessing at a
 * title: this template is conditioned `include/archive/category`, so anything
 * else reaching this shortcode is a misconfiguration and should be visible as
 * an absence rather than papered over.
 *
 * @return string
 */
function empower_archive_title_shortcode() {
	/* TWO KINDS OF PAGE REACH THIS, and they name themselves differently. A
	   category archive is titled by its term. The posts page (/updates/) has no
	   term at all, so single_term_title() returns nothing there; its name is the
	   title of the page Empower designated as page_for_posts, which is theirs to
	   change in wp-admin and is read here rather than written down. */
	if ( is_home() ) {
		$title = single_post_title( '', false );
	} elseif ( is_category() ) {
		$title = single_term_title( '', false );
	} else {
		return '';
	}

	if ( ! $title ) {
		return '';
	}

	return '<h1 class="ca-head__title" id="archive-title">' . esc_html( $title ) . '</h1>';
}
add_shortcode( 'empower_archive_title', 'empower_archive_title_shortcode' );

/**
 * How many posts this archive holds, from the query it actually resolved.
 *
 * Renders nothing at zero. A category with no posts gets the template's empty
 * state, and "0 posts" above an empty state says the same thing twice.
 *
 * @return string
 */
function empower_archive_count_shortcode() {
	/* Same two pages as the title above. Anything else that reaches this is a
	   misconfiguration and should show as an absence rather than a wrong number. */
	if ( ! is_category() && ! is_home() ) {
		return '';
	}

	global $wp_query;
	$found = isset( $wp_query->found_posts ) ? (int) $wp_query->found_posts : 0;
	if ( $found < 1 ) {
		return '';
	}

	$label = sprintf(
		/* translators: %s: number of posts, already formatted. */
		_n( '%s post', '%s posts', $found, 'empowerms' ),
		number_format_i18n( $found )
	);

	return '<p class="ca-head__count">' . esc_html( $label ) . '</p>';
}
add_shortcode( 'empower_archive_count', 'empower_archive_count_shortcode' );
