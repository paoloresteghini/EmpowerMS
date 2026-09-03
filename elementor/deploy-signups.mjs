/* WIRE THE LIVE SIGNUP FORMS INTO /newsletter/ AND /ambassadors/.
 *
 * WHY A FLAG AND NOT A BARE RUN. deployPage() overwrites `_elementor_data`
 * wholesale, so this script's only argument is the difference between reading
 * about a deploy and performing one. Same discipline as deploy-legal.mjs and
 * deploy-contact.mjs.
 *
 * WHAT CHANGES, AND IT IS NOT SMALL. Both pages were signed off carrying a
 * form-shaped design that collected nothing, while the legacy pages kept the
 * working route. After this they carry the real forms:
 *
 *   /newsletter/   Gravity Form 2,  "Become an Advocate",  836 entries,
 *                  notifying Joanna and Kienna. Name and email only.
 *   /ambassadors/  Gravity Form 37, "I'm Interested in Becoming An Ambassador",
 *                  25 entries, notifying Ashley Green. Name, email, phone,
 *                  city, ZIP and one issue area.
 *
 * SO THE VISIBLE FIELDS ON TWO SIGNED-OFF PAGES CHANGE. Newsletter loses the
 * County field and its button reads "Submit" rather than "Join Our Email List";
 * Ambassador loses County, the four "how would you like to get involved" ticks
 * and the note to Ashley, and gains phone, city and ZIP. Paolo took that trade
 * on 2026-09-02: the field list on a signup form is Empower's operational
 * choice, and the alternative was two nav destinations that go on collecting
 * nothing. Empower should see it, and it is in the same round of questions as
 * the legal wording and the address.
 *
 * THIS SCRIPT DOES NOT REDIRECT THE LEGACY PAGES. /join/ and
 * /become-an-ambassador/ still serve their own copies of these same forms.
 * Redirecting them is elementor/deploy-redirects.mjs, and it must run AFTER
 * this and only once these two pages are verified, because until then the
 * legacy pages ARE the working route.
 *
 * WHAT IT DOES, in order:
 *
 *   1. rsyncs the theme: bridge.css gained block 77b and block 77 was rescoped
 *      from .ct-form to the shared .em-gform hook, which contact also uses.
 *      NOTE the standing hazard: syncTheme() copies tokens/ components/ css/
 *      js/ assets/ and patterns/ from the repo ROOT with --delete, so anything
 *      uncommitted in those six directories is published as-is. Check
 *      `git status` before running.
 *   2. deploys all THREE page trees. Contact is included deliberately: block 77
 *      no longer matches `.ct-form`, so contact's own form would lose its
 *      dressing if its tree were left carrying the old class.
 *   3. flushes Elementor's CSS cache and the page cache.
 *
 * VERIFY THE FORMS, NOT ONLY THE PAGES. A page rendering proves the shortcode
 * expanded, not that a submission arrives. Baselines when this was written:
 * form 2 at 836, form 37 at 25, form 3 at 3,116.
 *
 * TO REVERSE: redeploy from a commit before this one. Both pages were plain
 * Elementor pages already, so unlike contact there is no Beaver flag involved.
 */

import { deployPage } from './deploy.mjs';
import { POST_ID as MAIL_ID, sections as mailSections } from './pages/mail-a/page.mjs';
import { POST_ID as AMB_ID, sections as ambSections } from './pages/amb-a/page.mjs';
import { POST_ID as CONTACT_ID, sections as contactSections } from './pages/contact/page.mjs';
import { syncTheme } from '../wp/sync.mjs';
import { wpe } from '../wpe.mjs';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === '--deploy') return { mode: 'deploy' };
  return { mode: 'explain' };
}

export async function main(argv = process.argv.slice(2)) {
  if (parseArgs(argv).mode === 'explain') {
    console.error(
      'Wires Gravity Form 2 into /newsletter/ and form 37 into /ambassadors/, and\n'
      + 'redeploys /contact/ because the shared styling hook changed. Nothing is\n'
      + 'written without --deploy.\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/deploy-signups.mjs --deploy\n\n'
      + `Targets: ${MAIL_ID} (newsletter), ${AMB_ID} (ambassadors), ${CONTACT_ID} (contact).\n`
      + 'Two signed-off pages change their visible fields; read the docblock first.\n'
      + 'Check `git status`: syncTheme() publishes css/ and friends with --delete.',
    );
    return 1;
  }

  console.error('1/3 syncing theme files (bridge block 77 rescoped, 77b added)...');
  await syncTheme();

  console.error(`2/3 deploying ${MAIL_ID} (newsletter), ${AMB_ID} (ambassadors), ${CONTACT_ID} (contact)...`);
  await deployPage(MAIL_ID, mailSections());
  await deployPage(AMB_ID, ambSections());
  await deployPage(CONTACT_ID, contactSections());

  console.error('3/3 flushing...');
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');

  console.error('\nDone. Verify each page renders its form, then verify a submission arrives.');
  console.error('  form 2 baseline 836, form 37 baseline 25, form 3 baseline 3116');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main());
}
