import { section as hero } from './01-hero.mjs';
import { section as why } from './02-why.mjs';
import { section as story } from './03-story.mjs';
import { section as people } from './04-people.mjs';
import { section as status } from './05-status.mjs';

/* The page's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as every earlier page.mjs:
   deployPage() overwrites _elementor_data wholesale, so a hand-typed section
   array at the call site is one dropped import away from silently publishing
   a page missing part of itself.

   POST_ID 20601 is a page created on the install on 2026-08-18 specifically
   to receive this conversion (`wp post create --post_type=page
   --post_title="Who We Are" --post_name=who-we-are-a --post_status=publish
   --porcelain`), slug `who-we-are-a`, matching dist/who-we-are-a.html's own
   name. `wp post list --post_type=page --s=who` before this task returned
   only unrelated live-site pages (`about`, id 33; `learn-more`, id 18109;
   `team`, id 14691 among them), none of them this conversion's target.
   Install state, not design, exactly like the other pages' POST_ID. */

export const POST_ID = 20601;

export const sections = () => [hero(), why(), story(), people(), status()];
