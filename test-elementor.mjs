import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { installConfig } from './install.mjs';
import { fromRootArgs, syncTheme, FROM_ROOT } from './wp/sync.mjs';
import { stripNotices, wpe } from './wpe.mjs';
import { container, heading, text, image, link, html, loopGrid, elementId } from './elementor/factory.mjs';
import { flushPageCache, fetchConverted, checkCopy, checkSections, checkRobots } from './fidelity.mjs';
import { section as podcastHero } from './elementor/pages/podcast-a/01-hero.mjs';
import { section as podcastAbout } from './elementor/pages/podcast-a/02-about.mjs';
import {
  section as podcastLibrary, loopItem as podcastLoopItem,
  LOOP_ITEM_POST_ID as podcastLoopItemPostId, PODCAST_CATEGORY_ID as podcastCategoryId,
} from './elementor/pages/podcast-a/03-library.mjs';
import { POST_ID as podcastAPostId, sections as podcastASections } from './elementor/pages/podcast-a/page.mjs';
import { section as finalHero } from './elementor/pages/final/01-hero.mjs';
import { section as finalSolutions } from './elementor/pages/final/02-solutions.mjs';
import { section as finalFoundations } from './elementor/pages/final/03-foundations.mjs';
import { section as finalStories, loopItem as finalStoriesLoopItem, STORIES_CATEGORY_ID, STORIES_LOOP_ITEM_POST_ID } from './elementor/pages/final/04-stories.mjs';
import { section as finalInsights } from './elementor/pages/final/05-insights.mjs';
import { section as finalJoinUs } from './elementor/pages/final/06-joinus.mjs';
import { POST_ID as finalPostId, sections as finalSections } from './elementor/pages/final/page.mjs';
import { PHOTOS } from './elementor/pages/final/media.mjs';
import { POST_ID as whatWeDoAPostId, sections as whatWeDoASections } from './elementor/pages/what-we-do-a/page.mjs';
import { deployPage, deployLoopItem, deployThemePart, setConditions, disableThemePageTitle, THEME_PART_LOCATIONS } from './elementor/deploy.mjs';
import { extractBlock } from './elementor/theme-parts/extract.mjs';
import { footerPart, FOOTER_POST_ID } from './elementor/theme-parts/footer.mjs';
import { headerPart, HEADER_POST_ID } from './elementor/theme-parts/header.mjs';
import { personSingle } from './elementor/theme-parts/person-single.mjs';
import { postSingle } from './elementor/theme-parts/post-single.mjs';
import { sections as probeSections } from './elementor/theme-parts/native-animation-probe.mjs';
import { categoryArchive } from './elementor/theme-parts/category-archive.mjs';
import { searchResultItem, SEARCH_RESULT_ITEM_POST_ID } from './elementor/theme-parts/search-result-item.mjs';
import { searchArchivePart, SEARCH_ARCHIVE_POST_ID, SEARCH_ARCHIVE_CONDITIONS } from './elementor/theme-parts/search-archive.mjs';
import { PAGE_REGISTER, EXCLUDED_PAGES, convertedPageDirs } from './elementor/pages/register.mjs';
import { remapLinks, convertedPagePaths } from './elementor/links.mjs';
import {
  isImageKey, isBookkeepingKey, validateDeferredEntry, compareBoxes, expiredDeferredEntries,
  validateContentExemption, explainLayoutHeights, CONTENT_HEIGHT_EXEMPTIONS, MEASURED_WIDTHS,
} from './fidelity-deferred.mjs';

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

/* Most wpe() calls in this file run against a fake ssh binary placed on
   PATH, which ignores the host and key entirely, but wpe() reads the
   install's coordinates from the environment and fails loudly when they are
   unset (see install.mjs). Filling in placeholders ONLY when nothing is set
   keeps those tests runnable on a checkout with no .env, without overriding
   real coordinates when a shell does have them: the category-scoping test
   near the end of this file makes a genuine SSH call, and needs the real
   ones. Every assertion on a captured script matches a substring, so the
   values here never change a result. The install.mjs tests below set and
   restore these themselves. */
process.env.WPE_SSH_HOST ??= 'test@test.invalid';
process.env.WPE_SSH_KEY ??= '/dev/null';
process.env.WPE_ROOT ??= '/test/root';

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

/* --- install.mjs --------------------------------------------------------- */

/* Runs the body with the three install variables set exactly as given
   (an undefined value deletes the variable), then restores whatever was
   there before, including the placeholders set at the top of this file. */
function withInstallEnv(values, body) {
  const names = ['WPE_SSH_HOST', 'WPE_SSH_KEY', 'WPE_ROOT'];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  try {
    for (const n of names) {
      if (values[n] === undefined) delete process.env[n];
      else process.env[n] = values[n];
    }
    return body();
  } finally {
    for (const n of names) {
      if (saved[n] === undefined) delete process.env[n];
      else process.env[n] = saved[n];
    }
  }
}

const FULL_ENV = {
  WPE_SSH_HOST: 'someone@example.ssh.wpengine.net',
  WPE_SSH_KEY: '/home/someone/.ssh/example_ed25519',
  WPE_ROOT: '/nas/content/live/example',
};

test('installConfig reads all three coordinates from the environment', () => {
  withInstallEnv(FULL_ENV, () => {
    assert.deepEqual(installConfig(), {
      host: 'someone@example.ssh.wpengine.net',
      key: '/home/someone/.ssh/example_ed25519',
      root: '/nas/content/live/example',
    });
  });
});

/* Unset is the case a new checkout hits, so the failure has to name the
   variable and say how to set it, the way the SPIKE_URL guard at the end of
   this file does. An empty string is the same failure wearing a disguise:
   `ssh -i '' host` fails much further downstream, with an error about the
   key rather than about the configuration. */
for (const missing of ['WPE_SSH_HOST', 'WPE_SSH_KEY', 'WPE_ROOT']) {
  test(`installConfig fails with a message naming ${missing} when it is unset`, () => {
    withInstallEnv({ ...FULL_ENV, [missing]: undefined }, () => {
      assert.throws(() => installConfig(), (err) => {
        assert.match(err.message, new RegExp(missing));
        assert.match(err.message, /\.env\.example/, 'the message does not say where to start');
        return true;
      });
    });
  });

  test(`installConfig treats an empty ${missing} as unset`, () => {
    withInstallEnv({ ...FULL_ENV, [missing]: '   ' }, () => {
      assert.throws(() => installConfig(), new RegExp(missing));
    });
  });
}

test('installConfig expands a leading ~/ in the key path', () => {
  /* ssh -i does no tilde expansion of its own: the shell normally does it,
     and a value arriving from the environment has not been through one. An
     unexpanded ~/.ssh/... reaches ssh as a relative path that does not
     exist, and the failure reads as a permissions problem. */
  withInstallEnv({ ...FULL_ENV, WPE_SSH_KEY: '~/.ssh/example_ed25519' }, () => {
    assert.equal(installConfig().key, `${process.env.HOME}/.ssh/example_ed25519`);
  });
});

test('no install coordinates are left hard-coded in the source that uses them', () => {
  /* This repository is public. The coordinates are not a secret in the
     sense that a key is (WP Engine SSH is key-only and no key is committed),
     but they were put behind the environment deliberately and the seam is
     easy to undo by re-typing a constant while debugging. Asserted against
     the two files that talk to the install, not the whole tree: docs/ keeps
     the public hostname on purpose, and this file carries the server path
     inside a captured PHP notice used as a fixture. */
  for (const file of ['wpe.mjs', 'wp/sync.mjs', 'install.mjs']) {
    const src = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /\bssh\.wpengine\.net/, `${file} hard-codes an SSH host`);
    assert.doesNotMatch(src, /\/nas\/content\/live\//, `${file} hard-codes an install root`);
  }
});

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

test('text() refuses a cssClass the markup already carries', () => {
  assert.throws(
    () => text({ markup: '<p class="em-eyebrow">x</p>', cssClass: 'em-eyebrow' }),
    /em-eyebrow/,
    'the belt-and-braces form measured WORSE than either alone and must not be constructible',
  );
});

test('text() still accepts a cssClass the markup does not carry', () => {
  const made = text({ markup: '<p class="em-eyebrow">x</p>', cssClass: 'zz-layout-hook' });
  assert.equal(made.settings._css_classes, 'zz-layout-hook');
});

test('text() does not treat a hyphen as a class-name boundary', () => {
  /* A regex \b boundary treats '-' as a token separator, so a
     boundary-based match on 'em-eyebrow' would also fire on
     'em-eyebrow-large' or 'large-em-eyebrow', classes that share no real
     token and do not conflict. This is not a hypothetical: both directions
     are live vocabulary here (elementor/pages/final/04-stories.mjs and
     05-insights.mjs both pass cssClass: 'em-eyebrow'), and the guard
     throws rather than warns, so a false positive here hard-fails a build
     that was correct. */
  assert.doesNotThrow(() => text({ markup: '<p class="em-eyebrow-large">x</p>', cssClass: 'em-eyebrow' }));
  assert.doesNotThrow(() => text({ markup: '<p class="large-em-eyebrow">x</p>', cssClass: 'em-eyebrow' }));
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

/* Classifies every character of src as 'code', 'string', or 'comment':
   tracks // line comments, /* block comments, and '"' / '\'' / '`' quoted
   strings (with backslash escapes), one pass, one state machine, indexed
   by UTF-16 code unit so it stays aligned with src's own indices (a
   surrogate-pair emoji is two code units here, matching src.length, not
   one, which is what a code-point-based walk would collapse it to). Both
   blankNonCode() and extractBalancedCall() below read this same
   kinds array rather than each re-deriving string/comment boundaries, so
   the tracking logic exists exactly once. Returns finalMode alongside
   kinds: real JavaScript never ends a file mid-string or mid-block-comment,
   so a scan finishing in either state has desynced against something it
   doesn't understand, which the caller below turns into a loud failure
   naming the file rather than a silently narrowed sweep.

   Known limits, recorded rather than fixed:
   - A regex literal containing a quote, e.g. /["']/. This scanner has no
     regex-literal handling at all: telling a regex literal from a
     division operator requires knowing whether the previous token was a
     value or an operator, the classic hard problem in JS lexing, and a
     hand-rolled attempt that gets it subtly wrong reintroduces silent
     under-detection wearing a different hat. So the '"' inside the regex
     is read as opening a string that never closes, and finalMode ends as
     'string'. That is exactly the case the caller's invariant catches.
   - Nested template literals, e.g. `${`x`}`. The naive backtick toggle
     miscounts the inner backticks, but two nested opens and closes happen
     to rebalance by EOF, so finalMode still ends as 'code' and the
     invariant below does NOT catch this one. Nothing in the swept tree
     uses a nested template literal today. Not fixed, for the same reason
     as the regex case: a partial fix here is a worse failure mode than an
     honestly documented gap. */
const scanSource = (src) => {
  const kinds = new Array(src.length);
  let mode = 'code';
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (mode === 'line-comment') {
      kinds[i] = 'comment';
      if (c === '\n') mode = 'code';
      continue;
    }
    if (mode === 'block-comment') {
      kinds[i] = 'comment';
      if (c === '*' && next === '/') { kinds[i + 1] = 'comment'; i++; mode = 'code'; }
      continue;
    }
    if (mode === 'string') {
      kinds[i] = 'string';
      if (c === '\\' && i + 1 < src.length) { kinds[i + 1] = 'string'; i++; continue; }
      if (c === quote) { mode = 'code'; quote = null; }
      continue;
    }
    if (c === '/' && next === '/') { kinds[i] = 'comment'; mode = 'line-comment'; continue; }
    if (c === '/' && next === '*') { kinds[i] = 'comment'; mode = 'block-comment'; continue; }
    if (c === '"' || c === '\'' || c === '`') { kinds[i] = 'string'; mode = 'string'; quote = c; continue; }
    kinds[i] = 'code';
  }
  return { kinds, finalMode: mode };
};

/* Same length as src, so offsets found in the blanked string line up
   exactly with the original. Built with an index-based loop over
   src.length, NOT Array.from(src, ...) or [...src]: both of those iterate
   by Unicode CODE POINT, which collapses a surrogate pair into a single
   step and desyncs the output length against src.length (and therefore
   against kinds, which is code-UNIT indexed) the moment an astral
   character (an emoji, for instance) appears anywhere earlier in the
   file. Every comment or string character is replaced with a space,
   EXCEPT a newline is kept as a newline, so the `^` line-start anchor in
   callRe still lands on real line boundaries. Matching heading( against
   this instead of the raw source means a `// heading({...})` comment or a
   template literal that merely contains the word cannot be read as a real
   call. */
const blankNonCode = (src, kinds) => {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    out += (kinds[i] === 'code' || c === '\n') ? c : ' ';
  }
  return out;
};

/* Runs scanSource and blankNonCode for one file (or fixture) and asserts
   the two invariants the rest of the sweep depends on, instead of only
   claiming them in a comment: the blanked copy is exactly as long as the
   source (the astral-character bug above, should it recur, fails here
   rather than silently misreading a call's offset), and the scan did not
   end inside a string or a block comment (the regex-literal case above,
   and anything else the scanner doesn't understand yet, fails here rather
   than silently reporting zero offenders for a file it couldn't actually
   read). label is the file path (or fixture name) named in the failure. */
const scanForSweep = (src, label) => {
  const { kinds, finalMode } = scanSource(src);
  const blanked = blankNonCode(src, kinds);
  assert.strictEqual(blanked.length, src.length,
    `${label}: blanked copy is ${blanked.length} chars, source is ${src.length}; the scanner desynced and this file's sweep cannot be trusted`);
  assert.ok(finalMode !== 'string' && finalMode !== 'block-comment',
    `${label}: scan ended inside a ${finalMode === 'string' ? 'string that never closed' : 'block comment that never closed'}; the scanner does not understand some construct in this file (a regex literal containing a quote is the known one) and the sweep cannot be trusted for it until it does`);
  return { kinds, blanked };
};

/* Extracts the balanced-parenthesis call text starting at the '(' found at
   openIdx, so a multi-line heading({...}) call can be tested as a whole
   rather than line by line. Only counts parens where kinds says 'code', so
   a stray '(' or ')' inside a quoted string or a comment within the call's
   own text does not desync the depth count. Reads from the ORIGINAL src
   (not the blanked copy) so the extracted call text still carries
   __dynamic__ and every other real character for the exemption check. */
const extractBalancedCall = (src, openIdx, kinds) => {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    if (kinds[i] !== 'code') continue;
    if (src[i] === '(') depth++;
    else if (src[i] === ')') {
      depth--;
      if (depth === 0) return src.slice(openIdx, i + 1);
    }
  }
  return src.slice(openIdx);
};

