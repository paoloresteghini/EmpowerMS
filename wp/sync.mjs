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
  /* wp/empowerms-child/ holds only the four PHP/CSS files that live in this
     repository; tokens/, components/, css/, js/ and assets/ are synced
     separately below, from the root, and never exist under wp/empowerms-child/
     on disk here. Without these excludes, this rsync's own --delete removes
     all five of those directories from the live theme (they aren't in the
     source it's syncing from), and the loop below only re-uploads them one at
     a time afterwards: a failure between the two steps leaves the live site
     with no CSS or JS and nothing to report it. */
  const excludes = FROM_ROOT.flatMap((dir) => ['--exclude', `/${dir}/`]);
  await run('rsync', ['-az', '--delete', ...excludes, '-e', ssh, 'wp/empowerms-child/', `${host}:${dest}/`]);
  for (const dir of FROM_ROOT) {
    await run('rsync', ['-az', '--delete', '-e', ssh, `${dir}/`, `${host}:${dest}/${dir}/`]);
  }
  return dest;
}
