import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { installConfig } from './install.mjs';
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
import { deployPage, deployLoopItem, deployThemePart, setConditions, disableThemePageTitle } from './elementor/deploy.mjs';
import { extractBlock } from './elementor/theme-parts/extract.mjs';
import { footerPart, FOOTER_POST_ID } from './elementor/theme-parts/footer.mjs';
import { headerPart, HEADER_POST_ID } from './elementor/theme-parts/header.mjs';
import { PAGE_REGISTER, EXCLUDED_PAGES, convertedPageDirs } from './elementor/pages/register.mjs';
import {
  isImageKey, isBookkeepingKey, validateDeferredEntry, compareBoxes, expiredDeferredEntries,
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

  const bridgePassMatch = src.match(/await run\(\s*'rsync'\s*,\s*\[[^\]]*'wp\/empowerms-child\/css\/'[^\]]*\]\s*\)/);
  assert.ok(bridgePassMatch, 'no rsync call syncing wp/empowerms-child/css/ was found in wp/sync.mjs');
  assert.ok(bridgePassMatch.index > loopEnd,
    'the wp/empowerms-child/css/ sync must run after the FROM_ROOT loop, or the loop\'s own --delete against dest/css/ removes bridge.css straight back out');

  const bridgePass = bridgePassMatch[0];
  assert.doesNotMatch(bridgePass, /--delete/,
    'the wp/empowerms-child/css/ sync must not carry --delete: its source is only ever bridge.css, and --delete against dest/css/ would erase every file the previous pass just placed there');
  assert.match(bridgePass, /`\$\{dest\}\/css\/`|dest\}\/css\//, 'the wp/empowerms-child/css/ sync does not target dest/css/');
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

test('every container in every podcast-a mapping module and both theme parts sets content_width: \'full\'', async () => {
  function* everyContainer(nodes) {
    for (const n of nodes) {
      if (n.elType === 'container') yield n;
      if (n.elements?.length) yield* everyContainer(n.elements);
    }
  }
  const trees = [
    podcastHero(), podcastAbout(), podcastLibrary(), podcastLoopItem(),
    headerPart(), footerPart(),
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

test('deployThemePart refuses a location that is not header or footer', async () => {
  /* 'wp-page' and 'loop-item' are real template types with their own deploy
     functions. Accepting one here would write a page's type onto a library
     post that Elementor then never renders in a location, with no error. */
  await assert.rejects(() => deployThemePart(4242, [], 'single'), /location/);
  await assert.rejects(() => deployThemePart(4242, [], 'wp-page'), /location/);
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
});

test('the header carries the mobile nav and its toggle', () => {
  const json = JSON.stringify(headerPart());
  assert.match(json, /em-header__toggle/);
  assert.match(json, /aria-controls=\\"mobile-nav\\"/);
  assert.match(json, /id=\\"mobile-nav\\"/);
});

test('the header takes exactly three html widgets, and they are the named three', () => {
  /* The spec sanctions a fourth exception for the nav, the actions and the
     mobile nav. A fifth html widget here is scope drift and should fail
     loudly rather than be noticed later by eye. */
  const json = JSON.stringify(headerPart());
  const htmlWidgets = json.match(/"widgetType":"html"/g) || [];
  assert.equal(htmlWidgets.length, 3);
  for (const marker of ['em-header__nav', 'em-header__actions', 'em-mobilenav']) {
    assert.ok(json.includes(marker), `the header part is missing ${marker}`);
  }
});

test('the header markup matches the static partial, string for string', () => {
  /* The three html widgets exist to preserve markup exactly. Anything in
     them that is not in the partial is drift. */
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
test('no stylesheet outside the bridge carries an Elementor selector', () => {
  const ELEMENTOR_SELECTOR = /\.e-con\b|\.elementor-[\w-]+/;
  for (const dir of ['css', 'components', 'tokens']) {
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.css'))) {
      const css = fs.readFileSync(`${dir}/${file}`, 'utf8');
      assert.doesNotMatch(css, ELEMENTOR_SELECTOR, `${dir}/${file} carries an Elementor selector`);
    }
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
