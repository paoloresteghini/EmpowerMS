import { section as hero } from './01-hero.mjs';
import { section as solutions } from './02-solutions.mjs';
import { section as foundations } from './03-foundations.mjs';
import {
  section as stories,
  loopItem as storyMini,
  leadLoopItem as storyLead,
  STORIES_LOOP_ITEM_POST_ID,
  LEAD_LOOP_ITEM_POST_ID,
} from './04-stories.mjs';
import {
  section as insights,
  loopItem as insightsRow,
  LOOP_ITEM_KEYS as INSIGHTS_KEYS,
} from './05-insights.mjs';
import { TEMPLATE_IDS } from '../../loop-templates.mjs';
import { section as joinus } from './06-joinus.mjs';

/* The homepage's composition contract: which sections it carries, and in what
   order. Same shape and same reasoning as podcast-a/page.mjs, which documents
   why this manifest exists at all: deployPage() overwrites _elementor_data
   wholesale, so a call built from a hand-typed section array is one dropped
   import away from silently publishing a page missing most of itself, which
   still renders and still returns 200.

   The order here is dist/final.html's own @include order, and it is worth
   noting that the six sections come from FOUR different source directories
   (final/, option-d/, current-2/ and the shared sections/), because the
   homepage is a per-section combination Empower assembled from five earlier
   builds rather than a page designed in one piece. The section modules in this
   directory are named for their position on the homepage, and each one records
   which partial it was read from.

   POST_ID 20588 is a page created on the install on 2026-08-14 specifically to
   receive this conversion, slug `final`. It is deliberately NOT page 11, which
   is the install's current front page (`page_on_front`) and is Beaver-built.
   Converting into a new page keeps the existing homepage intact and renderable
   for comparison, and makes going live a one-line `wp option update
   page_on_front` once Empower have approved rather than a rebuild if they have
   not. */

export const POST_ID = 20588;

export const sections = () => [hero(), solutions(), foundations(), stories(), insights(), joinus()];

/* The stories section's two Loop Item templates, as [postId, elements] pairs,
   in the same shape content-a/page.mjs and team-a/page.mjs use and for the same
   reason: pairing each tree with its own post id HERE means a deploy loop
   cannot write the lead card into the mini's template. That failure would not
   error and would not fail a structural test; it would render the stories
   column as two full-width lead cards and the featured slot as a mini.

   The homepage had no loopItems() export before 2026-09-04 because it had only
   one template and it was deployed by hand. It has two now. */
export const loopItems = () => [
  [STORIES_LOOP_ITEM_POST_ID, storyMini()],
  [LEAD_LOOP_ITEM_POST_ID, storyLead()],
  /* The three insights rows, 2026-09-09. Their ids come from
     loop-templates.mjs rather than constants in the section module, because an
     elementor_library id belongs to one install and these have to be created
     again on production. Built from the section's own key list so a row added
     there cannot be forgotten here: the pairing IS the safety, per the note
     above about writing one card into another's template. */
  ...INSIGHTS_KEYS.map(key => [TEMPLATE_IDS[key], insightsRow(key)]),
];
