/* Elementor Loop Item template post ids, by name, for the install being
 * deployed to.
 *
 * Same problem and same shape as terms.mjs, one layer up. A Loop Grid names its
 * template by POST ID, and an elementor_library post id belongs to one install.
 * docs/staging-to-prod-database.md lists these as the third coupling: a wrong
 * template id does not error, it renders the wrong card, or none, and every
 * structural test still passes because a loop grid pointing at a real post is a
 * valid loop grid.
 *
 * Worse than a wrong term id, in fact. final/page.mjs already pairs each tree
 * with its own template id specifically so a deploy loop cannot write the lead
 * card into the mini's template, and its comment records that the failure
 * "would not error and would not fail a structural test".
 *
 * The defaults are empv2's. `resolveTemplates()` reads them off the install by
 * TITLE, and `ensureTemplates()` creates any that are missing, which is what
 * makes this runnable against production at cutover.
 *
 *   node elementor/loop-templates.mjs            # report what exists
 *   node elementor/loop-templates.mjs --ensure   # create anything missing
 */
import { pathToFileURL } from 'node:url';
import { wpe } from '../wpe.mjs';

/* key -> the elementor_library post title. Titles rather than ids because a
   title survives a migration and an id does not. */
export const TEMPLATE_TITLES = {
  /* READ OFF THE INSTALL, not invented. The mini card's title is "Homepage
     Community Story mini" and a guess of "Homepage story mini card" resolved to
     nothing, which under ensureTemplates() would have CREATED A SECOND template
     and left the page pointing at the old one. Titles are the migration key
     here, so a wrong one is not a cosmetic error.
     The colon style matches the six templates already on the install
     ("Content A card: article", "Team A card: staff"). */
  storiesMini: 'Homepage Community Story mini',
  storiesLead: 'Homepage story lead card',
  insightsArticle: 'Homepage insights row: article',
  insightsResearch: 'Homepage insights row: research',
  insightsStory: 'Homepage insights row: community story',
};

/* empv2's ids. The two homepage story templates were created 2026-09-04 and
   2026-09-07; the three insights rows by this file. Defaults only: a deploy
   overwrites them from the install it is writing to. */
export const TEMPLATE_IDS = {
  storiesMini: 20589,
  storiesLead: 20704,
  insightsArticle: 20710,
  insightsResearch: 20711,
  insightsStory: 20712,
};

let resolvedFrom = null;
export const resolvedAgainst = () => resolvedFrom;

const shellSingle = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/* Reads every elementor_library post once and matches on exact title. One call,
   because the install charges tens of seconds for a trivial wp-cli command. */
async function libraryIndex(run) {
  const out = await run(
    'wp post list --post_type=elementor_library --post_status=publish --fields=ID,post_title --format=csv'
  );
  const byTitle = new Map();
  for (const line of out.trim().split('\n').slice(1)) {
    /* Titles can contain commas, so split on the FIRST comma only and strip the
       quoting wp-cli adds when it needs to. */
    const comma = line.indexOf(',');
    if (comma < 0) continue;
    const id = line.slice(0, comma).trim();
    let title = line.slice(comma + 1).trim();
    if (title.startsWith('"') && title.endsWith('"')) title = title.slice(1, -1).replace(/""/g, '"');
    if (/^\d+$/.test(id)) byTitle.set(title, Number(id));
  }
  return byTitle;
}

export async function resolveTemplates({ run = wpe, host = 'the install' } = {}) {
  const index = await libraryIndex(run);
  const missing = [];
  const changed = [];
  for (const [key, title] of Object.entries(TEMPLATE_TITLES)) {
    const id = index.get(title);
    if (!id) { missing.push(title); continue; }
    if (TEMPLATE_IDS[key] !== id) changed.push(`${key} ${TEMPLATE_IDS[key]} -> ${id}`);
    TEMPLATE_IDS[key] = id;
  }
  resolvedFrom = host;
  return { changed, missing, count: Object.keys(TEMPLATE_TITLES).length - missing.length };
}

/* Creates a template and tags it loop-item. The id is read back on the NODE
   side rather than captured into a remote shell variable: wpe.mjs's header
   records that a --porcelain value captured remotely arrives with a PHP
   deprecation notice glued to it, and the next command then fails with the post
   already created. */
export async function ensureTemplates({ run = wpe } = {}) {
  const index = await libraryIndex(run);
  const created = [];
  for (const [key, title] of Object.entries(TEMPLATE_TITLES)) {
    if (index.has(title)) { TEMPLATE_IDS[key] = index.get(title); continue; }
    await run(`wp post create --post_type=elementor_library --post_status=publish --post_title=${shellSingle(title)}`);
    const after = await libraryIndex(run);
    const id = after.get(title);
    if (!id) throw new Error(`created "${title}" but could not read its id back`);
    await run(`wp post term set ${id} elementor_library_type loop-item`);
    TEMPLATE_IDS[key] = id;
    created.push(`${key} = ${id}  (${title})`);
  }
  return created;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--ensure')) {
    const created = await ensureTemplates();
    console.log(created.length ? `Created ${created.length}:` : 'Nothing to create.');
    for (const c of created) console.log(`  ${c}`);
  } else {
    const r = await resolveTemplates({ host: 'empv2' });
    if (r.missing.length) console.log(`MISSING (run --ensure): ${r.missing.join(', ')}`);
  }
  for (const [key, title] of Object.entries(TEMPLATE_TITLES)) {
    console.log(`  ${String(TEMPLATE_IDS[key] ?? 'absent').padStart(6)}  ${key.padEnd(18)} ${title}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
