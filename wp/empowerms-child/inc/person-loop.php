<?php
/**
 * The `person` custom post type, made queryable and orderable the way
 * /team/'s design asks for.
 *
 * A SIBLING OF inc/content-loop.php AND inc/loop-attributes.php, not an
 * extension of either. Those two are content-a's and podcast-a's; this one is
 * team-a's, and every hook in it is scoped either to a query id this build
 * sets or to a class that exists only inside this page's two Loop Grids.
 * Deleting any one of the three takes exactly one page out of play.
 *
 * WHY THIS FILE EXISTS AT ALL. src/team-a/sections/02-staff.html and
 * 03-fellows.html carry hand-written rosters, and elementor/pages/team-a/
 * 02-staff.mjs's own note records the cost of that as a genuine one: "the ten
 * names and titles here are real, current staff, likely to change (a
 * promotion, a departure, a new hire)... a staff change means editing this
 * file and redeploying, not clicking into the page". The install already holds
 * the roster as data. The `person` post type carries 22 entries with a
 * position title, a bio excerpt, an email and a real headshot on every one of
 * them, so the page can read the roster instead of restating it. Paolo's call
 * on 2026-08-20: the CPT is the roster, always, and the static build is not a
 * second opinion about who works there.
 *
 * WHAT THE INSTALL DOES NOT CARRY, and this file therefore has to derive.
 * There is no taxonomy on `person` at all (`wp taxonomy list` on empv2 returns
 * category, post_tag, resource_topic, testimonial_topic, guest_type and the
 * platform ones; none is registered against `person`), so nothing in the data
 * says which people are staff and which are contributing fellows. The design
 * has them as two separate sections with two different treatments, so the
 * split has to come from somewhere.
 *
 * IT COMES FROM `position_title`, AND THAT IS A DELIBERATE CHOICE OVER
 * REGISTERING A TAXONOMY. Every fellow on the install has a position title
 * beginning with the word "Fellow" ("Fellow on Education", "Fellow on Tax
 * Policy", "Fellow on Criminal Justice Reform"), and no member of staff does.
 * Registering a `person_group` taxonomy instead would be more explicit and
 * would give Empower a control in wp-admin, and it was considered and
 * rejected for one reason: a taxonomy has an UNTERMED state, and a person
 * added in wp-admin without a term would appear in NEITHER grid. That is a
 * silent omission, which is the worst failure available here, and it is
 * exactly the shape of the `guest_type` problem podcast-a is still blocked on
 * (a taxonomy that exists, with 57 of 66 posts untagged, so the pill renders
 * empty). A title test has no unmatched state: anything that is not a fellow
 * is staff, so a new person always appears somewhere, in the section the vast
 * majority of new people belong to. The cost is that rewording a fellow's
 * title to not start with "Fellow" moves them into Our Team, which is visible
 * on the page rather than silent.
 *
 * THE ORDER IS ALPHABETICAL BY LAST NAME, AND THE PAGE SAYS SO OUT LOUD.
 * css/team-a.css:130 and the section's own `.ta-note` carry the line "In
 * alphabetical order by last name", which dist/team-a.html's own comment
 * records as the roadmap's rule, already corrected there for the one place the
 * roadmap slips. WordPress cannot express that ordering: `orderby => title`
 * sorts on the whole post_title, which is first-name order, and on this
 * install it is worse than that, because two entries are titled "Dr. Kristin
 * Vance Richards" and "Dr. Patrick Miller" and would both sort under D.
 * `menu_order` is no help either: it holds a seniority order (Grant 1, Wil 2,
 * Elyse 3) for eight people and 0 for the other five, so ordering by it puts
 * five people ahead of the founder in an order that is really post id.
 *
 * So the sort happens here, in PHP, over the full result set, and reaches
 * WP_Query as `post__in` plus `orderby => post__in`. That is the same
 * mechanism content-a's Research band uses (`post_query_post_type: 'by_id'`),
 * arrived at from the other direction: there it fixes WHICH posts, here it
 * fixes only their ORDER, and the set itself is still whatever the CPT holds
 * at request time. Adding a person in wp-admin still changes the page with no
 * deploy.
 *
 * @package EmpowerMS
 */

