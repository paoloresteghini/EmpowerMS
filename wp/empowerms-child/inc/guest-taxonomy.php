<?php
/**
 * The Empower Podcast's guest taxonomy.
 *
 * The page filters by guest and nothing else: Empower removed Filter by Topic
 * on 2026-08-07. The three terms are the ones the approved design names. The
 * archive still has to be back-filled by Empower; this only creates the shelf
 * to put it on.
 *
 * Term display names are set separately from this registration (see the task
 * report): "Lawmaker", "Policy expert", "Community leader", not the raw
 * lawmaker/expert/leader slugs, because the loop item's visible guest pill is
 * bound to a post-terms dynamic tag, which renders the term's NAME, not its
 * slug. Registering the taxonomy is the only part of the shelf that belongs
 * in code; the term names and slugs are content, created once via wp-cli.
 */
add_action( 'init', function () {
	register_taxonomy( 'guest_type', array( 'post' ), array(
		'label'             => 'Guest type',
		'public'            => true,
		'hierarchical'      => false,
		'show_admin_column' => true,
		'rewrite'           => array( 'slug' => 'guest' ),
	) );
} );
