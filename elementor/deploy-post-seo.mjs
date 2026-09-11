/* Writes the shortened post descriptions into All in One SEO's storage, and
   refuses to do it until somebody has said it may.

   WHY THIS IS NOT deploy-seo.mjs. That script writes sixteen converted pages
   and one drafted set of bios, all of it copy this build wrote and Empower
   signed off line by line in a document. This one writes 490 posts of
   Empower's own journalism, shortened mechanically. The blast radius is
   thirty times larger and the copy is theirs, so the same "run it and it
   goes" shape would be wrong.

   THE GATE IS A FILE, NOT A FLAG. elementor/approval/post-descriptions-
   approved.json does not exist in this repository and is not created by
   anything in it. A fresh checkout therefore CANNOT write, and the way to
   make it able to is to record who approved what and when. A --yes flag would
   be one keystroke away from somebody who had not read this paragraph; a file
   that has to be authored cannot be typed past by accident.

   AND THE APPROVAL IS OVER THE COPY, NOT OVER THE IDS. The failure this is
   really built for is not "somebody wrote without asking", it is "somebody
   asked, then regenerated the proposal, then wrote". Every id would still
   match and every string would have changed. So the approval carries a digest
   of the proposed wording and a mismatch is refused. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import { wpe } from '../wpe.mjs';

export const PROPOSAL = 'elementor/approval/post-descriptions.json';
export const APPROVAL = 'elementor/approval/post-descriptions-approved.json';

/* A fingerprint of the WORDING, so that regenerating the proposal invalidates
   an approval given for the previous run. Over id and description only: url
   and tier are derived, and including them would make the digest churn on
   changes that do not alter a single character anybody reads. Sorted by id so
   the digest does not depend on the order rows happen to come back in. */
export function digestRows(rows) {
  const material = [...rows]
    .map((r) => [Number(r.id), String(r.description)])
    .sort((a, b) => a[0] - b[0]);
  return crypto.createHash('sha256').update(JSON.stringify(material)).digest('hex');
}

/* Every reason this write must not happen, as a list of sentences. Empty
   means it may.

   ALL OF THEM, not the first one. A caller who fixes the digest and re-runs
   only to be told about an unapproved row has been made to do the work twice,
   and the second refusal reads like the fix broke something. */
export function approvalProblems({ rows, approval }) {
  const problems = [];

  if (!approval) {
    return [
      `there is no approval record at ${APPROVAL}, so no wording on these ${rows.length} posts has been agreed. `
      + 'This writes client-owned copy onto 490 live pages; the record is the thing that says it may.',
    ];
  }

  if (!approval.digest) {
    problems.push(
      'the approval record records no digest, so it approves a set of post ids rather than a set of words. '
      + 'Regenerating the proposal would leave every id matching and every description different.',
    );
  } else if (approval.digest !== digestRows(rows)) {
    problems.push(
      'the proposal has changed since it was approved: its digest no longer matches the one in the approval '
      + 'record. Either the proposal was regenerated after approval, or the approval belongs to an earlier run.',
    );
  }

  const approved = new Set((approval.approvedIds ?? []).map(Number));
  const unapproved = rows.filter((r) => !approved.has(Number(r.id)));
  if (unapproved.length) {
    problems.push(
      `${unapproved.length} row(s) are not in the approval record, beginning with post ${unapproved[0].id} `
      + `(${unapproved[0].url}). A row nobody approved must not travel with the ones that were.`,
    );
  }

  /* A manual row proposes nothing at all. Writing it would replace a
     description that is at least serving today with an empty string, which is
     worse than the 300-character one it was meant to improve on. Refused by
     name rather than left to the empty string looking harmless. */
  const empty = rows.filter((r) => r.tier === 'manual' || !String(r.description ?? '').trim());
  if (empty.length) {
    problems.push(
      `post ${empty[0].id} proposes no description at all (tier "manual"), and ${empty.length} row(s) do. `
      + 'Those posts need one written; they must be dropped from this write, not sent as blanks.',
    );
  }

  return problems;
}

/* The write itself. Base64, one payload, one call, through the plugin's own
   model, for every reason deploy-seo.mjs sets out at length: the copy carries
   apostrophes, wp_aioseo_posts has its own row-creation logic, and a value
   captured into a remote shell variable arrives with a PHP deprecation notice
   glued to it. */
async function writeDescriptions(rows) {
  const payload = Buffer.from(JSON.stringify(rows.map((r) => ({ id: Number(r.id), description: r.description })))).toString('base64');
  const php = [
    '$rows = json_decode( base64_decode( "' + payload + '" ), true );',
    'foreach ( $rows as $row ) {',
    '  $p = \\AIOSEO\\Plugin\\Common\\Models\\Post::getPost( (int) $row["id"] );',
    '  $p->description = $row["description"];',
    '  $p->save();',
    '  echo $row["id"], "\\n";',
    '}',
  ].join(' ');
  return wpe(`wp eval '${php}'`);
}

export async function deployPostSeo({ root = process.cwd() } = {}) {
  const rows = JSON.parse(fs.readFileSync(`${root}/${PROPOSAL}`, 'utf8'));
  const approvalPath = `${root}/${APPROVAL}`;
  const approval = fs.existsSync(approvalPath) ? JSON.parse(fs.readFileSync(approvalPath, 'utf8')) : null;

  /* Only the rows the approval names, so an approval covering the sentence
     tier alone is a legitimate partial deploy rather than an all-or-nothing
     refusal. The problems above are then computed over the SUBSET that would
     actually be written. */
  const named = new Set((approval?.approvedIds ?? []).map(Number));
  const selected = approval ? rows.filter((r) => named.has(Number(r.id))) : rows;

  const problems = approvalProblems({ rows: selected, approval });
  if (problems.length) {
    throw new Error(`refusing to write post descriptions:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }

  const written = await writeDescriptions(selected);

  /* The same lesson deploy-seo.mjs paid for on 2026-08-21: the write lands
     immediately and the pages keep serving the old description, for a SUBSET,
     which reads like a data bug rather than a cache. Both caches, because the
     CDN holds its own copy. */
  const flushed = await wpe('wp page-cache flush && wp cdn-cache flush');

  return { count: selected.length, written, flushed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployPostSeo()
    .then(({ count, flushed }) => {
      console.log(flushed);
      console.log(`wrote descriptions for ${count} posts`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
