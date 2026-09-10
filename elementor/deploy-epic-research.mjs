/* DEPLOY EPIC'S THREE "MOST RECENT REPORT" SLOTS TO empv2.
 *
 * The last of the three places on this site that held a hand-written list of
 * research. The homepage insights band and content-a's Research band went on
 * 2026-09-09; this is the third, and it is the one whose own `data-cms-note`
 * has claimed since the static build that "only this title, its href and the
 * date below it come from a query" while all three were typed.
 *
 * WHAT MOVES. Two files, and only one of them is a page:
 *
 *   wp/empowerms-child/inc/epic-research.php  the shortcode and its query
 *   elementor/pages/epic-a/04-research.mjs    three widgets become one
 *
 * THE THEME SYNC MUST GO FIRST, and here that is the opposite of the standing
 * hazard rather than an instance of it. The usual complaint is that syncTheme()
 * publishes new CSS against old markup for the length of a run. This run
 * publishes a new CAPABILITY: the page tree written in step 3 contains
 * `[empower_epic_latest_report]`, and a page carrying that shortcode on an
 * install whose theme does not register it renders the square brackets, as
 * text, in the middle of the research section. In the other order the interim
 * page is simply the old one.
 *
 * THE CATEGORY IS CHECKED BEFORE ANYTHING IS WRITTEN. The shortcode resolves
 * `research-reports` by slug at render time and returns an empty string when it
 * cannot find it, so a deploy onto an install without the category produces
 * three panels that end at the photograph and the area name, with no error
 * anywhere. That is exactly the production case:
 * docs/staging-to-prod-database.md's first cutover command is
 * `elementor/apply-research-category.mjs --apply`, and this script refuses to
 * run until it has been.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() overwrites `_elementor_data`
 * wholesale. Same discipline as deploy-contact.mjs and deploy-legal.mjs.
 *
 * TO REVERSE: `git revert` the commit and run this again. The page was created
 * for this conversion and has never been a Beaver page, so there is no
 * `_fl_builder_enabled` to think about.
 */

import { pathToFileURL } from 'node:url';
import { deployPage } from './deploy.mjs';
import { POST_ID, sections } from './pages/epic-a/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';

/* The same question the shortcode asks, asked once per area from here so the
   operator sees the answer BEFORE the page is written rather than by reading
   the rendered page afterwards. One query for all three, because this install
   charges tens of seconds for a trivial call. */
const PREFLIGHT_SQL =
  "SELECT t_a.slug, p.post_date, p.post_title FROM wp_posts p "
  + "JOIN wp_term_relationships tr_r ON tr_r.object_id = p.ID "
  + "JOIN wp_term_taxonomy tt_r ON tt_r.term_taxonomy_id = tr_r.term_taxonomy_id AND tt_r.taxonomy = 'category' "
  + "JOIN wp_terms t_r ON t_r.term_id = tt_r.term_id AND t_r.slug = 'research-reports' "
  + "JOIN wp_term_relationships tr_a ON tr_a.object_id = p.ID "
  + "JOIN wp_term_taxonomy tt_a ON tt_a.term_taxonomy_id = tr_a.term_taxonomy_id AND tt_a.taxonomy = 'category' "
  + "JOIN wp_terms t_a ON t_a.term_id = tt_a.term_id AND t_a.slug IN ('education','work','justice') "
  + "WHERE p.post_type = 'post' AND p.post_status = 'publish' "
  + "ORDER BY t_a.slug, p.post_date DESC";

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

/* Exported for the test: the newest row per area, from the raw rows. The
   ordering is done in SQL, so this only has to keep the first of each. */
export function newestPerArea(rows) {
  const newest = new Map();
  for (const row of rows) {
    const [slug, date, ...rest] = row.split('\t');
    if (!slug || newest.has(slug)) continue;
    newest.set(slug, { date, title: rest.join('\t') });
  }
  return newest;
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Deploys EPIC\'s three report slots to empv2. Nothing is written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-epic-research.mjs --deploy\n\n'
      + `Target: post ${POST_ID} (epic-a). The three "Most recent report" links become a\n`
      + 'query over the Research & Reports category, resolved by slug at render time.\n'
      + 'Check `git status` first: syncTheme() publishes css/, js/, components/, tokens/,\n'
      + 'assets/ and patterns/ from the repo root with --delete.',
    );
    return 1;
  }

  console.error('1/4 checking the install can answer the query...');
  const rows = (await wpe(`wp db query "${PREFLIGHT_SQL}" --skip-column-names`))
    .trim().split('\n').filter(Boolean);
  const newest = newestPerArea(rows);
  const absent = ['education', 'work', 'justice'].filter(slug => !newest.has(slug));
  if (absent.length) {
    throw new Error(
      `no published research report carries ${absent.join(' or ')} on this install, so `
      + `${absent.length} of the three panels would render nothing at all. Either the `
      + 'Research & Reports category is missing (run `node elementor/apply-research-category.mjs '
      + '--apply` first) or the posts in it carry no issue area.'
    );
  }
  for (const [slug, { date, title }] of newest) {
    console.error(`  ${slug.padEnd(10)} ${date.slice(0, 10)}  ${title}`);
  }

  /* BEFORE the page tree, not after: see the docblock. */
  console.error('2/4 syncing theme (inc/epic-research.php is new, functions.php requires it)...');
  await syncTheme();

  console.error(`3/4 deploying the epic-a tree into ${POST_ID}...`);
  await deployPage(POST_ID, sections());

  console.error('4/4 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. VERIFY THE RENDER. Two things a 200 does not prove:');
  console.error('  curl -s https://empv2.wpenginepowered.com/epic/ | grep -c empower_epic_latest_report');
  console.error('    # must be 0. A count above zero means the theme sync did not land and the');
  console.error('    # page is showing the shortcode as text.');
  console.error('  curl -s https://empv2.wpenginepowered.com/epic/ | grep -c epa-area__latest\\"');
  console.error('    # must be 3, one per focus area.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