/**
 * The prefix that marks a contributing fellow.
 *
 * Matched case-insensitively and anchored at the start of the trimmed title,
 * against the whole word, so "Fellowship Director" (a job that does not exist
 * today, and exactly the kind that would be created) is staff rather than a
 * fellow. Read off the install's own data on 2026-08-20: the six people whose
 * `position_title` begins this way are Christopher Koopman, Conor Norris,
 * Donald Nielsen, Matt Ladner, Joe Bishop-Henchman and J. Robertson, and
 * every one of them is a fellow.
 */
function empower_person_title_is_fellow( $position_title ) {
	return 1 === preg_match( '/^fellow\b/i', trim( (string) $position_title ) );
}

/**
 * The same test, by post id, for callers that have one and no title in hand.
 *
 * Kept as a thin wrapper rather than as the primary form because
 * empower_person_groups() must not call get_post_meta() per row: it runs inside
 * a `pre_get_posts` callback where it already has every title from its own
 * single query, and 22 extra meta reads on a cold object cache is the kind of
 * cost that only shows up on the install.
 */
function empower_person_is_fellow( $post_id ) {
	return empower_person_title_is_fellow( get_post_meta( $post_id, 'position_title', true ) );
}

/**
 * The surname a person sorts under.
 *
 * The last whitespace-separated word of the post title, with any honorific
 * prefix already irrelevant because it is at the FRONT. "Dr. Kristin Vance
 * Richards" sorts under Richards, "Joe Bishop-Henchman" under
 * Bishop-Henchman, "J. Robertson" under Robertson.
 *
 * Accents are folded with remove_accents() so a name carrying one sorts where
 * a reader expects rather than after Z, and the comparison is done on a
 * lowercased string so it does not put every capitalised surname before every
 * lowercase particle. No name on the install needs either today; both are here
 * because the sort has to keep working over names nobody has entered yet, and
 * neither costs anything.
 *
 * A one-word title (an organisation listed as a person, say) sorts under that
 * one word, which is the only sensible reading available.
 */
function empower_person_sort_key( $post ) {
	$title = trim( (string) $post->post_title );
	$parts = preg_split( '/\s+/', $title, -1, PREG_SPLIT_NO_EMPTY );
	$last  = empty( $parts ) ? '' : end( $parts );

	return strtolower( remove_accents( $last ) ) . '|' . strtolower( remove_accents( $title ) );
}

/**
 * Every published person, split into the page's two sections and sorted.
 *
 * ONE READ, TWO CONSUMERS, and the result is memoised per request because both
 * Loop Grids run their own query and would otherwise each pay for a full
 * get_posts() over the post type plus a meta read per row.
 *
 * `post_status => publish` ONLY, and that is the CPT winning rather than a
 * gap. J. Robertson is on the static page and is `private` on the install;
 * Joanna Holbert and Brandi Flood are `private`; Ellery Jones is `draft`.
 * None of them appears. A private post is a decision Empower has already made
 * in wp-admin, and a page that renders it would be overriding that decision
 * from a static file written weeks earlier.
 *
 * @return array {
 *     @type int[] $staff   Post ids, alphabetical by last name.
 *     @type int[] $fellows Post ids, alphabetical by last name.
 * }
 */
