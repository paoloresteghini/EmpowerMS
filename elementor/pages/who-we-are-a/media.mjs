/* who-we-are-a's photography, as it exists in the install's media library.
 *
 * Five distinct photographs. Four were already on the install and are
 * re-exported from the map that first recorded them rather than retyped, for
 * the reason elementor/pages/final/media.mjs gives in its own header ("An id
 * typed at each point of use is the same install fact written five times, and
 * when one copy is wrong the page renders somebody else's photograph while
 * every structural test still passes"). The fifth, student-library, was
 * genuinely absent and was imported for this task.
 *
 * EVERY ALT BELOW WAS READ OFF THE INSTALL ON 2026-08-18 with
 * `wp post meta get <id> _wp_attachment_image_alt`, not carried over from an
 * earlier page's record. That check is not ceremony: two attachments changed
 * alt under this build mid-session during Task 7, which is why
 * final/media.mjs and what-we-do-a/media.mjs both carry a stale reading of
 * 20582/20583 today (recorded in solutions-b/media.mjs).
 *
 *   - grandparents-grandchild (20583): alt "Two adults and a child smiling
 *     together outdoors in a park". This page's hero uses it MEANINGFULLY,
 *     and dist/who-we-are-a.html's own alt on that <img> is that exact
 *     sentence, so the attachment already carries the right words and
 *     nothing needs writing. solutions-b uses the same photograph
 *     meaningfully with the same sentence, so there is no conflict of the
 *     child-classroom-tablet kind here (solutions-b/media.mjs documents that
 *     one). final/03-foundations.mjs's own use is decorative and suppressed
 *     with aria-hidden on the widget wrapper, so it is unaffected either way.
 *   - video-still-man-outdoors (20597): alt "A young man standing outdoors in
 *     a field, smiling". This page's story photograph uses it MEANINGFULLY,
 *     and dist/who-we-are-a.html's own alt is that exact sentence. Same
 *     sentence solutions-b's Stories band uses. No conflict.
 *   - young-man-portrait-bw (20585): alt "Students seated at desks in a
 *     classroom, facing an adult standing near the front".
 *   - girl-writing-bw (20584): alt "An adult writing in a spiral notebook at
 *     an office desk, with a monitor and keyboard visible, black and white".
 *
 *     Both of the last two are used DECORATIVELY on this page
 *     (dist/who-we-are-a.html gives their <img> `alt="" aria-hidden="true"`),
 *     so 04-people.mjs sets aria-hidden="true" on each image() widget's own
 *     wrapper, which hides the whole subtree from assistive technology
 *     whatever alt the attachment carries underneath. Their alt text is
 *     recorded here anyway, because it is the thing that would have to be
 *     checked if a later page ever used either of them meaningfully: neither
 *     sentence describes what its FILENAME describes, which is a known trap
 *     in this build's photography (final/media.mjs: "The filenames are NOT
 *     descriptions").
 *
 *   - student-library (20600): imported for this task on 2026-08-18 with
 *     `wp media import wp-content/themes/empowerms-child/assets/photography/
 *     student-library.jpg --porcelain`, from the synced theme, the same way
 *     final/media.mjs records its own nine. Imported with EMPTY alt, no
 *     --alt flag, confirmed after import by reading the meta back
 *     ("(EMPTY-ALT)"). Empty is CORRECT here rather than an omission: this
 *     photograph is used twice on this page (the hero's tall frame and the
 *     third people frame) and dist/who-we-are-a.html marks BOTH uses
 *     decorative, `alt="" aria-hidden="true"`. An attachment given real alt
 *     text would emit it on both, since the image widget has no per-use alt
 *     control (elementor/factory.mjs's image() comment), and the aria-hidden
 *     the modules set would then be doing all the work with a contradictory
 *     alt underneath it.
 *
 * NO OPEN ALT-TEXT ITEM ON THIS PAGE. Both meaningful photographs already
 * carry exactly the sentence dist/who-we-are-a.html asks for, so unlike
 * team-a/media.mjs this file has no write it could not make. Nothing here
 * needed a `wp post meta update`, and none was attempted.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image
 * widget has no alt control at all, and a settings.image.alt key is accepted
 * and silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'grandparents-grandchild': FINAL_PHOTOS['grandparents-grandchild'],
  'young-man-portrait-bw': FINAL_PHOTOS['young-man-portrait-bw'],
  'girl-writing-bw': FINAL_PHOTOS['girl-writing-bw'],
  /* Not in final/media.mjs's map (dist/final.html does not use it), so typed
     here with its id and url confirmed against the install, the same way
     solutions-b/media.mjs types video-still-man-outdoors. Re-exported from
     solutions-b rather than retyped a third time would import that page's
     whole map for one entry; the id is written once, here, and once there. */
  'video-still-man-outdoors': {
    id: 20597,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/video-still-man-outdoors.jpg',
  },
  /* Imported for this task; url read back from the install with
     `wp post get 20600 --field=guid`, not composed by hand from the
     filename. */
  'student-library': {
    id: 20600,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/student-library.jpg',
  },
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
