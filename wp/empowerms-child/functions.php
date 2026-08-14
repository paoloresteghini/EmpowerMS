<?php
/**
 * The cascade IS the design.
 *
 * site.css carries the shared chrome and every local WCAG override, so it must
 * load after components.css and before any page stylesheet. A build that gets
 * this order wrong loses the accessibility work silently: nothing errors, the
 * contrast just drops. test-elementor.mjs asserts the order in this file.
 */

const EMPOWER_TOKENS = array(
	'base', 'colors', 'elevation', 'fonts', 'motion', 'radius', 'spacing', 'typography',
);

require_once get_stylesheet_directory() . '/inc/guest-taxonomy.php';
require_once get_stylesheet_directory() . '/inc/loop-attributes.php';

/**
 * UiCore enqueues its own global stylesheet (handle uicore_global) at
 * priority 50, in its own frontend_css() method
 * (wp-content/plugins/uicore-framework/includes/class-frontend.php).
 * Elementor's own frontend styles enqueue at priority 20. Running our own
 * styles enqueue at 60 guarantees both have already added their handles to
 * the queue before we run, so the conditional dependency below has something
 * real to attach to instead of silently finding nothing.
 */
const EMPOWER_STYLES_PRIORITY = 60;

/**
 * Page stylesheets beyond the shared cascade, keyed by page slug.
 *
 * Taken from the "Per page" table in README.md. Confirm each against the page's
 * own <head> in dist/ before trusting it: the older rows in that table were
 * written for dist/current.html and do not describe the pages that ship.
 *
 * podcast-a checked against dist/podcast-a.html directly: its head loads
 * css/header-2.css before css/motion.css and css/podcast-a.css. The README
 * table's own note explains why header-2.css cannot be dropped: "A page that
 * includes header-2.html without it renders five permanently open panels
 * across its hero." header-2.css is included here for that reason, even
 * though it is not yet enqueued as the global header block.
 */
function empower_page_styles() {
	return array(
		'podcast-a' => array( 'motion', 'podcast-a' ),
	);
}

add_action( 'wp_enqueue_scripts', function () {
	$dir = get_stylesheet_directory_uri();
	$ver = wp_get_theme()->get( 'Version' );
	$prev = null;

	foreach ( EMPOWER_TOKENS as $token ) {
		$handle = 'empower-token-' . $token;
		wp_enqueue_style( $handle, $dir . '/tokens/' . $token . '.css', $prev ? array( $prev ) : array(), $ver );
		$prev = $handle;
	}

	wp_enqueue_style( 'empower-components', $dir . '/components/components.css', array( $prev ), $ver );

	/*
	 * site.css must win over UiCore's global stylesheet. Declaring
	 * uicore_global as a dependency unconditionally would be simpler, but
	 * WordPress silently drops an item whose declared dependency is not
	 * registered: if UiCore ever renames the handle, or a page loads where
	 * it is not registered, css/site.css would stop loading at all and take
	 * every accessibility override with it. Adding the dependency only when
	 * the handle is actually registered trades that total failure for, at
	 * worst, losing only the ordering guarantee.
	 */
	$site_deps = array( 'empower-components' );
	if ( wp_style_is( 'uicore_global', 'registered' ) ) {
		$site_deps[] = 'uicore_global';
	}
	wp_enqueue_style( 'empower-site', $dir . '/css/site.css', $site_deps, $ver );

	/* The header is a site-wide theme part now. css/header-2.css and
	   js/dropdown.js ship together or the panels never close; both move from
	   the per-slug map to this unconditional block. */
	wp_enqueue_style( 'empower-header-2', $dir . '/css/header-2.css', array( 'empower-site' ), $ver );

	$slug = is_singular() ? get_post_field( 'post_name', get_queried_object_id() ) : '';
	$prev = 'empower-header-2';
	foreach ( empower_page_styles()[ $slug ] ?? array() as $sheet ) {
		$handle = 'empower-page-' . $sheet;
		wp_enqueue_style( $handle, $dir . '/css/' . $sheet . '.css', array( $prev ), $ver );
		$prev = $handle;
	}
}, EMPOWER_STYLES_PRIORITY );

/**
 * Scripts have no equivalent to the styles priority problem: nothing else on
 * this install competes with our scripts the way UiCore's global stylesheet
 * competed with css/site.css, so there is no "must run after X" requirement
 * to satisfy here. 20 is this theme's original scripts priority, kept as is
 * and named so the gap between this and EMPOWER_STYLES_PRIORITY (60) reads
 * as a decision rather than an oversight.
 */
const EMPOWER_SCRIPTS_PRIORITY = 20;

/**
 * Page scripts beyond the shared js/nav.js and js/reveal.js pair, keyed by
 * page slug, mirroring empower_page_styles(). The static build pairs
 * css/header-2.css with js/dropdown.js: a page that loads header-2.css
 * without it renders five permanently open panels across its hero, the same
 * silent-failure shape as the motion pair below. css/megamenu.css pairs the
 * same way with js/megamenu.js, but is not wired up here because no page
 * currently enqueues megamenu.css (empower_page_styles() has no entry for
 * it); the mechanism below already covers it the moment one does.
 */
function empower_page_scripts() {
	return array();
}

/**
 * The motion layer. Both files ship together or neither does: css/motion.css
 * hides every [data-reveal] element, and js/reveal.js is what reveals them.
 * Enqueueing the stylesheet without the script leaves the page blank below the
 * fold, which this build has already shipped once.
 */
add_action( 'wp_enqueue_scripts', function () {
	$dir = get_stylesheet_directory_uri();
	$ver = wp_get_theme()->get( 'Version' );
	wp_enqueue_script( 'empower-nav', $dir . '/js/nav.js', array(), $ver, array( 'strategy' => 'defer' ) );
	wp_enqueue_script( 'empower-reveal', $dir . '/js/reveal.js', array(), $ver, array( 'strategy' => 'defer' ) );
	/* The header is a site-wide theme part now. css/header-2.css and
	   js/dropdown.js ship together or the panels never close. */
	wp_enqueue_script( 'empower-dropdown', $dir . '/js/dropdown.js', array(), $ver, array( 'strategy' => 'defer' ) );
	wp_script_add_data( 'empower-nav', 'type', 'module' );
	wp_script_add_data( 'empower-reveal', 'type', 'module' );
	wp_script_add_data( 'empower-dropdown', 'type', 'module' );

	$slug = is_singular() ? get_post_field( 'post_name', get_queried_object_id() ) : '';
	foreach ( empower_page_scripts()[ $slug ] ?? array() as $script ) {
		$handle = 'empower-script-' . $script;
		wp_enqueue_script( $handle, $dir . '/js/' . $script . '.js', array(), $ver, array( 'strategy' => 'defer' ) );
		wp_script_add_data( $handle, 'type', 'module' );
	}
}, EMPOWER_SCRIPTS_PRIORITY );
