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
require_once get_stylesheet_directory() . '/inc/content-loop.php';
require_once get_stylesheet_directory() . '/inc/person-loop.php';
require_once get_stylesheet_directory() . '/inc/search-loop.php';
require_once get_stylesheet_directory() . '/inc/post-single.php';
require_once get_stylesheet_directory() . '/inc/archive.php';

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
		'podcast'      => array( 'motion', 'podcast-a' ),
		/* what-we-do-a. Read off dist/what-we-do-a.html's own <head>, which
		   loads (after the shared tokens/components cascade and the
		   unconditional header sheet) the site stylesheet, the header sheet,
		   the motion sheet, then its own what-we-do-a sheet, in that order.
		   The site and header sheets are already enqueued unconditionally
		   above, so only the two page-specific sheets beyond that shared
		   cascade belong here, the same shape podcast-a's own entry takes. */
		'what-we-do'   => array( 'motion', 'what-we-do-a' ),
		/* solutions-b. Read off dist/solutions-b.html's own <head>, which loads
		   (after the shared tokens/components cascade and the unconditional
		   header sheet) the site stylesheet, the header sheet, the motion
		   sheet, then its own solutions-b sheet, in that order. Same shape as
		   what-we-do-a's entry above, for the same reason: the site and
		   header sheets are already enqueued unconditionally. */
		'solutions'    => array( 'motion', 'solutions-b' ),
		/* capitol-a. Read off dist/capitol-a.html's own <head>, which loads
		   (after the shared tokens/components cascade and the unconditional
		   header sheet) the site stylesheet, the header sheet, the motion
		   sheet, then its own capitol-a sheet, in that order. Same shape as
		   what-we-do-a's and solutions-b's own entries above, for the same
		   reason: the site and header sheets are already enqueued
		   unconditionally. */
		'capitol-chat' => array( 'motion', 'capitol-a' ),
		/* team-a. Read off dist/team-a.html's own <head>, which loads (after
		   the shared tokens/components cascade and the unconditional header
		   sheet) the site stylesheet, the header sheet, the motion sheet,
		   then its own team-a sheet, in that order. Same shape as every
		   entry above, for the same reason: the site and header sheets are
		   already enqueued unconditionally. */
		'team'         => array( 'motion', 'team-a' ),
		/* THE `person` POST TYPE, NOT A PAGE SLUG, and empower_style_key()'s
		   docblock carries why the two are looked up differently. Every single
		   in this post type is rendered by the Elementor Single template in
		   elementor/theme-parts/person-single.mjs, which is
		   dist/team-bio.html's design serving all eighteen published people
		   instead of the one page it was hand-filled for. So the sheets are
		   that page's own, read off dist/team-bio.html's <head>: the shared
		   tokens/components cascade, the site sheet and the header sheet are
		   already enqueued unconditionally, leaving the motion sheet and
		   css/team-bio.css, in that order. Same shape as every entry above.

		   The converted page at /grant-callen/ (page 20607) keeps its own
		   `grant-callen` row below and is unaffected: it is a page, so it is
		   still keyed by slug. */
		'person'       => array( 'motion', 'team-bio' ),
		/* THE `post` POST TYPE, AND IT IS A CONVERSION AS OF 2026-08-23. All
		   490 posts now render through the Elementor Theme Builder single
		   template built by elementor/theme-parts/post-single.mjs, which
		   replaced the Beaver Themer layout "Post Singular" (11272, set to
		   draft). motion.css IS here now, unlike in the Beaver arrangement
		   this replaces: that markup carried no reveal attributes for the
		   motion sheet to bind to, and this template authors them.
		   css/post-single.css carries both halves and says which is which. */
		/* content-a IS in this list, and it is not a mistake. The closing
		   "More on this" grid reuses content-a's own card Loop Item templates,
		   so its cards ARE `.cad-card` and the design lives in that sheet.
		   Loading it is 20KB against duplicating a signed-off design into a
		   second file that would then have to be kept in step. Checked for
		   collisions before adding: the only rules in it that are not scoped
		   to a `.cad-` class are four `body:has(#ca-…:checked)` filter rules,
		   and those ids exist on the All Content page alone, so `:has()`
		   cannot match here. */
		'post'         => array( 'motion', 'content-a', 'post-single' ),
		/* THE CATEGORY ARCHIVE, and the only key here that is not a post type
		   or a page slug. content-a.css is in the list for the same reason it
		   is in the `post` row above: the cards on this page ARE `.cad-card`,
		   because the Loop Grid points at content-a's own article Loop Item
		   rather than at a second card design. motion.css matters more here
		   than anywhere: empower_page_has_motion() derives from THIS map, so
		   an archive without a key would ship the reveal attributes the
		   template authors and nothing to act on them. */
		'archive'      => array( 'motion', 'content-a', 'archive' ),
		/* who-we-are-a. Read off dist/who-we-are-a.html's own <head> (lines
		   10-22), which loads the shared tokens cascade, components.css, then
		   the site stylesheet, the header sheet, the motion sheet, and its own
		   who-we-are-a sheet last. The site and header sheets are already
		   enqueued unconditionally above, so only the two page-specific sheets
		   beyond that shared cascade belong here: the same shape every entry
		   above takes, for the same reason. */
		'who-we-are'   => array( 'motion', 'who-we-are-a' ),
		/* mail-a. Read off dist/mail-a.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own mail-a
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason. */
		'newsletter'   => array( 'motion', 'mail-a' ),
		/* amb-a. Read off dist/amb-a.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own amb-a
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason. */
		'ambassadors'  => array( 'motion', 'amb-a' ),
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
		'epic'         => array( 'motion', 'epic-a' ),
		/* give-c. Read off dist/give-c.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own give-c
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason. */
		'donate'       => array( 'motion', 'give-c' ),
		/* team-bio. Read off dist/team-bio.html's own <head> (lines 10-22),
		   which loads the shared tokens cascade, components.css, then the
		   site stylesheet, the header sheet, the motion sheet, and its own
		   team-bio sheet last. The site and header sheets are already
		   enqueued unconditionally above, so only the two page-specific
		   sheets beyond that shared cascade belong here: the same shape
		   every entry above takes, for the same reason. */
		'grant-callen' => array( 'motion', 'team-bio' ),
		/* safety. Read off dist/safety.html's own <head> (lines 10-22), which
		   loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and css/solution.css
		   last. The site and header sheets are already enqueued unconditionally
		   above, so only the two page-specific sheets beyond that shared
		   cascade belong here: the same shape every entry above takes, for the
		   same reason.

		   THE SHEET IS NAMED FOR THE TEMPLATE, NOT FOR THE PAGE, and this is
		   the first row where those differ. css/solution.css is "The
		   Streetlight", shared by all three solution pages, and its own header
		   says so; `work` and `education` will be two more slugs pointing at
		   this same sheet rather than at one of their own. A row that assumed
		   slug and sheet were the same word would enqueue css/safety.css,
		   which does not exist, and the page would render unstyled with
		   nothing in the enqueue reporting it. */
		'public-safety'=> array( 'motion', 'solution' ),
		/* work. Read off dist/work.html's own <head> (lines 10-22), which is the
		   same cascade safety's row records and ends in css/solution.css, the
		   template sheet all three solution pages share.

		   THE KEY IS `work-2` AND NOT `work`, and that is install state rather
		   than a naming choice. This map is keyed by the page's SLUG (see the
		   lookup below, which reads get_post_field( 'post_name' )), and the
		   slug `work` was already held by post 18512, Empower's own live Work
		   page. `wp post create ... --post_name=work` returned post 20609 and
		   WordPress assigned it `work-2`; the slug was read back off the
		   install rather than assumed, which is the trap safety's own page.mjs
		   names. A row keyed 'work' would match no page, this page would load
		   neither the motion sheet nor css/solution.css, and it would render
		   unstyled with nothing in the enqueue reporting it.
		   elementor/pages/work/page.mjs records the collision in full. */
		'meaningful-work' => array( 'motion', 'solution' ),
		/* education. Read off dist/education.html's own <head> (lines 10-22),
		   which is the same cascade safety's and work's rows record and ends in
		   css/solution.css, the template sheet all three solution pages share.
		   This is the third and last row of the solution unit, and the point
		   safety's row anticipated: three slugs, one stylesheet.

		   THE KEY IS `education`, WITH NO SUFFIX, and that was read back off
		   the install rather than assumed, for exactly the reason work's row
		   above records. `wp post create ... --post_name=education` returned
		   post 20611 and `wp post get 20611 --field=post_name` returns
		   `education`. It was free because Empower's own live Education page is
		   post 18537 under `education-3`, with `education-2` (post 11509) and
		   `education-old` (post 35) also taken; the unsuffixed slug had already
		   been vacated. elementor/pages/education/page.mjs records the check. */
		'quality-education' => array( 'motion', 'solution' ),
		/* landing, the campaign TEMPLATE. Read off dist/landing.html's own
		   <head> (lines 10-22), which is the same shared cascade every row
		   above records and ends in this page's own css/landing.css.

		   THE KEY IS `landing`, WITH NO SUFFIX, and that was read back off the
		   install rather than assumed, for the reason work's row above records.
		   `wp post create ... --post_name=landing` returned post 20612 and
		   `wp post get 20612 --field=post_name` returns `landing`. It was free
		   because no post of any type on this install held that slug:
		   `wp post list --post_type=any --post_status=any --name=landing`
		   returned an empty result set before the page was created.
		   elementor/pages/landing/page.mjs records the check.

		   THIS ROW SURVIVES THE TEMPLATE BEING DUPLICATED, and that is worth
		   saying because this page is meant to be duplicated. The map is keyed
		   by SLUG, so a campaign page copied from this one gets its own slug
		   and picks up NO row, which means it loads the shared cascade and not
		   css/landing.css. Whoever duplicates it adds a row here for the new
		   slug, or the copy renders unstyled. That is a hand-off step and it is
		   in the task-20 report. */
		'landing'      => array( 'motion', 'landing' ),
		/* content-a. Read off dist/content-a.html's own <head> (lines 10-22),
		   which loads the shared tokens cascade, components.css, then the site
		   stylesheet, the header sheet, the motion sheet, and its own content-a
		   sheet last. The site and header sheets are already enqueued
		   unconditionally above, so only the two page-specific sheets beyond
		   that shared cascade belong here: the same shape every entry above
		   takes, for the same reason.

		   The slug `content-a` was free before the page was created, checked
		   with `wp post list --post_type=any --post_status=any
		   --name=content-a`, and read back as `content-a` with no suffix
		   afterwards. elementor/pages/content-a/page.mjs records both checks. */
		'all-content'  => array( 'motion', 'content-a' ),
		/* The homepage. Read off dist/final.html's own <head>, in its order,
		   not from the README row: final.html composes from four other pages'
		   stylesheets plus its own, and the order between them is the whole
		   reason the composition renders. README's own hand-off notes flag
		   consolidating these into one sheet as cleanup that has not been
		   done, so the list stays exactly as the static page loads it until
		   that happens. */
		'homepage'     => array( 'homepage', 'motion', 'option-a', 'option-d', 'current-2', 'final' ),
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

	$slug = empower_style_key();
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
 * The key empower_page_styles() is looked up by, for the current request.
 *
 * A PAGE'S KEY IS ITS SLUG; A SINGULAR OF ANY OTHER POST TYPE IS KEYED BY ITS
 * POST TYPE. That distinction is not cosmetic, and it was added on 2026-08-20
 * because the version without it was already wrong on the live install in two
 * directions at once.
 *
 * WHAT WAS BROKEN. The lookup used to be
 * `get_post_field( 'post_name', get_queried_object_id() )` for every singular,
 * of every post type. That is fine while pages are the only Elementor-rendered
 * singulars, and it stopped being true the moment the `person` post type got a
 * Single template of its own (elementor/theme-parts/person-single.mjs), which
 * renders dist/team-bio.html's design and therefore needs css/team-bio.css.
 * Eighteen person singles rendered that design with no page stylesheet at all.
 *
 * AND ONE OF THEM DID NOT, WHICH IS THE HALF WORTH READING. The `person` post
 * for Grant Callen has post_name `grant-callen`, and so does the converted page
 * at /grant-callen/ (the hand-filled bio, page 20607). So `/person/grant-callen/`
 * matched the PAGE's row by coincidence of slug and loaded exactly the right
 * two sheets, while the other seventeen loaded none. A bug that is correct on
 * the one example anybody would check first is the kind this file should not be
 * able to have: without this function, adding a Person whose slug happened to
 * equal a converted page's slug would silently give that person that page's
 * stylesheet.
 *
 * The `person` row therefore keys the POST TYPE, and Grant's own single now
 * resolves through it like everybody else's rather than through a collision.
 * The two rows still name the same sheets, which is why the symptom was
 * invisible on his page.
 *
 * Pages keep the slug because their rows genuinely differ per page, which is
 * the whole reason the map exists. If a second custom post type is ever given a
 * design of its own, it gets a row keyed by its post type here, not eighteen
 * rows keyed by its posts' slugs.
 *
 * A COLLISION IS STILL POSSIBLE IN PRINCIPLE, between a post type name and a
 * page slug, and it is not guarded here because it cannot happen quietly: a
 * page slugged `person` would have to be created by hand, and it would show up
 * immediately as a page wearing the bio stylesheet. The failure this function
 * exists to remove is the one that produced NO symptom on the page anybody
 * would look at.
 *
 * @return string The map key, or '' when nothing should be looked up.
 */
