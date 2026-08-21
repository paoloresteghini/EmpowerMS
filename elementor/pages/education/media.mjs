/* education's imagery, as it exists in the install's media library.
 *
 * TWO photographs: one already on the install, and ONE FILE THAT WAS IMPORTED
 * FOR THIS TASK. The already-present id is re-exported from the map that first
 * recorded it rather than retyped, for the reason
 * elementor/pages/final/media.mjs gives in its own header ("An id typed at each
 * point of use is the same install fact written five times, and when one copy
 * is wrong the page renders somebody else's photograph while every structural
 * test still passes, because a wrong id is a perfectly valid id").
 *
 * THIS PAGE'S TWO ARE NEITHER `safety`'s NOR `work`'s, which is why this file
 * exists rather than being imported from either: `safety` uses
 * grandparents-grandchild (20583) and father-children-field (20579), `work`
 * uses girl-writing-bw (20584) and worker-workshop-bw (20582), and this page
 * uses classroom-students (20587) in the problem section and
 * family-outdoors-park (20610) in the stories band.
 *
 * THE IMPORT: family-outdoors-park (20610), and it is the ONE media import in
 * the whole solution unit.
 *
 *   `wp media import
 *    wp-content/themes/empowerms-child/assets/photography/family-outdoors-park.jpg
 *    --title="family-outdoors-park"
 *    --alt="A boy in a school polo shirt reading a book at a table in a library"
 *    --porcelain` on 2026-08-19, from the synced theme, the same shape
 *   epic-a/media.mjs records for epic-logo (20604) and who-we-are-a/media.mjs
 *   records for student-library (20600). `assets` is in wp/sync.mjs's
 *   FROM_ROOT, so the file was already on the install's theme directory. Its
 *   md5 was confirmed identical on three copies, the checkout's, the synced
 *   theme's and the uploaded one: 104df6fec69c2c3e5d8a50f2b45a942d, 327224
 *   bytes, 1243x1580, which is the size dist/education.html:327 declares.
 *
 *   IMPORTED WITH THE ALT SENTENCE, WHICH IS THE ONE PLACE THIS FILL WROTE AN
 *   ALT FIELD AT ALL, and it is flagged rather than buried because the standing
 *   rule on this branch is that no session writes alt text.
 *
 *   The rule is Paolo's and it is about `wp post meta update` on attachments
 *   whose sentence is DISPUTED: ten of the thirteen photographs in
 *   docs/elementor/phase2b/2026-08-18-alt-text-decisions.md are waiting on him
 *   to choose one wording out of several true ones, and a session that wrote
 *   one of those would be making an editorial decision it has no standing to
 *   make. This file is not one of those ten. That document classes it SETTLED,
 *   for the reason it gives in the same paragraph: "Its only use is
 *   `education`'s stories band, and that page's static alt ... is accurate. No
 *   conflict exists because no other page uses it. Import it with that
 *   sentence." There is no wording to choose between, because there is exactly
 *   one wording and one use.
 *
 *   NO `wp post meta update` WAS RUN, here or anywhere on this page. The
 *   sentence reached the attachment through `wp media import --alt` at the
 *   moment the attachment came into existence, which is the same command
 *   epic-a used for epic-logo (with no --alt, because that file's settled
 *   answer is an empty alt) and the same command the decisions document
 *   instructs for this one.
 *
 *   WHAT IMPORTING IT EMPTY WOULD HAVE COST, so the choice is legible: the
 *   Elementor image widget has no alt control, so the live page takes whatever
 *   the attachment carries. An empty attachment alt would ship a meaningful
 *   photograph with `alt=""` on a page whose static build gives it a sentence,
 *   which is a WCAG 1.1.1 failure of exactly the kind the decisions document
 *   flags on 20580. Read back after importing to confirm it landed:
 *   `wp db query "SELECT meta_value FROM wp_postmeta WHERE
 *   meta_key='_wp_attachment_image_alt' AND post_id=20610"` returns the
 *   sentence above, byte for byte dist/education.html:327's own alt.
 *
 * THE OTHER PHOTOGRAPH'S ALT IS DISPUTED AND WAS NOT TOUCHED.
 * classroom-students (20587), the problem section's figure. Live alt, read off
 * the install on 2026-08-19 rather than carried over from the decisions
 * document or from another page's media.mjs: "An adult and a child walking hand
 * in hand across grass". dist/education.html:317 asks for "Two adults walking a
 * small child along a path through a park, each holding one of her hands".
 *
 *   CONFLICT-SUBJECT in the decisions document, and the conflict is real rather
 *   than a wording preference: the document opened the photograph and counts
 *   TWO adults, so the live sentence is wrong about the number of people. It
 *   proposes "Two adults walking a small child along a path, each holding one
 *   of her hands", which is this page's own sentence with "through a park"
 *   dropped, because the frame shows grass and trees without establishing a
 *   park. It is one of the ten sentences waiting on Paolo, `final` and
 *   `what-we-do-a` both ship the live sentence today, and changing it would
 *   change those two pages as well. Recorded and NOT written.
 *
 *   What that costs, stated so the omission is not read as "no problem here":
 *   this page ships a photograph described as one adult where the frame shows
 *   two. It is an editorial item with an owner, not an open question.
 *
 * THE FILENAMES DO NOT DESCRIBE THE PHOTOGRAPHS AND NO ALT HERE WAS DERIVED
 * FROM ONE. This page is the clearest case in the build, because its two
 * filenames are swapped with respect to their contents:
 * `classroom-students.jpg` shows no classroom and no students, it is three
 * people on a gravel path; `family-outdoors-park.jpg` shows no family and no
 * park, it is one boy reading at a library table. Both are catalogued as
 * filename defects in the decisions document, which opened both files.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image widget
 * has no alt control at all, and a settings.image.alt key is accepted and
 * silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it. That is why the sentence had to reach
 * the MEDIA LIBRARY rather than this file.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'classroom-students': FINAL_PHOTOS['classroom-students'],
  /* Imported for this task; see the header. url read back off the install with
     `wp post get 20610 --field=guid`, not composed by hand. */
  'family-outdoors-park': {
    id: 20610,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/family-outdoors-park.jpg',
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
