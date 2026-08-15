<?php
/**
 * Misses. A heading, a sentence and a route home.
 *
 * Kept deliberately small: this is the one page on the site nobody has designed
 * and inventing a design for it here would be putting an undiscussed page in
 * front of real visitors.
 *
 * @package EmpowerMississippi
 */

get_header();
?>
<div class="em-container em-section">
	<h1><?php esc_html_e( 'That page has moved or never existed', 'empowerms' ); ?></h1>
	<p><?php esc_html_e( 'The link may be out of date. You can start again from the homepage.', 'empowerms' ); ?></p>
	<p><a class="em-btn em-btn--primary em-btn--md" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Go to the homepage', 'empowerms' ); ?></a></p>
</div>
<?php
get_footer();
