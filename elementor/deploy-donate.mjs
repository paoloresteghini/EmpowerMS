/* DEPLOY THE DONATE PAGE TO empv2, WITH THE FORM THAT TAKES THE MONEY ON IT.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() overwrites `_elementor_data`
 * wholesale, so this script's only argument is the difference between reading
 * about a deploy and performing one. Same discipline as deploy-contact.mjs.
 *
 * WHAT THIS FIXES. /donate/ is post 20606, this build's converted give-c, and
 * it is the destination of the header Donate button, the nav, and every amount
 * tile on the page itself. Until this deploy it carried no form: Empower's
 * Gravity Form 4 was on the old Beaver page, which the slug rename moved to
 * /donate-old/. A donation route on which nobody could donate.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme. Two things are new and BOTH are required for the
 *      tiles to work: css/give-c.css gained the .gvc-form block, and
 *      inc/donate-prepopulate.php maps our URL slugs onto form 4's own choice
 *      values. NOTE the standing hazard: syncTheme() copies tokens/
 *      components/ css/ js/ assets/ and patterns/ from the repo ROOT with
 *      --delete, so anything uncommitted in those six directories is published
 *      as-is. Check `git status` before running.
 *   2. deploys the page tree into POST_ID 20606.
 *   3. flushes Elementor's CSS cache and the page cache. A deploy that does not
 *      flush fails as a subset of itself.
 *
 * THE THIRD PIECE IS NOT IN THIS SCRIPT, and cannot be. Gravity Forms only
 * reads a field from the URL when that field carries a parameter name, and
 * that setting lives in the DATABASE, on form 4. It is written by
 * elementor/apply-donate-prepopulate.mjs, it does not travel with this
 * repository, and it has to be run again against production at cutover.
 * This script checks it before deploying rather than after, because a page
 * that renders the form correctly while ignoring every tile is exactly the
 * failure that looks like success.
 *
 * VERIFY THE POPULATION, NOT ONLY THE PAGE, and verify it by READING. Three
 * Stripe feeds are active on this install and the add-on's api_mode is unset,
 * which is not the same as being in test mode: do not submit a donation to
 * find out whether the form works. Fetch /donate/?gift_type=monthly and look
 * for the Monthly Gift radio coming back checked.
 *
 * TO REVERSE: the page was built by this repository from the start, so there
 * is no Beaver layout underneath it to hand back to. Removing the form is
 * dropping form() from pages/give-c/page.mjs and redeploying; switching the
 * tiles back off is `node elementor/apply-donate-prepopulate.mjs --remove`.
 */

import { deployPage } from './deploy.mjs';
import { POST_ID, sections } from './pages/give-c/page.mjs';
import { readFields, planFor, WANTED } from './apply-donate-prepopulate.mjs';
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
      'Deploys the Donate page to empv2, with Gravity Form 4 embedded on it.\n'
      + 'Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-donate.mjs --deploy\n\n'
      + `Target: post ${POST_ID} (/donate/). Check \`git status\` first: syncTheme() publishes\n`
      + 'css/, js/, components/, tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  /* FIRST, BECAUSE IT IS THE PIECE THAT CANNOT BE SEEN. Everything else here
     is visible on the page afterwards; this is not. A form with no parameter
     names renders perfectly and ignores every tile silently. */
  console.error('1/4 checking form 4 still carries its parameter names...');
  const pending = planFor(await readFields()).filter((s) => s.kind !== 'already');
  if (pending.length) {
    console.error(
      `\nform 4 is not set up to be populated from the URL: ${pending.map((s) => `field ${s.id} -> ${WANTED[s.id]}`).join(', ')}.\n`
      + 'Deploying now would publish a donate page whose every tile is ignored, with no visible\n'
      + 'symptom. Run this first, then deploy:\n\n'
      + '  node elementor/apply-donate-prepopulate.mjs --apply',
    );
    return 1;
  }

  console.error('2/4 syncing theme files (css/give-c.css .gvc-form block, inc/donate-prepopulate.php)...');
  await syncTheme();

  console.error(`3/4 deploying the page tree into ${POST_ID}...`);
  await deployPage(POST_ID, sections());

  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify with:');
  console.error('  HOME_URL=https://empv2.wpenginepowered.com/ node --test test-elementor.mjs');
  console.error('Read the form, do not submit it: the Stripe feeds on this install are active.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
