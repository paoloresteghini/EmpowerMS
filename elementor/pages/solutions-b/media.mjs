/* solutions-b's photography, as it exists in the install's media library.
 *
 * Four photographs used by dist/solutions-b.html: three are already on the
 * install (imported for the homepage on 2026-08-14; see
 * elementor/pages/final/media.mjs for the import record and the alt-text
 * rule, that alt text is a media-library property of the ATTACHMENT, not a
 * widget setting). The fourth, video-still-man-outdoors, was genuinely
 * missing from the install's library and had already been imported
 * (attachment 20597) by the time this session resumed the task; confirmed
 * present with `wp post list --post_type=attachment --s=video-still`
 * rather than re-imported, which would have produced a second attachment
 * with a `-1` suffixed filename, the exact collision the box sweep's key
 * normalisation has to strip.
 *
 * Every id and alt text below was read directly off the install with
 * `wp post meta get` on 2026-08-18, not assumed from an earlier page's own
 * record, and cross-checked again the same day by team-lead independently
 * (a second `wp post meta get` pass plus a check of the LIVE homepage DOM,
 * not just its postmeta) after this file first flagged 20582/20583 as
 * having changed since Task 6b. Both passes agree on all four values below.
 *
 *   - child-classroom-tablet (20581): alt "A child working on a tablet in a
 *     classroom". This page's first station uses the same photograph with a
 *     DIFFERENT alt in dist/solutions-b.html: "A girl writing at a table in
 *     a brightly lit classroom". Alt text is a property of the attachment,
 *     so one photograph cannot carry two alt texts; the live one is
 *     meaningful on the homepage's 05-insights section today, so it is left
 *     alone. This is a genuine, unresolved content conflict, not a bug in
 *     this build: the station's own alt copy in dist/solutions-b.html
 *     never reaches the page, and the attachment's existing alt (about a
 *     tablet, not writing) is what a screen reader will announce here
 *     instead. Recorded rather than silently worked around, per the task
 *     brief's instruction to document rather than resolve it. This is the
 *     UNRESOLVABLE case the general limit below describes: two pages, two
 *     meaningful uses, two different words, and no aria-hidden escape hatch
 *     available to either one.
 *   - worker-workshop-bw (20582): alt "A young man working at a computer in
 *     an open-plan office", matching this page's second station's own alt
 *     text exactly.
 *   - grandparents-grandchild (20583): alt "Two adults and a child smiling
 *     together outdoors in a park", matching this page's third station's own
 *     alt text exactly.
 *   - video-still-man-outdoors (20597): alt "A young man standing outdoors
 *     in a field, smiling", matching dist/solutions-b.html's own alt on the
 *     Stories band photograph exactly. No conflict: this attachment is used
 *     nowhere else in the build.
 *
 * ON 20582 AND 20583 CARRYING REAL ALT TEXT: what-we-do-a/media.mjs
 * (written 2026-08-17, Task 6b) and final/media.mjs (2026-08-14) both
 * record these two ids as carrying EMPTY alt, imported that way on purpose
 * for their own decorative door/panel uses. That reading is now STALE, not
 * wrong at the time it was written: something on the install set real alt
 * text on both between then and now, most likely whoever began this task
 * before the session that resumed it, doing the right thing ahead of time,
 * since this page uses both photographs MEANINGFULLY and had no alt to
 * give them. Recorded here rather than corrected there: this file does not
 * edit what-we-do-a/media.mjs or final/media.mjs, because a stale comment
 * fixed in the one place that discovered it, with a cross-reference, is
 * safer than three files independently claiming what an attachment's alt
 * is at a moment in time. Confirmed NOT a regression on either of those
 * pages: both existing decorative uses set aria-hidden="true" on the image
 * WIDGET's own wrapper (what-we-do-a/02-solutions.mjs note 3;
 * final/03-foundations.mjs's own decorative use of the same two ids),
 * which hides the whole subtree from assistive technology regardless of
 * what alt text the attachment carries underneath, and team-lead confirmed
 * directly against the live homepage DOM that both still render
 * aria-hidden="true" with alt="" today, unaffected by the attachment's own
 * alt value having changed underneath that suppression.
 *
 * THE GENERAL LIMIT, worth stating plainly because it will recur on every
 * photograph this build reuses across pages: alt text is an
 * ATTACHMENT-level property in WordPress, and Elementor's image widget has
 * no per-use alt control of its own (factory.mjs's image() comment). So
 * one photograph used MEANINGFULLY on two different pages cannot carry two
 * different alt texts; only one page's words can win. The escape hatch,
 * already in use throughout this build, is that a DECORATIVE use can
 * suppress the attachment's alt entirely with aria-hidden="true" on the
 * widget's own wrapper, independent of whatever the attachment's alt is
 * set to. So the conflict is only genuinely unresolvable when TWO pages
 * both want to use the same photograph MEANINGFULLY with different words:
 * child-classroom-tablet (20581), above, is that case today, and is left
 * exactly as it stood before this session touched anything.
 *
 * The three reused ids are read from final/media.mjs's own PHOTOS map
 * rather than retyped here, for the reason that file itself gives: "An id
 * typed at each point of use is the same install fact written five times,
 * and when one copy is wrong the page renders somebody else's photograph
 * while every structural test still passes." video-still-man-outdoors is
 * not in that map (final.html does not use it), so it is the one entry
 * typed directly, with its id and url confirmed against the install above.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'child-classroom-tablet': FINAL_PHOTOS['child-classroom-tablet'],
  'worker-workshop-bw': FINAL_PHOTOS['worker-workshop-bw'],
  'grandparents-grandchild': FINAL_PHOTOS['grandparents-grandchild'],
  'video-still-man-outdoors': {
    id: 20597,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/08/video-still-man-outdoors.jpg',
  },
};

/* Same shape and same reason as final/media.mjs's own photo(): throws on an
 * unknown name rather than deploying a widget with no image source and no
 * error to catch it. */
export function photo(name) {
  const entry = PHOTOS[name];
  if (!entry) {
    throw new Error(`photo: no attachment mapped for '${name}'. Known: ${Object.keys(PHOTOS).join(', ')}`);
  }
  return entry;
}
