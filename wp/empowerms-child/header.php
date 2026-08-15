<?php
/**
 * The document head, the Elementor header location, and the main landmark.
 *
 * THE ELEMENTOR LOCATION CALL IS THE POINT OF THIS FILE. Before 2026-08-15 the
 * site's header and footer reached the page because uicore-framework's own
 * templates called elementor_theme_do_location(); nothing in the theme did, and
 * uicore-pro declared no Elementor theme support. So removing UiCore does not
 * degrade the Phase 2A header and footer parts, it removes them entirely. This
 * theme calls the location itself, which is what a theme is supposed to do.
 *
 * <main id="main"> IS NOT DECORATION. The header part carries the build's skip
 * link and it points at #main (css/site.css, and the :focus-within repair in
 * bridge.css). UiCore used to supply that wrapper. Without it the skip link is
 * present, focusable, visible, and targets nothing, which is a WCAG 2.4.1
 * failure that no automated check in this project would notice.
 *
 * @package EmpowerMississippi
 */

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<?php
/* Falls back to nothing rather than to a hand-written header. A hand-written
   fallback would be a second, unmaintained copy of the navigation that only
   ever appears when something has already gone wrong, and it would look
   plausible enough that nobody would notice the real header had stopped
   rendering. An absent header is obvious in a way a stale one is not. */
empower_do_elementor_location( 'header' );
?>

<main id="main">
