/* Replaces the FILE behind an already-imported photograph, keeping its id.
 *
 * WHY THIS EXISTS. elementor/import-photography.mjs is idempotent by design:
 * it looks each photograph up by post_name and skips anything already on the
 * install, because `wp media import` given the same file twice creates a
 * SECOND attachment with a -1 suffix and leaves two plausible ids for one
 * photograph. That is the right behaviour for importing and the wrong
 * behaviour for the case this script covers: Empower send a better copy of a
 * photograph that is already live.
 *
 * THE OBVIOUS ALTERNATIVES ARE BOTH WORSE:
 *   - Import under a new name and repoint. Leaves a dead attachment behind and
 *     changes an id that other modules already carry, for a file that is the
 *     same photograph.
 *   - Delete the attachment and re-import. Loses the alt text, which on this
 *     install is written once at import and never by `wp post meta update`
 *     (see import-photography.mjs's own note), and takes a new id with it.
 *
 * So the file is swapped underneath the attachment and the intermediate sizes
 * are regenerated. The id, the alt, the post_name and every reference to it
 * survive; only the pixels change.
 *
 * FIRST USE, 2026-09-16: `empower-office-building`. Kienna sent an 800x431
 * copy with Grant's review, which was too small for its 911x683 slot and
 * shipped upscaled on Paolo's call; she sent the 4032x3024 original the same
 * afternoon. Same photograph, same frame, four times the detail.
 *
 * REGENERATION IS NOT OPTIONAL. WordPress serves the intermediate sizes to
 * most viewports through srcset, and those files still hold the old pixels
 * until `wp media regenerate` rewrites them. Swapping the full-size file alone
 * gives a page that looks unchanged at every width where srcset picks a
 * thumbnail, which is a fix that appears not to have worked.
 *
 *   node elementor/replace-photograph.mjs <slug>            # explain, change nothing
 *   node elementor/replace-photograph.mjs <slug> --replace
 */
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { wpe } from '../wpe.mjs';
import { syncTheme } from '../wp/sync.mjs';

const MANIFEST = 'elementor/photography-2026-09.json';
const THEME_DIR = 'wp-content/themes/empowerms-child/assets/photography';

const shellSingle = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

export async function main(argv = process.argv.slice(2), run = wpe) {
  const slug = argv.find((a) => !a.startsWith('--'));
  const apply = argv.includes('--replace');
  if (!slug) {
    console.error(
      'Usage, with the install credentials loaded first:\n\n'
      + '  set -a; . ./.env; set +a\n'
      + '  node elementor/replace-photograph.mjs <slug>            # explain\n'
      + '  node elementor/replace-photograph.mjs <slug> --replace\n\n'
      + 'The new file must already be at assets/photography/<slug>.jpg in this repo.',
    );
    return 1;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const entry = manifest[slug];
  if (!entry) {
    throw new Error(`${slug} is not in ${MANIFEST}. A photograph that has never been imported is an import, not a replacement.`);
  }

  /* The attachment's own relative path, read off the install rather than
     assumed from the manifest URL: the uploads directory is configurable and
     the year/month folder is whatever the original import happened to land in. */
  const relative = (await run(`wp post meta get ${entry.id} _wp_attached_file`)).trim();
  if (!/^\d{4}\/\d{2}\/.+\.(jpg|jpeg|png)$/i.test(relative)) {
    throw new Error(`attachment ${entry.id}: _wp_attached_file reads ${JSON.stringify(relative)}, which is not a path this script recognises`);
  }

  console.log(`  slug        ${slug}`);
  console.log(`  attachment  ${entry.id}`);
  console.log(`  file        ${relative}`);
  console.log(`  new file    assets/photography/${slug}.jpg`);

  if (!apply) {
    console.log('\nNothing is written without --replace.');
    return 1;
  }

  console.log('\n1/3 syncing theme so the new file is on the install...');
  await syncTheme();

  /* TWO CALLS, NOT ONE PIPELINE, AND THIS IS THE RULE wpe.mjs EXISTS FOR.
     The first draft of this script resolved the uploads directory and used it
     in the same remote command:

         wp eval 'echo wp_upload_dir()["basedir"];' | { read BASE; cp ... "$BASE/..."; }

     which failed on the first run with

         cp: cannot create regular file '/sites/empv2/wp-content/uploadsPHP: 2026-09-16 ...

     Every WP-CLI call on this install emits a PHP deprecation notice, and the
     notice is glued onto the value. wpe.mjs strips notices from what it returns
     TO NODE and can do nothing about a value the remote shell captured for
     itself, which is exactly what `read BASE` did. So the base directory is
     read back here, where stripNotices() has already cleaned it, and goes into
     the next call as a literal. */
  const base = (await run(`wp eval 'echo wp_upload_dir()["basedir"];'`)).trim();
  if (!base.startsWith('/') || /\s/.test(base)) {
    throw new Error(`the uploads base directory came back as ${JSON.stringify(base)}, which is not a usable path`);
  }

  console.log('2/3 copying it over the attachment\'s own file...');
  const copied = await run(
    `cp ${THEME_DIR}/${shellSingle(`${slug}.jpg`)} ${shellSingle(`${base}/${relative}`)} && echo COPIED`
  );
  if (!copied.includes('COPIED')) {
    throw new Error(`the copy did not report success: ${JSON.stringify(copied)}`);
  }

  console.log('3/3 regenerating the intermediate sizes (srcset serves these, not the full size)...');
  console.log((await run(`wp media regenerate ${entry.id} --yes 2>&1 | tail -3`)).trim());

  /* Read the dimensions back off the attachment's own metadata. A regenerate
     that silently did nothing leaves the old width here, and the page would
     look unchanged for a reason no amount of cache flushing explains. */
  const dims = (await run(`wp eval 'if($m=wp_get_attachment_metadata(${entry.id})) echo $m["width"], "x", $m["height"];'`)).trim();
  console.log(`\nAttachment ${entry.id} now reports ${dims}.`);
  console.log('VERIFY THE RENDER: the page picks a size from srcset, so check the page, not the file.');
  console.log(`  curl -s https://empv2.wpenginepowered.com/who-we-are/ | grep -o '${slug}[^" ]*' | sort -u`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code ?? 0));
}
