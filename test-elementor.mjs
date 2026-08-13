import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { stripNotices, wpe } from './wpe.mjs';
import { container, heading, text, image, link, html, loopGrid, elementId } from './elementor/factory.mjs';
import { flushPageCache, fetchConverted, checkCopy, checkSections } from './fidelity.mjs';
import { section as podcastHero } from './elementor/pages/podcast-a/01-hero.mjs';
import { section as podcastAbout } from './elementor/pages/podcast-a/02-about.mjs';
import {
  section as podcastLibrary, loopItem as podcastLoopItem,
  LOOP_ITEM_POST_ID as podcastLoopItemPostId, PODCAST_CATEGORY_ID as podcastCategoryId,
} from './elementor/pages/podcast-a/03-library.mjs';
import { POST_ID as podcastAPostId, sections as podcastASections } from './elementor/pages/podcast-a/page.mjs';
import { deployPage, deployLoopItem } from './elementor/deploy.mjs';

/* The computed-style comparison test below reads dist/podcast-a.html
   directly (served locally, not fetched from the live install), so it needs
   dist/ to actually be current. test.mjs already does exactly this at
   import time for the same reason; `npm test` runs test.mjs first, so by
   the time this file runs as part of that script dist/ is already fresh,
   but this file is also run standalone throughout this task
   (`node --test test-elementor.mjs`), and a stale dist/podcast-a.html would
   make that test compare the converted page against last week's static
   build without any signal that anything was wrong. Rebuilding here too
   costs one build.mjs run and removes that gap. */
execFileSync('node', ['build.mjs'], { stdio: 'inherit' });

/* A minimal static file server for the repo root, so the computed-style test
   can serve dist/podcast-a.html (and the tokens/css/js it references via
   ../ relative paths) over real HTTP rather than file://, the same
   distinction dev.mjs's own comment makes. Deliberately not dev.mjs itself:
   dev.mjs also rebuilds on file changes and injects a live-reload client,
   neither of which a one-shot computed-style read needs, and dev.mjs binds
   a fixed default port that could collide with one already running.
   Listening on port 0 hands back an OS-assigned free port instead. */
const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
};

function serveRepoRoot() {
  const server = http.createServer((req, res) => {
    const filePath = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(filePath, (err, body) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': STATIC_TYPES[path.extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, () => resolve({
      url: `http://localhost:${server.address().port}`,
      close: () => new Promise((r) => server.close(r)),
    }));
  });
}

/* Elementor's logger writes deprecation notices into WP-CLI's stdout. They
   arrive in two shapes and BOTH have been seen on this install: as their own
   block, and appended directly onto the end of a data line with no newline
   between the value and the notice. The second shape is why a line filter is
   not enough. */

test('strips a standalone notice block', () => {
  const raw = [
    'https://empv2.wpenginepowered.com',
    "PHP: 2026-08-12 19:54:58 [notice X 0][/nas/content/live/empv2/wp-content/plugins/elementor/x.php::410] Elementor\\Modules::get() deprecated [array (",
    "  'trace' => '",
    '#0: Elementor\\Core\\Logger\\Manager -> shutdown()',
    "',",
    ')]',
    'Empower Mississippi',
  ].join('\n');
  assert.equal(stripNotices(raw), 'https://empv2.wpenginepowered.com\nEmpower Mississippi');
});

test('strips a notice appended to the end of a data line', () => {
  const raw = 'published pages:          52PHP: 2026-08-12 20:03:26 [notice X 0][/nas/x.php::410] deprecated [array (\n)]';
  assert.equal(stripNotices(raw), 'published pages:          52');
});

test('leaves clean output untouched', () => {
  const raw = 'name,status,version\nelementor,active,4.2.1';
  assert.equal(stripNotices(raw), raw);
});

test('does not eat a legitimate line that merely mentions PHP', () => {
  const raw = 'PHP version is 8.4\nnext line';
  assert.equal(stripNotices(raw), raw);
});

