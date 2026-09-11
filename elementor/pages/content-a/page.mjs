import { section as hero } from './01-hero.mjs';
import { section as browse, BANDS } from './02-browse.mjs';
import { loopItem, LOOP_ITEM_POST_IDS } from './loop-item.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing a
   page missing part of itself.

   TWO SECTIONS, AND FOUR LOOP ITEM TEMPLATES ALONGSIDE THEM. This is the first
   page in the build whose deploy is not one write: the page's own tree goes to
   POST_ID, and four Loop Item trees go to four elementor_library posts.
   `loopItems()` below pairs each band with its own template post so a deploy
   loop cannot write the story card into the press band's template, which is a
   mistake that would render as a page where two bands quietly show the same
   `data-type` and one filter tab hides the wrong things.

   POST_ID 20613 is a page created on the install on 2026-08-19 specifically to
   receive this conversion (`wp post create --post_type=page
   --post_title="All Content" --post_name=content-a --post_status=publish
   --porcelain`).

   THE SLUG IS `content-a`, WITH NO SUFFIX, AND THAT WAS READ BACK RATHER THAN
   ASSUMED, both before and after. `wp post list --post_type=any
   --post_status=any --name=content-a` returned nothing at all before the
   create, so no post of any type on this install held it, and reading the row
   back afterwards returns `content-a`. This is the same check that caught
   `work` silently becoming `work-2`, and it is why the slug is read rather than
   trusted from the flag.

   The TITLE is "All Content" rather than the static build's own <title>, which
   is a two-part string built for a browser tab. Same convention as `safety`,
   `work`, `mail-a`, `give-c` and `landing`: the slug is what every instrument
   keys on, the title is what a human sees in the admin list.

   THE NAME IS DISPUTED AND THE DISPUTE IS THE SOURCE'S, not this file's.
   src/content-a/sections/01-hero.html's own comment records it: the roadmap's
   All Content tab heads the page "ALL CONTENT" and then gives "Page Title:
   Empower Mississippi Commentary" at /empower-commentary, which are two
   different pages. The header nav shipped on all 45 builds says All Content, so
   that is the <h1> and the post title here, with the disagreement left with
   Empower rather than settled silently.

   THE PAGE STYLESHEET IS THIS PAGE'S OWN. dist/content-a.html:21-22 loads
   `css/motion.css` then `css/content-a.css` after the shared tokens/components
   cascade, the site sheet and the header sheet, so
   wp/empowerms-child/functions.php's empower_page_styles() maps
   'content-a' => array( 'motion', 'content-a' ). The KEY IS THE SLUG, and here
   the slug happens to equal the build's own name.

   THIS PAGE IS NOT GATED, AND THAT IS RECORDED AS DATA RATHER THAN AS PROSE.
   Its four Loop Grids render 205 real posts where dist/content-a.html carries
   23 authored cards, so the two sides compare different CONTENT, which is
   exactly podcast-a's situation and exactly what EXCLUDED_PAGES is for. Its
   entry in elementor/pages/register.mjs carries the reason. What stands in for
   the register on this page is the filter test in test-elementor.mjs, which
   checks a radio in a real browser and asserts which bands and cards go away;
   the task report records why that is worth more here than a fidelity gate
   could be. */

export const POST_ID = 20613;

export const sections = () => [hero(), browse()];

/* The four Loop Item templates, as [postId, elements] pairs in band order.
   Derived from BANDS rather than listed again, so adding or removing a band is
   one edit in 02-browse.mjs and this stays correct. */
export const loopItems = () => BANDS.map(({ type }) => [LOOP_ITEM_POST_IDS[type], loopItem(type)]);
