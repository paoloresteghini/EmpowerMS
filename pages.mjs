/* Assemble _site/ for GitHub Pages. Never ships to WordPress.

   This exists because dist/ is NOT a self-contained site. Every built page
   references ../assets/, ../css/, ../js/, ../tokens/ and ../components/, and
   the stylesheets reach for ../patterns/ — all relative to dist/, which is one
   level deep by design (see the note in build.mjs). Publishing dist/ alone
   would resolve every one of those above the site root and serve five pages
   with no CSS, no fonts and no photography.

   So the published tree mirrors the repo: dist/ plus the directories it points
   at, with the same depth, so not a single path in the hand-off files has to
   change to make them work on a public URL.

   Two things are added that do NOT exist in the hand-off:

     robots.txt   disallowing every crawler
     noindex      injected into each built page's <head>

   Both are deliberate. This is a client review link for unreleased brand work
   and stand-in photography that is not licensed for publication — it needs to
   be reachable by anyone holding the URL and invisible to search engines. The
   injection happens HERE, on the copy under _site/, so the files in dist/ and
   src/ stay byte-identical to what the WordPress hand-off gets. */

import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = '_site';

/* Every directory a built page or stylesheet references as ../<dir>/. Derived
   by hand from the link/src/url() prefixes; if a page ever reaches for a new
   one, it will 404 on Pages while working locally, which is exactly the kind
   of drift the test at the bottom of test.mjs guards against. */
const SHARED = ['assets', 'components', 'css', 'js', 'tokens', 'patterns'];

rmSync(OUT, { recursive: true, force: true });
execFileSync('node', ['build.mjs'], { stdio: 'inherit' });

mkdirSync(OUT, { recursive: true });
for (const dir of SHARED) cpSync(dir, `${OUT}/${dir}`, { recursive: true });
cpSync('dist', `${OUT}/dist`, { recursive: true });

/* The chooser already ships noindex — it was always a review-only page — so
   this only adds the tag where it is missing rather than doubling it up. */
let tagged = 0;
for (const file of readdirSync(`${OUT}/dist`)) {
  if (!file.endsWith('.html')) continue;
  const path = `${OUT}/dist/${file}`;
  const html = readFileSync(path, 'utf8');
  if (/name="robots"/.test(html)) continue;
  writeFileSync(path, html.replace('</head>', '<meta name="robots" content="noindex">\n</head>'));
  tagged++;
}

writeFileSync(`${OUT}/robots.txt`, 'User-agent: *\nDisallow: /\n');

/* The site root is a redirect rather than a copy of the chooser: a copy would
   be a second set of the same links at a different depth, and every href in
   the chooser is relative to dist/. */
writeFileSync(`${OUT}/index.html`, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=dist/index.html">
<title>Empower Mississippi — homepage options</title>
</head>
<body>
<p><a href="dist/index.html">Empower Mississippi — homepage options</a></p>
</body>
</html>
`);

console.log(`_site assembled — ${SHARED.length} shared dirs, noindex added to ${tagged} pages`);
