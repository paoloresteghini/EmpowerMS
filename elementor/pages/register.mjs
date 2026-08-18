import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* The page register, corrected after review (fix round 1): this file's own
   comment used to claim a hand-written list is legitimate here because it
   names coverage. That is backwards, and it is backwards in exactly the
   words the brief warned about: "A hand-written list is legitimate for
   named exemptions... and illegitimate for coverage, which is what the
   register is." A hand-typed PAGE_REGISTER, on its own, is precisely the
   defect the brief cites as precedent: this repo already shipped a test
   whose page list was hand-written and passed green while four pages added
   afterward carried the exact violation it existed to catch. Moving the
   list from a test body into this file changed where it is typed, not
   whether it is derived, and by itself was not a fix.

   So coverage is no longer decided by what is typed into PAGE_REGISTER.
   It is decided by convertedPageDirs() below, which reads
   elementor/pages/ itself: every directory carrying a page.mjs IS a
   converted page, full stop, and nothing about that reads from a list a
   person wrote. PAGE_REGISTER and EXCLUDED_PAGES are still hand-written,
   because the brief is right that SOME hand-writing is legitimate here:
   the live env var, the example URL, the static file and each page's
   measured floors cannot be derived from anything, and a reason for
   excluding a page is exactly the "named exemption" the brief calls
   legitimate. What makes the hand-written parts safe now is that
   test-elementor.mjs asserts every name convertedPageDirs() finds appears
   in exactly one of these two lists (see "every converted page directory
   is either gated by the register or explicitly excluded" in that file).
   Forget to register a new page, or delete an entry without excluding it,
   and that assertion goes red naming the orphaned directory. That is the
   difference between this file and the test it replaces: the SET is
   derived, and only the METADATA attached to each member of that set is
   hand-written.

   fidelity-deferred.mjs's DEFERRED_IMAGES is a hand-written list too, and
   is legitimate for the opposite reason: it names an EXEMPTION on a page
   already in this derived coverage set (checked against PAGE_REGISTER's
   own names, so a deferred entry cannot target a page this register
   never gated), not a decision about what is measured at all. */

const PAGES_DIR = path.dirname(fileURLToPath(import.meta.url));

/* Every directory directly under elementor/pages/ that carries its own
   page.mjs. This, not PAGE_REGISTER, is the actual coverage set: it is
   read from the filesystem at test time, so it cannot go stale the way a
   list re-typed by hand can. */
export function convertedPageDirs() {
  return fs.readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(PAGES_DIR, name, 'page.mjs')));
}

/* Gated pages: for each, the live env var, the shape requirePageUrl()'s
   skip message shows a developer who has none (exampleUrl, never a real
   credential), the static file it is compared against, and two
   per-page coverage floors, fixed after fix round 1's I1/I2 findings that
   a single constant (40, calibrated on the homepage alone) either rejects
   a smaller page's honest conversion or, on the box sweep, does not exist
   at all and lets a wrong staticFile pass green.

   minShared: the floor for the paragraph/heading census
   (shared.length > minShared in the "every paragraph and heading..."
   test). measured 2026-08-17 by running census() from fidelity-browser.mjs
   directly against the static file alone (no live side, via the same
   serveRepoRoot() the tests use): dist/final.html has 63 elements
   matching h1,h2,h3,h4,h5,p,blockquote. 40 is unchanged from the constant
   this test hard-coded before the register existed (kept rather than
   raised, so the homepage's behaviour does not change), and is comfortably
   below 63 while still requiring the large majority of the static page's
   own text content to reappear, matched by text, on the live side.

   minBoxes: the same floor for the control/image box sweep
   (measuredElements > minBoxes in the "every control and image..." test,
   where measuredElements is `shared` with the __unsettled__ bookkeeping key
   filtered out; fix round 2 (N3) moved the comparison off `shared.length`
   itself, which double-counted that marker as a measured element), newly
   added in fix round 1: the box sweep had no floor at all before that (I2).
   Measured the same way, with controlBoxes() at both 1440 and 390 against
   dist/final.html alone: 87 elements (a,button,input,select,textarea,img
   with a usable identity) at both widths. 50 keeps roughly the same
   headroom as minShared's 40/63 (about two thirds), while sitting nowhere
   near what a wrong staticFile actually produces: controlBoxes() against a
   404 measures 0 real elements (only the two bookkeeping keys), so
   `measuredElements` collapses to 0, far under 50. */
