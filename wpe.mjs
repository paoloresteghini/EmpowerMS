import { spawn } from 'node:child_process';

const HOST = 'empv2@empv2.ssh.wpengine.net';
const KEY = `${process.env.HOME}/.ssh/wpengine_ed25519`;
const ROOT = '/nas/content/live/empv2';

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
   parentheses get mangled by the gateway's argument handling. */
export async function wpe(command) {
  return new Promise((resolve, reject) => {
    const script = `cd ${ROOT} || exit 1\n${command}\n`;
    const child = spawn('ssh', [
      '-i', KEY,
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=30',
      HOST,
      'bash', '-s',
    ]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`SSH failed with exit code ${code}: ${stderr}`));
      } else {
        resolve(stripNotices(stdout));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    child.stdin.write(script);
    child.stdin.end();
  });
}
