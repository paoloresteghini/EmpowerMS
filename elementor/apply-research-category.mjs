/* Creates the `Research & Reports` category and puts Empower's reports in it.
 *
 * WHY THIS EXISTS. Three places in this build show "the latest research" and
 * none of them queried anything: they each held a hand-written list, and the
 * lists disagreed.
 *
 *   - the homepage insights band, card 2, which shipped reading "Research
 *     title, auto-populated from EPIC" as literal placeholder copy;
 *   - content-a's Research & Reports band, a Loop Grid whose query is four
 *     post ids typed into 02-browse.mjs:293;
 *   - epic-a's three "Most recent report" slots, typed title/href/date triples
 *     in 04-research.mjs, each carrying a data-cms note claiming the title and
 *     date "come from a query". They did not.
 *
 * Empower's WordPress had no category to query. content-a's own source comment
 * says so: "their WordPress has no Research & Reports category yet, so the
 * report posts were gathered by hand". This script is the fix, and once it has
 * run all three can become real queries.
 *
 * THE LIST IS KIENNA HORN'S, not ours, sent by email 2026-09-09 after she went
 * through the site herself. Her covering note said the Impact Reports do not
 * count as research and should stay under general content, and she confirmed
 * separately that the 2025 Impact Report appearing in her own list was a
 * mistake. It is not in SLUGS below. Do not add reports to this list from this
 * side: the whole point of the exercise was to stop the build deciding what
 * counts as research.
 *
 * SHE ALSO AGREED TO MAINTAIN IT. From now on Empower tick the category when
 * they publish a report, the same way they tick Community Stories, and none of
 * the three places above needs touching again.
 *
 * IDEMPOTENT, and safe to re-run. The term is created only if absent, and
 * `wp post term add` is additive: a post that already carries the category is
 * unaffected. It writes NOTHING else. No post's other categories are touched,
 * because the issue areas (Education, Work, Justice) are what epic-a's per-area
 * query will read and they are Empower's to set.
 *
 * RUN IT AGAIN ON PRODUCTION AT CUTOVER. That is not optional and it is why
 * this is a script rather than a handful of typed commands. See
 * docs/staging-to-prod-database.md: a category is database state, its term id
 * differs per install, and empv2's clone predates 2026-08-13 so production
 * holds reports this install has never seen. Running this against prod resolves
 * the same slugs to prod's own ids and mints prod's own term.
 *
 *   node elementor/apply-research-category.mjs           # explain, change nothing
 *   node elementor/apply-research-category.mjs --apply   # create and assign
 */
import { pathToFileURL } from 'node:url';
import { wpe } from '../wpe.mjs';

export const TERM_NAME = 'Research & Reports';
export const TERM_SLUG = 'research-reports';
const TERM_DESCRIPTION =
  'Empower Mississippi research, reports and data. Tick this when publishing a '
  + 'report so it appears automatically on the homepage, the EPIC page and All Content.';

/* Kienna Horn's list, 2026-09-09. Slugs rather than ids on purpose: ids are
   per-install and this script has to run against production too. */
export const SLUGS = [
  'how-bad-is-crime-in-mississippi',
  'empower-mississippi-releases-report-on-how-occupational-regulations-limit-job-opportunities-in-mississippi',
  'empower-mississippi-releases-new-research-to-help-determine-why-more-mississippians-arent-in-the-workforce',
  'new-empower-mississippi-report-highlights-growth-in-labor-force-participation-rate-outlines-recommendations-for-continued-improvement',
  'new-empower-mississippi-report-finds-mississippians-want-to-work-but-many-remain-disconnected-from-opportunity',
  'how-much-does-private-school-really-cost-in-mississippi',
];

/* Same shape import-photography.mjs uses, and for the same reason: the term
   name contains an ampersand, and a remote shell will happily do something
   else with it unquoted. */
const shellSingle = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export async function findTerm(run = wpe) {
  const out = (await run(
    `wp term list category --slug=${shellSingle(TERM_SLUG)} --field=term_id --format=csv`
  )).trim();
  const id = out.split('\n').map(l => l.trim()).find(l => /^\d+$/.test(l));
  return id ? Number(id) : null;
}

export async function ensureTerm(run = wpe) {
  const existing = await findTerm(run);
  if (existing) return { id: existing, created: false };
  const out = (await run(
    `wp term create category ${shellSingle(TERM_NAME)} --slug=${shellSingle(TERM_SLUG)}`
    + ` --description=${shellSingle(TERM_DESCRIPTION)} --porcelain`
  )).trim();
  const id = Number(out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l)).pop());
  if (!Number.isInteger(id)) throw new Error(`term create: no id in ${JSON.stringify(out)}`);
  return { id, created: true };
}

/* One query for every slug rather than one per slug. The install takes tens of
   seconds on a trivial wp-cli call and has hung for 45 minutes on a bad day;
   elementor/deploy-round1.mjs's header records what that costs when ignored. */
export async function resolve(slugs = SLUGS, run = wpe) {
  const list = slugs.map(s => `'${s}'`).join(',');
  const sql = `SELECT post_name, ID, post_status FROM wp_posts WHERE post_type='post' AND post_name IN (${list})`;
  const out = await run(`wp db query "${sql}" --skip-column-names`);
  const found = new Map();
  for (const line of out.trim().split('\n').filter(Boolean)) {
    const [name, id, status] = line.split('\t');
    found.set(name, { id: Number(id), status });
  }
  return slugs.map(slug => ({ slug, ...(found.get(slug) || { id: null, status: null }) }));
}

export async function main(argv = process.argv.slice(2), run = wpe) {
  const rows = await resolve(SLUGS, run);
  const present = rows.filter(r => r.id);
  const missing = rows.filter(r => !r.id);

  for (const r of missing) {
    console.log(`NOT ON THIS INSTALL: ${r.slug}`);
  }
  if (missing.length) {
    /* Not a failure. empv2's clone predates 2026-08-13 and production has
       published since, so a slug on Kienna's list can be real and absent here.
       Named rather than skipped silently, because the same run against prod
       should find it and a silent skip would hide that it never did. */
    console.log(`  ^ ${missing.length} of ${SLUGS.length} absent. Expected on empv2, NOT expected on production.\n`);
  }

  if (!argv.includes('--apply')) {
    console.log(`Would ensure the "${TERM_NAME}" category (slug ${TERM_SLUG}) exists,`);
    console.log(`then add it to ${present.length} posts:`);
    for (const r of present) console.log(`  ${r.id}  ${r.status}  ${r.slug.slice(0, 64)}`);
    console.log('\nNothing is written without --apply.');
    return;
  }

  const term = await ensureTerm(run);
  console.log(`${term.created ? 'Created' : 'Found'} category ${term.id} (${TERM_SLUG}).`);
  for (const r of present) {
    await run(`wp post term add ${r.id} category ${shellSingle(TERM_SLUG)}`);
    console.log(`  tagged ${r.id}  ${r.slug.slice(0, 56)}`);
  }
  console.log(`\n${present.length} posts in ${TERM_NAME}. Term id on THIS install: ${term.id}.`);
  console.log('That id is per-install. Anything querying it must not hard-code it.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