export const PAGE_REGISTER = [
  {
    name: 'final',
    envVar: 'HOME_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/final/',
    staticFile: 'dist/final.html',
    minShared: 40,
    minBoxes: 50,
  },
  /* what-we-do-a: Task 6b, the first page built class-in-markup from the
     start rather than migrated to it. Its own floors, not the homepage's
     (the addendum's own instruction, after this register rejected the
     homepage's constant outright for a page this much smaller).

     minShared: measured 2026-08-17 with census() from fidelity-browser.mjs
     run directly against dist/what-we-do-a.html alone (no live side, served
     locally the same way the tests do): 17 elements matching
     h1,h2,h3,h4,h5,p,blockquote. 10 keeps roughly the same headroom the
     homepage's 40/63 floor keeps (that pair is about 63%; 10/17 is about
     59%, corrected after review round 1, which flagged the two numbers as
     transposed here): at least 11 of 17 must match by text, comfortably
     below 17 while still requiring the large majority of the static page's
     own text content to reappear on the live side.

     minBoxes: measured the same way with controlBoxes() against
     dist/what-we-do-a.html alone, at both 1440 and 390: 72 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0, __unsettled__ "settled" on every run. 40
     keeps roughly the same proportion as the homepage's 50/87 (about 57%: at
     least 41 of 72 must match), and sits nowhere near what a wrong
     staticFile actually produces (a 404 measures 0 real elements).

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, added review round 1: not
     minBoxes. Roughly 60 of this page's 72 box-sweep elements live in the
     site-wide header and footer (Elementor theme parts), which render on a
     WordPress 404 too, so a live page that failed to load would still share
     around 60 keys against minBoxes' 40 and the box sweep alone could pass
     green. minShared is the real load-failure gate here: only 6 of the 17
     census elements live in the header and footer, a 404 shares 6, and 6 is
     under the 11 that minShared:10 demands, so the suite goes red on the
     census, not the box sweep. This asymmetry is not specific to this page
     (the homepage's entry shares it); worth keeping in mind when setting
     minShared for a future page whose own census count is small relative to
     the shared chrome's 6. */
  {
    name: 'what-we-do-a',
    envVar: 'WHAT_WE_DO_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/what-we-do-a/',
    staticFile: 'dist/what-we-do-a.html',
    minShared: 10,
    minBoxes: 40,
  },
  /* solutions-b: Task 7, the second page built class-in-markup from the
     start. Its own floors, measured the same way what-we-do-a's were, not
     copied from either existing entry.

     minShared: measured 2026-08-18 with census() from fidelity-browser.mjs
     run directly against dist/solutions-b.html alone (served locally the
     same way the tests do, no live side): 24 elements matching
     h1,h2,h3,h4,h5,p,blockquote. 14 keeps roughly the same headroom the
     other two entries keep (final's 40/63 is 63%, what-we-do-a's 10/17 is
     59%; 14/24 is 58%): at least 15 of 24 must match by text, comfortably
     below 24 while still requiring the large majority of the static page's
     own text content to reappear on the live side.

     minBoxes: measured the same way with controlBoxes() against
     dist/solutions-b.html alone, at both 1440 and 390: 69 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0, __unsettled__ "settled" on every run. 39
     keeps the same proportion as the other two entries (roughly 56-57%: at
     least 40 of 69 must match).

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry
     what-we-do-a's entry documents and not specific to either page: not
     minBoxes. Counted directly from dist/solutions-b.html outside its own
     <main> (the header and footer markup, identical across every page in
     this build): 46 <a>, 12 <button>, 2 <img>, roughly 60 of this page's 69
     box-sweep elements, leaving only about 9 that belong to this page's own
     content (4 photographs, 5 CTA links). A live page that failed to load
     would still share close to 60 keys against minBoxes' 39 and the box
     sweep alone could pass green. minShared is the real load-failure gate
     here too: only 6 of the 24 census elements live in the header and
     footer (counted the same way, outside <main>: 2 <h3>, 4 <p>), a 404
     shares 6, and 6 is under the 15 that minShared:14 demands, so the suite
     goes red on the census, not the box sweep. */
  {
    name: 'solutions-b',
    envVar: 'SOLUTIONS_B_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/solutions-b/',
    staticFile: 'dist/solutions-b.html',
    minShared: 14,
    minBoxes: 39,
  },
  /* capitol-a: Task 8, the third page built class-in-markup from the start.
     Its own floors, measured the same way the other two entries' were, not
     copied from either.

     minShared: measured 2026-08-18 with census() from fidelity-browser.mjs
     run directly against dist/capitol-a.html alone (served locally the
     same way the tests do, no live side): 16 elements matching
     h1,h2,h3,h4,h5,p,blockquote. 9 keeps roughly the same headroom the
     other two entries keep (final's 40/63 is 63%, what-we-do-a's 10/17 is
     59%, solutions-b's 14/24 is 58%; 9/16 is 56%): at least 10 of 16 must
     match by text, comfortably below 16 while still requiring the large
     majority of the static page's own text content to reappear on the
     live side.

     minBoxes: measured the same way with controlBoxes() against
     dist/capitol-a.html alone, at both 1440 and 390: 70 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0, __unsettled__ "settled" on every run. 39
     keeps the same proportion as the other two entries (roughly 56-57%: at
     least 40 of 70 must match).

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry the other
     two entries document, re-measured for this page: not minBoxes. Counted
     directly from dist/capitol-a.html outside its own <main> (the header
     and footer markup, identical across every page in this build): 46
     <a>, 12 <button>, 2 <img>, roughly 60 of this page's 70 box-sweep
     elements, leaving only about 10 that belong to this page's own content
     (this page carries no photographs at all, so every one of those 10 is
     a control: the CTA link, the filter's two checkboxes/labels and clear
     button, and the six episode-row title links plus their play-icon
     spans do not themselves carry a usable a/button/input identity beyond
     the anchor). A live page that failed to load would still share close
     to 60 keys against minBoxes' 39 and the box sweep alone could pass
     green. minShared is the real load-failure gate here too: only 6 of the
     16 census elements live in the header and footer (counted the same
     way, outside <main>: 2 <h3>, 4 <p>), a 404 shares 6, and 6 is under
     the 10 that minShared:9 demands, so the suite goes red on the census,
     not the box sweep. */
  {
    name: 'capitol-a',
    envVar: 'CAPITOL_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/capitol-a/',
    staticFile: 'dist/capitol-a.html',
    minShared: 9,
    minBoxes: 39,
  },
];

/* Pages with a page.mjs that are deliberately NOT gated, each with the
   reason recorded as data rather than only as prose, so
   convertedPageDirs()'s coverage check can read it instead of trusting a
   comment to stay in sync with which directories exist.

   podcast-a: its box sweep carries nine permanent differences that are not
   image findings. The live install renders 66 real podcast episodes
   through a Loop Grid; dist/podcast-a.html ships 9 fixed placeholder
   cards; the two sides are therefore comparing different CONTENT, not a
   placeholder photograph waiting on a real one. Those nine keys are anchor
   keys (a|<episode title>), not image keys, so DEFERRED_IMAGES cannot be
   used to hide them: the recipe restricts deferral to image keys precisely
   so a content mismatch like this cannot be swept under the same mechanism
   as a wrong crop. If podcast-a is ever to be gated, it needs a key that
   identifies a card slot independently of which episode landed in it,
   which nobody has designed yet. */
export const EXCLUDED_PAGES = [
  {
    name: 'podcast-a',
    reason: 'box sweep finds 9 permanent anchor-key differences (66 real episodes vs 9 placeholder '
      + 'cards); a content mismatch, not an image finding, and not fixable by deferring image keys',
  },
];
