import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const HOST = 'empv2@empv2.ssh.wpengine.net';
const KEY = `${process.env.HOME}/.ssh/wpengine_ed25519`;
const DEST = '/nas/content/live/empv2/wp-content/themes/empowerms-child';

/* tokens/, components/, css/, js/ and assets/ are SYNCED from the repository
   root, never copied into wp/. A second copy in the tree drifts from the first
   and the drift is invisible until a page renders wrong. */
const FROM_ROOT = ['tokens', 'components', 'css', 'js', 'assets'];

export async function syncTheme() {
  const ssh = `ssh -i ${KEY} -o BatchMode=yes`;
  await run('rsync', ['-az', '--delete', '-e', ssh, 'wp/empowerms-child/', `${HOST}:${DEST}/`]);
  for (const dir of FROM_ROOT) {
    await run('rsync', ['-az', '--delete', '-e', ssh, `${dir}/`, `${HOST}:${DEST}/${dir}/`]);
  }
  return DEST;
}