function empower_style_key() {
	if ( ! is_singular() ) {
		/* THE ONE NON-SINGULAR KEY, ADDED 2026-08-26 with the category archive
		   template (elementor/theme-parts/category-archive.mjs). It sits INSIDE
		   the is_singular() guard rather than before it so the two older cases
		   keep their precedence exactly: a singular is still answered by slug
		   or by post type, and only a request that is not singular at all can
		   reach this.

		   `is_category()` and not `is_archive()`, though the template's
		   condition is an archive one. is_archive() is also true on tag, author
		   and date archives, which are NOT converted and are meant to keep
		   archive.php's plain-list fallback; keying them 'archive' would hand
		   them css/archive.css and motion.css for markup that has neither the
		   classes nor the reveal attributes to use them. */
		/* `is_category() || is_home()` and still not `is_archive()`. is_home() is
		   the posts page (/updates/), which joined this template on 2026-08-27.
		   is_archive() would also be true on tag and date archives, which are
		   NOT converted and are meant to keep archive.php's plain fallback; keying them 'archive' would hand them css/archive.css and
		   motion.css for markup that has neither the classes nor the reveal
		   attributes to use them. */
		if ( is_category() || is_home() || is_author() ) {
			return 'archive';
		}

		return '';
	}

	$post_id = get_queried_object_id();
	if ( ! $post_id ) {
		return '';
	}

	$post_type = get_post_type( $post_id );
	if ( 'page' !== $post_type ) {
		return (string) $post_type;
	}

	return (string) get_post_field( 'post_name', $post_id );
}

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
 * Every script handle that must load with type="module": the four
 * site-wide scripts enqueued unconditionally above, plus every handle
 * empower_page_scripts() can emit for any page slug. Built from the same
 * function the per-page enqueue loop below reads, not a second list typed
 * out by hand, so a handle the enqueue emits can never be one this filter
 * fails to recognise. That is what actually broke here once already:
 * empower_page_scripts() emits handles shaped 'empower-script-<name>'
 * (see the enqueue loop below), and a filter matching only
 * 'empower-nav' / 'empower-reveal' / 'empower-dropdown' / 'empower-search'
 * by name would let any future entry in empower_page_scripts() load as a
 * classic script, which is the exact condition that produced this branch's
 * site-wide dropdown regression.
 */
