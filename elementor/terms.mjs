/* Category term ids, by slug, for the install a deploy is pointed at.
 *
 * WHY THIS EXISTS. Elementor's Loop Grid query names categories by NUMERIC
 * TERM ID (`post_query_include_term_ids: ['22']`), and a term id belongs to one
 * install. Every id typed into a page module is therefore a bet that production
 * numbers its taxonomy the same way empv2 does, and it does not:
 * docs/staging-to-prod-database.md lists this as one of the three couplings
 * that make "redeploy the repo against prod" unsafe. A wrong term id does not
 * error. It renders an empty band, or the wrong content type, and every
 * structural test still passes because a query with a valid-looking id is a
 * valid query.
 *
 * HOW IT WORKS. Page modules read `TERMS.<slug>` instead of typing a number.
 * The defaults below are empv2's ids, so the static build, the tests and a
 * dry run all work with no install in reach. Every deploy entry point calls
 * `resolveTerms()` first, which reads the ids off the install being deployed to
 * and overwrites them. On empv2 that changes nothing, which is the point: the
 * change is provably a no-op here and correct on production.
 *
 * WHY MUTATION RATHER THAN AN ARGUMENT. `sections()` is synchronous and takes
 * nothing, on every page module in this build. Threading a resolved map through
 * every signature would touch far more than the taxonomy work; a module the
 * page reads keeps the change to the four lines that used to hold numbers.
 * The cost is that a deploy which forgets to resolve silently uses empv2's ids,
 * so `resolvedAgainst()` records what happened and a test asserts every entry
 * point resolves, the same shape as the flush test in test-elementor.mjs.
 *
 * PRESS RELEASES IS SLUG `news`, NOT `press-releases`. Read off the install,
 * not guessed. Empower's own taxonomy disagrees with its own display names in
 * that one place, and a resolver keyed on the wrong slug would return null and
 * take the band down.
 */
import { wpe } from '../wpe.mjs';

/* empv2's ids, read with `wp term list category` on 2026-09-09. Defaults only:
   a deploy overwrites them from the install it is actually writing to. */
export const TERMS = {
  education: 7,
  work: 28,
  justice: 29,
  news: 22,               // "Press Releases"
  empower: 48,            // "Empower News", parent of bill-summaries
  'bill-summaries': 124,
  podcast: 133,
  'capitol-chat': 135,
  'community-stories': 9,
  'research-reports': 156, // created 2026-09-09, elementor/apply-research-category.mjs
};

let resolvedFrom = null;

/* Null until a deploy resolves, then the host it resolved against. Read it
   rather than trusting that resolution happened. */
export const resolvedAgainst = () => resolvedFrom;

/* One query for every slug. The install charges tens of seconds for a trivial
   wp-cli call, so this must not become one round trip per category. */
export async function resolveTerms({ run = wpe, host = 'the install' } = {}) {
  const slugs = Object.keys(TERMS);
  const list = slugs.map(s => `'${s}'`).join(',');
  const sql = `SELECT t.slug, t.term_id FROM wp_terms t `
    + `JOIN wp_term_taxonomy tt ON tt.term_id = t.term_id AND tt.taxonomy = 'category' `
    + `WHERE t.slug IN (${list})`;
  const out = await run(`wp db query "${sql}" --skip-column-names`);

  const found = new Map();
  for (const line of out.trim().split('\n').filter(Boolean)) {
    const [slug, id] = line.split('\t');
    if (/^\d+$/.test(id)) found.set(slug, Number(id));
  }

  const missing = slugs.filter(s => !found.has(s));
  if (missing.length) {
    /* Loud, because the failure this prevents is silent. A band whose category
       is absent renders nothing and reports nothing. */
    throw new Error(
      `resolveTerms: ${missing.length} category slug(s) absent from ${host}: ${missing.join(', ')}. `
      + `Every band querying one of these would deploy empty. `
      + `If research-reports is the missing one, run elementor/apply-research-category.mjs --apply first.`
    );
  }

  const changed = [];
  for (const [slug, id] of found) {
    if (TERMS[slug] !== id) changed.push(`${slug} ${TERMS[slug]} -> ${id}`);
    TERMS[slug] = id;
  }
  resolvedFrom = host;
  return { changed, count: found.size };
}
