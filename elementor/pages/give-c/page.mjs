import { section as hero } from './01-hero.mjs';
import { section as matters } from './02-matters.mjs';
import { section as next } from './03-next.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing a
   page missing part of itself.

   POST_ID 20606 is a page created on the install on 2026-08-18 specifically to
   receive this conversion (`wp post create --post_type=page --post_title="Donate"
   --post_name=give-c --post_status=publish --porcelain`), slug `give-c`,
   matching dist/give-c.html's own name. `wp post list --post_type=page
   --post_status=any` before this task returned no page whose slug was `give-c`.
   The slug was read back off the install afterwards rather than assumed, because
   WordPress silently appends a suffix when a slug is already taken: it is
   `give-c`, and https://empv2.wpenginepowered.com/give-c/ returns 200. Install
   state, not design, exactly like the other pages' POST_ID.

   The TITLE is "Donate" rather than "Give C". The slug is what every instrument
   and the register key on, and the title is what a human sees in the admin list;
   `give-c` is this build's internal name for one of three readings of the donate
   page, and Empower chose this one on 2026-08-12. Same convention as `mail-a`
   ("Email Sign Up") and `epic-a` ("EPIC"). */

export const POST_ID = 20606;

export const sections = () => [hero(), matters(), next()];
