/* DEPLOY THE TEAM PAGE'S ROSTER WORK TO empv2. Empower's round 1, row 5.
 *
 * THREE THINGS LAND TOGETHER because they are one change to one page:
 *
 *   1. The `.ta-note` line is gone. "In alphabetical order by last name" sat
 *      under Our Team; Empower asked for it out. The SORT stays and
 *      inc/person-loop.php still computes it.
 *   2. The board's eight monogram tiles are Empower's own headshots, shipped as
 *      THEME ASSETS through syncTheme() rather than as media library
 *      attachments. 04-board.mjs carries that argument in full; the short
 *      version is that the whole roll is one authored html() widget, so a
 *      photograph Empower could swap in wp-admin would be sitting beside a name
 *      they could not.
 *   3. `.ta-pending` comes out with them. It was build scaffolding naming what
 *      was missing, and nothing is.
 *
 * IT DOES NOT TOUCH THE FELLOWS OR THE STAFF, because those come from the
 * `person` CPT and are database state. `elementor/apply-team-roster.mjs --apply`
 * is what changes them and it is a SEPARATE RUN, deliberately: publishing J.
 * Robertson and drafting two people is not something to bury inside a page
 * deploy. Run it first; this script checks that it has been.
 *
 * THE THEME SYNC MUST GO FIRST, and unusually it is not the standing hazard
 * here but the point of the run: the page tree written in step 3 references
 * eight files under wp-content/themes/empowerms-child/assets/headshots/, and in
 * the other order the board renders eight broken images. NOTE the hazard is
 * still real for everything else: syncTheme() publishes css/, js/, components/,
 * tokens/, assets/ and patterns/ from the repo root with --delete, so check
 * `git status` before running.
 *
 * TO REVERSE: `git revert` and run again. The page has never been a Beaver page.
 */
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { deployPage } from './deploy.mjs';
import { POST_ID, sections } from './pages/team-a/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

/* The eight files 04-board.mjs's markup names, checked on disk before the run
   rather than found missing as a broken image afterwards. */
export const HEADSHOTS = [
  'abb-payne', 'gerard-gibert', 'grant-callen', 'sunny-desai',
  'betsy-dowell', 'lex-lindsey', 'marie-sanderson', 'george-williams',
];

export function missingHeadshots(dir = 'assets/headshots') {
  let present = [];
  try { present = readdirSync(dir); } catch { return HEADSHOTS; }
  return HEADSHOTS.filter(h => !present.includes(`${h}.jpg`));
}

/* The roster this page renders, read off the install. Fellows are `publish`
   `person` posts whose position_title begins with "Fellow"; that split is
   inc/person-loop.php's and this only has to agree with it. */
export async function fellowsOnInstall(run = wpe) {
  const sql = "SELECT p.post_title FROM wp_posts p "
    + "JOIN wp_postmeta m ON m.post_id = p.ID AND m.meta_key = 'position_title' "
    + "WHERE p.post_type = 'person' AND p.post_status = 'publish' AND m.meta_value LIKE 'Fellow%' "
    + "ORDER BY p.post_title";
  const out = await run(`wp db query "${sql}" --skip-column-names`);
  return out.trim().split('\n').map(s => s.trim()).filter(Boolean);
}

export const EXPECTED_FELLOWS = ['Conor Norris', 'J. Robertson', 'Matt Ladner', 'Rebekah Staples'];

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys the team page to empv2. Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/apply-team-roster.mjs --apply   # first, and only once\n'
      + '  node elementor/deploy-team-roster.mjs --deploy\n\n'
      + `Target: post ${POST_ID} (team-a). Check \`git status\` first: syncTheme() publishes\n`
      + 'css/, js/, components/, tokens/, assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  const missing = missingHeadshots();
  if (missing.length) {
    throw new Error(
      `${missing.length} board headshot(s) are not in assets/headshots/: ${missing.join(', ')}. `
      + 'The board roll names them by filename, so this would deploy broken images into a list '
      + 'of eight real people.'
    );
  }
  console.error(`1/4 all ${HEADSHOTS.length} board headshots present on disk`);

  console.error('2/4 checking the fellows on the install...');
  const fellows = await fellowsOnInstall();
  console.error(`  ${fellows.join(', ') || '(none)'}`);
  const surprise = fellows.filter(f => !EXPECTED_FELLOWS.includes(f));
  const absent = EXPECTED_FELLOWS.filter(f => !fellows.includes(f));
  if (surprise.length || absent.length) {
    /* Loud rather than fatal: the page will deploy correctly either way, and
       who is a fellow is Empower's to change in wp-admin without telling this
       repository. What must not happen quietly is this deploy going out while
       the roster still disagrees with roadmap (6). */
    console.error('  ROSTER DOES NOT MATCH roadmap (6):');
    for (const f of surprise) console.error(`    unexpected: ${f}`);
    for (const f of absent) console.error(`    missing:    ${f}`);
    console.error('  Run `node elementor/apply-team-roster.mjs` to see what it would change.');
  }

  console.error('3/4 syncing theme (assets/headshots/ is new, css/team-a.css gained .ta-roll__photo)...');
  await syncTheme();

  console.error(`4/4 deploying the team-a tree into ${POST_ID}...`);
  await deployPage(POST_ID, sections());

  console.error('flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. VERIFY THE RENDER:');
  console.error('  curl -s https://empv2.wpenginepowered.com/team/ | grep -c ta-roll__photo   # 8');
  console.error('  curl -s https://empv2.wpenginepowered.com/team/ | grep -c ta-pending       # 0');
  console.error('  curl -s https://empv2.wpenginepowered.com/team/ | grep -c ta-note          # 0');
  console.error('And that the eight images actually load; a 404 renders as an empty circle,');
  console.error('which at 44px reads as a design choice rather than a broken file.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
