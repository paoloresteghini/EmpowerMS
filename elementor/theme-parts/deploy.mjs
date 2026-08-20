#!/usr/bin/env node
/* The committed way to redeploy the header, footer and search results Theme
 * Builder parts.
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
 *   node elementor/theme-parts/deploy.mjs                  # every part
 *   node elementor/theme-parts/deploy.mjs header            # header only
 *   node elementor/theme-parts/deploy.mjs footer            # footer only
 *   node elementor/theme-parts/deploy.mjs search-results     # search only
 *
 * Reads install coordinates from the environment via wpe.mjs/install.mjs,
 * the same as every other script that talks to the install (see README.md,
 * "The install"); nothing here hard-codes them.
 */
import { headerPart, HEADER_POST_ID } from './header.mjs';
import { footerPart, FOOTER_POST_ID } from './footer.mjs';
import { searchArchivePart, SEARCH_ARCHIVE_POST_ID, SEARCH_ARCHIVE_CONDITIONS } from './search-archive.mjs';
import { deployThemePart, setConditions } from '../deploy.mjs';
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

async function redeployPart(name) {
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
