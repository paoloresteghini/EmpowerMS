// Dev server with live reload. Never ships — like js/controls.js, this exists
// only to review the reference build locally.
//
//   node dev.mjs            → http://localhost:8000/dist/index.html
//   node dev.mjs --port 9000
//
// What it does that `python3 -m http.server` does not:
//
//   1. Rebuilds dist/index.html when anything in src/ changes, so editing a
//      partial no longer means re-running build.mjs by hand.
//   2. Reloads the open browser tab on any change to src/, css/, js/, tokens/,
//      components/ or assets/.
//   3. Serves everything with no-store, which removes the single most
//      confusing failure mode here: a CSS edit that appears not to apply
//      because the browser held on to the previous stylesheet.
//
// The reload client is injected into the HTTP response, never written to
// dist/index.html. The file on disk stays byte-identical to what build.mjs
// produced, so nothing dev-only can leak into the WordPress hand-off.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import { execFile } from 'node:child_process';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve('.');
const WATCH = ['src', 'css', 'js', 'tokens', 'components', 'assets'];
const portArg = process.argv.indexOf('--port');
const PORT = portArg > -1 ? Number(process.argv[portArg + 1]) : 8000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Injected before </body> on HTML responses only. One EventSource, one reload.
const CLIENT = `
<script>
  // dev.mjs live reload — injected per response, never written to disk.
  new EventSource('/__dev/reload').addEventListener('change', () => location.reload());
</script>
`;

const clients = new Set();
let building = false;
let queued = false;

function build() {
  if (building) { queued = true; return; }
  building = true;
  execFile('node', ['build.mjs'], (err, stdout, stderr) => {
    building = false;
    if (err) {
      process.stdout.write(`\x1b[31mbuild failed\x1b[0m\n${stderr || err.message}\n`);
    } else {
      process.stdout.write(`\x1b[2m${stdout.trim()}\x1b[0m\n`);
    }
    if (queued) { queued = false; build(); }
    else notify();
  });
}

function notify() {
  for (const res of clients) res.write('event: change\ndata: 1\n\n');
}

// fs.watch fires more than once for a single save on macOS; coalesce.
let timer = null;
function onChange(dir, file) {
  if (!file || file.startsWith('.')) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    process.stdout.write(`\x1b[2m${dir}/${file}\x1b[0m\n`);
    // Only src/ feeds the build; everything else is linked live by the page.
    if (dir === 'src') build();
    else notify();
  }, 60);
}

async function serve(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/__dev/reload') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/dist/index.html';

  // Contain every request to the project directory.
  const target = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const info = await stat(target);
    const file = info.isDirectory() ? join(target, 'index.html') : target;
    const ext = extname(file).toLowerCase();
    let body = await readFile(file);

    if (ext === '.html') {
      body = Buffer.from(body.toString('utf8').replace('</body>', `${CLIENT}</body>`));
    }

    res.writeHead(200, {
      'content-type': TYPES[ext] || 'application/octet-stream',
      // The reason this server exists: never serve a stale stylesheet.
      'cache-control': 'no-store, must-revalidate',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
  }
}

build();

for (const dir of WATCH) {
  try {
    watch(dir, { recursive: true }, (_, file) => onChange(dir, file));
  } catch {
    process.stdout.write(`\x1b[2mskipping ${dir}/ (not present)\x1b[0m\n`);
  }
}

createServer(serve).listen(PORT, () => {
  process.stdout.write(
    `\n  \x1b[1mEmpower Mississippi\x1b[0m dev server\n` +
    `  \x1b[36mhttp://localhost:${PORT}/dist/index.html\x1b[0m\n` +
    `  watching ${WATCH.join(', ')} — src/ rebuilds, everything else just reloads\n\n`
  );
});
