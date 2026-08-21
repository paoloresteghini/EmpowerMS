<?php
/**
 * The two things content-a's Loop Grid card needs that no Elementor dynamic
 * tag can produce: the `data-topic` attribute the page's CSS filter reads, and
 * the meta line's topic labels and <time> element.
 *
 * A SIBLING OF inc/loop-attributes.php, NOT AN EXTENSION OF IT. That file is
 * podcast-a's, its docblock is about `guest_type`, and its hook is scoped to
 * `pca-ep`. This one is content-a's and is scoped to `cad-card`. Keeping them
 * apart means deleting either page takes exactly one file out of play, which is
 * the same independence property css/bridge.css's per-page blocks have.
 *
 * ONE MAP, TWO CONSUMERS. `empower_content_a_topics()` reads the post's own
 * categories once and returns the topic tokens in the order the filter bar
 * lists them (css/content-a.css:335-338 and the source markup's own chip
 * order). The attribute hook joins them with spaces; the shortcode turns them
 * into the labelled spans. Nothing else in this file knows the mapping.
 *
 * THE MAP IS A RENAMING, AND THE RENAMING IS THE ROADMAP'S. Empower's
 * WordPress calls these categories Education, Work, Justice and Bill
 * Summaries. The roadmap's All Content tab calls the same four topics Quality
 * Education, Meaningful Work, Public Safety and Bill Summaries, and
 * src/content-a/sections/02-browse.html's own comment records that the
 * difference is deliberate ("Bill Summaries is a category there but a topic
 * here, which is what the roadmap asks for"). So the display label cannot come
 * from a post-terms dynamic tag: that tag renders the TERM's name, which is
 * the wrong word for three of the four, and it renders EVERY category the post
 * carries, which on this install means "Education Empower News" where the
 * design asks for "Quality Education".
 *
 * WHY A SHORTCODE AND NOT MORE MARKUP IN THE LOOP ITEM. The meta line is
 * per-post data with per-post cardinality: one card carries one topic, another
 * carries three (the impact reports carry Education, Work and Justice). No
 * arrangement of Elementor widgets can emit a variable number of labelled
 * spans, and post-terms cannot emit the labels anyway. This is the same
 * category of problem inc/loop-attributes.php's docblock describes for
 * data-guest, and it takes the same answer: a small, named PHP helper for the
 * one thing the widget tree cannot express, with everything else left native.
 *
 * WHY THE DATE IS IN THE SAME SHORTCODE rather than a post-date dynamic tag.
 * dist/content-a.html wraps every date in `<time datetime="2026-06-24">`, and a
 * post-date tag renders bare text with no element of any kind (proved on
 * podcast-a, whose own note 7 records it). Splitting the line would mean a
 * <span class="cad-card__date"> built as a container just to hold a date with
 * no <time> inside it, which is more Elementor structure for strictly less
 * markup fidelity. One shortcode produces the source's markup exactly.
 *
 * WHERE IT IS USED: the shortcode is the entire `editor` value of the meta
 * line's text-editor widget (elementor/pages/content-a/loop-item.mjs). Elementor's
 * Widget_Text_Editor::render() calls parse_text_editor(), which runs
 * shortcode_unautop() and then do_shortcode() (read from
 * wp-content/plugins/elementor/includes/base/widget-base.php on empv2), so a
 * shortcode alone on its own line comes back unwrapped and expanded. The HTML
 * widget would NOT work: Widget_Html::render() is a bare
 * print_unescaped_setting( 'html' ) with no shortcode pass at all.
 *
 * @package EmpowerMS
 */

/**
 * The four topics content-a filters on, as WordPress term id => filter token.
 *
 * Term ids read off empv2 on 2026-08-19 with `wp term list category`, not
 * typed from memory. The ORDER is load-bearing twice over: it is the order the
 * chips appear in on the page, and it is the order the static build writes its
 * multi-topic values in (`data-topic="education work safety"` on the impact
 * reports), so a card built here and a card in dist/content-a.html carry the
 * same string rather than the same set.
 *
 * The attribute selector the filter uses is `~=` (css/content-a.css:335-338),
 * which matches one whitespace-separated token, so order never changes what
 * the filter DOES. It changes only whether the two builds are comparable by
 * eye, which is worth having.
 */
function empower_content_a_topic_map() {
	return array(
		7   => array( 'token' => 'education', 'label' => 'Quality Education' ),
		28  => array( 'token' => 'work',      'label' => 'Meaningful Work' ),
		29  => array( 'token' => 'safety',    'label' => 'Public Safety' ),
		124 => array( 'token' => 'bills',     'label' => 'Bill Summaries' ),
	);
}

