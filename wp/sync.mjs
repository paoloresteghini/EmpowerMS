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

/* Exported for the test, and pure on purpose. The window this closes cannot
   be observed from any unit test in this repository, because the failure is a
   file being absent from a remote host for a few seconds. What CAN be observed
   is the argument list, and the argument list is the whole behaviour: run these
   arguments against a real local rsync and a destination-only bridge.css either
   survives or it does not. A source-text assertion cannot tell the difference
   between an exclude that protects bridge.css and an exclude that protects
   something else, which is exactly the gap the first version of that test had.

   `--delete-excluded` must never appear here: it would delete the very file the
   exclude exists to protect. */
export function fromRootArgs(dir, ssh, host, dest) {
  const protectBridge = dir === 'css' ? ['--exclude', '/bridge.css'] : [];
  return ['-az', '--delete', ...protectBridge, '-e', ssh, `${dir}/`, `${host}:${dest}/${dir}/`];
}

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
    /* The css/ pass alone protects bridge.css from its own --delete, and the
       third pass below is NOT a substitute for it. bridge.css lives under
       wp/empowerms-child/css/ and not under the repository's own css/, so
       without this exclude the --delete here removes it from the live install
       on EVERY sync and the third pass puts it back a moment later. Between
       the two rsyncs every converted page on the install renders with no
       bridge stylesheet at all. Found on the live install during Task 10, not
       by reading this file: a direct md5sum run in that window answered "No
       such file or directory", and two concurrent syncs widen it by
       interleaving the passes.

       Rehearsed against a scratch directory rather than assumed: rsync does
       not delete a file an --exclude protects, unless --delete-excluded is
       given, which this file must never pass. So pass three keeps bridge.css
       CURRENT and this exclude keeps it PRESENT; both are needed. */
    await run('rsync', fromRootArgs(dir, ssh, host, dest));
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
