<?php
/**
 * Stamps data-guest onto each podcast episode's loop item container.
 *
 * The route the spec's fallback describes, taken for the reason
 * docs/elementor/schema-4.2.2.md records: Elementor Pro's Custom Attributes
 * field DOES accept a dynamic tag on a loop item container, and it DOES
 * resolve per item (six items, six correctly differentiated values, proved
 * live in Task 2). But the only dynamic tag that can read a taxonomy term
 * (post-terms) wraps every term in its own <span>, even with linking off, so
 * the attribute value becomes markup ("<span>lawmaker</span>"), not the bare
 * token the filter's CSS attribute selector needs
 * ([data-guest="lawmaker"]). Every control still moves, no card ever hides,
 * and nothing anywhere reports an error, which is exactly the silent failure
 * the spec's fidelity harness exists to catch (see Step 6 of the task brief,
 * "the check that no static parse can make").
 *
 * So the attribute is stamped from PHP instead, reading the real term.
 *
 * Why this hook, and why it is safe to add a render attribute here:
 * Elementor's own print_element() (element-base.php) does, in this order:
 *   1. do_action("elementor/frontend/{$element_type}/before_render", $this)
 *   2. buffer print_content() (the element's own children)
 *   3. $this->add_render_attributes()   <- builds the _wrapper attribute set
 *   4. $this->before_render()           <- Container::before_render() prints
 *                                           the opening tag via
 *                                           print_render_attribute_string('_wrapper')
 * So step 1 runs before the _wrapper attribute string is assembled or
 * printed: an attribute added here via add_render_attribute() is present by
 * the time before_render() reads it back out, for every container that
 * fires this hook, not just this one. Read verbatim from
 * wp-content/plugins/elementor/includes/elements/container.php and
 * includes/base/element-base.php on empv2 (Elementor 4.2.2 / Pro 4.2.1),
 * not assumed.
 *
 * Why get_the_ID() resolves to the right post inside a Loop Grid: Elementor
 * Pro's Skin_Loop_Base::render_post() (modules/loop-builder/skins/
 * skin-loop-base.php) calls $document->print_content() for the loop item
 * template from inside skin-base.php's own `while ( $query->have_posts() ) {
 * $query->the_post(); ... $this->render_post(); }` loop, so global $post (and
 * therefore get_the_ID()) is the current loop item's real post for every
 * container the template renders, including this one.
 *
 * Scoped to css_classes containing "pca-ep" as a whole class token (word
 * boundary, not a substring match), so it cannot fire for an unrelated
 * container that merely contains "pca-ep" inside a longer class name.
 */
add_action( 'elementor/frontend/container/before_render', function ( $element ) {
	$classes = (string) $element->get_settings_for_display( 'css_classes' );
	if ( ! preg_match( '/(?:^|\s)pca-ep(?:\s|$)/', $classes ) ) {
		return;
	}

	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return;
	}

	$terms = get_the_terms( $post_id, 'guest_type' );
	if ( empty( $terms ) || is_wp_error( $terms ) ) {
		return;
	}

	$element->add_render_attribute( '_wrapper', 'data-guest', $terms[0]->slug );
} );
