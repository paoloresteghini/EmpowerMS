import { section as hero } from './01-hero.mjs';
import { section as about } from './02-about.mjs';
import { section as library } from './03-library.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed
   section array at the call site is one dropped import away from silently
   publishing a page missing part of itself.

   POST_ID 20598 is a page created on the install on 2026-08-18 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="Capitol Chat" --post_name=capitol-a --post_status=publish
   --porcelain`), slug `capitol-a`, matching dist/capitol-a.html's own name.
   No page with this slug existed on the install before this task
   (`wp post list --post_type=page --s=capitol` returned nothing matching).
   Install state, not design, exactly like the other pages' POST_ID. */

export const POST_ID = 20598;

export const sections = () => [hero(), about(), library()];