function empower_module_script_handles() {
	$handles = array( 'empower-nav', 'empower-reveal', 'empower-dropdown', 'empower-search' );
	foreach ( empower_page_scripts() as $scripts ) {
		foreach ( $scripts as $script ) {
			$handles[] = 'empower-script-' . $script;
		}
	}
	return $handles;
}

/**
 * Whether this request loads css/motion.css.
 *
 * Derived from empower_page_styles(), never from a second list. The reveal
 * gate below has to know the answer BEFORE wp_enqueue_scripts has run
 * (language_attributes() is emitted in header.php on the line above <head>,
 * and enqueues happen inside wp_head()), so wp_style_is() cannot be asked.
 * Reading the same map the enqueue reads is what keeps the two from drifting:
 * a page added to that map gets the gate for free, and a page removed from it
 * loses the gate in the same edit.
 *
 * @return bool
 */
function empower_page_has_motion() {
	return in_array( 'motion', empower_page_styles()[ empower_style_key() ] ?? array(), true );
}

/**
 * THE REVEAL GATE, IN THE SERVER MARKUP RATHER THAN IN JAVASCRIPT, and this
 * is the repair for a defect measured on the live install on 2026-08-20:
 * NO CONVERTED PAGE'S HERO EVER ANIMATED.
 *
 * WHAT WAS BROKEN. css/motion.css nests every hidden start-state under
 * [data-reveal="on"], and js/reveal.js set that attribute as its first
 * statement. js/reveal.js is a deferred script, so on this install it ran
 * AFTER first paint, every time:
 *
 *     /person/kienna-horn/   first paint 392ms   gate set 408ms
 *     /            (home)    first paint 268ms   gate set 304ms
 *
 * So the page painted fully visible; only then did opacity:0 apply; and
 * js/reveal.js adds .is-revealed two frames (~30ms) after that. The start
 * state never held for a frame the user could see, and a frame-by-frame read
 * of the hero's computed opacity is 1.00 for the whole load. Scroll reveals
 * further down the page were unaffected, because by the time they intersect
 * the start state has long since applied, which is why the symptom read as
 * "some pages animate and some do not" rather than as a single broken thing.
 *
 * THE FIX IS ONE ATTRIBUTE, MOVED. Emitting data-reveal="on" on <html> puts
 * the start state in the first paint, and leaves js/reveal.js doing exactly
 * what it was written to do: assign the stagger indices and add .is-revealed.
 * js/reveal.js still sets the attribute itself and that is deliberately left
 * alone -- setting it twice to the same value is free, and the script stays
 * correct on any page this filter does not cover.
 *
 * THE PROGRESSIVE-ENHANCEMENT CONTRACT IS PRESERVED, NOT TRADED AWAY.
 * js/reveal.js's own header states the contract: if the script never loads,
 * nothing is ever hidden. Hard-coding the gate would break exactly that, so
 * the <noscript> block below restores it. It ships in the markup beside the
 * gate rather than in css/motion.css because css/ is the protected static
 * build, and because a rule inside <noscript> cannot be defeated by the load
 * order of a stylesheet that is not there.
 *
 * WHAT IT COSTS. The hero is now genuinely invisible between first paint and
 * js/reveal.js running -- about 20ms on the measurements above -- and then
 * fades in over --dur-reveal. That is what an entrance animation is; the
 * alternative is the animation not existing, which is the state being fixed.
 */
