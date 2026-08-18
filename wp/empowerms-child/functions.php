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
 * Theme supports. Added 2026-08-15, when this stopped being a child theme and
 * had to declare for itself everything it previously inherited from uicore-pro.
 *
 * post-thumbnails is the one that would fail silently and expensively. Without
 * it has_post_thumbnail() is false site-wide, and Elementor's
 * post-featured-image dynamic tag renders nothing at all: the homepage's
 * Community Stories cards would come back with a title and no photograph, which
 * is precisely how they looked while the dynamic tag name was wrong, with no
 * error anywhere to distinguish the two causes.
 *
 * title-tag is the second: without it nothing outputs <title>, because this
 * theme's header.php deliberately does not hand-write one.
 */
add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'automatic-feed-links' );
	register_nav_menus( array(
		/* Registered so WordPress has somewhere to hang the existing menus, not
		   because this theme renders them: the navigation lives in the Elementor
		   header part, built from src/_shared/header-2.html. */
		'primary' => __( 'Primary', 'empowerms' ),
	) );
} );

/**
 * Renders an Elementor Theme Builder location, and reports whether anything was
 * actually rendered.
 *
 * THE REASON THIS FUNCTION EXISTS AT ALL. Until 2026-08-15 the site's Elementor
 * header and footer reached the page because uicore-framework's own templates
 * called elementor_theme_do_location(); nothing in the theme did, and uicore-pro
 * declared no Elementor theme support. Removing UiCore therefore does not
 * degrade those parts, it removes them. Wrapped in one function rather than
 * called directly in six templates so that the function_exists() guard is
 * written once: without it, deactivating Elementor Pro turns every template in
 * this theme into a fatal error, which is a worse failure than the one being
 * fixed.
 *
 * Returns false when Elementor Pro is absent OR when it is present but no
 * document is assigned to the location, which is what lets each template fall
 * back to plain markup instead of rendering nothing.
 */
function empower_do_elementor_location( $location ) {
	if ( ! function_exists( 'elementor_theme_do_location' ) ) {
		return false;
	}
	return elementor_theme_do_location( $location );
}

/**
 * Tells Elementor Pro which locations this theme supports, so the Theme Builder
 * UI can offer them when someone creates a new part.
 *
 * Distinct from the calls in the templates, and both are needed. The template
 * calls are what RENDER a part; this registration is what lets a part be
 * ASSIGNED to a location in the editor. Phase 2A's header and footer were
 * assigned through wp-cli, which is why they worked without this.
 */
add_action( 'elementor/theme/register_locations', function ( $manager ) {
	$manager->register_all_core_location();
} );

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
 * The cache-busting version for one theme asset, derived from that file's own
 * modification time.
 *
 * Every asset this theme enqueues is served by WP Engine with
 * `cache-control: public, max-age=31536000`, so the query string on the URL is
 * the only thing that can retire a visitor's cached copy. Versioning them all
 * with the theme's `Version:` header, which this build has kept at 2.0.0
 * through the entire conversion, made that query string a constant: a browser
 * that fetched css/bridge.css once held it for a year and saw none of the
 * repairs written into it afterwards.
 *
 * That cost a real morning. On 2026-08-17 the converted homepage's header
 * looked wrong in Paolo's browser (a 15px wordmark, an over-wide nav, a
 * borderless search control) and correct in a cold-cache browser at the same
 * moment, because his copy of bridge.css predated the 2026-08-15 repair to its
 * `.elementor button.em-header__*` block and nothing in the URL had changed to
 * tell him so.
 *
 * $rel is relative to the stylesheet directory. The theme version is the
 * fallback when the file cannot be stat'ed, deliberately, rather than an empty
 * string: an empty version emits a bare URL with no query at all, which is
 * MORE cacheable than the constant this replaces, not less.
 */
function empower_asset_ver( $rel ) {
	$path = get_stylesheet_directory() . '/' . ltrim( $rel, '/' );
	$mtime = file_exists( $path ) ? filemtime( $path ) : false;
	return $mtime ? (string) $mtime : wp_get_theme()->get( 'Version' );
}

