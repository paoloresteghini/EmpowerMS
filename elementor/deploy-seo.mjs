/* Writes elementor/seo.mjs into All in One SEO's own storage on the install.

   WHY AIOSEO'S TABLE AND NOT A THEME FILTER. Both work. Paolo chose this one
   on 2026-08-21 so that every value is visible and editable in the AIOSEO box
   on each page in wp-admin: Empower own their copy, and a search snippet is
   copy. The cost is the same one the Elementor deploy already carries, and it
   is worth stating plainly rather than discovering later: THIS SCRIPT
   OVERWRITES. If somebody edits a description in wp-admin and this runs again,
   their edit is gone. seo.mjs is the source of truth; wp-admin is where the
   result is read and, between deploys, where it can be adjusted.

   HOW THE VALUE GETS THERE. Not SQL. AIOSEO 5 keeps this in wp_aioseo_posts,
   a table with a dozen NOT NULL columns and its own row-creation logic, so an
   INSERT written by hand is a guess about a schema that is not ours. The
   plugin's own model (\AIOSEO\Plugin\Common\Models\Post) creates the row if it
   is missing, fills the defaults, and saves. Checked on the install before
   writing this: the class exists (MODEL_OK) under AIOSEO 5.0.0.1.

   HOW THE COPY SURVIVES THE TRIP. Base64, one payload, one call. The copy
   contains apostrophes ("Mississippi's", "Empower's") and an ampersand, and
   this repository has already lost time twice to WP-CLI values being mangled
   between node, ssh, bash and PHP (see the note at the top of wpe.mjs). A
   base64 blob is [A-Za-z0-9+/=] and cannot be mangled by any of the four. It
   is decoded once, inside PHP.

   WHAT IT DOES NOT DO. It does not touch post titles. The homepage's post
   title is still "Homepage (Elementor conversion)" afterwards, because the
   conversion tests and deploy scripts find that page by its title; what
   changes is the <title> tag AIOSEO renders, which is the thing a person and
   a crawler actually see. */

import { wpe } from '../wpe.mjs';
import { ALL_SEO, BRAND_SUFFIX } from './seo.mjs';

const SITE = 'https://empv2.wpenginepowered.com';

/* Resolve every path to a post id on the install, in ONE call, and read the
   ids back on the node side. Never captured into a remote shell variable:
   that is the mistake wpe.mjs documents at length, where a WP-CLI value glued
   to a PHP deprecation notice becomes the next command's argument. */
async function resolveIds(paths) {
  const php = paths
    .map((p) => `echo url_to_postid("${SITE}${p}"), "\\n";`)
    .join('');
  const raw = await wpe(`wp eval '${php}'`);
  const ids = raw.split('\n').map((line) => parseInt(line.trim(), 10));
  const out = {};
  paths.forEach((p, i) => { out[p] = Number.isInteger(ids[i]) ? ids[i] : 0; });
  return out;
}

/* One call, every entry, through the plugin's model. */
async function writeMeta(rows) {
  const payload = Buffer.from(JSON.stringify(rows)).toString('base64');
  const php = [
    '$rows = json_decode( base64_decode( "' + payload + '" ), true );',
    'foreach ( $rows as $row ) {',
    '  $p = \\AIOSEO\\Plugin\\Common\\Models\\Post::getPost( (int) $row["id"] );',
    '  $p->title = $row["title"];',
    '  $p->description = $row["description"];',
    '  $p->save();',
    '  echo $row["id"], " ", $row["path"], "\\n";',
    '}',
  ].join(' ');
  return wpe(`wp eval '${php}'`);
}

export async function deploySeo() {
  const paths = Object.keys(ALL_SEO);
  const ids = await resolveIds(paths);

  const missing = paths.filter((p) => !ids[p]);
  if (missing.length) {
    /* Loud, not skipped. A path that resolves to 0 is a slug that moved, and
       silently writing the other 33 would leave one page with no description
       and nothing saying which. */
    throw new Error(
      `these paths resolve to no post on the install:\n  ${missing.join('\n  ')}`,
    );
  }

  const rows = paths.map((p) => ({
    id: ids[p],
    path: p,
    title: ALL_SEO[p].title + BRAND_SUFFIX,
    description: ALL_SEO[p].description,
  }));

  const written = await writeMeta(rows);
  return { count: rows.length, written };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deploySeo()
    .then(({ count, written }) => {
      console.log(written);
      console.log(`wrote title + description for ${count} URLs`);
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
