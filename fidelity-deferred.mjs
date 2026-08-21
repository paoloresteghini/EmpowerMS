/* The deferred-image list, and the box comparison it sits inside.

   Nothing here launches a browser or fetches anything: compareBoxes() takes
   two plain objects, the same shape controlBoxes() in fidelity-browser.mjs
   returns, so its behaviour is testable in isolation. Extracted out of the
   box-sweep instrument test for exactly that reason, per the task brief:
   the comparison had only ever existed inline inside a Playwright-driven
   test, which meant its five load-bearing behaviours could only be proven
   by running a live page against a static file.

   Per docs/elementor/phase2b/2026-08-17-conversion-recipe.md section 2:
   Paolo's instruction is that the photographs on this build are placeholder
   and will be replaced, so pixel parity on a photograph is not worth
   chasing. But every page's gate is "both instruments pass", and a
   difference nobody intends to fix is a permanent failure, so "defer"
   cannot mean "leave the suite red" without the suite stopping to mean
   anything. DEFERRED_IMAGES is the record of what was chosen not to be
   fixed yet, and compareBoxes() is what keeps that record honest: it
   subtracts a deferred key from the diff, but only for as long as the key
   still actually differs.

   DEFERRED_IMAGES is a hand-written list, and is legitimate for the
   opposite reason PAGE_REGISTER's coverage set is NOT hand-written
   (corrected after fix round 1: this comment used to claim the reverse of
   both halves of that sentence). elementor/pages/register.mjs's actual
   coverage set is convertedPageDirs(), derived from the filesystem;
   PAGE_REGISTER and EXCLUDED_PAGES only carry hand-written METADATA
   attached to members of that derived set, checked against it by a test.
   DEFERRED_IMAGES, by contrast, is hand-written outright, because it names
   an EXEMPTION on a page already in that derived, checked coverage set,
   not a decision about what is measured at all: entries here do not widen
   or narrow which pages are gated, only what a measured difference on an
   already-gated page is allowed to excuse, and only for a difference
   already proven (by validateDeferredEntry, below) to be an image's own
   box and nothing else, on a page validateDeferredEntry also proves is
   actually registered. */

import { PAGE_REGISTER } from './elementor/pages/register.mjs';

/* Decidable from the key alone, per controlBoxes()'s own key cascade in
   fidelity-browser.mjs: an <img> element's key is always `img|<identity>`,
   optionally suffixed `#<n>` for a repeated identity, and no other tag
   produces that prefix. */
export function isImageKey(key) {
  return typeof key === 'string' && key.startsWith('img|');
}

/* controlBoxes() emits two scalar bookkeeping keys alongside the element
   boxes, __excluded_count__ and __unsettled__. Neither names an element, so
   neither is ever a "the photograph is placeholder" finding; both must be
   refused explicitly rather than falling through to isImageKey()'s false,
   so the refusal in validateDeferredEntry() below names the real reason
   instead of the generic "not an image key" message. */
export function isBookkeepingKey(key) {
  return key === '__excluded_count__' || key === '__unsettled__';
}

/* The gate DEFERRED_IMAGES cannot be bypassed by hand-editing: every entry
   is run through this at module load (see the forEach below DEFERRED_IMAGES
   itself), so a deferred control, link or heading fails the moment the file
   is imported, not quietly the first time some other test happens to
   exercise it. Thrown, not asserted: this is a data-integrity check on a
   source file, not a test expectation, and it must stop the whole suite
   from importing rather than fail one test among many.

   Five checks, tightened after fix round 1's Minor findings, in an order
   that gives the most specific message a bad entry can get:
   1. key must be a string at all (M3: a missing or non-string key used to
      throw a raw "Cannot read properties of undefined" from inside
      isBookkeepingKey/isImageKey instead of an informative message).
   2. key must not be a bookkeeping marker.
   3. key must be an image key.
   4. page must name a page PAGE_REGISTER actually gates (M2: a typo'd page
      name used to validate silently and then sit inert forever, never
      subtracted and never reported expired, because compareBoxes() only
      ever matches entries whose `page` equals the page it was called for).
   5. reason and date must both be non-empty strings (M1: the recipe
      requires "a one-line reason and the date it was deferred" on every
      entry; only the key's shape was ever checked before this). */
