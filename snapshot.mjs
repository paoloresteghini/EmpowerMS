import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

/* Two jobs: capture a live Elementor page's rendered HTML once, and serve
   it back locally with this repository's own CSS/JS wired in, so a
   bridge.css edit can be checked in seconds instead of the ~3 minute
   theme-sync + two cache-flushes + live-browser loop that census() and
   controlBoxes() (fidelity-browser.mjs) otherwise require for every
   iteration. The insight this exploits: changing bridge.css never changes
   the CONVERTED PAGE'S MARKUP, only the stylesheet, so the markup can be
   captured once and reused for every CSS-only change.

   serveSnapshot() matches the { url, close } shape serveRepoRoot() already
   uses in test-elementor.mjs, so it is a drop-in swap at call sites.

   What gets rewritten to point at this checkout, and why:
     - wp-content/themes/empowerms-child/{tokens,components,js}/* and
       css/* (except bridge.css) are byte-for-byte the files this repo
       already ships at tokens/, components/, js/ and css/ (see
       functions.php's own wp_enqueue_style/wp_enqueue_script calls), so
       pointing them at the local checkout is exact, not an approximation.
     - wp-content/themes/empowerms-child/css/bridge.css is the one file
       that lives ONLY at wp/empowerms-child/css/bridge.css, not under the
       repo's shared css/, and it is the file this harness exists to let
       you iterate on. It is rewritten ahead of the general css/ rule so
       the general rule does not also catch it and point it at a css/
       path that does not exist.
     - Elementor's own CSS (its plugin stylesheets, and the per-post
       generated stylesheets under wp-content/uploads/elementor/css/) is
       NOT in this repository. The whole problem this conversion exists to
       solve is how that CSS interacts with ours, so dropping it, or
       silently leaving a link tag pointed at a URL that might 404 later,
       would make the snapshot report a page that looks correct and is
       not the page. It is downloaded once at capture() time and cached
       alongside the snapshot (frozen at the moment of capture, same as
       the markup itself) rather than re-fetched from the install on
       every serveSnapshot() call: it does not change when bridge.css
       changes, so re-fetching it live on every run would only add
       network latency for no benefit, and a cached copy still works if
       the install happens to be down or slow when a snapshot is served.
       Known limitation, left as is because it is out of what
       census()/controlBoxes() measure: a relative url(...) reference
       INSIDE one of these cached stylesheets (an icon font, for example)
       is not itself fetched or cached, so it will 404 against the local
       server. Neither instrument reads glyph rendering, only computed
       box/type/color properties, so this has not been observed to change
       either instrument's result, but a future page that leans on such an
       asset visually should watch for it.
     - Everything else (Elementor's own JS, WordPress core JS, third-party
       plugin CSS/JS, uploaded photographs) is left exactly as the live
       page wrote it: an absolute https://<install>/... URL that the
       browser fetches from the real install. None of it is part of what
       this harness measures, and caching all of it would turn "one page,
       one snapshot" into a second copy of a live WordPress site.

   Third-party marketing scripts, stripped rather than pointed anywhere:
   the Facebook pixel, MailMunch, and Cloudflare's injected challenge
   script. MailMunch specifically injects a popup overlay several seconds
   after load that can intercept clicks and add its own form controls to
   the page; fidelity-browser.mjs's own checkFilter() comment already
   documents this same popup and works around it with { force: true }.
   Cloudflare's script and MailMunch both keep the browser's network
   non-idle. None of the three has any effect on the properties census()
   or controlBoxes() read, so removing them removes noise, not signal.
   Other third-party plugins present on the page (ProveSource,
   ActiveCampaign's tracker, a Mailchimp "connected site" widget, WP User
   Avatar) are left untouched and pointed at the install: they were not
   named in the brief for this tool, and every fidelity run against the
   live page today already runs with them present, so leaving them in
   place keeps the snapshot's set of active third parties, not just its
   markup, an honest match for what the live comparison already tolerates. */

const SNAPSHOT_ROOT = path.join(process.cwd(), '.snapshots');

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

/* Elementor's own CSS: its plugin stylesheets, plus the per-post generated
   stylesheets WordPress writes under wp-content/uploads/elementor/css/.
   Matched by path, not by link id: the per-post ones carry a numeric post
   ID in the id attribute too (id="elementor-post-20588-css"), and this
   harness has no reason to know or hard-code which posts back a given
   page ahead of time. */
