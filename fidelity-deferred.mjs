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

   DEFERRED_IMAGES is a hand-written list too, same as PAGE_REGISTER in
   elementor/pages/register.mjs, but for the opposite reason. That file's
   list is legitimate because it names COVERAGE: everything converted and
   measured belongs in it, and leaving a page out is a decision to make in
   the open, in a comment. This file's list is legitimate because it names
   an EXEMPTION on a page already covered: entries here do not decide what
   is measured, only what a measured difference is allowed to excuse, and
   only for a difference already proven (by validateDeferredEntry, below) to
   be an image's own box and nothing else. */

/* Decidable from the key alone, per controlBoxes()'s own key cascade in
   fidelity-browser.mjs: an <img> element's key is always `img|<identity>`,
   optionally suffixed `#<n>` for a repeated identity, and no other tag
   produces that prefix. */
export function isImageKey(key) {
  return key.startsWith('img|');
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
   from importing rather than fail one test among many. */
export function validateDeferredEntry(entry) {
  if (isBookkeepingKey(entry.key)) {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" for page "${entry.page}" is a bookkeeping marker `
      + '(__excluded_count__ / __unsettled__), not an element, and can never be deferred.');
  }
  if (!isImageKey(entry.key)) {
    throw new Error(`DEFERRED_IMAGES: "${entry.key}" for page "${entry.page}" is not an image key. `
      + 'Only img|... keys may be deferred (docs/elementor/phase2b/2026-08-17-conversion-recipe.md '
      + 'section 2); a deferred control, link or heading is outside Paolo\'s instruction and needs asking about.');
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
   stripped by the caller, the same as before this task), a difference list
   and a subtraction count out. Never mutates live or stat.

   diffKeys: the shared keys whose values differ, after subtracting whatever
   is deferred for `pageName`. This is what the instrument test asserts is
   empty.
   subtracted: how many of the raw differences were removed by a deferred
   entry. Reported by the caller on every run, green or red, per the recipe:
   "A silent subtraction is how a gate stops being a gate."
   expired: deferred entries for `pageName` whose key is NOT among the raw
   differences, meaning the thing they excused is no longer happening. The
   caller fails the test on a non-empty list here, naming the entries, so
   the list cannot silently outlive what it excuses. */
export function compareBoxes(live, stat, pageName, deferredList = DEFERRED_IMAGES) {
  const shared = Object.keys(live).filter((k) => stat[k]);
  const rawDiffKeys = shared.filter((k) => JSON.stringify(live[k]) !== JSON.stringify(stat[k]));
  const deferredForPage = new Set(
    deferredList.filter((d) => d.page === pageName).map((d) => d.key),
  );
  const diffKeys = rawDiffKeys.filter((k) => !deferredForPage.has(k));
  const subtracted = rawDiffKeys.length - diffKeys.length;
  const expired = [...deferredForPage].filter((k) => !rawDiffKeys.includes(k));
  return { diffKeys, subtracted, expired };
}