/**
 * Page stylesheets beyond the shared cascade and global header, keyed by page slug.
 *
 * Taken from the "Per page" table in README.md. Confirm each against the page's
 * own <head> in dist/ before trusting it: the older rows in that table were
 * written for dist/current.html and do not describe the pages that ship.
 *
 * css/header-2.css is no longer keyed here; the header is a site-wide theme
 * part and header-2.css loads unconditionally after empower-site (see below).
 * css/motion.css and css/podcast-a.css remain per-page because only podcast-a
 * uses them today; the mechanism stays so future pages can opt in without
 * changing the enqueue logic.
 */
function empower_page_styles() {
	return array(
		'podcast-a'    => array( 'motion', 'podcast-a' ),
		/* what-we-do-a. Read off dist/what-we-do-a.html's own <head>, which
		   loads (after the shared tokens/components cascade and the
		   unconditional header sheet) the site stylesheet, the header sheet,
		   the motion sheet, then its own what-we-do-a sheet, in that order.
		   The site and header sheets are already enqueued unconditionally
		   above, so only the two page-specific sheets beyond that shared
		   cascade belong here, the same shape podcast-a's own entry takes. */
		'what-we-do-a' => array( 'motion', 'what-we-do-a' ),
		/* solutions-b. Read off dist/solutions-b.html's own <head>, which loads
		   (after the shared tokens/components cascade and the unconditional
		   header sheet) the site stylesheet, the header sheet, the motion
		   sheet, then its own solutions-b sheet, in that order. Same shape as
		   what-we-do-a's entry above, for the same reason: the site and
		   header sheets are already enqueued unconditionally. */
		'solutions-b'  => array( 'motion', 'solutions-b' ),
		/* capitol-a. Read off dist/capitol-a.html's own <head>, which loads
		   (after the shared tokens/components cascade and the unconditional
		   header sheet) the site stylesheet, the header sheet, the motion
		   sheet, then its own capitol-a sheet, in that order. Same shape as
		   what-we-do-a's and solutions-b's own entries above, for the same
		   reason: the site and header sheets are already enqueued
		   unconditionally. */
		'capitol-a'    => array( 'motion', 'capitol-a' ),
		/* team-a. Read off dist/team-a.html's own <head>, which loads (after
		   the shared tokens/components cascade and the unconditional header
		   sheet) the site stylesheet, the header sheet, the motion sheet,
		   then its own team-a sheet, in that order. Same shape as every
		   entry above, for the same reason: the site and header sheets are
		   already enqueued unconditionally. */
		'team-a'       => array( 'motion', 'team-a' ),
		/* who-we-are-a. Read off dist/who-we-are-a.html's own <head> (lines
		   10-22), which loads the shared tokens cascade, components.css, then
		   the site stylesheet, the header sheet, the motion sheet, and its own
		   who-we-are-a sheet last. The site and header sheets are already
		   enqueued unconditionally above, so only the two page-specific sheets
		   beyond that shared cascade belong here: the same shape every entry
		   above takes, for the same reason. */
		'who-we-are-a' => array( 'motion', 'who-we-are-a' ),
		/* mail-a. Read off dist/mail-a.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own mail-a
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason. */
		'mail-a'       => array( 'motion', 'mail-a' ),
		/* amb-a. Read off dist/amb-a.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own amb-a
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason. */
		'amb-a'        => array( 'motion', 'amb-a' ),
		/* epic-a. Read off dist/epic-a.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own epic-a
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason. This page needs the motion sheet for
		   more than the shared reveal layer: css/epic-a.css's own rail fill is
		   a scroll-driven animation and the build's first converted
		   view-timeline. */
		'epic-a'       => array( 'motion', 'epic-a' ),
		/* The homepage. Read off dist/final.html's own <head>, in its order,
		   not from the README row: final.html composes from four other pages'
		   stylesheets plus its own, and the order between them is the whole
		   reason the composition renders. README's own hand-off notes flag
		   consolidating these into one sheet as cleanup that has not been
		   done, so the list stays exactly as the static page loads it until
		   that happens. */
		'final'        => array( 'homepage', 'motion', 'option-a', 'option-d', 'current-2', 'final' ),
	);
}

