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

/* 2026-09-04: THIS PAGE IS THE ONE THAT COULD NOT USE THE SHOOT.
 *
 * `*Professional Photos` contains no public safety photography at all, and
 * Kienna's handover invited using the Work frames here instead, "where they fit
 * our rehabilitation and second-chances work". Those frames are a real
 * warehouse floor with identifiable people on it, and this page's stories
 * section is headed "Voices of Safer Communities", carrying named accounts of
 * addiction, prison and reentry (Kyle Jackson, Kayla Hulett, Tyler Wilson). A
 * photograph of an identifiable worker directly above those stories tells the
 * reader that person has a conviction. Nobody in the build can verify that, and
 * the invitation was thematic rather than a statement about consent, so the
 * page was held rather than filled that way.
 *
 * BOTH PHOTOGRAPHS ARE LICENSED STOCK, from the folder Empower supplied for
 * exactly this ("we may need to supplement that page with stock photography, so
 * I've also included a folder of organized stock photos we already have
 * licenses for"):
 *
 *   police-lights           Stock Photos/Public Safety. That folder holds ONE
 *                           file. It is an object, not a person, so it makes no
 *                           claim about anybody.
 *   ms-river-bridge-sunrise Stock Photos/Landscape & Capitol. The stories band
 *                           is the only image in that section, and it sits above
 *                           three named people's stories, so it had to be a
 *                           photograph with NO PEOPLE IN IT. A place cannot be
 *                           mistaken for one of the people described below it.
 *
 * These two are the only stock in the converted build, and the standing rule
 * they respect is the one the All Content work established: a stock photograph
 * never sits beside a named person's headline. Here it sits above the section,
 * as furniture, and shows a river.
 *
 * THEY ARE ALSO THE SHARPEST BAND IN THE BUILD, at a true 2.0x, because the
 * stock originals are 5000px+ while `*Professional Photos/Highlights` is capped
 * at 1024px. The other three story bands (education, work, solutions-b) ship at
 * 0.72x for that reason. This folder may be able to fix them too.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'police-lights': FINAL_PHOTOS['police-lights'],
  'ms-river-bridge-sunrise': FINAL_PHOTOS['ms-river-bridge-sunrise'],
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
