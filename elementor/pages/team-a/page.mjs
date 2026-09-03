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

export const sections = () => [hero(), staff(), fellows(), board()];

/* The two Loop Item templates, as [postId, elements] pairs. Derived from the
   same LOOP_ITEM_POST_IDS map the two section modules read, so the id a grid
   points at and the id its template is written to cannot drift apart. */
export const loopItems = () => [
  [LOOP_ITEM_POST_IDS.staff, staffCard()],
  [LOOP_ITEM_POST_IDS.fellow, fellowRow()],
];
