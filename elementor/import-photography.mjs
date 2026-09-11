/* Imports the 2026-09 photography into the install's media library.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme, because the 43 new JPEGs live in assets/photography/
 *      and `assets` is in wp/sync.mjs's FROM_ROOT. `wp media import` is given a
 *      path on the install, so the file has to be there first. NOTE the
 *      standing hazard syncTheme() carries: it copies tokens/ components/ css/
 *      js/ assets/ and patterns/ from the repo ROOT with --delete, so anything
 *      uncommitted in those six directories is published as-is. Check
 *      `git status` before running.
 *   2. imports each file with `--alt`, which is the ONLY way the sentence can
 *      reach the attachment: Elementor's image widget has no alt control and a
 *      settings.image.alt key is accepted and silently discarded
 *      (elementor/factory.mjs's image() comment records the two-widget
 *      experiment that proved it). Same shape education/media.mjs records for
 *      20610.
 *   3. reads every id and alt back OFF THE INSTALL and writes the manifest.
 *
 * THE ALT SENTENCES ARE PAOLO'S, APPROVED 2026-09-03. The standing rule is that
 * no session writes alt text; these were drafted in
 * docs/elementor/phase2b/2026-09-03-photography-selection.md, reviewed, and
 * approved before this script was run. It writes no OTHER attachment's alt, and
 * it runs no `wp post meta update` on any existing attachment: every sentence
 * reaches its attachment through `--alt` at the moment that attachment is
 * created, and an already-imported file is SKIPPED rather than rewritten.
 *
 * IDEMPOTENT. A second run imports nothing: each file is looked up by its
 * post_name first. That matters because a half-finished run must be safe to
 * repeat, and because `wp media import` given the same file twice creates a
 * SECOND attachment with a -1 suffix rather than failing, which would leave two
 * plausible ids for one photograph and no way to tell which the pages use.
 *
 * Never captures a WP-CLI value into a remote shell variable: every id comes
 * back through wpe() to Node and is passed into the next call as a literal.
 * wpe.mjs's header records what that costs when ignored.
 *
 *   node elementor/import-photography.mjs            # explain, change nothing
 *   node elementor/import-photography.mjs --import   # sync, then import
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

export const MANIFEST = 'elementor/photography-2026-09.json';
const PLAN = JSON.parse(readFileSync('elementor/photography-2026-09-plan.json', 'utf8'));
const THEME_DIR = 'wp-content/themes/empowerms-child/assets/photography';

const shellSingle = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export async function lookup(name, run = wpe) {
  const out = (await run(
    `wp post list --post_type=attachment --name=${shellSingle(name)} --field=ID --format=csv`
  )).trim();
  const ids = out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l));
  return ids.length ? Number(ids[0]) : null;
}

export async function importOne({ name, alt }, run = wpe) {
  const existing = await lookup(name, run);
  if (existing) return { id: existing, imported: false };
  const out = (await run(
    `wp media import ${THEME_DIR}/${name}.jpg --title=${shellSingle(name)} --alt=${shellSingle(alt)} --porcelain`
  )).trim();
  const id = Number(out.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l)).pop());
  if (!Number.isInteger(id)) throw new Error(`import ${name}: no id in ${JSON.stringify(out)}`);
  return { id, imported: true };
}

export async function main(argv = process.argv.slice(2)) {
  const names = Object.keys(PLAN).sort();
  if (!argv.includes('--import')) {
    console.log(`Would sync the theme, then import ${names.length} photographs with --alt.`);
    console.log(`Nothing is written without --import. Manifest lands in ${MANIFEST}.`);
    for (const n of names.slice(0, 3)) console.log(`  ${n}  alt="${PLAN[n]}"`);
    console.log(`  ... and ${names.length - 3} more`);
    return;
  }
  if (argv.includes('--skip-sync')) {
    console.log('skipping theme sync (--skip-sync)');
  } else {
    console.log('syncing theme ...');
    await syncTheme();
  }

  /* THREE ROUND TRIPS, NOT THREE PER FILE. One import-per-file with its own
     read-back is 4 ssh calls x 41 files, which measured at roughly 2.5 hours
     against this install. The imports are therefore sent as ONE remote script
     and every value is read back afterwards in ONE query.
     This does NOT break wpe.mjs's rule. That rule forbids capturing a WP-CLI
     value into a REMOTE SHELL VARIABLE and using it in the next remote command;
     nothing here does that. The remote script only runs imports and discards
     their output, and every id reaches Node through a separate read. */
  const present = new Set(
    (await wpe(`wp post list --post_type=attachment --field=post_name --format=csv --posts_per_page=-1`))
      .split('\n').map(l => l.trim()).filter(Boolean));
  const todo = names.filter(n => !present.has(n));
  console.log(`${present.size} attachments on the install; ${todo.length} of ${names.length} still to import.`);

  /* CHUNKED, AND THE OUTPUT IS NOT SILENCED. Both matter, and both were
     learned from a failed run on 2026-09-03: 37 imports were sent as one
     remote script with `--porcelain >/dev/null`, so nothing crossed the
     connection for about twelve minutes and ssh died with exit 255 after
     completing most of them. Keeping the porcelain ids on stdout gives the
     connection steady traffic, and a chunk of six bounds how much work a
     dropped connection costs. The ids printed here are NOT read: they are
     traffic. Every id this script trusts is read back in the query below. */
  const CHUNK = 6;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const batch = todo.slice(i, i + CHUNK);
    /* An empty sentence means the photograph is decorative in its only use, and
       the flag is OMITTED rather than passed empty: that is the same shape
       epic-a/media.mjs records for epic-logo, whose settled answer is an empty
       alt. Passing --alt='' would write an empty meta row instead of leaving
       none, which reads as "somebody decided this was empty" rather than
       "there is nothing here", and the two are worth telling apart. */
    const script = batch.map(n =>
      `wp media import ${THEME_DIR}/${n}.jpg --title=${shellSingle(n)}` +
      (PLAN[n] ? ` --alt=${shellSingle(PLAN[n])}` : '') + ` --porcelain`
    ).join('\n');
    await wpe(script);
    console.log(`  imported ${Math.min(i + CHUNK, todo.length)}/${todo.length}`);
  }

  const list = shellSingle(names.map(n => `'${n}'`).join(','));
  const rows = (await wpe(
    `wp db query "SELECT p.post_name, p.ID, p.guid, COALESCE(m.meta_value,'') ` +
    `FROM wp_posts p LEFT JOIN wp_postmeta m ON m.post_id=p.ID AND m.meta_key='_wp_attachment_image_alt' ` +
    `WHERE p.post_type='attachment' AND p.post_name IN (${names.map(n => `'${n}'`).join(',')})" --skip-column-names`
  )).split('\n').map(l => l.split('\t')).filter(r => r.length >= 3);

  const manifest = {}; const problems = [];
  for (const name of names) {
    const hits = rows.filter(r => r[0].trim() === name);
    if (hits.length !== 1) { problems.push(`${name}: ${hits.length} attachments match`); continue; }
    const [, id, url, alt] = hits[0];
    if ((alt || '').trim() !== PLAN[name]) problems.push(`${name} (${id}): alt is ${JSON.stringify((alt||'').trim())}`);
    manifest[name] = { id: Number(id.trim()), url: url.trim() };
  }
  if (problems.length) throw new Error(`read-back failed:\n  ${problems.join('\n  ')}`);
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n${names.length} attachments verified (id, url and alt read off the install). Manifest: ${MANIFEST}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
