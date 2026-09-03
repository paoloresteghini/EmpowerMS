import { section as hero } from './01-hero.mjs';
import { section as about } from './02-about.mjs';
import { section as receive } from './03-receive.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing
   a page missing part of itself.

   POST_ID 20602 is a page created on the install on 2026-08-18 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="Email Sign Up" --post_name=mail-a --post_status=publish
   --porcelain`), slug `mail-a`, matching dist/mail-a.html's own name.
   `wp post list --post_type=page --post_status=any --name=mail-a` before this
   task returned nothing, and a search for mail/email/signup/ambassador pages
   returned only the live site's unrelated `become-an-ambassador` (17093).
   Install state, not design, exactly like the other pages' POST_ID. */

export const POST_ID = 20602;

export const sections = () => [hero(), about(), receive()];
