/* safety's imagery, as it exists in the install's media library.
 *
 * TWO photographs, both already on the install, and NOTHING WAS IMPORTED for
 * this page. Both ids are re-exported from the map that first recorded them
 * rather than retyped, for the reason elementor/pages/final/media.mjs gives in
 * its own header ("An id typed at each point of use is the same install fact
 * written five times, and when one copy is wrong the page renders somebody
 * else's photograph while every structural test still passes").
 *
 * BOTH ALTS WERE READ OFF THE INSTALL ON 2026-08-18 with
 * `wp post meta get <id> _wp_attachment_image_alt`, not carried over from an
 * earlier page's record. That check is not ceremony: two attachments changed
 * alt under this build mid-session during Task 7.
 *
 * BOTH CONFLICT WITH THIS PAGE'S OWN STATIC ALT, and both already have a
 * `safety` row in docs/elementor/phase2b/2026-08-18-alt-text-decisions.md.
 * Recorded here and NOT written: Paolo has ruled that no session runs
 * `wp post meta update` for alt text, and none was attempted.
 *
 *   - grandparents-grandchild (20583), the problem section's figure. Live alt,
 *     read back today: "Two adults and a child smiling together outdoors in a
 *     park". dist/safety.html:216 asks for "A mother, a father and their young
 *     son crouched together on the grass in a park, all three smiling".
 *     CONFLICT-WORDING, and the decisions document has opened the photograph
 *     and ruled AGAINST this page's own sentence: "a mother, a father and
 *     their young son" asserts a family relationship the photograph cannot
 *     establish. The live alt is the safer of the two and the document's
 *     proposal ("Two adults crouching on the grass in a park, a small child on
 *     the man's shoulders, all three smiling") is what it recommends writing.
 *     `solutions-b` and `epic-a` ship the same attachment live today.
 *
 *   - father-children-field (20579), the stories band. Live alt, read back
 *     today: "Two adults and a child smiling together outdoors in a park", the
 *     SAME sentence as 20583, because the decisions document establishes that
 *     the two attachments are the same photograph framed differently.
 *     dist/safety.html:311 asks for "A man with a small child on his shoulders
 *     and a woman beside them, smiling in a park". CONFLICT-WORDING, rated
 *     safe to leave: every sentence in the set is true of the frame, so this is
 *     a choice of detail rather than a correction. `final` ships the same
 *     attachment live today.
 *
 * What that costs, stated so the omission is not read as "no problem here":
 * this page ships two photographs whose live alt is thinner than the sentence
 * the static build wrote for them, and in one case the static sentence is the
 * one that should NOT be adopted. They are editorial items with an owner, not
 * open questions.
 *
 * THE FILENAMES DO NOT DESCRIBE THE PHOTOGRAPHS AND NO ALT HERE WAS DERIVED
 * FROM ONE. `grandparents-grandchild.jpg` shows a young family, not
 * grandparents; `father-children-field.jpg` is the same photograph as
 * `grandparents-grandchild.jpg` under a second attachment id. Both are
 * catalogued as filename defects in the decisions document.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it.
 *
 * FOR THE `education` FILL, recorded here because this is the file its own
 * media.mjs will be written from: `family-outdoors-park.jpg` is NOT in the
 * media library. `wp post list --post_type=attachment` on 2026-08-18 returns
 * classroom-students (20587), girl-writing-bw (20584), grandparents-grandchild
 * (20583), worker-workshop-bw (20582) and father-children-field (20579), and
 * no row for it. It is `education`'s stories band, so that page cannot be
 * converted until somebody imports it. `safety` is unaffected.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'grandparents-grandchild': FINAL_PHOTOS['grandparents-grandchild'],
  'father-children-field': FINAL_PHOTOS['father-children-field'],
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
