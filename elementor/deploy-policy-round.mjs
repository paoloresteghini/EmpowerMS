/* Empower's policy team round, 2026-09-17: the four page trees it changes.
 *
 * This is the third review round in a week (Grant's round one and round two are
 * elementor/deploy-review-round.mjs and its follow-up), and it is the first that
 * came from Empower's policy team rather than from design. Every item is copy,
 * a photograph, or a reorder; nothing here changes a mechanism.
 *
 * WHAT THIS ROUND DOES NOT CARRY, and why each lives elsewhere:
 *
 *   - THE HEADER AND FOOTER are untouched. No item in this round reaches them,
 *     so elementor/theme-parts/deploy.mjs does NOT need running first. That is
 *     a difference from round one, where the address and the social URLs made
 *     it mandatory, and it is stated so the omission reads as a decision.
 *
 *   - THE "SEE ALL <ISSUE> RESEARCH" BUTTONS are the largest item in Kienna's
 *     email and are deliberately NOT here. They currently resolve through
 *     elementor/links.mjs to content-a with no fragment, which lands a reader
 *     at the top of All Content rather than at that issue's research. The fix
 *     agreed on 2026-09-17 is a label entry per button plus a small script that
 *     pre-checks the type and topic radios from the query string, and it ships
 *     with the Loop Grid work in the next round rather than being half-done in
 *     this one.
 *
 *   - THE "LATEST ON <ISSUE>" AND EPIC "MOST RECENT REPORT" BLOCKS are static
 *     placeholders carrying hand-picked posts, and the oldest of them is dated
 *     January 2023 under a label that says "Most recent report". Agreed
 *     2026-09-17 that they become queries; that is the next round's work and is
 *     not attempted here.
 *
 * THE THREE PHOTOGRAPHS WERE IMPORTED BEFORE THIS SCRIPT EXISTS, through
 * elementor/import-photography.mjs, which is the only route by which a
 * photograph enters this library with its alt attached. Ids 20736, 20737 and
 * 20738, read back off the install into elementor/photography-2026-09.json and
 * mapped in elementor/pages/final/media.mjs. Running this script does not
 * import anything: if an id below is wrong, the page deploys a widget pointing
 * at somebody else's picture and every structural test still passes, which is
 * the hazard final/media.mjs's own header is written about.
 *
 * NOTHING IS WRITTEN WITHOUT --deploy, the same discipline every other deploy
 * script in this directory keeps: a bare run explains itself and touches
 * nothing.
 *
 * STANDING HAZARD: syncTheme() copies tokens/, components/, css/, js/, assets/
 * and patterns/ from the repo root with --delete. Anything uncommitted in those
 * six directories is published as-is, and anything deleted locally is deleted on
 * the install. Check `git status` before running.
 *
 * TO REVERSE: every page below keeps Elementor revisions, so a rollback is a
 * revision restore in wp-admin or a redeploy from an earlier commit.
 *
 *   node elementor/deploy-policy-round.mjs            # explain, change nothing
 *   node elementor/deploy-policy-round.mjs --deploy
 */
import { pathToFileURL } from 'node:url';
import { deployPage } from './deploy.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

import { POST_ID as FINAL_ID, sections as finalSections } from './pages/final/page.mjs';
import { POST_ID as WORK_ID, sections as workSections } from './pages/work/page.mjs';
import { POST_ID as SAFETY_ID, sections as safetySections } from './pages/safety/page.mjs';
import { POST_ID as EPIC_ID, sections as epicSections } from './pages/epic-a/page.mjs';

/* Each page, with the one sentence that says why it is in this round. A page
   with no reason here is a page nobody meant to redeploy, and deployPage()
   overwrites _elementor_data wholesale. */
const PAGES = [
  [FINAL_ID, finalSections,
    'homepage: the fifth Solutions Model step gains its verb ("Support policy implementation")'],
  [WORK_ID, workSections,
    'meaningful work: Economic Opportunity gains "tax and regulatory", and the problem photograph becomes the construction crew'],
  [SAFETY_ID, safetySections,
    'safe communities: Strong Families moves to first, one heading, one inserted clause and two rewritten commitments'],
  [EPIC_ID, epicSections,
    'EPIC: the Meaningful Work and Safe Communities area photographs'],
];

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys Empower\'s policy team round. Nothing is written without --deploy.\n\n'
      + '  node elementor/deploy-policy-round.mjs --deploy\n\n'
      + 'Pages:\n'
      + PAGES.map(([id, , why]) => `  ${id}  ${why}`).join('\n')
      + '\n\nNo theme part and no archive deploy is needed for this round.\n'
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/,\n'
      + 'tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/3 syncing theme (three new photographs in assets/photography)...');
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

  console.error('\nDone. VERIFY THE RENDER, not the deploy. What matters here is:');
  console.error('  curl -s https://empv2.wpenginepowered.com/ | grep -o "Support policy implementation"');
  console.error('  curl -s https://empv2.wpenginepowered.com/safe-communities/ | grep -o "<h3>[^<]*</h3>"   # Strong Communities first');
  console.error('  curl -s https://empv2.wpenginepowered.com/safe-communities/ | grep -c "exploring what has worked elsewhere"');
  console.error('  curl -s https://empv2.wpenginepowered.com/meaningful-work/ | grep -o "construction-crew-scaffolding[^\\"]*"');
  console.error('  curl -s https://empv2.wpenginepowered.com/epic/ | grep -o "colleagues-in-discussion[^\\"]*"');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import once and took the whole test suite down with
   it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code ?? 0));
}
