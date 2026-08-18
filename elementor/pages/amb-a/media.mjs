/* amb-a's photography, as it exists in the install's media library.
 *
 * FIVE photographs, all five already on the install, and NOTHING WAS IMPORTED
 * for this page. Every id is re-exported from the map that first recorded it
 * rather than retyped, for the reason elementor/pages/final/media.mjs gives in
 * its own header ("An id typed at each point of use is the same install fact
 * written five times, and when one copy is wrong the page renders somebody
 * else's photograph while every structural test still passes").
 *
 * READ THE IDS OUT OF THE ALT-TEXT DOCUMENT, NOT OFF THE FILENAMES. Two traps
 * this page walks straight into, both recorded in
 * docs/elementor/phase2b/2026-08-18-alt-text-decisions.md:
 *
 *   - `young-man-portrait-bw.jpg` (20585) is a CLASSROOM, in colour, seen from
 *     the back. It is not a portrait, not a young man as subject, and not black
 *     and white.
 *   - 20579 (`father-children-field`) and 20583 (`grandparents-grandchild`) are
 *     THE SAME PHOTOGRAPH under two attachment ids, framed differently. This
 *     page uses 20579, which is what dist/amb-a.html's hero <img> src names.
 *
 * THIS IS THE WORST ALT-CONFLICT PAGE IN THE BUILD: all five attachments carry
 * alt written for another page, and all five conflict with this page's own
 * static alt. Every one is already an open editorial item in the document above
 * with a proposed sentence, so they are RECORDED here and nothing is written to
 * the install. Paolo has ruled that no session runs those writes; no
 * `wp post meta update` was attempted.
 *
 * Live alt as the document records it, against what dist/amb-a.html asks for:
 *
 *   - father-children-field (20579), the hero. Live: "Two adults and a child
 *     smiling together outdoors in a park". Static asks for "Two adults
 *     crouching on the grass in a park, a small child on the man's shoulders,
 *     all three smiling." CONFLICT-WORDING; both are true, the static one is
 *     more informative and is the document's proposal.
 *   - worker-workshop-bw (20582), mosaic cell 1. Live: "A young man working at
 *     a computer in an open-plan office". Static asks for "A young man on a
 *     shop floor, head down over the machine he is working at."
 *     CONFLICT-SUBJECT, and the STATIC BUILD IS THE WRONG ONE: the document
 *     settles it by cross-reference with 20584, same man, same monitor, same
 *     strip-lit room. There is no shop floor and no machine. This page's own
 *     copy needs correcting at hand-off, not the attachment.
 *   - young-man-portrait-bw (20585), mosaic cell 2. Live: "Students seated at
 *     desks in a classroom, facing an adult standing near the front". Static
 *     asks for "A classroom seen from the back, students at their desks facing
 *     a teacher at the whiteboard." CONFLICT-WORDING; both accurate, and the
 *     document adopts THIS page's wording because it establishes the vantage
 *     point.
 *   - video-still-man-outdoors (20597), mosaic cell 3. Live: "A young man
 *     standing outdoors in a field, smiling". Static asks for "A young man
 *     standing outdoors in a field at golden hour, arms folded."
 *     CONFLICT-WORDING; there is no contradiction, he is smiling AND his arms
 *     are folded, and the document's proposal carries both halves.
 *   - classroom-students (20587), mosaic cell 4. Live: "An adult and a child
 *     walking hand in hand across grass". Static asks for "Two adults walking
 *     on a path, holding the hands of a small child between them."
 *     CONFLICT-SUBJECT, and the LIVE ONE IS WRONG: there are two adults, not
 *     one, and they are on a gravel path. This is one of the four rows the
 *     document lists as wrong on the live site TODAY, and it is already live on
 *     `final` and `what-we-do-a` as well as here.
 *
 * What that costs, stated so the omission is not read as "no problem here":
 * this page ships four photographs whose alt describes something other than
 * what dist/amb-a.html describes, and one of those four (20587) describes the
 * wrong number of people in the wrong place. They are accessibility items with
 * an owner, not open questions.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it. So none of the five is fixable from
 * this repository even if it were ours to fix.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'father-children-field': FINAL_PHOTOS['father-children-field'],
  'worker-workshop-bw': FINAL_PHOTOS['worker-workshop-bw'],
  'young-man-portrait-bw': FINAL_PHOTOS['young-man-portrait-bw'],
  'classroom-students': FINAL_PHOTOS['classroom-students'],
  /* Not in final/media.mjs's map (dist/final.html does not use it), so typed
     here with the id and url who-we-are-a/media.mjs and solutions-b/media.mjs
     both already confirmed against the install. Re-exporting from either would
     import that page's whole map for one entry. */
  'video-still-man-outdoors': {
    id: 20597,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/video-still-man-outdoors.jpg',
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