export function validateDeferredEntry(entry) {
  if (typeof entry.key !== 'string') {
    throw new Error(`DEFERRED_IMAGES: an entry for page "${entry.page}" has a non-string key `
      + `(${JSON.stringify(entry.key)}); every entry needs a real controlBoxes() key.`);
  }
  if (isBookkeepingKey(entry.key)) {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" for page "${entry.page}" is a bookkeeping marker `
      + '(__excluded_count__ / __unsettled__), not an element, and can never be deferred.');
  }
  if (!isImageKey(entry.key)) {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" for page "${entry.page}" is not an image key. `
      + 'Only img|... keys may be deferred (docs/elementor/phase2b/2026-08-17-conversion-recipe.md '
      + 'section 2); a deferred control, link or heading is outside Paolo\'s instruction and needs asking about.');
  }
  if (!PAGE_REGISTER.some((p) => p.name === entry.page)) {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" is deferred for page "${entry.page}", which is not `
      + 'in PAGE_REGISTER (elementor/pages/register.mjs). A deferred entry can only target a page the '
      + 'register actually gates; check for a typo in `page`.');
  }
  if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" for page "${entry.page}" has no reason. The recipe `
      + 'requires a one-line reason on every deferred entry.');
  }
  if (typeof entry.date !== 'string' || entry.date.trim() === '') {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" for page "${entry.page}" has no date. The recipe `
      + 'requires the date every deferred entry was deferred, so a stale one can be spotted by eye too.');
  }
  return entry;
}

/* Task 6b's four entries, the first real ones this list carries. All four
   are what-we-do-a's photographs, all placeholder per Paolo's instruction
   (see this file's header comment), and all triaged the same way: measured
   against the task-6-supplement.md rule before deferring, not deferred on
   the strength of the diff list alone.

   THE MEASUREMENT THAT DECIDED IT. The box sweep only reports the four
   `img|...` keys themselves; it does not measure the box each photograph
   sits inside, so the diff list alone cannot say whether a wrong image size
   is also moving other content. Checked directly (getBoundingClientRect,
   live against dist/what-we-do-a.html served locally, at 1440 and 390) for
   every one of the four: `.da-hero__media` and each `.da-door__media`
   (`.da-hero__media`/`.da-door__media{aspect-ratio:...;overflow:hidden}` in
   css/what-we-do-a.css) is IDENTICAL live and static at both widths in every
   case, because the CONTAINER's own height comes from `aspect-ratio` and
   does not depend on its content. Only the `<img>` element's own box differs
   (the classroom-students hero at 623.53/612.73px live/static at 1440,
   435.02/213.75px at 390; the three door photographs at 315.72/243.78/241.55
   live against a uniform 270.72 static at 1440), and each oversized image is
   clipped by its container's own `overflow:hidden`, invisible to anything
   below or beside it. `.da-door` and `.da-doors` (the whole card and the row
   of three) DO differ by 16px, but that 16px is exactly the census margin
   defect fixed above (three doors × the same paragraph), confirmed by
   re-measuring after that fix landed: with the margin rule in place the
   card and row heights match exactly and only the four image keys remain
   different. So none of the four moves the layout of anything else; every
   one is a DEFER under the recipe's own rule (the only keys that differ are
   the image's own). */
