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

   Four checks, tightened after fix round 1's Minor findings, in an order
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

/* Starts empty. Nothing is deferred yet: Task 6b produces the first real
   entries once what-we-do-a is measured and triaged. Each entry: the page
   name (matching a name in PAGE_REGISTER), the sweep's own element key, a
   one-line reason, and the date it was deferred. */
export const DEFERRED_IMAGES = [
];
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