/**
 * The topic entries a post carries, in map order.
 *
 * wp_get_post_categories() returns the post's OWN terms, not its terms plus
 * their ancestors, which matters here because Bill Summaries (124) is a child
 * of Empower News (48) on this install. A bill summary therefore reports the
 * `bills` topic and nothing else from this map, which is what the design wants:
 * the Bill Summaries chip is a topic, and Empower News is not a topic at all.
 *
 * @param int $post_id Post to read.
 * @return array List of map entries, each with 'token' and 'label'.
 */
function empower_content_a_topics( $post_id ) {
	$cats = wp_get_post_categories( $post_id );
	if ( empty( $cats ) || is_wp_error( $cats ) ) {
		return array();
	}

	$found = array();
	foreach ( empower_content_a_topic_map() as $term_id => $entry ) {
		if ( in_array( $term_id, $cats, true ) ) {
			$found[] = $entry;
		}
	}

	return $found;
}

/**
 * Stamps data-topic onto each content-a card's loop item container.
 *
 * The mechanism, the hook choice and the reason get_the_ID() resolves to the
 * loop's current post are all identical to inc/loop-attributes.php's, and its
 * docblock carries the full evidence read off Elementor's own
 * element-base.php and Skin_Loop_Base::render_post(). Not repeated here.
 *
 * WHAT IS DIFFERENT: the value is a SPACE-SEPARATED LIST rather than one slug,
 * because css/content-a.css:335-338 matches it with `~=` and a card can carry
 * more than one topic. A post carrying none of the four gets no attribute at
 * all, which is correct rather than a gap: `.cad-card:not([data-topic~="work"])`
 * matches an element with no data-topic, so such a card hides under every topic
 * chip and shows under "All", which is exactly what an untagged post should do.
 *
 * `_element_cache: 'yes'` on the cad-card container is as load-bearing here as
 * it is there, and for the same reason. Without it this hook fires once per
 * page load and every other card on the page reuses that one post's data-topic,
 * which reads as a filter that hides the wrong cards.
 *
 * Scoped to `cad-card` as a whole class token, so it cannot fire for a
 * container whose class merely contains that string.
 */
add_action( 'elementor/frontend/container/before_render', function ( $element ) {
	$classes = (string) $element->get_settings_for_display( 'css_classes' );
	if ( ! preg_match( '/(?:^|\s)cad-card(?:\s|$)/', $classes ) ) {
		return;
	}

	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return;
	}

	$topics = empower_content_a_topics( $post_id );
	if ( empty( $topics ) ) {
		return;
	}

	$element->add_render_attribute( '_wrapper', 'data-topic', implode( ' ', wp_list_pluck( $topics, 'token' ) ) );
} );

/**
 * Renders one card's whole meta line: the wrapping span, its topic labels, and
 * its date.
 *
 * Output is the source's markup exactly, from
 * src/content-a/sections/02-browse.html:
 *
 *     <span class="cad-card__meta"><span class="cad-card__topic">Quality Education</span>
 *     <span class="cad-card__date"><time datetime="2026-06-24">June 24, 2026</time></span></span>
 *
 * with no whitespace between the spans, matching the source byte for byte.
 *
 * THE OUTER `.cad-card__meta` SPAN IS EMITTED HERE RATHER THAN AUTHORED IN THE
 * WIDGET, and that is a correctness decision rather than a stylistic one.
 * Elementor's parse_text_editor() runs, in this order, the `widget_text`
 * filters, then shortcode_unautop(), then do_shortcode(). shortcode_unautop()
 * exists to strip the <p> that wpautop puts around a shortcode STANDING ALONE
 * on its own line; a shortcode nested inside an authored inline element is not
 * that shape, so `<span class="cad-card__meta">[shortcode]</span>` as the
 * widget's content risks coming back wrapped in a <p> that carries
 * tokens/base.css's paragraph margins. Emitting the span from here keeps the
 * widget's content a bare shortcode, which is the shape the unautop pass is
 * built for.
 *
 * The DISPLAY date uses get_the_date() with no format argument, so it takes the
 * install's own date_format option ('F j, Y' on empv2, `wp option get
 * date_format`), which already produces the "June 24, 2026" shape the static
 * build carries. The MACHINE date is 'Y-m-d', which is what the source's
 * datetime attribute holds.
 *
 * A post with none of the four topics renders its date and nothing else, which
 * is the honest output: the meta line is a real line about a real post, and an
 * invented topic label is the kind of placeholder podcast-a/03-library.mjs's
 * note 5 argues against at length.
 */
add_shortcode( 'empower_content_a_meta', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	$out = '<span class="cad-card__meta">';
	foreach ( empower_content_a_topics( $post_id ) as $entry ) {
		$out .= '<span class="cad-card__topic">' . esc_html( $entry['label'] ) . '</span>';
	}

	$out .= '<span class="cad-card__date"><time datetime="' . esc_attr( get_the_date( 'Y-m-d', $post_id ) ) . '">'
		. esc_html( get_the_date( '', $post_id ) ) . '</time></span></span>';

	return $out;
} );