export const DEFERRED_IMAGES = [
  {
    page: 'what-we-do-a',
    key: 'img|classroom-students.jpg',
    reason: 'placeholder photograph (Paolo, will be replaced); hero renders at its own intrinsic ratio '
      + 'inside .da-hero__media (aspect-ratio:4/5, overflow:hidden), which measures identically live and '
      + 'static at 1440 and 390, so only the clipped image itself differs',
    date: '2026-08-18',
  },
  {
    page: 'what-we-do-a',
    key: 'img|child-classroom-tablet.jpg',
    reason: 'placeholder photograph (Paolo, will be replaced); door renders at its own intrinsic ratio '
      + 'inside .da-door__media (aspect-ratio:4/3, overflow:hidden), which measures identically live and '
      + 'static at 1440 and 390, so only the clipped image itself differs',
    date: '2026-08-18',
  },
  {
    page: 'what-we-do-a',
    key: 'img|worker-workshop-bw.jpg',
    reason: 'placeholder photograph (Paolo, will be replaced); door renders at its own intrinsic ratio '
      + 'inside .da-door__media (aspect-ratio:4/3, overflow:hidden), which measures identically live and '
      + 'static at 1440 and 390, so only the clipped image itself differs',
    date: '2026-08-18',
  },
  {
    page: 'what-we-do-a',
    key: 'img|grandparents-grandchild.jpg',
    reason: 'placeholder photograph (Paolo, will be replaced); door renders at its own intrinsic ratio '
      + 'inside .da-door__media (aspect-ratio:4/3, overflow:hidden), which measures identically live and '
      + 'static at 1440 and 390, so only the clipped image itself differs',
    date: '2026-08-18',
  },
];

/* Task 7 (solutions-b) originally added four entries here, one per station
   photograph plus the stories band, triaged as defers by the same
   containing-block measurement the four above used: every containing box
   (`.sb-station__media`, `.sb-stories__band`) measured identically live and
   static at both widths, so only the `<img>` itself differed.

   REMOVED in fix round 1 (M3), on review: the cause was not the photograph.
   `.elementor-widget-image` (Elementor's own wrapper around the image()
   widget) sits between each container and its real `<img>` and does not
   stretch to fill its fixed-height flex parent, so `.sb-station__media
   img{height:100%}` (css/solutions-b.css:129) and `.sb-stories__band
   img{height:100%}` (css/solutions-b.css:160) resolve that percentage
   against the wrapper's own auto height instead of the container's fixed
   one. That is structural: ANY photograph placed the same way would differ
   the same way, so these four entries could never legitimately expire, the
   exact failure mode "an exemption that has expired is a defect in the
   exemption list" warns against, just never triggered because the
   underlying cause never goes away on its own. This project has already
   ruled on this precise defect twice (`.c2-panel__bg img`/`.em-join__wash
   img`, Task 1.5, above in this file), so deferring a third instance of it
   here would have been inconsistent with a decision already taken. Fixed
   instead with a named bridge rule targeting the wrapper
   (`.sb-station__media > .elementor-widget-image{height:100%}` and the
   band's own equivalent, this file, after the `.sb-hero__lede` rule),
   confirmed live: all four images now measure identically to the static
   build (398x318 at 1440 for each of the three stations, 1440.2x374.4 for
   the band at 1440). Kept as a comment rather than deleted
   outright, so the next implementer who hits this shape of defect (an
   image() widget inside a fixed-height container) finds the ruling here
   rather than rediscovering it. */
DEFERRED_IMAGES.forEach(validateDeferredEntry);

/* Pure: two controlBoxes()-shaped objects in (bookkeeping keys already
   stripped by the caller, the same as before this task), out comes the
   shared-key set, the raw (pre-deferral) differences, the differences that
   remain after deferred keys are subtracted, and how many were subtracted.
   Never mutates live or stat.

   Fix round 1 (I3) removed `expired` from this function's return value.
   The box sweep calls this once per viewport width, but a DEFERRED_IMAGES
   entry has no width, so per-call expiry could not be expressed
   correctly: an image differing at 1440 and agreeing at 390 was subtracted
   at one width and reported expired at the other, with no entry shape that
   satisfied both. expiredDeferredEntries(), below, is called once after
   BOTH widths have run, over the union of every width's rawDiffKeys, so an
   entry is only ever reported expired when it is not needed at either
   width.

   deferredList defaults to the validated module list, but a caller may
   pass its own (the unit tests below do, to test page-scoping and
   expiry in isolation). Fix round 1 (M5): whatever list is passed, the
   entries this call actually reads (this page's) are run through
   validateDeferredEntry() before use, so a caller cannot bypass the same
   refusal DEFERRED_IMAGES enforces at module load just by building a list
   by hand and passing it in directly. */
