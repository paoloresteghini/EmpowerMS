/* mail-a's photography, as it exists in the install's media library.
 *
 * Two photographs, both already on the install and both re-exported from the
 * map that first recorded them rather than retyped, for the reason
 * elementor/pages/final/media.mjs gives in its own header ("An id typed at
 * each point of use is the same install fact written five times, and when one
 * copy is wrong the page renders somebody else's photograph while every
 * structural test still passes"). NOTHING WAS IMPORTED for this page.
 *
 * BOTH ALTS WERE READ OFF THE INSTALL ON 2026-08-18 with
 * `wp post meta get <id> _wp_attachment_image_alt`, not carried over from an
 * earlier page's record, because two attachments changed alt under this build
 * mid-session during Task 7 (recorded in solutions-b/media.mjs).
 *
 *   - esa-email-mockup (20586): alt reads "Research report cover".
 *     dist/mail-a.html asks for "An Empower Mississippi campaign email, headed
 *     Save Our ESA, above a photograph of a classroom." Those are different
 *     sentences describing different things, and the live one does not
 *     describe an email mockup at all. RECORDED, NOT WRITTEN. This is an
 *     editorial item already on the list at
 *     docs/elementor/phase2b/2026-08-18-alt-text-decisions.md and the brief
 *     for this task says explicitly that it is not to be fixed by writing to
 *     the install. No `wp post meta update` was attempted.
 *
 *     Worth stating what that costs, so nobody reads the omission as "no
 *     problem here": the converted page will emit "Research report cover" as
 *     this image's alt text, which is wrong for the photograph and wrong for
 *     the page. It is an accessibility defect with an owner, not an open
 *     question.
 *
 *   - children-running-parent (20580): EMPTY alt, confirmed by reading the
 *     meta back ("(EMPTY-ALT-20580)"). dist/mail-a.html gives this <img>
 *     `alt="A man playing football with two children in a field at sunset."`,
 *     so the static build treats it as MEANINGFUL, and the attachment carries
 *     nothing. Empty is Paolo's explicit decision on this attachment
 *     (final/media.mjs records the same reading), so again: record, do not
 *     write. No aria-hidden is set on this image() widget, because the static
 *     build does not set one and hiding a meaningful photograph would be a
 *     second wrong answer rather than a repair for the first.
 *
 * ALT TEXT IS NOT A FACTORY PARAMETER, and cannot be: Elementor's image
 * widget has no alt control at all, and a settings.image.alt key is accepted
 * and silently discarded. elementor/factory.mjs's image() comment records the
 * two-widget experiment that proved it. So neither of the two items above is
 * fixable from this repository even if it were ours to fix.
 */

import { PHOTOS as FINAL_PHOTOS } from '../final/media.mjs';

const PHOTOS = {
  'esa-email-mockup': FINAL_PHOTOS['esa-email-mockup'],
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
