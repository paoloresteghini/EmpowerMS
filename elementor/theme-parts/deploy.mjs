#!/usr/bin/env node
/* The committed way to redeploy the header and footer Theme Builder parts.
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
 * Deploys, then assigns the Entire Site condition, in one call per part:
 * deployThemePart() alone leaves the part with correct data and no
 * location, which Elementor Pro resolves from a CACHED option rather than
 * postmeta at render time (see setConditions()'s own comment in
 * elementor/deploy.mjs, and the mechanism doc's account of losing an hour
 * to exactly that gap). Re-asserting 'include/general' on every redeploy is
 * deliberate, not just convenient: it is the one condition either part has
 * ever needed, and it means a redeploy is idempotent rather than depending
 * on a condition already correctly set from a previous run.
 *
 * Usage:
 *   node elementor/theme-parts/deploy.mjs            # both parts
 *   node elementor/theme-parts/deploy.mjs header      # header only
 *   node elementor/theme-parts/deploy.mjs footer      # footer only
 *
 * Reads install coordinates from the environment via wpe.mjs/install.mjs,
 * the same as every other script that talks to the install (see README.md,
 * "The install"); nothing here hard-codes them.
 */
import { headerPart, HEADER_POST_ID } from './header.mjs';
import { footerPart, FOOTER_POST_ID } from './footer.mjs';
import { deployThemePart, setConditions } from '../deploy.mjs';
import { flushPageCache } from '../../fidelity.mjs';

/* Entire Site is the only condition either theme part has ever needed
 * (README.md, "Phase 2A foundations"; theme-part-mechanism.md throughout). */
const CONDITIONS = ['include/general'];

const PARTS = {
  header: { postId: HEADER_POST_ID, build: headerPart },
  footer: { postId: FOOTER_POST_ID, build: footerPart },
};

async function redeployPart(name) {
  const { postId, build } = PARTS[name];
  console.log(`Deploying ${name} (post ${postId})...`);
  await deployThemePart(postId, build(), name);
  await setConditions(postId, CONDITIONS);
  console.log(`${name} deployed and confirmed assigned to ${CONDITIONS.join(', ')}.`);
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
