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

/* ONE REVIEW PAGE THAT IS NOT A BUILT PAGE. docs/post-description-review.html
   is hand-authored: it lists all 490 blog posts with the search description
   each one serves today beside a shorter proposal, for Empower to approve
   before anything is written to the install. It has no place in dist/, which
   is the WordPress hand-off, so it lives in docs/ with pattern-lab.html and is
   copied in here.
   PUBLISHED UNDER dist/ DELIBERATELY, at the same depth as every other page
   Empower is sent, so the link has the shape they already recognise -- and so
   the noindex loop below covers it without being taught about a second
   directory. The page is entirely self-contained (its CSS and JS are inline
   and its only external request is Google Fonts), so unlike the built pages it
   needs none of the shared directories above. */
{
  /* WRAPPED, NOT COPIED, and the first version of this was a copy. The source
     is authored as an Artifact page, which means it is a FRAGMENT: no doctype,
     no <html>, no <head>. Copied straight in it served in quirks mode with no
     charset declaration, and the noindex loop below reported success while
     doing nothing at all, because its injection point is the literal string
     "</head>" and there was none. Nothing errored either way.
     Split at the end of the single <style> block: everything above it is the
     title, the font link and the stylesheet, which belong in the head;
     everything below is the page. */
  const fragment = readFileSync('docs/post-description-review.html', 'utf8');
  const split = fragment.indexOf('</style>') + '</style>'.length;
  if (split < 20) throw new Error('post-description-review.html has no <style> block to split on');
  const title = (fragment.match(/<title>([^<]*)<\/title>/) ?? [, 'Post description review'])[1];
  writeFileSync(`${OUT}/dist/post-description-review.html`, `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
${fragment.slice(0, split).replace(/<title>[^<]*<\/title>\s*/, '')}
</head>
<body>
${fragment.slice(split)}
</body>
</html>
`);
}

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
