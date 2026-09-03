/* HAND THE SEARCH RESULTS PAGE FROM BEAVER TO ELEMENTOR.
 *
 * WHAT WAS ACTUALLY WRONG, read off the install rather than assumed. The
 * Elementor side was already complete: post 20639 carries
 * `_elementor_template_type: search-results`, its conditions are
 * `include/archive/search`, and its loop item 20640 ("Search result card") is
 * published with its own tree. Nothing was missing. Beaver Themer's layout
 * 11325 was simply still `publish`, and its `template_include` wins before
 * wp/empowerms-child/search.php ever asks Elementor for the `archive`
 * location. Same shape as the post single conversion, which needed 11272
 * drafted for exactly the same reason.
 *
 * SO THIS PAGE HAS NEVER BEEN LIVE, and that explains two defects found on
 * 2026-08-26 by reading the tree rather than the page: its empty state was
 * never switched on (`enable_nothing_found_message` absent, so Elementor
 * rendered no empty state at all) and it never paginated (`pagination_type`
 * absent, gated the same way). Both were fixed in the module the same day and
 * neither is in the deployed data -- checked: 0 hits for each in 20639's
 * `_elementor_data`. Redeploying the tree is what ships them.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme. bridge.css block 72 is this page's own stylesheet
 *      work and search.php is the template that asks for the location.
 *      NOTE the standing hazard: syncTheme() copies tokens/ components/ css/
 *      js/ assets/ and patterns/ from the repo ROOT with --delete, so anything
 *      uncommitted in those six directories is published as-is. Check
 *      `git status` before running.
 *   2. writes the tree into 20639 as document type 'search-results'.
 *   3. sets the condition separately, because a template with correct data and
 *      no location is resolved from a CACHED option at render time and never
 *      appears. It is already correct on the install; setting it again is
 *      idempotent and keeps this script honest if the post is ever recreated.
 *   4. drafts Beaver layout 11325, which is the step that actually changes what
 *      a visitor sees.
 *   5. flushes Elementor's CSS cache and the page cache.
 *
 * TO REVERSE: `wp post update 11325 --post_status=publish`. Beaver takes the
 * page straight back; nothing else needs undoing.
 */

import { deployThemePart, setConditions } from './deploy.mjs';
import { searchArchivePart, SEARCH_ARCHIVE_POST_ID, SEARCH_ARCHIVE_CONDITIONS } from './theme-parts/search-archive.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
import { pathToFileURL } from 'node:url';

/* Beaver Themer's "Search Results", read off the install with
   `wp post list --post_type=fl-theme-layout` rather than typed from memory. */
const BEAVER_SEARCH_RESULTS_ID = 11325;

/* Exported and pure: the decision that gates a live write, and the only part of
   this file a test can reach. */
export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Hands the search results page from Beaver to Elementor. Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-search.mjs --deploy\n\n'
      + `Writes template ${SEARCH_ARCHIVE_POST_ID}, then drafts Beaver layout ${BEAVER_SEARCH_RESULTS_ID}.\n`
      + `Reverse with: wp post update ${BEAVER_SEARCH_RESULTS_ID} --post_status=publish\n`
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/, tokens/,\n'
      + 'assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/5 syncing theme files...');
  await syncTheme();

  console.error(`2/5 writing the tree to ${SEARCH_ARCHIVE_POST_ID} as document type 'search-results'...`);
  await deployThemePart(SEARCH_ARCHIVE_POST_ID, searchArchivePart(), 'search-results');

  console.error(`3/5 setting conditions ${JSON.stringify(SEARCH_ARCHIVE_CONDITIONS)}...`);
  await setConditions(SEARCH_ARCHIVE_POST_ID, SEARCH_ARCHIVE_CONDITIONS);

  console.error(`4/5 drafting Beaver layout ${BEAVER_SEARCH_RESULTS_ID} ("Search Results")...`);
  await wpe(`wp post update ${BEAVER_SEARCH_RESULTS_ID} --post_status=draft`);

  console.error('5/5 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify with:');
  console.error('  SPIKE_URL=https://empv2.wpenginepowered.com/podcast/ \\');
  console.error('  node --test test-elementor.mjs');
  return 0;
}

/* Importing this file must do nothing; only direct execution runs main(). */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
