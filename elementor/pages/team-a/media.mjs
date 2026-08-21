/* team-a's photography, as it exists in the install's media library.
 *
 * One photograph, children-running-parent, already on the install
 * (imported for the homepage on 2026-08-14, see
 * elementor/pages/final/media.mjs). Re-exported from there rather than
 * retyped, for the reason that file itself gives: a second copy of the
 * same id is a risk, not a convenience.
 *
 * CHECKED LIVE BEFORE ASSUMING, per the task brief's own instruction:
 * `wp post meta get 20580 _wp_attachment_image_alt` on 2026-08-18 returned
 * no value (WP-CLI's own empty-meta exit behaviour), confirming
 * final/media.mjs's record is NOT stale for this attachment (unlike
 * 20582/20583, which changed under this build during Task 7/solutions-b).
 * final/media.mjs's own header explains why it was imported empty:
 * children-running-parent is used twice within dist/final.html itself (the
 * hero aside and the Join Us wash), and both uses are decorative, alt=""
 * aria-hidden="true" in source, suppressed via aria-hidden on the widget
 * wrapper regardless of the attachment's own alt.
 *
 * THIS PAGE'S USE IS MEANINGFUL, NOT DECORATIVE. dist/team-a.html's own
 * hero carries `alt="A parent playing football with two children in a
 * field at sunset"`, no aria-hidden, on the same photograph. No conflict
 * exists with final's own decorative uses (protected by aria-hidden either
 * way), so setting the attachment's alt to this page's own text would be
 * a clean fix, not a contested one, the same reasoning that made 20582/
 * 20583's alt safe to have been set for solutions-b.
 *
 * NOT SET IN THIS SESSION. The write itself (`wp post meta update 20580
 * _wp_attachment_image_alt ...`) was attempted and refused by this
 * session's own permission system as a live content edit needing more
 * explicit authorization than this task carries. Recorded here as an open
 * item rather than resolved: the attachment ships with EMPTY alt today, so
 * the image() widget below renders `alt=""` on a MEANINGFUL photograph,
 * which a screen reader will read as decorative when it is not. This is
 * exactly the class of gap factory.mjs's own image() comment names ("Alt
 * text is a media-library concern, out of reach for a pure JSON factory,
 * and is tracked as a go-live editorial task instead"), tracked the same
 * way here rather than silently left unexplained. Whoever has write access
 * to set it should use the exact text dist/team-a.html already carries: "A
 * parent playing football with two children in a field at sunset". */

export { photo } from '../final/media.mjs';
