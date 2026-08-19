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

   SEVEN SECTIONS, the same seven `safety` and `work` carry and the same seven
   the shared stylesheet numbers in its own header comment (css/solution.css:54,
   :78, :110, :156, :196, :280, :330).

   THE THIRD AND LAST OF A UNIT OF THREE, AND THE SECOND FILL. `safety`
   converted css/solution.css on 2026-08-19 (Task 17, post 20608) and paid five
   bridge repairs; `work` filled it (Task 18, post 20609) and paid none of its
   own, but found a WCAG 2.4.7 failure that cost blocks 40 and 41. All SEVEN of
   those blocks are keyed on classes the shared stylesheet or the shared button
   component gives every page, so this page inherits all seven and adds none.
   That inheritance is conditional on this page being built in the same SHAPE,
   which is why each section module states which blocks its own section depends
   on rather than assuming they arrive.

   THE ONE EXCEPTION THIS PAGE CARRIES is `.sol-grid__closer`, the trailing
   statement no other page in the build has (css/solution.css:16-19 and
   :268-277, asserted by test.mjs). It lives entirely in 05-grid.mjs, whose
   note 10 walks it. Four work areas here, which is `safety`'s number rather
   than `work`'s five.

   TWO PLACES WHERE THIS PAGE'S COPY IS LONGER THAN ITS SIBLINGS', both inside
   blocks bridge block 28 already repairs and neither costing a rule:
   `.sol-problem__copy` holds FOUR paragraphs where the other two hold three,
   and `.sol-grid__intro` holds THREE where the other two hold two. 03-problem
   note 3 and 05-grid note 3 each redo their own block's pairwise walk on this
   page's copy rather than inheriting a conclusion.

   POST_ID 20611 is a page created on the install on 2026-08-19 specifically to
   receive this conversion, slug read back off the install afterwards.

   THE SLUG IS `education`, WITH NO SUFFIX, and that was read back rather than
   assumed. `wp post create --post_type=page --post_title="Quality Education"
   --post_name=education --post_status=publish --porcelain` returned 20611 and
   `wp post get 20611 --field=post_name` returns `education`. This is the
   opposite outcome to `work`, where the same call silently produced `work-2`
   because post 18512 held the slug, and it is why safety/page.mjs's rule is to
   READ the slug back rather than to trust the flag.

   WHY IT WAS FREE, checked rather than assumed. Empower's own live Education
   page is post 18537 under the slug `education-3`; `education-2` is post 11509
   and `education-old` is post 35, "Education- Old version". Every one of those
   is a suffixed or renamed slug, so the unsuffixed `education` had already been
   vacated before this task started. NOTHING WAS DONE TO ANY OF THEM.

   The TITLE is "Quality Education", read off dist/education.html's own <title>.
   Same convention as `safety` ("Public Safety"), `work` ("Meaningful Work"),
   `mail-a` ("Email Sign Up") and `give-c` ("Donate"): the slug is what every
   instrument and the register key on, the title is what a human sees in the
   admin list.

   THE PAGE STYLESHEET IS NAMED FOR THE TEMPLATE, NOT FOR THE PAGE, the third
   and last row of the solution unit in the theme's per-slug map:
   dist/education.html:22 loads `css/solution.css`, shared by all three solution
   pages, so wp/empowerms-child/functions.php's empower_page_styles() maps
   'education' => array( 'motion', 'solution' ). The KEY IS THE SLUG, and here
   the slug happens to equal the build's own name, which is what `work` could
   not rely on. */

export const POST_ID = 20611;

export const sections = () => [
  hero(), vision(), problem(), caps(), grid(), stories(), latest(),
];
