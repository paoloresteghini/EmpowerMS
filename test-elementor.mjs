import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stripNotices, wpe } from './wpe.mjs';
import { container, heading, text, image, link, html, elementId } from './elementor/factory.mjs';
import { flushPageCache, fetchConverted, checkCopy, checkSections } from './fidelity.mjs';

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

  try {
    await wpe('anything');
    assert.fail('wpe() should have rejected due to buffer exceeded');
  } catch (err) {
    assert.ok(err.message, 'error should have a message');
    assert.match(err.message, /exceeds.*bytes/i, 'error message should mention buffer exceeded');
    assert(err.stdout !== undefined, 'error should have stdout property');
    assert(err.stderr !== undefined, 'error should have stderr property');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
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

test('html() carries markup through unaltered', () => {
  const svg = '<svg width="10" height="10"></svg>';
  assert.equal(html({ markup: svg }).settings.html, svg);
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
     the drift is invisible until a page renders wrong. */
  const syncSrc = fs.readFileSync('wp/sync.mjs', 'utf8');
  for (const dir of ['tokens', 'components', 'css', 'js', 'assets']) {
    assert.ok(syncSrc.includes(`'${dir}'`), `wp/sync.mjs does not sync ${dir}/`);
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