function empower_person_groups() {
	static $groups = null;

	if ( null !== $groups ) {
		return $groups;
	}

	/* A DIRECT $wpdb READ, NOT get_posts(), AND THAT IS A CORRECTNESS FIX
	   RATHER THAN AN OPTIMISATION. This function is called from inside an
	   `elementor/query/{query_id}` action, and Elementor Pro fires that action
	   from a `pre_get_posts` callback of its own
	   (Elementor_Post_Query::pre_get_posts_query_filter()). Any WP_Query
	   constructed in here — get_posts() builds one — fires `pre_get_posts`
	   again, which re-enters Elementor's callback, which fires this action
	   again, which calls this function again. The `static $groups` memo does
	   NOT break the cycle, because it is assigned only after the read returns,
	   so the recursion happens entirely before the first memo write.

	   That is not theoretical: the first deploy of this file on 2026-08-20
	   made /team/ return HTTP 500 on every uncached request, while the same
	   page rendered cleanly under `wp eval-file` because the probe happened to
	   call empower_person_groups() once before rendering and primed the memo.
	   A CLI render is not a frontend render, and a cached 200 is not evidence
	   the page works.

	   $wpdb->get_results() runs no WP_Query, fires no `pre_get_posts`, and
	   cannot re-enter. `position_title` is LEFT JOINed rather than read per row
	   so the whole grouping costs one query, and the fellow test below reads
	   the joined value instead of calling get_post_meta() (which would be 22
	   more reads on a cold object cache). */
	global $wpdb;

	$people = $wpdb->get_results(
		$wpdb->prepare(
			"SELECT p.ID, p.post_title, COALESCE( m.meta_value, '' ) AS position_title
			 FROM {$wpdb->posts} p
			 LEFT JOIN {$wpdb->postmeta} m
			   ON m.post_id = p.ID AND m.meta_key = %s
			 WHERE p.post_type = %s AND p.post_status = %s",
			'position_title',
			'person',
			'publish'
		)
	);

	if ( ! is_array( $people ) ) {
		$people = array();
	}

	$staff   = array();
	$fellows = array();

	foreach ( $people as $person ) {
		$key = empower_person_sort_key( $person ) . '|' . $person->ID;
		if ( empower_person_title_is_fellow( $person->position_title ) ) {
			$fellows[ $key ] = (int) $person->ID;
		} else {
			$staff[ $key ] = (int) $person->ID;
		}
	}

	/* ksort() on the composite key, not usort() on the objects: the key already
	   carries surname, then full title, then post id, so it is a total order
	   with no ties to break and no comparison callback to get wrong. SORT_STRING
	   is explicit because the keys can begin with a digit if somebody ever names
	   a person that way, and PHP's default sort flags would then compare two of
	   them numerically. */
	ksort( $staff, SORT_STRING );
	ksort( $fellows, SORT_STRING );

	$groups = array(
		'staff'   => array_values( $staff ),
		'fellows' => array_values( $fellows ),
	);

	return $groups;
}

/**
 * The query ids team-a's two Loop Grids carry, as id => group key.
 *
 * Set on the widgets as `post_query_query_id` (elementor/pages/team-a/
 * 02-staff.mjs and 03-fellows.mjs). Elementor Pro fires
 * `elementor/query/{query_id}` from Elementor_Post_Query::
 * pre_get_posts_query_filter() (wp-content/plugins/elementor-pro/modules/
 * query-control/classes/elementor-post-query.php:408, read on empv2), passing
 * the WP_Query by reference, so anything set here lands before the query runs.
 *
 * Both ids are prefixed `empower_team_` so they cannot collide with a query id
 * Empower sets by hand in the editor on some other page.
 */
function empower_team_query_ids() {
	return array(
		'empower_team_staff'   => 'staff',
		'empower_team_fellows' => 'fellows',
	);
}

foreach ( empower_team_query_ids() as $empower_team_query_id => $empower_team_group ) {
	add_action(
		"elementor/query/{$empower_team_query_id}",
		function ( $query ) use ( $empower_team_group ) {
			/* Belt and braces beside the $wpdb read above. If any future edit
			   puts a WP_Query back into empower_person_groups(), this stops the
			   re-entry being an unbounded recursion and a 500, and makes it a
			   grid that renders nothing instead — a visible defect rather than
			   a dead page. */
			static $running = false;
			if ( $running ) {
				return;
			}
			$running = true;

			$ids = empower_person_groups()[ $empower_team_group ];

			/* An empty post__in is ignored by WP_Query, which would render the
			   grid over every post on the install rather than over nothing. The
			   0 is the standard guard: no post has that id, so the query returns
			   nothing and the section renders empty, which is the honest output
			   for a group with no people in it. */
			$query->set( 'post_type', 'person' );
			$query->set( 'post_status', 'publish' );
			$query->set( 'post__in', empty( $ids ) ? array( 0 ) : $ids );
			$query->set( 'orderby', 'post__in' );
			$query->set( 'posts_per_page', -1 );
			$query->set( 'ignore_sticky_posts', true );

			$running = false;
		}
	);
}

