/* epic-a's imagery, as it exists in the install's media library.
 *
 * FIVE images: four photographs already on the install, and ONE FILE THAT WAS
 * IMPORTED FOR THIS TASK. Every already-present id is re-exported from the map
 * that first recorded it rather than retyped, for the reason
 * elementor/pages/final/media.mjs gives in its own header ("An id typed at each
 * point of use is the same install fact written five times, and when one copy is
 * wrong the page renders somebody else's photograph while every structural test
 * still passes").
 *
 * THE IMPORT: epic-logo (20604), and it needs no alt text.
 *
 *   `wp media import wp-content/themes/empowerms-child/assets/epic-logo.png
 *    --porcelain` on 2026-08-18, from the synced theme, the same shape
 *   who-we-are-a/media.mjs records for student-library (20600). `assets` is in
 *   wp/sync.mjs's FROM_ROOT, so the file was already on the install's theme
 *   directory; its md5 was confirmed identical to the checkout's before the
 *   import (e981f0d0536f8e3b05a77fa09e239d3f, 147323 bytes, 1021x399).
 *
 *   Imported with NO --alt flag, and the empty alt was read back afterwards to
 *   confirm it. Empty is CORRECT here rather than an omission:
 *   dist/epic-a.html:198-202 puts this <img> inside
 *   `<div class="epa-hero__mark" aria-hidden="true">` with `alt=""`,
 *   deliberately, because the mark is identification beside a heading that
 *   already names the place. An attachment given real alt text would emit it
 *   here, since the image widget has no per-use alt control
 *   (elementor/factory.mjs's image() comment), and the aria-hidden 01-hero.mjs
 *   sets would then be doing all the work over a contradictory alt underneath.
 *   So this import does NOT join the alt-text decision queue and nothing about
 *   it goes to Paolo.
 *
 *   A NEAR MISS WORTH RECORDING, because the next person searching for this
 *   file will hit it too. The install already carries attachment 20239, post
 *   name `epic`, title `EPIC`, file `2025/12/EPIC.png`. It is NOT this file:
 *   1280x720 against 1021x399, 163371 bytes against 147323, md5
 *   6498e0f636d57bb93515dc33108d84b3 against e981f0d0536f8e3b05a77fa09e239d3f.
 *   It is an existing empowerms.org asset (a padded social-card crop of the same
 *   mark), and using it would have shipped the hero a differently proportioned
 *   logo that no instrument in this project compares. Checked before importing,
 *   not after.
 *
 * EVERY ALT BELOW WAS READ OFF THE INSTALL ON 2026-08-18 with
 * `wp post meta get <id> _wp_attachment_image_alt`, not carried over from an
 * earlier page's record. That check is not ceremony: two attachments changed alt
 * under this build mid-session during Task 7.
 *
 * ALL FOUR PHOTOGRAPHS CONFLICT WITH THIS PAGE'S OWN STATIC ALT. Recorded here
 * against docs/elementor/phase2b/2026-08-18-alt-text-decisions.md and NOT
 * written: Paolo has ruled that no session runs `wp post meta update` for alt
 * text, and none was attempted.
 *
 *   - worker-workshop-bw (20582), the What We Do figure. Live: "A young man
 *     working at a computer in an open-plan office". dist/epic-a.html asks for
 *     "A young man on a shop floor, head down over the machine he is working
 *     at." CONFLICT-SUBJECT, and THE STATIC BUILD IS THE WRONG ONE: the
 *     decisions document settles it by cross-reference with 20584, same man,
 *     same monitor, same strip-lit room. There is no shop floor and no machine.
 *     This page's own copy needs correcting at hand-off, not the attachment.
 *     Already a row in the document; amb-a ships the same conflict on the same
 *     attachment.
 *   - child-classroom-tablet (20581), the Quality Education panel. Live: "A
 *     child working on a tablet in a classroom". dist/epic-a.html asks for "A
 *     girl writing at a desk in a brightly furnished classroom." CONFLICT, and
 *     the two disagree about what the child is DOING, not merely about wording.
 *     THIS ROW WAS NOT IN THE DECISIONS DOCUMENT BEFORE THIS TASK and was added
 *     to it here.
 *   - video-still-man-outdoors (20597), the Meaningful Work panel. Live: "A
 *     young man standing outdoors in a field, smiling". dist/epic-a.html asks
 *     for "A young man standing outdoors in a field at golden hour, arms
 *     folded, looking away from the camera." CONFLICT-WORDING; no
 *     contradiction, and the document's proposal carries both halves. Already a
 *     row.
 *   - grandparents-grandchild (20583), the Public Safety panel. Live: "Two
 *     adults and a child smiling together outdoors in a park".
 *     dist/epic-a.html asks for "Two adults crouching on the grass in a park, a
 *     small child on the man's shoulders, all three smiling."
 *     CONFLICT-WORDING; both true, the static one is more informative and is the
 *     document's proposal. Already a row, and this is the attachment that is the
 *     SAME PHOTOGRAPH as 20579 under two ids (amb-a/media.mjs records that
 *     trap).
 *
 * What that costs, stated so the omission is not read as "no problem here": this
 * page ships four photographs whose alt describes something other than what
 * dist/epic-a.html describes. They are accessibility items with an owner, not
 * open questions.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'worker-workshop-bw': FINAL_PHOTOS['worker-workshop-bw'],
  'child-classroom-tablet': FINAL_PHOTOS['child-classroom-tablet'],
  'grandparents-grandchild': FINAL_PHOTOS['grandparents-grandchild'],
  /* Not in final/media.mjs's map (dist/final.html does not use it), so typed
     here with the id and url who-we-are-a/media.mjs, solutions-b/media.mjs and
     amb-a/media.mjs have each already confirmed against the install.
     Re-exporting from any of them would import that page's whole map for one
     entry. */
  'video-still-man-outdoors': {
    id: 20597,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/video-still-man-outdoors.jpg',
  },
  /* Imported for this task; see the header. url read back off the install with
     `wp post get 20604 --field=guid`, not composed by hand. */
  'epic-logo': {
    id: 20604,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/epic-logo.png',
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
