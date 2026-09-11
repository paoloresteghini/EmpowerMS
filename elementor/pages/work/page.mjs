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

   SEVEN SECTIONS, the same seven `safety` carries and the same seven the
   shared stylesheet numbers in its own header comment (css/solution.css:54,
   :78, :110, :156, :196, :280, :330).

   THE SECOND OF A UNIT OF THREE, AND THE FIRST FILL OF THIS PHASE. `safety`
   converted css/solution.css on 2026-08-19 (Task 17, post 20608) and paid five
   bridge repairs, all of them keyed on classes the shared stylesheet gives all
   three pages: blocks 28, 36, 37, 38 and 39. This page inherits all five and
   adds none, which was true only because it is built in the same shape; each
   section module states which blocks its own section depends on and what would
   break the inheritance.

   THE ONE EXCEPTION THIS PAGE CARRIES is five work areas where the other two
   have four (css/solution.css:16-19, asserted by test.mjs:3680). It lives
   entirely in 05-grid.mjs's CARDS array. `education`'s exception,
   `.sol-grid__closer`, does not touch this page.

   POST_ID 20609 is a page created on the install on 2026-08-19 specifically to
   receive this conversion, slug read back off the install afterwards.

   THE SLUG IS `work-2`, NOT `work`, AND THAT IS THE ONE PLACE THIS FILL
   DIVERGES FROM `safety` ON THE INSTALL RATHER THAN IN THE BUILD.
   `wp post create --post_type=page --post_title="Meaningful Work"
   --post_name=work --post_status=publish --porcelain` returned 20609, and
   `wp post get 20609 --field=post_name` returns `work-2`: WordPress appends a
   suffix silently when a slug is taken, which is exactly why safety/page.mjs
   records that the slug must be read back rather than assumed.

   WHAT WAS ALREADY HOLDING IT: post 18512, "Work", a published page dated
   2024-08-26 carrying 3,353 bytes of Empower's own content and no
   `_elementor_data`. It is their live Work page and NOTHING WAS DONE TO IT.
   `work-1` (post 13497, "Work - old version") is private and older still, so
   `work-2` is the first free suffix rather than an arbitrary number.

   THIS COLLISION IS UNIQUE TO THIS PAGE IN THE UNIT, checked rather than
   assumed: the live Public Safety page is post 18544 under the slug `justice`,
   so `safety` was free, and a query for a post named `education` returns
   nothing (the old one is post 35, `education-old`), so that fill will be free
   too. `work` is the only one of the three whose build name is the same word
   as a live page's slug.

   The register's `name` stays `work`, which is the build's own internal name
   and what dist/work.html is called; only `exampleUrl` carries `work-2`.

   The TITLE is "Meaningful Work", read off dist/work.html's own <title>. Same
   convention as `safety` ("Public Safety"), `mail-a` ("Email Sign Up"),
   `epic-a` ("EPIC"), `give-c` ("Donate") and `team-bio` ("Grant Callen"): the
   slug is what every instrument and the register key on, the title is what a
   human sees in the admin list.

   THE PAGE STYLESHEET IS NAMED FOR THE TEMPLATE, NOT FOR THE PAGE, and this is
   the second row in the theme's per-slug map where those differ:
   dist/work.html:22 loads `css/solution.css`, shared by all three solution
   pages, so wp/empowerms-child/functions.php's empower_page_styles() maps
   'work-2' => array( 'motion', 'solution' ). The KEY IS THE SLUG, so it is the
   suffixed one; a row keyed 'work' would enqueue nothing on this page, and the
   page would render unstyled with nothing in the enqueue reporting it. */

export const POST_ID = 20609;

export const sections = () => [
  hero(), vision(), problem(), caps(), grid(), stories(), latest(),
];