export function compareBoxes(live, stat, pageName, deferredList = DEFERRED_IMAGES) {
  const shared = Object.keys(live).filter((k) => stat[k]);
  const rawDiffKeys = shared.filter((k) => JSON.stringify(live[k]) !== JSON.stringify(stat[k]));
  const entriesForPage = deferredList.filter((d) => d.page === pageName);
  entriesForPage.forEach(validateDeferredEntry);
  const deferredForPage = new Set(entriesForPage.map((d) => d.key));
  const diffKeys = rawDiffKeys.filter((k) => !deferredForPage.has(k));
  const subtracted = rawDiffKeys.length - diffKeys.length;
  return {
    shared, rawDiffKeys, diffKeys, subtracted,
  };
}

/* Call once per page, after every width's compareBoxes() has run, with the
   union of every width's rawDiffKeys (a Set or any iterable of strings).
   Returns the deferred entries for `pageName` that are not in that union,
   i.e. entries that no longer differ at ANY measured width and must be
   deleted from DEFERRED_IMAGES. This is the half the recipe calls the one
   that keeps the list honest: without it, an entry outlives the thing it
   excused and eventually excuses a defect nobody has looked at. */
export function expiredDeferredEntries(unionRawDiffKeys, pageName, deferredList = DEFERRED_IMAGES) {
  const union = unionRawDiffKeys instanceof Set ? unionRawDiffKeys : new Set(unionRawDiffKeys);
  const entriesForPage = deferredList.filter((d) => d.page === pageName);
  entriesForPage.forEach(validateDeferredEntry);
  return entriesForPage.map((d) => d.key).filter((k) => !union.has(k));
}

/* ===========================================================================
   CONTENT_HEIGHT_EXEMPTIONS, and the layout-height explanation that keeps
   them honest. Added 2026-08-18 (Task 11b).

   THE PROBLEM THIS EXISTS FOR, stated before the machinery, because the
   machinery only makes sense against it. layoutInvariants() compares the
   live page's painted boxes and its <main> height against the static
   build's. On `final` at 390 the two `.em-stories__mini` cards are a
   Loop Grid over two REAL posts (elementor/pages/final/04-stories.mjs,
   STORIES_CATEGORY_ID 9) where the static build carries two identical
   placeholder cards, and the real titles wrap to a different number of
   lines: 200.78 and 165.59 live against 221.50 and 221.50 static. That is
   the same kind of difference that keeps podcast-a out of PAGE_REGISTER
   entirely, and it is content, not a defect. It cannot be repaired by CSS
   and it will not go away.

   WHY NOT A TOLERANCE, AND WHY NOT AN EXCLUSION. A tolerance wide enough to
   absorb 76.63px would absorb every defect this project has ever found: the
   largest is 86.39px and the smallest is 3.19px. Dropping the two keys from
   the comparison would hide any future defect on them, and dropping the
   dozen boxes below them, which the same 76.63px shifts, would hide a
   defect on a third of the page. This project has already shipped one test
   that failed green; a gate that stops comparing is the failure mode it is
   most alert to.

   WHAT AN ENTRY ACTUALLY BUYS, and it is deliberately small: it says "this
   ONE element's own HEIGHT is content, not layout". It buys nothing else.
   The element's top, its horizontal position, its axis, its typography and
   its control box are all still compared, by this instrument and by the
   two older ones. And an entry carries NO PIXEL VALUE. The difference is
   measured at run time and then propagated: every box that CONTAINS an
   exempted element has that element's measured difference subtracted from
   its own height difference, every box that begins BELOW one has it
   subtracted from its own top difference, and <main> is compared against
   the static height plus the total. So each of the twelve downstream boxes
   on `final` at 390 is still asserted to have moved by EXACTLY the amount
   the content difference explains and not one pixel more, which is a
   stronger statement than the equality it replaces would make if the two
   cards were repaired.

   THE HALF THAT MAKES IT HONEST, the one DEFERRED_IMAGES already has: an
   entry whose difference has DISAPPEARED fails the test. If the placeholder
   cards are ever replaced with copy that wraps identically, or the Loop
   Grid is pointed somewhere else, the entry stops being needed and the
   suite says so instead of quietly excusing nothing. So does an entry whose
   key is no longer painted or no longer shared: an exemption that has
   stopped naming a real element is not inert, it is a defect in the list.

   AND THE CASE THE ARITHMETIC CANNOT EXPLAIN. Propagation by geometry is
   only valid where an exempted element is wholly inside a box, wholly above
   it, or wholly below it. A box that PARTIALLY overlaps one (which negative
   margins really do produce on this build: solutions-b's .sb-research__panel
   overhangs its own section by 86.39px) has no derivable expected
   difference, so this returns it as `ambiguous` and the test fails rather
   than guessing. Nothing in the current list produces one; the branch
   exists so that a future entry cannot silently get a wrong answer. */