function isElementorCss(href) {
  return /\/wp-content\/plugins\/elementor(?:-pro)?\/assets\/css\/[^"'?]*\.css/.test(href)
    || /\/wp-content\/uploads\/elementor\/css\/[^"'?]*\.css/.test(href);
}

function basenameOf(href) {
  return href.split('?')[0].split('#')[0].split('/').pop();
}

/* Capture: fetch the live page once, save its raw HTML exactly as served
   (no rewriting here; that is serveSnapshot()'s job, kept separate so the
   saved artifact stays a true record of what the install returned), and
   download every Elementor stylesheet the page references alongside it. */
export async function capture(url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`capture: ${url} responded ${res.status}`);
  const html = await res.text();

  const dir = path.join(SNAPSHOT_ROOT, name);
  fs.mkdirSync(path.join(dir, 'elementor'), { recursive: true });

  const elementorAssets = [];
  const seen = new Set();
  const hrefRe = /href=(["'])((?:https?:)?\/\/[^"']*?\.css[^"']*)\1/g;
  let m;
  while ((m = hrefRe.exec(html))) {
    const href = m[2];
    if (!isElementorCss(href) || seen.has(href)) continue;
    seen.add(href);
    const assetUrl = href.startsWith('//') ? `https:${href}` : href;
    const cssRes = await fetch(assetUrl);
    if (!cssRes.ok) throw new Error(`capture: Elementor stylesheet ${assetUrl} responded ${cssRes.status}`);
    const basename = basenameOf(href);
    fs.writeFileSync(path.join(dir, 'elementor', basename), await cssRes.text());
    elementorAssets.push({ href, basename });
  }

  fs.writeFileSync(path.join(dir, 'page.html'), html);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({
    url, origin: new URL(url).origin, fetchedAt: new Date().toISOString(), elementorAssets,
  }, null, 2));

  return { dir, elementorAssetCount: elementorAssets.length };
}

/* Serve: read back a capture(), rewrite it to point at this checkout (see
   the file header comment for exactly what moves and what stays live),
   strip the third-party marketing scripts, and hand back a running server
   with the same { url, close } shape serveRepoRoot() uses in
   test-elementor.mjs. */
export function serveSnapshot(name) {
  const dir = path.join(SNAPSHOT_ROOT, name);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  let html = fs.readFileSync(path.join(dir, 'page.html'), 'utf8');

  const themeBase = `${meta.origin}/wp-content/themes/empowerms-child`;
  /* Bridge first: it also lives under .../css/, and the generic css/ rule
     below would otherwise catch it first and point it at a css/bridge.css
     path this repo does not have. */
  html = html.split(`${themeBase}/css/bridge.css`).join('/wp/empowerms-child/css/bridge.css');
  html = html.split(`${themeBase}/tokens/`).join('/tokens/');
  html = html.split(`${themeBase}/components/`).join('/components/');
  html = html.split(`${themeBase}/css/`).join('/css/');
  html = html.split(`${themeBase}/js/`).join('/js/');

  for (const { href, basename } of meta.elementorAssets) {
    html = html.split(href).join(`/_elementor-css/${basename}`);
  }

  /* Third-party marketing scripts. See the file header comment for why
     these three, specifically, are removed rather than left pointing at
     the install. The Facebook pixel block is wrapped in its own HTML
     comment markers on this install, which is the cleanest anchor to cut
     on; MailMunch and Cloudflare's injector are not, so those two are
     matched by a substring anywhere in a <script>...</script> tag, which
     is robust to the attribute order/quoting WordPress happens to emit. */
  html = html.replace(/<!-- Facebook Pixel Code -->[\s\S]*?<!-- End Facebook Pixel Code -->/, '');
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => (
    /mmunch/i.test(tag) || tag.includes('cdn-cgi/challenge-platform') ? '' : tag
  ));

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (urlPath.startsWith('/_elementor-css/')) {
      const filePath = path.join(dir, 'elementor', path.basename(urlPath));
      fs.readFile(filePath, (err, body) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
        res.end(body);
      });
      return;
    }
    /* Everything else the rewrites above point at (tokens/, components/,
       css/, js/, wp/empowerms-child/css/bridge.css) lives at that same
       path in this checkout, so it is the same static file lookup
       serveRepoRoot() uses in test-elementor.mjs. */
    const filePath = path.join(process.cwd(), urlPath);
    fs.readFile(filePath, (err, body) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': STATIC_TYPES[path.extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    });
  });

  return new Promise((resolve) => {
    server.listen(0, () => resolve({
      url: `http://localhost:${server.address().port}/`,
      close: () => new Promise((r) => server.close(r)),
    }));
  });
}