add_filter( 'language_attributes', function ( $output ) {
	if ( ! empower_page_has_motion() ) {
		return $output;
	}
	return $output . ' data-reveal="on"';
} );

add_action( 'wp_head', function () {
	if ( ! empower_page_has_motion() ) {
		return;
	}
	/* !important on every property, because css/motion.css's own start-states
	   are the rules being overridden and they are equally specific. The
	   selector deliberately does not mention .is-revealed: with no script
	   there is no such class, and matching [data-reveal] alone is what makes
	   the page render as though this layer had never been added. */
	echo "<noscript><style>[data-reveal]{opacity:1!important;transform:none!important;clip-path:none!important;transition:none!important}</style></noscript>\n";
}, 1 );

/**
 * A DEFAULT SOCIAL SHARE IMAGE, because every page had none.
 *
 * Measured across the eighteen converted pages on 2026-08-21: og:title and
 * twitter:card were present on all of them and og:image on none. Worse than
 * merely absent, twitter:card is set to "summary_large_image", a card format
 * whose entire purpose is to promise a large image. Every link posted to
 * LinkedIn, Facebook or Slack rendered as a bare grey box.
 *
 * THE CARD IS BUILT FROM THE BUILD'S OWN ASSETS, not chosen from the
 * photography. Which photograph represents the whole organisation is Empower's
 * decision and not one to make silently, so assets/share-card.png is the
 * primary wordmark on white, marked from above by the 56x4 orange rule this
 * build uses as its motif, at the 1200x630 both Facebook and X document as the
 * size they want. It is a neutral default that is right for every page rather
 * than a guess that is right for one.
 *
 * PRIORITY 20, AFTER AIOSEO. All in One SEO owns the rest of the Open Graph
 * block and currently emits no image at all. If it is ever configured to, this
 * would become a second og:image on the page, and duplicates are not harmless:
 * the scrapers pick one and nobody can predict which. The gate in
 * test-elementor.mjs asserts exactly ONE og:image per page, which is what turns
 * that from an invisible regression into a red test.
 *
 * og:description IS DELIBERATELY NOT SET HERE. It should mirror the meta
 * description, seventeen of eighteen pages do not have one, and writing them is
 * Empower's copy decision rather than a mechanical fix. Flagged in the audit,
 * left alone here.
 */
add_action( 'wp_head', function () {
	$url = get_stylesheet_directory_uri() . '/assets/share-card.png';
	printf(
		"<meta property=\"og:image\" content=\"%s\" />\n"
		. "<meta property=\"og:image:width\" content=\"1200\" />\n"
		. "<meta property=\"og:image:height\" content=\"630\" />\n"
		. "<meta property=\"og:image:alt\" content=\"%s\" />\n"
		. "<meta name=\"twitter:image\" content=\"%s\" />\n",
		esc_url( $url ),
		esc_attr__( 'Empower Mississippi', 'empowerms' ),
		esc_url( $url )
	);
}, 20 );

