<?php
/**
 * The three things the single-post template needs that no dynamic tag can give it.
 *
 * Same division of labour as person-loop.php, and for the same reasons: where
 * Elementor's own tags produce the value, the template uses them; where they
 * produce the wrong markup, or cannot answer the question at all, a shortcode
 * renders the element and the template holds only the shortcode.
 *
 * WHAT ELEMENTOR CANNOT DO HERE, one item at a time:
 *
 * 1. THE HEADING NEEDS A REAL id. The section is labelled
 *    `aria-labelledby="article-title"`, so something must emit
 *    `<h1 id="article-title">`. Elementor's Heading widget writes its own
 *    wrapper and offers no id control on the heading element itself. Same
 *    problem person-single.mjs solved the same way.
 *
 * 2. THE EYEBROW IS ONE LINE MADE OF TWO DIFFERENT KINDS OF THING. The
 *    post-terms tag renders EVERY category a post carries, each in a bare
 *    <span> with no class, and this install's posts carry both a type
 *    (Podcast, Press Releases, Community Stories) and a topic (Education,
 *    Work, Justice) in the same taxonomy. A post in both reads "Podcast
 *    Education Work" and there is no control that picks one. See
 *    empower_post_primary_category() below for which one wins and why.
 *
 * 3. THE FEATURED IMAGE IS ABSENT ON 95 OF THE 490 POSTS, counted on the
 *    install rather than assumed. An Image widget fed a post-featured-image
 *    tag renders Elementor's own placeholder when the post has none, so 95
 *    pages would carry a grey box where a photograph is supposed to be. This
 *    renders the whole <figure> or renders nothing, which is the rule
 *    person-loop.php's contact block already follows for the eight people
 *    with no email.
 *
 *    IT ALSO BUYS BACK fetchpriority="high". person-single.mjs's note 5
 *    records this as a real, unrepairable LCP cost on the bio pages: the
 *    Image widget emits loading="lazy" and offers no fetchpriority control,
 *    and the portrait is above the fold on every one of those pages. The same
 *    is true of this photograph. Because the markup is written here rather
 *    than by a widget, this one gets the attribute.
 *
 * @package EmpowerMS
 */

/**
 * The categories that describe what a post IS, in the order they win.
 *
 * Term ids read off empv2 on 2026-08-23 with `wp term list category`, with
 * their published post counts beside them, not typed from memory:
 *
 *     133  podcast           66
 *     135  capitol-chat      28
 *       9  community-stories 27
 *      22  news              33   (labelled "Press Releases")
 *     124  bill-summaries    74
 *      48  empower           78   (labelled "Empower News")
 *
 * WHY THIS LIST AND NOT "the post's first category". This install's category
 * taxonomy carries two unrelated kinds of term at the same level: what a piece
 * IS (podcast episode, press release, community story) and what it is ABOUT
 * (education, work, justice). A post routinely holds one of each, and term
 * order in wp_term_relationships is by term id, which is an accident of when
 * somebody created the term. Reading "the first category" would label a
 * podcast episode about schools "Education" on one post and "Podcast" on the
 * next, from the same rule.
 *
 * ORDER WITHIN THE LIST IS BY SPECIFICITY, not by count. Bill Summaries (124)
 * is a CHILD of Empower News (48) on this install, so a bill summary carries
 * both and must read "Bill Summaries"; Capitol Chat and Podcast are likewise
 * more particular than Empower News, which is the catch-all the site files
 * anything else under.
 *
 * A post carrying none of these falls through to its topic, and a post
 * carrying no category at all renders no eyebrow label. Both are handled
 * below rather than assumed away: 490 posts is too many to have looked at.
 *
 * @return int[] Term ids, most specific first.
 */
function empower_post_type_category_ids() {
	return array( 133, 135, 9, 22, 124, 48 );
}

/**
 * The one category a post should be labelled with.
 *
 * @param int $post_id Post to read.
 * @return WP_Term|null The term, or null when the post carries no category.
 */
function empower_post_primary_category( $post_id ) {
	$cats = wp_get_post_categories( $post_id );
	if ( empty( $cats ) || is_wp_error( $cats ) ) {
		return null;
	}

	foreach ( empower_post_type_category_ids() as $term_id ) {
		if ( in_array( $term_id, $cats, true ) ) {
			$term = get_term( $term_id, 'category' );
			return ( $term && ! is_wp_error( $term ) ) ? $term : null;
		}
	}

	/* No type category. Fall through to whatever the post does carry, taking
	   the lowest term id for determinism rather than for meaning: this is the
	   arbitrary case, and an arbitrary rule applied consistently at least
	   labels the same post the same way on every render. */
	sort( $cats );
	$term = get_term( $cats[0], 'category' );
	return ( $term && ! is_wp_error( $term ) ) ? $term : null;
}

/**
 * `[empower_post_title]` — the <h1> the section's aria-labelledby points at.
 */
add_shortcode(
	'empower_post_title',
	function () {
		$post_id = get_the_ID();
		if ( ! $post_id ) {
			return '';
		}
		return '<h1 class="ps-title" id="article-title">' . esc_html( get_the_title( $post_id ) ) . '</h1>';
	}
);

/**
 * `[empower_post_eyebrow]` — category and date, above the headline.
 *
 * The date is a real <time datetime="..."> with a machine-readable value,
 * which is the other thing the date tag will not give: it renders the
 * formatted string as bare text.
 */
