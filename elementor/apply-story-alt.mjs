/* Alt text for the 27 Community Stories featured images.
 *
 * THE GAP. Every one of the 27 published Community Stories carries a featured
 * photograph and NOT ONE of those attachments had alt text. They are
 * photographs of real people, and three of them sit on the homepage, so a
 * screen reader announced three portraits of Mississippians as nothing at all.
 * Recorded as an open item since 2026-09-04 and closed here.
 *
 * IT HAS TO BE THE ATTACHMENT. Elementor's image widget has no alt control and
 * renders whatever `_wp_attachment_image_alt` holds, so no page tree, loop item
 * or bridge rule can fix this. elementor/factory.mjs's own image() comment says
 * the same thing from the other side.
 *
 * WHO WROTE THEM, stated plainly because this repository has a standing rule
 * that no session invents alt text (elementor/import-photography.mjs's header:
 * "THE ALT SENTENCES ARE PAOLO'S, APPROVED"). These are NOT approved copy. They
 * were generated on 2026-09-10 on Paolo's explicit instruction to close the
 * item autonomously, and the rule is suspended for this run rather than
 * forgotten. Every sentence is in elementor/story-alt.json where Empower can
 * read all 27 in one screen and correct any of them.
 *
 * HOW THEY WERE WRITTEN. Every image was LOOKED AT, not guessed from a
 * filename; the traps in this project's own photography say why that matters.
 * The setting comes from the story the image illustrates, which is what makes
 * "outside the Mississippi Delta Nature and Learning Center" possible rather
 * than "a woman standing outside a building".
 *
 * NOBODY IS NAMED, and that is the decision to argue with if any of it is
 * wrong. The story's headline sits directly beside the image everywhere this
 * build renders it, so a name in the alt would be announced twice; and a face
 * matched to the wrong name is the one error here that cannot be taken back.
 * Several of these photographs are groups where the story names one person, so
 * naming would have meant guessing which face. Describing what is visible is
 * defensible on all 27.
 *
 * IT NEVER OVERWRITES. An attachment that already has alt is skipped and
 * reported, so anything Empower write by hand survives a re-run.
 *
 *   node elementor/apply-story-alt.mjs           # explain, change nothing
 *   node elementor/apply-story-alt.mjs --apply   # write the alt
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { wpe } from '../wpe.mjs';

export const ALT = JSON.parse(readFileSync('elementor/story-alt.json', 'utf8')).alt;

const shellSingle = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/* One query for all 27, because this install charges tens of seconds for a
   trivial call. Returns attachment id -> current alt ('' when absent). */
export async function readAlt(ids = Object.keys(ALT), run = wpe) {
  const list = ids.join(',');
  const sql = `SELECT p.ID, COALESCE(m.meta_value,'') FROM wp_posts p `
    + `LEFT JOIN wp_postmeta m ON m.post_id = p.ID AND m.meta_key = '_wp_attachment_image_alt' `
    + `WHERE p.post_type = 'attachment' AND p.ID IN (${list})`;
  const out = await run(`wp db query "${sql}" --skip-column-names`);
  const found = new Map();
  for (const line of out.trim().split('\n').filter(Boolean)) {
    const [id, alt] = line.split('\t');
    found.set(String(id).trim(), (alt ?? '').trim());
  }
  return found;
}

export function plan(current, alt = ALT) {
  return Object.entries(alt).map(([id, text]) => {
    if (!current.has(id)) return { id, kind: 'absent', text };
    const now = current.get(id);
    if (now === text) return { id, kind: 'already', text };
    if (now) return { id, kind: 'human', text, now };
    return { id, kind: 'write', text };
  });
}

export async function main(argv = process.argv.slice(2), run = wpe) {
  const steps = plan(await readAlt(Object.keys(ALT), run));
  const counts = steps.reduce((a, s) => ({ ...a, [s.kind]: (a[s.kind] ?? 0) + 1 }), {});
  for (const [kind, n] of Object.entries(counts)) console.log(`  ${kind.padEnd(7)} ${n}`);
  for (const s of steps.filter(s => s.kind === 'human')) {
    console.log(`  LEFT ALONE ${s.id}: already reads ${JSON.stringify(s.now)}`);
  }
  for (const s of steps.filter(s => s.kind === 'absent')) {
    console.log(`  NOT ON THIS INSTALL ${s.id}`);
  }

  const todo = steps.filter(s => s.kind === 'write');
  if (!argv.includes('--apply')) {
    console.log(`\n${todo.length} attachment(s) would get alt. Nothing is written without --apply.`);
    for (const s of todo.slice(0, 3)) console.log(`  ${s.id}  ${s.text}`);
    if (todo.length > 3) console.log(`  ... and ${todo.length - 3} more, all of them in elementor/story-alt.json`);
    return;
  }

  /* Batched for the reason elementor/apply-guest-types.mjs gives: 27 calls one
     at a time is half an hour of SSH on this install, and wpe() pipes a whole
     script over stdin, so a chunk is one connection. No `set -e`: one failure
     should not take its batch down, and the script is idempotent. */
  const CHUNK = 9;
  for (let i = 0; i < todo.length; i += CHUNK) {
    const batch = todo.slice(i, i + CHUNK);
    await run(batch.map(s => `wp post meta update ${s.id} _wp_attachment_image_alt ${shellSingle(s.text)}`).join('\n'));
    for (const s of batch) console.log(`  ${s.id}  ${s.text}`);
    console.log(`  -- ${Math.min(i + CHUNK, todo.length)}/${todo.length}`);
  }
  console.log(`\nWrote alt on ${todo.length} attachment(s). Re-run to confirm: every line reads "already".`);
  console.log('These sentences are NOT client-approved copy. Ask Empower to read story-alt.json.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
