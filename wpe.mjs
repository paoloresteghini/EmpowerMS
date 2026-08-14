import { spawn } from 'node:child_process';
import { installConfig } from './install.mjs';

/* A notice starts at the literal "PHP: " followed by a timestamp, and runs to
   the line that closes its array dump. Matched with the "PHP: " allowed to
   appear mid-line, because WP-CLI values arrive with the notice glued onto the
   end of them. The timestamp in the pattern is what keeps a legitimate line
   that merely says "PHP" from being eaten. */
const NOTICE = /PHP: \d{4}-\d{2}-\d{2} [\s\S]*?\n\)\]/g;

export function stripNotices(raw) {
  return raw
    .replace(NOTICE, '')
    .split('\n')
    .filter(line => !/^PHP: \d{4}-\d{2}-\d{2} /.test(line))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* One WP-CLI command on the install. The command is piped over stdin as a
   shell script rather than passed as an argument, because inline $(...) and
   parentheses get mangled by the gateway's argument handling. Using spawn()
   instead of execFile(): async execFile ignores the input option entirely
   (only execFileSync and spawnSync accept it), so the script never reaches
   the remote bash -s, leaving it blocked on stdin. */
export async function wpe(command) {
  /* Resolved per call, before anything is spawned, so a missing variable
     surfaces as its own error rather than as an ssh exit code that reads
     like the install refusing us. */
  const { host, key, root } = installConfig();
  return new Promise((resolve, reject) => {
    const script = `cd ${root} || exit 1\n${command}\n`;
    const child = spawn('ssh', [
      '-i', key,
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=30',
      host,
      'bash', '-s',
    ]);

    let stdout = '';
    let stderr = '';
    let rejected = false;
    const maxBuffer = 32 * 1024 * 1024;

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > maxBuffer) {
        child.kill();
        rejected = true;
        const err = new Error(`Output exceeds ${maxBuffer} bytes`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = null;
        reject(err);
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > maxBuffer) {
        child.kill();
        rejected = true;
        const err = new Error(`Error output exceeds ${maxBuffer} bytes`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = null;
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (rejected) return;
      if (code !== 0) {
        const err = new Error(`SSH failed with exit code ${code}`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = code;
        reject(err);
      } else {
        resolve(stripNotices(stdout));
      }
    });

    child.on('error', (err) => {
      rejected = true;
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });

    child.stdin.on('error', (err) => {
      rejected = true;
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}