/**
 * Pages that exist on this install but should never be found in a search
 * result, keyed by slug because that is what survives a database rebuild.
 *
 * `zz-native-animation-probe` is the fixture the native-animation gate needs
 * (elementor/theme-parts/native-animation-probe.mjs) and it has to stay
 * PUBLISHED for that test to fetch it, so it cannot simply be drafted.
 * `zz-spike-markup` is a dead measurement spike. `landing` is the campaign
 * template: a real signed-off deliverable, but a template carrying placeholder
 * copy, meant to be duplicated rather than visited.
 *
 * All three were in the public page sitemap when the SEO audit ran.
 *
 * ONE LIST, TWO EFFECTS, because the two are separate switches and shipping one
 * without the other is the classic mistake: excluding a page from a sitemap
 * does not stop it being indexed if anything links to it, and noindexing it
 * does not stop it advertising itself in the sitemap. Both, from the same
 * source of truth, so they cannot drift.
 *
 * At launch these pages should be DELETED rather than hidden. This is the
 * safety net, not the plan.
 */
function empower_hidden_slugs() {
	return array( 'zz-native-animation-probe', 'zz-spike-markup', 'landing' );
}

/* Whether the page being rendered is one of the hidden set. */
function empower_is_hidden_page() {
	return is_singular()
		&& in_array( get_post_field( 'post_name', get_queried_object_id() ), empower_hidden_slugs(), true );
}

/* AIOSEO's filter, NOT core's `wp_robots`, and the difference was measured
   rather than assumed. A `wp_robots` filter was written here first and had no
   effect at all: All in One SEO replaces WordPress's robots tag with one it
   builds itself, so core's filter never reaches the output and the three pages
   still rendered `max-image-preview:large` with no noindex. The plugin's own
   `aioseo_robots_meta` filter is the only hook that touches the tag that
   actually ships. Verified against the live pages after the change, which is
   the only way this kind of plugin-ownership question can be settled. */
add_filter( 'aioseo_robots_meta', function ( $meta ) {
	if ( ! empower_is_hidden_page() ) {
		return $meta;
	}
	$meta = is_array( $meta ) ? $meta : array();
	/* Both, and index/follow dropped: AIOSEO assembles the tag from this list,
	   so leaving a stale "index" beside "noindex" would emit a tag that
	   contradicts itself. */
	$meta = array_values( array_diff( $meta, array( 'index', 'follow' ) ) );
	foreach ( array( 'noindex', 'nofollow' ) as $directive ) {
		if ( ! in_array( $directive, $meta, true ) ) {
			$meta[] = $directive;
		}
	}
	return $meta;
} );

/**
 * THE FRONT PAGE TOLD EVERY SCRAPER IT WAS AN ARTICLE.
 *
 * `og:type` shipped as "article" on the homepage, with article:published_time
 * and article:modified_time beside it. The 2026-08-21 SEO audit filed this as
 * "AIOSEO setting", and it is not one.
 *
 * THE SETTING THAT LOOKS LIKE IT GOVERNS THIS IS ALREADY CORRECT AND GOVERNS
 * NOTHING. All in One SEO reads Social Networks > Facebook > Home Page >
 * Object Type only when `show_on_front` is "posts". This install serves a
 * static page as its front page (`show_on_front=page`), so that branch never
 * runs. The option reads "website" today. Someone can open that screen,
 * find it already right, close it, and have changed nothing at all.
 *
 * What actually decides the tag is the plugin's per-post-type default, which
 * says "article" for every `page`. That is a dynamic option: invisible to
 * every test in this repository, and revertible by anyone in wp-admin without
 * noticing. Same argument as the Google Fonts filter above and the same
 * decision: prefer the change a test can see.
 *
 * AIOSEO PUBLISHES NO FILTER FOR og:type. `aioseo_facebook_tags` is the only
 * hook over this block and it receives the whole assembled array, which is
 * why this reaches in by key rather than returning a value.
 *
 * THE article:* TAGS ARE THE OTHER HALF, and the half a narrower fix would
 * have left behind. AIOSEO appends article:section, article:tag,
 * article:published_time, article:modified_time, article:publisher and
 * article:author whenever it has decided the type is "article", and it does
 * that BEFORE this filter runs. Setting og:type on its own would ship a page
 * that calls itself a website and still dates itself like an article. So the
 * prefix is swept rather than the two tags that happen to be non-empty today:
 * article:section and article:author appear the moment a category or an
 * author is set, and a fix listing today's two by name would quietly stop
 * covering them.
 *
 * FRONT PAGE ONLY, and that is a scope decision rather than an oversight. All
 * fifteen other converted pages carry the same wrong tag for the same reason.
 * Widening this is one predicate -- is_singular( 'page' ) here -- but it
 * changes the social metadata of pages Empower has signed off, so it is an
 * open question for them rather than a quiet extension. The blog posts, where
 * "article" is correct, must keep it either way; `the front page shares as a
 * website, and a blog post still shares as an article` asserts both sides.
 */
add_filter( 'aioseo_facebook_tags', function ( $meta ) {
	if ( ! is_front_page() ) {
		return $meta;
	}
	$meta['og:type'] = 'website';
	foreach ( array_keys( $meta ) as $key ) {
		if ( 0 === strpos( $key, 'article:' ) ) {
			unset( $meta[ $key ] );
		}
	}
	return $meta;
} );

/**
 * PAGES THAT NOW 301 SOMEWHERE ELSE, and must stop advertising themselves.
 *
 * Nine legacy pages were duplicates of converted ones: indexable, SELF-
 * canonical, and competing with the very pages that got approved search
 * listings on 2026-08-21. The Redirection plugin now sends each to its
 * replacement. That is the visitor half; this is the crawler half.
 *
 * AIOSEO CANNOT SEE REDIRECTION'S RULES. The posts are still `publish`, so the
 * sitemap kept listing all nine after the redirects went live, which tells
 * Google to go and fetch nine URLs that immediately bounce it somewhere else.
 * Measured after deploying, not assumed: 67 urls before, 67 after, all nine
 * still there.
 *
 * SEPARATE FROM empower_hidden_slugs() ON PURPOSE. A hidden page renders and
 * needs a noindex tag; these never render at all, so the robots filter above
 * would never fire for them and pretending otherwise would be a comment that
 * lies. All they need is to leave the sitemap, so they share that filter and
 * nothing else.
 *
 * THE LIST IS DUPLICATED FROM elementor/redirects.mjs, which is a PHP file and
 * a JS file holding the same nine strings, i.e. exactly the drift this
 * repository keeps getting bitten by. It is gated: `the redirected pages leave
 * the sitemap` in test-elementor.mjs reads this function's source and asserts
 * it equals REDIRECTS, so adding a tenth redirect without adding it here goes
 * red.
 *
 * At launch these pages should be DELETED and the redirects kept. This is the
 * interim state, not the plan.
 */
