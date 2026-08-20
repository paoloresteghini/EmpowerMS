#!/usr/bin/env node
/* The committed way to redeploy the header, footer and search results Theme
 * Builder parts, and the loop item card the search results archive points
 * its grid at.
 *
 * Before this file, README.md's own instruction ("A nav change means
 * editing that static partial and redeploying it through
 * elementor/deploy.mjs") had nothing to run: no committed script or npm
 * entry point ever called deployThemePart() with headerPart() or
 * footerPart() (only tests do, against synthetic ids). The two parts on the
 * install were deployed by hand from a one-off `node -e`, recorded only in
 * docs/elementor/theme-part-mechanism.md. This gives that instruction an
 * actual command.
 *
 * Deploys, then assigns each part's own condition, in one call per part:
 * deployThemePart() alone leaves the part with correct data and no
 * location, which Elementor Pro resolves from a CACHED option rather than
 * postmeta at render time (see setConditions()'s own comment in
 * elementor/deploy.mjs, and the mechanism doc's account of losing an hour
 * to exactly that gap).
 *
 * THE CONDITION USED TO BE ONE MODULE-LEVEL CONSTANT, 'include/general',
 * shared by header and footer, because Entire Site was the only condition
 * either of them had ever needed. Task 5 (2026-08-20) adds search-results,
 * whose condition is 'include/archive/search': a page-specific condition,
 * not Entire Site, since a search results template must render only on a
 * search page and nowhere else. That makes the old shared constant false
 * for a third of PARTS, so the condition now lives on each PARTS entry
 * instead of a branch that would otherwise be needed to pick between
 * 'include/general' and something else. Re-asserting each part's own
 * condition on every redeploy is still deliberate: it means a redeploy is
 * idempotent rather than depending on a condition already correctly set
 * from a previous run.
 *
 * Usage:
 *   node elementor/theme-parts/deploy.mjs                 # every part
 *   node elementor/theme-parts/deploy.mjs header           # header only
 *   node elementor/theme-parts/deploy.mjs footer           # footer only
 *   node elementor/theme-parts/deploy.mjs search-results   # card, then archive
 *
 * Reads install coordinates from the environment via wpe.mjs/install.mjs,
 * the same as every other script that talks to the install (see README.md,
 * "The install"); nothing here hard-codes them.
 */
import { headerPart, HEADER_POST_ID } from './header.mjs';
import { footerPart, FOOTER_POST_ID } from './footer.mjs';
import { searchArchivePart, SEARCH_ARCHIVE_POST_ID, SEARCH_ARCHIVE_CONDITIONS } from './search-archive.mjs';
import { searchResultItem, SEARCH_RESULT_ITEM_POST_ID } from './search-result-item.mjs';
import { deployThemePart, deployLoopItem, setConditions } from '../deploy.mjs';
import { flushPageCache } from '../../fidelity.mjs';

/* Keyed by the exact document type string deployThemePart()'s third
 * argument (`location`, a known misnomer, see elementor/deploy.mjs's own
 * comment) needs, so `name` below is passed straight through with no
 * lookup table and no branch between a PARTS key and the string
 * deployThemePart() expects. */
const PARTS = {
  header: { postId: HEADER_POST_ID, build: headerPart, conditions: ['include/general'] },
  footer: { postId: FOOTER_POST_ID, build: footerPart, conditions: ['include/general'] },
  'search-results': { postId: SEARCH_ARCHIVE_POST_ID, build: searchArchivePart, conditions: SEARCH_ARCHIVE_CONDITIONS },
};

/* The archive's Loop Grid (search-archive.mjs) points at
 * SEARCH_RESULT_ITEM_POST_ID by id, so deploying the archive without ever
 * having written the card leaves a live grid pointing at an empty
 * elementor_library post. Nothing in this file called deployLoopItem() for
 * it before this fix: searchResultItem() had no caller outside
 * test-elementor.mjs, which is exactly how the gap went unnoticed until a
 * whole-branch review found it.
 *
 * deployLoopItem(), unlike deployThemePart(), writes the card straight
 * through: a loop item's type is 'loop-item', not a Theme Builder location,
 * so it never goes through deployThemePart() or setConditions(). That also
 * means it is quieter than the other two deploys by nature: there is no
 * condition to assign and no readback to confirm assignment, unlike
 * setConditions() (below), which exit(1)s if a theme part comes back
 * unassigned. Nothing here catches a card that silently failed to write,
 * which is worth naming rather than leaving implicit.
 *
 * This is deliberately scoped to the search result card only. The build's
 * other loop items (posts 20572 and 20589, content-a's four, team-a's) have
 * no committed deploy path either, and this task is not fixing those: the
 * asymmetry is scope, not an oversight the next person should have to
 * rediscover. */
async function redeployLoopItem() {
  console.log(`Deploying search-result-item (post ${SEARCH_RESULT_ITEM_POST_ID})...`);
  await deployLoopItem(SEARCH_RESULT_ITEM_POST_ID, searchResultItem());
  console.log('search-result-item deployed.');
}

async function redeployPart(name) {
  /* The card has to exist before the archive that references it, so a run
   * that dies partway through never leaves a live grid pointing at an empty
   * template. */
  if (name === 'search-results') {
    await redeployLoopItem();
  }

  const { postId, build, conditions } = PARTS[name];
  console.log(`Deploying ${name} (post ${postId})...`);
  await deployThemePart(postId, build(), name);
  await setConditions(postId, conditions);
  console.log(`${name} deployed and confirmed assigned to ${conditions.join(', ')}.`);
}

async function main() {
  const requested = process.argv.slice(2);
  for (const name of requested) {
    if (!(name in PARTS)) {
      throw new Error(`Unknown theme part '${name}'. Expected one of: ${Object.keys(PARTS).join(', ')}`);
    }
  }
  const targets = requested.length > 0 ? requested : Object.keys(PARTS);

  for (const name of targets) {
    await redeployPart(name);
  }

  /* Without this, a browser or fetchConverted() check run immediately after
   * this script can see a page cached from before the redeploy: the same
   * stale-read trap README.md and fidelity.mjs both document elsewhere. */
  await flushPageCache();
  console.log('Page cache flushed.');
}

/* Guarded so importing this module (from a test, or from another script
 * that wants redeployPart() without the CLI behaviour) never itself reaches
 * the install. Only running it directly, `node elementor/theme-parts/
 * deploy.mjs ...`, does. */
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.stack || err.message || err);
    process.exitCode = 1;
  });
}
