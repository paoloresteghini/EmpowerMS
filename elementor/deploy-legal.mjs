/* DEPLOY THE TWO LEGAL PAGES (privacy, terms) TO empv2.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() overwrites `_elementor_data`
 * wholesale, so this script's only argument is the difference between reading
 * about a deploy and performing one. A bare invocation explains itself and
 * writes nothing; `--deploy` does the work. Same discipline as
 * deploy-archive.mjs and deploy-content-a.mjs.
 *
 * WHY BOTH PAGES IN ONE SCRIPT. They are two fills of one template, they share
 * css/legal.css, and they were signed off as one decision. Deploying one
 * without the other would leave the footer's two links pointing at one
 * converted page and one legacy one.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme, because css/legal.css is new and
 *      wp/empowerms-child/functions.php gained two style-map keys.
 *      NOTE the standing hazard: syncTheme() copies tokens/ components/ css/
 *      js/ assets/ and patterns/ from the repo ROOT with --delete, so anything
 *      uncommitted in those six directories is published as-is. Checked before
 *      the 2026-09-02 run: only css/legal.css (new, wanted) and css/chooser.css
 *      (the legal set's filter rules, wanted). The peer session's uncommitted
 *      roster work is in src/ and elementor/, neither of which is synced.
 *      Check `git status` again before the next one.
 *   2. deploys both page trees.
 *   3. flushes Elementor's CSS cache and the page cache. A deploy that does not
 *      flush fails as a subset of itself.
 *
 * WHAT IT DELIBERATELY DOES NOT DO, and both matter:
 *
 *   THE FOOTER IS NOT REDEPLOYED. src/_shared/footer.html now carries two legal
 *   links where it carried one, but elementor/theme-parts/footer.mjs has not
 *   been updated to match and this script does not touch it. That part renders
 *   on every page of the install, so changing it lands on all fourteen
 *   signed-off pages at once. It is a separate decision and a separate deploy.
 *   Until it runs, both converted pages carry the old single "Privacy Policy &
 *   Terms of Service" link, exactly as the other pages do.
 *
 *   THE OLD TERMS URL IS NOT REDIRECTED. /wpautoterms/terms-and-conditions/
 *   still resolves and still serves the plugin's own copy. Redirecting it, and
 *   retiring the plugin that injects a white strip under the footer of every
 *   page, are written up in docs/legal/plugin-proposal.md and are Empower's
 *   call rather than a deploy step.
 *
 * TO REVERSE. Privacy is WordPress's own page 3 and has Elementor revisions, so
 * a rollback is a revision restore in wp-admin — but note that page 3 was
 * plain editor content before this, so the true "before" is the post_content
 * that is still there untouched; deleting the `_elementor_edit_mode` meta hands
 * the page back to the theme's page.php. Terms is page 20649, created for this
 * conversion on 2026-09-02, so reversing it is `wp post delete 20649` (the old
 * document is untouched at its plugin URL either way).
 */

import { deployPage } from './deploy.mjs';
import { POST_ID as PRIVACY_ID, sections as privacySections } from './pages/privacy/page.mjs';
import { POST_ID as TERMS_ID, sections as termsSections } from './pages/terms/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
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
      'Deploys the two legal pages (privacy, terms) to empv2. Nothing is written without --deploy.\n\n'
      + '  node build.mjs        # the page trees read their prose out of dist/\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-legal.mjs --deploy\n\n'
      + `Targets: post ${PRIVACY_ID} (privacy-policy) and post ${TERMS_ID} (terms).\n`
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/,\n'
      + 'tokens/, assets/ and patterns/ from the repo root with --delete.\n'
      + 'The footer theme part is NOT redeployed by this script; see the docblock.',
    );
    return 1;
  }

  console.error('1/4 syncing theme files (css/legal.css is new, functions.php gained two keys)...');
  await syncTheme();

  console.error(`2/4 deploying privacy into ${PRIVACY_ID}...`);
  await deployPage(PRIVACY_ID, privacySections());

  console.error(`3/4 deploying terms into ${TERMS_ID}...`);
  await deployPage(TERMS_ID, termsSections());

  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify with:');
  console.error('  PRIVACY_URL=https://empv2.wpenginepowered.com/privacy-policy/ \\');
  console.error('  TERMS_URL=https://empv2.wpenginepowered.com/terms/ \\');
  console.error('  node --test test-elementor.mjs');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import and took the whole test suite down with it the
   first time a test imported it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
