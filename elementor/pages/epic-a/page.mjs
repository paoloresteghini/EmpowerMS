import { section as hero } from './01-hero.mjs';
import { section as work } from './02-work.mjs';
import { section as method } from './03-method.mjs';
import { section as research } from './04-research.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing a
   page missing part of itself.

   POST_ID 20605 is a page created on the install on 2026-08-18 specifically to
   receive this conversion (`wp post create --post_type=page --post_title="EPIC"
   --post_name=epic-a --post_status=publish --porcelain`), slug `epic-a`,
   matching dist/epic-a.html's own name. `wp post list --post_type=page
   --post_status=any` before this task returned no page matching `epic` at all.
   Install state, not design, exactly like the other pages' POST_ID.

   Not to be confused with attachment 20239, post name `epic`, which is an
   existing media item on the live site and is not touched; media.mjs records
   why it is not this page's logo either. */

export const POST_ID = 20605;

export const sections = () => [hero(), work(), method(), research()];
