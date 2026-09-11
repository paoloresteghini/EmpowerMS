import { section as profile } from './01-profile.mjs';
import { section as more } from './02-more.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing
   a page missing part of itself.

   NO media.mjs, and that is a fact about the page rather than an omission.
   There is no photograph inside <main> at all: the portrait is a placeholder
   monogram tile, because Empower have not supplied headshots. 01-profile.mjs
   note 5 records what changes when one arrives.

   THIS PAGE IS NOT ONE OF THE FOURTEEN SIGNED-OFF CHOOSER PAGES. It is the
   companion bio linked from Team A's staff cards
   (elementor/pages/team-a/02-staff.mjs preserves `href="team-bio.html"`
   verbatim and records that `team-bio` was out of the phase's own conversion
   order at the time), and it is converted on Paolo's say-so of 2026-08-18.
   Recorded here because the chooser is the register for everything else, and
   a reader who checks this page against it should find the reason rather than
   a discrepancy.

   POST_ID 20607 is a page created on the install on 2026-08-18 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="Grant Callen" --post_name=team-bio --post_status=publish
   --porcelain`), slug `team-bio`, matching dist/team-bio.html's own name.
   `wp post list --post_type=any --post_status=any` before this task returned
   no post of any type whose slug was `team-bio`. The slug was read back off
   the install afterwards rather than assumed, because WordPress silently
   appends a suffix when a slug is already taken: it is `team-bio`, and
   https://empv2.wpenginepowered.com/team-bio/ returns 200. Install state, not
   design, exactly like the other pages' POST_ID.

   The TITLE is "Grant Callen" rather than "Team Bio". The slug is what every
   instrument and the register key on, and the title is what a human sees in
   the admin list; `team-bio` is this build's internal name for the one staff
   bio it ships, and the person is what the page is about. Same convention as
   `mail-a` ("Email Sign Up"), `epic-a` ("EPIC") and `give-c` ("Donate"). */

export const POST_ID = 20607;

export const sections = () => [profile(), more()];
