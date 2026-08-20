import { section as hero } from './01-hero.mjs';
import { section as ask } from './02-ask.mjs';
import { section as pair } from './03-pair.mjs';
import { section as voice } from './04-voice.mjs';
import { section as act } from './05-act.mjs';
import { section as reading } from './06-reading.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing a
   page missing part of itself.

   SIX BLOCKS, BLOCK 1 to BLOCK 6 in dist/landing.html's own comments.

   THE REVIEW STRIP IS GONE, deleted 2026-08-20 on Paolo's instruction, and the
   deletion is the hand-off step 00-note.mjs's header described. It was review
   chrome (`.lnd-note`, `role="note"`) sitting inside <main> to stop a worked
   example being read as a live campaign; it was removed from the static source
   (src/landing/sections/00-note.html), from the built page and from this module
   in one pass, because removing it from only one side would have made the live
   page differ from the static build in a way no instrument could tell from a
   defect. dist/landing-b.html keeps its own copy: nobody chose that reading, so
   it is still under review. test.mjs asserts BOTH directions.

   THIS PAGE IS A TEMPLATE, NOT A PAGE, and the property worth protecting is
   that every block is independent. css/landing.css's header states it: "Delete
   block 4, reorder 3 and 5, run block 3 twice with the photograph on
   alternating sides - nothing here depends on what sits above or below it."
   That property is preserved by construction here and was checked rather than
   assumed:

     - No section module imports another. The only shared import is media.mjs,
       which two of them read and which is a map of install facts, not layout.
     - No selector this conversion depends on crosses a section boundary. Every
       bridge rule this page needs is qualified with one of its own block's
       classes (`.lnd-hero__actions`, `.lnd-pair__photo`, `.lnd-ask__copy`,
       `.lnd-hero__aside`, `.lnd-pair__link`), so deleting any block takes its
       rules out of play and leaves the others untouched.
     - No section declares a top margin and none relies on a sibling's bottom
       one, so removing a block cannot change the spacing of the blocks around
       it (02-ask.mjs note 7).
     - The one cross-block reference in the source is the hero button's
       `href="#act"`, which points at block 5. Deleting block 5 leaves a dead
       anchor, which is true of the static build too and is a content decision
       for whoever cuts the template down, not a structural dependency.

   TWO SLOTS SHIP AS SLOTS, on purpose, and both keep their `data-placeholder`
   attribute: the quotation (04-voice.mjs) and the campaign form (05-act.mjs).
   No real form is built. css/landing.css's header and both block comments in
   dist/landing.html argue why.

   POST_ID 20612 is a page created on the install on 2026-08-19 specifically to
   receive this conversion (`wp post create --post_type=page
   --post_title="Campaign Landing Page Template" --post_name=landing
   --post_status=publish --porcelain`).

   THE SLUG IS `landing`, WITH NO SUFFIX, AND THAT WAS READ BACK RATHER THAN
   ASSUMED. `wp post get 20612 --field=post_name` returns `landing`. This is the
   opposite outcome to `work`, where the same call silently produced `work-2`
   because post 18512 held the slug, and it is why the standing rule is to READ
   the slug back rather than to trust the flag. Checked before creating it as
   well as after: `wp post list --post_type=any --post_status=any --name=landing`
   returned nothing at all, so no post of any type on this install held it.

   The TITLE is "Campaign Landing Page Template" rather than the static build's
   own <title>, which is a three-part string built for a browser tab. Same
   convention as `safety` ("Public Safety"), `work` ("Meaningful Work"),
   `mail-a` ("Email Sign Up") and `give-c` ("Donate"): the slug is what every
   instrument and the register key on, the title is what a human sees in the
   admin list, and here the admin list is the first place Kienna will look for
   the thing to duplicate.

   THE PAGE STYLESHEET IS THIS PAGE'S OWN. dist/landing.html:22 loads
   `css/landing.css` after the shared tokens/components cascade, the site sheet,
   the header sheet and the motion sheet, so wp/empowerms-child/functions.php's
   empower_page_styles() maps 'landing' => array( 'motion', 'landing' ). The KEY
   IS THE SLUG, and here the slug happens to equal the build's own name, which
   is what `work` could not rely on. */

export const POST_ID = 20612;

export const sections = () => [
  hero(), ask(), pair(), voice(), act(), reading(),
];
