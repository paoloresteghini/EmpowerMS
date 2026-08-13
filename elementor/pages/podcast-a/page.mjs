import { section as hero } from './01-hero.mjs';
import { section as about } from './02-about.mjs';

/* The composition contract for this page: which sections it carries, and in
   what order. deployPage() overwrites _elementor_data wholesale, so a call
   built from a hand-typed section array (as Task 6 and Task 7 Step 1 both
   did, deployPage(20568, [hero(), about()]) typed out at the call site) is
   one dropped import away from silently publishing a page missing two
   thirds of itself: it still renders, still returns 200, and nothing but a
   human reading the deploying agent's own report would catch it. This
   module exists so a deploy call reads "deploy this page"
   (deployPage(POST_ID, sections())) rather than "deploy whichever sections
   I happen to remember to list". It is a manifest, not a framework: one
   page, one ordered list, one id, nothing assembled cleverly.

   As sections are added to podcast-a (03-library next), they are appended
   here, in the order they appear on the page, and the composition test
   below is extended to match. Nothing removes an entry from this list
   without also removing it from that test.

   POST_ID is kept here too, even though it is a different kind of fact from
   the section list: it is environment state (a WP post id specific to the
   empv2 install), not part of the page's own design the way section order
   is. Kept in the same file anyway, deliberately, rather than split into a
   separate per-environment config: there is exactly one target install for
   this spike and exactly one page under conversion, so a config layer for
   multiple environments would be built for a need Phase 2 has not created
   yet. If a second install or environment enters the picture, POST_ID is
   the thing to pull out into its own config; the section list should not
   need to move with it when that happens. */

export const POST_ID = 20568;

export const sections = () => [hero(), about()];
