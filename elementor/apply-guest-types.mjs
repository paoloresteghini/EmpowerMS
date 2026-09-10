/* Gives Empower's podcast episodes a guest type, so the library filter works.
 *
 * WHY THE FILTER LOOKED BROKEN. Kienna Horn reported the podcast filter as "a
 * bit buggy". It is not: `guest_type` exists with three terms and, of 66
 * published episodes, NINE were tagged. Ticking any box took the list from 66
 * cards to 3, which reads as broken and is an empty taxonomy.
 *
 * THIS IS A MACHINE-MADE FIRST PASS, NOT EDITORIAL TRUTH, and every part of it
 * is built so Empower can correct it rather than trust it:
 *
 *   - the assignments live in elementor/guest-types.json, one line per episode,
 *     each carrying the BASIS in its own title ("Sen.", "Dr., author of Get
 *     Married"). Anything that needed knowledge the title does not carry is in
 *     `_unsure` and is deliberately left UNTAGGED.
 *   - it runs on STAGING. Paolo's call, and the reason it is defensible: the
 *     cost of a wrong tick here is a card under the wrong heading on a review
 *     site, and the alternative is Kienna tagging 57 episodes from nothing.
 *   - `--remove` undoes exactly what `--apply` did and nothing else.
 *
 * THE RULE, CALIBRATED AGAINST HER OWN NINE rather than invented. She filed Lt.
 * Governor Delbert Hosemann under Lawmaker, so that term is not only
 * legislators: it is elected and statewide office. Researchers, authors,
 * academics, lawyers and party officials are Policy expert. Founders,
 * practitioners and local advocates are Community leader.
 *
 * ITS OWN SKEW IS WORTH READING BEFORE THE RESULT IS TRUSTED. This pass lands
 * 24 Lawmaker, 24 Policy expert and 4 Community leader, where Kienna's nine
 * split 3/3/3. A title announces an office or a doctorate and rarely announces
 * that somebody runs a neighbourhood programme, so Community leader is the term
 * this method under-finds. If any group needs her eye, it is that one.
 *
 * IT NEVER OVERWRITES A HUMAN. An episode that already carries a guest type is
 * skipped and reported, so Kienna's nine and anything she tags later survive a
 * re-run. Terms resolve by SLUG, so nothing here is coupled to term ids.
 *
 *   node elementor/apply-guest-types.mjs            # explain, change nothing
 *   node elementor/apply-guest-types.mjs --apply    # tag the untagged
 *   node elementor/apply-guest-types.mjs --remove   # undo this script's work
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { wpe } from '../wpe.mjs';

export const PLAN = JSON.parse(readFileSync('elementor/guest-types.json', 'utf8'));
export const TERM_SLUGS = ['lawmaker', 'expert', 'leader'];

/* One query for all of it: which podcast episodes exist, and which already
   carry a guest type. The install charges tens of seconds for a trivial call,
   so this must not become one round trip per episode. */
export async function readEpisodes(run = wpe) {
  const sql = "SELECT p.ID, g.slug FROM wp_posts p "
    + "JOIN wp_term_relationships tr ON tr.object_id = p.ID "
    + "JOIN wp_term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id AND tt.taxonomy = 'category' "
    + "JOIN wp_terms t ON t.term_id = tt.term_id AND t.slug = 'podcast' "
    + "LEFT JOIN wp_term_relationships tr2 ON tr2.object_id = p.ID "
    + "LEFT JOIN wp_term_taxonomy tt2 ON tt2.term_taxonomy_id = tr2.term_taxonomy_id AND tt2.taxonomy = 'guest_type' "
    + "LEFT JOIN wp_terms g ON g.term_id = tt2.term_id "
    + "WHERE p.post_type = 'post' AND p.post_status = 'publish'";
  const out = await run(`wp db query "${sql}" --skip-column-names`);
  /* The LEFT JOIN on term_relationships matches EVERY term a post carries, not
     only its guest_type, so a post in three categories comes back three times
     with a null slug. Folded here rather than fought in SQL. */
  const byId = new Map();
  for (const line of out.trim().split('\n').filter(Boolean)) {
    const [id, slug] = line.split('\t');
    const key = String(id).trim();
    const existing = byId.get(key) ?? null;
    const clean = (slug ?? '').trim();
    byId.set(key, existing || (TERM_SLUGS.includes(clean) ? clean : null));
  }
  return byId;
}

