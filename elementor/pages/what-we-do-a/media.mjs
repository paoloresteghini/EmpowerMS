/* what-we-do-a's photography, as it exists in the install's media library.
 *
 * All four photographs this page uses (classroom-students, child-classroom-tablet,
 * worker-workshop-bw, grandparents-grandchild) were already imported to the
 * install for the homepage on 2026-08-14; see elementor/pages/final/media.mjs
 * for the import record, the ids, and the alt-text rule (alt text is a
 * media-library property, not a widget setting).
 *
 * Checked before writing this file, per task-6b-brief.md step 3: importing any
 * of the four again would give a second attachment with a `-1` suffixed
 * filename, the exact collision the box sweep's key normalisation has to
 * strip, so nothing here re-imports. Checked too whether the existing alt text
 * on each of the four conflicts with how THIS page uses the photograph, since
 * alt is a property of the attachment and a page cannot set its own:
 *
 *   - classroom-students (20587): alt "An adult and a child walking hand in
 *     hand across grass", read directly off the install with `wp post meta
 *     get`. This page's hero uses the same photograph meaningfully, with the
 *     identical alt text in dist/what-we-do-a.html's own <img alt="...">. No
 *     conflict, nothing to suppress.
 *   - child-classroom-tablet (20581): alt "A child working on a tablet in a
 *     classroom", meaningful on the homepage (05-insights). This page's
 *     Quality Education door uses it decoratively (`alt="" aria-hidden="true"`
 *     in source), the same split final/03-foundations.mjs already documents
 *     for this exact attachment: the decorative use suppresses via
 *     `aria-hidden` on the widget wrapper rather than relying on empty alt.
 *   - worker-workshop-bw (20582) and grandparents-grandchild (20583): both
 *     `wp post meta get` with no value (empty alt, imported that way on
 *     purpose per final/media.mjs), matching this page's decorative use of
 *     both. No conflict.
 *
 * Re-exported from final/media.mjs's own `photo()` rather than re-typed here
 * with the same four ids copied out by hand. final/media.mjs's own comment
 * explains why that would be a real risk, not a style preference: "An id
 * typed at each point of use is the same install fact written five times,
 * and when one copy is wrong the page renders somebody else's photograph
 * while every structural test still passes." A second file typing the same
 * four numbers is that risk with a new point of use, so this file reads the
 * fact instead of retyping it.
 */

export { photo } from '../final/media.mjs';