function empower_redirected_slugs() {
	return array(
		'home',
		'team-old',
		'board',
		'donate-old',
		'about',
		'work',
		'justice',
		'education-3',
		'the-empower-podcast',
	);
}

/* AIOSEO builds its own sitemap and consults none of WordPress's robots
   filters, so the same list has to be handed to it separately. The filter
   takes an array of post IDs and is resolved from slugs at request time rather
   than hard-coding ids, for the reason the page style map already records: an
   id typed into a file is wrong the first time a post is recreated. */
add_filter( 'aioseo_sitemap_exclude_posts', function ( $ids ) {
	$slugs = array_merge( empower_hidden_slugs(), empower_redirected_slugs() );
	foreach ( $slugs as $slug ) {
		$page = get_page_by_path( $slug );
		if ( $page ) {
			$ids[] = (int) $page->ID;
		}
	}
	return $ids;
} );

/**
 * TWO URLS, ONE PERSON, and only one of them can be the bio.
 *
 * /grant-callen/ is the converted team-bio TEMPLATE, filled with Grant so the
 * design could be reviewed. /person/grant-callen/ is the same person out of
 * the `person` CPT, which is what drives /team/ and every other bio. Both
 * return 200, both are titled "Grant Callen - Empower Mississippi", both carry
 * the same biography, and before this filter each declared itself canonical.
 * That is the textbook duplicate: two URLs competing for one person's name,
 * with Google left to pick, and no way to predict which.
 *
 * Paolo chose consolidation over hiding on 2026-08-21: the template page stays
 * reachable and reviewable, and points its canonical at the CPT bio, so any
 * signal the template URL earns is credited to the page that is actually the
 * bio. The alternative considered was adding it to empower_hidden_slugs(),
 * which would have noindexed it instead.
 *
 * KEYED BY SLUG, resolved at request time, for the reason the sitemap filter
 * above already records: an id typed into a file is wrong the first time a
 * post is recreated. The target is built with home_url() rather than written
 * out, so this does not have to be edited when the install moves off
 * empv2.wpenginepowered.com onto the real domain.
 */
function empower_canonical_overrides() {
	return array(
		/* page slug => the path it should credit instead */
		'grant-callen' => '/person/grant-callen/',
	);
}

/**
 * THREE CATEGORY TERMS THAT DESCRIBE A SUBJECT, EACH WITH A PAGE THAT SAYS THE
 * SAME THING BETTER.
 *
 * The category taxonomy on this install carries two unrelated kinds of term at
 * one level: what a post IS (Podcast, Bill Summaries, Press Releases...) and
 * what it is ABOUT (Education, Work, Justice). inc/post-single.php has to code
 * a precedence between them for the article eyebrow; this is the other half of
 * the same problem. The three subject terms are the largest on the install
 * (education 147 posts, work 126, justice 78) and each one duplicates a
 * converted, signed-off page for the same reader.
 *
 * Left alone they are self-canonical, which means competing rather than
 * consolidating: exactly the shape the 2026-08-21 SEO audit found twelve
 * existing instances of. Canonical rather than redirect or noindex, on Paolo's
 * 2026-08-26 call and for the same reason as the Grant Callen pair above: the
 * archive stays reachable and useful as a way to browse a subject, and the
 * signal it earns is credited to the page that is the destination.
 *
 * KEYED BY TERM SLUG, resolved at request time, never by term id, for the
 * reason the sitemap and page-slug maps already record.
 */
function empower_term_canonical_overrides() {
	return array(
		/* category term slug => the converted page it should credit instead */
		'education' => '/quality-education/',
		'work'      => '/meaningful-work/',
		'justice'   => '/public-safety/',
	);
}

add_filter( 'aioseo_canonical_url', function ( $url ) {
	/* THE TERM BRANCH COMES FIRST BECAUSE IT IS THE NON-SINGULAR CASE, and the
	   singular guard below would otherwise return before it could run. Two maps
	   in one filter deliberately: canonicals are decided in one place, which is
	   the discipline whose absence produced the pair this filter was written
	   for. */
	/* THE POSTS PAGE LISTS ALL 490 POSTS, which is what the signed-off All
	   Content page already is. Two indexable listings of one set compete rather
	   than consolidate, so /updates/ credits /all-content/ -- the same call made
	   for the three subject terms below, on 2026-08-27. Guarded on the
	   destination existing for the same reason. */
	if ( is_home() ) {
		$target = get_page_by_path( 'all-content', OBJECT, 'page' );
		if ( ! $target || 'publish' !== get_post_status( $target ) ) {
			return $url;
		}
		return home_url( '/all-content/' );
	}

	if ( is_category() ) {
		$term      = get_queried_object();
		$overrides = empower_term_canonical_overrides();
		if ( ! $term || ! isset( $overrides[ $term->slug ] ) ) {
			return $url;
		}
		/* Only if the destination actually exists and is published. A canonical
		   pointing at a 404 or a draft is worse than the duplicate it replaces,
		   and these three pages are content that can be renamed without this
		   file hearing about it. */
		$target = get_page_by_path( trim( $overrides[ $term->slug ], '/' ), OBJECT, 'page' );
		if ( ! $target || 'publish' !== get_post_status( $target ) ) {
			return $url;
		}
		return home_url( $overrides[ $term->slug ] );
	}

	if ( ! is_singular() ) {
		return $url;
	}
	$slug      = get_post_field( 'post_name', get_queried_object_id() );
	$overrides = empower_canonical_overrides();
	if ( ! isset( $overrides[ $slug ] ) ) {
		return $url;
	}
	/* Only if the target actually exists. A canonical pointing at a 404 is
	   worse than the duplicate it was meant to fix, and the CPT bio is
	   Empower's content, so it can be renamed or unpublished without this
	   file hearing about it. */
	/* basename, not the whole path: `person` is not hierarchical, so its
	   post_name is "grant-callen" and get_page_by_path() would find nothing
	   if handed "person/grant-callen". */
	$target = get_page_by_path( basename( trim( $overrides[ $slug ], '/' ) ), OBJECT, 'person' );
	if ( ! $target || 'publish' !== get_post_status( $target ) ) {
		return $url;
	}
	return home_url( $overrides[ $slug ] );
} );

