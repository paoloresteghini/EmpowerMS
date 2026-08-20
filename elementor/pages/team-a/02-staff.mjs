import { container, text, loopGrid } from '../../factory.mjs';
import { LOOP_ITEM_POST_IDS } from './loop-item.mjs';

/* Source of truth for the section's own frame: dist/team-a.html, the
   <section class="ta-staff"> block. Every class, string and attribute below is
   read from that file. The ROSTER inside it is no longer read from there at
   all: it is the `person` post type on the install, rendered through a Loop
   Grid, per Paolo's 2026-08-20 decision that the CPT is the roster and the
   static build is not a second opinion about who works at Empower.

   Structural decisions:

   1. `#staff` IS SET VIA `_element_id`, NOT `_attributes`. This section is
      the target of this page's own in-page anchor
      (`.ta-jump[href="#staff"]`, 01-hero.mjs). `_attributes: 'id|staff'`
      is silently refused by Elementor's Custom Attributes control, the
      exact failure solutions-b hit (Task 7, fix round 1, I1); `_element_id`
      is the confirmed-working route on a container (measured live there:
      `<section class="... e-con e-parent" id="solutions">`). Verified
      again here after deploy rather than assumed, and verified once more
      by Task 9's review, which read the id off the live section element.
      Unchanged by this task.

   2. `.ta-staff__head` AND `.ta-mark` ARE ONE DIV, not two nested ones.
      Source: `<div class="ta-staff__head ta-mark" data-reveal-group>`, a
      single element carrying both classes, the same space-joined-class
      pattern this build already uses for `.ta-hero__grid em-container`
      (01-hero.mjs) and solutions-b's own hero grid. Unchanged.

   3. THE HEADINGS ARE text() WIDGETS CARRYING BARE <h2>/<h3>, never
      heading() widgets. No `heading()` import above. Unchanged.

   4. `.ta-roster` IS NOW A LOOP GRID, and this is the change this task made.
      It was one html() widget holding a <ul> of ten hand-written <li>. That
      construction was chosen deliberately and its own note recorded the cost
      as real rather than free: "the ten names and titles here are real,
      current staff, likely to change (a promotion, a departure, a new
      hire)... a staff change means editing this file and redeploying, not
      clicking into the page", and it named its own exit condition, which was
      the headshot swap. The headshots turned out to exist already: all 22
      `person` entries on empv2 carry a featured image. So the swap arrived
      with the names, the titles, the bio links and the ordering attached to
      it, and the whole section changes construction at exactly the point that
      note said to reconsider it.

      WHAT THE GRID QUERIES, and why none of it is expressed in this file.
      `post_query_query_id: 'empower_team_staff'` is the entire query. Elementor
      Pro fires `elementor/query/{query_id}` with the WP_Query by reference
      before it runs (Elementor_Post_Query::pre_get_posts_query_filter(),
      wp-content/plugins/elementor-pro/modules/query-control/classes/
      elementor-post-query.php:408, read on empv2), and
      wp/empowerms-child/inc/person-loop.php sets post type, status, the id set
      and the ORDER there. That file's docblock carries the whole argument; the
      short version is that neither of the two things this section needs can be
      said in Elementor's query control at all. There is no taxonomy on
      `person`, so nothing in the data separates staff from fellows; and the
      order the design asks for out loud, in a `.ta-note` a visitor reads ("In
      alphabetical order by last name"), is not one WP_Query can express, since
      `orderby => title` sorts on the whole title and would put both of this
      roster's "Dr." entries under D.

      `post_query_post_type: 'person'` IS STILL SET HERE even though the hook
      sets it again. It is what makes the widget's own panel show the right
      post type to anyone who opens it in the editor, and it is what the query
      falls back to if this file is ever deployed against an install where
      inc/person-loop.php is missing. A grid over `person` with the wrong ORDER
      is a page with a defect; a grid with no post type at all is a page
      showing blog posts where the staff should be.

      THE CARD IS elementor/pages/team-a/loop-item.mjs's `staffCard()`, in
      elementor_library post 20634. Its own docblock carries the four costs the
      conversion pays and the two bridge blocks it needs.

   5. `.ta-pending` MOVES TO THE BOARD SECTION, and it is the only copy change
      on this page. The line reads "Placeholder portraits: staff, fellow and
      board headshots to be supplied by Empower", and css/team-a.css:137's own
      comment says what it is for and when it goes: "Build scaffolding, not
      client copy: this line names what is missing so the monogram tiles are
      never mistaken for a design decision... It comes out with the last
      placeholder." After this task the staff and fellows sections carry real
      photographs and the board section is the last placeholder, so the line is
      false where it stands and true one section down. Moved rather than
      deleted, and reworded to name only what is actually still missing. See
      04-board.mjs.

      The `.ta-note` line above it STAYS, and it is now a promise this page
      keeps by construction rather than by hand: inc/person-loop.php sorts on
      the surname, so the order cannot drift out of agreement with the note the
      way a hand-written list can. */

const STAFF_HEAD = 'Our Team';
const NOTE = 'In alphabetical order by last name';

/* The query id inc/person-loop.php hooks. Exported so the behavioural gate in
   test-elementor.mjs asserts against the same string this file deploys rather
   than a second copy of it that can drift. */
export const STAFF_QUERY_ID = 'empower_team_staff';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ta-staff',
      content_width: 'full',
      _element_id: 'staff',
      _attributes: 'aria-labelledby|staff-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-staff__head ta-mark', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="staff-title">${STAFF_HEAD}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="ta-note">${NOTE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        loopGrid({
          templateId: LOOP_ITEM_POST_IDS.staff,
          cssClass: 'ta-roster',
          _attributes: 'data-reveal-group|',
          post_query_post_type: 'person',
          post_query_query_id: STAFF_QUERY_ID,
          /* -1 is not available in the panel's number control, and the hook
             sets its own -1 anyway. This is the fallback ceiling if the hook
             is ever absent, chosen well above the 22 entries the post type
             holds so it never silently truncates the roster. */
          posts_per_page: 100,
          pagination_type: '',
        }),
      ]),
    ],
  );
}
