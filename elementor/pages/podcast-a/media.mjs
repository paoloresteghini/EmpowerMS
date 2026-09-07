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
 *   podcast-studio-portrait  carries a sentence, written at import time.
 *   podcast-studio-interview and podcast-studio-camera carry NONE. They were
 *   imported with no --alt flag, not with an empty one, because their frames
 *   are aria-hidden in both builds and their only use is decorative. That is
 *   the shape epic-a/media.mjs records for epic-logo.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'podcast-studio-portrait': FINAL_PHOTOS['podcast-studio-portrait'],
  'podcast-studio-interview': FINAL_PHOTOS['podcast-studio-interview'],
  'podcast-studio-camera': FINAL_PHOTOS['podcast-studio-camera'],
};

export function photo(name) {
  const entry = PHOTOS[name];
  if (!entry) {
    throw new Error(`photo: no attachment mapped for '${name}'. Known: ${Object.keys(PHOTOS).join(', ')}`);
  }
  return entry;
}

export { PHOTOS };
