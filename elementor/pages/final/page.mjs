import { section as hero } from './01-hero.mjs';

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

export const sections = () => [hero()];
