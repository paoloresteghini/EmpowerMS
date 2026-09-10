/* podcast-a's three photographs, as they exist in the install's media library.
 *
 * BEHIND-THE-SCENES, LITERALLY: Empower's own `Photography/Podcast Photos/
 * Empower Podcast` folder, which is the studio being used. The tall frame is
 * two men standing in the studio; the two squares are that same studio mid-record,
 * the camera and its monitor in shot. All three are one shoot against the same
 * wood-slat wall, which the first pass did not manage: it used two frames from
 * other rooms, because four of that folder's seven files are HEIC and were
 * skipped rather than converted. Paolo pointed at the folder again on
 * 2026-09-04 and the HEICs turned out to hold the best frames in it. The hero says "Real Conversations" and the frames
 * now show one being recorded.
 *
 * UNLIKE capitol-a, THESE ARE image() WIDGETS. That page's triptych had to stay
 * one markup string because `.cca-plate:not(:first-child)` depends on the <li>s
 * being siblings; nothing here does. `.pca-frame`'s rules are class-based
 * (`.pca-frame:not(.pca-frame--tall)`), so a widget wrapper between the frame
 * and its <img> breaks no selector. css/podcast-a.css gives that wrapper a
 * height with `.pca-frame > *`, which is the one thing the conversion needs
 * that the static build does not.
 *
 * ALT COMES FROM THE ATTACHMENT HERE, because image() has no alt control and
 * renders whatever `_wp_attachment_image_alt` holds. So:
 *   podcast-guest-with-mic  carries a sentence, written at import time.
 *   podcast-interview-on-set and podcast-studio-wide carry NONE, because their
 *   frames are aria-hidden in both builds and their only use is decorative.
 *   That is the shape epic-a/media.mjs records for epic-logo.
 *
 * THE THREE CHANGED ON 2026-09-10, Empower's round 1 row 9. What they had asked
 * for could not be built as written: of the three files their feedback linked,
 * two were the same photograph and the third was the show's square cover
 * ARTWORK, which is a graphic and not a photograph of anything. The folder they
 * linked holds ten files, so the swap was made from that rather than from the
 * three references, and the cover art was left alone.
 *
 * THE TALL FRAME TOOK A SINGLE SUBJECT, and that is the decision worth
 * recording. Every photograph in the folder is a landscape 4:3 of two people
 * sitting apart, and the frame is 4:5. Cropping any of them to portrait falls
 * BETWEEN the two people and beheads both; that was built and looked at before
 * it was rejected. The crop is offset to one person instead, which is a picture
 * the frame can hold.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'podcast-guest-with-mic': {
    id: 20720,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-guest-with-mic.jpg',
  },
  'podcast-interview-on-set': {
    id: 20721,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-interview-on-set.jpg',
  },
  'podcast-studio-wide': {
    id: 20722,
    url: 'https://empv2.wpenginepowered.com/wp-content/uploads/2026/09/podcast-studio-wide.jpg',
  },
};

export function photo(name) {
  const entry = PHOTOS[name];
  if (!entry) {
    throw new Error(`photo: no attachment mapped for '${name}'. Known: ${Object.keys(PHOTOS).join(', ')}`);
  }
  return entry;
}

export { PHOTOS };
