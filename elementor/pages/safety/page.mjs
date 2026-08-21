import { section as hero } from './01-hero.mjs';
import { section as vision } from './02-vision.mjs';
import { section as problem } from './03-problem.mjs';
import { section as caps } from './04-caps.mjs';
import { section as grid } from './05-grid.mjs';
import { section as stories } from './06-stories.mjs';
import { section as latest } from './07-latest.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing a
   page missing part of itself.

   SEVEN SECTIONS, which is the most of any page converted in this phase, and
   they are numbered to match the seven the shared stylesheet numbers in its own
   header comment (css/solution.css:54, :78, :110, :156, :196, :280, :330).

   THE FIRST OF A UNIT OF THREE. `work` and `education` load the same
   css/solution.css and no page-specific sheet of their own, so every bridge
   repair this page pays is paid once for all three. They are NOT free: each
   has its own post id, its own alt text, its own register floors, and between
   them the unit's two structural exceptions (`work` carries five work areas,
   `education` alone closes that section with `.sol-grid__closer`).
   05-grid.mjs's own header records how each is added.

   POST_ID 20608 is a page created on the install on 2026-08-18 specifically to
   receive this conversion (`wp post create --post_type=page --post_title="Public
   Safety" --post_name=safety --post_status=publish --porcelain`), slug
   `safety`, matching dist/safety.html's own name. `wp post list --post_type=any
   --post_status=any --name=safety` before this task returned no post of any
   type whose slug was `safety`. The slug was read back off the install
   afterwards rather than assumed, because WordPress silently appends a suffix
   when a slug is already taken: it is `safety`, and
   https://empv2.wpenginepowered.com/safety/ returns 200. Install state, not
   design, exactly like the other pages' POST_ID.

   The TITLE is "Public Safety" rather than "Safety". The slug is what every
   instrument and the register key on, and the title is what a human sees in the
   admin list; `safety` is this build's internal name for the Public Safety
   solution page, and dist/safety.html's own <title> is "Public Safety". Same
   convention as `mail-a` ("Email Sign Up"), `epic-a` ("EPIC"), `give-c`
   ("Donate") and `team-bio` ("Grant Callen").

   THE PAGE STYLESHEET IS NAMED FOR THE TEMPLATE, NOT FOR THE PAGE, and this is
   the first entry in the theme's per-slug map where those differ:
   dist/safety.html:22 loads `css/solution.css`, shared by all three solution
   pages, so wp/empowerms-child/functions.php's empower_page_styles() maps
   'safety' => array( 'motion', 'solution' ). The `work` and `education` fills
   add two more slugs pointing at the same sheet. */

export const POST_ID = 20608;

export const sections = () => [
  hero(), vision(), problem(), caps(), grid(), stories(), latest(),
];
