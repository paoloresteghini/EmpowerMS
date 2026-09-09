/* DEPLOY THE ALL CONTENT PAGE (content-a) TO empv2.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() overwrites `_elementor_data`
 * wholesale, so this script's only argument is the difference between reading
 * about a deploy and performing one. A bare invocation explains itself and
 * writes nothing; `--deploy` does the work. Same discipline as
 * deploy-archive.mjs, arrived at the same way: that script accepted `<id>`, the
 * literal placeholder from its own instructions, until a test said otherwise.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme, because css/content-a.css changed. NOTE the standing
 *      hazard: syncTheme() copies tokens/ components/ css/ js/ assets/ and
 *      patterns/ from the repo ROOT with --delete, so anything uncommitted in
 *      those six directories is published as-is. Checked before the 2026-08-26
 *      run: nothing uncommitted in any of them. Check `git status` again before
 *      the next one; a peer session editing css/ is exactly how unreviewed work
 *      reached the install on 2026-08-21.
 *   2. deploys the page tree into POST_ID 20613.
 *   3. flushes Elementor's CSS cache and the page cache. A deploy that does not
 *      flush fails as a subset of itself.
 *
 * THE FOUR LOOP ITEM TEMPLATES ARE NOT REDEPLOYED, deliberately. The change
 * that prompted this run is in 02-browse.mjs (the filter control markup) and in
 * css/content-a.css; loop-item.mjs is untouched, and the Loop Items are
 * separate elementor_library posts that the page only references by id.
 * Redeploying them would be four more wholesale overwrites for no change.
 * `git diff --stat -- elementor/pages/content-a/` is how that was decided.
 *
 * TO REVERSE: this page has no "previous version" the script can restore.
 * Elementor keeps its own revisions on post 20613, so a rollback is a revision
 * restore in wp-admin, or a redeploy from an earlier commit of
 * elementor/pages/content-a/.
 */

import { deployPage } from './deploy.mjs';
import { POST_ID, sections } from './pages/content-a/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
import { resolveTerms } from './terms.mjs';
import { pathToFileURL } from 'node:url';

/* Exported and pure, because this is the function that decides whether a live
   write happens and it is the only part of this file a test can reach. */
export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys the All Content page (content-a) to empv2. Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-content-a.mjs --deploy\n\n'
      + `Target: post ${POST_ID}. Check \`git status\` first: syncTheme() publishes css/, js/,\n`
      + 'components/, tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  /* BEFORE sections(), because the four bands read their category ids out of
     terms.mjs and the module's defaults are empv2's. On this install nothing
     changes and the run says so; on production every id is different and
     deploying the defaults would publish four bands querying the wrong
     categories, or nothing at all, with no error. terms.mjs has the reasoning. */
  console.error('1/4 resolving category term ids off the install...');
  const terms = await resolveTerms({ host: 'empv2' });
  console.error(terms.changed.length
    ? `  ${terms.changed.length} differed from the defaults: ${terms.changed.join(', ')}`
    : `  all ${terms.count} match the defaults in terms.mjs`);

  console.error('2/4 syncing theme files (css/content-a.css changed)...');
  await syncTheme();

  console.error(`3/4 deploying the page tree into ${POST_ID}...`);
  await deployPage(POST_ID, sections());

  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify with:');
  console.error('  CONTENT_A_URL=https://empv2.wpenginepowered.com/all-content/ node --test test-elementor.mjs');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import and took the whole test suite down with it the
   first time a test imported it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