add_shortcode(
	'empower_post_eyebrow',
	function () {
		$post_id = get_the_ID();
		if ( ! $post_id ) {
			return '';
		}

		$parts = array();

		$term = empower_post_primary_category( $post_id );
		if ( $term ) {
			$link = get_category_link( $term->term_id );
			$name = esc_html( $term->name );
			/* The category links out to its archive, which is a Beaver page
			   until the archives are converted. It is still the right link:
			   it resolves, and it is where a reader following the label
			   expects to arrive. */
			$parts[] = $link
				? '<a class="ps-eyebrow__cat" href="' . esc_url( $link ) . '">' . $name . '</a>'
				: '<span class="ps-eyebrow__cat">' . $name . '</span>';
		}

		$parts[] = '<time class="ps-eyebrow__date" datetime="' . esc_attr( get_the_date( 'c', $post_id ) ) . '">'
			. esc_html( get_the_date( 'j F Y', $post_id ) ) . '</time>';

		return '<p class="ps-eyebrow">' . implode( '<span class="ps-eyebrow__sep" aria-hidden="true">·</span>', $parts ) . '</p>';
	}
);

/**
 * `[empower_post_figure]` — the featured image, or nothing at all.
 */
add_shortcode(
	'empower_post_figure',
	function () {
		$post_id = get_the_ID();
		if ( ! $post_id || ! has_post_thumbnail( $post_id ) ) {
			return '';
		}

		$img = get_the_post_thumbnail(
			$post_id,
			'large',
			array(
				/* This photograph is the LCP element on every post that has
				   one. See the note at the top of this file. */
				'fetchpriority' => 'high',
				'loading'       => 'eager',
				'decoding'      => 'async',
				'class'         => 'ps-figure__img',
			)
		);

		if ( ! $img ) {
			return '';
		}

		/* The caption is the attachment's own, and most of this library has
		   none; rendering an empty <figcaption> would put a stray margin under
		   every photograph. */
		$caption = wp_get_attachment_caption( get_post_thumbnail_id( $post_id ) );
		$cap     = $caption ? '<figcaption class="ps-figure__cap">' . esc_html( $caption ) . '</figcaption>' : '';

		return '<figure class="ps-figure" data-reveal="clip">' . $img . $cap . '</figure>';
	}
);

/**
 * The related-posts query behind the closing grid.
 *
 * Set on the Loop Grid as `post_query_query_id` (see
 * elementor/theme-parts/post-single.mjs), the same mechanism the /team/ roster
 * uses.
 *
 * READ WITH $wpdb, NEVER get_posts(). Elementor Pro fires
 * `elementor/query/{query_id}` from inside its own pre_get_posts callback, so
 * any WP_Query built in here re-enters this hook forever. That is not a
 * theoretical risk: it shipped a 500 on /team/ once, and person-loop.php's
 * docblock records how a CLI probe hid it.
 *
 * WHAT "RELATED" MEANS. Same primary category, newest first, current post
 * excluded. Not "shares any term": a shared topic like Education spans 147
 * posts across every type, so a podcast episode would recommend three press
 * releases. Falls back to newest posts overall when the category is thin, so
 * the grid is never short of three cards. It is also capped to posts that are
 * actually published, which the fallback needs and the term join gets for
 * free.
 */
const EMPOWER_POST_RELATED_QUERY_ID = 'empower_post_related';
const EMPOWER_POST_RELATED_COUNT    = 3;

add_action(
	'elementor/query/' . EMPOWER_POST_RELATED_QUERY_ID,
	function ( $query ) {
		global $wpdb;

		$post_id = get_queried_object_id();
		if ( ! $post_id ) {
			return;
		}

		$term = empower_post_primary_category( $post_id );
		$ids  = array();

		if ( $term ) {
			$ids = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT p.ID FROM {$wpdb->posts} p
					   JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
					   JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
					  WHERE tt.taxonomy = 'category' AND tt.term_id = %d
					    AND p.post_type = 'post' AND p.post_status = 'publish'
					    AND p.ID <> %d
					  ORDER BY p.post_date DESC
					  LIMIT %d",
					$term->term_id,
					$post_id,
					EMPOWER_POST_RELATED_COUNT
				)
			);
		}

		if ( count( $ids ) < EMPOWER_POST_RELATED_COUNT ) {
			$exclude = array_merge( array( $post_id ), $ids );
			$fill    = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->posts}
					  WHERE post_type = 'post' AND post_status = 'publish'
					    AND ID NOT IN (" . implode( ',', array_fill( 0, count( $exclude ), '%d' ) ) . ')
					  ORDER BY post_date DESC
					  LIMIT %d',
					array_merge( $exclude, array( EMPOWER_POST_RELATED_COUNT - count( $ids ) ) )
				)
			);
			$ids = array_merge( $ids, $fill );
		}

		$ids = array_map( 'intval', $ids );

		/* post__in with an empty array returns EVERY post, not none, so the
		   empty case is guarded rather than passed through. An install with
		   one published post is the only way to reach it, and it would put the
		   whole archive in a three-card grid. */
		if ( empty( $ids ) ) {
			$query->set( 'post__in', array( 0 ) );
			return;
		}

		$query->set( 'post_type', 'post' );
		$query->set( 'post__in', $ids );
		$query->set( 'orderby', 'post__in' );
		$query->set( 'posts_per_page', EMPOWER_POST_RELATED_COUNT );
		$query->set( 'ignore_sticky_posts', true );
	}
);
