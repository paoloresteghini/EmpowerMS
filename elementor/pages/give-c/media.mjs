/* give-c's imagery, as it exists in the install's media library.
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
 * BOTH CONFLICT WITH THIS PAGE'S OWN STATIC ALT, and both already have a row in
 * docs/elementor/phase2b/2026-08-18-alt-text-decisions.md naming `give-c` as a
 * pending use (that document's per-attachment tables, the `give-c` rows).
 * Recorded here and NOT written: Paolo has ruled that no session runs
 * `wp post meta update` for alt text, and none was attempted.
 *
 *   - child-classroom-tablet (20581), the first figure. Live alt, read back
 *     today: "A child working on a tablet in a classroom".
 *     dist/give-c.html:262 asks for "A girl writing at a desk in a brightly
 *     furnished classroom." CONFLICT-SUBJECT, and the decisions document has
 *     opened the photograph and settled it: there is no tablet in the frame,
 *     the child is writing on paper, so the LIVE alt is the wrong one and this
 *     page's static alt is closer to the truth. Already a row; `solutions-b`
 *     and `epic-a` ship the same conflict on the same attachment.
 *
 *   - children-running-parent (20580), the second figure. Live alt: EMPTY, and
 *     empty here is a DEFECT rather than a decision, which is the opposite of
 *     what an empty alt usually means in this build. `wp post meta get 20580
 *     _wp_attachment_image_alt` exits 1 today, meaning the key is absent
 *     entirely. dist/give-c.html:267 asks for "A man playing football with two
 *     children in a field at sunset.", a MEANINGFUL use with no aria-hidden
 *     anywhere above it, so this figure ships with no text alternative at all.
 *     The decisions document rates it the highest-priority row of the ten: a
 *     WCAG 1.1.1 failure already live on `team-a` and now pending on `mail-a`
 *     and here.
 *
 *     STATED PLAINLY BECAUSE THE BRIEF'S WORDING COULD BE READ THE OTHER WAY:
 *     20580 ships empty because nobody has written its alt, not because empty
 *     is correct for this use. `who-we-are-a`'s student-library (20600) and
 *     `epic-a`'s epic-logo (20604) are the two attachments where empty IS
 *     correct, and both are decorative with `aria-hidden` above them. This one
 *     is neither.
 *
 * What that costs, stated so the omission is not read as "no problem here":
 * this page ships one photograph whose alt describes something that is not in
 * the frame and one with no alt at all. They are accessibility items with an
 * owner, not open questions.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'child-classroom-tablet': FINAL_PHOTOS['child-classroom-tablet'],
  'children-running-parent': FINAL_PHOTOS['children-running-parent'],
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