/**
 * One staff card's name and title block, and one fellow row's name and field.
 *
 * WHY A SHORTCODE RATHER THAN WIDGETS, which is the same argument
 * inc/content-loop.php's docblock makes for content-a's meta line and reaches
 * the same answer for a different reason.
 *
 * The name is an <h3 class="ta-person__name"> and the title is a
 * <span class="ta-person__title"> INSIDE the card's single <a>, and both are
 * per-post text. A heading() widget can bind post-title dynamically, but it
 * puts `.ta-person__name` on its own WRAPPER rather than on the <h3> (the R10
 * trade-off this phase names, and the one bridge.css already repairs for
 * `.pca-ep__title` and `.cad-card__title`), and the <span> has no widget at
 * all that can carry a meta value into a bare inline element: a text() widget's
 * content is authored, not dynamic.
 *
 * More decisively, `.ta-person__title` is EMPTY for two published people
 * (Ashley Green and Dr. Kristin Vance Richards carry no `position_title` on
 * the install as of 2026-08-20). A widget renders its own wrapper whether or
 * not the value inside it is empty, so both cards would carry an empty
 * `.ta-person__title` box and its `margin-top`. This emits the span only when
 * there is something to put in it, so a card with no title closes up exactly
 * as the design would have drawn it. THE MISSING TITLES ARE REPORTED, NOT
 * INVENTED: the static build has "Director of Outreach" and "Director of
 * Research" for those two, and this file does not fall back to them, because
 * the CPT is the roster and a title nobody has entered is not a title.
 *
 * WHAT THIS BUYS: `.ta-person__name` and `.ta-person__title` are real elements
 * carrying their own classes inside one rendered string, so every one of their
 * declarations (`display:block`, the clamp()ed font-size, the margins) reaches
 * the element the static build puts it on, with no wrapper in between and no
 * bridge rule. That is recipe section 6's "target inside ONE authored markup
 * string: no rule".
 *
 * The shortcode is the ENTIRE content of its text() widget, alone on its own
 * line and wrapped in nothing, which is what lets Elementor's
 * parse_text_editor() run shortcode_unautop() over it before do_shortcode()
 * expands it. inc/content-loop.php's docblock carries the full reading of that
 * code path, from widget-base.php on empv2.
 */
add_shortcode( 'empower_person_card_text', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	$out = '<h3 class="ta-person__name">' . esc_html( get_the_title( $post_id ) ) . '</h3>';

	$title = trim( (string) get_post_meta( $post_id, 'position_title', true ) );
	if ( '' !== $title ) {
		$out .= '<span class="ta-person__title">' . esc_html( $title ) . '</span>';
	}

	/* "Read bio" is in the markup and visible at rest, not a hover-only
	   affordance (css/team-a.css:179-185 says so). In the static build only
	   Grant Callen's card carries it, because his was the only bio page that
	   existed; Empower's own 2026-08-05 note is that "a card that opens
	   somebody else's bio is worse than a card that opens nothing". Every
	   person on the install now has a real single of their own, so the
	   condition that note sets is met for all of them and every card carries
	   both the link and the line. */
	$out .= '<span class="ta-person__more">Read bio</span>';

	return $out;
} );

