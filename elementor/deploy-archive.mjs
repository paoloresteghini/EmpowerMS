/* DEPLOY THE CATEGORY ARCHIVE TEMPLATE. Paolo runs this with `!`.
 *
 * Everything it does is reversible, and the reversal is at the bottom of this
 * comment. Nothing here creates a post: the elementor_library post must exist
 * first, because creating one is a write to Empower's install that should be a
 * deliberate, separate act.
 *
 * STEP 0, ONCE, BY HAND:
 *
 *   wp post create --post_type=elementor_library --post_status=publish \
 *     --post_title='Category archive' --porcelain
 *
 * then put the id it prints into ARCHIVE_POST_ID below (or pass it as the
 * first argument to this script).
 *
 * WHAT THIS THEN DOES, in order:
 *
 *   1. rsyncs the theme. css/archive.css is a NEW file and the template is
 *      unstyled without it. NOTE the standing hazard: syncTheme() copies
 *      tokens, components, css, js, assets and patterns from the repo ROOT
 *      with --delete, so anything uncommitted in those directories from
 *      another session gets published as-is. Check `git status` first.
 *      inc/archive.php and functions.php are theme files and go with it.
 *   2. writes the tree and `_elementor_template_type` = 'archive'.
 *   3. sets the condition SEPARATELY. This is not optional and not a tidying
 *      step: a template with correct data and no location is resolved from a
 *      CACHED option at render time and simply never appears.
 *      docs/elementor/theme-part-mechanism.md records the hour that cost.
 *   4. drafts Beaver's "Posts Category Archive" (11276), which is the layout
 *      being replaced. The OTHER Beaver archive layouts are deliberately left
 *      alone: 11248 "Posts Archive" and 11322 "Post Author Archive" are not in
 *      scope, and empower_style_key()'s branch is is_category() for the same
 *      reason.
 *   5. flushes Elementor's CSS cache and the page cache. A deploy that does
 *      not flush fails as a subset of itself.
 *
 * TO REVERSE THE WHOLE THING:
 *
 *   wp post update 11276 --post_status=publish        # Beaver takes it back
 *   wp post update <ARCHIVE_POST_ID> --post_status=draft
 *   wp elementor flush_css && wp cache flush && wp page-cache flush
 */

import { deployThemePart, setConditions } from './deploy.mjs';
import { categoryArchive, CATEGORY_ARCHIVE_CONDITIONS } from './theme-parts/category-archive.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

/* Set this once, from step 0 above. */
const ARCHIVE_POST_ID = Number(process.argv[2]) || null;

/* Beaver Themer's "Posts Category Archive", read off the install with
   `wp post list --post_type=fl-theme-layout` rather than typed from memory. */
const BEAVER_CATEGORY_ARCHIVE_ID = 11276;

if (!Number.isInteger(ARCHIVE_POST_ID)) {
  console.error(
    'No elementor_library post id. Create it first:\n'
    + "  wp post create --post_type=elementor_library --post_status=publish --post_title='Category archive' --porcelain\n"
    + 'then: node elementor/deploy-archive.mjs <id>',
  );
  process.exit(1);
}

console.log('1/5 syncing theme files (css/archive.css is new)...');
await syncTheme();

console.log(`2/5 writing the tree to ${ARCHIVE_POST_ID} as document type 'archive'...`);
await deployThemePart(ARCHIVE_POST_ID, categoryArchive(), 'archive');

console.log(`3/5 setting conditions ${JSON.stringify(CATEGORY_ARCHIVE_CONDITIONS)}...`);
await setConditions(ARCHIVE_POST_ID, CATEGORY_ARCHIVE_CONDITIONS);

console.log(`4/5 drafting Beaver layout ${BEAVER_CATEGORY_ARCHIVE_ID} ("Posts Category Archive")...`);
await wpe(`wp post update ${BEAVER_CATEGORY_ARCHIVE_ID} --post_status=draft`);

console.log('5/5 flushing...');
await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

console.log('\nDone. Verify with:');
console.log('  CATEGORY_ARCHIVE_URL=https://empv2.wpenginepowered.com/category/community-stories/ \\');
console.log('  TOPIC_ARCHIVE_URL=https://empv2.wpenginepowered.com/category/education/ \\');
console.log('  node --test test-elementor.mjs');
