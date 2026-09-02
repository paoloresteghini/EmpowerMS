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
    exampleUrl: 'https://empv2.wpenginepowered.com/',
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
    exampleUrl: 'https://empv2.wpenginepowered.com/what-we-do/',
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
    exampleUrl: 'https://empv2.wpenginepowered.com/solutions/',
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
     a control: the CTA link, the filter's two checkboxes and clear button,
     and the six episode-row title links; the play-icon spans and the tag
     labels are not counted separately, not because they lack a usable
     identity but because controlBoxes()'s own selector list is
     a,button,input,select,textarea,img and neither <span> nor <label> is
     in it, so they are never considered at all). A live page that failed
     to load would still share close
     to 60 keys against minBoxes' 39 and the box sweep alone could pass
     green. minShared is the real load-failure gate here too: only 6 of the
     16 census elements live in the header and footer (counted the same
     way, outside <main>: 2 <h3>, 4 <p>), a 404 shares 6, and 6 is under
     the 10 that minShared:9 demands, so the suite goes red on the census,
     not the box sweep. */
  {
    name: 'capitol-a',
    envVar: 'CAPITOL_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/capitol-chat/',
    staticFile: 'dist/capitol-a.html',
    minShared: 9,
    minBoxes: 39,
  },
  /* team-a: Task 9, the fourth page built class-in-markup from the start.
     Its own floors, measured the same way the other four entries' were,
     not copied from any.

     minShared: measured 2026-08-18 with census() from fidelity-browser.mjs
     run directly against dist/team-a.html alone (served locally the same
     way the tests do, no live side): 25 elements matching
     h1,h2,h3,h4,h5,p,blockquote. CORRECTED 2026-08-18 by the Task 9
     review, which found the reasoning here false in its premise and
     backwards in its inference while the number itself was sound: a raw
     percentage of the census total is NOT comparable across pages,
     because a fixed 6-element chrome share (the header's and footer's
     own h3s and paragraphs) is counted into every page's total. Measured
     across all five registered static builds, that share is 6 on every
     one of them, final.html at 63 census elements included, so the claim
     this comment used to make, that 25 is large relative to a fixed 6
     "than any page before it", is simply wrong.

     What is comparable is the fraction of the page's OWN content the
     floor demands. Measured: final 35/57 61%, solutions-b 9/18 50%,
     what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%. So 13
     puts this page between what-we-do-a and capitol-a, which is the
     argument for it. At the other entries' proportion the floor would be
     14, demanding 9 of this page's own 19 rather than 8: the same
     proportion demands MORE real matches on a larger page, not fewer.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs
     (cited by its text rather than by a line number: this is the third time
     today an unrelated edit to that file moved the line and invalidated the
     citation, and an anchor that the file's own content carries cannot drift)
     is strict, so 13 means at least 14 of 25 must match by text,
     comfortably below 25 while still requiring the large majority of the
     static page's own text content to reappear on the live side.

     minBoxes: measured the same way with controlBoxes() against
     dist/team-a.html alone, at both 1440 and 390: 64 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0, __unsettled__ "settled" on every run.
     35 keeps the same proportion as the other four entries (roughly
     56-57%: at least 36 of 64 must match).

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every
     other entry documents, re-measured for this page: not minBoxes.
     Counted directly from dist/team-a.html outside its own <main> (the
     header and footer markup, identical across every page in this
     build): 46 <a>, 12 <button>, 2 <img>, 60 of this page's 64
     box-sweep elements, leaving only 4 that belong to this page's own
     content (the hero photograph, the "Support Our Work" CTA, the "Meet
     the staff" jump link, and Grant Callen's own `<a href="team-bio.html">`
     in the staff roster; the roster, ledger and roll are each one html()
     widget carrying only plain <span>s beyond that one link, per
     02-staff.mjs/03-fellows.mjs/04-board.mjs's own notes, so none of
     their other names or titles add a box-sweep key). A live page that
     failed to load would still share close to 60 keys against minBoxes'
     35 and the box sweep alone could pass green. minShared is the real
     load-failure gate here too: only 6 of the 25 census elements live in
     the header and footer (counted the same way, outside <main>: 2 <h3>,
     4 <p>), a 404 shares 6, and 6 is under the 14 that minShared:13
     demands, so the suite goes red on the census, not the box sweep.

     THIS PAGE IS NO LONGER GATED, AND THE NUMBERS ABOVE ARE KEPT RATHER THAN
     DELETED. On 2026-08-20 its staff roster and fellows ledger became Loop
     Grids over the `person` post type, so the live page renders 13 staff and
     5 fellows against dist/team-a.html's 10 and 5, with four names on one
     side that are not on the other in each direction. That is the same
     content mismatch podcast-a and content-a carry and it is measured the
     same way, so team-a moved to EXCLUDED_PAGES below with the behavioural
     gate that replaces it. The floors above are what the page measured while
     it was still gated, on 2026-08-18, and they are the number to restore if
     the roster is ever frozen back into markup. */
  /* who-we-are-a: Task 10, the fifth page built class-in-markup from the
     start. Its own floors, measured the same way the other five entries'
     were, not copied from any.

     minShared: measured 2026-08-18 with census() from fidelity-browser.mjs
     run directly against dist/who-we-are-a.html alone (no live side, served
     locally the same way the tests do): 30 elements matching
     h1,h2,h3,h4,h5,p,blockquote, of which 6 are the shared header and
     footer chrome and 24 are this page's own.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, not as a percentage of
     the census total, following the correction the Task 9 review made to
     team-a's entry above: a raw percentage of the total is not comparable
     across pages, because the fixed 6-element chrome share is counted into
     every page's total and is a different fraction of each one. An earlier
     draft of this comment made exactly that uncomparable comparison
     (16/30 against the other entries' totals) and is replaced here rather
     than left to be re-derived.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs
     (cited by its text rather than by a line number: this is the third time
     today an unrelated edit to that file moved the line and invalidated the
     citation, and an anchor that the file's own content carries cannot drift)
     is strict, so 16 means at least 17 of 30 must match by text. Six of
     those come from the chrome, so the floor demands 11 of this page's own
     24. Measured against the same fraction on the other five entries
     (final 35/57 61%, solutions-b 9/18 50%, what-we-do-a 5/11 45%, team-a
     8/19 42%, capitol-a 4/10 40%), 11/24 is 46%, which puts this page
     between what-we-do-a and solutions-b rather than at either extreme.

     minBoxes: measured the same way with controlBoxes() against
     dist/who-we-are-a.html alone, at both 1440 and 390: 69 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0. 39 keeps the same proportion as the
     other entries (roughly 56-57%: at least 40 of 69 must match), and is
     the same pair solutions-b's entry uses for the same 69.

     __unsettled__ IS "unsettled" AT 390 ON BOTH SIDES, and that is a
     property of this page rather than a flake, so it is recorded here
     rather than left for the next person to re-diagnose. Every other
     registered page reports "settled" at both widths. Here
     css/who-we-are-a.css:260 gives the third people frame `display:none`
     below 640px, and that frame carries `data-reveal="clip"`: an element
     with no rendered box can never intersect, so js/reveal.js's
     IntersectionObserver never fires for it and it never gains
     .is-revealed, which is what settleReveal() waits on. The hero's own
     `--tall` figure is hidden at the same breakpoint (:258) and does NOT
     cause this, because it sits inside the `[data-reveal-entrance]` scope
     and js/reveal.js:51 reveals that set unconditionally on load. Both
     sides render the same rule, so both report the same marker and the key
     compares equal; the cost is that each 390 run spends settleReveal()'s
     full 10s wait before returning.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every
     other entry documents, re-measured for this page: not minBoxes.
     Counted directly from dist/who-we-are-a.html outside its own <main>
     (the header and footer markup, identical across every page in this
     build): 46 <a>, 12 <button>, 2 <img>, 60 of this page's 69 box-sweep
     elements, leaving only 9 that belong to this page's own content (6
     photographs and 3 anchors: the hero CTA, the hero's "Read our story"
     jump, and the people section's CTA). A live page that failed to load
     would still share 60 keys against minBoxes' 39 and the box sweep alone
     could pass green. minShared is the real load-failure gate here too:
     only 6 of the 30 census elements live in the header and footer
     (counted the same way, outside <main>: 2 <h3>, 4 <p>), a 404 shares 6,
     and 6 is under the 17 that minShared:16 demands, so the suite goes red
     on the census, not the box sweep. The margin is the widest of any page
     so far, because this page carries 24 census elements of its own. */
  {
    name: 'who-we-are-a',
    envVar: 'WHO_WE_ARE_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/who-we-are/',
    staticFile: 'dist/who-we-are-a.html',
    minShared: 16,
    minBoxes: 39,
  },
  /* mail-a: Task 12, the sixth page built class-in-markup from the start,
     and the build's first form page. Its own floors, measured 2026-08-18
     against dist/mail-a.html alone (no live side, served locally the same
     way the tests do), not copied from any other entry.

     THE TIGHTEST PAGE IN THE BUILD ON CENSUS HEADROOM, which is why the
     floor is reasoned rather than scaled: census() finds 19 elements
     matching h1,h2,h3,h4,h5,p,blockquote, and only 13 of them are this
     page's own. Counted directly from the file: inside <main> 1 <h1>, 2
     <h2> and 10 <p>; outside it 2 <h3> and 4 <p>, the same six-element
     chrome every page in this build carries.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the
     correction the Task 9 review made to team-a's entry: a raw percentage
     of the census total is not comparable across pages, because the fixed
     6-element chrome share is a different fraction of each page's total,
     and on this page it is nearly a third of it.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs
     (cited by its text rather than by a line number, the convention
     who-we-are-a's entry established after three unrelated edits moved that
     line in one day) is strict, so 11 means at least 12 of 19 must match by
     text. Six come from the chrome, so the floor demands 6 of this page's
     own 13. Measured against the same fraction on the other six entries
     (final 35/57 61%, solutions-b 9/18 50%, what-we-do-a 5/11 45%, team-a
     8/19 42%, capitol-a 4/10 40%, who-we-are-a 11/24 46%), 6/13 is 46%,
     which puts this page level with who-we-are-a and mid-range overall.

     ALL 19 ARE ACHIEVABLE, and that is a build decision rather than a
     given. Recipe section 7 predicted this page would lose the census key
     `p|Back to the sign-up form` to a container-plus-link(); 03-receive.mjs
     note 2 records why that element is an html() widget carrying its real
     <p> and <a> instead, and the effect here is that no census key and no
     box-sweep key is lost on this page at all.

     minBoxes: measured the same way with controlBoxes() against
     dist/mail-a.html alone, at both 1440 and 390: 68 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0, __unsettled__ "settled" on every run. 38
     keeps the same proportion as the other entries (roughly 56-57%: at
     least 39 of 68 must match).

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every
     other entry documents, re-measured for this page: not minBoxes.
     Counted directly from dist/mail-a.html outside its own <main>: 46 <a>,
     12 <button>, 2 <img>, 60 of this page's 68 box-sweep elements, leaving
     8 that belong to this page's own content (4 <input>, the submit
     <button>, 2 photographs and the "Back to the sign-up form" anchor). A
     live page that failed to load would still share 60 keys against
     minBoxes' 38 and the box sweep alone could pass green. minShared is the
     real load-failure gate here too: a 404 shares the 6 chrome census
     elements, and 6 is under the 12 that minShared:11 demands, so the suite
     goes red on the census, not the box sweep. */
  {
    name: 'mail-a',
    envVar: 'MAIL_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/newsletter/',
    staticFile: 'dist/mail-a.html',
    minShared: 11,
    minBoxes: 38,
  },
  /* amb-a: Task 13, the seventh page built class-in-markup from the start,
     and the build's second form page. Its own floors, measured 2026-08-18
     against dist/amb-a.html alone (no live side, served locally the same way
     the tests do), not copied from any other entry.

     census() finds 21 elements matching h1,h2,h3,h4,h5,p,blockquote, of
     which 6 are the shared header and footer chrome and 15 are this page's
     own. Counted directly from the file: inside <main> 1 <h1>, 3 <h2> and
     11 <p>; outside it 2 <h3> and 4 <p>, the same six-element chrome every
     page in this build carries.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited
     by its text rather than by a line number, the convention who-we-are-a's
     entry established after three unrelated edits moved that line in one
     day) is strict, so 12 means at least 13 of 21 must match by text. Six
     come from the chrome, so the floor demands 7 of this page's own 15.
     Measured against the same fraction on the other seven entries (final
     35/57 61%, solutions-b 9/18 50%, what-we-do-a 5/11 45%, team-a 8/19 42%,
     capitol-a 4/10 40%, who-we-are-a 11/24 46%, mail-a 6/13 46%), 7/15 is
     47%, which puts this page mid-range rather than at either extreme.

     ALL 21 ARE ACHIEVABLE, and that is a build decision rather than a given.
     Recipe section 7 predicted this page would lose the census key
     `p|Join Our Ambassador Network` to a container-plus-link() for the hero
     call to action; 01-hero.mjs note 1 records why that paragraph is an
     html() widget carrying its real <p> and <a> instead. The effect is that
     no census key and no box-sweep key is lost on this page at all, and it
     is measured: shared is 21 of 21 at both widths.

     minBoxes: measured the same way with controlBoxes() against
     dist/amb-a.html alone, at both 1440 and 390: 76 elements
     (a,button,input,select,textarea,img with a usable identity) at both
     widths, __excluded_count__ 0, __unsettled__ "settled" on every run. 43
     keeps the same proportion as the other entries (roughly 56-57%: at least
     44 of 76 must match).

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted
     directly from dist/amb-a.html outside its own <main>: 46 <a>, 12
     <button>, 2 <img>, 60 of this page's 76 box-sweep elements, leaving 16
     that belong to this page's own content (8 <input>, being the four text
     fields and the four checkboxes, the submit <button>, 5 photographs, the
     <textarea> and the hero's "Join Our Ambassador Network" anchor). This is
     the largest own-content share of any page in the register, and it is
     still not enough: a live page that failed to load would share 60 keys
     against minBoxes' 43 and the box sweep alone could pass green. minShared
     is the real load-failure gate here too: a 404 shares the 6 chrome census
     elements, and 6 is under the 13 that minShared:12 demands, so the suite
     goes red on the census, not the box sweep. */
  {
    name: 'amb-a',
    envVar: 'AMB_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/ambassadors/',
    staticFile: 'dist/amb-a.html',
    minShared: 12,
    minBoxes: 43,
  },
  /* epic-a: Task 14, the eighth page built class-in-markup from the start, and
     the build's first converted scroll-driven animation. Its own floors,
     measured 2026-08-18 against dist/epic-a.html alone (no live side, served
     locally the same way the tests do), not copied from any other entry.

     census() finds 31 elements matching h1,h2,h3,h4,h5,p,blockquote at both
     1440 and 390, of which 6 are the shared header and footer chrome and 25 are
     this page's own. Counted directly from the file: inside <main> 1 <h1>, 3
     <h2>, 6 <h3> and 15 <p>; outside it 2 <h3> and 4 <p>, the same six-element
     chrome every page in this build carries. This is the largest own-content
     census of any page in the register after the homepage.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established after three unrelated edits moved that line in one day) is
     strict, so 17 means at least 18 of 31 must match by text. Six come from the
     chrome, so the floor demands 12 of this page's own 25. Measured against the
     same fraction on the other eight entries (final 35/57 61%, solutions-b 9/18
     50%, what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%,
     who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15 47%), 12/25 is 48%,
     which puts this page mid-range rather than at either extreme.

     30 OF THE 31 ARE ACHIEVABLE, NOT 31, and the one that is not is a build
     decision recorded rather than a surprise. `.epa-research__cta` is a `<p>`
     wrapping a CTA, which recipe section 7 converts to a container holding a
     link(), so `p|View Research & Reports` exists on the static side and not on
     the live one. 04-research.mjs note 5 argues that choice and records the
     second key it costs. Measured: shared is 30 of 31 at both widths, and 30 is
     comfortably above the 18 this floor demands.

     minBoxes: measured the same way with controlBoxes() against
     dist/epic-a.html alone, at both 1440 and 390: 74 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. 42 keeps the
     same proportion as the other entries (roughly 56-58%: at least 43 of 74
     must match).

     69 OF THE 74 ARE ACHIEVABLE, and the five that are not split three to two.
     THREE are the shared chrome keys every converted page in this build loses
     to the Elementor header theme part (`a|Skip to content`,
     `a|Empower Mississippi home`, `img|logo-reversed.png`); they are not this
     page's doing and they are recorded here because no earlier entry names
     them and the next person measuring a page will otherwise chase them. TWO
     are this page's own link() widgets, `a|Dive Into the Resear` and
     `a|View Research & Repo`, which controlBoxes() skips by design because they
     sit inside `.elementor-widget-button`. Measured: shared is 69 of 74 at both
     widths.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/epic-a.html outside its own <main>: 46 <a>, 12 <button>, 2 <img>,
     60 of this page's 74 box-sweep elements, leaving 14 that belong to this
     page's own content (9 anchors, being the hero CTA, the hero aside, the
     three focus-area links, the three most-recent-report links and the closing
     CTA, plus 5 images, being the EPIC lockup, the What We Do figure and the
     three research panels). A live page that failed to load would still share
     around 57 keys against minBoxes' 42 and the box sweep alone could pass
     green. minShared is the real load-failure gate here too: a 404 shares the 6
     chrome census elements, and 6 is under the 18 that minShared:17 demands, so
     the suite goes red on the census, not the box sweep. */
  {
    name: 'epic-a',
    envVar: 'EPIC_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/epic/',
    staticFile: 'dist/epic-a.html',
    minShared: 17,
    minBoxes: 42,
  },
  /* give-c: Task 15, the ninth page built class-in-markup from the start, and
     the build's donate page. Its own floors, measured 2026-08-18 against
     dist/give-c.html alone (no live side, served locally the same way the tests
     do), not copied from any other entry.

     census() finds 25 elements matching h1,h2,h3,h4,h5,p,blockquote at both
     1440 and 390, of which 6 are the shared header and footer chrome and 19 are
     this page's own. Counted directly from the file: inside <main> 1 <h1>, 3
     <h2>, 2 <h3> and 13 <p>; outside it 2 <h3> and 4 <p>, the same six-element
     chrome every page in this build carries.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established after three unrelated edits moved that line in one day) is
     strict, so 14 means at least 15 of 25 must match by text. Six come from the
     chrome, so the floor demands 9 of this page's own 19. Measured against the
     same fraction on the other nine entries (final 35/57 61%, solutions-b 9/18
     50%, what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%,
     who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15 47%, epic-a 12/25 48%),
     9/19 is 47%, which puts this page mid-range rather than at either extreme.

     ALL 25 ARE ACHIEVABLE, and that is a build decision rather than a given.
     Recipe section 7 would have this page lose TWO census keys, `p|Donate
     Today` and `p|Donate Today#2`, to a container-plus-link() at each of its two
     calls to action; 01-hero.mjs note 4 and 03-next.mjs note 3 record why both
     are html() widgets carrying their real <p> and <a> instead. The effect is
     that no census key and no box-sweep key is lost to this page's own build at
     all, and it is measured: shared is 25 of 25 at both widths.

     minBoxes: measured the same way with controlBoxes() against
     dist/give-c.html alone, at both 1440 and 390: 73 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. 41 keeps the
     same proportion as the other entries (roughly 56-58%: at least 42 of 73
     must match).

     70 OF THE 73 ARE ACHIEVABLE, and all three that are not are the shared
     chrome keys every converted page in this build loses to the Elementor
     header theme part (`a|Skip to content`, `a|Empower Mississippi home`,
     `img|logo-reversed.png`), which epic-a's entry above is the first to name.
     None of the three is this page's doing, and this page loses none of its own.
     Measured: shared is 70 of 73 at both widths.

     THE LIVE SIDE CARRIES MORE KEYS THAN THE STATIC ONE AND THE COUNT IS NOT
     STABLE, which is worth recording because it looks like a defect the first
     time it is seen and is not one. The install runs a Mailchimp popup
     (`#PopupSignupForm_0`) that injects its own markup a few seconds after
     load, so live census counts 27 rather than 25 (`p|` and
     `p|Terms and Conditions`) and live controlBoxes counts 74 or 75 rather than
     73 (`a|Terms and Conditions`, `button|Close`, plus the header's own two
     chrome keys). Every one of those is LIVE-ONLY, so none enters either
     comparison, and `__excluded_count__` is 0 on both sides because all of them
     have a usable identity. It is a hazard for a HOVER probe rather than for
     these two instruments: its `.mc-modal-bg` overlay covers the viewport and
     intercepts every pointer event, which is recorded in this task's report.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/give-c.html outside its own <main>: 46 <a>, 12 <button>, 2 <img>,
     60 of this page's 73 box-sweep elements, leaving 13 that belong to this
     page's own content (11 anchors, being the three frequency options, the six
     amount tiles and the two Donate Today calls to action, plus 2 photographs).
     A live page that failed to load would still share around 57 keys against
     minBoxes' 41 and the box sweep alone could pass green. minShared is the real
     load-failure gate here too: a 404 shares the 6 chrome census elements, and 6
     is under the 15 that minShared:14 demands, so the suite goes red on the
     census, not the box sweep. */
  {
    name: 'give-c',
    envVar: 'GIVE_C_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/donate/',
    staticFile: 'dist/give-c.html',
    minShared: 14,
    minBoxes: 41,
  },
  /* team-bio: Task 16, the tenth page built class-in-markup from the start,
     and the build's one staff bio. Its own floors, measured 2026-08-18 against
     dist/team-bio.html alone (no live side, served locally the same way the
     tests do), not copied from any other entry.

     NOT ONE OF THE FOURTEEN SIGNED-OFF CHOOSER PAGES, and registered anyway.
     It is the companion bio linked from Team A's staff cards and it is in the
     conversion order on Paolo's say-so of 2026-08-18; the reason is recorded
     in elementor/pages/team-bio/page.mjs. What the register gates is what has
     been converted, not what was signed off, and every directory carrying a
     page.mjs must appear here or in EXCLUDED_PAGES.

     THIS IS THE SMALLEST PAGE IN THE REGISTER BY CENSUS COUNT, and its floors
     are set from its own content rather than scaled from a bigger page's.
     census() finds 13 elements matching h1,h2,h3,h4,h5,p,blockquote at both
     1440 and 390, of which 6 are the shared header and footer chrome and 7 are
     this page's own. Counted directly from the file: inside <main> 1 <h1>,
     1 <h2> and 5 <p>; outside it 2 <h3> and 4 <p>, the same six-element chrome
     every page in this build carries. A bio is a name, a title and two
     paragraphs by design (css/team-bio.css's own header says so at length), so
     a low count here is the page rather than a gap in it.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established after three unrelated edits moved that line in one day) is
     strict, so 9 means at least 10 of 13 must match by text. Six come from the
     chrome, so the floor demands 4 of this page's own 7. Measured against the
     same fraction on the other ten entries (final 35/57 61%, solutions-b 9/18
     50%, what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%,
     who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15 47%, epic-a 12/25 48%,
     give-c 9/19 47%), 4/7 is 57%, which is the strictest demand in the
     register as a fraction and is affordable precisely because the page is
     small: with 7 own elements there is no floor between 3/7 and 4/7.

     ALL 13 ARE ACHIEVABLE, and that is a build decision rather than a given.
     Recipe section 7's cost does not arise here at all: this page's one call to
     action is wrapped in a <div> rather than a <p>, so no census key was ever
     at risk from it, and 01-profile.mjs note 10 builds that <div> as one html()
     widget (Route A) which keeps the anchor's own box key as well. Measured:
     shared is 13 of 13 at both widths, and no census key is lost to this page's
     own build.

     minBoxes: measured the same way with controlBoxes() against
     dist/team-bio.html alone, at both 1440 and 390: 66 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. 37 keeps the
     same proportion as the other entries (roughly 56-58%: at least 38 of 66
     must match).

     63 OF THE 66 ARE ACHIEVABLE, and all three that are not are the shared
     chrome keys every converted page in this build loses to the Elementor
     header theme part (`a|Skip to content`, `a|Empower Mississippi home`,
     `img|logo-reversed.png`), which epic-a's entry above is the first to name.
     None of the three is this page's doing, and this page loses none of its
     own. Measured: shared is 63 of 66 at both widths.

     THE LIVE SIDE CARRIES MORE KEYS THAN THE STATIC ONE, the same way give-c's
     entry records: the install runs a Mailchimp popup (`#PopupSignupForm_0`)
     that injects its own markup a few seconds after load, so live census counts
     15 rather than 13 (`p|` and `p|Terms and Conditions`) and live controlBoxes
     counts 67 rather than 66 (`a|Terms and Conditions`, `button|Close`, plus
     the header's own `a|/` and the footer logo's resized
     `img|logo-reversed-300x136.png`). Every one is LIVE-ONLY, so none enters
     either comparison, and `__excluded_count__` is 0 on both sides because all
     of them have a usable identity. It is a hazard for a HOVER probe rather
     than for these two instruments, and this task's report records the probe
     protocol that closes it.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/team-bio.html outside its own <main>: 46 <a>, 12 <button>, 2
     <img>, 60 of this page's 66 box-sweep elements, leaving 6 that belong to
     this page's own content (the back link, the three contact rows, the
     "Support Our Work" call to action and the closing link back to the team
     page; no photographs, because this page has none). A live page that failed
     to load would still share around 57 keys against minBoxes' 37 and the box
     sweep alone could pass green. minShared is the real load-failure gate here
     too: a 404 shares the 6 chrome census elements, and 6 is under the 10 that
     minShared:9 demands, so the suite goes red on the census, not the box
     sweep. */
  {
    name: 'team-bio',
    envVar: 'TEAM_BIO_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/grant-callen/',
    staticFile: 'dist/team-bio.html',
    minShared: 9,
    minBoxes: 37,
  },
  /* safety: Task 17, the eleventh page built class-in-markup from the start,
     and the first of the solution unit (safety, work, education, one shared
     css/solution.css). Its own floors, measured 2026-08-19 against
     dist/safety.html alone (no live side, served locally the same way the
     tests do), not copied from any other entry and NOT to be copied to the two
     fills: `work` carries five work areas where this page carries four and
     `education` alone closes that section with `.sol-grid__closer`, so both
     have a different census count and both must be measured against their own
     static build.

     THIS IS THE LARGEST PAGE IN THE REGISTER BY CENSUS COUNT AFTER THE
     HOMEPAGE. census() finds 51 elements matching h1,h2,h3,h4,h5,p,blockquote
     at both 1440 and 390, of which 6 are the shared header and footer chrome
     and 45 are this page's own. Counted directly from the file: inside <main>
     1 <h1>, 5 <h2>, 4 <h3> and 35 <p>; outside it 2 <h3> and 4 <p>, the same
     six-element chrome every page in this build carries. Seven sections, four
     capped columns and four lit cards are what make the count large; it is the
     page rather than a duplicate.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established after three unrelated edits moved that line in one day) is
     strict, so 26 means at least 27 of 51 must match by text. Six come from the
     chrome, so the floor demands 21 of this page's own 45. Measured against the
     same fraction on the other eleven entries (final 35/57 61%, solutions-b
     9/18 50%, what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%,
     who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15 47%, epic-a 12/25 48%,
     give-c 9/19 47%, team-bio 4/7 57%), 21/45 is 47%, mid-range and level with
     give-c and amb-a.

     ALL 51 ARE ACHIEVABLE, and that is a build decision rather than a given.
     Recipe section 7's coverage cost does not arise on this page at all:
     `.sol-latest__more` is a <p> wrapping a call to action, exactly the shape
     that costs a census key when it is built as a container plus a link(), and
     07-latest.mjs note 4 builds it as one html() widget carrying the real <p>
     instead, so `p|See all public safety research` stays on both sides.
     Measured: shared is 51 of 51 at both widths.

     minBoxes: measured the same way with controlBoxes() against
     dist/safety.html alone, at both 1440 and 390: 70 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. 39 keeps the
     same proportion as the other entries (roughly 56-58%: at least 40 of 70
     must match).

     66 OF THE 70 ARE ACHIEVABLE, and the fourth one lost is this page's own
     doing rather than the shared chrome's, which is the difference from every
     entry above. Three are the chrome keys every converted page loses to the
     Elementor header theme part (`a|Skip to content`, `a|Empower Mississippi home`,
     `img|logo-reversed.png`). The fourth is `a|See all community stories`: 06-stories.mjs
     note 3 builds the community-stories CTA as a link() widget, and
     controlBoxes() skips any anchor inside `.elementor-widget-button` by
     design, so the anchor exists on the static side and not on the live one.
     That module records the choice and what it costs; the box itself is still
     compared through the wrapper, which is what carries `.em-btn`. Measured:
     shared is 66 of 70 at both widths.

     THE LIVE SIDE CARRIES MORE KEYS THAN THE STATIC ONE, the same way give-c's
     and team-bio's entries record: the install runs a Mailchimp popup
     (`#PopupSignupForm_0`) that injects its own markup a few seconds after
     load, so live census counts 53 rather than 51 (`p|` and
     `p|Terms and Conditions`) and live controlBoxes counts 70 rather than 66
     (`a|Terms and Conditions`, `button|Close`, plus the header's own `a|/` and
     the footer logo's resized `img|logo-reversed-300x136.png`). Every one is
     LIVE-ONLY, so none enters either comparison, and `__excluded_count__` is 0
     on both sides because all of them have a usable identity. It is a hazard
     for a HOVER probe rather than for these two instruments, and this task's
     report records the probe protocol that closes it.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/safety.html outside its own <main>: 46 <a>, 12 <button>, 2 <img>,
     60 of this page's 70 box-sweep elements, leaving 10 that belong to this
     page's own content (the stories CTA, the three feed titles, the three stub
     titles, the research CTA and the two photographs). A live page that failed
     to load would still share around 57 keys against minBoxes' 39 and the box
     sweep alone could pass green. minShared is the real load-failure gate here
     too: a 404 shares the 6 chrome census elements, and 6 is under the 27 that
     minShared:26 demands, so the suite goes red on the census, not the box
     sweep. */
  {
    name: 'safety',
    envVar: 'SAFETY_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/public-safety/',
    staticFile: 'dist/safety.html',
    minShared: 26,
    minBoxes: 39,
  },
  /* work: Task 18, the twelfth page built class-in-markup from the start and
     the FIRST FILL of the phase, against the css/solution.css `safety`
     converted one task earlier. Its floors were measured 2026-08-19 against
     dist/work.html ALONE (no live side, served locally the same way the tests
     do) and NOT scaled from safety's entry, because the two pages do not carry
     the same content: this page has five work areas where safety has four, so
     its census count is four elements larger and had to be its own.

     THIS IS NOW THE LARGEST PAGE IN THE REGISTER BY CENSUS COUNT AFTER THE
     HOMEPAGE, taking that place from `safety`. census() finds 55 elements
     matching h1,h2,h3,h4,h5,p,blockquote at both 1440 and 390, of which 6 are
     the shared header and footer chrome and 49 are this page's own. Counted
     directly from the file: inside <main> 1 <h1>, 6 <h2>, 5 <h3> and 37 <p>;
     outside it 2 <h3> and 4 <p>, the same six-element chrome every page in
     this build carries. Seven sections, four capped columns and FIVE lit cards
     are what make the count large; it is the page rather than a duplicate.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established after three unrelated edits moved that line in one day) is
     strict, so 28 means at least 29 of 55 must match by text. Six come from the
     chrome, so the floor demands 23 of this page's own 49. Measured against the
     same fraction on the other twelve entries (final 35/57 61%, solutions-b
     9/18 50%, what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%,
     who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15 47%, epic-a 12/25 48%,
     give-c 9/19 47%, team-bio 4/7 57%, safety 21/45 47%), 23/49 is 47%,
     mid-range and level with safety, give-c and amb-a. The floor is four
     higher than safety's for one reason only: four more of this page's own
     elements exist to be matched.

     ALL 55 ARE ACHIEVABLE, and that is a build decision rather than a given.
     Recipe section 7's coverage cost does not arise on this page at all:
     `.sol-latest__more` is a <p> wrapping a call to action, exactly the shape
     that costs a census key when it is built as a container plus a link(), and
     07-latest.mjs note 4 builds it as one html() widget carrying the real <p>
     instead, so `p|See all workforce research` stays on both sides. Measured
     after deploying: shared is 55 of 55 at both widths.

     minBoxes: measured the same way with controlBoxes() against dist/work.html
     alone, at both 1440 and 390: 70 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. That is the
     same 70 safety measures, by measurement rather than by inheritance: the
     fifth work area adds four paragraphs and no anchor and no image, so it
     moves the census count and not this one. 39 keeps the same proportion as
     the other entries (roughly 56-58%: at least 40 of 70 must match).

     66 OF THE 70 ARE ACHIEVABLE, the same four lost as on safety and for the
     same reasons. Three are the chrome keys every converted page loses to the
     Elementor header theme part (`a|Skip to content`, `a|Empower Mississippi home`,
     `img|logo-reversed.png`). The fourth is `a|See all community stories`:
     06-stories.mjs note 3 builds the community-stories CTA as a link() widget,
     and controlBoxes() skips any anchor inside `.elementor-widget-button` by
     design, so the anchor exists on the static side and not on the live one.
     That module records the choice and what it costs; the box itself is still
     compared through the wrapper, which is what carries `.em-btn`. Measured
     after deploying: shared is 66 of 70 at both widths, and the four
     static-only keys are exactly those four.

     THIS PAGE IS WHY controlBoxes() NOW CUTS ITS IDENTITY AT 40 CHARACTERS
     RATHER THAN 20. The header logo's `aria-label="Empower Mississippi home"`
     and this page's own stub title "Empower Mississippi Releases New Research
     to Help Determine..." share their first twenty characters, so the two
     collapsed onto one key; the live header is a theme part with different
     markup and emits no such element, so the dedupe suffix shifted and the
     comparison paired the static HEADER LOGO against the live STUB TITLE and
     reported a 232x52 against 363x63 difference that does not exist. Both
     elements measure 363x63 on both sides. fidelity-browser.mjs's clean()
     carries the measurement that chose 40 and the reason the `#n` suffix
     cannot fix an identity collision.

     THE LIVE SIDE CARRIES MORE KEYS THAN THE STATIC ONE, the same way give-c's,
     team-bio's and safety's entries record: the install runs a Mailchimp popup
     (`#PopupSignupForm_0`) that injects its own markup a few seconds after
     load, so live census counts more than 55 and live controlBoxes more than
     66. Every one is LIVE-ONLY, so none enters either comparison. It is a
     hazard for a HOVER probe rather than for these two instruments, and the
     task report records the probe protocol that closes it.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/work.html outside its own <main>: 46 <a>, 12 <button>, 2 <img>,
     60 of this page's 70 box-sweep elements, leaving 10 that belong to this
     page's own content (the stories CTA, the three feed titles, the three stub
     titles, the research CTA and the two photographs). A live page that failed
     to load would still share around 57 keys against minBoxes' 39 and the box
     sweep alone could pass green. minShared is the real load-failure gate here
     too: a 404 shares the 6 chrome census elements, and 6 is under the 29 that
     minShared:28 demands, so the suite goes red on the census, not the box
     sweep.

     THE URL IS `/work-2/`, NOT `/work/`, AND THAT IS INSTALL STATE. The slug
     `work` was already held by post 18512, Empower's own live Work page, so
     WordPress assigned this page `work-2`; elementor/pages/work/page.mjs
     records the collision and what was checked before accepting the suffix.
     `name` stays `work` because that is the build's own internal name and what
     dist/work.html is called; only the URL carries the suffix. */
  {
    name: 'work',
    envVar: 'WORK_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/meaningful-work/',
    staticFile: 'dist/work.html',
    minShared: 28,
    minBoxes: 39,
  },
  /* education: Task 19, the thirteenth page built class-in-markup from the
     start, the SECOND FILL of the phase and the LAST page of the conversion
     order. Its floors were measured 2026-08-19 against dist/education.html
     ALONE (no live side, served locally the same way the tests do) and NOT
     scaled from safety's or work's entry, because the three pages do not carry
     the same content: this one has four work areas like safety, but it also
     has a closing block neither sibling has and two paragraphs neither sibling
     has, so its census count is the largest of the three and had to be its own.

     THIS IS NOW THE LARGEST PAGE IN THE REGISTER BY CENSUS COUNT AFTER THE
     HOMEPAGE, taking that place from `work`. census() finds 57 elements
     matching h1,h2,h3,h4,h5,p,blockquote at both 1440 and 390, of which 6 are
     the shared header and footer chrome and 51 are this page's own. Counted
     directly from the file: inside <main> 1 <h1>, 6 <h2>, 5 <h3> and 39 <p>;
     outside it 2 <h3> and 4 <p>, the same six-element chrome every page in this
     build carries. FOUR lit cards, not five, so the count is not large for
     work's reason: it is large because .sol-grid__closer adds an <h3> and three
     <p>, .sol-problem__copy carries four paragraphs where the other two carry
     three, and .sol-grid__intro carries three where they carry two.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established after three unrelated edits moved that line in one day) is
     strict, so 29 means at least 30 of 57 must match by text. Six come from the
     chrome, so the floor demands 24 of this page's own 51. Measured against the
     same fraction on the other thirteen entries (final 35/57 61%, solutions-b
     9/18 50%, what-we-do-a 5/11 45%, team-a 8/19 42%, capitol-a 4/10 40%,
     who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15 47%, epic-a 12/25 48%,
     give-c 9/19 47%, team-bio 4/7 57%, safety 21/45 47%, work 23/49 47%),
     24/51 is 47%, mid-range and level with the whole solution unit. The floor
     is one higher than work's for one reason only: two more of this page's own
     elements exist to be matched.

     ALL 57 ARE ACHIEVABLE, and that is a build decision rather than a given.
     Recipe section 7's coverage cost does not arise on this page at all:
     `.sol-latest__more` is a <p> wrapping a call to action, exactly the shape
     that costs a census key when it is built as a container plus a link(), and
     07-latest.mjs note 4 builds it as one html() widget carrying the real <p>
     instead, so `p|See all education research` stays on both sides. Measured
     after deploying: shared is 57 of 57 at both widths.

     minBoxes: measured the same way with controlBoxes() against
     dist/education.html alone, at both 1440 and 390: 70 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. That is the
     same 70 both siblings measure, by measurement rather than by inheritance:
     the closing block adds four paragraphs and no anchor and no image, so it
     moves the census count and not this one. 39 keeps the same proportion as
     the other entries (roughly 56-58%: at least 40 of 70 must match).

     66 OF THE 70 ARE ACHIEVABLE, the same four lost as on both siblings and for
     the same reasons. Three are the chrome keys every converted page loses to
     the Elementor header theme part (`a|Skip to content`,
     `a|Empower Mississippi home`, `img|logo-reversed.png`). The fourth is
     `a|See all community stories`: 06-stories.mjs note 3 builds the
     community-stories CTA as a link() widget, and controlBoxes() skips any
     anchor inside `.elementor-widget-button` by design, so the anchor exists on
     the static side and not on the live one. That module records the choice and
     what it costs; the box itself is still compared through the wrapper, which
     is what carries `.em-btn`. Measured after deploying: shared is 66 of 70 at
     both widths, and the four static-only keys are exactly those four.

     THE LIVE SIDE CARRIES MORE KEYS THAN THE STATIC ONE, the same way give-c's,
     team-bio's, safety's and work's entries record: the install runs a
     Mailchimp popup (`#PopupSignupForm_0`) that injects its own markup a few
     seconds after load, so live census counts more than 57 and live
     controlBoxes more than 66. Every one is LIVE-ONLY, so none enters either
     comparison. It is a hazard for a HOVER probe rather than for these two
     instruments, and the task report records the probe protocol that closes it.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/education.html outside its own <main>: 46 <a>, 12 <button>, 2
     <img>, 60 of this page's 70 box-sweep elements, leaving 10 that belong to
     this page's own content (the stories CTA, the three feed titles, the three
     stub titles, the research CTA and the two photographs). A live page that
     failed to load would still share around 57 keys against minBoxes' 39 and
     the box sweep alone could pass green. minShared is the real load-failure
     gate here too: a 404 shares the 6 chrome census elements, and 6 is under
     the 30 that minShared:29 demands, so the suite goes red on the census, not
     the box sweep.

     THE URL IS `/education/`, WITH NO SUFFIX, AND THAT WAS READ BACK RATHER
     THAN ASSUMED. `work`'s entry above records the opposite outcome on the same
     command; the slug here was free because Empower's own live Education page
     is post 18537 under `education-3`, with `education-2` and `education-old`
     also taken. elementor/pages/education/page.mjs records the check. */
  {
    name: 'education',
    envVar: 'EDUCATION_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/quality-education/',
    staticFile: 'dist/education.html',
    minShared: 29,
    minBoxes: 39,
  },
  /* landing: Task 20, the sixteenth page and the first that is a TEMPLATE
     rather than a page. Its floors were measured 2026-08-19 against
     dist/landing.html ALONE (no live side, served locally the same way the
     tests do) and NOT scaled from any other entry.

     census() finds 35 elements matching h1,h2,h3,h4,h5,p,blockquote at both
     1440 and 390, of which 6 are the shared header and footer chrome and 29 are
     this page's own. Counted directly from the file: inside <main> 1 <h1>,
     5 <h2>, 6 <h3>, 1 <blockquote> and 16 <p>; outside it 2 <h3> and 4 <p>, the
     same six-element chrome every page in this build carries. One of the five
     <h2> is `.em-visually-hidden` (the voice block's own label, which is what
     that section's aria-labelledby points at) and is compared like any other,
     because census() reads text rather than visibility. It is a small
     page by census count, between capitol-a and epic-a, because five of its six
     blocks are slots rather than essays.

     STATED AS A FRACTION OF THE PAGE'S OWN CONTENT, following the correction
     the Task 9 review made to team-a's entry: a raw percentage of the census
     total is not comparable across pages, because the fixed 6-element chrome
     share is a different fraction of each page's total.

     `assert.ok(shared.length > page.minShared)` in test-elementor.mjs (cited by
     its text rather than by a line number, the convention who-we-are-a's entry
     established) is strict, so 19 means at least 20 of 35 must match by text.
     Six come from the chrome, so the floor demands 14 of this page's own 29.
     Measured against the same fraction on the other fifteen entries (final
     35/57 61%, solutions-b 9/18 50%, what-we-do-a 5/11 45%, team-a 8/19 42%,
     capitol-a 4/10 40%, who-we-are-a 11/24 46%, mail-a 6/13 46%, amb-a 7/15
     47%, epic-a 12/25 48%, give-c 9/19 47%, team-bio 4/7 57%, safety 21/45 47%,
     work 23/49 47%, education 24/51 47%), 14/29 is 48%, mid-range.

     34 OF THE 35 ARE ACHIEVABLE, and the one that is not is recipe section 7's
     coverage cost, paid deliberately. dist/landing.html:194 is
     `<p class="lnd-hero__actions">`, a layout wrapper around two anchors rather
     than prose, and 01-hero.mjs note 4 builds it as a container. It cannot be
     built as a container carrying `html_tag:'p'` even though `p` is in
     Elementor's ALLOWED_HTML_WRAPPER_TAGS: its children are widget <div>s, and
     an HTML parser closes an open <p> at the first block-level start tag, so
     the paragraph would render empty with both actions as its siblings. So
     `p|Contact your legislator Read what the wa` exists on the static side and
     not on the live one. Measured after deploying: shared is 34 of 35 at both
     widths, and that key is the only difference.

     minBoxes: measured the same way with controlBoxes() against
     dist/landing.html alone, at both 1440 and 390: 68 elements
     (a,button,input,select,textarea,img with a usable identity) at both widths,
     __excluded_count__ 0, __unsettled__ "settled" on every run. 38 keeps the
     same proportion as the other entries (roughly 56-58%: at least 39 of 68
     must match).

     64 OF THE 68 ARE ACHIEVABLE. Three are the chrome keys every converted page
     loses to the Elementor header theme part (`a|Skip to content`,
     `a|Empower Mississippi home`, `img|logo-reversed.png`). The fourth is
     `a|Contact your legislator`: 01-hero.mjs note 5 builds the hero CTA as a
     link() widget, and controlBoxes() skips any anchor inside
     `.elementor-widget-button` by design, so the anchor exists on the static
     side and not on the live one. That module records the choice and what it
     costs; the box itself is still compared through the wrapper, which is what
     carries `.em-btn`. Measured after deploying: shared is 64 of 68 at both
     widths, and the four static-only keys are exactly those four.

     THE LIVE SIDE CARRIES MORE KEYS THAN THE STATIC ONE, the same way every
     entry since give-c records: the install runs a Mailchimp popup
     (`#PopupSignupForm_0`) that injects its own markup a few seconds after
     load, so live census counts more than 35 and live controlBoxes more than
     64. Every one is LIVE-ONLY, so none enters either comparison. It is a
     hazard for a HOVER probe rather than for these two instruments, and the
     task report records the probe protocol that closes it.

     WHICH FLOOR ACTUALLY CATCHES A DEAD PAGE, the same asymmetry every other
     entry documents, re-measured for this page: not minBoxes. Counted directly
     from dist/landing.html outside its own <main>: 46 <a>, 12 <button>, 2
     <img>, 60 of this page's 68 box-sweep elements, leaving 8 that belong to
     this page's own content (the two hero anchors, the two photographs, the
     pair link and the three reading titles). A live page that failed to load
     would still share around 57 keys against minBoxes' 38 and the box sweep
     alone could pass green. minShared is the real load-failure gate here too: a
     404 shares the 6 chrome census elements, and 6 is under the 20 that
     minShared:19 demands, so the suite goes red on the census, not the box
     sweep. The asymmetry is wider on this page than on any other in the
     register, because 60 of 68 boxes are chrome.

     THE URL IS `/landing/`, WITH NO SUFFIX, AND THAT WAS READ BACK RATHER THAN
     ASSUMED. `work`'s entry above records the opposite outcome on the same
     command; the slug here was free because no post of any type on this install
     held it. elementor/pages/landing/page.mjs records the check.

     THIS PAGE IS A TEMPLATE, AND THE REGISTER GATES THE ONE INSTANCE OF IT
     THAT EXISTS. A campaign page duplicated from it gets its own slug, its own
     post and no entry here, and nothing in this file should be read as covering
     those. What is gated is that the template itself still matches
     dist/landing.html. */
  {
    name: 'landing',
    envVar: 'LANDING_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/landing/',
    staticFile: 'dist/landing.html',
    minShared: 19,
    minBoxes: 38,
  },
  /* THE TWO LEGAL PAGES, added 2026-09-02. Floors measured the same way every
     other entry's were: census() and controlBoxes() from fidelity-browser.mjs
     run against the static file alone, served locally, with no live side.

     They are small pages and their floors say so. A legal document is a head
     and a column of prose: privacy has 12 block elements in its body, terms 20.
     Copying another page's floors here would either reject an honest conversion
     or, on the box sweep, pass a wrong staticFile — which is the exact defect
     fix round 1 found when a single constant calibrated on the homepage was
     applied to everything. */
  {
    name: 'privacy',
    envVar: 'PRIVACY_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/privacy-policy/',
    staticFile: 'dist/privacy.html',
    minShared: 8,
    minBoxes: 20,
  },
  {
    name: 'terms',
    envVar: 'TERMS_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/terms/',
    staticFile: 'dist/terms.html',
    minShared: 12,
    minBoxes: 20,
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
   as a wrong crop. Gating it by census or boxes would need a key that
   identifies a card slot independently of which episode landed in it,
   which nobody has designed yet.

   GATED BEHAVIOURALLY INSTEAD, 2026-08-20, the same substitute content-a
   has. `the podcast-a guest facets actually filter, and un-filter` in
   test-elementor.mjs drives the real page: it checks a guest box, asserts
   the other two types disappear and the untagged episodes do not, checks a
   second box to prove the combination is OR rather than AND, then clears
   both and asserts the library comes back exactly as it started. That
   covers the two things here that can fail silently, both with precedent:
   inc/loop-attributes.php not stamping data-guest (or stamping one
   episode's value onto every card, which is what happens without
   `_element_cache: 'yes'`), and a facet id drifting away from the literal
   #pa-g-* selectors css/podcast-a.css:248-251 names. Both were injected
   against a copy of the live page and both went red before the test was
   believed.

   content-a: the same mismatch, four times over and larger. Its four bands
   are Loop Grids over Empower News (141 posts today), Community Stories
   (27), a manual selection of four posts standing in for a Research &
   Reports category that does not exist on this install, and Press Releases
   (33), so the live page renders 205 real cards where dist/content-a.html
   carries 23 authored ones. Every card contributes an anchor key
   (a|<post title>) and an image key, and 182 of the 205 name posts the
   static build never chose. DEFERRED_IMAGES cannot be used here either,
   for the same reason it cannot be used on podcast-a: the recipe restricts
   deferral to IMAGE keys precisely so a content mismatch cannot be swept
   under the same mechanism as a wrong crop, and most of these differences
   are anchor keys. Gating it would need the same undesigned key podcast-a's
   entry asks for, and would need it for a card slot whose CONTENTS are the
   point of the page.

   Paolo took the Loop Grid decision on 2026-08-19 knowing that cost. This
   page's subject IS the live archive, so a converted All Content page
   showing 23 frozen cards would be wrong in a way no instrument here would
   report. What stands in for the register is the browser filter test in
   test-elementor.mjs, which checks a radio on the real page and asserts
   which bands and cards go away and that a dead-end pair shows its empty
   state. That is a behavioural gate on the one thing that can silently
   fail, which is what makes this exclusion safe rather than merely
   necessary.
   team-a: the third of the same shape, and the one that was gated until
   2026-08-20. Its staff roster and fellows ledger became Loop Grids over the
   `person` post type on Paolo's decision that the CPT is the roster and the
   static build is not a second opinion about who works at Empower. The two
   sides now hold different people, in both directions: the install publishes
   Katie Elliott, Brett Kittredge and Steven Randle as staff and Donald
   Nielsen and Joe Bishop-Henchman as fellows, none of whom is in
   dist/team-a.html, and the static build lists Rebekah Staples, who has no
   `person` entry at all, and J. Robertson, who is `private` on the install.
   Two more entries (Ashley Green, Dr. Kristin Vance Richards) publish with an
   empty `position_title`, so their cards correctly render no title line where
   the static build has one. Every one of those is an anchor-key difference,
   which is exactly what DEFERRED_IMAGES may not be used for.

   GATED BEHAVIOURALLY INSTEAD by `the team-a roster is driven by the person
   post type` in test-elementor.mjs. What can silently fail here is not the
   copy, which is Empower's to change, but the two derivations this build owns
   and neither of which any static comparison would report: the staff/fellow
   split (wp/empowerms-child/inc/person-loop.php's title test) and the
   surname ordering the page promises out loud in its own `.ta-note`. The test
   drives the live page, reads the rendered names in document order, and
   asserts both against the install's own data rather than against a list
   typed into the test. It also asserts the ledger's hairline lands on the
   last row only, which is the one visible defect the conversion was known in
   advance to cause. */
/* exampleUrl is present on these two as well as on every gated page, and it is
   NOT redundant with the gate they are excluded from. elementor/links.mjs reads
   every converted page's install path out of this one field so that the link
   remap cannot drift from the slug the page actually has; an excluded page is
   still a link DESTINATION (podcast-a is the Podcast menu item, content-a is
   four of them), so leaving it out here would mean writing its path by hand
   somewhere else, which is the failure this field exists to prevent. */
export const EXCLUDED_PAGES = [
  {
    name: 'contact',
    exampleUrl: 'https://empv2.wpenginepowered.com/contact/',
    reason: 'the live page renders Gravity Form 3 — a honeypot field, GF\'s own wrappers, sub-labels '
      + 'and an ajax frame — where dist/contact.html carries a review stand-in that collects nothing. '
      + 'Every control key differs by construction, and deliberately: the stand-in exists so the page '
      + 'can be reviewed, and test.mjs holds it to the live form field for field instead. A content '
      + 'mismatch of the same kind podcast-a and content-a carry, not an image finding',
  },
  {
    name: 'podcast-a',
    exampleUrl: 'https://empv2.wpenginepowered.com/podcast/',
    reason: 'box sweep finds 9 permanent anchor-key differences (66 real episodes vs 9 placeholder '
      + 'cards); a content mismatch, not an image finding, and not fixable by deferring image keys. '
      + 'Gated behind the browser guest-facet test instead, as content-a is behind its filter test',
  },
  {
    name: 'content-a',
    exampleUrl: 'https://empv2.wpenginepowered.com/all-content/',
    reason: 'four Loop Grids render 205 real posts where dist/content-a.html carries 23 authored '
      + 'cards, so census and box keys differ on 182 anchors and their images; a content mismatch, '
      + 'not an image finding, and gated behind the browser filter test instead',
  },
  {
    name: 'team-a',
    exampleUrl: 'https://empv2.wpenginepowered.com/team/',
    reason: 'the staff roster and the fellows ledger are Loop Grids over the `person` post type as '
      + 'of 2026-08-20, so the live page renders 13 staff and 5 fellows where dist/team-a.html '
      + 'carries 10 and 5; four people differ in each direction, which is an anchor-key content '
      + 'mismatch of the same kind podcast-a and content-a carry, not an image finding. Gated '
      + 'behind the browser roster test instead',
  },
];
