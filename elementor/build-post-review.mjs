/* Builds docs/post-description-review.html from the template and the proposal.

   WHY THIS EXISTS. The first version of the review page was assembled by hand
   and only its OUTPUT was committed, so the page could not be rebuilt from
   anything in this repository: regenerating the proposal left a page showing
   the previous run's numbers, and nothing would have said so. Template plus
   data plus this script, all three committed, is what makes the page a build
   artefact rather than a copy of one.

   THE TEMPLATE IS AUTHORED AS AN ARTIFACT FRAGMENT, which is to say it carries
   a <title>, its font link and its stylesheet at the top and no <head> around
   them. That is what publishing it to claude.ai expects. pages.mjs wraps it
   into a full document on the way to GitHub Pages; see the note there. Keeping
   one source in fragment form and wrapping at each destination beats keeping
   two copies that drift.

   `body` is dropped on the way in. It exists in the proposal so the
   no-invented-figures test can run without the install, it is a prefix of copy
   already on the public site, and it would add about 120 KB to a page nobody
   reads it on. */

import fs from 'node:fs';

const TEMPLATE = 'elementor/approval/post-description-review.template.html';
const PROPOSAL = 'elementor/approval/post-descriptions.json';
const OUT = 'docs/post-description-review.html';

const FIELDS = ['id', 'url', 'date', 'post_title', 'tier', 'description', 'length', 'now', 'before'];

export function buildReview({ root = process.cwd() } = {}) {
  const template = fs.readFileSync(`${root}/${TEMPLATE}`, 'utf8');
  const rows = JSON.parse(fs.readFileSync(`${root}/${PROPOSAL}`, 'utf8'))
    .map((r) => Object.fromEntries(FIELDS.map((f) => [f, r[f]])));

  if (!template.includes('__DATA__')) {
    throw new Error(`${TEMPLATE} has no __DATA__ placeholder; the page would ship with no posts in it`);
  }
  return template.replace('__DATA__', JSON.stringify(rows));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const html = buildReview();
  fs.writeFileSync(OUT, html);
  const rows = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
  const tiers = {};
  for (const r of rows) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
  console.log(`${OUT} — ${rows.length} posts, ${Math.round(html.length / 1024)} KB`);
  console.log(`tiers: ${Object.entries(tiers).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
