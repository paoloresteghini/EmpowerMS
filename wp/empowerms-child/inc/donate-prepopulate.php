<?php
/**
 * Carrying the donor's choice from the panel on /donate/ into form 4.
 *
 * WHAT THE PAGE PROMISES. The gift panel at the top of /donate/ asks the two
 * questions that cost a donor the most clicks, how often and how much, and
 * then says in as many words: "Your choice carries into Empower's donation
 * form. Nothing to fill in twice." The form is directly below it on the same
 * page. This file is what makes that sentence true.
 *
 * WHY IT IS NOT JUST A QUERY STRING. Gravity Forms will populate a field from
 * the URL on its own, but only literally, and field 7 is a RADIO whose choice
 * values are the strings Empower typed into the form builder:
 *
 *     "One Time Gift"   "Monthly Gift"   "Annual Gift"
 *
 * Sending ?gift_type=monthly populates nothing, because "monthly" matches no
 * choice. Worse, it does so SILENTLY: the page renders, the form works, the
 * radio is simply unset, and the only visible symptom is donors arriving at a
 * form they thought they had already half filled in. Nothing is logged and
 * nothing 500s.
 *
 * The alternatives were both worse than a filter:
 *
 *   - PUT THE EXACT STRINGS IN THE URLS. /donate/?gift_type=One+Time+Gift is
 *     ugly, it is fragile the moment anyone re-words a choice label, and it
 *     puts the form's internal vocabulary into links that get pasted into
 *     emails and printed on things.
 *   - REWRITE THE FORM'S CHOICE VALUES to match our slugs. Those values are
 *     what 96 entries already store, what three active Stripe feeds condition
 *     on, and what fields 4, 5 and 6 test in their conditional logic. Changing
 *     them to save a filter would edit the client's data to suit our URLs.
 *
 * So the URLs stay readable, the form stays untouched, and the translation
 * happens here.
 *
 * WHAT IS DELIBERATELY NOT MAPPED. Only field 7 (gift type) and field 4 (the
 * one-time amount) are addressed. Fields 5 and 6 are the monthly and annual
 * ladders and they are radios with their own figures ($15/$25/$50/$100 and
 * $100/$250/$500/$1,000). A typed amount cannot select a radio choice, so
 * pointing `amount` at them would populate nothing while looking as though it
 * should. A donor choosing monthly picks the figure on the form itself, which
 * is why the panel's ladder is labelled "How much, one time".
 *
 * AN UNKNOWN VALUE RETURNS EMPTY, WHICH IS THE WHOLE POINT. Guessing at
 * ?gift_type=weekly would mean setting up a donor on a frequency they never
 * chose. An unset radio is a donor making one extra click; a wrong one is a
 * recurring charge nobody asked for.
 *
 * THE OTHER HALF OF THIS LIVES IN THE DATABASE. A filter only fires if the
 * field carries the parameter name, and that is a property of the form, not of
 * the theme, so it does not travel with this repository.
 * elementor/apply-donate-prepopulate.mjs writes it, and it has to be re-run
 * against production at cutover. See docs/staging-to-prod-database.md.
 *
 * @package EmpowerMS
 */

defined( 'ABSPATH' ) || exit;

/**
 * URL slug to the exact choice value on form 4's gift type radio.
 *
 * The keys are ours and appear in the tiles on /donate/; test.mjs asserts that
 * no tile on any Donate reading sends a slug that is not one of these three.
 * The values are Empower's and must match the form builder character for
 * character.
 *
 * @return array<string,string>
 */
function empower_donate_gift_types() {
	return array(
		'one-time' => 'One Time Gift',
		'monthly'  => 'Monthly Gift',
		'annual'   => 'Annual Gift',
	);
}

/**
 * Populate the gift type radio from ?gift_type=.
 *
 * Gravity Forms passes the raw query value in; anything this returns is what
 * the field is populated with, and an empty string leaves it unset.
 *
 * @param string $value Raw value from the query string.
 * @return string An exact choice value, or '' to leave the radio alone.
 */
add_filter(
	'gform_field_value_gift_type',
	function ( $value ) {
		$types = empower_donate_gift_types();
		$slug  = is_string( $value ) ? strtolower( trim( $value ) ) : '';

		return isset( $types[ $slug ] ) ? $types[ $slug ] : '';
	}
);

/**
 * Populate the one-time amount from ?amount=.
 *
 * Field 4 is a free-entry PRICE field, so there is no allow-list of figures to
 * check against: any amount a donor could type is a legitimate one, and the
 * panel's ladder ($25 to $500) is a set of suggestions rather than the range.
 *
 * The guard is about SHAPE, not size. This value is handed to a price field
 * and then to a payment feed, so anything that is not a plain positive number
 * is dropped rather than passed along. Currency symbols, commas, negatives and
 * expressions are all rejected here rather than being cleaned up, because a
 * value we had to repair is a value we are guessing about.
 *
 * @param string $value Raw value from the query string.
 * @return string A bare figure, or '' to leave the field empty.
 */
add_filter(
	'gform_field_value_amount',
	function ( $value ) {
		$raw = is_string( $value ) ? trim( $value ) : '';

		return preg_match( '/^\d{1,6}(?:\.\d{1,2})?$/', $raw ) ? $raw : '';
	}
);
