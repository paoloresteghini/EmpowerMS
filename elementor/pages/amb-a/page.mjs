import { section as hero } from './01-hero.mjs';
import { section as who } from './02-who.mjs';
import { section as doing } from './03-do.mjs';
import { section as join } from './04-join.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing
   a page missing part of itself.

   POST_ID 20603 is a page created on the install on 2026-08-18 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="Ambassador Program" --post_name=amb-a --post_status=publish
   --porcelain`), slug `amb-a`, matching dist/amb-a.html's own name.
   `wp post list --post_type=page --post_status=any` before this task returned
   no `amb-a`; the live site's own unrelated `become-an-ambassador` (17093) is
   a different page and is not touched. Install state, not design, exactly
   like the other pages' POST_ID.

   `doing` rather than `do`, because `do` is a reserved word in JavaScript and
   a local binding cannot use it. */

export const POST_ID = 20603;

export const sections = () => [hero(), who(), doing(), join()];
