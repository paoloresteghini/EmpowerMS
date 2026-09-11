/* capitol-a's three photographs, as they exist in the install's media library.
 *
 * ALL THREE ARE REAL CAPITOL CHAT RECORDINGS, from Empower's own
 * `Photography/Podcast Photos/Capitol Chat` folder rather than from the
 * `*Professional Photos` shoot the rest of the build draws on. That folder is
 * the show being made: two of the three are interviews with legislators in
 * their own offices. It matters because this page is the show's page, and the
 * alternative on hand was three frames of two advocates walking around the
 * Capitol, which illustrates the building rather than the programme.
 *
 * THEY ARE ALSO THE ONLY FULL-RESOLUTION SOURCES IN THE HANDOVER. Every file in
 * `*Professional Photos/Highlights` is capped at 1024px on the long edge, which
 * forced three story bands elsewhere in the build to ship at 0.72x. These came
 * in at 4032x3024 and 3520x1980, so all three plates are a true 2.0x. Worth
 * knowing before anyone concludes the whole handover is downsized: it is not,
 * only that one folder is.
 *
 * THE IDS ARE USED FOR THEIR URLS, NOT AS ATTACHMENT IDS. 01-hero.mjs keeps the
 * triptych as ONE html() widget and writes plain <img> tags into the markup
 * string, because turning the plates into image() widgets would put a widget
 * wrapper between `.cca-triptych` and each `.cca-plate` and kill
 * `.cca-plate:not(:first-child){display:none}` at 720px. So nothing here ever
 * reaches Elementor's image control; the map exists so the urls are read from
 * one place rather than typed at the point of use, which is the same reason
 * final/media.mjs gives for its own existence.
 *
 * ALT: only the first plate carries a sentence, and it carries it IN THE
 * MARKUP, not from the attachment, because a plain <img> takes its own alt. The
 * other two are aria-hidden with alt="" in both builds. The attachment alt for
 * capitol-chat-flags was written at import time by
 * elementor/import-photography.mjs and matches the markup byte for byte; the
 * other two were imported with no --alt at all, the shape epic-a/media.mjs
 * records for epic-logo.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'capitol-chat-flags': FINAL_PHOTOS['capitol-chat-flags'],
  'capitol-chat-interview': FINAL_PHOTOS['capitol-chat-interview'],
  'capitol-chat-desk': FINAL_PHOTOS['capitol-chat-desk'],
};

/* Same shape and same reason as final/media.mjs's own photo(): throws on an
 * unknown name rather than deploying a widget with no image source at all. */
export function photo(name) {
  const entry = PHOTOS[name];
  if (!entry) {
    throw new Error(`photo: no attachment mapped for '${name}'. Known: ${Object.keys(PHOTOS).join(', ')}`);
  }
  return entry;
}

export { PHOTOS };
