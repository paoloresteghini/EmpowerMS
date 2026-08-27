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
 *   4. drafts the two Beaver layouts this template replaces: 11276 "Posts
 *      Category Archive" and, since 2026-08-27, 11248 "Posts Archive".
 *      11322 "Post Author Archive" is deliberately left alone -- author
 *      archives are not converted, and empower_style_key()'s branch is
 *      `is_category() || is_home()` rather than is_archive() for that reason.
 *   5. flushes Elementor's CSS cache and the page cache. A deploy that does
 *      not flush fails as a subset of itself.
 *
 * TO REVERSE THE WHOLE THING:
 *
 *   wp post update 11276 11248 --post_status=publish  # Beaver takes them back
 *   wp post update <ARCHIVE_POST_ID> --post_status=draft
 *   wp elementor flush_css && wp cache flush && wp page-cache flush
 */

import { deployThemePart, setConditions } from './deploy.mjs';
import { categoryArchive, CATEGORY_ARCHIVE_CONDITIONS } from './theme-parts/category-archive.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
import { pathToFileURL } from 'node:url';

/* Beaver Themer's two listing layouts, read off the install with
   `wp post list --post_type=fl-theme-layout` rather than typed from memory.
   Both are replaced by the one Elementor document: 11276 by the
   `include/archive/category` condition and 11248 by `include/archive/post_archive`
   (the posts page, /updates/, added 2026-08-27). */
const BEAVER_LAYOUTS = [
  { id: 11276, title: 'Posts Category Archive' },
  { id: 11248, title: 'Posts Archive' },
];

const CREATE_COMMAND =
  "wp post create --post_type=elementor_library --post_status=publish "
  + "--post_title='Category archive' --porcelain";

/* THREE MODES, AND ONLY ONE OF THEM DEPLOYS.
 *
 * Exported, and pure, because this is the function that decides whether a live
 * write happens and it is the only part of this file a test can reach. The
 * shape it must refuse is not hypothetical: `<id>` is the literal placeholder
 * from the instructions this script shipped with, and it is what got typed.
 *
 * `--create` deliberately does not chain into the deploy. Creating the post is
 * one write to Empower's install and deploying into it is another; keeping
 * them apart is what makes the id something a human has read before anything
 * is written to it. */
export function parseArgs(argv) {
  const [first, ...rest] = argv;
  if (!first) return { mode: 'explain' };
  if (first === '--create') return rest.length ? { mode: 'explain' } : { mode: 'create' };

  /* A positive integer and nothing else. Number() alone would accept '20699.5',
     ' 20699' and '0x50', none of which is a post id. */
  if (!/^[1-9]\d*$/.test(first) || rest.length) return { mode: 'explain' };
  return { mode: 'deploy', postId: Number(first) };
}

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);

  if (parsed.mode === 'explain') {
    console.error(
      'Usage, with the install credentials loaded first:\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-archive.mjs --create      # creates the post, prints its id\n'
      + '  node elementor/deploy-archive.mjs <that id>     # deploys into it\n\n'
      + 'wp is not a local command; both steps run over SSH through wpe().',
    );
    return 1;
  }

  if (parsed.mode === 'create') {
    const id = (await wpe(CREATE_COMMAND)).trim();
    console.log(id);
    console.error(`\nCreated. Now: node elementor/deploy-archive.mjs ${id}`);
    return 0;
  }

  const { postId } = parsed;

  console.error('1/5 syncing theme files (css/archive.css is new)...');
  await syncTheme();

  console.error(`2/5 writing the tree to ${postId} as document type 'archive'...`);
  await deployThemePart(postId, categoryArchive(), 'archive');

  console.error(`3/5 setting conditions ${JSON.stringify(CATEGORY_ARCHIVE_CONDITIONS)}...`);
  await setConditions(postId, CATEGORY_ARCHIVE_CONDITIONS);

  for (const { id, title } of BEAVER_LAYOUTS) {
    console.error(`4/5 drafting Beaver layout ${id} ("${title}")...`);
    await wpe(`wp post update ${id} --post_status=draft`);
  }

  console.error('5/5 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify with:');
  console.error('  CATEGORY_ARCHIVE_URL=https://empv2.wpenginepowered.com/category/community-stories/ \\');
  console.error('  TOPIC_ARCHIVE_URL=https://empv2.wpenginepowered.com/category/education/ \\');
  console.error('  node --test test-elementor.mjs');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. It used to run on import and exit the
   process, which took the whole test suite down with it the first time a test
   imported it. Only direct execution runs main(). */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