/* The same 0.5px slack the painted and x assertions in test-elementor.mjs
   already use, and for the same reason: it absorbs subpixel layout and
   nothing else. The smallest real finding this phase has produced is
   3.19px. */
const CONTENT_EPS = 0.5;

const r2 = (n) => Math.round(n * 100) / 100;

/* Measured widths, matching the loop in test-elementor.mjs. An entry naming
   any other width could never be applied and would sit inert forever, which
   is the same trap validateDeferredEntry's page check closes. */
export const MEASURED_WIDTHS = [1440, 390];

export function validateContentExemption(entry) {
  if (typeof entry.key !== 'string' || entry.key.trim() === '') {
    throw new Error(`CONTENT_HEIGHT_EXEMPTIONS: an entry for page "${entry.page}" has a non-string key `
      + `(${JSON.stringify(entry.key)}); every entry needs a real layoutInvariants() painted key.`);
  }
  if (isBookkeepingKey(entry.key)) {
    throw new Error(`CONTENT_HEIGHT_EXEMPTIONS: "${entry.key}" for page "${entry.page}" is a bookkeeping marker, `
      + 'not an element, and can never be exempted.');
  }
  if (!PAGE_REGISTER.some((p) => p.name === entry.page)) {
    throw new Error(`CONTENT_HEIGHT_EXEMPTIONS: "${entry.key}" is exempted for page "${entry.page}", which is not `
      + 'in PAGE_REGISTER (elementor/pages/register.mjs); check for a typo in `page`.');
  }
  if (!MEASURED_WIDTHS.includes(entry.width)) {
    throw new Error(`CONTENT_HEIGHT_EXEMPTIONS: "${entry.key}" for page "${entry.page}" names width `
      + `${JSON.stringify(entry.width)}, which is not one of the measured widths `
      + `(${MEASURED_WIDTHS.join(', ')}); it could never be applied.`);
  }
  if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
    throw new Error(`CONTENT_HEIGHT_EXEMPTIONS: "${entry.key}" for page "${entry.page}" has no reason. An exemption `
      + 'without one is indistinguishable from a defect nobody looked at.');
  }
  if (typeof entry.date !== 'string' || entry.date.trim() === '') {
    throw new Error(`CONTENT_HEIGHT_EXEMPTIONS: "${entry.key}" for page "${entry.page}" has no date, so a stale one `
      + 'cannot be spotted by eye.');
  }
  return entry;
}

/* Task 11b's two entries, the first this list carries. Both are the same
   element repeated, both on `final` at 390 only: at 1440 the two real
   titles and the two placeholder titles all occupy one line, the cards
   measure 174.77 on both sides, and `final`'s <main> is exactly equal, so
   there is nothing to exempt at that width and nothing is exempted.

   Measured before writing them, with the four Task 11b bridge rules in
   place: `final` @1440 main 5495.22 live against 5495.22 static, zero
   painted differences; @390 main 8213.72 against 8290.34, and the whole
   -76.62 decomposes into these two cards' own heights (-20.72 and -55.91,
   summing to -76.63) with every other painted box showing dH 0. */
export const CONTENT_HEIGHT_EXEMPTIONS = [
  {
    page: 'final',
    width: 390,
    key: 'em-stories__mini',
    reason: 'Loop Grid over real Community Stories posts against two identical placeholder cards in the '
      + 'static build; the real title ("Amanda Delverdank is building something special in the Mississippi '
      + 'Delta") wraps to a different number of lines than the placeholder pull-quote at 390px. Content by '
      + 'design, the same difference that keeps podcast-a out of PAGE_REGISTER, and not repairable in CSS.',
    date: '2026-08-18',
  },
  {
    page: 'final',
    width: 390,
    key: 'em-stories__mini#2',
    reason: 'the second card of the same Loop Grid; real title "Kyle Jackson: A Father’s Footsteps" '
      + 'against the same placeholder pull-quote. Content by design, not repairable in CSS.',
    date: '2026-08-18',
  },
];