test('wpe() rejects when output exceeds 32 MiB buffer', async () => {
  /* Test buffer cap by creating a fake ssh binary that outputs > 32 MiB.
     This exercises the real wpe() function, real spawn call, and real buffer
     cap without requiring network access or WP Engine install. */
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wpe-test-'));
  const sshPath = path.join(tmpDir, 'ssh');

  /* Create a portable fake ssh executable using Node.js to generate output
     slightly exceeding 32 MiB (33554432 bytes). */
  const script = `#!/usr/bin/env node
process.stdout.write('x'.repeat(34000000));
`;

  fs.writeFileSync(sshPath, script);
  fs.chmodSync(sshPath, 0o755);

  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;

  let rejected;
  try {
    await wpe('anything');
  } catch (err) {
    rejected = err;
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  if (!rejected) assert.fail('wpe() should have rejected due to buffer exceeded');
  assert.ok(rejected.message, 'error should have a message');
  assert.match(rejected.message, /exceeds.*bytes/i, 'error message should mention buffer exceeded');
  assert(rejected.stdout !== undefined, 'error should have stdout property');
  assert(rejected.stderr !== undefined, 'error should have stderr property');
});

/* --- elementor/factory.mjs -------------------------------------------- */

const REF = JSON.parse(fs.readFileSync('fixtures/elementor/reference-section.json', 'utf8'));

/* The factories are tested against the captured reference rather than against
   a shape we invented. If Elementor changes its schema, recapture the fixture
   and these tests fail loudly instead of the conversion failing quietly. */

/* Containers and widgets persist their CSS class under different keys
   (css_classes vs _css_classes; see docs/elementor/schema-4.2.2.md), so the
   lookup has to check both rather than assume one. The brief's original
   version of this helper checked only _css_classes, which cannot ever find
   the outer container: containers don't have that key. */
const findByClass = (nodes, cls) => {
  for (const n of nodes) {
    const classes = n.settings?.css_classes ?? n.settings?._css_classes ?? '';
    if (classes.split(/\s+/).includes(cls)) return n;
    const hit = n.elements?.length ? findByClass(n.elements, cls) : null;
    if (hit) return hit;
  }
  return null;
};

test('every element carries a unique 7-character hex id', () => {
  const ids = new Set(Array.from({ length: 500 }, () => elementId()));
  assert.equal(ids.size, 500, 'element ids collided');
  for (const id of ids) assert.match(id, /^[0-9a-f]{7}$/);
});

test('container() matches the captured container shape', () => {
  /* Narrowed from the brief's draft: the fixture shows the container's class
     key is css_classes (no underscore), not _css_classes. Asserting
     _css_classes here would check a key the captured container doesn't have. */
  const ref = findByClass(REF, 'zz-probe');
  assert.ok(ref, 'fixture has no .zz-probe container; recapture it');
  const made = container({ cssClass: 'zz-probe', tag: 'section' }, []);
  assert.equal(made.elType, ref.elType);
  assert.equal(made.settings.css_classes, 'zz-probe');
  assert.ok('css_classes' in ref.settings, 'captured container has no css_classes; the schema notes are wrong');
});

test('heading() matches the captured heading shape', () => {
  const ref = findByClass(REF, 'zz-probe__title');
  assert.ok(ref, 'fixture has no .zz-probe__title heading; recapture it');
  const made = heading({ text: 'Probe heading', tag: 'h2', cssClass: 'zz-probe__title' });
  assert.equal(made.elType, 'widget');
  assert.equal(made.widgetType, ref.widgetType);
  assert.equal(made.settings._css_classes, 'zz-probe__title');
});

test('text() matches the captured text-editor shape', () => {
  const ref = findByClass(REF, 'zz-probe__body');
  assert.ok(ref, 'fixture has no .zz-probe__body text-editor; recapture it');
  const made = text({ markup: '<p>x</p>', cssClass: 'zz-probe__body' });
  assert.equal(made.widgetType, ref.widgetType);
  assert.equal(made.settings.editor, '<p>x</p>');
  assert.equal(made.settings._css_classes, 'zz-probe__body');
  assert.ok('editor' in ref.settings, 'captured text-editor has no editor key; the schema notes are wrong');
});

test('image() matches the captured image shape', () => {
  const ref = findByClass(REF, 'zz-probe__photo');
  assert.ok(ref, 'fixture has no .zz-probe__photo image; recapture it');
  const made = image({ id: 20520, url: 'https://example.com/x.jpg', cssClass: 'zz-probe__photo' });
  assert.equal(made.widgetType, ref.widgetType);
  assert.equal(made.settings.image.id, 20520);
  assert.equal(made.settings.image.url, 'https://example.com/x.jpg');
  assert.equal(made.settings._css_classes, 'zz-probe__photo');
  assert.ok(typeof ref.settings.image === 'object', 'captured image setting is not an object; the schema notes are wrong');
});

test('link() matches the captured button shape', () => {
  const ref = findByClass(REF, 'zz-probe__action');
  assert.ok(ref, 'fixture has no .zz-probe__action button; recapture it');
  const made = link({ label: 'Probe action', href: 'https://example.org/probe', cssClass: 'zz-probe__action' });
  assert.equal(made.elType, 'widget');
  assert.equal(made.widgetType, ref.widgetType);
  assert.equal(made.settings.text, 'Probe action');
  assert.equal(made.settings.link.url, 'https://example.org/probe');
  assert.equal(made.settings._css_classes, 'zz-probe__action');
});

test('html() matches the captured html shape', () => {
  const ref = findByClass(REF, 'zz-probe__svg');
  assert.ok(ref, 'fixture has no .zz-probe__svg html widget; recapture it');
  const svg = '<svg width="10" height="10"></svg>';
  const made = html({ markup: svg, cssClass: 'zz-probe__svg' });
  assert.equal(made.widgetType, ref.widgetType);
  assert.equal(made.settings.html, svg);
  assert.equal(made.settings._css_classes, 'zz-probe__svg');
});

test('loopGrid() matches the captured loop-grid shape', () => {
  const ref = findByClass(REF, 'pca-eps');
  assert.ok(ref, 'fixture has no .pca-eps loop-grid; recapture it');
  assert.equal(ref.widgetType, 'loop-grid', 'the pca-eps node in the fixture is not a loop-grid widget');
  const made = loopGrid({ templateId: 20555, cssClass: 'pca-eps', columns: 3 });
  assert.equal(made.elType, 'widget');
  assert.equal(made.widgetType, 'loop-grid');
  assert.equal(made.settings.template_id, 20555);
  assert.equal(made.settings._css_classes, 'pca-eps');
  assert.equal(made.settings.columns, 3);
  assert.ok('template_id' in ref.settings, 'captured loop-grid has no template_id key; the schema notes are wrong');
});

test('loopGrid() passes query settings through to the widget settings unnamed', () => {
  const made = loopGrid({
    templateId: 20555,
    cssClass: 'pca-eps',
    post_query_post_type: 'post',
    post_query_include: 'terms',
    post_query_include_term_ids: ['133'],
    posts_per_page: 100,
  });
  assert.equal(made.settings.post_query_post_type, 'post');
  assert.equal(made.settings.post_query_include, 'terms');
  assert.deepEqual(made.settings.post_query_include_term_ids, ['133']);
  assert.equal(made.settings.posts_per_page, 100);
});

test('loopGrid() rejects a non-integer templateId before building anything', () => {
  assert.throws(() => loopGrid({ templateId: 'not-a-number' }), /templateId/);
  assert.throws(() => loopGrid({ templateId: undefined }), /templateId/);
});

test('container() nests its children', () => {
  const made = container({ cssClass: 'outer' }, [heading({ text: 'x', tag: 'h2' })]);
  assert.equal(made.elements.length, 1);
  assert.equal(made.elements[0].settings.title, 'x');
});

/* The enqueue order IS the design. site.css carries every local WCAG override,
   and a build that loads it before components.css loses them. The order is
   asserted here rather than trusted to a hand-written list in the README. */
test('the child theme enqueues every token, in cascade order, before components and site', () => {
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');

  /* The token paths are BUILT from an array in functions.php, so asserting the
     literal string "tokens/base.css" would test a file that never contains it.
     Assert the array's contents and order instead, which is the real contract. */
  const arr = fn.match(/EMPOWER_TOKENS\s*=\s*array\(([\s\S]*?)\)/);
  assert.ok(arr, 'functions.php has no EMPOWER_TOKENS array');
  const tokens = [...arr[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(
    tokens,
    ['base', 'colors', 'elevation', 'fonts', 'motion', 'radius', 'spacing', 'typography'],
    'the token cascade is incomplete or out of order',
  );

  /* Every one of the eight must exist on disk, or the enqueue 404s silently. */
  for (const t of tokens) assert.ok(fs.existsSync(`tokens/${t}.css`), `tokens/${t}.css does not exist`);

  /* site.css carries the shared chrome and every local WCAG override, so it
     must come after components.css. Getting this backwards drops the contrast
     fixes and nothing errors. */
  const components = fn.indexOf('components/components.css');
  const site = fn.indexOf('css/site.css');
  assert.ok(components > -1, 'functions.php never enqueues components.css');
  assert.ok(site > components, 'site.css is enqueued before components.css');
  /* site.css's dependency array is built into $site_deps rather than passed
     as an array literal, because UiCore's handle is added to it
     conditionally (see the next test). Assert the built array still starts
     with empower-components and is what actually gets enqueued. */
  assert.match(fn, /\$site_deps\s*=\s*array\(\s*'empower-components'/,
    'site.css does not declare components.css as a dependency, so the order is not guaranteed');
  assert.match(fn, /wp_enqueue_style\(\s*'empower-site'[^)]*\$site_deps/,
    'site.css is not enqueued with $site_deps, so the built dependency array is never used');
});

/* The spec's own risk table says UiCore's globals must be reconciled during
   foundations: "the child theme's enqueue must win." A file-level test
   cannot prove cascade order on a live install, but it can prove the file
   takes the precaution: a guarded dependency (so a renamed or missing
   UiCore handle costs only the ordering guarantee, not css/site.css
   entirely) and a priority late enough to run after UiCore actually enqueues
   its stylesheet, which happens at priority 50 in UiCore's own
   frontend_css(). */
test('the styles enqueue guards against UiCore loading after site.css', () => {
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.match(fn, /wp_style_is\(\s*'uicore_global'\s*,\s*'registered'\s*\)/,
    'functions.php never checks whether uicore_global is registered before depending on it');
  assert.match(fn, /\$site_deps\[\]\s*=\s*'uicore_global'/,
    'functions.php checks for uicore_global but never adds it to the dependency array');
  const priority = fn.match(/EMPOWER_STYLES_PRIORITY\s*=\s*(\d+)/);
  assert.ok(priority, 'functions.php has no EMPOWER_STYLES_PRIORITY constant');
  assert.ok(Number(priority[1]) > 50,
    'styles enqueue priority is not late enough to run after UiCore enqueues uicore_global at 50');
});

/* Generalised from a motion-only version whose guard, `fn.includes('motion')`,
   was always true (EMPOWER_TOKENS contains the string 'motion' for
   tokens/motion.css, a different file from css/motion.css) and so only ever
   covered one pair by accident. Rather than hand-list every css/js pair the
   static build cares about, which is how an earlier sweep passed while
   covering almost nothing, derive the pairs from dist/*.html itself: a js
   file is "required" by a css file when every dist page carrying that css
   also carries that js. This naturally reproduces the motion pair
   (css/motion.css requires js/reveal.js, confirmed by hand against the
   derived map) and catches the same class of defect for every other
   stylesheet the theme is capable of enqueueing, including ones added later. */
test('every stylesheet the theme can enqueue can also enqueue its paired script', () => {
  const distFiles = fs.readdirSync('dist').filter(f => f.endsWith('.html'));
  assert.ok(distFiles.length > 0, 'no dist/*.html pages to derive script pairings from');

  const pages = distFiles.map(f => {
    const html = fs.readFileSync(path.join('dist', f), 'utf8');
    return {
      css: new Set([...html.matchAll(/css\/([a-z0-9-]+)\.css/g)].map(m => m[1])),
      js: new Set([...html.matchAll(/js\/([a-z0-9-]+)\.js/g)].map(m => m[1])),
    };
  });

  const requiredJs = new Map(); // css basename -> Set of js basenames present on every page carrying it
  for (const page of pages) {
    for (const css of page.css) {
      const current = requiredJs.get(css);
      requiredJs.set(css, current ? new Set([...current].filter(j => page.js.has(j))) : new Set(page.js));
    }
  }

  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  for (const [css, jsSet] of requiredJs) {
    /* A stylesheet the theme has no way to enqueue yet (its basename never
       appears quoted in functions.php, e.g. css/megamenu.css today) is out
       of scope: nothing to check until a later change makes it reachable. */
    if (!fn.includes(`'${css}'`)) continue;
    for (const js of jsSet) {
      assert.ok(fn.includes(`'${js}'`) || fn.includes(`js/${js}.js`),
        `css/${css}.css is enqueueable but its required js/${js}.js is not`);
    }
  }
});

test('the child theme declares UiCore as its parent', () => {
  const style = fs.readFileSync('wp/empowerms-child/style.css', 'utf8');
  assert.match(style, /Template:\s*uicore-pro/, 'child theme does not declare uicore-pro as parent');
});

test('no stylesheet is duplicated into the child theme by hand', () => {
  /* tokens/, components/, css/ and js/ are SYNCED from the repository root at
     deploy time, never copied into wp/. A second copy drifts from the first and
     the drift is invisible until a page renders wrong. Asserting sync.mjs names
     the five directories is not enough on its own: it would pass unchanged if
     someone hand-copied one of them into wp/empowerms-child/ anyway, and with
     the first rsync now excluding those directories (see wp/sync.mjs), a
     hand-copied directory would sit there uploaded as-is instead of being
     overwritten by the sync loop. */
  const syncSrc = fs.readFileSync('wp/sync.mjs', 'utf8');
  for (const dir of ['tokens', 'components', 'css', 'js', 'assets']) {
    assert.ok(syncSrc.includes(`'${dir}'`), `wp/sync.mjs does not sync ${dir}/`);
    assert.ok(!fs.existsSync(`wp/empowerms-child/${dir}`), `wp/empowerms-child/${dir} exists as a hand-made duplicate`);
  }
});

/* --- fidelity.mjs ------------------------------------------------------- */

test('checkCopy reports every approved string the page is missing', () => {
  const live = '<h1>Real Solutions</h1><p>For Mississippi</p>';
  assert.deepEqual(checkCopy(live, ['Real Solutions', 'For Mississippi']), []);
  assert.deepEqual(checkCopy(live, ['Real Solutions', 'Not present']), ['Not present']);
});

test('checkCopy sees through markup split inside a string', () => {
  /* Elementor wraps and splits text far more than the static build does. A
     copy check that only does indexOf on the raw HTML reports false failures
     the moment a heading gains a wrapper mid-sentence. */
  const live = '<h1>Real <span>Solutions</span> For All</h1>';
  assert.deepEqual(checkCopy(live, ['Real Solutions For All']), []);
});

test('checkSections reports missing and out-of-order sections', () => {
  const live = '<div class="pca-hero"></div><div class="pca-about"></div><div class="pca-library"></div>';
  assert.deepEqual(checkSections(live, ['pca-hero', 'pca-about', 'pca-library']), []);
  assert.deepEqual(checkSections(live, ['pca-hero', 'pca-missing']), ['pca-missing']);
  assert.deepEqual(
    checkSections(live, ['pca-library', 'pca-hero']),
    ['pca-hero is out of order'],
  );
});

/* checkCopy() flattened every tag to a plain space, so two unrelated block
   elements sitting next to each other could satisfy a deck string that
   spans their boundary, the exact failure this check exists to catch: a
   heading genuinely dropped during conversion would pass, because its words
   happened to survive split across its neighbours. Pinned here with the
   two cases that proved the defect, so a regression fails loudly. */
test('checkCopy does not let two unrelated block elements satisfy one deck string across their boundary', () => {
  assert.deepEqual(checkCopy('<h1>Real</h1><p>Solutions</p>', ['Real Solutions']), ['Real Solutions']);
  assert.deepEqual(
    checkCopy('<h2>Our Work</h2><h2>Education First</h2>', ['Work Education']),
    ['Work Education'],
  );
});

/* The fix above stripped block tags with a regex that requires a letter
   right after "<" or "</". An HTML comment opens with "<!--", so it never
   matched and a comment's body survived as literal text inside a segment,
   reopening the same failure class through a different door: copy that is
   not really on the page (only noted in a comment) reading as present. */
test('checkCopy does not let a comment body satisfy a deck string that is not really on the page', () => {
  const live = '<div><!-- Real Solutions For All is not shipped, keeping as a note --></div><h1>Different Heading</h1>';
  assert.deepEqual(checkCopy(live, ['Real Solutions For All']), ['Real Solutions For All']);
});

/* checkSections searched raw liveHtml and never went through the comment
   strip checkCopy gained above, because that strip lived inside segments(),
   which only checkCopy calls. A section deleted during conversion but left
   behind commented out still carries its class inside the comment, so the
   class-search regex found it there and reported the section present. This
   is the more damaging sibling of the checkCopy case: it is the check that
   a whole section still exists and is in the right place, and "removed but
   left commented out" is the single most likely way a section disappears
   from a page while the markup still mentions it. */
test('checkSections does not let a commented-out section read as present', () => {
  const live = '<!-- <div class="pca-hero">removed during conversion</div> --><div class="pca-about"></div>';
  assert.deepEqual(checkSections(live, ['pca-hero']), ['pca-hero']);
});

/* WP Engine's page cache can hand back a stale, pre-conversion copy of a page
   while still reporting HTTP 200 (seen for real during Task 4: x-cache: HIT
   on a page that had none of the new stylesheets). fetchConverted() must
   never trust a 200 alone; it has to read x-cache on the actual response.
   These three tests stub global.fetch with a fake Response-shaped object, so
   the stale case is proven without any network access or live install. */

test('fetchConverted throws loudly on a cache HIT rather than returning stale content', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: name => (name.toLowerCase() === 'x-cache' ? 'HIT: 3' : null) },
    text: async () => 'stale content',
  });
  try {
    await assert.rejects(() => fetchConverted('https://empv2.example/page'), /x-cache: HIT/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('fetchConverted returns the page when x-cache reports MISS', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: name => (name.toLowerCase() === 'x-cache' ? 'MISS' : null) },
    text: async () => 'fresh content',
  });
  try {
    assert.equal(await fetchConverted('https://empv2.example/page'), 'fresh content');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('fetchConverted does not mistake an absent x-cache header for a stale page', async () => {
  /* A local file or a host with no page cache in front of it sends no
     x-cache header at all. Absent must not be treated the same as HIT, or
     the harness would refuse to work off-install. */
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => 'plain content',
  });
  try {
    assert.equal(await fetchConverted('https://example.com/page'), 'plain content');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('fetchConverted still throws on a bad HTTP status', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    headers: { get: () => null },
    text: async () => '',
  });
  try {
    await assert.rejects(() => fetchConverted('https://example.com/missing'), /404/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

/* flushPageCache() is the other half of the stale-cache defence: one flush
   at the start of a harness run, over the same wpe() SSH channel used
   elsewhere, so the run starts from a known-fresh cache instead of relying
   solely on the per-fetch header check. Exercised the same way the existing
   32 MiB wpe() test does: a fake ssh binary on PATH, no network. */

test('flushPageCache resolves when wp page-cache flush reports success', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wpe-flush-ok-'));
  const sshPath = path.join(tmpDir, 'ssh');
  fs.writeFileSync(sshPath, '#!/usr/bin/env node\nprocess.stdout.write("Success: Page Cache was flushed.\\n");\n');
  fs.chmodSync(sshPath, 0o755);
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    const out = await flushPageCache();
    assert.match(out, /Success/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('flushPageCache throws loudly when wp page-cache flush does not report success', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wpe-flush-fail-'));
  const sshPath = path.join(tmpDir, 'ssh');
  fs.writeFileSync(sshPath, '#!/usr/bin/env node\nprocess.stdout.write("Error: something went wrong\\n");\n');
  fs.chmodSync(sshPath, 0o755);
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await assert.rejects(() => flushPageCache(), /did not report success/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

/* --- elementor/pages/podcast-a/01-hero.mjs ------------------------------ */

test('the podcast hero mapping carries the section class and its copy', () => {
  const tree = podcastHero();
  const flat = JSON.stringify(tree);
  const source = fs.readFileSync('src/podcast-a/sections/01-hero.html', 'utf8');

  /* Derived from the source partial, never typed by hand: a copy deck typed
     from memory is a second source of truth and drifts from the first.
     The brief's draft used a {12,} floor on the run length, which silently
     drops "Listen Now" (10 characters) from the deck; a real copy string
     going unchecked is exactly the failure this test exists to catch, so the
     floor is lowered to {1,} rather than kept at a number picked to fit the
     longest string in the section by coincidence. Verified this admits no
     noise: run against src/podcast-a/sections/01-hero.html, {1,} yields the
     same six clean strings {12,} yields plus "Listen Now", and nothing else
     (the leading HTML comment contains no stray '<' or '>'). */
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `hero mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('pca-hero'), 'hero mapping does not carry the pca-hero class');
});

/* --- elementor/pages/podcast-a/02-about.mjs ----------------------------- */

test('the podcast about mapping carries the section class and its copy', () => {
  const tree = podcastAbout();
  const flat = JSON.stringify(tree);
  const source = fs.readFileSync('src/podcast-a/sections/02-about.html', 'utf8');

  /* Same derivation as the hero test above: a copy deck read from the
     source partial by regex, never typed by hand. {1,} rather than a higher
     floor, for the same reason recorded there (a higher floor can silently
     drop a short approved string without ever failing). */
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `about mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('pca-about'), 'about mapping does not carry the pca-about class');

  /* team-bio.html is a static-build path that 404s under WordPress; see the
     module's own comment for the evidence behind the replacement route. */
  assert.ok(!flat.includes('team-bio.html'), 'about mapping still links the static-build team-bio.html path');
  assert.ok(flat.includes('/person/grant-callen/'), 'about mapping does not link Grant Callen\'s real person route');
});

/* --- elementor/pages/podcast-a/03-library.mjs --------------------------- */

test('the podcast library mapping carries the section class and its static copy', () => {
  const tree = podcastLibrary();
  const flat = JSON.stringify(tree);
  const source = fs.readFileSync('src/podcast-a/sections/03-library.html', 'utf8');

  /* Same derivation as the hero and about tests above, with two extra passes
     the other two sections did not need. First, comments are stripped:
     unlike 01-hero.html and 02-about.html, this source file's own leading
     comment contains literal "<button type="reset">" and "<form>" as prose,
     which the plain {1,} regex reads as real tag boundaries and turns into a
     spurious captured "string" from inside the comment. Second, the entire
     <ul class="pca-eps">...</ul> loop block is removed before extraction:
     its nine placeholder episodes are real published posts used as sample
     data (see the module's own note 2 and the task report), not copy this
     mapping reproduces as literal text: the Loop Grid renders them
     dynamically from the database, so their titles/dates/tags are
     legitimately absent from _elementor_data as strings. Checked directly:
     stripping comments and the loop block from this source file yields
     exactly the section head (heading, lede) and the filter bar's own
     strings, and nothing else, verified by running the extraction and
     inspecting its output before writing this assertion loop. */
  const noComments = source.replace(/<!--[\s\S]*?-->/g, ' ');
  const withoutLoop = noComments.replace(/<ul class="pca-eps"[\s\S]*?<\/ul>/, '');
  const strings = [...withoutLoop.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no static copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `library mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('pca-library'), 'library mapping does not carry the pca-library class');
});

test('the podcast library mapping preserves the three guest checkbox ids verbatim', () => {
  const flat = JSON.stringify(podcastLibrary());
  /* css/podcast-a.css selects these by id in its :has() filter rule
     (body:has(.pca-guest:checked):not(:has(#pa-g-lawmaker:checked)) ...): a
     renamed or dropped id is a filter that silently does nothing. */
  for (const id of ['pa-g-lawmaker', 'pa-g-expert', 'pa-g-leader']) {
    /* flat is JSON.stringify(tree), so a literal double quote in the raw
       HTML markup is JSON-escaped to \" once serialized; matching against
       the unescaped form here would never find it. */
    assert.ok(flat.includes(`id=\\"${id}\\"`), `library mapping is missing checkbox id ${id}`);
  }
});

test('the podcast library mapping does not build data-topic; the source itself says only data-guest converts', () => {
  const flat = JSON.stringify(podcastLibrary());
  assert.ok(!flat.includes('data-topic'), 'library mapping still carries data-topic, which the source says is scaffolding only');
});

test('the podcast loop item carries pca-ep and its child classes, and does not itself set data-guest', () => {
  const tree = podcastLoopItem();
  const flat = JSON.stringify(tree);
  assert.ok(Array.isArray(tree), 'loopItem() does not return an array, unlike the captured loop-item.json fixture shape');
  for (const cls of ['pca-ep', 'pca-ep__art', 'pca-ep__tags', 'pca-ep__title', 'pca-ep__date']) {
    assert.ok(flat.includes(cls), `loop item is missing the ${cls} class`);
  }
  /* The whole point of the child-theme filter (wp/empowerms-child/inc/
     loop-attributes.php): data-guest must NOT be set from a dynamic tag
     here, because post-terms is the only dynamic tag that can read a
     taxonomy term and it always wraps the value in <span>, which the CSS
     attribute selector can never match. If this ever starts matching, the
     loop item has drifted back onto the broken route. */
  assert.ok(!flat.includes('data-guest'), 'loop item sets data-guest itself; it must come from the PHP filter instead');
  assert.ok(!flat.includes('data-topic'), 'loop item sets data-topic, which the source says is not built at conversion');
});

/* Found live: without this, Elementor's own per-template element cache
   (on by default, and not something this build's Site Settings can turn
   off per Task 7a's Step 7 finding) bakes the pca-ep container's rendered
   HTML once per page load and reuses it for every remaining loop item,
   because the container carries no __dynamic__ setting of its own to
   trigger Elementor's automatic per-request shortcode deferral. Confirmed
   by deploying without this line: exactly one post's data-guest (or its
   absence) applied to all 66 rendered episodes, invisible in the HTML
   unless the cached postmeta itself is read. See the module's own note and
   wp/empowerms-child/inc/loop-attributes.php's header comment for the full
   account. */
test('the podcast loop item container opts out of the per-template element cache', () => {
  const [item] = podcastLoopItem();
  assert.equal(item.settings._element_cache, 'yes',
    'pca-ep container must set _element_cache: \'yes\', or data-guest freezes to whichever post renders first and is silently wrong for every other item');
});

test('the podcast loop item title is a Heading widget rendered as a span, not an invented heading level', () => {
  const [item] = podcastLoopItem();
  const titleNode = item.elements.find(el => el.settings?._css_classes === 'pca-ep__title');
  assert.ok(titleNode, 'loop item has no pca-ep__title node');
  assert.equal(titleNode.widgetType, 'heading');
  assert.equal(titleNode.settings.header_size, 'span', 'pca-ep__title should not add an h1-h6 heading level to every card');
  assert.match(titleNode.settings.__dynamic__.title, /name="post-title"/);
  assert.match(titleNode.settings.__dynamic__.link, /name="post-url"/);
});

test('the podcast loop item date and guest pill are bound to real per-post dynamic tags', () => {
  const [item] = podcastLoopItem();
  const dateNode = item.elements.find(el => el.settings?._css_classes === 'pca-ep__date');
  assert.ok(dateNode, 'loop item has no pca-ep__date node');
  assert.match(dateNode.settings.__dynamic__.editor, /name="post-date"/);

  const tagsNode = item.elements.find(el => el.settings?.css_classes === 'pca-ep__tags');
  assert.ok(tagsNode, 'loop item has no pca-ep__tags container');
  const pill = tagsNode.elements[0];
  assert.match(pill.settings.__dynamic__.editor, /name="post-terms"/);
  assert.match(decodeURIComponent(pill.settings.__dynamic__.editor), /"taxonomy":"guest_type"/);
});

test('podcast-a/03-library.mjs points the loop grid at a real integer post id and category 133', () => {
  assert.equal(typeof podcastLoopItemPostId, 'number');
  assert.ok(Number.isInteger(podcastLoopItemPostId), 'LOOP_ITEM_POST_ID is not an integer');
  assert.equal(podcastCategoryId, 133, 'PODCAST_CATEGORY_ID does not match the Podcast category id from the WP REST API survey');
});

/* All three mapping modules explain at length, in the same vocabulary, why
   every container must set content_width: 'full': a boxed container inserts
   Elementor's own div.e-con-inner wrapper, which breaks .pca-hero__grid,
   .pca-hero__frames and .pca-catalogue by putting a wrapper element between
   the container and its real children, so the CSS that targets direct
   children stops matching. It is the single most-repeated, most load-bearing
   structural decision in the build, and until now nothing checked it: a
   dropped content_width setting on any one container would collapse that
   container's grid and be caught only by a human looking at a screenshot.
   Walking every mapping module's tree and asserting the setting on every
   container makes the decision self-enforcing, and generalises unchanged to
   the 51 compositions Phase 2 writes. */
test('every container in every podcast-a mapping module sets content_width: \'full\'', () => {
  function* everyContainer(nodes) {
    for (const n of nodes) {
      if (n.elType === 'container') yield n;
      if (n.elements?.length) yield* everyContainer(n.elements);
    }
  }
  const trees = [podcastHero(), podcastAbout(), podcastLibrary(), podcastLoopItem()];
  let checked = 0;
  for (const tree of trees) {
    for (const c of everyContainer(Array.isArray(tree) ? tree : [tree])) {
      assert.equal(c.settings.content_width, 'full',
        `boxed container (class: ${c.settings.css_classes ?? '(none)'}) will insert div.e-con-inner and break its children's CSS`);
      checked += 1;
    }
  }
  assert.ok(checked > 0, 'no containers were found to check; the walk itself is broken');
});

/* --- elementor/pages/podcast-a/page.mjs ---------------------------------- */

/* deployPage() overwrites _elementor_data wholesale, so the only thing that
   stops a future call from dropping a section is this list being right.
   Pinning the order here is what makes that a real, enforced contract
   rather than something documented in a report and trusted to be read: a
   03-library appended before 02-about, or a hero dropped entirely, fails
   this test loudly instead of shipping quietly. */
test('the podcast-a page composes hero, about, then library, in that order', () => {
  const built = podcastASections();
  assert.deepEqual(
    built.map(s => s.settings.css_classes),
    ['pca-hero', 'pca-about', 'pca-library'],
    'podcast-a/page.mjs does not compose pca-hero, pca-about, pca-library in that order',
  );
  assert.equal(typeof podcastAPostId, 'number', 'podcast-a/page.mjs POST_ID is not a number');
  assert.ok(Number.isInteger(podcastAPostId), 'podcast-a/page.mjs POST_ID is not an integer');
});

/* --- elementor/deploy.mjs ------------------------------------------------ */

/* deployPage() shells out through wpe(), the same as flushPageCache() and
   fetchConverted() above. Exercised the same way: a fake ssh binary on PATH
   that, instead of just printing canned output, also captures the bash
   script it received on stdin to a file, so the test can assert on the
   commands actually sent rather than trusting the module's own description
   of what it does. */

function withCapturingSsh(prefix) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const sshPath = path.join(tmpDir, 'ssh');
  const capturePath = path.join(tmpDir, 'captured.sh');
  /* Reads all of stdin (the script wpe() pipes in), writes it verbatim to
     capturePath, then reports success so deployPage()'s own checks (if any)
     do not themselves fail. */
  fs.writeFileSync(sshPath, [
    '#!/usr/bin/env node',
    'const fs = require("fs");',
    `const chunks = [];`,
    'process.stdin.on("data", c => chunks.push(c));',
    'process.stdin.on("end", () => {',
    `  fs.writeFileSync(${JSON.stringify(capturePath)}, Buffer.concat(chunks));`,
    '  process.stdout.write("Success\\n");',
    '});',
  ].join('\n'));
  fs.chmodSync(sshPath, 0o755);
  return { tmpDir, sshPath, capturePath };
}

test('deployPage rejects a non-integer postId before touching the network', async () => {
  await assert.rejects(() => deployPage('not-a-number', []), /postId/);
  await assert.rejects(() => deployPage(1.5, []), /postId/);
});

test('deployPage writes the Elementor data through a temporary file on the install, not as a shell argument', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-file-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    const sections = [podcastHero()];
    await deployPage(42, sections);
    const script = fs.readFileSync(capturePath, 'utf8');
    const json = JSON.stringify(sections);

    /* The payload is large and contains quotes, so it must land in the
       script as heredoc body content, not as an inline CLI argument to
       `wp post meta update`. A `wp post meta update 42 _elementor_data
       '...'` form on one line would still technically contain the JSON, so
       the real assertion is structural: the JSON appears on its own,
       between a heredoc opener and closer, and the `wp post meta update`
       call for _elementor_data carries no inline value argument at all
       (WP-CLI reads the value from STDIN when the value argument is
       omitted). */
    assert.ok(script.includes(json), 'captured script does not contain the encoded JSON payload');
    assert.match(script, /cat\s*>\s*\S+\s*<<['"]?\w+['"]?/, 'JSON was not written via a heredoc to a temp file');
    assert.match(script, /wp post meta update 42 _elementor_data\s*<\s*\S+/,
      'wp post meta update for _elementor_data does not read from the temp file (no inline value argument)');
    assert.doesNotMatch(script, new RegExp(`wp post meta update 42 _elementor_data ${json.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      'the JSON payload was passed inline as a shell argument');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deployPage sets edit mode, template type and version, then flushes the Elementor CSS cache', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-meta-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await deployPage(42, [podcastHero()]);
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 42 _elementor_edit_mode builder/);
    assert.match(script, /wp post meta update 42 _elementor_template_type wp-page/);
    /* 4.2.2 is what is actually running on empv2 (Task 2's capture), not
       the plan's original 4.2.1 pin: see docs/elementor/schema-4.2.2.md. */
    assert.match(script, /wp post meta update 42 _elementor_version 4\.2\.2/);
    /* The brief names this step `wp elementor flush-css`. The command WP-CLI
       actually registers on this install is `flush_css` (underscore), read
       from `wp help elementor` on empv2; `flush-css` is not a subcommand and
       would fail. Corrected here with that evidence. */
    assert.match(script, /wp elementor flush_css/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

/* withCapturingSsh() above only inspects the script deployPage() sends, never
   runs it, so it cannot see whether a mid-script failure actually stops the
   deploy: bash's exit status is that of its last command unless something on
   the script sets `set -e`, and no assertion on the captured text can
   distinguish "the script contains set -e" from "the script obeys it". The
   fix under test here is exactly that behaviour, so this fake ssh really
   executes the received script through a real local bash, with a fake `wp`
   standing in on PATH, rather than asserting on text and trusting the rest.

   wpe() always prepends exactly one `cd <ROOT> || exit 1` line ahead of
   deployPage()'s own script (see wpe.mjs). That path does not exist on this
   machine, so it is neutralised to a no-op `cd .` before handing the rest to
   bash: this fake is testing deployPage()'s own control flow, not wpe()'s
   cd-prefix behaviour, which is out of scope here and is not exercised by
   any test on this branch. */
function withExecutingSsh(prefix, failOnSubstring) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const sshPath = path.join(tmpDir, 'ssh');
  const wpPath = path.join(tmpDir, 'wp');

  fs.writeFileSync(wpPath, [
    '#!/usr/bin/env node',
    `const args = process.argv.slice(2).join(' ');`,
    `if (args.includes(${JSON.stringify(failOnSubstring)})) {`,
    '  process.stderr.write("Error: simulated failure on: " + args + "\\n");',
    '  process.exit(1);',
    '}',
    'process.stdout.write("Success: " + args + "\\n");',
  ].join('\n'));
  fs.chmodSync(wpPath, 0o755);

  fs.writeFileSync(sshPath, [
    '#!/usr/bin/env node',
    'const { spawn } = require("child_process");',
    'const chunks = [];',
    'process.stdin.on("data", c => chunks.push(c));',
    'process.stdin.on("end", () => {',
    '  let script = Buffer.concat(chunks).toString("utf8");',
    '  script = script.replace(/^cd [^\\n]*\\|\\| exit 1\\n/, "cd .\\n");',
    '  const child = spawn("bash", ["-s"], { stdio: ["pipe", "inherit", "inherit"] });',
    '  child.on("exit", code => process.exit(code === null ? 1 : code));',
    '  child.stdin.write(script);',
    '  child.stdin.end();',
    '});',
  ].join('\n'));
  fs.chmodSync(sshPath, 0o755);

  return { tmpDir };
}

test('deployPage rejects when the Elementor data write fails partway through the script, instead of resolving over a partial deploy', async () => {
  const { tmpDir } = withExecutingSsh('deploy-exec-fail-', '_elementor_data');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await assert.rejects(
      () => deployPage(42, [podcastHero()]),
      err => {
        /* Not just "it rejected": the failure must be the simulated
           _elementor_data failure surfacing, not some unrelated error (a
           missing binary, a bad script). */
        assert.match(String(err.stderr || err.message), /simulated failure on:.*_elementor_data/);
        return true;
      },
    );
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deployPage still resolves when every wp-cli step genuinely succeeds', async () => {
  /* Companion to the failure test above: proves set -e did not introduce a
     false failure on the happy path, using the same real-execution fake
     rather than trusting the earlier structural (capture-only) tests alone. */
  const { tmpDir } = withExecutingSsh('deploy-exec-ok-', '__never_matches__');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    const out = await deployPage(42, [podcastHero()]);
    assert.match(out, /Success.*_elementor_edit_mode builder/);
    assert.match(out, /Success.*flush_css/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

/* deployLoopItem() shares deployElements() with deployPage() (see
   elementor/deploy.mjs's own comment on the factoring); the one thing to
   prove independently is the one thing that differs: the template type
   written to _elementor_template_type. */
test('deployLoopItem writes _elementor_template_type loop-item, not wp-page', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-loop-item-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await deployLoopItem(20572, podcastLoopItem());
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 20572 _elementor_template_type loop-item/);
    assert.doesNotMatch(script, /wp post meta update 20572 _elementor_template_type wp-page/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

/* --- fidelity-browser.mjs / the podcast guest filter --------------------- */

/* The four tests below drive a real browser against the deployed page, so
   they need a live URL that nothing in this repository can supply on its
   own. Without this guard, a missing SPIKE_URL surfaces as Playwright's own
   "page.goto: url: expected string, got undefined", which reads like a
   broken test rather than a missing environment variable. Failing loudly is
   still the right call (README.md says the same); this just names the thing
   that is missing instead of leaving that to Playwright's type error. */
const requireSpikeUrl = () => process.env.SPIKE_URL
  ?? assert.fail('SPIKE_URL is not set. These four tests drive a real browser against the deployed page: SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs');

/* The check that matters most and that nothing static can make. A Loop Grid
   whose item template does not emit data-guest produces a page where every
   control still moves, no card ever hides, and nothing reports an error. */
test('the podcast guest filter actually filters', { concurrency: 1 }, async () => {
  const { checkFilter } = await import('./fidelity-browser.mjs');
  const r = await checkFilter(requireSpikeUrl(), {
    toggleSelector: '#pa-g-lawmaker',
    itemSelector: '.pca-ep',
  });
  assert.ok(r.before > 0, 'no episodes rendered at all');
  assert.ok(r.after < r.before, 'ticking a guest hid nothing: the loop is not emitting data-guest');
  assert.deepEqual(r.kinds, ['lawmaker'], `filtered view still shows ${r.kinds.join(', ')}`);
  assert.equal(r.restored, r.before, 'unticking did not restore the full list');
});

/* Step 9. checkVisibleWithoutJs existed and was bug-fixed but was never
   actually wired into the suite, so it was a snippet, not a regression
   test: nothing would have caught it going red. Diffing against
   checkVisibleWithJs (settled the same way checkFilter's own page is)
   rather than asserting a bare "> 0" is what gives this real power: a
   selector matching zero elements on both sides would satisfy ">0 and
   equal" trivially only if BOTH counts were checked against zero directly,
   which this does not do (withJs > 0 is asserted separately first).

   'body [data-reveal]', not '[data-reveal]': the first run of this test
   found a genuine 79-vs-80 mismatch, and the cause was the test's own
   selector, not the page. js/reveal.js's own comment names exactly this
   trap: it sets data-reveal="on" on <html> itself as its ready flag, and a
   document-wide [data-reveal] query sweeps that root element into the
   collection alongside the real content elements, present only once JS has
   actually run (there is nothing to set it without JS). reveal.js queries
   from document.body for the same reason; matching that scope here is what
   makes the comparison apples to apples instead of comparing 80 elements
   including a JS-only marker against 79 real content elements. */
test('podcast-a is visible without JavaScript, matching a JS-enabled load', { concurrency: 1 }, async () => {
  const { checkVisibleWithoutJs, checkVisibleWithJs } = await import('./fidelity-browser.mjs');
  const url = requireSpikeUrl();
  const selector = 'body [data-reveal]';
  const withJs = await checkVisibleWithJs(url, selector);
  const withoutJs = await checkVisibleWithoutJs(url, selector);
  assert.ok(withJs > 0, 'no [data-reveal] elements visible even with JavaScript enabled and settled; the selector itself may be wrong');
  assert.equal(withoutJs, withJs,
    `without JavaScript only ${withoutJs} of ${withJs} [data-reveal] elements are visible: something is starting hidden and waiting for a trigger that never fires`);
});

/* Step 10. Same problem as Step 9: computedStyles() existed, was run
   manually once, and was never asserted against anything. "Against the
   static build, not numbers typed into this file" per the review: dist/
   podcast-a.html is served locally through serveRepoRoot() so its ../
   relative asset paths resolve, and the four probes are compared live
   rather than pinned to values that would go stale the moment either side's
   CSS changes without this file being updated to match.
   heroTitle's probe selector is .pca-hero h1, not .pca-hero__title: that
   class does not exist anywhere in podcast-a's markup, static or
   converted (the <h1> only ever carries id="hero-title"; css/podcast-a.css
   styles it via .pca-hero h1). A selector matching nothing on both sides
   would report false parity (both null, so "equal"), which is why this
   test asserts the converted side is truthy first. */
test('the converted page matches the static build on four computed-style probes', { concurrency: 1 }, async () => {
  const { computedStyles } = await import('./fidelity-browser.mjs');
  const PROBES = [
    { name: 'heroTitle', selector: '.pca-hero h1', property: 'font-size' },
    { name: 'heroBg', selector: '.pca-hero', property: 'background-color' },
    { name: 'container', selector: '.em-container', property: 'max-width' },
    { name: 'action', selector: '.em-btn--primary', property: 'background-color' },
  ];
  const spikeUrl = requireSpikeUrl();
  const server = await serveRepoRoot();
  try {
    const converted = await computedStyles(spikeUrl, PROBES);
    const staticBuild = await computedStyles(`${server.url}/dist/podcast-a.html`, PROBES);
    for (const { name, selector } of PROBES) {
      assert.ok(converted[name], `converted page: ${name} probe (${selector}) matched nothing`);
      assert.equal(converted[name], staticBuild[name],
        `${name} differs: converted=${converted[name]} static=${staticBuild[name]}`);
    }
  } finally {
    await server.close();
  }
});

/* Nothing before this asserted the Loop Grid's query is actually scoped to
   the Podcast category (133): r.before > 0 in the filter test above passes
   identically whether the query is scoped or pulling every post on the
   site. The independent oracle is wp-cli's own count for the same category
   at test-run time, not a number typed into this file: the archive grows
   as Empower publishes, and pinning this to today's 66 would make the test
   wrong the next time someone runs it rather than proving anything. If the
   category's real count ever exceeds LIBRARY_POSTS_PER_PAGE (100, in
   03-library.mjs), this assertion starts failing for a true and useful
   reason (the Loop Grid needs pagination), not a false one. */
test('the podcast library loop grid is scoped to category 133, not the whole site', { concurrency: 1 }, async () => {
  const spikeUrl = requireSpikeUrl();
  const expected = parseInt((await wpe('wp post list --post_type=post --cat=133 --post_status=publish --format=count')).trim(), 10);
  assert.ok(Number.isInteger(expected) && expected > 0, 'could not read a real post count for category 133 from the install');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(spikeUrl, { waitUntil: 'load' });
    const rendered = await page.$$eval('.pca-ep', els => els.length);
    assert.equal(rendered, expected,
      `Loop Grid rendered ${rendered} episodes; category 133 (Podcast) has ${expected} published posts right now, so the query is not correctly scoped to it`);
  } finally {
    await browser.close();
  }
});
