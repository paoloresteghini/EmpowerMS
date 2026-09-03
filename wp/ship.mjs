import fs from 'node:fs';
import path from 'node:path';

/* The comments in this repository's stylesheets are the reason the bridge is
   maintainable, and they stay in the repository. What they must stop doing is
   travelling: the deploy is a plain rsync of the source, so every visitor pays
   for documentation written for a reader.

   Measured cold on 2026-08-27 (mobile 412x823, Slow 4G, 4x CPU) against the
   homepage on empv2: css/bridge.css is 443 KB on disk and 141 KB over the
   wire, render-blocking, on every converted page. 94% of those bytes are
   comments. The same rules stripped are 4.6 KB gzipped. Across the whole
   homepage cascade the critical path drops from roughly 160 KB gzipped to
   roughly 20 KB.

   This module stages a stripped copy; wp/sync.mjs points its CSS passes at
   the stage. Nothing else about the deploy topology changes, and no source
   file is ever rewritten in place. */

export const SHIP_DIR = '.ship';

/* The three directories of shipped stylesheets, in the same terms FROM_ROOT
   uses. js/, assets/ and patterns/ are deliberately absent: they are not CSS,
   and a stage that quietly swallowed them would be a far larger change than
   this one. */
export const SHIP_CSS_DIRS = ['tokens', 'components', 'css'];

/* bridge.css lives under the theme rather than under the repository's own
   css/, and is synced by its own third rsync pass. It is also the single
   largest render-blocking file on every converted page, so it is the one file
   this module most exists for. */
export const SHIP_THEME_CSS = 'wp/empowerms-child/css';

/*
 * Remove CSS comments without disturbing anything else.
 *
 * A scanner, not a regex, and the reason is `content`: it is the only property
 * in CSS whose value is arbitrary author text, and this build uses it. A stray
 * comment opener inside a quoted value would make /\/\*[\s\S]*?\*\// eat
 * everything up to the next real close, silently deleting whatever sat
 * between them. Quoted strings and unquoted url() tokens are therefore copied
 * through verbatim.
 *
 * Whitespace-only lines left behind by a removed comment are dropped; every
 * other line is preserved as it was. CSS is whitespace-insensitive between
 * tokens, and keeping the remaining line structure means a stripped file is
 * still legible when something goes wrong on the install.
 */
export function stripCss(src) {
  let out = '';
  let i = 0;

  while (i < src.length) {
    const c = src[i];

    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    if (c === '"' || c === "'") {
      out += c;
      i += 1;
      while (i < src.length) {
        if (src[i] === '\\') {
          out += src.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += src[i];
        i += 1;
        if (src[i - 1] === c) break;
      }
      continue;
    }

    /* An unquoted url() token: everything to the closing paren is a URL, not
       CSS syntax, so a `/*` inside one is part of the path. */
    if ((c === 'u' || c === 'U') && /^url\(/i.test(src.slice(i, i + 4))) {
      const end = src.indexOf(')', i);
      if (end !== -1 && !/^\s*['"]/.test(src.slice(i + 4))) {
        out += src.slice(i, end + 1);
        i = end + 1;
        continue;
      }
    }

    out += c;
    i += 1;
  }

  return out
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n')
    .concat('\n');
}

/*
 * Stage the shipped copy under `out`.
 *
 * Every file in each staged directory is copied; only .css files are
 * stripped, so a stylesheet directory that grows a non-CSS file still reaches
 * the install untouched. The stage is rebuilt from scratch each time, which
 * is what keeps a stylesheet deleted from the repository from living on in it.
 *
 * Each staged copy carries its SOURCE file's mtime. Two things depend on that
 * and both are silent when it is wrong: rsync -a compares size and mtime, so
 * fresh mtimes re-upload every stylesheet on every deploy; and
 * empower_asset_ver() keys ?ver= on the server's filemtime, so fresh mtimes
 * also bust every visitor's CSS cache on every deploy, whether or not a byte
 * of CSS changed.
 */
export function buildShipped({ root = process.cwd(), out = SHIP_DIR } = {}) {
  const dest = path.resolve(root, out);
  fs.rmSync(dest, { recursive: true, force: true });

  for (const dir of [...SHIP_CSS_DIRS, SHIP_THEME_CSS]) {
    const from = path.resolve(root, dir);
    const to = path.join(dest, dir);
    fs.mkdirSync(to, { recursive: true });

    for (const name of fs.readdirSync(from)) {
      const source = path.join(from, name);
      const stat = fs.statSync(source);
      if (!stat.isFile()) continue;

      const target = path.join(to, name);
      if (name.endsWith('.css')) {
        fs.writeFileSync(target, stripCss(fs.readFileSync(source, 'utf8')));
      } else {
        fs.copyFileSync(source, target);
      }
      fs.utimesSync(target, stat.atime, stat.mtime);
    }
  }

  return dest;
}

/* Where syncTheme should read `dir` from. CSS comes from the stage; anything
   else comes from the repository, unchanged. */
export function shipSource(dir) {
  return SHIP_CSS_DIRS.includes(dir) ? `${SHIP_DIR}/${dir}/` : `${dir}/`;
}
