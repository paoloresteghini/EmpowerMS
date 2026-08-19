/* work's imagery, as it exists in the install's media library.
 *
 * TWO photographs, both already on the install, and NOTHING WAS IMPORTED for
 * this page. Both ids are re-exported from the map that first recorded them
 * rather than retyped, for the reason elementor/pages/final/media.mjs gives in
 * its own header ("An id typed at each point of use is the same install fact
 * written five times, and when one copy is wrong the page renders somebody
 * else's photograph while every structural test still passes").
 *
 * THIS PAGE'S TWO ARE NOT `safety`'s TWO, which is the whole reason this file
 * exists rather than being imported from there: `safety` uses
 * grandparents-grandchild (20583) in the problem section and
 * father-children-field (20579) in the stories band; this page uses
 * girl-writing-bw (20584) and worker-workshop-bw (20582) in those two places.
 *
 * BOTH ALTS WERE READ OFF THE INSTALL ON 2026-08-19 with
 * `wp post meta get <id> _wp_attachment_image_alt`, not carried over from the
 * decisions document and not from `safety`'s own media.mjs. That check is not
 * ceremony: two attachments changed alt under this build mid-session during
 * Task 7.
 *
 * ONE CONFLICTS WITH THIS PAGE'S STATIC ALT AND ONE DOES NOT, which is a
 * different answer from `safety`, where both did. Recorded and NOT written:
 * Paolo has ruled that no session runs `wp post meta update` for alt text, and
 * none was attempted.
 *
 *   - girl-writing-bw (20584), the problem section's figure. Live alt, read
 *     back today: "An adult writing in a spiral notebook at an office desk,
 *     with a monitor and keyboard visible, black and white".
 *     dist/work.html:217 asks for "A young man standing at a desk writing in a
 *     notebook beside a computer". CONFLICT-WORDING in
 *     docs/elementor/phase2b/2026-08-18-alt-text-decisions.md, which has opened
 *     the photograph and rates BOTH sentences accurate, proposing a merge that
 *     takes "young man" from this page's own wording. Nothing here is wrong;
 *     it is a choice of detail with an owner. `final` ships the same
 *     attachment live today.
 *
 *   - worker-workshop-bw (20582), the stories band. Live alt, read back today:
 *     "A young man working at a computer in an open-plan office", which is
 *     BYTE FOR BYTE dist/work.html:322's own alt. No conflict on this page.
 *     The decisions document still rates the attachment CONFLICT-SUBJECT, and
 *     the conflict it means is with the PHOTOGRAPH rather than with this page:
 *     the frame shows the man standing with his head down at a desk, so
 *     "working at a computer" understates the posture, and the document
 *     proposes adding it. It is also the sentence that settles `epic-a`'s and
 *     `amb-a`'s "shop floor" wording, which is wrong about the same picture.
 *     `solutions-b` ships this attachment live today with this same sentence.
 *
 * What that costs, stated so the omission is not read as "no problem here":
 * this page ships one photograph whose live alt describes the frame slightly
 * differently from the sentence the static build wrote, and one whose live alt
 * matches the static build exactly while both are thinner than the frame. They
 * are editorial items with an owner, not open questions.
 *
 * THE FILENAMES DO NOT DESCRIBE THE PHOTOGRAPHS AND NO ALT HERE WAS DERIVED
 * FROM ONE. `girl-writing-bw.jpg` shows a young man, not a girl;
 * `worker-workshop-bw.jpg` is an open-plan office, not a workshop, and the
 * decisions document settles that by cross-reference: the two files are two
 * frames of the same man in the same room from one session. Both are
 * catalogued as filename defects there.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it.
 *
 * FOR THE `education` FILL, unchanged from what safety/media.mjs recorded and
 * re-checked here: `family-outdoors-park.jpg` is still NOT in the media
 * library. `wp post list --post_type=attachment` on 2026-08-19 returns
 * classroom-students (20587), girl-writing-bw (20584), grandparents-grandchild
 * (20583), worker-workshop-bw (20582) and father-children-field (20579), and
 * no row for it. It is `education`'s stories band, so that page cannot be
 * converted until somebody imports it. Neither `safety` nor this page is
 * affected.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'girl-writing-bw': FINAL_PHOTOS['girl-writing-bw'],
  'worker-workshop-bw': FINAL_PHOTOS['worker-workshop-bw'],
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