add_shortcode( 'empower_person_row_text', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	/* THE NAME IS A LINK, AND ONLY THE NAME. Paolo's call, 2026-08-20, after an
	 * audit found that the five contributing fellows had real bio pages that
	 * nothing on the site linked to: the staff cards above carry a visible
	 * "Read bio" and are clickable, and the ledger carried no affordance of any
	 * kind, so those five singles were reachable only by typing the URL.
	 *
	 * WHY NOT THE WHOLE ROW, which is what the staff cards do. Two reasons, and
	 * the second is the one that decided it. `.ta-ledger__row` IS the three
	 * column grid (`grid-template-columns:auto minmax(0,1fr) auto`,
	 * css/team-a.css:221-226) and every rule it has keys on that, so making the
	 * row an anchor puts an element between `.ta-ledger` and its grid. And a row
	 * that is silently clickable with no affordance is worse for a reader than
	 * one that is not clickable at all: the name carrying the link is the thing
	 * a screen reader announces as the destination, and it is visibly a link
	 * rather than a surprise.
	 *
	 * The name is escaped exactly as before; only the wrapper is new. */
	$name = '<span class="ta-ledger__name">' . esc_html( get_the_title( $post_id ) ) . '</span>';
	$permalink = get_permalink( $post_id );
	$out = $permalink
		? '<a class="ta-ledger__link" href="' . esc_url( $permalink ) . '">' . $name . '</a>'
		: $name;

	$field = trim( (string) get_post_meta( $post_id, 'position_title', true ) );
	if ( '' !== $field ) {
		$out .= '<span class="ta-ledger__field">' . esc_html( $field ) . '</span>';
	}

	return $out;
} );

/**
 * The `person` single template's own dynamic pieces.
 *
 * WHAT THIS TEMPLATE IS. dist/team-bio.html is one bio page, hand-filled for
 * Grant Callen, converted as page 20607 on 2026-08-18 and living at
 * /grant-callen/. Paolo's 2026-08-20 instruction was to wire the detail page up
 * for the people, plural, so that design becomes an Elementor Theme Builder
 * Single template conditioned on `include/singular/person`, and all eighteen
 * published entries get it instead of one. elementor/theme-parts/person-
 * single.mjs builds the tree; these three shortcodes are the parts of it no
 * dynamic tag can produce.
 *
 * WHY SHORTCODES AND NOT WIDGETS, in each case:
 *
 * `[empower_person_name]` is an <h1 id="bio-title">, and the id is
 * load-bearing: the section carries aria-labelledby="bio-title"
 * (dist/team-bio.html's own `<section class="tp-profile"
 * aria-labelledby="bio-title">`). A heading() widget with a post-title dynamic
 * tag can carry an _element_id, but it would put it on the WIDGET WRAPPER, not
 * on the <h1>, so the section's aria-labelledby would point at a div and the
 * accessible name would be the whole wrapper's text rather than the person's
 * name. This emits the real element with the real id.
 *
 * `[empower_person_role]` is a <p class="tp-role"> holding `position_title`,
 * and it renders NOTHING when there is none. Two published people (Ashley
 * Green, Dr. Kristin Vance Richards) have an empty `position_title` on the
 * install, and css/team-bio.css:105-107 gives `.tp-role` a
 * `padding-bottom:clamp(...)` and a rule beneath it, so an empty one would draw
 * a hairline under blank space at the top of their pages. Same decision as the
 * roster card's title, and the same reason: the CPT is the roster, and a role
 * nobody has entered is not a role.
 *
 * `[empower_person_contact]` is the "Get in touch" block, and it is the one
 * that changes shape between people. dist/team-bio.html carries three rows
 * (email, LinkedIn, X) and its own comment says what to do for everybody else,
 * in Empower's words, dated 2026-08-05:
 *
 *     "Grant keeps email, LinkedIn and X. Every OTHER staff bio gets the email
 *      row only - copy this block, delete the LinkedIn and X list items, and
 *      the block sizes itself to what is left."
 *
 * A template is every other staff bio, so it emits the email row only. The
 * LinkedIn and X hrefs in the static build are Empower's ORGANISATION accounts
 * standing in for Grant's own, which the same comment marks as a placeholder;
 * putting the organisation's LinkedIn on eighteen people's pages would turn one
 * placeholder into eighteen. The install carries no per-person social fields at
 * all (the `person` post type's meta is `position_title`, `email` and
 * `bio_excerpt`), so there is nothing to render them from.
 *
 * A person with no `email` renders NO CONTACT BLOCK, not an empty one. Checked
 * on the install on 2026-08-20 rather than assumed: some published entries
 * carry the field and some do not.
 *
 * THE ICON AND THE MARKUP AROUND IT ARE dist/team-bio.html's, byte for byte
 * (the <svg>, the `.tp-contact__icon` span, the <ul>/<li> tree), so every
 * css/team-bio.css rule from :63 to :92 reaches the element it was written for
 * with nothing in between. `data-placeholder="contact"` is NOT carried over:
 * it marked the organisation-inbox stand-in, and a real address read from the
 * person's own record is not a placeholder.
 */
