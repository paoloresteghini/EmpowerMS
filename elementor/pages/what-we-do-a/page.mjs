import { section as hero } from './01-hero.mjs';
import { section as solutions } from './02-solutions.mjs';
import { section as reports } from './03-reports.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as final/page.mjs and
   podcast-a/page.mjs: deployPage() overwrites _elementor_data wholesale, so a
   hand-typed section array at the call site is one dropped import away from
   silently publishing a page missing part of itself.

   POST_ID 20595 is a page created on the install on 2026-08-17 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="What We Do" --post_name=what-we-do-a --post_status=publish
   --porcelain`), slug `what-we-do-a`, matching dist/what-we-do-a.html's own
   name. Install state, not design, exactly like the other two pages'
   POST_ID. */

export const POST_ID = 20595;

export const sections = () => [hero(), solutions(), reports()];
