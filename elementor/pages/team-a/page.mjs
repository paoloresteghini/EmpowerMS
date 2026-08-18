import { section as hero } from './01-hero.mjs';
import { section as staff } from './02-staff.mjs';
import { section as fellows } from './03-fellows.mjs';
import { section as board } from './04-board.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed
   section array at the call site is one dropped import away from silently
   publishing a page missing part of itself.

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
