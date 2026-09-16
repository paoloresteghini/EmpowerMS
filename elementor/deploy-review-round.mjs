/* Grant's review round one, 2026-09-16: the seven page trees it changes.
 *
 * WHAT THIS SCRIPT DOES NOT DO, and why each one lives somewhere else:
 *
 *   - THE HEADER AND FOOTER are Theme Builder parts, not pages, and
 *     elementor/theme-parts/deploy.mjs already deploys them and re-asserts
 *     their conditions afterwards. Run it first:
 *         node elementor/theme-parts/deploy.mjs header footer
 *     Both changed in this round (the address, the five social URLs and
 *     LinkedIn in the footer; All Content becoming a link plus a disclosure
 *     in the header), and both render on every page of the install, so they
 *     are the one part of this round that reaches pages nobody edited.
 *
 *   - THE CATEGORY AND AUTHOR ARCHIVE is a Theme Builder archive document
 *     with its own script and its own conditions:
 *         node elementor/deploy-archive.mjs 20644
 *     That is the deploy that carries the current_query fix, and it is the
 *     most consequential one in the round.
 *
 *   - THE AMBASSADOR CHECKBOX LABELS are not in this repository at all. The
 *     converted page carries Gravity Form 37 by shortcode
 *     (pages/amb-a/04-join.mjs:141), so the three labels are a form edit in
 *     wp-admin. The static stand-in in src/ mirrors them and test.mjs holds
 *     both sides to each other; nothing deploys.
 *
 *   - THE CONTACT PAGE'S META DESCRIPTION carries the old street address and
 *     is an SEO deploy, not a page deploy: elementor/deploy-seo.mjs.
 *
 * THE LOOP ITEM IS DEPLOYED HERE, and this is the first script to deploy it.
 * Post 20572, the podcast episode card, had no committed deploy path: it was
 * written by hand during the conversion spike and theme-parts/deploy.mjs:81
 * names the gap in as many words. This round rewrites it (card to row), so
 * the path exists now. It is written BEFORE the page that points at it, so a
 * failure leaves the page pointing at the template it already expected rather
 * than at a half-written one.
 *
 * NOTHING IS WRITTEN WITHOUT --deploy. Same discipline as deploy-round1.mjs
 * and deploy-content-a.mjs: a bare run explains itself and touches nothing.
 *
 * STANDING HAZARD, and it is the reason for the git check below: syncTheme()
 * copies tokens/, components/, css/, js/, assets/ and patterns/ from the repo
 * root with --delete. Anything uncommitted in those six directories is
 * published as-is, and anything deleted locally is deleted on the install.
 *
 * TO REVERSE: every page below keeps Elementor revisions, so a rollback is a
 * revision restore in wp-admin or a redeploy from an earlier commit.
 *
 *   node elementor/deploy-review-round.mjs            # explain, change nothing
 *   node elementor/deploy-review-round.mjs --deploy
 */
import { pathToFileURL } from 'node:url';
import { deployPage, deployLoopItem } from './deploy.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

import { POST_ID as FINAL_ID, sections as finalSections } from './pages/final/page.mjs';
import { POST_ID as WHO_ID, sections as whoSections } from './pages/who-we-are-a/page.mjs';
import { POST_ID as WHAT_ID, sections as whatSections } from './pages/what-we-do-a/page.mjs';
import { POST_ID as SOLUTIONS_ID, sections as solutionsSections } from './pages/solutions-b/page.mjs';
import { POST_ID as WORK_ID, sections as workSections } from './pages/work/page.mjs';
import { POST_ID as PODCAST_ID, sections as podcastSections } from './pages/podcast-a/page.mjs';
import { POST_ID as CONTACT_ID, sections as contactSections } from './pages/contact/page.mjs';
import { loopItem as podcastLoopItem } from './pages/podcast-a/03-library.mjs';

/* Post 20572, "Podcast Episode Card". Read off the install rather than typed:
   `wp post list --post_type=elementor_library --format=csv`. */
const PODCAST_LOOP_ITEM_ID = 20572;

/* Each page, with the one sentence that says why it is in this round. A page
   with no reason here is a page nobody meant to redeploy, and deployPage()
   overwrites _elementor_data wholesale. */
const PAGES = [
  [FINAL_ID, finalSections, 'homepage: the newsletter and Bring it Home copy, and two of the three foundation photographs'],
  [WHO_ID, whoSections, 'who we are: both hero photographs and the Our Story photograph'],
  [WHAT_ID, whatSections, 'what we do: the Meaningful Work photograph'],
  [SOLUTIONS_ID, solutionsSections, 'our solutions: the Meaningful Work photograph, 5:4 crop'],
  [WORK_ID, workSections, 'meaningful work: the first solution is replaced and moved second'],
  [PODCAST_ID, podcastSections, 'podcast: the playlist link, the three platform marks, and the library as rows'],
  [CONTACT_ID, contactSections, 'contact: the Northpark address'],
];

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys Grant\'s review round one. Nothing is written without --deploy.\n\n'
      + '  node elementor/deploy-review-round.mjs --deploy\n\n'
      + 'Pages:\n'
      + PAGES.map(([id, , why]) => `  ${id}  ${why}`).join('\n')
      + `\n  loop item ${PODCAST_LOOP_ITEM_ID}  the episode card becomes an episode row\n\n`
      + 'RUN THESE TWO FIRST, they are not in this script:\n'
      + '  node elementor/theme-parts/deploy.mjs header footer\n'
      + '  node elementor/deploy-archive.mjs 20644\n\n'
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/,\n'
      + 'tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/4 syncing theme (six stylesheets and seven new photographs)...');
  await syncTheme();

  console.error(`2/4 writing loop item template ${PODCAST_LOOP_ITEM_ID} (row, not card)...`);
  await deployLoopItem(PODCAST_LOOP_ITEM_ID, podcastLoopItem());

  for (const [id, sections, why] of PAGES) {
    console.error(`3/4 deploying ${id}: ${why}`);
    await deployPage(id, sections());
  }

  /* A deploy that does not flush fails as a subset of itself: the data is
     right, the page a visitor gets is the previous one, and nothing reports
     an error. Elementor's CSS cache and WP Engine's page cache are separate
     and both have to go. */
  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. VERIFY THE RENDER, not the deploy. What matters here is:');
  console.error('  curl -s https://empv2.wpenginepowered.com/podcast/ | grep -c pca-ep__title   # 12 rows');
  console.error('  curl -s https://empv2.wpenginepowered.com/podcast/ | grep -c pca-platform    # 3 marks');
  console.error('  curl -s https://empv2.wpenginepowered.com/meaningful-work/ | grep -o "sol-cap__title\\">[^<]*"');
  console.error('  curl -s https://empv2.wpenginepowered.com/who-we-are/ | grep -o "team-conversation-event[^\\"]*"');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import once and took the whole test suite down with
   it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code ?? 0));
}
