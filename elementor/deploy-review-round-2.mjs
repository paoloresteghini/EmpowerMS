/* Grant's review round two, 2026-09-16: the three page trees it changes.
 *
 * WHAT IS IN THIS ROUND, and where each piece actually lives:
 *
 *   TEAM (20599)     the header photograph, the board as cards, and the
 *                    section order. All three are page-tree changes.
 *   HOMEPAGE         the podcast block's label.
 *   NEWSLETTER       two lines of copy.
 *
 * THE THREE SOLUTION PAGES ARE NOT HERE, AND THAT IS NOT AN OMISSION. Grant's
 * note about the blue boxes on Quality Education is fixed in css/solution.css
 * with a min-height on `.sol-cap__title`; not one of the three page trees
 * changes. syncTheme() below is the whole of that deploy, and it repairs
 * safety and work at the same time, which were even at desktop by luck rather
 * than by rule. Redeploying those three pages would be three writes that
 * produce byte-identical `_elementor_data`, with all the risk and none of the
 * effect.
 *
 * THE BLUE HERO IS NOT HERE EITHER, and will not be until Grant answers. It
 * exists as dist/final-blue.html on the review site only; there is no
 * elementor/pages/final-blue/, deliberately, because the conversion target is
 * whichever hero Empower keep. css/final-blue.css does reach the install
 * through syncTheme(), because syncTheme publishes the whole of css/ - it is
 * an unreferenced file there and no converted page links it.
 *
 * THE PHOTOGRAPH IS ALREADY IMPORTED and is NOT imported here. Attachment
 * 20735, `advocates-event-conversation`, was created by
 * `node elementor/import-photography.mjs --import` earlier in this session and
 * read back off the install into elementor/photography-2026-09.json and
 * elementor/pages/final/media.mjs. Re-running that script is safe and imports
 * nothing; it is separate from this deploy for the same reason
 * apply-team-roster.mjs is, which is that creating library rows is not
 * something to bury inside a page write.
 *
 * THE BOARD HEADSHOTS ARE THEME ASSETS, not attachments, so they ride in on
 * syncTheme() with the stylesheets. All eight files changed in this round
 * (132x132 squares became 4:5 crops of the same people at source size), and
 * 04-board.mjs's markup now names each one's real intrinsic size. THE SYNC
 * MUST GO FIRST or the eight cards render at the wrong ratio for as long as
 * the old files are in place.
 *
 * NOTHING IS WRITTEN WITHOUT --deploy, the same discipline as
 * deploy-review-round.mjs and deploy-round1.mjs.
 *
 * STANDING HAZARD: syncTheme() copies tokens/, components/, css/, js/, assets/
 * and patterns/ from the repo root with --delete. Anything uncommitted in
 * those six is published as-is and anything deleted locally is deleted on the
 * install. Check `git status` before running.
 *
 * TO REVERSE: every page below keeps Elementor revisions, so a rollback is a
 * revision restore in wp-admin or a redeploy from an earlier commit.
 *
 *   node elementor/deploy-review-round-2.mjs            # explain, change nothing
 *   node elementor/deploy-review-round-2.mjs --deploy
 */
import { pathToFileURL } from 'node:url';
import { deployPage } from './deploy.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

import { POST_ID as TEAM_ID, sections as teamSections } from './pages/team-a/page.mjs';
import { POST_ID as FINAL_ID, sections as finalSections } from './pages/final/page.mjs';
import { POST_ID as MAIL_ID, sections as mailSections } from './pages/mail-a/page.mjs';

/* Each page, with the one sentence that says why it is in this round. A page
   with no reason here is a page nobody meant to redeploy, and deployPage()
   overwrites _elementor_data wholesale. */
const PAGES = [
  [TEAM_ID, teamSections, 'team: the new header photograph, the board as cards, and Board -> Staff -> Fellows'],
  [FINAL_ID, finalSections, 'homepage: the podcast block reads The Empower Podcast, and the doubled eyebrow goes'],
  [MAIL_ID, mailSections, 'newsletter: the hero subtext and the first of the four ticks'],
];

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys Grant\'s review round two. Nothing is written without --deploy.\n\n'
      + '  node elementor/deploy-review-round-2.mjs --deploy\n\n'
      + 'Pages:\n'
      + PAGES.map(([id, , why]) => `  ${id}  ${why}`).join('\n')
      + '\n\nThe theme sync carries the rest of the round and deploys no page:\n'
      + '  css/solution.css   the navy caps are two lines tall on all three solution pages\n'
      + '  css/team-a.css     .ta-headshot, and the board band becomes the staff shape\n'
      + '  assets/headshots/  all eight, 132x132 squares -> 4:5 crops at source size\n'
      + '  assets/photography/advocates-event-conversation.jpg (already attachment 20735)\n\n'
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/,\n'
      + 'tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/3 syncing theme (two stylesheets, eight headshots, one photograph)...');
  await syncTheme();

  for (const [id, sections, why] of PAGES) {
    console.error(`2/3 deploying ${id}: ${why}`);
    await deployPage(id, sections());
  }

  /* A deploy that does not flush fails as a subset of itself: the data is
     right, the page a visitor gets is the previous one, and nothing reports an
     error. Elementor's CSS cache and WP Engine's page cache are separate and
     both have to go. */
  console.error('3/3 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. VERIFY THE RENDER, not the deploy:');
  console.error('  curl -s https://empv2.wpenginepowered.com/team-a/ | grep -c ta-headshot          # 8 board cards');
  console.error('  curl -s https://empv2.wpenginepowered.com/team-a/ | grep -o "advocates-event-conversation[^\\"]*" | head -1');
  console.error('  curl -s https://empv2.wpenginepowered.com/ | grep -o "em-podcast__[a-z]*"        # no __show');
  console.error('  curl -s https://empv2.wpenginepowered.com/newsletter/ | grep -c "under the Dome" # 1');
  console.error('  curl -s https://empv2.wpenginepowered.com/quality-education/ | grep -o "sol-cap__title\\">[^<]*"');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import once and took the whole test suite down with
   it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code ?? 0));
}
