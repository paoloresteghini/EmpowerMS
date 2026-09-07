/* Redeploys the eleven converted pages whose photographs changed on 2026-09-03.
 *
 * WHAT IT DOES, in order:
 *
 *   1. NOTHING to the theme. elementor/import-photography.mjs already synced it
 *      and imported the 41 attachments; this script only rewrites page trees.
 *      Run that one first if the attachments are not on the install yet: this
 *      script's own preflight refuses to deploy without them.
 *   2. deploys each page tree. deployElements() flushes Elementor's CSS per
 *      page as its own last line.
 *   3. flushes the object and page caches ONCE at the end. A deploy that does
 *      not flush fails as a subset of itself.
 *
 * WHAT IT DOES NOT TOUCH, deliberately:
 *   `safety` (20597) and `landing`. safety's two photographs are held pending
 *   Kienna on whether the workplace frames can sit under a second-chances
 *   headline, and landing was never part of this change. Both still use the
 *   2026-08 placeholders, which is why those files were kept in the media map
 *   rather than replaced.
 *
 * THIS OVERWRITES _elementor_data ON ELEVEN LIVE PAGES. Anything edited in
 * Elementor's own UI since the last repo deploy is discarded, in both
 * directions: that hazard is recorded in the Phase 2B notes and has not
 * changed. Check before running if anyone has been in the editor.
 *
 *   node elementor/deploy-photography.mjs             # explain, change nothing
 *   node elementor/deploy-photography.mjs --deploy
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { deployPage } from './deploy.mjs';
import { wpe } from '../wpe.mjs';

export const PAGES = [
  'final', 'who-we-are-a', 'what-we-do-a', 'team-a', 'solutions-b',
  'education', 'work', 'epic-a', 'mail-a', 'amb-a', 'give-c',
  /* Added 2026-09-04. These two had no photography at all until then: their
     heroes carried dashed "photography to come" placeholders, which is why they
     were absent from the 2026-09-03 pass rather than skipped. They are filled
     from Empower's Podcast Photos folder, not the Highlights shoot. */
  'capitol-a', 'podcast-a',
  /* Added 2026-09-04, once the page could be filled honestly. safety was held
     out of the 2026-09-03 pass because the only photography on offer for it was
     a real warehouse floor with identifiable people, sitting above three named
     accounts of addiction, prison and reentry. It is filled from the licensed
     stock folder Empower supplied for exactly that, and its stories band is a
     photograph with no people in it. See elementor/pages/safety/media.mjs. */
  'safety',
];

/* `--only a,b` restricts the run. Redeploying a page costs a minute of Elementor
   CSS flushing, so a change that touches two pages should not rewrite eleven
   others' _elementor_data for nothing: every one of those rewrites is another
   chance to overwrite something edited in the Elementor UI since the last
   deploy. */
export function selected(argv, pages = PAGES) {
  const flag = argv.find(a => a.startsWith('--only'));
  if (!flag) return pages;
  const want = (flag.includes('=') ? flag.split('=')[1] : argv[argv.indexOf(flag) + 1] || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const unknown = want.filter(w => !pages.includes(w));
  if (unknown.length) throw new Error(`--only names pages that are not in this deploy: ${unknown.join(', ')}`);
  if (!want.length) throw new Error('--only was given no page names');
  return pages.filter(p => want.includes(p));
}

export async function main(argv = process.argv.slice(2)) {
  const manifest = JSON.parse(readFileSync('elementor/photography-2026-09.json', 'utf8'));
  const loaded = [];
  for (const name of selected(argv)) {
    const { POST_ID, sections } = await import(`./pages/${name}/page.mjs`);
    loaded.push({ name, POST_ID, sections });
  }
  if (!argv.includes('--deploy')) {
    console.log(`Would redeploy ${loaded.length} pages with the 2026-09 photography:`);
    for (const p of loaded) console.log(`  ${String(p.POST_ID).padEnd(7)} ${p.name}`);
    console.log(`\n${Object.keys(manifest).length} attachments in the manifest. Nothing runs without --deploy.`);
    return;
  }

  /* Preflight against the INSTALL, not the manifest file: the manifest is a
     local record of an import that may not have happened on this install. One
     query, and it names what is missing rather than deploying widgets that
     point at attachment ids which do not exist and render as nothing. */
  const ids = Object.values(manifest).map(m => m.id);
  const found = (await wpe(
    `wp db query "SELECT ID FROM wp_posts WHERE post_type='attachment' AND ID IN (${ids.join(',')})" --skip-column-names`
  )).split('\n').map(s => s.trim()).filter(Boolean).map(Number);
  const missing = Object.entries(manifest).filter(([, m]) => !found.includes(m.id));
  if (missing.length) {
    throw new Error(`${missing.length} attachment(s) are not on the install; run elementor/import-photography.mjs --import first:\n  ` +
      missing.map(([n, m]) => `${n} (${m.id})`).join('\n  '));
  }
  console.log(`preflight: all ${ids.length} attachments present on the install`);

  let i = 0;
  for (const p of loaded) {
    await deployPage(p.POST_ID, p.sections());
    console.log(`  ${++i}/${loaded.length} deployed ${p.name} (${p.POST_ID})`);
  }
  console.log('flushing caches ...');
  /* `wp elementor flush_css` added 2026-09-07, when deployElements() stopped
     flushing per document. This script wrote pages through it and flushed only
     the two WordPress caches, so it was relying on that line without saying so. */
  await wpe('wp elementor flush_css && wp cache flush && wp page-cache flush');
  console.log(`\n${loaded.length} pages deployed and flushed.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e.message); process.exitCode = 1; });
}
