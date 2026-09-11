/* Brings the `person` post type into line with Empower's own roster.
 *
 * WHY THIS EXISTS. Empower's round 1, row 5, is two things: a line of copy to
 * delete (done in the page modules) and a roster that disagreed with itself.
 * The team page is driven by the `person` CPT now, so "who is a fellow" is
 * database state, and empv2's copy of that database is a clone that predates
 * 2026-08-13. It had drifted.
 *
 * WHAT THE ROSTER IS, and this is the part worth reading before changing
 * anything here. THREE sources were compared on 2026-09-10 rather than one:
 *
 *   1. empowerms.org/team/ and empowerms.org/board/, the pages Empower publish
 *      today. This is the register for who is on the roster right now.
 *   2. "Empower Mississippi Website Refresh Roadmap (6).docx", the TEAM, FELLOW
 *      & BOARD tab, sent 2026-09-10. Newer than the live pages, and the spec.
 *   3. the `person` CPT on empv2.
 *
 * They agree about the nine staff. They disagree about the fellows in four
 * ways, and every one of the four is empv2 being stale rather than a judgement
 * call:
 *
 *   J. Robertson        live: yes   roadmap: yes   empv2: PRIVATE, so absent
 *   Rebekah Staples     live: yes   roadmap: yes   empv2: DOES NOT EXIST
 *   Donald Nielsen      live: no    roadmap: no    empv2: PUBLISHED as a fellow
 *   Joe Bishop-Henchman live: no    roadmap: no    empv2: PUBLISHED as a fellow
 *
 * Christopher Koopman is the one real CHANGE rather than a correction: he is on
 * the live page and NOT in roadmap (6). He is already `draft` on empv2, so this
 * script leaves him alone and says so; the static build is where he still
 * appears and that is fixed in src/, not here.
 *
 * AND ONE NAME. She is "Joanna Pevey" on the live team page and in the roadmap,
 * and "Joanna Polk" on empv2, which in turn replaced "Joanna Holbert" (still
 * present, private). Two name changes, and the install is one behind. THE SLUG
 * IS NOT TOUCHED: `joanna-polk-2` is what every converted page's link remap
 * resolved against (docs/elementor/phase2b/2026-08-20-link-remap.md), and a
 * silent slug change is a 404 on a page nothing reports. Her own bio text still
 * calls her Polk throughout, in the roadmap as well as on the install; that is
 * Empower's copy to fix, and this script does not rewrite anybody's words.
 *
 * DRAFT, NEVER DELETE. Nielsen and Bishop-Henchman keep their posts, their
 * bios and their photographs; only their status changes, and
 * inc/person-loop.php reads `publish` only. Flipping the status back is the
 * whole of the undo. They may well be former fellows Empower simply stopped
 * listing, which is not the same as people who were never here.
 *
 * AND ONE BIO, added 2026-09-10 after Kienna Horn asked for it: her bio still
 * called her Polk five times over, in the roadmap as well as on the install,
 * and "any references to Polk are changed to Joanna Pevey" was the instruction.
 * Taken as: the full name once, the surname alone thereafter, which is what the
 * prose is shaped for. A literal replacement of every "Polk" would have written
 * "Joanna Joanna Pevey is the Executive Assistant".
 *
 * IT IS NOT A REWRITE. The bio carries a subject-verb slip of Empower's own
 * ("Polk supports the CEO, keep projects and commitments on track") and this
 * leaves it alone. Their copy is theirs; the name was the ask.
 *
 * IDEMPOTENT. Every action is stated as a target state, checked first, and
 * skipped when it already holds. Safe to re-run, and it must be re-run against
 * production at cutover: see docs/staging-to-prod-database.md. Production's own
 * data is the live site's, so there the only outstanding action should be
 * Koopman, and this script reports rather than assumes that.
 *
 *   node elementor/apply-team-roster.mjs           # explain, change nothing
 *   node elementor/apply-team-roster.mjs --apply   # write
 */
import { pathToFileURL } from 'node:url';
import { wpe } from '../wpe.mjs';

const shellSingle = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

/* Keyed by SLUG, because a post id belongs to one install and this runs against
   two. `title` is asserted rather than set for people who already exist: a slug
   that resolves to somebody else is the failure this catches. */
export const ACTIONS = [
  {
    slug: 'j-robertson',
    title: 'J. Robertson',
    want: 'publish',
    why: 'on the live team page and in roadmap (6); private here, so the roster is short a fellow',
  },
  {
    slug: 'donald-nielsen',
    title: 'Donald Nielsen',
    want: 'draft',
    why: 'on neither the live team page nor roadmap (6); published here, so the roster shows a fellow Empower does not list',
  },
  {
    slug: 'joe-bishop-henchman',
    title: 'Joe Bishop-Henchman',
    want: 'draft',
    why: 'on neither the live team page nor roadmap (6); published here, same as Nielsen',
  },
];

