import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { installConfig } from '../install.mjs';

const run = promisify(execFile);

/* Derived from the install root rather than configured separately: the
   theme directory is a fact about this repository (the child theme's
   folder name), not a fact about the install. */
const THEME = 'wp-content/themes/empowerms-child';

/* tokens/, components/, css/, js/ and assets/ are SYNCED from the repository
   root, never copied into wp/. A second copy in the tree drifts from the first
   and the drift is invisible until a page renders wrong. */
const FROM_ROOT = ['tokens', 'components', 'css', 'js', 'assets'];

export async function syncTheme() {
  const { host, key, root } = installConfig();
  const dest = `${root}/${THEME}`;
  const ssh = `ssh -i ${key} -o BatchMode=yes`;
  /* wp/empowerms-child/ holds the theme's own PHP files plus
     wp/empowerms-child/css/bridge.css; tokens/, components/, css/, js/ and
     assets/ are synced separately below, from the root, and (bridge.css
     aside) never exist under wp/empowerms-child/ on disk here. Without these
     excludes, this rsync's own --delete removes all five of those
     directories from the live theme (they aren't in the source it's syncing
     from), and the loop below only re-uploads them one at a time afterwards:
     a failure between the two steps leaves the live site with no CSS or JS
     and nothing to report it. */
  const excludes = FROM_ROOT.flatMap((dir) => ['--exclude', `/${dir}/`]);
  await run('rsync', ['-az', '--delete', ...excludes, '-e', ssh, 'wp/empowerms-child/', `${host}:${dest}/`]);
  for (const dir of FROM_ROOT) {
    await run('rsync', ['-az', '--delete', '-e', ssh, `${dir}/`, `${host}:${dest}/${dir}/`]);
  }
  /* bridge.css is excluded above (it lives under wp/empowerms-child/css/,
     inside the excluded /css/ path) and then overwritten wholesale above
     (the root css/ -> dest/css/ pass runs --delete against dest/css/,
     which would remove bridge.css again even if the exclude above did not
     already keep it out). Without this third pass bridge.css is silently
     unreachable from the server no matter what this file contains: found by
     rehearsing the two passes above against a scratch directory before
     trusting them, not by reading the enqueue and assuming it worked. No
     --delete here: this source only ever contains bridge.css, and deleting
     dest/css/ against it would erase everything the previous pass just put
     there. */
  await run('rsync', ['-az', '-e', ssh, 'wp/empowerms-child/css/', `${host}:${dest}/css/`]);
  return dest;
}
