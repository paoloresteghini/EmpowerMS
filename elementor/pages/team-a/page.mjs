import { section as hero } from './01-hero.mjs';
import { section as staff } from './02-staff.mjs';
import { section as fellows } from './03-fellows.mjs';
import { section as board } from './04-board.mjs';
import { LOOP_ITEM_POST_IDS, staffCard, fellowRow } from './loop-item.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed
   section array at the call site is one dropped import away from silently
   publishing a page missing part of itself.

   FOUR SECTIONS, AND TWO LOOP ITEM TEMPLATES ALONGSIDE THEM. As of
   2026-08-20 this page's deploy is not one write: the page's own tree goes
   to POST_ID, and two Loop Item trees go to two elementor_library posts
   (20634 the staff card, 20636 the fellow row, both created and termed
   `loop-item` on the install that day). Same shape as content-a's, and
   `loopItems()` below pairs each template with its own post id here rather
   than at the call site so a deploy loop cannot write the fellow row into
   the staff card's template, which would render as a Our Team section of
   ledger rows.

   POST_ID 20599 is a page created on the install on 2026-08-18 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="Team, Board & Fellows" --post_name=team-a --post_status=
   publish --porcelain`), slug `team-a`, matching dist/team-a.html's own
   name. `wp post list --post_type=page --s=team` before this task returned
   only unrelated live-site pages (`team`, id 14691; `board`, id 15806),
   neither this conversion's target. Install state, not design, exactly
   like the other pages' POST_ID. */

export const POST_ID = 20599;

/* BOARD BETWEEN STAFF AND FELLOWS SINCE 2026-09-16, and this line was built the
   other way round first. Kienna's note said two things that did not agree: the
   action, "move the light blue board section so it sits below the Staff
   section", which gives Staff -> Board -> Fellows, and the result, "the order
   would then be Board -> Staff -> Fellows". Both readings satisfy her third
   constraint, "Fellows at the bottom", so the text could not settle it. Built to
   the stated order, flagged back, and she confirmed the same day that she meant
   the verb: Staff -> Board -> Fellows.

   RECORDED RATHER THAN QUIETLY CORRECTED, because the instruction is the kind
   that will arrive again: when a change request names BOTH an operation and its
   expected end state, the two are a checksum. Compute the end state from the
   operation against the current page and compare; on a mismatch the request is
   defective and the answer is to ask, not to pick the likelier half. */
export const sections = () => [hero(), staff(), board(), fellows()];

/* The two Loop Item templates, as [postId, elements] pairs. Derived from the
   same LOOP_ITEM_POST_IDS map the two section modules read, so the id a grid
   points at and the id its template is written to cannot drift apart. */
export const loopItems = () => [
  [LOOP_ITEM_POST_IDS.staff, staffCard()],
  [LOOP_ITEM_POST_IDS.fellow, fellowRow()],
];
