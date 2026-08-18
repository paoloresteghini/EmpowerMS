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
    exampleUrl: 'https://empv2.wpenginepowered.com/capitol-a/',
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
     demands, so the suite goes red on the census, not the box sweep. */
  {
    name: 'team-a',
    envVar: 'TEAM_A_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/team-a/',
    staticFile: 'dist/team-a.html',
    minShared: 13,
    minBoxes: 35,
  },
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
    exampleUrl: 'https://empv2.wpenginepowered.com/who-we-are-a/',
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
    exampleUrl: 'https://empv2.wpenginepowered.com/mail-a/',
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
    exampleUrl: 'https://empv2.wpenginepowered.com/amb-a/',
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
     `a|Empower Mississippi `, `img|logo-reversed.png`); they are not this
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
    exampleUrl: 'https://empv2.wpenginepowered.com/epic-a/',
    staticFile: 'dist/epic-a.html',
    minShared: 17,
    minBoxes: 42,
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
