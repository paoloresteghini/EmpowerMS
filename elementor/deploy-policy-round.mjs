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
 *   - THE "LATEST ON <ISSUE>" AND EPIC "MOST RECENT REPORT" BLOCKS need nothing,
 *     and this file's first version said they were hand-picked placeholders due
 *     to become queries. THAT WAS WRONG. They were converted on 2026-09-10/09-11
 *     and run as [empower_solution_latest] and [empower_epic_latest_report],
 *     backed by wp/empowerms-child/inc/solution-latest.php. The claim came from
 *     reading the static build's own 07-latest.html, which hard-codes example rows
 *     because the static build has no database to query. Check the rendered
 *     page, not the static build.
 *
 * THE "SEE ALL <ISSUE> RESEARCH" BUTTONS SHIP HERE, added 2026-09-17 after the
 * above. They resolved through elementor/links.mjs to content-a with no
 * fragment, landing a reader at the top of All Content rather than at that
 * issue's research; EPIC's equivalent worked only because its label is in
 * BY_LABEL. The fix needed NO change to links.mjs at all: resolveHref() already
 * carries a source href's query string through untouched (it is what give-c's
 * gift tiles depend on), so the query lives on the button's own href and
 * /latest?type=research&topic=safety resolves to
 * /all-content/?type=research&topic=safety by the existing rule.
 *
 * js/content-filter.js reads those two values and ticks the matching radios.
 * It is registered in empower_page_scripts() against the 'all-content' slug,
 * which is the per-page script route functions.php has carried unused since
 * the header became a theme part. Progressive enhancement: without it the bar
 * keeps its authored "All" selection and the reader lands where the button used
 * to take them. Both files travel through syncTheme() below.
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
import { POST_ID as EDUCATION_ID, sections as educationSections } from './pages/education/page.mjs';

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
  [EDUCATION_ID, educationSections,
    'quality education: the research button only, which is why this page is in the round at all'],
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
  console.error('  curl -s https://empv2.wpenginepowered.com/safe-communities/ | grep -o "all-content/?type=research[^\\"]*"');
  console.error('  curl -s https://empv2.wpenginepowered.com/all-content/ | grep -c content-filter.js');
  return 0;
}

/* IMPORTING THIS FILE MUST DO NOTHING. Only direct execution runs main(); the
   archive script ran on import once and took the whole test suite down with
   it. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code ?? 0));
}
