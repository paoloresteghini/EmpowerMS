/* landing's imagery, as it exists in the install's media library.
 *
 * TWO photographs, BOTH ALREADY ON THE INSTALL, and NOTHING WAS IMPORTED for
 * this page. Both ids are re-exported from the modules that first recorded them
 * rather than retyped, for the reason elementor/pages/final/media.mjs gives in
 * its own header ("An id typed at each point of use is the same install fact
 * written five times, and when one copy is wrong the page renders somebody
 * else's photograph while every structural test still passes, because a wrong
 * id is a perfectly valid id").
 *
 *   - child-classroom-tablet (20581), the hero mark. First recorded in
 *     final/media.mjs and re-exported from there.
 *   - family-outdoors-park (20610), the pair block's photograph. Imported by
 *     Task 19 for `education` on 2026-08-19; that module's `photo()` is the one
 *     place the id lives, so it is reached through education/media.mjs rather
 *     than retyped here.
 *
 * BOTH LIVE ALTS WERE READ OFF THE INSTALL ON 2026-08-19 rather than carried
 * over from another page's record or from the decisions document, with
 * `wp db query "SELECT p.ID, m.meta_value FROM wp_posts p LEFT JOIN wp_postmeta
 * m ON m.post_id=p.ID AND m.meta_key='_wp_attachment_image_alt' WHERE p.ID IN
 * (20581,20610)"`. That check is not ceremony: two attachments changed alt
 * under this build mid-session during Task 7.
 *
 *   20581 live alt: "A child working on a tablet in a classroom"
 *   20610 live alt: "A boy in a school polo shirt reading a book at a table in
 *                    a library"
 *
 * NO `wp post meta update` WAS RUN, here or anywhere on this page, and no
 * `wp media import` either, because neither file needed importing. Both
 * sentences above are the install's, untouched.
 *
 * WHAT EACH ONE COSTS, stated so the omission is not read as "no problem here".
 *
 *   20581 IS DISPUTED, and the dispute is about the SUBJECT rather than the
 *   wording. docs/elementor/phase2b/2026-08-18-alt-text-decisions.md:60 rates it
 *   CONFLICT-SUBJECT: the document opened the file and found a child writing on
 *   paper with no tablet anywhere in the frame, so the live sentence describes
 *   an object that is not there. dist/landing.html:206 asks for "A girl writing
 *   at a table in a brightly lit classroom", which is closer to the truth than
 *   the live alt but is not the document's proposed wording either
 *   (:60 proposes "A child writing at a table in a brightly coloured
 *   classroom"). It is one of the ten sentences awaiting Paolo, and `final`,
 *   `solutions-b`, `give-c` and `epic-a` all ship the live sentence today, so
 *   changing it would change four other pages. Recorded and NOT written.
 *
 *   20610 IS SETTLED and its live sentence is the decisions document's own
 *   (:71, SETTLED). It differs in WORDING from dist/landing.html:259's "A boy
 *   reading a book at a table in a school library", and both describe the same
 *   frame truthfully: the file shows one boy reading at a library table. This
 *   page is the SECOND use of an attachment the document settled on the
 *   assumption of one use ("No conflict exists because no other page uses it"),
 *   so that line is now stale rather than wrong. Flagged in the report; not
 *   edited here, because that document is a decision record awaiting sign-off
 *   rather than a build artefact.
 *
 * THE FILENAMES DO NOT DESCRIBE THE PHOTOGRAPHS AND NO ALT HERE WAS DERIVED
 * FROM ONE. `family-outdoors-park.jpg` shows no family and no park, it is one
 * boy reading at a library table; `child-classroom-tablet.jpg` shows no tablet.
 * Both are catalogued as filename defects in the decisions document, which
 * opened both files.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it. The alt strings in dist/landing.html
 * are therefore carried in this file's prose, where a human can act on them,
 * and not in the deployed markup, where nothing would read them.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';
import { photo as educationPhoto } from '../education/media.mjs';

const PHOTOS = {
  'child-classroom-tablet': FINAL_PHOTOS['child-classroom-tablet'],
  /* Reached through the module that imported it rather than copied: the id and
     the url are education/media.mjs's install fact, and one copy of an install
     fact is the whole point of that file's header. */
  'family-outdoors-park': educationPhoto('family-outdoors-park'),
};

/* Same shape and same reason as final/media.mjs's own photo(): throws on an
 * unknown name rather than deploying a widget with no image source at all,
 * which renders as nothing and reports nothing. */
export function photo(name) {
  const entry = PHOTOS[name];
  if (!entry) {
    throw new Error(`photo: no attachment mapped for '${name}'. Known: ${Object.keys(PHOTOS).join(', ')}`);
  }
  return entry;
}