/* Renames, as slug -> the name Empower use. Title only; the slug stays. */
export const RENAMES = [
  { slug: 'joanna-polk-2', from: 'Joanna Polk', to: 'Joanna Pevey' },
];

/* The one person the install does not have. `thumbnail_IMG_0443` is the file
   the live team page itself serves for her (through Beaver's circle-crop
   cache), and it is already in this install's media library, so nothing is
   uploaded. She has NO BIO anywhere: the live fellows block carries no bio
   links at all, and a site search returns only a podcast episode. Her person
   page will therefore be a name, a title and a photograph until Empower write
   one, which is a real gap and is reported at the end of a run rather than
   filled in with invented copy. */
export const CREATE = {
  slug: 'rebekah-staples',
  title: 'Rebekah Staples',
  position_title: 'Fellow on Work',
  headshot_title: 'thumbnail_IMG_0443',
};

/* Surname corrections inside a person's own bio. Ordered: the full name first,
   so the bare-surname rule that follows cannot turn "Joanna Polk" into "Joanna
   Joanna Pevey". Applied only when the OLD name still appears, so a re-run is a
   no-op and a hand-edit in wp-admin is never overwritten. */
export const BIO_FIXES = [
  {
    slug: 'joanna-polk-2',
    replacements: [['Joanna Polk', 'Joanna Pevey'], ['Polk', 'Pevey']],
  },
];

export function applyReplacements(content, replacements) {
  let out = content;
  for (const [from, to] of replacements) out = out.split(from).join(to);
  return out;
}

/* Written through a temp file on the install rather than as a shell argument.
   A bio holds curly quotes and apostrophes, and elementor/deploy.mjs's header
   records why a quoted heredoc plus a temp file is the shape that survives the
   gateway. `set -e` and the EXIT trap are copied from there for the same
   reason: an abort mid-script must still remove the file. */
export async function writeBio(postId, content, run = wpe) {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const tmp = `/tmp/empower_bio_${suffix}`;
  const heredoc = `EMPOWER_BIO_${suffix}`;
  await run([
    'set -e',
    `trap 'rm -f ${tmp}' EXIT`,
    `cat > ${tmp} <<'${heredoc}'`,
    content,
    heredoc,
    `wp post update ${postId} --post_content="$(cat ${tmp})"`,
  ].join('\n'));
}

export async function readPeople(run = wpe) {
  const slugs = [...ACTIONS.map(a => a.slug), ...RENAMES.map(r => r.slug), CREATE.slug];
  const list = slugs.map(s => `'${s}'`).join(',');
  const sql = `SELECT post_name, ID, post_status, post_title FROM wp_posts `
    + `WHERE post_type='person' AND post_name IN (${list})`;
  const out = await run(`wp db query "${sql}" --skip-column-names`);
  const found = new Map();
  for (const line of out.trim().split('\n').filter(Boolean)) {
    const [name, id, status, title] = line.split('\t');
    found.set(name, { id: Number(id), status, title });
  }
  return found;
}

/* The attachment by TITLE, so this resolves on production too. */
export async function findAttachment(title, run = wpe) {
  const sql = `SELECT ID FROM wp_posts WHERE post_type='attachment' AND post_title=${shellSingle(title)} LIMIT 1`;
  const out = await run(`wp db query "${sql}" --skip-column-names`);
  const id = out.trim().split('\n').map(l => l.trim()).find(l => /^\d+$/.test(l));
  return id ? Number(id) : null;
}

export function plan(found) {
  const steps = [];
  for (const a of ACTIONS) {
    const p = found.get(a.slug);
    if (!p) { steps.push({ kind: 'absent', slug: a.slug, note: a.why }); continue; }
    if (p.title !== a.title) {
      steps.push({ kind: 'mismatch', slug: a.slug, note: `resolves to "${p.title}", expected "${a.title}"` });
      continue;
    }
    if (p.status === a.want) { steps.push({ kind: 'already', slug: a.slug, note: `already ${a.want}` }); continue; }
    steps.push({ kind: 'status', slug: a.slug, id: p.id, from: p.status, to: a.want, note: a.why });
  }
  for (const r of RENAMES) {
    const p = found.get(r.slug);
    if (!p) { steps.push({ kind: 'absent', slug: r.slug, note: 'rename target missing' }); continue; }
    if (p.title === r.to) { steps.push({ kind: 'already', slug: r.slug, note: `already "${r.to}"` }); continue; }
    if (p.title !== r.from) {
      steps.push({ kind: 'mismatch', slug: r.slug, note: `reads "${p.title}", expected "${r.from}" or "${r.to}"` });
      continue;
    }
    steps.push({ kind: 'rename', slug: r.slug, id: p.id, from: p.title, to: r.to });
  }
  const existing = found.get(CREATE.slug);
  steps.push(existing
    ? { kind: 'already', slug: CREATE.slug, note: `exists as ${existing.id} (${existing.status})` }
    : { kind: 'create', slug: CREATE.slug, note: `${CREATE.title}, ${CREATE.position_title}` });
  return steps;
}

