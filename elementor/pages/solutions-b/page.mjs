import { section as hero } from './01-hero.mjs';
import { section as track } from './02-track.mjs';
import { section as research } from './03-research.mjs';
import { section as stories } from './04-stories.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as what-we-do-a/page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently
   publishing a page missing part of itself.

   POST_ID 20596 is a page that already existed on the install when this
   task resumed (slug `solutions-b`, status publish, title "Solutions"),
   confirmed with `wp post get 20596 --field=post_name` before writing this
   file rather than assumed. Install state, not design, exactly like the
   other converted pages' POST_ID. */

export const POST_ID = 20596;

export const sections = () => [hero(), track(), research(), stories()];