test('no page module or theme part builds a heading widget', async (t) => {
  const { readdir, readFile } = await import('node:fs/promises');

  /* The directory list is DERIVED, not hand-typed: this repo has already
     shipped the hand-written-list failure once (a side-stripe test whose
     page list was hand-written stayed green while four pages added later
     carried the violation). Reading elementor/pages fresh means a page
     added after this test was written is swept automatically instead of
     silently escaping it. */
  const pagesRoot = 'elementor/pages';
  const pageEntries = await readdir(pagesRoot, { withFileTypes: true });
  const dirs = [
    ...pageEntries.filter((e) => e.isDirectory()).map((e) => `${pagesRoot}/${e.name}`),
    'elementor/theme-parts',
  ];
  /* The derivation cannot silently cover nothing today (theme-parts is
     appended unconditionally), but this repo has already shipped a sweep
     that passed green while covering less than it claimed, so the
     invariant is asserted rather than trusted: a one-or-zero-directory
     result means the derivation broke, not that the codebase is clean. */
  assert.ok(dirs.length > 1,
    `derived directory sweep found only ${dirs.length} director${dirs.length === 1 ? 'y' : 'ies'} (expected elementor/pages/* plus elementor/theme-parts); the derivation is broken, not the codebase clean`);

  let filesSwept = 0;
  const offenders = [];
  for (const dir of dirs) {
    for (const f of await readdir(dir)) {
      if (!f.endsWith('.mjs')) continue;
      filesSwept++;
      const src = await readFile(`${dir}/${f}`, 'utf8');
      const { kinds, blanked } = scanForSweep(src, `${dir}/${f}`);
      const callRe = /(^|[^a-zA-Z_$.])heading\s*\(/gm;
      let match;
      let fileOffends = false;
      while ((match = callRe.exec(blanked))) {
        const openIdx = match.index + match[0].length - 1;
        const call = extractBalancedCall(src, openIdx, kinds);
        /* NAMED EXEMPTION: a heading() call bound to a dynamic tag does not
           get reported. A text widget binds exactly one dynamic field
           (editor), so it can carry a post title OR a per-post href but not
           both; Elementor's dynamic tags replace a whole field value, never
           an attribute fragment inside authored markup. A heading widget's
           title and link fields bind separately, which is what a headline
           that must link to the post it names (the project's own rule)
           requires. podcast-a/03-library.mjs's loopItem() pca-ep__title is
           the one call this exempts today; see the test at
           "the podcast loop item title is a Heading widget..." for its
           asserted shape. Do not widen this into a blanket allowance: the
           test is for __dynamic__ presence on THIS call, not for a filename
           or caller name. */
        if (!/__dynamic__/.test(call)) fileOffends = true;
      }
      if (fileOffends) offenders.push(`${dir}/${f}`);
    }
  }

  /* Coverage is visible on a red run (in the failure message) and on a
     green run (as a diagnostic line), so a future reader never has to
     instrument the test to see how much of the tree it actually swept. */
  t.diagnostic(`swept ${filesSwept} files across ${dirs.length} directories: ${dirs.join(', ')}`);
  assert.deepEqual(offenders, [],
    `heading() cannot put a class on the heading element, and Elementor sets line-height:1 on heading widgets at 0,2,0; use text() with real heading markup (swept ${filesSwept} files across ${dirs.length} directories)`);
});

test('the heading-widget sweep fails loudly on a source it cannot classify, rather than reporting zero offenders', () => {
  /* A regex literal containing a quote is the scanner's known, recorded
     limit (see the comment above scanSource): the '"' inside /["']/
     is read as opening a string that never closes, so finalMode ends as
     'string'. Without the invariant this fixture's real, non-exempt
     heading() call would simply vanish from the sweep: the whole file
     from the regex onward reads as one unterminated string and blanks to
     nothing. The fixture is a string here, not a file in a swept
     directory, so it cannot pollute the real 10-file offender list. */
  const fixture = "const re = /[\"']/;\nheading({ text: 'T' });\n";
  assert.throws(() => scanForSweep(fixture, 'fixture'),
    /does not understand some construct/,
    'a source the scanner cannot classify must fail loudly, not silently report zero offenders');
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

/* Every stylesheet and script this theme enqueues is served with
   `cache-control: public, max-age=31536000` (measured against the live
   install, 2026-08-17), so the query string on the URL is the ONLY thing
   that can retire a visitor's cached copy. Versioning every asset with the
   theme's own `Version:` header made that query string a constant: the
   header has read 2.0.0 through every stylesheet edit of the conversion, so
   a browser that fetched css/bridge.css once keeps it for a year and sees
   none of the repairs written into it afterwards.

   That is not a hypothetical. It is what Paolo's browser was showing on
   2026-08-17: a header with a 15px-wide wordmark, a 899px nav and a
   borderless search control, which is precisely the pre-2026-08-15 state of
   bridge.css's `.elementor button.em-header__*` block. The same page
   measured correct in a cold-cache browser at the same moment (logo
   111.63x52, nav 640.67, search 38x38 with a 1px border).

   The contract asserted here is that the version travels with the FILE, not
   with the theme: every enqueue passes empower_asset_ver( <path relative to
   the stylesheet directory> ), and that helper derives the version from the
   file's own mtime. Asserted against every enqueue call in the file rather
   than a hand-listed subset, so an asset added later cannot quietly opt out
   the way css/megamenu.css once did. */
test('every enqueued asset is versioned by its own file, not by the theme version', () => {
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');

  const helper = fn.match(/function\s+empower_asset_ver\s*\([\s\S]*?\n}/);
  assert.ok(helper, 'functions.php has no empower_asset_ver() helper');
  assert.match(helper[0], /filemtime\s*\(/,
    'empower_asset_ver() does not read the file mtime, so the version cannot change when the file does');
  /* A missing file must not emit an empty version: that produces a bare
     .../bridge.css with no query string at all, which is MORE cacheable
     than the constant it replaced, not less. */
  assert.match(helper[0], /wp_get_theme\(\)\s*->\s*get\(\s*'Version'\s*\)/,
    'empower_asset_ver() has no theme-version fallback for a file it cannot stat');

  /* Every enqueue call, style and script alike. The version argument is the
     fourth, and each call in this file spans one line. */
  const calls = [...fn.matchAll(/wp_enqueue_(?:style|script)\((.*)$/gm)].map(m => m[1]);
  assert.ok(calls.length >= 8, `expected the enqueue calls to still be here, found ${calls.length}`);
  for (const call of calls) {
    assert.match(call, /empower_asset_ver\(/,
      `an enqueue call does not version by file: ${call.trim()}`);
  }

  /* And the constant it replaced is gone from both enqueue callbacks, so
     nothing can pass it by a different name. */
  assert.doesNotMatch(fn, /\$ver\s*=\s*wp_get_theme\(\)\s*->\s*get\(\s*'Version'\s*\)/,
    'an enqueue callback still hoists the theme version into $ver');
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

test('the chrome stylesheet and its script are enqueued unconditionally, not per page', () => {
  /* The header is a site-wide theme part now. css/header-2.css left in the
     per-slug map would style exactly one page's header and leave every
     other page with five permanently open panels across its hero, which is
     this build's own documented failure mode for that pair. */
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const pageStyles = fn.slice(fn.indexOf('function empower_page_styles'), fn.indexOf('add_action', fn.indexOf('function empower_page_styles')));
  const pageScripts = fn.slice(fn.indexOf('function empower_page_scripts'), fn.indexOf('add_action', fn.indexOf('function empower_page_scripts')));
  assert.doesNotMatch(pageStyles, /'header-2'/, 'header-2.css is still keyed per page');
  assert.doesNotMatch(pageScripts, /'dropdown'/, 'dropdown.js is still keyed per page');
  assert.match(fn, /wp_enqueue_script\(\s*'empower-dropdown'/, 'dropdown.js is not enqueued unconditionally');
  assert.match(fn, /wp_enqueue_style\(\s*'empower-header-2'/, 'header-2.css is not enqueued unconditionally');
});

/* wp_script_add_data( $handle, 'type', 'module' ) reads as the fix for the
   classic-script collision below and is not one: WP_Scripts::do_item()
   (wp-includes/class-wp-scripts.php on the install, WordPress 7.0.4) builds
   each script tag's attributes from 'src', 'id', the loading strategy and
   fetchpriority only, and never reads a 'type' data key. A source-text
   assertion that a wp_script_add_data('type', 'module') call exists (fix
   round 1's version of this test) passes on exactly that broken code, which
   is how the regression this replaces shipped in the first place: js/nav.js,
   js/reveal.js and js/dropdown.js each declare top-level `const` bindings
   meant to stay private to their own module scope, loaded as classic
   scripts they share the global scope instead, js/reveal.js and
   js/dropdown.js both declare `const root`, and the second to run throws a
   SyntaxError and never executes. script_loader_tag is the filter that
   actually controls the emitted tag, so that is what this asserts on. */
/* Fix round: this test used to iterate the same three literal handles the
   filter itself hard-coded ('empower-nav', 'empower-reveal',
   'empower-dropdown'), which meant it could never notice a fourth handle
   going unrecognised. empower_page_scripts() emits handles shaped
   'empower-script-<name>' (see the per-page enqueue loop above it in
   functions.php); a filter matching only the three literals by name would
   let anything routed through that mechanism load as a classic script,
   which is the exact condition that produced this branch's site-wide
   dropdown regression. The filter must now derive its handle list from
   empower_module_script_handles(), which itself reads empower_page_scripts()
   rather than typing the per-page shape out a second time, so this asserts
   the derivation exists rather than re-typing the list it must not miss. */
test('the module-script filter derives its handle list from empower_page_scripts(), not a second hand-typed list', () => {
  /* js/nav.js, js/reveal.js and js/dropdown.js loaded as classic scripts
     collide on top-level `const` declarations (js/reveal.js and
     js/dropdown.js both declare `root`); type="module" gives each its own
     module scope, which is what the source files were written to rely on. */
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.doesNotMatch(fn, /wp_script_add_data\(\s*'empower-(?:nav|reveal|dropdown)',\s*'type',\s*'module'\s*\)/,
    'a wp_script_add_data(..., \'type\', \'module\') call is still present; WordPress never reads that data key to emit a type attribute, so this is dead code masking the real fix');
  assert.match(fn, /add_filter\(\s*'script_loader_tag'/, 'no script_loader_tag filter is registered');

  const filterBody = fn.slice(fn.indexOf("add_filter( 'script_loader_tag'"));
  assert.match(filterBody, /empower_module_script_handles\(\)/,
    'script_loader_tag filter does not call empower_module_script_handles(); a hand-typed handle list here cannot see a handle empower_page_scripts() adds later');
  assert.match(filterBody, /type="module"/, 'script_loader_tag filter does not add type="module" to the tag');

  const handlesStart = fn.indexOf('function empower_module_script_handles');
  assert.ok(handlesStart > -1, 'no empower_module_script_handles() function is defined');
  const handlesBody = fn.slice(handlesStart, fn.indexOf('\n}\n', handlesStart));
  for (const handle of ['empower-nav', 'empower-reveal', 'empower-dropdown']) {
    assert.ok(handlesBody.includes(`'${handle}'`), `empower_module_script_handles() does not name ${handle}`);
  }
  assert.match(handlesBody, /empower_page_scripts\(\)/,
    'empower_module_script_handles() does not read empower_page_scripts(), so a future per-page script would still be invisible to the filter');
  assert.match(handlesBody, /'empower-script-'\s*\.\s*\$script/,
    'empower_module_script_handles() does not build the empower-script-<name> shape empower_page_scripts() actually emits');
});

test('the chrome stylesheet loads after site.css, not before it', () => {
  /* css/header-2.css overrides shared chrome rules in css/site.css. The
     README enqueue table orders them that way and the cascade depends on
     it. */
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.match(fn, /wp_enqueue_style\(\s*'empower-header-2',[^;]*array\(\s*'empower-site'\s*\)/s,
    'header-2.css does not declare empower-site as its dependency');
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
     overwritten by the sync loop.

     wp/empowerms-child/css/ is the one deliberate exception, added by Task 7:
     it holds bridge.css, which has no counterpart in the root css/ directory
     at all (test.mjs's own "no stylesheet outside the bridge carries an
     Elementor selector" test guarantees that), so its existence is not what
     this test is guarding against. What it must still catch is the root
     css/'s own files reappearing there by hand: the loop below allows the
     directory but asserts none of its files also exist, by name, under the
     protected root css/. */
  const syncSrc = fs.readFileSync('wp/sync.mjs', 'utf8');
  for (const dir of ['tokens', 'components', 'css', 'js', 'assets']) {
    assert.ok(syncSrc.includes(`'${dir}'`), `wp/sync.mjs does not sync ${dir}/`);
    if (dir === 'css') {
      const childCssDir = 'wp/empowerms-child/css';
      if (fs.existsSync(childCssDir)) {
        for (const file of fs.readdirSync(childCssDir)) {
          assert.ok(!fs.existsSync(`css/${file}`),
            `wp/empowerms-child/css/${file} duplicates a root css/ file by hand`);
        }
      }
      continue;
    }
    assert.ok(!fs.existsSync(`wp/empowerms-child/${dir}`), `wp/empowerms-child/${dir} exists as a hand-made duplicate`);
  }
});

/* Task 7 fix round 1, Important finding 1. wp/sync.mjs's third rsync pass
   (wp/empowerms-child/css/ -> dest/css/, no --delete) is the only thing
   that gets bridge.css onto the server at all: the first pass excludes
   /css/ outright, and the second pass (root css/ -> dest/css/, --delete)
   would erase bridge.css even if the first pass did not already keep it
   out. This was found by rehearsing both passes against a scratch
   directory, not by reading the enqueue and assuming it worked (see the
   task report). A source-text assertion is the right instrument here for
   the same reason settleReveal's own test above is one: the actual failure
   is a file not arriving on a remote host over SSH, which no unit test in
   this repository can observe directly, whether by removing the pass
   entirely or by reordering it ahead of the FROM_ROOT loop (where the
   second pass's own --delete would still wipe it straight back out). What
   a source test CAN check, and must, is that the pass exists, that it
   comes after the loop, and that it carries no --delete of its own - the
   three properties an edit to this file could silently drop without
   breaking anything test.mjs or test-elementor.mjs otherwise runs. */
test('wp/sync.mjs syncs wp/empowerms-child/css/ after the FROM_ROOT loop, without --delete', () => {
  const src = fs.readFileSync('wp/sync.mjs', 'utf8');
  const loopMatch = src.match(/for\s*\(\s*const\s+dir\s+of\s+FROM_ROOT\s*\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(loopMatch, 'the FROM_ROOT sync loop was not found in wp/sync.mjs');
  const loopEnd = loopMatch.index + loopMatch[0].length;

  /* `run|runner`: syncTheme's runner became injectable so that the test below
     can capture the arguments the function actually issues, and the call sites
     changed from `run(` to `runner(`. This pattern named only `run(` and went
     red on a correct file, which is the same shape of breakage as a stale line
     citation: an assertion pinned to an incidental detail of how the code is
     spelled. Matching either keeps this test about the PASS rather than about
     the identifier. */
  const bridgePassMatch = src.match(/await (?:run|runner)\(\s*'rsync'\s*,\s*\[[^\]]*'wp\/empowerms-child\/css\/'[^\]]*\]\s*\)/);
  assert.ok(bridgePassMatch, 'no rsync call syncing wp/empowerms-child/css/ was found in wp/sync.mjs');
  assert.ok(bridgePassMatch.index > loopEnd,
    'the wp/empowerms-child/css/ sync must run after the FROM_ROOT loop, or the loop\'s own --delete against dest/css/ removes bridge.css straight back out');

  const bridgePass = bridgePassMatch[0];
  assert.doesNotMatch(bridgePass, /--delete/,
    'the wp/empowerms-child/css/ sync must not carry --delete: its source is only ever bridge.css, and --delete against dest/css/ would erase every file the previous pass just placed there');
  assert.match(bridgePass, /`\$\{dest\}\/css\/`|dest\}\/css\//, 'the wp/empowerms-child/css/ sync does not target dest/css/');
});

/* Task 10, found on the live install rather than by reading the code: a direct
   md5sum run moments after a clean syncTheme() answered "No such file or
   directory" for bridge.css. The FROM_ROOT loop rsyncs the repository's css/
   with --delete, bridge.css does not live there, so it is deleted on every
   sync and the third pass restores it. Between those two rsyncs every
   converted page on the install renders with no bridge stylesheet.

   THIS TEST RUNS THE REAL RSYNC, and its own first version is why. That
   version asserted three things about the loop's SOURCE TEXT: that it
   mentions bridge.css, that it passes some --exclude, and that
   --delete-excluded appears nowhere. Review applied three edits to
   wp/sync.mjs that each fully reopen the window, and all three stayed green:
   binding the exclude to js/ instead of css/, deleting the exclude while
   keeping the comment that names bridge.css, and excluding a file that does
   not exist. A source-text assertion cannot tell an exclude that protects
   bridge.css from an exclude that protects something else, which is two steps
   removed from the property that matters.

   The property that matters is observable without any install, and the fix's
   author had already observed it by hand against a scratch directory before
   writing the fix. So: build the real argument list from wp/sync.mjs's own
   exported fromRootArgs(), swap the remote destination for a local one, put a
   destination-only bridge.css in place, run the local rsync, and assert the
   file survives with its contents. The css pass must protect it and every
   other pass must not, since a blanket exclude would be a different defect. */
/* DERIVED, not hand-maintained, and that is the whole point of it. On
   2026-08-18 `patterns/` was missing from FROM_ROOT while pages.mjs's own
   SHARED list had carried it since the review site was built, so every
   converted page had been rendering without the build's hex-lattice motif
   since Phase 2A: the file 404'd on the install and no instrument in this
   project could see it, because the mask sits on a ::before, changes no
   layout and belongs to no control.

   Two hand-maintained coverage lists have now shipped wrong in this
   repository (the earlier one was a test whose page list was written by
   hand). So this test does not restate the answer, it derives it: every
   directory a SHIPPED stylesheet reaches for through url() must be in
   FROM_ROOT, or the deploy cannot carry it. Adding a stylesheet that
   references a new directory turns this red without anybody remembering to
   update a list.

   Scope is deliberately the stylesheets that ship to the theme, which is the
   same set the sync copies: css/, components/ and tokens/. Inline `data:`
   URIs have no directory and are ignored. */
test('every directory a shipped stylesheet reaches for through url() is in wp/sync.mjs FROM_ROOT', () => {
  const sheets = ['css', 'components', 'tokens']
    .flatMap((dir) => fs.readdirSync(dir)
      .filter((f) => f.endsWith('.css'))
      .map((f) => path.join(dir, f)));
  assert.ok(sheets.length > 20, `expected the build's stylesheets, found ${sheets.length}`);

  const roots = new Set();
  for (const sheet of sheets) {
    const src = fs.readFileSync(sheet, 'utf8');
    for (const m of src.matchAll(/url\(\s*['"]?([^)'"]+)/g)) {
      const ref = m[1].trim();
      if (ref.startsWith('data:') || ref.startsWith('#')) continue;
      const seg = ref.replace(/^\.\.\//, '').split('/')[0];
      if (seg && !seg.includes('.')) roots.add(seg);
    }
  }
  assert.ok(roots.size > 0, 'no url() references found at all, which means this test stopped reading the stylesheets');

  const missing = [...roots].filter((r) => !FROM_ROOT.includes(r)).sort();
  assert.deepEqual(missing, [],
    `these directories are referenced by a shipped stylesheet and would not reach the install: ${missing.join(', ')}`);
});

test('the css pass wp/sync.mjs actually issues leaves a destination-only bridge.css in place, run against a real rsync', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-rsync-'));
  try {
    for (const dir of ['css', 'js']) {
      fs.mkdirSync(path.join(root, 'src', dir), { recursive: true });
      fs.mkdirSync(path.join(root, 'dest', dir), { recursive: true });
      fs.writeFileSync(path.join(root, 'src', dir, `site.${dir === 'css' ? 'css' : 'js'}`), 'from source\n');
      fs.writeFileSync(path.join(root, 'dest', dir, 'bridge.css'), 'the bridge\n');
    }

    /* The arguments come from syncTheme() ITSELF, not from fromRootArgs(),
       and that is the whole point of this shape. Review found an edit that
       keeps a fromRootArgs-only test green while reopening the window:
       leave the helper alone, inline the arguments at the call site, drop
       the exclude. Capturing what syncTheme issues closes that, because the
       call site is what reaches the install.

       syncTheme's runner is injected, so nothing is executed here and no
       network is touched; the captured argv is then rewritten to local paths
       and run through a real rsync. Passing an empty host makes
       `${host}:${dest}/` a plain path. */
    const issued = [];
    await syncTheme({
      run: (cmd, args) => { issued.push([cmd, args]); return Promise.resolve({ stdout: '', stderr: '' }); },
      config: { host: '', key: 'key-unused', root: `${root}/dest-root` },
    });

    const dest = `${root}/dest-root/wp-content/themes/empowerms-child`;
    for (const dir of ['css', 'js']) {
      const pass = issued.find(([, args]) => args.includes(`${dir}/`) && args.includes('--delete'));
      assert.ok(pass, `syncTheme issued no --delete pass for ${dir}/, so this test is no longer watching the code that runs`);
      const args = pass[1]
        .map((a) => (a === `${dir}/` ? `${root}/src/${dir}/` : a))
        .map((a) => (a === `:${dest}/${dir}/` ? `${root}/dest/${dir}/` : a))
        .filter((a, i, all) => !(a === '-e' || all[i - 1] === '-e'));
      execFileSync('rsync', args);
    }

    const cssBridge = path.join(root, 'dest', 'css', 'bridge.css');
    assert.ok(fs.existsSync(cssBridge),
      'the css pass deleted bridge.css from the destination: every theme sync then leaves the live install with no bridge stylesheet until the third pass restores it');
    assert.equal(fs.readFileSync(cssBridge, 'utf8'), 'the bridge\n',
      'bridge.css survived the css pass but its contents were replaced');
    assert.ok(fs.existsSync(path.join(root, 'dest', 'css', 'site.css')),
      'the css pass did not deliver the repository css/, so the exclude is too broad');
    assert.ok(!fs.existsSync(path.join(root, 'dest', 'js', 'bridge.css')),
      'a destination-only file survived the js pass, so the exclude is not scoped to css/ and every other directory has stopped being mirrored');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/* Task 10 review, Important finding 2. Three file:line citations in this
   batch went stale, and every one was correct when it was written: a sibling
   commit in the SAME batch inserted lines above the target and moved it. The
   project's standing rule, that every cited line opens to what it claims, is
   enforced at write time by a human, and nothing re-checks it afterwards.

   This test checks the two invariants that are decidable without knowing what
   each citation meant:

   1. A citation of `test-elementor.mjs:N` must land on a line containing an
      assertion. Every such citation in the tree exists to point at the
      assertion that gives a register floor its meaning, and the observed
      failure moved one onto the word "catches." in the middle of a comment.

   2. A citation of `bridge.css:N` from inside bridge.css must land on CSS,
      not on comment prose. The observed failure moved a citation for a rule
      onto the explanation of a different rule, which reads as plausible and
      is wrong.

   Neither invariant catches a citation that moves onto a DIFFERENT assertion
   or a DIFFERENT selector, and that limit is deliberate: this asserts what a
   machine can decide. The rest still needs a reader. */
/* bridge.css's braces must balance, and every numbered block must sit at the
   TOP LEVEL of the file rather than nested inside another rule.

   Written 2026-08-20 after a merge resolution silently deleted the closing
   brace of block 63's `.elementor-location-header{display:contents}`. Nothing
   caught it: the file still parsed, the citation validator still passed, both
   suites still went green, and the file even LOOKED right, because the missing
   brace is invisible in a 7000-line file whose blocks are separated by pages of
   prose. What it actually did was nest blocks 71 and 72 inside block 63's rule,
   so every declaration in them was dead on the live site while being present in
   the served stylesheet. It took a browser and a computed-style read to find,
   which is exactly the kind of defect this file's own header warns is invisible
   to source inspection.

   Comments are stripped before counting because this file's prose is full of
   braces (selectors quoted inside explanations), and a naive count reports a
   false imbalance on a correct file. */
test('bridge.css braces balance and every numbered block sits at the top level', () => {
  const raw = fs.readFileSync('wp/empowerms-child/css/bridge.css', 'utf8');
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.equal(opens, closes,
    `bridge.css has ${opens} opening braces and ${closes} closing ones; an unclosed rule silently nests every block after it`);

  /* Depth at each block header, measured on the comment-stripped text but
     located by the block's first selector, because the header itself is a
     comment and is gone by then. */
  let depth = 0;
  let line = 1;
  const depthAtLine = new Map();
  for (const ch of css) {
    if (ch === '\n') { line += 1; depthAtLine.set(line, depth); }
    else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
  }
  assert.equal(depth, 0, 'bridge.css does not return to depth 0 at end of file');

  /* Every block header line in the raw file, then the first non-blank line
     after it that is not comment prose, is where that block's rules start. */
  const rawLines = raw.split('\n');
  const headers = [];
  rawLines.forEach((l, idx) => {
    const m = l.match(/^\/\* -+ (\d+)\./);
    if (m) headers.push({ number: Number(m[1]), line: idx + 1 });
  });
  assert.ok(headers.length >= 60, `only ${headers.length} numbered blocks found; this test has stopped finding them`);

  for (const h of headers) {
    const d = depthAtLine.get(h.line) ?? 0;
    assert.equal(d, 0,
      `bridge.css block ${h.number} (line ${h.line}) starts at nesting depth ${d}, not top level, so its rules are trapped inside an unclosed rule above it`);
  }
});

test('every internal file:line citation still lands on the kind of line it claims', () => {
  const files = [
    'elementor/pages/register.mjs',
    'wp/empowerms-child/css/bridge.css',
    ...fs.readdirSync('elementor/pages', { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => fs.readdirSync(path.join('elementor/pages', d.name))
        .filter((f) => f.endsWith('.mjs'))
        .map((f) => path.join('elementor/pages', d.name, f))),
  ];

  const suiteLines = fs.readFileSync('test-elementor.mjs', 'utf8').split('\n');
  const bridgeLines = fs.readFileSync('wp/empowerms-child/css/bridge.css', 'utf8').split('\n');

  let checked = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');

    for (const m of src.matchAll(/test-elementor\.mjs:(\d+)/g)) {
      const n = Number(m[1]);
      const line = suiteLines[n - 1] ?? '';
      checked += 1;
      assert.match(line, /assert\./,
        `${file} cites test-elementor.mjs:${n}, which is now "${line.trim().slice(0, 60)}" and carries no assertion`);
    }

    if (!file.endsWith('bridge.css')) continue;
    for (const m of src.matchAll(/bridge\.css:(\d+)(?:-(\d+))?/g)) {
      const n = Number(m[1]);
      const line = bridgeLines[n - 1] ?? '';
      checked += 1;
      assert.doesNotMatch(line, /^\s*\*/,
        `${file} cites bridge.css:${m[0].split(':')[1]}, whose first line is now comment prose rather than CSS: "${line.trim().slice(0, 60)}"`);
    }
  }

  /* A sweep that silently checks nothing is the failure this project has
     already shipped once, in a test whose page list was hand-written. */
  assert.ok(checked >= 5, `only ${checked} citations were checked, so this test has stopped finding them`);
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

/* --- wp/empowerms-child, as a standalone theme --------------------------- */

const THEME = 'wp/empowerms-child';
const themeFile = (name) => fs.readFileSync(`${THEME}/${name}`, 'utf8');

test('the theme is standalone, with no parent to inherit templates from', () => {
  /* The whole point of the exercise. `Template:` in style.css is what makes
     WordPress treat this as a child of uicore-pro and fall back to its
     templates for everything this theme does not define. While that line is
     present, deactivating UiCore leaves the site with no templates at all. */
  const style = themeFile('style.css');
  assert.ok(!/^\s*Template:/m.test(style),
    'style.css still declares a parent theme, so this is still a child theme');
  assert.match(style, /^\s*Theme Name:/m, 'style.css has no Theme Name header');
});

test('the theme defines the templates WordPress needs to render this site', () => {
  /* A REQUIRED-MINIMUM list, which is the legitimate use of an enumerated set:
     these are named because WordPress's own template hierarchy names them, not
     because somebody looked at this site and listed what it happens to use.
     index.php is the only one WordPress strictly requires; the rest are the
     routes this install actually serves (pages, 490 posts, category and author
     archives, search, and misses). */
  for (const file of ['index.php', 'page.php', 'single.php', 'archive.php',
    'search.php', '404.php', 'header.php', 'footer.php', 'functions.php', 'style.css']) {
    assert.ok(fs.existsSync(`${THEME}/${file}`), `the theme has no ${file}`);
  }
});

test('the theme renders the Elementor header and footer locations itself', () => {
  /* Measured on the install before writing the theme: elementor_theme_do_location()
     is called ONLY by uicore-framework, and uicore-pro declares no Elementor
     theme support. That function is what puts the Phase 2A header and footer
     parts on every page, so removing UiCore does not degrade them, it removes
     them. This test is the reason the theme cannot forget. */
  assert.match(themeFile('header.php'), /elementor_theme_do_location|empower_do_elementor_location/,
    'header.php never renders the Elementor header location');
  assert.match(themeFile('footer.php'), /elementor_theme_do_location|empower_do_elementor_location/,
    'footer.php never renders the Elementor footer location');
});

test('the theme opens and closes a main landmark carrying the skip link target', () => {
  /* The header part carries the build's skip link and it points at #main.
     UiCore supplied that wrapper; if this theme does not, the WCAG 2.4.1
     repair made in Phase 2A silently becomes inert again, with the link
     present, focusable, and targeting nothing. */
  assert.match(themeFile('header.php'), /<main[^>]*id=["']main["']/,
    'header.php does not open <main id="main">, so the skip link targets nothing');
  assert.match(themeFile('footer.php'), /<\/main>/, 'footer.php never closes <main>');
});

test('the theme calls the two WordPress hooks everything else depends on', () => {
  assert.match(themeFile('header.php'), /wp_head\s*\(/, 'header.php never calls wp_head()');
  assert.match(themeFile('header.php'), /wp_body_open\s*\(/, 'header.php never calls wp_body_open()');
  assert.match(themeFile('footer.php'), /wp_footer\s*\(/, 'footer.php never calls wp_footer()');
});

test('the theme declares featured-image support, which the homepage loop depends on', () => {
  /* Without post-thumbnails, has_post_thumbnail() is false site-wide and
     Elementor's featured-image dynamic tag renders nothing. The homepage's
     Community Stories cards would come back with a title and no photograph,
     which is exactly how they looked when the dynamic tag name was wrong, and
     it fails silently in the same way. */
  assert.match(themeFile('functions.php'), /add_theme_support\(\s*'post-thumbnails'/,
    'the theme does not declare post-thumbnails support');
  assert.match(themeFile('functions.php'), /add_theme_support\(\s*'title-tag'/,
    'the theme does not declare title-tag support, so nothing outputs <title>');
});

test('the theme registers its Elementor locations so later parts can be assigned', () => {
  /* Without this hook the header and footer still render, because the
     templates call the location directly, but Elementor's Theme Builder UI
     cannot offer single or archive as somewhere to put a new part. */
  assert.match(themeFile('functions.php'), /elementor\/theme\/register_locations/,
    'the theme never registers its Elementor locations');
});

/* theme-js/ is a DESTINATION-ONLY directory, the same shape as
   wp/empowerms-child/css/bridge.css: it exists under wp/empowerms-child/ and
   has no counterpart at the repository root. That is deliberate. The root
   js/ directory is synced into the theme by wp/sync.mjs and is the protected
   static build (functions.php:486 records what editing it cost last time);
   an Elementor-only script placed there would ship inside a static hand-off
   it is not part of, and would join the three-way fight over a top-level
   `const root` that this file's own comments describe.

   This test exists because the sync is the silent part. syncTheme() reports
   nothing on failure, and a script that never reaches the install produces a
   header whose panel is simply always open: wrong-looking, not broken, and
   therefore easy to miss. */
test('theme-js is not excluded from the theme sync', () => {
  assert.ok(!FROM_ROOT.includes('theme-js'),
    'theme-js is in FROM_ROOT, so the wp/empowerms-child pass will exclude it and nothing will ever upload it');
  assert.ok(fs.existsSync('wp/empowerms-child/theme-js/search.js'),
    'wp/empowerms-child/theme-js/search.js does not exist');
});

/* An ES module loaded as a classic script shares one global scope with every
   other classic script on the page, and the second file to declare an
   identifier the first already claimed throws a SyntaxError and never runs.
   That is not hypothetical here: it took down every desktop dropdown on the
   site once, and functions.php's own comment at :452 is the post-mortem.
   wp_script_add_data($handle,'type','module') looks like the fix and is not
   one; the script_loader_tag filter is, and it reads its handle list from
   empower_module_script_handles(). A handle missing from that list loads
   classic. */
test('the search script is enqueued and loads as a module', () => {
  const fn = themeFile('functions.php');
  assert.match(fn, /wp_enqueue_script\(\s*'empower-search',\s*\$dir \. '\/theme-js\/search\.js'/,
    'empower-search is not enqueued from theme-js/search.js');
  assert.match(fn, /empower_asset_ver\(\s*'theme-js\/search\.js'\s*\)/,
    'the search script is enqueued without a content-derived version, so a change will not bust the cache');
  assert.match(fn, /\$handles = array\([^)]*'empower-search'/,
    'empower-search is missing from empower_module_script_handles(), so it will load as a classic script and collide');
});

/* The panel ships open in the markup by design (Task 2's comment says why),
   and this attribute is what lets CSS close it. If the script never runs the
   attribute is never set, the closed-by-default rules never apply, and the
   form stays visible and usable. That is the intended degraded state and it
   is worth asserting the gate exists, because a script that closes the panel
   with inline styles instead would break the no-JavaScript contract silently. */
test('the search script gates its CSS on a root attribute rather than inline styles', () => {
  const js = fs.readFileSync('wp/empowerms-child/theme-js/search.js', 'utf8');
  assert.match(js, /setAttribute\(\s*['"]data-search['"]\s*,\s*['"]on['"]\s*\)/,
    'search.js never sets [data-search="on"], so bridge.css block 71 has no gate to key on');
  assert.doesNotMatch(js, /\.style\.(display|visibility|opacity)\s*=/,
    'search.js closes the panel with inline styles, which breaks the JavaScript-off contract');
});

/* --- elementor/pages/final/ (the homepage) ------------------------------ */

test('the homepage hero mapping carries the section class and its copy', () => {
  const tree = finalHero();
  const flat = JSON.stringify(tree);
  const source = fs.readFileSync('src/final/sections/01-hero.html', 'utf8');

  /* Same derivation as the podcast tests above: the copy deck is read out of
     the source partial by regex, never typed here. Note what this admits on
     this particular partial, because it is load-bearing rather than
     incidental: the <h1> is `Your American&nbsp;Dream <em>Starts Here.</em>`,
     so the regex yields TWO strings, `Your American&nbsp;Dream` and
     `Starts Here.`, and the mapping only passes if it carries the entity and
     the inline <em> exactly as authored rather than flattening the heading to
     plain text. */
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `homepage hero mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('fp-hero'), 'homepage hero mapping does not carry the fp-hero class');
});

test('the homepage solutions-model mapping carries the section class and its copy', () => {
  const flat = JSON.stringify(finalSolutions());
  const source = fs.readFileSync('src/option-d/sections/02-solutions.html', 'utf8');
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `solutions mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('tl-change'), 'solutions mapping does not carry the tl-change class');
});

test('the homepage solutions model stays a real ordered list', () => {
  /* The whole reason that section uses an html() widget. Elementor's container
     html_tag control offers no ol and no li, so a native conversion turns a
     five-step ordered sequence into anonymous divs and a screen reader stops
     announcing "list, 5 items" and "item 2 of 5". This test is what stops a
     later tidy-up "simplifying" the html widget into containers, which would
     look identical in a screenshot and pass every copy check. */
  const flat = JSON.stringify(finalSolutions());
  assert.ok(flat.includes('<ol class=\\"tl-line\\"'), 'the solutions model is no longer a real <ol>');
  assert.equal((flat.match(/<li class=\\"tl-node\\"/g) || []).length, 5,
    'the solutions model does not carry exactly five real <li> steps');
  assert.ok(flat.includes('data-reveal-group'), 'the <ol> lost its reveal group');
});

test('the homepage foundations mapping carries the section class and its copy', () => {
  const flat = JSON.stringify(finalFoundations());
  const source = fs.readFileSync('src/current-2/sections/03-foundations.html', 'utf8');
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `foundations mapping is missing: ${s.slice(0, 48)}`);
  }
  assert.ok(flat.includes('c2-foundations'), 'foundations mapping does not carry the c2-foundations class');
});

test('every decorative photograph on the homepage is hidden from the accessibility tree', () => {
  /* Derived from the source partials rather than enumerated: every <img> that
     carries alt="" in the static build is decorative, and its converted
     counterpart has to be hidden at the point of use. It cannot rely on the
     attachment's own alt being empty, because one of these files
     (child-classroom-tablet) is decorative in the foundations panels and
     MEANINGFUL in the insights rows, and an attachment has exactly one alt
     text. So the rule is aria-hidden on the widget, and the count is what this
     checks: three decorative backgrounds in foundations, one aside in the hero.

     Counting rather than spot-checking, because the failure mode is a fourth
     panel added later with no aria-hidden, which no spot check would see. */
  const decorativeInSource = (file) =>
    (fs.readFileSync(file, 'utf8').match(/<img[^>]*\balt=""/g) || []).length;

  const heroDecorative = decorativeInSource('src/final/sections/01-hero.html');
  const foundationsDecorative = decorativeInSource('src/current-2/sections/03-foundations.html');
  assert.ok(heroDecorative > 0 && foundationsDecorative > 0, 'the source partials carry no decorative images, so this test proves nothing');

  const hidden = (tree) => (JSON.stringify(tree).match(/aria-hidden\|true/g) || []).length;
  assert.equal(hidden(finalHero()), heroDecorative,
    'the hero hides a different number of images than the source marks decorative');
  assert.equal(hidden(finalFoundations()), foundationsDecorative,
    'the foundations section hides a different number of images than the source marks decorative');
});

test('the homepage stories mapping keeps the authored story and loops only the placeholders', () => {
  const flat = JSON.stringify(finalStories());
  const source = fs.readFileSync('src/sections/04-stories.html', 'utf8');

  /* A NAMED EXEMPTION, which is the inverse of the derived-set rule and is
     commented as such. Everything in this section's copy has to survive
     conversion EXCEPT the two mini cards, whose own copy says it is
     auto-populated and which become a Loop Grid over Community Stories. Those
     strings are expected to disappear, so they are excluded here by name; every
     other string in the partial is still checked. */
  const REPLACED_BY_THE_LOOP = [
    '“Community story pull-quote — auto-populated from the latest Community Stories.”',
    'Name · Jackson, MS',
    'Name · Tupelo, MS',
  ];
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@') && !REPLACED_BY_THE_LOOP.includes(s));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `stories mapping is missing: ${s.slice(0, 48)}`);
  }

  /* The half that matters most on this section: a real named Mississippian's
     quote is authored content and must NOT be inside the loop, or the homepage
     replaces her words with whatever is newest. */
  assert.ok(flat.includes('Jodi Berry'), 'the authored featured story lost its attribution');
  assert.ok(flat.includes('blockquote'), 'the featured quote is no longer a blockquote');
  const heroCardIdx = flat.indexOf('Jodi Berry');
  const loopIdx = flat.indexOf('loop-grid');
  assert.ok(heroCardIdx !== -1 && loopIdx !== -1 && heroCardIdx < loopIdx,
    'the authored lead card is not ahead of the loop grid, so the loop may have swallowed it');
});

test('the homepage stories loop queries Community Stories, not the whole site', () => {
  /* podcast-a shipped this exact defect once: a Loop Grid with no term filter
     renders every post on the install and looks plausible. Category 9 is
     Community Stories, read from `wp term list category` on the install. */
  const flat = JSON.stringify(finalStories());
  assert.ok(flat.includes('"post_query_include":"terms"'), 'the stories loop does not filter by term at all');
  assert.ok(flat.includes(`"${STORIES_CATEGORY_ID}"`), 'the stories loop does not name the Community Stories term id');
  assert.equal(STORIES_CATEGORY_ID, 9, 'Community Stories is category 9 on this install');
});

test('the homepage stories loop item defers Elementor element caching', () => {
  /* Without _element_cache the container is baked into a shared cache on
     whichever post renders first, and every later card serves that post's
     wrapper markup while its title still varies, which reads as correct.
     podcast-a's module carries the full proof. */
  assert.ok(JSON.stringify(finalStoriesLoopItem()).includes('"_element_cache":"yes"'),
    'the stories loop item container will be served from Elementor\'s shared element cache');
});

test('the homepage insights mapping carries the section class and its copy', () => {
  const flat = JSON.stringify(finalInsights());
  const source = fs.readFileSync('src/sections/05-insights.html', 'utf8');
  const strings = [...source.matchAll(/>([^<>{}]{1,})</g)]
    .map(m => m[1].trim())
    .filter(s => s && !s.startsWith('@'));
  assert.ok(strings.length > 0, 'no copy found in the source partial');
  for (const s of strings) {
    assert.ok(flat.includes(s.replace(/"/g, '\\"')), `insights mapping is missing: ${s.slice(0, 48)}`);
  }
  /* Deliberately NOT a Loop Grid, and the test says so, so that a later pass
     adding one has to change this line and read the reason. The middle row is a
     research report and the install has no Research & Reports category, so any
     query chosen for it today would be a guess rendering plausible wrong
     content on the homepage. */
  assert.ok(!flat.includes('loop-grid'),
    'the insights section grew a Loop Grid; the research row still has no category to query');
});

test('the homepage join-us form stays a real form element', () => {
  /* Elementor's container html_tag control offers no `form`, so this block is
     an html() widget carrying the authored markup. The accessibility contract
     test.mjs already holds against the static build has to survive the
     conversion, and this is where it is checked on the converted tree. */
  const flat = JSON.stringify(finalJoinUs());
  assert.ok(flat.includes('<form'), 'the newsletter form is no longer a real <form>');
  assert.ok(flat.includes('for=\\"join-email\\"'), 'the email label lost its for attribute');
  assert.ok(flat.includes('id=\\"join-email\\"'), 'the email input lost the id its label points at');
  assert.ok(flat.includes('type=\\"email\\"'), 'the email input is no longer type=email');
  assert.ok(flat.includes('autocomplete=\\"email\\"'), 'the email input lost its autocomplete token');
  assert.ok(flat.includes('required'), 'the email input is no longer required');
  assert.ok(flat.includes('type=\\"submit\\"'), 'the subscribe control is no longer a submit button');
});

test('the homepage manifest carries all six sections in the order dist/final.html includes them', () => {
  /* The manifest is what deployPage() is called with, and deployPage overwrites
     _elementor_data wholesale, so a dropped import here publishes a homepage
     missing a section that still renders and still returns 200. Derived from
     the source page rather than enumerated: the order comes out of
     src/final/index.html's own @include list. */
  const index = fs.readFileSync('src/final/index.html', 'utf8');
  const included = [...index.matchAll(/@include\s+(?:[a-z0-9-]+\/)*sections\/(\d\d)-([a-z]+)\.html/g)]
    .map(m => m[2]);
  assert.equal(included.length, 6, 'src/final/index.html no longer includes six sections');

  const classes = ['fp-hero', 'tl-change', 'c2-foundations', 'em-stories', 'em-insights-wrap', 'em-join-wrap'];
  const flat = finalSections().map(s => JSON.stringify(s));
  assert.equal(flat.length, included.length,
    `the manifest carries ${flat.length} sections and the page includes ${included.length}`);
  flat.forEach((s, i) => {
    assert.ok(s.includes(classes[i]),
      `manifest position ${i + 1} is not ${included[i]} (expected the ${classes[i]} class)`);
  });
});

test('the homepage hero photographs resolve through the shared media map, not typed urls', () => {
  /* Four of the homepage's six sections use the same nine photographs, and
     several use the same file twice. A url or an attachment id typed at the
     point of use is a second copy of an install fact, and the copies drift
     silently: a wrong id renders SOMEBODY ELSE'S photograph and every
     structural test still passes. So the ids and urls live in one map and the
     sections read from it, which this test holds by checking the hero's two
     images against the map rather than against literals. */
  const flat = JSON.stringify(finalHero());
  assert.ok(flat.includes(String(PHOTOS['father-children-field'].id)),
    'the hero is not using the mapped attachment id for father-children-field');
  assert.ok(flat.includes(PHOTOS['children-running-parent'].url),
    'the hero is not using the mapped url for children-running-parent');

  for (const [name, entry] of Object.entries(PHOTOS)) {
    assert.ok(Number.isInteger(entry.id) && entry.id > 0, `${name} has no attachment id`);
    assert.ok(entry.url.startsWith('https://') && entry.url.endsWith(`${name}.jpg`),
      `${name}'s url does not end in its own filename, so the map has two entries crossed over`);
  }
});

test('every photograph the homepage sections reference exists in the media map', () => {
  /* The coverage half, derived rather than enumerated: the set of photographs
     is read out of the six source partials, so a section that starts using a
     tenth image fails this test instead of shipping a broken <img>. An
     enumerated list here would report success over exactly that case. */
  const partials = [
    'src/final/sections/01-hero.html',
    'src/option-d/sections/02-solutions.html',
    'src/current-2/sections/03-foundations.html',
    'src/sections/04-stories.html',
    'src/sections/05-insights.html',
    'src/sections/06-joinus.html',
  ];
  const used = new Set();
  for (const p of partials) {
    for (const m of fs.readFileSync(p, 'utf8').matchAll(/assets\/photography\/([a-z0-9-]+)\.jpg/g)) {
      used.add(m[1]);
    }
  }
  assert.ok(used.size > 0, 'no photography found across the homepage partials');
  for (const name of used) {
    assert.ok(PHOTOS[name], `the homepage uses assets/photography/${name}.jpg with no entry in the media map`);
  }
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
   the 51 compositions Phase 2 writes.

   Fix round: the trees array below used to be hand-written and left out
   headerPart() and footerPart() entirely (14 containers, 6 in the header
   and 8 in the footer, never covered) while a comment claimed it covered
   "every container in the build". A hand-written list is a coverage bug
   that reports success, so this test no longer trusts one: discoverTrees()
   independently counts the tree-shaped exports that actually exist in the
   two directories this feature depends on (podcast-a's numbered mapping
   modules and the theme parts), and the walk below fails loudly if the
   hard-coded trees array has drifted from that count, rather than silently
   covering less than it claims. */
async function discoverTrees(dir, { skip = [] } = {}) {
  const isTreeNode = (x) => x !== null && typeof x === 'object' && typeof x.elType === 'string';
  const isTree = (x) => (Array.isArray(x) ? x.length > 0 && x.every(isTreeNode) : isTreeNode(x));
  let found = 0;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.mjs') && !skip.includes(f))) {
    const mod = await import(`./${dir}/${file}`);
    for (const value of Object.values(mod)) {
      if (typeof value !== 'function') continue;
      let result;
      try {
        result = value();
      } catch {
        continue; // not a zero-arg tree builder (e.g. extractBlock(source, tagName, className))
      }
      if (isTree(result)) found += 1;
    }
  }
  return found;
}

test('every container in every podcast-a mapping module and every theme part sets content_width: \'full\'', async () => {
  function* everyContainer(nodes) {
    for (const n of nodes) {
      if (n.elType === 'container') yield n;
      if (n.elements?.length) yield* everyContainer(n.elements);
    }
  }
  /* personSingle() joined this list on 2026-08-20, and it did not join it
     voluntarily: the drift check below went red the moment
     elementor/theme-parts/person-single.mjs existed, naming 6 walked trees
     against 7 that exist. That is the check doing exactly the job its own
     comment describes, on the first new theme part added since it was
     written.

     postSingle() joined on 2026-08-23 the same way. Adding it did NOT make
     the count agree, which is the more useful half of the story: it read 10
     walked against 11, and the eleventh was native-animation-probe.mjs,
     which had been uncovered since the day it was written. Nobody had
     noticed, because the check reports one number and a human reads it as
     one omission. Its three containers were already 'full' and now they are
     checked rather than assumed. Two theme parts and one probe, three red
     counts, no human deciding any of them: that is what the check is for. */
  const trees = [
    podcastHero(), podcastAbout(), podcastLibrary(), podcastLoopItem(),
    headerPart(), footerPart(), personSingle(),
    searchArchivePart(), searchResultItem(), postSingle(),
    probeSections(), categoryArchive(),
  ];

  /* page.mjs is excluded from the podcast-a scan: sections() there just
     recomposes hero()/about()/library(), so counting it too would double
     count trees already found in the numbered mapping files. */
  const discovered = await discoverTrees('elementor/pages/podcast-a', { skip: ['page.mjs'] })
    + await discoverTrees('elementor/theme-parts', { skip: ['extract.mjs'] });
  assert.equal(trees.length, discovered,
    `this test walks ${trees.length} trees but ${discovered} tree-shaped exports actually exist across elementor/pages/podcast-a and elementor/theme-parts; the hard-coded trees array above has drifted from the modules that actually exist`);

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

/* --- elementor/pages/what-we-do-a/page.mjs -------------------------------- */

/* Same contract, same reasoning as the podcast-a test above: deployPage()
   overwrites _elementor_data wholesale, so this list being right is the only
   thing standing between a dropped import and a page that renders, returns
   200, and is missing a section. */
test('the what-we-do-a page composes hero, solutions, then reports, in that order', () => {
  const built = whatWeDoASections();
  assert.deepEqual(
    built.map(s => s.settings.css_classes),
    ['da-hero', 'da-solutions', 'da-reports'],
    'what-we-do-a/page.mjs does not compose da-hero, da-solutions, da-reports in that order',
  );
  assert.equal(typeof whatWeDoAPostId, 'number', 'what-we-do-a/page.mjs POST_ID is not a number');
  assert.ok(Number.isInteger(whatWeDoAPostId), 'what-we-do-a/page.mjs POST_ID is not an integer');
});

/* --- elementor/theme-parts ------------------------------------------------ */

/* I4 from the final review: HEADER_POST_ID and FOOTER_POST_ID were imported
   at the top of this file and never used anywhere in it, so a typo in
   either constant would go unnoticed by the suite. podcast-a's own POST_ID
   gets exactly this assertion above; the two live theme-part ids get the
   same treatment here so the imports stop being dead. This does not (and
   cannot, from source alone) prove 20573 and 20574 are the correct ids on
   the install; it proves the constants are shaped like ids at all. */
test('the header and footer theme-part post ids are real integers', () => {
  assert.equal(typeof HEADER_POST_ID, 'number', 'theme-parts/header.mjs HEADER_POST_ID is not a number');
  assert.ok(Number.isInteger(HEADER_POST_ID), 'theme-parts/header.mjs HEADER_POST_ID is not an integer');
  assert.equal(typeof FOOTER_POST_ID, 'number', 'theme-parts/footer.mjs FOOTER_POST_ID is not a number');
  assert.ok(Number.isInteger(FOOTER_POST_ID), 'theme-parts/footer.mjs FOOTER_POST_ID is not an integer');
});

/* SEARCH_ARCHIVE_POST_ID and SEARCH_RESULT_ITEM_POST_ID are two different
   library posts: the archive document and the loop item its Loop Grid
   points at by id (elementor/theme-parts/search-archive.mjs:191). Task 5's
   brief fixed both ids and the archive's own Theme Builder condition, so
   this checks all three land as the values the brief actually specifies,
   and that the two posts were not accidentally given the same id. */
test('the search results part is a real archive document with a search condition', () => {
  assert.ok(Number.isInteger(SEARCH_ARCHIVE_POST_ID),
    'SEARCH_ARCHIVE_POST_ID is not an integer post id');
  assert.deepEqual(SEARCH_ARCHIVE_CONDITIONS, ['include/archive/search'],
    'the search results condition is not include/archive/search');
  assert.ok(Number.isInteger(SEARCH_RESULT_ITEM_POST_ID),
    'SEARCH_RESULT_ITEM_POST_ID is not an integer post id');
  assert.notEqual(SEARCH_ARCHIVE_POST_ID, SEARCH_RESULT_ITEM_POST_ID,
    'the archive template and its loop item point at the same post');
});

/* --- elementor/theme-parts/category-archive.mjs --------------------------- */

/* THE CONDITION IS TWO LEVELS, AND THE THREE-LEVEL FORM IS THE TRAP.
   Elementor Pro registers Taxonomy as a sub-condition of Post_Type_Archive,
   which reads as a nesting and is not one. Conditions_Manager::parse_condition()
   is `list($type,$name,$sub_name,$sub_id) = array_pad(explode('/',$condition),4,'')`
   and the match is FLAT: get_condition($name)->check([]), then, only if that
   passed, get_condition($sub_name)->check(['id'=>$sub_id]).

   So `include/archive/post_archive/category` parses as name=archive,
   sub_name=post_archive, sub_id=category, and runs
   Post_Type_Archive::check() = `is_post_type_archive('post') || is_home()`,
   which is FALSE on a category archive. Taxonomy::check() never runs. The
   template deploys, looks right in the editor, and never appears on a page.

   `include/archive/category` runs Archive::check() = is_archive() (true), then
   Taxonomy::check() with `$id = (int) '' = 0`, and is_category(0) is true for
   any category archive. Same two-level shape as include/archive/search and
   include/singular/post, which is the corroboration.

   This test re-implements parse_condition rather than asserting the literal,
   because the literal is what a future edit would change and the parse is what
   makes it wrong. */
test('the category archive condition parses flat, into archive + category', async () => {
  const { CATEGORY_ARCHIVE_CONDITIONS } = await import('./elementor/theme-parts/category-archive.mjs');
  assert.equal(CATEGORY_ARCHIVE_CONDITIONS.length, 1, 'expected exactly one condition');

  const parseCondition = (condition) => {
    const [type, name, subName, subId] = [...condition.split('/'), '', '', ''].slice(0, 4);
    return { type, name, subName, subId };
  };
  const parsed = parseCondition(CATEGORY_ARCHIVE_CONDITIONS[0]);

  assert.equal(parsed.type, 'include');
  assert.equal(parsed.name, 'archive',
    `the first level is "${parsed.name}"; it must be a condition whose check() is true on a category `
    + 'archive, and Archive::check() (is_archive()) is the only one that is');
  assert.equal(parsed.subName, 'category',
    `the second level is "${parsed.subName}"; parse_condition() looks conditions up FLAT by name, so `
    + 'this must be the Taxonomy condition\'s own name (the taxonomy slug), never an intermediate '
    + 'like post_archive, whose check() is is_post_type_archive(\'post\') and false here');
  assert.equal(parsed.subId, '',
    'a sub_id pins the template to ONE term; this template serves every category');
});

/* THE CARD IS content-a's, BY POST ID, NOT BY COPY. Every listing surface in
   this build that has grown its own card has cost a second design to keep in
   step: post-single.mjs's More grid reuses LOOP_ITEM_POST_IDS.article for the
   same reason, and its note gives it. `article` specifically, out of the four
   deployed Loop Items, because it is the only one that carries a photograph, a
   topic and a date without assuming the post is about a named person, and a
   category archive holds whatever the category holds.

   Asserting the ID rather than the markup is the point: a copied tree would
   satisfy any structural assertion and still be a second design. */
test('the category archive grid points at content-a\'s article Loop Item, not a card of its own', async () => {
  const { categoryArchive } = await import('./elementor/theme-parts/category-archive.mjs');
  const { LOOP_ITEM_POST_IDS } = await import('./elementor/pages/content-a/loop-item.mjs');

  const grids = [];
  (function walk(nodes) {
    for (const n of nodes) {
      if (n.widgetType === 'loop-grid') grids.push(n);
      if (n.elements?.length) walk(n.elements);
    }
  })(categoryArchive());

  assert.equal(grids.length, 1, `expected one Loop Grid on the archive, found ${grids.length}`);
  assert.equal(grids[0].settings.template_id, LOOP_ITEM_POST_IDS.article,
    'the archive grid does not point at content-a\'s article Loop Item, so this page has grown a '
    + 'second card design that has to be kept in step with the signed-off one by hand');
});

/* NOTHING ABOUT THE TERM IS WRITTEN INTO THE TREE. One template serves ten
   terms, so a term name or a post count in the tree is wrong on nine of them
   the moment it is written, and wrong on all ten the moment Empower add a post.
   This build has been bitten by both halves already: `1b886a4` took typed
   counts out of the approval generators, and the "Our north star" line is the
   standing example of invented copy that reads as approved copy.

   The list below is every category name on the install, read with
   `wp term list category` on 2026-08-26 rather than typed from the roadmap.
   Their post counts are the reason pagination is not optional: education 147,
   work 126, empower news 78, justice 78, bill-summaries 74, podcast 66, press
   releases 33, capitol-chat 28, community-stories 27, uncategorized 0. */
test('the category archive writes no term name and no count into its own tree', async () => {
  const { categoryArchive } = await import('./elementor/theme-parts/category-archive.mjs');
  const markup = JSON.stringify(categoryArchive());

  const TERM_NAMES = [
    'Bill Summaries', 'Capitol Chat', 'Community Stories', 'Education',
    'Empower News', 'Justice', 'Podcast', 'Press Releases', 'Work',
  ];
  for (const name of TERM_NAMES) {
    assert.ok(!markup.includes(name),
      `"${name}" is written into the archive tree, which serves all ten terms; the term has to come `
      + 'from the query, not from this file');
  }

  /* Any run of digits that is not part of a post id, a column count, a
     breakpoint or a per-page setting. A count belongs to the query. */
  const prose = [];
  (function walk(nodes) {
    for (const n of nodes) {
      const t = n.settings?.title ?? n.settings?.editor ?? n.settings?.html ?? '';
      if (typeof t === 'string' && t) prose.push(t);
      if (n.elements?.length) walk(n.elements);
    }
  })(categoryArchive());
  for (const line of prose) {
    assert.ok(!/\b\d+\b/.test(line.replace(/\[[^\]]*\]/g, '')),
      `the archive head states the number "${line.trim().slice(0, 60)}"; every number on this page is `
      + 'a property of the query and must be rendered from it');
  }
});

/* THE HEAD IS TWO SHORTCODES, and each is here because no Elementor control
   can produce it. Same division of labour as inc/post-single.php.

   1. THE HEADING NEEDS A REAL id, because the section is labelled
      aria-labelledby. Elementor's Heading widget writes its own wrapper and
      offers no id control on the heading element itself. Its Archive Title
      dynamic tag also prefixes "Category: " on this install, which is
      WordPress's own get_the_archive_title() default and not a label anybody
      approved.
   2. THERE IS NO COUNT CONTROL OR TAG AT ALL. The number is
      $wp_query->found_posts, which only PHP can reach.

   Both render nothing rather than something wrong for the term with no posts
   (uncategorized, 0), which is the rule inc/post-single.php's figure already
   follows for the 95 posts with no featured image. */
test('the category archive head is rendered by shortcodes, not by widgets that cannot do the job', async () => {
  const { categoryArchive } = await import('./elementor/theme-parts/category-archive.mjs');
  const markup = JSON.stringify(categoryArchive());

  assert.match(markup, /\[empower_archive_title\]/,
    'the archive head does not render [empower_archive_title], so its h1 carries no id for '
    + 'aria-labelledby and inherits WordPress\'s "Category: " prefix');
  assert.match(markup, /\[empower_archive_count\]/,
    'the archive head does not render [empower_archive_count], so the page cannot say how many posts '
    + 'the term holds without typing a number');

  const php = fs.readFileSync('wp/empowerms-child/inc/archive.php', 'utf8');
  for (const tag of ['empower_archive_title', 'empower_archive_count']) {
    assert.match(php, new RegExp(`add_shortcode\\(\\s*'${tag}'`),
      `inc/archive.php does not register [${tag}], so the archive renders the literal shortcode text`);
  }
  assert.match(php, /found_posts/,
    'the count shortcode does not read $wp_query->found_posts, so it is counting something other than '
    + 'what the archive actually resolved');

  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.match(fn, /require_once get_stylesheet_directory\(\) \. '\/inc\/archive\.php'/,
    'functions.php does not require inc/archive.php, so neither shortcode is registered');
});

/* THE STYLE KEY GAINS A THIRD CASE, AND THE OTHER TWO MUST SURVIVE IT.
   empower_style_key() has answered two questions since 2026-08-20: a PAGE is
   keyed by its slug, a SINGULAR OF ANY OTHER POST TYPE by its post type. Both
   are inside an `is_singular()` guard that returns '' for everything else, so
   an archive gets tokens, components, site.css, header-2.css and bridge.css and
   nothing more. That is why the archive needs a case at all: its cards are
   `.cad-card`, which lives in css/content-a.css, and the reveal gate
   (empower_page_has_motion()) derives from the SAME map, so without a key the
   archive would also ship with no animation while carrying reveal attributes.

   This asserts the shape of the branch rather than its result, which a source
   read can honestly do; the live gate below asserts the result. */
test('empower_style_key answers archives without disturbing pages or singulars', () => {
  const php = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const fn = php.slice(php.indexOf('function empower_style_key()'));
  const body = fn.slice(0, fn.indexOf('\n}'));

  assert.match(body, /is_category\(\)|is_archive\(\)/,
    'empower_style_key() has no archive case, so a category archive still resolves to the empty key '
    + 'and loads neither content-a.css nor motion.css');
  assert.match(body, /return \(string\) 'archive';|return 'archive';/,
    "the archive case does not return the 'archive' key that empower_page_styles() is looked up by");

  /* The two older cases, in the order their own docblock argues for: the
     is_singular() guard must still come first, or a `person` archive-shaped
     request would take the archive branch. */
  assert.ok(body.indexOf('is_singular()') < body.indexOf("'archive'"),
    'the archive case is evaluated before the is_singular() guard, so singulars can fall into it');
  assert.match(body, /get_post_field\( 'post_name'/,
    'the page-keyed-by-slug case is gone');
  assert.match(body, /\(string\) \$post_type/,
    'the singular-keyed-by-post-type case is gone');

  const styles = php.slice(php.indexOf('function empower_page_styles()'));
  assert.match(styles.slice(0, styles.indexOf('\n}')), /'archive'\s*=>\s*array\(([^)]*)\)/,
    'empower_page_styles() has no archive row, so the key resolves to nothing');
  const row = styles.match(/'archive'\s*=>\s*array\(([^)]*)\)/)[1];
  for (const sheet of ['motion', 'content-a', 'archive']) {
    assert.ok(row.includes(`'${sheet}'`),
      `the archive row does not load ${sheet}.css`);
  }
});

const CATEGORY_ARCHIVE_PAGE = {
  name: 'category archive',
  envVar: 'CATEGORY_ARCHIVE_URL',
  exampleUrl: 'https://empv2.wpenginepowered.com/category/community-stories/',
};

/* The result the source test above cannot prove: that a real category archive
   request reaches the Elementor template and carries the sheets its cards and
   its animation need. Beaver's own archive layout is the thing being replaced,
   so its marker class is the clearest negative. */
test('the live category archive renders the Elementor template with its stylesheets', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(CATEGORY_ARCHIVE_PAGE, t);
  if (!url) return;

  /* fetchConverted(), not a bare fetch: it refuses an explicit x-cache HIT, so
     this gate cannot pass or fail on a page WP Engine cached before the
     template was deployed. */
  const html = await fetchConverted(url);

  assert.ok(!/fl-theme-builder-archive/.test(html),
    'the archive still carries Beaver Themer\'s archive body class, so the Elementor template is not '
    + 'winning: check the condition is include/archive/category (two levels, not three) and that '
    + 'setConditions() regenerated the conditions cache');
  assert.match(html, /elementor-location-archive/,
    'no Elementor archive location rendered, so archive.php fell through to its plain-list fallback');
  assert.match(html, /id="archive-title"/,
    'the head shortcode did not render, so nothing carries the id the section is labelled by');
  for (const sheet of ['content-a.css', 'motion.css', 'archive.css']) {
    assert.ok(html.includes(sheet),
      `${sheet} is not enqueued on the archive, so empower_style_key() is not returning 'archive'`);
  }
  assert.ok(!/Category:/.test(html),
    'the archive title carries WordPress\'s "Category: " prefix, so it is rendering '
    + 'get_the_archive_title() rather than single_term_title()');
});

/* THREE OF THE TEN TERMS ARE TOPICS, NOT TYPES, AND THEY COMPETE WITH PAGES
   THAT ARE ALREADY CONVERTED AND SIGNED OFF.

   The category taxonomy on this install holds both kinds of term at one level
   (which is also why inc/post-single.php has to code a precedence for the
   eyebrow). Six describe what a post IS; three describe what it is ABOUT, and
   those three are the biggest terms on the install: education 147, work 126,
   justice 78. Each has a converted page saying the same thing to the same
   reader, and the 2026-08-21 SEO audit found twelve existing instances of
   exactly this shape, all of them self-canonical and therefore competing
   rather than consolidating.

   Paolo chose canonical over redirect or noindex on 2026-08-26: the archives
   stay reachable, keep working as a way to browse a topic, and credit their
   signal to the page that is the destination. Same instrument and the same
   file as the Grant Callen pair, which is the precedent for consolidation
   over hiding.

   THE MAP IS ASSERTED WHOLE. Three entries, exactly: a fourth would be a topic
   term nobody has decided about, and a missing one is a term left competing. */
test('the three topic archives credit their converted page, and only those three', () => {
  const php = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const fn = php.slice(php.indexOf('function empower_term_canonical_overrides()'));
  assert.ok(fn, 'empower_term_canonical_overrides() does not exist');
  const body = fn.slice(0, fn.indexOf('\n}'));

  const pairs = [...body.matchAll(/'([a-z0-9-]+)'\s*=>\s*'([^']+)'/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(pairs.sort(), [
    ['education', '/quality-education/'],
    ['justice', '/public-safety/'],
    ['work', '/meaningful-work/'],
  ], 'the topic-to-page map is not the three terms and destinations that were agreed');

  /* One filter, two maps. A second add_filter on the same hook would put the
     answer to "what is canonical here" in two places, which is how the pair
     that this filter exists to fix came about. */
  assert.equal((php.match(/add_filter\( 'aioseo_canonical_url'/g) ?? []).length, 1,
    'there is more than one aioseo_canonical_url filter, so canonicals are decided in two places');

  const filter = php.slice(php.indexOf("add_filter( 'aioseo_canonical_url'"));
  const filterBody = filter.slice(0, filter.indexOf('\n} );'));
  assert.match(filterBody, /is_category\(\)/,
    'the canonical filter has no category branch, so the topic archives still declare themselves '
    + 'canonical and go on competing with their converted pages');
  assert.match(filterBody, /'publish' !== get_post_status/,
    'the term branch does not check the destination is published; a canonical pointing at a 404 or a '
    + 'draft is worse than the duplicate it replaces');
});

/* The result, on the term with the most posts. */
/* AN EMPTY-STATE MESSAGE THAT IS NOT SWITCHED ON IS NOT AN EMPTY STATE.
   Elementor Pro's Loop Grid gates the whole block on a SWITCHER:

     if ( isset( $settings['enable_nothing_found_message'] )
          && 'yes' === $settings['enable_nothing_found_message'] ) { ... }

   and `enable_nothing_found_message` is registered with NO `default`, so it is
   '' unless something sets it. `nothing_found_message_text` is itself
   conditioned on that switch being 'yes'. Writing the text alone therefore
   produces exactly nothing on the page.

   This was found on 2026-08-26 while building the category archive, and it had
   already shipped: theme-parts/search-archive.mjs set the text and not the
   switch, so the search results page has never had the empty state it was
   written to have. The gate covering it asserted the string was present in the
   TREE, which stayed true the whole time. A source assertion about a setting
   cannot see a second setting that suppresses it, which is why this one is an
   invariant over every grid rather than a check on one. */
test('every loop grid that writes an empty state also switches it on', async () => {
  const trees = {
    'search-archive': searchArchivePart(),
    'post-single': postSingle(),
    'category-archive': categoryArchive(),
  };

  let checked = 0;
  for (const [name, tree] of Object.entries(trees)) {
    (function walk(nodes) {
      for (const n of nodes) {
        if (n.widgetType === 'loop-grid' && n.settings?.nothing_found_message_text) {
          checked += 1;
          assert.equal(n.settings.enable_nothing_found_message, 'yes',
            `${name} sets nothing_found_message_text without enable_nothing_found_message:'yes', so `
            + 'Elementor renders no empty state at all and the copy is dead');
        }
        if (n.elements?.length) walk(n.elements);
      }
    })(tree);
  }
  assert.ok(checked > 0, 'no loop grid with an empty state was found; the walk itself is broken');
});

/* The archive's own empty state. A category can empty out at any time: these
   are Empower's terms and Empower's posts, and `uncategorized` sits at 0 posts
   today. An archive that renders a heading, a count of nothing and a blank
   band is the page failing silently. */
/* THE DOCUMENT TYPE FOR A CATEGORY ARCHIVE IS 'archive'. deployThemePart()'s
   third argument is written to `_elementor_template_type`, and it validates
   against a fixed list that predates this template: header, footer,
   single-post, search-results. Elementor Pro's own Archive document returns
   'archive' from get_type(), and Search_Results EXTENDS Archive, which is why
   the narrower type was already on the list and the base one was not.

   Tested through the function's own rejection rather than by reading the
   constant: the constant is what a future edit changes, and the rejection is
   what actually stops a deploy. A non-integer postId is used so the assertion
   is reached with no network call at all -- if 'archive' were still refused,
   the error would name the location instead. */
test('deployThemePart accepts archive as a document type', async () => {
  const { deployThemePart } = await import('./elementor/deploy.mjs');
  await assert.rejects(
    () => deployThemePart('not-an-id', [], 'archive'),
    /postId must be an integer/,
    "deployThemePart refuses the 'archive' document type, so the category archive template cannot be "
    + 'deployed at all',
  );
});

test('the category archive has an empty state', async () => {
  const { categoryArchive } = await import('./elementor/theme-parts/category-archive.mjs');
  const markup = JSON.stringify(categoryArchive());
  assert.match(markup, /nothing_found_message_text/,
    'the archive grid has no empty state, so an emptied category renders a heading above a blank band');
});

test('the live education archive credits /quality-education/', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl({
    name: 'education category archive',
    envVar: 'TOPIC_ARCHIVE_URL',
    exampleUrl: 'https://empv2.wpenginepowered.com/category/education/',
  }, t);
  if (!url) return;

  const html = await fetchConverted(url);
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? '';
  assert.ok(canonical, 'the education archive emits no canonical at all');
  assert.match(canonical, /\/quality-education\//,
    `the education archive still credits itself (${canonical.slice(0, 120)}), so it competes with the `
    + 'converted page rather than consolidating into it');
});

/* The page has to say what was searched for and it has to have an empty
   state. Beaver's page has the first and not the second, and "nothing
   matched" is a routine outcome rather than an edge case: it is the reason
   search.php's own fallback calls get_search_form() again. */
test('the search results page echoes the query, offers a form, and has an empty state', () => {
  const markup = JSON.stringify(searchArchivePart());
  assert.match(markup, /name=\\"s\\"/,
    'the results page carries no search input, so a visitor cannot refine in place');
  assert.match(markup, /data-swplive=\\"false\\"/,
    'the results page search input does not opt out of SearchWP Live Ajax Search');
  assert.match(markup, /name=\\"archive-title\\"/,
    'the head band does not bind archive-title, so the page never echoes what was searched for');
  assert.match(markup, /No results found\. Try different search terms/,
    'the results grid does not carry the search-specific empty-state message, the thing Beaver never had');
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
     do not themselves fail. deployThemePart() now sends a `wp post get
     ... --field=post_type` script of its own, ahead of deployElements()'s
     script, to verify the target before writing to it (see deploy.mjs); this
     fake must answer that one with 'elementor_library' rather than the
     generic "Success", or every existing deployThemePart() test below would
     start failing that guard on its own synthetic post ids. Any other
     command still gets "Success", unchanged. capturePath is overwritten on
     each call, so a test reading it after deployThemePart() resolves still
     sees only the LAST script sent (deployElements()'s), which is what the
     existing per-field assertions below check. */
  fs.writeFileSync(sshPath, [
    '#!/usr/bin/env node',
    'const fs = require("fs");',
    `const chunks = [];`,
    'process.stdin.on("data", c => chunks.push(c));',
    'process.stdin.on("end", () => {',
    '  const script = Buffer.concat(chunks).toString("utf8");',
    `  fs.writeFileSync(${JSON.stringify(capturePath)}, script);`,
    '  if (script.includes("--field=post_type")) {',
    '    process.stdout.write("elementor_library\\n");',
    '  } else {',
    '    process.stdout.write("Success\\n");',
    '  }',
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
    /* remapLinks(), not `sections`, because deployElements() rewrites internal
       links on the way out and podcast-a's hero carries two of them: the
       payload on the wire is the remapped tree, and comparing against the
       authored one would fail on a difference this test is not about. */
    const json = JSON.stringify(remapLinks(sections));

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

/* The temp files the two deploy paths write are removed by an `rm -f` line
   partway down their own script, which a `set -e` abort never reaches. On the
   happy path that is invisible; on the failure path every aborted run leaves a
   file behind on the install's /tmp forever, and nothing ever reports it. These
   three tests run the real script through real bash (the same withExecutingSsh
   fake the pair above uses) and assert on the filesystem afterwards, because
   that is the only place the behaviour is observable: a structural assertion
   that the script "contains a trap line" would pass over a trap that fires on
   the wrong signal, or names the wrong file, or is written after the file it
   guards is created.

   The scripts hard-code /tmp, so these read /tmp directly rather than
   os.tmpdir(), which on macOS is a per-user directory the script never touches.
   Each test uses its own post id so a leak from one cannot be read as a pass
   in another.

   clearTmpLeaks() runs before each of them AND in each finally, rather than the
   before-state merely being asserted. Asserting it was the first shape written
   here and it is the wrong one: the very first (correctly failing) run leaves
   files behind for its own post id, after which the before-assertion fails on
   every subsequent run and the test can never go green again without someone
   emptying /tmp by hand. Clearing keeps the test hermetic and repeatable; the
   assertion immediately after keeps it from being vacuous, since a clear that
   silently matched nothing would still have to produce an empty directory for
   the after-check to mean anything. */
const tmpLeaks = (glob) => fs.readdirSync('/tmp').filter(f => f.startsWith(glob));
const clearTmpLeaks = (glob) => tmpLeaks(glob).forEach(f => fs.rmSync(path.join('/tmp', f), { force: true }));

test('deployPage leaves no temp file on the install when the deploy fails partway through', async () => {
  const postId = 909091;
  const glob = `elementor-data-${postId}-`;
  const { tmpDir } = withExecutingSsh('deploy-exec-leak-', '_elementor_data');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    clearTmpLeaks(glob);
    assert.deepEqual(tmpLeaks(glob), [], 'the temp directory was not clean before the run, so the check below proves nothing');
    await assert.rejects(() => deployPage(postId, [podcastHero()]));
    assert.deepEqual(tmpLeaks(glob), [],
      'the JSON temp file survived the aborted deploy; the script\'s own rm -f line is never reached on the set -e path');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearTmpLeaks(glob);
  }
});

test('setConditions leaves no temp file on the install when the postmeta write fails', async () => {
  /* Fails at the first wp-cli line, so the JSON file exists and the PHP file
     has not been written yet. */
  const postId = 909092;
  const glob = `elementor-conditions-${postId}-`;
  const { tmpDir } = withExecutingSsh('conditions-leak-meta-', '_elementor_conditions');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    clearTmpLeaks(glob);
    assert.deepEqual(tmpLeaks(glob), [], 'the temp directory was not clean before the run, so the check below proves nothing');
    await assert.rejects(() => setConditions(postId, ['include/general']));
    assert.deepEqual(tmpLeaks(glob), [], 'the conditions JSON temp file survived the aborted write');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearTmpLeaks(glob);
  }
});

test('setConditions leaves no temp file on the install when the cache regeneration fails', async () => {
  /* Fails at wp eval-file, the later of the two failure points: by then the
     JSON file has already been removed by the script's own rm -f and the PHP
     file is the one left behind. This is the exact path Task 3 hit for real. */
  const postId = 909093;
  const glob = `elementor-conditions-cache-regen-${postId}-`;
  const { tmpDir } = withExecutingSsh('conditions-leak-regen-', 'eval-file');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    clearTmpLeaks(glob);
    assert.deepEqual(tmpLeaks(glob), [], 'the temp directory was not clean before the run, so the check below proves nothing');
    await assert.rejects(() => setConditions(postId, ['include/general']));
    assert.deepEqual(tmpLeaks(glob), [], 'the PHP regeneration script survived the aborted run');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
    clearTmpLeaks(glob);
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

/* --- theme parts -------------------------------------------------------- */

test('deployThemePart writes the header template type, not wp-page', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-header-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await deployThemePart(4242, [container({ cssClass: 'em-header' })], 'header');
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 4242 _elementor_template_type header/);
    assert.doesNotMatch(script, /wp post meta update 4242 _elementor_template_type wp-page/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deployThemePart writes the footer template type', async () => {
  const { tmpDir, capturePath } = withCapturingSsh('deploy-footer-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await deployThemePart(4243, [container({ cssClass: 'em-footer' })], 'footer');
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 4243 _elementor_template_type footer/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('deployThemePart refuses a location it does not know', async () => {
  /* Renamed on 2026-08-20: it said "not header or footer", and the list grew a
     third entry ('single-post', for the person bio template) that day. The name
     is deliberately not a list any more, because THEME_PART_LOCATIONS is the
     list and a test title that restates it goes stale every time a real Theme
     Builder document type is added.

     'wp-page' and 'loop-item' are real template types with their own deploy
     functions. Accepting one here would write a page's type onto a library
     post that Elementor then never renders in a location, with no error.

     'single' IS NOT 'single-post', and that near-miss is worth keeping rather
     than replacing with an obviously-invented string: Elementor Pro has a
     Single_Base class and documents.php registers the concrete type as
     'single-post', so 'single' is exactly the plausible-but-wrong value a
     reader of the plugin might pass. It must still be refused. */
  await assert.rejects(() => deployThemePart(4242, [], 'single'), /location/);
  await assert.rejects(() => deployThemePart(4242, [], 'wp-page'), /location/);
});

/* The search results template is the build's first theme part where the
   Elementor document type and the Theme Builder render location are not
   the same string (see the comment above THEME_PART_LOCATIONS for why
   header and footer never exposed this). deployThemePart()'s `location`
   parameter reaches deployElements() as the value written to
   _elementor_template_type, so what belongs in THEME_PART_LOCATIONS is
   Search_Results' document type, 'search-results', not the 'archive'
   render location it inherits from Archive. wp/empowerms-child/search.php
   still asks for the 'archive' location; that string is unaffected by this
   array. search-archive.mjs writes the document type separately. */
test('deployThemePart accepts the search-results document type and still refuses an invented one', async () => {
  assert.ok(THEME_PART_LOCATIONS.includes('search-results'),
    'THEME_PART_LOCATIONS does not include search-results, so the search results part can never deploy');
  await assert.rejects(
    () => deployThemePart(1, [], 'sidebar'),
    /location must be one of/,
    'deployThemePart no longer refuses a location that is not a real document type');
  /* 'search' is not an obviously-bogus value like 'sidebar': it is a real
     Elementor string for this exact document, one method away from the
     correct one. Elementor Pro's Search_Results document returns
     'search-results' from get_type() and 'search' from get_sub_type(), so
     'search' is what a future author gets by reading the wrong method off
     the same object. An earlier draft of this plan specified 'archive'
     here, which is the render LOCATION rather than the document type, and
     it shipped a fix round; a test that only rejects an obviously-bogus
     string would not have caught that class of error either. */
  await assert.rejects(
    () => deployThemePart(1, [], 'search'),
    /location must be one of/,
    'deployThemePart accepts get_sub_type() (\'search\') where only get_type() (\'search-results\') is a real document type');
});

/* I4 from the final review: deployElements() validates only postId's shape,
   never what kind of post it names, and overwrites _elementor_data and
   _elementor_template_type wholesale. A wrong id passed to deployThemePart()
   used to clobber whatever post that id names, page or otherwise, before
   anything downstream (setConditions() included) had a chance to object.
   This exercises the guard added to close that: a fake ssh that answers the
   post_type check with 'wp-page', a real type but the wrong one for a theme
   part, and appends (never overwrites) every script it receives, so the
   assertion below can prove no second script naming _elementor_data was
   ever sent once the first one's answer disqualified the post. */
test('deployThemePart refuses to write when the target post is not an elementor_library post, before any data write', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-wrong-type-'));
  const sshPath = path.join(tmpDir, 'ssh');
  const capturePath = path.join(tmpDir, 'captured.sh');
  fs.writeFileSync(sshPath, [
    '#!/usr/bin/env node',
    'const fs = require("fs");',
    'const chunks = [];',
    'process.stdin.on("data", c => chunks.push(c));',
    'process.stdin.on("end", () => {',
    '  const script = Buffer.concat(chunks).toString("utf8");',
    `  fs.appendFileSync(${JSON.stringify(capturePath)}, script + "\\n---\\n");`,
    '  if (script.includes("--field=post_type")) {',
    '    process.stdout.write("wp-page\\n");',
    '  } else {',
    '    process.stdout.write("Success\\n");',
    '  }',
    '});',
  ].join('\n'));
  fs.chmodSync(sshPath, 0o755);
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await assert.rejects(
      () => deployThemePart(29, [container({ cssClass: 'em-header' })], 'header'),
      err => {
        assert.match(err.message, /\b29\b/, 'error does not name the offending post id');
        assert.match(err.message, /elementor_library/, 'error does not say the post is not an elementor_library post');
        return true;
      },
    );
    const captured = fs.existsSync(capturePath) ? fs.readFileSync(capturePath, 'utf8') : '';
    assert.doesNotMatch(captured, /_elementor_data/,
      'deployThemePart sent an _elementor_data write even though the post-type guard should have refused first, before deployElements() ran at all');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('setConditions writes the conditions meta as a JSON array, then regenerates the conditions cache', async () => {
  /* _elementor_conditions is written on the document, but it is NOT what
     Elementor Pro reads at render time. Task 3 proved this on the real
     install: both posts had a correctly-shaped _elementor_conditions array
     and UiCore's own chrome still rendered, because
     Conditions_Manager::get_location_templates()
     (conditions-manager.php:328, called from :518) resolves a location's
     documents from a CACHED option, elementor_pro_theme_builder_conditions
     (conditions-cache.php:15), read via $this->cache->get_by_location()
     (conditions-manager.php:331), not by scanning postmeta. A part whose
     postmeta is right and whose cache is stale looks perfectly configured
     and renders nowhere, with nothing reporting it. So this call must also
     regenerate that cache, the same way Conditions_Manager::save_conditions()
     does internally (conditions-manager.php:323) when the editor saves a
     document's conditions. (An earlier version of this comment cited
     conditions-manager.php:53, get_meta, as the read path Elementor uses at
     render time; that is only the meta read the editor uses when loading a
     document to edit, and citing it here is what let the plan go two tasks
     deep before the gap was caught.) */
  const { tmpDir, capturePath } = withCapturingSsh('conditions-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    const conditions = ['include/general'];
    await setConditions(4242, conditions);
    const script = fs.readFileSync(capturePath, 'utf8');
    const json = JSON.stringify(conditions);

    /* The condition strings are caller-supplied and must never reach the
       remote shell unquoted, so they are written through a heredoc and temp
       file, then passed via STDIN. A script that passes the JSON inline as
       an argument to `wp post meta update` would still technically contain
       the JSON, so the real assertion is structural: the JSON appears on its
       own, between a heredoc opener and closer, and the `wp post meta update`
       call carries no inline value argument (WP-CLI reads it from STDIN when
       the value argument is omitted). */
    assert.ok(script.includes(json), 'captured script does not contain the JSON conditions');
    assert.match(script, /cat\s*>\s*\S+\s*<<['"]?\w+['"]?/, 'conditions were not written via a heredoc to a temp file');
    assert.match(script, /wp post meta update 4242 _elementor_conditions\s*--format=json\s*<\s*\S+/,
      'wp post meta update for _elementor_conditions does not read from the temp file (no inline value argument)');
    assert.doesNotMatch(script, new RegExp(`wp post meta update 4242 _elementor_conditions ${json.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
      'the JSON conditions were passed inline as a shell argument');

    /* The cache regeneration must run through wp eval-file against a
       heredoc'd temp file, not `wp eval` with the PHP inline: inline PHP as
       a CLI argument goes through two levels of shell quoting, the same
       problem the JSON heredoc above already exists to avoid. */
    const evalFileMatch = script.match(/wp eval-file\s+(\S+)/);
    assert.ok(evalFileMatch, 'conditions cache was not regenerated through wp eval-file');
    /* wp eval-file must target the PHP temp file, not the JSON one: they are
       two different heredocs writing two different temp files, and a script
       that accidentally pointed wp eval-file at the .json file would still
       satisfy a bare /wp eval-file\s+\S+/ match. */
    assert.match(evalFileMatch[1], /\.php$/, 'wp eval-file does not target a .php file');
    /* The fully-qualified class name, pinned literally rather than matched
       loosely: a namespace typo here is a PHP parse error at eval-file time,
       which is a real, silent failure mode a looser
       /Module::instance\(\)/-style match would not catch. */
    assert.ok(script.includes('\\ElementorPro\\Modules\\ThemeBuilder\\Module::instance()->get_conditions_manager()'),
      'the PHP does not reach the conditions manager through the fully-qualified Theme Builder module instance');
    assert.match(script, /get_cache\(\)->regenerate\(\)/,
      'the PHP does not call Conditions_Cache::regenerate()');
    assert.ok(!/wp eval ['"]/.test(script), 'the PHP was passed inline to `wp eval` instead of via `wp eval-file`');

    /* Ordering matters, not just presence. A setConditions() that
       regenerated the cache BEFORE writing the postmeta would satisfy every
       assertion above while reproducing the exact stale-cache bug this
       function exists to prevent: the regeneration would snapshot the
       pre-write state, and the freshly-written postmeta would still be
       invisible to Elementor at render time. So the postmeta write's index
       in the script must come before wp eval-file's. */
    const metaWriteIdx = script.indexOf('wp post meta update 4242 _elementor_conditions');
    const evalFileIdx = script.indexOf('wp eval-file');
    assert.ok(metaWriteIdx !== -1 && evalFileIdx !== -1 && metaWriteIdx < evalFileIdx,
      'the conditions cache is regenerated before (or without) the postmeta write; regenerating from the ' +
      'pre-write state reproduces the exact stale-cache bug this call exists to prevent');

    /* The verification half: regenerate() returning without throwing is not
       evidence the post ended up registered anywhere (Important 1 from
       Task 3's fix-round review). The PHP must read the option back and
       check this specific post id, or a correct-looking, inert write would
       resolve silently exactly as the original bug did. */
    assert.ok(script.includes('$post_id = 4242;'), 'the PHP does not interpolate the caller\'s postId');
    assert.match(script, /elementor_pro_theme_builder_conditions/,
      'the PHP does not read the conditions cache option back to verify the post was actually registered');
    assert.match(script, /exit\(\s*1\s*\)/,
      'the PHP has no failure exit when the post is not found under any location after regenerating');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

/* withCapturingSsh() above only inspects the script setConditions() sends,
   never runs it, so (per the same reasoning deployPage's equivalent pair of
   tests already documents) it cannot see whether `set -e` actually stops the
   deploy when `wp eval-file` fails. That used to be because the script's last
   line was `rm -f ${phpFile}`, which succeeds almost unconditionally; the
   cleanup now runs from a `trap ... EXIT` instead, which does not change the
   argument, because a trap's own exit status does not replace the script's
   either. Either way a `setConditions()` that dropped `set -e` (or that never checked
   eval-file's exit code some other way) would still resolve. Mirrors
   deployPage's real-execution pair exactly, using withExecutingSsh() rather
   than a second capture-only fake. */
test('setConditions rejects when the conditions cache regeneration fails', async () => {
  const { tmpDir } = withExecutingSsh('conditions-exec-fail-', 'eval-file');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await assert.rejects(
      () => setConditions(4242, ['include/general']),
      err => {
        /* Not just "it rejected": the failure must be the simulated
           eval-file failure surfacing, not some unrelated error. */
        assert.match(String(err.stderr || err.message), /simulated failure on:.*eval-file/);
        return true;
      },
    );
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('setConditions still resolves when every wp-cli step genuinely succeeds', async () => {
  /* Companion to the failure test above: proves set -e did not introduce a
     false failure on the happy path. */
  const { tmpDir } = withExecutingSsh('conditions-exec-ok-', '__never_matches__');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    const out = await setConditions(4242, ['include/general']);
    assert.match(out, /Success.*_elementor_conditions/);
    assert.match(out, /Success.*eval-file/);
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

/* --- disableThemePageTitle() -------------------------------------------- */

test('disableThemePageTitle writes the page_options JSON UiCore actually reads', async () => {
  /* Found by measuring the first converted homepage section on the live
     install, and it turned out to be true of podcast-a as well, since Phase 1:
     UiCore prints its own <h1 class="uicore-title"> page-title banner above the
     converted content, so every converted page shipped TWO h1 elements and a
     title bar that is not in the design. Nothing caught it, because the
     fidelity checks look for the build's own copy and computed styles, and both
     were present and correct; the extra chrome sat above them.

     The gate is UiCore's own, read from the plugin rather than guessed:
     should_render_page_title() (includes/templates/page-title.php:605) asks
     Helper::po('pagetitle', 'pagetitle', 'true', $post_id), and po()
     (includes/extra/helper.php:20) reads the post's `page_options` meta as
     JSON, mapping the value 'disable' to 'false'. Hence this exact key, this
     exact value, and JSON rather than a serialized array.

     Automated rather than left as a step in the recipe because it has to happen
     for all fourteen pages of this phase, and a manual step repeated fourteen
     times is a step that gets missed once and produces a defect nobody looks
     for again. */
  const { tmpDir, capturePath } = withCapturingSsh('page-options-');
  const originalPath = process.env.PATH;
  process.env.PATH = tmpDir + ':' + originalPath;
  try {
    await disableThemePageTitle(4242);
    const script = fs.readFileSync(capturePath, 'utf8');
    assert.match(script, /wp post meta update 4242 page_options/,
      'does not write the page_options meta UiCore reads');
    assert.match(script, /"pagetitle"\s*:\s*"disable"/,
      'does not set pagetitle to the literal value po() maps to false');
    assert.ok(!/--format=json/.test(script),
      'writes page_options with --format=json, which stores a PHP-serialized array; ' +
      'Helper::isJson() then fails and the setting is ignored while looking correct');
  } finally {
    process.env.PATH = originalPath;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('disableThemePageTitle refuses a non-integer post id', async () => {
  await assert.rejects(() => disableThemePageTitle('20588'), /must be an integer/);
});

test('setConditions refuses an empty condition list', async () => {
  /* An empty array assigns the part to no location at all, which renders
     nothing and reports success. */
  await assert.rejects(() => setConditions(4242, []), /at least one condition/);
});

/* --- elementor/theme-parts/extract.mjs ----------------------------------- */

test('extractBlock returns a whole nested element, not a truncated one', () => {
  const nav = extractBlock(fs.readFileSync('src/_shared/header-2.html', 'utf8'), 'nav', 'em-header__nav');
  assert.ok(nav.startsWith('<nav'));
  assert.ok(nav.endsWith('</nav>'));
  assert.ok(nav.includes('drop-join'), 'the last dropdown panel is missing, so the block was truncated');
  const opens = (nav.match(/<div\b/g) || []).length;
  const closes = (nav.match(/<\/div>/g) || []).length;
  assert.equal(opens, closes, 'the extracted nav has unbalanced divs');
});

test('extractBlock fails loudly rather than returning a fragment', () => {
  assert.throws(() => extractBlock('<div class="other"></div>', 'nav', 'em-header__nav'), /no <nav>/);
  assert.throws(() => extractBlock('<nav class="em-header__nav">', 'nav', 'em-header__nav'), /never closed/);
});

test('extractBlock stops at the social block\'s own close, not the partial\'s last </a>', () => {
  /* The defect this module replaces: the brief's original socialMarkup()
     sliced from <div class="em-footer__social"> to the </div> following the
     partial's LAST </a>, which is the Privacy Policy link twenty lines past
     the social block, silently swallowing the Follow and More columns into
     one HTML widget. extractBlock() must stop at the social div's own
     matching close instead. */
  const partial = fs.readFileSync('src/_shared/footer.html', 'utf8');
  const social = extractBlock(partial, 'div', 'em-footer__social');
  assert.ok(social.startsWith('<div class="em-footer__social">'));
  assert.ok(social.endsWith('</div>'));
  assert.doesNotMatch(social, /Follow/, 'the extracted social block swallowed the Follow column');
  assert.doesNotMatch(social, /More/, 'the extracted social block swallowed the More column');
  assert.doesNotMatch(social, /Privacy Policy/, 'the extracted social block swallowed the More column\'s Privacy Policy link');
});

/* --- elementor/theme-parts/footer.mjs ------------------------------------ */

test('the footer part carries the build own classes and copy', () => {
  const [root] = footerPart();
  const json = JSON.stringify(root);
  assert.equal(root.settings.css_classes, 'em-footer');
  assert.equal(root.settings.html_tag, 'footer');
  assert.equal(root.settings.content_width, 'full');
  assert.match(json, /Empower Mississippi works to Educate, Engage, and Elect/);
  assert.match(json, /741 Avignon Dr\., Suite C/);
  assert.match(json, /Privacy Policy/);
});

test('the footer part keeps the reveal attributes the motion layer needs', () => {
  /* css/motion.css hides every [data-reveal] element and js/reveal.js is
     what reveals them. A footer that loses these attributes is not broken;
     a footer that keeps the stylesheet and loses the script ships blank. */
  const json = JSON.stringify(footerPart());
  assert.match(json, /data-reveal-group/);
  const fades = json.match(/data-reveal\|fade/g) || [];
  assert.equal(fades.length, 3, 'all three footer columns carry data-reveal="fade"');
});

test('the footer social icons are one markup block, not four widgets', () => {
  /* The four social links are inline SVG. Elementor has no widget that
     emits them, and an icon widget would substitute its own library. */
  const json = JSON.stringify(footerPart());
  assert.match(json, /"widgetType":"html"/);
  for (const network of ['facebook.com/empowerms', 'instagram.com/empowerms', 'x.com/empowerms', 'youtube.com/@empowerms']) {
    assert.ok(json.includes(network), `footer markup is missing ${network}`);
  }
});

test('every string in the footer part appears in the static footer partial', () => {
  /* The static build is the reference the conversion is measured against.
     A string here that is not there is invented copy. */
  const source = fs.readFileSync('src/_shared/footer.html', 'utf8');
  for (const copy of [
    'Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.',
    'Follow',
    'More',
    'Contact Us',
    '741 Avignon Dr., Suite C',
  ]) {
    assert.ok(source.includes(copy), `"${copy}" is not in src/_shared/footer.html`);
    assert.ok(JSON.stringify(footerPart()).includes(copy), `"${copy}" is not in the footer part`);
  }
});

/* --- elementor/theme-parts/header.mjs ------------------------------------ */

test('the header part keeps the no-JavaScript contract', () => {
  /* Every panel ships aria-expanded="true" and js/dropdown.js closes them
     on load. A converted header that ships them closed hides nav content
     behind a trigger with no script to open it, which is the rule this
     build has already broken once. */
  const json = JSON.stringify(headerPart());
  const expanded = json.match(/aria-expanded=\\"true\\"/g) || [];
  assert.ok(expanded.length >= 10, `expected every trigger to ship expanded, found ${expanded.length}`);
  assert.doesNotMatch(json, /aria-expanded=\\"false\\"/);
});

test('every aria-controls in the header resolves to an id in the same part', () => {
  const json = JSON.stringify(headerPart());
  const controls = [...json.matchAll(/aria-controls=\\"([^"\\\\]+)\\"/g)].map(m => m[1]);
  assert.ok(controls.length >= 11, `expected the desktop and mobile triggers, found ${controls.length}`);
  for (const id of controls) {
    assert.ok(json.includes(`id=\\"${id}\\"`), `aria-controls="${id}" points at no id in the header part`);
  }
});

test('the Our Solutions item stays a link plus a disclosure button', () => {
  /* Empower asked for this on 2026-08-05: the words navigate to the
     Solutions landing page, the caret opens the panel. Collapsing it back
     into one button silently drops a requirement. */
  const json = JSON.stringify(headerPart());
  assert.match(json, /em-header__item--split/);
  assert.match(json, /em-header__disclosure/);
  assert.match(json, /href=\\"\/solutions\\"/);

  /* The three assertions above are about the tree as AUTHORED, which since the
     link remap of 2026-08-20 is no longer the tree that ships: /solutions 301s
     to Empower's existing live page rather than to the converted one. Empower's
     requirement is that the WORDS navigate to the Solutions landing page, so it
     is only really tested on the deployed shape. Asserted here rather than in a
     separate test because it is the same requirement, and splitting it would
     let one half pass while the half a visitor experiences fails. */
  const shipped = JSON.stringify(remapLinks(headerPart()));
  /* The expected path is DERIVED from the register rather than written here.
     It was a literal `/solutions-b/` for about an hour, and the slug rename of
     2026-08-20 broke it immediately: a test that hard-codes a slug fails the
     next time anyone renames a page, which is precisely the drift the register
     exists to absorb. */
  const solutionsPath = convertedPagePaths().get('solutions-b');
  assert.ok(solutionsPath, 'solutions-b has no exampleUrl in the register');
  assert.ok(shipped.includes(`href=\\"${solutionsPath}\\"`),
    `the Our Solutions link no longer resolves to the converted Solutions page (${solutionsPath}) after the remap`);
});

test('the header carries the mobile nav and its toggle', () => {
  const json = JSON.stringify(headerPart());
  assert.match(json, /em-header__toggle/);
  assert.match(json, /aria-controls=\\"mobile-nav\\"/);
  assert.match(json, /id=\\"mobile-nav\\"/);
});

test('the header takes exactly four html widgets, and they are the named four', () => {
  /* The spec sanctions four exceptions: the nav, the actions, the search
     panel (added 2026-08-20, Task 2 of the header-search plan) and the
     mobile nav. A fifth html widget here is scope drift and should fail
     loudly rather than be noticed later by eye. */
  const json = JSON.stringify(headerPart());
  const htmlWidgets = json.match(/"widgetType":"html"/g) || [];
  assert.equal(htmlWidgets.length, 4);
  for (const marker of ['em-header__nav', 'em-header__actions', 'em-search', 'em-mobilenav']) {
    assert.ok(json.includes(marker), `the header part is missing ${marker}`);
  }
});

test('the header markup matches the static partial, string for string', () => {
  /* Three of the header's four html widgets (nav, actions, mobile nav) exist
     to preserve markup exactly against the partial below. The fourth, the
     search panel added 2026-08-20, has no partial counterpart and is not
     checked here. Anything the three DO carry that is not in the partial is
     drift. */
  const partial = fs.readFileSync('src/_shared/header-2.html', 'utf8');
  for (const copy of [
    'A non-profit working to expand opportunity in Mississippi',
    'Email: info@empowerms.org',
    'Quality Education',
    'Connecting Mississippians to careers worth staying for.',
    'Skip to content',
  ]) {
    assert.ok(partial.includes(copy), `"${copy}" is not in src/_shared/header-2.html`);
    assert.ok(JSON.stringify(headerPart()).includes(copy), `"${copy}" is not in the header part`);
  }
});

/* The overlay exists ONLY in the Elementor build. src/_shared/header-2.html
   still carries a decorative button with no form, because js/ and src/ are
   the protected static build (functions.php:486). That divergence is the
   whole reason this test is structural rather than a comparison against the
   static partial: there is nothing on the static side to compare to, and a
   fidelity-shaped test here would either fail forever or quietly stop
   checking anything. */
test('the header carries a search panel with a native GET form', () => {
  const widgets = [];
  (function walk(nodes) {
    for (const n of nodes) {
      if (n.elType === 'widget') widgets.push(n);
      if (n.elements?.length) walk(n.elements);
    }
  })(headerPart());

  const panel = widgets.find(w => w.widgetType === 'html' && /class="em-search"/.test(w.settings.html ?? ''));
  assert.ok(panel, 'no html widget in the header carries .em-search');

  const markup = panel.settings.html;
  assert.match(markup, /<form[^>]+method="get"/, 'the search panel form is not a GET form');
  assert.match(markup, /<form[^>]+action="\/"/, 'the search panel form does not post to the site root');
  assert.match(markup, /<form[^>]+role="search"/, 'the search panel form has no role="search"');
  assert.match(markup, /name="s"/, 'the search input is not named s, so WordPress will never see the query');
  assert.match(markup, /id="site-search"/, 'the panel has no id for aria-controls to point at');
  assert.match(markup, /<label[^>]+for="site-search-input"/, 'the search input has no label');
  assert.match(markup, /type="submit"/, 'the form has no submit control, so it cannot be used without JavaScript');
});

/* SearchWP Live Ajax Search is active and enabled on the install
   (searchwp_live_search_settings: enable-live-search true). Left alone it
   binds itself to any input[name="s"] and injects its own results pane, its
   own markup and its own stylesheet into our header. data-swplive="false"
   is the plugin's own opt-out, read from its shipped JavaScript
   (assets/javascript/dist/script.js) rather than from its documentation.
   This assertion is what stops the opt-out being lost in a later edit
   without anything reporting it: the failure mode is a third party's
   dropdown appearing in the most-seen component on the site. */
/* Paolo asked for a visible way to dismiss the panel on 2026-08-20. The
   trigger already toggled, and Escape and an outside click already closed it,
   but none of those is discoverable to someone looking at an open panel.

   type="button" is the load-bearing attribute and the reason this test exists:
   a bare <button> inside a <form> defaults to type="submit", so a close control
   that lost this attribute would run an empty search instead of closing the
   panel, and would look identical in the markup. */
test('the search panel carries a close control that cannot submit the form', () => {
  const widgets = [];
  (function walk(nodes) {
    for (const n of nodes) {
      if (n.elType === 'widget') widgets.push(n);
      if (n.elements?.length) walk(n.elements);
    }
  })(headerPart());
  const panel = widgets.find(w => w.widgetType === 'html' && /class="em-search"/.test(w.settings.html ?? ''));
  assert.ok(panel, 'no html widget in the header carries .em-search');

  const closer = (panel.settings.html.match(/<button class="em-search__close"[^>]*>/) || [])[0];
  assert.ok(closer, 'the search panel has no .em-search__close control');
  assert.match(closer, /type="button"/,
    'the close control is not type="button", so it will submit the form and run an empty search instead of closing the panel');
  assert.match(closer, /aria-label="[^"]+"/,
    'the close control is an icon with no accessible name');
});

test('the header search input opts out of SearchWP Live Ajax Search', () => {
  const markup = JSON.stringify(headerPart());
  assert.match(markup, /data-swplive=\\"false\\"/,
    'the search input does not carry data-swplive="false"');
});

/* The button was <button type="button"> with an aria-label and nothing else
   from Phase 2A until 2026-08-20. A control that toggles a panel needs to
   say so, and the two attributes have to agree with the panel's real id or
   the relationship exists only in the markup's intention.

   aria-expanded="true", not "false": every other trigger in the header
   ships expanded, with its panel in normal flow, and JS is what closes it
   on load (see header.mjs's own comment on withSearchControl for the
   header-2.html line numbers and js/nav.js:12-13). This is also what keeps
   the search button inside 'the header part keeps the no-JavaScript
   contract' below, rather than being the one trigger in the header that
   is exempt from it. */
test('the header search button is a real disclosure control', () => {
  const markup = JSON.stringify(headerPart());
  assert.match(markup, /class=\\"em-header__search\\"[^>]*aria-expanded=\\"true\\"/,
    'the search button has no aria-expanded, so it is still decoration');
  assert.match(markup, /aria-controls=\\"site-search\\"/,
    'the search button does not point at the panel it controls');
});

test('the converted page carries the chrome sections in order', () => {
  const parts = JSON.stringify([headerPart(), footerPart()]);
  assert.ok(parts.includes('em-header'));
  assert.ok(parts.includes('em-footer'));
});

/* --- fidelity-browser.mjs / the podcast guest filter --------------------- */

/* settleReveal's own wait condition was unsatisfiable on every page and the
   defect degraded silently to a passing capture: the timeout fired, its
   warning logged, and the screenshot was taken anyway, indistinguishable
   from a correctly-settled one unless someone was watching stderr. That
   signature, wrong but green, is exactly what a behavioural test cannot
   catch here without SPIKE_URL and a stderr scrape, so a source-level
   assertion is the right instrument for once: it reads settleReveal's own
   text rather than driving a browser through it.
   js/reveal.js:11 sets data-reveal="on" on <html> itself, the gate for the
   whole page. js/reveal.js:16 then builds the collection that ever
   receives .is-revealed by querying from document.body, deliberately
   excluding that root element. A settleReveal wait that queries from
   document instead of document.body sweeps <html> into the set it waits
   on; since <html> never gains .is-revealed, every() can never return
   true, and the wait times out unconditionally on every page that runs
   js/reveal.js. */
test('settleReveal queries the reveal wait from document.body, not document', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'fidelity-browser.mjs'), 'utf8');
  /* Isolated to the waitForFunction call specifically, not the whole
     settleReveal body: the maxTransitionMs computation further down also
     queries [data-reveal] unscoped from document, but that query only
     feeds a max() and including <html> there is harmless (it contributes
     0ms), unlike the wait's every(), which an included <html> makes
     unsatisfiable. Only the wait is this test's concern. */
  const waitMatch = src.match(/await page\.waitForFunction\(\(\) =>[\s\S]*?\{ timeout: 10000 \}\)/);
  assert.ok(waitMatch, 'settleReveal\'s page.waitForFunction reveal wait not found in fidelity-browser.mjs');
  const wait = waitMatch[0];
  assert.match(wait, /document\.body\.querySelectorAll\('\[data-reveal\]'\)/,
    'settleReveal does not query [data-reveal] scoped to document.body; it will sweep <html> into the set and its wait can never be satisfied');
  assert.doesNotMatch(wait, /(?<!\.body)\bdocument\.querySelectorAll\('\[data-reveal\]'\)/,
    'settleReveal queries [data-reveal] from document unscoped; <html> carries data-reveal="on" (js/reveal.js:11) but never gains .is-revealed, so this wait can never resolve');
});

/* Eight tests below need a live URL that nothing in this repository can
   supply on its own: five drive a real browser through Playwright, and
   three (checkRobots, and the two fetchConverted() reads of the live page)
   do not, but still need the deployed install to check against. Without
   this guard, a missing SPIKE_URL surfaces on the browser tests as
   Playwright's own "page.goto: url: expected string, got undefined", which
   reads like a broken test rather than a missing environment variable, and
   on the non-browser tests as a bare fetch or SSH failure. Failing loudly is
   still the right call (README.md says the same); this just names the thing
   that is missing instead of leaving that to the underlying error. */
const requireSpikeUrl = () => process.env.SPIKE_URL
  ?? assert.fail('SPIKE_URL is not set. These eight tests need the deployed page (five drive a real browser, three fetch or check it directly): SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ node --test test-elementor.mjs');

/* Fix round 1 review finding: this test used to sit outside the
   requireSpikeUrl()-guarded group and made an unguarded live fetch to the
   install on every run, on any machine. Before this task, a checkout with
   no route to empv2.wpenginepowered.com only ever hit that wall inside the
   seven tests below, each of which fails fast with a message naming
   SPIKE_URL, never with a bare DNS error or a hang. checkRobots() does not
   drive a browser, unlike the seven tests around it, but it is gated behind
   the same requireSpikeUrl() on purpose: robots.txt lives on the same
   install SPIKE_URL points at, "no network route to the install" is exactly
   the failure requireSpikeUrl() already turns into a legible message for,
   and a second, narrower guard (its own env var, a hand-rolled timeout and
   error message) would duplicate that machinery to say the same thing.
   checkRobots(baseUrl) wants an origin, not a page path, so the podcast-a
   URL SPIKE_URL is documented to carry is trimmed down with `new URL()`
   rather than assuming callers will pass a bare origin. The test is not
   mocked: proving the crawler-disallow policy actually holds against the
   real robots.txt is the entire point, and a mocked response would prove
   nothing. */
test('the install still disallows crawlers, which is what makes publishing during conversion safe', async () => {
  /* Pages under conversion are published. That is only defensible while
     robots.txt disallows everything. Checked rather than assumed, because
     if it ever changes, the policy silently stops being safe. */
  const robots = await checkRobots(new URL(requireSpikeUrl()).origin);
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Disallow:\s*\//);
});

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

/* --- fidelity-browser.mjs / the content-a type and topic filters --------- */

/* Its own guard rather than requirePageUrl(), because content-a is in
   EXCLUDED_PAGES and therefore has no register entry to read an envVar,
   exampleUrl or staticFile out of. Same shape and same reason as
   requireSpikeUrl() above: a missing variable surfaces as Playwright's own
   "url: expected string, got undefined", which reads like a broken test
   rather than a missing environment variable. */
const requireContentAUrl = () => process.env.CONTENT_A_URL
  ?? assert.fail('CONTENT_A_URL is not set. This test needs the deployed content-a page: CONTENT_A_URL=https://empv2.wpenginepowered.com/content-a/ node --test test-elementor.mjs');

/* THIS TEST IS content-a's GATE, AND IT IS THE ONLY ONE IT HAS.
   The page is in EXCLUDED_PAGES: its four Loop Grids render 205 real posts
   where dist/content-a.html carries 23 authored cards, so neither census() nor
   controlBoxes() can compare the two sides. What CAN silently fail is the
   thing the whole page is for, and it can fail in exactly the way podcast-a's
   filter could: a loop item template that does not emit data-topic, or a band
   container that does not carry data-type, produces a page where every radio
   still moves, every label still turns navy, and nothing at all hides. No
   static parse and no computed-style probe can see that.

   FOUR STATES, chosen to exercise each of the filter's four rules
   (css/content-a.css:330-344) and to end where it started:

     1. everything      both groups on their do-nothing option. The unfiltered
                        page IS the page with no rule applied, which is the
                        design's own claim ("the default state is not a special
                        case, it is the absence of one"), so this is also the
                        baseline every other step is compared against.
     2. story           rule 1: a chosen type hides the other three bands.
     3. story + bills   rule 3 hides three bands INCLUDING this one, and rule 4
                        shows the written empty state. One of exactly three
                        dead-end pairs, and the reason the page has an empty
                        state at all: bill summaries are published as articles,
                        so no community story carries that topic.
     4. everything      back to the start, which is what proves the "All" and
                        "Everything" options really are the absence of a rule
                        rather than a fifth filter of their own.

   Asserted RELATIVELY wherever possible, never against card counts typed into
   this file. The bands are Loop Grids over a live archive: 141 Empower News
   posts today, 27 Community Stories, 33 Press Releases. Empower publishing one
   more post must not turn this test red, so what is asserted is the SHAPE of
   each state (which bands survive, which topics survive, that filtering
   removes cards and that returning restores them) rather than any number the
   archive controls. */
test('the content-a type and topic filters actually filter', { concurrency: 1 }, async () => {
  const { checkRadioFilter } = await import('./fidelity-browser.mjs');
  const [all, education, story, deadEnd, restored] = await checkRadioFilter(requireContentAUrl(), {
    bandSelector: '.cad-band',
    cardSelector: '.cad-card',
    emptySelector: '.cad-empty',
    /* Radio IDS, not selectors: checkRadioFilter clicks each one's LABEL and
       then asserts the input really became checked, because these radios are
       clipped to a pixel behind their labels and carry `pointer-events:none`
       (css/content-a.css:133-134). Its own comment carries the argument. */
    steps: [
      { name: 'everything', check: ['ca-t-all', 'ca-p-all'] },
      { name: 'education', check: ['ca-p-education'] },
      { name: 'story', check: ['ca-p-all', 'ca-t-story'] },
      { name: 'story + bills', check: ['ca-p-bills'] },
      { name: 'everything again', check: ['ca-t-all', 'ca-p-all'] },
    ],
  });

  /* The baseline. Four bands and some cards, or the page did not render its
     loops at all and every assertion below would pass trivially. */
  assert.equal(all.bands, 4, `unfiltered page shows ${all.bands} bands, not the four the design has`);
  assert.deepEqual(all.bandTypes, ['article', 'story', 'research', 'press'],
    `unfiltered band order is ${all.bandTypes.join(', ')}`);
  assert.ok(all.cards > 23, `only ${all.cards} cards rendered; the Loop Grids are not returning the archive`);
  assert.equal(all.emptyShown, 0, 'the empty state is visible with no filter applied');

  /* data-topic is the attribute the whole filter turns on, and it comes from a
     PHP hook rather than from anything a static read of the page tree can
     check. If the hook never fired, or fired once and got cached across the
     loop, every card carries the same value or none. */
  assert.ok(all.cardTopics.length > 1,
    `every visible card carries the same data-topic (${all.cardTopics.join(' / ')}); the loop is emitting one post's value for all of them`);

  /* Rule 2: a chosen topic hides the cards that do not carry it, and leaves
     every band standing. This is the step that catches BOTH ways the page can
     fail, which is why it is here rather than left to the cardinality check
     above: with the filter's CSS gone it shows all 205, and with data-topic
     missing from the loop item it shows 0. Measured both, red first. */
  assert.equal(education.bands, all.bands, 'choosing a topic hid a whole band; only Bill Summaries is supposed to do that');
  assert.ok(education.cards > 0, 'choosing Quality Education hid every card: the loop is not emitting data-topic');
  assert.ok(education.cards < all.cards, 'choosing Quality Education hid nothing: the filter CSS is not reaching the cards');
  for (const t of education.cardTopics) {
    assert.match(t ?? '', /(^|\s)education(\s|$)/,
      `a card without the education topic is still visible under Quality Education (data-topic="${t}")`);
  }

  /* Rule 1: a chosen type hides the other three bands. */
  assert.equal(story.bands, 1, `choosing Community Stories leaves ${story.bands} bands visible`);
  assert.deepEqual(story.bandTypes, ['story'], `choosing Community Stories leaves ${story.bandTypes.join(', ')}`);
  assert.ok(story.cards < all.cards, 'choosing a type hid no cards at all');
  assert.ok(story.cards > 0, 'choosing Community Stories hid everything, including its own band');

  /* Rule 3 and rule 4 together: this pair holds nothing, so every band goes and
     the page says so in words instead of showing a blank grid. */
  assert.equal(deadEnd.cards, 0,
    `the story-and-bills pair still shows ${deadEnd.cards} cards; it is supposed to hold nothing`);
  assert.equal(deadEnd.emptyShown, 1,
    'the story-and-bills dead end shows no empty state: a filter that can return nothing has to say so');

  /* And back. A radio group's "all" option is the absence of a rule, not a
     fifth rule, and this is the assertion that proves it. */
  assert.equal(restored.bands, all.bands, 'returning to Everything did not restore the bands');
  assert.equal(restored.cards, all.cards, 'returning to Everything and All did not restore the cards');
  assert.equal(restored.emptyShown, 0, 'the empty state stayed visible after clearing the filter');
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

/* Fix round 2 for the Task 6 regression. The two source-text tests above
   ("the chrome stylesheet and its script are enqueued unconditionally" and
   "the three theme scripts get type=\"module\" from a script_loader_tag
   filter, not an inert data key") both passed while the site shipped five
   permanently open dropdown panels on every page: they can see that a
   wp_script_add_data(..., 'type', 'module') call or a script_loader_tag
   filter exists in the PHP source, but not whether it has any runtime
   effect. The actual failure is a browser-only fact: js/reveal.js and
   js/dropdown.js both declare `const root = document.documentElement;` at
   top level, and loaded as classic scripts (which every prior fix attempt
   either was, or believed itself not to be) they collide, dropdown.js
   throws a SyntaxError, and `root.setAttribute('data-dropdown', 'on')` -
   the gate css/header-2.css keys its closed-by-default panel styles off -
   never runs. Nothing short of an actual page load, with and without
   JavaScript, distinguishes "the filter fixed it" from "the filter is
   present but inert."

   The observable is the same one used to diagnose the regression:
   .em-header__menu, not a proxy selector. A prior fix round substituted
   button[aria-expanded="true"] here, got an ambiguous 10-visible/5-visible
   result (the toggle buttons count alongside the panels), explained the
   remainder away as "toggle buttons and other elements that remain
   expanded by design," and shipped the regression anyway. .em-header__menu
   is unambiguous: five panels ship open in the markup by design (the
   header's own progressive-enhancement contract, documented in
   js/dropdown.js), and only js/dropdown.js having actually run sets
   panel.hidden = true on all five, which css/header-2.css:85 turns into
   display:none. 5-and-0 is the only reading that proves the script ran; a
   5-and-5 means it did not, and a 0-and-0 would be false parity from a
   selector matching nothing on either side. */
test('the five desktop dropdown panels ship open without JavaScript and close with it', { concurrency: 1 }, async () => {
  const { checkVisibleWithoutJs, checkVisibleWithJs } = await import('./fidelity-browser.mjs');
  const url = requireSpikeUrl();
  const withoutJs = await checkVisibleWithoutJs(url, '.em-header__menu');
  const withJs = await checkVisibleWithJs(url, '.em-header__menu');
  assert.equal(withoutJs, 5,
    `expected 5 dropdown panels visible without JavaScript (the header ships them open by design); got ${withoutJs}`);
  assert.equal(withJs, 0,
    `expected 0 dropdown panels visible with JavaScript (js/dropdown.js should have set panel.hidden = true on all five); got ${withJs}. If this is nonzero, js/dropdown.js did not run - check for a classic-script collision on a top-level identifier such as \`root\`.`);
});

test('the live page shows Empower chrome and none of UiCore own', { concurrency: 1 }, async () => {
  /* requireSpikeUrl() first, not after the flush: flushPageCache() goes
     over SSH, and a checkout with no SPIKE_URL must fail on that guard's
     message before anything reaches the network, not with a bare DNS
     error from an SSH call this test has no business making yet. */
  const url = requireSpikeUrl();
  /* flushPageCache() next, not a bare fetchConverted(): by the time this
     test runs, the browser-driven tests above it have already loaded the
     page repeatedly and re-warmed WP Engine's page cache past whatever
     state a run-level flush left it in, and fetchConverted() refuses a
     cache HIT outright rather than silently checking a stale copy. */
  await flushPageCache();
  const html = await fetchConverted(url);
  assert.ok(html.includes('em-header'), 'the Empower header is not on the page');
  assert.ok(html.includes('em-footer'), 'the Empower footer is not on the page');
  assert.ok(!html.includes('uicore-header'), 'UiCore is still rendering its header');
  assert.ok(!html.includes('uicore-footer'), 'UiCore is still rendering its footer');
});

/* The element-cache trap again (see the loop item's own comment in
   03-library.mjs), asserted against the real page rather than the JSON. One
   card carrying the right attribute proves nothing: the failure mode found
   live was every card carrying the SAME right-looking value, because the
   pca-ep container was baked once per page load and reused for every
   iteration. Phase 1 has exactly 9 termed posts (3 lawmaker, 3 expert, 3
   leader), so 9 is the floor a correctly-scoped, correctly-varying render
   must clear. */
test('the live loop grid emits a different guest value on different cards', { concurrency: 1 }, async () => {
  /* requireSpikeUrl() before the flush, same reasoning as the chrome test
     above: flushPageCache() goes over SSH, and this test must fail on the
     guard's message rather than open an SSH connection first. */
  const url = requireSpikeUrl();
  /* flush next: the page cache has almost certainly been re-warmed by the
     browser tests that ran before this one in the same suite. */
  await flushPageCache();
  const html = await fetchConverted(url);
  const values = [...html.matchAll(/data-guest="([^"]+)"/g)].map(m => m[1]);
  assert.ok(values.length >= 9, `expected at least 9 data-guest attributes, found ${values.length}`);
  assert.ok(new Set(values).size > 1, 'every card carries the same data-guest value, which is the element cache');
});

/* Task 7, Step 1. bridge.css is additive by design: the 50 files in css/
   stay untouched and stay under test.mjs. Anything Elementor-shaped goes
   here so a reader knows where to look, and so a later tidy-up of css/
   cannot silently break the converted pages. */
test('the bridge stylesheet exists, is enqueued last, and is the only Elementor-shaped file', () => {
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  assert.ok(fs.existsSync('wp/empowerms-child/css/bridge.css'));
  assert.match(fn, /wp_enqueue_style\(\s*'empower-bridge'/);
  const bridgeAt = fn.indexOf("'empower-bridge'");
  const pageLoopAt = fn.indexOf('empower_page_styles()[ $slug ]');
  assert.ok(bridgeAt > pageLoopAt, 'the bridge stylesheet must enqueue after the per-page sheets');
});

/* Elementor Site Settings cannot be saved on this install: the Components
   package's __beforeSave hook dereferences undefined on any kit document
   (Elementor Pro 4.2.1). Container width and widget spacing have nowhere
   else to live. */
test('the bridge stylesheet carries the two values Site Settings cannot hold', () => {
  const css = fs.readFileSync('wp/empowerms-child/css/bridge.css', 'utf8');
  assert.match(css, /1200px/, 'container width is not set');
  assert.match(css, /e-con|elementor-widget/, 'no Elementor container or widget selector present');
});

/* The inverse guard. The moment an Elementor-shaped selector appears
   outside bridge.css, the static build has stopped being buildable on its
   own and test.mjs is no longer proving what it claims to prove.

   Fix round: this used to check only /\.e-con\b|\.elementor-widget/ against
   css/ alone, which is narrower than bridge.css's own stated vocabulary
   (.e-con, .elementor-widget, .elementor-button, "and the like") and
   narrower than the protected static build (components/ and tokens/ are
   equally part of it, and equally untested here before). .elementor-button
   was the likeliest to leak: it is the selector bridge.css's own two most
   substantial repairs are built on, so it is what someone fixing a button
   elsewhere would copy. The regex now matches any .elementor-* class, not
   just -widget and -button by name, which is what "and the like" actually
   commits to; the directory list now matches every directory test.mjs
   protects. */
/* THE EXEMPTION IS DERIVED FROM TWO POSITIVE FACTS, NOT FROM A FILENAME LIST.
   css/post-single.css broke this test on 2026-08-23 by carrying six
   Elementor selectors deliberately, and moving them to bridge.css was the
   wrong repair: they are not global Elementor fixes, they are one page's
   design fighting two Elementor defaults (`.e-con > .elementor-widget
   {max-width:100%}` and the widget figure margin reset) plus four rules
   opting its loop grid out of content-a's lead-card treatment. Split across
   two files, that design stops being readable in one place.

   What actually changed is the CATEGORY of sheet, which the test predates.
   Every sheet it was written to protect dresses markup that the static build
   emits, so an Elementor selector in one is proof the static page can no
   longer stand on its own. An INSTALL-ONLY sheet dresses markup that exists
   only on WordPress: there are 490 single posts and no dist/post-single.html
   for them to diverge from, so the premise of the guard is simply absent.

   Install-only is decided by the repository, never by a list here, because a
   hand-written exemption list is the coverage bug this file has already been
   bitten by twice (the trees array above, and the roster count in e0b661f).
   A sheet is exempt only when BOTH are true, and both are read off files:
   no page in dist/ loads it, AND empower_page_styles() in the child theme
   serves it. Absence alone would exempt any sheet somebody forgot to wire
   into build.mjs; the second fact is what makes it a deliberate arrangement
   rather than an oversight. The day a dist page loads post-single.css, the
   exemption evaporates on its own and this test goes red again. */
function installOnlySheets() {
  const fn = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const from = fn.indexOf('function empower_page_styles()');
  assert.ok(from !== -1, 'empower_page_styles() is gone from functions.php; this exemption cannot be derived');
  const body = fn.slice(from, fn.indexOf('\n}', from));
  /* The array VALUES only. The keys of that map are page slugs, and a slug
     can collide with a stylesheet name (`work-a` is both), which would
     exempt a sheet nothing actually serves. */
  const served = new Set();
  for (const [, list] of body.matchAll(/array\(([^)]*)\)/g)) {
    for (const [, name] of list.matchAll(/'([a-z0-9-]+)'/g)) served.add(name);
  }
  const pages = fs.readdirSync('dist').filter(f => f.endsWith('.html'))
    .map(f => fs.readFileSync(`dist/${f}`, 'utf8'));
  return new Set([...served].filter(name => fs.existsSync(`css/${name}.css`)
    && !pages.some(html => html.includes(`${name}.css`))));
}

test('no stylesheet outside the bridge carries an Elementor selector', () => {
  const ELEMENTOR_SELECTOR = /\.e-con\b|\.elementor-[\w-]+/;
  const exempt = installOnlySheets();
  let checked = 0;
  for (const dir of ['css', 'components', 'tokens']) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.css'))) {
      if (dir === 'css' && exempt.has(file.replace(/\.css$/, ''))) continue;
      const css = fs.readFileSync(`${dir}/${file}`, 'utf8');
      assert.doesNotMatch(css, ELEMENTOR_SELECTOR, `${dir}/${file} carries an Elementor selector`);
      checked += 1;
    }
  }
  /* The exemption is narrow by construction, and this is what keeps it so:
     if it ever grows to swallow the protected build, the walk itself has
     stopped proving anything. */
  assert.ok(checked > 20, `only ${checked} stylesheets were checked; the install-only exemption has grown too wide`);
});

/* The exemption's own arithmetic, asserted rather than assumed. A sheet
   arriving in this set is a decision somebody should have to make on purpose,
   and on 2026-08-26 this test did exactly that job: css/archive.css was written
   the same morning the exemption was, and this assertion is what surfaced it
   rather than letting the set widen quietly.

   BEING IN THE SET IS NOT THE SAME AS RELYING ON IT. Membership is derived
   (no dist page loads it, and empower_page_styles() serves it), so an
   install-only sheet lands here whether or not it carries an Elementor
   selector. Only post-single.css actually needs the exemption; archive.css is
   in the set and would pass the guard on its own, because its cards are
   content-a's and it never has to out-specify an Elementor default. If that
   changes, it changes here, deliberately. */
test('the install-only stylesheet exemption names exactly the sheets it is meant to', () => {
  assert.deepEqual([...installOnlySheets()].sort(), ['archive', 'post-single']);
});

/* The half of the arithmetic above that is easy to lose: the exemption is only
   worth anything while the sheets in it are genuinely unreachable from the
   static build. This asserts the derivation from the other end, so a sheet
   cannot join the set by being quietly dropped from build.mjs. */
test('no exempt stylesheet is loaded by any page in dist', () => {
  const pages = fs.readdirSync('dist').filter(f => f.endsWith('.html'));
  for (const name of installOnlySheets()) {
    const loaders = pages.filter(f => fs.readFileSync(`dist/${f}`, 'utf8').includes(`${name}.css`));
    assert.deepEqual(loaders, [],
      `css/${name}.css is exempt from the Elementor-selector guard AND loaded by ${loaders.join(', ')}; `
      + 'it cannot be both install-only and part of the static build');
  }
});

/* Ruling E, made before Task 5 ran: factory.mjs's link() emits
   widgetType 'button', so the skip link's em-skip class lands on a wrapper
   div while the focusable anchor inside carries only .elementor-button. A
   div never receives focus, so css/site.css's own .em-skip:focus can never
   match and the skip link is permanently off screen (WCAG 2.4.1). This
   test asserts the source-level repair; the actual behaviour (tabbing to
   the live page brings a visible pill into view, verified against the
   spike URL by hand for this task's report) is not something a source-text
   assertion can prove on its own, which is why it is recorded in the
   report rather than asserted here as a browser test. */
test('bridge.css repairs the skip link with a :focus-within rule on .em-skip', () => {
  const css = fs.readFileSync('wp/empowerms-child/css/bridge.css', 'utf8');
  assert.match(css, /\.em-skip:focus-within\s*\{[^}]*top:/,
    'bridge.css must carry a :focus-within rule for .em-skip that moves it into view');
});

/* --- fidelity-deferred.mjs / the deferred-image list, tested without a
   browser --------------------------------------------------------------- */

/* Fix round 1 (Critical 1): the register's coverage is no longer decided by
   what is hand-typed into PAGE_REGISTER. It is decided by
   convertedPageDirs(), which reads elementor/pages/ directly, and this
   test asserts every directory it finds is accounted for in exactly one of
   PAGE_REGISTER (gated) or EXCLUDED_PAGES (excluded, with a reason). Delete
   the 'final' entry and add 'what-we-do-a' without touching EXCLUDED_PAGES,
   and 'final' still has a page.mjs on disk but is in neither list: this
   test goes red naming it, which is exactly the silent-loss scenario the
   brief's own precedent (a hand-written page list that stayed green while
   four pages went unregistered) describes. */
test('every converted page directory is either gated by the register or explicitly excluded', () => {
  const dirs = convertedPageDirs();
  assert.ok(dirs.length > 0, 'convertedPageDirs() found no page.mjs under elementor/pages/; the derivation is broken, not the coverage');
  /* Fix round 2 (N1): the exactly-one-list check above passes even if
     PAGE_REGISTER is empty, as long as every directory is in
     EXCLUDED_PAGES instead. That is a legitimate reading of "exactly one
     list", but it is also exactly how the two instrument loops below
     (`for (const page of PAGE_REGISTER)`) would silently stop generating
     any tests at all: the suite goes green, with a LOWER test count, and
     both instruments this task exists to build cease to exist. The old
     standalone `'the page register is not empty'` test caught this and
     was deleted as "superseded" in fix round 1; it was not superseded for
     this shape, so the check is restored here, next to the derivation it
     depends on rather than as a separate assertion that could drift from
     it. */
  assert.ok(PAGE_REGISTER.length > 0,
    'PAGE_REGISTER is empty: every converted page is excluded and nothing is gated. '
    + 'At least one page must be measured, or the two instruments below have nothing to run against');
  const registered = new Set(PAGE_REGISTER.map((p) => p.name));
  const excluded = new Set(EXCLUDED_PAGES.map((p) => p.name));
  for (const dir of dirs) {
    const inRegister = registered.has(dir);
    const inExcluded = excluded.has(dir);
    assert.ok(inRegister || inExcluded,
      `"${dir}" has a page.mjs under elementor/pages/ but is in neither PAGE_REGISTER nor EXCLUDED_PAGES `
      + '(both in elementor/pages/register.mjs); a converted page must be gated or explicitly excluded, never neither');
    assert.ok(!(inRegister && inExcluded),
      `"${dir}" is in both PAGE_REGISTER and EXCLUDED_PAGES; a page cannot be gated and excluded at once`);
  }
  /* The reverse direction: a name in either list that names no real
     directory is a typo or a stale entry left behind by a rename. */
  for (const p of PAGE_REGISTER) {
    assert.ok(dirs.includes(p.name), `PAGE_REGISTER names "${p.name}", which has no elementor/pages/${p.name}/page.mjs`);
  }
  for (const p of EXCLUDED_PAGES) {
    assert.ok(dirs.includes(p.name), `EXCLUDED_PAGES names "${p.name}", which has no elementor/pages/${p.name}/page.mjs`);
    assert.ok(p.reason && p.reason.trim() !== '', `EXCLUDED_PAGES entry for "${p.name}" carries no reason`);
  }
});

/* Fix round 2 (N3): Number.isFinite(...) > 0 let minBoxes: 0.5 through, which
   would clear `shared.length > minBoxes` on the __unsettled__ bookkeeping
   key alone (a 404 static file gives shared.length exactly 1, the marker
   with nothing measured). A floor is a count of real elements, so it must
   be an integer of at least 1. */
test('every PAGE_REGISTER entry carries its own coverage floors', () => {
  for (const p of PAGE_REGISTER) {
    assert.ok(Number.isInteger(p.minShared) && p.minShared >= 1,
      `PAGE_REGISTER entry "${p.name}" has no integer minShared >= 1 (the census floor)`);
    assert.ok(Number.isInteger(p.minBoxes) && p.minBoxes >= 1,
      `PAGE_REGISTER entry "${p.name}" has no integer minBoxes >= 1 (the box-sweep floor)`);
  }
});

/* compareBoxes() is the box sweep's diff-and-defer logic, extracted out of
   the browser test below so its five load-bearing behaviours can be proven
   against plain objects, in milliseconds, without Playwright. Everything
   here makes a test MORE PERMISSIVE (that is what a deferred list is), so
   each behaviour below is tested for the failure it exists to catch, not
   just the pass it exists to produce.

   These use the real registered page name 'final', not a placeholder like
   the old 'x', because fix round 1 (M2) made validateDeferredEntry() check
   a deferred entry's `page` against PAGE_REGISTER: a synthetic page name
   would now throw, for the same reason a typo'd one should. */

test('compareBoxes subtracts a deferred key from the diff, and reports the count', () => {
  const live = { 'img|team.jpg': { w: 400, h: 300 } };
  const stat = { 'img|team.jpg': { w: 320, h: 240 } };
  const deferred = [{ page: 'final', key: 'img|team.jpg', reason: 'placeholder photo, wrong crop', date: '2026-08-17' }];
  const { diffKeys, subtracted } = compareBoxes(live, stat, 'final', deferred);
  assert.deepEqual(diffKeys, [], 'a deferred key must not appear in the remaining diff');
  assert.equal(subtracted, 1, 'exactly one difference was excused and must be counted');
});

test('compareBoxes does not subtract a key that is not on the deferred list, and it still fails', () => {
  const live = { 'img|team.jpg': { w: 400, h: 300 } };
  const stat = { 'img|team.jpg': { w: 320, h: 240 } };
  const { diffKeys, subtracted } = compareBoxes(live, stat, 'final', []);
  assert.deepEqual(diffKeys, ['img|team.jpg'], 'an undeferred difference must still be reported');
  assert.equal(subtracted, 0, 'nothing was excused, so nothing should be counted as subtracted');
});

/* This is the half the recipe calls out as most important: without it the
   list only ever grows, excusing whatever fixed the thing it was written
   for, and eventually excusing defects nobody has looked at. Fix round 1
   (I3) moved expiry out of compareBoxes() into expiredDeferredEntries(),
   called once over the union of every width's raw differences (see the box
   sweep below); this test exercises that function directly. */
test('a deferred entry whose key no longer differs at all is reported as expired, by name', () => {
  const live = { 'img|team.jpg': { w: 320, h: 240 } };
  const stat = { 'img|team.jpg': { w: 320, h: 240 } };
  const deferred = [{ page: 'final', key: 'img|team.jpg', reason: 'placeholder photo, wrong crop', date: '2026-08-17' }];
  const { diffKeys, rawDiffKeys } = compareBoxes(live, stat, 'final', deferred);
  assert.deepEqual(diffKeys, [], 'the two sides agree, so there is nothing left to report as a difference');
  const expired = expiredDeferredEntries(new Set(rawDiffKeys), 'final', deferred);
  assert.deepEqual(expired, ['img|team.jpg'], 'the entry that no longer differs must be named so it can be removed');
});

/* I3's own failure mode: an entry that differs at one width and agrees at
   the other must NOT be reported expired from either single width's
   result. Only the union across every measured width decides expiry. */
test('a deferred entry that differs at one width and agrees at another is not expired', () => {
  const deferred = [{ page: 'final', key: 'img|team.jpg', reason: 'placeholder photo, wrong crop', date: '2026-08-17' }];
  const at1440 = compareBoxes({ 'img|team.jpg': { w: 400, h: 300 } }, { 'img|team.jpg': { w: 320, h: 240 } }, 'final', deferred);
  const at390 = compareBoxes({ 'img|team.jpg': { w: 320, h: 240 } }, { 'img|team.jpg': { w: 320, h: 240 } }, 'final', deferred);
  assert.deepEqual(at1440.diffKeys, [], 'the difference at 1440 is deferred and must not fail the test');
  assert.deepEqual(at390.diffKeys, [], 'the two sides agree at 390 already, nothing to fail');
  const union = new Set([...at1440.rawDiffKeys, ...at390.rawDiffKeys]);
  const expired = expiredDeferredEntries(union, 'final', deferred);
  assert.deepEqual(expired, [], 'the entry is still needed at 1440, so it must not be reported expired');
});

/* An entry deferred for a DIFFERENT page must not silently excuse a
   same-named key on this one; page scoping is not exercised by the two
   tests above, which both use a single page. 'other-page' does not need to
   be a real registered page here: compareBoxes() filters deferred entries
   by `page === pageName` before validating them, so an entry for a page
   other than the one being compared is never read, let alone validated. */
test('a deferred entry does not cross pages: the same key deferred elsewhere still fails here', () => {
  const live = { 'img|team.jpg': { w: 400, h: 300 } };
  const stat = { 'img|team.jpg': { w: 320, h: 240 } };
  const deferred = [{ page: 'other-page', key: 'img|team.jpg', reason: 'placeholder photo, wrong crop', date: '2026-08-17' }];
  const { diffKeys, subtracted } = compareBoxes(live, stat, 'final', deferred);
  assert.deepEqual(diffKeys, ['img|team.jpg'], 'a deferral on another page must not excuse this one');
  assert.equal(subtracted, 0, 'nothing on this page was excused');
});

/* Nothing may be deferred except an image key: a deferred control, link or
   heading is outside Paolo's instruction and needs asking about, so the
   mechanism refuses it rather than trusting whoever writes the entry. */
test('a non-image key is refused when it is added to the deferred list', () => {
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 'a|Contact us', reason: 'no', date: '2026-08-17' }),
    /not an image key/, 'an anchor key must be refused, not silently accepted');
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 'button|Submit', reason: 'no', date: '2026-08-17' }),
    /not an image key/, 'a button key must be refused, not silently accepted');
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 'h2|Our mission', reason: 'no', date: '2026-08-17' }),
    /not an image key/, 'a heading key must be refused, not silently accepted');
});

/* The two bookkeeping keys are neither images nor deferrable, and get their
   own refusal message rather than falling through to the generic one. */
test('the two bookkeeping keys are refused with their own message, not the generic one', () => {
  assert.throws(() => validateDeferredEntry({ page: 'final', key: '__excluded_count__', reason: 'no', date: '2026-08-17' }),
    /bookkeeping marker/, '__excluded_count__ must be refused as bookkeeping, not as "not an image"');
  assert.throws(() => validateDeferredEntry({ page: 'final', key: '__unsettled__', reason: 'no', date: '2026-08-17' }),
    /bookkeeping marker/, '__unsettled__ must be refused as bookkeeping, not as "not an image"');
  assert.equal(isBookkeepingKey('__excluded_count__'), true);
  assert.equal(isBookkeepingKey('__unsettled__'), true);
  assert.equal(isImageKey('__excluded_count__'), false);
});

test('isImageKey is decidable from the key alone, for the shapes controlBoxes() actually emits', () => {
  assert.equal(isImageKey('img|team.jpg'), true);
  assert.equal(isImageKey('img|team.jpg#2'), true, 'a deduped image key keeps the img| prefix');
  assert.equal(isImageKey('a|Contact us'), false);
  assert.equal(isImageKey('button|Submit'), false);
  assert.equal(isImageKey('h2|Our mission'), false);
});

/* Fix round 1 Minors, all closing the same gap: a bad entry was refused
   only on the two axes the brief named (image key, bookkeeping key), and
   was trusted on everything else. */
test('a deferred entry for a page the register does not gate is refused (M2)', () => {
  assert.throws(() => validateDeferredEntry({ page: 'no-such-page', key: 'img|team.jpg', reason: 'no', date: '2026-08-17' }),
    /is not in PAGE_REGISTER/, 'a typo\'d or unregistered page name must be refused, not silently accepted and left inert');
});

test('a deferred entry with no reason or no date is refused (M1)', () => {
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 'img|team.jpg', date: '2026-08-17' }),
    /has no reason/, 'a missing reason must be refused: the recipe requires one on every entry');
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 'img|team.jpg', reason: '   ', date: '2026-08-17' }),
    /has no reason/, 'a blank reason must be refused the same as a missing one');
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 'img|team.jpg', reason: 'no' }),
    /has no date/, 'a missing date must be refused: the recipe requires one on every entry');
});

test('a deferred entry with a missing or non-string key gets an informative message, not a raw TypeError (M3)', () => {
  assert.throws(() => validateDeferredEntry({ page: 'final', reason: 'no', date: '2026-08-17' }),
    /non-string key/, 'a missing key must be named as the problem, not surface as a TypeError from inside isImageKey');
  assert.throws(() => validateDeferredEntry({ page: 'final', key: 42, reason: 'no', date: '2026-08-17' }),
    /non-string key/, 'a numeric key must be refused the same way');
});

test('compareBoxes refuses an invalid deferred entry even when the caller supplies the list directly (M5)', () => {
  const live = { 'a|Contact us': { w: 10, h: 10 } };
  const stat = { 'a|Contact us': { w: 20, h: 20 } };
  const badList = [{ page: 'final', key: 'a|Contact us', reason: 'no', date: '2026-08-17' }];
  assert.throws(() => compareBoxes(live, stat, 'final', badList),
    /not an image key/, 'a hand-built deferred list bypassing DEFERRED_IMAGES must get the same refusal, not a silent subtraction');
});

/* The subtraction count must be visible on a green run too, not only when
   there is a remaining failure to explain: a silent subtraction is how a
   gate stops being a gate. This proves the count is still computed and
   correct when diffKeys ends up empty, i.e. when the test that reads it
   would otherwise pass without anyone noticing anything was excused. */
test('the subtraction count is available even when every difference was deferred (a green run)', () => {
  const live = { 'img|team.jpg': { w: 400, h: 300 }, 'img|hero.jpg': { w: 100, h: 100 } };
  const stat = { 'img|team.jpg': { w: 320, h: 240 }, 'img|hero.jpg': { w: 90, h: 90 } };
  const deferred = [
    { page: 'final', key: 'img|team.jpg', reason: 'placeholder photo, wrong crop', date: '2026-08-17' },
    { page: 'final', key: 'img|hero.jpg', reason: 'placeholder photo, wrong crop', date: '2026-08-17' },
  ];
  const { diffKeys, subtracted } = compareBoxes(live, stat, 'final', deferred);
  assert.deepEqual(diffKeys, [], 'both differences were deferred, so the test this feeds would pass');
  assert.equal(subtracted, 2, 'a passing result must not hide how many differences were excused to get there');
});

/* --- fidelity-deferred.mjs / CONTENT_HEIGHT_EXEMPTIONS ------------------- *

   Tested the same way and for the same reason DEFERRED_IMAGES is: this is
   the one mechanism in the suite that lets a MEASURED difference not be a
   failure, so its behaviour has to be provable without a browser, a live
   install or a particular page's real geometry.

   The fixtures below are the shape layoutInvariants() returns for `painted`
   (a map of key -> { top, h }, top measured from <main>'s own top), and
   they are built to the same arithmetic `final` at 390 really produces: an
   ancestor that contains the exempted element, the exempted element itself,
   and a box below it that the difference pushes down. `page: 'final'` on
   every entry because validateContentExemption() requires a registered
   page; nothing about these tests is specific to the homepage. */

test('a content-height exemption explains its own box, its container and everything below it, and nothing else', () => {
  const stat = {
    section: { top: 0, h: 500 }, card: { top: 100, h: 200 }, below: { top: 400, h: 50 },
  };
  const live = {
    section: { top: 0, h: 470 }, card: { top: 100, h: 170 }, below: { top: 370, h: 50 },
  };
  const list = [{ page: 'final', width: 390, key: 'card', reason: 'real post copy', date: '2026-08-18' }];
  const out = explainLayoutHeights(live, stat, 1000, 'final', 390, list);
  assert.deepEqual(out.diffs, [], 'all three boxes are explained exactly by the card being 30px shorter');
  assert.deepEqual(out.roots.map((r) => [r.key, r.dH]), [['card', -30]],
    'the difference is MEASURED from the two maps, never read from the entry');
  assert.equal(out.mainExpected, 970, "main is compared against the static height plus what the exemption explains");
});

test('a content-height exemption does not excuse a box that moved by more than it explains', () => {
  const stat = {
    section: { top: 0, h: 500 }, card: { top: 100, h: 200 }, below: { top: 400, h: 50 },
  };
  /* `below` has moved 40px where the card only explains 30, and its own
     height is 4px out. Both must survive the exemption. */
  const live = {
    section: { top: 0, h: 470 }, card: { top: 100, h: 170 }, below: { top: 360, h: 54 },
  };
  const list = [{ page: 'final', width: 390, key: 'card', reason: 'real post copy', date: '2026-08-18' }];
  const out = explainLayoutHeights(live, stat, 1000, 'final', 390, list);
  assert.equal(out.diffs.length, 1, 'exactly the one box whose difference is not explained is reported');
  assert.match(out.diffs[0], /^below:/, 'and it is named');
  assert.match(out.diffs[0], /residual dTop -10 dH 4/,
    'the message must show what is left AFTER the exemption, not the raw difference, or it reads as a 40px defect');
});

test('a content-height exemption whose difference has disappeared is reported expired, not silently applied', () => {
  const stat = { card: { top: 100, h: 200 } };
  const live = { card: { top: 100, h: 200 } };
  const list = [{ page: 'final', width: 390, key: 'card', reason: 'real post copy', date: '2026-08-18' }];
  const out = explainLayoutHeights(live, stat, 1000, 'final', 390, list);
  assert.deepEqual(out.expired, ['card'],
    'an exemption that has outlived the difference it excused must fail, the same half that keeps DEFERRED_IMAGES honest');
  assert.deepEqual(out.roots, [], 'and it must not count as a root, or it would subtract zero and look applied');
});

test('a content-height exemption naming an element that is no longer painted on both sides is reported, not ignored', () => {
  const stat = { other: { top: 0, h: 10 } };
  const live = { other: { top: 0, h: 10 } };
  const list = [{ page: 'final', width: 390, key: 'card', reason: 'real post copy', date: '2026-08-18' }];
  const out = explainLayoutHeights(live, stat, 1000, 'final', 390, list);
  assert.deepEqual(out.unmeasured, ['card'],
    'an entry that has stopped naming a real element is a defect in the list, not an inert line');
});

test('a content-height exemption is scoped to its own width and its own page', () => {
  const stat = { card: { top: 100, h: 200 } };
  const live = { card: { top: 100, h: 170 } };
  const list = [{ page: 'final', width: 390, key: 'card', reason: 'real post copy', date: '2026-08-18' }];
  const wrongWidth = explainLayoutHeights(live, stat, 1000, 'final', 1440, list);
  assert.equal(wrongWidth.roots.length, 0, 'the 390 entry must not reach the 1440 measurement');
  assert.equal(wrongWidth.diffs.length, 1, 'so the difference is still reported at 1440');
  const wrongPage = explainLayoutHeights(live, stat, 1000, 'team-a', 390, list);
  assert.equal(wrongPage.roots.length, 0, "and final's entry must not reach team-a");
  assert.equal(wrongPage.diffs.length, 1, 'so the difference is still reported there too');
});

test('a box that only partially overlaps an exempted element is refused rather than guessed at', () => {
  /* The shape solutions-b really produces: a panel whose negative margin
     makes it overhang the box above it. If such a box ever sat across an
     exempted element there is no derivable expected difference, and a
     guess is how a gate stops being a gate. */
  const stat = { overhang: { top: 50, h: 200 }, card: { top: 100, h: 200 } };
  const live = { overhang: { top: 50, h: 200 }, card: { top: 100, h: 170 } };
  const list = [{ page: 'final', width: 390, key: 'card', reason: 'real post copy', date: '2026-08-18' }];
  const out = explainLayoutHeights(live, stat, 1000, 'final', 390, list);
  assert.equal(out.ambiguous.length, 1, 'the undecidable case is reported');
  assert.match(out.ambiguous[0], /^overhang .*partially overlaps the exempted card/);
});

test('explainLayoutHeights refuses an invalid exemption even when the caller supplies the list directly', () => {
  const stat = { card: { top: 0, h: 10 } };
  const live = { card: { top: 0, h: 20 } };
  assert.throws(() => explainLayoutHeights(live, stat, 100, 'final', 390,
    [{ page: 'final', width: 390, key: 'card', date: '2026-08-18' }]),
  /has no reason/, 'a hand-built list must get the same refusal the module list gets at import');
  assert.throws(() => explainLayoutHeights(live, stat, 100, 'final', 390,
    [{ page: 'nope', width: 390, key: 'card', reason: 'r', date: '2026-08-18' }]),
  /not in PAGE_REGISTER/, 'a typo in the page name must fail rather than sit inert forever');
  assert.throws(() => validateContentExemption({
    page: 'final', width: 900, key: 'card', reason: 'r', date: '2026-08-18',
  }), /not one of the measured widths/, 'a width nothing measures could never be applied');
  assert.throws(() => validateContentExemption({
    page: 'final', width: 390, key: '__unsettled__', reason: 'r', date: '2026-08-18',
  }), /bookkeeping marker/, 'a bookkeeping key names no element');
});

/* The list this build actually ships, checked as data rather than as
   behaviour: every entry validates, and every entry names a width the
   suite really measures. The forEach at the bottom of fidelity-deferred.mjs
   already throws at import for the first of those; this proves it stays
   true after an edit, and names MEASURED_WIDTHS as the reason the width
   field is closed rather than free. */
test('every CONTENT_HEIGHT_EXEMPTIONS entry this build ships is valid and reachable', () => {
  assert.ok(CONTENT_HEIGHT_EXEMPTIONS.length > 0,
    'an empty list would make every test above vacuous against the real data');
  for (const entry of CONTENT_HEIGHT_EXEMPTIONS) {
    assert.doesNotThrow(() => validateContentExemption(entry), `${entry.page} ${entry.key} must validate`);
    assert.ok(MEASURED_WIDTHS.includes(entry.width),
      `${entry.key} names width ${entry.width}, which the layout test never measures`);
  }
});

/* --- fidelity-browser.mjs / the homepage's two measuring instruments ----- */

/* The homepage's ~40 defects were found by two throwaway session scripts,
   not by anything in this suite. They are load-bearing for thirteen more
   page conversions and must stop being throwaway. Guarded the same way the
   SPIKE_URL group above guards itself, with one difference: SPIKE_URL fails
   the run when unset, right for eight tests the whole run depends on. This
   register is meant to grow past what any one developer has credentials
   for, so a page whose variable is unset is skipped, not failed, BY
   DEFAULT: a developer without empv2 access still gets a usable, all-green
   `node --test test-elementor.mjs`, with a visible line naming what was
   skipped and why, rather than a false failure to explain away every run.

   Fix round 1 (M4): a skip is invisible to an automated run that only
   checks for a nonzero fail count, so a misspelled variable name in a CI
   config could retire the gate with nothing going red. FIDELITY_REQUIRE_ALL
   is the opt-in escape hatch: set it, and a missing variable fails instead
   of skipping, with the same message plus a note explaining why. Unset (the
   default, and every environment this task was built in), behaviour is
   exactly as before.

   Fix round 2 (N2): `env` is a parameter defaulting to `process.env`, not
   read from `process.env` directly inside the function body. Fix round 1's
   own unit test for this proved the opposite of what it claimed: it SET
   process.env.FIDELITY_REQUIRE_ALL and then DELETED it in a finally, and
   because node runs a file's top-level tests in registration order, that
   test ran and cleaned up before either instrument test below ever called
   requirePageUrl(), so the flag was already gone by the time it mattered.
   Measured on that shipped tree: `FIDELITY_REQUIRE_ALL=1 node --test
   test-elementor.mjs` produced skips, identical to an unset run; the flag
   only worked when the proving test was filtered out with
   --test-name-pattern, which a real CI invocation never does. A restore-
   the-previous-value finally would have papered over that one instance but
   left the same ordering dependency in place for the next test that reads
   this variable; taking `env` as an argument removes the shared mutable
   state, and with it the ordering dependency, entirely. */
function requirePageUrl(page, t, env = process.env) {
  const url = env[page.envVar];
  if (url) return url;
  const message = `${page.envVar} is not set. This test needs the deployed ${page.name} page: `
    + `${page.envVar}=${page.exampleUrl} node --test test-elementor.mjs`;
  if (env.FIDELITY_REQUIRE_ALL) {
    assert.fail(`${message} (FIDELITY_REQUIRE_ALL is set, so a missing variable fails this test instead of skipping it)`);
  }
  t.skip(message);
  return null;
}

test('requirePageUrl fails instead of skipping when FIDELITY_REQUIRE_ALL is set (M4, fixed N2)', () => {
  const page = { name: 'nonexistent-test-page', envVar: 'NO_SUCH_FIDELITY_VAR_XYZ', exampleUrl: 'https://example.test/' };
  const fakeContext = { skip: () => assert.fail('should have failed via FIDELITY_REQUIRE_ALL, not skipped') };
  /* A local object, not process.env: this test cannot leave shared state
     for a later test to trip over, which is exactly what fix round 1's
     version of this test did. */
  const fakeEnv = { FIDELITY_REQUIRE_ALL: '1' };
  assert.throws(() => requirePageUrl(page, fakeContext, fakeEnv), /NO_SUCH_FIDELITY_VAR_XYZ is not set/);
});

/* Fix round 2 (N2)'s own name for this test, "regardless of test order",
   overstated what it proves: this test passes an explicit `{}`, so it says
   nothing about ordering at all. Order-independence is a property of the
   FIRST test no longer mutating process.env, not something a test that
   never touches process.env can demonstrate. Renamed. */
test('requirePageUrl skips by default when FIDELITY_REQUIRE_ALL is absent from the given env', () => {
  const page = { name: 'nonexistent-test-page', envVar: 'NO_SUCH_FIDELITY_VAR_XYZ', exampleUrl: 'https://example.test/' };
  let skipMessage = null;
  const fakeContext = { skip: (msg) => { skipMessage = msg; } };
  const url = requirePageUrl(page, fakeContext, {});
  assert.equal(url, null, 'a missing variable with no FIDELITY_REQUIRE_ALL must skip, not throw');
  assert.match(skipMessage, /NO_SUCH_FIDELITY_VAR_XYZ is not set/);
});

/* Fix round 2 (N5): both tests above pass their own `env` object, so
   neither one touches the one piece of wiring N2 was actually about: the
   default parameter binding to the real process.env. Round 1 proved the
   flag while deleting it from shared state; round 2 proved it against a
   substitute environment; both left the default itself unobserved. Change
   `env = process.env` to `env = {}` and every test in this file still
   passes, while both instrument tests below skip forever regardless of
   what HOME_URL or FIDELITY_REQUIRE_ALL are actually set to, with the
   suite green: the entire gate retires on a one-token typo nothing
   catches.
   PATH is relied on rather than a fabricated variable because it is set in
   every environment this suite runs in (a local shell, CI, this task's own
   offline environment), so the two-argument call can be checked against
   the real process.env directly instead of against a fixture. */
test('requirePageUrl reads process.env when no env argument is passed', () => {
  const page = { name: 'nonexistent-test-page', envVar: 'PATH', exampleUrl: 'https://example.test/' };
  const fakeContext = { skip: () => assert.fail('PATH is always set, so the two-argument call must not skip') };
  assert.equal(requirePageUrl(page, fakeContext), process.env.PATH,
    'the default env parameter must be process.env; if it is not, both instrument loops read '
    + 'an empty object and skip forever with the suite green');
});

/* The 32 hand-picked probes reported 31 of 32 matching on a page the census
   found 40 differences on. A curated check set can only find the failures
   somebody already imagined; this enumerates both sides and compares on a key
   the conversion cannot move, which is the element's own text.

   Looped over PAGE_REGISTER rather than hard-coding the homepage: the two
   instrument tests used to name dist/final.html and HOME_URL inside their
   own bodies, so covering a second page meant editing a test per page. The
   loop reads its set from the register instead, the same source of truth a
   human reads to see what is covered. */
for (const page of PAGE_REGISTER) {
  test(`every paragraph and heading on the converted ${page.name} page matches the static build`, { concurrency: 1 }, async (t) => {
    const url = requirePageUrl(page, t);
    if (!url) return;
    const { census } = await import('./fidelity-browser.mjs');
    const server = await serveRepoRoot();
    try {
      const live = await census(url);
      const stat = await census(`${server.url}/${page.staticFile}`);
      const shared = Object.keys(live).filter((k) => stat[k]);
      /* page.minShared, not a shared constant: fix round 1 (I1) found this
         floor was calibrated on the homepage's own census count (63) and
         then applied, unchanged, to every registered page by the loop this
         used to be hard-coded outside of. what-we-do-a's static build has
         17 such elements, well under the old 40, so it could never have
         passed however faithful its conversion was. See the comment on
         minShared in elementor/pages/register.mjs for where each page's
         number comes from. */
      assert.ok(shared.length > page.minShared,
        `only ${shared.length} elements matched by text on both sides (need > ${page.minShared}); the key is not lining up`);
      const diffs = shared.filter((k) => JSON.stringify(live[k]) !== JSON.stringify(stat[k]))
        .map((k) => `${k}: live ${JSON.stringify(live[k])} static ${JSON.stringify(stat[k])}`);
      assert.deepEqual(diffs, [], `${diffs.length} computed-style differences:\n${diffs.join('\n')}`);
    } finally {
      await server.close();
    }
  });
}

/* The census compares values. This compares boxes, and the two find disjoint
   defects: a Loop Grid wrapper cost 222px of card height with every property on
   both sides agreeing, and a kit padding pushed the nav 258px wide while no
   colour moved. Anchors inside Elementor's button widget are skipped: link()
   renders the pill on the WRAPPER and the anchor fills it, which is by design
   and measured correct against the static build's own anchor.

   Looped over PAGE_REGISTER for the same reason as the census test above.
   The homepage carries nothing in DEFERRED_IMAGES, so compareBoxes() with
   an empty deferred list for 'final' reduces to exactly the diffKeys
   computation this test ran inline before this task: same shared/diff
   logic, same messages, same assertion. That equivalence is what "the
   homepage's behaviour must not change" means here, and it is proven, not
   merely asserted, by the extraction: compareBoxes() runs the identical
   shared-key JSON.stringify comparison this file used to run inline, now
   unit-tested in isolation above against exactly this case (an empty
   deferred list).

   Fix round 1 added two things this test used to be missing entirely:

   I2: a coverage floor (`shared.length > page.minBoxes`), inside the width
   loop, the same shape the census test already had. Before this, a wrong
   `staticFile` (a typo, or a page renamed on disk without the register
   being updated) made `controlBoxes()` read a bare 404, which measures
   only the two bookkeeping keys; `shared` then reduced to the
   `__unsettled__` marker alone, on both sides, and the sweep reported a
   clean pass having compared one key out of dozens. The census's own floor
   caught this by accident, since both instruments must pass; this instrument
   did not catch it on its own, which is the gap I2 closed.

   I3: expiry is no longer decided inside the width loop. A DEFERRED_IMAGES
   entry has no width, so a per-width expiry check could not be satisfied by
   an image that differs at 1440 and agrees at 390: subtracted at one width,
   reported expired at the other, with no way to write the entry that
   satisfies both. rawDiffKeys from every width is accumulated into
   `unionRawDiffs` and expiredDeferredEntries() is called once, after the
   loop, over that union: an entry is only ever reported expired when it is
   not needed at ANY measured width. */
for (const page of PAGE_REGISTER) {
  test(`every control and image on the converted ${page.name} page matches the static build box for box`, { concurrency: 1 }, async (t) => {
    const url = requirePageUrl(page, t);
    if (!url) return;
    const { controlBoxes } = await import('./fidelity-browser.mjs');
    const server = await serveRepoRoot();
    try {
      const unionRawDiffs = new Set();
      for (const width of [1440, 390]) {
        const live = await controlBoxes(url, { width });
        const stat = await controlBoxes(`${server.url}/${page.staticFile}`, { width });
        /* Asserted before the diff, not folded into it: __excluded_count__ is
           a scalar, not a box, and `stat[k]` below is falsy for a static
           count of 0, so a live-side regression would silently drop out of
           `shared` and never reach the diff check at all. Asserted as
           exactly 0, not as "the two sides agree": two sides that both
           silently excluded the same element would agree and still be a
           coverage gap. If either count is ever nonzero, the cause is an
           element whose tag controlBoxes()'s key cascade has no identity
           rule for; the remedy is to extend that cascade, not to raise this
           expected number. */
        assert.equal(live.__excluded_count__, 0,
          `controlBoxes excluded ${live.__excluded_count__} element(s) on the live page at ${width}px; extend the key cascade in controlBoxes() to cover them, do not raise this expected count`);
        assert.equal(stat.__excluded_count__, 0,
          `controlBoxes excluded ${stat.__excluded_count__} element(s) on the static page at ${width}px; extend the key cascade in controlBoxes() to cover them, do not raise this expected count`);
        delete live.__excluded_count__;
        delete stat.__excluded_count__;
        const {
          shared, rawDiffKeys, diffKeys, subtracted,
        } = compareBoxes(live, stat, page.name);
        /* I2: catches a wrong staticFile (typo, or a renamed static build
           the register was not updated for) directly, rather than relying
           on the census test's own floor to catch it by accident.

           Fix round 2 (N3): `shared` still carries __unsettled__ (by
           design; it must stay in the DIFF compareBoxes() computes, so a
           settle mismatch between live and static is still caught as a
           real difference), but a bookkeeping marker is not a measured
           element and must not count toward "how many elements did we
           actually compare". Filtered out here, not inside compareBoxes(),
           so the diff behaviour above is untouched and only the floor's
           own arithmetic changes: on the homepage this drops the count
           from 88 to 87, matching the register comment's own count. */
        const measuredElements = shared.filter((k) => !isBookkeepingKey(k)).length;
        assert.ok(measuredElements > page.minBoxes,
          `only ${measuredElements} controls/images matched by key on both sides at ${width}px (need > ${page.minBoxes}); `
          + `check page.staticFile ("${page.staticFile}") actually exists and built`);
        /* Printed on green as well as on red, per the recipe: a silent
           subtraction is how a gate stops being a gate. */
        console.log(`[fidelity] ${page.name} @ ${width}px: subtracted ${subtracted} deferred image key(s) from the diff`);
        for (const k of rawDiffKeys) unionRawDiffs.add(k);
        const diffs = diffKeys.map((k) => `@${width} ${k}: live ${JSON.stringify(live[k])} static ${JSON.stringify(stat[k])}`);
        assert.deepEqual(diffs, [], `${diffs.length} box differences at ${width}px:\n${diffs.join('\n')}`);
      }
      /* I3: evaluated once, over both widths' raw differences together, not
         once per width; see the comment above this loop. */
      const expired = expiredDeferredEntries(unionRawDiffs, page.name);
      assert.deepEqual(expired, [],
        `${expired.length} deferred entr${expired.length === 1 ? 'y' : 'ies'} for "${page.name}" no longer differ `
        + `at EITHER width and must be removed from DEFERRED_IMAGES: ${expired.join(', ')}`);
    } finally {
      await server.close();
    }
  });
}

/* THE THIRD INSTRUMENT, added 2026-08-18.

   An audit of all seven converted pages
   (.superpowers/sdd/2026-08-15-class-in-markup/audit-invisible-defects.md)
   found 10 defects on 5 pages that neither instrument above reports, and
   counted the blind spot: on a typical converted page, 71 to 86 percent of
   everything rendered inside <main> is reached by neither census() nor
   controlBoxes(). Every one of the 10 lives on a container, or on the one
   widget class controlBoxes() excludes by design.

   WHY A THIRD TEST RATHER THAN A WIDER controlBoxes(). Measured, not assumed:
   a container sweep over the same seven pages inherits 188 tag changes, 120
   flex-wrap differences and a set of container height differences that are box
   shifts with nothing inside them moving. One of the 188 is a real defect. The
   cost of that false-positive volume is not wasted investigations, it is that a
   noisy shared gate gets its tolerances widened until it stops being a gate,
   and this project has already shipped one test that failed green. So the
   element set and the property set are both named, and layoutInvariants() in
   fidelity-browser.mjs documents exactly what is in each and what is
   deliberately left out.

   WHAT THIS CAUGHT BEFORE ANY REPAIR, which is the only evidence that it tests
   what it claims. A check that is green before the repair is not a check:

     mainHeight      final -32.00 @1440 and -108.62 @390, capitol-a +20.00
                     @1440 and -16.85 @390, team-a +3.19 @390. Exactly 0.00 on
                     what-we-do-a, solutions-b and who-we-are-a at both widths.
     axis, direction final `.em-stories__mini` and `#2`, row live against
                     column static at 390. Two findings in twelve page-width
                     measurements, both real.
     axis, x         capitol-a `.em-btn.em-btn--lg.em-btn--primary`, live x 144
                     against static 619.94 at 1440 and 24 against 94.94 at 390.
                     One finding, real, and structurally invisible to
                     controlBoxes(), which skips anchors inside
                     .elementor-widget-button and never reads x at all.
     painted         solutions-b `.sb-research`, top 2121.45 live against
                     2035.06 static with height 287.88 against 374.27. One
                     finding, real, and the only instrument that can see it:
                     that page's main height is identical on both sides, so the
                     box shift is invisible to mainHeight, and the section is a
                     container, so it is invisible to both older instruments.

   ON THE PAINTED ASSERTION'S VOLUME, because it looks like noise and is not.
   Before repair it reported 14 differences on final, 17 on capitol-a and 20 on
   team-a at 390. Every one traces to a confirmed defect: a root cause that
   moves one box moves every painted box below it, so the count is
   AMPLIFICATION of a true positive, not a false-positive rate. The tell is the
   signature: a downstream shift has an identical height and a top offset by the
   same constant as everything else below the root. They clear together when the
   root clears, and the assertion prints all of them so the constant is
   readable.

   The coverage assertion is an EQUALITY, not a floor, and that is measured
   rather than aspirational: after PLATFORM_CLASS was corrected, the keyed sets
   match exactly on all six registered pages at both widths, 0 live-only and 0
   static-only. A static-only key means the conversion lost an element that
   carries a build class; a live-only key means it invented one. Both are worth
   a red. It also detects a dead page for free: a 404 has no <main> and no keys
   at all, so every static key becomes static-only.

   podcast-a needs no exclusion here and gets one for free: it is in
   EXCLUDED_PAGES rather than PAGE_REGISTER, because its live loop grid renders
   66 real episodes against 9 static placeholders. That is the one page whose
   main height differs by content rather than by defect, and this loop never
   reaches it. */
for (const page of PAGE_REGISTER) {
  test(`the converted ${page.name} page holds its layout invariants against the static build`, { concurrency: 1 }, async (t) => {
    const url = requirePageUrl(page, t);
    if (!url) return;
    const { layoutInvariants } = await import('./fidelity-browser.mjs');
    const server = await serveRepoRoot();
    try {
      for (const width of [1440, 390]) {
        const live = await layoutInvariants(url, { width });
        const stat = await layoutInvariants(`${server.url}/${page.staticFile}`, { width });

        /* Asserted first, and against the STATIC side, because everything
           below is vacuously true over an empty key set. dist/ is gitignored,
           so an unbuilt static file is a live possibility on a fresh
           checkout, and a 404 measures null. */
        assert.ok(typeof stat.__main_height__ === 'number' && stat.__main_height__ > 0,
          `${page.staticFile} reported no <main> at ${width}px; the build is likely missing or unreachable (run node build.mjs)`);
        assert.ok(typeof live.__main_height__ === 'number' && live.__main_height__ > 0,
          `the live ${page.name} page reported no <main> at ${width}px`);

        const liveOnly = Object.keys(live.axis).filter((k) => !stat.axis[k]);
        const statOnly = Object.keys(stat.axis).filter((k) => !live.axis[k]);
        assert.deepEqual(statOnly, [],
          `${statOnly.length} element(s) carrying a build class exist on the static ${page.name} page at ${width}px and not on the live one: ${statOnly.join(', ')}`);
        assert.deepEqual(liveOnly, [],
          `${liveOnly.length} element(s) carrying a build class exist on the live ${page.name} page at ${width}px and not on the static one: ${liveOnly.join(', ')}`);

        const shared = Object.keys(live.axis).filter((k) => stat.axis[k]);
        console.log(`[layout] ${page.name} @ ${width}px: ${shared.length} keyed element(s) compared, `
          + `${Object.keys(live.painted).length} of them painted`);

        /* CONTENT_HEIGHT_EXEMPTIONS, resolved once per page-width and used by
           both the mainHeight assertion and the painted one, because a
           content difference moves both and explaining it in one place and
           not the other would just move the failure. explainLayoutHeights()
           reads no pixel value from the list: it measures each exempted
           element's own height difference here and propagates that. See
           fidelity-deferred.mjs for what an entry does and does not buy.

           PRINTED ON GREEN AS WELL AS ON RED, the same reason the comparison
           size above is: an exemption nobody sees is an exemption nobody
           re-examines, and this is the one place in the suite where a
           measured difference is allowed not to be a defect. */
        const explained = explainLayoutHeights(live.painted, stat.painted, stat.__main_height__, page.name, width);
        for (const root of explained.roots) {
          console.log(`[layout] ${page.name} @ ${width}px: content-height exemption applied to ${root.key}, `
            + `measured ${root.dH > 0 ? '+' : ''}${root.dH}px`);
        }

        /* Three ways the list itself can be wrong, all failures rather than
           information: an entry that names something no longer compared, an
           entry whose difference has gone (the half that keeps DEFERRED_IMAGES
           honest, and this list needs it for the same reason), and a box whose
           expected difference is not derivable because it only partially
           overlaps an exempted element. */
        assert.deepEqual(explained.unmeasured, [],
          `${explained.unmeasured.length} content-height exemption(s) on ${page.name} at ${width}px name an element `
          + `that is not painted on both sides any more: ${explained.unmeasured.join(', ')}. `
          + 'Delete the entry or fix the key (fidelity-deferred.mjs, CONTENT_HEIGHT_EXEMPTIONS).');
        assert.deepEqual(explained.expired, [],
          `${explained.expired.length} content-height exemption(s) on ${page.name} at ${width}px no longer excuse `
          + `anything: ${explained.expired.join(', ')} now measure the same height live and static. `
          + 'Delete the entry (fidelity-deferred.mjs, CONTENT_HEIGHT_EXEMPTIONS); an exemption that has outlived '
          + 'the difference it excused will eventually excuse a defect nobody has looked at.');
        assert.deepEqual(explained.ambiguous, [],
          `${explained.ambiguous.length} painted box(es) on ${page.name} at ${width}px partially overlap an exempted `
          + `element, so no expected difference can be derived:\n${explained.ambiguous.join('\n')}`);

        /* 1. mainHeight. One number, exact where nothing is exempted: every
           non-zero value measured during Task 11's before-pass traced to a
           named defect, so a tolerance here would only ever hide one.

           Where an exemption DOES apply, the comparison is against the static
           height plus the exempted elements' own measured differences, which
           is still an equality and not a tolerance: the 0.05 is the
           accumulated 2dp rounding of the six measurements the sum is built
           from (max 0.03), an order of magnitude under the 0.5px slack the
           painted and x assertions already carry and two orders under the
           3.19px smallest real finding this phase has produced. */
        if (explained.roots.length === 0) {
          assert.equal(live.__main_height__, stat.__main_height__,
            `main is ${live.__main_height__}px live against ${stat.__main_height__}px static at ${width}px `
            + `(${live.__main_height__ > stat.__main_height__ ? '+' : ''}${Math.round((live.__main_height__ - stat.__main_height__) * 100) / 100}px)`);
        } else {
          assert.ok(Math.abs(live.__main_height__ - explained.mainExpected) <= 0.05,
            `main is ${live.__main_height__}px live against ${stat.__main_height__}px static at ${width}px, and the `
            + `${explained.roots.length} content-height exemption(s) explain only ${explained.exemptedTotal}px of that, `
            + `so main should measure ${explained.mainExpected}px`);
        }

        /* 2a. axis, flex-direction, GATED. flex-direction computes on every
           element whatever its display, so an ungated comparison reports a
           display:grid container whose inert flex-direction differs. Both
           sides must compute flex or inline-flex for the property to mean
           anything, which is what layoutInvariants() records as a null dir. */
        const dirDiffs = shared
          .filter((k) => live.axis[k].dir && stat.axis[k].dir && live.axis[k].dir !== stat.axis[k].dir)
          .map((k) => `${k}: live ${live.axis[k].dir} static ${stat.axis[k].dir}`);
        assert.deepEqual(dirDiffs, [],
          `${dirDiffs.length} flex container(s) run on the wrong axis at ${width}px:\n${dirDiffs.join('\n')}`);

        /* 2b. axis, absolute viewport x. This is the half controlBoxes()
           structurally cannot have: three of the audit's defects moved an
           element horizontally without changing its box at all, and all three
           sit on link() wrappers, which controlBoxes() skips. Half a pixel of
           slack absorbs subpixel layout, and nothing else: the smallest real
           finding this has produced is 70.94px. */
        const xDiffs = shared
          .filter((k) => Math.abs(live.axis[k].x - stat.axis[k].x) > 0.5)
          .map((k) => `${k}: live x ${live.axis[k].x} static x ${stat.axis[k].x}`);
        assert.deepEqual(xDiffs, [],
          `${xDiffs.length} element(s) sit at a different horizontal position at ${width}px:\n${xDiffs.join('\n')}`);

        /* 3. paintedBox. Border-box top (measured from main's own top, so the
           two builds' different header heights cancel) and height, for every
           keyed element that computes a non-transparent background-color or a
           background-image. This is the discriminator that makes the
           lost-margin-collapsing family priceable: three of the four box
           shifts the audit found are free and one uncovers a navy band, and
           only paint tells them apart.

           Computed by explainLayoutHeights() rather than inline, so the
           content exemption is subtracted from the box it belongs to and from
           nothing else: a box CONTAINING an exempted element has that
           element's measured difference taken off its own height, a box
           BELOW one has it taken off its own top, and every other box is
           compared exactly as before. With the exemption in place each
           downstream box is still asserted to have moved by precisely what
           the content explains, which is a stronger statement than dropping
           the keys would make. */
        assert.deepEqual(explained.diffs, [],
          `${explained.diffs.length} painted box(es) moved or resized at ${width}px:\n${explained.diffs.join('\n')}`);
      }
    } finally {
      await server.close();
    }
  });
}

/* The box sweep above compares live against static at 390 and passes today
   because both sides settle. This test isolates one side: does the STATIC
   build alone reach __unsettled__: "settled" at 390, with nothing else in
   the picture. No HOME_URL, no live install, deliberate: this must keep
   working once the conversion is finished and the install is gone.

   Run three times, not once. controlBoxes(staticUrl, { width: 390 }) alone
   in a process was measured reporting "unsettled" roughly two runs in
   three before the settleReveal repair (a single-frame vertical pass
   giving js/reveal.js's IntersectionObserver exactly one chance to catch a
   heading that only ever appears as a sliver at a step boundary), so a
   single passing run is not evidence of anything. Three consecutive
   "settled" results, after the repair, is the bar: by chance alone against
   a ~1-in-3 pre-repair pass rate that would happen under 4% of the time.
   Worth being honest about what three runs buys, though: against the
   original defect (measured at 75% per run) it is a strong revert
   detector, but its power against a brand NEW flake introduced later is
   only 1 - (1 - p)^3, so a regression reintroducing even a 25% per-run
   flake is caught in only about 58% of suite runs, and a 10% flake in
   about 27%. If this test goes red only occasionally rather than every
   time, that is not a sign it is oversensitive; treat any red as real.

   Measures rather than assumes: a fresh checkout has dist/ gitignored, and
   an unbuilt or unreachable dist/final.html would make every phase of
   settleReveal succeed trivially over an empty page (zero images, zero
   containers, zero [data-reveal] elements, every() over an empty array is
   true), which is a green result that measured nothing. controlBoxes()
   against a fully built page found 87 controls at 390px, so a floor of 40
   (the same margin the census test above uses for the same reason) is
   asserted on every run before its settle marker is trusted. */
test('the static build alone settles at 390px, not just relative to the live page', { concurrency: 1 }, async () => {
  const { controlBoxes } = await import('./fidelity-browser.mjs');
  const server = await serveRepoRoot();
  try {
    const RUNS = 3;
    const results = [];
    for (let i = 0; i < RUNS; i++) {
      const stat = await controlBoxes(`${server.url}/dist/final.html`, { width: 390 });
      const measured = Object.keys(stat).filter((k) => !k.startsWith('__')).length;
      assert.ok(measured > 40,
        `controlBoxes measured only ${measured} controls on run ${i + 1} of dist/final.html at 390px; `
        + 'the build is likely missing or unreachable (run node build.mjs), not settled');
      results.push(stat.__unsettled__);
    }
    assert.deepEqual(results, Array(RUNS).fill('settled'),
      `dist/final.html at 390px did not settle on every run: ${results.join(', ')}`);
  } finally {
    await server.close();
  }
});

/* THE LINK REMAP.

   Three tests, and the split between them is the point. The first is a
   property of the map that goes red if a label mapping is lost; the second
   drives the corpus and goes red if any authored link points nowhere; the
   third goes red if the remap is ever unwired from the deploy path.

   WHY THE FIRST TEST IS NOT A RESTATEMENT OF THE MAP. src/_shared/header-2.html
   uses `/latest` as a placeholder for seven different destinations, so the one
   thing the remap can silently get wrong is collapsing several menu items onto
   one page. Deleting any label from BY_LABEL does exactly that: the link still
   RESOLVES (it falls through to the href entry) so unresolvedInternalLinks()
   stays green, and only a distinctness assertion catches it. Asserting the
   count of distinct destinations tests that property without copying the
   pairs. */
test('the seven /latest menu items resolve to seven different pages', async () => {
  const { resolveHref } = await import('./elementor/links.mjs');
  const LABELS = ['Articles', 'Community Stories', 'Press Releases', 'Research',
    'Research (EPIC)', 'The Empower Podcast', 'Capitol Chat'];

  const resolved = LABELS.map((label) => [label, resolveHref('/latest', label)]);
  for (const [label, target] of resolved) {
    assert.ok(target, `the "${label}" menu item still resolves to nothing, so it would ship as /latest, which 404s`);
  }

  /* Each item must resolve BY ITS LABEL, not by falling through to the href.
     Proved necessary: deleting one label from BY_LABEL leaves distinctness
     green, because the orphan lands on the bare fallback and collides with
     nobody. Only comparing against the fallback catches a single lost label,
     which is the likelier accident of the two. */
  const fallback = resolveHref('/latest', 'a label no menu item carries');
  for (const [label, target] of resolved) {
    assert.notEqual(target, fallback,
      `the "${label}" menu item no longer has a label mapping, so it falls through to ${fallback} `
      + 'instead of its own destination. The link still works, which is why nothing else catches this.');
  }
  const distinct = new Set(resolved.map(([, target]) => target));
  assert.equal(distinct.size, LABELS.length,
    'two or more of the All Content / Podcast / Our Solutions menu items now resolve to the SAME page. '
    + `Got ${distinct.size} distinct destinations for ${LABELS.length} menu items: `
    + resolved.map(([l, t]) => `${l} -> ${t}`).join(', '));

  /* The same collapse in the other two placeholders, which have two items each. */
  assert.notEqual(resolveHref('/', 'Home'), resolveHref('/', 'Who We Are'), 'Home and Who We Are collapsed onto one page');
  assert.notEqual(resolveHref('/solutions', 'Our Solutions'), resolveHref('/solutions', 'What We Do'), 'Our Solutions and What We Do collapsed onto one page');
  assert.notEqual(resolveHref('/join', 'Newsletter'), resolveHref('/join', 'Ambassador Program'), 'Newsletter and Ambassador Program collapsed onto one page');
});

/* Every internal link every converted page and both theme parts carry, after
   the remap, points at a page that exists on this install or at a destination
   NO_CONVERTED_PAGE records a reason for. The page list is DERIVED from the
   directories on disk rather than typed, for the reason recorded on
   convertedPageDirs(): two hand-written page lists have already shipped wrong
   here, one of them a test that passed green while measuring nothing. */
test('no converted page links to a route that does not exist', { concurrency: 1 }, async () => {
  const { remapLinks, unresolvedInternalLinks, oldSitePaths } = await import('./elementor/links.mjs');

  const trees = [];
  for (const dir of convertedPageDirs()) {
    const page = await import(`./elementor/pages/${dir}/page.mjs`);
    trees.push([dir, page.sections()]);
  }
  trees.push(['theme-parts/header', headerPart()], ['theme-parts/footer', footerPart()]);

  assert.ok(trees.length >= 19,
    `only ${trees.length} trees were collected; the corpus is 17 pages plus the header and footer, `
    + 'so something is importing as empty and this test would pass while measuring nothing');

  const broken = [];
  for (const [name, tree] of trees) {
    /* oldSitePaths() is read off the UNREMAPPED tree, which is the only point
       at which an empowerms.org link is still recognisable as one. See
       unresolvedInternalLinks()'s own note on why these are allowed here and
       checked live instead. */
    for (const link of unresolvedInternalLinks(remapLinks(tree), undefined, oldSitePaths(tree))) {
      broken.push(`${name}: href="${link.href}"${link.label ? ` (${link.label})` : ''}`);
    }
  }
  assert.deepEqual(broken, [],
    `${broken.length} internal link(s) point at a route that exists neither as a converted page nor `
    + 'in NO_CONVERTED_PAGE. Either map it in elementor/links.mjs or record why it has no page:\n  '
    + broken.join('\n  '));
});

/* The remap is applied by deployElements(), so every tree reaches the install
   rewritten whether it is a page, a loop item or a theme part. This asserts the
   wiring rather than the map: it fails if links.mjs is ever imported but not
   called, which is the one way all of the above can be green while the install
   still ships /latest. */
test('the deploy path rewrites links rather than only the map being able to', async () => {
  const source = fs.readFileSync(new URL('./elementor/deploy.mjs', import.meta.url), 'utf8');
  const serialise = /const json = JSON\.stringify\((.+?)\);/.exec(source);
  assert.ok(serialise, 'deployElements() no longer serialises with JSON.stringify(...); this test needs rewriting');
  assert.match(serialise[1], /^remapLinks\(/,
    `deployElements() serialises ${serialise[1]}, which does not pass the tree through remapLinks(). `
    + 'Every converted page would ship the static build\'s routes, which 404 or leave the build.');
});

/* --- podcast-a's guest filter -------------------------------------------

   podcast-a stays in EXCLUDED_PAGES: its library is a Loop Grid over 66 real
   episodes where dist/podcast-a.html carries 9 placeholder cards, so census and
   box keys compare different CONTENT and no key exists that identifies a card
   slot independently of which episode landed in it.

   This is the same substitute content-a got: a behavioural gate on the one thing
   that CAN silently fail. Two things can, and both have precedent in this
   repository. inc/loop-attributes.php stamps data-guest onto each card, and
   without `_element_cache: 'yes'` on the container it fires once per page load
   and every card inherits one episode's value. The facet ids are the other half:
   css/podcast-a.css:248-251 names #pa-g-leader, #pa-g-lawmaker and #pa-g-expert
   literally, so an id that drifts leaves three checkboxes that do nothing. Both
   were injected against a copy of the live page before this test was trusted;
   the first read 66 visible where 60 was correct, the second threw.

   EXPECTATIONS ARE DERIVED FROM THE START ROW, not typed. Empower have tagged 9
   of 66 episodes so far (guest_type exists; the untagged 57 are theirs to fix),
   and hard-coding today's counts would turn their progress into a failure. */
test('the podcast-a guest facets actually filter, and un-filter', { concurrency: 1 }, async () => {
  const { checkGuestFilter } = await import('./fidelity-browser.mjs');
  const rows = await checkGuestFilter(requireSpikeUrl(), {
    cardSelector: '.pca-ep',
    facetSelector: '.pca-guest',
    steps: [
      { name: 'leader on', toggle: ['pa-g-leader'] },
      { name: 'lawmaker also on', toggle: ['pa-g-lawmaker'] },
      { name: 'both off', toggle: ['pa-g-leader', 'pa-g-lawmaker'] },
    ],
  });
  const [start, leader, both, cleared] = rows;

  assert.equal(start.facets, 3, `expected three guest checkboxes, found ${start.facets}`);
  assert.deepEqual(start.checked, [], 'the library did not start unfiltered');

  const tagged = Object.keys(start.byGuest).filter((g) => g !== '(untagged)').sort();
  assert.deepEqual(tagged, ['expert', 'lawmaker', 'leader'],
    `expected all three guest types on the unfiltered page, found ${tagged.join(', ')}. `
    + 'If Empower have retired a term this needs updating; if data-guest has stopped being '
    + 'emitted, inc/loop-attributes.php or its _element_cache setting is the cause.');

  const untagged = start.byGuest['(untagged)'] ?? 0;

  /* Checking one box leaves that type and hides the other two. Untagged cards
     are matched by none of the three selectors and stay, which is the filter's
     real behaviour rather than a defect: see checkGuestFilter's own note. */
  assert.deepEqual(Object.keys(leader.byGuest).sort(), ['(untagged)', 'leader'].sort(),
    `checking Leader left ${JSON.stringify(leader.byGuest)} visible; the other two tagged types should be hidden`);
  assert.equal(leader.byGuest.leader, start.byGuest.leader, 'checking Leader hid some Leader episodes');
  assert.equal(leader.byGuest['(untagged)'] ?? 0, untagged, 'checking Leader changed how many untagged episodes show');
  assert.ok(leader.visible < start.visible,
    `checking Leader hid nothing: ${leader.visible} visible against ${start.visible} before. `
    + 'The likeliest cause is data-guest missing from the cards, which makes every selector in '
    + 'css/podcast-a.css:248-251 match nothing.');

  /* Two boxes is OR, not AND, which is the trade css/podcast-a.css records. */
  assert.deepEqual(Object.keys(both.byGuest).sort(), ['(untagged)', 'lawmaker', 'leader'].sort(),
    `checking Leader and Lawmaker left ${JSON.stringify(both.byGuest)}; both types should show and expert should not`);
  assert.ok(both.visible > leader.visible, 'adding a second facet did not widen the result, so the filter is AND rather than OR');

  /* Un-checking is half of what a checkbox filter promises, and it is the half a
     radio group cannot even express. */
  assert.deepEqual(cleared.checked, [], 'the facets did not clear');
  assert.equal(cleared.visible, start.visible,
    `clearing every facet left ${cleared.visible} episodes visible against ${start.visible} at the start`);
  assert.deepEqual(cleared.byGuest, start.byGuest, 'clearing every facet did not restore the unfiltered library');
});

/* --- fidelity-browser.mjs / the sticky header ---------------------------- */

/* THE ONE TEST IN THIS SUITE THAT SCROLLS, and the reason it exists is that
   nothing else did.

   css/site.css:79 makes `.em-header` sticky at top:0, and since Phase 2A the
   header is an Elementor Theme Builder part whose wrapper shrink-wraps to the
   header's own height. A sticky element travels within its parent's box, so a
   113px parent gives a 113px header zero travel and it scrolls away. That was
   true on EVERY converted page for fourteen conversions and no instrument here
   reported it, because at scroll position 0 — where census(), controlBoxes(),
   computedStyles() and layoutInvariants() all measure — a sticky element and a
   static one are identical, and every computed value (`position: sticky`,
   `top: 0px`) agreed with the static build the whole time. bridge.css block 63
   repairs it.

   ASSERTED ON THREE PAGES RATHER THAN ONE, because the defect was in the
   site-wide header and a single-page test would not have distinguished "this
   page is fine" from "the header is fine". They are chosen to differ in the
   ways that could plausibly matter: the front page, a page whose own content is
   a Loop Grid, and a Theme Builder single, which is a different document type
   again.

   /all-content/ IS ASSERTED HARDER, because it is where the defect was
   reported. Its own filter bar sticks at top:113px (css/content-a.css:93), a
   number that exists to sit exactly under the stuck header. Asserting the two
   numbers TOGETHER is what catches the real user-visible failure: a header at
   0 and a bar at 113 are flush, and any other pair leaves the gap Paolo saw. */
const STICKY_HEADER_PAGES = [
  { name: 'the front page', envVar: 'HOME_URL', exampleUrl: 'https://empv2.wpenginepowered.com/' },
  { name: 'a Loop Grid page', envVar: 'TEAM_A_URL', exampleUrl: 'https://empv2.wpenginepowered.com/team/' },
  { name: 'a Theme Builder single', envVar: 'TEAM_BIO_URL', exampleUrl: 'https://empv2.wpenginepowered.com/grant-callen/' },
];

for (const page of STICKY_HEADER_PAGES) {
  test(`the site header stays put when ${page.name} is scrolled`, { concurrency: 1 }, async (t) => {
    const url = requirePageUrl(page, t);
    if (!url) return;
    const { stickyAfterScroll } = await import('./fidelity-browser.mjs');
    const read = await stickyAfterScroll(url, ['.em-header']);
    const header = read.elements['.em-header'];

    assert.ok(header, `no .em-header on ${url}; the site-wide header part is not rendering`);
    assert.equal(header.position, 'sticky',
      `.em-header computes position:${header.position}; css/site.css:79 makes it sticky`);
    assert.equal(header.top, 0,
      `after scrolling to ${read.scrollY}, .em-header sits at top ${header.top} instead of 0, so it is not `
      + `sticking. Its parent is ${header.parentHeight}px tall; if that is about the height of the header `
      + 'itself, Elementor\'s theme-part wrapper is shrink-wrapping and giving it nowhere to travel, which '
      + 'is what bridge.css block 63 collapses with display:contents.');
  });
}

test('the all-content filter bar sits flush under the stuck header', { concurrency: 1 }, async (t) => {
  const page = { name: 'content-a', envVar: 'CONTENT_A_URL', exampleUrl: 'https://empv2.wpenginepowered.com/all-content/' };
  const url = requirePageUrl(page, t);
  if (!url) return;
  const { stickyAfterScroll } = await import('./fidelity-browser.mjs');
  const read = await stickyAfterScroll(url, ['.em-header', '.cad-controls']);
  const header = read.elements['.em-header'];
  const controls = read.elements['.cad-controls'];

  assert.ok(header && controls, 'the header or the filter bar is missing from this page');
  assert.equal(controls.position, 'sticky', `.cad-controls computes position:${controls.position}`);

  /* The bar's own offset is read from the page rather than hard-coded, so a
     design change to the header's height moves both numbers together and this
     test keeps meaning the same thing. */
  const barOffset = parseFloat(controls.cssTop);
  assert.ok(Number.isFinite(barOffset), `.cad-controls has top:${controls.cssTop}, which is not a length`);

  assert.equal(header.top, 0, `the header is at ${header.top}, not stuck (see the three tests above)`);
  assert.equal(controls.top, barOffset,
    `the filter bar sits at ${controls.top} rather than at its own ${barOffset}px offset, so it is not sticking`);

  /* THE ASSERTION THAT WOULD HAVE CAUGHT WHAT PAOLO SAW. Both elements can be
     stuck at exactly their authored offsets and still leave a hole: the bar
     reserves a fixed 113px, and if the header above it is not filling that
     113px the archive scrolls through the difference. So the check is that the
     header's BOTTOM EDGE meets the bar's TOP EDGE, computed from what the two
     elements actually occupy rather than from either number alone. */
  const gap = controls.top - (header.top + header.height);
  assert.equal(gap, 0,
    `there is a ${gap}px band between the bottom of the header (${header.top} + ${header.height}) and the `
    + `top of the filter bar (${controls.top}). The archive scrolls through it. The bar reserves `
    + `${barOffset}px for the header via css/content-a.css:93; if the header is shorter or taller than `
    + 'that, the two numbers have drifted apart and one of them has to move.');
});

/* --- fidelity-browser.mjs / what-we-do-a's cards and reports ------------- */

/* Read out of the register rather than named here, so the envVar, the example
   URL and the page's existence all stay in one place. Fails loudly if the entry
   is ever renamed or moved to EXCLUDED_PAGES, instead of quietly skipping. */
const WHAT_WE_DO_A = PAGE_REGISTER.find((p) => p.name === 'what-we-do-a')
  ?? assert.fail('what-we-do-a is no longer in PAGE_REGISTER; the two tests below read its envVar from there');

/* what-we-do-a IS a gated page, so unlike the three tests below this one is not
   standing in for a register entry. It covers the two things that page's
   register entry cannot: a click target, which no box or computed-style
   comparison can see, and four outbound destinations, which live outside the
   document entirely.

   1. THE WHOLE CARD IS ONE CLICK TARGET. css/what-we-do-a.css:82 makes the
      card's heading anchor span the whole plate with an `inset:0` overlay.
      Elementor gives BOTH `.e-con` and `.elementor-widget` `position:relative`,
      so on the live page the overlay was captured by the heading's own widget
      wrapper and covered only the heading: clicking the photograph or the
      "Learn More" cue did nothing, while the cue kept its hover animation and
      still read as a link. bridge.css block 62 repairs it. Hit-testing the
      photograph and the cue is the assertion, because every element and every
      property was already correct while the page was broken.

   2. THE FOUR REPORT TILES RESOLVE. They pointed at `/reports/<year>`, a route
      the static build invented and this install has never had, and they 404'd
      by omission for the whole conversion. They now point at the report PDFs in
      Empower's media library. Asserted as real HTTP responses rather than as
      strings, because the failure mode being guarded is a URL that is perfectly
      well-formed and serves nothing: a media file can be replaced or renamed in
      wp-admin with no signal here at all, which is exactly what happened to the
      route these replaced. */
test('every what-we-do-a card is clickable across its whole plate', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(WHAT_WE_DO_A, t);
  if (!url) return;
  const { clickTargets } = await import('./fidelity-browser.mjs');
  const cards = await clickTargets(url, {
    cardSelector: '.da-door',
    probeSelectors: ['.da-door__cue', 'img'],
  });

  assert.equal(cards.length, 3, `expected three solution cards, found ${cards.length}`);

  for (const card of cards) {
    assert.ok(card.href, 'a card has no anchor at all');
    for (const [probe, hit] of Object.entries(card.probes)) {
      assert.equal(hit, card.href,
        `on the "${card.href}" card, the point over ${probe} resolves to ${JSON.stringify(hit)} `
        + `rather than to the card's own link. The overlay at css/what-we-do-a.css:82 is being sized `
        + 'against a nearer positioned ancestor than .da-door, which is what Elementor\'s '
        + 'position:relative on .e-con and .elementor-widget does unless bridge.css block 62 makes '
        + 'them static. The card still looks correct: the heading text navigates and the cue still '
        + 'animates on hover.');
    }
  }
});

test('every what-we-do-a annual report tile serves a real report', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(WHAT_WE_DO_A, t);
  if (!url) return;
  const { clickTargets } = await import('./fidelity-browser.mjs');
  const tiles = await clickTargets(url, {
    cardSelector: '.da-years li',
    probeSelectors: ['span'],
  });

  assert.equal(tiles.length, 4, `expected four report tiles, found ${tiles.length}`);

  const stale = tiles.filter((t) => /\/reports\//.test(t.href ?? '')).map((t) => t.href);
  assert.deepEqual(stale, [],
    'these tiles still point at /reports/<year>, the route the static build invented and this '
    + 'install has never had; they 404 by omission');

  for (const tile of tiles) {
    assert.match(tile.href ?? '', /^https?:\/\/\S+\.pdf$/i,
      `a report tile points at ${JSON.stringify(tile.href)}, which is not a PDF URL`);
    const res = await fetch(tile.href, { method: 'HEAD', redirect: 'follow' });
    assert.equal(res.status, 200,
      `${tile.href} returned ${res.status}. The report PDFs live in Empower's media library and can `
      + 'be replaced or renamed in wp-admin, which this test exists to catch.');
    assert.match(res.headers.get('content-type') ?? '', /application\/pdf/i,
      `${tile.href} is served as ${res.headers.get('content-type')} rather than a PDF`);
  }
});

/* --- fidelity-browser.mjs / the team-a roster ---------------------------- */

/* Its own guard rather than requirePageUrl(), because team-a moved to
   EXCLUDED_PAGES on 2026-08-20 and therefore no longer has a register entry to
   read an envVar, exampleUrl or staticFile out of. Same shape and same reason
   as requireSpikeUrl() and requireContentAUrl() above. */
const requireTeamAUrl = () => process.env.TEAM_A_URL
  ?? assert.fail('TEAM_A_URL is not set. This test needs the deployed team-a page: TEAM_A_URL=https://empv2.wpenginepowered.com/team/ node --test test-elementor.mjs');

/* THIS TEST IS team-a's GATE, AND IT IS THE ONLY ONE IT HAS.
   The page left the register when its staff roster and fellows ledger became
   Loop Grids over the `person` post type: the live page renders 13 staff and 5
   fellows where dist/team-a.html carries 10 and 5, with four people on each
   side the other does not have, so neither census() nor controlBoxes() can
   compare the two.

   WHAT IT ASSERTS IS RULES, NOT NAMES, and that is the whole design of it.
   Every name, role and photograph on this page is Empower's to change in
   wp-admin without touching this repository — that is the point of the
   conversion — so a test carrying a list of thirteen people would go red on
   the next hire and teach whoever is on call that this test is noise. What
   this build actually OWNS is three derivations, and all three can fail
   silently:

     1. THE SPLIT. wp/empowerms-child/inc/person-loop.php sorts people into the
        two sections on whether `position_title` begins with the word "Fellow".
        If that stops working, fellows appear in Our Team with a photograph and
        a "Read bio" line, which looks entirely correct.

     2. THE ORDER. The page tells the visitor, out loud in its own `.ta-note`,
        "In alphabetical order by last name". WordPress cannot express that
        ordering, so person-loop.php computes it. If that regresses to
        WP_Query's default the page silently starts lying to the reader, and
        every element on it still carries every correct class.

     3. THE LEDGER'S HAIRLINE. `.ta-ledger__row:last-child` matches EVERY row
        once each row is the only child of its own loop item.
        elementor/pages/team-a/03-fellows.mjs's note 1 predicted this in
        writing before the conversion existed; bridge.css block 59 repairs it.
        A repair that stops applying is five hairlines where the design has
        one.

   It also asserts the two things the Loop Grid conversion is FOR: that the
   portraits are real photographs from the media library rather than the
   monogram placeholders the static build ships, and that every card links to
   its own person. Both are what Empower asked for and neither is visible to a
   class-based check. */
test('the team-a roster is driven by the person post type', { concurrency: 1 }, async () => {
  const { teamRoster } = await import('./fidelity-browser.mjs');
  const roster = await teamRoster(requireTeamAUrl());

  assert.ok(roster.staff.length >= 5,
    `found ${roster.staff.length} staff cards; the Loop Grid is rendering almost nothing, which is what `
    + 'an empty post__in looks like (see the guard in empower_person_groups()\'s hook)');
  assert.ok(roster.fellows.length >= 2, `found ${roster.fellows.length} fellow rows`);

  /* 1. THE SPLIT, asserted from both sides so neither an empty Our Team nor an
        empty ledger can pass by matching a vacuous "none of these are". */
  const fellowish = /^fellow\b/i;
  const misfiled = roster.staff.filter((p) => p.role && fellowish.test(p.role));
  assert.deepEqual(misfiled.map((p) => p.name), [],
    'these people are in Our Team with a Fellow role, so the split in '
    + 'wp/empowerms-child/inc/person-loop.php is not being applied');
  const notFellows = roster.fellows.filter((f) => !f.field || !fellowish.test(f.field));
  assert.deepEqual(notFellows.map((f) => f.name), [],
    'these rows are in Contributing Fellows without a Fellow role, so the ledger query is not the '
    + 'fellows query');

  /* 2. THE ORDER, derived from the rendered names rather than compared against
        a list. The sort key is person-loop.php's own: the last whitespace-
        separated word of the title, folded to lower case. Asserted on both
        grids, because both are sorted by the same code. */
  const surname = (name) => {
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts.length ? parts[parts.length - 1] : '').toLowerCase();
  };
  for (const [label, list] of [['staff', roster.staff], ['fellows', roster.fellows]]) {
    const keys = list.map((p) => surname(p.name));
    const sorted = [...keys].sort();
    assert.deepEqual(keys, sorted,
      `the ${label} are not in alphabetical order by last name: rendered ${JSON.stringify(keys)}. `
      + `The page promises this order in its own visible note (${JSON.stringify(roster.note)}), and it `
      + 'comes from empower_person_groups(), not from WP_Query.');
  }
  assert.match(roster.note, /alphabetical order by last name/i,
    'the note that this test holds the page to has changed; if the design no longer promises an order, '
    + 'the ordering code and this assertion should go together');

  /* 3. THE LEDGER'S HAIRLINE: the last row alone. */
  const borders = roster.fellows.map((f) => f.borderBottom);
  const expected = borders.map((_, i) => (i === borders.length - 1 ? '1px' : '0px'));
  assert.deepEqual(borders, expected,
    `ledger row bottom borders read ${JSON.stringify(borders)}. Every row carrying one means `
    + 'bridge.css block 59 is not applying and :last-child is matching each row inside its own '
    + 'loop item, which is the defect 03-fellows.mjs predicted.');
  assert.deepEqual(roster.fellows.map((f) => f.tracks), roster.fellows.map(() => 3),
    'a ledger row is not laying out as three columns, so bridge.css block 60 is not promoting the '
    + 'name and field spans to grid items and the subject is not at the right-hand edge');

  /* WHAT THE CONVERSION WAS FOR: real photographs, and a destination per
     person. */
  const noPhoto = roster.staff.filter((p) => !p.img).map((p) => p.name);
  assert.deepEqual(noPhoto, [],
    'these staff cards have no <img> in their portrait, so the tile is back to being a placeholder');
  const badFit = roster.staff.filter((p) => p.imgFit !== 'cover').map((p) => p.name);
  assert.deepEqual(badFit, [],
    'these portraits are not object-fit:cover, so the photograph is letterboxed inside its 4:5 box '
    + '(bridge.css block 57)');
  const badLink = roster.staff.filter((p) => !p.href || !/\/person\//.test(p.href)).map((p) => p.name);
  assert.deepEqual(badLink, [],
    'these cards do not link to their own person single');
  assert.deepEqual([...new Set(roster.staff.map((p) => p.href))].length, roster.staff.length,
    'two or more cards share a destination, which is what a Loop Item template renders when '
    + "`_element_cache: 'yes'` is missing and Elementor reuses the first item's HTML");
  assert.deepEqual([...new Set(roster.staff.map((p) => p.more))], ['Read bio'],
    'not every card carries the "Read bio" line');

  /* THE BOARD IS STILL HAND-WRITTEN, and its placeholder note moved with it.
     04-board.mjs note 6 records why none of these eight can be a Loop Grid:
     none has a `person` entry on the install. */
  assert.ok(roster.board.length >= 5, `found ${roster.board.length} board names`);
  assert.ok(roster.pendingInBoard,
    'the .ta-pending placeholder note is not in the board section. It moved there on 2026-08-20 '
    + 'because staff and fellows now carry real photographs and the board is the last placeholder; '
    + 'if it has gone back up to the staff head it is describing sections that no longer have '
    + 'placeholders.');
  assert.match(roster.pending, /board/i,
    'the placeholder note no longer names the board, which is the only section it is still true of');
});

/* --- fidelity-browser.mjs / the person Single template ------------------- */

/* Three real people, chosen because between them they exercise every optional
   block in the template. Read off the install on 2026-08-20 and named here
   rather than discovered, because the point of the test is to pin the three
   SHAPES, and a discovered sample could quietly stop covering one of them.

   If Empower fill in a missing field, the row's expectation here goes stale and
   the test says so in its own message rather than just going red: that is the
   correct outcome, because filling those fields is exactly what this build has
   asked them to do, and this is the record of what was missing when. */
const PERSON_SINGLE_CASES = [
  { slug: 'grant-callen', role: true, email: true, note: 'the only person with both a role and an email' },
  { slug: 'matt-ladner', role: true, email: false, note: 'a fellow: role, no email' },
  { slug: 'ashley-green', role: false, email: false, note: 'neither field filled in on the install' },
];

const requirePersonBaseUrl = () => process.env.PERSON_BASE_URL
  ?? assert.fail('PERSON_BASE_URL is not set. This test needs the install\'s person singles: PERSON_BASE_URL=https://empv2.wpenginepowered.com/person/ node --test test-elementor.mjs');

/* THIS TEST IS THE person SINGLE TEMPLATE'S GATE.
   The template (elementor/theme-parts/person-single.mjs) renders
   dist/team-bio.html's design for all eighteen published people. It cannot be
   gated the usual way: census() and controlBoxes() compare a converted page to
   its static counterpart, and seventeen of these eighteen have no counterpart.
   The converted page at /grant-callen/ IS still gated against
   dist/team-bio.html and covers the design; what it cannot cover is the part
   that only exists because the template is dynamic.

   FOUR THINGS, ALL OF WHICH CAN FAIL WITHOUT LOOKING WRONG:

     1. THE OPTIONAL BLOCKS. `.tp-role` and `.tp-contact` render only when the
        record has the field. A widget would emit its wrapper either way and
        draw `.tp-role`'s padding and its rule under blank space; the shortcodes
        in inc/person-loop.php emit nothing. Asserted in BOTH directions on
        three real records, so "always absent" cannot pass.

     2. THE STYLESHEET. Read as `.tp-role`'s computed colour, which
        css/team-bio.css is the only source of. Seventeen of these pages
        shipped with no stylesheet at all until empower_style_key() stopped
        keying non-pages by slug, and Grant Callen's shipped correctly the whole
        time through a slug collision with the converted page at
        /grant-callen/. A <link>-in-head check would have passed on the
        collision. This is the assertion that would not have.

     3. THE PORTRAIT. A real photograph, filling its frame, with the
        placeholder's dashed edge gone (bridge.css block 61) — and that block is
        scoped `:has(img)` precisely so it cannot reach the gated page's
        monogram, so a regression there shows up here as a border coming back.

     4. THE THINGS THAT ARE NOT SUPPOSED TO BE THERE. The social plugin appends
        a Follow/Share/Tweet row to `the_content` on every singular; the design
        has none, and inc/person-loop.php removes the filter for this post type
        only. And `.tp-contact__pending` explained a placeholder inbox that no
        longer exists. Both are absences, which no fidelity instrument on the
        converted page can see. */
for (const person of PERSON_SINGLE_CASES) {
  test(`the person single template renders ${person.slug} (${person.note})`, { concurrency: 1 }, async () => {
    const { personSingle: readPerson } = await import('./fidelity-browser.mjs');
    const base = requirePersonBaseUrl().replace(/\/?$/, '/');
    const page = await readPerson(`${base}${person.slug}/`);

    assert.ok(page.h1, 'no <h1 id="bio-title">, so the name shortcode did not run');
    assert.equal(page.h1Count, 1, `the page has ${page.h1Count} <h1> elements; the template contributes exactly one`);
    assert.equal(page.labelledBy, 'bio-title',
      'the profile section does not point aria-labelledby at the heading, so its accessible name is not the person');

    /* 1. The optional blocks, both directions. */
    assert.equal(!!page.role, person.role,
      person.role
        ? `${person.slug} has a position_title on the install but no .tp-role rendered`
        : `${person.slug} has NO position_title on the install, so no .tp-role should render; found ${JSON.stringify(page.role)}. `
          + 'If Empower have filled the field in, update PERSON_SINGLE_CASES rather than the template.');
    assert.equal(page.contact, person.email,
      person.email
        ? `${person.slug} has an email on the install but no "Get in touch" block rendered`
        : `${person.slug} has NO email on the install, so no .tp-contact should render. `
          + 'If Empower have filled the field in, update PERSON_SINGLE_CASES.');
    if (person.email) {
      assert.match(page.mailto ?? '', /^mailto:/, 'the contact row is not a mailto: link');
    }

    /* 2. The stylesheet, read through the element only it can style. */
    if (person.role) {
      assert.notEqual(page.roleColor, 'rgb(0, 0, 0)',
        `.tp-role computes ${page.roleColor}, which is the UA default: css/team-bio.css did not load on this page. `
        + 'empower_style_key() keys non-page singulars by POST TYPE; a `person` row must exist in '
        + 'empower_page_styles(). Note that /person/grant-callen/ can load it by slug collision with the '
        + 'converted page at /grant-callen/, so check a different person before believing it is fixed.');
    }

    /* 3. The portrait. */
    assert.ok(page.portrait, 'no <img> in .tp-portrait, so the frame is back to being a placeholder');
    assert.equal(page.portraitFit, 'cover',
      'the portrait is not object-fit:cover, so it floats at its own ratio inside a 4:5 box (bridge.css block 61)');
    assert.equal(page.portraitBorder, '0px',
      `.tp-portrait still draws a ${page.portraitBorder} border around a real photograph; block 61's `
      + ':has(img) scope is not matching');

    /* 4. The absences. */
    assert.equal(page.share, false,
      'the social plugin\'s share row is inside the bio. inc/person-loop.php removes '
      + 'sfsi_social_buttons_below from the_content on singular person views only');
    assert.equal(page.pending, false,
      '.tp-contact__pending is rendering; it explained the organisation-inbox placeholder, and the '
      + "block now carries the person's own address");

    /* The way back out, which dist/team-bio.html's own comment says every bio
       needs and which is now a real route rather than a review-site stand-in. */
    assert.deepEqual(page.backLinks, ['/team/', '/team/'],
      `the two back links point at ${JSON.stringify(page.backLinks)}; both should be the converted roster at /team/`);
    /* `/donate/` with the trailing slash, because elementor/links.mjs's remap
       runs inside deployElements() and therefore over theme-builder templates
       too, not only over the converted page set. It rewrote this module's
       authored `/donate` to the install's real path. Matched as a pattern
       rather than pinned to one spelling, so a future remap that normalises
       the other way does not fail a link that works. */
    assert.match(page.cta ?? '', /^\/donate\/?$/,
      `the Support Our Work button points at ${JSON.stringify(page.cta)} rather than the donate page`);
    assert.ok(page.bioParagraphs >= 1, 'the bio rendered no paragraphs, so the Post Content widget is empty');
  });
}

/* Every converted page's slug has a row in functions.php's stylesheet map.

   WRITTEN AFTER IT FAILED IN PRODUCTION, 2026-08-20. empower_page_styles() is
   keyed by page SLUG, and the slug rename that morning orphaned all sixteen
   rows at once: the pages still rendered, still carried every class, and every
   one of them lost its stylesheet. The suite caught it as 46 failures spread
   across census, computed-style and filter tests, which is a slow way to learn
   that one map went stale.

   The map is hand-maintained and cannot be derived, because the KEY is an
   install slug and the VALUE is a stylesheet filename and the two genuinely
   differ (`/solutions/` loads css/solutions-b.css, and the three solution pages
   share css/solution.css). What CAN be derived is the key set: every page in
   PAGE_REGISTER and EXCLUDED_PAGES must appear, because every converted page
   has at least css/motion.css. That is the half that goes stale. */
test('every converted page slug still has a stylesheet row in functions.php', () => {
  const php = fs.readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const map = php.slice(php.indexOf('function empower_page_styles'));
  const keys = new Set([...map.matchAll(/^\s*'([a-z0-9-]+)'\s*=>\s*array\(/gm)].map((m) => m[1]));

  assert.ok(keys.size >= 15,
    `only ${keys.size} rows were found in empower_page_styles(); the parse has stopped working `
    + 'and this test would pass while checking nothing');

  const missing = [];
  for (const page of [...PAGE_REGISTER, ...EXCLUDED_PAGES]) {
    if (!page.exampleUrl) continue;
    const slug = new URL(page.exampleUrl).pathname.replace(/^\/|\/$/g, '');
    /* The front page's path is '/', so its slug is not in the URL. Read it from
       the map's own homepage row instead of hard-coding, and assert only that
       SOME row claims the homepage stylesheet. */
    if (slug === '') {
      assert.ok([...map.matchAll(/^\s*'([a-z0-9-]+)'\s*=>\s*array\([^)]*'homepage'/gm)].length === 1,
        'no single row in empower_page_styles() loads css/homepage.css, so the front page ships unstyled');
      continue;
    }
    if (!keys.has(slug)) missing.push(`${page.name} lives at /${slug}/ but no row keys that slug`);
  }

  assert.deepEqual(missing, [],
    `${missing.length} converted page(s) would render with no page stylesheet at all:\n  `
    + missing.join('\n  ')
    + '\nempower_page_styles() is keyed by install slug; renaming a page means renaming its key.');
});

/* --- /team/ links every person it lists ---------------------------------- */

/* THE DEFECT THIS EXISTS FOR SHIPPED, and it shipped because the two halves of
   the roster were built from different templates and only one of them got a
   link. The thirteen staff cards are anchors carrying "Read bio"; the five
   contributing fellows were a ledger of names with no link of any kind, so
   their `person` singles existed, rendered correctly, and were reachable only
   by typing the URL. Nothing caught it: every page-level gate passed, because
   a missing link changes no box and no computed style on the page that should
   have carried it.

   Found by auditing the install's own outgoing links rather than by any test,
   which is why the gate is written against the RENDERED page: the roster is two
   Loop Grids over a post type, so what it links is a fact about the install's
   data and its two loop item templates together, and neither one alone can be
   asserted usefully.

   THE LEDGER IS ASSERTED SEPARATELY from the total, and that is the whole
   point. A single "the roster links at least everybody" check goes green the
   moment the staff cards are joined by as many more staff as there are
   fellows, which is the shape the bug had. Asserting the fellows section on its own is what fails if
   the ledger ever loses its links again. */
test('every person the roster lists is linked to their bio', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(
    { name: 'team-a', envVar: 'TEAM_A_URL', exampleUrl: 'https://empv2.wpenginepowered.com/team/' },
    t,
  );
  if (!url) return;

  /* BOTH COUNTS ARE READ OFF THE INSTALL, not typed here. They were typed here
     ("18 published people on 2026-08-20: 13 staff, 5 fellows") and went red on
     2026-08-21 the moment Empower's staff change drafted five of them, which
     is the same defect this repository has now shipped three times: a number
     copied out of live data ages into a false assertion, and the failure
     accuses the page of a bug the page does not have. The install is the only
     honest source for who exists, exactly as the search-listing coverage gate
     argues at greater length.

     The fellow split uses person-loop.php's own rule, a position_title
     beginning with the whole word "Fellow", so the test cannot disagree with
     the template about who belongs in the ledger.

     ONE wp eval, NOT a shell loop over `wp post meta get`. The obvious
     spelling of this reads the ids with one command and the titles with one
     command per id, which needs the id in a remote shell variable, which is
     the trap wpe.mjs documents at length: every WP-CLI call on this install
     glues a PHP deprecation notice onto its value, and a value captured by
     the REMOTE shell never passes through stripNotices(). Written that way
     first, it reported 17 published people where there are 13, and took eight
     minutes doing it, because each of those calls bootstraps WordPress. */
  const { wpe, stripNotices } = await import('./wpe.mjs');
  const rows = stripNotices(await wpe(
    `wp eval 'foreach (get_posts(["post_type"=>"person","post_status"=>"publish","numberposts"=>-1]) as $p) `
    + `{ echo $p->post_name, "|", get_post_meta($p->ID, "position_title", true), "\n"; }'`,
  )).split('\n').map((line) => line.trim()).filter((line) => line.includes('|'));
  const published = rows.length;
  const fellows = rows.filter((line) => /^fellow\b/i.test(line.split('|')[1] ?? '')).length;

  assert.ok(published > 5, `only ${published} published people came back from the install; the query did not work`);
  assert.ok(fellows > 0, 'no published person has a position_title starting "Fellow", so the ledger split cannot be checked');

  const html = await (await fetch(url)).text();
  const hrefs = [...html.matchAll(/href="([^"]*\/person\/[^"]*)"/g)].map((m) => m[1]);
  const distinct = [...new Set(hrefs)];

  /* A floor rather than an equality, because a link to someone not in the
     roster is a different question from the roster failing to link someone. */
  assert.ok(distinct.length >= published,
    `/team/ links only ${distinct.length} distinct person page(s), and the install publishes ${published} `
    + 'people. Someone in the roster is rendering without a link to their bio.');

  /* The fellows ledger, on its own. It carried ZERO links until 2026-08-20. */
  const ledgerAt = html.indexOf('ta-ledger');
  assert.ok(ledgerAt > 0, 'no .ta-ledger on /team/, so the fellows section is not rendering at all');
  const ledger = html.slice(ledgerAt);
  const ledgerLinks = [...new Set([...ledger.matchAll(/href="([^"]*\/person\/[^"]*)"/g)].map((m) => m[1]))];
  assert.ok(ledgerLinks.length >= fellows,
    `the fellows ledger links ${ledgerLinks.length} bio(s) and the install publishes ${fellows} contributing fellows. The `
    + 'ledger rows carry no "read bio" affordance, so a fellow whose name is not a link is a bio page '
    + 'nothing on the site reaches.');

  const broken = [];
  for (const href of distinct) {
    const res = await fetch(new URL(href, url).href, { redirect: 'manual' });
    if (res.status >= 400) broken.push(`${href} -> ${res.status}`);
  }
  assert.deepEqual(broken, [], `the roster links ${broken.length} bio page(s) that do not resolve:\n  ` + broken.join('\n  '));
});

/* --- links.mjs / the story links that used to leave the install ---------- */

/* SEVEN CONVERTED PAGES CARRIED 29 ABSOLUTE LINKS TO EMPOWER'S LIVE SITE, and
   a reviewer clicking one left the build without being told. capitol-a's six
   weekly chats, epic-a's four reports, and the story links on safety, work,
   education and landing were all authored as `https://empowerms.org/<slug>/`,
   because that is the site the static build was written against. isInternal()
   reads an absolute http URL as external, so the remap had never looked at
   them.

   They are now localised to `/<slug>/`, which is correct on the review install
   AND after hand-off, since the post sits at that path on both.

   WHAT THIS TEST EXISTS FOR. The static gate above cannot check these: whether
   a post exists is not a property of a tree. This one asks the install, which
   is the only place the answer lives. It is also the gate that would catch the
   localisation being WRONG in a way that still looks fine, i.e. a slug that
   differs between empowerms.org and this install; a link that 404s here after
   the rewrite is exactly that case, and before the rewrite it would have gone
   on working by pointing off-site. */
test('every story link a converted page carries resolves on the install', { concurrency: 1 }, async (t) => {
  const home = requirePageUrl(
    { name: 'install home page', envVar: 'HOME_URL', exampleUrl: 'https://empv2.wpenginepowered.com/' },
    t,
  );
  if (!home) return;
  const { oldSitePaths } = await import('./elementor/links.mjs');

  const paths = new Set();
  for (const dir of convertedPageDirs()) {
    const page = await import(`./elementor/pages/${dir}/page.mjs`);
    for (const p of oldSitePaths(page.sections())) paths.add(p);
  }

  /* A floor, so this cannot pass by collecting nothing. 29 were found on
     2026-08-20; asserting the exact number would fail the day a page gains a
     story link, which is not a defect. */
  assert.ok(paths.size >= 25,
    `only ${paths.size} old-site links were collected from the page modules, and there were 29 on `
    + '2026-08-20. Either oldSitePaths() has stopped recognising them or the pages import as empty, '
    + 'and in both cases this test would otherwise pass while checking almost nothing.');

  const origin = new URL(home).origin;
  const broken = [];

  /* A PER-REQUEST CACHE BUSTER, not a flush at the top of the loop. This loop
     makes ~29 sequential requests, which is long enough for another session's
     traffic to re-warm WP Engine's page cache underneath it: a flush makes a
     page fresh ONCE, and a loop that outlives that freshness reads whatever the
     cache has. A parallel session in this tree hit exactly that on 2026-08-20
     and its gate went red on a page nothing was wrong with, so this uses the
     convention it settled on rather than inventing a second one.

     `empower_cb`, and the PREFIX is the point. This install returns a
     200-shaped 404 for WordPress's reserved query vars (`?s=` is a search,
     `?w=` a week number), which a corpus sweep in this repository was fooled by
     once: it read "0 found" on every page and reported success. A prefixed name
     cannot collide with a public query var.

     `Math.random()` is deliberately not used for the run id: the value only has
     to be unique WITHIN this loop, and the index alone gives that. */
  for (const [i, path] of [...paths].sort().entries()) {
    const bust = new URL(origin + path);
    bust.searchParams.set('empower_cb', `story-${i}`);
    const res = await fetch(bust.href, { redirect: 'manual' });
    if (res.status >= 400) broken.push(`${path} -> ${res.status}`);
  }

  assert.deepEqual(broken, [],
    `${broken.length} of ${paths.size} story link(s) do not resolve on the install:\n  `
    + broken.join('\n  ')
    + '\nThese were absolute empowerms.org URLs before the remap localised them, so a 404 here means '
    + 'the slug differs between Empower\'s live site and this install.');
});

/* --- fidelity-browser.mjs / the legacy post page's "More" grid ----------- */

/* WHAT THIS GATES, AND WHY IT IS NOT A CONVERSION TEST.
 *
 * Paolo reported the closing "More" grid on /kyle-jackson-a-fathers-footsteps/
 * as unstyled and asked for the All Content card treatment on it. That page is
 * NOT converted and is not going to be by this change: all 490 posts render
 * through the Beaver Themer layout "Post Singular", and every element the
 * assertions below touch is Beaver's own markup. css/post-single.css dresses
 * it; css/post-single.css's header carries the whole account.
 *
 * So there is no static counterpart to diff against, and none of the five
 * conversion instruments apply. What can be asserted is that the sheet REACHED
 * the page and won, which is exactly the pair of failures computedStyles()
 * exists for (a stylesheet that never enqueued, and another sheet winning over
 * it). Both are live here rather than hypothetical: the sheet loads through a
 * new `post` row in empower_page_styles(), keyed off empower_style_key()'s post
 * type branch rather than a slug, and it is fighting `a{color:var(--text-link)}`
 * in tokens/base.css for the title and the excerpt, which is what made the
 * cards read as a wall of orange underlines in the first place.
 *
 * THE PHOTOGRAPH ASSERTION IS WRITTEN NOT TO GO VACUOUS. Which related posts
 * this grid shows is Beaver's choice and changes as Empower publishes, so a
 * test pinned to "there is a card with no featured image" would quietly stop
 * asserting anything the day that stopped being true. Both cases are probed,
 * at least one is required to exist (which is also the check that the grid has
 * any cards at all), and whichever are present are asserted. */
const POST_SINGLE_PAGE = {
  name: 'legacy single post',
  envVar: 'POST_SINGLE_URL',
  exampleUrl: 'https://empv2.wpenginepowered.com/kyle-jackson-a-fathers-footsteps/',
};

/* css/site.css:28 is `--em-orange-ink:#BA4920`, which is the accessible orange
   the accessibility overrides established and the colour css/content-a.css:279
   gives `.cad-card__topic`. Written as the rgb() a computed style returns. */
const ORANGE_INK = 'rgb(186, 73, 32)';

test('the legacy post page\'s More grid wears the All Content card design', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(POST_SINGLE_PAGE, t);
  if (!url) return;
  const { computedStyles } = await import('./fidelity-browser.mjs');

  const read = await computedStyles(url, [
    { name: 'gridDisplay', selector: '.pcw-post-cards .fl-post-grid', property: 'display' },
    { name: 'cardRadius', selector: '.pcw-post-cards .fl-post-grid-post', property: 'border-top-left-radius' },
    { name: 'cardBorder', selector: '.pcw-post-cards .fl-post-grid-post', property: 'border-top-width' },
    { name: 'topicColor', selector: '.pcw-post-cards .pcw-post-card-category', property: 'color' },
    { name: 'topicCase', selector: '.pcw-post-cards .pcw-post-card-category', property: 'text-transform' },
    { name: 'titleColor', selector: '.pcw-post-cards .pcw-post-card-title', property: 'color' },
    { name: 'bodyUnderline', selector: '.pcw-post-cards .post-card-content-link', property: 'text-decoration-line' },
    { name: 'plainPhoto', selector: '.pcw-post-cards .fl-post-grid-post:not(.has-post-thumbnail) .pcw-post-card-image-link', property: 'display' },
    { name: 'realPhoto', selector: '.pcw-post-cards .fl-post-grid-post.has-post-thumbnail .pcw-post-card-image-link', property: 'display' },
    { name: 'clearBefore', selector: '.pcw-post-cards .fl-post-grid', property: 'content', pseudo: '::before' },
    { name: 'clearAfter', selector: '.pcw-post-cards .fl-post-grid', property: 'content', pseudo: '::after' },
    { name: 'gridBleed', selector: '.pcw-post-cards .fl-post-grid', property: 'margin-left' },
  ]);

  assert.ok(read.gridDisplay,
    `no .pcw-post-cards .fl-post-grid on ${url}. Either the Beaver layout "Post Singular" stopped `
    + 'rendering the closing grid, or this URL is not a post any more.');
  assert.equal(read.gridDisplay, 'grid',
    `the More grid computes display:${read.gridDisplay}. css/post-single.css replaces Beaver's floated `
    + '.fl-post-column layout with the same auto-fill grid .cad-cards uses; if this is not grid, the sheet '
    + 'did not load at all (check the `post` row in empower_page_styles(), and that empower_style_key() '
    + 'still returns the post type for a non-page singular).');

  assert.notEqual(read.cardRadius, '0px',
    'the cards have square corners, so .cad-card\'s border-radius did not reach them');
  assert.equal(read.cardBorder, '1px',
    `the cards have a ${read.cardBorder} top border rather than the 1px hairline .cad-card carries`);

  assert.equal(read.topicColor, ORANGE_INK,
    `the category eyebrow is ${read.topicColor}, not the ${ORANGE_INK} of .cad-card__topic`);
  assert.equal(read.topicCase, 'uppercase',
    `the category eyebrow computes text-transform:${read.topicCase}; the All Content eyebrow is caps`);

  /* The two assertions that catch what Paolo actually saw: every string in the
     card was a link colour with a link underline, because the whole card body
     IS one anchor and nothing was overriding tokens/base.css:8. */
  assert.notEqual(read.titleColor, ORANGE_INK,
    'the card headline is still the link colour, so tokens/base.css:8 is winning over css/post-single.css '
    + 'and the card reads as a wall of orange');
  assert.equal(read.bodyUnderline, 'none',
    `the card body computes text-decoration-line:${read.bodyUnderline}. The whole copy block is one anchor `
    + 'on this markup, so an underline there underlines the headline, the byline and the excerpt together.');

  /* FOUND ON THE FIRST LIVE RENDER, and worth a gate of its own because every
     other assertion here was already green while the grid was visibly wrong.
     Beaver clears its floated columns with
     `.fl-post-grid::before/::after{content:" ";display:table}`. A generated box
     with a content value is a grid item, so turning the parent into a grid
     turned those two into blank cards: `::before` took the first cell and every
     real card shifted one place, leaving a hole in the top-left and a card
     stranded on a row of its own. Both boxes measured 312 x 441.891, the size
     of a card, which is why it read as a layout bug rather than a stray
     element. Asserted on `content` because that is what generates the box. */
  assert.equal(read.clearBefore, 'none',
    `.fl-post-grid::before still generates a box (content: ${read.clearBefore}). It is Beaver's clearfix, `
    + 'and in a grid container it is a blank card that pushes every real one out of place.');
  assert.equal(read.clearAfter, 'none',
    `.fl-post-grid::after still generates a box (content: ${read.clearAfter}); see the assertion above`);

  /* The module's own generated rule pulls the grid 20px past the row on each
     side, because Beaver pads it back in on `.fl-post-column` and the pair is a
     gutter. `display:contents` on those columns keeps the bleed and loses the
     padding, which at 768 put the first card's left edge at x:0, hard against
     the viewport. */
  assert.equal(read.gridBleed, '0px',
    `the More grid still carries margin-left:${read.gridBleed}. That is half of Beaver's gutter, and its `
    + 'other half went with the columns; the grid\'s own gap replaces both.');

  assert.ok(read.plainPhoto !== null || read.realPhoto !== null,
    'the More grid rendered no cards at all, so nothing above was actually measured on a card');
  if (read.plainPhoto !== null) {
    assert.equal(read.plainPhoto, 'none',
      'a related post with no featured image is still drawing its photo plate. The layout writes '
      + '`background-image: url()` with an empty url for those, which computes to none and leaves an empty '
      + 'grey 3:2 block; css/post-single.css suppresses it from WordPress\'s own has-post-thumbnail class.');
  }
  if (read.realPhoto !== null) {
    assert.equal(read.realPhoto, 'block',
      'a related post WITH a featured image is not drawing it, so the has-post-thumbnail gate is inverted');
  }
});

/* --- the reveal gate ------------------------------------------------------
   THE HERO ENTRANCE ANIMATION WAS DEAD ON ALL EIGHTEEN CONVERTED PAGES, and
   the suite was green throughout. Repaired 2026-08-20; these three tests are
   the instruments that would have caught it.

   WHAT WAS BROKEN. css/motion.css nests every hidden start-state under
   [data-reveal="on"]. js/reveal.js set that attribute as its first statement
   and js/reveal.js is a deferred script, so on the live install the gate
   landed AFTER first paint, every time (measured: /person/kienna-horn/ first
   paint 392ms, gate 408ms; / first paint 268ms, gate 304ms). The page painted
   fully visible; only then did opacity:0 apply; and .is-revealed followed two
   frames later. A frame-by-frame read of the hero's computed opacity was
   1.00 for the entire load. Scroll reveals further down were unaffected,
   because by the time they intersect the start state has long since applied,
   which is exactly why the symptom read to a human as "some pages animate and
   some do not".

   WHY NOTHING HERE SAW IT. Every existing reveal instrument in this harness
   (settleReveal, checkVisibleWithJs, the no-JS parity tests) asks "did
   everything end up visible?" The broken page answered yes. The defect was
   purely temporal, and a suite with no temporal instrument cannot have an
   opinion about it. entranceAnimation() in fidelity-browser.mjs is that
   instrument, and its own header records why it reads the gate off the HTTP
   response rather than off the DOM. */

/* Cheap and exhaustive: every converted page, one fetch each, no browser.
   Derived from the register's own exampleUrl the same way elementor/links.mjs
   derives its targets, so a page added to the register is covered here
   without this test being edited, and EXCLUDED_PAGES are covered too -- they
   render the same motion layer and their exclusion is about census
   comparability, not about motion. */
test('every converted page serves the reveal gate and its no-JS fallback in the markup', { concurrency: 1 }, async () => {
  const pages = [...PAGE_REGISTER, ...EXCLUDED_PAGES].filter((p) => p.exampleUrl);
  assert.ok(pages.length > 10,
    `only ${pages.length} pages carry an exampleUrl; this test would be passing on almost nothing`);
  /* Unique per run, not per file: two runs of this suite minutes apart must
     not share a cache entry either. */
  const cacheBuster = Date.now();
  /* A PER-REQUEST CACHE BUSTER RATHER THAN A FLUSH, and the difference is
     not a style preference: this loop makes eighteen requests over about
     forty seconds, and WP Engine's page cache re-warms from any other
     traffic while it runs. A flush at the top is a race the loop loses -
     observed 2026-08-20, where a concurrent suite in another session
     re-cached /solutions/ between the flush and this loop reaching it, and
     fetchConverted() refused the HIT. A flush makes the page fresh ONCE; a
     unique query string makes every one of these requests uncacheable, so
     the test cannot be made to read a stale <html> tag no matter what else
     is touching the install.

     `empower_cb`, and the name matters. This install returns a 200-shaped
     404 for the RESERVED query vars (`?s=` is a search and `?w=` a week
     number), which a corpus sweep in this repository has already been
     fooled by once: it read "0 found" on every page and reported success.
     A prefixed name cannot collide with WordPress's own public query vars.
     Verified against /solutions/ before being relied on here: x-cache goes
     HIT -> MISS and the page still renders as itself, title and all. */
  const missing = [];
  for (const [i, page] of pages.entries()) {
    const bust = new URL(page.exampleUrl);
    bust.searchParams.set('empower_cb', `${cacheBuster}-${i}`);
    const html = await fetchConverted(bust.href);
    /* Asserted on the <html> tag as the SERVER sent it. js/reveal.js sets the
       same attribute on documentElement at runtime, so any DOM-side reading
       of this passes identically on the broken page: the bytes are the only
       place the two states differ. */
    if (!/<html[^>]*\sdata-reveal="on"/.test(html)) missing.push(`${page.name}: no data-reveal="on" on <html>`);
    if (!/<noscript><style>\[data-reveal\]\{[^<]*opacity:1!important/.test(html)) {
      missing.push(`${page.name}: no <noscript> reveal fallback`);
    }
  }
  assert.deepEqual(missing, [],
    `${missing.length} converted pages do not paint the reveal start state:\n${missing.join('\n')}\n`
    + 'The gate comes from the language_attributes filter in the child theme\'s functions.php, which is keyed '
    + 'off empower_page_has_motion(). A page missing it either is not in empower_page_styles() or does not '
    + 'list the motion sheet there.');
});

/* The temporal half, on one page rather than eighteen: this one needs a real
   browser and 2.2s of frame sampling each time, and the fetch test above
   already proves the gate reaches every page. /person/kienna-horn/ is the
   page the defect was reported on, so it is the page the gate watches. */
test('the person single hero actually animates rather than snapping into place', { concurrency: 1 }, async () => {
  const base = requirePersonBaseUrl();
  const { entranceAnimation } = await import('./fidelity-browser.mjs');
  const r = await entranceAnimation(new URL('kienna-horn/', base).href);

  assert.ok(r.frames > 30,
    `only ${r.frames} frames were sampled; the sampler did not run and nothing below was measured`);
  assert.ok(r.gateInMarkup, 'the server did not send data-reveal="on" on <html>; see the fetch test above');
  assert.ok(r.hiddenAtFirstFrame,
    'the hero was already visible on the document\'s first frame, so the start state never painted and there '
    + 'is nothing for the transition to animate FROM. This is the exact defect repaired on 2026-08-20: it '
    + 'means the gate is arriving after first paint again.');
  assert.ok(r.fadeFrames > 0,
    'no frame caught the hero part-way through the fade: it went from hidden straight to shown. That is a '
    + 'snap, not an animation - check --dur-reveal and css/motion.css\'s transition declaration.');
  assert.ok(r.endsVisible,
    'the hero never became visible at all. js/reveal.js did not run, and with the gate now in the server '
    + 'markup that leaves the page permanently blank - check for a classic-script collision on a top-level '
    + 'identifier such as `root`.');
});

/* The gate is only as good as the thing it is derived from. This is the same
   rule elementor/links.mjs's own targets follow and the same failure this
   repository has already shipped twice: a second hand-written list of pages,
   which drifts from the first one silently. */
test('the reveal gate is derived from empower_page_styles, not from a second page list', () => {
  const php = fs.readFileSync(path.join(process.cwd(), 'wp/empowerms-child/functions.php'), 'utf8');
  const fn = php.match(/function empower_page_has_motion\(\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(fn, 'empower_page_has_motion() is gone from the child theme; the reveal gate has no source of truth');
  assert.match(fn[1], /empower_page_styles\(\)/,
    'empower_page_has_motion() no longer reads empower_page_styles(). Whatever it reads instead is a second '
    + 'list of which pages carry the motion layer, and it will drift from the enqueue.');
  assert.match(fn[1], /empower_style_key\(\)/,
    'empower_page_has_motion() no longer keys off empower_style_key(), so it cannot be answering the same '
    + 'question the stylesheet enqueue answers: pages are keyed by slug and other post types by post type');
  assert.match(php, /add_filter\(\s*'language_attributes'/,
    'the language_attributes filter is gone; the reveal start state is back to being set by deferred JavaScript '
    + 'after first paint, which is the defect this whole block exists to prevent');
});

/* TWO PHOTOGRAPHS WENT MISSING FROM THE LIVE SITE on 2026-08-20, caused by the
   reveal gate above, and this is the gate that names that failure directly.

   THE DEADLOCK. css/motion.css:23 gives [data-reveal="clip"] a start state of
   clip-path: inset(0 0 14% 0). With that present from the first frame, on
   these pages, the image is never requested at all. (The tempting general
   rule -- "Chromium will not fetch a lazy image inside a clipped element" --
   is NOT true; two synthetic reproductions including one of this page's own
   structure load fine. js/reveal.js's header records what is and is not
   established.) Before the gate moved into the server markup the
   start state applied only after first paint, so the fetch had already been
   issued; after, the clip is present from the first frame and the request is
   never made at all. It does not resolve on scroll and it does not resolve
   when the element reveals: measured with is-revealed set, opacity 1,
   transform none and clip-path inset(0px), the <figure> was still 0px tall
   and the image still unrequested. js/reveal.js now eager-ises those images
   as its first statement, and its own header carries the full account.

   WHY IT IS NOT ENOUGH THAT layoutInvariants() CAUGHT IT. It did, as a
   main-height difference, which is a true red with the wrong subject: it
   points at layout, and it took a per-element diff plus a network log to get
   from there to "a photograph is missing". It also cannot catch the same
   defect on an image whose container is already sized by aspect-ratio or
   which sits beside taller content, where the missing photograph costs the
   page no height at all.

   AT 390 AND NOT 1440, deliberately. The defect is a function of how far the
   image sits below the fold, and at 1440 both of the affected images were
   close enough to the viewport to be fetched anyway: the 1440 run was green
   throughout while the site was visibly broken on a phone. One width, chosen
   because it is the one that can fail. */
test('no converted page is missing a photograph from inside the motion layer', { concurrency: 1 }, async () => {
  const pages = [...PAGE_REGISTER, ...EXCLUDED_PAGES].filter((p) => p.exampleUrl);
  assert.ok(pages.length > 10,
    `only ${pages.length} pages carry an exampleUrl; this test would be passing on almost nothing`);
  const { unloadedRevealImages } = await import('./fidelity-browser.mjs');
  const results = await unloadedRevealImages(pages.map((p) => p.exampleUrl));
  const broken = results.filter((r) => r.missing.length > 0)
    .map((r) => `${r.url}: ${r.missing.join(', ')}`);
  assert.deepEqual(broken, [],
    `${broken.length} converted pages render a [data-reveal] image that never loaded:\n${broken.join('\n')}\n`
    + 'The usual cause is the clip start state suppressing a lazy fetch; js/reveal.js eager-ises those images '
    + 'and its header explains why. A NEW start state that clips, masks or hides an element containing a lazy '
    + 'image will reopen this, and it will be invisible at 1440.');
});

/* --- the motion layer's inventory ----------------------------------------
   ASKED FOR BY PAOLO ON 2026-08-20, in these words: if we change text or an
   image in Elementor, will it break the animations?

   The answer is that editing a widget's CONTENT cannot, because data-reveal
   lives on the widget's wrapper as a Custom Attribute, not in its content.
   Three other editor actions can, and all three fail silently:

     - deleting a widget or container and adding a replacement, which arrives
       with an empty Attributes field
     - editing an html() widget's raw markup, where roughly a quarter of these
       attributes are baked into the markup rather than carried on the wrapper
       (worst exposed: landing, education, work, safety)
     - clearing the Attributes field itself

   None of them produces an error, a layout change or a failing test. The page
   simply animates one element less. Every other reveal instrument in this
   suite asks whether the marked-up elements behave; this one asks whether the
   right elements are still marked up at all.

   THE EXPECTATION IS DERIVED FROM THE TREE THIS REPOSITORY DEPLOYS, not from
   dist/ and not from a number typed here. dist/ is the wrong baseline for the
   Loop Grid pages by construction (content-a serves 205 posts where its static
   counterpart carries 23 authored cards), and a typed number is the failure
   this repository has already shipped twice. page.mjs's own sections() is what
   deployElements() writes to the install, so it is the only baseline that
   cannot drift from what is deployed.

   MEASURED BEFORE BEING BELIEVED: all seventeen pages match exactly on all
   three counts today, with no exemption for any page, loop pages included. */
for (const page of [...PAGE_REGISTER, ...EXCLUDED_PAGES].filter((p) => p.exampleUrl)) {
  test(`the converted ${page.name} page still carries every reveal attribute this repository deploys`, { concurrency: 1 }, async () => {
    const { sections } = await import(`./elementor/pages/${page.name}/page.mjs`);
    const { revealInventory, treeRevealInventory } = await import('./fidelity-browser.mjs');
    const expected = treeRevealInventory(sections());
    assert.ok(expected.reveal > 0,
      `elementor/pages/${page.name}/page.mjs builds a tree with no data-reveal attributes at all; `
      + 'either the page genuinely has no motion (in which case this test should not cover it) or '
      + 'treeRevealInventory() has stopped matching the shape the factory emits');

    const [live] = await revealInventory([page.exampleUrl]);
    assert.deepEqual(
      { reveal: live.reveal, group: live.group, entrance: live.entrance },
      expected,
      `${page.name}'s live motion inventory does not match the tree this repository deploys.\n`
      + `  expected ${JSON.stringify(expected)}\n  live     ${JSON.stringify({ reveal: live.reveal, group: live.group, entrance: live.entrance })}\n`
      + 'FEWER live than expected means attributes have been lost on the install, and the usual cause is an '
      + 'edit made in the Elementor editor: a deleted-and-replaced widget arrives with an empty Attributes '
      + 'field, and editing an html() widget\'s markup can drop an attribute baked into it. MORE live than '
      + 'expected means the install has been edited to add motion the repository does not know about, which '
      + 'the next deploy of this page will silently destroy, because deployElements() replaces _elementor_data '
      + 'wholesale. Either way the install and this repository have diverged and one of them has to win.\n'
      + '  `reveal` is the animation, `group` is the stagger, `entrance` is the above-the-fold choreography.');

    /* The loop half, deliberately coarse. A Loop Grid renders one template N
       times, so an exact number here would be a function of how many posts
       the install happens to hold, which is not this test's business. What it
       can say, and what matters, is that the template has not lost its
       attributes altogether: every loop item template in this build carries
       at least one, so zero reveals inside a rendered loop is always wrong. */
    if (live.loops > 0) {
      assert.ok(live.inLoop > 0,
        `${page.name} renders ${live.loops} Loop Grid(s) but not one card inside them carries a data-reveal `
        + 'attribute. Every loop item template in this build carries at least one, so the template has lost '
        + 'them: check the elementor_library post for this page\'s loop item, which is deployed separately '
        + 'from the page itself and so is not restored by redeploying the page.');
    }
  });
}

/* treeRevealInventory() is the expectation half of the test above, so a bug in
   it weakens that gate silently in whichever direction it is wrong. It has
   already had one: the first version counted the valued forms
   (`data-reveal|rise`, `data-reveal="rise"`) and then SUBTRACTED the group and
   entrance totals, on the assumption those had been swept up by the first
   pattern. They had not, so every page came out short by exactly its group
   count plus its entrance count, and the live comparison read as a real
   divergence on all seventeen pages at once. Seventeen simultaneous failures
   is the tell: it indicts the measurement, not the thing measured.

   The four shapes below are the four this build actually emits, and the third
   and fourth are the ones that broke. */
test('treeRevealInventory counts every shape the factory emits, and tells the three attributes apart', async () => {
  const { treeRevealInventory } = await import('./fidelity-browser.mjs');
  const one = (settings) => [{ elType: 'widget', settings, elements: [] }];

  assert.deepEqual(treeRevealInventory(one({ _attributes: 'data-reveal|rise' })),
    { reveal: 1, group: 0, entrance: 0 }, 'valued attribute in an Elementor _attributes string');
  assert.deepEqual(treeRevealInventory(one({ html: '<a class="tp-back" data-reveal="rise">x</a>' })),
    { reveal: 1, group: 0, entrance: 0 }, 'valued attribute inside an html() widget\'s markup');
  assert.deepEqual(treeRevealInventory(one({ _attributes: 'data-reveal-group|' })),
    { reveal: 0, group: 1, entrance: 0 },
    'a bare data-reveal-group in _attributes must count as a group and NOT also as a reveal');
  assert.deepEqual(treeRevealInventory(one({ html: '<div class="gvc-hero__under" data-reveal-group>x</div>' })),
    { reveal: 0, group: 1, entrance: 0 },
    'a bare valueless data-reveal-group in raw markup must still be counted');
  assert.deepEqual(treeRevealInventory(one({ _attributes: 'aria-labelledby|bio-title\ndata-reveal-entrance|' })),
    { reveal: 0, group: 0, entrance: 1 }, 'entrance alongside an unrelated attribute in the same string');

  /* Nesting, because the real trees are containers of containers and a walk
     that only looked at top-level elements would pass every case above. */
  const nested = [{ elType: 'container', settings: { _attributes: 'data-reveal-entrance|' }, elements: [
    { elType: 'container', settings: { _attributes: 'data-reveal-group|' }, elements: [
      { elType: 'widget', settings: { _attributes: 'data-reveal|rise' }, elements: [] },
      { elType: 'widget', settings: { html: '<figure data-reveal="clip"><img></figure>' }, elements: [] },
    ] },
  ] }];
  assert.deepEqual(treeRevealInventory(nested), { reveal: 2, group: 1, entrance: 1 },
    'a nested tree must be counted at every depth');
});

/* --- Elementor's own entrance animations, tuned to this build ------------
   FOR AFTER HAND-OFF, NOT FOR THIS CONVERSION. Paolo's plan, 2026-08-20:
   once the site launches this repository stops being the source of truth and
   Empower maintain the site in Elementor. A new section will be added through
   the editor, and the only animation the editor OFFERS is Advanced -> Motion
   Effects -> Entrance Animation. This build's own reveal layer is invisible
   there: it rides on a custom attribute nobody will guess.

   So the two have to agree, and untouched they do not. Elementor 4.2.2 ships
   `@keyframes fadeInUp{from{transform:translate3d(0,100%,0)}...}` at
   `.animated{animation-duration:1.25s}` on the browser's default easing. 100%
   is the element's OWN height, so a 400px section slides 400px. The house
   motion is 20px over 600ms on --ease-entrance. css/bridge.css redefines the
   keyframes so that picking "Fade In Up" in the editor simply IS the house
   animation, with nothing for anyone to remember.

   WHY THE FIXTURE IS A REAL PAGE ON THE INSTALL. No page in this build uses a
   native entrance animation, so there is nowhere else the cascade question
   can be asked at all. elementor/theme-parts/native-animation-probe.mjs
   carries the full reasoning, including why its containers are 400px tall.

   THE TWO FAILURES THIS EXISTS TO CATCH, neither visible in either stylesheet
   on its own:
     - Elementor loads animation CSS on demand, one file per animation. Two
       @keyframes of one name is last-one-wins with no specificity involved,
       so if that file ever lands after bridge.css the override silently stops
       working while every rule a grep would look for is still present.
     - bridge.css sets a duration on `.animated` and loads last, so the
       editor's own Animation Duration dropdown could stop having any effect.
       The `.zzp-slow` container gates that OUTCOME. (It does not gate the
       :not() exclusion in bridge.css, which measurement showed is defence in
       depth rather than the thing protecting the dropdown: Elementor's rule
       is `.animated.animated-slow` at (0,2,0) and wins on specificity
       regardless. bridge.css's own comment records that correction.) */
test('a natively-animated Elementor element lands on this build\'s motion values', { concurrency: 1 }, async () => {
  const { PROBE_SLUG } = await import('./elementor/theme-parts/native-animation-probe.mjs');
  const { nativeAnimation } = await import('./fidelity-browser.mjs');
  const base = process.env.INSTALL_BASE_URL ?? 'https://empv2.wpenginepowered.com/';
  const r = await nativeAnimation(new URL(`${PROBE_SLUG}/`, base).href);

  assert.ok(r.frames > 30, `only ${r.frames} frames sampled; the probe page did not render and nothing below was measured`);
  assert.ok(r.fadeInUp, 'the .zzp-fadeinup container is not on the probe page; redeploy elementor/theme-parts/native-animation-probe.mjs');

  /* The cascade, named by sheet so a failure says WHICH file won rather than
     just that a number is wrong. */
  assert.equal(r.winningFadeInUp?.sheet, 'bridge.css',
    `the effective @keyframes fadeInUp comes from ${r.winningFadeInUp?.sheet}, not bridge.css. Elementor's own `
    + 'animation CSS is now loading after the bridge sheet, so every keyframe override in that block is inert '
    + 'while still being present in the file. Nothing else will report this.');
  assert.equal(r.winningZoomIn?.sheet, 'bridge.css',
    `the effective @keyframes zoomIn comes from ${r.winningZoomIn?.sheet}, not bridge.css; see the assertion above`);

  /* Behaviour, not declaration: 20px against 100% of a 400px element. */
  assert.ok(r.travel.fadeInUp.height > 300,
    `the fadeInUp probe is only ${r.travel.fadeInUp.height}px tall, so 20px and "100% of its height" are too `
    + 'close to tell apart and the travel assertion below would prove little. The fixture is meant to be 400px.');
  assert.ok(r.travel.fadeInUp.travel > 15 && r.travel.fadeInUp.travel < 30,
    `a natively-animated element travelled ${r.travel.fadeInUp.travel}px, not the house 20px. If it is close to `
    + `${r.travel.fadeInUp.height} it is running Elementor's own translate3d(0,100%,0) and the override has `
    + 'stopped winning; a section added in the editor will now slide the full height of itself.');

  assert.equal(r.fadeInUp.duration, '0.6s',
    `native animation duration is ${r.fadeInUp.duration}, not the house --dur-reveal of 0.6s`);
  assert.match(r.fadeInUp.easing, /cubic-bezier\(0\.16, 0\.84, 0\.44, 1\)/,
    `native animation easing is ${r.fadeInUp.easing}, not the house --ease-entrance`);

  /* zoomIn is the photo reveal, the one keyframe with no native counterpart:
     Elementor's own is scale3d(0.3,0.3,0.3), this build's is a clip-path wipe. */
  assert.match(r.winningZoomIn.from, /clip-path/,
    `the effective zoomIn keyframe carries no clip-path (${r.winningZoomIn.from}). That is Elementor's own `
    + 'scale-from-30% zoom, not this build\'s photograph reveal.');

  /* And the editor's Duration control must still work. */
  assert.equal(r.slow.duration, '2s',
    `the Slow duration option produced ${r.slow.duration} instead of Elementor's 2s, so the editor's Animation `
    + 'Duration dropdown no longer does anything. Something in bridge.css is now out-specifying Elementor\'s '
    + '`.animated.animated-slow` (0,2,0) rule, or that rule has changed shape on an Elementor upgrade.');
});

/* THE HEADER RENDERED 727px TALL ON EVERY PAGE LOAD AND THEN COLLAPSED TO
   137px, and the suite was green throughout. Reported by Paolo 2026-08-20 as
   "the menu appears fully expanded before closing", with a screenshot.

   src/_shared/header-2.html ships the five dropdown panels and the search
   panel OPEN, in normal flow, by design: that is js/dropdown.js's and
   theme-js/search.js's progressive-enhancement contract, and it is what keeps
   the navigation reachable when those scripts do not load. Each script closes
   its own panels as it runs. Both are deferred, so both ran AFTER first paint
   (measured on the homepage: paint 1336ms, gates 1397ms), and in between
   every visitor saw the whole mega menu laid out down the page.

   WHY NOTHING CAUGHT IT. Every header assertion here reads the settled page,
   and the settled page was always right. "the five desktop dropdown panels
   ship open without JavaScript and close with it" is the closest existing
   test and it passes identically on the broken and the fixed page: 5 without
   JS, 0 with. The defect was purely a window, and a suite with no temporal
   instrument cannot have an opinion about one. This is the third time that
   sentence has been written today.

   THE FIX IS AN INLINE HEAD SCRIPT, not a hard-coded closed state, and the
   docblock in the child theme's functions.php records why: <noscript> only
   covers JavaScript being disabled, and the content at stake here is the
   navigation, so the failure that mattered was a script 404ing with JS ON.
   An inline script inverts both failure modes and a 4s timeout catches the
   404 case. Verified against all three paths before this gate was written:
   JS disabled leaves 5 panels and 14 nav links reachable, aborting both
   scripts restores the panels after the timeout, and a normal load still
   opens one panel on hover and the search panel on click. */
test('the header never renders its panels open before its scripts close them', { concurrency: 1 }, async () => {
  const { headerSettle } = await import('./fidelity-browser.mjs');
  const url = process.env.HOME_URL ?? 'https://empv2.wpenginepowered.com/';
  const r = await headerSettle(url);

  assert.ok(r.frames > 30, `only ${r.frames} frames sampled; .em-header was never found and nothing below was measured`);
  assert.ok(r.restHeight > 60 && r.restHeight < 300,
    `the header settled at ${r.restHeight}px, which is not a plausible resting height; the comparison below `
    + 'would be measuring against a broken page');
  assert.equal(r.panelFrames, 0,
    `the dropdown panels were laid out on ${r.panelFrames} frames before js/dropdown.js closed them. The inline `
    + 'head script in functions.php sets data-dropdown="pending", and css/bridge.css hides the panels while that '
    + 'value is present; one of the two is missing, or the script has stopped running before first paint.');
  assert.equal(r.searchFrames, 0,
    `the search panel was laid out on ${r.searchFrames} frames before theme-js/search.js closed it; see above, `
    + 'the same inline script sets data-search="pending"');
  /* The number a visitor actually experiences. Generous multiplier on
     purpose: this is meant to catch a 5x jump, not police a few pixels of
     font-loading reflow. */
  assert.ok(r.maxHeight < r.restHeight * 1.5,
    `the header peaked at ${r.maxHeight}px against a resting ${r.restHeight}px. That is the visible jump this `
    + 'gate exists to prevent.');
});

/* --- what a shared link looks like ---------------------------------------
   EVERY CONVERTED PAGE SHARED AS A BARE GREY BOX, found by the SEO audit on
   2026-08-21. All 18 carried og:title and twitter:card and none carried
   og:image, and twitter:card was set to "summary_large_image" -- a format
   whose whole purpose is to promise an image that was not there.

   EXACTLY ONE, NOT AT LEAST ONE, and that is the assertion that matters.
   All in One SEO owns the rest of the Open Graph block and today emits no
   image; the child theme adds one at wp_head priority 20. If AIOSEO is ever
   configured with a default image, the page silently gains a SECOND og:image,
   the scrapers pick one of the two and nobody can predict which. A
   greater-than-zero check would sail straight past that. */
test('every converted page offers exactly one share image, and it resolves', { concurrency: 1 }, async () => {
  const pages = [...PAGE_REGISTER, ...EXCLUDED_PAGES].filter((p) => p.exampleUrl);
  assert.ok(pages.length > 10, `only ${pages.length} pages carry an exampleUrl`);
  const stamp = Date.now();
  const wrong = [];
  const seen = new Set();

  for (const [i, page] of pages.entries()) {
    const url = new URL(page.exampleUrl);
    url.searchParams.set('empower_cb', `og-${stamp}-${i}`);
    const html = await fetchConverted(url.href);
    const images = [...html.matchAll(/<meta\s+property="og:image"\s+content="([^"]*)"/g)].map((m) => m[1]);
    if (images.length !== 1) {
      wrong.push(`${page.name}: ${images.length} og:image tags`);
      continue;
    }
    seen.add(images[0]);
    /* twitter:image too: the card format is summary_large_image on every page,
       and X reads twitter:image in preference to og:image when both exist. */
    if (!/<meta\s+name="twitter:image"\s+content="/.test(html)) wrong.push(`${page.name}: no twitter:image`);
  }

  assert.deepEqual(wrong, [],
    `${wrong.length} page(s) have the wrong number of share images:\n${wrong.join('\n')}\n`
    + 'Two og:image tags usually means AIOSEO has been given a default image of its own and the theme\'s '
    + 'wp_head block in functions.php should be removed; zero means that block has stopped running.');

  assert.equal(seen.size, 1, `expected one shared default image across all pages, saw ${seen.size}: ${[...seen].join(', ')}`);
  /* The tag can be perfectly formed and point at a 404, which is the same
     grey box to anyone sharing the link. */
  const res = await fetch([...seen][0], { redirect: 'follow' });
  assert.equal(res.status, 200, `the share image ${[...seen][0]} returns ${res.status}`);
  const bytes = Number(res.headers.get('content-length') ?? 0);
  assert.ok(bytes > 5000, `the share image is only ${bytes} bytes, which is not a 1200x630 card`);
});

/* --- pages that must never be found --------------------------------------
   THREE INTERNAL PAGES WERE IN THE PUBLIC SITEMAP when the SEO audit ran:
   the native-animation test fixture, a dead measurement spike, and the
   campaign landing template. The fixture has to stay PUBLISHED for its own
   gate to fetch it, so drafting it is not available.

   BOTH SWITCHES, because shipping one without the other is the classic
   mistake: a sitemap exclusion does not stop a page being indexed if anything
   links to it, and a noindex does not stop the page advertising itself in the
   sitemap. functions.php drives both from one list, empower_hidden_slugs().

   THE NOINDEX HALF NEEDED AIOSEO'S OWN FILTER. A core `wp_robots` filter was
   written first and did nothing at all: AIOSEO replaces WordPress's robots tag
   with one it builds itself, so the three pages still shipped
   `max-image-preview:large` with no noindex in it. Only measuring the live tag
   caught that, which is why this test reads the tag rather than the setting. */
test('the internal pages are noindexed and out of the sitemap, and the real ones are not', { concurrency: 1 }, async () => {
  const base = process.env.HOME_URL ?? 'https://empv2.wpenginepowered.com/';
  const origin = new URL(base).origin;
  const hidden = ['zz-native-animation-probe', 'zz-spike-markup', 'landing'];
  const stamp = Date.now();
  const wrong = [];

  const robotsOf = async (slug, i) => {
    const res = await fetch(`${origin}/${slug}/?empower_cb=nx-${stamp}-${i}`);
    const html = await res.text();
    return (html.match(/<meta name="robots" content="([^"]*)"/) ?? [, ''])[1];
  };

  for (const [i, slug] of hidden.entries()) {
    const robots = await robotsOf(slug, i);
    if (!/\bnoindex\b/.test(robots)) wrong.push(`/${slug}/ is not noindexed (robots: "${robots}")`);
  }
  /* The other half of the assertion, and the half that stops this passing by
     noindexing the whole site: a real page must NOT be caught by the list. */
  for (const [i, slug] of ['quality-education', 'who-we-are'].entries()) {
    const robots = await robotsOf(slug, 100 + i);
    if (/\bnoindex\b/.test(robots)) wrong.push(`/${slug}/ IS noindexed and must not be (robots: "${robots}")`);
  }

  const sitemap = await (await fetch(`${origin}/page-sitemap.xml?empower_cb=sm-${stamp}`)).text();
  const listed = [...sitemap.matchAll(/<loc><!\[CDATA\[([^\]]*)/g)].map((m) => m[1]);
  assert.ok(listed.length > 30, `the page sitemap lists only ${listed.length} URLs; it did not render properly`);
  for (const slug of hidden) {
    if (listed.some((u) => new URL(u).pathname === `/${slug}/`)) wrong.push(`/${slug}/ is still in page-sitemap.xml`);
  }

  assert.deepEqual(wrong, [],
    `${wrong.length} problem(s) with the hidden-page set:\n${wrong.join('\n')}\n`
    + 'Both effects come from empower_hidden_slugs() in the child theme: aioseo_robots_meta for the tag, '
    + 'aioseo_sitemap_exclude_posts for the sitemap.');
});

/* THE TOP BAR ATE 73px OF A PHONE SCREEN. Reported by Paolo 2026-08-21 from a
   390px screenshot: the strapline and the email address are a flex row with
   flex-wrap, so below the width where they stop fitting side by side they
   became two stacked lines at the very top of every page.

   600px, AND THE NUMBER IS MEASURED. Stepping the viewport down in 5px
   increments, the bar holds one line at 585px and wraps at 580px. 600 is the
   first breakpoint the build already uses above that point.

   THE EMAIL WAS THE ONLY mailto ON THE PAGE, checked before removing it: the
   footer carries none. It does carry a "Contact Us" link, so a phone visitor
   still has a route. That is the fact that makes this safe, and it is why the
   assertion below is about the bar rather than about contact being reachable.

   BOTH HALVES ARE ASSERTED. css/header-2.css hides the anchor; on the install
   the flex child is an Elementor wrapper, so css/bridge.css has to hide that
   too or a zero-width column keeps the row's 24px gap and pushes the strapline
   12px off centre. `items` is what catches the second half. */
test('the top bar drops its email on a phone and keeps it on a desktop', { concurrency: 1 }, async () => {
  const { utilityBar } = await import('./fidelity-browser.mjs');
  const url = process.env.HOME_URL ?? 'https://empv2.wpenginepowered.com/';
  const bar = await utilityBar(url, [1440, 601, 600, 390]);

  assert.ok(bar[1440], '.em-utility__bar is not on the page at all');
  assert.equal(bar[1440].emailShown, true, 'the email has gone from the desktop top bar, where it belongs');
  assert.equal(bar[1440].items, 2, `the desktop bar should carry both halves; it has ${bar[1440].items}`);

  /* Either side of the boundary, so the rule cannot drift to a width that
     leaves the wrap it exists to prevent. */
  assert.equal(bar[601].emailShown, true, 'the email is hidden at 601px, one pixel wider than the rule should reach');
  assert.equal(bar[600].emailShown, false, 'the email is still shown at 600px, so the breakpoint has moved');

  assert.equal(bar[390].emailShown, false, 'the email is back on a phone');
  assert.equal(bar[390].items, 1,
    `the phone bar still has ${bar[390].items} flex items. The anchor is hidden but its Elementor wrapper is `
    + 'not, so the row keeps a zero-width column and its gap; that is the :has() rule in css/bridge.css.');
  assert.ok(bar[390].height <= 50,
    `the top bar is ${bar[390].height}px at 390px. It was 73px before this fix and should now be one line.`);
});

/* --- the search listing copy --------------------------------------------
   elementor/seo.mjs carries 34 titles and descriptions and NOTHING CHECKED
   ANY OF IT. Written by a session that ended before committing; committed on
   Paolo's instruction as 61f76bc after a hand check, and a hand check is not
   a gate. Its own docblock states targets precise enough to test, which is
   the whole reason these exist: the file tells you what correct means, so
   correctness should not depend on whoever edits it next remembering.

   WHY THE BANDS ARE THE FILE'S OWN NUMBERS AND NOT THE USUAL ADVICE. The
   title band is 45-60 rather than the commonly quoted 50-60 because a bio
   title is "<name>, <role>" and the longest names leave no room for a role;
   the file argues that case and these assertions enforce the argument it
   made, not a number from a blog post.

   NOT TESTABLE AND DELIBERATELY NOT FAKED: that the copy is drawn from the
   page's own approved text and invents no figure. That is Empower's rule and
   a human reading; asserting a proxy for it would be worse than admitting the
   gap. */
test('every search listing holds the targets seo.mjs sets for itself', async () => {
  const { PAGE_SEO, PERSON_SEO, ALL_SEO, BRAND_SUFFIX, fullTitle } = await import('./elementor/seo.mjs');

  assert.equal(Object.keys(PAGE_SEO).length, 16, 'expected 16 converted-page listings');
  assert.equal(Object.keys(PERSON_SEO).length, 13, 'expected 13 person listings');
  assert.equal(Object.keys(ALL_SEO).length, 29, 'ALL_SEO should merge to 29; a key collides between the two');
  assert.equal(BRAND_SUFFIX.length, 22, `the brand suffix is ${BRAND_SUFFIX.length} characters, and the title band is calculated around 22`);

  /* THE BANDS ARE ASSERTED AS AN EXACT SET, NOT AS AN EMPTY ONE, because
     three entries are deliberately outside them. Empower returned the
     approval sheet on 2026-08-21 with edits that do not fit, and Paolo's
     decision was that the returned document wins: their wording ships and
     the band records the exception. Writing that as a skip-list would let
     the band go quiet; writing it as an exact set means a FOURTH violation
     goes red, and so does an exemption that stops being needed, which is
     the failure this repository has already shipped twice with hand-written
     page lists.

     What each one costs, so the list can be argued with rather than merely
     obeyed:
       gina-metzger 64 and patrick-miller-2 66 truncate inside the brand
       suffix, i.e. " - Empower Missi...". Name and role, the two halves
       someone actually searched for, are both intact.
       patrick-miller-2's 164-character description is the one with a real
       cost: Google cuts it a few characters before the full stop. Dropping
       the redundant "Dr. Patrick Miller is " opener would bring it to 142,
       and that remains the fix if Empower would rather not be clipped.
       capitol-chat at 137 is three characters of wasted snippet width and
       nothing else. It is short because Empower took Wil Ervin's name out
       of it. */
  const OVER_LONG_TITLES = ['/person/gina-metzger/ (64)', '/person/patrick-miller-2/ (66)'];
  const OUT_OF_BAND_DESCS = ['/capitol-chat/ (137)', '/person/patrick-miller-2/ (164)'];

  const long = [], short = [], badDesc = [];
  for (const path of Object.keys(ALL_SEO)) {
    const title = fullTitle(path);
    const desc = ALL_SEO[path].description;
    if (title.length > 60) long.push(`${path} (${title.length})`);
    if (title.length < 45) short.push(`${path} (${title.length}): ${title}`);
    if (desc.length < 140 || desc.length > 160) badDesc.push(`${path} (${desc.length})`);
  }
  assert.deepEqual(long.sort(), [...OVER_LONG_TITLES].sort(),
    `the set of titles over 60 characters is not the approved set.\nGot:      ${long.join(', ')}\n`
    + `Expected: ${OVER_LONG_TITLES.join(', ')}\n`
    + 'A new entry here truncates in a search result. An entry that has DISAPPEARED means the copy now '
    + 'fits and the exemption above should be deleted with it.');
  assert.deepEqual(short, [],
    `${short.length} title(s) under 45 characters, wasting result width:\n${short.join('\n')}`);
  assert.deepEqual(badDesc.sort(), [...OUT_OF_BAND_DESCS].sort(),
    `the set of descriptions outside 140-160 characters is not the approved set.\nGot:      ${badDesc.join(', ')}\n`
    + `Expected: ${OUT_OF_BAND_DESCS.join(', ')}\n`
    + 'Under 140 wastes the snippet; over 160 is cut mid-sentence. Both are exempted by path, not by band.');

  /* Duplicate descriptions are always wrong: two pages claiming the same
     thing is the signal Google uses to decide one of them is not worth
     indexing separately. */
  const byDesc = new Map();
  for (const [path, entry] of Object.entries(ALL_SEO)) {
    byDesc.set(entry.description, [...(byDesc.get(entry.description) ?? []), path]);
  }
  const dupDesc = [...byDesc.values()].filter((paths) => paths.length > 1);
  assert.deepEqual(dupDesc, [], `duplicate descriptions:\n${dupDesc.map((p) => p.join(' + ')).join('\n')}`);

  /* Duplicate TITLES are asserted as an exact set rather than forbidden,
     because exactly one is legitimate and known: Grant Callen has both the
     converted template page and his CPT bio, which is the duplicate the
     canonical filter in the child theme resolves. Forbidding duplicates
     outright would fail on a state the build has deliberately chosen;
     allowing any would let a real collision through. */
  const byTitle = new Map();
  for (const path of Object.keys(ALL_SEO)) {
    byTitle.set(fullTitle(path), [...(byTitle.get(fullTitle(path)) ?? []), path]);
  }
  const dupTitle = [...byTitle.values()].filter((paths) => paths.length > 1).map((paths) => paths.sort());
  assert.deepEqual(dupTitle, [['/grant-callen/', '/person/grant-callen/']],
    'the only legitimate duplicate title is the Grant Callen pair, which the aioseo_canonical_url filter in '
    + `the child theme resolves. Got:\n${JSON.stringify(dupTitle)}`);

  assert.equal(fullTitle('/not-a-page/'), null, 'fullTitle() should return null for a path it does not carry');
});

/* COVERAGE, DERIVED FROM THE REGISTER AND FROM THE THEME'S OWN HIDDEN LIST,
   so that adding an eighteenth converted page goes red here rather than
   shipping without a description. A hand-written exemption for /landing/ was
   the obvious way to write this and is exactly the failure this repository
   has shipped twice: the exclusion is read out of empower_hidden_slugs() in
   functions.php instead, so a page that stops being hidden immediately starts
   demanding copy. */
test('every converted page has a search listing, unless the theme hides it', async () => {
  const { PAGE_SEO } = await import('./elementor/seo.mjs');
  const php = fs.readFileSync(path.join(process.cwd(), 'wp/empowerms-child/functions.php'), 'utf8');
  const block = php.match(/function empower_hidden_slugs\(\)\s*\{[\s\S]*?return array\(([^)]*)\)/);
  assert.ok(block, 'empower_hidden_slugs() is gone from the child theme; this test cannot derive its exclusions');
  const hidden = [...block[1].matchAll(/'([^']+)'/g)].map((m) => `/${m[1]}/`);
  assert.ok(hidden.length > 0, 'empower_hidden_slugs() parsed to an empty list');

  const converted = [...PAGE_REGISTER, ...EXCLUDED_PAGES]
    .filter((p) => p.exampleUrl)
    .map((p) => new URL(p.exampleUrl).pathname);
  assert.ok(converted.length > 10, `only ${converted.length} converted pages found; the register did not load`);

  const missing = converted.filter((p) => !PAGE_SEO[p] && !hidden.includes(p));
  const extra = Object.keys(PAGE_SEO).filter((p) => !converted.includes(p));

  assert.deepEqual(missing, [],
    `${missing.length} converted page(s) have no search listing and are not hidden by the theme:\n  `
    + `${missing.join('\n  ')}\nAdd an entry to PAGE_SEO in elementor/seo.mjs, or add the slug to `
    + 'empower_hidden_slugs() if the page should not be found at all.');
  assert.deepEqual(extra, [],
    `${extra.length} PAGE_SEO entr(ies) point at a path that is not a converted page:\n  ${extra.join('\n  ')}`);
});

/* THE LIVE HALF, and it is the one the pure tests structurally cannot do: a
   path resolving to a real post is not knowable from a file. deploy-seo.mjs
   throws on an unresolved path, but only when somebody runs it, and it has
   never been run: the copy is committed and deliberately undeployed until
   Empower approve the wording. So the day a slug moves, nothing would say so
   until a deploy that might be weeks away, and the error would arrive with
   the copy half written to the install.

   PERSON COVERAGE IS DERIVED FROM THE INSTALL, not from a count typed here.
   The bios are CPT entries; there is no page directory to walk and no
   register row, so the only honest source for "who exists" is the install
   itself. Publish one more person and this goes red naming them.

   THAT DERIVATION IS WHAT MAKES THE 2026-08-21 REMOVAL SAFE. Empower
   returned the approval sheet with five rows emptied (Wil Ervin, Brett
   Kittredge, Steven Randle, Katie Elliott, Christopher Koopman), Paolo's
   decision was to drop their listings AND set their posts to draft, and this
   assertion is the thing that keeps the two halves in step: it reads who is
   published rather than trusting a number, so if any of the five is
   republished without their listing coming back, this goes red naming them.
   The reverse case, a listing with no published post, is caught by the
   url_to_postid pass above. */
test('every search listing points at a real post, and no published person is missing one', { concurrency: 1 }, async () => {
  const { ALL_SEO, PERSON_SEO } = await import('./elementor/seo.mjs');
  const { wpe, stripNotices } = await import('./wpe.mjs');
  const origin = new URL(process.env.HOME_URL ?? 'https://empv2.wpenginepowered.com/').origin;

  /* One wp eval for every path, and the ids read back on the node side. Never
     captured into a remote shell variable: wpe.mjs documents at length how a
     WP-CLI value glued to a PHP deprecation notice becomes the next command's
     argument, and this repository has lost time to it twice. */
  const paths = Object.keys(ALL_SEO);
  const php = paths.map((p) => `echo url_to_postid("${origin}${p}"), "\\n";`).join('');
  const ids = stripNotices(await wpe(`wp eval '${php}'`))
    .split('\n').map((line) => parseInt(line.trim(), 10));

  assert.equal(ids.length, paths.length,
    `asked for ${paths.length} ids and got ${ids.length} lines back; the wp eval output did not parse`);
  const unresolved = paths.filter((p, i) => !Number.isInteger(ids[i]) || ids[i] === 0);
  assert.deepEqual(unresolved, [],
    `${unresolved.length} search listing(s) point at a path with no post on the install:\n  `
    + `${unresolved.join('\n  ')}\nA slug has moved, and deploy-seo.mjs would refuse to run.`);

  /* The inverse: a person who exists and has no listing would simply never be
     noticed, because nothing else enumerates them. */
  const slugs = stripNotices(await wpe('wp post list --post_type=person --post_status=publish --field=name --format=csv'))
    .split('\n').map((s) => s.trim()).filter((s) => s && s !== 'name');
  assert.ok(slugs.length > 10, `only ${slugs.length} published people found on the install; the query did not work`);

  const uncovered = slugs.map((s) => `/person/${s}/`).filter((p) => !PERSON_SEO[p]);
  assert.deepEqual(uncovered, [],
    `${uncovered.length} published person page(s) have no search listing:\n  ${uncovered.join('\n  ')}\n`
    + 'Add them to PERSON_SEO in elementor/seo.mjs. Their bios do carry an auto-generated description, but it '
    + 'is the opening 350-420 characters of the biography, which Google cuts mid-sentence.');
});

/* --- the legacy duplicates that competed with the converted pages --------

   THE PROBLEM THESE REDIRECTS SOLVE was invisible to every gate in this file
   until 2026-08-21, because it is not a defect in any page. Sixteen converted
   pages got approved titles and descriptions, and twelve legacy pages sat
   beside them answering the same queries: all indexable, all SELF-canonical,
   all in page-sitemap.xml, several on older and better-established URLs. Each
   page was individually correct. The site was competing with itself.

   THREE OF THE TWELVE ARE DELIBERATELY STILL THERE and this test asserts they
   still return 200, which is the unusual half. /become-an-ambassador/ serves
   live Gravity Form 37 and /become-an-advocate-for-change/ serves form 41,
   while the converted /ambassadors/ carries no form at all: a 301 from the
   working signup onto the form-shaped design would end ambassador signups and
   report success doing it. /learn-more/ is the target of five campaign rules,
   one of them a printed QR code. A future tidy-up that "finishes the job" by
   redirecting those three is the expensive mistake here, so the assertion is
   written to stop it rather than to leave it to a comment.

   ONE HOP, NOT JUST A 301. Four existing rules landed on pages that this work
   then redirected again, and a chain passes any check that only asks "does it
   redirect". The hop count is the assertion. */
test('the legacy duplicates redirect in one hop, and the pages with forms do not', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(
    { name: 'the install home page', envVar: 'HOME_URL', exampleUrl: 'https://empv2.wpenginepowered.com/' },
    t,
  );
  if (!url) return;
  const origin = new URL(url).origin;
  const { REDIRECTS, REPOINT, MUST_STAY_DISABLED, DELIBERATELY_NOT_REDIRECTED } =
    await import('./elementor/redirects.mjs');

  /* Sources and their repointed rules together: both must land in one hop. */
  const hops = [...REDIRECTS, ...REPOINT.map((r) => ({ from: r.from, to: r.to }))];
  const wrong = [];
  for (const { from, to } of hops) {
    const res = await fetch(origin + from, { redirect: 'manual' });
    const loc = res.headers.get('location');
    const landed = loc ? new URL(loc, origin).pathname : null;
    if (res.status !== 301 || landed !== to) {
      wrong.push(`${from} -> ${res.status} ${landed ?? '(no location)'}, expected 301 ${to}`);
      continue;
    }
    /* The destination must be the END of the chain, not another rule. */
    const onward = await fetch(origin + to, { redirect: 'manual' });
    if (onward.status !== 200) {
      wrong.push(`${from} -> ${to} -> ${onward.status}: the destination is not final, this is a chain`);
    }
  }
  assert.deepEqual(wrong, [],
    `${wrong.length} legacy redirect(s) wrong:\n  ${wrong.join('\n  ')}\n`
    + 'Run node elementor/deploy-redirects.mjs, or fix elementor/redirects.mjs.');

  /* The three that must NOT be redirected, and why is in redirects.mjs. */
  const broken = [];
  for (const { path, why } of DELIBERATELY_NOT_REDIRECTED) {
    const res = await fetch(origin + path, { redirect: 'manual' });
    if (res.status !== 200) broken.push(`${path} now returns ${res.status}, and it must stay 200: ${why}`);
  }
  assert.deepEqual(broken, [],
    `${broken.length} page(s) that must NOT be redirected have been:\n  ${broken.join('\n  ')}`);

  /* The loaded guns: three existing rules are the exact reverse of three of
     the redirects above, and enabling any of them makes both pages
     unreachable. They read as harmless in the plugin's own list screen. */
  const { wpe, stripNotices } = await import('./wpe.mjs');
  const ids = MUST_STAY_DISABLED.map((r) => r.id).join(',');
  const live = stripNotices(await wpe(
    `wp eval 'global $wpdb; foreach ( $wpdb->get_results( "SELECT id, status FROM {$wpdb->prefix}redirection_items `
    + `WHERE id IN (${ids})" ) as $r ) { echo $r->id, "=", $r->status, "\\n"; }'`,
  )).split('\n').map((l) => l.trim()).filter(Boolean);
  const armed = live.filter((l) => !l.endsWith('=disabled'));
  assert.deepEqual(armed, [],
    `${armed.length} reverse redirect rule(s) are no longer disabled: ${armed.join(', ')}\n`
    + MUST_STAY_DISABLED.map((r) => `  id ${r.id}: ${r.rule} loops with ${r.loopsWith}`).join('\n')
    + '\nEnabling one of these makes both pages unreachable.');
});

/* AIOSEO CANNOT SEE THE REDIRECTION PLUGIN, so the nine redirected pages stayed
   in page-sitemap.xml after the redirects went live: still `publish`, still
   advertised, every one of them an instruction to crawl a URL that bounces.
   empower_redirected_slugs() in the child theme hands them to AIOSEO's own
   exclude filter.

   THE PHP LIST AND THE JS LIST ARE THE SAME NINE STRINGS in two files, which is
   the drift this repository keeps getting bitten by, so the first assertion
   reads the PHP function's source and compares it to redirects.mjs. Adding a
   tenth redirect without adding it to the theme goes red here rather than
   quietly leaving it in the sitemap. */
test('the redirected pages leave the sitemap', { concurrency: 1 }, async (t) => {
  const url = requirePageUrl(
    { name: 'the install home page', envVar: 'HOME_URL', exampleUrl: 'https://empv2.wpenginepowered.com/' },
    t,
  );
  if (!url) return;
  const origin = new URL(url).origin;
  const { REDIRECTS } = await import('./elementor/redirects.mjs');
  const { readFile } = await import('node:fs/promises');

  const php = await readFile('./wp/empowerms-child/functions.php', 'utf8');
  const fn = php.match(/function empower_redirected_slugs\(\)\s*\{\s*return array\(([\s\S]*?)\);/);
  assert.ok(fn, 'empower_redirected_slugs() not found in the child theme; the sitemap exclusion is gone');
  const phpSlugs = [...fn[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
  const jsSlugs = REDIRECTS.map((r) => r.from.replace(/^\/|\/$/g, '')).sort();
  assert.deepEqual(phpSlugs, jsSlugs,
    'empower_redirected_slugs() in functions.php disagrees with REDIRECTS in elementor/redirects.mjs.\n'
    + `  php: ${phpSlugs.join(', ')}\n  js : ${jsSlugs.join(', ')}\n`
    + 'Two files holding one list; a redirect missing from the PHP stays in the sitemap.');

  const xml = await (await fetch(`${origin}/page-sitemap.xml`)).text();
  const listed = REDIRECTS.map((r) => r.from).filter((p) => xml.includes(p));
  assert.deepEqual(listed, [],
    `${listed.length} redirected page(s) are still in page-sitemap.xml:\n  ${listed.join('\n  ')}\n`
    + 'The sitemap is telling Google to crawl URLs that immediately redirect. Deploy the theme, then flush '
    + '(wp page-cache flush && wp cdn-cache flush): AIOSEO caches the sitemap.');
});