add_action( 'wp_enqueue_scripts', function () {
	$dir = get_stylesheet_directory_uri();
	$prev = null;

	foreach ( EMPOWER_TOKENS as $token ) {
		$handle = 'empower-token-' . $token;
		wp_enqueue_style( $handle, $dir . '/tokens/' . $token . '.css', $prev ? array( $prev ) : array(), empower_asset_ver( 'tokens/' . $token . '.css' ) );
		$prev = $handle;
	}

	wp_enqueue_style( 'empower-components', $dir . '/components/components.css', array( $prev ), empower_asset_ver( 'components/components.css' ) );

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
	wp_enqueue_style( 'empower-site', $dir . '/css/site.css', $site_deps, empower_asset_ver( 'css/site.css' ) );

	/* The header is a site-wide theme part now. css/header-2.css and
	   js/dropdown.js ship together or the panels never close; both move from
	   the per-slug map to this unconditional block. */
	wp_enqueue_style( 'empower-header-2', $dir . '/css/header-2.css', array( 'empower-site' ), empower_asset_ver( 'css/header-2.css' ) );

	$slug = is_singular() ? get_post_field( 'post_name', get_queried_object_id() ) : '';
	$prev = 'empower-header-2';
	foreach ( empower_page_styles()[ $slug ] ?? array() as $sheet ) {
		$handle = 'empower-page-' . $sheet;
		wp_enqueue_style( $handle, $dir . '/css/' . $sheet . '.css', array( $prev ), empower_asset_ver( 'css/' . $sheet . '.css' ) );
		$prev = $handle;
	}

	/* The bridge stylesheet. Loads after every other Empower stylesheet on
	 * every page, page-specific sheets included, because it exists to repair
	 * what Elementor's own markup does to those sheets' selectors: it has to
	 * see, and win against, whatever came before it. $prev is whatever the
	 * loop above left it at, empower-header-2 on a page with no per-page
	 * sheets of its own.
	 */
	wp_enqueue_style( 'empower-bridge', $dir . '/css/bridge.css', array( $prev ), empower_asset_ver( 'css/bridge.css' ) );
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
 * page slug. Currently unused: js/dropdown.js moved to the unconditional block
 * when the header became a site-wide theme part, since css/header-2.css and
 * js/dropdown.js ship together or the panels never close.
 *
 * js/megamenu.js is not routed through this mechanism and, checked against
 * the current build, cannot be live today: it binds the header markup in
 * src/sections/00-header.html (see its own header comment), a file that no
 * longer exists in this repository (README.md:726 still cites it, which is
 * the same stale reference). The header this site actually serves is the
 * Theme Builder part built from src/_shared/header-2.html
 * (elementor/theme-parts/header.mjs), which js/megamenu.js never queries.
 * The mechanism is left in place, not because megamenu.css/js are expected
 * to come back, but because it is the general route any future per-page
 * script would use, and empower_module_script_handles() below derives its
 * module-script list from this function specifically so that route can
 * never silently regress to loading a script as classic.
 */
function empower_page_scripts() {
	return array();
}

/**
 * Every script handle that must load with type="module": the three
 * site-wide scripts enqueued unconditionally above, plus every handle
 * empower_page_scripts() can emit for any page slug. Built from the same
 * function the per-page enqueue loop below reads, not a second list typed
 * out by hand, so a handle the enqueue emits can never be one this filter
 * fails to recognise. That is what actually broke here once already:
 * empower_page_scripts() emits handles shaped 'empower-script-<name>'
 * (see the enqueue loop below), and a filter matching only
 * 'empower-nav' / 'empower-reveal' / 'empower-dropdown' by name would let
 * any future entry in empower_page_scripts() load as a classic script,
 * which is the exact condition that produced this branch's site-wide
 * dropdown regression.
 */
function empower_module_script_handles() {
	$handles = array( 'empower-nav', 'empower-reveal', 'empower-dropdown' );
	foreach ( empower_page_scripts() as $scripts ) {
		foreach ( $scripts as $script ) {
			$handles[] = 'empower-script-' . $script;
		}
	}
	return $handles;
}

/**
 * The motion layer. Both files ship together or neither does: css/motion.css
 * hides every [data-reveal] element, and js/reveal.js is what reveals them.
 * Enqueueing the stylesheet without the script leaves the page blank below the
 * fold, which this build has already shipped once.
 */
add_action( 'wp_enqueue_scripts', function () {
	$dir = get_stylesheet_directory_uri();
	wp_enqueue_script( 'empower-nav', $dir . '/js/nav.js', array(), empower_asset_ver( 'js/nav.js' ), array( 'strategy' => 'defer' ) );
	wp_enqueue_script( 'empower-reveal', $dir . '/js/reveal.js', array(), empower_asset_ver( 'js/reveal.js' ), array( 'strategy' => 'defer' ) );
	/* The header is a site-wide theme part now. css/header-2.css and
	   js/dropdown.js ship together or the panels never close. */
	wp_enqueue_script( 'empower-dropdown', $dir . '/js/dropdown.js', array(), empower_asset_ver( 'js/dropdown.js' ), array( 'strategy' => 'defer' ) );

	$slug = is_singular() ? get_post_field( 'post_name', get_queried_object_id() ) : '';
	foreach ( empower_page_scripts()[ $slug ] ?? array() as $script ) {
		$handle = 'empower-script-' . $script;
		wp_enqueue_script( $handle, $dir . '/js/' . $script . '.js', array(), empower_asset_ver( 'js/' . $script . '.js' ), array( 'strategy' => 'defer' ) );
	}
}, EMPOWER_SCRIPTS_PRIORITY );

/**
 * js/nav.js, js/reveal.js and js/dropdown.js are each written as an ES
 * module: every one of them relies on module scope to keep its top-level
 * `const` declarations private to itself. Loaded as classic scripts they
 * share one global scope instead, and when a second file declares an
 * identifier the first already claimed, the second throws a SyntaxError and
 * never runs. js/reveal.js and js/dropdown.js both declare `const root =
 * document.documentElement;` at their top level; loaded in enqueue order
 * (nav, reveal, dropdown) reveal.js claims `root` and runs, dropdown.js's
 * own declaration then collides and it never executes. Its first line past
 * that point, `root.setAttribute('data-dropdown', 'on')`, is the gate
 * css/header-2.css keys the closed-by-default panel styles off, so the
 * failure is exactly the one this file's own comments warn about: the five
 * desktop dropdown panels ship open in the markup by design and stay open.
 *
 * `wp_script_add_data( $handle, 'type', 'module' )` looks like the fix and
 * is not one: WP_Scripts::do_item() (wp-includes/class-wp-scripts.php)
 * builds each script tag's attributes from 'src', 'id', the loading
 * strategy and fetchpriority only. It never reads a 'type' data key, on
 * this WordPress version (7.0.4, confirmed by reading do_item() directly on
 * the install) or in any version that predates wp_enqueue_script_module().
 * Those calls, removed from the block above, have never emitted
 * type="module"; empower-nav and empower-reveal have been classic scripts
 * since Phase 1, and the collision was latent until js/dropdown.js became a
 * third file competing for `root`.
 *
 * script_loader_tag is the filter WordPress actually threads through
 * WP_Scripts::do_item() before printing, so it is what can put
 * type="module" on the emitted tag. wp_enqueue_script_module() (WP 6.5+,
 * available on this install) was the other candidate, but it is a separate
 * registry with its own dependency handling; nothing here needs that, and
 * this filter gets the same result without moving these three handles out
 * of the machinery the rest of this file already uses. Editing js/ to
 * remove the collision by renaming the declarations is not available:
 * js/ is part of the protected static build.
 *
 * type="module" makes a script deferred by default (an external module
 * script without `async` runs after the document has parsed), so the
 * `'strategy' => 'defer'` argument on each enqueue call above becomes
 * redundant, not wrong: WordPress still uses it to place the tag and still
 * emits the `defer` attribute alongside `type="module"`, which browsers
 * accept on the same tag without conflict. Left as is rather than removed,
 * so each enqueue call keeps documenting its own ordering intent.
 */
add_filter( 'script_loader_tag', function ( $tag, $handle, $src ) {
	if ( ! in_array( $handle, empower_module_script_handles(), true ) ) {
		return $tag;
	}
	return preg_replace( '/<script /', '<script type="module" ', $tag, 1 );
}, 10, 3 );
