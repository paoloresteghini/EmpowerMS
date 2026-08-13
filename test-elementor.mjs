import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stripNotices, wpe } from './wpe.mjs';
import { container, heading, text, image, link, html, elementId } from './elementor/factory.mjs';

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