export async function main(argv = process.argv.slice(2), run = wpe) {
  const found = await readPeople(run);
  const steps = plan(found);

  const blocking = steps.filter(s => s.kind === 'mismatch');
  for (const s of steps) console.log(`  ${s.kind.padEnd(9)} ${s.slug.padEnd(22)} ${s.note ?? `${s.from} -> ${s.to}`}`);
  if (blocking.length) {
    throw new Error(
      `${blocking.length} slug(s) resolve to somebody other than the person named here. `
      + 'Nothing was written. A slug pointing at the wrong person is exactly the case this check exists for.'
    );
  }

  /* The bios are read here rather than in plan(), because plan() is pure and a
     bio is a second round trip per person. */
  const bioWork = [];
  for (const fix of BIO_FIXES) {
    const person = found.get(fix.slug);
    if (!person) { console.log(`  absent    ${fix.slug.padEnd(22)} bio fix has no person to apply to`); continue; }
    const content = await run(`wp post get ${person.id} --field=post_content`);
    const next = applyReplacements(content, fix.replacements);
    if (next === content) { console.log(`  already   ${fix.slug.padEnd(22)} bio carries no old name`); continue; }
    const changed = fix.replacements.filter(([from]) => content.includes(from)).map(([from, to]) => `${from} -> ${to}`);
    console.log(`  bio       ${fix.slug.padEnd(22)} ${changed.join(', ')}`);
    bioWork.push({ slug: fix.slug, id: person.id, content: next });
  }

  const todo = steps.filter(s => ['status', 'rename', 'create'].includes(s.kind));
  if (!argv.includes('--apply')) {
    console.log(`\n${todo.length + bioWork.length} action(s) pending. Nothing is written without --apply.`);
    return;
  }
  if (!todo.length && !bioWork.length) {
    console.log('\nNothing to do; the roster already matches.');
    return;
  }

  for (const s of todo) {
    if (s.kind === 'status') {
      await run(`wp post update ${s.id} --post_status=${s.to}`);
      console.log(`  ${s.slug}: ${s.from} -> ${s.to}`);
    }
    if (s.kind === 'rename') {
      await run(`wp post update ${s.id} --post_title=${shellSingle(s.to)}`);
      console.log(`  ${s.slug}: "${s.from}" -> "${s.to}" (slug unchanged)`);
    }
    if (s.kind === 'create') {
      /* Created in one call, id read back on the NODE side. wpe.mjs's header
         records why a --porcelain value must never be captured into a remote
         shell variable on this install. */
      await run(
        `wp post create --post_type=person --post_status=publish`
        + ` --post_title=${shellSingle(CREATE.title)} --post_name=${shellSingle(CREATE.slug)}`
      );
      const after = await readPeople(run);
      const made = after.get(CREATE.slug);
      if (!made) throw new Error(`created ${CREATE.slug} but could not read its id back`);
      await run(`wp post meta update ${made.id} position_title ${shellSingle(CREATE.position_title)}`);
      const att = await findAttachment(CREATE.headshot_title, run);
      if (att) {
        await run(`wp post meta update ${made.id} _thumbnail_id ${att}`);
        console.log(`  ${CREATE.slug}: created ${made.id}, headshot ${att}`);
      } else {
        console.log(`  ${CREATE.slug}: created ${made.id}, NO HEADSHOT ("${CREATE.headshot_title}" not in this media library)`);
      }
      console.log('  ^ she has no bio on any source that was checked, so her person page is a name,');
      console.log('    a title and a photograph. Empower to supply, or the ledger link reads thin.');
    }
  }
  for (const b of bioWork) {
    await writeBio(b.id, b.content, run);
    console.log(`  ${b.slug}: bio rewritten (${b.content.length} chars)`);
  }

  console.log('\nRe-run to confirm: every line should read "already".');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