CONTENT_HEIGHT_EXEMPTIONS.forEach(validateContentExemption);

/* Pure: two layoutInvariants()-shaped `painted` maps in, plus the static
   <main> height, out comes everything the assertion needs. Never mutates
   either input, and reads no pixel value from the exemption list: every
   number below is measured from the two maps it was handed.

   Returns:
     roots        the exempted keys that ARE differing, with the difference
                  measured for each, in the order they appear on the page
     expired      exempted keys whose height no longer differs at all
     unmeasured   exempted keys not present-and-painted on both sides
     ambiguous    boxes that partially overlap an exempted key, so no
                  expected difference is derivable
     diffs        the painted differences that remain unexplained, formatted
     exemptedTotal / mainExpected   the propagated <main> height

   `expired`, `unmeasured` and `ambiguous` are all FAILURES at the call
   site, not information. */
export function explainLayoutHeights(livePainted, statPainted, statMainHeight, pageName, width,
  list = CONTENT_HEIGHT_EXEMPTIONS) {
  /* The WHOLE list is validated, not just the entries this call will use,
     which is one step stronger than compareBoxes()'s own equivalent and is
     the difference between closing the typo'd-page trap and only appearing
     to. An entry whose `page` is misspelled never matches any call, so
     validating after the filter can never see it: it would validate
     silently, sit inert forever, and never be reported expired either,
     because nothing ever looks at it. Validating first means a typo fails
     the first time any page is measured. */
  list.forEach(validateContentExemption);
  const entries = list.filter((e) => e.page === pageName && e.width === width);

  const roots = [];
  const expired = [];
  const unmeasured = [];
  for (const e of entries) {
    const l = livePainted[e.key];
    const s = statPainted[e.key];
    if (!l || !s) { unmeasured.push(e.key); continue; }
    const dH = r2(l.h - s.h);
    if (Math.abs(dH) <= CONTENT_EPS) { expired.push(e.key); continue; }
    roots.push({ key: e.key, dH, top: s.top, bottom: r2(s.top + s.h) });
  }
  roots.sort((a, b) => a.top - b.top);

  const ambiguous = [];
  const diffs = [];
  const shared = Object.keys(livePainted).filter((k) => statPainted[k]);
  for (const k of shared) {
    const l = livePainted[k];
    const s = statPainted[k];
    const sBottom = r2(s.top + s.h);
    let offset = 0;
    let inner = 0;
    for (const root of roots) {
      if (root.bottom <= s.top + CONTENT_EPS) offset = r2(offset + root.dH);
      else if (root.top >= s.top - CONTENT_EPS && root.bottom <= sBottom + CONTENT_EPS) inner = r2(inner + root.dH);
      else if (root.top >= sBottom - CONTENT_EPS) { /* wholly below this box: it explains nothing here */ }
      else {
        ambiguous.push(`${k} (static top ${s.top} h ${s.h}) partially overlaps the exempted `
          + `${root.key} (static top ${root.top} h ${r2(root.bottom - root.top)}), so no expected difference is derivable`);
      }
    }
    const dTop = r2(l.top - s.top - offset);
    const dH = r2(l.h - s.h - inner);
    if (Math.abs(dTop) > CONTENT_EPS || Math.abs(dH) > CONTENT_EPS) {
      diffs.push(`${k}: live top ${l.top} h ${l.h} / static top ${s.top} h ${s.h}`
        + (offset || inner ? ` [after the content exemption explains dTop ${offset} dH ${inner}, `
          + `residual dTop ${dTop} dH ${dH}]` : ''));
    }
  }

  const exemptedTotal = r2(roots.reduce((sum, root) => sum + root.dH, 0));
  return {
    roots, expired, unmeasured, ambiguous, diffs, exemptedTotal,
    mainExpected: r2(statMainHeight + exemptedTotal),
  };
}