export function plan(episodes, assign = PLAN.assign) {
  const steps = [];
  for (const [id, [slug, basis]] of Object.entries(assign)) {
    if (!episodes.has(id)) { steps.push({ id, kind: 'absent', slug, basis }); continue; }
    const current = episodes.get(id);
    if (current === slug) { steps.push({ id, kind: 'already', slug, basis }); continue; }
    if (current) { steps.push({ id, kind: 'human', slug, current, basis }); continue; }
    steps.push({ id, kind: 'tag', slug, basis });
  }
  return steps;
}

export async function main(argv = process.argv.slice(2), run = wpe) {
  const episodes = await readEpisodes(run);
  const steps = plan(episodes);
  const tagged = [...episodes.values()].filter(Boolean).length;
  console.log(`${episodes.size} published episodes, ${tagged} already carry a guest type.`);

  const counts = steps.reduce((a, s) => ({ ...a, [s.kind]: (a[s.kind] ?? 0) + 1 }), {});
  for (const [kind, n] of Object.entries(counts)) console.log(`  ${kind.padEnd(8)} ${n}`);
  for (const s of steps.filter(s => s.kind === 'human')) {
    console.log(`  LEFT ALONE ${s.id}: already "${s.current}", this pass would have said "${s.slug}"`);
  }
  for (const s of steps.filter(s => s.kind === 'absent')) console.log(`  NOT ON THIS INSTALL ${s.id}`);

  const unsure = Object.keys(PLAN._unsure ?? {});
  console.log(`\n${unsure.length} episode(s) deliberately left untagged; the title does not place the guest:`);
  for (const id of unsure) console.log(`  ${id}  ${PLAN._unsure[id]}`);

  if (argv.includes('--remove')) {
    const mine = steps.filter(s => s.kind === 'already');
    const CHUNK = 10;
    for (let i = 0; i < mine.length; i += CHUNK) {
      const batch = mine.slice(i, i + CHUNK);
      await run(batch.map(s => `wp post term remove ${s.id} guest_type ${s.slug}`).join('\n'));
      for (const s of batch) console.log(`  untagged ${s.id} (${s.slug})`);
    }
    console.log(`\nRemoved ${mine.length}. Anything a person tagged is untouched.`);
    return;
  }

  const todo = steps.filter(s => s.kind === 'tag');
  if (!argv.includes('--apply')) {
    console.log(`\n${todo.length} episode(s) would be tagged. Nothing is written without --apply.`);
    return;
  }
  /* BATCHED, and not as an optimisation. This install charges tens of seconds
     for a single wp-cli call, so 52 of them one at a time is over an hour of
     SSH round trips; deploy-round1.mjs's header records what that costs when
     ignored. wpe() pipes a whole script over stdin, so a chunk is one
     connection and N bootstraps instead of N of both.

     NO `set -e` on the chunk, deliberately: one episode failing should not take
     the other nine in its batch down with it. The script is idempotent, so the
     remedy for a partial chunk is to run it again. */
  const CHUNK = 10;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const batch = todo.slice(i, i + CHUNK);
    await run(batch.map(s => `wp post term add ${s.id} guest_type ${s.slug}`).join('\n'));
    for (const s of batch) console.log(`  ${s.id} -> ${s.slug.padEnd(8)} (${s.basis})`);
    console.log(`  -- ${Math.min(i + CHUNK, todo.length)}/${todo.length}`);
  }
  console.log(`\nTagged ${todo.length}. Re-run to confirm: every line should read "already".`);
  console.log('THIS IS A FIRST PASS. Ask Empower to correct it, and read the skew note in this');
  console.log('file\'s header first: Community leader is the term a title-based method under-finds.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