/**
 * THE HEADER'S OWN VERSION OF THE DEFERRED-GATE DEFECT, and it is the same
 * shape as the reveal gate above with a different set of scripts.
 *
 * WHAT A VISITOR SEES. src/_shared/header-2.html ships the five dropdown
 * panels and the search panel OPEN, in normal flow, by design: that is
 * js/dropdown.js's and theme-js/search.js's progressive-enhancement contract,
 * and it is what keeps every nav destination reachable when those scripts do
 * not load. Each script closes its own panels and sets its gate
 * (data-dropdown="on", data-search="on") as it runs. Both are deferred, so on
 * this install both ran AFTER first paint, every time. Measured on the
 * homepage 2026-08-20: first paint 1336ms, gates set 1397ms, and in between
 * the header is 727px tall with all five panels laid out and the search bar
 * open. It then collapses to 137px. A 590px jump on every page load.
 *
 * WHY AN INLINE HEAD SCRIPT RATHER THAN THE language_attributes FILTER THE
 * REVEAL GATE USES. Both would remove the jump, but they fail differently
 * when a script is missing, and here the content at stake is the navigation.
 *
 *   - Hard-coding the closed state in the server markup needs a <noscript>
 *     block to stay honest, and <noscript> only covers JavaScript being
 *     DISABLED. It does nothing when JS is on and the script 404s or is
 *     blocked, and in that case the panels would stay hidden with no way
 *     back: the whole desktop nav, gone, silently.
 *   - Setting the attribute from an inline script inverts both failures.
 *     JavaScript off means this never runs, so nothing is ever hidden and the
 *     contract holds with no <noscript> needed at all. JavaScript on but the
 *     external script missing is caught by the timeout below.
 *
 * INLINE AND BLOCKING, IN THE HEAD, ON PURPOSE. It has to have run before the
 * first paint or it has not fixed anything; that is the entire defect. It is
 * ~300 bytes and sets two attributes.
 *
 * NEITHER SCRIPT NEEDS TO CHANGE. js/dropdown.js already does
 * `root.setAttribute('data-dropdown', 'on')` and theme-js/search.js already
 * does `doc.setAttribute('data-search', 'on')`. Writing "pending" into the
 * same attributes means their own existing calls OVERWRITE it, so the
 * pending rules in css/bridge.css stop matching the moment either script
 * runs, with nothing added to either file to make that happen.
 *
 * data-nav IS A THIRD ATTRIBUTE, AND HAS TO BE. Added 2026-08-27, when a cold
 * measurement showed #mobile-nav was never covered by any of this. The two
 * attributes above work because their scripts write "on" themselves;
 * js/nav.js writes nothing, it only does `panel.hidden = true`. So the mobile
 * panel kept shipping open until a deferred script ran, and it is ~927px
 * tall: instrumented on the deployed homepage, .fp-hero sat at y=1064 until
 * nav.js landed and then jumped to y=137, one shift scoring 0.8335. js/nav.js
 * is not where the fix goes -- js/ and src/ are the protected static build --
 * so this script clears data-nav itself, below, and css/bridge.css keys on it.
 *
 * DOMContentLoaded IS THE CONTRACT'S LAST RESORT, and it replaced a four
 * second timeout on 2026-08-27. If a script never arrives, nothing else will
 * ever clear "pending" and the panels stay display:none, so something has to
 * clear it; the question is only when. The timeout answered that with a guess
 * about connection speed, and the guess was wrong in exactly the case it
 * existed for. Measured cold (mobile 412x823, Slow 4G, 4x CPU): this script
 * ran at 698ms, the timeout fired at 4,698ms and removed both attributes, and
 * dropdown.js and search.js wrote "on" at 4,975ms. The header went 137px to
 * 266px and back to 137px inside 277ms, scoring 0.1307 twice. The "well past
 * any load this install produces" that justified four seconds rested on a
 * 1,397ms reading taken on a warm cache.
 *
 * DOMContentLoaded needs no such arithmetic. Deferred scripts run to
 * completion before it fires, so by the time it does, every script has either
 * written "on" or failed, and there is no window in which neither is true. In
 * the normal case it fires against attributes that already read "on" and
 * removes nothing. The three changes together took the homepage from CLS 1.02
 * to 0.000.
 */
