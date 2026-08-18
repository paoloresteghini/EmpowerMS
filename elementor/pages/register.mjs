/* The page register: the one place that says which converted pages the two
   measuring instruments in fidelity-browser.mjs sweep, and what each is
   compared against. Read by test-elementor.mjs to generate one instrument
   test per page, and readable on its own by a human deciding what is
   covered, since it is the only list that answers "which pages are actually
   gated".

   A hand-written list is legitimate here because it names COVERAGE: every
   page this repo has converted and intends to measure belongs in it. That
   is the opposite of fidelity-deferred.mjs's DEFERRED_IMAGES, a hand-written
   list too, but one that names an EXEMPTION from measurement on a page
   already in this register. Confusing the two would let a page quietly stop
   being measured under the guise of "deferring" it; keeping them in
   separate files with opposite justifications is how that distinction stays
   visible instead of becoming a judgement call at review time.

   This repo has already shipped one test whose page list was hand-written
   at the file's own top and passed green while four pages added afterward
   carried the exact violation it existed to catch. The fix there, and the
   rule here, is the same: the set a sweep asserts over must come from one
   place both the sweep and a human read, never from a list re-typed at the
   call site.

   envVar names the environment variable that carries the page's live URL.
   It is read from the environment, never committed, because it differs per
   install (and, before a page is deployed, does not exist at all).
   exampleUrl is not a live credential, only the shape requirePageUrl()'s
   skip message shows a developer who has none.

   podcast-a is deliberately NOT in this register. Its box sweep carries
   nine permanent differences that are not image findings: the live install
   renders 66 real podcast episodes through a Loop Grid, dist/podcast-a.html
   ships 9 fixed placeholder cards, and the two sides are therefore comparing
   different CONTENT, not a placeholder photograph waiting on a real one.
   Those nine keys are anchor keys (a|<episode title>), not image keys, so
   DEFERRED_IMAGES cannot be used to hide them: the recipe restricts deferral
   to image keys precisely so a content mismatch like this cannot be swept
   under the same mechanism as a wrong crop. If podcast-a is ever to be
   gated, it needs a key that identifies a card slot independently of which
   episode landed in it, which nobody has designed yet. Leaving it out of
   the register, rather than in it with nine keys forced into the deferred
   list, keeps that gap visible instead of disguising it as nine ordinary
   exemptions. */

export const PAGE_REGISTER = [
  {
    name: 'final',
    envVar: 'HOME_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/final/',
    staticFile: 'dist/final.html',
  },
  // Task 6b adds what-we-do-a here once it is converted and measured green.
];