add_shortcode( 'empower_person_name', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	return '<h1 id="bio-title">' . esc_html( get_the_title( $post_id ) ) . '</h1>';
} );

add_shortcode( 'empower_person_role', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	$role = trim( (string) get_post_meta( $post_id, 'position_title', true ) );
	if ( '' === $role ) {
		return '';
	}

	return '<p class="tp-role">' . esc_html( $role ) . '</p>';
} );

add_shortcode( 'empower_person_contact', function () {
	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return '';
	}

	$email = trim( (string) get_post_meta( $post_id, 'email', true ) );
	if ( '' === $email || ! is_email( $email ) ) {
		return '';
	}

	$icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
		. 'stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" '
		. 'rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>';

	return '<div class="tp-contact" data-reveal="rise">'
		. '<p class="tp-contact__title">Get in touch</p>'
		. '<ul class="tp-contact__list">'
		. '<li><a href="' . esc_url( 'mailto:' . $email ) . '">'
		. '<span class="tp-contact__icon" aria-hidden="true">' . $icon . '</span>'
		. esc_html( $email )
		. '</a></li>'
		. '</ul>'
		. '</div>';
} );

/**
 * Keeps the social-sharing plugin out of a person's bio.
 *
 * `ultimate-social-media-icons` 2.9.9 hooks `sfsi_social_buttons_below` onto
 * `the_content` at priority 10 (read off the install's own $wp_filter on
 * 2026-08-20, not guessed), and appends a Follow / Share / Tweet row after the
 * content of every singular it applies to. The person Single template renders
 * the bio through Elementor's Post Content widget, which calls the_content(),
 * so the row landed inside `.tp-bio` on all eighteen bio pages, between the
 * last paragraph and the "Support Our Work" button.
 *
 * dist/team-bio.html has no share row and neither has any other page in this
 * build. It is not a design element that was dropped: it is a plugin adding
 * itself to a document type this project only started rendering today.
 *
 * REMOVED AT THE FILTER RATHER THAN HIDDEN IN CSS, which is the opposite call
 * from the one bridge.css block 55 makes for the same plugin's admin nag. That
 * one is a fixed-position panel that no visitor ever receives (it is admin
 * only) and hiding it costs one declaration. This one is real markup inside the
 * page's own content flow, served to everybody, carrying three third-party
 * <img> elements and their requests. Hiding it would leave the requests, leave
 * the elements in the accessibility tree, and leave a `.tp-bio p:last-child`
 * rule (css/team-bio.css:114) resolving against a sibling that is not a
 * paragraph.
 *
 * SCOPED TO SINGULAR `person` VIEWS AND TO NOTHING ELSE. The removal runs on
 * `wp`, once the query is resolved, so is_singular() is answerable; it does not
 * touch the plugin's settings, its output on blog posts, or its floating
 * widget. Empower turned this plugin on for their own content and this changes
 * none of that.
 */
add_action( 'wp', function () {
	if ( ! is_singular( 'person' ) ) {
		return;
	}

	remove_filter( 'the_content', 'sfsi_social_buttons_below' );
} );
