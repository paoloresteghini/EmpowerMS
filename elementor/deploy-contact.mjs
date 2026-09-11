/* DEPLOY THE CONTACT PAGE TO empv2.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() overwrites `_elementor_data`
 * wholesale, so this script's only argument is the difference between reading
 * about a deploy and performing one. Same discipline as deploy-legal.mjs.
 *
 * THIS IS THE FIRST DEPLOY IN THIS BUILD THAT TOUCHES A WORKING ROUTE.
 * Post 11345 currently renders in Beaver Builder and carries Gravity Form 3,
 * which held 3,116 entries when this was written, most recent 2026-07-28. The
 * converted page carries the SAME form, by shortcode, so no message is lost —
 * but read elementor/pages/contact/02-form.mjs before changing anything here,
 * because the failure mode is a page that looks right and silently stops
 * delivering mail.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme: css/contact.css is new, bridge.css gained block 77
 *      (which dresses Gravity Forms' own markup), and functions.php gained the
 *      `contact` style-map key. NOTE the standing hazard: syncTheme() copies
 *      tokens/ components/ css/ js/ assets/ and patterns/ from the repo ROOT
 *      with --delete, so anything uncommitted in those six directories is
 *      published as-is. Check `git status` before running.
 *   2. deploys the page tree into POST_ID 11345.
 *   3. flushes Elementor's CSS cache and the page cache. A deploy that does not
 *      flush fails as a subset of itself.
 *
 * VERIFY THE FORM, NOT ONLY THE PAGE. The page rendering correctly proves the
 * shortcode expanded; it does not prove a message arrives. After deploying,
 * send one through the live form and confirm the entry count rises:
 *
 *   wp db query "SELECT COUNT(*) FROM wp_gf_entry WHERE form_id=3"
 *
 * TO REVERSE: the page was Beaver-built, so its Beaver layout data is still on
 * the post untouched. Deleting the `_elementor_edit_mode` meta hands it back:
 *   wp post meta delete 11345 _elementor_edit_mode
 */

import { deployPage } from './deploy.mjs';
import { POST_ID, sections } from './pages/contact/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys the Contact page to empv2. Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-contact.mjs --deploy\n\n'
      + `Target: post ${POST_ID}, which currently renders in Beaver Builder and carries\n`
      + 'Gravity Form 3 (3,116 entries). The converted page carries the same form by\n'
      + 'shortcode. Check `git status` first: syncTheme() publishes css/, js/,\n'
      + 'components/, tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/3 syncing theme files (css/contact.css is new, bridge block 77, style-map key)...');
  await syncTheme();

  console.error(`2/4 deploying the page tree into ${POST_ID}...`);
  await deployPage(POST_ID, sections());

  /* THE STEP THAT ACTUALLY CHANGES WHAT A VISITOR SEES, and the one the legal
     pages did not need. Post 11345 was built in Beaver BUILDER (not Themer), so
     it carries `_fl_builder_enabled = 1`, and Beaver wins the render even once
     Elementor's own meta is in place. Found the hard way on 2026-09-02: the
     first deploy of this page reported success, wrote 2,334 bytes of
     _elementor_data, set _elementor_edit_mode to `builder` — and the live page
     went on serving the Beaver layout, with none of this build's classes on it.

     Every page converted before this one began as plain editor content and had
     no such flag, which is why this is the first script that needs the line.
     The survey counted 45 Beaver Builder pages on the install; every one of
     them will need it.

     TO REVERSE THE WHOLE CONVERSION: `wp post meta update 11345
     _fl_builder_enabled 1` hands the page straight back to Beaver, with its
     layout data untouched. That is a better revert than deleting Elementor's
     meta, because it is one value and it restores the exact page that was
     serving the form before. */
  console.error('3/4 handing the page from Beaver Builder to Elementor...');
  await wpe(`wp post meta update ${POST_ID} _fl_builder_enabled 0`);

  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify the PAGE with:');
  console.error('  CONTACT_URL=https://empv2.wpenginepowered.com/contact/ node --test test-elementor.mjs');
  console.error('Then verify the FORM by sending one message through it and checking the count rises.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
