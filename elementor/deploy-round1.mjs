/* DEPLOY EMPOWER'S ROUND-1 FEEDBACK TO empv2: every row of it that is built.
 *
 * Five rows of the 2026-09-04 feedback document land in three page trees, two
 * Loop Item templates and four stylesheets. They deploy together because they
 * were reviewed together and because two of the five are stylesheet-only: a
 * separate run for those would be a theme sync with no page write, which is
 * indistinguishable from a no-op if it silently fails.
 *
 * ROW 2, the homepage stories section, is the substantial one:
 * WHY THIS RUN EXISTS. Empower's round-1 feedback, row 2, on the homepage's
 * stories section:
 *
 *   "Swap out this story; it seems like she is the person talking when they are
 *    two different people. Can we auto-populate to just pull all the community
 *    stripes rather than having a featured?"
 *
 * elementor/pages/final/04-stories.mjs carries the whole argument. In short:
 * the lead card is now a Loop Grid over Community Stories instead of an
 * authored card, so the photograph, the words and the attribution all come from
 * one post and cannot contradict each other.
 *
 * ROW 11, Capitol Chat's hero: its "Listen Now" button pointed at /podcast, the
 * Empower Podcast page. It now anchors to #library-title, this page's own
 * episode library, which is what podcast-a's identically-labelled button
 * already does.
 *
 * ROW 7, Our Solutions' stories button: its href was /latest, and links.mjs
 * resolves that to the all-content page with NO fragment. Empower asked for it
 * to land on the stories band. The href is now /community-stories, which
 * BY_HREF already maps to content-a#band-story. The LABEL was the reason it
 * missed: BY_LABEL is keyed on "Community Stories" and the button reads "Read
 * Community Stories", so it never matched and fell through to the href.
 *
 * ROW 8, the EPIC hero logo, and ROW 6, the navy gap under the last Solutions
 * station, are both css/ only. They reach the install through syncTheme() in
 * step 1 and need no page write, because functions.php enqueues a stylesheet
 * per converted slug and the markup those rules select on has not changed.
 *
 * A DEFECT NOBODY REPORTED IS FIXED IN THE SAME RUN, and it was live.
 * post-excerpt renders NOTHING when a post has an empty post_excerpt and the
 * tag's `apply_to_post_content` is off, which is its default. All 27 Community
 * Stories have an empty post_excerpt, so both mini cards have been rendering a
 * photograph and a headline with the pull-quote slot silently missing. Both
 * loop items now set the flag. This is why the MINI template is redeployed too,
 * and not only the new one: its tree changed.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() and deployLoopItem() overwrite
 * `_elementor_data` wholesale. A bare invocation explains itself and writes
 * nothing; `--deploy` does the work. Same discipline as deploy-content-a.mjs.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme, because css/homepage.css and the child theme's
 *      bridge.css both changed. STANDING HAZARD: syncTheme() copies tokens/
 *      components/ css/ js/ assets/ and patterns/ from the repo ROOT with
 *      --delete, so anything uncommitted in those six directories is published
 *      as-is. Check `git status` before running.
 *   2. writes both Loop Item templates. ORDER MATTERS ONLY FOR DIAGNOSIS, not
 *      correctness: templates first, page second, so that if the page write
 *      fails the templates it references are already the ones it expects,
 *      rather than the page pointing at a template that has not been written.
 *   3. deploys the homepage tree into POST_ID 20588.
 *   4. flushes Elementor's CSS cache and the page cache. A deploy that does not
 *      flush fails as a subset of itself.
 *
 * TO REVERSE: Elementor keeps revisions on posts 20588, 20589 and 20704, so a
 * rollback is a revision restore in wp-admin, or a redeploy from an earlier
 * commit of elementor/pages/final/. Note that 20704 is NEW: an earlier commit
 * has no tree for it at all, and rolling back means pointing the page at 20589
 * again, not restoring 20704.
 */

import { deployPage, deployLoopItem } from './deploy.mjs';
import { POST_ID, sections, loopItems } from './pages/final/page.mjs';
import { POST_ID as CAPITOL_A_POST_ID, sections as capitolASections } from './pages/capitol-a/page.mjs';
import { POST_ID as SOLUTIONS_B_POST_ID, sections as solutionsBSections } from './pages/solutions-b/page.mjs';
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
  const templates = loopItems();

  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys Empower round-1 feedback rows 2, 6, 7, 8 and 11 to empv2.\n'
      + 'Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-round1.mjs --deploy\n\n'
      + `Targets: pages ${POST_ID} (final), ${CAPITOL_A_POST_ID} (capitol-a), `
      + `${SOLUTIONS_B_POST_ID} (solutions-b); loop templates ${templates.map(([id]) => id).join(', ')}.\n`
      + 'Rows 6 and 8 are stylesheet-only and ride along on the theme sync.\n'
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/, tokens/,\n'
      + 'assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/4 syncing theme (homepage.css, epic-a.css, solutions-b.css, bridge.css)...');
  await syncTheme();

  for (const [id, elements] of templates) {
    console.error(`2/4 writing loop item template ${id}...`);
    await deployLoopItem(id, elements);
  }

  console.error(`3/4 deploying the homepage tree into ${POST_ID}...`);
  await deployPage(POST_ID, sections());
  console.error(`3/4 deploying capitol-a into ${CAPITOL_A_POST_ID} (row 11, the Listen Now href)...`);
  await deployPage(CAPITOL_A_POST_ID, capitolASections());
  console.error(`3/4 deploying solutions-b into ${SOLUTIONS_B_POST_ID} (row 7, the stories href)...`);
  await deployPage(SOLUTIONS_B_POST_ID, solutionsBSections());

  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. VERIFY THE RENDER, not the deploy: what this run changes is');
  console.error('invisible to a 200. Fetch the homepage and check that the lead card');
  console.error('shows a Community Story photograph and that story\'s own headline,');
  console.error('and that no card carries a generated excerpt (which arrives with');
  console.error('somebody else\'s byline on this install; 04-stories.mjs has the proof).');
  console.error('  curl -s https://empv2.wpenginepowered.com/ | grep -c em-stories__lead-headline');
  console.error('  curl -s https://empv2.wpenginepowered.com/ | grep -c \'Written by\'   # must be 0');
  console.error('And that the two links now go where Empower asked:');
  console.error('  curl -s https://empv2.wpenginepowered.com/capitol-a/ | grep -o \'href="[^"]*"[^>]*>Listen Now\'');
  console.error('  curl -s https://empv2.wpenginepowered.com/solutions-b/ | grep -o \'href="[^"]*band-story"\'');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import and took the whole test suite down with it the
   first time a test imported it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