add_action( 'wp_head', function () {
	echo "<script>(function(){var r=document.documentElement;"
		. "r.setAttribute('data-nav','pending');"
		. "r.setAttribute('data-dropdown','pending');r.setAttribute('data-search','pending');"
		. "document.addEventListener('DOMContentLoaded',function(){"
		. "['data-nav','data-dropdown','data-search'].forEach(function(a){"
		. "if(r.getAttribute(a)==='pending')r.removeAttribute(a);});"
		. "});})();</script>\n";
}, 1 );

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
	/* The header search overlay. Destination-only, under theme-js/ rather
	   than js/, because js/ is the protected static build and this script
	   has no static counterpart: the static build's search button is
	   decoration. See elementor/theme-parts/header.mjs for the divergence
	   and why it was chosen. */
	wp_enqueue_script( 'empower-search', $dir . '/theme-js/search.js', array(), empower_asset_ver( 'theme-js/search.js' ), array( 'strategy' => 'defer' ) );

	$slug = empower_style_key();
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

/**
 * Elementor's kit asks Google for Inter, and nothing in this build uses it.
 *
 * Measured on the deployed homepage, 2026-08-27: every page requested
 * fonts.googleapis.com/css?family=Inter with eighteen weights and styles,
 * render-blocking, which then opens a second cross-origin connection to
 * fonts.gstatic.com for whichever files it names. The stylesheet itself is
 * only ~1.5 KB; the cost is the two connections sitting on the critical path
 * of every page, for a typeface no visitor will ever see.
 *
 * The design self-hosts Figtree and Source Sans 3 from tokens/fonts.css, both
 * with font-display:swap, and reaches for nothing else. Inter comes from
 * Elementor's own kit, seeded there by UiCore before it was switched off:
 * what UiCore wrote into the kit outlives the plugin, which is the same class
 * of leftover as the kit's container widths.
 *
 * FILTERED RATHER THAN UNSET IN THE KIT, deliberately. Clearing the family in
 * Elementor's own settings is a change to install data that no test in this
 * repository can see and that the next person to open the kit editor can undo
 * without noticing. A filter is in source, ships with the theme, is reverted
 * by deleting it, and is asserted by two tests: one that this filter exists,
 * and one that fetches the deployed page and finds no Google font URL in it.
 *
 * The guard on the other side is 'no shipped stylesheet declares a font this
 * build does not self-host', which fails the moment any stylesheet names a
 * family tokens/fonts.css does not provide. Turning Google Fonts off is only
 * safe for as long as that stays true, so it is a test rather than a comment.
 */
add_filter( 'elementor/frontend/print_google_fonts', '__return_false' );

/**
 * Drops plugin assets that a converted page provably has no use for.
 *
 * Today that is ProfilePress (the wp-user-avatar directory), which enqueues
 * select2, flatpickr and its own frontend bundle site-wide: 60 KB across six
 * requests, five of them render-blocking, measured cold on the deployed
 * homepage on 2026-08-27. select2 is a searchable <select> and flatpickr is a
 * date picker. No converted page has either. The only form-shaped pages in
 * this build are Join Us, and those are Gravity Forms.
 *
 * SCOPED BY MEMBERSHIP OF empower_page_styles(), the register the reveal gate
 * is already derived from, so "a page this project converted" has one
 * definition rather than two. About thirty campaign pages on this install are
 * still Beaver Builder and have not been looked at; stripping a plugin out
 * from under them to save bytes on a page nobody measured would trade a known
 * cost for an unknown breakage.
 *
 * NOT empower_style_key() ON ITS OWN, which is what this shipped as for one
 * deploy on 2026-08-27. That key is the post slug for every singular request,
 * so it is non-empty on the Beaver pages too: the guard read as "converted
 * pages only" and behaved as "everything except tag archives, date archives
 * and search". Three campaign pages had already lost the plugin before anyone
 * looked, and the test that was supposed to prove the scope was asserting that
 * the key appeared in this function rather than that an unconverted page kept
 * its assets. Both halves are now tested, and the second one is the one that
 * failed.
 *
 * MATCHED ON THE REGISTERED src, NOT ON HANDLE NAMES. ProfilePress's handles
 * are not documented and are not visible from this repository, so a list of
 * them here would be a guess that fails silently the day the plugin renames
 * one, and it would fail by loading MORE than intended rather than less, which
 * is the direction nobody checks. The directory in the URL is a fact about
 * what reaches the browser.
 *
 * Dequeue and not deregister: a handle removed from the queue takes its own
 * dependencies with it, because WordPress only resolves dependencies for
 * queued items. Deregistering would additionally break anything outside this
 * plugin that declared a dependency on it, which is a larger promise than this
 * function needs to make.
 */
function empower_drop_unused_plugin_assets() {
	if ( ! array_key_exists( empower_style_key(), empower_page_styles() ) ) {
		return array();
	}

	$unused  = array( 'wp-user-avatar' );
	$dropped = array();

	foreach ( array( wp_scripts(), wp_styles() ) as $registry ) {
		$is_script = $registry instanceof WP_Scripts;
		foreach ( (array) $registry->queue as $handle ) {
			if ( ! isset( $registry->registered[ $handle ] ) ) {
				continue;
			}
			$src = (string) $registry->registered[ $handle ]->src;
			foreach ( $unused as $dir ) {
				if ( false === strpos( $src, '/plugins/' . $dir . '/' ) ) {
					continue;
				}
				$dropped[] = $handle;
				if ( $is_script ) {
					wp_dequeue_script( $handle );
				} else {
					wp_dequeue_style( $handle );
				}
			}
		}
	}

	return $dropped;
}

/* PHP_INT_MAX so every plugin has registered and enqueued before this runs.
   At the default priority the queue is still being filled and the pass reads
   a list that is not finished, which fails by dropping only some of them. */
add_action( 'wp_enqueue_scripts', 'empower_drop_unused_plugin_assets', PHP_INT_MAX );
